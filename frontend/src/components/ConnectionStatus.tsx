import React from 'react';
import { useWebSocketSingletonContext } from '../context/WebSocketSingletonContext';
import { Wifi, WifiOff, AlertCircle, Users } from 'lucide-react';

export const ConnectionStatus: React.FC = () => {
  const { isConnected, connectionState, systemStats, onlineUsers, reconnect } = useWebSocketSingletonContext();

  const getStatusColor = () => {
    if (isConnected) return 'green';
    if (connectionState.isConnecting) return 'yellow';
    return 'red';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (connectionState.isConnecting) return 'Connecting...';
    if (connectionState.reconnectAttempt > 0) {
      return `Reconnecting (${connectionState.reconnectAttempt})`;
    }
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (isConnected) return <Wifi className="w-4 h-4" />;
    if (connectionState.isConnecting) return <AlertCircle className="w-4 h-4 animate-spin" />;
    return <WifiOff className="w-4 h-4" />;
  };

  const colors = {
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 space-y-2">
      {/* Main connection status */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${colors[getStatusColor()]}`}>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' :
            connectionState.isConnecting ? 'bg-yellow-500 animate-pulse' :
            'bg-red-500'
          }`} />
          <span>{getStatusText()}</span>
          {getStatusIcon()}
        </div>
        
        {/* Online users count */}
        {isConnected && (
          <div className="flex items-center space-x-1 text-xs">
            <Users className="w-3 h-3" />
            <span>{onlineUsers.length}</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {connectionState.connectionError && !isConnected && (
        <div className="px-3 py-2 rounded-lg text-xs bg-red-50 text-red-600">
          <div className="flex items-center justify-between">
            <span className="truncate">{connectionState.connectionError}</span>
            <button 
              onClick={reconnect}
              className="ml-2 px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-red-700 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* System stats (only when connected) */}
      {isConnected && systemStats && (
        <div className="px-3 py-2 rounded-lg text-xs bg-gray-50 text-gray-600">
          <div className="grid grid-cols-2 gap-2">
            <div>Users: {systemStats.connectedUsers}</div>
            <div>Rooms: {systemStats.activeRooms}</div>
          </div>
        </div>
      )}

      {/* Last connected time */}
      {!isConnected && connectionState.lastConnected && (
        <div className="px-3 py-1 rounded text-xs text-gray-500 bg-gray-50">
          Last connected: {new Date(connectionState.lastConnected).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;