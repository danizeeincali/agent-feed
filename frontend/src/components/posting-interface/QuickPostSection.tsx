import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Send, 
  Hash, 
  AtSign, 
  Bold, 
  Italic, 
  Link as LinkIcon,
  Loader,
  Check,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { MentionInput, MentionInputRef, MentionSuggestion } from '../MentionInput';
import { MentionService } from '../../services/MentionService';

interface QuickPostSectionProps {
  onPostCreated?: (post: any) => void;
  isMobile?: boolean;
  className?: string;
}

const QUICK_TAGS = [
  'update', 'insight', 'question', 'announcement', 
  'progress', 'urgent', 'feedback', 'planning'
];

// No longer needed - using MentionService for unified agent management

export const QuickPostSection: React.FC<QuickPostSectionProps> = ({
  onPostCreated,
  isMobile = false,
  className
}) => {
  // Form state
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showAgentSuggestions, setShowAgentSuggestions] = useState(false);
  
  // Refs
  const contentRef = useRef<MentionInputRef>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const agentsRef = useRef<HTMLDivElement>(null);
  
  // Character limits
  const MAX_CONTENT_LENGTH = 500;
  const characterCount = content.length;
  const isOverLimit = characterCount > MAX_CONTENT_LENGTH;
  
  // Auto-focus on mount
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.focus();
    }
  }, []);
  
  // Auto-detect tags and mentions from content
  useEffect(() => {
    const hashtags = content.match(/#[\w]+/g);
    const mentions = MentionService.extractMentions(content);
    
    if (hashtags) {
      const tags = hashtags.map(tag => tag.slice(1).toLowerCase());
      setSelectedTags(prev => [
        ...prev.filter(tag => !tags.includes(tag)),
        ...tags.filter(tag => !prev.includes(tag))
      ]);
    }
    
    if (mentions.length > 0) {
      setSelectedAgents(prev => [
        ...prev.filter(agent => !mentions.includes(agent)),
        ...mentions.filter(agent => !prev.includes(agent))
      ]);
    }
  }, [content]);
  
  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!content.trim() || isOverLimit || isSubmitting) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Prepare quick post data
      const postData = {
        title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        content: content.trim(),
        author_agent: 'user-agent',
        metadata: {
          isQuickPost: true,
          postType: 'quick-update',
          tags: selectedTags,
          agentMentions: selectedAgents,
          businessImpact: 3, // Default for quick posts
          wordCount: content.trim().split(/\s+/).length,
          readingTime: 1 // Quick posts are always 1 min read
        }
      };
      
      // Submit to API
      const response = await fetch('/api/v1/agent-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create quick post');
      }
      
      const result = await response.json();
      
      // Success handling
      onPostCreated?.(result.data);
      
      // Show success state
      setShowSuccess(true);
      
      // Clear form after brief success display
      setTimeout(() => {
        setContent('');
        setSelectedTags([]);
        setSelectedAgents([]);
        setShowSuccess(false);
        
        // Refocus for next quick post
        if (contentRef.current) {
          contentRef.current.focus();
        }
      }, 1500);
      
    } catch (err) {
      console.error('Failed to create quick post:', err);
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  }, [content, selectedTags, selectedAgents, isOverLimit, isSubmitting, onPostCreated]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          handleSubmit();
          break;
        case 'b':
          e.preventDefault();
          insertFormatting('bold');
          break;
        case 'i':
          e.preventDefault();
          insertFormatting('italic');
          break;
        case 'k':
          e.preventDefault();
          insertFormatting('link');
          break;
      }
    }
  }, [handleSubmit]);
  
  // Handle mention selection - CRITICAL FIX: Follow demo pattern
  const handleMentionSelect = useCallback((mention: MentionSuggestion) => {
    // Track mentioned agents for form submission (avoid duplicates)
    setSelectedAgents(prev => {
      if (!prev.includes(mention.name)) {
        return [...prev, mention.name];
      }
      return prev;
    });
    // Note: MentionInput handles text insertion automatically
  }, []);
  
  // Toggle tag
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };
  
  // Toggle agent
  const toggleAgent = (agentName: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentName)
        ? prev.filter(a => a !== agentName) 
        : [...prev, agentName]
    );
  };
  
  // Render quick tag buttons
  const renderQuickTags = () => (
    <div className="flex flex-wrap gap-1">
      {QUICK_TAGS.map(tag => (
        <button
          key={tag}
          type="button"
          onClick={() => toggleTag(tag)}
          className={cn(
            "px-2 py-1 text-xs rounded-full transition-colors",
            selectedTags.includes(tag)
              ? "bg-blue-100 text-blue-700 border border-blue-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
  
  // Render agent buttons using MentionService
  const renderAgentButtons = () => {
    const quickMentions = MentionService.getQuickMentions('quick-post');
    
    return (
      <div className="flex flex-wrap gap-1">
        {quickMentions.map(agent => (
          <button
            key={agent.id}
            type="button"
            onClick={() => toggleAgent(agent.name)}
            className={cn(
              "px-2 py-1 text-xs rounded-full transition-colors flex items-center",
              selectedAgents.includes(agent.name)
                ? "bg-purple-100 text-purple-700 border border-purple-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
            title={agent.description}
          >
            <AtSign className="w-3 h-3 mr-1" />
            {agent.displayName}
          </button>
        ))}
      </div>
    );
  };
  
  return (
    <div className={cn("p-4", className)}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Content input with mention support */}
        <div className="relative">
          {/* CRITICAL FIX: Remove debug wrapper that breaks layout */}
          <MentionInput
            ref={contentRef}
            value={content}
            onChange={setContent}
            onMentionSelect={handleMentionSelect}
            placeholder="What's your quick update? Use #tags and @mentions for organization..."
            className={cn(
              "w-full p-3 border border-gray-300 rounded-lg resize-none",
              "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "placeholder:text-gray-500",
              isOverLimit && "border-red-300 focus:ring-red-500",
              isMobile && "text-base" // Prevent zoom on mobile
            )}
            rows={2}
            maxLength={MAX_CONTENT_LENGTH}
            mentionContext="quick-post"
          />
          
          {/* Character counter */}
          <div className={cn(
            "absolute bottom-2 right-2 text-xs",
            isOverLimit ? "text-red-500" : "text-gray-400"
          )}>
            {characterCount}/{MAX_CONTENT_LENGTH}
          </div>
        </div>
        
        {/* Note: Formatting toolbar removed as MentionInput handles this internally */}
        
        {/* Quick tags section */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Hash className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Quick Tags</label>
          </div>
          {renderQuickTags()}
        </div>
        
        {/* Quick agents section */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <AtSign className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Mention Agents</label>
          </div>
          {renderAgentButtons()}
        </div>
        
        {/* Error display */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}
        
        {/* Submit button */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Press ⌘+Enter to post quickly
          </div>
          
          <button
            type="submit"
            disabled={!content.trim() || isOverLimit || isSubmitting}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all",
              showSuccess 
                ? "bg-green-600 text-white"
                : !content.trim() || isOverLimit || isSubmitting
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            )}
          >
            {isSubmitting ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : showSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {isSubmitting ? 'Posting...' : showSuccess ? 'Posted!' : 'Quick Post'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};