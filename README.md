# Peekaboo Events

Peekaboo Events is a lightweight, non-blocking analytics hook for React that leverages `sendBeacon` to send event data to your backend. It's designed to track component lifecycle events and custom analytics without affecting the user experience.

## Installation

To install `peekaboo-events` in your React project, run the following command:

```bash
npm install peekaboo-events
```

or using Yarn:

```bash
yarn add peekaboo-events
```

## Usage

To use the `useAnalytics` hook in your React components, simply import it and start tracking events.

### Example

```tsx
import React, { useEffect } from 'react';
import { useAnalytics } from 'peekaboo-events';

const MyComponent = () => {
  const { trackEvent, trackingUrl } = useAnalytics("MyComponent", {
    trackingUrl: "https://my-custom-backend.com/api/analytics"  // Dynamically set tracking URL
  });

  useEffect(() => {
    trackEvent({ event: "component_mounted" });

    return () => {
      trackEvent({ event: "component_unmounted" });
    };
  }, [trackEvent]);

  return (
    <div>
      Welcome to My Component!
      <br />
      Current Tracking URL: {trackingUrl}
    </div>
  );
};

export default MyComponent;
```

### Custom Event Tracking

You can track custom events by calling `trackEvent` with your desired event name and data.

```tsx
trackEvent({
  event: "button_clicked",
  data: { buttonId: "submit" }
});
```

## How It Works

1. **Automatic Event Tracking**: The hook automatically tracks when the component is mounted and unmounted.
2. **Non-blocking**: It uses the `sendBeacon` API to send data to your backend without blocking the UI or affecting user experience.
3. **Custom Events**: You can manually track any custom events by calling `trackEvent` with the event details.
4. **Configurable Tracking URL**: You can configure the tracking URL for event data. If not set, it will use the default URL provided in the hook.

### Configuring the Tracking URL

The `useAnalytics` hook accepts an optional configuration object, allowing you to set the tracking URL dynamically.

```tsx
const { trackEvent, trackingUrl } = useAnalytics("MyComponent", {
  trackingUrl: "https://my-custom-backend.com/api/analytics"  // Pass custom URL
});
```

The tracking URL can also be set globally, making it flexible to switch between different backends or endpoints.

## Backend Integration

This package is designed to send event data to your backend for persistence. By default, it sends events to the URL defined in the `trackingUrl`. You can override this URL using the configuration.

```ts
const TRACKING_URL = "https://your-backend.com/api/analytics"; // Default URL
```

## Notes

- The package uses the `sendBeacon` API for non-blocking background requests, making it suitable for tracking events without interrupting the user experience.
- The `trackEvent` function adds metadata to each event, including the component name and a timestamp, which can be useful for debugging or analysis.
  
## Files Included

The package includes the following files:

- **`src/`**: The source code for the package, including the `useAnalytics` hook.
- **`dist/`**: The compiled and minified output for distribution.
- **`package.json`**: The package metadata and build scripts.

## Contributing

Feel free to open issues or submit pull requests. Contributions are welcome!

## License

MIT License. See [LICENSE](./LICENSE) for details.

```

---

### Key Updates:
1. **Configurable Tracking URL**: The README now mentions that you can dynamically set the tracking URL via the configuration passed to the `useAnalytics` hook.
2. **Example Usage**: The example usage section demonstrates how to pass the custom URL to the hook.