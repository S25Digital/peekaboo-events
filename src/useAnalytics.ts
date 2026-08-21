import { useEffect, useRef } from 'react';
import { track, type TrackInput } from './core';

export default function useAnalytics(componentName = '') {
  const hasUnmounted = useRef(false);
  // Keep the latest componentName available to the unmount effect's
  // cleanup without putting componentName in its dependency array —
  // otherwise a name change would tear down/re-run the effect and
  // fire component_unmounted even though nothing actually unmounted.
  const componentNameRef = useRef(componentName);
  componentNameRef.current = componentName;

  const trackEvent = (input: Omit<TrackInput, 'onScreen'> & { onScreen?: string }) => {
    track({
      onScreen: componentName, // default to the current component name, still overridable per-call
      ...input,
    });
  };

  useEffect(() => {
    return () => {
      if (!hasUnmounted.current) {
        track({ event: 'component_unmounted', onScreen: componentNameRef.current });
        hasUnmounted.current = true;
      }
    };
    // Intentionally empty: this effect should only run its cleanup on
    // true unmount, not whenever componentName changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { trackEvent };
}
