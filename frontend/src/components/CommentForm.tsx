import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, MessageCircle, AtSign, Hash, Bold, Italic, Code, Link2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useWebSocket } from '@/hooks/useWebSocket';
import { extractMentions } from '@/utils/commentUtils';

interface CommentFormProps {
  postId: string;
  parentId?: string;
  currentUser?: string;
  onCommentAdded?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  maxLength?: number;
  showFormatting?: boolean;
  mentionSuggestions?: string[];
  onCancel?: () => void;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  parentId,
  currentUser = 'current-user',
  onCommentAdded,
  placeholder = 'Write a comment...',
  className,
  autoFocus = false,
  maxLength = 2000,
  showFormatting = true,
  mentionSuggestions = [],
  onCancel
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [preview, setPreview] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);

  const { socket, isConnected } = useWebSocket();

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

    try {
      const response = await fetch(`/api/v1/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          authorAgent: currentUser, // Using AgentLink API format
          parentId: parentId || null,
          metadata: {
            mentionedUsers: extractMentions(content),
            isAgentResponse: false
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to post comment');
      }

      const result = await response.json();
      
      // Emit WebSocket event for real-time updates
      if (socket && isConnected && result.data) {
        socket.emit('comment:create', {
          postId,
          content: content.trim(),
          commentId: result.data.id
        });
      }

      setContent('');
      onCommentAdded?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursor = e.target.selectionStart;
    
    setContent(newContent);
    setCursorPosition(cursor);
    setError('');
    
    // Check for mentions (@username)
    const textBeforeCursor = newContent.substring(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  }, []);
  
  const insertMention = useCallback((username: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const beforeCursor = content.substring(0, cursorPosition);
    const afterCursor = content.substring(cursorPosition);
    
    // Find the @ symbol to replace
    const mentionStart = beforeCursor.lastIndexOf('@');
    const newContent = 
      content.substring(0, mentionStart) + 
      `@${username} ` + 
      afterCursor;
    
    setContent(newContent);
    setShowMentions(false);
    setMentionQuery('');
    
    // Focus and position cursor after the mention
    setTimeout(() => {
      const newCursorPosition = mentionStart + username.length + 2;
      textarea.focus();
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      setCursorPosition(newCursorPosition);
    }, 0);
  }, [content, cursorPosition]);
  
  const insertFormatting = useCallback((format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
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
          ? `\`\`\`
${selectedText}
\`\`\``
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
    
    // Focus and select the replacement
    setTimeout(() => {
      textarea.focus();
      const newStart = start + (format === 'link' ? replacement.length - 4 : replacement.length);
      textarea.setSelectionRange(newStart, newStart);
    }, 0);
  }, [content]);
  
  const filteredMentions = mentionSuggestions.filter(username => 
    username.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5);
  
  const renderPreview = useCallback(() => {
    // Simple markdown-like preview rendering
    let html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/@(\w+)/g, '<span class="text-blue-600 font-medium">@$1</span>')
      .replace(/\n/g, '<br>');
    
    return { __html: html };
  }, [content]);

  return (
    <div className={cn('space-y-3', className)}>
      {parentId && (
        <div className="text-xs text-gray-500 border-l-2 border-blue-200 pl-2">
          Replying to comment...
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          {/* Formatting toolbar */}
          {showFormatting && (
            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-t-lg border-b">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => insertFormatting('bold')}
                  className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('italic')}
                  className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('code')}
                  className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                  title="Code"
                >
                  <Code className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('link')}
                  className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                  title="Link"
                >
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="h-4 w-px bg-gray-300" />
              
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPreview(!preview)}
                  className={cn(
                    'px-2 py-1 text-xs rounded transition-colors',
                    preview 
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {preview ? 'Edit' : 'Preview'}
                </button>
              </div>
            </div>
          )}
          
          <div className="relative">
            {preview ? (
              <div 
                className="min-h-[80px] p-3 text-sm border rounded-b-lg bg-gray-50 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={renderPreview()}
              />
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleContentChange}
                  placeholder={placeholder}
                  autoFocus={autoFocus}
                  className={cn(
                    'w-full p-3 text-sm border rounded-b-lg resize-none',
                    'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    'placeholder-gray-400',
                    error ? 'border-red-300' : showFormatting ? 'border-t-0 border-gray-300' : 'border-gray-300 rounded-lg'
                  )}
                  rows={parentId ? 2 : 3}
                  maxLength={maxLength}
                  disabled={isSubmitting}
                />
                
                {/* Mention suggestions */}
                {showMentions && filteredMentions.length > 0 && (
                  <div 
                    ref={mentionsRef}
                    className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-y-auto"
                    style={{ top: '100%' }}
                  >
                    {filteredMentions.map((username) => (
                      <button
                        key={username}
                        type="button"
                        onClick={() => insertMention(username)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <AtSign className="w-3 h-3" />
                        <span>{username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            
            {!preview && (
              <div className="absolute bottom-2 right-2 flex items-center space-x-2">
                <span className={cn(
                  'text-xs px-2 py-1 rounded bg-white/80',
                  content.length > maxLength * 0.9 ? 'text-red-500 bg-red-50' : 'text-gray-400'
                )}>
                  {content.length}/{maxLength}
                </span>
              </div>
            )}
          </div>
        </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <MessageCircle className="w-4 h-4" />
          <span>Posting as {currentUser}</span>
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
            disabled={isSubmitting || !content.trim() || preview}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
              isSubmitting || !content.trim() || preview
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            <Send className="w-4 h-4" />
            <span>
              {isSubmitting 
                ? 'Posting...' 
                : parentId 
                  ? 'Post Reply' 
                  : 'Post Comment'
              }
            </span>
          </button>
        </div>
      </div>
      </form>
    </div>
  );
};