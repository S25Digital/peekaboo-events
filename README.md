# Peekaboo Events

Peekaboo Events is a lightweight, non-blocking analytics library for React. It batches events, enriches them automatically with device/browser/session context, and flushes them via `sendBeacon` (with a `fetch` fallback) — so tracking never blocks the UI or affects user experience.

## Installation

```bash
npm install peekaboo-events
```

or using Yarn:

```bash
yarn add peekaboo-events
```

`ua-parser-js` is installed automatically as a dependency (used for browser/OS/device detection). `react` is a peer dependency — your app must already have React ≥16.8 installed.

## Setup

Call `initAnalytics` **once**, at your app's entry point, before any component tries to track events.

```tsx
// main.tsx / App.tsx
import { initAnalytics } from 'peekaboo-events';

initAnalytics({
  trackingUrl: 'https://my-backend.com/api/analytics',
  instanceId: 'your-tenant-id',       // identifies this instance to your backend
  key: 'encrypted-identifier-string', // opaque identifier string issued by your backend
  flushIntervalMs: 5000,              // optional, default 5000
  maxQueueSize: 20,                   // optional, default 20
  defaultProperties: {                // optional, merged into every event automatically
    appVersion: '2.4.1',
    environment: 'production',
  },
});
```

Events tracked before `initAnalytics` runs are dropped — make sure this call happens early (e.g. before your router mounts).

## Usage

```tsx
import { useAnalytics } from 'peekaboo-events';

const MyComponent = () => {
  const { trackEvent } = useAnalytics('MyComponent');

  return (
    <button onClick={() => trackEvent({ event: 'button_clicked', properties: { buttonId: 'submit' } })}>
      Submit
    </button>
  );
};

export default MyComponent;
```

### Automatic lifecycle tracking

The hook automatically fires a `component_unmounted` event when the component unmounts — no need to call `trackEvent` manually for this.

### Custom events and extra data

`properties` accepts any additional fields you want attached to a specific event — including nested objects for arbitrary metadata:

```tsx
trackEvent({
  event: 'form_submitted',
  properties: {
    formId: 'signup',
    plan: 'pro',
    meta: { experimentVariant: 'B', referrer: 'email' },
  },
});
```

### Sending data with every event

If you have data that should go out with *every* tracked event (app version, environment, build number, feature flags, etc.), set it once via `defaultProperties` in `initAnalytics` rather than passing it on every `trackEvent` call:

```tsx
initAnalytics({
  trackingUrl: 'https://my-backend.com/api/analytics',
  instanceId: 'tenant-abc-123',
  key: 'encrypted-identifier-string',
  defaultProperties: {
    appVersion: '2.4.1',
    environment: 'production',
  },
});
```

Merge order per event is: auto-collected properties → `defaultProperties` → per-call `properties`. A per-call value always wins if the same key is used at more than one level.

### Overriding the screen name

By default, `onScreen` is set to the component name passed into `useAnalytics(componentName)`. You can override it per-call:

```tsx
trackEvent({ event: 'modal_opened', onScreen: 'UpgradeModal' });
```

## Identifying users

By default, events are attributed to an auto-generated, persisted `distinctId` (stored in `localStorage`, stable across sessions until cleared). Once you know who the user is, call `identify`:

```tsx
import { identify, reset } from 'peekaboo-events';

// after login
identify(user.id);

// after logout
reset();
```

Once identified, `distinctId` reflects the known user ID instead of the anonymous one.

## How it works

1. **Batching**: Events are queued in memory and flushed together, not sent one-by-one.
2. **Flush triggers**: Automatic on an interval (`flushIntervalMs`), when the queue hits `maxQueueSize`, when the tab is hidden, and on `beforeunload`.
3. **Non-blocking delivery**: Flushes use `navigator.sendBeacon` where available; falls back to `fetch` with `keepalive: true` if the beacon fails or isn't supported.
4. **Automatic enrichment**: Every event is stamped with a `uuid`, `timestamp`, and a `properties` object containing device, browser, OS, session, and identity context — collected automatically from the browser.
5. **Lifecycle tracking**: `component_unmounted` fires automatically per hook instance.

## Event shape

Each tracked event looks like this:

```json
{
  "uuid": "019f4b6e-d6f7-7c10-9237-d21ade04159a",
  "event": "button_clicked",
  "timestamp": "2026-07-10T09:49:43.591Z",
  "properties": {
    "deviceType": "Desktop",
    "browser": "Chrome",
    "browserVersion": "148.0.0.0",
    "browserLanguagePrefix": "en",
    "rawUserAgent": "Mozilla/5.0 ...",
    "os": "Mac OS X",
    "osVersion": "10.15.7",
    "screenWidth": 3440,
    "sessionId": "019f4b54-7f96-7419-a82a-0987938a936c",
    "distinctId": "019f3bf9-0f7e-7149-80f8-0d9df0163053",
    "timestamp": "2026-07-10T09:49:43.030Z",
    "key": "encrypted-identifier-string",
    "onScreen": "MyComponent",
    "buttonId": "submit"
  }
}
```

Fields collected automatically: `uuid`, `timestamp`, `deviceType`, `browser`, `browserVersion`, `browserLanguagePrefix`, `rawUserAgent`, `os`, `osVersion`, `screenWidth`, `sessionId`, `distinctId`, `key`, `onScreen` (defaulted). Anything in `config.defaultProperties` or passed in `properties` on `trackEvent` is merged in alongside these.

`createdAt` is intentionally not set client-side — your backend should stamp this on ingest.

## API reference

| Export | Description |
|---|---|
| `initAnalytics(config)` | Configures tracking URL, instance ID, identifier key, default properties, and flush behavior. Call once at bootstrap. |
| `useAnalytics(componentName)` | React hook. Returns `{ trackEvent }` scoped to the given component name. |
| `identify(userId)` | Associates future events with a known user's `distinctId`. |
| `reset()` | Clears identity; future events fall back to the anonymous `distinctId`. |
| `track(input)` | Low-level, framework-agnostic event tracking — use outside React if needed. |
| `flush()` | Manually force an immediate flush of the queue. |

### `initAnalytics` config

| Option | Type | Required | Default |
|---|---|---|---|
| `trackingUrl` | `string` | Yes | — |
| `instanceId` | `string` | Yes | — |
| `key` | `string` | Yes | — |
| `flushIntervalMs` | `number` | No | `5000` |
| `maxQueueSize` | `number` | No | `20` |
| `defaultProperties` | `Record<string, unknown>` | No | `undefined` |

## Backend integration

Each flush POSTs a single JSON body to `trackingUrl`:

```json
{
  "instanceId": "your-tenant-id",
  "events": [ /* array of event objects, shape above */ ]
}
```

Your backend can use `instanceId` to route each batch to the correct downstream provider (e.g. CleverTap, Adobe) with the correct per-tenant credentials, and should stamp `createdAt` on receipt.

## Files included

- **`src/`**: Source code — `core.ts` (framework-agnostic queueing, enrichment, and flush logic) and `useAnalytics.ts` (the React hook).
- **`dist/`**: Compiled output for distribution.
- **`package.json`**: Package metadata and build scripts.

## Contributing

Feel free to open issues or submit pull requests. Contributions are welcome!

## License

MIT License. See [LICENSE](./LICENSE) for details.
