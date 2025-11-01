import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, MessageCircle, AtSign, Hash, Bold, Italic, Code, Link2, Bot, User, Reply } from 'lucide-react';
import { cn } from '../utils/cn';
import { extractMentions } from '../utils/commentUtils';
import { apiService } from '../services/api';
import { MentionInput, MentionInputRef, MentionSuggestion } from './MentionInput';
import { MentionService } from '../services/MentionService';
import { hasMarkdown } from '../utils/contentParser';

interface CommentFormProps {
  postId: string;
  parentId?: string;
  currentUser?: string;
  onCommentAdded?: () => void;
  onOptimisticAdd?: (comment: any) => void;
  onOptimisticRemove?: (tempId: string) => void;
  onCommentConfirmed?: (realComment: any, tempId: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  maxLength?: number;
  showFormatting?: boolean;
  mentionSuggestions?: string[];
  onCancel?: () => void;
  useMentionInput?: boolean;
  // PHASE 2: Optimistic update support
  updatePostInList?: (postId: string, updates: any) => void;
  refetchPost?: (postId: string) => Promise<any>;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  parentId,
  currentUser = 'current-user',
  onCommentAdded,
  onOptimisticAdd,
  onOptimisticRemove,
  onCommentConfirmed,
  placeholder = 'Provide technical analysis or feedback...',
  className,
  autoFocus = false,
  maxLength = 2000,
  showFormatting = true,
  mentionSuggestions = [],
  onCancel,
  useMentionInput = true,
  updatePostInList,
  refetchPost
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  // Removed preview state to simplify layout like PostCreator
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionInputRef = useRef<MentionInputRef>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);

  // CRITICAL DEBUG: Log component mounting
  useEffect(() => {
    console.log('🔥 COMMENT FORM: Component mounted/updated', { postId, parentId, hasContent: !!content });
  }, [postId, parentId, content]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Comment content is required');
      return;
    }

    if (content.length > maxLength) {
      setError(`Comment content must be under ${maxLength} characters`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    // Create optimistic comment with temporary ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const contentHasMarkdown = hasMarkdown(content.trim());
    const tempComment = {
      id: tempId,
      content: content.trim(),
      content_type: contentHasMarkdown ? 'markdown' : 'text',
      author: currentUser,
      author_agent: currentUser,
      created_at: new Date().toISOString(),
      post_id: postId,
      parent_id: parentId || null,
      _optimistic: true  // Mark as temporary
    };

    // PHASE 2: Get original count for rollback
    let originalCount: number | undefined;
    if (updatePostInList && !parentId) {
      // Only track for root comments, not replies
      try {
        const currentPost = await apiService.getAgentPost(postId);
        if (currentPost.success && currentPost.data) {
          originalCount = currentPost.data.comments || 0;
        }
      } catch (err) {
        console.warn('[CommentForm] Could not fetch current post for optimistic update', err);
      }
    }

    // Add optimistically (instant UI feedback)
    onOptimisticAdd?.(tempComment);

    try {
      console.log('[CommentForm] Submitting comment via API service:', {
        postId,
        content: content.trim(),
        parentId,
        author: currentUser,
        tempId,
        hasOptimisticUpdates: !!(onOptimisticAdd && onCommentConfirmed)
      });

      // PHASE 2: Step 1 - Optimistic update (instant UI feedback)
      if (updatePostInList && originalCount !== undefined && !parentId) {
        const optimisticCount = originalCount + 1;
        console.log('[CommentForm] Optimistic counter update:', { postId, from: originalCount, to: optimisticCount });
        updatePostInList(postId, { comments: optimisticCount });
      }

      // PHASE 2: Step 2 - Create comment via API with content_type detection
      const result = await apiService.createComment(postId, content.trim(), {
        parentId: parentId || undefined,
        author: currentUser,
        mentionedUsers: useMentionInput ? MentionService.extractMentions(content) : extractMentions(content),
        contentType: contentHasMarkdown ? 'markdown' : 'text'  // FRONTEND FIX: Detect and send content_type
      });

      console.log('[CommentForm] Comment submitted with content_type:', contentHasMarkdown ? 'markdown' : 'text');

      console.log('[CommentForm] Comment submitted successfully:', result);

      // Confirm with real comment
      if (result.success && result.data) {
        onCommentConfirmed?.(result.data, tempId);
      }

      // PHASE 2: Step 3 - Refetch to confirm with server (if available)
      if (refetchPost && !parentId) {
        try {
          const updated = await refetchPost(postId);
          if (updated) {
            console.log('[CommentForm] Post refetched successfully:', {
              postId,
              confirmedCount: updated.comments
            });
            // Step 4: Update with confirmed value
            if (updatePostInList) {
              updatePostInList(postId, { comments: updated.comments });
            }
          }
        } catch (refetchError) {
          console.warn('[CommentForm] Refetch failed but comment was created:', refetchError);
          // Keep optimistic update - will sync on next page load
        }
      }

      setContent('');
      onCommentAdded?.();
    } catch (error) {
      console.error('[CommentForm] Comment submission failed:', error);

      // Remove optimistic comment on error
      onOptimisticRemove?.(tempId);

      // PHASE 2: Rollback optimistic update on error
      if (updatePostInList && originalCount !== undefined && !parentId) {
        console.log('[CommentForm] Rolling back optimistic update:', { postId, to: originalCount });
        updatePostInList(postId, { comments: originalCount });
      }

      setError(error instanceof Error ? error.message : 'Failed to post technical analysis');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // CRITICAL FIX: Remove manual content change handler - MentionInput handles this
  
  // CRITICAL FIX: Remove manual mention insertion - MentionInput handles this
  
  // CRITICAL FIX: Simplified formatting for MentionInput compatibility
  const insertFormatting = useCallback((format: string) => {
    if (!mentionInputRef.current) return;
    
    const start = mentionInputRef.current.selectionStart;
    const end = mentionInputRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let replacement = '';
    
    switch (format) {
      case 'bold':
        replacement = `**${selectedText}**`;
        break;
      case 'italic':
        replacement = `*${selectedText}*`;
        break;
      case 'code':
        replacement = selectedText.includes('\n') 
          ? `\`\`\`\n${selectedText}\n\`\`\``
          : `\`${selectedText}\``;
        break;
      case 'link':
        replacement = `[${selectedText}](url)`;
        break;
      default:
        return;
    }
    
    const newContent = 
      content.substring(0, start) + 
      replacement + 
      content.substring(end);
    
    setContent(newContent);
  }, [content]);
  
  // Handle mention selection for MentionInput - CRITICAL FIX: Follow QuickPost pattern
  const handleMentionSelect = useCallback((mention: MentionSuggestion) => {
    console.log('🎯 CommentForm: Mention selected', mention);
    // Note: MentionInput handles text insertion automatically
    // Just track for form submission if needed
  }, []);

  const filteredMentions = mentionSuggestions.filter(username => 
    username.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5);
  
  // Removed preview functionality to match PostCreator simplicity

  return (
    <div className={cn('space-y-3', className)}>
      {parentId && (
        <div className="text-xs text-gray-600 border-l-2 border-blue-200 pl-3 py-1 bg-blue-50 rounded">
          <div className="flex items-center space-x-1">
            <Reply className="w-3 h-3" />
            <span>Replying with technical analysis...</span>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          {/* CRITICAL FIX: Remove formatting toolbar to prevent dropdown interference */}
          
          {/* CRITICAL MESH FIX: Match PostCreator layout pattern exactly */}
          <div className="relative">
            {/* CRITICAL FIX: Direct MentionInput usage like PostCreator - NO WRAPPER DIVS */}
            <MentionInput
              key={`comment-mention-${postId}-${parentId || 'root'}`}
              ref={mentionInputRef}
              value={content}
              onChange={(newValue) => {
                console.log('🔥 COMMENT FORM: MentionInput onChange called', { newValue: newValue.substring(Math.max(0, newValue.length - 10)), hasAt: newValue.includes('@') });
                setContent(newValue);
              }}
              onMentionSelect={handleMentionSelect}
              placeholder={placeholder}
              className={cn(
                'w-full p-3 text-sm border border-gray-300 rounded-lg resize-none',
                'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'placeholder-gray-400',
                error && 'border-red-300'
              )}
              rows={parentId ? 2 : 3}
              maxLength={maxLength}
              autoFocus={autoFocus}
              mentionContext="post"
            />
          </div>
          
          {/* CRITICAL FIX: Character counter below input to avoid dropdown interference */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>Supports markdown formatting and @mentions</span>
            <span className={cn(
              content.length > maxLength * 0.9 ? 'text-red-500' : 'text-gray-400'
            )}>
              {content.length}/{maxLength}
            </span>
          </div>
        </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <Bot className="w-4 h-4 text-blue-500" />
            <span>Agent Analysis</span>
          </div>
          <span className="text-gray-400">•</span>
          <span>by {currentUser}</span>
        </div>
        
        <div className="flex space-x-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
              isSubmitting || !content.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            <Send className="w-4 h-4" />
            <span>
              {isSubmitting 
                ? 'Analyzing...' 
                : parentId 
                  ? 'Submit Analysis' 
                  : 'Post Analysis'
              }
            </span>
          </button>
        </div>
      </div>
      </form>
    </div>
  );
};