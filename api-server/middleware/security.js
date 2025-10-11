/**
 * Security Middleware - REAL Security Implementation
 * This module provides comprehensive security hardening including:
 * - Helmet.js integration for security headers
 * - Rate limiting per IP and endpoint
 * - Input validation and sanitization
 * - SQL injection prevention
 * - XSS prevention
 * - CSRF protection
 * - Request size limits
 * - Suspicious activity detection
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { body, validationResult, matchedData } from 'express-validator';
import crypto from 'crypto';

// Track suspicious activity
const suspiciousActivityLog = new Map();
const MAX_VIOLATIONS = 10;
const VIOLATION_WINDOW = 3600000; // 1 hour

/**
 * Configure Helmet for security headers
 * Implements HSTS, CSP, X-Frame-Options, etc.
 */
export const securityHeaders = helmet({
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Adjust based on needs
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },

  // X-Content-Type-Options
  noSniff: true,

  // X-XSS-Protection
  xssFilter: true,

  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // Remove X-Powered-By header
  hidePoweredBy: true,

  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false
  },

  // X-Download-Options
  ieNoOpen: true,

  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  }
});

/**
 * Global rate limiter - applies to all requests
 * Prevents brute force attacks and DoS
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logSuspiciousActivity(req, 'RATE_LIMIT_EXCEEDED');
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force password attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  handler: (req, res) => {
    logSuspiciousActivity(req, 'AUTH_BRUTE_FORCE');
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Account temporarily locked due to too many failed login attempts.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * API endpoint rate limiter
 * More restrictive for write operations
 */
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'API rate limit exceeded',
    retryAfter: '1 minute'
  }
});

/**
 * Slow down repeated requests
 * Gradually increases response time for repeated requests
 */
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per 15 minutes at full speed
  delayMs: (hits) => hits * 100, // Add 100ms delay per request after delayAfter
  maxDelayMs: 5000 // Maximum delay of 5 seconds
});

/**
 * Sanitize inputs to prevent NoSQL injection
 * Even though we use SQLite, this is good practice
 */
export const sanitizeInputs = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logSuspiciousActivity(req, 'NOSQL_INJECTION_ATTEMPT', { key });
  }
});

/**
 * Prevent HTTP Parameter Pollution
 */
export const preventParameterPollution = hpp({
  whitelist: ['sort', 'filter', 'page', 'limit'] // Allow these params to be arrays
});

/**
 * SQL Injection Prevention Middleware
 * Detects and blocks common SQL injection patterns
 */
export const preventSQLInjection = (req, res, next) => {
  const sqlPatterns = [
    /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|eval)(\s|$)/gi,
    /(\s|^)(or|and)(\s+)(\d+)(\s*)=(\s*)(\d+)/gi,
    /(;|--|\/\*|\*\/|xp_|sp_)/gi,
    /('|"|\`)(.*?)(or|and)(.*?)('|"|\`)/gi
  ];

  const checkForInjection = (obj, path = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        for (const pattern of sqlPatterns) {
          if (pattern.test(value)) {
            logSuspiciousActivity(req, 'SQL_INJECTION_ATTEMPT', {
              field: currentPath,
              value: value.substring(0, 100)
            });
            return true;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        if (checkForInjection(value, currentPath)) {
          return true;
        }
      }
    }
    return false;
  };

  // Check query params, body, and params
  const inputs = {
    ...req.query,
    ...req.body,
    ...req.params
  };

  if (checkForInjection(inputs)) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Your request contains potentially malicious content and has been blocked.'
    });
  }

  next();
};

/**
 * XSS Prevention Middleware
 * Detects and blocks common XSS attack patterns
 */
export const preventXSS = (req, res, next) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=, onload=
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /eval\(/gi,
    /expression\(/gi,
    /vbscript:/gi,
    /data:text\/html/gi
  ];

  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Check for XSS patterns
      for (const pattern of xssPatterns) {
        if (pattern.test(value)) {
          return null; // Indicates XSS detected
        }
      }
      // HTML encode special characters
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    return value;
  };

  const checkAndSanitize = (obj, path = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        const sanitized = sanitizeValue(value);
        if (sanitized === null) {
          logSuspiciousActivity(req, 'XSS_ATTEMPT', {
            field: currentPath,
            value: value.substring(0, 100)
          });
          return false;
        }
        // Update the value with sanitized version for non-raw content
        if (req.body && obj === req.body) {
          obj[key] = sanitized;
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (!checkAndSanitize(value, currentPath)) {
          return false;
        }
      } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] === 'object' && value[i] !== null) {
            if (!checkAndSanitize(value[i], `${currentPath}[${i}]`)) {
              return false;
            }
          }
        }
      }
    }
    return true;
  };

  // Check and sanitize inputs
  if (req.query && Object.keys(req.query).length > 0) {
    if (!checkAndSanitize(req.query)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Your request contains potentially malicious content and has been blocked.'
      });
    }
  }

  if (req.body && Object.keys(req.body).length > 0) {
    if (!checkAndSanitize(req.body)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Your request contains potentially malicious content and has been blocked.'
      });
    }
  }

  next();
};

/**
 * Request size validation
 * Prevents large payload attacks
 */
export const validateRequestSize = (req, res, next) => {
  const contentLength = req.headers['content-length'];

  if (contentLength) {
    const sizeMB = parseInt(contentLength) / (1024 * 1024);

    if (sizeMB > 10) { // 10MB limit
      logSuspiciousActivity(req, 'OVERSIZED_REQUEST', { sizeMB });
      return res.status(413).json({
        error: 'Request too large',
        message: 'Request payload exceeds maximum allowed size of 10MB.'
      });
    }
  }

  next();
};

/**
 * Suspicious Activity Detection and Logging
 */
function logSuspiciousActivity(req, type, details = {}) {
  const ip = req.ip || req.connection.remoteAddress;
  const key = `${ip}:${type}`;
  const now = Date.now();

  if (!suspiciousActivityLog.has(key)) {
    suspiciousActivityLog.set(key, []);
  }

  const activities = suspiciousActivityLog.get(key);

  // Remove old activities outside the window
  const recentActivities = activities.filter(
    activity => now - activity.timestamp < VIOLATION_WINDOW
  );

  recentActivities.push({
    timestamp: now,
    type,
    url: req.originalUrl,
    method: req.method,
    userAgent: req.headers['user-agent'],
    details
  });

  suspiciousActivityLog.set(key, recentActivities);

  // Log to console for monitoring
  console.warn(`⚠️  SECURITY ALERT: ${type}`, {
    ip,
    url: req.originalUrl,
    method: req.method,
    userAgent: req.headers['user-agent'],
    count: recentActivities.length,
    details
  });

  // If too many violations, could trigger additional actions
  if (recentActivities.length >= MAX_VIOLATIONS) {
    console.error(`🚨 CRITICAL: IP ${ip} has ${recentActivities.length} security violations!`);
    // Could implement IP blocking here
  }
}

/**
 * Get suspicious activity report
 */
export const getSuspiciousActivityReport = (req, res) => {
  const report = [];
  const now = Date.now();

  for (const [key, activities] of suspiciousActivityLog.entries()) {
    const recentActivities = activities.filter(
      activity => now - activity.timestamp < VIOLATION_WINDOW
    );

    if (recentActivities.length > 0) {
      const [ip, type] = key.split(':');
      report.push({
        ip,
        type,
        count: recentActivities.length,
        firstSeen: new Date(recentActivities[0].timestamp).toISOString(),
        lastSeen: new Date(recentActivities[recentActivities.length - 1].timestamp).toISOString(),
        activities: recentActivities
      });
    }
  }

  res.json({
    totalIPs: report.length,
    report: report.sort((a, b) => b.count - a.count)
  });
};

/**
 * Input validation helper
 * Provides common validation rules
 */
export const validators = {
  // Email validation
  email: () => body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),

  // Password validation
  password: () => body('password')
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be 8-128 characters with uppercase, lowercase, number, and special character'),

  // Username validation
  username: () => body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-30 characters, alphanumeric with dashes/underscores'),

  // UUID validation
  uuid: (field) => body(field)
    .isUUID()
    .withMessage(`${field} must be a valid UUID`),

  // Integer validation
  integer: (field, min = null, max = null) => {
    let validator = body(field).isInt();
    if (min !== null) validator = validator.isInt({ min });
    if (max !== null) validator = validator.isInt({ max });
    return validator.withMessage(`${field} must be a valid integer`);
  },

  // String validation
  string: (field, minLen = 1, maxLen = 1000) => body(field)
    .trim()
    .isLength({ min: minLen, max: maxLen })
    .withMessage(`${field} must be ${minLen}-${maxLen} characters`),

  // URL validation
  url: (field) => body(field)
    .isURL()
    .withMessage(`${field} must be a valid URL`),

  // Boolean validation
  boolean: (field) => body(field)
    .isBoolean()
    .withMessage(`${field} must be a boolean`),

  // Date validation
  date: (field) => body(field)
    .isISO8601()
    .withMessage(`${field} must be a valid date`)
};

/**
 * Validation error handler
 * Processes validation results and returns errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logSuspiciousActivity(req, 'VALIDATION_FAILURE', {
      errors: errors.array()
    });

    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }

  // Replace req.body with validated data only
  req.validatedData = matchedData(req);
  next();
};

/**
 * CSRF Token Generation
 */
export const generateCSRFToken = (req, res, next) => {
  if (!req.session) {
    req.session = {};
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
};

/**
 * CSRF Token Validation
 */
export const validateCSRFToken = (req, res, next) => {
  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    logSuspiciousActivity(req, 'CSRF_VIOLATION');
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'CSRF token validation failed. Please refresh and try again.'
    });
  }

  next();
};

/**
 * Clean up old suspicious activity logs periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, activities] of suspiciousActivityLog.entries()) {
    const recentActivities = activities.filter(
      activity => now - activity.timestamp < VIOLATION_WINDOW
    );

    if (recentActivities.length === 0) {
      suspiciousActivityLog.delete(key);
    } else {
      suspiciousActivityLog.set(key, recentActivities);
    }
  }
}, 300000); // Clean up every 5 minutes

export default {
  securityHeaders,
  globalRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  speedLimiter,
  sanitizeInputs,
  preventParameterPollution,
  preventSQLInjection,
  preventXSS,
  validateRequestSize,
  validators,
  handleValidationErrors,
  generateCSRFToken,
  validateCSRFToken,
  getSuspiciousActivityReport
};
