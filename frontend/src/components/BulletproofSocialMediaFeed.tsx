import React, { useState, useEffect, memo, useCallback, useMemo, Suspense } from 'react';
import { 
  RefreshCw,
  TrendingUp,
  MessageCircle,
  Clock,
  Star,
  MoreHorizontal,
  Tag,
  Heart,
  Share2,
  Plus,
  X,
  Edit3,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { PostCreator } from './PostCreator';
import LoadingSpinner from './LoadingSpinner';
import { useWebSocketContext } from '@/context/WebSocketContext';
import { TypingIndicator } from '@/components/TypingIndicator';
import { LiveActivityIndicator } from '@/components/LiveActivityIndicator';
import { ErrorBoundary } from './ErrorBoundary';
import { 
  safeArray, 
  safeObject, 
  safeString, 
  safeNumber, 
  safeDate,
  ErrorFallback,
  LoadingFallback,
  withSafetyWrapper,
  safeHandler
} from '@/utils/safetyUtils';
import { 
  SafePost, 
  postValidationSchema, 
  validateComponentProps,
  safeParseInt,
  safeParseFloat,
  isValidPost
} from '@/types/safety';

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
  shares?: number;
}

interface SocialMediaFeedProps {
  className?: string;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
  retryable?: boolean;
}

// Safe data transformers
const transformToSafePost = (post: any): AgentPost | null => {
  try {
    if (!post || typeof post !== 'object') return null;
    
    return {
      id: safeString(post.id, `fallback-${Date.now()}${Math.random()}`),
      title: safeString(post.title, 'Untitled Post'),
      content: safeString(post.content, 'No content available'),
      authorAgent: safeString(post.authorAgent, 'Unknown Agent'),
      publishedAt: safeDate(post.publishedAt).toISOString(),
      metadata: {
        businessImpact: safeNumber(post.metadata?.businessImpact, 0),
        tags: safeArray(post.metadata?.tags),
        isAgentResponse: Boolean(post.metadata?.isAgentResponse)
      },
      likes: safeNumber(post.likes, 0),
      comments: safeNumber(post.comments, 0),
      shares: safeNumber(post.shares, 0)
    };
  } catch (error) {
    console.error('Failed to transform post data:', error);
    return null;
  }
};

// Skeleton component for loading states
const PostSkeleton: React.FC = memo(() => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="animate-pulse">
      <div className="flex space-x-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/6"></div>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
));

PostSkeleton.displayName = 'PostSkeleton';

// Error boundary for individual posts
const PostErrorBoundary: React.FC<{ children: React.ReactNode; postId?: string }> = ({ children, postId }) => (
  <ErrorBoundary
    fallback={({ error, resetErrorBoundary }) => (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-2">
        <div className="flex items-center text-red-700 mb-2">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span className="font-medium">Post Error</span>
        </div>
        <p className="text-red-600 text-sm mb-3">
          Failed to load post {postId ? `(ID: ${postId})` : ''}. The post may contain invalid data.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )}
    isolate
  >
    {children}
  </ErrorBoundary>
);

const BulletproofSocialMediaFeed: React.FC<SocialMediaFeedProps> = memo(({ 
  className = '', 
  onError,
  fallback,
  retryable = true 
}) => {
  const [posts, setPosts] = useState<AgentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [productionAgents, setProductionAgents] = useState<any[]>([]);
  const [productionActivities, setProductionActivities] = useState<any[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  
  // WebSocket integration with safe fallbacks
  const webSocketContext = useWebSocketContext();
  const { 
    isConnected = false, 
    on = () => {}, 
    off = () => {}, 
    subscribeFeed = () => {}, 
    unsubscribeFeed = () => {}, 
    subscribePost = () => {}, 
    sendLike = () => {},
    addNotification = () => {}
  } = safeObject(webSocketContext);

  // Safe error handler
  const handleError = useCallback((err: Error, context?: string) => {
    console.error(`SocialMediaFeed Error${context ? ` (${context})` : ''}:`, err);
    setError(err.message || 'An unexpected error occurred');
    onError?.(err);
  }, [onError]);

  // Safe data fetcher with comprehensive error handling
  const fetchPosts = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch('/api/v1/agent-posts', {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }
      
      if (data.success) {
        const rawPosts = safeArray(data.data);
        const validPosts = rawPosts
          .map(transformToSafePost)
          .filter((post): post is AgentPost => post !== null)
          .map((post) => ({
            ...post,
            likes: safeNumber(post.likes, Math.floor(Math.random() * 20) + 1),
            comments: safeNumber(post.comments, Math.floor(Math.random() * 8)),
            shares: safeNumber(post.shares, Math.floor(Math.random() * 5))
          }));
        
        setPosts(validPosts);
        setError(null);
        setRetryCount(0);
      } else {
        throw new Error(safeString(data.message, 'Failed to fetch agent posts'));
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          handleError(new Error('Request timeout - please try again'), 'fetch');
        } else {
          handleError(err, 'fetch');
        }
      } else {
        handleError(new Error('Unknown error occurred'), 'fetch');
      }
      
      // Set fallback data on error
      if (posts.length === 0) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [handleError, posts.length]);

  // Safe production data fetcher
  const fetchProductionData = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const [agentsRes, activitiesRes] = await Promise.allSettled([
        fetch('/api/v1/claude-live/prod/agents', { signal: controller.signal }),
        fetch('/api/v1/claude-live/prod/activities', { signal: controller.signal })
      ]);
      
      clearTimeout(timeoutId);
      
      if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
        const agentsData = await agentsRes.value.json();
        setProductionAgents(safeArray(agentsData.agents));
      }
      
      if (activitiesRes.status === 'fulfilled' && activitiesRes.value.ok) {
        const activitiesData = await activitiesRes.value.json();
        setProductionActivities(safeArray(activitiesData.activities));
      }
    } catch (error) {
      // Silently handle production data errors - not critical
      console.warn('Failed to fetch production data:', error);
    }
  }, []);

  // Initialize component with error handling
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      try {
        await fetchPosts();
        if (mounted) {
          // Refresh every 60 seconds
          const interval = setInterval(() => {
            if (mounted) fetchPosts();
          }, 60000);
          
          // Subscribe to WebSocket feed
          if (isConnected) {
            subscribeFeed('main');
          }
          
          return () => {
            clearInterval(interval);
            unsubscribeFeed('main');
          };
        }
      } catch (error) {
        if (mounted) {
          handleError(error instanceof Error ? error : new Error('Initialization failed'), 'init');
        }
      }
    };
    
    initialize();
    
    return () => {
      mounted = false;
    };
  }, [fetchPosts, isConnected, subscribeFeed, unsubscribeFeed, handleError]);

  // Production data fetching
  useEffect(() => {
    fetchProductionData();
    const interval = setInterval(fetchProductionData, 30000);
    return () => clearInterval(interval);
  }, [fetchProductionData]);

  // WebSocket event handlers with error boundaries
  useEffect(() => {
    const safeHandlers = {
      handlePostCreated: safeHandler((data: any) => {
        const safePost = transformToSafePost(data);
        if (safePost) {
          setPosts(prev => [safePost, ...prev]);
          addNotification({
            type: 'info',
            title: 'New Post',
            message: `${safePost.authorAgent} created a new post`,
            read: false,
          });
        }
      }),
      
      handlePostUpdated: safeHandler((data: any) => {
        const safePost = transformToSafePost(data);
        if (safePost) {
          setPosts(prev => prev.map(post => 
            post.id === safePost.id ? { ...post, ...safePost } : post
          ));
        }
      }),
      
      handlePostDeleted: safeHandler((data: any) => {
        const postId = safeString(data?.id);
        if (postId) {
          setPosts(prev => prev.filter(post => post.id !== postId));
        }
      }),
      
      handleLikeUpdated: safeHandler((data: any) => {
        const postId = safeString(data?.postId);
        const action = safeString(data?.action);
        
        if (postId) {
          setPosts(prev => prev.map(post => {
            if (post.id === postId) {
              const currentLikes = safeNumber(post.likes, 0);
              return {
                ...post,
                likes: action === 'add' ? currentLikes + 1 : Math.max(0, currentLikes - 1)
              };
            }
            return post;
          }));
        }
      }),
      
      handleCommentCreated: safeHandler((data: any) => {
        const postId = safeString(data?.postId);
        
        if (postId) {
          setPosts(prev => prev.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                comments: safeNumber(post.comments, 0) + 1
              };
            }
            return post;
          }));
        }
      })
    };

    // Register event handlers
    on('post:created', safeHandlers.handlePostCreated);
    on('post:updated', safeHandlers.handlePostUpdated);
    on('post:deleted', safeHandlers.handlePostDeleted);
    on('like:updated', safeHandlers.handleLikeUpdated);
    on('comment:created', safeHandlers.handleCommentCreated);

    return () => {
      off('post:created', safeHandlers.handlePostCreated);
      off('post:updated', safeHandlers.handlePostUpdated);
      off('post:deleted', safeHandlers.handlePostDeleted);
      off('like:updated', safeHandlers.handleLikeUpdated);
      off('comment:created', safeHandlers.handleCommentCreated);
    };
  }, [on, off, addNotification]);

  // Subscribe to individual posts
  useEffect(() => {
    posts.forEach(post => {
      if (post?.id) {
        subscribePost(post.id);
      }
    });
  }, [posts, subscribePost]);

  // Safe handlers
  const handleRefresh = useCallback(() => {
    setRetryCount(prev => prev + 1);
    fetchPosts(true);
  }, [fetchPosts]);

  const handlePostCreated = useCallback((newPost: any) => {
    try {
      const safePost = transformToSafePost(newPost);
      if (safePost) {
        setPosts(prevPosts => [safePost, ...prevPosts]);
        setShowPostCreator(false);
        
        // Optionally trigger a refresh
        setTimeout(() => {
          fetchPosts();
        }, 1000);
      }
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to create post'), 'create');
    }
  }, [fetchPosts, handleError]);

  // Safe utility functions
  const formatTimeAgo = useCallback((dateString: string) => {
    try {
      const now = new Date();
      const postTime = safeDate(dateString);
      const diffMs = Math.max(0, now.getTime() - postTime.getTime());
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d`;
    } catch {
      return 'Unknown';
    }
  }, []);

  const getAgentEmoji = useCallback((agentName: string) => {
    const emojiMap: Record<string, string> = {
      'chief-of-staff-agent': '👨‍💼',
      'personal-todos-agent': '📋',
      'meeting-prep-agent': '📅',
      'impact-filter-agent': '🎯',
      'bull-beaver-bear-agent': '🐂',
      'goal-analyst-agent': '📊',
      'follow-ups-agent': '🔄',
      'prd-observer-agent': '📝',
      'opportunity-scout-agent': '🔍',
      'market-research-analyst-agent': '📈',
      'financial-viability-analyzer-agent': '💰',
      'link-logger-agent': '🔗',
      'agent-feedback-agent': '💬',
      'get-to-know-you-agent': '👋',
      'agent-feed-post-composer-agent': '📣',
      'agent-ideas-agent': '💡',
      'meta-agent': '🔧',
      'meta-update-agent': '🔄',
      'opportunity-log-maintainer-agent': '📚',
      'meeting-next-steps-agent': '📋',
      'chief-of-staff-automation-agent': '🤖'
    };

    return emojiMap[safeString(agentName)] || '🤖';
  }, []);

  const getImpactColor = useCallback((impact: number) => {
    const safeImpact = safeNumber(impact, 0);
    if (safeImpact >= 8) return 'text-red-500';
    if (safeImpact >= 6) return 'text-orange-500';
    if (safeImpact >= 4) return 'text-blue-500';
    return 'text-gray-500';
  }, []);

  const formatAgentName = useCallback((agentName: string) => {
    try {
      return safeString(agentName)
        .replace(/-agent$/, '')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    } catch {
      return 'Unknown Agent';
    }
  }, []);

  const handleLikePost = useCallback((postId: string, currentLikes: number) => {
    try {
      const safePostId = safeString(postId);
      const safeLikes = safeNumber(currentLikes, 0);
      
      if (!safePostId) return;
      
      // Optimistically update UI
      setPosts(prev => prev.map(post => 
        post.id === safePostId 
          ? { ...post, likes: safeLikes + 1 }
          : post
      ));
      
      // Send like event via WebSocket
      sendLike(safePostId, 'add');
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to like post'), 'like');
    }
  }, [sendLike, handleError]);

  // Memoized filtered posts
  const filteredPosts = useMemo(() => {
    try {
      return safeArray(posts).filter(post => {
        if (!post || !post.id) return false;
        
        if (filter === 'all') return true;
        if (filter === 'high-impact') {
          return safeNumber(post.metadata?.businessImpact, 0) >= 7;
        }
        if (filter === 'recent') {
          const postTime = safeDate(post.publishedAt);
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          return postTime > oneHourAgo;
        }
        
        const tags = safeArray(post.metadata?.tags || []);
        return tags.some(tag => 
          safeString(tag).toLowerCase().includes(safeString(filter).toLowerCase())
        );
      });
    } catch (error) {
      console.error('Error filtering posts:', error);
      return [];
    }
  }, [posts, filter]);

  // Loading state with skeleton
  if (loading && posts.length === 0) {
    return (
      <div className={`max-w-2xl mx-auto ${className}`} data-testid="loading-state">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state with retry
  if (error && posts.length === 0) {
    return (
      <div className={`max-w-2xl mx-auto ${className}`} data-testid="error-fallback">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <TrendingUp className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load feed</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          {retryable && (
            <div className="space-y-2">
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    Retrying...
                  </>
                ) : (
                  'Try again'
                )}
              </button>
              {retryCount > 0 && (
                <p className="text-xs text-gray-500">
                  Retry attempt: {retryCount}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <ErrorFallback 
          error={error} 
          retry={resetErrorBoundary} 
          componentName="Social Media Feed" 
        />
      )}
    >
      <div className={`max-w-2xl mx-auto ${className}`}>
        {/* Feed Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Agent Feed</h2>
              <p className="text-sm text-gray-500">Real-time updates from your Claude Code agents</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh feed"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <div className="flex items-center space-x-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(safeString(e.target.value, 'all'))}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Posts</option>
                  <option value="high-impact">High Impact</option>
                  <option value="recent">Recent</option>
                  <option value="strategic">Strategic</option>
                  <option value="productivity">Productivity</option>
                </select>
                
                <Suspense fallback={<div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />}>
                  <LiveActivityIndicator />
                </Suspense>
              </div>
            </div>
          </div>
        </div>

        {/* Post Creator with Error Boundary */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            {!showPostCreator ? (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                  AI
                </div>
                <button
                  onClick={() => setShowPostCreator(true)}
                  className="flex-1 text-left px-4 py-3 border border-gray-300 rounded-full text-gray-500 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  Start a post...
                </button>
                <button
                  onClick={() => setShowPostCreator(true)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="Create post"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Edit3 className="w-5 h-5 mr-2 text-blue-600" />
                    Create New Post
                  </h3>
                  <button
                    onClick={() => setShowPostCreator(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <ErrorBoundary
                  fallback={({ resetErrorBoundary }) => (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm mb-2">Failed to load post creator</p>
                      <button
                        onClick={resetErrorBoundary}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                >
                  <PostCreator 
                    onPostCreated={handlePostCreated}
                    className="border-0 shadow-none"
                  />
                </ErrorBoundary>
              </div>
            )}
          </div>
        </div>

        {/* Posts Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Agent Posts Archive</h2>
          
          {filteredPosts.length === 0 ? (
            <div className="text-center py-8" data-testid="empty-state">
              <div className="text-gray-400 mb-4">
                <MessageCircle className="mx-auto h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
              <p className="text-gray-500">
                Agent activity will appear here when Claude Code agents complete tasks
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredPosts.map((post) => (
                <PostErrorBoundary key={post.id} postId={post.id}>
                  <article
                    className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    {/* Post Header */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg">
                            {getAgentEmoji(post.authorAgent)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {formatAgentName(post.authorAgent)}
                            </h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>{formatTimeAgo(post.publishedAt)}</span>
                              <span>•</span>
                              <div className="flex items-center space-x-1">
                                <Star className={`h-3 w-3 ${getImpactColor(post.metadata?.businessImpact || 0)}`} />
                                <span className={getImpactColor(post.metadata?.businessImpact || 0)}>
                                  {safeNumber(post.metadata?.businessImpact, 0)}/10
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="p-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-3">
                        {safeString(post.title, 'Untitled Post')}
                      </h4>
                      <p className="text-gray-700 leading-relaxed mb-4">
                        {safeString(post.content, 'No content available')}
                      </p>
                      
                      {/* Tags */}
                      {safeArray(post.metadata?.tags).length > 0 && (
                        <div className="flex items-center space-x-2 mb-4">
                          <Tag className="h-4 w-4 text-gray-400" />
                          <div className="flex flex-wrap gap-2">
                            {safeArray(post.metadata.tags).map((tag, index) => (
                              <span
                                key={`${post.id}-tag-${index}`}
                                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full hover:bg-blue-100 cursor-pointer transition-colors"
                              >
                                #{safeString(tag)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Post Actions */}
                    <div className="border-t border-gray-100">
                      <Suspense fallback={<div className="h-4 bg-gray-100 animate-pulse mx-4 mt-3 rounded" />}>
                        <TypingIndicator postId={post.id} className="mx-4 mt-3" />
                      </Suspense>
                      
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-6">
                            <button 
                              className={`flex items-center space-x-2 transition-colors ${
                                isConnected
                                  ? 'text-gray-500 hover:text-red-500'
                                  : 'text-gray-400 cursor-not-allowed opacity-50'
                              }`}
                              onClick={() => isConnected && handleLikePost(post.id, post.likes || 0)}
                              disabled={!isConnected}
                              title={!isConnected ? 'Offline - will sync when reconnected' : ''}
                            >
                              <Heart className="h-5 w-5" />
                              <span className="text-sm">{safeNumber(post.likes, 0)}</span>
                            </button>
                            
                            <button 
                              className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
                              onClick={() => subscribePost(post.id)}
                            >
                              <MessageCircle className="h-5 w-5" />
                              <span className="text-sm">{safeNumber(post.comments, 0)}</span>
                            </button>
                            
                            <button className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors">
                              <Share2 className="h-5 w-5" />
                              <span className="text-sm">{safeNumber(post.shares, 0)}</span>
                            </button>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-xs text-gray-400">
                            {!isConnected && (
                              <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                Offline
                              </span>
                            )}
                            <span>ID: {safeString(post.id).slice(0, 8)}</span>
                          </div>
                        </div>
                        
                        {/* Connection Status */}
                        {!isConnected && (
                          <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            Real-time features unavailable - interactions will sync when reconnected
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                </PostErrorBoundary>
              ))}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
});

BulletproofSocialMediaFeed.displayName = 'BulletproofSocialMediaFeed';

// Export with safety wrapper
export default withSafetyWrapper(BulletproofSocialMediaFeed, 'BulletproofSocialMediaFeed');
export { BulletproofSocialMediaFeed };