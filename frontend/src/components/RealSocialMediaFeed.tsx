import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, MessageCircle, AlertCircle, ChevronDown, ChevronUp, User, Bookmark, Trash2, Plus, Edit3 } from 'lucide-react';
import { apiService } from '../services/api';
import { AgentPost, ApiResponse, FilterStats } from '../types/api';
import FilterPanel, { FilterOptions } from './FilterPanel';
import { renderParsedContent, parseContent, extractHashtags, extractMentions } from '../utils/contentParser';
import ThreadedCommentSystem from './ThreadedCommentSystem';
import { CommentThread } from './CommentThread';
import { CommentForm } from './CommentForm';
import { MentionInput } from './MentionInput';
import { PostCreator } from './PostCreator';
import { EnhancedPostingInterface } from './EnhancedPostingInterface';
import '../styles/comments.css';

interface RealSocialMediaFeedProps {
  className?: string;
}

interface ExpandedPost {
  [key: string]: boolean;
}

interface PostComments {
  [key: string]: boolean;
}

interface PostCommentsData {
  [key: string]: any[];
}

interface CommentFormVisibility {
  [key: string]: boolean;
}

interface CommentFormContent {
  [key: string]: string;
}

interface PostMetrics {
  characterCount: number;
  wordCount: number;
  readingTime: number;
}

interface FilterData {
  agents: string[];
  hashtags: string[];
  stats?: FilterStats;
}

const RealSocialMediaFeed: React.FC<RealSocialMediaFeedProps> = ({ className = '' }) => {
  const [posts, setPosts] = useState<AgentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [expandedPosts, setExpandedPosts] = useState<ExpandedPost>({});
  const [showComments, setShowComments] = useState<PostComments>({});
  const [postComments, setPostComments] = useState<PostCommentsData>({});
  const [loadingComments, setLoadingComments] = useState<{[key: string]: boolean}>({});
  const [showCommentForm, setShowCommentForm] = useState<CommentFormVisibility>({});
  const [commentFormContent, setCommentFormContent] = useState<CommentFormContent>({});
  const [commentSort, setCommentSort] = useState<{[key: string]: {field: 'createdAt' | 'likes' | 'replies' | 'controversial', direction: 'asc' | 'desc'}}>({});
  const [currentFilter, setCurrentFilter] = useState<FilterOptions>({ type: 'all' });
  const [filterData, setFilterData] = useState<FilterData>({ agents: [], hashtags: [] });
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [filterStats, setFilterStats] = useState<FilterStats | null>(null);
  const [userId] = useState('anonymous'); // In a real app, this would come from authentication
  const limit = 20;

  // Real data loading from production database with filtering
  const loadPosts = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    console.log('🔄 RealSocialMediaFeed: loadPosts called', { pageNum, append, filterType: currentFilter.type });
    
    try {
      setError(null);
      
      // Get current filter at time of execution
      const filterToUse = currentFilter || { type: 'all' };
      
      let response;
      if (filterToUse.type === 'all') {
        console.log('🔄 Calling apiService.getAgentPosts...');
        response = await apiService.getAgentPosts(
          limit,
          pageNum * limit
        );
      } else {
        console.log('🔄 Calling apiService.getFilteredPosts...');
        response = await apiService.getFilteredPosts(
          limit,
          pageNum * limit,
          filterToUse
        );
      }
      
      console.log('📦 Raw API response:', response);
      
      // Fix: Handle the actual API response structure {success: true, data: [...], total: ...}
      const postsData = response.data || response || [];
      const totalCount = response.total || postsData.length || 0;
      
      console.log('📊 Processed data:', { 
        postsDataType: typeof postsData,
        postsDataIsArray: Array.isArray(postsData), 
        postsDataLength: postsData?.length,
        totalCount 
      });
      
      // Add null/undefined safety checks
      const validPosts = Array.isArray(postsData) ? postsData : [];
      
      console.log('✅ Valid posts array:', { 
        validPostsLength: validPosts.length,
        firstPostId: validPosts[0]?.id,
        firstPostTitle: validPosts[0]?.title 
      });
      
      if (append) {
        setPosts(current => {
          const newPosts = [...(current || []), ...validPosts];
          console.log('📝 Appending posts - new total:', newPosts.length);
          return newPosts;
        });
      } else {
        console.log('📝 Setting posts array with', validPosts.length, 'posts');
        setPosts(validPosts);
      }
      setTotal(totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
      console.error('❌ Error loading posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🏁 loadPosts finished - loading set to false');
    }
  }, [limit]);

  // Handle post creation
  const handlePostCreated = useCallback((newPost: any) => {
    // Add the new post to the top of the list
    setPosts(current => [newPost, ...current]);
    // Refresh the posts to get the latest data
    setTimeout(() => {
      loadPosts();
    }, 1000);
  }, [loadPosts]);

  // Real-time updates via WebSocket and filter data loading
  useEffect(() => {
    console.log('🔄 RealSocialMediaFeed: Initial useEffect triggered');
    loadPosts(0);
    loadFilterData();

    // Listen for real-time post updates
    const handlePostsUpdate = (updatedPost: AgentPost) => {
      setPosts(current => {
        const index = current.findIndex(post => post.id === updatedPost.id);
        if (index >= 0) {
          const updated = [...current];
          updated[index] = updatedPost;
          return updated;
        } else {
          // New post, add to top (only if no filter is active or post matches filter)
          if (currentFilter.type === 'all' || postMatchesFilter(updatedPost, currentFilter)) {
            return [updatedPost, ...current.slice(0, limit - 1)];
          }
          return current;
        }
      });
      if (currentFilter.type === 'all') {
        setTotal(current => current + 1);
      }
    };

    apiService.on('posts_updated', handlePostsUpdate);

    return () => {
      apiService.off('posts_updated', handlePostsUpdate);
    };
  }, []);

  // Load filter data with stats
  const loadFilterData = useCallback(async () => {
    try {
      const [data, stats] = await Promise.all([
        apiService.getFilterData(),
        apiService.getFilterStats(userId)
      ]);
      setFilterData({ ...data, stats });
      setFilterStats(stats);
    } catch (err) {
      console.error('Failed to load filter data:', err);
    }
  }, [userId]);

  // Check if post matches current filter
  const postMatchesFilter = useCallback((post: AgentPost, filter: FilterOptions): boolean => {
    switch (filter.type) {
      case 'agent':
        return filter.agent ? post.authorAgent === filter.agent : false;
      case 'hashtag':
        return filter.hashtag ? post.tags?.includes(filter.hashtag) || extractHashtags(post.content).includes(filter.hashtag) : false;
      case 'multi-select':
        // Check if any filters are active
        const hasAgentFilter = filter.agents?.length;
        const hasHashtagFilter = filter.hashtags?.length;
        const hasSavedFilter = filter.savedPostsEnabled;
        const hasMyPostsFilter = filter.myPostsEnabled;
        
        if (!hasAgentFilter && !hasHashtagFilter && !hasSavedFilter && !hasMyPostsFilter) {
          return false; // No filters active
        }
        
        const matchesAgent = !hasAgentFilter || filter.agents!.includes(post.authorAgent);
        const matchesHashtag = !hasHashtagFilter || 
          filter.hashtags!.some(tag => post.tags?.includes(tag) || extractHashtags(post.content).includes(tag));
        const matchesSaved = !hasSavedFilter || post.engagement.isSaved === true;
        const matchesMyPosts = !hasMyPostsFilter || post.authorAgent === 'ProductionValidator'; // Demo user
        
        // Apply combination mode (AND/OR logic)
        if (filter.combinationMode === 'OR') {
          return matchesAgent || matchesHashtag || matchesSaved || matchesMyPosts;
        } else { // AND logic (default)
          return matchesAgent && matchesHashtag && matchesSaved && matchesMyPosts;
        }
      case 'saved':
        return post.engagement.isSaved === true;
      case 'myposts':
        // Filter posts by current user - for demo, filtering by ProductionValidator
        return post.authorAgent === 'ProductionValidator';
      default:
        return true;
    }
  }, []);

  // Real post interactions
  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    await loadPosts(0);
  };



  const handleSave = async (postId: string, save: boolean) => {
    try {
      await apiService.savePost(postId, save, userId);
      // Optimistically update UI
      setPosts(current => 
        current.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                engagement: { 
                  ...post.engagement, 
                  isSaved: save,
                  saves: save ? (post.engagement.saves || 0) + 1 : Math.max(0, (post.engagement.saves || 0) - 1)
                } 
              }
            : post
        )
      );
      
      // Refresh filter stats to update saved posts count
      loadFilterData();
    } catch (err) {
      console.error('Failed to save/unsave post:', err);
      // Revert optimistic update on error
      setPosts(current => 
        current.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                engagement: { 
                  ...post.engagement, 
                  isSaved: !save,
                  saves: !save ? (post.engagement.saves || 0) + 1 : Math.max(0, (post.engagement.saves || 0) - 1)
                } 
              }
            : post
        )
      );
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await apiService.deletePost(postId);
      // Remove post from UI immediately
      setPosts(current => current.filter(post => post.id !== postId));
      setTotal(current => current - 1);
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const handleFilterChange = (filter: FilterOptions) => {
    setCurrentFilter(filter);
    setPage(0);
    setLoading(true);
  };

  const handleMentionClick = (agent: string) => {
    setCurrentFilter({ type: 'agent', agent });
    setPage(0);
    setLoading(true);
  };

  const handleHashtagClick = (hashtag: string) => {
    setCurrentFilter({ type: 'hashtag', hashtag });
    setPage(0);
    setLoading(true);
  };

  const handleSuggestionsRequest = async (type: 'agents' | 'hashtags', query: string) => {
    setSuggestionsLoading(true);
    try {
      const suggestions = await apiService.getFilterSuggestions(type, query, 10);
      // Update filter data with new suggestions - extract just the values
      if (type === 'agents') {
        const agentNames = suggestions.map(s => s.value);
        setFilterData(prev => ({
          ...prev,
          agents: [...new Set([...prev.agents, ...agentNames])]
        }));
      } else {
        const hashtagNames = suggestions.map(s => s.value);
        setFilterData(prev => ({
          ...prev,
          hashtags: [...new Set([...prev.hashtags, ...hashtagNames])]
        }));
      }
    } catch (error) {
      console.error(`Failed to get ${type} suggestions:`, error);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Update posts when filter changes
  useEffect(() => {
    console.log('🔄 RealSocialMediaFeed: Filter changed, reloading posts', currentFilter);
    setLoading(true);
    loadPosts(0);
  }, [currentFilter, loadPosts]);

  const togglePostExpansion = (postId: string) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const toggleComments = async (postId: string) => {
    const isCurrentlyShown = showComments[postId];
    
    if (!isCurrentlyShown) {
      // Load comments when opening
      if (!postComments[postId]) {
        await loadComments(postId);
      }
    }
    
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const loadComments = async (postId: string, refresh = false) => {
    if (loadingComments[postId] && !refresh) return;
    
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const sortOptions = commentSort[postId] || { field: 'createdAt', direction: 'asc' };
      const comments = await apiService.getPostComments(postId, {
        sort: sortOptions.field,
        direction: sortOptions.direction,
        userId: userId
      });
      setPostComments(prev => ({ ...prev, [postId]: comments }));
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleNewComment = async (postId: string, content: string, parentId?: string) => {
    try {
      console.log('Creating comment:', { postId, content, parentId });
      
      const result = await apiService.createComment(postId, content, {
        parentId,
        author: 'ProductionValidator', // Use consistent agent name
        mentionedUsers: extractMentions(content)
      });
      
      console.log('Comment created successfully:', result);
      
      // Refresh comments after adding new one
      await loadComments(postId, true);
      
      // Update engagement count optimistically
      setPosts(current => 
        current.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                engagement: { 
                  ...post.engagement, 
                  comments: (post.engagement.comments || 0) + 1
                } 
              }
            : post
        )
      );
      
      // Hide comment form after successful submission
      setShowCommentForm(prev => ({ ...prev, [postId]: false }));
    } catch (error) {
      console.error('Failed to create comment:', error);
      alert('Failed to post analysis. Please try again.');
      throw error;
    }
  };

  const handleCommentSort = (postId: string, sort: {field: 'createdAt' | 'likes' | 'replies' | 'controversial', direction: 'asc' | 'desc'}) => {
    setCommentSort(prev => ({ ...prev, [postId]: sort }));
    loadComments(postId, true);
  };

  const calculatePostMetrics = (content: string): PostMetrics => {
    const characterCount = content.length;
    const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 WPM average
    
    return { characterCount, wordCount, readingTime };
  };

  const getHookContent = (content: string): string => {
    // Smart extraction that preserves URLs - use simple splitting first
    const sentences = content.split(/(?<=[.!?])\s+/);
    
    if (sentences.length === 0) return content;
    
    let hookContent = sentences[0];
    
    // Create fresh regex to avoid state issues
    const urlRegex = new RegExp('(https?:\\/\\/[^\\s<>"{}|\\\\^`\\[\\]]+)', 'i');
    const hasUrl = urlRegex.test(hookContent);
    
    if (hasUrl) {
      // If there's a URL in the first sentence, include it fully
      return hookContent;
    } else {
      // Try to find a sentence with URL in the first few sentences
      for (let i = 1; i < Math.min(3, sentences.length); i++) {
        const sentence = sentences[i];
        // Create fresh regex for each test
        const testRegex = new RegExp('(https?:\\/\\/[^\\s<>"{}|\\\\^`\\[\\]]+)', 'i');
        if (testRegex.test(sentence)) {
          hookContent += ' ' + sentence;
          break;
        }
      }
    }
    
    // If still too long, truncate but keep URLs intact
    if (hookContent.length > 300) {
      const globalUrlRegex = new RegExp('(https?:\\/\\/[^\\s<>"{}|\\\\^`\\[\\]]+)', 'g');
      const urls = hookContent.match(globalUrlRegex) || [];
      
      if (urls.length > 0) {
        // Try to keep the first URL and some surrounding context
        const firstUrlIndex = hookContent.indexOf(urls[0]);
        const beforeUrl = hookContent.substring(0, firstUrlIndex).trim();
        const afterUrl = hookContent.substring(firstUrlIndex + urls[0].length).trim();
        
        // Keep reasonable context around the URL
        const maxBeforeLength = 100;
        const maxAfterLength = 100;
        
        let finalBefore = beforeUrl.length > maxBeforeLength 
          ? '...' + beforeUrl.substring(beforeUrl.length - maxBeforeLength) 
          : beforeUrl;
          
        let finalAfter = afterUrl.length > maxAfterLength 
          ? afterUrl.substring(0, maxAfterLength) + '...' 
          : afterUrl;
        
        const result = `${finalBefore} ${urls[0]} ${finalAfter}`.trim();
        return result;
      }
    }
    
    return hookContent;
  };

  const truncateContent = (content: string, maxLength: number = 300): { truncated: string; isTruncated: boolean } => {
    if (content.length <= maxLength) {
      return { truncated: content, isTruncated: false };
    }
    
    // Find the last complete word before the limit
    const truncated = content.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    const finalTruncated = lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) : truncated;
    
    return { truncated: finalTruncated + '...', isTruncated: true };
  };

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await loadPosts(nextPage, true);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getBusinessImpactColor = (impact: number) => {
    if (impact >= 80) return 'text-green-600';
    if (impact >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  console.log('🎨 RealSocialMediaFeed RENDER:', { 
    loading, 
    error, 
    postsLength: posts?.length,
    postsType: typeof posts,
    postsIsArray: Array.isArray(posts),
    firstPostId: posts?.[0]?.id 
  });

  if (loading) {
    console.log('🎨 Rendering loading state');
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Loading real post data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto ${className}`} data-testid="social-media-feed">
      {/* Header */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Agent Feed</h2>
            <p className="text-gray-600 mt-1">
              Real-time posts from production agents
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        
        {/* Filter Panel */}
        <FilterPanel
          currentFilter={currentFilter}
          availableAgents={filterData.agents}
          availableHashtags={filterData.hashtags}
          onFilterChange={handleFilterChange}
          postCount={total}
          onSuggestionsRequest={handleSuggestionsRequest}
          suggestionsLoading={suggestionsLoading}
          savedPostsCount={filterStats?.savedPosts || 0}
          myPostsCount={filterStats?.myPosts || 0}
          userId={userId}
        />

        {/* Enhanced Posting Interface - 3 Sections: Post, Quick Post, Avi DM */}
        <EnhancedPostingInterface 
          onPostCreated={handlePostCreated}
          className="mt-4"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-6" data-testid="post-list">
        {(() => {
          console.log('🎨 About to render posts:', { 
            postsExists: !!posts,
            postsLength: posts?.length,
            postsType: typeof posts,
            isArray: Array.isArray(posts)
          });
          return (posts || []).map((post, index) => {
            console.log('🎨 Rendering post', index, ':', { 
              id: post?.id, 
              title: post?.title?.substring(0, 50) 
            });
            
            const isExpanded = expandedPosts[post.id] || false;
            const postMetrics = calculatePostMetrics(post.content || '');
            const { truncated, isTruncated } = truncateContent(post.content || '');
            
            return (
          <article key={post.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ease-in-out overflow-hidden" data-testid="post-card">
            <div className="p-6">
              {!isExpanded ? (
                // Collapsed View - Multi-line layout
                <div className="space-y-3">
                  {/* Line 1: Avatar and Title */}
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">
                      {(post.authorAgent || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h2 className="text-lg font-bold text-gray-900 leading-tight">{post.title}</h2>
                    </div>
                    {/* Expand Button - Always show */}
                    <button 
                      onClick={() => togglePostExpansion(post.id)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                      aria-label="Expand post"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Line 2: Full Hook with Parsing */}
                  <div className="pl-14">
                    <div className="text-sm text-gray-600 leading-relaxed">
                      {renderParsedContent(parseContent(getHookContent(post.content)), {
                        onMentionClick: handleMentionClick,
                        onHashtagClick: handleHashtagClick,
                        enableLinkPreviews: true,
                        useEnhancedPreviews: true,
                        previewDisplayMode: 'thumbnail-summary',
                        showThumbnailsOnly: false
                      })}
                    </div>
                  </div>
                  
                  {/* Line 3: Metrics */}
                  <div className="pl-14 flex items-center space-x-6">
                    {/* Reading Time */}
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{postMetrics.readingTime} min read</span>
                    </div>
                    
                    {/* Business Impact */}
                    {post.metadata?.businessImpact && (
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span className={`font-medium ${getBusinessImpactColor(post.metadata.businessImpact)}`}>
                          {post.metadata.businessImpact}% impact
                        </span>
                      </div>
                    )}
                    
                    {/* Agent */}
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <svg className="w-3 h-3 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>by {post.authorAgent}</span>
                    </div>
                  </div>
                </div>
              ) : (
                // Expanded View - Full post layout
                <>
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-4 shadow-md">
                        {(post.authorAgent || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{post.authorAgent}</h3>
                        <div className="flex items-center text-gray-500 text-sm space-x-2">
                          <span>{formatTimeAgo(post.publishedAt)}</span>
                          <span>•</span>
                          <span>{postMetrics.readingTime} min read</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => togglePostExpansion(post.id)}
                      className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="Collapse post"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Post Title */}
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{post.title}</h2>

                  {/* Post Content with Parsing */}
                  <div className="prose prose-sm max-w-none mb-4">
                    <div className="text-gray-700 leading-relaxed">
                      {renderParsedContent(parseContent(post.content), {
                        onMentionClick: handleMentionClick,
                        onHashtagClick: handleHashtagClick,
                        enableLinkPreviews: true,
                        useEnhancedPreviews: true,
                        previewDisplayMode: 'card',
                        showThumbnailsOnly: false,
                        className: 'space-y-2'
                      })}
                    </div>
                  </div>

                  {/* Full Metrics Container */}
                  <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {/* Characters */}
                      <div className="flex items-center space-x-2 text-gray-700">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium">{postMetrics.characterCount}</span>
                        <span className="text-gray-500">chars</span>
                      </div>
                      
                      {/* Words */}
                      <div className="flex items-center space-x-2 text-gray-700">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <span className="font-medium">{postMetrics.wordCount}</span>
                        <span className="text-gray-500">words</span>
                      </div>
                      
                      {/* Reading Time */}
                      <div className="flex items-center space-x-2 text-gray-700">
                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{postMetrics.readingTime}</span>
                        <span className="text-gray-500">min read</span>
                      </div>
                      
                      {/* Length */}
                      <div className="flex items-center space-x-2 text-gray-700">
                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          postMetrics.characterCount > 1000 
                            ? 'bg-red-100 text-red-700' 
                            : postMetrics.characterCount > 500 
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                        }`}>
                          {postMetrics.characterCount > 1000 ? 'Long' : postMetrics.characterCount > 500 ? 'Medium' : 'Short'}
                        </span>
                      </div>
                      
                      {/* Business Impact */}
                      {post.metadata?.businessImpact && (
                        <div className="flex items-center space-x-2 text-gray-700">
                          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          <span className={`font-medium ${getBusinessImpactColor(post.metadata.businessImpact)}`}>
                            {post.metadata.businessImpact}%
                          </span>
                          <span className="text-gray-500">impact</span>
                        </div>
                      )}
                      
                      {/* Who Responded */}
                      <div className="flex items-center space-x-2 text-gray-700">
                        <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium">{post.authorAgent}</span>
                        <span className="text-gray-500">agent</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Post Actions */}
              <div className="border-t border-gray-100 py-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    
                    {/* Comments */}
                    <button 
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-blue-500 transition-colors"
                      title="View Comments"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{post.engagement?.comments || 0}</span>
                    </button>
                    
                    {/* Saves count display */}
                    {post.engagement?.saves && post.engagement.saves > 0 && (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Bookmark className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">{post.engagement.saves} saved</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Post Actions - Integrated */}
                  <div className="flex items-center space-x-4">
                    <div className="text-xs text-gray-500">
                      ID: {post.id.slice(0, 8)}...
                    </div>
                    
                    {/* Save Button with Animation */}
                    <button
                      onClick={() => handleSave(post.id, !post.engagement?.isSaved)}
                      className={`flex items-center space-x-1 transition-colors transform hover:scale-105 ${
                        post.engagement?.isSaved 
                          ? 'text-blue-600 hover:text-blue-700' 
                          : 'text-gray-600 hover:text-blue-600'
                      }`}
                      title={post.engagement?.isSaved ? 'Unsave Post' : 'Save Post'}
                    >
                      <Bookmark 
                        className={`w-4 h-4 transition-all ${
                          post.engagement?.isSaved 
                            ? 'fill-blue-500 text-blue-500 scale-110' 
                            : 'hover:fill-blue-100'
                        }`} 
                      />
                      <span className="text-xs font-medium">
                        {post.engagement?.isSaved ? 'Saved' : 'Save'}
                        {post.engagement?.saves && post.engagement.saves > 0 && (
                          <span className="ml-1 text-gray-500">({post.engagement.saves})</span>
                        )}
                      </span>
                    </button>
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors"
                      title="Delete Post"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-xs">Delete</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Metadata */}
              {post.metadata && (isTruncated ? isExpanded : true) && (
                <div className={`transition-all duration-300 ease-in-out ${
                  isExpanded || !isTruncated ? 'opacity-100 max-h-screen' : 'opacity-75 max-h-32 overflow-hidden'
                }`}>
                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">Tags</div>
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag, index) => (
                          <span
                            key={index}
                            onClick={() => {
                              setCurrentFilter({ 
                                type: 'hashtag',
                                hashtag: tag
                              });
                              setPage(0);
                            }}
                            className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 text-sm rounded-full font-medium hover:from-blue-200 hover:to-purple-200 transition-colors cursor-pointer"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Comments Section */}
              {showComments[post.id] && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-700">
                        Comments ({Math.floor(parseFloat(post.engagement?.comments) || 0)})
                      </h4>
                      <button
                        onClick={() => {
                          console.log('🔥 REAL SOCIAL FEED: Add Comment button clicked for post', post.id);
                          setShowCommentForm(prev => ({ ...prev, [post.id]: !prev[post.id] }));
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        {showCommentForm[post.id] ? 'Cancel' : 'Add Comment'}
                      </button>
                    </div>
                    
                    {/* Agent Comment Form */}
                    {showCommentForm[post.id] && (
                      console.log('🔥 REAL SOCIAL FEED: Comment form rendering for post', post.id),
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Agent Response</span>
                          </div>
                          <MentionInput
                            value={commentFormContent[post.id] || ''}
                            onChange={(content) => {
                              console.log('🎯 REAL SOCIAL FEED: Comment content changed:', content);
                              setCommentFormContent(prev => ({ ...prev, [post.id]: content }));
                            }}
                            onMentionSelect={(mention) => {
                              console.log('🎯 REAL SOCIAL FEED: Mention selected in comment:', mention);
                            }}
                            placeholder="Provide technical analysis or feedback... Use @ to mention agents or users"
                            className="w-full p-3 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                            rows={4}
                            maxLength={2000}
                            mentionContext="comment"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                const content = commentFormContent[post.id];
                                if (content?.trim()) {
                                  handleNewComment(post.id, content.trim());
                                  setCommentFormContent(prev => ({ ...prev, [post.id]: '' }));
                                }
                              }
                            }}
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Professional technical discussion • Ctrl+Enter to post</span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setShowCommentForm(prev => ({ ...prev, [post.id]: false }))}
                                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={(e) => {
                                  const content = commentFormContent[post.id]?.trim();
                                  if (content) {
                                    handleNewComment(post.id, content);
                                    setCommentFormContent(prev => ({ ...prev, [post.id]: '' }));
                                  }
                                }}
                                className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                Post Analysis
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {loadingComments[post.id] ? (
                      <div className="text-center py-4">
                        <div className="inline-flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-gray-500">Loading comments...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {postComments[post.id] && postComments[post.id].length > 0 ? (
                          <CommentThread
                            postId={post.id}
                            comments={postComments[post.id]}
                            currentUser={userId}
                            maxDepth={6}
                            sort={commentSort[post.id] || { field: 'createdAt', direction: 'asc' }}
                            onCommentsUpdate={() => loadComments(post.id, true)}
                            onSortChange={(sort) => handleCommentSort(post.id, sort)}
                            enableRealTime={true}
                            className="bg-white rounded-lg"
                          />
                        ) : (
                          <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-lg">
                            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No technical analysis yet.</p>
                            <button
                              onClick={() => setShowCommentForm(prev => ({ ...prev, [post.id]: true }))}
                              className="text-blue-600 hover:text-blue-700 font-medium mt-2 transition-colors"
                            >
                              Provide technical analysis
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </article>
            );
          });
        })()}
      </div>

      {/* Load More */}
      {(posts || []).length < total && (
        <div className="text-center mt-8">
          <button
            onClick={handleLoadMore}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load More Posts ({(posts || []).length} of {total})
          </button>
        </div>
      )}

      {/* Empty State */}
      {(!posts || posts.length === 0) && !loading && (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
          <p className="text-gray-500 mb-4">
            No posts have been created by agents yet.
          </p>
        </div>
      )}

      {/* Connection Status */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          Live database feed active
        </div>
      </div>
    </div>
  );
};

export default RealSocialMediaFeed;
export { RealSocialMediaFeed };