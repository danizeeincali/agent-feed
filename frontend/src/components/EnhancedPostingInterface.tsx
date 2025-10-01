import React, { useState } from 'react';
import { Edit3, Zap, Bot } from 'lucide-react';
import { cn } from '../utils/cn';
import { PostCreator } from './PostCreator';
import { MentionInput, MentionSuggestion } from './MentionInput';
import AviTypingIndicator from './AviTypingIndicator';
// Removed AviDirectChatSDK import - using built-in Avi chat component

type PostingTab = 'post' | 'quick' | 'avi';

interface EnhancedPostingInterfaceProps {
  className?: string;
  onPostCreated?: (post: any) => void;
  isLoading?: boolean; // Add optional isLoading prop to prevent undefined errors
}

export const EnhancedPostingInterface: React.FC<EnhancedPostingInterfaceProps> = ({
  className,
  onPostCreated,
  isLoading = false // Default to false to prevent undefined errors
}) => {
  const [activeTab, setActiveTab] = useState<PostingTab>('quick');

  const tabs = [
    { id: 'quick' as PostingTab, label: 'Quick Post', icon: Zap, description: 'One-line posting' },
    { id: 'post' as PostingTab, label: 'Post', icon: Edit3, description: 'Full post creator' },
    { id: 'avi' as PostingTab, label: 'Avi DM', icon: Bot, description: 'Chat with Avi' },
  ];

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-100">
        <nav className="flex space-x-8 px-4" aria-label="Posting tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
                aria-selected={isActive}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'post' && (
          <PostCreator
            onPostCreated={onPostCreated}
            className="border-0 shadow-none"
          />
        )}

        {activeTab === 'quick' && (
          <QuickPostSection onPostCreated={onPostCreated} />
        )}

        {activeTab === 'avi' && (
          <AviChatSection
            onMessageSent={onPostCreated}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

// Simple Quick Post Component
const QuickPostSection: React.FC<{ onPostCreated?: (post: any) => void }> = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState<MentionSuggestion[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/agent-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: content.trim().slice(0, 50) + (content.length > 50 ? '...' : ''),
          content: content.trim(),
          author_agent: 'user-agent',
          metadata: {
            businessImpact: 5,
            tags: [],
            isAgentResponse: false,
            postType: 'quick',
            wordCount: content.trim().split(/\s+/).length,
            readingTime: 1
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const result = await response.json();
      onPostCreated?.(result.data);
      setContent('');
    } catch (error) {
      console.error('Failed to create quick post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMentionSelect = (mention: MentionSuggestion) => {
    setSelectedMentions(prev => {
      if (!prev.find(m => m.id === mention.id)) {
        return [...prev, mention];
      }
      return prev;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Post</h3>
        <p className="text-sm text-gray-600">Share a quick thought or update</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <MentionInput
            value={content}
            onChange={setContent}
            onMentionSelect={handleMentionSelect}
            placeholder="What's on your mind? (One line works great!)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={500}
            mentionContext="quick-post"
          />
          <div className="text-xs text-gray-500 mt-1">
            {content.length}/500 characters
          </div>
        </div>

        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            content.trim() && !isSubmitting
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          )}
        >
          {isSubmitting ? 'Posting...' : 'Quick Post'}
        </button>
      </form>
    </div>
  );
};

// Simple Avi Chat Component
const AviChatSection: React.FC<{
  onMessageSent?: (message: any) => void;
  isLoading?: boolean;
}> = ({ onMessageSent, isLoading = false }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{
    id: string;
    content: string | React.ReactNode;
    sender: 'user' | 'avi' | 'typing';
    timestamp: Date;
  }>>([]);

  const callAviClaudeCode = async (userMessage: string): Promise<string> => {
    // SPARC FIX: Add frontend timeout (90s) before Vite proxy timeout (120s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds

    try {
      const systemContext = `You are Λvi, the production Claude instance operating as Chief of Staff. Your complete operating instructions and personality are defined in /workspaces/agent-feed/prod/CLAUDE.md. Read that file using your Read tool to understand your role and boundaries.`;

      const fullPrompt = `${systemContext}\n\nUser message: ${userMessage}`;

      console.log('🔍 DEBUG: Fetching from /api/claude-code/streaming-chat');
      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fullPrompt,
          options: {
            cwd: '/workspaces/agent-feed/prod'
          }
        }),
        signal: controller.signal // SPARC FIX: Enable abort on timeout
      });

      clearTimeout(timeoutId); // SPARC FIX: Clear timeout on success
      console.log('🔍 DEBUG: Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🔍 DEBUG: Parsed JSON data:', data);

      // Extract message from various response formats
      if (typeof data === 'string') return data;
      if (data.message) return data.message;
      if (data.responses?.[0]?.content) return data.responses[0].content;
      if (data.content) {
        if (typeof data.content === 'string') return data.content;
        if (Array.isArray(data.content)) {
          const textBlocks = data.content
            .filter((block: any) => block.type === 'text' || block.text)
            .map((block: any) => block.text)
            .filter(Boolean);
          if (textBlocks.length > 0) return textBlocks.join('\n');
        }
      }

      return 'No response received from Λvi';
    } catch (error) {
      clearTimeout(timeoutId); // SPARC FIX: Clear timeout on error

      // SPARC FIX: Better error messages
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - Λvi is taking longer than expected. Please try a simpler question or try again later.');
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Network error - Please check your connection and try again.');
        }
      }

      console.error('Avi Claude Code API error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    const userMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      sender: 'user' as const,
      timestamp: new Date(),
    };

    // SPARC UX FIX: Add typing indicator to chat history
    const typingIndicator = {
      id: 'typing-indicator',
      content: <AviTypingIndicator isVisible={true} inline={true} />,
      sender: 'typing' as const,
      timestamp: new Date(),
    };

    setChatHistory(prev => [...prev, userMessage, typingIndicator]);
    setIsSubmitting(true);
    setMessage('');

    try {
      // Call real Claude Code API
      console.log('🔍 DEBUG: Calling Avi Claude Code with message:', userMessage.content);
      const aviResponseContent = await callAviClaudeCode(userMessage.content);
      console.log('🔍 DEBUG: Received response:', aviResponseContent);

      const aviResponse = {
        id: (Date.now() + 1).toString(),
        content: aviResponseContent,
        sender: 'avi' as const,
        timestamp: new Date(),
      };

      console.log('🔍 DEBUG: Replacing typing indicator with response');
      // SPARC UX FIX: Remove typing indicator and add real response atomically
      setChatHistory(prev => {
        const withoutTyping = prev.filter(msg => msg.sender !== 'typing');
        return [...withoutTyping, aviResponse];
      });
      onMessageSent?.(userMessage);
    } catch (error) {
      console.error('❌ ERROR: Failed to get Avi response:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorResponse = {
        id: (Date.now() + 1).toString(),
        content: `I encountered an error: ${errorMessage}. Please try again.`,
        sender: 'avi' as const,
        timestamp: new Date(),
      };

      // SPARC UX FIX: Remove typing indicator on error too
      setChatHistory(prev => {
        const withoutTyping = prev.filter(msg => msg.sender !== 'typing');
        return [...withoutTyping, errorResponse];
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chat with Λvi</h3>
        <p className="text-sm text-gray-600">Direct message with your Chief of Staff</p>
      </div>

      {/* Chat History */}
      <div className="h-64 border border-gray-200 rounded-lg p-4 overflow-y-auto bg-gray-50">
        {chatHistory.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-8 h-8 mx-auto mb-2" />
            <p>Λvi is ready to assist. What can I help you with?</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chatHistory.map((msg) => (
              <div key={msg.id} className={cn(
                'p-3 rounded-lg max-w-xs',
                msg.sender === 'user'
                  ? 'bg-blue-100 text-blue-900 ml-auto'
                  : msg.sender === 'typing'
                  ? 'bg-white text-gray-900 border border-gray-200'
                  : 'bg-white text-gray-900'
              )}>
                {/* SPARC UX FIX: Render typing indicator inline or regular text */}
                {msg.sender === 'typing' ? (
                  <div className="text-sm">{msg.content}</div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
                {msg.sender !== 'typing' && (
                  <p className="text-xs text-gray-500 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message to Λvi..."
            disabled={isSubmitting || isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!message.trim() || isSubmitting || isLoading}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              message.trim() && !isSubmitting && !isLoading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </form>
    </div>
  );
};

export default EnhancedPostingInterface;