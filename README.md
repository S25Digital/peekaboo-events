# 👻 peekaboo-events

> A lightweight, frontend-only analytics tracker that captures user interactions in React apps and sends them to a backend without blocking the UI. Powered by `sendBeacon`, custom hooks, and React lifecycle awareness — it's analytics with a stealth mode.

---

## ✨ Features

- ⚛️ Simple React hook integration (`useAnalytics`)
- 📦 Non-blocking, batched event tracking
- 🚪 Sends data on page unload or component unmount
- 🧠 Uses `sendBeacon` if available (fallbacks to `fetch`)
- 🌍 Global analytics script to plug into any frontend
- 🔧 Fully customizable & backend-agnostic

---

## 📁 Folder Structure (Frontend Only)

```
peekaboo-events/
├── public/
│   └── analytics.js        # Global event tracking script
├── src/
│   └── hooks/
│       └── useAnalytics.js # React hook for tracking events
├── App.jsx or component.js # Where you use the hook
└── README.md
```

---

## 🚀 Getting Started

### 1. Add the Global Analytics Script

Place `analytics.js` in your `public/` folder and load it in your `index.html`:

```html
<!-- public/index.html -->
<script src="/analytics.js" async></script>
```

> This sets up a global `window.analytics` object for event tracking.

---

### 2. Add the Hook to Your React App

Copy `useAnalytics.js` to your project:

```js
// src/hooks/useAnalytics.js
import { useEffect, useRef } from "react";

export default function useAnalytics(componentName = "") {
  const hasUnmounted = useRef(false);

  const trackEvent = (eventData) => {
    if (typeof window !== "undefined" && window.analytics) {
      window.analytics.track({
        ...eventData,
        component: componentName,
      });
    }
  };

  useEffect(() => {
    return () => {
      if (!hasUnmounted.current && typeof window !== "undefined" && window.analytics) {
        window.analytics.track({
          event: "component_unmounted",
          component: componentName,
        });
        window.analytics.flush();
        hasUnmounted.current = true;
      }
    };
  }, [componentName]);

  return { trackEvent };
}
```

---

### 3. Use in Components

```jsx
import React from "react";
import useAnalytics from "./hooks/useAnalytics";

function SignupButton() {
  const { trackEvent } = useAnalytics("SignupButton");

  return (
    <button onClick={() => trackEvent({ event: "signup_click" })}>
      Sign Up
    </button>
  );
}
```

---

## 🌐 Customization

By default, `analytics.js` sends data to:

```js
const endpoint = "https://your-backend.com/api/analytics";
```

Change this in `analytics.js` to point to your backend, API gateway, or serverless function.

---

## 💡 Tips

- You can track route changes, scrolls, visibility changes, etc.
- Hook can be wrapped in a custom `AnalyticsProvider` for auto-context
- Works great with SSR-friendly frameworks like Next.js

---

## 🧪 Test it Out

Open DevTools → Network → click a button → watch batched analytics POSTs go out. Or close the tab and check `sendBeacon` in action 🚀

---

## 🛡️ Disclaimer

This project is frontend-only — you'll need to build or connect your own backend to receive and store analytics.

---

## 📜 License

MIT — Use it, fork it, break it, improve it.

---

## 🎉 Built for fun, tracking with love
