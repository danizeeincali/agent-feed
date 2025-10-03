import { useState, useEffect } from 'react';

/**
 * Hook to trigger component re-renders at regular intervals
 * Useful for auto-updating relative time displays
 *
 * @param interval - Update interval in milliseconds (default: 60000 = 1 minute)
 * @returns void - Hook triggers re-renders but returns nothing
 */
export function useRelativeTime(interval: number = 60000): void {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    // Set up interval to force re-render
    const timer = setInterval(() => {
      forceUpdate(n => n + 1);
    }, interval);

    // Cleanup on unmount
    return () => clearInterval(timer);
  }, [interval]);
}
