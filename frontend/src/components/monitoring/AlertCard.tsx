import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, Check, Loader2 } from 'lucide-react';
import type { Alert } from '../../services/MonitoringApiService';

interface AlertCardProps {
  alert: Alert;
  onAcknowledge: (alertId: string) => Promise<void>;
  compact?: boolean;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onAcknowledge, compact = false }) => {
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  const getSeverityConfig = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          textColor: 'text-red-800 dark:text-red-200',
          borderColor: 'border-red-300 dark:border-red-800',
          iconColor: 'text-red-600 dark:text-red-400',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          borderColor: 'border-yellow-300 dark:border-yellow-800',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          textColor: 'text-blue-800 dark:text-blue-200',
          borderColor: 'border-blue-300 dark:border-blue-800',
          iconColor: 'text-blue-600 dark:text-blue-400',
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-gray-100 dark:bg-gray-900/20',
          textColor: 'text-gray-800 dark:text-gray-200',
          borderColor: 'border-gray-300 dark:border-gray-800',
          iconColor: 'text-gray-600 dark:text-gray-400',
        };
    }
  };

  const getRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleAcknowledge = async () => {
    if (isAcknowledging || alert.acknowledged) return;

    try {
      setIsAcknowledging(true);
      await onAcknowledge(alert.id);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      // Error handling will be done by parent component via toast
    } finally {
      setIsAcknowledging(false);
    }
  };

  const config = getSeverityConfig(alert.severity);
  const Icon = config.icon;

  return (
    <div
      className={`
        border rounded-lg transition-all
        bg-white dark:bg-gray-800
        ${config.borderColor}
        ${compact ? 'p-3' : 'p-4'}
        hover:shadow-md
      `}
      role="article"
      aria-label={`${alert.severity} alert: ${alert.title}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${compact ? 'mt-0.5' : 'mt-1'}`}>
          <Icon className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${config.iconColor}`} aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with severity badge and timestamp */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`
                  inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase
                  ${config.bgColor} ${config.textColor}
                `}
              >
                {alert.severity}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {getRelativeTime(alert.timestamp)}
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-base'} text-gray-900 dark:text-gray-100 mb-1`}>
            {alert.title}
          </h3>

          {/* Message */}
          <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-300 mb-3`}>
            {alert.message}
          </p>

          {/* Acknowledge status/button */}
          <div className="flex items-center justify-between">
            {alert.acknowledged ? (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden="true" />
                <span>
                  Acknowledged{alert.acknowledgedBy ? ` by ${alert.acknowledgedBy}` : ''}
                </span>
              </div>
            ) : (
              <button
                onClick={handleAcknowledge}
                disabled={isAcknowledging}
                className={`
                  inline-flex items-center gap-2 px-3 py-1.5
                  text-sm font-medium rounded
                  transition-colors
                  ${isAcknowledging
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800
                `}
                aria-label="Acknowledge alert"
              >
                {isAcknowledging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Acknowledging...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    <span>Acknowledge</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
