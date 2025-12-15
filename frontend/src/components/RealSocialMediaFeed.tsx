import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, MessageCircle, AlertCircle, ChevronDown, ChevronUp, User, Bookmark, Trash2, Plus, Edit3, Search, Sparkles, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import { AgentPost, ApiResponse, FilterStats } from '../types/api';
import { debugLog, DEBUG_PILLS } from '../utils/debugLogger';
import FilterPanel, { FilterOptions } from './FilterPanel';
import { renderParsedContent, parseContent, extractHashtags, extractMentions } from '../utils/contentParser';
import ThreadedCommentSystem from './ThreadedCommentSystem';
import { CommentThread, CommentProcessingState } from './CommentThread';
import { CommentForm } from './CommentForm';
import { MentionInput } from './MentionInput';
import { PostCreator } from './PostCreator';
import { EnhancedPostingInterface } from './EnhancedPostingInterface';
import { UserDisplayName } from './UserDisplayName';
import { AuthorDisplayName } from './AuthorDisplayName';
import { formatRelativeTime, formatExactDateTime } from '../utils/timeUtils';
import { useRelativeTime } from '../hooks/useRelativeTime';
import { TicketStatusBadge } from './TicketStatusBadge';
import { useTicketUpdates } from '../hooks/useTicketUpdates';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import { useUser } from '../contexts/UserContext';
import { IntroductionPrompt } from './IntroductionPrompt';
// import '../styles/comments.css'; // Moved to _app.tsx

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
  // Get current user from context
  const { userId } = useUser();

  // Initialize toast notifications
  const toast = useToast();

  // Enable real-time ticket status updates via WebSocket
  useTicketUpdates({
    showNotifications: true,
    toast: {
      success: (msg) => toast.showSuccess(msg),
      error: (msg) => toast.showError(msg),
      info: (msg) => toast.showInfo(msg)
    }
  });

  // Utility function: Safely extract agent name from authorAgent (string or object)
  const getAuthorAgentName = (authorAgent: any): string => {
    if (typeof authorAgent === 'string') {
      return authorAgent;
    }
    if (authorAgent && typeof authorAgent === 'object' && authorAgent.name) {
      return authorAgent.name;
    }
    return 'A'; // Fallback
  };

  // Agent display name mapping
  const AGENT_DISPLAY_NAMES: Record<string, string> = {
    'lambda-vi': 'Λvi',
    'get-to-know-you-agent': 'Get-to-Know-You',
    'anonymous': 'Λvi', // Backend uses 'anonymous' for Avi
    'system': 'Λvi' // Legacy 'system' posts now display as Λvi
  };

  // Get display-friendly agent name (maps agent IDs to readable names)
  const getAgentDisplayName = (authorAgent: string): string => {
    return AGENT_DISPLAY_NAMES[authorAgent] || authorAgent;
  };

  /**
   * Get avatar letter for agent with special mappings
   * Handles undefined/null/empty authorAgent gracefully
   */
  const getAgentAvatarLetter = (authorAgent: string): string => {
    const avatarMap: Record<string, string> = {
      'lambda-vi': 'Λ',
      'get-to-know-you-agent': 'G',
      'anonymous': 'Λ', // Backend uses 'anonymous' for Avi
      'system': 'Λ' // Legacy 'system' posts display as Λvi
    };

    // Handle undefined, null, or empty string
    if (!authorAgent || typeof authorAgent !== 'string' || authorAgent.trim() === '') {
      return '?'; // Default fallback for unknown agents
    }

    return avatarMap[authorAgent] || authorAgent.charAt(0).toUpperCase();
  };

  /**
   * 🔧 FIX: Get avatar initial for USER posts using display_name
   * Issue: User avatars were showing "A" instead of "D" because getUserAvatarInitial()
   * was checking post.author (which is "user"), but display_name comes from backend JOIN
   */
  const getUserAvatarInitial = (post: AgentPost): string => {
    // display_name now comes from backend LEFT JOIN user_settings
    if (post.display_name && post.display_name.trim() !== '') {
      return post.display_name.charAt(0).toUpperCase();
    }

    // Fallback: use author if it's not generic "user"
    if (post.author && post.author !== 'user' && !post.author.includes('agent-')) {
      return post.author.charAt(0).toUpperCase();
    }

    // Final fallback
    return 'U';
  };

  /**
   * 🔧 FIX: Determine if post is from a user or an agent
   */
  const isUserPost = (post: AgentPost): boolean => {
    // Check if post has a user_id and either no authorAgent or authorAgent is empty
    return !!(post.user_id && (!post.authorAgent || post.authorAgent.trim() === ''));
  };

  // Utility function: Parse engagement data if it's a JSON string
  const parseEngagement = (engagement: any): any => {
    if (!engagement) return { comments: 0, likes: 0, shares: 0, views: 0 };
    if (typeof engagement === 'string') {
      try {
        return JSON.parse(engagement);
      } catch (e) {
        console.error('Failed to parse engagement data:', e);
        return { comments: 0, likes: 0, shares: 0, views: 0 };
      }
    }
    return engagement;
  };

  // Utility function: Get comment count from post (handles both root level and engagement)
  const getCommentCount = (post: AgentPost): number => {
    // Priority: root-level comments > engagement.comments > 0
    if (typeof post.comments === 'number') {
      return post.comments;
    }

    const engagement = parseEngagement(post.engagement);
    if (engagement && typeof engagement.comments === 'number') {
      return engagement.comments;
    }

    return 0;
  };

  // Helper function: Determine overall ticket status from ticket data
  const getOverallStatus = (ticketStatus: any): 'pending' | 'processing' | 'completed' | 'failed' | null => {
    if (!ticketStatus || ticketStatus.total === 0) return null;

    // Log status determination for debugging
    console.log('[RealSocialMediaFeed] getOverallStatus input:', {
      total: ticketStatus.total,
      pending: ticketStatus.pending,
      processing: ticketStatus.processing,
      completed: ticketStatus.completed,
      failed: ticketStatus.failed,
      agents: ticketStatus.agents
    });

    let result: 'pending' | 'processing' | 'completed' | 'failed' | null = null;

    if (ticketStatus.failed > 0) result = 'failed';
    else if (ticketStatus.processing > 0) result = 'processing';
    else if (ticketStatus.pending > 0) result = 'pending';
    else if (ticketStatus.completed > 0) result = 'completed';

    console.log('[RealSocialMediaFeed] getOverallStatus result:', result);
    return result;
  };

  // Core state - must be declared first, before any conditional returns
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
  const [processingComments, setProcessingComments] = useState<Set<string>>(new Set());
  const [commentStates, setCommentStates] = useState<Map<string, CommentProcessingState>>(new Map());
  const [currentFilter, setCurrentFilter] = useState<FilterOptions>({ type: 'all' });
  const [filterData, setFilterData] = useState<FilterData>({ agents: [], hashtags: [] });
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [filterStats, setFilterStats] = useState<FilterStats | null>(null);
  const [search, setSearch] = useState({
    query: '',
    loading: false,
    results: [] as AgentPost[],
    hasResults: false
  });
  const [isSearching, setIsSearching] = useState(false);

  // Auto-update relative timestamps every 60 seconds
  useRelativeTime(60000);

  // UI functionality removed - state variables cleaned up

  const limit = 20;

  // UI functionality removed - function cleaned up

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.query.trim()) {
        performSearch(search.query);
      } else {
        // Empty query - reset to filtered posts
        setIsSearching(false);
        setSearch(prev => ({ ...prev, results: [], hasResults: false }));
        if (!search.query) {
          loadPosts(0, false);
        }
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [search.query]);

  // Search API function
  const performSearch = async (query: string) => {
    console.log('🔍 Performing search:', query);

    setSearch(prev => ({ ...prev, loading: true }));
    setIsSearching(true);

    try {
      // Call search API (simplified signature)
      const response = await apiService.searchPosts(query, limit, 0);

      if (response.success && response.data) {
        const searchResults = response.data.items || [];
        setPosts(searchResults);
        setTotal(response.data.total || 0);
        setPage(0); // Reset to first page

        setSearch(prev => ({
          ...prev,
          loading: false,
          results: searchResults,
          hasResults: searchResults.length > 0
        }));
      }
    } catch (err) {
      console.error('❌ Search failed:', err);
      setSearch(prev => ({ ...prev, loading: false }));
      setError('Search failed. Please try again.');
    }
  };

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

      // Detect mock data
      if (response.meta?.source === 'mock') {
        console.error('⚠️ API returned MOCK DATA - refusing to update posts');
        setError('Server returned mock data instead of real database. Please refresh.');
        return; // ABORT! Don't update posts with mock data
      }

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
  }, [limit, currentFilter]);

  // Handle post creation with smart merging
  const handlePostCreated = useCallback((newPost: any) => {
    // Add post optimistically
    setPosts(current => [newPost, ...current]);

    // Smarter refresh: merge instead of replace
    setTimeout(async () => {
      try {
        const response = await apiService.getAgentPosts(limit, 0);

        // Check for mock data
        if (response.meta?.source === 'mock') {
          console.warn('⚠️ Skipping post refresh - got mock data');
          return; // Keep optimistic update
        }

        // Merge: keep optimistic post if not in server response
        const serverPosts = response.data || [];
        const hasOurPost = serverPosts.some(p => p.id === newPost.id);

        if (hasOurPost) {
          // Server has it, trust server
          setPosts(serverPosts);
        } else {
          // Server doesn't have it yet, keep our optimistic version at top
          const nonDuplicates = serverPosts.filter(p => p.id !== newPost.id);
          setPosts([newPost, ...nonDuplicates]);
        }
      } catch (error) {
        console.error('Post refresh failed:', error);
        // Keep optimistic update on error
      }
    }, 1000);
  }, [limit]);

  // Real-time updates via WebSocket and filter data loading
  useEffect(() => {
    console.log('🔄 RealSocialMediaFeed: Initial useEffect triggered');
    console.log('🔌 [RealSocialMediaFeed] Setting up WebSocket event listeners');
    // FIX: Parallelize initial data loading for faster startup
    Promise.all([loadPosts(0), loadFilterData()]).catch(err => {
      console.error('[RealSocialMediaFeed] Initial load error:', err);
    });

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

    // Listen for real-time comment updates via WebSocket
    const handleCommentUpdate = (data: any) => {
      console.log('💬 Comment update received:', data);

      if (data.postId || data.post_id) {
        const postId = data.postId || data.post_id;

        setPosts(current =>
          current.map(post => {
            if (post.id === postId) {
              const currentEngagement = parseEngagement(post.engagement);
              return {
                ...post,
                engagement: {
                  ...currentEngagement,
                  comments: (currentEngagement.comments || 0) + 1
                }
              };
            }
            return post;
          })
        );

        // ✅ Refresh comments if this post's comments are visible
        if (showComments[postId]) {
          loadComments(postId, true); // Force refresh
        }
      }
    };

    // NEW: Listen for ticket status updates via custom browser events
    // This bridges WebSocket events from useTicketUpdates to component state
    // Debounced to prevent excessive API refetches on rapid events
    let lastRefetch = 0;
    const DEBOUNCE_MS = 500;

    const handleTicketStatusUpdate = (event: any) => {
      const data = event.detail;
      console.log('🎫 [RealSocialMediaFeed] Ticket status update event received:', {
        post_id: data.post_id,
        ticket_id: data.ticket_id,
        status: data.status,
        agent_id: data.agent_id,
        timestamp: data.timestamp,
        error: data.error
      });

      // Debounce: Don't refetch if we just did
      const now = Date.now();
      if (now - lastRefetch < DEBOUNCE_MS) {
        console.log('🎫 [RealSocialMediaFeed] Debouncing refetch (too soon), last refetch was', now - lastRefetch, 'ms ago');
        return;
      }

      lastRefetch = now;

      // Refetch posts to get updated ticket_status from server
      // Note: Always refetch page 0 to get latest data since we're in a stale closure
      console.log('🎫 [RealSocialMediaFeed] Refetching posts for updated badge data (status:', data.status, ')');
      loadPosts(0, false);
    };

    apiService.on('posts_updated', handlePostsUpdate);
    window.addEventListener('ticket:status:update', handleTicketStatusUpdate);

    return () => {
      apiService.off('posts_updated', handlePostsUpdate);
      window.removeEventListener('ticket:status:update', handleTicketStatusUpdate);
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
        const matchesSaved = !hasSavedFilter || post.engagement?.isSaved === true;
        const matchesMyPosts = !hasMyPostsFilter || post.authorAgent === userId;

        // Apply combination mode (AND/OR logic)
        if (filter.combinationMode === 'OR') {
          return matchesAgent || matchesHashtag || matchesSaved || matchesMyPosts;
        } else { // AND logic (default)
          return matchesAgent && matchesHashtag && matchesSaved && matchesMyPosts;
        }
      case 'saved':
        return post.engagement?.isSaved === true;
      case 'myposts':
        // Filter posts by current user
        return post.authorAgent === userId;
      default:
        return true;
    }
  }, []);

  // Fix 2: Fix Refresh Button Handler
  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      console.log('🔄 Refreshing feed...');

      // Reset page and reload posts
      setPage(0);
      await loadPosts(0);

      console.log('✅ Feed refreshed successfully');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
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
                  saves: save ? (post.engagement?.saves || 0) + 1 : Math.max(0, (post.engagement?.saves || 0) - 1)
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
                  saves: !save ? (post.engagement?.saves || 0) + 1 : Math.max(0, (post.engagement?.saves || 0) - 1)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilter]);

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

  const loadComments = useCallback(async (postId: string, refresh = false) => {
    console.log('[RealSocialMediaFeed] loadComments called:', { postId, refresh });
    if (loadingComments[postId] && !refresh) {
      console.log('[RealSocialMediaFeed] Skipping - already loading');
      return;
    }

    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const comments = await apiService.getPostComments(postId, { userId });
      console.log('[RealSocialMediaFeed] Comments loaded:', { postId, count: comments.length });
      setPostComments(prev => ({ ...prev, [postId]: comments }));
    } catch (error) {
      console.error('[RealSocialMediaFeed] Failed to load comments:', error);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  }, [userId, loadingComments]);

  // STALE CLOSURE FIX: Use ref to avoid stale closure in event handlers
  // When loadComments changes, the useEffect would re-register with old references
  const loadCommentsRef = useRef(loadComments);
  useEffect(() => { loadCommentsRef.current = loadComments; }, [loadComments]);

  // Separate effect for comment:created with proper dependencies
  // CRITICAL: DO NOT include loadComments in deps - use ref instead to avoid stale closure
  useEffect(() => {
    const handleCommentCreated = (data: any) => {
      console.log('[RealSocialMediaFeed] 📬 comment:created received:', data);
      const postId = data.postId || data.post_id;
      if (!postId) return;

      // SPARC FIX: ALWAYS update engagement count (even when collapsed)
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const engagement = parseEngagement(post.engagement);
          return {
            ...post,
            engagement: {
              ...engagement,
              comments: (engagement.comments || 0) + 1
            }
          };
        }
        return post;
      }));

      // PILL FIX: DON'T immediately reload comments - this kills the pill!
      // The optimistic update in handleNewComment adds the comment with pill state
      // If we reload here, the server response replaces it before pill renders
      // Instead, delay reload to let pill be visible first
      if (showComments[postId]) {
        console.log('[RealSocialMediaFeed] 🔄 DELAYING comment reload to preserve pill:', postId);
        // STALE CLOSURE FIX: Use ref.current instead of direct reference
        // PILL FIX: Delay by 3000ms to let pill render and be visible
        setTimeout(() => {
          console.log('[RealSocialMediaFeed] 🔄 Now reloading comments after delay:', postId);
          loadCommentsRef.current(postId, true);
        }, 3000);
      } else {
        // FIX: Clear cached comments so they'll be reloaded when section opens
        console.log('[RealSocialMediaFeed] 📝 Clearing cached comments for:', postId);
        setPostComments(prev => {
          const updated = { ...prev };
          delete updated[postId];
          return updated;
        });
      }
    };

    apiService.on('comment:created', handleCommentCreated);

    return () => {
      apiService.off('comment:created', handleCommentCreated);
    };
  }, [showComments]); // STALE CLOSURE FIX: Removed loadComments from deps

  const handleNewComment = async (postId: string, content: string, parentId?: string) => {
    // Generate temporary comment ID for tracking processing state
    const tempCommentId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      console.log('Creating comment:', { postId, content, parentId });

      // PILL FIX: Add temp ID to processingComments for immediate pill display
      setProcessingComments(prev => new Set(prev).add(tempCommentId));

      const result = await apiService.createComment(postId, content, {
        parentId,
        author: userId,
        author_user_id: userId,
        mentionedUsers: extractMentions(content)
      });

      console.log('Comment created successfully:', result);

      // PILL FIX: Add the ACTUAL comment ID to processingComments for pill rendering
      // CommentThread checks processingComments.has(comment.id) at line 245
      const actualCommentId = result?.data?.id || result?.id;
      const newComment = result?.data || result;

      if (actualCommentId) {
        setProcessingComments(prev => {
          const next = new Set(prev);
          next.delete(tempCommentId); // Remove temp ID
          next.add(actualCommentId);  // Add actual COMMENT ID (not POST ID!)
          return next;
        });

        // PILL FIX: Set initial state to 'waiting' for immediate pill display
        setCommentStates(prev => {
          const next = new Map(prev);
          next.set(actualCommentId, 'waiting');
          return next;
        });

        console.log('[PILL FIX] Added comment ID to processingComments AND commentStates:', actualCommentId);
      }

      // PILL FIX: Add the new comment to local state immediately (optimistic update)
      // This ensures the comment appears in the UI before the server confirms
      if (newComment && newComment.id) {
        setPostComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), newComment]
        }));
        console.log('[PILL FIX] Added comment to postComments optimistically:', newComment.id);
      }

      // PILL FIX: Delay the comment refresh to prevent race condition
      // The new comment is already in local state, this just syncs with server
      setTimeout(async () => {
        console.log('[PILL FIX] Delayed loadComments to let pills be visible');
        await loadComments(postId, true);
      }, 1000);

      // Update engagement count optimistically (parse engagement first)
      setPosts(current =>
        current.map(post => {
          if (post.id === postId) {
            const currentEngagement = parseEngagement(post.engagement);
            return {
              ...post,
              engagement: {
                ...currentEngagement,
                comments: (currentEngagement.comments || 0) + 1
              }
            };
          }
          return post;
        })
      );

      // PILL FIX: Keep comment ID in processingComments until agent responds
      // The comment:state:complete event will remove it later
      // DO NOT remove here - let the WebSocket event lifecycle handle removal

      // Hide comment form after successful submission (moved after processing state removal)
      setShowCommentForm(prev => ({ ...prev, [postId]: false }));
    } catch (error) {
      console.error('Failed to create comment:', error);
      alert('Failed to post analysis. Please try again.');

      // Remove from processing state on error
      setProcessingComments(prev => {
        const next = new Set(prev);
        next.delete(tempCommentId);
        return next;
      });

      throw error;
    }
  };

  // Handle quick response from introduction prompt
  const handleQuickResponse = useCallback(async (postId: string, response: string) => {
    try {
      // Create a comment with the quick response
      await apiService.createComment(postId, response, {
        author: userId,
        author_user_id: userId
      });

      // Show success toast
      toast.showSuccess('Response sent!');

      // Refresh comments
      await loadComments(postId, true);

      // Auto-open comments to show the response
      setShowComments(prev => ({ ...prev, [postId]: true }));
    } catch (error) {
      console.error('Failed to send quick response:', error);
      toast.showError('Failed to send response. Please try again.');
    }
  }, [userId, toast]);

  const calculatePostMetrics = (content: string): PostMetrics => {
    const characterCount = content.length;
    const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 WPM average
    
    return { characterCount, wordCount, readingTime };
  };

  const getHookContent = (content: string, title?: string): string => {
    // If title provided, check if content starts with duplicate title
    if (title) {
      const lines = content.split('\n');
      let startIndex = 0;

      // Skip HTML comments
      while (startIndex < lines.length && lines[startIndex].trim().startsWith('<!--')) {
        startIndex++;
      }

      // Check if first non-comment line is markdown heading matching title
      if (startIndex < lines.length) {
        const firstLine = lines[startIndex].trim();
        // Remove markdown heading syntax (# ## ### etc)
        const cleanedLine = firstLine.replace(/^#+\s*/, '').trim();
        const cleanedTitle = title.trim();

        // If titles match, skip to next paragraph
        if (cleanedLine.toLowerCase() === cleanedTitle.toLowerCase()) {
          // Find first non-empty line after title
          startIndex++;
          while (startIndex < lines.length && lines[startIndex].trim() === '') {
            startIndex++;
          }
          // Reconstruct content starting from body
          content = lines.slice(startIndex).join('\n');
        }
      }
    }

    // Continue with existing URL handling logic
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
          <span className="text-gray-600 dark:text-gray-400">Loading real post data...</span>
        </div>
      </div>
    );
  }

  // UI functionality properly positioned after hooks declaration

  return (
    <>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed - Left Column */}
        <div className={`lg:col-span-2 ${className}`} data-testid="real-social-media-feed">
        {/* RESTRUCTURED HEADER WITH SEARCH */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          {/* Row 1: Title/Description + Refresh Button */}
          <div className="flex items-center justify-between mb-4">
            {/* Left: Title */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agent Feed</h2>
            </div>

            {/* Right: Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              title="Refresh feed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Row 2: Search Input Only */}
          <div className="flex items-center gap-4">
            {/* Search Input (Full width in this row) */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts by title, content, or author..."
                value={search.query}
                onChange={(e) => setSearch(prev => ({ ...prev, query: e.target.value }))}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                data-testid="search-input"
              />
              {search.loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              )}
            </div>
          </div>

          {/* Search Results Info */}
          {isSearching && search.query && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400" data-testid="search-results-info">
              {search.loading ? (
                'Searching...'
              ) : search.hasResults ? (
                `Found ${search.results.length} posts matching "${search.query}"`
              ) : (
                `No posts found matching "${search.query}"`
              )}
            </div>
          )}
        </div>

        {/* FilterPanel - Keep as separate component below header */}
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
              title: post?.title?.substring(0, 50),
              comments: post?.comments,
              hasCommentsField: 'comments' in (post || {}),
              engagement: post?.engagement
            });
            
            const isExpanded = expandedPosts[post.id] || false;
            const postMetrics = calculatePostMetrics(post.content || '');
            const { truncated, isTruncated } = truncateContent(post.content || '');

            // Check if this is an introduction post
            const isIntroductionPost = post.metadata?.isIntroduction ||
                                      post.metadata?.isSystemInitialization ||
                                      post.metadata?.welcomePostType === 'onboarding-phase1';

            // If this is an introduction post and not expanded, use the special IntroductionPrompt component
            if (isIntroductionPost && !isExpanded) {
              return (
                <IntroductionPrompt
                  key={post.id}
                  postId={post.id}
                  title={post.title}
                  content={post.content || ''}
                  agentName={getAgentDisplayName(post.authorAgent)}
                  agentId={post.authorAgent}
                  onQuickResponse={handleQuickResponse}
                  className="mb-6"
                />
              );
            }

            return (
          <article key={post.id} className={`bg-white dark:bg-gray-900 border ${isIntroductionPost ? 'border-blue-300 dark:border-blue-700 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-gray-200 dark:border-gray-700'} rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ease-in-out overflow-hidden`} data-testid="post-card">
            {/* Introduction badge for expanded view */}
            {isIntroductionPost && (
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-4 py-2 flex items-center space-x-2">
                <Sparkles className="w-3 h-3" />
                <span>Agent Introduction</span>
              </div>
            )}

            <div className="p-6">
              {!isExpanded ? (
                // Collapsed View - Multi-line layout
                <div className="space-y-3">
                  {/* Line 1: Avatar and Title */}
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">
                      {isUserPost(post) ? getUserAvatarInitial(post) : getAgentAvatarLetter(post.authorAgent)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">{post.title}</h2>
                    </div>
                    {/* Expand Button - Always show */}
                    <button
                      onClick={() => togglePostExpansion(post.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                      aria-label="Expand post"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Ticket Status Badge - Show if tickets exist */}
                  {post.ticket_status && post.ticket_status.total > 0 && (
                    <div className="pl-14">
                      {(() => {
                        const status = getOverallStatus(post.ticket_status);
                        console.log(`[RealSocialMediaFeed] Rendering badge for post ${post.id}:`, {
                          status,
                          ticket_status: post.ticket_status
                        });
                        return (
                          <TicketStatusBadge
                            status={status}
                            agents={post.ticket_status.agents || []}
                            count={post.ticket_status.total}
                          />
                        );
                      })()}
                    </div>
                  )}

                  {/* Line 2: Constrained Hook Preview with CSS Line Clamp */}
                  <div className="pl-14">
                    <div
                      className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed overflow-hidden cursor-pointer"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        maxHeight: '4.5rem' /* 3 lines at 1.5rem line-height */
                      }}
                      onClick={() => togglePostExpansion(post.id)}
                    >
                      {renderParsedContent(parseContent(getHookContent(post.content, post.title)), {
                        onMentionClick: handleMentionClick,
                        onHashtagClick: handleHashtagClick,
                        enableLinkPreviews: true,
                        useEnhancedPreviews: true,
                        previewDisplayMode: 'thumbnail-summary',
                        showThumbnailsOnly: false,
                        enableMarkdown: true // Enable markdown rendering
                      })}
                    </div>

                  </div>

                  {/* Line 3: Metrics */}
                  <div className="pl-14 flex items-center space-x-6 mt-4 !mb-4">
                    {/* Time (Relative with Tooltip) */}
                    <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                      <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span
                        className="cursor-help"
                        title={formatExactDateTime(post.created_at || post.publishedAt)}
                      >
                        {formatRelativeTime(post.created_at || post.publishedAt)}
                      </span>
                    </div>

                    {/* Reading Time */}
                    <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>•</span>
                      <span>{postMetrics.readingTime} min read</span>
                    </div>

                    {/* Agent */}
                    <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>•</span>
                      <span>by <AuthorDisplayName authorId={post.authorAgent} /></span>
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
                        {getAgentAvatarLetter(post.authorAgent)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg"><AuthorDisplayName authorId={post.authorAgent} /></h3>
                        <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm space-x-2">
                          <span
                            className="cursor-help"
                            title={formatExactDateTime(post.created_at || post.publishedAt)}
                          >
                            {formatRelativeTime(post.created_at || post.publishedAt)}
                          </span>
                          <span>•</span>
                          <span>{postMetrics.readingTime} min read</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => togglePostExpansion(post.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label="Collapse post"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Ticket Status Badge - Show if tickets exist */}
                  {post.ticket_status && post.ticket_status.total > 0 && (
                    <div className="mb-4">
                      {(() => {
                        const status = getOverallStatus(post.ticket_status);
                        console.log(`[RealSocialMediaFeed] Rendering expanded badge for post ${post.id}:`, {
                          status,
                          ticket_status: post.ticket_status
                        });
                        return (
                          <TicketStatusBadge
                            status={status}
                            agents={post.ticket_status.agents || []}
                            count={post.ticket_status.total}
                          />
                        );
                      })()}
                    </div>
                  )}

                  {/* Post Content with Parsing */}
                  <div className="prose prose-sm max-w-none mb-4">
                    <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {renderParsedContent(parseContent(post.content), {
                        onMentionClick: handleMentionClick,
                        onHashtagClick: handleHashtagClick,
                        enableLinkPreviews: true,
                        useEnhancedPreviews: true,
                        previewDisplayMode: 'card',
                        showThumbnailsOnly: false,
                        className: 'space-y-2',
                        enableMarkdown: true // Enable markdown rendering
                      })}
                    </div>
                  </div>

                  {/* Full Metrics Container */}
                  <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {/* Characters */}
                      <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium">{postMetrics.characterCount}</span>
                        <span className="text-gray-500 dark:text-gray-400">chars</span>
                      </div>
                      
                      {/* Words */}
                      <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <span className="font-medium">{postMetrics.wordCount}</span>
                        <span className="text-gray-500 dark:text-gray-400">words</span>
                      </div>
                      
                      {/* Reading Time */}
                      <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{postMetrics.readingTime}</span>
                        <span className="text-gray-500 dark:text-gray-400">min read</span>
                      </div>
                      
                      {/* Length */}
                      <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
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

                      {/* Who Responded */}
                      <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                        <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium"><AuthorDisplayName authorId={post.authorAgent} /></span>
                        <span className="text-gray-500 dark:text-gray-400">author</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Post Actions */}
              <div className="border-t border-gray-100 dark:border-gray-800 py-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    
                    {/* Comments */}
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors"
                      title="View Comments"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{getCommentCount(post)}</span>
                    </button>
                    
                    {/* Saves count display */}
                    {(() => {
                      const engagement = parseEngagement(post.engagement);
                      return engagement?.saves && engagement.saves > 0 ? (
                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          <Bookmark className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">{engagement.saves} saved</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  
                  {/* Post Actions - Integrated */}
                  <div className="flex items-center space-x-4">
                    <div className="text-xs text-gray-500">
                      ID: {post.id?.slice(0, 8) || 'Unknown'}...
                    </div>
                    
                    {/* Save Button with Animation */}
                    {(() => {
                      const engagement = parseEngagement(post.engagement);
                      return (
                        <button
                          onClick={() => handleSave(post.id, !engagement?.isSaved)}
                          className={`flex items-center space-x-1 transition-colors transform hover:scale-105 ${
                            engagement?.isSaved
                              ? 'text-blue-600 hover:text-blue-700'
                              : 'text-gray-600 dark:text-gray-400 hover:text-blue-600'
                          }`}
                          title={engagement?.isSaved ? 'Unsave Post' : 'Save Post'}
                        >
                          <Bookmark
                            className={`w-4 h-4 transition-all ${
                              engagement?.isSaved
                                ? 'fill-blue-500 text-blue-500 scale-110'
                                : 'hover:fill-blue-100'
                            }`}
                          />
                          <span className="text-xs font-medium">
                            {engagement?.isSaved ? 'Saved' : 'Save'}
                            {engagement?.saves && engagement.saves > 0 && (
                              <span className="ml-1 text-gray-500">({engagement.saves})</span>
                            )}
                          </span>
                        </button>
                      );
                    })()}
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors"
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
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Comments
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
                      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Add Comment</span>
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
                            placeholder="Write a comment... Use @ to mention agents or users"
                            className="w-full p-3 text-sm border border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800 transition-opacity duration-200"
                            rows={4}
                            maxLength={2000}
                            mentionContext="comment"
                            disabled={processingComments.has(post.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                const content = commentFormContent[post.id];
                                if (content?.trim() && !processingComments.has(post.id)) {
                                  handleNewComment(post.id, content.trim());
                                  setCommentFormContent(prev => ({ ...prev, [post.id]: '' }));
                                }
                              }
                            }}
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Professional technical discussion • Ctrl+Enter to post</span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setShowCommentForm(prev => ({ ...prev, [post.id]: false }))}
                                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={(e) => {
                                  const content = commentFormContent[post.id]?.trim();
                                  if (content && !processingComments.has(post.id)) {
                                    handleNewComment(post.id, content);
                                    setCommentFormContent(prev => ({ ...prev, [post.id]: '' }));
                                  }
                                }}
                                disabled={processingComments.has(post.id)}
                                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center gap-2 shadow-sm hover:shadow-md"
                              >
                                {processingComments.has(post.id) ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Adding Comment...</span>
                                  </>
                                ) : (
                                  <span>Add Comment</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Processing indicator removed - now per-post in button */}

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
                            onCommentsUpdate={() => {
                              debugLog('feed', '🔄 onCommentsUpdate triggered for post:', post.id);
                              loadComments(post.id, true);
                            }}
                            enableRealTime={true}
                            processingComments={processingComments}
                            onProcessingChange={(commentId, isProcessing) => {
                              debugLog('feed', '⚙️ Processing change:', commentId, isProcessing ? 'START' : 'END');
                              setProcessingComments(prev => {
                                const next = new Set(prev);
                                if (isProcessing) {
                                  next.add(commentId);
                                  debugLog('feed', '📊 Added to processing set:', commentId, 'size:', next.size);
                                } else {
                                  next.delete(commentId);
                                  debugLog('feed', '📊 Removed from processing set:', commentId, 'size:', next.size);
                                }
                                return next;
                              });
                            }}
                            commentStates={commentStates}
                            onStateChange={(commentId, state) => {
                              debugLog('feed', '🔄 State change:', commentId, '→', state);
                              setCommentStates(prev => {
                                const next = new Map(prev);
                                if (state) {
                                  next.set(commentId, state);
                                  debugLog('feed', '📊 State map updated:', commentId, '=', state, 'map size:', next.size);
                                } else {
                                  next.delete(commentId);
                                  debugLog('feed', '📊 State cleared for:', commentId, 'map size:', next.size);
                                }
                                return next;
                              });
                            }}
                            className="bg-white dark:bg-gray-900 rounded-lg"
                          />
                        ) : (
                          <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No comments yet.</p>
                            <button
                              onClick={() => setShowCommentForm(prev => ({ ...prev, [post.id]: true }))}
                              className="text-blue-600 hover:text-blue-700 font-medium mt-2 transition-colors"
                            >
                              Add a comment
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No posts yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
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

      {/* Right Sidebar - Tools Interface */}
      <div className="lg:col-span-1 space-y-6">
        {/* Additional tool interfaces can be added here */}
      </div>
    </div>
    </>
  );
};

export default RealSocialMediaFeed;
export { RealSocialMediaFeed };