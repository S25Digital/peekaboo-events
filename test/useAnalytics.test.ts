import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useAnalytics from '../src/useAnalytics';

// Mock the core module so these tests verify the hook's behavior
// (default onScreen, override, unmount-once) without depending on
// the real queue/flush/network logic — that's covered in core.test.ts.
vi.mock('../src/core', () => ({
  track: vi.fn(),
}));

import { track } from '../src/core';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAnalytics', () => {
  it('returns a trackEvent function', () => {
    const { result } = renderHook(() => useAnalytics('MyComponent'));
    expect(typeof result.current.trackEvent).toBe('function');
  });

  it('defaults onScreen to the component name', () => {
    const { result } = renderHook(() => useAnalytics('CheckoutScreen'));

    result.current.trackEvent({ event: 'button_clicked' });

    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'button_clicked', onScreen: 'CheckoutScreen' })
    );
  });

  it('allows onScreen to be overridden per call', () => {
    const { result } = renderHook(() => useAnalytics('CheckoutScreen'));

    result.current.trackEvent({ event: 'modal_opened', onScreen: 'UpgradeModal' });

    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'modal_opened', onScreen: 'UpgradeModal' })
    );
  });

  it('passes through custom properties untouched', () => {
    const { result } = renderHook(() => useAnalytics('MyComponent'));

    result.current.trackEvent({
      event: 'form_submitted',
      properties: { formId: 'signup', meta: { variant: 'B' } },
    });

    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'form_submitted',
        properties: { formId: 'signup', meta: { variant: 'B' } },
      })
    );
  });

  it('fires a component_unmounted event exactly once on unmount', () => {
    const { unmount } = renderHook(() => useAnalytics('MyComponent'));

    expect(track).not.toHaveBeenCalled();

    unmount();

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith({
      event: 'component_unmounted',
      onScreen: 'MyComponent',
    });
  });

  it('does not fire component_unmounted when componentName changes, only on true unmount', () => {
    const { rerender, unmount } = renderHook(
      ({ name }: { name: string }) => useAnalytics(name),
      { initialProps: { name: 'ScreenA' } }
    );

    rerender({ name: 'ScreenB' });
    // a name change is not an unmount — no event should fire yet
    expect(track).not.toHaveBeenCalled();

    unmount();
    // uses the latest known name (ScreenB) at the time of actual unmount
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith({ event: 'component_unmounted', onScreen: 'ScreenB' });
  });

  it('uses an empty string as componentName when none is provided', () => {
    const { result } = renderHook(() => useAnalytics());

    result.current.trackEvent({ event: 'test_event' });

    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ onScreen: '' })
    );
  });
});
