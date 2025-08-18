import React, { useState, useCallback } from 'react';
import { MessageCircle, Reply, Edit2, Trash2, MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-react';
import { Comment } from '@/types';
import { cn } from '@/utils/cn';

interface CommentItemProps {
  comment: Comment;
  depth: number;
  maxDepth: number;
  currentUser?: string;
  onReply: (parentId: string, content: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  depth,
  maxDepth,
  currentUser,
  onReply,
  onEdit,
  onDelete
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState(comment.content);
  const [replyError, setReplyError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canModify = currentUser === comment.author;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const shouldIndent = depth < maxDepth;

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) {
      setReplyError('Reply content is required');
      return;
    }

    if (replyContent.length > 2000) {
      setReplyError('Reply content must be under 2000 characters');
      return;
    }

    setIsSubmitting(true);
    setReplyError('');

    try {
      await onReply(comment.id, replyContent.trim());
      setReplyContent('');
      setIsReplying(false);
    } catch (error) {
      setReplyError('Failed to post reply. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editContent.trim()) {
      return;
    }

    if (editContent.length > 2000) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onEdit(comment.id, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      // Handle error
      console.error('Failed to edit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await onDelete(comment.id);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

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

  return (
    <div 
      className={cn(
        'relative',
        shouldIndent && depth > 0 && 'ml-6 border-l border-gray-200',
        `comment-level-${Math.min(depth, maxDepth)}`
      )}
    >
      {/* Comment Content */}
      <div className={cn(
        'p-3 rounded-lg transition-colors',
        shouldIndent && depth > 0 && 'ml-4',
        comment.isDeleted ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm text-gray-900">
              {comment.author}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimestamp(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
          </div>
          
          {canModify && !comment.isDeleted && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Edit comment"
                aria-label="Edit comment"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete comment"
                aria-label="Delete comment"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              maxLength={2000}
              placeholder="Edit your comment..."
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {editContent.length}/2000 characters
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={isSubmitting || !editContent.trim()}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
            {comment.content}
          </div>
        )}

        {/* Actions */}
        {!comment.isDeleted && !isEditing && (
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="flex items-center space-x-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
            >
              <Reply className="w-3 h-3" />
              <span>Reply</span>
            </button>
            
            {hasReplies && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                <span>
                  {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Reply Form */}
        {isReplying && (
          <div className="mt-3 space-y-2">
            <textarea
              value={replyContent}
              onChange={(e) => {
                setReplyContent(e.target.value);
                setReplyError('');
              }}
              className="w-full p-2 text-sm border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              maxLength={2000}
              placeholder="Write a reply..."
            />
            {replyError && (
              <p className="text-xs text-red-600">{replyError}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {replyContent.length}/2000 characters
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent('');
                    setReplyError('');
                  }}
                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReplySubmit}
                  disabled={isSubmitting || !replyContent.trim()}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Posting...' : 'Post Reply'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Replies */}
      {hasReplies && !isCollapsed && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              maxDepth={maxDepth}
              currentUser={currentUser}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface CommentThreadProps {
  postId: string;
  comments: Comment[];
  currentUser?: string;
  maxDepth?: number;
  onCommentsUpdate?: () => void;
  className?: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  postId,
  comments,
  currentUser = 'current-user',
  maxDepth = 5,
  onCommentsUpdate,
  className
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleReply = useCallback(async (parentId: string, content: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          author: currentUser,
          parentId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create reply');
      }

      onCommentsUpdate?.();
    } finally {
      setIsLoading(false);
    }
  }, [postId, currentUser, onCommentsUpdate]);

  const handleEdit = useCallback(async (commentId: string, content: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error('Failed to update comment');
      }

      onCommentsUpdate?.();
    } finally {
      setIsLoading(false);
    }
  }, [onCommentsUpdate]);

  const handleDelete = useCallback(async (commentId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      onCommentsUpdate?.();
    } finally {
      setIsLoading(false);
    }
  }, [onCommentsUpdate]);

  if (comments.length === 0) {
    return (
      <div className={cn('p-4 text-center text-gray-500', className)}>
        <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No comments yet</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          depth={0}
          maxDepth={maxDepth}
          currentUser={currentUser}
          onReply={handleReply}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Updating...</span>
        </div>
      )}
    </div>
  );
};