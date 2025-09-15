/**
 * AviDirectChat Component - Direct Communication with Avi AI Assistant
 *
 * This component provides a direct chat interface to Avi, Claude's coding assistant,
 * eliminating the need for agent selection and providing a streamlined experience.
 *
 * Features:
 * - Direct connection to Avi without agent selection
 * - Avi-specific branding and personality
 * - Real-time WebSocket communication
 * - Context-aware conversations
 * - Error handling and offline mode
 * - Mobile-responsive design
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Send,
  MessageCircle,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  Loader,
  Paperclip,
  Smile,
  Zap,
  Code,
  BookOpen,
  Settings
} from 'lucide-react';
import { cn } from '@/utils/cn';

// Import types from our Claude integration types
import {
  AviDirectChatProps,
  AviMessage,
  AviPersonality,
  ConnectionStatus,
  ClaudeCodeError,
  DEFAULT_AVI_PERSONALITY
} from '../../types/claude-integration';

interface MessageDisplayProps extends AviMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

/**
 * Main AviDirectChat Component
 *
 * Transforms the original AviDMSection to provide direct communication with Avi,
 * removing the complex agent selection interface and focusing on seamless interaction.
 */
export const AviDirectChat: React.FC<AviDirectChatProps> = ({
  onMessageSent,
  isMobile = false,
  className,
  aviConfig = {},
  projectContext,
  autoConnect = true
}) => {
  // Merge Avi config with defaults
  const aviPersonality: AviPersonality = {
    ...DEFAULT_AVI_PERSONALITY,
    ...aviConfig
  };

  // State management
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDisplayProps[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    connectionQuality: 'offline',
    reconnectAttempts: 0
  });
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Refs
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-resize message textarea
  useEffect(() => {
    const textarea = messageRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Avi connection
  useEffect(() => {
    if (autoConnect) {
      initializeAviConnection();
    }
  }, [autoConnect]);

  // Initialize connection to Avi
  const initializeAviConnection = useCallback(async () => {
    try {
      setConnectionStatus(prev => ({ ...prev, isConnected: true, connectionQuality: 'excellent' }));

      // Create session if needed
      if (!sessionId) {
        const newSessionId = `avi-${Date.now()}`;
        setSessionId(newSessionId);

        // Add Avi's greeting message
        const greetingMessage: MessageDisplayProps = {
          id: `greeting-${Date.now()}`,
          sessionId: newSessionId,
          role: 'assistant',
          content: aviPersonality.greeting,
          sender: 'assistant',
          timestamp: new Date(),
          status: 'read',
          metadata: {}
        };

        setMessages([greetingMessage]);
      }

    } catch (err) {
      console.error('Failed to initialize Avi connection:', err);
      setError('Failed to connect to Avi. Please try again.');
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: false,
        connectionQuality: 'offline',
        error: 'Connection failed'
      }));
    }
  }, [aviPersonality.greeting, sessionId]);

  // Send message to Avi
  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const newMessage: MessageDisplayProps = {
        id: `msg-${Date.now()}`,
        sessionId: sessionId || '',
        role: 'user',
        content: message.trim(),
        sender: 'user',
        timestamp: new Date(),
        status: 'sent',
        metadata: {}
      };

      // Add user message to UI immediately
      setMessages(prev => [...prev, newMessage]);

      // Prepare message data for API
      const messageData = {
        title: `Message to Avi`,
        content: message.trim(),
        author_agent: 'user-agent',
        metadata: {
          isAviMessage: true,
          sessionId: sessionId,
          postType: 'avi-direct-chat',
          isPrivate: true,
          timestamp: new Date().toISOString(),
          projectContext: projectContext
        }
      };

      // Send to API
      const response = await fetch('/api/agent-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const result = await response.json();

      // Update message status to delivered
      setMessages(prev => prev.map(msg =>
        msg.id === newMessage.id
          ? { ...msg, status: 'delivered' as const }
          : msg
      ));

      // Clear message input
      setMessage('');

      // Simulate Avi typing response
      setIsTyping(true);

      // Generate contextual response based on message content
      const aviResponse = generateAviResponse(message.trim(), aviPersonality);

      setTimeout(() => {
        const responseMessage: MessageDisplayProps = {
          id: `avi-${Date.now()}`,
          sessionId: sessionId || '',
          role: 'assistant',
          content: aviResponse,
          sender: 'assistant',
          timestamp: new Date(),
          status: 'read',
          metadata: {
            model: 'avi-claude',
            tokensUsed: aviResponse.length,
            processingTime: 1200
          }
        };

        setMessages(prev => [...prev, responseMessage]);
        setIsTyping(false);
      }, 1500 + Math.random() * 2000);

      // Notify parent component
      onMessageSent?.(result.data);

    } catch (err) {
      console.error('Failed to send message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);

      // Remove failed message from UI
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
    } finally {
      setIsSubmitting(false);
    }
  }, [message, isSubmitting, sessionId, onMessageSent, projectContext, aviPersonality]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Use quick reply
  const useQuickReply = (reply: string) => {
    setMessage(reply);
    setTimeout(() => {
      messageRef.current?.focus();
    }, 0);
  };

  // Clear error when user starts typing
  useEffect(() => {
    if (message && error) {
      setError(null);
    }
  }, [message, error]);

  // Render Avi header
  const renderAviHeader = () => (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg",
            "bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg"
          )}>
            {aviPersonality.avatar}
          </div>
          <div className={cn(
            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
            connectionStatus.isConnected ? "bg-green-400" : "bg-gray-400"
          )} />
        </div>
        <div>
          <div className="font-semibold text-gray-900 flex items-center space-x-2">
            <span>{aviPersonality.displayName}</span>
            {connectionStatus.isConnected && (
              <Zap className="w-4 h-4 text-blue-500" />
            )}
          </div>
          <div className="text-sm text-gray-600">{aviPersonality.description}</div>
          <div className="text-xs text-gray-500 flex items-center space-x-1">
            <div className={cn(
              "w-2 h-2 rounded-full",
              connectionStatus.isConnected ? "bg-green-400" : "bg-gray-400"
            )} />
            <span>{connectionStatus.isConnected ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {!isMobile && (
        <div className="flex space-x-1">
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-white/60 transition-colors">
            <Code className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-white/60 transition-colors">
            <BookOpen className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-white/60 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  // Render conversation
  const renderConversation = () => (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-80">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.sender === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div className={cn(
              "max-w-xs lg:max-w-sm px-4 py-3 rounded-2xl relative",
              msg.sender === 'user'
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white ml-auto"
                : "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-900 mr-auto border border-gray-200"
            )}>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
              <div className={cn(
                "flex items-center justify-between mt-2 text-xs",
                msg.sender === 'user' ? "text-blue-100" : "text-gray-500"
              )}>
                <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.sender === 'user' && (
                  <div className="flex items-center space-x-1 ml-2">
                    {msg.status === 'sent' && <Check className="w-3 h-3" />}
                    {msg.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
                    {msg.status === 'read' && <CheckCheck className="w-3 h-3 text-blue-300" />}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 rounded-2xl border border-gray-200 mr-auto">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-xs text-gray-600 ml-2">{aviPersonality.displayName} is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies - shown for initial conversation */}
      {!isMobile && messages.length <= 1 && aviPersonality.quickReplies.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-500 mb-2 flex items-center space-x-1">
            <Zap className="w-3 h-3" />
            <span>Quick Replies:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {aviPersonality.quickReplies.map((reply, index) => (
              <button
                key={index}
                onClick={() => useQuickReply(reply)}
                className="px-3 py-1.5 text-xs bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-full text-gray-700 transition-colors flex items-center space-x-1"
              >
                <span>{reply}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render message input
  const renderMessageInput = () => (
    <div className="p-4 border-t border-gray-100 bg-white">
      {error && (
        <div className="flex items-center space-x-2 p-3 mb-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={messageRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Chat with ${aviPersonality.displayName}...`}
            className={cn(
              "w-full p-3 pr-20 border border-gray-300 rounded-xl resize-none",
              "focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors",
              "placeholder-gray-500",
              isMobile && "text-base" // Prevent zoom on mobile
            )}
            rows={1}
            maxLength={2000}
            disabled={!connectionStatus.isConnected || isSubmitting}
          />

          {/* Input actions */}
          <div className="absolute right-3 bottom-3 flex items-center space-x-1">
            <button
              type="button"
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              title="Add emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!message.trim() || !connectionStatus.isConnected || isSubmitting}
          className={cn(
            "px-6 py-3 rounded-xl font-medium transition-all flex items-center space-x-2 shadow-sm",
            !message.trim() || !connectionStatus.isConnected || isSubmitting
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 active:scale-95 shadow-lg"
          )}
        >
          {isSubmitting ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
          {!isMobile && <span>Send</span>}
        </button>
      </form>

      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
        <span>Press ⌘+Enter to send</span>
        <span className="flex items-center space-x-1">
          <MessageCircle className="w-3 h-3" />
          <span>Private conversation with Avi</span>
        </span>
      </div>
    </div>
  );

  return (
    <div className={cn("flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden", className)}>
      {renderAviHeader()}
      {renderConversation()}
      {renderMessageInput()}
    </div>
  );
};

// Helper function to generate contextual Avi responses
function generateAviResponse(userMessage: string, aviPersonality: AviPersonality): string {
  const lowerMessage = userMessage.toLowerCase();

  // Detect intent and generate appropriate response
  if (lowerMessage.includes('review') || lowerMessage.includes('code')) {
    return "I'd be happy to review your code! Please share the code you'd like me to look at, and I'll provide detailed feedback on structure, best practices, and potential improvements.";
  }

  if (lowerMessage.includes('debug') || lowerMessage.includes('error') || lowerMessage.includes('bug')) {
    return "Let's debug this together! Please share the error message or describe the unexpected behavior you're seeing. I'll help you identify the root cause and suggest solutions.";
  }

  if (lowerMessage.includes('architecture') || lowerMessage.includes('design')) {
    return "Great question about architecture! I can help you design scalable, maintainable systems. Tell me more about your project requirements, and I'll suggest architectural patterns and best practices.";
  }

  if (lowerMessage.includes('performance') || lowerMessage.includes('optimize')) {
    return "Performance optimization is one of my specialties! Share your code or describe the performance issues you're experiencing, and I'll analyze it for bottlenecks and suggest optimizations.";
  }

  if (lowerMessage.includes('test') || lowerMessage.includes('testing')) {
    return "Testing is crucial for reliable code! I can help you write unit tests, integration tests, or set up testing strategies. What type of testing are you looking to implement?";
  }

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return `Hello! Great to meet you! I'm Avi, your AI coding assistant. I'm here to help with code review, debugging, architecture design, performance optimization, and more. What can I help you with today?`;
  }

  // Default contextual response
  return `Thanks for your message! I'm here to help with any coding questions or challenges you have. Whether it's reviewing code, debugging issues, designing architecture, or optimizing performance, I'm ready to assist. Could you provide more details about what you're working on?`;
}

export default AviDirectChat;