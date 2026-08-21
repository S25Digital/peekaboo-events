import { useEffect, useRef } from "react";
import { track, type EventPayload } from "./core";

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
