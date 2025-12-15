import React from 'react';
import { Bot } from 'lucide-react';

interface AgentBadgeProps {
  agentType: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * AgentBadge Component
 * Displays a badge for agent comments
 */
export const AgentBadge: React.FC<AgentBadgeProps> = ({
  agentType,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  return (
    <span
      className={`agent-badge inline-flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full font-medium ${sizeClasses[size]} ${className}`}
    >
      <Bot className="w-3 h-3" />
      {agentType}
    </span>
  );
};
