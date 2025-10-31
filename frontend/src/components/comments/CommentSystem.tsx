import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle, ChevronDown, ChevronRight, Plus, Zap, Users } from 'lucide-react';
import { CommentThread } from './CommentThread';
import { CommentForm } from '../CommentForm';
// AgentResponseTrigger component doesn't exist yet - commenting out
// import { AgentResponseTrigger } from './AgentResponseTrigger';
import { useCommentThreading } from '../../hooks/useCommentThreading';
import { useRealtimeComments } from '../../hooks/useRealtimeComments';

export interface CommentTreeNode {
  id: string;
  content: string;
  contentType: 'text' | 'markdown' | 'code';
  author: {
    type: 'user' | 'agent';
    id: string;
    name: string;
    avatar?: string;
  };
  metadata: {
    threadDepth: number;
    threadPath: string;
    replyCount: number;
    likeCount: number;
    reactionCount: number;
    isAgentResponse: boolean;
    responseToAgent?: string;
    conversationThreadId?: string;
    qualityScore?: number;
  };
  engagement: {
    likes: number;
    reactions: Record<string, number>;
    userReacted: boolean;
    userReactionType?: string;
  };
  status: 'published' | 'hidden' | 'deleted' | 'pending';
  children: CommentTreeNode[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentConversation {
  id: string;
  rootCommentId: string;
  topic: string;
  participatingAgents: string[];
  status: 'active' | 'resolved' | 'archived';
  totalComments: number;
  lastActivity: string;
}

export interface CommentSystemProps {
  postId: string;
  initialComments?: CommentTreeNode[];
  maxDepth?: number;
  enableAgentInteractions?: boolean;
  enableRealtime?: boolean;
  className?: string;
}

export const CommentSystem: React.FC<CommentSystemProps> = ({
  postId,
  initialComments = [],
  maxDepth = 10,
  enableAgentInteractions = true,
  enableRealtime = true,
  className = ''
}) => {
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [selectedAgentConversation, setSelectedAgentConversation] = useState<string | null>(null);

  // Custom hooks for comment management
  const {
    comments,
    setComments, // CRITICAL: Expose setComments so WebSocket handler can update state
    agentConversations,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
    reactToComment,
    loadMoreComments,
    refreshComments,
    triggerAgentResponse,
    getThreadStructure,
    stats
  } = useCommentThreading(postId, { initialComments, maxDepth });

  // Real-time updates
  useRealtimeComments(postId, {
    enabled: enableRealtime,
    onCommentAdded: (comment) => {
      console.log('[CommentSystem] 📨 Real-time comment received:', comment.id, 'from', comment.author.id);

      // CRITICAL FIX: Add the new comment to state immediately
      // This ensures UI updates in real-time without page refresh
      setComments((prevComments) => {
        console.log('[CommentSystem] 📊 Previous comment count:', prevComments.length);

        // Check if comment already exists (prevent duplicates)
        const exists = prevComments.some(c => c.id === comment.id);
        if (exists) {
          console.log('[CommentSystem] ⚠️ Comment already exists, skipping duplicate:', comment.id);
          return prevComments;
        }

        // Add new comment to the tree
        const updatedComments = [...prevComments, comment];
        console.log('[CommentSystem] ✅ Added comment, new count:', updatedComments.length);

        return updatedComments;
      });
    },
    onCommentUpdated: (comment) => {
      console.log('[CommentSystem] 🔄 Real-time comment update:', comment.id);

      // Update existing comment in state
      setComments((prevComments) => {
        return prevComments.map(c => c.id === comment.id ? comment : c);
      });
    },
    onAgentResponse: (response) => {
      console.log('[CommentSystem] 🤖 Real-time agent response:', response.id, 'from', response.author.id);

      // Add agent response to state
      setComments((prevComments) => {
        const exists = prevComments.some(c => c.id === response.id);
        if (exists) {
          console.log('[CommentSystem] ⚠️ Agent response already exists:', response.id);
          return prevComments;
        }

        return [...prevComments, response];
      });
    }
  });

  const rootComments = useMemo(() => {
    return comments.filter(comment => !comment.metadata.threadDepth || comment.metadata.threadDepth === 0);
  }, [comments]);

  const handleAddComment = useCallback(async (content: string, parentId?: string) => {
    try {
      await addComment(content, parentId);
      setShowCommentForm(false);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }, [addComment]);

  const handleReplyToComment = useCallback(async (commentId: string, content: string) => {
    try {
      await addComment(content, commentId);
    } catch (error) {
      console.error('Failed to reply to comment:', error);
    }
  }, [addComment]);

  const handleAgentResponse = useCallback(async (commentId: string, agentType: string) => {
    if (!enableAgentInteractions) return;
    
    try {
      await triggerAgentResponse(commentId, agentType);
    } catch (error) {
      console.error('Failed to trigger agent response:', error);
    }
  }, [triggerAgentResponse, enableAgentInteractions]);

  const toggleThreadExpansion = useCallback((threadId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(threadId)) {
        newSet.delete(threadId);
      } else {
        newSet.add(threadId);
      }
      return newSet;
    });
  }, []);

  const handleReaction = useCallback(async (commentId: string, reactionType: string) => {
    try {
      await reactToComment(commentId, reactionType);
    } catch (error) {
      console.error('Failed to react to comment:', error);
    }
  }, [reactToComment]);

  if (loading && comments.length === 0) {
    return (
      <div className={`comment-system ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400 mr-3"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading comments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`comment-system ${className}`}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 dark:text-red-400 font-medium">Error loading comments</div>
            <button
              onClick={refreshComments}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
            >
              Retry
            </button>
          </div>
          <div className="text-red-500 dark:text-red-400 text-sm mt-1">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`comment-system ${className}`}>
      {/* Comment System Header */}
      <div className="comment-system-header bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Comments
              </h3>
            </div>

            {stats && (
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{stats.rootThreads} threads</span>
                {stats.maxDepth > 0 && (
                  <span>Max depth: {stats.maxDepth}</span>
                )}
                {enableAgentInteractions && stats.agentComments > 0 && (
                  <span>{stats.agentComments} agent responses</span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {enableAgentInteractions && agentConversations.length > 0 && (
              <button
                onClick={() => setSelectedAgentConversation(
                  selectedAgentConversation ? null : agentConversations[0]?.id
                )}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Agent Conversations ({agentConversations.length})</span>
              </button>
            )}

            <button
              onClick={() => setShowCommentForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Comment</span>
            </button>
          </div>
        </div>
        
        {/* Agent Conversation Filter */}
        {selectedAgentConversation && agentConversations.length > 0 && (
          <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-purple-900 dark:text-purple-100">Agent Conversation</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  {agentConversations.find(c => c.id === selectedAgentConversation)?.topic || 'Active Discussion'}
                </p>
              </div>
              <button
                onClick={() => setSelectedAgentConversation(null)}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
              >
                Show All Comments
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Comment Form */}
      {showCommentForm && (
        <div className="new-comment-form border-b border-gray-200 dark:border-gray-700 p-4">
          <CommentForm
            onSubmit={(content) => handleAddComment(content)}
            onCancel={() => setShowCommentForm(false)}
            placeholder="Share your thoughts on this post..."
            submitText="Post Comment"
          />
        </div>
      )}

      {/* Comment Threads */}
      <div className="comment-threads">
        {rootComments.length === 0 ? (
          <div className="empty-state text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No comments yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Be the first to share your thoughts on this post.</p>
            <button
              onClick={() => setShowCommentForm(true)}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Start the discussion
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {rootComments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                depth={0}
                maxDepth={maxDepth}
                expanded={expandedThreads.has(comment.id)}
                onToggleExpansion={() => toggleThreadExpansion(comment.id)}
                onReply={handleReplyToComment}
                onReaction={handleReaction}
                onAgentResponse={enableAgentInteractions ? handleAgentResponse : undefined}
                agentConversationFilter={selectedAgentConversation}
              />
            ))}
          </div>
        )}
      </div>

      {/* Load More Comments */}
      {stats && stats.totalComments > comments.length && (
        <div className="load-more-section border-t border-gray-200 dark:border-gray-700 p-4 text-center">
          <button
            onClick={loadMoreComments}
            disabled={loading}
            className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : `Load More Comments (${stats.totalComments - comments.length} remaining)`}
          </button>
        </div>
      )}

      {/* Agent Response Suggestions - Commented out until component is created */}
      {/* {enableAgentInteractions && (
        <AgentResponseTrigger
          postId={postId}
          onTriggerResponse={handleAgentResponse}
          className="mt-4"
        />
      )} */}
    </div>
  );
};