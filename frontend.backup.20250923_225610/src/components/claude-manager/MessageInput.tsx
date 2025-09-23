import React, { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showTypingIndicator?: boolean;
  maxLength?: number;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
  showTypingIndicator = false,
  maxLength = 2000
}) => {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [rows, setRows] = useState(1);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const minRows = 1;
      const maxRows = 6;
      const lineHeight = 24; // Approximate line height in pixels
      
      const newRows = Math.max(minRows, Math.min(maxRows, Math.ceil(scrollHeight / lineHeight)));
      setRows(newRows);
      textarea.style.height = `${Math.min(scrollHeight, lineHeight * maxRows)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleSend = () => {
    const message = input.trim();
    if (message && !disabled) {
      console.log('📝 SPARC: MessageInput sending AI conversation message:', message);
      // CRITICAL FIX: Send proper conversation message to Claude Code
      // Instead of raw terminal input, format as AI conversation
      onSendMessage(message);
      setInput('');
      setRows(1);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      console.log('⚡ SPARC: Enter key pressed, sending command');
      handleSend();
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setInput(value);
    }
  };

  const canSend = input.trim().length > 0 && !disabled;
  const remainingChars = maxLength - input.length;
  const isNearLimit = remainingChars < 100;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      {/* Typing Indicator */}
      {showTypingIndicator && (
        <div className="mb-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>Processing...</span>
        </div>
      )}
      
      <div className="flex flex-col gap-3">
        {/* Input Area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            data-testid="message-input"
            className={cn(
              'w-full px-4 py-3 pr-12 resize-none',
              'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600',
              'rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800',
              'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent'
            )}
            style={{
              minHeight: '48px',
              maxHeight: '144px'
            }}
          />
          
          {/* Character Count */}
          {isNearLimit && (
            <div className={cn(
              'absolute bottom-2 left-3 text-xs',
              remainingChars < 20 ? 'text-red-500' : 'text-yellow-600 dark:text-yellow-400'
            )}>
              {remainingChars} chars remaining
            </div>
          )}
        </div>
        
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Enter</kbd>
            <span>to send</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Shift+Enter</kbd>
            <span>for new line</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={!canSend}
              size="sm"
              className={cn(
                'transition-all duration-200',
                canSend && 'hover:scale-105 active:scale-95'
              )}
            >
              {showTypingIndicator ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Send</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Help Text */}
      {!input && !disabled && (
        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
          Send commands to Claude or ask questions about your project
        </div>
      )}
    </div>
  );
};

export default MessageInput;
export type { MessageInputProps };