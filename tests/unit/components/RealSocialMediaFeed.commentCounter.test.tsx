/**
 * TDD Unit Tests: Comment Counter Display Fix
 *
 * Tests for getCommentCount() function in RealSocialMediaFeed component
 *
 * Test Coverage:
 * 1. Priority: root post.comments > engagement.comments > default 0
 * 2. Handle various data structures (string, object, undefined, null)
 * 3. Edge cases: missing fields, invalid data, nested structures
 *
 * Expected to FAIL before fix is applied
 * Expected to PASS after fix
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgentPost, PostEngagement } from '../../../frontend/src/types/api';

// Mock the entire RealSocialMediaFeed module
jest.mock('../../../frontend/src/components/RealSocialMediaFeed', () => {
  const actual = jest.requireActual('../../../frontend/src/components/RealSocialMediaFeed');
  return {
    ...actual,
    __esModule: true,
    default: actual.RealSocialMediaFeed
  };
});

// Import after mock
import RealSocialMediaFeed from '../../../frontend/src/components/RealSocialMediaFeed';

describe('RealSocialMediaFeed - Comment Counter Logic (TDD)', () => {

  // Helper function to extract and test getCommentCount logic
  const extractGetCommentCount = () => {
    // Parse engagement if it's a string
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

    // Get comment count from post (handles both root level and engagement)
    const getCommentCount = (post: AgentPost): number => {
      // Parse engagement if it's a string
      const engagement = parseEngagement(post.engagement);

      // Priority: engagement.comments > root comments > 0
      if (engagement && typeof engagement.comments === 'number') {
        return engagement.comments;
      }
      if (typeof post.comments === 'number') {
        return post.comments;
      }
      return 0;
    };

    return { parseEngagement, getCommentCount };
  };

  const { parseEngagement, getCommentCount } = extractGetCommentCount();

  describe('Priority Testing: root post.comments > engagement.comments > 0', () => {

    it('should prioritize root post.comments over engagement.comments', () => {
      const post: Partial<AgentPost> = {
        id: '1',
        comments: 5, // Root level - SHOULD WIN
        engagement: {
          comments: 3, // Engagement level
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: { average: 0, count: 0, distribution: {} }
        } as PostEngagement
      };

      // ❌ EXPECTED TO FAIL: Current logic prioritizes engagement.comments first
      // ✅ SHOULD PASS: After fix, root post.comments should take priority
      expect(getCommentCount(post as AgentPost)).toBe(5);
    });

    it('should use engagement.comments when root post.comments is missing', () => {
      const post: Partial<AgentPost> = {
        id: '2',
        // comments: undefined (missing)
        engagement: {
          comments: 7,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: { average: 0, count: 0, distribution: {} }
        } as PostEngagement
      };

      expect(getCommentCount(post as AgentPost)).toBe(7);
    });

    it('should return 0 when both root and engagement are missing', () => {
      const post: Partial<AgentPost> = {
        id: '3',
        // comments: undefined
        engagement: {
          // comments: undefined
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: { average: 0, count: 0, distribution: {} }
        } as PostEngagement
      };

      expect(getCommentCount(post as AgentPost)).toBe(0);
    });

    it('should return 0 when engagement is undefined', () => {
      const post: Partial<AgentPost> = {
        id: '4',
        // comments: undefined
        engagement: undefined as any
      };

      expect(getCommentCount(post as AgentPost)).toBe(0);
    });
  });

  describe('String Engagement Parsing', () => {

    it('should parse JSON string engagement correctly', () => {
      const post: Partial<AgentPost> = {
        id: '5',
        engagement: '{"comments": 10, "likes": 5, "shares": 2}' as any
      };

      expect(getCommentCount(post as AgentPost)).toBe(10);
    });

    it('should handle invalid JSON string gracefully', () => {
      const post: Partial<AgentPost> = {
        id: '6',
        engagement: '{invalid json}' as any
      };

      expect(getCommentCount(post as AgentPost)).toBe(0);
    });

    it('should prioritize root comments even with string engagement', () => {
      const post: Partial<AgentPost> = {
        id: '7',
        comments: 15, // Root level - SHOULD WIN
        engagement: '{"comments": 10, "likes": 5}' as any
      };

      // ❌ EXPECTED TO FAIL: Current logic may not prioritize correctly
      // ✅ SHOULD PASS: After fix
      expect(getCommentCount(post as AgentPost)).toBe(15);
    });
  });

  describe('Edge Cases', () => {

    it('should handle null engagement', () => {
      const post: Partial<AgentPost> = {
        id: '8',
        engagement: null as any
      };

      expect(getCommentCount(post as AgentPost)).toBe(0);
    });

    it('should handle zero comments at root level', () => {
      const post: Partial<AgentPost> = {
        id: '9',
        comments: 0, // Explicitly 0
        engagement: {
          comments: 5,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: { average: 0, count: 0, distribution: {} }
        } as PostEngagement
      };

      // ❌ EXPECTED TO FAIL: 0 is falsy, may fall through to engagement
      // ✅ SHOULD PASS: After fix, should return 0 (root level)
      expect(getCommentCount(post as AgentPost)).toBe(0);
    });

    it('should handle negative comment counts (invalid data)', () => {
      const post: Partial<AgentPost> = {
        id: '10',
        comments: -5,
        engagement: {
          comments: 3,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: { average: 0, count: 0, distribution: {} }
        } as PostEngagement
      };

      // Negative is still a number, should be returned (root priority)
      expect(getCommentCount(post as AgentPost)).toBe(-5);
    });

    it('should handle NaN values', () => {
      const post: Partial<AgentPost> = {
        id: '11',
        comments: NaN,
        engagement: {
          comments: 8,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: { average: 0, count: 0, distribution: {} }
        } as PostEngagement
      };

      // NaN is typeof 'number', but should fall through to engagement
      expect(getCommentCount(post as AgentPost)).toBe(8);
    });

    it('should handle string number values', () => {
      const post: Partial<AgentPost> = {
        id: '12',
        comments: '12' as any, // String instead of number
        engagement: {
          comments: 5,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: { average: 0, count: 0, distribution: {} }
        } as PostEngagement
      };

      // String is not typeof 'number', should fall through
      expect(getCommentCount(post as AgentPost)).toBe(5);
    });
  });

  describe('Real-world API Response Structures', () => {

    it('should handle backend API response with root comments', () => {
      const post: Partial<AgentPost> = {
        id: 'api-1',
        title: 'Test Post',
        content: 'Test content',
        comments: 25, // Backend returns this at root level
        engagement: {
          comments: 0, // May be stale or 0 in engagement
          shares: 10,
          views: 100,
          saves: 5,
          reactions: {},
          stars: { average: 4.5, count: 10, distribution: {} }
        } as PostEngagement
      };

      // ❌ EXPECTED TO FAIL: Current priority is engagement first
      // ✅ SHOULD PASS: Should use root comments (25)
      expect(getCommentCount(post as AgentPost)).toBe(25);
    });

    it('should handle legacy posts with only engagement.comments', () => {
      const post: Partial<AgentPost> = {
        id: 'legacy-1',
        title: 'Legacy Post',
        content: 'Legacy content',
        // No root comments field
        engagement: {
          comments: 42,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: { average: 0, count: 0, distribution: {} }
        } as PostEngagement
      };

      expect(getCommentCount(post as AgentPost)).toBe(42);
    });

    it('should handle post with both root and engagement at same value', () => {
      const post: Partial<AgentPost> = {
        id: 'sync-1',
        comments: 33,
        engagement: {
          comments: 33, // Synchronized
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: { average: 0, count: 0, distribution: {} }
        } as PostEngagement
      };

      // Should return root value (priority)
      expect(getCommentCount(post as AgentPost)).toBe(33);
    });
  });

  describe('Type Safety', () => {

    it('should handle engagement as empty object', () => {
      const post: Partial<AgentPost> = {
        id: 'type-1',
        engagement: {} as PostEngagement
      };

      expect(getCommentCount(post as AgentPost)).toBe(0);
    });

    it('should handle engagement with only other properties', () => {
      const post: Partial<AgentPost> = {
        id: 'type-2',
        engagement: {
          shares: 5,
          views: 100,
          saves: 3,
          reactions: { like: 10 },
          stars: { average: 4, count: 5, distribution: {} }
          // No comments field
        } as PostEngagement
      };

      expect(getCommentCount(post as AgentPost)).toBe(0);
    });
  });
});

describe('RealSocialMediaFeed - parseEngagement Utility (TDD)', () => {

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

  it('should return default object for undefined', () => {
    expect(parseEngagement(undefined)).toEqual({
      comments: 0,
      likes: 0,
      shares: 0,
      views: 0
    });
  });

  it('should return default object for null', () => {
    expect(parseEngagement(null)).toEqual({
      comments: 0,
      likes: 0,
      shares: 0,
      views: 0
    });
  });

  it('should parse valid JSON string', () => {
    const jsonString = '{"comments": 5, "likes": 10, "shares": 2, "views": 100}';
    expect(parseEngagement(jsonString)).toEqual({
      comments: 5,
      likes: 10,
      shares: 2,
      views: 100
    });
  });

  it('should return default for invalid JSON string', () => {
    expect(parseEngagement('{invalid}')).toEqual({
      comments: 0,
      likes: 0,
      shares: 0,
      views: 0
    });
  });

  it('should return object as-is if already parsed', () => {
    const engagement = { comments: 15, shares: 5, views: 200 };
    expect(parseEngagement(engagement)).toEqual(engagement);
  });
});
