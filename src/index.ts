export { default as useAnalytics } from './useAnalytics';
export { initAnalytics, identify, reset, track, flush, addMiddleware } from './core';
export type {
  TrackedEvent,
  TrackInput,
  AnalyticsConfig,
  AnalyticsProperties,
  Middleware,
} from './core';
