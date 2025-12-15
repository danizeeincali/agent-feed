/**
 * SPARC REFINEMENT Phase - Threaded Comments API Routes
 * Production-ready API endpoints for comment threading with agent interactions
 */

import express from 'express';
import { ThreadedCommentService } from '../threading/ThreadedCommentService.js';

const router = express.Router();

// Initialize threaded comment service
let threadedCommentService = null;

// Middleware to ensure database service is available
const ensureThreadingService = (req, res, next) => {
    if (!threadedCommentService && req.databaseService) {
        threadedCommentService = new ThreadedCommentService(req.databaseService);
    }
    
    if (!threadedCommentService) {
        return res.status(500).json({
            success: false,
            error: 'Threading service not available'
        });
    }
    
    req.threadingService = threadedCommentService;
    next();
};

// GET /api/v1/posts/:postId/comments - Get threaded comments for a post
router.get('/posts/:postId/comments', ensureThreadingService, async (req, res) => {
    try {
        const { postId } = req.params;
        const {
            parentId = null,
            limit = 50,
            offset = 0,
            includeDeleted = false,
            depth = 0
        } = req.query;

        console.log(`🔍 Fetching threaded comments for post: ${postId}`);

        const comments = await req.threadingService.getThreadedComments(postId, {
            parentId,
            limit: parseInt(limit),
            offset: parseInt(offset),
            includeDeleted: includeDeleted === 'true',
            depth: parseInt(depth)
        });

        // Get thread statistics
        const stats = await req.threadingService.getThreadStatistics(postId);

        res.json({
            success: true,
            data: comments,
            statistics: stats,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: comments.length === parseInt(limit)
            },
            metadata: {
                threaded: true,
                maxDepth: req.threadingService.maxDepth,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Error fetching threaded comments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch threaded comments',
            details: error.message
        });
    }
});

// POST /api/v1/posts/:postId/comments - Create root comment
router.post('/posts/:postId/comments', ensureThreadingService, async (req, res) => {
    try {
        const { postId } = req.params;
        const { 
            content, 
            author = 'anonymous', 
            authorType = 'user' 
        } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Comment content is required'
            });
        }

        console.log(`💬 Creating root comment for post: ${postId} by ${author}`);

        const newComment = await req.threadingService.createComment({
            postId,
            content: content.trim(),
            author,
            authorType
        });

        // Broadcast real-time update if WebSocket manager available
        if (req.wsManager) {
            req.wsManager.broadcast('comment_added', {
                postId,
                comment: newComment,
                type: 'root_comment'
            });
        }

        res.status(201).json({
            success: true,
            data: newComment,
            message: 'Root comment created successfully'
        });
    } catch (error) {
        console.error('❌ Error creating root comment:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to create comment'
        });
    }
});

// POST /api/v1/comments/:commentId/replies - Create reply to a comment
router.post('/comments/:commentId/replies', ensureThreadingService, async (req, res) => {
    try {
        const { commentId } = req.params;
        const { 
            content, 
            author = 'anonymous', 
            authorType = 'user' 
        } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Reply content is required'
            });
        }

        // Get parent comment to extract postId
        const parentComment = await req.threadingService.getCommentById(commentId);
        if (!parentComment) {
            return res.status(404).json({
                success: false,
                error: 'Parent comment not found'
            });
        }

        console.log(`↪️ Creating reply to comment: ${commentId} by ${author}`);

        const newReply = await req.threadingService.createComment({
            postId: parentComment.post_id,
            parentId: commentId,
            content: content.trim(),
            author,
            authorType
        });

        // Broadcast real-time update
        if (req.wsManager) {
            req.wsManager.broadcast('reply_added', {
                postId: parentComment.post_id,
                parentId: commentId,
                reply: newReply,
                type: 'threaded_reply'
            });
        }

        res.status(201).json({
            success: true,
            data: newReply,
            message: 'Reply created successfully',
            parentComment: {
                id: parentComment.id,
                author: parentComment.author
            }
        });
    } catch (error) {
        console.error('❌ Error creating reply:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to create reply'
        });
    }
});

// GET /api/v1/comments/:commentId - Get specific comment with context
router.get('/comments/:commentId', ensureThreadingService, async (req, res) => {
    try {
        const { commentId } = req.params;
        const { includeContext = false } = req.query;

        const comment = await req.threadingService.getCommentById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                error: 'Comment not found'
            });
        }

        let threadContext = null;
        if (includeContext === 'true') {
            threadContext = await req.threadingService.getThreadContext(commentId);
        }

        res.json({
            success: true,
            data: comment,
            context: threadContext,
            metadata: {
                hasContext: includeContext === 'true',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Error fetching comment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch comment'
        });
    }
});

// PUT /api/v1/comments/:commentId - Update comment content
router.put('/comments/:commentId', ensureThreadingService, async (req, res) => {
    try {
        const { commentId } = req.params;
        const { content, userId = 'anonymous' } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Updated content is required'
            });
        }

        const success = await req.threadingService.updateComment(
            commentId, 
            content.trim(), 
            userId
        );

        if (!success) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this comment or comment not found'
            });
        }

        // Get updated comment
        const updatedComment = await req.threadingService.getCommentById(commentId);

        // Broadcast real-time update
        if (req.wsManager && updatedComment) {
            req.wsManager.broadcast('comment_updated', {
                postId: updatedComment.post_id,
                commentId,
                comment: updatedComment
            });
        }

        res.json({
            success: true,
            data: updatedComment,
            message: 'Comment updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating comment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update comment'
        });
    }
});

// DELETE /api/v1/comments/:commentId - Soft delete comment
router.delete('/comments/:commentId', ensureThreadingService, async (req, res) => {
    try {
        const { commentId } = req.params;
        const { userId = 'anonymous' } = req.query;

        const success = await req.threadingService.deleteComment(commentId, userId);

        if (!success) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this comment or comment not found'
            });
        }

        // Broadcast real-time update
        if (req.wsManager) {
            req.wsManager.broadcast('comment_deleted', {
                commentId,
                userId
            });
        }

        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting comment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete comment'
        });
    }
});

// GET /api/v1/comments/:commentId/thread - Get full thread context
router.get('/comments/:commentId/thread', ensureThreadingService, async (req, res) => {
    try {
        const { commentId } = req.params;
        
        const threadContext = await req.threadingService.getThreadContext(commentId);
        
        if (!threadContext || threadContext.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Thread not found'
            });
        }

        // Get the comment to extract post info
        const comment = await req.threadingService.getCommentById(commentId);
        const stats = comment ? await req.threadingService.getThreadStatistics(comment.post_id) : null;

        res.json({
            success: true,
            data: threadContext,
            statistics: stats,
            metadata: {
                requestedCommentId: commentId,
                threadId: comment?.thread_id,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Error fetching thread context:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch thread context'
        });
    }
});

// POST /api/v1/comments/:commentId/reactions - Add reaction to comment
router.post('/comments/:commentId/reactions', ensureThreadingService, async (req, res) => {
    try {
        const { commentId } = req.params;
        const { 
            reactionType = 'like', 
            userId = 'anonymous' 
        } = req.body;

        const validReactions = ['like', 'helpful', 'insightful', 'agree', 'disagree'];
        if (!validReactions.includes(reactionType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid reaction type',
                validTypes: validReactions
            });
        }

        // Simple reaction storage (can be enhanced)
        const query = `
            INSERT OR REPLACE INTO comment_reactions (comment_id, user_id, reaction_type)
            VALUES (?, ?, ?)
        `;
        
        await req.threadingService.db.query(query, [commentId, userId, reactionType]);

        res.json({
            success: true,
            message: 'Reaction added successfully',
            data: {
                commentId,
                userId,
                reactionType,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Error adding reaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add reaction'
        });
    }
});

// GET /api/v1/posts/:postId/comments/stats - Get threading statistics for a post
router.get('/posts/:postId/comments/stats', ensureThreadingService, async (req, res) => {
    try {
        const { postId } = req.params;
        
        const stats = await req.threadingService.getThreadStatistics(postId);
        
        // Additional detailed statistics
        const detailedQuery = `
            SELECT 
                COUNT(CASE WHEN depth = 0 THEN 1 END) as root_comments,
                COUNT(CASE WHEN depth > 0 THEN 1 END) as replies,
                AVG(depth) as avg_depth,
                COUNT(CASE WHEN author_type = 'agent' THEN 1 END) as agent_comments,
                COUNT(CASE WHEN author_type = 'user' THEN 1 END) as user_comments,
                MAX(created_at) as last_comment_time
            FROM threaded_comments 
            WHERE post_id = ? AND NOT is_deleted
        `;
        
        const detailedStats = await req.threadingService.db.query(detailedQuery, [postId]);
        
        res.json({
            success: true,
            data: {
                ...stats,
                ...detailedStats[0],
                threading_enabled: true,
                max_supported_depth: req.threadingService.maxDepth
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error fetching comment statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch comment statistics'
        });
    }
});

// POST /api/v1/threading/migrate - Migrate existing flat comments to threaded structure
router.post('/threading/migrate', ensureThreadingService, async (req, res) => {
    try {
        const { postId, dryRun = false } = req.body;
        
        console.log(`🔄 ${dryRun ? 'Simulating' : 'Executing'} threading migration for post: ${postId || 'all posts'}`);
        
        // Get existing flat comments
        const flatCommentsQuery = postId 
            ? 'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at'
            : 'SELECT * FROM comments ORDER BY created_at';
        
        const params = postId ? [postId] : [];
        const flatComments = await req.threadingService.db.query(flatCommentsQuery, params);
        
        if (dryRun) {
            return res.json({
                success: true,
                message: 'Migration simulation completed',
                data: {
                    commentsToMigrate: flatComments.length,
                    estimatedThreads: flatComments.length, // 1:1 for flat migration
                    dryRun: true
                }
            });
        }
        
        let migrated = 0;
        let errors = 0;
        
        for (const comment of flatComments) {
            try {
                // Convert to threaded comment format
                await req.threadingService.createComment({
                    postId: comment.post_id,
                    content: comment.content,
                    author: comment.author || 'unknown',
                    authorType: 'user' // Assume user comments for migration
                });
                migrated++;
            } catch (error) {
                console.error(`Failed to migrate comment ${comment.id}:`, error);
                errors++;
            }
        }
        
        res.json({
            success: true,
            message: 'Migration completed',
            data: {
                totalComments: flatComments.length,
                migrated,
                errors,
                success_rate: migrated / flatComments.length
            }
        });
    } catch (error) {
        console.error('❌ Error during migration:', error);
        res.status(500).json({
            success: false,
            error: 'Migration failed',
            details: error.message
        });
    }
});

export default router;