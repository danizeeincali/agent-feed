import React, { useState } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface CommentFormProps {
  postId: string;
  currentUser?: string;
  onCommentAdded?: () => void;
  placeholder?: string;
  className?: string;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  currentUser = 'current-user',
  onCommentAdded,
  placeholder = 'Write a comment...',
  className
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Comment content is required');
      return;
    }

    if (content.length > 2000) {
      setError('Comment content must be under 2000 characters');
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
          author: currentUser,
          parentId: null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to post comment');
      }

      setContent('');
      onCommentAdded?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-3', className)}>
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setError('');
          }}
          placeholder={placeholder}
          className={cn(
            'w-full p-3 text-sm border rounded-lg resize-none',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'placeholder-gray-400',
            error ? 'border-red-300' : 'border-gray-300'
          )}
          rows={3}
          maxLength={2000}
          disabled={isSubmitting}
        />
        <div className="absolute bottom-2 right-2 flex items-center space-x-2">
          <span className={cn(
            'text-xs',
            content.length > 1800 ? 'text-red-500' : 'text-gray-400'
          )}>
            {content.length}/2000
          </span>
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
          <span>{isSubmitting ? 'Posting...' : 'Post Comment'}</span>
        </button>
      </div>
    </form>
  );
};