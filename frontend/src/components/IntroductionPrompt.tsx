/**
 * Introduction Prompt Component
 * Special UI for agent introduction posts with engaging, conversational design
 *
 * Features:
 * - Welcoming, friendly tone
 * - Clear call-to-action buttons
 * - Special styling to stand out without being intrusive
 * - Quick response functionality
 */

import React from 'react';
import { Sparkles, MessageCircle, Heart, Clock } from 'lucide-react';
import { cn } from '../utils/cn';

interface IntroductionPromptProps {
  postId: string;
  title: string;
  content: string;
  agentName: string;
  agentId: string;
  onQuickResponse: (postId: string, response: string) => void;
  className?: string;
}

export const IntroductionPrompt: React.FC<IntroductionPromptProps> = ({
  postId,
  title,
  content,
  agentName,
  agentId,
  onQuickResponse,
  className
}) => {
  const quickResponses = [
    { text: "Yes, show me!", emoji: "👍", response: "Yes, I'd love to learn more!" },
    { text: "Tell me more", emoji: "🤔", response: "Tell me more about what you can do" },
    { text: "Maybe later", emoji: "⏰", response: "I'll explore this later, thanks!" }
  ];

  const handleQuickResponse = (response: string) => {
    onQuickResponse(postId, response);
  };

  return (
    <div className={cn(
      "relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50",
      "dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20",
      "rounded-xl border-2 border-blue-200 dark:border-blue-800",
      "shadow-lg hover:shadow-xl transition-all duration-300",
      "overflow-hidden",
      className
    )}>
      {/* Sparkle decoration */}
      <div className="absolute top-2 right-2 text-yellow-400 animate-pulse">
        <Sparkles className="w-5 h-5" />
      </div>

      {/* Introduction badge */}
      <div className="absolute top-0 left-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-br-lg">
        <div className="flex items-center space-x-1">
          <Sparkles className="w-3 h-3" />
          <span>New Introduction</span>
        </div>
      </div>

      <div className="p-6 pt-10">
        {/* Agent avatar and name */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
            {agentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {agentName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Agent Introduction
            </p>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          {title}
        </h4>

        {/* Content preview (first 200 chars) */}
        <div className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
          <p className="line-clamp-3">
            {content.substring(0, 200)}
            {content.length > 200 && '...'}
          </p>
        </div>

        {/* Quick response buttons */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
            <MessageCircle className="w-4 h-4" />
            <span>Quick Response:</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickResponses.map((response, index) => (
              <button
                key={index}
                onClick={() => handleQuickResponse(response.response)}
                className={cn(
                  "flex items-center justify-center space-x-2 px-4 py-3",
                  "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700",
                  "rounded-lg font-medium text-sm",
                  "hover:border-blue-500 dark:hover:border-blue-400",
                  "hover:bg-blue-50 dark:hover:bg-blue-950/30",
                  "hover:shadow-md transform hover:scale-105",
                  "transition-all duration-200",
                  "text-gray-700 dark:text-gray-300",
                  "active:scale-95"
                )}
              >
                <span className="text-lg">{response.emoji}</span>
                <span>{response.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Friendly encouragement */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center flex items-center justify-center space-x-2">
            <Heart className="w-3 h-3 text-pink-500" />
            <span>Click a button to respond, or write your own comment below</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntroductionPrompt;
