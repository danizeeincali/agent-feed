import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { MessageCircle, Reply, Edit2, Trash2, ChevronDown, ChevronRight, Flag, Pin, Link, MoreHorizontal, Search, ArrowUp, Filter, User, Bot } from 'lucide-react';
import { cn } from '@/utils/cn';
import { CommentModerationPanel } from './CommentModerationPanel';
import { buildCommentTree, CommentTreeNode } from '@/utils/commentUtils';
import { MentionInput } from './MentionInput';

export interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
  replies?: Comment[];
  repliesCount: number;
  threadDepth: number;
  threadPath: string;
  edited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  isEdited?: boolean;
  isPinned?: boolean;
  isModerated?: boolean;
  editHistory?: Array<{ content: string; editedAt: string }>;
  mentionedUsers?: string[];
  reportedCount?: number;
  moderatorNotes?: string;
  authorType?: 'agent' | 'user' | 'system';
}

export interface CommentSort {
  field: 'createdAt' | 'replies' | 'controversial';
  direction: 'asc' | 'desc';
}

export interface CommentFilter {
  author?: string;
  hasReplies?: boolean;
  isEdited?: boolean;
  isPinned?: boolean;
  authorType?: 'agent' | 'user' | 'system';
}

export interface ThreadState {
  expanded: Set<string>;
  collapsed: Set<string>;
  highlighted?: string;
  searchQuery?: string;
}

interface CommentItemProps {
  comment: Comment;
  depth: number;
  maxDepth: number;
  currentUser?: string;
  threadState: ThreadState;
  onReply: (parentId: string, content: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReact?: (commentId: string, reaction: string) => Promise<void>;
  onReport: (commentId: string, reason: string, description?: string) => Promise<void>;
  onPin: (commentId: string) => Promise<void>;
  onNavigate: (commentId: string, direction: 'parent' | 'next' | 'prev') => void;
  onToggleExpand: (commentId: string) => void;
  onHighlight: (commentId: string) => void;
  showModeration?: boolean;
  isHighlighted?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  depth,
  maxDepth,
  currentUser,
  threadState,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onReport,
  onPin,
  onNavigate,
  onToggleExpand,
  onHighlight,
  showModeration = false,
  isHighlighted = false
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState(comment.content);
  const [replyError, setReplyError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState(false);
  
  const commentRef = useRef<HTMLDivElement>(null);
  const isCollapsed = threadState.collapsed.has(comment.id);
  const isExpanded = threadState.expanded.has(comment.id) || !isCollapsed;

  const canModify = currentUser === comment.author;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const shouldIndent = depth < maxDepth;
  const isMaxDepth = depth >= maxDepth;
  const replyCount = comment.repliesCount || 0;
  
  // Scroll to comment when highlighted
  useEffect(() => {
    if (isHighlighted && commentRef.current) {
      commentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);
  
  const handleToggleCollapse = () => {
    onToggleExpand(comment.id);
  };
  
  const handleNavigationClick = (direction: 'parent' | 'next' | 'prev') => {
    onNavigate(comment.id, direction);
  };
  
  const handlePermalinkClick = () => {
    // CRITICAL FIX: Remove double-prefix bug - comment.id already contains "comment-" prefix
    const permalink = `${window.location.origin}${window.location.pathname}#${comment.id}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(permalink).then(() => {
      console.log('Permalink copied:', permalink);
    }).catch(err => {
      console.warn('Failed to copy permalink:', err);
    });
    
    // Update URL hash without page reload - this triggers hashchange event
    window.history.pushState(null, '', `#comment-${comment.id}`);
    
    // Trigger hash navigation manually since pushState doesn't fire hashchange
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    
    // Highlight the comment
    onHighlight(comment.id);
  };

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
      return diffInMinutes < 1 ? 'now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 24 * 7) {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  const renderMentions = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-blue-600 font-medium hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div 
      id={`comment-${comment.id}`}
      ref={commentRef}
      className={cn(
        'relative transition-all duration-200',
        shouldIndent && depth > 0 && 'ml-6 border-l border-gray-200',
        `comment-level-${Math.min(depth, maxDepth)}`,
        isHighlighted && 'ring-2 ring-blue-500 ring-opacity-50',
        comment.isPinned && 'bg-yellow-50 border-yellow-200',
        comment.isModerated && 'bg-red-50 border-red-200 opacity-75'
      )}
    >
      {/* Comment Content */}
      <div className={cn(
        'p-3 rounded-lg transition-colors relative group',
        shouldIndent && depth > 0 && 'ml-4',
        comment.isDeleted ? 'bg-gray-50' : 'bg-white hover:bg-gray-50',
        comment.isPinned && 'border border-yellow-300',
        isHighlighted && 'bg-blue-50'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {comment.isPinned && (
              <Pin className="w-3 h-3 text-yellow-600" />
            )}
            <span className="font-medium text-sm text-gray-900">
              {comment.author}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimestamp(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <button
                onClick={() => setShowEditHistory(!showEditHistory)}
                className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                title="View edit history"
              >
                (edited)
              </button>
            )}
            {depth > 0 && (
              <span className="text-xs text-gray-400 font-mono">
                L{depth}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Navigation controls */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
              <button
                onClick={handlePermalinkClick}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Copy permalink"
              >
                <Link className="w-3 h-3" />
              </button>
              {comment.parentId && (
                <button
                  onClick={() => handleNavigationClick('parent')}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Go to parent"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
              )}
            </div>
            
            {/* Moderation and edit controls */}
            {(canModify || showModeration) && !comment.isDeleted && (
              <div className="flex items-center space-x-1">
                {canModify && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit comment"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onPin(comment.id)}
                      className={cn(
                        'p-1 transition-colors',
                        comment.isPinned 
                          ? 'text-yellow-600 hover:text-yellow-700'
                          : 'text-gray-400 hover:text-yellow-600'
                      )}
                      title={comment.isPinned ? 'Unpin comment' : 'Pin comment'}
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                  </>
                )}
                
              </div>
            )}
          </div>
        </div>
        
        {/* Edit history */}
        {showEditHistory && comment.editHistory && comment.editHistory.length > 0 && (
          <div className="mb-2 p-2 bg-gray-50 rounded text-xs">
            <div className="font-medium text-gray-700 mb-1">Edit History:</div>
            {comment.editHistory.map((edit, index) => (
              <div key={index} className="text-gray-600 mb-1">
                <span className="text-gray-500">{formatTimestamp(edit.editedAt)}:</span>
                <div className="mt-1 italic">"{edit.content.slice(0, 100)}..."</div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <MentionInput
              value={editContent}
              onChange={(content) => {
                console.log('🎯 COMMENT THREAD: Edit content changed:', content);
                setEditContent(content);
              }}
              onMentionSelect={(mention) => {
                console.log('🎯 COMMENT THREAD: Mention selected in edit:', mention);
              }}
              className="w-full p-2 text-sm border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              maxLength={2000}
              placeholder="Edit your comment... Use @ to mention agents or users"
              mentionContext="post"
              autoFocus={true}
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
          <div className="text-sm text-gray-700 mb-3 whitespace-pre-wrap leading-relaxed">
            {comment.isDeleted ? (
              <span className="italic text-gray-500">[This comment has been deleted]</span>
            ) : (
              renderMentions(comment.content)
            )}
          </div>
        )}
        

        {/* Actions */}
        {!comment.isDeleted && !isEditing && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {!isMaxDepth && (
                <button
                  onClick={() => {
                    console.log('🔥 COMMENT THREAD: Reply button clicked for comment', comment.id);
                    setIsReplying(!isReplying);
                  }}
                  className="flex items-center space-x-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <Reply className="w-3 h-3" />
                  <span>Reply</span>
                </button>
              )}
              
              {hasReplies && (
                <button
                  onClick={handleToggleCollapse}
                  className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  <span>
                    {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                  </span>
                </button>
              )}
              
              {/* Thread navigation helpers */}
              {depth > 0 && (
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span>•</span>
                  <button
                    onClick={() => handleNavigationClick('prev')}
                    className="hover:text-gray-600 transition-colors"
                    title="Previous sibling"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => handleNavigationClick('next')}
                    className="hover:text-gray-600 transition-colors"
                    title="Next sibling"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
            
            {/* Comment metadata */}
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              {comment.authorType === 'agent' && (
                <div className="flex items-center space-x-1">
                  <Bot className="w-3 h-3" />
                  <span>Agent</span>
                </div>
              )}
              {comment.repliesCount > 0 && (
                <span>{comment.repliesCount} replies</span>
              )}
              {comment.reportedCount && comment.reportedCount > 0 && showModeration && (
                <span className="text-red-500">{comment.reportedCount} reports</span>
              )}
            </div>
          </div>
        )}

        {/* Reply Form */}
        {isReplying && (
          console.log('🔥 COMMENT THREAD: Reply form rendering for comment', comment.id),
          <div className="mt-3 space-y-2">
            <MentionInput
              value={replyContent}
              onChange={(content) => {
                console.log('🎯 COMMENT THREAD: Reply content changed:', content);
                setReplyContent(content);
                setReplyError('');
              }}
              onMentionSelect={(mention) => {
                console.log('🎯 COMMENT THREAD: Mention selected in reply:', mention);
              }}
              className="w-full p-2 text-sm border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              maxLength={2000}
              placeholder="Write a reply... Use @ to mention agents or users"
              mentionContext="post"
              autoFocus={true}
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

      {/* Moderation Panel */}
      {showModerationPanel && (
        <div className="mt-4">
          <CommentModerationPanel
            commentId={comment.id}
            isReported={Boolean(comment.reportedCount && comment.reportedCount > 0)}
            reportedCount={comment.reportedCount}
            isModerated={comment.isModerated}
            moderatorNotes={comment.moderatorNotes}
            onReport={onReport}
            onClose={() => setShowModerationPanel(false)}
          />
        </div>
      )}
      
      {/* Replies - REMOVED: This was creating duplicate flat rendering that broke threading.
           The proper nested rendering is handled by the buildCommentTree logic in the main CommentThread component */}
    </div>
  );
};

interface CommentThreadProps {
  postId: string;
  comments: Comment[];
  currentUser?: string;
  maxDepth?: number;
  sort?: CommentSort;
  filter?: CommentFilter;
  searchQuery?: string;
  onCommentsUpdate?: () => void;
  onSortChange?: (sort: CommentSort) => void;
  onFilterChange?: (filter: CommentFilter) => void;
  onSearchChange?: (query: string) => void;
  showModeration?: boolean;
  enableRealTime?: boolean;
  className?: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  postId,
  comments,
  currentUser = 'current-user',
  maxDepth = 6,
  sort = { field: 'createdAt', direction: 'asc' },
  filter,
  searchQuery,
  onCommentsUpdate,
  onSortChange,
  onFilterChange,
  onSearchChange,
  showModeration = false,
  enableRealTime = false,
  className
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [threadState, setThreadState] = useState<ThreadState>({
    expanded: new Set<string>(),
    collapsed: new Set<string>(),
    highlighted: undefined
  });
  const [showControls, setShowControls] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);

  // Handle URL hash fragment navigation on mount and when comments change
  useEffect(() => {
    const handleHashNavigation = () => {
      const hash = window.location.hash;
      console.log('🔗 Hash navigation triggered:', hash);
      
      if (hash.startsWith('#comment-')) {
        const commentId = hash.replace('#comment-', '');
        const comment = comments.find(c => c.id === commentId);
        console.log('🎯 Target comment found:', comment?.id, comment?.author);
        
        if (comment) {
          // Expand parent comments to ensure visibility - Enhanced logic
          setThreadState(prev => {
            const newExpanded = new Set(prev.expanded);
            const newCollapsed = new Set(prev.collapsed);
            
            // Find and expand all parents in the chain
            const expandParentChain = (targetComment: Comment) => {
              let currentComment = targetComment;
              const parentsToExpand = [];
              
              // Collect all parent IDs in the chain
              while (currentComment?.parentId) {
                parentsToExpand.push(currentComment.parentId);
                currentComment = comments.find(c => c.id === currentComment?.parentId);
              }
              
              console.log('📂 Expanding parent chain:', parentsToExpand);
              
              // Expand all parents
              parentsToExpand.forEach(parentId => {
                newExpanded.add(parentId);
                newCollapsed.delete(parentId);
              });
            };
            
            expandParentChain(comment);
            
            return {
              ...prev,
              expanded: newExpanded,
              collapsed: newCollapsed,
              highlighted: commentId
            };
          });
          
          // Scroll to comment after state update and DOM render - Enhanced timing
          setTimeout(() => {
            const element = document.getElementById(`comment-${commentId}`);
            console.log('📍 Scrolling to element:', element ? 'found' : 'not found');
            
            if (element) {
              // Ensure element is visible first
              element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
              });
              
              // Add highlight effect with better visibility
              element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              element.style.border = '2px solid rgba(59, 130, 246, 0.5)';
              element.style.borderRadius = '8px';
              element.style.transition = 'all 0.3s ease';
              
              // Remove highlight after delay
              setTimeout(() => {
                element.style.backgroundColor = '';
                element.style.border = '';
                element.style.borderRadius = '';
              }, 3000);
            } else {
              console.warn(`❌ Element comment-${commentId} not found in DOM`);
              
              // Retry after longer delay for complex renders
              setTimeout(() => {
                const retryElement = document.getElementById(`comment-${commentId}`);
                if (retryElement) {
                  console.log('✅ Retry successful, scrolling to element');
                  retryElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center'
                  });
                }
              }, 500);
            }
          }, 300); // Increased timeout for React state update and re-render
        } else {
          console.warn(`❌ Comment ${commentId} not found in comments array of ${comments.length} items`);
        }
      }
    };

    // Only run if comments array is populated
    if (comments.length > 0) {
      console.log('🚀 Setting up hash navigation with', comments.length, 'comments');
      
      // Handle initial load
      handleHashNavigation();
    }
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashNavigation);
    // SPARC FIX: Also listen for popstate for better browser navigation
    window.addEventListener('popstate', handleHashNavigation);
    
    return () => {
      window.removeEventListener('hashchange', handleHashNavigation);
      window.removeEventListener('popstate', handleHashNavigation);
    };
  }, [comments]); // Dependency on comments ensures navigation works after data loads

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!enableRealTime) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/comments/${postId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'comment_update') {
        onCommentsUpdate?.();
      }
    };
    
    ws.onerror = (error) => {
      console.warn('WebSocket connection failed:', error);
    };
    
    wsRef.current = ws;
    
    return () => {
      ws.close();
    };
  }, [postId, enableRealTime, onCommentsUpdate]);

  const handleReply = useCallback(async (parentId: string, content: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/comments/${parentId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          authorAgent: currentUser,
          postId: postId
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
  
  
  const handleReport = useCallback(async (commentId: string, reason: string, description?: string) => {
    try {
      const response = await fetch(`/api/v1/comments/${commentId}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          description,
          reporterId: currentUser
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit report');
      }
      
      onCommentsUpdate?.();
    } catch (error) {
      console.error('Failed to report comment:', error);
      throw error;
    }
  }, [currentUser, onCommentsUpdate]);
  
  const handlePin = useCallback(async (commentId: string) => {
    try {
      const response = await fetch(`/api/v1/comments/${commentId}/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to pin comment');
      }
      
      onCommentsUpdate?.();
    } catch (error) {
      console.error('Failed to pin comment:', error);
      throw error;
    }
  }, [onCommentsUpdate]);
  
  const handleNavigate = useCallback((commentId: string, direction: 'parent' | 'next' | 'prev') => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    
    let targetId: string | undefined;
    
    switch (direction) {
      case 'parent':
        targetId = comment.parentId;
        break;
      case 'next':
        const siblings = comments.filter(c => c.parentId === comment.parentId);
        const currentIndex = siblings.findIndex(c => c.id === commentId);
        targetId = siblings[currentIndex + 1]?.id;
        break;
      case 'prev':
        const prevSiblings = comments.filter(c => c.parentId === comment.parentId);
        const prevIndex = prevSiblings.findIndex(c => c.id === commentId);
        targetId = prevSiblings[prevIndex - 1]?.id;
        break;
    }
    
    if (targetId) {
      setThreadState(prev => ({
        ...prev,
        highlighted: targetId
      }));
      
      setTimeout(() => {
        const element = document.getElementById(`comment-${targetId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [comments]);
  
  const handleToggleExpand = useCallback((commentId: string) => {
    setThreadState(prev => {
      const newExpanded = new Set(prev.expanded);
      const newCollapsed = new Set(prev.collapsed);
      
      if (newCollapsed.has(commentId)) {
        // Expand the comment and its children
        newCollapsed.delete(commentId);
        newExpanded.add(commentId);
      } else {
        // Collapse the comment and its children
        newExpanded.delete(commentId);
        newCollapsed.add(commentId);
        
        // Also collapse all child comments
        const comment = comments.find(c => c.id === commentId);
        if (comment?.replies) {
          const collapseChildren = (replies: Comment[]) => {
            replies.forEach(reply => {
              newCollapsed.add(reply.id);
              newExpanded.delete(reply.id);
              if (reply.replies) {
                collapseChildren(reply.replies);
              }
            });
          };
          collapseChildren(comment.replies);
        }
      }
      
      return {
        ...prev,
        expanded: newExpanded,
        collapsed: newCollapsed
      };
    });
  }, [comments]);
  
  const handleHighlight = useCallback((commentId: string) => {
    setThreadState(prev => ({
      ...prev,
      highlighted: prev.highlighted === commentId ? undefined : commentId
    }));
  }, []);
  
  // Process comments with sorting and filtering
  const processedComments = useMemo(() => {
    let result = [...comments];
    
    // Apply search filter
    if (searchQuery) {
      result = result.filter(comment => 
        comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comment.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply filters
    if (filter) {
      if (filter.author) {
        result = result.filter(comment => 
          comment.author.toLowerCase().includes(filter.author!.toLowerCase())
        );
      }
      
      if (filter.hasReplies !== undefined) {
        result = result.filter(comment => 
          (comment.repliesCount > 0) === filter.hasReplies
        );
      }
      
      if (filter.isEdited !== undefined) {
        result = result.filter(comment => 
          comment.isEdited === filter.isEdited
        );
      }
      
      if (filter.isPinned !== undefined) {
        result = result.filter(comment => 
          comment.isPinned === filter.isPinned
        );
      }
      
      if (filter.minLikes !== undefined) {
        result = result.filter(comment => 
          comment.likesCount >= filter.minLikes!
        );
      }
    }
    
    // CRITICAL FIX: Transform flat comments to nested structure with replies array
    const commentsWithReplies = result.map(comment => ({
      ...comment,
      replies: result.filter(c => c.parentId === comment.id)
    }));

    return commentsWithReplies;
  }, [comments, searchQuery, filter]);

  if (processedComments.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Thread controls */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowControls(!showControls)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Controls</span>
            </button>
          </div>
        </div>
        
        {showControls && (
          <ThreadControls
            sort={sort}
            filter={filter}
            searchQuery={searchQuery}
            onSortChange={onSortChange}
            onFilterChange={onFilterChange}
            onSearchChange={onSearchChange}
            threadStats={{
              totalComments: comments.length,
              totalReplies: comments.filter(c => c.parentId).length,
              totalLikes: comments.reduce((sum, c) => sum + c.likesCount, 0),
              maxDepth: Math.max(...comments.map(c => c.threadDepth), 0),
              topContributors: []
            }}
          />
        )}
        
        <div className={cn('p-6 text-center text-gray-500')}>
          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {searchQuery || filter ? 'No comments match your criteria' : 'No comments yet'}
          </p>
          {(searchQuery || filter) && (
            <button
              onClick={() => {
                onSearchChange?.('');
                onFilterChange?.({});
              }}
              className="text-blue-600 hover:text-blue-800 text-sm mt-2 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Thread controls */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowControls(!showControls)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Controls</span>
            {showControls ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          
          <div className="text-sm text-gray-500">
            {processedComments.length} of {comments.length} comments
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {enableRealTime && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          )}
        </div>
      </div>
      
      {showControls && (
        <ThreadControls
          sort={sort}
          filter={filter}
          searchQuery={searchQuery}
          onSortChange={onSortChange}
          onFilterChange={onFilterChange}
          onSearchChange={onSearchChange}
          threadStats={{
            totalComments: comments.length,
            totalReplies: comments.filter(c => c.parentId).length,
            totalEngagement: comments.reduce((sum, c) => sum + c.repliesCount, 0),
            maxDepth: Math.max(...comments.map(c => c.threadDepth), 0),
            topContributors: []
          }}
        />
      )}
      
      {/* Comments - Enhanced with threading visibility */}
      <div className="space-y-3" data-testid="comment-thread-container">
        {(() => {
          // Build comment tree structure for proper threading
          const commentTree = buildCommentTree(processedComments);
          
          // Render tree nodes recursively - Fixed expansion logic
          const renderCommentTree = (nodes: CommentTreeNode[], depth = 0): React.ReactNode[] => {
            return nodes.map((node: CommentTreeNode) => {
              const comment = node.comment;
              
              // Enhanced expansion logic: 
              // - Comments with children start expanded by default
              // - Can be explicitly collapsed via threadState.collapsed
              // - Can be explicitly expanded via threadState.expanded (overrides collapsed)
              const hasChildren = node.children && node.children.length > 0;
              const isExplicitlyCollapsed = threadState.collapsed.has(comment.id);
              const isExplicitlyExpanded = threadState.expanded.has(comment.id);
              
              // Final expansion state
              const isExpanded = hasChildren && (
                isExplicitlyExpanded || // Explicitly expanded always wins
                (!isExplicitlyCollapsed) // Default to expanded if not explicitly collapsed
              );
              
              console.log(`🌳 Comment ${comment.id} (depth ${depth}): hasChildren=${hasChildren}, expanded=${isExpanded}, explicitly collapsed=${isExplicitlyCollapsed}`);
              
              return (
                <div key={comment.id} className="comment-tree-node" data-comment-id={comment.id} data-depth={depth}>
                  <CommentItem
                    comment={comment}
                    depth={depth}
                    maxDepth={maxDepth}
                    currentUser={currentUser}
                    threadState={threadState}
                    onReply={handleReply}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onReact={undefined}
                    onReport={handleReport}
                    onPin={handlePin}
                    onNavigate={handleNavigate}
                    onToggleExpand={handleToggleExpand}
                    onHighlight={handleHighlight}
                    showModeration={showModeration}
                    isHighlighted={threadState.highlighted === comment.id}
                  />
                  {/* Render children with proper threading indentation */}
                  {isExpanded && hasChildren && (
                    <div className={`ml-6 border-l-2 ${
                      threadState.highlighted && node.children.some(child => 
                        child.comment.id === threadState.highlighted
                      ) ? 'border-blue-300' : 'border-gray-200'
                    } pl-4 mt-2 transition-colors duration-200`}>
                      {renderCommentTree(node.children, depth + 1)}
                    </div>
                  )}
                </div>
              );
            });
          };
          
          return renderCommentTree(commentTree);
        })()}
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Updating...</span>
        </div>
      )}
    </div>
  );
};

// Thread controls component
interface ThreadControlsProps {
  sort: CommentSort;
  filter?: CommentFilter;
  searchQuery?: string;
  threadStats: {
    totalComments: number;
    totalReplies: number;
    totalEngagement: number;
    maxDepth: number;
    topContributors: Array<{ author: string; count: number; engagement: number }>;
  };
  onSortChange?: (sort: CommentSort) => void;
  onFilterChange?: (filter: CommentFilter) => void;
  onSearchChange?: (query: string) => void;
}

const ThreadControls: React.FC<ThreadControlsProps> = ({
  sort,
  filter,
  searchQuery,
  threadStats,
  onSortChange,
  onFilterChange,
  onSearchChange
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery || '');
  const [showStats, setShowStats] = useState(false);
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange?.(localSearchQuery);
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex space-x-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            placeholder="Search comments..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
      </form>
      
      {/* Sort and Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={`${sort.field}-${sort.direction}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-') as [CommentSort['field'], CommentSort['direction']];
                onSortChange?.({ field, direction });
              }}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt-asc">Oldest first</option>
              <option value="createdAt-desc">Newest first</option>
              <option value="replies-desc">Most replies</option>
              <option value="controversial-desc">Most controversial</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={() => setShowStats(!showStats)}
          className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {showStats ? 'Hide' : 'Show'} Stats
        </button>
      </div>
      
      {/* Thread Statistics */}
      {showStats && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <h4 className="font-medium text-gray-900">Thread Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Total Comments</div>
              <div className="font-semibold">{threadStats.totalComments}</div>
            </div>
            <div>
              <div className="text-gray-500">Total Replies</div>
              <div className="font-semibold">{threadStats.totalReplies}</div>
            </div>
            <div>
              <div className="text-gray-500">Total Engagement</div>
              <div className="font-semibold">{threadStats.totalEngagement}</div>
            </div>
            <div>
              <div className="text-gray-500">Max Depth</div>
              <div className="font-semibold">{threadStats.maxDepth}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};