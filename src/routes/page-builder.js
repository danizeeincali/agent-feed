/**
 * PageBuilder Express Routes - RESTful API and WebSocket Integration
 * 
 * Provides HTTP endpoints and WebSocket server integration for page building
 * operations with comprehensive error handling, validation, and monitoring.
 * 
 * Features:
 * - RESTful CRUD operations for pages
 * - WebSocket server initialization
 * - Memory-safe request handling
 * - Authentication and authorization middleware
 * - Rate limiting and request validation
 * - Comprehensive error handling and logging
 * - Health check and monitoring endpoints
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, param, query, validationResult } = require('express-validator');
const PageBuilderService = require('../services/workspace/PageBuilderService');
const PageBuilderCommunicationProtocol = require('../services/workspace/PageBuilderCommunicationProtocol');
const { performance } = require('perf_hooks');

class PageBuilderRoutes {
  constructor(options = {}) {
    this.router = express.Router();
    this.logger = console; // Replace with proper logger in production
    
    // Initialize services
    this.pageBuilderService = new PageBuilderService(options.serviceConfig);
    this.communicationProtocol = new PageBuilderCommunicationProtocol(options.protocolConfig);
    
    // Configuration
    this.config = {
      enableMetrics: options.enableMetrics !== false,
      enableHealthChecks: options.enableHealthChecks !== false,
      maxRequestSize: options.maxRequestSize || '10mb',
      requestTimeout: options.requestTimeout || 30000, // 30 seconds
      ...options
    };
    
    // Request metrics
    this.requestMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: null
    };
    
    // Initialize middleware and routes
    this.initializeMiddleware();
    this.initializeRoutes();
    this.connectServices();
    
    this.logger.info('PageBuilder routes initialized');
  }

  /**
   * Initialize middleware for security, validation, and monitoring
   */
  initializeMiddleware() {
    // Security headers
    this.router.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        this.requestMetrics.failedRequests++;
        this.logger.warn('Rate limit exceeded', { 
          ip: req.ip, 
          userAgent: req.get('User-Agent') 
        });
        res.status(429).json({
          error: 'Too many requests from this IP, please try again later',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }
    });
    this.router.use(limiter);

    // Request size limiting
    this.router.use(express.json({ 
      limit: this.config.maxRequestSize,
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.router.use(express.urlencoded({ extended: true, limit: this.config.maxRequestSize }));

    // Request timeout middleware
    this.router.use((req, res, next) => {
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          this.requestMetrics.failedRequests++;
          this.logger.error('Request timeout', { url: req.url, method: req.method });
          res.status(408).json({
            error: 'Request timeout',
            code: 'REQUEST_TIMEOUT'
          });
        }
      }, this.config.requestTimeout);

      res.on('finish', () => clearTimeout(timeout));
      res.on('close', () => clearTimeout(timeout));
      
      next();
    });

    // Request logging and metrics
    this.router.use((req, res, next) => {
      const startTime = performance.now();
      this.requestMetrics.totalRequests++;
      this.requestMetrics.lastRequestTime = new Date();
      
      // Log incoming request
      this.logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentLength: req.get('Content-Length') || 0
      });

      // Override res.end to capture response metrics
      const originalEnd = res.end;
      res.end = function(...args) {
        const duration = performance.now() - startTime;
        
        // Update metrics
        if (res.statusCode >= 200 && res.statusCode < 400) {
          this.requestMetrics.successfulRequests++;
        } else {
          this.requestMetrics.failedRequests++;
        }
        
        // Update average response time
        const totalSuccess = this.requestMetrics.successfulRequests + this.requestMetrics.failedRequests;
        this.requestMetrics.averageResponseTime = 
          ((this.requestMetrics.averageResponseTime * (totalSuccess - 1)) + duration) / totalSuccess;
        
        // Log response
        this.logger.info('Request completed', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: Math.round(duration),
          memoryUsage: process.memoryUsage().heapUsed
        });
        
        originalEnd.apply(this, args);
      }.bind(this);

      next();
    });

    // Authentication middleware
    this.router.use(this.authenticateAgent.bind(this));
  }

  /**
   * Initialize all routes
   */
  initializeRoutes() {
    // Health check endpoint
    if (this.config.enableHealthChecks) {
      this.router.get('/health', this.getHealth.bind(this));
      this.router.get('/metrics', this.getMetrics.bind(this));
    }

    // Page CRUD operations
    this.router.post('/pages', 
      this.validateCreatePage(),
      this.handleValidationErrors.bind(this),
      this.createPage.bind(this)
    );

    this.router.get('/pages/:pageId',
      this.validatePageId(),
      this.handleValidationErrors.bind(this),
      this.getPage.bind(this)
    );

    this.router.put('/pages/:pageId',
      this.validatePageId(),
      this.validateUpdatePage(),
      this.handleValidationErrors.bind(this),
      this.updatePage.bind(this)
    );

    this.router.delete('/pages/:pageId',
      this.validatePageId(),
      this.handleValidationErrors.bind(this),
      this.deletePage.bind(this)
    );

    // Page listing with filtering and pagination
    this.router.get('/pages',
      this.validateListPages(),
      this.handleValidationErrors.bind(this),
      this.listPages.bind(this)
    );

    // Page collaboration endpoints
    this.router.post('/pages/:pageId/collaborate',
      this.validatePageId(),
      this.validateCollaboration(),
      this.handleValidationErrors.bind(this),
      this.collaborateOnPage.bind(this)
    );

    // Workspace-specific page operations
    this.router.get('/workspaces/:workspaceId/pages',
      this.validateWorkspaceId(),
      this.validateListPages(),
      this.handleValidationErrors.bind(this),
      this.listWorkspacePages.bind(this)
    );

    // WebSocket endpoint for real-time communication
    this.router.get('/ws-info', this.getWebSocketInfo.bind(this));

    // Error handling middleware
    this.router.use(this.errorHandler.bind(this));
  }

  /**
   * Connect services and set up event listeners
   */
  connectServices() {
    // Connect PageBuilderService to CommunicationProtocol
    this.communicationProtocol.on('pageCreateRequest', async (event) => {
      try {
        const result = await this.pageBuilderService.createPage(
          event.agentId,
          event.data,
          { requestId: event.requestId }
        );
        event.respond(result);
      } catch (error) {
        event.respond(null, error);
      }
    });

    this.communicationProtocol.on('pageUpdateRequest', async (event) => {
      try {
        const result = await this.pageBuilderService.updatePage(
          event.agentId,
          event.data.pageId,
          event.data,
          { requestId: event.requestId }
        );
        event.respond(result);
      } catch (error) {
        event.respond(null, error);
      }
    });

    this.communicationProtocol.on('pageDeleteRequest', async (event) => {
      try {
        const result = await this.pageBuilderService.deletePage(
          event.agentId,
          event.data.pageId,
          { requestId: event.requestId }
        );
        event.respond(result);
      } catch (error) {
        event.respond(null, error);
      }
    });

    // Forward real-time updates from service to protocol
    this.pageBuilderService.on('pageCreated', (data) => {
      this.communicationProtocol.emit('realTimeUpdate', {
        event: 'page_created',
        payload: data
      });
    });

    this.pageBuilderService.on('pageUpdated', (data) => {
      this.communicationProtocol.emit('realTimeUpdate', {
        event: 'page_updated',
        payload: data
      });
    });

    this.pageBuilderService.on('pageDeleted', (data) => {
      this.communicationProtocol.emit('realTimeUpdate', {
        event: 'page_deleted',
        payload: data
      });
    });
  }

  /**
   * Initialize WebSocket server (called by main server)
   */
  initializeWebSocket(server) {
    this.communicationProtocol.initializeWebSocketServer(server);
    this.logger.info('WebSocket server initialized for page builder');
  }

  /**
   * Authentication middleware
   */
  async authenticateAgent(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          error: 'Authorization header required',
          code: 'MISSING_AUTH_HEADER'
        });
      }

      const token = authHeader.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({
          error: 'Invalid authorization format',
          code: 'INVALID_AUTH_FORMAT'
        });
      }

      // Verify token (implement your authentication logic here)
      const agentInfo = await this.verifyAuthToken(token);
      if (!agentInfo) {
        return res.status(401).json({
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        });
      }

      // Attach agent info to request
      req.agent = agentInfo;
      next();
      
    } catch (error) {
      this.logger.error('Authentication failed', { error: error.message });
      res.status(401).json({
        error: 'Authentication failed',
        code: 'AUTH_FAILED'
      });
    }
  }

  /**
   * Verify authentication token
   */
  async verifyAuthToken(token) {
    // Implement your token verification logic here
    // This could involve JWT verification, database lookup, etc.
    
    // Simplified example
    if (!token.startsWith('agent_')) {
      return null;
    }

    return {
      agentId: token.split('_')[1],
      workspace: 'default',
      permissions: ['read', 'write', 'delete']
    };
  }

  /**
   * Validation middleware factories
   */
  validateCreatePage() {
    return [
      body('title')
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage('Title must be a string between 1 and 200 characters'),
      body('workspaceId')
        .isString()
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('WorkspaceId must contain only alphanumeric characters, hyphens, and underscores'),
      body('description')
        .optional()
        .isString()
        .isLength({ max: 1000 })
        .withMessage('Description must be a string with maximum 1000 characters'),
      body('content')
        .optional()
        .custom((value) => {
          if (typeof value === 'string' && value.length > 100000) {
            throw new Error('Content too large (max 100KB)');
          }
          return true;
        }),
      body('components')
        .optional()
        .isArray()
        .withMessage('Components must be an array')
    ];
  }

  validateUpdatePage() {
    return [
      body('title')
        .optional()
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage('Title must be a string between 1 and 200 characters'),
      body('description')
        .optional()
        .isString()
        .isLength({ max: 1000 })
        .withMessage('Description must be a string with maximum 1000 characters'),
      body('content')
        .optional()
        .custom((value) => {
          if (typeof value === 'string' && value.length > 100000) {
            throw new Error('Content too large (max 100KB)');
          }
          return true;
        }),
      body('components')
        .optional()
        .isArray()
        .withMessage('Components must be an array')
    ];
  }

  validatePageId() {
    return [
      param('pageId')
        .isString()
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid page ID format')
    ];
  }

  validateWorkspaceId() {
    return [
      param('workspaceId')
        .isString()
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid workspace ID format')
    ];
  }

  validateListPages() {
    return [
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be an integer between 1 and 100'),
      query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer'),
      query('sortBy')
        .optional()
        .isIn(['createdAt', 'updatedAt', 'title'])
        .withMessage('SortBy must be one of: createdAt, updatedAt, title'),
      query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('SortOrder must be either asc or desc')
    ];
  }

  validateCollaboration() {
    return [
      body('action')
        .isString()
        .isIn(['invite', 'share', 'request_edit'])
        .withMessage('Action must be one of: invite, share, request_edit'),
      body('targetAgentId')
        .isString()
        .withMessage('Target agent ID is required'),
      body('payload')
        .optional()
        .isObject()
        .withMessage('Payload must be an object')
    ];
  }

  /**
   * Handle validation errors
   */
  handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      this.requestMetrics.failedRequests++;
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }
    next();
  }

  /**
   * Route handlers
   */
  async createPage(req, res) {
    try {
      const startTime = performance.now();
      
      const page = await this.pageBuilderService.createPage(
        req.agent.agentId,
        req.body
      );
      
      const duration = performance.now() - startTime;
      
      this.logger.info('Page created via API', {
        pageId: page.id,
        agentId: req.agent.agentId,
        duration: Math.round(duration)
      });
      
      res.status(201).json({
        success: true,
        data: page,
        metadata: {
          createdAt: new Date(),
          duration: Math.round(duration)
        }
      });
      
    } catch (error) {
      this.handleServiceError(res, error, 'Page creation failed');
    }
  }

  async getPage(req, res) {
    try {
      const { pageId } = req.params;
      
      const page = await this.pageBuilderService.getPage(pageId);
      
      if (!page) {
        return res.status(404).json({
          error: 'Page not found',
          code: 'PAGE_NOT_FOUND'
        });
      }
      
      res.json({
        success: true,
        data: page
      });
      
    } catch (error) {
      this.handleServiceError(res, error, 'Page retrieval failed');
    }
  }

  async updatePage(req, res) {
    try {
      const { pageId } = req.params;
      const startTime = performance.now();
      
      const page = await this.pageBuilderService.updatePage(
        req.agent.agentId,
        pageId,
        req.body
      );
      
      const duration = performance.now() - startTime;
      
      this.logger.info('Page updated via API', {
        pageId,
        agentId: req.agent.agentId,
        duration: Math.round(duration)
      });
      
      res.json({
        success: true,
        data: page,
        metadata: {
          updatedAt: new Date(),
          duration: Math.round(duration)
        }
      });
      
    } catch (error) {
      this.handleServiceError(res, error, 'Page update failed');
    }
  }

  async deletePage(req, res) {
    try {
      const { pageId } = req.params;
      
      const result = await this.pageBuilderService.deletePage(
        req.agent.agentId,
        pageId
      );
      
      this.logger.info('Page deleted via API', {
        pageId,
        agentId: req.agent.agentId
      });
      
      res.json({
        success: true,
        data: result,
        metadata: {
          deletedAt: new Date()
        }
      });
      
    } catch (error) {
      this.handleServiceError(res, error, 'Page deletion failed');
    }
  }

  async listPages(req, res) {
    try {
      const {
        limit = 20,
        offset = 0,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = req.query;
      
      // This would be implemented in the PageBuilderService
      // For now, returning a placeholder structure
      const pages = await this.pageBuilderService.listPages({
        agentId: req.agent.agentId,
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy,
        sortOrder
      });
      
      res.json({
        success: true,
        data: pages,
        metadata: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: pages.length // This should come from the service
        }
      });
      
    } catch (error) {
      this.handleServiceError(res, error, 'Page listing failed');
    }
  }

  async listWorkspacePages(req, res) {
    try {
      const { workspaceId } = req.params;
      const {
        limit = 20,
        offset = 0,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = req.query;
      
      const pages = await this.pageBuilderService.listWorkspacePages({
        workspaceId,
        agentId: req.agent.agentId,
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy,
        sortOrder
      });
      
      res.json({
        success: true,
        data: pages,
        metadata: {
          workspaceId,
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: pages.length
        }
      });
      
    } catch (error) {
      this.handleServiceError(res, error, 'Workspace page listing failed');
    }
  }

  async collaborateOnPage(req, res) {
    try {
      const { pageId } = req.params;
      const { action, targetAgentId, payload } = req.body;
      
      // Forward collaboration request through communication protocol
      const result = await new Promise((resolve, reject) => {
        this.communicationProtocol.emit('collaboration_request', {
          pageId,
          fromAgentId: req.agent.agentId,
          targetAgentId,
          action,
          payload,
          respond: (result, error) => {
            if (error) reject(error);
            else resolve(result);
          }
        });
      });
      
      res.json({
        success: true,
        data: result,
        metadata: {
          action,
          targetAgentId,
          timestamp: new Date()
        }
      });
      
    } catch (error) {
      this.handleServiceError(res, error, 'Collaboration request failed');
    }
  }

  async getWebSocketInfo(req, res) {
    res.json({
      success: true,
      data: {
        endpoint: '/agent-communication',
        protocol: 'ws',
        features: {
          authentication: true,
          compression: true,
          messageQueuing: true,
          realTimeUpdates: true
        },
        rateLimits: {
          maxMessagesPerWindow: 100,
          windowMs: 60000
        }
      }
    });
  }

  async getHealth(req, res) {
    try {
      const serviceHealth = this.pageBuilderService.getServiceHealth();
      const protocolHealth = this.communicationProtocol.getHealth();
      
      const overallStatus = serviceHealth.status === 'healthy' && 
                           protocolHealth.status === 'healthy' ? 'healthy' : 'degraded';
      
      res.json({
        success: true,
        status: overallStatus,
        timestamp: new Date(),
        services: {
          pageBuilder: serviceHealth,
          communication: protocolHealth
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  async getMetrics(req, res) {
    if (!this.config.enableMetrics) {
      return res.status(404).json({
        error: 'Metrics endpoint disabled',
        code: 'METRICS_DISABLED'
      });
    }

    res.json({
      success: true,
      data: {
        requests: this.requestMetrics,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        services: {
          pageBuilder: this.pageBuilderService.getServiceHealth(),
          communication: this.communicationProtocol.getHealth()
        }
      }
    });
  }

  /**
   * Handle service errors consistently
   */
  handleServiceError(res, error, context) {
    this.requestMetrics.failedRequests++;
    
    this.logger.error(context, {
      error: error.message,
      stack: error.stack
    });
    
    // Determine appropriate status code
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    
    if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
    } else if (error.message.includes('access denied') || error.message.includes('insufficient permissions')) {
      statusCode = 403;
      errorCode = 'ACCESS_DENIED';
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      statusCode = 400;
      errorCode = 'INVALID_REQUEST';
    } else if (error.message.includes('rate limit')) {
      statusCode = 429;
      errorCode = 'RATE_LIMIT_EXCEEDED';
    } else if (error.message.includes('circuit breaker') || error.message.includes('service unavailable')) {
      statusCode = 503;
      errorCode = 'SERVICE_UNAVAILABLE';
    }
    
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: errorCode,
      timestamp: new Date()
    });
  }

  /**
   * Global error handler
   */
  errorHandler(err, req, res, next) {
    this.requestMetrics.failedRequests++;
    
    this.logger.error('Unhandled error in page builder routes', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method
    });
    
    if (res.headersSent) {
      return next(err);
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date()
    });
  }

  /**
   * Get Express router
   */
  getRouter() {
    return this.router;
  }

  /**
   * Shutdown services
   */
  async shutdown() {
    this.logger.info('PageBuilder routes shutting down...');
    
    await Promise.all([
      this.pageBuilderService.shutdown(),
      this.communicationProtocol.shutdown()
    ]);
    
    this.logger.info('PageBuilder routes shutdown complete');
  }
}

module.exports = PageBuilderRoutes;