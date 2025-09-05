/**
 * HierarchicalPost Component - TDD London School Implementation
 * 
 * Renders posts in hierarchical structure with proper nesting and controls
 */

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, MessageCircle, AlertTriangle } from 'lucide-react';
import { AgentPost } from './ExpandablePost';

interface HierarchicalPostProps {
  post: AgentPost & {
    metadata: AgentPost['metadata'] & {
      hierarchyLevel: number;
      parentId: string | null;
      childrenIds: string[];
    };
  };
  children?: HierarchicalPostProps['post'][];
  maxDepth?: number;
  isExpanded?: boolean;
  onToggleChildren?: (postId: string, expanded: boolean) => void;
  onMaxDepthReached?: (postId: string, level: number) => void;
  className?: string;
}

export const HierarchicalPost: React.FC<HierarchicalPostProps> = ({
  post,
  children = [],
  maxDepth = 3,
  isExpanded = true,
  onToggleChildren,
  onMaxDepthReached,
  className = ''
}) => {
  const [showChildren, setShowChildren] = useState(isExpanded);
  
  const handleToggleChildren = useCallback(() => {
    const newExpanded = !showChildren;
    setShowChildren(newExpanded);
    onToggleChildren?.(post.id, newExpanded);
  }, [showChildren, post.id, onToggleChildren]);

  // Check if post exceeds maximum depth
  if (post.metadata.hierarchyLevel > maxDepth) {
    onMaxDepthReached?.(post.id, post.metadata.hierarchyLevel);
    return (
      <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded-lg">
        <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
        <span className="text-sm">Maximum thread depth reached</span>
      </div>
    );
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postTime = new Date(dateString);
    const diffMs = now.getTime() - postTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  const formatAgentName = (agentName: string) => {
    return agentName
      .replace(/-agent$/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getIndentationClass = (level: number) => {
    const indentMap: Record<number, string> = {
      0: 'ml-0',
      1: 'ml-4',
      2: 'ml-8',
      3: 'ml-12'
    };
    return indentMap[level] || `ml-${Math.min(level * 4, 16)}`;
  };

  const getBorderClass = (level: number) => {
    if (level === 0) return 'border-gray-200';
    const colors = [
      'border-l-blue-400',
      'border-l-green-400', 
      'border-l-purple-400',
      'border-l-orange-400'
    ];
    return `border-l-2 ${colors[level % colors.length]} pl-4`;
  };

  return (
    <div className={`${getIndentationClass(post.metadata.hierarchyLevel)} ${className}`}>
      {/* Main Post */}
      <article
        className={`bg-white rounded-lg border ${getBorderClass(post.metadata.hierarchyLevel)} mb-4 hover:shadow-md transition-shadow`}
        data-testid={`hierarchical-post-${post.id}`}
      >
        <div 
          className={`p-4 hierarchy-level-${post.metadata.hierarchyLevel}`}
          data-testid={`hierarchy-level-${post.metadata.hierarchyLevel}`}
        >
          {/* Post Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1">
              <div className={`w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm`}>
                🤖
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {formatAgentName(post.authorAgent)}
                  </h3>
                  <span className="text-xs text-gray-500">
                    Level {post.metadata.hierarchyLevel}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{formatTimeAgo(post.publishedAt)}</span>
                  <span>•</span>
                  <span>Impact: {post.metadata.businessImpact}/10</span>
                </div>
              </div>
            </div>

            {/* Toggle Children Button */}
            {children.length > 0 && (
              <button
                onClick={handleToggleChildren}
                className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                data-testid="toggle-children-button"
              >
                {showChildren ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <span>{children.length} {children.length === 1 ? 'reply' : 'replies'}</span>
              </button>
            )}
          </div>

          {/* Post Content */}
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {post.title}
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {post.content}
            </p>
          </div>

          {/* Tags */}
          {post.metadata.tags && post.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {post.metadata.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
              {post.metadata.tags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                  +{post.metadata.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Post Stats */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <span>❤️</span>
              <span>{post.likes || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="h-3 w-3" />
              <span>{post.comments || 0}</span>
            </div>
            {post.metadata.parentId && (
              <div className="flex items-center space-x-1">
                <span>↳</span>
                <span>Reply to {post.metadata.parentId.slice(0, 8)}...</span>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Child Posts */}
      {children.length > 0 && showChildren && (
        <div className="border-l border-gray-200 pl-4 space-y-2">
          {children.map((child) => (
            <HierarchicalPost
              key={child.id}
              post={child}
              children={[]} // Children would be loaded separately
              maxDepth={maxDepth}
              onToggleChildren={onToggleChildren}
              onMaxDepthReached={onMaxDepthReached}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HierarchicalPost;