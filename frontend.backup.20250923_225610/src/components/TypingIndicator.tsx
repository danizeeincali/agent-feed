import React from 'react';
import { useTypingUsers } from '@/context/WebSocketContext';
import { cn } from '@/utils/cn';

interface TypingIndicatorProps {
  postId: string;
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ postId, className }) => {
  const typingUsers = useTypingUsers(postId);

  if (typingUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].username} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`;
    } else {
      return `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing...`;
    }
  };

  return (
    <div className={cn('flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-600', className)}>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
};

export default TypingIndicator;