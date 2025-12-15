/**
 * ExpandablePost Component - TDD London School Implementation
 * 
 * Implements expandable post functionality following behavior-driven contracts
 */

import React, { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, Clock, Loader2, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';

export interface AgentPost {
  id: string;
  title: string;
  content: string;
  authorAgent: string;
  publishedAt: string;
  metadata: {
    businessImpact: number;
    tags: string[];
    isAgentResponse: boolean;
  };
  likes?: number;
  comments?: number;
}

export interface DetailedPost extends AgentPost {
  fullContent: string;
  engagementHistory: Array<{
    type: string;
    timestamp: string;
    userId: string;
  }>;
  relatedPosts: AgentPost[];
  metrics: {
    views: number;
    clickThrough: number;
    timeSpent: number;
  };
}

interface ExpandablePostProps {
  post: AgentPost;
  expanded?: boolean;
  detailedContent?: DetailedPost;
  onExpand?: (postId: string) => void;
  onCollapse?: (postId: string) => void;
  onError?: (error: string) => void;
  onLoadingStart?: () => void;
  onLoadingEnd?: () => void;
  engagementTracker?: {
    trackPostExpansion: (data: any) => void;
    trackTimeSpent: (data: any) => void;
    trackInteraction: (data: any) => void;
  };
  className?: string;
}

export const ExpandablePost: React.FC<ExpandablePostProps> = ({
  post,
  expanded = false,
  detailedContent,
  onExpand,
  onCollapse,
  onError,
  onLoadingStart,
  onLoadingEnd,
  engagementTracker,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [isLoading, setIsLoading] = useState(false);
  const [detailedData, setDetailedData] = useState<DetailedPost | null>(detailedContent || null);
  const [error, setError] = useState<string | null>(null);
  const [expandStartTime, setExpandStartTime] = useState<number | null>(null);

  // Handle expand/collapse toggle
  const handleToggle = useCallback(async () => {
    if (isExpanded) {
      // Collapse
      setIsExpanded(false);
      onCollapse?.(post.id);
      
      // Track engagement time if expanded
      if (expandStartTime && engagementTracker) {
        const timeSpent = Date.now() - expandStartTime;
        engagementTracker.trackTimeSpent({
          postId: post.id,
          timeSpent,
          action: 'collapse'
        });
      }
      setExpandStartTime(null);
    } else {
      // Expand
      setError(null);
      setIsLoading(true);
      onLoadingStart?.();
      
      try {
        // Call expand handler
        onExpand?.(post.id);
        
        // Track expansion
        if (engagementTracker) {
          engagementTracker.trackPostExpansion({
            postId: post.id,
            authorAgent: post.authorAgent,
            timestamp: Date.now()
          });
        }
        
        // Load detailed content if not provided
        if (!detailedData) {
          const response = await apiService.getPostDetails(post.id);
          if (response.success || response.data) {
            setDetailedData(response.data);
          } else {
            throw new Error('Failed to load post details');
          }
        }
        
        setIsExpanded(true);
        setExpandStartTime(Date.now());
        
      } catch (err) {
        const errorMessage = 'Failed to load post details';
        setError(errorMessage);
        onError?.(errorMessage);
        
        // Track error
        if (engagementTracker) {
          engagementTracker.trackInteraction({
            postId: post.id,
            action: 'expand_error',
            error: errorMessage
          });
        }
      } finally {
        setIsLoading(false);
        onLoadingEnd?.();
      }
    }
  }, [isExpanded, post.id, onExpand, onCollapse, onError, onLoadingStart, onLoadingEnd, 
      detailedData, expandStartTime, engagementTracker]);

  // Format time ago
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

  const displayData = detailedData || post;

  return (
    <article 
      className={`bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow ${className}`}
      data-testid={`expandable-post-${post.id}`}
    >
      {/* Post Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg">
              🤖
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {post.authorAgent.replace(/-agent$/, '').split('-').map(w => 
                  w.charAt(0).toUpperCase() + w.slice(1)
                ).join(' ')}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{formatTimeAgo(post.publishedAt)}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleToggle}
            disabled={isLoading}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
            data-testid="expand-post-button"
            aria-expanded={isExpanded}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span>Expand</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div 
          className="flex items-center justify-center py-8"
          data-testid="post-loading-spinner"
        >
          <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-600">Loading post details...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Post Content */}
      {!isLoading && !error && (
        <div className="p-4">
          <h4 className="text-lg font-medium text-gray-900 mb-3">
            {post.title}
          </h4>
          
          {/* Basic content (always shown) */}
          <p className="text-gray-700 leading-relaxed mb-4">
            {post.content}
          </p>

          {/* Expanded content */}
          {isExpanded && detailedData && (
            <div 
              className="border-t border-gray-100 pt-4 mt-4"
              data-testid="expanded-content"
            >
              {/* Full content */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Detailed Content:</h5>
                <p className="text-gray-700 leading-relaxed">
                  {detailedData.fullContent}
                </p>
              </div>

              {/* Metrics */}
              {detailedData.metrics && (
                <div 
                  className="bg-gray-50 rounded-lg p-3 mb-4"
                  data-testid="post-metrics"
                >
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Engagement Metrics:</h5>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">{detailedData.metrics.views}</div>
                      <div className="text-gray-600">Views</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        {(detailedData.metrics.clickThrough * 100).toFixed(1)}%
                      </div>
                      <div className="text-gray-600">Click Through</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">{detailedData.metrics.timeSpent}s</div>
                      <div className="text-gray-600">Avg. Time</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Engagement History */}
              {detailedData.engagementHistory && detailedData.engagementHistory.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Recent Activity:</h5>
                  <div className="space-y-2">
                    {detailedData.engagementHistory.slice(0, 3).map((engagement, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="capitalize">{engagement.type}</span>
                        <span>by {engagement.userId}</span>
                        <span>• {formatTimeAgo(engagement.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {post.metadata.tags && post.metadata.tags.length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="flex flex-wrap gap-2">
                {post.metadata.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapse button when expanded */}
      {isExpanded && !isLoading && !error && (
        <div className="px-4 pb-4">
          <button
            onClick={handleToggle}
            className="w-full flex items-center justify-center space-x-1 py-2 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
            data-testid="collapse-post-button"
          >
            <ChevronUp className="h-4 w-4" />
            <span>Collapse</span>
          </button>
        </div>
      )}
    </article>
  );
};

export default ExpandablePost;