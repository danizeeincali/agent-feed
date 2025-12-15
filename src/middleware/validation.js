/**
 * Comprehensive Validation Middleware for Agent Dynamic Pages API
 * Provides security, input validation, and request sanitization
 */

import joi from 'joi';
import DOMPurify from 'isomorphic-dompurify';
import rateLimit from 'express-rate-limit';

// Validation schemas
export const schemas = {
  // Agent Page Specification Schema
  pageSpec: joi.object({
    title: joi.string().min(1).max(200).required()
      .pattern(/^[a-zA-Z0-9\s\-_.,!?()]+$/)
      .messages({
        'string.pattern.base': 'Title contains invalid characters',
        'string.max': 'Title must be less than 200 characters'
      }),
    description: joi.string().max(500).optional(),
    componentSpec: joi.object().required()
      .messages({
        'object.base': 'Component specification must be a valid JSON object'
      }),
    status: joi.string().valid('active', 'deprecated', 'archived').default('active'),
    tags: joi.array().items(joi.string().max(50)).max(20).default([])
  }),

  // User Data Schema
  pageData: joi.object({
    dataKey: joi.string().min(1).max(100).required()
      .pattern(/^[a-zA-Z0-9_.-]+$/)
      .messages({
        'string.pattern.base': 'Data key can only contain alphanumeric characters, underscores, dots, and hyphens'
      }),
    dataValue: joi.alternatives().try(
      joi.string(),
      joi.number(),
      joi.boolean(),
      joi.object(),
      joi.array()
    ).required(),
    dataType: joi.string().valid('string', 'number', 'boolean', 'json', 'array').default('json'),
    encrypted: joi.boolean().default(false)
  }),

  // Query parameters
  queryParams: joi.object({
    limit: joi.number().integer().min(1).max(100).default(20),
    offset: joi.number().integer().min(0).default(0),
    sortBy: joi.string().valid('created_at', 'updated_at', 'title', 'version').default('updated_at'),
    sortOrder: joi.string().valid('ASC', 'DESC').default('DESC'),
    status: joi.string().valid('active', 'deprecated', 'archived').optional(),
    userId: joi.string().max(100).optional()
  }),

  // Path parameters
  pathParams: joi.object({
    agentId: joi.string().min(1).max(100).required()
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .messages({
        'string.pattern.base': 'Agent ID contains invalid characters'
      }),
    pageId: joi.string().min(1).max(100).required()
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .messages({
        'string.pattern.base': 'Page ID contains invalid characters'
      }),
    key: joi.string().min(1).max(100)
      .pattern(/^[a-zA-Z0-9_.-]+$/)
      .messages({
        'string.pattern.base': 'Key contains invalid characters'
      })
  })
};

/**
 * Generic validation middleware factory
 */
export const validateSchema = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'body' ? req.body : 
                 source === 'params' ? req.params : 
                 source === 'query' ? req.query : req[source];

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }

    // Update request with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Content sanitization middleware
 */
export const sanitizeContent = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Agent authorization middleware
 */
export const authorizeAgent = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const authHeader = req.headers.authorization;

    // Extract agent ID from authorization header or use session
    const requestingAgentId = extractAgentFromAuth(authHeader) || req.session?.agentId;

    if (!requestingAgentId) {
      return res.status(401).json({
        success: false,
        error: 'Agent authorization required'
      });
    }

    // Check if requesting agent exists and is active
    const agent = await req.app.locals.databaseService.getAgent(requestingAgentId);
    if (!agent || agent.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive agent'
      });
    }

    // Check permissions for the target agent/resource
    const hasPermission = await checkAgentPermissions(requestingAgentId, agentId, req.method, req.path);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    req.requestingAgent = agent;
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization failed'
    });
  }
};

function extractAgentFromAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    // In a real implementation, you'd verify JWT token here
    // For now, we'll assume the token contains the agent ID
    return token;
  } catch (error) {
    return null;
  }
}

async function checkAgentPermissions(requestingAgentId, targetAgentId, method, path) {
  // Simplified permission logic - in production you'd check against permission tables
  
  // Agents can always manage their own resources
  if (requestingAgentId === targetAgentId) {
    return true;
  }

  // Check if it's a read operation - might allow broader access
  if (method === 'GET') {
    return true; // Allow read access for now
  }

  // For write operations, require ownership or explicit permissions
  return false;
}

/**
 * Rate limiting middleware
 */
export const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: 'Too many requests',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Input size limitation middleware
 */
export const limitRequestSize = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = parseSize(maxSize);
    
    if (contentLength > maxBytes) {
      return res.status(413).json({
        success: false,
        error: 'Request entity too large',
        maxSize
      });
    }
    
    next();
  };
};

function parseSize(size) {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmg]?b)$/);
  
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  return Math.floor(value * (units[unit] || 1));
}

/**
 * SQL injection prevention middleware
 */
export const preventSQLInjection = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(;|\-\-|\/\*|\*\/|xp_|sp_)/gi,
    /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
    /((\%27)|(\'))union/gi
  ];

  const checkForSQL = (obj, path = '') => {
    if (typeof obj === 'string') {
      for (const pattern of sqlPatterns) {
        if (pattern.test(obj)) {
          throw new Error(`Potential SQL injection detected in ${path || 'input'}`);
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => checkForSQL(item, `${path}[${index}]`));
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        checkForSQL(value, path ? `${path}.${key}` : key);
      });
    }
  };

  try {
    if (req.body) checkForSQL(req.body, 'body');
    if (req.query) checkForSQL(req.query, 'query');
    if (req.params) checkForSQL(req.params, 'params');
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid input detected',
      details: [{ message: error.message }]
    });
  }
};

/**
 * Audit logging middleware
 */
export const auditLog = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log the request/response for audit trail
    const auditData = {
      agentId: req.params?.agentId,
      pageId: req.params?.pageId,
      userId: req.requestingAgent?.id || 'anonymous',
      action: getActionFromMethod(req.method),
      resourceType: getResourceType(req.path),
      resourceId: req.params?.pageId || req.params?.key,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: res.statusCode,
      timestamp: new Date().toISOString()
    };

    // Asynchronously log to database
    if (req.app.locals.databaseService) {
      req.app.locals.databaseService.logPageAudit(auditData).catch(console.error);
    }

    originalSend.call(this, data);
  };

  next();
};

function getActionFromMethod(method) {
  const actions = {
    'GET': 'read',
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update', 
    'DELETE': 'delete'
  };
  return actions[method] || 'unknown';
}

function getResourceType(path) {
  if (path.includes('/data')) return 'data';
  if (path.includes('/versions')) return 'version';
  if (path.includes('/schema')) return 'schema';
  return 'spec';
}

export default {
  validateSchema,
  sanitizeContent,
  authorizeAgent,
  createRateLimit,
  limitRequestSize,
  preventSQLInjection,
  auditLog,
  schemas
};