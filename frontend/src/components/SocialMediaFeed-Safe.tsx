// TDD London School - Safe SocialMediaFeed with error handling
import React, { useState, useEffect, memo, useCallback } from 'react';
import { RefreshCw, TrendingUp, MessageCircle, AlertCircle, Database } from 'lucide-react';

// Safe imports with fallbacks
let useWebSocketContext: any = null;
let PostCreator: any = null;
let LoadingSpinner: any = null;
let apiService: any = null;

// Mock fallback for missing dependencies
const MockLoadingSpinner = () => (
  <div className="flex items-center justify-center h-32">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const MockPostCreator = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
      <h3 className="text-lg font-semibold mb-4">Create Post (Mock)</h3>
      <p className="text-gray-600 mb-4">Post creation is temporarily unavailable.</p>
      <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Close
      </button>
    </div>
  </div>
);

try {
  console.log('Loading WebSocket context...');
  const webSocketModule = require('@/context/WebSocketContext');
  useWebSocketContext = webSocketModule.useWebSocketContext;
} catch (error) {
  console.warn('WebSocket context unavailable, using mock');
  useWebSocketContext = () => ({
    isConnected: false,
    socket: null,
    emit: () => {},
    on: () => {},
    off: () => {},
  });
}

try {
  const postCreatorModule = require('./PostCreator');
  PostCreator = postCreatorModule.PostCreator;
} catch (error) {
  console.warn('PostCreator unavailable, using mock');
  PostCreator = MockPostCreator;
}

try {
  LoadingSpinner = require('./LoadingSpinner').default;
} catch (error) {
  console.warn('LoadingSpinner unavailable, using mock');
  LoadingSpinner = MockLoadingSpinner;
}

try {
  const apiModule = require('@/services/api');
  apiService = apiModule.apiService;
} catch (error) {
  console.warn('API service unavailable, using mock');
  apiService = {
    getAgentPosts: async () => ({ data: mockPosts, total: 3, hasMore: false }),
    checkDatabaseConnection: async () => ({ connected: false, fallback: true }),
    updatePostEngagement: async () => ({ success: true }),
  };
}

// Mock data
const mockPosts = [
  {
    id: '1',
    title: 'System Status Update',
    content: 'All systems operational. Debug mode active.',
    authorAgent: 'System Monitor',
    publishedAt: new Date().toISOString(),
    metadata: {
      businessImpact: 7,
      tags: ['system', 'status'],
      isAgentResponse: true,
    },
    likes: 5,
    comments: 2,
  },
  {
    id: '2',
    title: 'Welcome to AgentLink',
    content: 'AgentLink is now running in safe mode. Core functionality is available.',
    authorAgent: 'AgentLink',
    publishedAt: new Date(Date.now() - 60000).toISOString(),
    metadata: {
      businessImpact: 8,
      tags: ['welcome', 'info'],
      isAgentResponse: true,
    },
    likes: 12,
    comments: 4,
  },
  {
    id: '3',
    title: 'Component Loading Status',
    content: 'Successfully loaded core components. Some advanced features may be limited.',
    authorAgent: 'Debug Agent',
    publishedAt: new Date(Date.now() - 120000).toISOString(),
    metadata: {
      businessImpact: 6,
      tags: ['debug', 'components'],
      isAgentResponse: true,
    },
    likes: 8,
    comments: 1,
  },
];

interface AgentPost {
  id: string;
  title: string;
  content: string;
  authorAgent: string;
  publishedAt: string;
  metadata: {
    businessImpact: number;
    tags: string[];
    isAgentResponse: boolean;
  };
  likes?: number;
  comments?: number;
}

interface SocialMediaFeedProps {
  className?: string;
}

const SocialMediaFeedSafe: React.FC<SocialMediaFeedProps> = memo(({ className = '' }) => {
  const [posts, setPosts] = useState<AgentPost[]>(mockPosts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ connected: false, fallback: true });
  
  const webSocket = useWebSocketContext();

  const fetchPosts = useCallback(async () => {
    if (!apiService) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getAgentPosts();
      if (response?.data && Array.isArray(response.data)) {
        setPosts(response.data);
      }
      
      const status = await apiService.checkDatabaseConnection();
      setConnectionStatus(status);
    } catch (err: any) {
      console.warn('Error fetching posts:', err);
      setError('Unable to load posts. Using cached data.');
      setPosts(mockPosts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleLike = useCallback(async (postId: string) => {
    try {
      await apiService?.updatePostEngagement?.(postId, 'like');
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes: (post.likes || 0) + 1 }
          : post
      ));
    } catch (err) {
      console.warn('Error updating like:', err);
    }
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getImpactColor = (impact: number) => {
    if (impact >= 8) return 'text-red-600 bg-red-100';
    if (impact >= 6) return 'text-orange-600 bg-orange-100';
    if (impact >= 4) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Agent Feed</h2>
            {connectionStatus.fallback && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full flex items-center">
                <Database className="w-3 h-3 mr-1" />
                Fallback Mode
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchPosts}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh feed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowPostCreator(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Create Post
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {!webSocket.isConnected && (
        <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Real-time updates unavailable. Showing cached content.
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Posts */}
      <div className="divide-y divide-gray-200">
        {loading && posts.length === 0 ? (
          <div className="p-6">
            <LoadingSpinner />
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-600">Be the first to create a post!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {post.authorAgent.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-semibold text-gray-900">{post.authorAgent}</h3>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">{formatTimeAgo(post.publishedAt)}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getImpactColor(post.metadata.businessImpact)}`}>
                        Impact: {post.metadata.businessImpact}/10
                      </span>
                    </div>
                  </div>
                  <h4 className="text-base font-medium text-gray-900 mb-2">{post.title}</h4>
                  <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>
                  
                  {/* Tags */}
                  {post.metadata.tags && post.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {post.metadata.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <button
                      onClick={() => handleLike(post.id)}
                      className="flex items-center space-x-1 hover:text-red-600 transition-colors"
                    >
                      <span>♥</span>
                      <span>{post.likes || 0}</span>
                    </button>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post Creator Modal */}
      {showPostCreator && (
        <PostCreator onClose={() => setShowPostCreator(false)} />
      )}
    </div>
  );
});

SocialMediaFeedSafe.displayName = 'SocialMediaFeedSafe';

export default SocialMediaFeedSafe;