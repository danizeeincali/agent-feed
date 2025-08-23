/**
 * SPARC IMPLEMENTATION: WebSocket Status Component
 * ARCHITECTURE: Real-time connection status indicator with diagnostics
 * REFINEMENT: Comprehensive connection monitoring and debugging
 * COMPLETION: Production-ready status display with troubleshooting
 */

import React, { useState, useEffect } from 'react';
import { useRobustWebSocket } from '../hooks/useRobustWebSocket';
import { ConnectionState } from '../services/connection/types';

interface WebSocketStatusProps {
  showDetails?: boolean;
  showMetrics?: boolean;
  showDiagnostics?: boolean;
  className?: string;
}

interface StatusDisplay {
  text: string;
  color: string;
  bgColor: string;
  icon: string;
  pulse?: boolean;
}

const getStatusDisplay = (
  state: ConnectionState, 
  quality: string, 
  isConnected: boolean
): StatusDisplay => {
  if (isConnected) {
    const qualityColors = {
      excellent: { color: 'text-green-800', bgColor: 'bg-green-100', icon: '🟢' },
      good: { color: 'text-green-700', bgColor: 'bg-green-50', icon: '🟢' },
      fair: { color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: '🟡' },
      poor: { color: 'text-red-700', bgColor: 'bg-red-50', icon: '🔴' },
      unknown: { color: 'text-gray-700', bgColor: 'bg-gray-50', icon: '🔵' }
    };
    
    const colors = qualityColors[quality as keyof typeof qualityColors] || qualityColors.unknown;
    return {
      text: `Connected (${quality})`,
      ...colors,
      pulse: false
    };
  }

  switch (state) {
    case ConnectionState.CONNECTING:
      return {
        text: 'Connecting...',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        icon: '🔵',
        pulse: true
      };
    case ConnectionState.RECONNECTING:
      return {
        text: 'Reconnecting...',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        icon: '🟡',
        pulse: true
      };
    case ConnectionState.ERROR:
      return {
        text: 'Connection Error',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        icon: '🔴',
        pulse: false
      };
    case ConnectionState.MANUAL_DISCONNECT:
      return {
        text: 'Manually Disconnected',
        color: 'text-gray-700',
        bgColor: 'bg-gray-50',
        icon: '⚫',
        pulse: false
      };
    default:
      return {
        text: 'Disconnected',
        color: 'text-gray-700',
        bgColor: 'bg-gray-50',
        icon: '⚫',
        pulse: false
      };
  }
};

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({
  showDetails = false,
  showMetrics = false,
  showDiagnostics = false,
  className = ''
}) => {
  const {
    isConnected,
    connectionState,
    connectionQuality,
    currentUrl,
    connect,
    disconnect,
    reconnect,
    testConnection,
    getDetailedStatus,
    getMetrics,
    getHealth
  } = useRobustWebSocket();

  const [expanded, setExpanded] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const statusDisplay = getStatusDisplay(connectionState, connectionQuality, isConnected);

  // Refresh metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (showMetrics || showDiagnostics) {
        setMetrics(getMetrics());
        setHealth(getHealth());
        setRefreshKey(prev => prev + 1);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [showMetrics, showDiagnostics, getMetrics, getHealth]);

  const handleTestConnection = async () => {
    try {
      const result = await testConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleReconnect = async () => {
    try {
      await reconnect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      {/* Main Status Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${statusDisplay.bgColor}`}>
            <span className={statusDisplay.pulse ? 'animate-pulse' : ''}>
              {statusDisplay.icon}
            </span>
            <span className={`text-sm font-medium ${statusDisplay.color}`}>
              {statusDisplay.text}
            </span>
          </div>
          
          {currentUrl && (
            <span className="text-xs text-gray-500">
              {currentUrl}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isConnected && (
            <button
              onClick={handleTestConnection}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              title="Test Connection"
            >
              Test
            </button>
          )}
          
          {!isConnected && (
            <button
              onClick={handleReconnect}
              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              title="Reconnect"
            >
              Reconnect
            </button>
          )}

          {isConnected && (
            <button
              onClick={() => disconnect()}
              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              title="Disconnect"
            >
              Disconnect
            </button>
          )}

          {(showDetails || showMetrics || showDiagnostics) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              {expanded ? '▼' : '▶'}
            </button>
          )}
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`mt-2 p-2 rounded text-xs ${
          testResult.success 
            ? 'bg-green-50 text-green-700' 
            : 'bg-red-50 text-red-700'
        }`}>
          {testResult.success 
            ? `✅ Connection test passed (${testResult.latency}ms)`
            : `❌ Connection test failed: ${testResult.error}`
          }
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Connection Details */}
          {showDetails && health && (
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="text-sm font-semibold mb-2">Connection Health</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Latency: {health.latency ? `${health.latency}ms` : 'N/A'}</div>
                <div>Quality: {health.networkQuality || 'unknown'}</div>
                <div>Uptime: {health.uptime ? formatUptime(health.uptime) : 'N/A'}</div>
                <div>Failures: {health.consecutiveFailures || 0}</div>
              </div>
            </div>
          )}

          {/* Metrics */}
          {showMetrics && metrics && (
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="text-sm font-semibold mb-2">Connection Metrics</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Total Attempts: {metrics.connectionAttempts}</div>
                <div>Successful: {metrics.successfulConnections}</div>
                <div>Failed: {metrics.failedConnections}</div>
                <div>Reconnections: {metrics.reconnectionAttempts}</div>
                <div>Messages Sent: {metrics.messagesSent}</div>
                <div>Messages Received: {metrics.messagesReceived}</div>
                <div>Bytes Sent: {formatBytes(metrics.bytesSent)}</div>
                <div>Bytes Received: {formatBytes(metrics.bytesReceived)}</div>
              </div>
            </div>
          )}

          {/* Diagnostics */}
          {showDiagnostics && (
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="text-sm font-semibold mb-2">Diagnostics</h4>
              <div className="text-xs space-y-1">
                <div>State: {connectionState}</div>
                <div>URL: {currentUrl || 'N/A'}</div>
                <div>Quality: {connectionQuality}</div>
                {metrics?.connectionAttempts && metrics.connectionAttempts.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium">Recent Attempts:</div>
                    {metrics.connectionAttempts.slice(-3).map((attempt: any, index: number) => (
                      <div key={index} className={`ml-2 ${attempt.success ? 'text-green-600' : 'text-red-600'}`}>
                        {attempt.url}: {attempt.success ? '✅' : '❌'} 
                        {attempt.latency && ` (${attempt.latency}ms)`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Refresh
            </button>
            
            <button
              onClick={() => console.log('Detailed Status:', getDetailedStatus())}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Log Status
            </button>
            
            {!isConnected && (
              <button
                onClick={() => connect()}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSocketStatus;