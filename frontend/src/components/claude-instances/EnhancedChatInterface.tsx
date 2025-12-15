/**
 * Enhanced Chat Interface Component
 * Comprehensive chat interface for Claude instances with image support
 * Integrates with WebSocket system and follows existing UI patterns
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Paperclip, RotateCcw, Trash2, Copy, Download, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  EnhancedChatInterfaceProps,
  ChatMessage,
  ImageAttachment
} from '../../types/claude-instances';
import { ImageUploadZone } from './ImageUploadZone';
import { InstanceStatusIndicator } from './InstanceStatusIndicator';
import { useImageUpload } from '../../hooks/useImageUpload';

interface MessageProps {
  message: ChatMessage;
  onCopy?: (content: string) => void;
}

const Message: React.FC<MessageProps> = ({ message, onCopy }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  const handleCopy = useCallback(() => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      navigator.clipboard.writeText(message.content);
    }
  }, [message.content, onCopy]);

  return (
    <div className={cn(
      'flex gap-3 p-4',
      isUser ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800',
      isSystem && 'bg-yellow-50 dark:bg-yellow-900/20'
    )}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
        isUser 
          ? 'bg-blue-500 text-white' 
          : isSystem 
          ? 'bg-yellow-500 text-white'
          : 'bg-purple-500 text-white'
      )}>
        {isUser ? 'U' : isSystem ? 'S' : 'C'}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {isUser ? 'You' : isSystem ? 'System' : 'Claude'}
            </span>
            <span className="text-xs text-gray-500">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {message.metadata?.tokensUsed && (
              <span className="text-xs text-gray-400">
                {message.metadata.tokensUsed} tokens
              </span>
            )}
            <button
              onClick={handleCopy}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Copy message"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Images */}
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {message.images.map((image) => (
              <div key={image.id} className="relative">
                <img
                  src={image.dataUrl || image.url}
                  alt={image.name}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                />
                {image.error && (
                  <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center rounded-lg">
                    <span className="text-white text-xs">Error</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="prose prose-sm dark:prose-dark max-w-none">
          {message.isStreaming && !message.streamingComplete ? (
            <div className="flex items-center">
              <span className="text-gray-700 dark:text-gray-300">{message.content}</span>
              <div className="ml-2 w-2 h-4 bg-gray-400 animate-pulse" />
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-sans">
              {message.content}
            </pre>
          )}
        </div>

        {/* Metadata */}
        {message.metadata && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
            {message.metadata.duration && (
              <span>Duration: {message.metadata.duration}ms</span>
            )}
            {message.metadata.model && (
              <span>Model: {message.metadata.model}</span>
            )}
            {message.metadata.exitCode !== undefined && (
              <span className={cn(
                'px-2 py-1 rounded',
                message.metadata.exitCode === 0 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              )}>
                Exit: {message.metadata.exitCode}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({
  instance,
  messages = [],
  isConnected,
  isLoading,
  onSendMessage,
  onClearMessages,
  enableImageUpload = true,
  className
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Image upload functionality
  const {
    images,
    isUploading,
    error: imageError,
    addImages,
    removeImage,
    clearImages
  } = useImageUpload({
    maxFiles: 5,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [inputMessage]);

  const handleSend = useCallback(() => {
    if (!inputMessage.trim() && images.length === 0) return;
    if (isLoading || !isConnected) return;

    onSendMessage(inputMessage.trim(), images.length > 0 ? images : undefined);
    setInputMessage('');
    clearImages();
    setShowImageUpload(false);
  }, [inputMessage, images, isLoading, isConnected, onSendMessage, clearImages]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      // Could add a toast notification here
      console.log('Message copied to clipboard');
    });
  }, []);

  const canSend = useMemo(() => {
    return !isLoading && isConnected && (inputMessage.trim() || images.length > 0);
  }, [isLoading, isConnected, inputMessage, images.length]);

  return (
    <div className={cn('flex flex-col h-full bg-gray-50 dark:bg-gray-900', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <InstanceStatusIndicator 
            instance={instance} 
            showDetails={false}
            size="md"
          />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {instance.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onClearMessages && (
            <button
              onClick={onClearMessages}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Clear messages"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-center max-w-md">
              Send a message to begin interacting with {instance.name}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                onCopy={handleCopyMessage}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3 p-4 bg-white dark:bg-gray-800">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-sm font-medium text-white">
                  C
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Upload Zone */}
      {showImageUpload && enableImageUpload && (
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <ImageUploadZone
            images={images}
            onAddImages={addImages}
            onRemoveImage={removeImage}
            maxFiles={5}
            disabled={isUploading}
            className="mb-4"
          />
          {imageError && (
            <div className="text-sm text-red-600 dark:text-red-400 mb-2">
              {imageError}
            </div>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end space-x-2">
          {enableImageUpload && (
            <button
              onClick={() => setShowImageUpload(!showImageUpload)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showImageUpload 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              )}
              title={showImageUpload ? 'Hide image upload' : 'Show image upload'}
            >
              {showImageUpload ? <EyeOff className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
            </button>
          )}

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !isConnected 
                  ? 'Not connected...' 
                  : isLoading 
                  ? 'Claude is thinking...'
                  : 'Type your message...'
              }
              disabled={!isConnected || isLoading}
              className={cn(
                'w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700',
                'border border-gray-300 dark:border-gray-600 rounded-lg',
                'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'resize-none overflow-hidden',
                'text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400'
              )}
              rows={1}
            />

            {images.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {images.map((image) => (
                  <div key={image.id} className="relative">
                    <img
                      src={image.dataUrl || image.url}
                      alt={image.name}
                      className="w-8 h-8 object-cover rounded border"
                    />
                    <button
                      onClick={() => removeImage(image.id)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              'p-3 rounded-lg transition-colors',
              canSend
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
            )}
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {!isConnected && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            Instance not connected. Check instance status and try again.
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedChatInterface;