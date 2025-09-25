import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { 
  RefreshCw,
  TrendingUp,
  MessageCircle,
  Clock,
  Star,
  MoreHorizontal,
  Tag,
  Plus,
  X,
  Edit3,
  Search,
  ChevronDown,
  Database,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { PostCreator } from './PostCreator';
import LoadingSpinner from './LoadingSpinner';
import { useWebSocketContext } from '@/context/WebSocketContext';
import { TypingIndicator } from '@/components/TypingIndicator';
import { LiveActivityIndicator } from '@/components/LiveActivityIndicator';
import { apiService } from '@/services/api';
import { useDebounce } from '../hooks/useDebounce';

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
  comments?: number;
}

interface ConnectionStatus {
  connected: boolean;
  fallback: boolean;
  lastChecked: Date;
}

interface PaginationState {
  hasMore: boolean;
  loading: boolean;
  offset: number;
  limit: number;
}

interface SearchState {
  query: string;
  results: AgentPost[];
  loading: boolean;
  hasResults: boolean;
}

interface SocialMediaFeedProps {
  className?: string;
}

const SocialMediaFeed: React.FC<SocialMediaFeedProps> = memo(({ className = '' }) => {
  const [posts, setPosts] = useState<AgentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'published_at' | 'title' | 'author'>('published_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [refreshing, setRefreshing] = useState(false);
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [productionAgents, setProductionAgents] = useState<any[]>([]);
  const [productionActivities, setProductionActivities] = useState<any[]>([]);
  
  // New state for enhanced functionality
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: true,
    fallback: false,
    lastChecked: new Date()
  });
  
  const [pagination, setPagination] = useState<PaginationState>({
    hasMore: true,
    loading: false,
    offset: 0,
    limit: 20
  });
  
  const [search, setSearch] = useState<SearchState>({
    query: '',
    results: [],
    loading: false,
    hasResults: false
  });
  
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const debouncedSearchQuery = useDebounce(search.query, 300);
  
  // WebSocket integration
  const { 
    isConnected, 
    on, 
    off, 
    subscribeFeed, 
    unsubscribeFeed, 
    subscribePost, 
    addNotification
  } = useWebSocketContext();
  
  // Connection status check
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await apiService.checkDatabaseConnection();
        setConnectionStatus({
          connected: status.connected,
          fallback: status.fallback,
          lastChecked: new Date()
        });
      } catch (error) {
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          fallback: true,
          lastChecked: new Date()
        }));
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

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
    on('comment:created', handleCommentCreated);

    return () => {
      off('post:created', handlePostCreated);
      off('post:updated', handlePostUpdated);
      off('post:deleted', handlePostDeleted);
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
        fetch('/api/claude-live/prod/agents'),
        fetch('/api/claude-live/prod/activities')
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

  // Enhanced fetch function with database integration
  const fetchPosts = async (showRefreshing = false, append = false) => {
    if (showRefreshing) setRefreshing(true);
    if (!append) {
      setLoading(true);
      setPagination(prev => ({ ...prev, offset: 0 }));
    } else {
      setPagination(prev => ({ ...prev, loading: true }));
    }
    
    try {
      // Check connection status first
      const connStatus = await apiService.checkDatabaseConnection();
      setConnectionStatus({
        connected: connStatus.connected,
        fallback: connStatus.fallback,
        lastChecked: new Date()
      });
      
      const currentOffset = append ? pagination.offset : 0;
      const response = await apiService.getAgentPosts(
        pagination.limit,
        currentOffset,
        filter,
        '',
        sortBy,
        sortOrder
      );
      
      if (response.success || response.data) {
        // Handle both response formats: {success: true, data: [...]} and {posts: [...]}
        const newPosts = response.data || response.posts || [];
        const validPosts = Array.isArray(newPosts) ? newPosts : [];
        
        if (append) {
          setPosts(prev => [...(prev || []), ...validPosts]);
        } else {
          setPosts(validPosts);
        }
        
        setPagination(prev => ({
          ...prev,
          offset: currentOffset + validPosts.length,
          hasMore: validPosts.length === pagination.limit,
          loading: false
        }));
        
        setError(null);
      } else {
        setError('Failed to fetch agent posts');
      }
    } catch (err) {
      console.error('Failed to fetch agent posts:', err);
      const fallbackStatus = connectionStatus.fallback;
      setError(fallbackStatus ? 
        'Using fallback mode - database unavailable' : 
        'Error connecting to API');
        
      // Set fallback mode if connection failed
      setConnectionStatus(prev => ({ ...prev, connected: false, fallback: true }));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPagination(prev => ({ ...prev, loading: false }));
    }
  };
  
  // Search functionality
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearch(prev => ({ ...prev, results: [], hasResults: false, loading: false }));
      return;
    }
    
    setSearch(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await apiService.searchPosts(query.trim());
      
      const searchResults = response.data || response.posts || [];
      const validResults = Array.isArray(searchResults) ? searchResults : [];
      
      setSearch(prev => ({
        ...prev,
        results: validResults,
        hasResults: validResults.length > 0,
        loading: false
      }));
    } catch (err) {
      console.error('Search failed:', err);
      setSearch(prev => ({ ...prev, results: [], hasResults: false, loading: false }));
    }
  }, []);
  
  // Load more posts (pagination)
  const loadMorePosts = useCallback(() => {
    if (pagination.hasMore && !pagination.loading && !isSearching) {
      fetchPosts(false, true);
    }
  }, [pagination.hasMore, pagination.loading, isSearching, filter, sortBy, sortOrder]);

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

  
  const handleCommentPost = async (postId: string) => {
    // Subscribe to post for real-time comment updates
    subscribePost(postId);
    // In a real app, this would open a comment modal
    console.log('Opening comments for post:', postId);
  };
  

  // Use search results when searching, otherwise use filtered posts
  const displayPosts = useMemo(() => {
    if (isSearching && search.hasResults) {
      return search.results;
    }
    
    // Filter is now handled by the API, so we just return posts
    return posts;
  }, [posts, search.results, isSearching, search.hasResults]);
  
  // Effect for debounced search
  useEffect(() => {
    if (debouncedSearchQuery) {
      setIsSearching(true);
      performSearch(debouncedSearchQuery);
    } else {
      setIsSearching(false);
      setSearch(prev => ({ ...prev, results: [], hasResults: false }));
    }
  }, [debouncedSearchQuery, performSearch]);
  
  // Effect for filter/sort changes
  useEffect(() => {
    if (!isSearching) {
      fetchPosts(false, false);
    }
  }, [filter, sortBy, sortOrder]);

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
                
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-') as ['published_at' | 'title' | 'author', 'ASC' | 'DESC'];
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="published_at-DESC">Newest First</option>
                  <option value="published_at-ASC">Oldest First</option>
                  <option value="title-ASC">Title A-Z</option>
                  <option value="title-DESC">Title Z-A</option>
                  <option value="author-ASC">Author A-Z</option>
                </select>
                
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className={`p-2 rounded-lg transition-colors ${
                    showSearch ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Search posts"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                  connectionStatus.connected 
                    ? 'bg-green-100 text-green-700'
                    : connectionStatus.fallback 
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {connectionStatus.connected ? (
                    <><Database className="h-3 w-3" /> Database</>    
                  ) : connectionStatus.fallback ? (
                    <><AlertCircle className="h-3 w-3" /> Fallback</>    
                  ) : (
                    <><WifiOff className="h-3 w-3" /> Offline</>
                  )}
                </div>
                <LiveActivityIndicator />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search posts by title, content, or author..."
              value={search.query}
              onChange={(e) => setSearch(prev => ({ ...prev, query: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {search.loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              </div>
            )}
          </div>
          
          {isSearching && search.query && (
            <div className="mt-2 text-sm text-gray-600">
              {search.loading ? (
                'Searching...'
              ) : search.hasResults ? (
                `Found ${search.results.length} posts matching "${search.query}"`
              ) : (
                `No posts found matching "${search.query}"`
              )}
            </div>
          )}
        </div>
      )}

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
        
        {(!displayPosts || displayPosts.length === 0) ? (
          <div className="text-center py-8" data-testid="empty-state">
            <div className="text-gray-400 mb-4">
              <MessageCircle className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isSearching ? 'No search results' : 'No posts yet'}
            </h3>
            <p className="text-gray-500">
              {isSearching 
                ? 'Try adjusting your search terms or clear the search to see all posts'
                : 'Agent activity will appear here when Claude Code agents complete tasks'
              }
            </p>
            {isSearching && (
              <button
                onClick={() => {
                  setSearch(prev => ({ ...prev, query: '' }));
                  setIsSearching(false);
                }}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {(displayPosts || []).map((post) => (
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
                        className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
                        onClick={() => handleCommentPost(post.id)}
                        title="View comments"
                      >
                        <MessageCircle className="h-5 w-5" />
                        <span className="text-sm">{post.comments || 0}</span>
                      </button>
                      
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      {!connectionStatus.connected && (
                        <span className={`px-2 py-1 rounded ${
                          connectionStatus.fallback 
                            ? 'text-amber-600 bg-amber-50'
                            : 'text-red-600 bg-red-50'
                        }`}>
                          {connectionStatus.fallback ? 'Fallback Mode' : 'Offline'}
                        </span>
                      )}
                      <span>ID: {post.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                  
                  {/* Connection Status for Individual Posts */}
                  {!connectionStatus.connected && (
                    <div className={`mt-2 text-xs px-2 py-1 rounded ${
                      connectionStatus.fallback
                        ? 'text-amber-700 bg-amber-50'
                        : 'text-red-700 bg-red-50'
                    }`}>
                      {connectionStatus.fallback
                        ? 'Database unavailable - using cached data, interactions will sync when reconnected'
                        : 'System offline - interactions will sync when reconnected'
                      }
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
            {/* Load More Button */}
            {!isSearching && pagination.hasMore && (displayPosts || []).length > 0 && (
              <div className="text-center pt-6">
                <button
                  onClick={loadMorePosts}
                  disabled={pagination.loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {pagination.loading ? (
                    <>
                      <RefreshCw className="inline-block h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More Posts'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

SocialMediaFeed.displayName = 'SocialMediaFeed';

export default SocialMediaFeed;