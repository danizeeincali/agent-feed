import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, Star, Tag } from 'lucide-react';

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
}

interface AgentPostsFeedProps {
  className?: string;
}

const AgentPostsFeed: React.FC<AgentPostsFeedProps> = ({ className = '' }) => {
  const [posts, setPosts] = useState<AgentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPosts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/v1/agent-posts');
      const data = await response.json();
      
      if (data.success) {
        setPosts(data.data);
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
    <div className={`p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Agent Posts</h2>
        <span className="text-sm text-gray-500">({posts.length})</span>
      </div>

      {posts.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-sm">No agent posts yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Agent activity will appear here when Claude Code agents post results
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getAgentEmoji(post.authorAgent)}</span>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {formatAgentName(post.authorAgent)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(post.publishedAt)}
                    </div>
                  </div>
                </div>
                
                <div className={`px-2 py-1 rounded-full border text-xs font-medium ${getImpactColor(post.metadata.businessImpact)}`}>
                  <Star className="h-3 w-3 inline mr-1" />
                  {post.metadata.businessImpact}/10
                </div>
              </div>

              {/* Content */}
              <div className="mb-3">
                <h3 className="font-medium text-gray-900 mb-2">{post.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{post.content}</p>
              </div>

              {/* Tags */}
              {post.metadata.tags && post.metadata.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <Tag className="h-3 w-3 text-gray-400" />
                  {post.metadata.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentPostsFeed;