/**
 * MetricCard Component
 * Displays a single metric with value, progress bar, and color-coded thresholds
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  icon: LucideIcon;
  value: number;
  unit: string;
  max?: number;
  threshold?: { warning: number; critical: number };
  loading?: boolean;
  colorScheme?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
}

/**
 * Determines the status color based on value and thresholds
 */
const getStatusColor = (
  value: number,
  threshold?: { warning: number; critical: number }
): 'green' | 'yellow' | 'red' => {
  if (!threshold) return 'green';

  if (value >= threshold.critical) return 'red';
  if (value >= threshold.warning) return 'yellow';
  return 'green';
};

/**
 * Returns Tailwind classes for the given color scheme
 */
const getColorClasses = (scheme: string) => {
  const schemes = {
    blue: {
      icon: 'text-blue-500 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    green: {
      icon: 'text-green-500 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    yellow: {
      icon: 'text-yellow-500 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    red: {
      icon: 'text-red-500 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
    },
    purple: {
      icon: 'text-purple-500 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    orange: {
      icon: 'text-orange-500 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
  };

  return schemes[scheme as keyof typeof schemes] || schemes.blue;
};

/**
 * Returns Tailwind classes for status-based colors
 */
const getStatusClasses = (status: 'green' | 'yellow' | 'red') => {
  const statusColors = {
    green: {
      bg: 'bg-green-500 dark:bg-green-600',
      text: 'text-green-700 dark:text-green-300',
    },
    yellow: {
      bg: 'bg-yellow-500 dark:bg-yellow-600',
      text: 'text-yellow-700 dark:text-yellow-300',
    },
    red: {
      bg: 'bg-red-500 dark:bg-red-600',
      text: 'text-red-700 dark:text-red-300',
    },
  };

  return statusColors[status];
};

/**
 * Skeleton loading state component
 */
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
  </div>
);

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  icon: Icon,
  value,
  unit,
  max,
  threshold,
  loading = false,
  colorScheme = 'blue',
}) => {
  // Calculate percentage for progress bar
  const percentage = max ? Math.min((value / max) * 100, 100) : 0;

  // Determine status color based on threshold
  const statusColor = getStatusColor(value, threshold);

  // Get color classes
  const colors = getColorClasses(colorScheme);
  const statusClasses = getStatusClasses(statusColor);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header with icon and title */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </h3>
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
      </div>

      {/* Value display */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${statusClasses.text}`}>
            {typeof value === 'number' ? value.toFixed(1) : '0.0'}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {unit}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {max !== undefined && (
        <div className="space-y-1">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${statusClasses.bg} rounded-full transition-all duration-500 ease-out`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{value.toFixed(1)}</span>
            <span>{max}</span>
          </div>
        </div>
      )}

      {/* Threshold indicator (optional) */}
      {threshold && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {statusColor === 'red' && (
            <span className="text-red-600 dark:text-red-400 font-medium">
              ⚠ Critical threshold exceeded
            </span>
          )}
          {statusColor === 'yellow' && (
            <span className="text-yellow-600 dark:text-yellow-400 font-medium">
              ⚡ Warning threshold reached
            </span>
          )}
          {statusColor === 'green' && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              ✓ Normal operation
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
