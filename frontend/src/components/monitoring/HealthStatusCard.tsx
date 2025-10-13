import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';

/**
 * HealthStatus interface from connection types
 */
interface HealthStatus {
  isHealthy: boolean;
  latency: number | null;
  lastPing: Date | null;
  consecutiveFailures: number;
  uptime: number;
  serverTimestamp: Date | null;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}

/**
 * Props for HealthStatusCard component
 */
interface HealthStatusCardProps {
  healthStatus: HealthStatus | null;
  loading?: boolean;
}

/**
 * Status type derived from health data
 */
type StatusType = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Status configuration mapping
 */
interface StatusConfig {
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

/**
 * Format uptime seconds to human-readable format (e.g., "5d 12h 34m")
 */
function formatUptime(seconds: number): string {
  if (!seconds || seconds < 0) {
    return '0m';
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(' ');
}

/**
 * Calculate health score (0-100) based on health status
 */
function calculateHealthScore(healthStatus: HealthStatus): number {
  let score = 100;

  // Reduce score based on consecutive failures
  score -= healthStatus.consecutiveFailures * 10;

  // Reduce score based on network quality
  const qualityScores: Record<HealthStatus['networkQuality'], number> = {
    excellent: 0,
    good: 5,
    fair: 15,
    poor: 30,
    unknown: 20
  };
  score -= qualityScores[healthStatus.networkQuality];

  // Reduce score if not healthy
  if (!healthStatus.isHealthy) {
    score -= 20;
  }

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine status type from health data
 */
function getStatusType(healthStatus: HealthStatus): StatusType {
  const score = calculateHealthScore(healthStatus);

  if (!healthStatus.isHealthy || score < 50) {
    return 'unhealthy';
  }
  if (score < 80 || healthStatus.networkQuality === 'fair' || healthStatus.networkQuality === 'poor') {
    return 'degraded';
  }
  return 'healthy';
}

/**
 * Get status configuration for display
 */
function getStatusConfig(status: StatusType): StatusConfig {
  const configs: Record<StatusType, StatusConfig> = {
    healthy: {
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      icon: CheckCircle,
      label: 'Healthy'
    },
    degraded: {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500',
      icon: AlertTriangle,
      label: 'Degraded'
    },
    unhealthy: {
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      icon: AlertCircle,
      label: 'Unhealthy'
    }
  };

  return configs[status];
}

/**
 * Format timestamp to relative time
 */
function formatTimestamp(date: Date | null): string {
  if (!date) {
    return 'Never';
  }

  const now = new Date();
  const timestamp = new Date(date);
  const diffMs = now.getTime() - timestamp.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ago`;
  }
  if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  }
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

/**
 * Skeleton loader component for loading state
 */
const SkeletonLoader: React.FC = () => (
  <Card className="dark:bg-gray-800 dark:border-gray-700">
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <span className="text-gray-900 dark:text-gray-100">System Health</span>
        <Activity className="w-5 h-5 text-gray-400 animate-pulse" aria-hidden="true" />
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Status Badge Skeleton */}
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Health Score Skeleton */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gray-300 dark:bg-gray-600 animate-pulse w-3/4" />
        </div>
      </div>

      {/* Info Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-24 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/**
 * Empty state component when no health data is available
 */
const EmptyState: React.FC = () => (
  <Card className="dark:bg-gray-800 dark:border-gray-700">
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <span className="text-gray-900 dark:text-gray-100">System Health</span>
        <Activity className="w-5 h-5 text-gray-400" aria-hidden="true" />
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" aria-hidden="true" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Waiting for health data...
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Health monitoring will appear here once connected
        </p>
      </div>
    </CardContent>
  </Card>
);

/**
 * HealthStatusCard Component
 *
 * Displays system health status with visual indicators, health score,
 * uptime information, and last update timestamp.
 *
 * @param {HealthStatusCardProps} props - Component props
 * @returns {JSX.Element} Rendered health status card
 */
export const HealthStatusCard: React.FC<HealthStatusCardProps> = ({
  healthStatus,
  loading = false
}) => {
  // Show loading state
  if (loading) {
    return <SkeletonLoader />;
  }

  // Show empty state when no health data
  if (!healthStatus) {
    return <EmptyState />;
  }

  // Calculate derived values
  const statusType = getStatusType(healthStatus);
  const statusConfig = getStatusConfig(statusType);
  const healthScore = calculateHealthScore(healthStatus);
  const StatusIcon = statusConfig.icon;

  return (
    <div role="region" aria-label="System Health Status">
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-gray-900 dark:text-gray-100">System Health</span>
            <Activity
              className="w-5 h-5 text-gray-400 dark:text-gray-500"
              aria-hidden="true"
            />
          </CardTitle>
        </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center space-x-3" role="status" aria-live="polite">
          <StatusIcon
            className={cn('w-6 h-6', statusConfig.color)}
            aria-hidden="true"
          />
          <span
            className={cn('text-lg font-semibold', statusConfig.color)}
            aria-label={`Status: ${statusConfig.label}`}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Health Score with Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Health Score
            </span>
            <span
              className="text-2xl font-bold text-gray-900 dark:text-gray-100"
              aria-label={`Health score: ${healthScore} out of 100`}
            >
              {healthScore}
              <span className="text-sm text-gray-500 dark:text-gray-400">/100</span>
            </span>
          </div>
          <div
            className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"
            role="progressbar"
            aria-valuenow={healthScore}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                'h-full transition-all duration-500 ease-out',
                statusConfig.bgColor
              )}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Information Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
          {/* Uptime */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Uptime
            </p>
            <p
              className="text-sm font-semibold text-gray-900 dark:text-gray-100"
              aria-label={`Uptime: ${formatUptime(healthStatus.uptime)}`}
            >
              {formatUptime(healthStatus.uptime)}
            </p>
          </div>

          {/* Network Quality */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Network
            </p>
            <p
              className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize"
              aria-label={`Network quality: ${healthStatus.networkQuality}`}
            >
              {healthStatus.networkQuality}
            </p>
          </div>

          {/* Latency */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Latency
            </p>
            <p
              className="text-sm font-semibold text-gray-900 dark:text-gray-100"
              aria-label={`Latency: ${healthStatus.latency !== null ? `${healthStatus.latency} milliseconds` : 'Unknown'}`}
            >
              {healthStatus.latency !== null ? `${healthStatus.latency}ms` : 'N/A'}
            </p>
          </div>

          {/* Last Update */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Last Update
            </p>
            <p
              className="text-sm font-semibold text-gray-900 dark:text-gray-100"
              aria-label={`Last update: ${formatTimestamp(healthStatus.lastPing)}`}
            >
              {formatTimestamp(healthStatus.lastPing)}
            </p>
          </div>
        </div>

        {/* Additional Info for Unhealthy State */}
        {statusType === 'unhealthy' && healthStatus.consecutiveFailures > 0 && (
          <div
            className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-sm text-red-800 dark:text-red-300">
              <span className="font-semibold">Warning:</span> {healthStatus.consecutiveFailures} consecutive{' '}
              {healthStatus.consecutiveFailures === 1 ? 'failure' : 'failures'} detected
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};

export default HealthStatusCard;
