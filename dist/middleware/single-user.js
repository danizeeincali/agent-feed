"use strict";
/**
 * Single User Middleware
 *
 * For single-user systems, automatically provides default user context
 * Eliminates need for explicit user ID input in API requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSingleUser = exports.getCurrentUser = exports.singleUserMiddleware = void 0;
// Default single user configuration
const DEFAULT_USER_ID = 'single-user-default';
const DEFAULT_USER_NAME = 'Agent Feed User';
/**
 * Middleware to automatically inject single user context
 * This middleware ensures all API requests have a valid user context
 * without requiring explicit user authentication or ID provision
 */
const singleUserMiddleware = (req, res, next) => {
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
exports.singleUserMiddleware = singleUserMiddleware;
/**
 * Helper function to get current user context
 * Always returns the default single user for this system
 */
const getCurrentUser = (req) => {
    return req.singleUser || {
        id: DEFAULT_USER_ID,
        name: DEFAULT_USER_NAME,
        isDefault: true
    };
};
exports.getCurrentUser = getCurrentUser;
/**
 * Validation bypass for single-user system
 * Replaces strict user ID validation with automatic provision
 */
const validateSingleUser = (req, res, next) => {
    // Ensure userId is always present for validation
    if (req.body && !req.body.userId) {
        req.body.userId = DEFAULT_USER_ID;
    }
    next();
};
exports.validateSingleUser = validateSingleUser;
exports.default = exports.singleUserMiddleware;
//# sourceMappingURL=single-user.js.map