import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Interface for RefreshControls component props
 */
export interface RefreshControlsProps {
  /** Whether auto-refresh is currently enabled */
  autoRefresh: boolean;
  /** Callback when auto-refresh toggle is clicked */
  onToggleAutoRefresh: () => void;
  /** Callback when manual refresh button is clicked */
  onManualRefresh: () => void;
  /** Whether a refresh operation is currently in progress */
  isRefreshing: boolean;
  /** Timestamp of the last successful update */
  lastUpdated: Date | null;
  /** Current refresh interval in milliseconds */
  refreshInterval: number;
  /** Optional callback when refresh interval is changed */
  onIntervalChange?: (ms: number) => void;
}

/**
 * Available refresh interval options in milliseconds
 */
const INTERVAL_OPTIONS = [
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
  { value: 300000, label: '5m' },
] as const;

/**
 * Formats a time difference into a human-readable relative time string
 * @param date - The date to format
 * @returns Formatted string like "5s ago", "1m ago", etc.
 */
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return `${diffSec}s ago`;
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }

  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
};

/**
 * RefreshControls Component
 *
 * Provides controls for managing data refresh behavior including:
 * - Auto-refresh toggle
 * - Refresh interval selection
 * - Manual refresh button
 * - Last updated timestamp display
 *
 * @example
 * ```tsx
 * <RefreshControls
 *   autoRefresh={true}
 *   onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
 *   onManualRefresh={handleRefresh}
 *   isRefreshing={loading}
 *   lastUpdated={new Date()}
 *   refreshInterval={10000}
 *   onIntervalChange={setInterval}
 * />
 * ```
 */
export const RefreshControls: React.FC<RefreshControlsProps> = ({
  autoRefresh,
  onToggleAutoRefresh,
  onManualRefresh,
  isRefreshing,
  lastUpdated,
  refreshInterval,
  onIntervalChange,
}) => {
  const [relativeTime, setRelativeTime] = useState<string>('');

  // Update relative time display every second
  useEffect(() => {
    const updateRelativeTime = () => {
      if (lastUpdated) {
        setRelativeTime(formatRelativeTime(lastUpdated));
      } else {
        setRelativeTime('Never');
      }
    };

    // Update immediately
    updateRelativeTime();

    // Then update every second
    const intervalId = setInterval(updateRelativeTime, 1000);

    return () => clearInterval(intervalId);
  }, [lastUpdated]);

  /**
   * Handle interval selection change
   */
  const handleIntervalChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newInterval = parseInt(event.target.value, 10);
    if (onIntervalChange) {
      onIntervalChange(newInterval);
    }
  };

  return (
    <div
      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
      role="region"
      aria-label="Refresh controls"
    >
      {/* Auto-Refresh Toggle */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="auto-refresh-toggle"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Auto-refresh:
        </label>
        <button
          id="auto-refresh-toggle"
          type="button"
          onClick={onToggleAutoRefresh}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-2
            ${autoRefresh
              ? 'bg-green-600 dark:bg-green-500 focus:ring-green-500'
              : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400'
            }
          `}
          role="switch"
          aria-checked={autoRefresh}
          aria-label={`Auto-refresh is ${autoRefresh ? 'on' : 'off'}`}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${autoRefresh ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
        <span
          className={`
            text-xs font-semibold uppercase tracking-wide
            ${autoRefresh
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-500 dark:text-gray-400'
            }
          `}
          aria-live="polite"
        >
          {autoRefresh ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* Interval Selector - Only visible when auto-refresh is on */}
      {autoRefresh && onIntervalChange && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="refresh-interval"
            className="sr-only"
          >
            Refresh interval
          </label>
          <select
            id="refresh-interval"
            value={refreshInterval}
            onChange={handleIntervalChange}
            className="
              block rounded-md border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-700
              text-sm text-gray-900 dark:text-gray-100
              shadow-sm focus:border-blue-500 focus:ring-blue-500
              py-1.5 pl-3 pr-8
              transition-colors
            "
            aria-label="Select refresh interval"
          >
            {INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Manual Refresh Button */}
      <button
        type="button"
        onClick={onManualRefresh}
        disabled={isRefreshing}
        className="
          inline-flex items-center gap-2 px-4 py-2 rounded-md
          bg-blue-600 dark:bg-blue-500
          text-white text-sm font-medium
          hover:bg-blue-700 dark:hover:bg-blue-600
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
        "
        aria-label={isRefreshing ? 'Refreshing...' : 'Refresh data'}
        aria-live="polite"
        aria-busy={isRefreshing}
      >
        <RefreshCw
          className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        <span>Refresh</span>
      </button>

      {/* Last Updated Display */}
      <div
        className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="font-medium">Updated:</span>
        <time
          dateTime={lastUpdated?.toISOString()}
          title={lastUpdated?.toLocaleString()}
        >
          {relativeTime}
        </time>
      </div>
    </div>
  );
};

export default RefreshControls;
