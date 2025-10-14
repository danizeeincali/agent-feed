import React, { useState, useEffect } from 'react';
import { Edit3, Zap, Bot } from 'lucide-react';
import { cn } from '../utils/cn';
import { PostCreator } from './PostCreator';
import { MentionInput, MentionSuggestion } from './MentionInput';
import AviTypingIndicator from './AviTypingIndicator';
import MarkdownRenderer from './markdown/MarkdownRenderer';
import { useActivityStream } from '../hooks/useActivityStream';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import SystemCommandWarningDialog from './SystemCommandWarningDialog';
import { detectRiskyContent } from '../utils/detectRiskyContent';
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
  const toast = useToast();

  const tabs = [
    { id: 'quick' as PostingTab, label: 'Quick Post', icon: Zap, description: 'Share your thoughts' },
    { id: 'avi' as PostingTab, label: 'Avi DM', icon: Bot, description: 'Chat with Avi' },
  ];

  return (
    <>
      <div className={cn('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm', className)}>
        {/* Tab Navigation */}
        <div className="border-b border-gray-100 dark:border-gray-800">
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
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
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
          {activeTab === 'quick' && (
            <QuickPostSection onPostCreated={onPostCreated} toast={toast} />
          )}

          {activeTab === 'avi' && (
            <AviChatSection
              onMessageSent={onPostCreated}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />
    </>
  );
};

// Simple Quick Post Component
const QuickPostSection: React.FC<{ onPostCreated?: (post: any) => void; toast: ReturnType<typeof useToast> }> = ({ onPostCreated, toast }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState<MentionSuggestion[]>([]);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [detectedRisk, setDetectedRisk] = useState<ReturnType<typeof detectRiskyContent> | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    // Check for risky content
    const title = content.trim().slice(0, 50) + (content.length > 50 ? '...' : '');
    const riskCheck = detectRiskyContent(content, title);

    if (riskCheck.isRisky) {
      // Show warning dialog
      setDetectedRisk(riskCheck);
      setShowWarningDialog(true);
      toast.showWarning('⚠️ System operation detected - please review');
      return;
    }

    // No risk detected, proceed with post
    await submitPost();
  };

  const submitPost = async () => {
    setIsSubmitting(true);
    try {
      const title = content.trim().slice(0, 50) + (content.length > 50 ? '...' : '');

      const response = await fetch('/api/v1/agent-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
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
        const errorData = await response.json();
        toast.showError(errorData.message || 'Failed to create post');
        return;
      }

      const result = await response.json();
      toast.showSuccess(`✓ Post created successfully!`);
      onPostCreated?.(result.data);
      setContent('');
    } catch (error) {
      console.error('Failed to create quick post:', error);
      toast.showError('Network error: Could not create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWarningCancel = () => {
    setShowWarningDialog(false);
    setDetectedRisk(null);
    toast.showInfo('Post cancelled');
  };

  const handleWarningContinue = () => {
    setShowWarningDialog(false);
    setDetectedRisk(null);
    // User confirmed, proceed with post
    submitPost();
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Quick Post</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <MentionInput
            value={content}
            onChange={setContent}
            onMentionSelect={handleMentionSelect}
            placeholder="What's on your mind? Write as much as you need!"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            rows={6}
            maxLength={10000}
            mentionContext="quick-post"
          />
          {content.length >= 9500 && (
            <div className={cn(
              "text-xs mt-1 font-medium transition-colors",
              content.length >= 9900 ? "text-red-600 dark:text-red-400" :
              content.length >= 9700 ? "text-orange-600 dark:text-orange-400" :
              "text-gray-600 dark:text-gray-400"
            )}>
              {content.length.toLocaleString()}/10,000 characters
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            content.trim() && !isSubmitting
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          )}
        >
          {isSubmitting ? 'Posting...' : 'Quick Post'}
        </button>
      </form>

      {/* Warning Dialog */}
      <SystemCommandWarningDialog
        isOpen={showWarningDialog}
        detectedPattern={detectedRisk?.pattern || null}
        description={detectedRisk?.description || null}
        reason={detectedRisk?.reason || null}
        onCancel={handleWarningCancel}
        onContinue={handleWarningContinue}
      />
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

  // Subscribe to activity stream when submitting
  const { currentActivity, connectionStatus } = useActivityStream(isSubmitting);

  // Update typing indicator when activity changes
  useEffect(() => {
    if (isSubmitting && currentActivity) {
      setChatHistory(prev => {
        const hasTypingIndicator = prev.some(msg => msg.sender === 'typing');
        if (!hasTypingIndicator) return prev;

        return prev.map(msg =>
          msg.sender === 'typing'
            ? {
                ...msg,
                content: (
                  <AviTypingIndicator
                    isVisible={true}
                    inline={true}
                    activityText={currentActivity}
                  />
                ),
              }
            : msg
        );
      });
    }
  }, [currentActivity, isSubmitting]);

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

    // SPARC UX FIX: Add typing indicator to chat history with activity text
    const typingIndicator = {
      id: 'typing-indicator',
      content: (
        <AviTypingIndicator
          isVisible={true}
          inline={true}
          activityText={currentActivity || undefined}
        />
      ),
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Chat with Λvi</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Direct message with your Chief of Staff</p>
      </div>

      {/* Chat History */}
      <div className="h-64 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
        {chatHistory.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <Bot className="w-8 h-8 mx-auto mb-2" />
            <p>Λvi is ready to assist. What can I help you with?</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chatHistory.map((msg) => (
              <div key={msg.id} className={cn(
                'p-3 rounded-lg',
                msg.sender === 'user'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 ml-auto max-w-xs'
                  : msg.sender === 'typing'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 max-w-full'
                  : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 max-w-full'
              )}>
                {/* SPARC MARKDOWN FIX: Render markdown for Avi responses */}
                {msg.sender === 'typing' ? (
                  <div className="text-sm">{msg.content}</div>
                ) : msg.sender === 'avi' ? (
                  <MarkdownRenderer
                    content={typeof msg.content === 'string' ? msg.content : String(msg.content)}
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
                {msg.sender !== 'typing' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={!message.trim() || isSubmitting || isLoading}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              message.trim() && !isSubmitting && !isLoading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </form>
    </div>
  );
};

export default EnhancedPostingInterface;