import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/database/connection';
import { logger } from '@/utils/logger';

const router = express.Router();

interface CreateCommentRequest {
  content: string;
  authorAgent: string;
  parentId?: string;
  metadata?: {
    sentiment?: 'positive' | 'negative' | 'neutral';
    tags?: string[];
    isAgentResponse?: boolean;
    mentionedAgents?: string[];
  };
}

interface CommentQueryParams {
  sort?: 'newest' | 'oldest' | 'popular';
  authorAgent?: string;
  limit?: string;
  offset?: string;
  includeReplies?: string;
}

// Validation middleware
const validateCommentData = (req: Request, res: Response, next: NextFunction) => {
  const { content, authorAgent } = req.body as CreateCommentRequest;
  
  if (!content?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Comment content is required'
    });
  }
  
  if (!authorAgent?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Author agent is required'
    });
  }
  
  if (content.length > 10000) {
    return res.status(400).json({
      success: false,
      error: 'Comment must be less than 10,000 characters'
    });
  }
  
  next();
};

// POST /api/v1/posts/:postId/comments - Create a comment
router.post('/posts/:postId/comments', validateCommentData, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { content, authorAgent, parentId, metadata = {} } = req.body as CreateCommentRequest;
    
    if (!postId) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required'
      });
    }
    
    // Verify post exists
    const postCheck = await db.query('SELECT id FROM posts WHERE id = $1 AND status = \'published\'', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    // If replying to a comment, verify parent exists and check depth
    let parentDepth = 0;
    if (parentId) {
      const parentCheck = await db.query(
        'SELECT id, thread_depth FROM comments WHERE id = $1 AND post_id = $2 AND status = \'published\'',
        [parentId, postId]
      );
      
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Parent comment not found'
        });
      }
      
      parentDepth = parentCheck.rows[0].thread_depth;
      
      if (parentDepth >= 10) {
        return res.status(400).json({
          success: false,
          error: 'Maximum comment nesting depth exceeded'
        });
      }
    }
    
    const commentMetadata = {
      sentiment: null,
      tags: [],
      isAgentResponse: true,
      mentionedAgents: [],
      ...metadata
    };
    
    const commentId = uuidv4();
    const now = new Date().toISOString();
    
    const query = `
      INSERT INTO comments (
        id, post_id, parent_id, content, author_agent, metadata,
        created_at, updated_at, like_count, heart_count, reply_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, 0)
      RETURNING *, 
        COALESCE(thread_depth, 0) as thread_depth,
        COALESCE(thread_path, id::text) as thread_path
    `;
    
    const values = [
      commentId,
      postId,
      parentId || null,
      content.trim(),
      authorAgent.trim(),
      JSON.stringify(commentMetadata),
      now,
      now
    ];
    
    const result = await db.query(query, values);
    const comment = result.rows[0];
    
    // Format response
    const responseComment = {
      id: comment.id,
      postId: comment.post_id,
      parentId: comment.parent_id,
      content: comment.content,
      authorAgent: comment.author_agent,
      metadata: comment.metadata,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      engagement: {
        likes: comment.like_count,
        hearts: comment.heart_count,
        replies: comment.reply_count
      },
      thread: {
        depth: comment.thread_depth,
        path: comment.thread_path,
        hasReplies: comment.reply_count > 0,
        replyCount: comment.reply_count
      }
    };
    
    logger.info('Comment created successfully', { commentId, postId, authorAgent, parentId });
    
    res.status(201).json({
      success: true,
      data: responseComment
    });
    
  } catch (error) {
    logger.error('Failed to create comment', { error, postId: req.params.postId });
    
    if (error instanceof Error && error.message.includes('Maximum comment nesting depth exceeded')) {
      return res.status(400).json({
        success: false,
        error: 'Maximum comment nesting depth exceeded'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create comment'
    });
  }
});

// GET /api/v1/posts/:postId/comments - Get comments for a post
router.get('/posts/:postId/comments', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const {
      sort = 'newest',
      authorAgent,
      limit = '50',
      offset = '0',
      includeReplies = 'true'
    } = req.query as CommentQueryParams;
    
    if (!postId) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required'
      });
    }
    
    // Verify post exists
    const postCheck = await db.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    let query = `
      SELECT 
        c.*,
        c.post_id as postId,
        c.parent_id as parentId,
        c.author_agent as authorAgent,
        c.created_at as createdAt,
        c.updated_at as updatedAt,
        c.like_count,
        c.heart_count,
        c.reply_count,
        c.thread_depth,
        c.thread_path
      FROM comments c
      WHERE c.post_id = $1 AND c.status = 'published'
    `;
    
    const values: any[] = [postId];
    let valueIndex = 2;
    
    // Apply filters
    if (authorAgent) {
      query += ` AND c.author_agent = $${valueIndex}`;
      values.push(authorAgent);
      valueIndex++;
    }
    
    // Apply sorting
    switch (sort) {
      case 'oldest':
        query += ' ORDER BY c.thread_path, c.created_at ASC';
        break;
      case 'popular':
        query += ' ORDER BY c.thread_path, (c.like_count + c.heart_count) DESC, c.created_at DESC';
        break;
      case 'newest':
      default:
        query += ' ORDER BY c.thread_path, c.created_at DESC';
        break;
    }
    
    // Apply pagination
    query += ` LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
    values.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(query, values);
    
    // Get comment counts for meta information
    const metaQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as top_level_count,
        MAX(thread_depth) as max_depth
      FROM comments 
      WHERE post_id = $1 AND status = 'published'
    `;
    
    const metaResult = await db.query(metaQuery, [postId]);
    const meta = metaResult.rows[0];
    
    // Format comments with threading information
    const comments = result.rows.map(comment => ({
      id: comment.id,
      postId: comment.post_id,
      parentId: comment.parent_id,
      content: comment.content,
      authorAgent: comment.author_agent,
      metadata: comment.metadata,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      engagement: {
        likes: comment.like_count,
        hearts: comment.heart_count,
        replies: comment.reply_count
      },
      thread: {
        depth: comment.thread_depth || 0,
        path: comment.thread_path,
        hasReplies: (comment.reply_count || 0) > 0,
        replyCount: comment.reply_count || 0
      }
    }));
    
    res.json({
      success: true,
      data: comments,
      meta: {
        total: parseInt(meta.total),
        topLevelCount: parseInt(meta.top_level_count),
        maxDepth: parseInt(meta.max_depth || '0')
      },
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < parseInt(meta.total)
      }
    });
    
  } catch (error) {
    logger.error('Failed to fetch comments', { error, postId: req.params.postId });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments'
    });
  }
});

// POST /api/v1/comments/:id/like - Toggle like on a comment
router.post('/comments/:id/like', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, anonymous = false } = req.body;
    const userAgent = req.get('User-Agent') || 'unknown';
    const ipAddress = req.ip;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Comment ID is required'
      });
    }
    
    // Check if comment exists
    const commentCheck = await db.query('SELECT id FROM comments WHERE id = $1 AND status = \'published\'', [id]);
    if (commentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }
    
    // Check if already liked
    let existingLikeQuery, existingLikeValues;
    if (userId && !anonymous) {
      existingLikeQuery = 'SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2';
      existingLikeValues = [id, userId];
    } else {
      existingLikeQuery = 'SELECT id FROM comment_likes WHERE comment_id = $1 AND user_agent = $2 AND ip_address = $3';
      existingLikeValues = [id, userAgent, ipAddress];
    }
    
    const existingLike = await db.query(existingLikeQuery, existingLikeValues);
    
    if (existingLike.rows.length > 0) {
      // Remove like
      await db.query('DELETE FROM comment_likes WHERE id = $1', [existingLike.rows[0].id]);
    } else {
      // Add like
      const likeId = uuidv4();
      const insertQuery = `
        INSERT INTO comment_likes (id, comment_id, user_id, user_agent, ip_address)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await db.query(insertQuery, [likeId, id, userId || null, userAgent, ipAddress]);
    }
    
    // Get updated count
    const countResult = await db.query('SELECT like_count FROM comments WHERE id = $1', [id]);
    const likeCount = countResult.rows[0]?.like_count || 0;
    
    res.json({
      success: true,
      data: {
        liked: existingLike.rows.length === 0,
        likeCount
      }
    });
    
  } catch (error) {
    logger.error('Failed to toggle comment like', { error, commentId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to toggle like'
    });
  }
});

export default router;