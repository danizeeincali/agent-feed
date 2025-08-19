import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';

// Mock database connection
const mockDb = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
};

describe('Engagement API', () => {
  let app: express.Application;
  let testPostId: string;
  let testCommentId: string;
  let testUserId: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    testPostId = uuidv4();
    testCommentId = uuidv4();
    testUserId = uuidv4();
  });

  afterAll(async () => {
    await mockDb.end();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/posts/:id/like', () => {
    it('should add a like to a post', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing like
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Insert like
        .mockResolvedValueOnce({ rows: [{ like_count: 5 }] }); // Get updated count

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/like`)
        .send({ userId: testUserId })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          liked: true,
          likeCount: 5
        }
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO post_likes'),
        expect.arrayContaining([testPostId, testUserId])
      );
    });

    it('should remove a like if already liked', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Existing like found
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Delete like
        .mockResolvedValueOnce({ rows: [{ like_count: 3 }] }); // Get updated count

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/like`)
        .send({ userId: testUserId })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          liked: false,
          likeCount: 3
        }
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM post_likes'),
        expect.arrayContaining([testPostId, testUserId])
      );
    });

    it('should handle anonymous likes', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // No existing like
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Insert anonymous like
        .mockResolvedValueOnce({ rows: [{ like_count: 8 }] }); // Get updated count

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/like`)
        .send({ anonymous: true })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          liked: true,
          likeCount: 8,
          anonymous: true
        }
      });
    });
  });

  describe('POST /api/v1/posts/:id/heart', () => {
    it('should add a heart to a post', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing heart
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Insert heart
        .mockResolvedValueOnce({ rows: [{ heart_count: 2 }] }); // Get updated count

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/heart`)
        .send({ userId: testUserId })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          hearted: true,
          heartCount: 2
        }
      });
    });

    it('should toggle heart if already hearted', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Existing heart found
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Delete heart
        .mockResolvedValueOnce({ rows: [{ heart_count: 0 }] }); // Get updated count

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/heart`)
        .send({ userId: testUserId })
        .expect(200);

      expect(response.body.data.hearted).toBe(false);
    });
  });

  describe('POST /api/v1/posts/:id/bookmark', () => {
    it('should bookmark a post for user', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing bookmark
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Insert bookmark
        .mockResolvedValueOnce({ rows: [{ bookmark_count: 1 }] }); // Get updated count

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/bookmark`)
        .send({ userId: testUserId })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          bookmarked: true,
          bookmarkCount: 1
        }
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO post_bookmarks'),
        expect.arrayContaining([testPostId, testUserId])
      );
    });

    it('should remove bookmark if already bookmarked', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Existing bookmark
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Delete bookmark
        .mockResolvedValueOnce({ rows: [{ bookmark_count: 0 }] }); // Get updated count

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/bookmark`)
        .send({ userId: testUserId })
        .expect(200);

      expect(response.body.data.bookmarked).toBe(false);
    });
  });

  describe('POST /api/v1/posts/:id/share', () => {
    it('should record a share and increment count', async () => {
      const shareData = {
        platform: 'twitter',
        userId: testUserId,
        metadata: {
          shareText: 'Check out this amazing post!',
          hashtags: ['agentlink', 'ai']
        }
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Insert share record
        .mockResolvedValueOnce({ rows: [{ share_count: 3 }] }); // Get updated count

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/share`)
        .send(shareData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          shareCount: 3,
          platform: 'twitter'
        }
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO post_shares'),
        expect.arrayContaining([
          testPostId,
          testUserId,
          shareData.platform,
          JSON.stringify(shareData.metadata)
        ])
      );
    });

    it('should handle anonymous shares', async () => {
      const shareData = {
        platform: 'linkedin',
        anonymous: true
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Insert share
        .mockResolvedValueOnce({ rows: [{ share_count: 7 }] }); // Get count

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/share`)
        .send(shareData)
        .expect(200);

      expect(response.body.data.shareCount).toBe(7);
    });
  });

  describe('POST /api/v1/posts/:id/view', () => {
    it('should increment view count', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ view_count: 15 }]
      });

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/view`)
        .send({ userId: testUserId })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          viewCount: 15
        }
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE posts SET view_count'),
        expect.arrayContaining([testPostId])
      );
    });

    it('should track unique views per user', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // No existing view record
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Insert view record
        .mockResolvedValueOnce({ rows: [{ view_count: 20 }] }); // Get updated count

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/view`)
        .send({ userId: testUserId, trackUnique: true })
        .expect(200);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO post_views'),
        expect.arrayContaining([testPostId, testUserId])
      );
    });
  });

  describe('GET /api/v1/posts/:id/engagement', () => {
    it('should retrieve complete engagement metrics', async () => {
      const mockEngagement = {
        like_count: 25,
        heart_count: 12,
        bookmark_count: 8,
        share_count: 5,
        view_count: 150,
        comment_count: 18
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockEngagement]
      });

      const response = await request(app)
        .get(`/api/v1/posts/${testPostId}/engagement`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          postId: testPostId,
          likes: 25,
          hearts: 12,
          bookmarks: 8,
          shares: 5,
          views: 150,
          comments: 18,
          totalEngagement: 218,
          engagementRate: expect.any(Number)
        }
      });
    });

    it('should include user-specific engagement status', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            like_count: 10,
            heart_count: 5,
            bookmark_count: 3,
            share_count: 2,
            view_count: 50,
            comment_count: 8
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ liked: true, hearted: false, bookmarked: true }]
        });

      const response = await request(app)
        .get(`/api/v1/posts/${testPostId}/engagement`)
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body.data).toMatchObject({
        userEngagement: {
          liked: true,
          hearted: false,
          bookmarked: true
        }
      });
    });
  });

  describe('Comment Engagement', () => {
    it('should handle comment likes', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // No existing like
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Insert like
        .mockResolvedValueOnce({ rows: [{ like_count: 3 }] }); // Updated count

      const response = await request(app)
        .post(`/api/v1/comments/${testCommentId}/like`)
        .send({ userId: testUserId })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          liked: true,
          likeCount: 3
        }
      });
    });

    it('should handle comment hearts', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // No existing heart
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Insert heart
        .mockResolvedValueOnce({ rows: [{ heart_count: 1 }] }); // Updated count

      const response = await request(app)
        .post(`/api/v1/comments/${testCommentId}/heart`)
        .send({ userId: testUserId })
        .expect(200);

      expect(response.body.data.hearted).toBe(true);
    });
  });
});