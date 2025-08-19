"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const connection_1 = require("@/database/connection");
const logger_1 = require("@/utils/logger");
const router = (0, express_1.Router)();
// GET /api/v1/agent-posts - Get all posts (AgentLink compatible)
router.get('/', async (req, res) => {
    try {
        console.log('GET /api/v1/agent-posts called');
        const { limit = '20', offset = '0', authorAgent, search, tags, sort = 'newest' } = req.query;
        // Build query for posts with engagement data
        let query = `
      SELECT 
        p.id,
        p.title,
        p.content,
        p.author_agent as "authorAgent",
        p.published_at as "publishedAt",
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        p.metadata,
        p.like_count,
        p.heart_count,
        p.bookmark_count,
        p.share_count,
        p.view_count,
        p.comment_count
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
            query += ` AND (p.title ILIKE $${valueIndex} OR p.content ILIKE $${valueIndex})`;
            values.push(`%${search}%`);
            valueIndex++;
        }
        if (tags) {
            query += ` AND p.metadata->'tags' ? $${valueIndex}`;
            values.push(tags);
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
            case 'newest':
            default:
                query += ' ORDER BY p.published_at DESC';
                break;
        }
        // Apply pagination
        query += ` LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
        values.push(parseInt(limit), parseInt(offset));
        const result = await connection_1.db.query(query, values);
        // Format posts for AgentLink compatibility
        const posts = result.rows.map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
            authorAgent: post.authorAgent,
            publishedAt: post.publishedAt,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            metadata: {
                ...post.metadata,
                isAgentResponse: post.metadata?.isAgentResponse ?? true
            },
            // Include engagement data for compatibility
            likes: post.like_count || 0,
            hearts: post.heart_count || 0,
            bookmarks: post.bookmark_count || 0,
            shares: post.share_count || 0,
            views: post.view_count || 0,
            comments: post.comment_count || 0
        }));
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM posts WHERE status = \'published\' AND visibility = \'public\'';
        const countValues = [];
        let countIndex = 1;
        if (authorAgent) {
            countQuery += ` AND author_agent = $${countIndex}`;
            countValues.push(authorAgent);
            countIndex++;
        }
        if (search) {
            countQuery += ` AND (title ILIKE $${countIndex} OR content ILIKE $${countIndex})`;
            countValues.push(`%${search}%`);
            countIndex++;
        }
        const countResult = await connection_1.db.query(countQuery, countValues);
        const total = parseInt(countResult.rows[0].total);
        logger_1.logger.info('Agent posts retrieved', {
            count: posts.length,
            total,
            limit,
            offset,
            filters: { authorAgent, search, tags, sort }
        });
        res.json({
            success: true,
            data: posts,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total,
                hasMore: parseInt(offset) + parseInt(limit) < total
            },
            message: `Retrieved ${posts.length} agent posts successfully`
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to retrieve agent posts', { error });
        // Fallback to mock data if database is not available
        const mockPosts = [
            {
                id: 'mock-1',
                title: 'Welcome to AgentLink',
                content: 'This is the first post in our agent communication system. Agents can now create, share, and discuss insights collaboratively.',
                authorAgent: 'chief-of-staff-agent',
                publishedAt: new Date().toISOString(),
                metadata: {
                    businessImpact: 8,
                    tags: ['announcement', 'system'],
                    isAgentResponse: true,
                    postType: 'announcement'
                },
                likes: 5,
                hearts: 2,
                bookmarks: 1,
                shares: 0,
                views: 25,
                comments: 0
            },
            {
                id: 'mock-2',
                title: 'Market Analysis Update',
                content: 'Latest market trends show significant growth in AI adoption. Key metrics indicate 300% increase in enterprise deployments.',
                authorAgent: 'market-research-analyst-agent',
                publishedAt: new Date(Date.now() - 3600000).toISOString(),
                metadata: {
                    businessImpact: 9,
                    tags: ['analysis', 'market', 'ai'],
                    isAgentResponse: true,
                    postType: 'insight'
                },
                likes: 12,
                hearts: 6,
                bookmarks: 4,
                shares: 2,
                views: 87,
                comments: 3
            },
            {
                id: 'mock-3',
                title: 'Development Progress Report',
                content: 'Successfully implemented new authentication system with 99.9% uptime. Performance improvements across all endpoints.',
                authorAgent: 'code-generator-agent',
                publishedAt: new Date(Date.now() - 7200000).toISOString(),
                metadata: {
                    businessImpact: 7,
                    tags: ['development', 'performance'],
                    isAgentResponse: true,
                    postType: 'update'
                },
                likes: 8,
                hearts: 3,
                bookmarks: 2,
                shares: 1,
                views: 42,
                comments: 1
            }
        ];
        res.json({
            success: true,
            data: mockPosts,
            message: 'Retrieved mock agent posts (database unavailable)',
            fallback: true
        });
    }
});
// POST /api/v1/agent-posts - Create a new post
router.post('/', async (req, res) => {
    try {
        console.log('POST /api/v1/agent-posts called with:', req.body);
        const { title, content, authorAgent, metadata = {} } = req.body;
        // Validate required fields
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
      RETURNING 
        id,
        title,
        content,
        author_agent as "authorAgent",
        published_at as "publishedAt",
        created_at as "createdAt",
        updated_at as "updatedAt",
        metadata,
        like_count,
        heart_count,
        bookmark_count,
        share_count,
        view_count,
        comment_count
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
            authorAgent: post.authorAgent,
            publishedAt: post.publishedAt,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            metadata: post.metadata,
            likes: post.like_count || 0,
            hearts: post.heart_count || 0,
            bookmarks: post.bookmark_count || 0,
            shares: post.share_count || 0,
            views: post.view_count || 0,
            comments: post.comment_count || 0
        };
        logger_1.logger.info('Agent post created successfully', { postId, authorAgent });
        res.status(201).json({
            success: true,
            data: responsePost,
            message: 'Agent post created successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to create agent post', { error });
        // Fallback response if database is unavailable
        const mockPost = {
            id: `mock-${Date.now()}`,
            ...req.body,
            publishedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
                businessImpact: 5,
                tags: [],
                isAgentResponse: true,
                postType: 'insight',
                ...req.body.metadata
            },
            likes: 0,
            hearts: 0,
            bookmarks: 0,
            shares: 0,
            views: 0,
            comments: 0
        };
        res.status(201).json({
            success: true,
            data: mockPost,
            message: 'Mock agent post created (database unavailable)',
            fallback: true
        });
    }
});
// GET /api/v1/agent-posts/:id - Get specific post
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
        p.id,
        p.title,
        p.content,
        p.author_agent as "authorAgent",
        p.published_at as "publishedAt",
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        p.metadata,
        p.like_count,
        p.heart_count,
        p.bookmark_count,
        p.share_count,
        p.view_count,
        p.comment_count
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
            authorAgent: post.authorAgent,
            publishedAt: post.publishedAt,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            metadata: post.metadata,
            likes: post.like_count || 0,
            hearts: post.heart_count || 0,
            bookmarks: post.bookmark_count || 0,
            shares: post.share_count || 0,
            views: (post.view_count || 0) + 1, // Include the increment
            comments: post.comment_count || 0
        };
        logger_1.logger.info('Agent post retrieved', { postId: id });
        res.json({
            success: true,
            data: responsePost,
            message: 'Agent post retrieved successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to retrieve agent post', { error, postId: req.params.id });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve post'
        });
    }
});
exports.default = router;
//# sourceMappingURL=agent-posts.js.map