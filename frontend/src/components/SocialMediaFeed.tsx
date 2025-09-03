import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
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
  Edit3
} from 'lucide-react';
import { PostCreator } from './PostCreator';
import LoadingSpinner from './LoadingSpinner';
import { useWebSocketContext } from '@/context/WebSocketContext';
import { TypingIndicator } from '@/components/TypingIndicator';
import { LiveActivityIndicator } from '@/components/LiveActivityIndicator';

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
}

const SocialMediaFeed: React.FC<SocialMediaFeedProps> = memo(({ className = '' }) => {
  const [posts, setPosts] = useState<AgentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [productionAgents, setProductionAgents] = useState<any[]>([]);
  const [productionActivities, setProductionActivities] = useState<any[]>([]);
  
  // WebSocket integration
  const { 
    isConnected, 
    on, 
    off, 
    subscribeFeed, 
    unsubscribeFeed, 
    subscribePost, 
    sendLike,
    addNotification
  } = useWebSocketContext();

  useEffect(() => {
    fetchPosts();
    // Refresh every 30 seconds (reduced frequency due to real-time updates)
    const interval = setInterval(fetchPosts, 60000);
    
    // Subscribe to main feed for real-time updates
    if (isConnected) {
      subscribeFeed('main');
    }
    
    // Retry if initial load fails
    const retryTimer = setTimeout(() => {
      if (posts.length === 0 && error) {
        console.log('Retrying to fetch posts...');
        fetchPosts();
      }
    }, 3000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(retryTimer);
      unsubscribeFeed('main');
    };
  }, [isConnected]);

  // Real-time event handlers
  useEffect(() => {
    // Handle new posts
    const handlePostCreated = (data: any) => {
      setPosts(prev => [data, ...prev]);
      addNotification({
        type: 'info',
        title: 'New Post',
        message: `${data.authorAgent} created a new post`,
        read: false,
      });
    };

    // Handle post updates
    const handlePostUpdated = (data: any) => {
      setPosts(prev => prev.map(post => 
        post.id === data.id ? { ...post, ...data } : post
      ));
    };

    // Handle post deletion
    const handlePostDeleted = (data: any) => {
      setPosts(prev => prev.filter(post => post.id !== data.id));
    };

    // Handle like updates
    const handleLikeUpdated = (data: any) => {
      setPosts(prev => prev.map(post => {
        if (post.id === data.postId) {
          const currentLikes = post.likes || 0;
          return {
            ...post,
            likes: data.action === 'add' ? currentLikes + 1 : Math.max(0, currentLikes - 1)
          };
        }
        return post;
      }));
    };

    // Handle comment updates
    const handleCommentCreated = (data: any) => {
      setPosts(prev => prev.map(post => {
        if (post.id === data.postId) {
          return {
            ...post,
            comments: (post.comments || 0) + 1
          };
        }
        return post;
      }));
    };

    // Register event handlers
    on('post:created', handlePostCreated);
    on('post:updated', handlePostUpdated);
    on('post:deleted', handlePostDeleted);
    on('like:updated', handleLikeUpdated);
    on('comment:created', handleCommentCreated);

    return () => {
      off('post:created', handlePostCreated);
      off('post:updated', handlePostUpdated);
      off('post:deleted', handlePostDeleted);
      off('like:updated', handleLikeUpdated);
      off('comment:created', handleCommentCreated);
    };
  }, [on, off, addNotification]);

  // Subscribe to individual posts when they're loaded
  useEffect(() => {
    posts.forEach(post => {
      subscribePost(post.id);
    });
    
    return () => {
      posts.forEach(post => {
        // unsubscribePost(post.id); // Keep subscriptions active for real-time updates
      });
    };
  }, [posts, subscribePost]);

  // Production data fetching
  useEffect(() => {
    fetchProductionData();
    
    // Set up real-time polling for production agents
    const interval = setInterval(fetchProductionData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchProductionData = async () => {
    try {
      // Fetch production agents and activities from live Claude Code instance
      const [agentsRes, activitiesRes] = await Promise.all([
        fetch('/api/v1/claude-live/prod/agents'),
        fetch('/api/v1/claude-live/prod/activities')
      ]);

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setProductionAgents(agentsData.agents || []);
      }

      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setProductionActivities(activitiesData.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch production data:', error);
    }
  };

  const fetchPosts = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      const response = await fetch('/api/v1/agent-posts');
      const data = await response.json();
      
      if (data.success && data.posts) {
        // Add mock social engagement data
        const postsWithEngagement = data.posts.map((post: AgentPost) => ({
          ...post,
          likes: Math.floor(Math.random() * 20) + 1,
          comments: Math.floor(Math.random() * 8),
          shares: Math.floor(Math.random() * 5)
        }));
        setPosts(postsWithEngagement);
        setError(null);
      } else {
        setError('Failed to fetch agent posts');
      }
    } catch (err) {
      setError('Error connecting to AgentLink API');
      console.error('Failed to fetch agent posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchPosts(true);
  };

  const handlePostCreated = (newPost: any) => {
    // Add the new post to the top of the list
    setPosts(prevPosts => [newPost, ...prevPosts]);
    setShowPostCreator(false);
    
    // Optionally trigger a refresh to sync with server
    setTimeout(() => {
      fetchPosts();
    }, 1000);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postTime = new Date(dateString);
    const diffMs = now.getTime() - postTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  const getAgentEmoji = (agentName: string) => {
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

    return emojiMap[agentName] || '🤖';
  };

  const getImpactColor = (impact: number) => {
    if (impact >= 8) return 'text-red-500';
    if (impact >= 6) return 'text-orange-500';
    if (impact >= 4) return 'text-blue-500';
    return 'text-gray-500';
  };

  const formatAgentName = (agentName: string) => {
    return agentName
      .replace(/-agent$/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleLikePost = (postId: string, currentLikes: number) => {
    // Optimistically update UI
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, likes: currentLikes + 1 }
        : post
    ));
    
    // Send like event via WebSocket
    sendLike(postId, 'add');
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    if (filter === 'high-impact') return post.metadata.businessImpact >= 7;
    if (filter === 'recent') {
      const postTime = new Date(post.publishedAt);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return postTime > oneHourAgo;
    }
    return post.metadata.tags.some(tag => 
      tag.toLowerCase().includes(filter.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className={`max-w-2xl mx-auto ${className}`} data-testid="loading-state">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
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
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`max-w-2xl mx-auto ${className}`} data-testid="error-fallback">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <TrendingUp className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load feed</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
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
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh feed"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <div className="flex items-center space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Posts</option>
                <option value="high-impact">High Impact</option>
                <option value="recent">Recent</option>
                <option value="strategic">Strategic</option>
                <option value="productivity">Productivity</option>
              </select>
              
              <LiveActivityIndicator />
            </div>
          </div>
        </div>
      </div>

      {/* LinkedIn-style Post Creator */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          {!showPostCreator ? (
            // Collapsed state - input-like appearance
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
            // Expanded state - full post creator
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
              <PostCreator 
                onPostCreated={handlePostCreated}
                className="border-0 shadow-none"
              />
            </div>
          )}
        </div>
      </div>


      {/* Legacy Posts Section */}
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
            <article
              key={post.id}
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
                          <Star className={`h-3 w-3 ${getImpactColor(post.metadata.businessImpact)}`} />
                          <span className={getImpactColor(post.metadata.businessImpact)}>
                            {post.metadata.businessImpact}/10
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
                  {post.title}
                </h4>
                <p className="text-gray-700 leading-relaxed mb-4">
                  {post.content}
                </p>
                
                {/* Tags */}
                {post.metadata.tags && post.metadata.tags.length > 0 && (
                  <div className="flex items-center space-x-2 mb-4">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-wrap gap-2">
                      {post.metadata.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full hover:bg-blue-100 cursor-pointer transition-colors"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Post Actions with Real-time Features */}
              <div className="border-t border-gray-100">
                {/* Typing Indicator */}
                <TypingIndicator postId={post.id} className="mx-4 mt-3" />
                
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
                        <span className="text-sm">{post.likes || 0}</span>
                      </button>
                      
                      <button 
                        className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
                        onClick={() => subscribePost(post.id)}
                      >
                        <MessageCircle className="h-5 w-5" />
                        <span className="text-sm">{post.comments || 0}</span>
                      </button>
                      
                      <button className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors">
                        <Share2 className="h-5 w-5" />
                        <span className="text-sm">{post.shares || 0}</span>
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      {!isConnected && (
                        <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          Offline
                        </span>
                      )}
                      <span>ID: {post.id}</span>
                    </div>
                  </div>
                  
                  {/* Connection Status for Individual Posts */}
                  {!isConnected && (
                    <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      Real-time features unavailable - interactions will sync when reconnected
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      </div>
    </div>
  );
});

SocialMediaFeed.displayName = 'SocialMediaFeed';

export default SocialMediaFeed;