/**
 * Instance Status Indicator Component
 * Real-time status indicator for Claude instances with metrics and health info
 * Follows existing UI patterns and integrates with WebSocket updates
 */

import React, { useMemo } from 'react';
import { 
  Circle, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  MemoryStick, 
  Wifi, 
  WifiOff,
  Server,
  Zap
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { InstanceStatusIndicatorProps, ClaudeInstance } from '../../types/claude-instances';

const formatUptime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

const formatMemory = (bytes?: number): string => {
  if (!bytes) return 'N/A';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${Math.round(mb)}MB`;
  return `${(mb / 1024).toFixed(1)}GB`;
};

export const InstanceStatusIndicator: React.FC<InstanceStatusIndicatorProps> = ({
  instance,
  showDetails = true,
  showMetrics = false,
  className,
  size = 'md'
}) => {
  const statusConfig = useMemo(() => {
    switch (instance.status) {
      case 'running':
        return {
          color: 'text-green-500',
          bgColor: 'bg-green-500',
          bgColorLight: 'bg-green-100 dark:bg-green-900/20',
          textColor: 'text-green-700 dark:text-green-400',
          icon: CheckCircle,
          label: 'Running',
          pulse: true
        };
      case 'starting':
        return {
          color: 'text-blue-500',
          bgColor: 'bg-blue-500',
          bgColorLight: 'bg-blue-100 dark:bg-blue-900/20',
          textColor: 'text-blue-700 dark:text-blue-400',
          icon: Clock,
          label: 'Starting',
          pulse: true
        };
      case 'stopping':
        return {
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500',
          bgColorLight: 'bg-yellow-100 dark:bg-yellow-900/20',
          textColor: 'text-yellow-700 dark:text-yellow-400',
          icon: Clock,
          label: 'Stopping',
          pulse: false
        };
      case 'restarting':
        return {
          color: 'text-orange-500',
          bgColor: 'bg-orange-500',
          bgColorLight: 'bg-orange-100 dark:bg-orange-900/20',
          textColor: 'text-orange-700 dark:text-orange-400',
          icon: Activity,
          label: 'Restarting',
          pulse: true
        };
      case 'error':
        return {
          color: 'text-red-500',
          bgColor: 'bg-red-500',
          bgColorLight: 'bg-red-100 dark:bg-red-900/20',
          textColor: 'text-red-700 dark:text-red-400',
          icon: AlertCircle,
          label: 'Error',
          pulse: false
        };
      case 'stopped':
      default:
        return {
          color: 'text-gray-500',
          bgColor: 'bg-gray-500',
          bgColorLight: 'bg-gray-100 dark:bg-gray-900/20',
          textColor: 'text-gray-700 dark:text-gray-400',
          icon: Circle,
          label: 'Stopped',
          pulse: false
        };
    }
  }, [instance.status]);

  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          dot: 'w-2 h-2',
          icon: 'w-3 h-3',
          text: 'text-xs',
          spacing: 'space-x-1',
          padding: 'p-1'
        };
      case 'lg':
        return {
          dot: 'w-4 h-4',
          icon: 'w-5 h-5',
          text: 'text-base',
          spacing: 'space-x-3',
          padding: 'p-3'
        };
      case 'md':
      default:
        return {
          dot: 'w-3 h-3',
          icon: 'w-4 h-4',
          text: 'text-sm',
          spacing: 'space-x-2',
          padding: 'p-2'
        };
    }
  }, [size]);

  const StatusIcon = statusConfig.icon;

  // Simple dot indicator for minimal display
  if (!showDetails && !showMetrics) {
    return (
      <div className={cn('flex items-center', sizeConfig.spacing, className)}>
        <div className="relative">
          <div className={cn(sizeConfig.dot, 'rounded-full', statusConfig.bgColor)} />
          {statusConfig.pulse && (
            <div className={cn(
              sizeConfig.dot,
              'absolute inset-0 rounded-full animate-ping',
              statusConfig.bgColor,
              'opacity-75'
            )} />
          )}
        </div>
        <span className={cn(sizeConfig.text, statusConfig.color, 'font-medium')}>
          {statusConfig.label}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-start', sizeConfig.spacing, className)}>
      {/* Status Icon */}
      <div className={cn('relative flex-shrink-0', sizeConfig.padding, statusConfig.bgColorLight, 'rounded-lg')}>
        <StatusIcon className={cn(sizeConfig.icon, statusConfig.color)} />
        {statusConfig.pulse && (
          <div className={cn(
            'absolute inset-0 rounded-lg animate-pulse',
            statusConfig.bgColorLight,
            'opacity-50'
          )} />
        )}
      </div>

      {/* Status Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn(sizeConfig.text, statusConfig.textColor, 'font-medium')}>
            {statusConfig.label}
          </span>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-1">
            {instance.isConnected ? (
              <Wifi className={cn(sizeConfig.icon, 'text-green-500')} />
            ) : (
              <WifiOff className={cn(sizeConfig.icon, 'text-gray-400')} />
            )}
          </div>
        </div>

        {/* Additional Details */}
        {showDetails && (
          <div className={cn('mt-1 space-y-1', size === 'sm' ? 'text-xs' : 'text-sm', 'text-gray-500 dark:text-gray-400')}>
            {/* PID and Uptime */}
            {instance.pid && (
              <div className="flex items-center space-x-2">
                <Server className="w-3 h-3" />
                <span>PID: {instance.pid}</span>
                {instance.uptime && (
                  <>
                    <span>•</span>
                    <span>Up {formatUptime(instance.uptime)}</span>
                  </>
                )}
              </div>
            )}

            {/* Error Message */}
            {instance.lastError && instance.status === 'error' && (
              <div className="flex items-start space-x-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="text-xs break-words">{instance.lastError}</span>
              </div>
            )}

            {/* Last Activity */}
            {instance.lastActivity && (
              <div className="flex items-center space-x-2">
                <Activity className="w-3 h-3" />
                <span>
                  Last active: {instance.lastActivity.toLocaleTimeString()}
                </span>
              </div>
            )}

            {/* Connection Count */}
            {instance.connectionCount !== undefined && instance.connectionCount > 0 && (
              <div className="flex items-center space-x-2">
                <Wifi className="w-3 h-3" />
                <span>{instance.connectionCount} connection(s)</span>
              </div>
            )}
          </div>
        )}

        {/* Metrics */}
        {showMetrics && (instance.cpuUsage !== undefined || instance.memoryUsage !== undefined) && (
          <div className={cn('mt-2 grid grid-cols-2 gap-2', size === 'sm' ? 'text-xs' : 'text-sm')}>
            {/* CPU Usage */}
            {instance.cpuUsage !== undefined && (
              <div className="flex items-center space-x-1">
                <Cpu className="w-3 h-3 text-blue-500" />
                <span className="text-gray-600 dark:text-gray-300">
                  {instance.cpuUsage.toFixed(1)}%
                </span>
              </div>
            )}

            {/* Memory Usage */}
            {instance.memoryUsage !== undefined && (
              <div className="flex items-center space-x-1">
                <MemoryStick className="w-3 h-3 text-purple-500" />
                <span className="text-gray-600 dark:text-gray-300">
                  {formatMemory(instance.memoryUsage)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Working Directory */}
        {showDetails && instance.workingDirectory && size !== 'sm' && (
          <div className={cn('mt-1', 'text-xs', 'text-gray-400 dark:text-gray-500')}>
            <span className="font-mono">{instance.workingDirectory}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstanceStatusIndicator;