import React, { useState, useEffect, useCallback } from 'react';
import { Activity as ActivityIcon, Clock, User, Database, RefreshCw, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';
import { Activity, ApiResponse } from '../types/api';

interface RealActivityFeedProps {
  className?: string;
  limit?: number;
}

const RealActivityFeed: React.FC<RealActivityFeedProps> = ({ className = '', limit = 20 }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Real data loading from production database
  const loadActivities = useCallback(async () => {
    try {
      setError(null);
      const response: ApiResponse<Activity[]> = await apiService.getActivities(limit);
      setActivities(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
      console.error('❌ Error loading activities:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [limit]);

  // Real-time updates via WebSocket
  useEffect(() => {
    loadActivities();

    // Listen for real-time activity updates
    const handleActivityCreated = (newActivity: Activity) => {
      setActivities(current => [newActivity, ...current.slice(0, limit - 1)]);
    };

    apiService.on('activity_created', handleActivityCreated);

    return () => {
      apiService.off('activity_created', handleActivityCreated);
    };
  }, [loadActivities, limit]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'agent_created':
      case 'agent_spawned':
        return <User className="w-4 h-4 text-green-500" />;
      case 'agent_terminated':
      case 'agent_deleted':
        return <User className="w-4 h-4 text-red-500" />;
      case 'post_created':
        return <ActivityIcon className="w-4 h-4 text-blue-500" />;
      case 'database_migrated':
      case 'validation_completed':
        return <Database className="w-4 h-4 text-purple-500" />;
      case 'agent_metrics_updated':
        return <ActivityIcon className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'agent_created':
      case 'agent_spawned':
        return 'border-l-green-500';
      case 'agent_terminated':
      case 'agent_deleted':
        return 'border-l-red-500';
      case 'post_created':
        return 'border-l-blue-500';
      case 'database_migrated':
      case 'validation_completed':
        return 'border-l-purple-500';
      case 'agent_metrics_updated':
        return 'border-l-yellow-500';
      default:
        return 'border-l-gray-500';
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading real activity data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Live Activity Feed</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time system activities from production database</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Activities Timeline */}
      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`bg-white dark:bg-gray-900 border-l-4 ${getActivityColor(activity.type)} rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.type)}
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {activity.description}
                    </p>
                    <div className="flex items-center mt-1 space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                      {activity.agent_id && (
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {activity.agent_id.slice(0, 8)}...
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                        activity.status === 'failed' ? 'bg-red-100 text-red-800' :
                        activity.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {activity.type}
                  </div>
                </div>

                {/* Metadata */}
                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {activity.metadata.duration && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                          <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">{activity.metadata.duration}ms</span>
                        </div>
                      )}
                      {activity.metadata.tokens_used && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Tokens:</span>
                          <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">{activity.metadata.tokens_used}</span>
                        </div>
                      )}
                      {Object.entries(activity.metadata)
                        .filter(([key]) => !['duration', 'tokens_used'].includes(key))
                        .slice(0, 2)
                        .map(([key, value]) => (
                          <div key={key}>
                            <span className="text-gray-500 dark:text-gray-400">{key}:</span>
                            <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">{String(value).slice(0, 20)}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {activities.length === 0 && !loading && (
        <div className="text-center py-12">
          <ActivityIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No activities yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No system activities have been recorded yet.
          </p>
        </div>
      )}

      {/* Connection Status */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          Real-time activity streaming active
        </div>
      </div>
    </div>
  );
};

export default RealActivityFeed;
export { RealActivityFeed };