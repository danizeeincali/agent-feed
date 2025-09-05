import React, { useState } from 'react';
import { ThumbsUp, Smile, Frown, Angry, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ReactionCounts {
  laugh: number;
  sad: number;
  angry: number;
  wow: number;
}

interface CommentReactionsProps {
  commentId: string;
  reactions: ReactionCounts;
  userReaction?: string;
  onReact: (commentId: string, reactionType: string) => Promise<void>;
  compact?: boolean;
  className?: string;
}

const reactionIcons = {
  laugh: { icon: Smile, label: 'Laugh', color: 'text-yellow-500' },
  sad: { icon: Frown, label: 'Sad', color: 'text-blue-500' },
  angry: { icon: Angry, label: 'Angry', color: 'text-red-600' },
  wow: { icon: AlertCircle, label: 'Wow', color: 'text-purple-500' }
};

export const CommentReactions: React.FC<CommentReactionsProps> = ({
  commentId,
  reactions,
  userReaction,
  onReact,
  compact = false,
  className
}) => {
  const [showAll, setShowAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const handleReaction = async (reactionType: string) => {
    if (isSubmitting) return;

    setIsSubmitting(reactionType);
    try {
      await onReact(commentId, reactionType);
    } catch (error) {
      console.error('Failed to react:', error);
    } finally {
      setIsSubmitting(null);
    }
  };

  const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);
  
  if (totalReactions === 0 && !showAll) {
    return (
      <div className={cn('flex items-center space-x-1', className)}>
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Add reaction
        </button>
      </div>
    );
  }

  const visibleReactions = Object.entries(reactions).filter(([_, count]) => count > 0 || showAll);
  const topReactions = visibleReactions
    .sort(([, a], [, b]) => b - a)
    .slice(0, compact ? 3 : 6);

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      {/* Reaction buttons */}
      <div className="flex items-center space-x-1">
        {topReactions.map(([type, count]) => {
          const reaction = reactionIcons[type as keyof typeof reactionIcons];
          if (!reaction) return null;

          const Icon = reaction.icon;
          const isActive = userReaction === type;
          const isLoading = isSubmitting === type;

          return (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              disabled={isLoading}
              className={cn(
                'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all',
                'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
                isActive 
                  ? `bg-blue-50 ${reaction.color} border border-blue-200`
                  : 'text-gray-600 hover:text-gray-800',
                isLoading && 'opacity-50 cursor-wait',
                compact ? 'px-1 py-0.5' : 'px-2 py-1'
              )}
              title={`${reaction.label} (${count})`}
            >
              <Icon className={cn(
                compact ? 'w-3 h-3' : 'w-4 h-4',
                isLoading && 'animate-pulse'
              )} />
              {!compact && count > 0 && (
                <span className="min-w-[1rem] text-center">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Show all reactions toggle */}
      {!showAll && Object.keys(reactionIcons).length > topReactions.length && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-1"
        >
          +{Object.keys(reactionIcons).length - topReactions.length}
        </button>
      )}

      {/* Hide reactions toggle */}
      {showAll && (
        <button
          onClick={() => setShowAll(false)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-1"
        >
          −
        </button>
      )}

      {/* Total count for compact mode */}
      {compact && totalReactions > 0 && (
        <span className="text-xs text-gray-500 ml-1">
          {totalReactions}
        </span>
      )}
    </div>
  );
};