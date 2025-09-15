/**
 * AviDirectChatSDK - Anthropic SDK Integration for Avi DM
 * SECURITY: Uses secure API endpoints to protect API keys in Docker deployment
 *
 * Phase 2: Streaming Integration with Native Image Support
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Send,
  Bot,
  MessageCircle,
  Loader,
  AlertCircle,
  Image as ImageIcon,
  X,
  Shield
} from 'lucide-react';
import { cn } from '@/utils/cn';
import StreamingTicker from '../StreamingTicker';

// Connection States for SDK integration
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

interface AviMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
  images?: string[];
}

interface AviDirectChatSDKProps {
  onMessageSent?: (message: any) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export const AviDirectChatSDK: React.FC<AviDirectChatSDKProps> = ({
  onMessageSent,
  onConnectionStateChange,
  onError,
  className
}) => {
  // Core State
  const [messages, setMessages] = useState<AviMessage[]>([]);
  const [message, setMessage] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  // Refs
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Connection state change callback
  useEffect(() => {
    onConnectionStateChange?.(connectionState);
  }, [connectionState, onConnectionStateChange]);

  /**
   * Convert images to base64 for API transmission
   */
  const convertImagesToBase64 = useCallback(async (files: File[]): Promise<string[]> => {
    const promises = files.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    return Promise.all(promises);
  }, []);

  /**
   * Send message to Avi via SDK API
   */
  const sendMessage = useCallback(async () => {
    if (!message.trim() && selectedImages.length === 0) return;

    const messageId = `msg-${Date.now()}`;
    const newMessage: AviMessage = {
      id: messageId,
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
      status: 'sending',
      images: selectedImages.length > 0 ? selectedImages.map(f => f.name) : undefined
    };

    // Add user message immediately
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    setSelectedImages([]);
    setIsTyping(true);
    setError(null);
    setConnectionState(ConnectionState.CONNECTING);

    try {
      // Convert images to base64 if present
      const imageData = selectedImages.length > 0
        ? await convertImagesToBase64(selectedImages)
        : [];

      // Prepare message with images
      const messageContent = imageData.length > 0
        ? {
            text: newMessage.content,
            images: imageData
          }
        : newMessage.content;

      // Call secure API endpoint
      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          options: {
            workingDirectory: '/workspaces/agent-feed/prod',
            allowedTools: ['Read', 'Write', 'Grep', 'Bash']
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Chat processing failed');
      }

      setConnectionState(ConnectionState.CONNECTED);

      // Update user message status
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, status: 'sent' }
          : msg
      ));

      // Add assistant responses
      if (result.responses && result.responses.length > 0) {
        result.responses.forEach((response: any, index: number) => {
          const assistantMessage: AviMessage = {
            id: `assistant-${Date.now()}-${index}`,
            role: 'assistant',
            content: response.content || 'No response received',
            timestamp: new Date(),
            status: 'sent'
          };

          setMessages(prev => [...prev, assistantMessage]);
        });
      }

      // Trigger callback
      onMessageSent?.(newMessage);

    } catch (err) {
      console.error('Message send error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

      setError(errorMessage);
      setConnectionState(ConnectionState.ERROR);

      // Update message status to error
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, status: 'error' }
          : msg
      ));

      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsTyping(false);
    }
  }, [message, selectedImages, convertImagesToBase64, onMessageSent, onError]);

  /**
   * Handle image selection
   */
  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length !== files.length) {
      setError('Only image files are allowed');
      return;
    }

    if (selectedImages.length + imageFiles.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    setSelectedImages(prev => [...prev, ...imageFiles]);
    setError(null);
  }, [selectedImages.length]);

  /**
   * Remove selected image
   */
  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Handle enter key
   */
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  /**
   * Get connection status display
   */
  const getConnectionStatus = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return { icon: Shield, color: 'text-green-500', text: 'Connected securely' };
      case ConnectionState.CONNECTING:
        return { icon: Loader, color: 'text-blue-500', text: 'Connecting...' };
      case ConnectionState.ERROR:
        return { icon: AlertCircle, color: 'text-red-500', text: 'Connection error' };
      default:
        return { icon: Bot, color: 'text-gray-500', text: 'Ready to chat' };
    }
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  return (
    <div className={cn('flex flex-col h-full bg-white', className)} data-testid="avi-chat-sdk">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Avi AI Assistant</h3>
            <div className="flex items-center space-x-2">
              <StatusIcon className={cn('w-4 h-4', status.color)} />
              <p className="text-sm text-gray-600">{status.text}</p>
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border">
          🔒 Claude Code SDK
        </div>
      </div>

      {/* Streaming Ticker - Real-time progress */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <StreamingTicker
          enabled={connectionState === ConnectionState.CONNECTED || isTyping}
          userId="avi-chat-user"
          className="text-sm"
          maxMessages={3}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && connectionState !== ConnectionState.CONNECTING && (
          <div className="text-center py-8" data-testid="avi-greeting">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Hello! I'm Avi, your AI assistant
            </h3>
            <p className="text-gray-600 mb-4">
              I'm powered by Anthropic's Claude SDK. I can help with development tasks, answer questions, and more!
            </p>
            <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg inline-block">
              🔒 Claude Code SDK | 🛠️ Tool Access | 📁 File System
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.images && msg.images.length > 0 && (
                <div className="mt-2 text-xs opacity-75">
                  📷 {msg.images.join(', ')}
                </div>
              )}
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs opacity-75">
                  {msg.timestamp.toLocaleTimeString()}
                </p>
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  msg.status === 'sent' ? 'bg-green-400' :
                  msg.status === 'sending' ? 'bg-yellow-400' :
                  'bg-red-400'
                )} />
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected Images */}
      {selectedImages.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {selectedImages.map((file, index) => (
              <div key={index} className="relative bg-white border rounded-lg p-2">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-600 truncate max-w-20">
                    {file.name}
                  </span>
                  <button
                    onClick={() => removeImage(index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="Add images"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <textarea
            ref={messageRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message to Avi..."
            className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={1}
            disabled={isTyping}
          />
          <button
            onClick={sendMessage}
            disabled={(!message.trim() && selectedImages.length === 0) || isTyping}
            className="flex-shrink-0 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTyping ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};