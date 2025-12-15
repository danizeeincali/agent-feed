import React, { useState, useCallback, useEffect } from 'react';
import {
  MessageCircle,
  Share2,
  MoreHorizontal,
  Clock,
  TrendingUp,
  Star,
  Bot,
  Sparkles
} from 'lucide-react';
import { CommentThread } from './CommentThread';
import { CommentForm } from './CommentForm';
import { socket } from '../services/socket';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import { cn } from '../utils/cn';
import { renderParsedContent, parseContent } from '../utils/contentParser';
import { UserDisplayName } from './UserDisplayName';
import { parseEngagement } from '../utils/engagementUtils';
import { IntroductionPrompt } from './IntroductionPrompt';
import { apiService } from '../services/api';

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
      isSystemInitialization?: boolean;
      isIntroduction?: boolean;
      introductionSequence?: number;
      welcomePostType?: 'avi-welcome' | 'onboarding-phase1' | 'reference-guide';
    };
    // Engagement data from database (JSON string or object)
    engagement?: string | {
      comments?: number;
      likes?: number;
      shares?: number;
      views?: number;
      bookmarks?: number;
    };
    // Legacy engagement fields (for backward compatibility)
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
  const [optimisticComments, setOptimisticComments] = useState<any[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewComments, setHasNewComments] = useState(false);
  const [engagementState, setEngagementState] = useState(() => {
    const parsedEngagement = parseEngagement(post.engagement);
    return {
      bookmarked: false,
      bookmarks: post.bookmarks || parsedEngagement.bookmarks || 0,
      shares: post.shares || parsedEngagement.shares || 0,
      views: post.views || parsedEngagement.views || 0,
      comments: parsedEngagement.comments || 0
    };
  });

  const [isConnected, setIsConnected] = useState(socket.connected);
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

  // Define handleCommentsUpdate FIRST to avoid dependency order issues
  const handleCommentsUpdate = useCallback(async () => {
    console.log('[PostCard] handleCommentsUpdate called for post:', post.id);

    // Reset state
    setCommentsLoaded(false);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/agent-posts/${post.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        console.log('[PostCard] Loaded', data.data?.length || 0, 'comments');

        setComments(data.data || []);
        setCommentsLoaded(true);

        // Update comment count from actual data
        setEngagementState(prev => ({
          ...prev,
          comments: data.data?.length || prev.comments
        }));
      } else {
        console.error('[PostCard] Failed to load comments:', response.status);
      }
    } catch (error) {
      console.error('[PostCard] Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [post.id]); // Only depends on post.id - NO circular dependency

  const loadComments = useCallback(async () => {
    if (commentsLoaded) {
      console.log('[PostCard] Comments already loaded, skipping');
      return;
    }

    console.log('[PostCard] Loading comments for first time');
    await handleCommentsUpdate();
  }, [commentsLoaded, handleCommentsUpdate]);

  const handleCommentsToggle = () => {
    setShowComments(!showComments);

    // Clear new comment notification when expanding
    if (!showComments) {
      setHasNewComments(false);
      if (!commentsLoaded) {
        loadComments();
      }
    }
  };

  // Optimistic comment handlers
  const handleOptimisticAdd = useCallback((tempComment: any) => {
    console.log('[PostCard] Adding optimistic comment:', tempComment.id);
    setOptimisticComments(prev => [...prev, tempComment]);
    setEngagementState(prev => ({
      ...prev,
      comments: prev.comments + 1
    }));
  }, []);

  const handleOptimisticRemove = useCallback((tempId: string) => {
    console.log('[PostCard] Removing optimistic comment:', tempId);
    setOptimisticComments(prev => prev.filter(c => c.id !== tempId));
    setEngagementState(prev => ({
      ...prev,
      comments: Math.max(0, prev.comments - 1)
    }));
  }, []);

  const handleCommentConfirmed = useCallback((realComment: any, tempId: string) => {
    console.log('[PostCard] Confirming comment:', tempId, '→', realComment.id);
    // Remove optimistic
    setOptimisticComments(prev => prev.filter(c => c.id !== tempId));
    // Add real comment (will come from WebSocket event or next fetch)
  }, []);

  // Combine real and optimistic comments for display
  const allComments = React.useMemo(() =>
    [...comments, ...optimisticComments],
    [comments, optimisticComments]
  );

  // Socket.IO integration for real-time updates
  // 🔧 FIX: Add socket reference guard to prevent duplicate connections
  const socketConnectedRef = React.useRef(false);

  useEffect(() => {
    // Prevent duplicate socket management
    if (socketConnectedRef.current) {
      console.log('⚠️ Socket already managed for post:', post.id);
      return;
    }
    socketConnectedRef.current = true;

    const effectStartTime = Date.now();
    console.log('[PostCard] 🔌 useEffect START for post:', post.id, 'at', new Date().toISOString());

    // Track connection state
    const handleConnect = () => {
      const connectTime = Date.now() - effectStartTime;
      console.log(`[PostCard] ✅ Socket.IO connected after ${connectTime}ms, socket.id:`, socket.id);
      setIsConnected(true);

      // ✅ FIX: Subscribe to room AFTER connection confirmed
      socket.emit('subscribe:post', post.id);
      console.log('[PostCard] 📡 Subscribed to post room:', post.id);
    };

    const handleDisconnect = (reason: any) => {
      const disconnectTime = Date.now() - effectStartTime;
      console.error(`[PostCard] ❌ Socket.IO DISCONNECTED after ${disconnectTime}ms! Reason:`, reason);
      console.error('[PostCard] ❌ Disconnect stack trace:', new Error().stack);
      setIsConnected(false);
    };

    // Subscribe to events FIRST
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Connect Socket.IO if not already connected
    if (!socket.connected) {
      console.log('[PostCard] ⚠️ Socket not connected, attempting to connect for post:', post.id);
      socket.connect();
    } else {
      console.log('[PostCard] ✅ Socket already connected:', socket.id);
      // Already connected, subscribe immediately
      socket.emit('subscribe:post', post.id);
      console.log('[PostCard] 📡 Subscribed to post room (already connected):', post.id);
    }

    // Handle comment events
    const handleCommentCreated = (data: any) => {
      console.log('[PostCard] Received comment:created event', data);
      if (data.postId === post.id) {
        // Update counter immediately
        setEngagementState(prev => ({
          ...prev,
          comments: prev.comments + 1
        }));

        // Add comment to list if full comment data provided
        if (data.comment) {
          console.log('[PostCard] Adding comment directly from WebSocket:', data.comment.id);

          // Remove optimistic comment if it exists
          setOptimisticComments(prev => prev.filter(c => !c._optimistic));

          // Add real comment to list
          setComments(prev => {
            // Check if comment already exists (prevent duplicates)
            if (prev.some(c => c.id === data.comment.id)) {
              console.log('[PostCard] Comment already exists, skipping duplicate');
              return prev;
            }
            return [...prev, data.comment];
          });

          // 🔔 TOAST NOTIFICATION: Detect agent response and show toast
          // Use existing database fields for detection (author_type doesn't exist in schema)
          const isAgentComment =
            // Check if author field starts with 'agent-' prefix
            data.comment.author?.toLowerCase().startsWith('agent-') ||
            data.comment.author_agent?.toLowerCase().startsWith('agent-') ||

            // Check for specific agent names
            data.comment.author?.toLowerCase().includes('avi') ||
            data.comment.author_agent?.toLowerCase().includes('avi') ||

            // Check if user_id is an agent (agents use agent IDs as user_id)
            data.comment.user_id?.toLowerCase().startsWith('agent-');

          if (isAgentComment) {
            // Use display_name if available, otherwise fallback to author fields
            const agentName = data.comment.display_name ||
                             data.comment.author ||
                             data.comment.author_agent ||
                             'Agent';

            console.log('[PostCard] 🤖 Agent response detected, showing toast for:', agentName);
            toast.showSuccess(`${agentName} responded to your comment`, 5000);
          }

          // Show notification badge if comments are collapsed
          if (!showComments) {
            console.log('[PostCard] Comments collapsed, showing new comment badge');
            setHasNewComments(true);
          }
        } else {
          // Fallback: Reload if full comment not provided (backward compatibility)
          console.log('[PostCard] No comment data in WebSocket event, falling back to reload');
          if (showComments) {
            handleCommentsUpdate();
          }
        }
      }
    };

    const handleCommentUpdated = (data: any) => {
      if (data.postId === post.id) {
        handleCommentsUpdate();
      }
    };

    const handleCommentDeleted = (data: any) => {
      if (data.postId === post.id) {
        setEngagementState(prev => ({
          ...prev,
          comments: Math.max(0, prev.comments - 1)
        }));
        handleCommentsUpdate();
      }
    };

    socket.on('comment:created', handleCommentCreated);
    socket.on('comment:updated', handleCommentUpdated);
    socket.on('comment:deleted', handleCommentDeleted);

    // Cleanup
    return () => {
      socketConnectedRef.current = false;
      const cleanupTime = Date.now() - effectStartTime;
      console.log(`[PostCard] 🧹 CLEANUP START for post: ${post.id} after ${cleanupTime}ms`);
      console.log('[PostCard] 🧹 Cleanup stack trace:', new Error().stack);

      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('comment:created', handleCommentCreated);
      socket.off('comment:updated', handleCommentUpdated);
      socket.off('comment:deleted', handleCommentDeleted);

      if (socket.connected) {
        console.log('[PostCard] 📤 Unsubscribing from post:', post.id);
        socket.emit('unsubscribe:post', post.id);
      } else {
        console.log('[PostCard] ⚠️ Socket already disconnected during cleanup');
      }

      console.log('[PostCard] ✅ CLEANUP COMPLETE for post:', post.id);
    };
  }, [post.id]); // ✅ Removed showComments and handleCommentsUpdate to prevent re-subscription loops

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

  // Handle quick response from introduction prompt
  const handleQuickResponse = useCallback(async (postId: string, response: string) => {
    try {
      // Create a comment with the quick response
      await apiService.createComment(postId, response, {
        author: 'current-user', // In a real app, get from auth context
        author_user_id: 'current-user'
      });

      // Show success toast
      toast.showSuccess('Response sent!');

      // Refresh comments
      if (showComments) {
        await handleCommentsUpdate();
      } else {
        // Auto-open comments to show the response
        setShowComments(true);
        await handleCommentsUpdate();
      }
    } catch (error) {
      console.error('Failed to send quick response:', error);
      toast.showError('Failed to send response. Please try again.');
    }
  }, [toast, showComments, handleCommentsUpdate]);

  const truncateContent = (content: string, maxLength: number = 280) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const shouldTruncate = post.content && post.content.length > 280;
  const displayContent = shouldTruncate && !isExpanded
    ? truncateContent(post.content || '', 280)
    : post.content || '';

  // Check if this is an introduction post
  const isIntroductionPost = post.metadata?.isIntroduction ||
                            post.metadata?.isSystemInitialization ||
                            post.metadata?.welcomePostType === 'onboarding-phase1';

  // If this is an introduction post, use the special IntroductionPrompt component
  if (isIntroductionPost && !isExpanded) {
    return (
      <IntroductionPrompt
        postId={post.id}
        title={post.title}
        content={post.content || ''}
        agentName={post.authorAgent}
        agentId={post.authorAgent}
        onQuickResponse={handleQuickResponse}
        className={className}
      />
    );
  }

  return (
    <div className={cn(
      'bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200',
      isIntroductionPost && 'ring-2 ring-blue-200 dark:ring-blue-800',
      className
    )}>
      {/* Introduction badge for expanded view */}
      {isIntroductionPost && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-4 py-2 flex items-center space-x-2">
          <Sparkles className="w-3 h-3" />
          <span>Agent Introduction</span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">
                  <UserDisplayName userId={post.authorAgent} fallback={post.authorAgent} />
                </h3>
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
              className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 transition-colors group relative"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">
                {engagementState.comments > 0 ? `${engagementState.comments} Comments` : 'Comment'}
              </span>
              {hasNewComments && (
                <span
                  className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"
                  title="New comments available"
                />
              )}
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
              onOptimisticAdd={handleOptimisticAdd}
              onOptimisticRemove={handleOptimisticRemove}
              onCommentConfirmed={handleCommentConfirmed}
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
                comments={allComments}
                onCommentsUpdate={handleCommentsUpdate}
              />
            )}
          </div>
        </div>
      )}

      {/* Toast Notifications Container */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />
    </div>
  );
};