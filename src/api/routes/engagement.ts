import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/database/connection';
import { logger } from '@/utils/logger';

const router = express.Router();

interface EngagementRequest {
  userId?: string;
  anonymous?: boolean;
  platform?: string;
  metadata?: any;
}

// POST /api/v1/posts/:id/like - Toggle like on a post
router.post('/posts/:id/like', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, anonymous = false } = req.body as EngagementRequest;
    const userAgent = req.get('User-Agent') || 'unknown';
    const ipAddress = req.ip;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required'
      });
    }
    
    // Check if post exists
    const postCheck = await db.query('SELECT id FROM posts WHERE id = $1 AND status = \'published\'', [id]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    // Check if already liked
    let existingLikeQuery, existingLikeValues;
    if (userId && !anonymous) {
      existingLikeQuery = 'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2';
      existingLikeValues = [id, userId];
    } else {
      existingLikeQuery = 'SELECT id FROM post_likes WHERE post_id = $1 AND user_agent = $2 AND ip_address = $3';
      existingLikeValues = [id, userAgent, ipAddress];
    }
    
    const existingLike = await db.query(existingLikeQuery, existingLikeValues);
    
    if (existingLike.rows.length > 0) {
      // Remove like
      await db.query('DELETE FROM post_likes WHERE id = $1', [existingLike.rows[0].id]);
    } else {
      // Add like
      const likeId = uuidv4();
      const insertQuery = `
        INSERT INTO post_likes (id, post_id, user_id, user_agent, ip_address)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await db.query(insertQuery, [likeId, id, userId || null, userAgent, ipAddress]);
    }
    
    // Get updated count
    const countResult = await db.query('SELECT like_count FROM posts WHERE id = $1', [id]);
    const likeCount = countResult.rows[0]?.like_count || 0;
    
    res.json({
      success: true,
      data: {
        liked: existingLike.rows.length === 0,
        likeCount,
        ...(anonymous && { anonymous: true })
      }
    });
    
  } catch (error) {
    logger.error('Failed to toggle post like', { error, postId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to toggle like'
    });
  }
});

// POST /api/v1/posts/:id/heart - Toggle heart on a post
router.post('/posts/:id/heart', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, anonymous = false } = req.body as EngagementRequest;
    const userAgent = req.get('User-Agent') || 'unknown';
    const ipAddress = req.ip;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required'
      });
    }
    
    // Check if post exists
    const postCheck = await db.query('SELECT id FROM posts WHERE id = $1 AND status = \'published\'', [id]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    // Check if already hearted
    let existingHeartQuery, existingHeartValues;
    if (userId && !anonymous) {
      existingHeartQuery = 'SELECT id FROM post_hearts WHERE post_id = $1 AND user_id = $2';
      existingHeartValues = [id, userId];
    } else {
      existingHeartQuery = 'SELECT id FROM post_hearts WHERE post_id = $1 AND user_agent = $2 AND ip_address = $3';
      existingHeartValues = [id, userAgent, ipAddress];
    }
    
    const existingHeart = await db.query(existingHeartQuery, existingHeartValues);
    
    if (existingHeart.rows.length > 0) {
      // Remove heart
      await db.query('DELETE FROM post_hearts WHERE id = $1', [existingHeart.rows[0].id]);
    } else {
      // Add heart
      const heartId = uuidv4();
      const insertQuery = `
        INSERT INTO post_hearts (id, post_id, user_id, user_agent, ip_address)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await db.query(insertQuery, [heartId, id, userId || null, userAgent, ipAddress]);
    }
    
    // Get updated count
    const countResult = await db.query('SELECT heart_count FROM posts WHERE id = $1', [id]);
    const heartCount = countResult.rows[0]?.heart_count || 0;
    
    res.json({
      success: true,
      data: {
        hearted: existingHeart.rows.length === 0,
        heartCount
      }
    });
    
  } catch (error) {
    logger.error('Failed to toggle post heart', { error, postId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to toggle heart'
    });
  }
});

// POST /api/v1/posts/:id/bookmark - Toggle bookmark on a post
router.post('/posts/:id/bookmark', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body as EngagementRequest;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required'
      });
    }
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required for bookmarks'
      });
    }
    
    // Check if post exists
    const postCheck = await db.query('SELECT id FROM posts WHERE id = $1 AND status = \'published\'', [id]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    // Check if already bookmarked
    const existingBookmark = await db.query(
      'SELECT id FROM post_bookmarks WHERE post_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (existingBookmark.rows.length > 0) {
      // Remove bookmark
      await db.query('DELETE FROM post_bookmarks WHERE id = $1', [existingBookmark.rows[0].id]);
    } else {
      // Add bookmark
      const bookmarkId = uuidv4();
      const insertQuery = `
        INSERT INTO post_bookmarks (id, post_id, user_id)
        VALUES ($1, $2, $3)
      `;
      await db.query(insertQuery, [bookmarkId, id, userId]);
    }
    
    // Get updated count
    const countResult = await db.query('SELECT bookmark_count FROM posts WHERE id = $1', [id]);
    const bookmarkCount = countResult.rows[0]?.bookmark_count || 0;
    
    res.json({
      success: true,
      data: {
        bookmarked: existingBookmark.rows.length === 0,
        bookmarkCount
      }
    });
    
  } catch (error) {
    logger.error('Failed to toggle post bookmark', { error, postId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to toggle bookmark'
    });
  }
});

// POST /api/v1/posts/:id/share - Record a share
router.post('/posts/:id/share', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, platform = 'unknown', metadata = {}, anonymous = false } = req.body as EngagementRequest;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required'
      });
    }
    
    if (!platform) {
      return res.status(400).json({
        success: false,
        error: 'Platform is required for shares'
      });
    }
    
    // Check if post exists
    const postCheck = await db.query('SELECT id FROM posts WHERE id = $1 AND status = \'published\'', [id]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    // Record share
    const shareId = uuidv4();
    const insertQuery = `
      INSERT INTO post_shares (id, post_id, user_id, platform, metadata)
      VALUES ($1, $2, $3, $4, $5)
    `;
    
    await db.query(insertQuery, [
      shareId,
      id,
      (!anonymous && userId) ? userId : null,
      platform,
      JSON.stringify(metadata)
    ]);
    
    // Get updated count
    const countResult = await db.query('SELECT share_count FROM posts WHERE id = $1', [id]);
    const shareCount = countResult.rows[0]?.share_count || 0;
    
    res.json({
      success: true,
      data: {
        shareCount,
        platform
      }
    });
    
  } catch (error) {
    logger.error('Failed to record post share', { error, postId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to record share'
    });
  }
});

// POST /api/v1/posts/:id/view - Record a view
router.post('/posts/:id/view', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, trackUnique = false } = req.body;
    const userAgent = req.get('User-Agent') || 'unknown';
    const ipAddress = req.ip;
    const referrer = req.get('Referer');
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required'
      });
    }
    
    // Check if post exists
    const postCheck = await db.query('SELECT id FROM posts WHERE id = $1 AND status = \'published\'', [id]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    if (trackUnique && userId) {
      // Check for existing view today
      const existingView = await db.query(
        `SELECT id FROM post_views 
         WHERE post_id = $1 AND user_id = $2 AND DATE(created_at) = CURRENT_DATE`,
        [id, userId]
      );
      
      if (existingView.rows.length === 0) {
        // Record unique view
        const viewId = uuidv4();
        const insertQuery = `
          INSERT INTO post_views (id, post_id, user_id, user_agent, ip_address, referrer)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await db.query(insertQuery, [viewId, id, userId, userAgent, ipAddress, referrer]);
      }
    }
    
    // Always update view count
    await db.query('UPDATE posts SET view_count = view_count + 1 WHERE id = $1', [id]);
    
    // Get updated count
    const countResult = await db.query('SELECT view_count FROM posts WHERE id = $1', [id]);
    const viewCount = countResult.rows[0]?.view_count || 0;
    
    res.json({
      success: true,
      data: {
        viewCount
      }
    });
    
  } catch (error) {
    logger.error('Failed to record post view', { error, postId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to record view'
    });
  }
});

// GET /api/v1/posts/:id/engagement - Get engagement metrics
router.get('/posts/:id/engagement', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required'
      });
    }
    
    // Get engagement metrics
    const metricsQuery = `
      SELECT 
        like_count,
        heart_count,
        bookmark_count,
        share_count,
        view_count,
        comment_count
      FROM posts 
      WHERE id = $1
    `;
    
    const metricsResult = await db.query(metricsQuery, [id]);
    
    if (metricsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    const metrics = metricsResult.rows[0];
    
    const totalEngagement = metrics.like_count + metrics.heart_count + 
                           metrics.bookmark_count + metrics.share_count + 
                           metrics.comment_count;
    
    const engagementRate = metrics.view_count > 0 
      ? (totalEngagement / metrics.view_count) * 100 
      : 0;
    
    const responseData = {
      postId: id,
      likes: metrics.like_count,
      hearts: metrics.heart_count,
      bookmarks: metrics.bookmark_count,
      shares: metrics.share_count,
      views: metrics.view_count,
      comments: metrics.comment_count,
      totalEngagement,
      engagementRate: parseFloat(engagementRate.toFixed(2))
    };
    
    // If userId provided, get user-specific engagement status
    if (userId) {
      const userEngagementQuery = `
        SELECT 
          EXISTS(SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2) as liked,
          EXISTS(SELECT 1 FROM post_hearts WHERE post_id = $1 AND user_id = $2) as hearted,
          EXISTS(SELECT 1 FROM post_bookmarks WHERE post_id = $1 AND user_id = $2) as bookmarked
      `;
      
      const userEngagementResult = await db.query(userEngagementQuery, [id, userId]);
      const userEngagement = userEngagementResult.rows[0];
      
      (responseData as any).userEngagement = {
        liked: userEngagement.liked,
        hearted: userEngagement.hearted,
        bookmarked: userEngagement.bookmarked
      };
    }
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    logger.error('Failed to fetch engagement metrics', { error, postId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch engagement metrics'
    });
  }
});

// GET /api/v1/posts/:id/engagement/breakdown - Get detailed engagement breakdown
router.get('/posts/:id/engagement/breakdown', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required'
      });
    }
    
    // Get detailed breakdown
    const breakdownQueries = await Promise.all([
      // Likes by time
      db.query(`
        SELECT DATE_TRUNC('hour', created_at) as hour, COUNT(*) as count
        FROM post_likes 
        WHERE post_id = $1
        GROUP BY hour
        ORDER BY hour DESC
        LIMIT 24
      `, [id]),
      
      // Shares by platform
      db.query(`
        SELECT platform, COUNT(*) as count
        FROM post_shares 
        WHERE post_id = $1
        GROUP BY platform
        ORDER BY count DESC
      `, [id]),
      
      // Views by hour (last 24 hours)
      db.query(`
        SELECT DATE_TRUNC('hour', created_at) as hour, COUNT(*) as count
        FROM post_views 
        WHERE post_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
        GROUP BY hour
        ORDER BY hour DESC
      `, [id])
    ]);
    
    res.json({
      success: true,
      data: {
        postId: id,
        likesByHour: breakdownQueries[0].rows,
        sharesByPlatform: breakdownQueries[1].rows,
        viewsByHour: breakdownQueries[2].rows
      }
    });
    
  } catch (error) {
    logger.error('Failed to fetch engagement breakdown', { error, postId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch engagement breakdown'
    });
  }
});

export default router;