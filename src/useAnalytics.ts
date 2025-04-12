import { useEffect, useRef, useState } from "react";

type EventPayload = {
  event: string;
  component?: string;
  data?: Record<string, any>;
  timestamp?: number;
  url?: string;
};

let trackingUrl: string | undefined = undefined;  // Default is undefined

// Fallback to a default URL if not configured
const defaultTrackingUrl = "https://your-backend.com/api/analytics"; 

const eventQueue: EventPayload[] = [];

const flushQueue = (queue: EventPayload[]) => {
  const payload = JSON.stringify(queue);
  const urlToUse = trackingUrl || defaultTrackingUrl; // Use the configured URL or default

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(urlToUse, blob);
  } else {
    fetch(urlToUse, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
  }
};

const track = (event: EventPayload) => {
  eventQueue.push({
    ...event,
    timestamp: Date.now(),
    url: window?.location?.href,
  });
};

const flush = () => {
  if (eventQueue.length > 0) {
    const copy = [...eventQueue];
    eventQueue.length = 0;
    flushQueue(copy);
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flush);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export default function useAnalytics(componentName = "", config: { trackingUrl?: string } = {}) {
  const [trackingUrlState, setTrackingUrlState] = useState(trackingUrl || defaultTrackingUrl);
  const hasUnmounted = useRef(false);

  // Update the tracking URL if provided in the config
  useEffect(() => {
    if (config.trackingUrl) {
      trackingUrl = config.trackingUrl;
      setTrackingUrlState(config.trackingUrl);
    }
  }, [config]);

  const trackEvent = (event: Omit<EventPayload, "component" | "timestamp" | "url">) => {
    track({
      ...event,
      component: componentName,
    });
  };

  useEffect(() => {
    return () => {
      if (!hasUnmounted.current) {
        track({
          event: "component_unmounted",
          component: componentName,
        });
        flush();
        hasUnmounted.current = true;
      }
    };
  }, [componentName]);

  return { trackEvent, trackingUrl: trackingUrlState };
}
