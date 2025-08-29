import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { ClaudeOutputParser, ParsedMessage } from '../../utils/claudeOutputParser';

// Use ParsedMessage interface from the parser
interface Message extends ParsedMessage {}

interface MessageListProps {
  instanceId: string;
  output: string;
  connectionType: string;
  isConnected: boolean;
}

// Enhanced terminal output parsing using the SPARC implementation
const parseTerminalOutput = (output: string, instanceId: string): Message[] => {
  return ClaudeOutputParser.parseOutput(output, instanceId);
};

const MessageBubble: React.FC<{
  message: Message;
  isLast: boolean;
}> = ({ message, isLast }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isClaudeResponse = message.metadata?.messageType === 'claude_response';
  const isThinking = message.metadata?.messageType === 'thinking';
  
  return (
    <div className={cn(
      'flex mb-4 animate-in slide-in-from-bottom-2 duration-300',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'max-w-[85%] rounded-xl px-4 py-3 shadow-sm',
        'transition-all duration-200 hover:shadow-md',
        // User messages
        isUser && 'bg-blue-500 text-white rounded-br-md',
        // System messages
        isSystem && !message.isError && 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-center text-sm',
        isSystem && message.isError && 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-center text-sm border border-red-200 dark:border-red-800',
        // Claude responses (enhanced styling)
        !isUser && !isSystem && isClaudeResponse && 'bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 text-gray-900 dark:text-gray-100 border border-purple-200 dark:border-purple-700 rounded-tl-md',
        // Thinking messages
        !isUser && !isSystem && isThinking && 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700 rounded-lg',
        // Regular assistant messages
        !isUser && !isSystem && !isClaudeResponse && !isThinking && 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-tl-md'
      )}>
        {/* Message Type Indicator for Claude responses */}
        {isClaudeResponse && (
          <div className="flex items-center gap-2 mb-2 text-xs text-purple-600 dark:text-purple-400">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            <span className="font-medium">Claude Response</span>
            {message.metadata?.hasBoxDrawing && (
              <span className="text-purple-500/70">(parsed from terminal)</span>
            )}
          </div>
        )}
        
        {/* Thinking Indicator */}
        {isThinking && (
          <div className="flex items-center gap-2 mb-2 text-xs text-yellow-600 dark:text-yellow-400">
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="font-medium">Claude is thinking...</span>
          </div>
        )}
        
        {/* Message Content */}
        <div className={cn(
          'whitespace-pre-wrap break-words leading-relaxed',
          isSystem && 'font-medium',
          isClaudeResponse && 'font-normal text-gray-800 dark:text-gray-200',
          isThinking && 'font-medium text-sm'
        )}>
          {message.content}
        </div>
        
        {/* Metadata for debugging (only in development) */}
        {process.env.NODE_ENV === 'development' && message.metadata && (
          <details className="mt-2 text-xs opacity-50">
            <summary className="cursor-pointer hover:opacity-75">Debug Info</summary>
            <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
              <div>Type: {message.metadata.messageType}</div>
              <div>Has Box Drawing: {message.metadata.hasBoxDrawing ? 'Yes' : 'No'}</div>
              <div>Has ANSI: {message.metadata.hasANSI ? 'Yes' : 'No'}</div>
            </div>
          </details>
        )}
        
        {/* Timestamp */}
        <div className={cn(
          'text-xs mt-2 opacity-70',
          isUser ? 'text-blue-100' : 
          isSystem ? 'text-current' : 
          isClaudeResponse ? 'text-purple-500 dark:text-purple-400' :
          'text-gray-500 dark:text-gray-400'
        )}>
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Claude is thinking...</span>
        </div>
      </div>
    </div>
  );
};

const MessageList: React.FC<MessageListProps> = ({
  instanceId,
  output,
  connectionType,
  isConnected
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const messages = parseTerminalOutput(output, instanceId);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [output, instanceId]);

  // Connection status indicator
  const renderConnectionStatus = () => {
    if (!isConnected) {
      return (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full text-sm border border-red-200 dark:border-red-800">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            Disconnected from instance
          </div>
        </div>
      );
    }
    
    return (
      <div className="text-center py-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs border border-green-200 dark:border-green-800">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          {connectionType}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Connection Status */}
      {renderConnectionStatus()}
      
      {/* Messages Container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Waiting for Claude to start...
              </p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble 
              key={message.id}
              message={message}
              isLast={index === messages.length - 1}
            />
          ))
        )}
        
        {/* Typing Indicator - could be controlled by parent */}
        {/* {isTyping && <TypingIndicator />} */}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} className="h-1" />
      </div>
    </div>
  );
};

export default MessageList;
export type { MessageListProps, Message };
export { TypingIndicator };