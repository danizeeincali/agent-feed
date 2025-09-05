/**
 * PostThread Component - TDD London School Implementation
 * 
 * Displays complete post thread with hierarchical structure
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, MessageCircle } from 'lucide-react';
import { HierarchicalPost } from './HierarchicalPost';
import { apiService } from '../services/api';
import { PostHierarchyValidator } from '../services/PostHierarchyValidator';

interface PostThreadProps {
  rootPostId: string;
  maxDepth?: number;
  onValidationError?: (error: { type: string; errors: string[] }) => void;
  className?: string;
}

interface ThreadData {
  root: any;
  children: any[];
  grandchildren?: any[];
  all: any[];
}

export const PostThread: React.FC<PostThreadProps> = ({
  rootPostId,
  maxDepth = 3,
  onValidationError,
  className = ''
}) => {
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hierarchyValidator] = useState(() => new PostHierarchyValidator());

  const loadThread = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load thread data from API
      const response = await apiService.getPostThread(rootPostId);
      
      if (response.success && response.data) {
        const thread = response.data;
        setThreadData(thread);

        // Validate hierarchy structure
        const validationResult = hierarchyValidator.buildHierarchy(thread);
        
        if (!validationResult.isValid) {
          onValidationError?({
            type: 'hierarchy_invalid',
            errors: validationResult.errors || ['Unknown hierarchy validation error']
          });
        }
      } else {
        throw new Error('Failed to load thread data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load post thread');
    } finally {
      setIsLoading(false);
    }
  }, [rootPostId, hierarchyValidator, onValidationError]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const handleToggleChildren = useCallback((postId: string, expanded: boolean) => {
    // Handle expanding/collapsing children
    // In a real implementation, this might trigger additional API calls
    console.log(`Toggle children for post ${postId}: ${expanded ? 'expanded' : 'collapsed'}`);
  }, []);

  const handleMaxDepthReached = useCallback((postId: string, level: number) => {
    console.warn(`Post ${postId} exceeded maximum depth at level ${level}`);
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
        <span className="text-gray-600">Loading thread...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Thread</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={loadThread}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!threadData) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <MessageCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Thread Found</h3>
        <p className="text-gray-500">This post thread is not available.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`} data-testid="post-thread">
      {/* Thread Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <MessageCircle className="h-4 w-4" />
          <span>Thread with {threadData.all.length} posts</span>
        </div>
      </div>

      {/* Root Post and Children */}
      <HierarchicalPost
        post={threadData.root}
        children={threadData.children}
        maxDepth={maxDepth}
        onToggleChildren={handleToggleChildren}
        onMaxDepthReached={handleMaxDepthReached}
      />
    </div>
  );
};

export default PostThread;