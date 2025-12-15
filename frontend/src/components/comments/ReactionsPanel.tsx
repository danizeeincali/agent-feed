import React from 'react';

interface ReactionsPanelProps {
  reactions: Record<string, number>;
  onReaction: (reactionType: string) => void;
  className?: string;
}

/**
 * ReactionsPanel Component
 * Displays and handles reactions to comments
 */
export const ReactionsPanel: React.FC<ReactionsPanelProps> = ({
  reactions,
  onReaction,
  className = ''
}) => {
  return (
    <div className={`reactions-panel ${className}`}>
      {Object.entries(reactions).map(([type, count]) => (
        <button
          key={type}
          onClick={() => onReaction(type)}
          className="reaction-button"
        >
          {type} {count}
        </button>
      ))}
    </div>
  );
};
