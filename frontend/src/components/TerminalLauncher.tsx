import React, { useState, useCallback } from 'react';
import { Terminal, Play, Square, Settings, Maximize2 } from 'lucide-react';
import { TerminalComponent } from './Terminal';
import { useTerminal } from '../hooks/useTerminal';
import { getWebSocketUrl } from '../utils/websocket-url';

interface TerminalLauncherProps {
  /**
   * WebSocket URL for terminal connection
   */
  wsUrl?: string;
  /**
   * Initial visibility state
   */
  initialVisible?: boolean;
  /**
   * Auto-connect on mount
   */
  autoConnect?: boolean;
  /**
   * Terminal configuration
   */
  config?: {
    theme?: 'dark' | 'light';
    fontSize?: number;
    fontFamily?: string;
  };
  /**
   * Container styling
   */
  className?: string;
}

const TerminalLauncher: React.FC<TerminalLauncherProps> = ({
  wsUrl = getWebSocketUrl('/terminal'),
  initialVisible = false,
  autoConnect = false,
  config = {},
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const {
    connectionStatus,
    isConnected,
    lastError,
    connect,
    disconnect,
    send
  } = useTerminal({
    wsUrl,
    autoConnect: autoConnect && isVisible,
    onConnect: () => {
      console.log('Terminal connected');
    },
    onDisconnect: (reason) => {
      console.log('Terminal disconnected:', reason);
    },
    onError: (error) => {
      console.error('Terminal error:', error);
    }
  });

  const handleToggleVisible = useCallback(() => {
    setIsVisible(prev => {
      if (!prev && autoConnect) {
        // Connect when showing terminal
        setTimeout(() => connect(), 100);
      } else if (prev) {
        // Disconnect when hiding terminal
        disconnect();
      }
      return !prev;
    });
  }, [autoConnect, connect, disconnect]);

  const handleConnect = useCallback(() => {
    connect();
  }, [connect]);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const handleSendCommand = useCallback((command: string) => {
    send(command + '\r');
  }, [send]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return `Error: ${lastError?.substring(0, 30)}...`;
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className={`terminal-launcher ${className}`}>
      {/* Launcher Button */}
      <div className="terminal-launcher-controls flex items-center space-x-2 p-2 bg-gray-800 rounded-lg">
        <button
          onClick={handleToggleVisible}
          className={`flex items-center space-x-2 px-3 py-2 rounded transition-colors ${
            isVisible 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
          title={isVisible ? 'Hide Terminal' : 'Show Terminal'}
        >
          <Terminal className="w-4 h-4" />
          <span className="text-sm">
            {isVisible ? 'Hide Terminal' : 'Terminal'}
          </span>
        </button>

        {isVisible && (
          <>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                connectionStatus === 'error' ? 'bg-red-500' :
                'bg-gray-500'
              }`} />
              <span className={`text-xs ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>

            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                disabled={connectionStatus === 'connecting'}
              >
                <Play className="w-3 h-3" />
                <span>Connect</span>
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
              >
                <Square className="w-3 h-3" />
                <span>Disconnect</span>
              </button>
            )}

            <button
              onClick={handleToggleFullscreen}
              className="p-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-3 h-3" />
            </button>

            {/* Quick Commands */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleSendCommand('ls -la')}
                className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
                disabled={!isConnected}
                title="List files"
              >
                ls
              </button>
              <button
                onClick={() => handleSendCommand('pwd')}
                className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
                disabled={!isConnected}
                title="Print working directory"
              >
                pwd
              </button>
              <button
                onClick={() => handleSendCommand('clear')}
                className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
                disabled={!isConnected}
                title="Clear terminal"
              >
                clear
              </button>
            </div>
          </>
        )}
      </div>

      {/* Terminal Container */}
      {isVisible && (
        <div className={`terminal-container mt-2 ${
          isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'relative'
        }`}>
          <TerminalComponent
            isVisible={isVisible}
            processStatus={{
              isRunning: isConnected || false,
              pid: undefined,
              status: isConnected ? 'connected' : 'disconnected'
            }}
            initialCommand=""
          />
        </div>
      )}

      {/* Error Display */}
      {lastError && !isVisible && (
        <div className="mt-2 p-2 bg-red-900 border border-red-700 rounded text-red-300 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">Terminal Error:</span>
            <span className="truncate">{lastError}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TerminalLauncher;