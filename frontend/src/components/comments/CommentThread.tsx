import React, { useState, useCallback, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  MessageCircle, 
  Heart, 
  ThumbsUp, 
  Share, 
  MoreHorizontal,
  User,
  Bot,
  Clock,
  Reply,
  Zap
} from 'lucide-react';
import { CommentTreeNode } from './CommentSystem';
import { CommentForm } from '../CommentForm';
import { ReactionsPanel } from './ReactionsPanel';
import { AgentBadge } from './AgentBadge';
import { formatTimeAgo } from '../../utils/timeUtils';
import { renderParsedContent, parseContent, hasMarkdown } from '../../utils/contentParser';

interface CommentThreadProps {
  comment: CommentTreeNode;
  depth: number;
  maxDepth: number;
  expanded?: boolean;
  onToggleExpansion?: () => void;
  onReply: (commentId: string, content: string) => Promise<void>;
  onReaction: (commentId: string, reactionType: string) => Promise<void>;
  onAgentResponse?: (commentId: string, agentType: string) => Promise<void>;
  agentConversationFilter?: string | null;
  className?: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  comment,
  depth,
  maxDepth,
  expanded = true,
  onToggleExpansion,
  onReply,
  onReaction,
  onAgentResponse,
  agentConversationFilter,
  className = ''
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Filter children based on agent conversation if specified
  const filteredChildren = useMemo(() => {
    if (!agentConversationFilter) return comment.children;
    
    return comment.children.filter(child => 
      child.metadata.conversationThreadId === agentConversationFilter ||
      child.children.some(grandchild => 
        grandchild.metadata.conversationThreadId === agentConversationFilter
      )
    );
  }, [comment.children, agentConversationFilter]);

  const hasFilteredChildren = filteredChildren.length > 0;
  const isAgentComment = comment.author.type === 'agent';
  const isDeepThread = depth >= maxDepth;
  const shouldTruncateContent = comment.content.length > 500 && !showMore;

  const displayContent = shouldTruncateContent
    ? comment.content.substring(0, 500) + '...'
    : comment.content;

  /**
   * Determine if comment should render as markdown
   *
   * Strategy:
   * 1. Check explicit contentType='markdown' (primary)
   * 2. Check if agent response with markdown syntax (fallback)
   * 3. Check if any content has markdown syntax (safety net)
   */
  const shouldRenderMarkdown = useMemo(() => {
    // Primary: Explicit markdown type
    if (comment.contentType === 'markdown') {
      return true;
    }

    // Fallback: Agent responses likely to have markdown
    if (comment.author.type === 'agent' && hasMarkdown(displayContent)) {
      console.log('[CommentThread] Auto-detected markdown in agent comment:', comment.id);
      return true;
    }

    // Safety net: Any markdown syntax (future-ready for user markdown)
    if (hasMarkdown(displayContent)) {
      console.log('[CommentThread] Auto-detected markdown in comment:', comment.id);
      return true;
    }

    return false;
  }, [comment.contentType, comment.author.type, comment.id, displayContent]);

  // Calculate thread indentation
  const indentationLevel = Math.min(depth, 6); // Max 6 levels of visual indentation
  const indentationClass = `ml-${indentationLevel * 4}`;

  const handleSubmitReply = useCallback(async (content: string) => {
    setIsSubmittingReply(true);
    try {
      await onReply(comment.id, content);
      setIsReplying(false);
    } catch (error) {
      console.error('Failed to submit reply:', error);
    } finally {
      setIsSubmittingReply(false);
    }
  }, [comment.id, onReply]);

  const handleReaction = useCallback(async (reactionType: string) => {
    try {
      await onReaction(comment.id, reactionType);
    } catch (error) {
      console.error('Failed to react to comment:', error);
    }
  }, [comment.id, onReaction]);

  const handleAgentResponse = useCallback(async (agentType: string) => {
    if (!onAgentResponse) return;

    try {
      await onAgentResponse(comment.id, agentType);
    } catch (error) {
      console.error('Failed to trigger agent response:', error);
    }
  }, [comment.id, onAgentResponse]);

  return (
    <div className={`comment-thread ${className}`} data-comment-id={comment.id}>
      {/* Comment Card */}
      <div
        className={`comment-card bg-white dark:bg-gray-900 border rounded-lg mb-2 transition-all duration-200 hover:shadow-md ${
          depth > 0 ? indentationClass : ''
        } ${
          comment.metadata.isAgentResponse ? 'border-blue-200 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        {/* Comment Header */}
        <div className="comment-header flex items-center space-x-3 p-4 pb-2">
          {/* Author Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
            isAgentComment 
              ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
              : 'bg-gradient-to-r from-gray-500 to-gray-700'
          }`}>
            {isAgentComment ? <Bot className="w-4 h-4" /> : comment.author.name.charAt(0).toUpperCase()}
          </div>
          
          {/* Author Info */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {comment.author.name}
              </span>
              
              {isAgentComment && (
                <AgentBadge 
                  agentType={comment.author.id}
                  size="sm"
                />
              )}
              
              {comment.metadata.responseToAgent && (
                <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                  → {comment.metadata.responseToAgent}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <Clock className="w-3 h-3" />
              <time dateTime={comment.createdAt}>
                {formatTimeAgo(comment.createdAt)}
              </time>

              {comment.updatedAt !== comment.createdAt && (
                <span>(edited)</span>
              )}

              {comment.metadata.threadDepth > 0 && (
                <span>• Depth {comment.metadata.threadDepth}</span>
              )}

              {comment.metadata.qualityScore && comment.metadata.qualityScore > 0.8 && (
                <span className="text-green-600 dark:text-green-400 font-medium">High Quality</span>
              )}
            </div>
          </div>
          
          {/* Thread Controls */}
          <div className="flex items-center space-x-2">
            {hasFilteredChildren && (
              <button
                onClick={onToggleExpansion}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={expanded ? 'Collapse replies' : 'Expand replies'}
              >
                {expanded ?
                  <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" /> :
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                }
              </button>
            )}

            <button className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
        
        {/* Comment Content */}
        <div className="comment-content px-4 pb-3">
          <div className="prose prose-sm max-w-none text-gray-800 dark:text-gray-200 leading-relaxed">
            {shouldRenderMarkdown ? (
              renderParsedContent(parseContent(displayContent), {
                className: 'comment-parsed-content',
                enableMarkdown: true
              })
            ) : (
              <p className="whitespace-pre-wrap">{displayContent}</p>
            )}
          </div>
          
          {shouldTruncateContent && (
            <button
              onClick={() => setShowMore(true)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm mt-2 font-medium"
            >
              Show more
            </button>
          )}
        </div>
        
        {/* Comment Actions */}
        <div className="comment-actions border-t border-gray-100 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Like Button */}
              <button
                onClick={() => handleReaction('like')}
                className={`flex items-center space-x-1 text-sm transition-colors ${
                  comment.engagement.userReacted && comment.engagement.userReactionType === 'like'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${
                  comment.engagement.userReacted && comment.engagement.userReactionType === 'like'
                    ? 'fill-current'
                    : ''
                }`} />
                <span>{comment.engagement.likes || 0}</span>
              </button>
              
              {/* Reply Button */}
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Reply className="w-4 h-4" />
                <span>Reply</span>
              </button>

              {/* Reactions Button */}
              {Object.keys(comment.engagement.reactions).length > 0 && (
                <button
                  onClick={() => setShowReactions(!showReactions)}
                  className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{comment.metadata.reactionCount}</span>
                </button>
              )}

              {/* Reply Count */}
              {comment.metadata.replyCount > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {comment.metadata.replyCount} {comment.metadata.replyCount === 1 ? 'reply' : 'replies'}
                </span>
              )}
            </div>
            
            {/* Agent Response Trigger */}
            {onAgentResponse && !isAgentComment && (
              <button
                onClick={() => handleAgentResponse('TechReviewer')}
                className="flex items-center space-x-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
              >
                <Zap className="w-4 h-4" />
                <span>Get Agent Response</span>
              </button>
            )}
          </div>
          
          {/* Reactions Panel */}
          {showReactions && (
            <ReactionsPanel
              reactions={comment.engagement.reactions}
              onReaction={handleReaction}
              className="mt-3"
            />
          )}
        </div>
      </div>
      
      {/* Reply Form */}
      {isReplying && (
        <div className={`reply-form mb-3 ${depth > 0 ? indentationClass : ''} ml-4`}>
          <CommentForm
            onSubmit={handleSubmitReply}
            onCancel={() => setIsReplying(false)}
            placeholder={`Reply to ${comment.author.name}...`}
            submitText="Post Reply"
            isSubmitting={isSubmittingReply}
            compact
          />
        </div>
      )}
      
      {/* Child Comments */}
      {expanded && hasFilteredChildren && !isDeepThread && (
        <div className="child-comments">
          {filteredChildren.map((child) => (
            <CommentThread
              key={child.id}
              comment={child}
              depth={depth + 1}
              maxDepth={maxDepth}
              expanded={true}
              onReply={onReply}
              onReaction={onReaction}
              onAgentResponse={onAgentResponse}
              agentConversationFilter={agentConversationFilter}
            />
          ))}
        </div>
      )}
      
      {/* Load More Deep Comments */}
      {expanded && hasFilteredChildren && isDeepThread && (
        <div className={`load-more-deep ml-${Math.min(depth + 1, 6) * 4} mb-3`}>
          <button className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors">
            <MessageCircle className="w-4 h-4" />
            <span>Continue this thread ({filteredChildren.length} more replies)</span>
          </button>
        </div>
      )}
    </div>
  );
};