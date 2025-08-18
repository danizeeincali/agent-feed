import React, { useEffect, useState } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, TrendingUp } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { cn } from '@/utils/cn';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

interface RealTimeNotificationsProps {
  className?: string;
}

export const RealTimeNotifications: React.FC<RealTimeNotificationsProps> = ({ className }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { isConnected, subscribe, unsubscribe } = useWebSocket({
    autoConnect: true
  });

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to various real-time events
    const handleAgentStatusUpdate = (data: any) => {
      const notification: Notification = {
        id: `agent-${data.agentId}-${Date.now()}`,
        type: data.status === 'error' ? 'error' : 'info',
        title: 'Agent Status Update',
        message: `Agent ${data.agentId} is now ${data.status}`,
        timestamp: new Date().toISOString(),
        read: false
      };
      addNotification(notification);
    };

    const handleTaskCompleted = (data: any) => {
      const notification: Notification = {
        id: `task-${data.taskId}-${Date.now()}`,
        type: data.result?.success ? 'success' : 'error',
        title: 'Task Completed',
        message: `Task "${data.taskId}" has ${data.result?.success ? 'completed successfully' : 'failed'}`,
        timestamp: new Date().toISOString(),
        read: false
      };
      addNotification(notification);
    };

    const handlePostCreated = (data: any) => {
      const notification: Notification = {
        id: `post-${data.id}-${Date.now()}`,
        type: 'info',
        title: 'New Post',
        message: `${data.authorAgent} posted: ${data.title}`,
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: `/posts/${data.id}`
      };
      addNotification(notification);
    };

    const handleCommentAdded = (data: any) => {
      const notification: Notification = {
        id: `comment-${data.comment.id}-${Date.now()}`,
        type: 'info',
        title: 'New Comment',
        message: `${data.comment.author} commented on a post`,
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: `/posts/${data.postId}#comment-${data.comment.id}`
      };
      addNotification(notification);
    };

    const handleSystemAlert = (data: any) => {
      const notification: Notification = {
        id: `system-${Date.now()}`,
        type: data.severity || 'warning',
        title: 'System Alert',
        message: data.message,
        timestamp: new Date().toISOString(),
        read: false
      };
      addNotification(notification);
    };

    // Subscribe to events
    subscribe('agent:status:update', handleAgentStatusUpdate);
    subscribe('task:completed', handleTaskCompleted);
    subscribe('post:created', handlePostCreated);
    subscribe('comment:added', handleCommentAdded);
    subscribe('system:alert', handleSystemAlert);

    return () => {
      unsubscribe('agent:status:update', handleAgentStatusUpdate);
      unsubscribe('task:completed', handleTaskCompleted);
      unsubscribe('post:created', handlePostCreated);
      unsubscribe('comment:added', handleCommentAdded);
      unsubscribe('system:alert', handleSystemAlert);
    };
  }, [isConnected, subscribe, unsubscribe]);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
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
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
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
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Mark all read
                </button>
              )}
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
            <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">
                  Real-time updates disconnected
                </span>
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
                    'px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors',
                    !notification.read && 'bg-blue-50 border-blue-100'
                  )}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.actionUrl) {
                      // Handle navigation
                      window.location.href = notification.actionUrl;
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
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