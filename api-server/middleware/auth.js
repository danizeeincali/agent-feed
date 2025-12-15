/**
 * Authentication Middleware - REAL Implementation
 * This module provides comprehensive authentication and authorization:
 * - JWT token validation
 * - Session management
 * - Role-based access control (RBAC)
 * - API key validation
 * - Rate limiting per user
 * - Token refresh mechanism
 * - Secure password hashing
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const SALT_ROUNDS = 12;

// In-memory stores (in production, use Redis or a database)
const sessionStore = new Map();
const apiKeyStore = new Map();
const refreshTokenStore = new Map();
const userRateLimitStore = new Map();

// Role hierarchy for RBAC
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest'
};

// Role permissions hierarchy (higher roles inherit lower role permissions)
const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 5,
  [ROLES.ADMIN]: 4,
  [ROLES.MODERATOR]: 3,
  [ROLES.USER]: 2,
  [ROLES.GUEST]: 1
};

// Permission definitions
const PERMISSIONS = {
  READ_PUBLIC: 'read:public',
  READ_PRIVATE: 'read:private',
  WRITE_OWN: 'write:own',
  WRITE_ANY: 'write:any',
  DELETE_OWN: 'delete:own',
  DELETE_ANY: 'delete:any',
  ADMIN_ACCESS: 'admin:access',
  SUPER_ADMIN_ACCESS: 'super_admin:access'
};

// Role-to-permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.GUEST]: [PERMISSIONS.READ_PUBLIC],
  [ROLES.USER]: [
    PERMISSIONS.READ_PUBLIC,
    PERMISSIONS.READ_PRIVATE,
    PERMISSIONS.WRITE_OWN,
    PERMISSIONS.DELETE_OWN
  ],
  [ROLES.MODERATOR]: [
    PERMISSIONS.READ_PUBLIC,
    PERMISSIONS.READ_PRIVATE,
    PERMISSIONS.WRITE_OWN,
    PERMISSIONS.WRITE_ANY,
    PERMISSIONS.DELETE_OWN,
    PERMISSIONS.DELETE_ANY
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.READ_PUBLIC,
    PERMISSIONS.READ_PRIVATE,
    PERMISSIONS.WRITE_OWN,
    PERMISSIONS.WRITE_ANY,
    PERMISSIONS.DELETE_OWN,
    PERMISSIONS.DELETE_ANY,
    PERMISSIONS.ADMIN_ACCESS
  ],
  [ROLES.SUPER_ADMIN]: [
    PERMISSIONS.READ_PUBLIC,
    PERMISSIONS.READ_PRIVATE,
    PERMISSIONS.WRITE_OWN,
    PERMISSIONS.WRITE_ANY,
    PERMISSIONS.DELETE_OWN,
    PERMISSIONS.DELETE_ANY,
    PERMISSIONS.ADMIN_ACCESS,
    PERMISSIONS.SUPER_ADMIN_ACCESS
  ]
};

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    issuer: 'agent-feed-api',
    audience: 'agent-feed-client'
  });
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(payload) {
  const token = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
    issuer: 'agent-feed-api',
    audience: 'agent-feed-client'
  });

  // Store refresh token
  refreshTokenStore.set(token, {
    userId: payload.userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  });

  return token;
}

/**
 * Generate API key
 */
export function generateAPIKey(userId, description = 'API Key') {
  const key = `ak_${crypto.randomBytes(32).toString('hex')}`;

  apiKeyStore.set(key, {
    userId,
    description,
    createdAt: Date.now(),
    lastUsed: null,
    requestCount: 0
  });

  return key;
}

/**
 * Verify JWT token
 */
export function verifyToken(token, secret = JWT_SECRET) {
  try {
    return jwt.verify(token, secret, {
      issuer: 'agent-feed-api',
      audience: 'agent-feed-client'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * JWT Authentication Middleware
 * Validates JWT tokens from Authorization header
 */
export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No authentication token provided'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role || ROLES.USER,
      permissions: ROLE_PERMISSIONS[decoded.role || ROLES.USER] || []
    };

    // Update session
    updateSession(req.user.userId);

    next();
  } catch (error) {
    console.error('JWT Authentication error:', error.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message === 'Token expired' ? 'Token has expired' : 'Invalid authentication token'
    });
  }
};

/**
 * Optional JWT Authentication
 * Attaches user if token is valid, but doesn't fail if missing
 */
export const authenticateJWTOptional = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token);
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role || ROLES.USER,
      permissions: ROLE_PERMISSIONS[decoded.role || ROLES.USER] || []
    };
    updateSession(req.user.userId);
  } catch (error) {
    req.user = null;
  }

  next();
};

/**
 * API Key Authentication Middleware
 * Validates API keys from X-API-Key header
 */
export const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No API key provided'
    });
  }

  const keyData = apiKeyStore.get(apiKey);

  if (!keyData) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }

  // Update API key usage stats
  keyData.lastUsed = Date.now();
  keyData.requestCount++;

  // Attach user info to request
  req.user = {
    userId: keyData.userId,
    apiKey: true,
    role: ROLES.USER,
    permissions: ROLE_PERMISSIONS[ROLES.USER]
  };

  next();
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if user has required role
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role || ROLES.GUEST;
    const userRoleLevel = ROLE_HIERARCHY[userRole] || 0;

    // Check if user's role level is high enough
    const hasAccess = allowedRoles.some(role => {
      const requiredLevel = ROLE_HIERARCHY[role] || 0;
      return userRoleLevel >= requiredLevel;
    });

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

/**
 * Permission-Based Access Control
 * Checks if user has specific permission
 */
export const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userPermissions = req.user.permissions || [];

    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        required: requiredPermissions,
        current: userPermissions
      });
    }

    next();
  };
};

/**
 * Resource Ownership Validation
 * Checks if user owns the resource or has admin privileges
 */
export const requireOwnership = (resourceUserIdGetter) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const resourceUserId = typeof resourceUserIdGetter === 'function'
      ? resourceUserIdGetter(req)
      : req.params[resourceUserIdGetter] || req.body[resourceUserIdGetter];

    const isOwner = req.user.userId === resourceUserId;
    const isAdmin = req.user.permissions.includes(PERMISSIONS.ADMIN_ACCESS);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

/**
 * Session Management
 */
export function createSession(userId, data = {}) {
  const sessionId = crypto.randomBytes(32).toString('hex');

  sessionStore.set(sessionId, {
    userId,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    data
  });

  return sessionId;
}

export function getSession(sessionId) {
  return sessionStore.get(sessionId);
}

export function updateSession(userId) {
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.userId === userId) {
      session.lastActivity = Date.now();
      break;
    }
  }
}

export function destroySession(sessionId) {
  sessionStore.delete(sessionId);
}

/**
 * Session validation middleware
 */
export const validateSession = (req, res, next) => {
  const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;

  if (!sessionId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No session ID provided'
    });
  }

  const session = getSession(sessionId);

  if (!session) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired session'
    });
  }

  // Check session timeout (30 minutes of inactivity)
  const SESSION_TIMEOUT = 30 * 60 * 1000;
  if (Date.now() - session.lastActivity > SESSION_TIMEOUT) {
    destroySession(sessionId);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Session expired due to inactivity'
    });
  }

  // Update last activity
  session.lastActivity = Date.now();

  req.session = session;
  req.sessionId = sessionId;

  next();
};

/**
 * Refresh Token Validation
 */
export const refreshAccessToken = (req, res, next) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Refresh token required'
    });
  }

  // Check if refresh token exists in store
  const tokenData = refreshTokenStore.get(refreshToken);

  if (!tokenData) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid refresh token'
    });
  }

  // Check if token is expired
  if (Date.now() > tokenData.expiresAt) {
    refreshTokenStore.delete(refreshToken);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Refresh token expired'
    });
  }

  try {
    // Verify the refresh token
    const decoded = verifyToken(refreshToken, JWT_REFRESH_SECRET);

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    });

    res.json({
      accessToken: newAccessToken,
      expiresIn: JWT_EXPIRY
    });
  } catch (error) {
    refreshTokenStore.delete(refreshToken);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid refresh token'
    });
  }
};

/**
 * Revoke refresh token
 */
export const revokeRefreshToken = (req, res) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Refresh token required'
    });
  }

  refreshTokenStore.delete(refreshToken);

  res.json({
    message: 'Refresh token revoked successfully'
  });
};

/**
 * Rate limiting per user
 */
export const userRateLimiter = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(); // Skip if not authenticated
    }

    const userId = req.user.userId;
    const now = Date.now();
    const key = `${userId}:${Math.floor(now / windowMs)}`;

    if (!userRateLimitStore.has(key)) {
      userRateLimitStore.set(key, 0);
    }

    const requestCount = userRateLimitStore.get(key) + 1;
    userRateLimitStore.set(key, requestCount);

    if (requestCount > maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `User rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - requestCount);
    res.setHeader('X-RateLimit-Reset', Math.floor(now / windowMs) * windowMs + windowMs);

    next();
  };
};

/**
 * Clean up expired sessions and tokens periodically
 */
setInterval(() => {
  const now = Date.now();
  const SESSION_TIMEOUT = 30 * 60 * 1000;

  // Clean up expired sessions
  for (const [sessionId, session] of sessionStore.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      sessionStore.delete(sessionId);
    }
  }

  // Clean up expired refresh tokens
  for (const [token, data] of refreshTokenStore.entries()) {
    if (now > data.expiresAt) {
      refreshTokenStore.delete(token);
    }
  }

  // Clean up old user rate limit entries
  for (const [key] of userRateLimitStore.entries()) {
    const [userId, timestamp] = key.split(':');
    if (now - parseInt(timestamp) > 300000) { // 5 minutes old
      userRateLimitStore.delete(key);
    }
  }
}, 300000); // Run every 5 minutes

/**
 * Export roles and permissions for use in other modules
 */
export { ROLES, PERMISSIONS, ROLE_PERMISSIONS, ROLE_HIERARCHY };

export default {
  // Password functions
  hashPassword,
  verifyPassword,

  // Token functions
  generateAccessToken,
  generateRefreshToken,
  generateAPIKey,
  verifyToken,

  // Authentication middleware
  authenticateJWT,
  authenticateJWTOptional,
  authenticateAPIKey,

  // Authorization middleware
  requireRole,
  requirePermission,
  requireOwnership,

  // Session management
  createSession,
  getSession,
  updateSession,
  destroySession,
  validateSession,

  // Token management
  refreshAccessToken,
  revokeRefreshToken,

  // Rate limiting
  userRateLimiter,

  // Constants
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY
};
