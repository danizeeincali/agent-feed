/**
 * PostDetailsModal Component - TDD London School Implementation
 * 
 * Modal component for displaying detailed post information
 */

import React, { useEffect, useCallback } from 'react';
import { X, Clock, Eye, TrendingUp, MessageCircle } from 'lucide-react';
import { DetailedPost } from './ExpandablePost';

interface PostDetailsModalProps {
  isOpen: boolean;
  post: DetailedPost | null;
  onOpen?: () => void;
  onClose: () => void;
  className?: string;
}

export const PostDetailsModal: React.FC<PostDetailsModalProps> = ({
  isOpen,
  post,
  onOpen,
  onClose,
  className = ''
}) => {
  // Handle escape key to close modal
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Handle backdrop click to close modal
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
      onOpen?.();
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown, onOpen]);

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

  const formatAgentName = (agentName: string) => {
    return agentName
      .replace(/-agent$/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!isOpen || !post) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 ${className}`}
      onClick={handleBackdropClick}
      data-testid="post-details-modal"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl">
              🤖
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {formatAgentName(post.authorAgent)}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>{formatTimeAgo(post.publishedAt)}</span>
                <span>•</span>
                <span>Business Impact: {post.metadata.businessImpact}/10</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="modal-close-button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Post Title */}
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {post.title}
          </h3>

          {/* Post Content */}
          <div className="prose max-w-none mb-6">
            <p className="text-gray-700 leading-relaxed mb-4">
              {post.content}
            </p>
            
            {post.fullContent && post.fullContent !== post.content && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Additional Details</h4>
                <p className="text-gray-700 leading-relaxed">
                  {post.fullContent}
                </p>
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          {post.metrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <Eye className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{post.metrics.views}</div>
                <div className="text-sm text-gray-600">Total Views</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {(post.metrics.clickThrough * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Click Through Rate</div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{post.metrics.timeSpent}s</div>
                <div className="text-sm text-gray-600">Avg. Read Time</div>
              </div>
            </div>
          )}

          {/* Engagement History */}
          {post.engagementHistory && post.engagementHistory.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Recent Activity
              </h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3">
                  {post.engagementHistory.map((engagement, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          engagement.type === 'like' ? 'bg-red-400' :
                          engagement.type === 'comment' ? 'bg-blue-400' :
                          'bg-gray-400'
                        }`}></div>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {engagement.type}
                        </span>
                        <span className="text-sm text-gray-600">by {engagement.userId}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(engagement.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          {post.metadata.tags && post.metadata.tags.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {post.metadata.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full hover:bg-blue-200 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Related Posts */}
          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">Related Posts</h4>
              <div className="space-y-3">
                {post.relatedPosts.map((relatedPost, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer">
                    <h5 className="font-medium text-gray-900">{relatedPost.title}</h5>
                    <p className="text-sm text-gray-600 mt-1">
                      by {formatAgentName(relatedPost.authorAgent)} • {formatTimeAgo(relatedPost.publishedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostDetailsModal;