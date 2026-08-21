import { useEffect, useRef } from 'react';
import { track, type TrackInput } from './core';

export default function useAnalytics(componentName = '') {
  const hasUnmounted = useRef(false);

  const trackEvent = (input: Omit<TrackInput, 'onScreen'> & { onScreen?: string }) => {
    track({
      onScreen: componentName, // default to the component name, still overridable per-call
      ...input,
    });
  };

  useEffect(() => {
    return () => {
      if (!hasUnmounted.current) {
        track({ event: 'component_unmounted', onScreen: componentName });
        hasUnmounted.current = true;
      }
    };
  }, [componentName]);

  return { trackEvent };
}
