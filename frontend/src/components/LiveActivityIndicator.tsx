import React, { useEffect, useState } from 'react';
import { useWebSocketContext } from '@/context/WebSocketContext';
import { Users, Wifi, WifiOff, Activity } from 'lucide-react';
import { cn } from '@/utils/cn';

interface LiveActivityIndicatorProps {
  className?: string;
}

export const LiveActivityIndicator: React.FC<LiveActivityIndicatorProps> = ({ className }) => {
  const { connectionState, onlineUsers, systemStats } = useWebSocketContext();
  const [recentActivity, setRecentActivity] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  // Track recent activity
  useEffect(() => {
    const activities: string[] = [];
    
    if (connectionState.isConnected) {
      activities.push('Real-time updates active');
    } else {
      activities.push('Offline mode');
    }

    if (onlineUsers.length > 0) {
      activities.push(`${onlineUsers.length} users online`);
    }

    if (systemStats) {
      activities.push(`${systemStats.connectedUsers} total connections`);
    }

    setRecentActivity(activities);
  }, [connectionState.isConnected, onlineUsers.length, systemStats]);

  const getStatusColor = () => {
    if (connectionState.isConnected) return 'text-green-600';
    if (connectionState.isConnecting) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBg = () => {
    if (connectionState.isConnected) return 'bg-green-50 border-green-200';
    if (connectionState.isConnecting) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={cn(
          'flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors',
          getStatusBg(),
          'hover:shadow-sm'
        )}
      >
        <div className="flex items-center space-x-2">
          {connectionState.isConnected ? (
            <Wifi className={cn('w-4 h-4', getStatusColor())} />
          ) : (
            <WifiOff className={cn('w-4 h-4', getStatusColor())} />
          )}
          
          <Activity className={cn('w-4 h-4', getStatusColor())} />
          
          {connectionState.isConnected && (
            <div className={cn('w-2 h-2 rounded-full animate-pulse', 'bg-green-500')} />
          )}
        </div>

        <div className="text-sm">
          <span className={cn('font-medium', getStatusColor())}>
            {connectionState.isConnected ? 'Live' : 'Offline'}
          </span>
          {onlineUsers.length > 0 && (
            <span className="text-gray-600 ml-2">
              {onlineUsers.length} online
            </span>
          )}
        </div>
      </button>

      {/* Details Dropdown */}
      {showDetails && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Live Activity</span>
            </h3>
            
            {/* Connection Status */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Connection Status:</span>
                <span className={cn('font-medium', getStatusColor())}>
                  {connectionState.isConnected ? 'Connected' : 
                   connectionState.isConnecting ? 'Connecting...' : 'Disconnected'}
                </span>
              </div>
              
              {connectionState.lastConnected && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Connected:</span>
                  <span className="text-gray-800">
                    {new Date(connectionState.lastConnected).toLocaleTimeString()}
                  </span>
                </div>
              )}
              
              {connectionState.reconnectAttempt > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Reconnect Attempts:</span>
                  <span className="text-yellow-600 font-medium">
                    {connectionState.reconnectAttempt}
                  </span>
                </div>
              )}
            </div>

            {/* Online Users */}
            {onlineUsers.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <Users className="w-4 h-4" />
                  <span>Online Users ({onlineUsers.length})</span>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {onlineUsers.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">{user.username}</span>
                      <span className="text-gray-400">
                        {new Date(user.lastSeen).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  {onlineUsers.length > 5 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{onlineUsers.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* System Stats */}
            {systemStats && connectionState.isConnected && (
              <div className="border-t border-gray-200 pt-3">
                <div className="text-xs text-gray-600 mb-2">System Statistics</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Connections:</span>
                    <span className="font-medium">{systemStats.connectedUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rooms:</span>
                    <span className="font-medium">{systemStats.activeRooms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sockets:</span>
                    <span className="font-medium">{systemStats.totalSockets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Updated:</span>
                    <span className="font-medium">
                      {new Date(systemStats.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <div className="text-xs text-gray-600 mb-2">Recent Activity</div>
                <div className="space-y-1">
                  {recentActivity.slice(0, 3).map((activity, index) => (
                    <div key={index} className="text-xs text-gray-700 flex items-center space-x-2">
                      <div className="w-1 h-1 bg-blue-500 rounded-full" />
                      <span>{activity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {connectionState.connectionError && (
              <div className="border-t border-gray-200 pt-3">
                <div className="text-xs text-red-600 mb-1">Connection Error</div>
                <div className="text-xs text-gray-600 bg-red-50 p-2 rounded">
                  {connectionState.connectionError}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveActivityIndicator;