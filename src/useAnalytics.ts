import { useEffect, useRef } from "react";

export type EventPayload = {
  event: string;
  component?: string;
  data?: Record<string, unknown>;
  timestamp?: number;
  url?: string;
  userId?: string;
  anonymousId?: string;
};

interface AnalyticsConfig {
  trackingUrl: string;
  instanceId: string;
  flushIntervalMs?: number;
  maxQueueSize?: number;
}

let config: AnalyticsConfig | null = null;
let eventQueue: EventPayload[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let currentUserId: string | undefined;
let anonymousId: string | undefined;

function getAnonymousId(): string {
  if (anonymousId) return anonymousId;
  if (typeof window === "undefined") return "server";

  const STORAGE_KEY = "__peekaboo_anon_id";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      anonymousId = existing;
      return existing;
    }
    const generated =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(STORAGE_KEY, generated);
    anonymousId = generated;
    return generated;
  } catch {
    // localStorage unavailable (privacy mode, SSR edge cases, etc.)
    anonymousId = `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return anonymousId;
  }
}

/**
 * Call ONCE at app bootstrap, before any tracking happens.
 */
export function initAnalytics(cfg: AnalyticsConfig) {
  config = { flushIntervalMs: 5000, maxQueueSize: 20, ...cfg };

  if (typeof window !== "undefined" && !flushTimer) {
    flushTimer = setInterval(flush, config.flushIntervalMs);
    window.addEventListener("beforeunload", flush);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }
}

/**
 * Associate subsequent events with a known user.
 * Call after login/auth resolves.
 */
export function identify(userId: string) {
  currentUserId = userId;
}

/**
 * Clear identity on logout. Future events fall back to anonymousId.
 */
export function reset() {
  currentUserId = undefined;
}

function sendBatch(batch: EventPayload[]) {
  if (!config) return;

  const payload = JSON.stringify({ instanceId: config.instanceId, events: batch });

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    const ok = navigator.sendBeacon(config.trackingUrl, blob);
    if (!ok) {
      fetch(config.trackingUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } else {
    fetch(config.trackingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}

function flush() {
  if (eventQueue.length === 0) return;
  const batch = eventQueue;
  eventQueue = [];
  sendBatch(batch);
}

function track(event: EventPayload) {
  if (!config) {
    // Not initialized yet — drop rather than queue indefinitely without a destination.
    // If you want pre-init buffering instead, remove this guard and buffer here.
    return;
  }

  eventQueue.push({
    ...event,
    timestamp: Date.now(),
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userId: currentUserId,
    anonymousId: currentUserId ? undefined : getAnonymousId(),
  });

  if (config.maxQueueSize && eventQueue.length >= config.maxQueueSize) {
    flush();
  }
}

export default function useAnalytics(componentName = "") {
  const hasUnmounted = useRef(false);

  const trackEvent = (
    event: Omit<EventPayload, "component" | "timestamp" | "url" | "userId" | "anonymousId">
  ) => {
    track({ ...event, component: componentName });
  };

  useEffect(() => {
    return () => {
      if (!hasUnmounted.current) {
        track({ event: "component_unmounted", component: componentName });
        hasUnmounted.current = true;
      }
    };
  }, [componentName]);

  return { trackEvent };
}
