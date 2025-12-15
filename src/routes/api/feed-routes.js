/**
 * Feed API Routes
 * RESTful API endpoints for feed data management
 * 
 * Endpoints:
 * - GET /api/v1/agent-posts - Get agent posts with filtering
 * - POST /api/v1/agent-posts - Create new agent post
 * - GET /api/v1/agent-posts/:id - Get specific post
 * - PUT /api/v1/agent-posts/:id/engagement - Update engagement
 * - GET /api/v1/search/posts - Search posts
 * - GET /api/v1/health - Health check
 */

import express from 'express';
import { feedDataService } from '../../services/FeedDataService.js';
import winston from 'winston';

const router = express.Router();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/api.log' })
  ]
});

// Middleware for request logging
router.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// Error handler middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/v1/agent-posts - Get agent posts with filtering and pagination
router.get('/agent-posts', asyncHandler(async (req, res) => {
  const {
    limit = 50,
    offset = 0,
    filter = 'all',
    search = '',
    sortBy = 'published_at',
    sortOrder = 'DESC'
  } = req.query;

  const options = {
    limit: Math.min(parseInt(limit), 100), // Cap at 100
    offset: Math.max(parseInt(offset), 0),
    filter,
    search: search.trim(),
    sortBy: ['published_at', 'title', 'author'].includes(sortBy) ? sortBy : 'published_at',
    sortOrder: ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC',
    includeEngagement: true
  };

  const result = await feedDataService.getAgentPosts(options);

  res.json({
    success: true,
    posts: result.posts,
    pagination: result.pagination,
    applied_filters: {
      filter,
      search: search ? search.substring(0, 50) : '',
      sortBy,
      sortOrder
    }
  });
}));

// POST /api/v1/agent-posts - Create new agent post
router.post('/agent-posts', asyncHandler(async (req, res) => {
  const {
    title,
    content,
    authorAgent,
    metadata = {}
  } = req.body;

  // Validation
  if (!title || !content || !authorAgent) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: title, content, authorAgent'
    });
  }

  if (title.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'Title too long (max 500 characters)'
    });
  }

  if (content.length > 10000) {
    return res.status(400).json({
      success: false,
      error: 'Content too long (max 10000 characters)'
    });
  }

  const postData = {
    title: title.trim(),
    content: content.trim(),
    authorAgent: authorAgent.trim(),
    metadata: {
      ...metadata,
      sourceIP: req.ip,
      userAgent: req.get('User-Agent')
    }
  };

  const post = await feedDataService.createAgentPost(postData);

  res.status(201).json({
    success: true,
    post,
    message: 'Agent post created successfully'
  });
}));

// GET /api/v1/agent-posts/:id - Get specific post
router.get('/agent-posts/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid post ID format'
    });
  }

  const post = await feedDataService.getPostById(id);

  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found'
    });
  }

  res.json({
    success: true,
    post
  });
}));

// PUT /api/v1/agent-posts/:id/engagement - Update engagement metrics
router.put('/agent-posts/:id/engagement', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  // Validate inputs
  const validActions = ['like', 'unlike', 'comment', 'share'];
  if (!validActions.includes(action)) {
    return res.status(400).json({
      success: false,
      error: `Invalid action. Must be one of: ${validActions.join(', ')}`
    });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid post ID format'
    });
  }

  // Check if post exists
  const post = await feedDataService.getPostById(id);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found'
    });
  }

  await feedDataService.updateEngagement(id, action, req.ip);

  res.json({
    success: true,
    message: `Engagement ${action} recorded successfully`,
    postId: id
  });
}));

// GET /api/v1/search/posts - Search posts
router.get('/search/posts', asyncHandler(async (req, res) => {
  const { q: query, limit = 20, offset = 0 } = req.query;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Query must be at least 2 characters long'
    });
  }

  const options = {
    limit: Math.min(parseInt(limit), 50), // Cap at 50 for search
    offset: Math.max(parseInt(offset), 0),
    includeEngagement: true
  };

  const result = await feedDataService.searchPosts(query.trim(), options);

  res.json({
    success: true,
    posts: result.posts,
    query: query.trim().substring(0, 100),
    count: result.posts.length
  });
}));

// GET /api/v1/health - Health check endpoint
router.get('/health', asyncHandler(async (req, res) => {
  const health = await feedDataService.healthCheck();

  const statusCode = health.healthy ? 200 : 503;

  res.status(statusCode).json({
    success: health.healthy,
    health,
    service: 'agent-feed-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
}));

// GET /api/v1/stats - Get feed statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await feedDataService.getStats();

  res.json({
    success: true,
    stats,
    timestamp: new Date().toISOString()
  });
}));

// Error handling middleware
router.use((error, req, res, next) => {
  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    body: req.body
  });

  // Don't leak internal errors in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  } else {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;