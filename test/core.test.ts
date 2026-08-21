import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initAnalytics,
  identify,
  reset,
  track,
  flush,
  __resetForTests,
} from './core';

const TRACKING_URL = 'https://backend.test/api/analytics';

function setUserAgent(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: ua,
    configurable: true,
  });
}

function getLastBeaconCall() {
  const calls = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls;
  return calls[calls.length - 1];
}

async function readBeaconPayload(blob: Blob) {
  const text = await blob.text();
  return JSON.parse(text);
}

beforeEach(() => {
  __resetForTests();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.useFakeTimers();

  // sendBeacon isn't implemented in jsdom — stub it fresh each test
  Object.defineProperty(navigator, 'sendBeacon', {
    value: vi.fn().mockReturnValue(true),
    configurable: true,
    writable: true,
  });

  global.fetch = vi.fn().mockResolvedValue({ ok: true });

  setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('initAnalytics', () => {
  it('applies default flushIntervalMs and maxQueueSize when not provided', () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    track({ event: 'test_event' });

    // default maxQueueSize is 20, so a single event should not auto-flush
    expect(navigator.sendBeacon).not.toHaveBeenCalled();

    // default flushIntervalMs is 5000
    vi.advanceTimersByTime(5000);
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('respects a custom flushIntervalMs', () => {
    initAnalytics({
      trackingUrl: TRACKING_URL,
      instanceId: 'inst-1',
      key: 'k-1',
      flushIntervalMs: 1000,
    });
    track({ event: 'test_event' });

    vi.advanceTimersByTime(999);
    expect(navigator.sendBeacon).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });
});

describe('track', () => {
  it('does nothing if called before initAnalytics', () => {
    track({ event: 'too_early' });
    flush();
    expect(navigator.sendBeacon).not.toHaveBeenCalled();
  });

  it('attaches a uuid, event name, and timestamp to every event', async () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    track({ event: 'signup_started' });
    flush();

    const [, blob] = getLastBeaconCall();
    const body = await readBeaconPayload(blob);
    const [event] = body.events;

    expect(event.event).toBe('signup_started');
    expect(event.uuid).toMatch(/^[0-9a-f-]{36}$/i);
    expect(typeof event.timestamp).toBe('string');
  });

  it('auto-collects device, browser, and OS info from the user agent', async () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    track({ event: 'page_view' });
    flush();

    const [, blob] = getLastBeaconCall();
    const body = await readBeaconPayload(blob);
    const { properties } = body.events[0];

    expect(properties.browser).toBe('Chrome');
    expect(properties.os).toBe('Mac OS');
    expect(properties.deviceType).toBe('Desktop');
    expect(properties.rawUserAgent).toContain('Chrome/148.0.0.0');
  });

  it('sends the static key from config as-is, unmodified', async () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'opaque-encrypted-string' });
    track({ event: 'test_event' });
    flush();

    const [, blob] = getLastBeaconCall();
    const body = await readBeaconPayload(blob);

    expect(body.events[0].properties.key).toBe('opaque-encrypted-string');
  });

  it('merges properties in order: auto < defaultProperties < per-call properties', async () => {
    initAnalytics({
      trackingUrl: TRACKING_URL,
      instanceId: 'inst-1',
      key: 'k-1',
      defaultProperties: { environment: 'staging', source: 'default' },
    });

    track({ event: 'test_event', properties: { source: 'per-call', buttonId: 'submit' } });
    flush();

    const [, blob] = getLastBeaconCall();
    const body = await readBeaconPayload(blob);
    const { properties } = body.events[0];

    expect(properties.environment).toBe('staging'); // from defaultProperties
    expect(properties.source).toBe('per-call'); // per-call wins over defaultProperties
    expect(properties.buttonId).toBe('submit'); // per-call only
  });

  it('auto-flushes once the queue reaches maxQueueSize', () => {
    initAnalytics({
      trackingUrl: TRACKING_URL,
      instanceId: 'inst-1',
      key: 'k-1',
      maxQueueSize: 3,
    });

    track({ event: 'e1' });
    track({ event: 'e2' });
    expect(navigator.sendBeacon).not.toHaveBeenCalled();

    track({ event: 'e3' });
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });
});

describe('flush', () => {
  it('does nothing when the queue is empty', () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    flush();
    expect(navigator.sendBeacon).not.toHaveBeenCalled();
  });

  it('sends the batch with instanceId and clears the queue', async () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-42', key: 'k-1' });
    track({ event: 'e1' });
    track({ event: 'e2' });
    flush();

    const [url, blob] = getLastBeaconCall();
    expect(url).toBe(TRACKING_URL);

    const body = await readBeaconPayload(blob);
    expect(body.instanceId).toBe('inst-42');
    expect(body.events).toHaveLength(2);

    // second flush should be a no-op since the queue was cleared
    flush();
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('falls back to fetch when sendBeacon returns false', () => {
    (navigator.sendBeacon as ReturnType<typeof vi.fn>).mockReturnValue(false);
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    track({ event: 'e1' });
    flush();

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      TRACKING_URL,
      expect.objectContaining({ method: 'POST', keepalive: true })
    );
  });

  it('falls back to fetch when sendBeacon is unavailable', () => {
    // @ts-expect-error simulating an environment without sendBeacon
    delete navigator.sendBeacon;
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    track({ event: 'e1' });
    flush();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('flushes on visibilitychange when the tab becomes hidden', () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    track({ event: 'e1' });

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('flushes on beforeunload', () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    track({ event: 'e1' });

    window.dispatchEvent(new Event('beforeunload'));

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });
});

describe('identity: distinctId, identify, reset', () => {
  it('generates and persists an anonymous distinctId in localStorage', async () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    track({ event: 'e1' });
    flush();

    const [, blob] = getLastBeaconCall();
    const body = await readBeaconPayload(blob);
    const distinctId = body.events[0].properties.distinctId;

    expect(distinctId).toBeTruthy();
    expect(window.localStorage.getItem('__peekaboo_distinct_id')).toBe(distinctId);
  });

  it('reuses the same distinctId across multiple track calls', async () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    track({ event: 'e1' });
    track({ event: 'e2' });
    flush();

    const [, blob] = getLastBeaconCall();
    const body = await readBeaconPayload(blob);
    const [first, second] = body.events;

    expect(first.properties.distinctId).toBe(second.properties.distinctId);
  });

  it('uses the identified userId as distinctId after identify() is called', async () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    identify('user-123');
    track({ event: 'e1' });
    flush();

    const [, blob] = getLastBeaconCall();
    const body = await readBeaconPayload(blob);

    expect(body.events[0].properties.distinctId).toBe('user-123');
  });

  it('falls back to the anonymous distinctId after reset()', async () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    identify('user-123');
    reset();
    track({ event: 'e1' });
    flush();

    const [, blob] = getLastBeaconCall();
    const body = await readBeaconPayload(blob);

    expect(body.events[0].properties.distinctId).not.toBe('user-123');
    expect(body.events[0].properties.distinctId).toBeTruthy();
  });
});

describe('sessionId', () => {
  it('persists sessionId in sessionStorage across track calls', async () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    track({ event: 'e1' });
    flush();

    const [, blob] = getLastBeaconCall();
    const body = await readBeaconPayload(blob);
    const sessionId = body.events[0].properties.sessionId;

    expect(sessionId).toBeTruthy();
    expect(window.sessionStorage.getItem('__peekaboo_session_id')).toBe(sessionId);
  });
});

describe('onScreen', () => {
  it('is included when passed explicitly on track()', async () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    track({ event: 'modal_opened', onScreen: 'UpgradeModal' });
    flush();

    const [, blob] = getLastBeaconCall();
    const body = await readBeaconPayload(blob);

    expect(body.events[0].properties.onScreen).toBe('UpgradeModal');
  });

  it('is undefined when not provided', async () => {
    initAnalytics({ trackingUrl: TRACKING_URL, instanceId: 'inst-1', key: 'k-1' });
    track({ event: 'e1' });
    flush();

    const [, blob] = getLastBeaconCall();
    const body = await readBeaconPayload(blob);

    expect(body.events[0].properties.onScreen).toBeUndefined();
  });
});
