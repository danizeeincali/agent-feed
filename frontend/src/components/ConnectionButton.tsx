import React, { useState } from 'react';
import { ConnectionState } from '../services/SingleConnectionManager';
import { UseSingleConnectionReturn } from '../hooks/useSingleConnection';

interface ConnectionButtonProps {
  instanceId?: string;
  connectionState?: ConnectionState | string;
  isConnected?: boolean;
  isConnecting?: boolean;
  isDisconnecting?: boolean;
  hasError?: boolean;
  error?: Error | null;
  isCurrentConnection?: boolean;
  onConnect?: () => Promise<void> | void;
  onDisconnect?: () => Promise<void> | void;
  url?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'danger';
  showState?: boolean;
  disabled?: boolean;
  className?: string;
}

const getStateColor = (state: ConnectionState): string => {
  switch (state) {
    case ConnectionState.CONNECTED:
      return 'text-green-600';
    case ConnectionState.CONNECTING:
      return 'text-yellow-600';
    case ConnectionState.DISCONNECTING:
      return 'text-orange-600';
    case ConnectionState.ERROR:
      return 'text-red-600';
    case ConnectionState.DISCONNECTED:
    default:
      return 'text-gray-500';
  }
};

const getStateIcon = (state: ConnectionState): string => {
  switch (state) {
    case ConnectionState.CONNECTED:
      return '●'; // Solid dot
    case ConnectionState.CONNECTING:
      return '○'; // Hollow dot (with animation)
    case ConnectionState.DISCONNECTING:
      return '◐'; // Half dot
    case ConnectionState.ERROR:
      return '✕'; // X mark
    case ConnectionState.DISCONNECTED:
    default:
      return '○'; // Hollow dot
  }
};

const getButtonVariant = (
  variant: string,
  state: ConnectionState,
  isCurrentConnection: boolean
): string => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  if (state === ConnectionState.CONNECTED && isCurrentConnection) {
    return `${baseClasses} bg-green-600 hover:bg-green-700 text-white focus:ring-green-500`;
  }
  
  if (state === ConnectionState.CONNECTING && isCurrentConnection) {
    return `${baseClasses} bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-400 cursor-not-allowed`;
  }
  
  if (state === ConnectionState.DISCONNECTING && isCurrentConnection) {
    return `${baseClasses} bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-400 cursor-not-allowed`;
  }
  
  if (state === ConnectionState.ERROR && isCurrentConnection) {
    return `${baseClasses} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500`;
  }

  // Default disconnected or not current connection
  switch (variant) {
    case 'secondary':
      return `${baseClasses} bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500`;
    case 'danger':
      return `${baseClasses} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500`;
    case 'primary':
    default:
      return `${baseClasses} bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500`;
  }
};

const getSizeClasses = (size: string): string => {
  switch (size) {
    case 'sm':
      return 'px-3 py-1.5 text-sm rounded';
    case 'lg':
      return 'px-6 py-3 text-lg rounded-lg';
    case 'md':
    default:
      return 'px-4 py-2 text-base rounded-md';
  }
};

/**
 * ConnectionButton component provides visual connection state and control
 * Integrates with useSingleConnection hook for safe connection management
 */
export const ConnectionButton: React.FC<ConnectionButtonProps> = ({
  instanceId,
  connectionState = ConnectionState.DISCONNECTED,
  isConnected = false,
  isConnecting = false,
  isDisconnecting = false,
  hasError = false,
  error = null,
  isCurrentConnection = false,
  onConnect,
  onDisconnect,
  url,
  label,
  size = 'md',
  variant = 'primary',
  showState = true,
  disabled = false,
  className = ''
}) => {
  const [isOperating, setIsOperating] = useState(false);

  // Convert string connectionState to enum if needed
  const state = typeof connectionState === 'string' 
    ? ConnectionState[connectionState as keyof typeof ConnectionState] || ConnectionState.DISCONNECTED
    : connectionState;

  const handleClick = async () => {
    if (disabled || isOperating || isConnecting || isDisconnecting) {
      return;
    }

    setIsOperating(true);

    try {
      if (isConnected && isCurrentConnection) {
        if (onDisconnect) {
          await onDisconnect();
        }
      } else {
        if (onConnect) {
          await onConnect();
        }
      }
    } catch (error) {
      console.error('Connection operation failed:', error);
    } finally {
      setIsOperating(false);
    }
  };

  const getButtonText = (): string => {
    if (label) return label;

    if (isConnecting) return 'Connecting...';
    if (isDisconnecting) return 'Disconnecting...';
    if (isConnected && isCurrentConnection) return 'Disconnect';
    if (hasError) return 'Retry';
    
    return 'Connect';
  };

  const getStateText = (): string => {
    if (!isCurrentConnection && state !== ConnectionState.DISCONNECTED) {
      return 'Inactive';
    }
    
    switch (state) {
      case ConnectionState.CONNECTED:
        return 'Connected';
      case ConnectionState.CONNECTING:
        return 'Connecting';
      case ConnectionState.DISCONNECTING:
        return 'Disconnecting';
      case ConnectionState.ERROR:
        return 'Error';
      case ConnectionState.DISCONNECTED:
      default:
        return 'Disconnected';
    }
  };

  const shouldDisable = disabled || isOperating || 
    (isConnecting && isCurrentConnection) || 
    (isDisconnecting && isCurrentConnection);

  const buttonClasses = [
    getButtonVariant(variant, state, isCurrentConnection),
    getSizeClasses(size),
    shouldDisable ? 'opacity-60 cursor-not-allowed' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleClick}
        disabled={shouldDisable}
        className={buttonClasses}
        title={hasError && error ? error.message : getStateText()}
      >
        {/* Loading spinner for connecting/disconnecting states */}
        {(isConnecting || isDisconnecting) && isCurrentConnection && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {/* Connection state icon */}
        {showState && !isConnecting && !isDisconnecting && (
          <span 
            className={`mr-2 ${getStateColor(state)} ${
              state === ConnectionState.CONNECTING ? 'animate-pulse' : ''
            }`}
          >
            {getStateIcon(state)}
          </span>
        )}
        
        {getButtonText()}
      </button>

      {/* State text display */}
      {showState && (
        <span className={`text-sm font-medium ${getStateColor(state)}`}>
          {getStateText()}
          {hasError && error && (
            <span className="ml-1" title={error.message}>
              ⚠
            </span>
          )}
        </span>
      )}
    </div>
  );
};

export default ConnectionButton;