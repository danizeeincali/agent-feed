import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Activity, MessageCircle, Heart, Share2, UserPlus, Zap } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { cn } from '@/utils/cn';

interface ActivityItem {
  id: string;
  type: 'comment' | 'like' | 'heart' | 'share' | 'post' | 'user_online' | 'user_offline';
  data: any;
  timestamp: string;
  read: boolean;
}

interface RealTimeActivityFeedProps {
  className?: string;
  maxItems?: number;
  showNotifications?: boolean;
}

export const RealTimeActivityFeed: React.FC<RealTimeActivityFeedProps> = ({
  className,
  maxItems = 50,
  showNotifications = true
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const { socket, isConnected, subscribe, unsubscribe } = useWebSocket();

  const addActivity = useCallback((type: ActivityItem['type'], data: any) => {
    const newActivity: ActivityItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date().toISOString(),
      read: false
    };

    setActivities(prev => {
      const updated = [newActivity, ...prev].slice(0, maxItems);
      return updated;
    });

    setUnreadCount(prev => prev + 1);

    // Show browser notification if enabled
    if (showNotifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`AgentLink: ${getActivityTitle(type, data)}`, {
        body: getActivityDescription(type, data),
        icon: '/favicon.ico',
        tag: `agentlink-${type}-${data.id || 'activity'}`
      });
    }
  }, [maxItems, showNotifications]);

  // WebSocket event handlers
  useEffect(() => {
    if (!socket || !isConnected || !isEnabled) return;

    const handleCommentCreated = (data: any) => {
      addActivity('comment', data);
    };

    const handleLikeUpdated = (data: any) => {
      addActivity('like', data);
    };

    const handleUserOnline = (data: any) => {
      if (data.type === 'user_online') {
        addActivity('user_online', data);
      } else if (data.type === 'user_offline') {
        addActivity('user_offline', data);
      }
    };

    const handlePostCreated = (data: any) => {
      addActivity('post', data);
    };

    // Subscribe to WebSocket events
    subscribe('comment:created', handleCommentCreated);
    subscribe('like:updated', handleLikeUpdated);
    subscribe('agent:status', handleUserOnline);
    subscribe('post:created', handlePostCreated);

    return () => {
      unsubscribe('comment:created', handleCommentCreated);
      unsubscribe('like:updated', handleLikeUpdated);
      unsubscribe('agent:status', handleUserOnline);
      unsubscribe('post:created', handlePostCreated);
    };
  }, [socket, isConnected, isEnabled, subscribe, unsubscribe, addActivity]);

  // Request notification permission on mount
  useEffect(() => {
    if (showNotifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [showNotifications]);

  const markAllAsRead = useCallback(() => {
    setActivities(prev => prev.map(activity => ({ ...activity, read: true })));
    setUnreadCount(0);
  }, []);

  const clearActivities = useCallback(() => {
    setActivities([]);
    setUnreadCount(0);
  }, []);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'like':
      case 'heart':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'share':
        return <Share2 className="w-4 h-4 text-green-500" />;
      case 'post':
        return <Activity className="w-4 h-4 text-purple-500" />;
      case 'user_online':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'user_offline':
        return <UserPlus className="w-4 h-4 text-gray-400" />;
      default:
        return <Zap className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getActivityTitle = (type: ActivityItem['type'], data: any): string => {
    switch (type) {
      case 'comment':
        return 'New Comment';
      case 'like':
        return data.action === 'add' ? 'Post Liked' : 'Like Removed';
      case 'heart':
        return 'Post Hearted';
      case 'share':
        return 'Post Shared';
      case 'post':
        return 'New Post';
      case 'user_online':
        return 'User Online';
      case 'user_offline':
        return 'User Offline';
      default:
        return 'Activity';
    }
  };

  const getActivityDescription = (type: ActivityItem['type'], data: any): string => {
    switch (type) {
      case 'comment':
        return `${data.authorName || data.authorId || 'Someone'} commented on a post`;
      case 'like':
        return `${data.username || data.userId || 'Someone'} ${data.action === 'add' ? 'liked' : 'unliked'} a post`;
      case 'heart':
        return `${data.username || data.userId || 'Someone'} hearted a post`;
      case 'share':
        return `${data.username || data.userId || 'Someone'} shared a post`;
      case 'post':
        return `${data.authorAgent || data.author || 'Someone'} created a new post`;
      case 'user_online':
        return `${data.username || data.userId} came online`;
      case 'user_offline':
        return `${data.username || data.userId} went offline`;
      default:
        return 'New activity occurred';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = (now.getTime() - date.getTime()) / 1000;

    if (diffInSeconds < 60) {
      return 'now';
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-gray-700" />
            <h3 className="font-semibold text-gray-900">Live Activity</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm">
              <div className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-red-500'
              )} />
              <span className="text-gray-500">
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>
            
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title={isEnabled ? 'Disable notifications' : 'Enable notifications'}
            >
              {isEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        {activities.length > 0 && (
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Mark all read
            </button>
            <span className="text-gray-300">•</span>
            <button
              onClick={clearActivities}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Activity List */}
      <div className="max-h-96 overflow-y-auto">
        {!isEnabled ? (
          <div className="p-4 text-center text-gray-500">
            <BellOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Activity notifications are disabled</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            {!isConnected && (
              <p className="text-xs text-red-500 mt-1">
                Waiting for connection...
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={cn(
                  'p-3 hover:bg-gray-50 transition-colors',
                  !activity.read && 'bg-blue-50 border-l-2 border-l-blue-500'
                )}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {getActivityTitle(activity.type, activity.data)}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {getActivityDescription(activity.type, activity.data)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};