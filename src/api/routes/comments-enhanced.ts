import { Router } from 'express';
import { validationResult, body, param, query } from 'express-validator';
import { db } from '@/database/connection';
import { validationErrorHandler, asyncHandler } from '@/middleware/error';
import { singleUserMiddleware, validateSingleUser } from '@/middleware/single-user';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Apply single-user middleware to all routes
router.use(singleUserMiddleware);

// Add reaction to comment
router.post('/comments/:commentId/reactions',
  param('commentId').isUUID().withMessage('Invalid comment ID'),
  body('reactionType').isIn(['like', 'heart', 'laugh', 'sad', 'angry', 'wow']).withMessage('Invalid reaction type'),
  validateSingleUser,
  asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { reactionType, userId } = req.body;

    try {
      // Check if comment exists
      const commentCheck = await db.query(
        'SELECT id FROM comments WHERE id = $1 AND is_deleted = FALSE',
        [commentId]
      );

      if (commentCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }

      // Check if user already reacted with this type
      const existingReaction = await db.query(
        'SELECT id FROM comment_reactions WHERE comment_id = $1 AND user_id = $2 AND reaction_type = $3',
        [commentId, userId, reactionType]
      );

      if (existingReaction.rows.length > 0) {
        // Remove existing reaction (toggle)
        await db.query(
          'DELETE FROM comment_reactions WHERE comment_id = $1 AND user_id = $2 AND reaction_type = $3',
          [commentId, userId, reactionType]
        );

        logger.info('Reaction removed', { commentId, userId, reactionType });
      } else {
        // Remove any other reaction from this user on this comment
        await db.query(
          'DELETE FROM comment_reactions WHERE comment_id = $1 AND user_id = $2',
          [commentId, userId]
        );

        // Add new reaction
        const reactionId = uuidv4();
        await db.query(
          'INSERT INTO comment_reactions (id, comment_id, user_id, reaction_type, created_at) VALUES ($1, $2, $3, $4, NOW())',
          [reactionId, commentId, userId, reactionType]
        );

        logger.info('Reaction added', { commentId, userId, reactionType });
      }

      res.json({
        success: true,
        message: 'Reaction updated successfully'
      });

    } catch (error) {
      logger.error('Failed to update reaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        commentId,
        userId,
        reactionType
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update reaction'
      });
    }
  })
);

// Report comment
router.post('/comments/:commentId/reports',
  param('commentId').isUUID().withMessage('Invalid comment ID'),
  body('reason').isIn(['spam', 'harassment', 'inappropriate', 'misinformation', 'offtopic', 'copyright', 'other']).withMessage('Invalid report reason'),
  body('reporterId').notEmpty().withMessage('Reporter ID is required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be under 500 characters'),
  asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { reason, reporterId, description } = req.body;

    try {
      // Check if comment exists
      const commentCheck = await db.query(
        'SELECT id FROM comments WHERE id = $1',
        [commentId]
      );

      if (commentCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }

      // Check if user already reported this comment
      const existingReport = await db.query(
        'SELECT id FROM comment_reports WHERE comment_id = $1 AND reporter_id = $2',
        [commentId, reporterId]
      );

      if (existingReport.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'You have already reported this comment'
        });
      }

      const reportId = uuidv4();
      await db.query(`
        INSERT INTO comment_reports (
          id, comment_id, reporter_id, reason, description, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [reportId, commentId, reporterId, reason, description || null]);

      // Update comment reported count
      await db.query(
        'UPDATE comments SET reported_count = reported_count + 1 WHERE id = $1',
        [commentId]
      );

      logger.info('Comment reported', { commentId, reporterId, reason });

      res.status(201).json({
        success: true,
        message: 'Report submitted successfully'
      });

    } catch (error) {
      logger.error('Failed to submit report', {
        error: error instanceof Error ? error.message : 'Unknown error',
        commentId,
        reporterId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to submit report'
      });
    }
  })
);

// Pin/unpin comment
router.post('/comments/:commentId/pin',
  param('commentId').isUUID().withMessage('Invalid comment ID'),
  asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    try {
      // Check if comment exists
      const commentCheck = await db.query(
        'SELECT id, is_pinned FROM comments WHERE id = $1 AND is_deleted = FALSE',
        [commentId]
      );

      if (commentCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }

      const isPinned = commentCheck.rows[0].is_pinned;
      
      // Toggle pin status
      await db.query(
        'UPDATE comments SET is_pinned = $1, updated_at = NOW() WHERE id = $2',
        [!isPinned, commentId]
      );

      logger.info('Comment pin status updated', { commentId, isPinned: !isPinned });

      res.json({
        success: true,
        message: `Comment ${!isPinned ? 'pinned' : 'unpinned'} successfully`,
        isPinned: !isPinned
      });

    } catch (error) {
      logger.error('Failed to update pin status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        commentId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update pin status'
      });
    }
  })
);

// Get comment reactions
router.get('/comments/:commentId/reactions',
  param('commentId').isUUID().withMessage('Invalid comment ID'),
  asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.query.userId as string;

    try {
      const query = `
        SELECT 
          reaction_type,
          COUNT(*) as count,
          CASE WHEN $2 IS NOT NULL THEN 
            BOOL_OR(user_id = $2)
          ELSE FALSE END as user_reacted
        FROM comment_reactions 
        WHERE comment_id = $1
        GROUP BY reaction_type
        ORDER BY count DESC
      `;

      const result = await db.query(query, [commentId, userId]);

      const reactions: { [key: string]: number } = {};
      let userReaction: string | null = null;

      result.rows.forEach(row => {
        reactions[row.reaction_type] = parseInt(row.count);
        if (row.user_reacted) {
          userReaction = row.reaction_type;
        }
      });

      res.json({
        success: true,
        data: {
          reactions,
          userReaction
        }
      });

    } catch (error) {
      logger.error('Failed to fetch reactions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        commentId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch reactions'
      });
    }
  })
);

// Get comment reports (moderation)
router.get('/comments/:commentId/reports',
  param('commentId').isUUID().withMessage('Invalid comment ID'),
  asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    try {
      const query = `
        SELECT 
          id,
          reporter_id,
          reason,
          description,
          status,
          reviewed_by,
          reviewed_at,
          created_at
        FROM comment_reports 
        WHERE comment_id = $1
        ORDER BY created_at DESC
      `;

      const result = await db.query(query, [commentId]);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      logger.error('Failed to fetch reports', {
        error: error instanceof Error ? error.message : 'Unknown error',
        commentId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch reports'
      });
    }
  })
);

// Update comment moderation status
router.put('/comments/:commentId/moderate',
  param('commentId').isUUID().withMessage('Invalid comment ID'),
  body('isModerated').isBoolean().withMessage('Moderated status must be boolean'),
  body('moderatorNotes').optional().isLength({ max: 1000 }).withMessage('Moderator notes must be under 1000 characters'),
  body('moderatorId').notEmpty().withMessage('Moderator ID is required'),
  asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { isModerated, moderatorNotes, moderatorId } = req.body;

    try {
      const updateQuery = `
        UPDATE comments 
        SET 
          is_moderated = $1,
          moderator_notes = $2,
          updated_at = NOW()
        WHERE id = $3 AND is_deleted = FALSE
        RETURNING *
      `;

      const result = await db.query(updateQuery, [
        isModerated,
        moderatorNotes || null,
        commentId
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }

      // Update related reports status
      await db.query(`
        UPDATE comment_reports 
        SET 
          status = 'reviewed',
          reviewed_by = $1,
          reviewed_at = NOW()
        WHERE comment_id = $2 AND status = 'pending'
      `, [moderatorId, commentId]);

      logger.info('Comment moderation updated', { 
        commentId, 
        isModerated, 
        moderatorId 
      });

      const comment = result.rows[0];

      res.json({
        success: true,
        data: {
          id: comment.id,
          isModerated: comment.is_moderated,
          moderatorNotes: comment.moderator_notes,
          updatedAt: comment.updated_at
        }
      });

    } catch (error) {
      logger.error('Failed to update moderation status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        commentId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update moderation status'
      });
    }
  })
);

// Subscribe to comment thread notifications
router.post('/comments/:commentId/subscribe',
  param('commentId').isUUID().withMessage('Invalid comment ID'),
  validateSingleUser,
  body('subscriptionType').isIn(['thread', 'replies', 'mentions']).withMessage('Invalid subscription type'),
  asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { userId, subscriptionType } = req.body;

    try {
      // Check if comment exists
      const commentCheck = await db.query(
        'SELECT id FROM comments WHERE id = $1',
        [commentId]
      );

      if (commentCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }

      // Check if already subscribed
      const existingSub = await db.query(
        'SELECT id, is_active FROM comment_subscriptions WHERE comment_id = $1 AND user_id = $2 AND subscription_type = $3',
        [commentId, userId, subscriptionType]
      );

      if (existingSub.rows.length > 0) {
        // Toggle subscription
        const isActive = !existingSub.rows[0].is_active;
        await db.query(
          'UPDATE comment_subscriptions SET is_active = $1, created_at = NOW() WHERE id = $2',
          [isActive, existingSub.rows[0].id]
        );

        return res.json({
          success: true,
          message: `Subscription ${isActive ? 'activated' : 'deactivated'}`,
          isActive
        });
      }

      // Create new subscription
      const subscriptionId = uuidv4();
      await db.query(`
        INSERT INTO comment_subscriptions (
          id, comment_id, user_id, subscription_type, is_active, created_at
        ) VALUES ($1, $2, $3, $4, TRUE, NOW())
      `, [subscriptionId, commentId, userId, subscriptionType]);

      logger.info('Comment subscription created', { 
        commentId, 
        userId, 
        subscriptionType 
      });

      res.status(201).json({
        success: true,
        message: 'Subscription created',
        isActive: true
      });

    } catch (error) {
      logger.error('Failed to manage subscription', {
        error: error instanceof Error ? error.message : 'Unknown error',
        commentId,
        userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to manage subscription'
      });
    }
  })
);

export default router;