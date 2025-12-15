import { useEffect } from 'react';

/**
 * Automatic Dark Mode Detection Hook
 *
 * Detects system dark mode preference and automatically applies the 'dark' class
 * to the document root element, enabling Tailwind's dark mode variants.
 *
 * Features:
 * - Detects initial system preference via matchMedia
 * - Listens for runtime preference changes
 * - Automatically adds/removes 'dark' class on <html>
 * - Zero configuration required
 * - Works with Tailwind's class-based dark mode strategy
 *
 * Usage:
 * ```tsx
 * // In App.tsx
 * import { useDarkMode } from './hooks/useDarkMode';
 *
 * function App() {
 *   useDarkMode();  // That's it!
 *   return <YourApp />;
 * }
 * ```
 *
 * @returns void
 */
export function useDarkMode(): void {
  useEffect(() => {
    // Create media query to detect dark mode preference
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    /**
     * Apply dark mode class based on system preference
     */
    const applyDarkMode = (isDark: boolean): void => {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Set initial state based on current system preference
    applyDarkMode(darkModeMediaQuery.matches);

    /**
     * Handle system preference changes
     * User might change OS dark mode settings while app is running
     */
    const handlePreferenceChange = (event: MediaQueryListEvent): void => {
      applyDarkMode(event.matches);
    };

    // Listen for dark mode preference changes
    darkModeMediaQuery.addEventListener('change', handlePreferenceChange);

    // Cleanup listener on unmount
    return () => {
      darkModeMediaQuery.removeEventListener('change', handlePreferenceChange);
    };
  }, []);
}

/**
 * Get current dark mode state (utility function)
 *
 * @returns boolean - true if dark mode is active
 */
export function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

/**
 * Manually toggle dark mode (for future toggle button)
 *
 * @returns void
 */
export function toggleDarkMode(): void {
  if (typeof window === 'undefined') return;

  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
}
