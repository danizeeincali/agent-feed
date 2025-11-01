import React, { useState, useCallback, useEffect } from 'react';
import {
  MessageCircle,
  Share2,
  MoreHorizontal,
  Clock,
  TrendingUp,
  Star,
  Bot
} from 'lucide-react';
import { CommentThread } from './CommentThread';
import { CommentForm } from './CommentForm';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToast } from '../hooks/useToast';
import { cn } from '../utils/cn';
import { renderParsedContent, parseContent } from '../utils/contentParser';

interface PostCardProps {
  post: {
    id: string;
    title: string;
    content?: string;
    authorAgent: string;
    publishedAt: string;
    metadata?: {
      isAgentResponse?: boolean;
      businessImpact?: number;
      tags?: string[];
      hook?: string;
    };
    // Engagement data from AgentLink API
    bookmarks?: number;
    shares?: number;
    views?: number;
    comments?: number;
  };
  className?: string;
  // PHASE 2: Optimistic update support (optional - for integration with usePosts hook)
  updatePostInList?: (postId: string, updates: any) => void;
  refetchPost?: (postId: string) => Promise<any>;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  className,
  updatePostInList,
  refetchPost
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [engagementState, setEngagementState] = useState({
    bookmarked: false,
    bookmarks: post.bookmarks || 0,
    shares: post.shares || 0,
    views: post.views || 0,
    comments: post.comments || 0
  });

  const { socket, isConnected, subscribe, unsubscribe } = useWebSocket();
  const toast = useToast();

  const businessImpact = post.metadata?.businessImpact || 5;
  const tags = post.metadata?.tags || [];
  const hook = post.metadata?.hook;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const getImpactColor = (impact: number) => {
    if (impact >= 8) return 'text-green-600 bg-green-100';
    if (impact >= 6) return 'text-blue-600 bg-blue-100';
    if (impact >= 4) return 'text-orange-600 bg-orange-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getImpactLabel = (impact: number) => {
    if (impact >= 8) return 'High Impact';
    if (impact >= 6) return 'Medium Impact';
    if (impact >= 4) return 'Low Impact';
    return 'Minimal Impact';
  };

  const loadComments = useCallback(async () => {
    if (commentsLoaded) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/agent-posts/${post.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.data || []);
        setCommentsLoaded(true);
        // Update comment count
        setEngagementState(prev => ({
          ...prev,
          comments: data.data?.length || prev.comments
        }));
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [post.id, commentsLoaded]);

  const handleCommentsToggle = () => {
    setShowComments(!showComments);
    if (!showComments && !commentsLoaded) {
      loadComments();
    }
  };

  const handleCommentsUpdate = useCallback(() => {
    setCommentsLoaded(false);
    loadComments();
  }, [loadComments]);

  // WebSocket integration for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to post-specific updates
    const handlePostUpdate = (data: any) => {
      if (data.postId === post.id) {
        if (data.type === 'engagement') {
          setEngagementState(prev => ({
            ...prev,
            ...data.engagement
          }));
        }
      }
    };

    const handleCommentUpdate = (data: any) => {
      if (data.postId === post.id) {
        if (data.type === 'comment_created' || data.type === 'comment_updated' || data.type === 'comment_deleted') {
          handleCommentsUpdate();
        }
      }
    };

    // Subscribe to events
    subscribe('post:update', handlePostUpdate);
    subscribe('comment:created', handleCommentUpdate);
    subscribe('comment:added', handleCommentUpdate); // Backwards compatibility
    subscribe('comment:updated', handleCommentUpdate);
    subscribe('comment:deleted', handleCommentUpdate);

    // Subscribe to post-specific room
    socket.emit('subscribe:post', post.id);

    return () => {
      unsubscribe('post:update', handlePostUpdate);
      unsubscribe('comment:created', handleCommentUpdate);
      unsubscribe('comment:added', handleCommentUpdate); // Backwards compatibility
      unsubscribe('comment:updated', handleCommentUpdate);
      unsubscribe('comment:deleted', handleCommentUpdate);
      socket.emit('unsubscribe:post', post.id);
    };
  }, [socket, isConnected, post.id, subscribe, unsubscribe, handleCommentsUpdate]);

  const handleEngagement = useCallback(async (type: 'bookmark' | 'share') => {
    try {
      const response = await fetch(`/api/v1/posts/${post.id}/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'current-user', // In a real app, get from auth context
          platform: type === 'share' ? 'agentlink' : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEngagementState(prev => ({
          ...prev,
          [type === 'bookmark' ? 'bookmarked' : type]: data.data[type + 'ed'] !== undefined ? data.data[type + 'ed'] : !prev[type + 'ed'],
          [type + 's']: data.data[type + 'Count'] || (type === 'share' ? prev[type + 's'] + 1 : prev[type + 's'])
        }));

        // Emit WebSocket event for real-time updates
        if (socket && isConnected) {
          socket.emit(`post:${type}`, {
            postId: post.id,
            action: data.data[type + (type === 'bookmark' ? 'ed' : 'Count')] ? 'add' : 'remove'
          });
        }
      }
    } catch (error) {
      console.error(`Failed to ${type} post:`, error);
    }
  }, [post.id, socket, isConnected]);

  const truncateContent = (content: string, maxLength: number = 280) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const shouldTruncate = post.content && post.content.length > 280;
  const displayContent = shouldTruncate && !isExpanded 
    ? truncateContent(post.content || '', 280) 
    : post.content || '';

  return (
    <div className={cn(
      'bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200',
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">{post.authorAgent}</h3>
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                  Agent
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>{formatTimestamp(post.publishedAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={cn(
              'px-2 py-1 text-xs rounded-full font-medium',
              getImpactColor(businessImpact)
            )}>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>{getImpactLabel(businessImpact)}</span>
              </div>
            </div>
            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {hook && (
          <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r">
            <p className="text-sm text-blue-700 font-medium">{hook}</p>
          </div>
        )}
        
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {post.title}
        </h2>
        
        {post.content && (
          <div className="text-gray-700">
            {renderParsedContent(parseContent(displayContent), {
              className: 'post-content prose prose-sm max-w-none',
              enableMarkdown: true,
              enableLinkPreviews: true,
              useEnhancedPreviews: false,
              onMentionClick: (agent: string) => {
                console.log('Mention clicked in post:', agent);
                // Future: Navigate to agent profile
              },
              onHashtagClick: (tag: string) => {
                console.log('Hashtag clicked in post:', tag);
                // Future: Filter by tag
              }
            })}
            {shouldTruncate && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button 
              onClick={handleCommentsToggle}
              className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 transition-colors group"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">
                {engagementState.comments > 0 ? `${engagementState.comments} Comments` : 'Comment'}
              </span>
            </button>
            
            <button 
              onClick={() => handleEngagement('share')}
              className="flex items-center space-x-2 text-gray-500 hover:text-green-600 transition-colors group"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-sm">
                {engagementState.shares > 0 ? `${engagementState.shares} Shares` : 'Share'}
              </span>
            </button>
          </div>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(businessImpact, 5) }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-3 h-3',
                  businessImpact > i ? 'text-yellow-400 fill-current' : 'text-gray-300'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-100">
          <div className="p-4">
            <CommentForm
              postId={post.id}
              onCommentAdded={handleCommentsUpdate}
              className="mb-4"
              updatePostInList={updatePostInList}
              refetchPost={refetchPost}
            />
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading comments...</span>
              </div>
            ) : (
              <CommentThread
                postId={post.id}
                comments={comments}
                onCommentsUpdate={handleCommentsUpdate}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};