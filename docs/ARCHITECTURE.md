# Architecture - Peekaboo Events

## Data Flow

```
Client App
  ↓
useAnalytics Hook
  ↓
trackEvent() call
  ↓
Property Merge (see below)
  ↓
Middleware (optional filtering)
  ↓
Event Queue
  ↓
Auto-flush (5s or 20 events)
  ↓
sendBeacon POST to backend
  ↓
Backend receives JSON payload
```

---

## Request Structure

### What Gets Sent

```json
{
  "instanceId": "my-app-v1",
  "events": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "event": "button_clicked",
      "timestamp": "2026-09-12T18:00:00.000Z",
      "properties": {
        // All properties merged here (see merge order below)
      }
    }
  ]
}
```

### Key Points

- **`instanceId`**: Sent at TOP LEVEL (not in events) — identifies the app
- **`events`**: Array of event objects
- Each event has: `uuid`, `event`, `timestamp`, `properties`
- **`properties`**: Contains all merged properties (see below)

---

## Property Merge Order

When an event is fired, properties are merged in this order (later overrides earlier):

```typescript
const properties = {
  ...autoCollected,       // 1. Auto-collected (browser, OS, device, etc.)
  ...sessionProperties,   // 2. Session-level (set once at init)
  ...defaultProperties,   // 3. Defaults (set at init, may be changeable)
  ...perCallProperties,   // 4. Per-call (most specific, always wins)
};
```

### Example

```typescript
// At initialization
initAnalytics({
  instanceId: 'my-app',
  sessionProperties: {
    userId: 'user-123',
    environment: 'prod',
    sessionKey: 'session-abc',
  },
  defaultProperties: {
    appVersion: '2.0',
    environment: 'staging', // ← Will be overridden by sessionProperties
  },
});

// When firing an event
trackEvent({
  event: 'purchase',
  properties: {
    amount: 99.99,
    environment: 'custom', // ← Will override sessionProperties
  },
});

// Result: Event properties are
{
  // Auto-collected
  browser: 'Chrome',
  os: 'macOS',
  sessionId: 'sess-123',
  distinctId: 'user-456',
  timestamp: '2026-09-12T18:00:00Z',
  
  // Session properties
  userId: 'user-123',
  sessionKey: 'session-abc',
  environment: 'prod', // ← From sessionProperties
  
  // Defaults (overridden by session & per-call)
  appVersion: '2.0',
  
  // Per-call (wins)
  amount: 99.99,
  environment: 'custom', // ← Override, uses per-call value
}
```

---

## Session Properties vs Default Properties

| | **Session Properties** | **Default Properties** |
|---|---|---|
| **Set when?** | At init time | At init time |
| **Can change?** | No (fixed for session) | Conceptually yes, but only if you reinit |
| **Use case** | Identify session, user, environment | App version, feature flags, metadata |
| **Merge order** | Before defaultProperties | After sessionProperties |
| **Override by per-call?** | Yes | Yes |

**Example Use:**
```typescript
initAnalytics({
  sessionProperties: {
    // Things that identify THIS session
    sessionId: 'session-abc',
    userId: 'user-123',
    clientVersion: '2.0.1',
  },
  defaultProperties: {
    // Shared defaults for all events
    appVersion: '2.0',
    region: 'us-west',
  },
});
```

---

## instanceId vs Properties

| Field | Level | Sent Where | Purpose |
|---|---|---|---|
| `instanceId` | **Batch level** | Top-level in JSON | Routes events to correct app/tenant |
| `sessionProperties` | **Event level** | In `properties` of each event | Session context (user, environment, etc.) |
| `defaultProperties` | **Event level** | In `properties` of each event | App defaults (version, region, etc.) |
| `per-call properties` | **Event level** | In `properties` of each event | Event-specific data (most specific) |

---

## Auto-Collected Properties

These are collected automatically and added to every event:

```javascript
{
  browser: 'Chrome',
  browserVersion: '148.0.0.0',
  os: 'macOS',
  osVersion: '14.6',
  deviceType: 'Desktop',
  screenWidth: 1920,
  sessionId: 'abc-123-def-456',  // Per-session
  distinctId: 'xyz-789-uvw-012', // Per-user/device
  timestamp: '2026-09-12T18:00:00.000Z',
  onScreen: 'ComponentName',      // From useAnalytics(name)
}
```

---

## Authentication

**Important:** `sessionProperties` is NOT authentication.

Choose your own auth strategy:

- **HMAC Signature** - Sign requests with a secret
- **Bearer Token** - Include authorization header
- **Session Validation** - Validate sessionKey on backend
- **IP Allowlist** - Restrict source IPs
- **Origin Validation** - Check request origin

See [SECURITY.md](./SECURITY.md) for backend implementation examples.

---

## Lifecycle

### Initialization
```typescript
initAnalytics({
  trackingUrl: 'https://...',
  instanceId: 'my-app',
  sessionProperties: { userId: 'u-123' },
  defaultProperties: { appVersion: '2.0' },
  flushIntervalMs: 5000,
  maxQueueSize: 20,
  middlewares: [consentFilter, piiScrubber],
});
```

### Event Firing
```typescript
// In any component
const { trackEvent } = useAnalytics('MyComponent');

trackEvent({
  event: 'button_clicked',
  onScreen: 'OverrideScreen',  // Optional override
  properties: { buttonId: 'submit' },
});
```

### Queueing
- Event enters queue
- Middlewares run (can filter or modify)
- Stored in memory

### Flushing
Happens when:
- Timer fires (every `flushIntervalMs` ms)
- Queue reaches `maxQueueSize`
- Component unmounts (sends remaining events)
- Page unloads (browser handles via sendBeacon)

### Sending
```javascript
POST /api/analytics
{
  "instanceId": "my-app",
  "events": [
    { /* event 1 */ },
    { /* event 2 */ },
    // ... up to maxQueueSize events
  ]
}
```

---

## Error Handling

### Client-Side
- Events before `initAnalytics` → **dropped**
- Middleware throws → **event dropped**, tracking continues
- `sendBeacon` fails → **falls back to fetch**
- Fetch fails → **silent fail** (doesn't interrupt app)

### Backend
You must implement:
- Request validation
- Rate limiting
- Authentication
- Error logging

---

## Performance

### Bundle Size
- ~5KB minified + gzipped
- Single dependency: `ua-parser-js`

### Runtime
- Non-blocking (async sendBeacon)
- In-memory queue (no persistence)
- Auto-collection is instant
- Batching reduces network calls

### Memory
- Queue stores events in memory
- Default max 20 events per batch
- Typical: <1MB for session

---

## Middleware

Middlewares run on every event before queueing. Use for:

```typescript
// Example: Consent gate
const consentFilter = (event) => {
  if (!userConsented) return null; // Drop event
  return event;
};

// Example: PII scrubber
const piiScrubber = (event) => {
  if (event.properties?.email) {
    event.properties.email = '[REDACTED]';
  }
  return event;
};

// Example: Dev logger
const devLogger = (event) => {
  if (isDevelopment) console.log('Event:', event);
  return event;
};

initAnalytics({
  middlewares: [consentFilter, piiScrubber, devLogger],
  // ...
});
```

**Important:** Middlewares run in order, output of one becomes input to next.

---

## Files & Code Organization

```
src/
├── core.ts
│   ├── AnalyticsConfig interface
│   ├── initAnalytics()
│   ├── track()
│   ├── flush()
│   ├── identify()
│   ├── reset()
│   ├── addMiddleware()
│   └── Internal helpers
│
└── useAnalytics.ts
    ├── useAnalytics() React hook
    └── Exports trackEvent function
```

**Data Flow in Code:**
1. User calls `trackEvent()`
2. `track()` collects auto properties
3. Properties merged (auto → session → default → per-call)
4. Middlewares run (can filter/modify)
5. Event added to queue
6. Flush checks: timer or size?
7. If flush: `sendBatch()` sends via sendBeacon/fetch

---

## Key Design Decisions

1. **Non-blocking** - Uses sendBeacon, never interrupts app
2. **Batching** - Groups events for efficiency
3. **Client-side only** - No server-side dependencies
4. **Flexible auth** - Backend implements own auth
5. **Middleware support** - Extensible filtering
6. **Session-level config** - Properties defined once, added to all events
7. **Simple merge logic** - Later values override earlier ones
8. **Graceful degradation** - Fails silently, never crashes app
