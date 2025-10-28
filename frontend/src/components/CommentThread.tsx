import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { MessageCircle, Reply, ChevronDown, ChevronRight, User, Bot, Link, ArrowUp } from 'lucide-react';
import { cn } from '../utils/cn';
import { CommentModerationPanel } from './CommentModerationPanel';
import { buildCommentTree, CommentTreeNode } from '../utils/commentUtils';
import { MentionInput } from './MentionInput';

export interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt?: string;  // Optional for backward compatibility
  created_at?: string; // API field (snake_case from backend)
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
  isModerated?: boolean;
  editHistory?: Array<{ content: string; editedAt: string }>;
  mentionedUsers?: string[];
  reportedCount?: number;
  moderatorNotes?: string;
  authorType?: 'agent' | 'user' | 'system';
}


export interface CommentFilter {
  author?: string;
  hasReplies?: boolean;
  isEdited?: boolean;
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
  onNavigate,
  onToggleExpand,
  onHighlight,
  showModeration = false,
  isHighlighted = false
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
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

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'unknown';

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'invalid date';

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
        shouldIndent && depth > 0 && 'ml-6 border-l border-gray-200 dark:border-gray-700',
        `comment-level-${Math.min(depth, maxDepth)}`,
        isHighlighted && 'ring-2 ring-blue-500 ring-opacity-50',
        comment.isModerated && 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 opacity-75'
      )}
    >
      {/* Comment Content */}
      <div className={cn(
        'p-3 rounded-lg transition-colors relative group',
        shouldIndent && depth > 0 && 'ml-4',
        comment.isDeleted ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800',
        isHighlighted && 'bg-blue-50 dark:bg-blue-900/30'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {comment.author}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(comment.created_at || comment.createdAt)}
            </span>
            {comment.isEdited && (
              <button
                onClick={() => setShowEditHistory(!showEditHistory)}
                className="text-xs text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-400 cursor-pointer"
                title="View edit history"
              >
                (edited)
              </button>
            )}
            {depth > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-400 font-mono">
                L{depth}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Navigation controls */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
              <button
                onClick={handlePermalinkClick}
                className="p-1 text-gray-400 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Copy permalink"
              >
                <Link className="w-3 h-3" />
              </button>
              {comment.parentId && (
                <button
                  onClick={() => handleNavigationClick('parent')}
                  className="p-1 text-gray-400 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="Go to parent"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Edit history */}
        {showEditHistory && comment.editHistory && comment.editHistory.length > 0 && (
          <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
            <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Edit History:</div>
            {comment.editHistory.map((edit, index) => (
              <div key={index} className="text-gray-600 dark:text-gray-400 mb-1">
                <span className="text-gray-500 dark:text-gray-400">{formatTimestamp(edit.editedAt)}:</span>
                <div className="mt-1 italic">"{edit.content.slice(0, 100)}..."</div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap leading-relaxed">
          {comment.isDeleted ? (
            <span className="italic text-gray-500 dark:text-gray-400">[This comment has been deleted]</span>
          ) : (
            renderMentions(comment.content)
          )}
        </div>
        

        {/* Actions */}
        {!comment.isDeleted && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {!isMaxDepth && (
                <button
                  onClick={() => {
                    console.log('🔥 COMMENT THREAD: Reply button clicked for comment', comment.id);
                    setIsReplying(!isReplying);
                  }}
                  className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Reply className="w-3 h-3" />
                  <span>Reply</span>
                </button>
              )}
              
              {hasReplies && (
                <button
                  onClick={handleToggleCollapse}
                  className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
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
                <div className="flex items-center space-x-2 text-xs text-gray-400 dark:text-gray-400">
                  <span>•</span>
                  <button
                    onClick={() => handleNavigationClick('prev')}
                    className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                    title="Previous sibling"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => handleNavigationClick('next')}
                    className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                    title="Next sibling"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
            
            {/* Comment metadata */}
            <div className="flex items-center space-x-2 text-xs text-gray-400 dark:text-gray-400">
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
                <span className="text-red-500 dark:text-red-400">{comment.reportedCount} reports</span>
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
              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {replyContent.length}/2000 characters
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent('');
                    setReplyError('');
                  }}
                  className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
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
  onCommentsUpdate?: () => void;
  showModeration?: boolean;
  enableRealTime?: boolean;
  className?: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  postId,
  comments,
  currentUser = 'current-user',
  maxDepth = 6,
  onCommentsUpdate,
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
              let currentComment: Comment | undefined = targetComment;
              const parentsToExpand: string[] = [];

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
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/socket.io/comments/${postId}`);
    
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
      // SPARC FIX: Use correct endpoint POST /api/agent-posts/:postId/comments with parent_id in body
      const response = await fetch(`/api/agent-posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser
        },
        body: JSON.stringify({
          content,
          parent_id: parentId,
          author: currentUser,
          author_agent: currentUser
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `Failed to create reply: ${response.status}`);
      }

      onCommentsUpdate?.();
    } catch (error) {
      console.error('Failed to post reply:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [postId, currentUser, onCommentsUpdate]);

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
  
  // Process comments - Simple pass-through with replies structure
  const processedComments = useMemo(() => {
    // CRITICAL FIX: Transform flat comments to nested structure with replies array
    const commentsWithReplies = comments.map(comment => ({
      ...comment,
      replies: comments.filter(c => c.parentId === comment.id)
    }));

    return commentsWithReplies;
  }, [comments]);

  if (processedComments.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className={cn('p-6 text-center text-gray-500 dark:text-gray-400')}>
          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No comments yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
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
                      ) ? 'border-blue-300 dark:border-blue-600' : 'border-gray-200 dark:border-gray-700'
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
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Updating...</span>
        </div>
      )}
    </div>
  );
};

