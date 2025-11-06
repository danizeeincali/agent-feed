/**
 * Engagement Utilities
 * Shared functions for parsing and handling engagement data from API
 */

export interface EngagementData {
  comments: number;
  likes: number;
  shares: number;
  views: number;
  bookmarks?: number;
  saves?: number;
  isSaved?: boolean;
}

/**
 * Parse engagement data from API response
 * Handles both JSON string and object formats
 * @param engagement - Engagement data (string or object)
 * @returns Parsed engagement object with default values
 */
export function parseEngagement(engagement: any): EngagementData {
  // Handle null/undefined
  if (!engagement) {
    return { comments: 0, likes: 0, shares: 0, views: 0 };
  }

  // Handle JSON string (from SQLite database)
  if (typeof engagement === 'string') {
    try {
      const parsed = JSON.parse(engagement);
      return {
        comments: parsed.comments || 0,
        likes: parsed.likes || 0,
        shares: parsed.shares || 0,
        views: parsed.views || 0,
        bookmarks: parsed.bookmarks,
        saves: parsed.saves,
        isSaved: parsed.isSaved
      };
    } catch (e) {
      console.error('Failed to parse engagement data:', e);
      return { comments: 0, likes: 0, shares: 0, views: 0 };
    }
  }

  // Handle object format (already parsed)
  return {
    comments: engagement.comments || 0,
    likes: engagement.likes || 0,
    shares: engagement.shares || 0,
    views: engagement.views || 0,
    bookmarks: engagement.bookmarks,
    saves: engagement.saves,
    isSaved: engagement.isSaved
  };
}

/**
 * Get comment count from post data
 * Handles multiple possible formats for backward compatibility
 * @param post - Post object with engagement data
 * @returns Comment count (defaults to 0)
 */
export function getCommentCount(post: any): number {
  // Parse engagement data
  const engagement = parseEngagement(post.engagement);

  // Priority: engagement.comments > post.comments > 0
  if (typeof engagement.comments === 'number') {
    return engagement.comments;
  }
  if (typeof post.comments === 'number') {
    return post.comments;
  }
  return 0;
}
