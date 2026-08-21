import { UAParser } from 'ua-parser-js';

export interface AnalyticsProperties {
  deviceType?: string;
  browserLanguagePrefix?: string;
  rawUserAgent?: string;
  browser?: string;
  browserVersion?: string;
  sessionId?: string;
  distinctId?: string;
  os?: string;
  osVersion?: string;
  screenWidth?: number;
  timestamp?: string;
  key?: string;
  onScreen?: string;
  [key: string]: unknown; // allow arbitrary extra properties (meta, custom fields, etc.)
}

export interface TrackedEvent {
  uuid: string;
  event: string;
  properties: AnalyticsProperties;
  timestamp: string;
}

export interface AnalyticsConfig {
  trackingUrl: string;
  instanceId: string;
  /**
   * Opaque encrypted identifier string issued by your backend.
   * Sent as-is with every event in `properties.key`. Not generated
   * or interpreted client-side — treat it as an unreadable token.
   */
  key: string;
  flushIntervalMs?: number;
  maxQueueSize?: number;
  /**
   * Properties merged into every tracked event automatically
   * (e.g. appVersion, environment, buildNumber). Per-call
   * `properties` passed to `track()` take precedence over these
   * if the same key is used in both.
   */
  defaultProperties?: Record<string, unknown>;
}

let config: AnalyticsConfig | null = null;
let eventQueue: TrackedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let currentUserId: string | undefined;
let cachedDistinctId: string | undefined;
let cachedSessionId: string | undefined;
let cachedUAResult: ReturnType<typeof UAParser> | null = null;

const DISTINCT_ID_KEY = '__peekaboo_distinct_id';
const SESSION_ID_KEY = '__peekaboo_session_id';

function safeUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getDistinctId(): string {
  if (currentUserId) return currentUserId;
  if (cachedDistinctId) return cachedDistinctId;
  if (typeof window === 'undefined') return 'server';

  try {
    const existing = window.localStorage.getItem(DISTINCT_ID_KEY);
    if (existing) {
      cachedDistinctId = existing;
      return existing;
    }
    const generated = safeUUID();
    window.localStorage.setItem(DISTINCT_ID_KEY, generated);
    cachedDistinctId = generated;
    return generated;
  } catch {
    cachedDistinctId = safeUUID();
    return cachedDistinctId;
  }
}

function getSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  if (typeof window === 'undefined') return 'server';

  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) {
      cachedSessionId = existing;
      return existing;
    }
    const generated = safeUUID();
    window.sessionStorage.setItem(SESSION_ID_KEY, generated);
    cachedSessionId = generated;
    return generated;
  } catch {
    cachedSessionId = safeUUID();
    return cachedSessionId;
  }
}

function getUAResult() {
  if (cachedUAResult) return cachedUAResult;
  if (typeof navigator === 'undefined') return null;
  cachedUAResult = new UAParser(navigator.userAgent).getResult();
  return cachedUAResult;
}

function getDeviceType(): string {
  const ua = getUAResult();
  const type = ua?.device?.type; // 'mobile' | 'tablet' | 'console' | 'smarttv' | 'wearable' | undefined
  if (type === 'mobile') return 'Mobile';
  if (type === 'tablet') return 'Tablet';
  if (!type) return 'Desktop'; // ua-parser leaves this undefined for desktop
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function collectAutoProperties(onScreen?: string): AnalyticsProperties {
  const ua = getUAResult();

  return {
    deviceType: getDeviceType(),
    browserLanguagePrefix:
      typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : undefined,
    rawUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    browser: ua?.browser?.name,
    browserVersion: ua?.browser?.version,
    sessionId: getSessionId(),
    distinctId: getDistinctId(),
    os: ua?.os?.name,
    osVersion: ua?.os?.version,
    screenWidth: typeof window !== 'undefined' ? window.screen?.width : undefined,
    timestamp: new Date().toISOString(),
    key: config?.key,
    onScreen,
  };
}

/**
 * Call ONCE at app bootstrap, before any tracking happens.
 */
export function initAnalytics(cfg: AnalyticsConfig) {
  config = { flushIntervalMs: 5000, maxQueueSize: 20, ...cfg };

  if (typeof window !== 'undefined' && !flushTimer) {
    flushTimer = setInterval(flush, config.flushIntervalMs);
    window.addEventListener('beforeunload', flush);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }
}

/**
 * Associate subsequent events with a known user. Call after login/auth resolves.
 */
export function identify(userId: string) {
  currentUserId = userId;
}

/**
 * Clear identity on logout. Future events fall back to the anonymous distinctId.
 */
export function reset() {
  currentUserId = undefined;
}

function sendBatch(batch: TrackedEvent[]) {
  if (!config) return;

  const payload = JSON.stringify({ instanceId: config.instanceId, events: batch });

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    const ok = navigator.sendBeacon(config.trackingUrl, blob);
    if (!ok) {
      fetch(config.trackingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } else {
    fetch(config.trackingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}

export function flush() {
  if (eventQueue.length === 0) return;
  const batch = eventQueue;
  eventQueue = [];
  sendBatch(batch);
}

export interface TrackInput {
  event: string;
  onScreen?: string;
  /**
   * Additional data to send with this specific event (e.g. { buttonId, meta: {...} }).
   * Merged on top of auto-collected properties and config.defaultProperties.
   */
  properties?: Record<string, unknown>;
}

export function track(input: TrackInput) {
  if (!config) return; // not initialized — drop rather than buffer indefinitely

  const auto = collectAutoProperties(input.onScreen);
  const eventTimestamp = new Date().toISOString();

  const trackedEvent: TrackedEvent = {
    uuid: safeUUID(),
    event: input.event,
    timestamp: eventTimestamp,
    properties: {
      ...auto,
      ...config.defaultProperties, // global, set once at init (e.g. appVersion, environment)
      ...input.properties,         // per-call, most specific — wins over both above
    },
  };

  eventQueue.push(trackedEvent);

  if (config.maxQueueSize && eventQueue.length >= config.maxQueueSize) {
    flush();
  }
}

/**
 * Test-only escape hatch: reset all module state between test cases.
 */
export function __resetForTests() {
  config = null;
  eventQueue = [];
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
  currentUserId = undefined;
  cachedDistinctId = undefined;
  cachedSessionId = undefined;
  cachedUAResult = null;
}
