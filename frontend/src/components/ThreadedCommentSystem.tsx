/**
 * SPARC REFINEMENT Phase - Threaded Comment System React Component
 * Recursive threading UI with agent interaction support
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle, ChevronDown, ChevronUp, Reply, User, Bot, Clock, ArrowRight } from 'lucide-react';
import { apiService } from '../services/api';
import { MentionInput, MentionSuggestion } from './MentionInput';

interface ThreadedComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  thread_id: string;
  content: string;
  author: string;
  author_type: 'agent' | 'user' | 'system';
  depth: number;
  reply_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  replies: ThreadedComment[];
  metadata?: any;
}

interface ThreadStatistics {
  total_comments: number;
  max_depth: number;
  unique_participants: number;
  agent_participants: number;
}

interface ThreadedCommentSystemProps {
  postId: string;
  initialComments?: ThreadedComment[];
  maxDepth?: number;
  enableRealTime?: boolean;
  className?: string;
}

interface CommentItemProps {
  comment: ThreadedComment;
  depth: number;
  maxDepth: number;
  onReply: (parentId: string, content: string) => void;
  onToggleReplies: (commentId: string) => void;
  isExpanded: boolean;
  isReplying: boolean;
  onStartReply: () => void;
  onCancelReply: () => void;
}

interface ReplyFormProps {
  parentId: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
  placeholder?: string;
  author?: string;
}

// Reply form component
const ReplyForm: React.FC<ReplyFormProps> = ({
  parentId,
  onSubmit,
  onCancel,
  placeholder = "Write a reply...",
  author = "anonymous"
}) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || submitting) return;
    
    try {
      setSubmitting(true);
      await onSubmit(content.trim());
      setContent('');
      onCancel(); // Close form after successful submission
    } catch (error) {
      console.error('Failed to submit reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <form onSubmit={handleSubmit}>
        <MentionInput
          value={content}
          onChange={setContent}
          onMentionSelect={(mention) => {
            console.log('🎯 THREADED COMMENT: Mention selected', mention);
          }}
          placeholder={placeholder}
          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          disabled={submitting}
          autoFocus={true}
          mentionContext="post"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <User className="w-4 h-4" />
            <span>Replying as {author}</span>
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={submitting || !content.trim()}
            >
              {submitting ? 'Posting...' : 'Reply'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// Individual comment item component
const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  depth,
  maxDepth,
  onReply,
  onToggleReplies,
  isExpanded,
  isReplying,
  onStartReply,
  onCancelReply
}) => {
  const hasReplies = comment.replies && comment.replies.length > 0;
  const canExpand = hasReplies && depth < maxDepth;
  const indentLevel = Math.min(depth, 6); // Max visual indent
  const isAgent = comment.author_type === 'agent';
  
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getAuthorColor = (author: string, isAgent: boolean) => {
    if (isAgent) {
      // Agent-specific colors
      const agentColors: Record<string, string> = {
        'TechReviewer': 'from-blue-500 to-indigo-600',
        'SystemValidator': 'from-green-500 to-emerald-600',
        'CodeAuditor': 'from-purple-500 to-violet-600',
        'ProductionValidator': 'from-orange-500 to-red-600'
      };
      return agentColors[author] || 'from-gray-500 to-gray-600';
    }
    return 'from-blue-400 to-blue-600';
  };

  return (
    <div className={`comment-item depth-${indentLevel}`}>
      <div 
        className="flex space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200"
        style={{ marginLeft: `${indentLevel * 12}px` }}
      >
        {/* Avatar */}
        <div className={`w-8 h-8 bg-gradient-to-br ${getAuthorColor(comment.author, isAgent)} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm`}>
          {comment.author.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Comment header */}
          <div className="flex items-center space-x-2 mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{comment.author}</span>
              {isAgent && (
                <div className="flex items-center space-x-1">
                  <Bot className="w-3 h-3 text-blue-500" />
                  <span className="text-xs text-blue-600 font-medium">Agent</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{formatTimeAgo(comment.created_at)}</span>
            </div>
            {depth > 0 && (
              <div className="text-xs text-gray-400">
                depth {depth}
              </div>
            )}
          </div>

          {/* Comment content */}
          <div className="text-gray-700 leading-relaxed mb-3">
            {comment.content}
          </div>

          {/* Comment actions */}
          <div className="flex items-center space-x-4 text-sm">
            <button
              onClick={onStartReply}
              className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors"
            >
              <Reply className="w-4 h-4" />
              <span>Reply</span>
            </button>

            {canExpand && (
              <button
                onClick={() => onToggleReplies(comment.id)}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>Hide {comment.replies.length} replies</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>Show {comment.replies.length} replies</span>
                  </>
                )}
              </button>
            )}

            {comment.reply_count > 0 && (
              <div className="flex items-center space-x-1 text-gray-400">
                <MessageCircle className="w-4 h-4" />
                <span>{comment.reply_count} replies</span>
              </div>
            )}
          </div>

          {/* Reply form */}
          {isReplying && (
            <ReplyForm
              parentId={comment.id}
              onSubmit={(content) => onReply(comment.id, content)}
              onCancel={onCancelReply}
              placeholder={`Reply to ${comment.author}...`}
            />
          )}

          {/* Nested replies */}
          {isExpanded && hasReplies && depth < maxDepth && (
            <div className="mt-4 space-y-3">
              {comment.replies.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  maxDepth={maxDepth}
                  currentDepth={depth + 1}
                  onReply={onReply}
                  onToggleReplies={onToggleReplies}
                />
              ))}
            </div>
          )}

          {/* Depth limit indicator */}
          {depth >= maxDepth && hasReplies && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Thread continues with {comment.replies.length} more replies
                </div>
                <button className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 transition-colors">
                  <span>View in separate thread</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Recursive comment thread component
const CommentThread: React.FC<{
  comment: ThreadedComment;
  maxDepth: number;
  currentDepth: number;
  onReply: (parentId: string, content: string) => void;
  onToggleReplies: (commentId: string) => void;
}> = ({ comment, maxDepth, currentDepth, onReply, onToggleReplies }) => {
  const [isExpanded, setIsExpanded] = useState(currentDepth < 3); // Auto-expand first few levels
  const [isReplying, setIsReplying] = useState(false);

  const handleToggleReplies = useCallback(() => {
    setIsExpanded(!isExpanded);
    onToggleReplies(comment.id);
  }, [isExpanded, comment.id, onToggleReplies]);

  return (
    <CommentItem
      comment={comment}
      depth={currentDepth}
      maxDepth={maxDepth}
      onReply={onReply}
      onToggleReplies={handleToggleReplies}
      isExpanded={isExpanded}
      isReplying={isReplying}
      onStartReply={() => setIsReplying(true)}
      onCancelReply={() => setIsReplying(false)}
    />
  );
};

// Main threaded comment system component
const ThreadedCommentSystem: React.FC<ThreadedCommentSystemProps> = ({
  postId,
  initialComments = [],
  maxDepth = 10,
  enableRealTime = true,
  className = ''
}) => {
  const [comments, setComments] = useState<ThreadedComment[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<ThreadStatistics | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [newCommentContent, setNewCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Load threaded comments
  const loadComments = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      console.log(`🔄 Loading threaded comments for post: ${postId}`);
      
      const response = await apiService.request(`/posts/${postId}/comments`, {}, false);
      
      if (response.success && Array.isArray(response.data)) {
        setComments(response.data);
        setStatistics(response.statistics || null);
        console.log(`✅ Loaded ${response.data.length} threaded comments`);
      } else {
        console.warn('No threaded comments data received, using fallback');
        // Fallback to regular comments
        const fallbackComments = await apiService.getPostComments(postId);
        if (Array.isArray(fallbackComments)) {
          const threadedComments = fallbackComments.map(comment => ({
            ...comment,
            depth: 0,
            replies: [],
            parent_id: null,
            thread_id: comment.id,
            author_type: 'user' as const
          }));
          setComments(threadedComments);
        }
      }
    } catch (error) {
      console.error('❌ Error loading threaded comments:', error);
      // Try fallback to regular comments
      try {
        const fallbackComments = await apiService.getPostComments(postId);
        if (Array.isArray(fallbackComments)) {
          const threadedComments = fallbackComments.map(comment => ({
            ...comment,
            depth: 0,
            replies: [],
            parent_id: null,
            thread_id: comment.id,
            author_type: 'user' as const
          }));
          setComments(threadedComments);
        }
      } catch (fallbackError) {
        console.error('❌ Fallback comments also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  }, [postId, loading]);

  // Initial load
  useEffect(() => {
    loadComments();
  }, [postId]);

  // Real-time updates
  useEffect(() => {
    if (!enableRealTime) return;

    const handleCommentAdded = (data: any) => {
      if (data.postId === postId) {
        console.log('📡 Real-time comment added:', data);
        setComments(prev => [data.comment, ...prev]);
      }
    };

    const handleReplyAdded = (data: any) => {
      if (data.postId === postId) {
        console.log('📡 Real-time reply added:', data);
        // Insert reply into hierarchy
        setComments(prev => insertReplyIntoHierarchy(prev, data.parentId, data.reply));
      }
    };

    apiService.on('comment_added', handleCommentAdded);
    apiService.on('reply_added', handleReplyAdded);

    return () => {
      apiService.off('comment_added', handleCommentAdded);
      apiService.off('reply_added', handleReplyAdded);
    };
  }, [postId, enableRealTime]);

  // Insert reply into comment hierarchy
  const insertReplyIntoHierarchy = (comments: ThreadedComment[], parentId: string, newReply: ThreadedComment): ThreadedComment[] => {
    return comments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...comment.replies, newReply],
          reply_count: comment.reply_count + 1
        };
      } else if (comment.replies.length > 0) {
        return {
          ...comment,
          replies: insertReplyIntoHierarchy(comment.replies, parentId, newReply)
        };
      }
      return comment;
    });
  };

  // Handle new root comment
  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCommentContent.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      console.log('💬 Creating new comment:', newCommentContent);
      
      const response = await apiService.request(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: newCommentContent.trim(),
          author: 'ProductionValidator',
          authorType: 'user'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.success) {
        setComments(prev => [response.data, ...prev]);
        setNewCommentContent('');
        console.log('✅ Comment created successfully');
      } else {
        throw new Error(response.error || 'Failed to create comment');
      }
    } catch (error) {
      console.error('❌ Error creating comment:', error);
      alert('Failed to create comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle replies
  const handleReply = async (parentId: string, content: string) => {
    try {
      console.log('↪️ Creating reply:', { parentId, content });
      
      const response = await apiService.request(`/comments/${parentId}/replies`, {
        method: 'POST',
        body: JSON.stringify({
          content,
          author: 'ProductionValidator',
          authorType: 'user'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.success) {
        setComments(prev => insertReplyIntoHierarchy(prev, parentId, response.data));
        console.log('✅ Reply created successfully');
      } else {
        throw new Error(response.error || 'Failed to create reply');
      }
    } catch (error) {
      console.error('❌ Error creating reply:', error);
      alert('Failed to create reply. Please try again.');
    }
  };

  const toggleThread = useCallback((threadId: string) => {
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

  // Statistics display
  const statsDisplay = useMemo(() => {
    if (!statistics) return null;
    
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Thread Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{statistics.total_comments}</div>
            <div className="text-gray-600">Total Comments</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{statistics.max_depth}</div>
            <div className="text-gray-600">Max Depth</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">{statistics.unique_participants}</div>
            <div className="text-gray-600">Participants</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{statistics.agent_participants}</div>
            <div className="text-gray-600">Agents Active</div>
          </div>
        </div>
      </div>
    );
  }, [statistics]);

  return (
    <div className={`threaded-comment-system ${className}`}>
      {/* Statistics */}
      {statsDisplay}

      {/* New technical analysis form */}
      <div className="mb-8 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-3">
          <Bot className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-medium text-gray-700">Technical Analysis & Discussion</h3>
        </div>
        <form onSubmit={handleCreateComment}>
          <textarea
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            placeholder="Provide technical analysis, code review, or system feedback..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            rows={4}
            disabled={submittingComment}
          />
          <div className="flex justify-between items-center mt-3">
            <div className="text-sm text-gray-600">
              Professional technical discussion • Supports threaded analysis
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={submittingComment || !newCommentContent.trim()}
            >
              {submittingComment ? 'Analyzing...' : 'Post Analysis'}
            </button>
          </div>
        </form>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading threaded comments...</span>
          </div>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentThread
            key={comment.id}
            comment={comment}
            maxDepth={maxDepth}
            currentDepth={0}
            onReply={handleReply}
            onToggleReplies={toggleThread}
          />
        ))}
      </div>

      {/* Empty state */}
      {!loading && comments.length === 0 && (
        <div className="text-center py-12">
          <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No technical analysis yet</h3>
          <p className="text-gray-500 mb-4">
            Start the technical discussion! Your analysis can engage other agents in the system.
          </p>
        </div>
      )}

      {/* Connection indicator */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          Agent discussion system active
        </div>
      </div>
    </div>
  );
};

export default ThreadedCommentSystem;