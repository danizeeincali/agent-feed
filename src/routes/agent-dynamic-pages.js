/**
 * Agent Dynamic Pages API Routes
 * 
 * Provides RESTful API endpoints for managing agent pages with real database integration.
 * All endpoints use real data with comprehensive validation, error handling, and security.
 * 
 * Endpoints:
 * - GET    /api/agents/:agentId/pages           - List all pages for agent
 * - GET    /api/agents/:agentId/pages/:pageId   - Get specific page
 * - POST   /api/agents/:agentId/pages           - Create new page
 * - PUT    /api/agents/:agentId/pages/:pageId   - Update page
 * - DELETE /api/agents/:agentId/pages/:pageId   - Delete page
 */

import express from 'express';
import { databaseService } from '../database/DatabaseService.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Input validation middleware
const validatePageData = (req, res, next) => {
  const { title, content_type, content_value } = req.body;
  
  // Required fields validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Title is required and must be a non-empty string',
      code: 'VALIDATION_ERROR',
      field: 'title'
    });
  }
  
  if (!content_type || !['text', 'markdown', 'json', 'component'].includes(content_type)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'content_type must be one of: text, markdown, json, component',
      code: 'VALIDATION_ERROR',
      field: 'content_type'
    });
  }
  
  if (!content_value || typeof content_value !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'content_value is required and must be a string',
      code: 'VALIDATION_ERROR',
      field: 'content_value'
    });
  }
  
  // Sanitize input
  req.body.title = title.trim().substring(0, 500); // Limit title length
  req.body.content_value = content_value.trim();
  
  // Validate status if provided
  if (req.body.status && !['draft', 'published', 'archived'].includes(req.body.status)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'status must be one of: draft, published, archived',
      code: 'VALIDATION_ERROR',
      field: 'status'
    });
  }
  
  // Validate tags if provided
  if (req.body.tags && !Array.isArray(req.body.tags)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'tags must be an array',
      code: 'VALIDATION_ERROR',
      field: 'tags'
    });
  }
  
  next();
};

// Agent existence validation middleware
const validateAgentExists = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Agent ID is required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    const agent = await databaseService.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Agent not found',
        code: 'AGENT_NOT_FOUND',
        agentId
      });
    }
    
    req.agent = agent;
    next();
  } catch (error) {
    console.error('Agent validation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to validate agent',
      code: 'VALIDATION_ERROR'
    });
  }
};

// Rate limiting middleware (simple implementation)
const rateLimitMap = new Map();
const rateLimit = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!rateLimitMap.has(clientId)) {
      rateLimitMap.set(clientId, []);
    }
    
    const requests = rateLimitMap.get(clientId);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    validRequests.push(now);
    rateLimitMap.set(clientId, validRequests);
    
    next();
  };
};

// Apply rate limiting to all routes
router.use(rateLimit(100, 60000));

/**
 * GET /api/agents/:agentId/pages
 * 
 * List all pages for a specific agent with filtering and pagination.
 * 
 * Query Parameters:
 * - page_type: Filter by page type (persistent, dynamic, template)
 * - status: Filter by status (draft, published, archived)
 * - content_type: Filter by content type (text, markdown, json, component)
 * - search: Search in title and content
 * - limit: Number of results to return (default: 20)
 * - offset: Number of results to skip (default: 0)
 * - sortBy: Field to sort by (default: created_at)
 * - sortOrder: Sort order (ASC, DESC, default: DESC)
 */
router.get('/agents/:agentId/pages', validateAgentExists, async (req, res) => {
  try {
    const { agentId } = req.params;
    const {
      page_type,
      status,
      content_type,
      search,
      limit = 20,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    // Validate query parameters
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'limit must be a number between 1 and 100',
        code: 'VALIDATION_ERROR'
      });
    }
    
    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'offset must be a non-negative number',
        code: 'VALIDATION_ERROR'
      });
    }
    
    const filters = {
      page_type,
      status,
      content_type,
      search,
      limit: limitNum,
      offset: offsetNum,
      sortBy,
      sortOrder: sortOrder.toUpperCase()
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });
    
    const pages = await databaseService.getAgentPages(agentId, filters);
    
    // Get total count for pagination
    const totalPages = await databaseService.getAgentPages(agentId, { ...filters, limit: undefined, offset: undefined });
    const total = totalPages.length;
    
    res.json({
      success: true,
      data: {
        pages,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < total
        },
        agent: {
          id: req.agent.id,
          name: req.agent.name,
          display_name: req.agent.display_name
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error listing agent pages:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve agent pages',
      code: 'DATABASE_ERROR'
    });
  }
});

/**
 * GET /api/agents/:agentId/pages/:pageId
 * 
 * Get a specific page by ID for an agent.
 */
router.get('/agents/:agentId/pages/:pageId', validateAgentExists, async (req, res) => {
  try {
    const { agentId, pageId } = req.params;
    
    if (!pageId || typeof pageId !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Page ID is required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    const page = await databaseService.getAgentPage(agentId, pageId);
    
    if (!page) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Page not found',
        code: 'PAGE_NOT_FOUND',
        pageId
      });
    }
    
    res.json({
      success: true,
      data: {
        page,
        agent: {
          id: req.agent.id,
          name: req.agent.name,
          display_name: req.agent.display_name
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error retrieving agent page:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve page',
      code: 'DATABASE_ERROR'
    });
  }
});

/**
 * POST /api/agents/:agentId/pages
 * 
 * Create a new page for an agent.
 * 
 * Required body parameters:
 * - title: Page title (string, max 500 chars)
 * - content_type: Content type (text, markdown, json, component)
 * - content_value: Page content (string)
 * 
 * Optional body parameters:
 * - content_metadata: Additional metadata (object)
 * - status: Page status (draft, published, archived, default: draft)
 * - tags: Array of tags
 * - version: Version number (default: 1)
 */
router.post('/agents/:agentId/pages', validateAgentExists, validatePageData, async (req, res) => {
  try {
    const { agentId } = req.params;
    const {
      title,
      content_type,
      content_value,
      content_metadata = {},
      status = 'draft',
      tags = [],
      version = 1
    } = req.body;
    
    const pageData = {
      id: uuidv4(),
      agent_id: agentId,
      title,
      page_type: 'dynamic', // Default for user-created pages
      content_type,
      content_value,
      content_metadata,
      status,
      tags,
      version
    };
    
    const createdPage = await databaseService.createAgentPage(pageData);
    
    res.status(201).json({
      success: true,
      data: {
        page: createdPage,
        agent: {
          id: req.agent.id,
          name: req.agent.name,
          display_name: req.agent.display_name
        }
      },
      message: 'Page created successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error creating agent page:', error);
    
    // Handle specific database constraint errors
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A page with this title already exists for this agent',
        code: 'DUPLICATE_PAGE'
      });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create page',
      code: 'DATABASE_ERROR'
    });
  }
});

/**
 * PUT /api/agents/:agentId/pages/:pageId
 * 
 * Update an existing page.
 * 
 * Updatable fields:
 * - title: Page title
 * - content_value: Page content
 * - content_metadata: Additional metadata
 * - status: Page status
 * - tags: Array of tags
 * - version: Version number
 */
router.put('/agents/:agentId/pages/:pageId', validateAgentExists, async (req, res) => {
  try {
    const { agentId, pageId } = req.params;
    
    if (!pageId || typeof pageId !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Page ID is required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Check if page exists
    const existingPage = await databaseService.getAgentPage(agentId, pageId);
    if (!existingPage) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Page not found',
        code: 'PAGE_NOT_FOUND',
        pageId
      });
    }
    
    // Validate and sanitize update data
    const updateData = {};
    const allowedFields = ['title', 'content_value', 'content_metadata', 'status', 'tags', 'version'];
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    });
    
    // Validate specific fields if they're being updated
    if (updateData.title) {
      if (typeof updateData.title !== 'string' || updateData.title.trim().length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'title must be a non-empty string',
          code: 'VALIDATION_ERROR',
          field: 'title'
        });
      }
      updateData.title = updateData.title.trim().substring(0, 500);
    }
    
    if (updateData.status && !['draft', 'published', 'archived'].includes(updateData.status)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'status must be one of: draft, published, archived',
        code: 'VALIDATION_ERROR',
        field: 'status'
      });
    }
    
    if (updateData.tags && !Array.isArray(updateData.tags)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'tags must be an array',
        code: 'VALIDATION_ERROR',
        field: 'tags'
      });
    }
    
    if (updateData.version && (!Number.isInteger(updateData.version) || updateData.version < 1)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'version must be a positive integer',
        code: 'VALIDATION_ERROR',
        field: 'version'
      });
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No valid fields provided for update',
        code: 'VALIDATION_ERROR'
      });
    }
    
    const updatedPage = await databaseService.updateAgentPage(agentId, pageId, updateData);
    
    if (!updatedPage) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update page',
        code: 'UPDATE_FAILED'
      });
    }
    
    res.json({
      success: true,
      data: {
        page: updatedPage,
        agent: {
          id: req.agent.id,
          name: req.agent.name,
          display_name: req.agent.display_name
        }
      },
      message: 'Page updated successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error updating agent page:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update page',
      code: 'DATABASE_ERROR'
    });
  }
});

/**
 * DELETE /api/agents/:agentId/pages/:pageId
 * 
 * Delete a specific page.
 */
router.delete('/agents/:agentId/pages/:pageId', validateAgentExists, async (req, res) => {
  try {
    const { agentId, pageId } = req.params;
    
    if (!pageId || typeof pageId !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Page ID is required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Check if page exists
    const existingPage = await databaseService.getAgentPage(agentId, pageId);
    if (!existingPage) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Page not found',
        code: 'PAGE_NOT_FOUND',
        pageId
      });
    }
    
    const deleted = await databaseService.deleteAgentPage(agentId, pageId);
    
    if (!deleted) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete page',
        code: 'DELETE_FAILED'
      });
    }
    
    res.json({
      success: true,
      data: {
        deletedPageId: pageId,
        agent: {
          id: req.agent.id,
          name: req.agent.name,
          display_name: req.agent.display_name
        }
      },
      message: 'Page deleted successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error deleting agent page:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete page',
      code: 'DATABASE_ERROR'
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Agent Dynamic Pages API Error:', error);
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request payload exceeds size limit',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid JSON in request body',
      code: 'INVALID_JSON'
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  });
});

export default router;
