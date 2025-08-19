import { Router } from 'express';
import { validationResult, body, param, query } from 'express-validator';
import { db } from '@/database/connection';
import { validationErrorHandler, asyncHandler } from '@/middleware/error';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import WebSocket from 'ws';

const router = Router();

// Validation for comments
const validateComment = [
  body('content').notEmpty().isLength({ max: 2000 }).withMessage('Content is required and must be under 2000 characters'),
  body('author').notEmpty().withMessage('Author is required'),
  body('parentId').optional().isUUID().withMessage('Invalid parent comment ID'),
  body('mentionedUsers').optional().isArray().withMessage('Mentioned users must be an array'),
];

const validateCommentUpdate = [
  body('content').notEmpty().isLength({ max: 2000 }).withMessage('Content is required and must be under 2000 characters'),
];

// Create comment on a post
router.post('/posts/:postId/comments',
  param('postId').isUUID().withMessage('Invalid post ID'),
  validateComment,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content, author, parentId = null } = req.body;

    logger.info('Creating comment', { postId, author, parentId });

    try {
      // Verify post exists
      const postCheck = await db.query(
        'SELECT id FROM feed_items WHERE id = $1',
        [postId]
      );

      if (postCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        });
      }

      // If parentId provided, verify parent comment exists
      if (parentId) {
        const parentCheck = await db.query(
          'SELECT id FROM comments WHERE id = $1 AND post_id = $2 AND is_deleted = FALSE',
          [parentId, postId]
        );

        if (parentCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Parent comment not found'
          });
        }
      }

      const commentId = uuidv4();
      const insertQuery = `
        INSERT INTO comments (
          id, post_id, content, author, parent_id, mentioned_users, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, NOW(), NOW()
        ) RETURNING *
      `;

      const { mentionedUsers = [] } = req.body;
      
      const result = await db.query(insertQuery, [
        commentId,
        postId,
        content,
        author,
        parentId,
        JSON.stringify(mentionedUsers)
      ]);

      const comment = result.rows[0];

      logger.info('Comment created successfully', { commentId, postId, author });

      res.status(201).json({
        success: true,
        data: {
          id: comment.id,
          postId: comment.post_id,
          content: comment.content,
          author: comment.author,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          parentId: comment.parent_id,
          isDeleted: comment.is_deleted || false,
          isEdited: comment.is_edited || false
        }
      });

    } catch (error) {
      logger.error('Failed to create comment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        postId,
        author
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create comment',
        message: 'Internal server error'
      });
    }
  })
);

// Get comments for a post
router.get('/posts/:postId/comments',
  param('postId').isUUID().withMessage('Invalid post ID'),
  asyncHandler(async (req, res) => {
    const { postId } = req.params;

    try {
      const sortBy = req.query.sort as string || 'createdAt';
      const sortDir = req.query.direction as string || 'asc';
      const userId = req.query.userId as string || null;
      
      let orderClause = 'ORDER BY created_at ASC';
      switch (sortBy) {
        case 'likes':
          orderClause = `ORDER BY likes_count ${sortDir.toUpperCase()}, created_at ASC`;
          break;
        case 'replies':
          orderClause = `ORDER BY replies_count ${sortDir.toUpperCase()}, created_at ASC`;
          break;
        case 'controversial':
          orderClause = `ORDER BY (LEAST(likes_count, replies_count) * 2) ${sortDir.toUpperCase()}, created_at ASC`;
          break;
        default:
          orderClause = `ORDER BY created_at ${sortDir.toUpperCase()}`;
      }
      
      const query = `
        WITH comment_reactions AS (
          SELECT 
            comment_id,
            reaction_type,
            COUNT(*) as count,
            CASE WHEN $2 IS NOT NULL THEN 
              MAX(CASE WHEN user_id = $2 THEN reaction_type END)
            END as user_reaction
          FROM comment_reactions 
          GROUP BY comment_id, reaction_type
        )
        SELECT 
          c.id,
          c.post_id,
          c.content,
          c.author,
          c.parent_id,
          c.thread_depth,
          c.thread_path,
          c.created_at,
          c.updated_at,
          c.is_deleted,
          c.is_edited,
          c.is_pinned,
          c.is_moderated,
          c.likes_count,
          c.replies_count,
          c.reported_count,
          c.moderator_notes,
          c.edit_history,
          c.mentioned_users,
          COALESCE(
            jsonb_object_agg(
              CASE WHEN cr.reaction_type IS NOT NULL THEN cr.reaction_type END,
              CASE WHEN cr.reaction_type IS NOT NULL THEN cr.count END
            ) FILTER (WHERE cr.reaction_type IS NOT NULL),
            '{}'
          ) as reactions,
          MAX(cr.user_reaction) as user_reaction
        FROM comments c
        LEFT JOIN comment_reactions cr ON c.id = cr.comment_id
        WHERE c.post_id = $1
        GROUP BY c.id, c.post_id, c.content, c.author, c.parent_id, c.thread_depth, 
                 c.thread_path, c.created_at, c.updated_at, c.is_deleted, c.is_edited,
                 c.is_pinned, c.is_moderated, c.likes_count, c.replies_count, 
                 c.reported_count, c.moderator_notes, c.edit_history, c.mentioned_users
        ${orderClause}
      `;

      const result = await db.query(query, [postId, userId]);

      // Transform flat list into threaded structure
      const commentsMap = new Map();
      const rootComments: any[] = [];

      // First pass: create all comment objects
      result.rows.forEach(row => {
        const comment = {
          id: row.id,
          postId: row.post_id,
          content: row.is_deleted ? '[deleted]' : row.content,
          author: row.author,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          parentId: row.parent_id,
          threadDepth: row.thread_depth || 0,
          threadPath: row.thread_path || row.id,
          isDeleted: row.is_deleted || false,
          isEdited: row.is_edited || false,
          isPinned: row.is_pinned || false,
          isModerated: row.is_moderated || false,
          likesCount: row.likes_count || 0,
          repliesCount: row.replies_count || 0,
          reportedCount: row.reported_count || 0,
          moderatorNotes: row.moderator_notes,
          editHistory: row.edit_history || [],
          mentionedUsers: row.mentioned_users || [],
          reactions: row.reactions || {},
          userReaction: row.user_reaction,
          replies: []
        };
        commentsMap.set(comment.id, comment);
      });

      // Second pass: build threaded structure
      commentsMap.forEach(comment => {
        if (comment.parentId) {
          const parent = commentsMap.get(comment.parentId);
          if (parent) {
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      res.json({
        success: true,
        data: rootComments
      });

    } catch (error) {
      logger.error('Failed to fetch comments', {
        error: error instanceof Error ? error.message : 'Unknown error',
        postId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch comments'
      });
    }
  })
);

// Update comment
router.put('/comments/:commentId',
  param('commentId').isUUID().withMessage('Invalid comment ID'),
  validateCommentUpdate,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    try {
      // Store edit history
      const historyQuery = `
        UPDATE comments 
        SET 
          edit_history = COALESCE(edit_history, '[]'::jsonb) || jsonb_build_object(
            'content', content,
            'editedAt', updated_at
          ),
          content = $1, 
          updated_at = NOW(), 
          is_edited = TRUE
        WHERE id = $2 AND is_deleted = FALSE
        RETURNING *
      `;
      
      const updateQuery = historyQuery;

      const result = await db.query(updateQuery, [content, commentId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found or already deleted'
        });
      }

      const comment = result.rows[0];

      logger.info('Comment updated successfully', { commentId });

      res.json({
        success: true,
        data: {
          id: comment.id,
          postId: comment.post_id,
          content: comment.content,
          author: comment.author,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          parentId: comment.parent_id,
          isDeleted: comment.is_deleted || false,
          isEdited: comment.is_edited || false
        }
      });

    } catch (error) {
      logger.error('Failed to update comment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        commentId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update comment'
      });
    }
  })
);

// Soft delete comment
router.delete('/comments/:commentId',
  param('commentId').isUUID().withMessage('Invalid comment ID'),
  asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    try {
      const deleteQuery = `
        UPDATE comments 
        SET is_deleted = TRUE, content = '[deleted]', updated_at = NOW()
        WHERE id = $1 AND is_deleted = FALSE
        RETURNING *
      `;

      const result = await db.query(deleteQuery, [commentId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found or already deleted'
        });
      }

      logger.info('Comment deleted successfully', { commentId });

      res.json({
        success: true,
        message: 'Comment deleted successfully'
      });

    } catch (error) {
      logger.error('Failed to delete comment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        commentId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to delete comment'
      });
    }
  })
);

export default router;