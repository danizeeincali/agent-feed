"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const connection_1 = require("@/database/connection");
const logger_1 = require("@/utils/logger");
const router = express_1.default.Router();
// Validation middleware
const validatePostData = (req, res, next) => {
    const { title, content, authorAgent } = req.body;
    if (!title?.trim()) {
        return res.status(400).json({
            success: false,
            error: 'Title is required'
        });
    }
    if (!content?.trim()) {
        return res.status(400).json({
            success: false,
            error: 'Content is required'
        });
    }
    if (!authorAgent?.trim()) {
        return res.status(400).json({
            success: false,
            error: 'Author agent is required'
        });
    }
    // Validate title length
    if (title.length > 500) {
        return res.status(400).json({
            success: false,
            error: 'Title must be less than 500 characters'
        });
    }
    // Validate content length
    if (content.length > 50000) {
        return res.status(400).json({
            success: false,
            error: 'Content must be less than 50,000 characters'
        });
    }
    next();
};
// POST /api/v1/posts - Create a new post
router.post('/', validatePostData, async (req, res) => {
    try {
        const { title, content, authorAgent, metadata = {} } = req.body;
        // Set default metadata
        const postMetadata = {
            businessImpact: 5,
            tags: [],
            isAgentResponse: true,
            postType: 'insight',
            ...metadata
        };
        const postId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const query = `
      INSERT INTO posts (
        id, title, content, author_agent, metadata, 
        published_at, created_at, updated_at,
        like_count, heart_count, bookmark_count, 
        share_count, view_count, comment_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, 0, 0, 0, 0)
      RETURNING *
    `;
        const values = [
            postId,
            title.trim(),
            content.trim(),
            authorAgent.trim(),
            JSON.stringify(postMetadata),
            now,
            now,
            now
        ];
        const result = await connection_1.db.query(query, values);
        const post = result.rows[0];
        // Format response
        const responsePost = {
            id: post.id,
            title: post.title,
            content: post.content,
            authorAgent: post.author_agent,
            metadata: post.metadata,
            publishedAt: post.published_at,
            createdAt: post.created_at,
            updatedAt: post.updated_at,
            engagement: {
                likes: post.like_count,
                hearts: post.heart_count,
                bookmarks: post.bookmark_count,
                shares: post.share_count,
                views: post.view_count,
                comments: post.comment_count
            }
        };
        logger_1.logger.info('Post created successfully', { postId, authorAgent });
        res.status(201).json({
            success: true,
            data: responsePost
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to create post', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to create post'
        });
    }
});
// GET /api/v1/posts - Get all posts with filtering and pagination
router.get('/', async (req, res) => {
    try {
        const { limit = '20', offset = '0', authorAgent, search, tags, postType, sort = 'newest' } = req.query;
        let query = `
      SELECT 
        p.*,
        p.author_agent as authorAgent,
        p.published_at as publishedAt,
        p.created_at as createdAt,
        p.updated_at as updatedAt
      FROM posts p 
      WHERE p.status = 'published' AND p.visibility = 'public'
    `;
        const values = [];
        let valueIndex = 1;
        // Apply filters
        if (authorAgent) {
            query += ` AND p.author_agent = $${valueIndex}`;
            values.push(authorAgent);
            valueIndex++;
        }
        if (search) {
            query += ` AND (
        to_tsvector('english', p.title || ' ' || p.content) @@ plainto_tsquery('english', $${valueIndex})
        OR p.title ILIKE $${valueIndex + 1}
        OR p.content ILIKE $${valueIndex + 1}
      )`;
            values.push(search, `%${search}%`);
            valueIndex += 2;
        }
        if (tags) {
            query += ` AND p.metadata->'tags' ? $${valueIndex}`;
            values.push(tags);
            valueIndex++;
        }
        if (postType) {
            query += ` AND p.metadata->>'postType' = $${valueIndex}`;
            values.push(postType);
            valueIndex++;
        }
        // Apply sorting
        switch (sort) {
            case 'oldest':
                query += ' ORDER BY p.published_at ASC';
                break;
            case 'popular':
                query += ' ORDER BY (p.like_count + p.heart_count + p.share_count) DESC, p.published_at DESC';
                break;
            case 'engagement':
                query += ' ORDER BY (p.like_count + p.heart_count + p.comment_count + p.share_count) DESC, p.published_at DESC';
                break;
            case 'newest':
            default:
                query += ' ORDER BY p.published_at DESC';
                break;
        }
        // Apply pagination
        query += ` LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
        values.push(parseInt(limit), parseInt(offset));
        const result = await connection_1.db.query(query, values);
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM posts p WHERE p.status = \'published\' AND p.visibility = \'public\'';
        const countValues = [];
        let countIndex = 1;
        if (authorAgent) {
            countQuery += ` AND p.author_agent = $${countIndex}`;
            countValues.push(authorAgent);
            countIndex++;
        }
        if (search) {
            countQuery += ` AND (
        to_tsvector('english', p.title || ' ' || p.content) @@ plainto_tsquery('english', $${countIndex})
        OR p.title ILIKE $${countIndex + 1}
        OR p.content ILIKE $${countIndex + 1}
      )`;
            countValues.push(search, `%${search}%`);
            countIndex += 2;
        }
        const countResult = await connection_1.db.query(countQuery, countValues);
        const total = parseInt(countResult.rows[0].total);
        // Format posts
        const posts = result.rows.map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
            authorAgent: post.author_agent,
            metadata: post.metadata,
            publishedAt: post.published_at,
            createdAt: post.created_at,
            updatedAt: post.updated_at,
            engagement: {
                likes: post.like_count,
                hearts: post.heart_count,
                bookmarks: post.bookmark_count,
                shares: post.share_count,
                views: post.view_count,
                comments: post.comment_count
            }
        }));
        res.json({
            success: true,
            data: posts,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total,
                hasMore: parseInt(offset) + parseInt(limit) < total
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch posts', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch posts'
        });
    }
});
// GET /api/v1/posts/:id - Get a specific post
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Post ID is required'
            });
        }
        const query = `
      SELECT 
        p.*,
        p.author_agent as authorAgent,
        p.published_at as publishedAt,
        p.created_at as createdAt,
        p.updated_at as updatedAt
      FROM posts p 
      WHERE p.id = $1 AND p.status != 'deleted'
    `;
        const result = await connection_1.db.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }
        const post = result.rows[0];
        // Increment view count
        await connection_1.db.query('UPDATE posts SET view_count = view_count + 1 WHERE id = $1', [id]);
        const responsePost = {
            id: post.id,
            title: post.title,
            content: post.content,
            authorAgent: post.author_agent,
            metadata: post.metadata,
            publishedAt: post.published_at,
            createdAt: post.created_at,
            updatedAt: post.updated_at,
            engagement: {
                likes: post.like_count,
                hearts: post.heart_count,
                bookmarks: post.bookmark_count,
                shares: post.share_count,
                views: post.view_count + 1, // Include the increment
                comments: post.comment_count
            }
        };
        res.json({
            success: true,
            data: responsePost
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch post', { error, postId: req.params.id });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch post'
        });
    }
});
// PUT /api/v1/posts/:id - Update a post
router.put('/:id', validatePostData, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, metadata } = req.body;
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Post ID is required'
            });
        }
        const updateQuery = `
      UPDATE posts 
      SET 
        title = COALESCE($2, title),
        content = COALESCE($3, content),
        metadata = COALESCE($4, metadata),
        updated_at = NOW()
      WHERE id = $1 AND status != 'deleted'
      RETURNING *
    `;
        const values = [
            id,
            title?.trim(),
            content?.trim(),
            metadata ? JSON.stringify(metadata) : null
        ];
        const result = await connection_1.db.query(updateQuery, values);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }
        const post = result.rows[0];
        const responsePost = {
            id: post.id,
            title: post.title,
            content: post.content,
            authorAgent: post.author_agent,
            metadata: post.metadata,
            publishedAt: post.published_at,
            createdAt: post.created_at,
            updatedAt: post.updated_at,
            engagement: {
                likes: post.like_count,
                hearts: post.heart_count,
                bookmarks: post.bookmark_count,
                shares: post.share_count,
                views: post.view_count,
                comments: post.comment_count
            }
        };
        logger_1.logger.info('Post updated successfully', { postId: id });
        res.json({
            success: true,
            data: responsePost
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to update post', { error, postId: req.params.id });
        res.status(500).json({
            success: false,
            error: 'Failed to update post'
        });
    }
});
// DELETE /api/v1/posts/:id - Delete a post
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Post ID is required'
            });
        }
        // Soft delete - mark as deleted
        const deleteQuery = `
      UPDATE posts 
      SET status = 'deleted', updated_at = NOW()
      WHERE id = $1 AND status != 'deleted'
      RETURNING id
    `;
        const result = await connection_1.db.query(deleteQuery, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }
        logger_1.logger.info('Post deleted successfully', { postId: id });
        res.json({
            success: true,
            message: 'Post deleted successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete post', { error, postId: req.params.id });
        res.status(500).json({
            success: false,
            error: 'Failed to delete post'
        });
    }
});
// POST /api/v1/posts/:id/like - Toggle like on a post
router.post('/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, anonymous = false } = req.body;
        const userAgent = req.get('User-Agent') || 'unknown';
        const ipAddress = req.ip;
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Post ID is required'
            });
        }
        // Check if post exists
        const postCheck = await connection_1.db.query('SELECT id FROM posts WHERE id = $1 AND status = \'published\'', [id]);
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
        }
        else {
            existingLikeQuery = 'SELECT id FROM post_likes WHERE post_id = $1 AND user_agent = $2 AND ip_address = $3';
            existingLikeValues = [id, userAgent, ipAddress];
        }
        const existingLike = await connection_1.db.query(existingLikeQuery, existingLikeValues);
        if (existingLike.rows.length > 0) {
            // Remove like
            await connection_1.db.query('DELETE FROM post_likes WHERE id = $1', [existingLike.rows[0].id]);
        }
        else {
            // Add like
            const likeId = (0, uuid_1.v4)();
            const insertQuery = `
        INSERT INTO post_likes (id, post_id, user_id, user_agent, ip_address)
        VALUES ($1, $2, $3, $4, $5)
      `;
            await connection_1.db.query(insertQuery, [likeId, id, userId || null, userAgent, ipAddress]);
        }
        // Get updated count
        const countResult = await connection_1.db.query('SELECT like_count FROM posts WHERE id = $1', [id]);
        const likeCount = countResult.rows[0]?.like_count || 0;
        res.json({
            success: true,
            data: {
                liked: existingLike.rows.length === 0,
                likeCount,
                ...(anonymous && { anonymous: true })
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to toggle post like', { error, postId: req.params.id });
        res.status(500).json({
            success: false,
            error: 'Failed to toggle like'
        });
    }
});
exports.default = router;
//# sourceMappingURL=posts.js.map