# Peekaboo Events

Peekaboo Events is a lightweight, non-blocking analytics library for React. It batches events and flushes them via `sendBeacon` (with a `fetch` fallback), so tracking never blocks the UI or affects user experience. Configure it once, then use the `useAnalytics` hook anywhere in your component tree.

## Installation

```bash
npm install peekaboo-events
```

or using Yarn:

```bash
yarn add peekaboo-events
```

## Setup

Call `initAnalytics` **once**, at your app's entry point, before any component tries to track events.

```tsx
// main.tsx / App.tsx
import { initAnalytics } from 'peekaboo-events';

initAnalytics({
  trackingUrl: 'https://my-backend.com/api/analytics',
  instanceId: 'your-tenant-id', // identifies this instance to your backend
  flushIntervalMs: 5000,        // optional, default 5000
  maxQueueSize: 20,             // optional, default 20
});
```

Events tracked before `initAnalytics` runs are dropped — make sure this call happens early (e.g. before your router mounts).

## Usage

```tsx
import { useAnalytics } from 'peekaboo-events';

const MyComponent = () => {
  const { trackEvent } = useAnalytics('MyComponent');

  return (
    <button onClick={() => trackEvent({ event: 'button_clicked', data: { buttonId: 'submit' } })}>
      Submit
    </button>
  );
};

export default MyComponent;
```

### Automatic lifecycle tracking

The hook automatically fires a `component_unmounted` event when the component unmounts — you don't need to call `trackEvent` manually for this.

### Custom events

```tsx
trackEvent({
  event: 'form_submitted',
  data: { formId: 'signup', plan: 'pro' },
});
```

## Identifying users

By default, events are attributed to an auto-generated, persisted `anonymousId` (stored in `localStorage`). Once you know who the user is, call `identify`:

```tsx
import { identify, reset } from 'peekaboo-events';

// after login
identify(user.id);

// after logout
reset();
```

Once identified, events carry `userId` instead of `anonymousId`.

## How it works

1. **Batching**: Events are queued in memory and flushed together, not sent one-by-one.
2. **Flush triggers**: The queue flushes automatically on an interval (`flushIntervalMs`), when it hits `maxQueueSize`, when the tab is hidden, and on `beforeunload`.
3. **Non-blocking delivery**: Flushes use `navigator.sendBeacon` where available; if the beacon fails or isn't supported, it falls back to `fetch` with `keepalive: true`.
4. **Automatic metadata**: Every event gets a `timestamp`, the current `url`, and either `userId` or `anonymousId` attached automatically.
5. **Lifecycle tracking**: `component_unmounted` fires automatically per hook instance.

## API reference

| Export | Description |
|---|---|
| `initAnalytics(config)` | Configures the tracking URL, instance ID, and flush behavior. Call once at bootstrap. |
| `useAnalytics(componentName)` | React hook. Returns `{ trackEvent }` scoped to the given component name. |
| `identify(userId)` | Associates future events with a known user. |
| `reset()` | Clears identity; future events fall back to the anonymous ID. |
| `track(event)` | Low-level, framework-agnostic event tracking — use outside React if needed. |
| `flush()` | Manually force an immediate flush of the queue. |

### `initAnalytics` config

| Option | Type | Required | Default |
|---|---|---|---|
| `trackingUrl` | `string` | Yes | — |
| `instanceId` | `string` | Yes | — |
| `flushIntervalMs` | `number` | No | `5000` |
| `maxQueueSize` | `number` | No | `20` |

## Backend integration

Each flush POSTs a single JSON body to `trackingUrl`:

```json
{
  "instanceId": "your-tenant-id",
  "events": [
    { "event": "component_mounted", "component": "MyComponent", "timestamp": 1234567890, "url": "...", "anonymousId": "..." }
  ]
}
```

Your backend can use `instanceId` to route each batch to the correct downstream provider (e.g. CleverTap, Adobe) with the correct per-tenant credentials.

## Files included

- **`src/`**: Source code — `core.ts` (framework-agnostic queueing/flush logic) and `useAnalytics.ts` (the React hook).
- **`dist/`**: Compiled output for distribution.
- **`package.json`**: Package metadata and build scripts.

## Contributing

Feel free to open issues or submit pull requests. Contributions are welcome!

## License

MIT License. See [LICENSE](./LICENSE) for details.
