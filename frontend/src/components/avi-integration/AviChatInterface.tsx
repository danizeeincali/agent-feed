/**
 * AviChatInterface - Specialized Chat Interface for Avi DM Integration
 *
 * This component provides a tailored chat experience for Avi Direct Message
 * interactions with advanced features like personality modes, adaptive UI,
 * and comprehensive analytics.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  Image as ImageIcon,
  Mic,
  MicOff,
  Settings,
  Activity,
  Brain,
  Heart,
  Zap,
  User,
  Bot,
  MoreVertical,
  Volume2,
  VolumeX,
  Smile,
  Code,
  Link,
  FileText
} from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  AviInstance,
  AviMessage,
  AviMessageOptions,
  AviPersonalityMode,
  AviChatInterfaceProps,
  AviEmotionalTone
} from '../../types/avi-integration';
import { ImageAttachment } from '../../types/claude-instances';

// Personality mode configurations
const PERSONALITY_CONFIGS = {
  professional: {
    icon: '💼',
    color: 'blue',
    description: 'Formal and precise communication',
    bgGradient: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200'
  },
  casual: {
    icon: '😊',
    color: 'green',
    description: 'Friendly and conversational',
    bgGradient: 'from-green-50 to-emerald-50',
    borderColor: 'border-green-200'
  },
  supportive: {
    icon: '🤗',
    color: 'purple',
    description: 'Encouraging and patient',
    bgGradient: 'from-purple-50 to-pink-50',
    borderColor: 'border-purple-200'
  },
  analytical: {
    icon: '🔍',
    color: 'gray',
    description: 'Logical and methodical',
    bgGradient: 'from-gray-50 to-slate-50',
    borderColor: 'border-gray-200'
  },
  creative: {
    icon: '🎨',
    color: 'orange',
    description: 'Imaginative and inspiring',
    bgGradient: 'from-orange-50 to-yellow-50',
    borderColor: 'border-orange-200'
  },
  adaptive: {
    icon: '🧠',
    color: 'indigo',
    description: 'Context-aware and flexible',
    bgGradient: 'from-indigo-50 to-purple-50',
    borderColor: 'border-indigo-200'
  }
};

interface AviChatMessage extends AviMessage {
  isLocal?: boolean;
  adaptationScore?: number;
}

export const AviChatInterface: React.FC<AviChatInterfaceProps> = ({
  instance,
  messages,
  onSendMessage,
  personalityMode,
  onPersonalityChange,
  showTypingIndicator = true,
  enableVoiceInput = false,
  theme = 'auto'
}) => {
  // State management
  const [inputMessage, setInputMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<ImageAttachment[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showPersonalityPanel, setShowPersonalityPanel] = useState(false);

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current personality config
  const personalityConfig = PERSONALITY_CONFIGS[personalityMode];

  // Enhanced messages with local state
  const enhancedMessages = useMemo(() => {
    return messages.map(message => ({
      ...message,
      isLocal: message.role === 'user',
      adaptationScore: message.aviMetadata?.personalityContext?.adaptationScore || 0
    }));
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [enhancedMessages]);

  // Handle sending message
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() && uploadingImages.length === 0) return;

    const messageOptions: AviMessageOptions = {
      personalityMode,
      priority: 'normal',
      responseStyle: 'detailed',
      includeContext: true
    };

    try {
      setIsComposing(false);
      await onSendMessage(inputMessage, messageOptions);
      setInputMessage('');

      // Clear any uploaded images
      if (uploadingImages.length > 0) {
        setUploadingImages([]);
      }

      // Play send sound if enabled
      if (soundEnabled) {
        playNotificationSound('send');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [inputMessage, uploadingImages, personalityMode, onSendMessage, soundEnabled]);

  // Handle key press in input
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    setIsComposing(e.target.value.length > 0);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const imageAttachment: ImageAttachment = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          uploadProgress: 100
        };

        setUploadingImages(prev => [...prev, imageAttachment]);
      }
    });

    // Reset file input
    e.target.value = '';
  }, []);

  // Remove uploaded image
  const handleRemoveImage = useCallback((imageId: string) => {
    setUploadingImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

  // Toggle voice recording
  const handleVoiceToggle = useCallback(() => {
    if (!enableVoiceInput) return;

    setIsVoiceRecording(prev => {
      const newState = !prev;
      if (newState) {
        // Start voice recording
        console.log('Starting voice recording');
      } else {
        // Stop voice recording
        console.log('Stopping voice recording');
      }
      return newState;
    });
  }, [enableVoiceInput]);

  // Play notification sound
  const playNotificationSound = useCallback((type: 'send' | 'receive' | 'error') => {
    if (!soundEnabled) return;

    // In a real implementation, this would play actual sound files
    console.log(`Playing ${type} sound`);
  }, [soundEnabled]);

  // Format message content
  const formatMessageContent = useCallback((content: string, hasCodeBlocks: boolean) => {
    if (hasCodeBlocks) {
      // In a real implementation, this would apply syntax highlighting
      return (
        <div className="space-y-2">
          {content.split('```').map((part, index) => (
            <div
              key={index}
              className={index % 2 === 1
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded font-mono text-sm overflow-x-auto'
                : 'text-gray-900 dark:text-gray-100'
              }
            >
              {part}
            </div>
          ))}
        </div>
      );
    }

    return <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{content}</div>;
  }, []);

  // Get emotional tone color
  const getEmotionalToneColor = useCallback((tone: AviEmotionalTone) => {
    switch (tone) {
      case 'encouraging': return 'text-green-600 dark:text-green-400';
      case 'empathetic': return 'text-purple-600 dark:text-purple-400';
      case 'confident': return 'text-blue-600 dark:text-blue-400';
      case 'curious': return 'text-yellow-600 dark:text-yellow-400';
      case 'patient': return 'text-indigo-600 dark:text-indigo-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  }, []);

  return (
    <div className={cn(
      'flex flex-col h-full bg-white dark:bg-gray-900',
      personalityConfig.bgGradient,
      personalityConfig.borderColor,
      'border-l-4'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Avi Assistant
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{personalityConfig.icon}</span>
                <span>{personalityConfig.description}</span>
                {instance.isConnected && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPersonalityPanel(!showPersonalityPanel)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Personality Settings"
          >
            <Brain className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title={soundEnabled ? 'Disable Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Personality Panel */}
      {showPersonalityPanel && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Personality Mode
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PERSONALITY_CONFIGS).map(([mode, config]) => (
              <button
                key={mode}
                onClick={() => onPersonalityChange(mode as AviPersonalityMode)}
                className={cn(
                  'p-2 rounded-lg border text-left transition-all',
                  personalityMode === mode
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {mode}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {config.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {enhancedMessages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex space-x-3',
              message.isLocal ? 'justify-end' : 'justify-start'
            )}
          >
            {!message.isLocal && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm">
                  <Bot className="w-4 h-4" />
                </div>
              </div>
            )}

            <div
              className={cn(
                'max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg',
                message.isLocal
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-none'
              )}
            >
              {/* Message content */}
              <div className={cn(
                'text-sm',
                message.isLocal
                  ? 'text-white'
                  : 'text-gray-900 dark:text-gray-100'
              )}>
                {formatMessageContent(
                  message.content,
                  message.aviMetadata?.formatting?.hasCodeBlocks || false
                )}
              </div>

              {/* Message metadata */}
              <div className="flex items-center justify-between mt-2 text-xs">
                <div className={cn(
                  'flex items-center space-x-2',
                  message.isLocal
                    ? 'text-blue-100'
                    : 'text-gray-500 dark:text-gray-400'
                )}>
                  <span>{message.timestamp.toLocaleTimeString()}</span>

                  {!message.isLocal && message.aviMetadata?.personalityContext && (
                    <>
                      <span>•</span>
                      <span className={getEmotionalToneColor(message.aviMetadata.personalityContext.tone)}>
                        {message.aviMetadata.personalityContext.tone}
                      </span>
                    </>
                  )}
                </div>

                {/* Adaptation score */}
                {!message.isLocal && message.adaptationScore && (
                  <div className="flex items-center space-x-1">
                    <Activity className="w-3 h-3" />
                    <span>{Math.round(message.adaptationScore * 100)}%</span>
                  </div>
                )}
              </div>

              {/* Message indicators */}
              <div className="flex items-center space-x-1 mt-1">
                {message.aviMetadata?.formatting?.hasCodeBlocks && (
                  <Code className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                )}
                {message.aviMetadata?.formatting?.hasLinks && (
                  <Link className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                )}
                {message.aviMetadata?.formatting?.hasImages && (
                  <ImageIcon className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                )}
              </div>
            </div>

            {message.isLocal && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm">
                  <User className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {showTypingIndicator && isComposing && (
          <div className="flex justify-start">
            <div className="flex space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg rounded-bl-none px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image uploads preview */}
      {uploadingImages.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2 overflow-x-auto">
            {uploadingImages.map((image) => (
              <div key={image.id} className="relative flex-shrink-0">
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <button
                  onClick={() => handleRemoveImage(image.id)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end space-x-2">
          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Voice input */}
          {enableVoiceInput && (
            <button
              onClick={handleVoiceToggle}
              className={cn(
                'p-2 rounded-lg',
                isVoiceRecording
                  ? 'bg-red-500 text-white'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              {isVoiceRecording ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
          )}

          {/* Text input */}
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={`Message Avi (${personalityMode} mode)...`}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm max-h-32"
              rows={1}
              style={{ minHeight: '40px' }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() && uploadingImages.length === 0}
            className={cn(
              'p-2 rounded-lg transition-colors',
              inputMessage.trim() || uploadingImages.length > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'text-gray-400 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AviChatInterface;