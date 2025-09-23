/**
 * Connection Status Indicator Component
 * Real-time visual indicator of WebSocket connection status
 */

import React from 'react';
import { ConnectionState } from '../../services/connection/types';
import { useConnectionManager } from '../../hooks/useConnectionManager';
import { Badge } from '../ui/badge';
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  RotateCcw
} from 'lucide-react';

export interface ConnectionStatusIndicatorProps {
  showText?: boolean;
  showLatency?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'detailed';
  className?: string;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  showText = true,
  showLatency = false,
  size = 'md',
  variant = 'default',
  className = ''
}) => {
  const { state, isConnected, health, metrics, currentAttempt, maxAttempts } = useConnectionManager();

  const getStatusConfig = () => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return {
          icon: CheckCircle,
          text: 'Connected',
          color: 'text-green-500',
          bgColor: 'bg-green-500',
          badgeVariant: 'default' as const,
          pulse: false
        };
      
      case ConnectionState.CONNECTING:
        return {
          icon: Loader2,
          text: 'Connecting',
          color: 'text-blue-500',
          bgColor: 'bg-blue-500',
          badgeVariant: 'secondary' as const,
          pulse: true
        };
      
      case ConnectionState.RECONNECTING:
        return {
          icon: RotateCcw,
          text: `Reconnecting (${currentAttempt}/${maxAttempts})`,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500',
          badgeVariant: 'outline' as const,
          pulse: true
        };
      
      case ConnectionState.ERROR:
        return {
          icon: XCircle,
          text: 'Error',
          color: 'text-red-500',
          bgColor: 'bg-red-500',
          badgeVariant: 'destructive' as const,
          pulse: false
        };
      
      case ConnectionState.MANUAL_DISCONNECT:
        return {
          icon: WifiOff,
          text: 'Disconnected',
          color: 'text-gray-500',
          bgColor: 'bg-gray-500',
          badgeVariant: 'secondary' as const,
          pulse: false
        };
      
      case ConnectionState.DISCONNECTED:
      default:
        return {
          icon: WifiOff,
          text: 'Disconnected',
          color: 'text-gray-500',
          bgColor: 'bg-gray-500',
          badgeVariant: 'outline' as const,
          pulse: false
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          iconSize: 'w-3 h-3',
          dotSize: 'w-2 h-2',
          textSize: 'text-xs',
          badgeSize: 'text-xs'
        };
      case 'lg':
        return {
          iconSize: 'w-6 h-6',
          dotSize: 'w-4 h-4',
          textSize: 'text-base',
          badgeSize: 'text-sm'
        };
      case 'md':
      default:
        return {
          iconSize: 'w-4 h-4',
          dotSize: 'w-3 h-3',
          textSize: 'text-sm',
          badgeSize: 'text-xs'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const sizeConfig = getSizeConfig();
  const Icon = statusConfig.icon;

  const getLatencyText = () => {
    if (!showLatency || !health.latency) return '';
    return ` (${Math.round(health.latency)}ms)`;
  };

  const getQualityIndicator = () => {
    if (!isConnected || !health.latency) return null;
    
    const quality = health.networkQuality;
    const qualityColors = {
      excellent: 'bg-green-500',
      good: 'bg-green-400',
      fair: 'bg-yellow-500',
      poor: 'bg-red-500',
      unknown: 'bg-gray-400'
    };

    return (
      <div className={`w-1 h-1 rounded-full ${qualityColors[quality]} ml-1`} />
    );
  };

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className={`${sizeConfig.dotSize} rounded-full ${statusConfig.bgColor} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
        {showText && (
          <span className={`${sizeConfig.textSize} ${statusConfig.color} font-medium`}>
            {statusConfig.text}{getLatencyText()}
          </span>
        )}
        {getQualityIndicator()}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          <Icon className={`${sizeConfig.iconSize} ${statusConfig.color} ${statusConfig.pulse ? 'animate-spin' : ''}`} />
          {showText && (
            <span className={`${sizeConfig.textSize} ${statusConfig.color} font-medium`}>
              {statusConfig.text}{getLatencyText()}
            </span>
          )}
        </div>
        
        {isConnected && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>Quality: {health.networkQuality}</span>
            {health.consecutiveFailures > 0 && (
              <span className="text-amber-600">
                ({health.consecutiveFailures} failures)
              </span>
            )}
          </div>
        )}
        
        {state === ConnectionState.RECONNECTING && (
          <Badge variant="outline" className={sizeConfig.badgeSize}>
            Attempt {currentAttempt}/{maxAttempts}
          </Badge>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant={statusConfig.badgeVariant} className={sizeConfig.badgeSize}>
        <Icon className={`${sizeConfig.iconSize} mr-1 ${statusConfig.pulse ? 'animate-spin' : ''}`} />
        {showText && (
          <span>
            {statusConfig.text}{getLatencyText()}
          </span>
        )}
        {getQualityIndicator()}
      </Badge>
    </div>
  );
};

// Specialized status indicators for specific use cases
export const SimpleConnectionDot: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isConnected, state } = useConnectionManager();
  
  const getColor = () => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return 'bg-green-500';
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return 'bg-yellow-500 animate-pulse';
      case ConnectionState.ERROR:
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return <div className={`w-2 h-2 rounded-full ${getColor()} ${className}`} />;
};

export const ConnectionLatencyBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { health, isConnected } = useConnectionManager();

  if (!isConnected || health.latency === null) {
    return null;
  }

  const getVariant = () => {
    if (health.latency < 100) return 'default';
    if (health.latency < 300) return 'secondary';
    return 'destructive';
  };

  return (
    <Badge variant={getVariant()} className={`text-xs ${className}`}>
      {Math.round(health.latency)}ms
    </Badge>
  );
};

export const ConnectionQualityIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { health, isConnected } = useConnectionManager();

  if (!isConnected) return null;

  const qualityConfig = {
    excellent: { color: 'text-green-600', bg: 'bg-green-100', bars: 4 },
    good: { color: 'text-green-500', bg: 'bg-green-50', bars: 3 },
    fair: { color: 'text-yellow-500', bg: 'bg-yellow-50', bars: 2 },
    poor: { color: 'text-red-500', bg: 'bg-red-50', bars: 1 },
    unknown: { color: 'text-gray-400', bg: 'bg-gray-50', bars: 0 }
  };

  const config = qualityConfig[health.networkQuality];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className={`flex gap-0.5 ${config.color}`}>
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`w-1 bg-current transition-opacity ${
              bar <= config.bars ? 'opacity-100' : 'opacity-20'
            }`}
            style={{ height: `${bar * 2 + 2}px` }}
          />
        ))}
      </div>
      <Wifi className="w-3 h-3" />
    </div>
  );
};