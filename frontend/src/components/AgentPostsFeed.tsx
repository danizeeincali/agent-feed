import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Clock, Star, Tag, Share2, Bookmark, Code, Eye, Filter, Search, RefreshCw, TrendingUp } from 'lucide-react';
import { cn } from '../utils/cn';
import { useWebSocket } from '../hooks/useWebSocket';
import { RealTimeActivityFeed } from './RealTimeActivityFeed';

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
    postType: 'insight' | 'code_review' | 'task_completion' | 'alert' | 'recommendation';
    codeSnippet?: string;
    language?: string;
    attachments?: string[];
    workflowId?: string;
  };
  engagement: {
    views: number;
    bookmarks: number;
    shares: number;
    comments: number;
  };
  isBookmarked?: boolean;
}

interface AgentPostsFeedProps {
  className?: string;
}

const AgentPostsFeed: React.FC<AgentPostsFeedProps> = ({ className = '' }) => {
  const [posts, setPosts] = useState<AgentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'impact'>('newest');
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  
  const { isConnected, subscribe } = useWebSocket();

  useEffect(() => {
    fetchPosts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPosts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isConnected) {
      subscribe('new-agent-post', (data) => {
        setPosts(prev => [data.post, ...prev]);
      });

      subscribe('post-engagement-update', (data) => {
        setPosts(prev => prev.map(post =>
          post.id === data.postId
            ? { ...post, engagement: { ...post.engagement, ...data.engagement } }
            : post
        ));
      });
    }
  }, [isConnected, subscribe]);

  const fetchPosts = async () => {
    try {
      // Use relative URL to leverage Vite proxy
      const response = await fetch('/api/agent-posts');
      const data = await response.json();
      
      if (data.success) {
        // Enhance posts with mock engagement data
        const enhancedPosts = data.data.map((post: AgentPost) => ({
          ...post,
          metadata: {
            ...post.metadata,
            postType: post.metadata.postType || 'insight'
          },
          engagement: post.engagement || {
            views: post.metadata?.businessImpact ? post.metadata.businessImpact * 25 : 275,
            bookmarks: post.metadata?.tags?.length ? post.metadata.tags.length * 5 : 15,
            shares: post.metadata?.isAgentResponse ? 10 : 5,
            comments: post.content?.length > 200 ? 8 : 3
          }
        }));
        setPosts(enhancedPosts);
        setError(null);
      } else {
        setError('Failed to fetch agent posts');
      }
    } catch (err) {
      setError('Error connecting to AgentLink API');
      console.error('Failed to fetch agent posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postTime = new Date(dateString);
    const diffMs = now.getTime() - postTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleEngagement = useCallback(async (postId: string, type: 'bookmark' | 'share') => {
    try {
      const response = await fetch(`/api/v1/agent-posts/${postId}/engage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(prev => prev.map(post =>
          post.id === postId
            ? { 
                ...post, 
                engagement: data.engagement,
                isBookmarked: type === 'bookmark' ? !post.isBookmarked : post.isBookmarked
              }
            : post
        ));
      }
    } catch (err) {
      console.error('Failed to update engagement:', err);
    }
  }, []);

  const togglePostExpansion = useCallback((postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  }, []);

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
      'chief-of-staff-automation-agent': '🤖',
      'code-review-agent': '🔍',
      'documentation-agent': '📝',
      'testing-agent': '🧪',
      'security-agent': '🛡️',
      'performance-agent': '⚡',
      'database-agent': '🗄️',
      'frontend-agent': '🎨',
      'backend-agent': '⚙️',
      'devops-agent': '🚀',
      'analytics-agent': '📊',
      'monitoring-agent': '📡',
      'deployment-agent': '🚢',
      'integration-agent': '🔗',
      'research-agent': '🔬'
    };

    return emojiMap[agentName] || '🤖';
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'code_review':
        return <Code className="w-4 h-4 text-purple-500" />;
      case 'task_completion':
        return <Star className="w-4 h-4 text-green-500" />;
      case 'alert':
        return <MessageSquare className="w-4 h-4 text-red-500" />;
      case 'recommendation':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: number) => {
    if (impact >= 8) return 'text-red-600 bg-red-50 border-red-200';
    if (impact >= 6) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (impact >= 4) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const formatAgentName = (agentName: string) => {
    return agentName
      .replace(/-agent$/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const filteredAndSortedPosts = posts
    .filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           post.authorAgent.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || post.metadata.postType === filterType;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.engagement.bookmarks - a.engagement.bookmarks;
        case 'impact':
          return b.metadata.businessImpact - a.metadata.businessImpact;
        default:
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
    });

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-sm">{error}</p>
          <button 
            onClick={fetchPosts}
            className="mt-2 text-blue-500 hover:text-blue-700 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Posts Feed */}
        <div className="lg:col-span-2 p-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Agent Posts</h2>
          <span className="text-sm text-gray-500">({filteredAndSortedPosts.length})</span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
            />
          </div>
          
          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="insight">Insights</option>
            <option value="code_review">Code Reviews</option>
            <option value="task_completion">Completions</option>
            <option value="alert">Alerts</option>
            <option value="recommendation">Recommendations</option>
          </select>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="impact">Highest Impact</option>
          </select>
          
          {/* Refresh */}
          <button
            onClick={fetchPosts}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filteredAndSortedPosts.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-sm">No agent posts yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Agent activity will appear here when Claude Code agents post results
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAndSortedPosts.map((post) => {
            const isExpanded = expandedPosts.has(post.id);
            const shouldTruncate = post.content.length > 300;
            
            return (
              <div
                key={post.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getAgentEmoji(post.authorAgent)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">
                          {formatAgentName(post.authorAgent)}
                        </span>
                        {getPostTypeIcon(post.metadata.postType)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(post.publishedAt)}
                        <Eye className="h-3 w-3" />
                        {post.engagement.views} views
                      </div>
                    </div>
                  </div>
                  
                  <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getImpactColor(post.metadata.businessImpact)}`}>
                    <Star className="h-3 w-3 inline mr-1" />
                    {post.metadata.businessImpact}/10
                  </div>
                </div>

                {/* Content */}
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">{post.title}</h3>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    {shouldTruncate && !isExpanded ? (
                      <>
                        {post.content.substring(0, 300)}...
                        <button
                          onClick={() => togglePostExpansion(post.id)}
                          className="text-blue-500 hover:text-blue-700 ml-2 font-medium"
                        >
                          Read more
                        </button>
                      </>
                    ) : (
                      <>
                        {post.content}
                        {shouldTruncate && (
                          <button
                            onClick={() => togglePostExpansion(post.id)}
                            className="text-blue-500 hover:text-blue-700 ml-2 font-medium"
                          >
                            Show less
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Code Snippet */}
                  {post.metadata.codeSnippet && isExpanded && (
                    <div className="mt-3 bg-gray-800 rounded-lg p-4 overflow-x-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-300">{post.metadata.language || 'code'}</span>
                        <Code className="w-4 h-4 text-gray-400" />
                      </div>
                      <pre className="text-sm text-gray-100">
                        <code>{post.metadata.codeSnippet}</code>
                      </pre>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {post.metadata.tags && post.metadata.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <Tag className="h-3 w-3 text-gray-400" />
                    {post.metadata.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full hover:bg-blue-100 cursor-pointer transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Engagement Bar */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleEngagement(post.id, 'share')}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      {post.engagement.shares}
                    </button>
                    
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <MessageSquare className="w-4 h-4" />
                      {post.engagement.comments} comments
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleEngagement(post.id, 'bookmark')}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      post.isBookmarked
                        ? 'text-yellow-600 bg-yellow-50'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
        
        {/* Activity Sidebar */}
        <div className="p-4">
          <RealTimeActivityFeed className="sticky top-4" />
        </div>
      </div>
    </div>
  );
};

export default AgentPostsFeed;