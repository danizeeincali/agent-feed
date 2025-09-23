/**
 * Avi Chat Interface Component
 * Specialized chat interface for Avi personality integration with Claude Code
 * Built on EnhancedChatInterface with Avi-specific behaviors and features
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  Paperclip,
  RotateCcw,
  Trash2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Brain,
  Code,
  GitBranch,
  Zap,
  Settings,
  TrendingUp
} from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  AviChatInterfaceProps,
  AviChatMessage,
  AviPersonalityTraits,
  AviContextData,
  AviAction
} from '../../types/avi-interface';
import { ImageAttachment } from '../../types/claude-instances';
import { ImageUploadZone } from './ImageUploadZone';
import { InstanceStatusIndicator } from './InstanceStatusIndicator';
import { useImageUpload } from '../../hooks/useImageUpload';

// Default Avi personality traits
const DEFAULT_AVI_TRAITS: AviPersonalityTraits = {
  conversationalStyle: 'adaptive',
  expertiseAreas: ['code-review', 'architecture', 'testing', 'performance'],
  responsePatterns: [
    {
      id: 'greeting',
      trigger: /^(hello|hi|hey)/i,
      responseType: 'greeting',
      template: 'Hello! I\'m Avi, your coding companion. How can I help you today?'
    },
    {
      id: 'code-analysis',
      trigger: /^(analyze|review|check)/i,
      responseType: 'analysis',
      template: 'I\'ll analyze that for you. Let me examine the code and context...'
    }
  ],
  contextualMemory: true,
  learningEnabled: true,
  personalityVersion: '1.0.0'
};

interface AviMessageProps {
  message: AviChatMessage;
  personalityTraits: AviPersonalityTraits;
  onCopy?: (content: string) => void;
  onActionTrigger?: (action: AviAction) => void;
}

const AviMessage: React.FC<AviMessageProps> = ({
  message,
  personalityTraits,
  onCopy,
  onActionTrigger
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAvi = message.role === 'avi' || (!isUser && !isSystem);

  const handleCopy = useCallback(() => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      navigator.clipboard.writeText(message.content);
    }
  }, [message.content, onCopy]);

  const handleActionClick = useCallback((action: AviAction) => {
    onActionTrigger?.(action);
  }, [onActionTrigger]);

  return (
    <div className={cn(
      'flex gap-3 p-4 group',
      isUser ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800',
      isSystem && 'bg-yellow-50 dark:bg-yellow-900/20',
      isAvi && 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10'
    )}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
        isUser
          ? 'bg-blue-500 text-white'
          : isSystem
          ? 'bg-yellow-500 text-white'
          : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
      )}>
        {isUser ? 'U' : isSystem ? 'S' : '🤖'}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {isUser ? 'You' : isSystem ? 'System' : 'Avi'}
            </span>
            {isAvi && message.aviMetadata?.personalityVersion && (
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 rounded-full">
                v{message.aviMetadata.personalityVersion}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {message.metadata?.tokensUsed && (
              <span className="text-xs text-gray-400">
                {message.metadata.tokensUsed} tokens
              </span>
            )}
            {message.aviMetadata?.confidenceScore && (
              <span className="text-xs text-purple-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {Math.round(message.aviMetadata.confidenceScore * 100)}%
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

        {/* Context Indicators */}
        {message.aviMetadata?.contextUsed && message.aviMetadata.contextUsed.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {message.aviMetadata.contextUsed.map(context => (
              <span
                key={context}
                className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-full flex items-center gap-1"
              >
                {context === 'git' && <GitBranch className="w-3 h-3" />}
                {context === 'code' && <Code className="w-3 h-3" />}
                {context === 'project' && <Brain className="w-3 h-3" />}
                {context}
              </span>
            ))}
          </div>
        )}

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

        {/* Code References */}
        {message.codeReferences && message.codeReferences.length > 0 && (
          <div className="mb-3 space-y-2">
            {message.codeReferences.map((ref, index) => (
              <div key={index} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {ref.filePath}
                  </span>
                  {ref.lineRange && (
                    <span className="text-xs text-gray-500">
                      Lines {ref.lineRange[0]}-{ref.lineRange[1]}
                    </span>
                  )}
                </div>
                <pre className="text-sm bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                  <code>{ref.snippet}</code>
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="prose prose-sm dark:prose-dark max-w-none">
          {message.isStreaming && !message.streamingComplete ? (
            <div className="flex items-center">
              <span className="text-gray-700 dark:text-gray-300">{message.content}</span>
              <div className="ml-2 w-2 h-4 bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse rounded" />
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-sans">
              {message.content}
            </pre>
          )}
        </div>

        {/* Suggested Actions */}
        {message.aviMetadata?.suggestedActions && message.aviMetadata.suggestedActions.length > 0 && (
          <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Suggested Actions
            </div>
            <div className="space-y-2">
              {message.aviMetadata.suggestedActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className="block w-full text-left p-2 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {action.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {action.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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

export const AviChatInterface: React.FC<AviChatInterfaceProps> = ({
  instance,
  messages = [],
  isConnected,
  isLoading,
  personalityTraits = DEFAULT_AVI_TRAITS,
  contextData,
  serviceCapabilities,
  onSendMessage,
  onClearMessages,
  onContextUpdate,
  onPersonalityAdjust,
  enableImageUpload = true,
  enableContextInjection = true,
  enablePersonalityLearning = true,
  className
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showPersonalityPanel, setShowPersonalityPanel] = useState(false);
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

  // Apply Avi personality patterns to input
  const processMessageWithPersonality = useCallback((message: string): string => {
    // Check for personality pattern matches
    for (const pattern of personalityTraits.responsePatterns) {
      if (typeof pattern.trigger === 'string') {
        if (message.toLowerCase().includes(pattern.trigger.toLowerCase())) {
          return message; // Let Avi handle the personality response
        }
      } else if (pattern.trigger.test(message)) {
        return message; // Pattern matched, let Avi respond accordingly
      }
    }
    return message;
  }, [personalityTraits]);

  const handleSend = useCallback(() => {
    if (!inputMessage.trim() && images.length === 0) return;
    if (isLoading || !isConnected) return;

    const processedMessage = processMessageWithPersonality(inputMessage.trim());
    const messageContext: AviContextData = {
      ...contextData,
      // Add real-time context if available
      projectPath: contextData?.projectPath || process.cwd?.() || undefined,
    };

    onSendMessage(processedMessage, images.length > 0 ? images : undefined, messageContext);
    setInputMessage('');
    clearImages();
    setShowImageUpload(false);
  }, [inputMessage, images, isLoading, isConnected, onSendMessage, clearImages, processMessageWithPersonality, contextData]);

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

  const handleActionTrigger = useCallback((action: AviAction) => {
    // Handle Avi suggested actions
    switch (action.type) {
      case 'code_review':
        setInputMessage(`Please review: ${action.description}`);
        break;
      case 'file_analysis':
        setInputMessage(`Analyze file: ${action.description}`);
        break;
      case 'git_operation':
        setInputMessage(`Git operation: ${action.command}`);
        break;
      case 'system_command':
        setInputMessage(`System: ${action.command}`);
        break;
      default:
        setInputMessage(action.description);
    }
    inputRef.current?.focus();
  }, []);

  const handlePersonalityAdjustment = useCallback((trait: keyof AviPersonalityTraits, value: any) => {
    const updatedTraits = {
      ...personalityTraits,
      [trait]: value
    };
    onPersonalityAdjust?.(updatedTraits);
  }, [personalityTraits, onPersonalityAdjust]);

  const canSend = useMemo(() => {
    return !isLoading && isConnected && (inputMessage.trim() || images.length > 0);
  }, [isLoading, isConnected, inputMessage, images.length]);

  const getPersonalityStatusColor = useCallback(() => {
    switch (personalityTraits.conversationalStyle) {
      case 'technical': return 'text-blue-500';
      case 'analytical': return 'text-green-500';
      case 'friendly': return 'text-yellow-500';
      case 'direct': return 'text-red-500';
      case 'adaptive': return 'text-purple-500';
      default: return 'text-gray-500';
    }
  }, [personalityTraits.conversationalStyle]);

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
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              Avi - {instance.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              {isConnected ? 'Connected' : 'Disconnected'}
              <span className={cn('text-xs', getPersonalityStatusColor())}>
                • {personalityTraits.conversationalStyle}
              </span>
              {enablePersonalityLearning && personalityTraits.learningEnabled && (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  Learning
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {enableContextInjection && (
            <button
              onClick={() => setShowContextPanel(!showContextPanel)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showContextPanel
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              )}
              title="Context Panel"
            >
              <GitBranch className="w-4 h-4" />
            </button>
          )}

          {enablePersonalityLearning && (
            <button
              onClick={() => setShowPersonalityPanel(!showPersonalityPanel)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showPersonalityPanel
                  ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              )}
              title="Personality Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

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

      {/* Context Panel */}
      {showContextPanel && contextData && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700">
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Context Information</div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            {contextData.projectPath && (
              <div>
                <span className="font-medium">Project:</span> {contextData.projectPath}
              </div>
            )}
            {contextData.currentBranch && (
              <div>
                <span className="font-medium">Branch:</span> {contextData.currentBranch}
              </div>
            )}
            {contextData.recentChanges && contextData.recentChanges.length > 0 && (
              <div className="col-span-2">
                <span className="font-medium">Recent Changes:</span>
                <ul className="mt-1 space-y-1">
                  {contextData.recentChanges.slice(0, 3).map((change, index) => (
                    <li key={index} className="text-blue-600 dark:text-blue-400">• {change}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Personality Panel */}
      {showPersonalityPanel && (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-700">
          <div className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-3">Personality Settings</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-purple-600 dark:text-purple-400">
                Conversational Style
              </label>
              <select
                value={personalityTraits.conversationalStyle}
                onChange={(e) => handlePersonalityAdjustment('conversationalStyle', e.target.value)}
                className="w-full mt-1 p-1 text-xs border border-purple-300 rounded"
              >
                <option value="adaptive">Adaptive</option>
                <option value="technical">Technical</option>
                <option value="analytical">Analytical</option>
                <option value="friendly">Friendly</option>
                <option value="direct">Direct</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={personalityTraits.contextualMemory}
                  onChange={(e) => handlePersonalityAdjustment('contextualMemory', e.target.checked)}
                />
                Contextual Memory
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={personalityTraits.learningEnabled}
                  onChange={(e) => handlePersonalityAdjustment('learningEnabled', e.target.checked)}
                />
                Learning Mode
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-lg font-medium mb-2">Hello! I'm Avi</h3>
            <p className="text-center max-w-md">
              Your intelligent coding companion. I can help with code review, architecture decisions,
              debugging, and more. I learn from our conversations to better assist you.
            </p>
            <div className="mt-4 text-sm text-purple-600 dark:text-purple-400">
              Personality: {personalityTraits.conversationalStyle} • v{personalityTraits.personalityVersion}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {messages.map((message) => (
              <AviMessage
                key={message.id}
                message={message}
                personalityTraits={personalityTraits}
                onCopy={handleCopyMessage}
                onActionTrigger={handleActionTrigger}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3 p-4 bg-white dark:bg-gray-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-medium text-white">
                  🤖
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                    <span className="text-sm text-purple-600 dark:text-purple-400 ml-2">
                      Avi is thinking...
                    </span>
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
                  ? 'Avi is thinking...'
                  : 'Chat with Avi... (I can help with code, review, debugging, and more!)'
              }
              disabled={!isConnected || isLoading}
              className={cn(
                'w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700',
                'border border-gray-300 dark:border-gray-600 rounded-lg',
                'focus:ring-2 focus:ring-purple-500 focus:border-purple-500',
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
              'p-3 rounded-lg transition-colors flex items-center gap-2',
              canSend
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
            )}
            title="Send message to Avi"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {!isConnected && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            Avi is not connected. Check instance status and try again.
          </div>
        )}

        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
          <span>Press Enter to send • Avi learns from our conversation</span>
          {serviceCapabilities && (
            <div className="flex items-center gap-2">
              {serviceCapabilities.streamingSupported && (
                <span className="text-green-500 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Streaming
                </span>
              )}
              {serviceCapabilities.contextInjection && (
                <span className="text-blue-500 flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  Context
                </span>
              )}
              {serviceCapabilities.gitIntegration && (
                <span className="text-purple-500 flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  Git
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AviChatInterface;