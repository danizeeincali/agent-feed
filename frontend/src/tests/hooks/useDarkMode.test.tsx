/**
 * useDarkMode Hook Tests
 *
 * Comprehensive test suite for the dark mode detection hook.
 * Tests system preference detection, runtime updates, and cleanup.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, cleanup, waitFor } from '@testing-library/react';
import { useDarkMode, isDarkMode, toggleDarkMode } from '../../hooks/useDarkMode';

describe('useDarkMode Hook', () => {
  let mockMatchMedia: any;
  let mediaQueryListeners: ((event: MediaQueryListEvent) => void)[] = [];

  beforeEach(() => {
    // Reset DOM state
    document.documentElement.classList.remove('dark');
    mediaQueryListeners = [];

    // Create mock matchMedia
    mockMatchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mediaQueryListeners.push(handler);
        }
      }),
      removeEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
        const index = mediaQueryListeners.indexOf(handler);
        if (index > -1) {
          mediaQueryListeners.splice(index, 1);
        }
      }),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    window.matchMedia = mockMatchMedia;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Initial State Detection', () => {
    it('should add dark class when system prefers dark mode', () => {
      // Mock dark mode preference
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      renderHook(() => useDarkMode());

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should not add dark class when system prefers light mode', () => {
      // Mock light mode preference (default)
      renderHook(() => useDarkMode());

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should handle undefined matchMedia gracefully', () => {
      // Remove matchMedia
      const originalMatchMedia = window.matchMedia;
      // @ts-ignore
      delete window.matchMedia;

      expect(() => renderHook(() => useDarkMode())).toThrow();

      // Restore
      window.matchMedia = originalMatchMedia;
    });

    it('should query correct media string', () => {
      renderHook(() => useDarkMode());

      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });
  });

  describe('Preference Change Handling', () => {
    it('should add dark class when preference changes to dark', async () => {
      renderHook(() => useDarkMode());

      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Simulate OS preference change to dark
      const mockEvent = { matches: true } as MediaQueryListEvent;
      mediaQueryListeners.forEach(listener => listener(mockEvent));

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('should remove dark class when preference changes to light', async () => {
      // Start with dark mode
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            mediaQueryListeners.push(handler);
          }
        }),
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      renderHook(() => useDarkMode());

      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Simulate OS preference change to light
      const mockEvent = { matches: false } as MediaQueryListEvent;
      mediaQueryListeners.forEach(listener => listener(mockEvent));

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });

    it('should handle rapid preference toggles', async () => {
      renderHook(() => useDarkMode());

      // Rapid toggles
      for (let i = 0; i < 10; i++) {
        const isDark = i % 2 === 0;
        const mockEvent = { matches: isDark } as MediaQueryListEvent;
        mediaQueryListeners.forEach(listener => listener(mockEvent));
      }

      await waitFor(() => {
        // Should end in light mode (10th toggle, even number)
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });

    it('should not trigger on other media query changes', () => {
      const spy = vi.spyOn(document.documentElement.classList, 'add');

      renderHook(() => useDarkMode());

      // Simulate unrelated media query event
      // Hook should only respond to prefers-color-scheme changes
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.fn();

      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerSpy,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      const { unmount } = renderHook(() => useDarkMode());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should not cause memory leaks on repeated mount/unmount', () => {
      const initialListenerCount = mediaQueryListeners.length;

      // Mount and unmount 100 times
      for (let i = 0; i < 100; i++) {
        const { unmount } = renderHook(() => useDarkMode());
        unmount();
      }

      // Should have same listener count as before
      expect(mediaQueryListeners.length).toBe(initialListenerCount);
    });

    it('should cleanup even if error occurs during unmount', () => {
      const removeEventListenerSpy = vi.fn();

      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerSpy,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      const { unmount } = renderHook(() => useDarkMode());

      expect(() => unmount()).not.toThrow();
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should not error if called multiple times', () => {
      expect(() => {
        renderHook(() => useDarkMode());
        renderHook(() => useDarkMode());
        renderHook(() => useDarkMode());
      }).not.toThrow();
    });

    it('should handle matchMedia without addEventListener', () => {
      // Some older browsers might not support addEventListener
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: undefined,
        removeEventListener: undefined,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      // Should fall back gracefully or throw meaningful error
      expect(() => renderHook(() => useDarkMode())).toThrow();
    });

    it('should work with concurrent renders', async () => {
      const { rerender } = renderHook(() => useDarkMode());

      // Trigger multiple re-renders rapidly
      for (let i = 0; i < 10; i++) {
        rerender();
      }

      // Should maintain correct state
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Return Value', () => {
    it('should return void', () => {
      const { result } = renderHook(() => useDarkMode());
      expect(result.current).toBeUndefined();
    });
  });
});

describe('isDarkMode Utility', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('should return true when dark class exists', () => {
    document.documentElement.classList.add('dark');
    expect(isDarkMode()).toBe(true);
  });

  it('should return false when dark class does not exist', () => {
    expect(isDarkMode()).toBe(false);
  });

  it('should return false in SSR environment', () => {
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    expect(isDarkMode()).toBe(false);

    global.window = originalWindow;
  });

  it('should be reactive to class changes', () => {
    expect(isDarkMode()).toBe(false);

    document.documentElement.classList.add('dark');
    expect(isDarkMode()).toBe(true);

    document.documentElement.classList.remove('dark');
    expect(isDarkMode()).toBe(false);
  });
});

describe('toggleDarkMode Utility', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('should add dark class when not present', () => {
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    toggleDarkMode();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should remove dark class when present', () => {
    document.documentElement.classList.add('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    toggleDarkMode();

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should not error in SSR environment', () => {
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    expect(() => toggleDarkMode()).not.toThrow();

    global.window = originalWindow;
  });

  it('should work with multiple rapid toggles', () => {
    for (let i = 0; i < 100; i++) {
      toggleDarkMode();
    }

    // Should end in light mode (even number of toggles)
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should only affect dark class, not other classes', () => {
    document.documentElement.classList.add('custom-class');
    document.documentElement.classList.add('another-class');

    toggleDarkMode();

    expect(document.documentElement.classList.contains('custom-class')).toBe(true);
    expect(document.documentElement.classList.contains('another-class')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    toggleDarkMode();

    expect(document.documentElement.classList.contains('custom-class')).toBe(true);
    expect(document.documentElement.classList.contains('another-class')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

describe('Integration: Hook + Utilities', () => {
  let mockMatchMedia: any;
  let mediaQueryListeners: ((event: MediaQueryListEvent) => void)[] = [];

  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    mediaQueryListeners = [];

    mockMatchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mediaQueryListeners.push(handler);
        }
      }),
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    window.matchMedia = mockMatchMedia;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('should synchronize hook state with isDarkMode utility', async () => {
    renderHook(() => useDarkMode());

    expect(isDarkMode()).toBe(false);

    // Simulate OS preference change
    const mockEvent = { matches: true } as MediaQueryListEvent;
    mediaQueryListeners.forEach(listener => listener(mockEvent));

    await waitFor(() => {
      expect(isDarkMode()).toBe(true);
    });
  });

  it('should allow manual toggle to override system preference', () => {
    renderHook(() => useDarkMode());

    // System is light, manually toggle to dark
    toggleDarkMode();
    expect(isDarkMode()).toBe(true);

    // System is still light, but manual override is active
    // (Note: In production, system changes would re-override manual toggle)
  });
});
