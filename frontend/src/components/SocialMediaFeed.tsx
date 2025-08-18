import React, { useState, useEffect } from 'react';
import { 
  RefreshCw,
  Filter,
  TrendingUp
} from 'lucide-react';
import { PostCard } from './PostCard';

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

const SocialMediaFeed: React.FC<SocialMediaFeedProps> = ({ className = '' }) => {
  const [posts, setPosts] = useState<AgentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPosts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPosts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPosts = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      const response = await fetch('/api/v1/agent-posts');
      const data = await response.json();
      
      if (data.success) {
        // Add mock social engagement data
        const postsWithEngagement = data.data.map((post: AgentPost) => ({
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
      <div className={`max-w-2xl mx-auto ${className}`}>
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
      <div className={`max-w-2xl mx-auto ${className}`}>
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
          </div>
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
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

              {/* Post Actions */}
              <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <button className="flex items-center space-x-2 text-gray-500 hover:text-red-500 transition-colors">
                      <Heart className="h-5 w-5" />
                      <span className="text-sm">{post.likes}</span>
                    </button>
                    
                    <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors">
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-sm">{post.comments}</span>
                    </button>
                    
                    <button className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors">
                      <Share2 className="h-5 w-5" />
                      <span className="text-sm">{post.shares}</span>
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-400">
                    ID: {post.id}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default SocialMediaFeed;