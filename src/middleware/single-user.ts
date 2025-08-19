/**
 * Single User Middleware
 * 
 * For single-user systems, automatically provides default user context
 * Eliminates need for explicit user ID input in API requests
 */

import { Request, Response, NextFunction } from 'express';

// Default single user configuration
const DEFAULT_USER_ID = 'single-user-default';
const DEFAULT_USER_NAME = 'Agent Feed User';

interface SingleUserRequest extends Request {
  singleUser?: {
    id: string;
    name: string;
    isDefault: boolean;
  };
}

/**
 * Middleware to automatically inject single user context
 * This middleware ensures all API requests have a valid user context
 * without requiring explicit user authentication or ID provision
 */
export const singleUserMiddleware = (req: SingleUserRequest, res: Response, next: NextFunction) => {
  // Add default user context to request
  req.singleUser = {
    id: DEFAULT_USER_ID,
    name: DEFAULT_USER_NAME,
    isDefault: true
  };

  // Auto-inject userId into request body if not present
  if (req.body && !req.body.userId) {
    req.body.userId = DEFAULT_USER_ID;
  }

  // Auto-inject userId into query params if not present
  if (req.query && !req.query.userId) {
    req.query.userId = DEFAULT_USER_ID;
  }

  // Auto-inject user context into headers for WebSocket events
  if (!req.headers['x-user-id']) {
    req.headers['x-user-id'] = DEFAULT_USER_ID;
  }

  if (!req.headers['x-user-name']) {
    req.headers['x-user-name'] = DEFAULT_USER_NAME;
  }

  next();
};

/**
 * Helper function to get current user context
 * Always returns the default single user for this system
 */
export const getCurrentUser = (req: SingleUserRequest) => {
  return req.singleUser || {
    id: DEFAULT_USER_ID,
    name: DEFAULT_USER_NAME,
    isDefault: true
  };
};

/**
 * Validation bypass for single-user system
 * Replaces strict user ID validation with automatic provision
 */
export const validateSingleUser = (req: SingleUserRequest, res: Response, next: NextFunction) => {
  // Ensure userId is always present for validation
  if (req.body && !req.body.userId) {
    req.body.userId = DEFAULT_USER_ID;
  }
  
  next();
};

export default singleUserMiddleware;