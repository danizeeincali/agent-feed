"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.validateBulkOperation = exports.validateExport = exports.validateWebhook = exports.validateFeedItemUpdate = exports.validateSearch = exports.validatePagination = exports.validateUUID = exports.validateClaudeFlowSession = exports.validateAutomationAction = exports.validateAutomationTrigger = exports.validateFeedUpdate = exports.validateFeedCreate = exports.validateUserUpdate = exports.validateUserLogin = exports.validateUserRegistration = void 0;
const express_validator_1 = require("express-validator");
const types_1 = require("@/types");
// User validation
exports.validateUserRegistration = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    (0, express_validator_1.body)('name')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .trim(),
    (0, express_validator_1.body)('password')
        .optional()
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];
exports.validateUserLogin = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required')
];
exports.validateUserUpdate = [
    (0, express_validator_1.body)('name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .trim(),
    (0, express_validator_1.body)('preferences')
        .optional()
        .isObject()
        .withMessage('Preferences must be an object'),
    (0, express_validator_1.body)('preferences.theme')
        .optional()
        .isIn(['light', 'dark', 'auto'])
        .withMessage('Theme must be light, dark, or auto'),
    (0, express_validator_1.body)('preferences.notifications')
        .optional()
        .isObject()
        .withMessage('Notifications must be an object'),
    (0, express_validator_1.body)('preferences.feed_settings')
        .optional()
        .isObject()
        .withMessage('Feed settings must be an object')
];
// Feed validation
exports.validateFeedCreate = [
    (0, express_validator_1.body)('name')
        .isLength({ min: 1, max: 255 })
        .withMessage('Feed name is required and must be less than 255 characters')
        .trim(),
    (0, express_validator_1.body)('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters')
        .trim(),
    (0, express_validator_1.body)('url')
        .isURL()
        .withMessage('Valid URL is required'),
    (0, express_validator_1.body)('feed_type')
        .isIn(Object.values(types_1.FeedType))
        .withMessage(`Feed type must be one of: ${Object.values(types_1.FeedType).join(', ')}`),
    (0, express_validator_1.body)('fetch_interval')
        .optional()
        .isInt({ min: 5, max: 10080 }) // 5 minutes to 1 week
        .withMessage('Fetch interval must be between 5 and 10080 minutes'),
    (0, express_validator_1.body)('automation_config')
        .optional()
        .isObject()
        .withMessage('Automation config must be an object')
];
exports.validateFeedUpdate = [
    (0, express_validator_1.body)('name')
        .optional()
        .isLength({ min: 1, max: 255 })
        .withMessage('Feed name must be less than 255 characters')
        .trim(),
    (0, express_validator_1.body)('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters')
        .trim(),
    (0, express_validator_1.body)('url')
        .optional()
        .isURL()
        .withMessage('Valid URL is required'),
    (0, express_validator_1.body)('feed_type')
        .optional()
        .isIn(Object.values(types_1.FeedType))
        .withMessage(`Feed type must be one of: ${Object.values(types_1.FeedType).join(', ')}`),
    (0, express_validator_1.body)('fetch_interval')
        .optional()
        .isInt({ min: 5, max: 10080 })
        .withMessage('Fetch interval must be between 5 and 10080 minutes'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['active', 'paused', 'error', 'pending'])
        .withMessage('Status must be active, paused, error, or pending'),
    (0, express_validator_1.body)('automation_config')
        .optional()
        .isObject()
        .withMessage('Automation config must be an object')
];
// Automation validation
exports.validateAutomationTrigger = [
    (0, express_validator_1.body)('name')
        .isLength({ min: 1, max: 255 })
        .withMessage('Trigger name is required and must be less than 255 characters')
        .trim(),
    (0, express_validator_1.body)('trigger_type')
        .isIn(Object.values(types_1.TriggerType))
        .withMessage(`Trigger type must be one of: ${Object.values(types_1.TriggerType).join(', ')}`),
    (0, express_validator_1.body)('conditions')
        .isObject()
        .withMessage('Conditions must be an object'),
    (0, express_validator_1.body)('enabled')
        .optional()
        .isBoolean()
        .withMessage('Enabled must be a boolean')
];
exports.validateAutomationAction = [
    (0, express_validator_1.body)('name')
        .isLength({ min: 1, max: 255 })
        .withMessage('Action name is required and must be less than 255 characters')
        .trim(),
    (0, express_validator_1.body)('action_type')
        .isIn(Object.values(types_1.ActionType))
        .withMessage(`Action type must be one of: ${Object.values(types_1.ActionType).join(', ')}`),
    (0, express_validator_1.body)('config')
        .isObject()
        .withMessage('Config must be an object'),
    (0, express_validator_1.body)('priority')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Priority must be between 1 and 10'),
    (0, express_validator_1.body)('enabled')
        .optional()
        .isBoolean()
        .withMessage('Enabled must be a boolean')
];
// Claude Flow validation
exports.validateClaudeFlowSession = [
    (0, express_validator_1.body)('configuration')
        .isObject()
        .withMessage('Configuration must be an object'),
    (0, express_validator_1.body)('configuration.swarm_topology')
        .isIn(['mesh', 'hierarchical', 'ring', 'star'])
        .withMessage('Swarm topology must be mesh, hierarchical, ring, or star'),
    (0, express_validator_1.body)('configuration.max_agents')
        .isInt({ min: 1, max: 20 })
        .withMessage('Max agents must be between 1 and 20'),
    (0, express_validator_1.body)('configuration.agent_types')
        .isArray()
        .withMessage('Agent types must be an array'),
    (0, express_validator_1.body)('configuration.neural_training')
        .optional()
        .isBoolean()
        .withMessage('Neural training must be a boolean'),
    (0, express_validator_1.body)('configuration.memory_persistence')
        .optional()
        .isBoolean()
        .withMessage('Memory persistence must be a boolean')
];
// Common parameter validation
const validateUUID = (paramName) => (0, express_validator_1.param)(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`);
exports.validateUUID = validateUUID;
exports.validatePagination = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('sort')
        .optional()
        .isIn(['created_at', 'updated_at', 'name', 'published_at'])
        .withMessage('Sort must be created_at, updated_at, name, or published_at'),
    (0, express_validator_1.query)('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Order must be asc or desc')
];
exports.validateSearch = [
    (0, express_validator_1.query)('q')
        .optional()
        .isLength({ min: 1, max: 255 })
        .withMessage('Search query must be between 1 and 255 characters')
        .trim(),
    (0, express_validator_1.query)('filter')
        .optional()
        .isIn(['title', 'content', 'author', 'all'])
        .withMessage('Filter must be title, content, author, or all')
];
// Feed item validation
exports.validateFeedItemUpdate = [
    (0, express_validator_1.body)('processed')
        .optional()
        .isBoolean()
        .withMessage('Processed must be a boolean'),
    (0, express_validator_1.body)('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object')
];
// Webhook validation
exports.validateWebhook = [
    (0, express_validator_1.body)('url')
        .isURL()
        .withMessage('Valid webhook URL is required'),
    (0, express_validator_1.body)('secret')
        .optional()
        .isLength({ min: 16 })
        .withMessage('Webhook secret must be at least 16 characters'),
    (0, express_validator_1.body)('events')
        .isArray()
        .withMessage('Events must be an array'),
    (0, express_validator_1.body)('events.*')
        .isIn(['feed.created', 'feed.updated', 'item.new', 'automation.completed'])
        .withMessage('Invalid event type')
];
// Export validation
exports.validateExport = [
    (0, express_validator_1.query)('format')
        .isIn(['json', 'csv', 'xml'])
        .withMessage('Format must be json, csv, or xml'),
    (0, express_validator_1.query)('start_date')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('end_date')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date')
];
// Bulk operations validation
exports.validateBulkOperation = [
    (0, express_validator_1.body)('operation')
        .isIn(['delete', 'update', 'mark_processed'])
        .withMessage('Operation must be delete, update, or mark_processed'),
    (0, express_validator_1.body)('items')
        .isArray({ min: 1, max: 100 })
        .withMessage('Items array must contain 1-100 items'),
    (0, express_validator_1.body)('items.*')
        .isUUID()
        .withMessage('Each item must be a valid UUID')
];
// Simple validation function for backwards compatibility
const validateRequest = (schema) => {
    return (req, res, next) => {
        // Simple passthrough for now
        next();
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validation.js.map