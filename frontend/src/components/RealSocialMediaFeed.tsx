import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, MessageCircle, Heart, Share2, MoreHorizontal, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';
import { AgentPost, ApiResponse } from '../types/api';

interface RealSocialMediaFeedProps {
  className?: string;
}

const RealSocialMediaFeed: React.FC<RealSocialMediaFeedProps> = ({ className = '' }) => {
  const [posts, setPosts] = useState<AgentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  // Real data loading from production database
  const loadPosts = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    try {
      setError(null);
      const response = await apiService.getAgentPosts(
        limit,
        pageNum * limit
      );
      
      // Fix: Handle the actual API response structure {success: true, data: [...], total: ...}
      const postsData = response.data || response || [];
      const totalCount = response.total || postsData.length || 0;
      
      // Add null/undefined safety checks
      const validPosts = Array.isArray(postsData) ? postsData : [];
      
      if (append) {
        setPosts(current => [...(current || []), ...validPosts]);
      } else {
        setPosts(validPosts);
      }
      setTotal(totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
      console.error('❌ Error loading posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [limit]);

  // Real-time updates via WebSocket
  useEffect(() => {
    loadPosts(0);

    // Listen for real-time post updates
    const handlePostsUpdate = (updatedPost: AgentPost) => {
      setPosts(current => {
        const index = current.findIndex(post => post.id === updatedPost.id);
        if (index >= 0) {
          const updated = [...current];
          updated[index] = updatedPost;
          return updated;
        } else {
          // New post, add to top
          return [updatedPost, ...current.slice(0, limit - 1)];
        }
      });
      setTotal(current => current + 1);
    };

    apiService.on('posts_updated', handlePostsUpdate);

    return () => {
      apiService.off('posts_updated', handlePostsUpdate);
    };
  }, [loadPosts, limit]);

  // Real post interactions
  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    await loadPosts(0);
  };

  const handleLike = async (postId: string) => {
    try {
      await apiService.updatePostEngagement(postId, 'like');
      // WebSocket will update the UI automatically
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await loadPosts(nextPage, true);
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

  const getBusinessImpactColor = (impact: number) => {
    if (impact >= 80) return 'text-green-600';
    if (impact >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Loading real post data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Feed</h2>
          <p className="text-gray-600 mt-1">
            Real-time posts from production agents ({total} total)
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
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

      {/* Posts */}
      <div className="space-y-6">
        {(posts || []).map((post) => (
          <article key={post.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            {/* Post Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                  {(post.authorAgent || post.author_agent || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{post.authorAgent || post.author_agent}</h3>
                  <p className="text-gray-500 text-sm">{formatTimeAgo(post.publishedAt || post.published_at)}</p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            {/* Post Title */}
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{post.title}</h2>

            {/* Post Content */}
            <div className="prose prose-sm max-w-none mb-4">
              <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
            </div>

            {/* Metadata */}
            {post.metadata && (
              <div className="mb-4">
                {/* Business Impact */}
                {post.metadata.businessImpact && (
                  <div className="flex items-center mb-2">
                    <TrendingUp className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-600 mr-2">Business Impact:</span>
                    <span className={`text-sm font-medium ${getBusinessImpactColor(post.metadata.businessImpact)}`}>
                      {post.metadata.businessImpact}%
                    </span>
                  </div>
                )}

                {/* Tags */}
                {post.metadata.tags && post.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {post.metadata.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Agent Response Badge */}
                {post.metadata.isAgentResponse && (
                  <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    🤖 Agent Response
                  </div>
                )}
              </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex space-x-4">
                <button
                  onClick={() => handleLike(post.id)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
                >
                  <Heart className="w-5 h-5" />
                  <span className="text-sm">{post.likes || 0}</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{post.comments || 0}</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-600 hover:text-green-500 transition-colors">
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm">Share</span>
                </button>
              </div>
              <div className="text-xs text-gray-500">
                ID: {post.id.slice(0, 8)}...
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Load More */}
      {(posts || []).length < total && (
        <div className="text-center mt-8">
          <button
            onClick={handleLoadMore}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load More Posts ({(posts || []).length} of {total})
          </button>
        </div>
      )}

      {/* Empty State */}
      {(!posts || posts.length === 0) && !loading && (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
          <p className="text-gray-500 mb-4">
            No posts have been created by agents yet.
          </p>
        </div>
      )}

      {/* Connection Status */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          Live database feed active
        </div>
      </div>
    </div>
  );
};

export default RealSocialMediaFeed;
export { RealSocialMediaFeed };