import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useWebSocketContext } from '@/context/WebSocketContext';

// Using notification type from WebSocketContext

interface RealTimeNotificationsProps {
  className?: string;
}

export const RealTimeNotifications: React.FC<RealTimeNotificationsProps> = ({ className }) => {
  const { 
    notifications, 
    clearNotifications, 
    markNotificationAsRead, 
    isConnected,
    connectionError
  } = useWebSocketContext();
  
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Auto-mark notifications as read when opened
  useEffect(() => {
    if (isOpen) {
      // Mark all unread notifications as read after a short delay
      const timer = setTimeout(() => {
        notifications.forEach(notification => {
          if (!notification.read) {
            markNotificationAsRead(notification.id);
          }
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, notifications, markNotificationAsRead]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };
  
  const getNotificationBg = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };


  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = (now.getTime() - date.getTime()) / 1000;

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 transition-colors rounded-lg ${
          isConnected 
            ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' 
            : 'text-red-600 hover:text-red-700 hover:bg-red-50'
        }`}
        title={`Notifications ${!isConnected ? '(Offline)' : ''}`}
      >
        <Bell className={`w-5 h-5 ${!isConnected ? 'animate-pulse' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {!isConnected && (
          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {notifications.length} total
                {unreadCount > 0 && (
                  <span className="text-blue-600 font-medium ml-1">
                    ({unreadCount} unread)
                  </span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    notifications.forEach(n => {
                      if (!n.read) markNotificationAsRead(n.id);
                    });
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={clearNotifications}
                disabled={notifications.length === 0}
                className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                Clear all
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-700">
                    Real-time updates offline
                  </span>
                </div>
                {connectionError && (
                  <span className="text-xs text-red-600 truncate max-w-32" title={connectionError}>
                    {connectionError}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'relative px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors',
                    notification.read 
                      ? 'bg-gray-50 opacity-75' 
                      : getNotificationBg(notification.type)
                  )}
                  onClick={() => {
                    if (!notification.read) {
                      markNotificationAsRead(notification.id);
                    }
                    // Handle navigation if needed
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium truncate ${
                          notification.read ? 'text-gray-600' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${
                        notification.read ? 'text-gray-500' : 'text-gray-700'
                      }`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-400">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                        <div className="flex items-center space-x-2">
                          {(notification.postId || notification.userId || notification.commentId) && (
                            <span className="text-xs text-gray-400">
                              {notification.postId && '📝'}
                              {notification.commentId && '💬'}
                              {notification.userId && '👤'}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            notification.type === 'success' ? 'bg-green-100 text-green-700' :
                            notification.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                            notification.type === 'error' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {notification.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-700">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};