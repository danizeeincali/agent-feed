import { body, param, query, ValidationChain } from 'express-validator';
import { FeedType, TriggerType, ActionType } from '@/types';

// User validation
export const validateUserRegistration: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

export const validateUserLogin: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const validateUserUpdate: ValidationChain[] = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be light, dark, or auto'),
  body('preferences.notifications')
    .optional()
    .isObject()
    .withMessage('Notifications must be an object'),
  body('preferences.feed_settings')
    .optional()
    .isObject()
    .withMessage('Feed settings must be an object')
];

// Feed validation
export const validateFeedCreate: ValidationChain[] = [
  body('name')
    .isLength({ min: 1, max: 255 })
    .withMessage('Feed name is required and must be less than 255 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
    .trim(),
  body('url')
    .isURL()
    .withMessage('Valid URL is required'),
  body('feed_type')
    .isIn(Object.values(FeedType))
    .withMessage(`Feed type must be one of: ${Object.values(FeedType).join(', ')}`),
  body('fetch_interval')
    .optional()
    .isInt({ min: 5, max: 10080 }) // 5 minutes to 1 week
    .withMessage('Fetch interval must be between 5 and 10080 minutes'),
  body('automation_config')
    .optional()
    .isObject()
    .withMessage('Automation config must be an object')
];

export const validateFeedUpdate: ValidationChain[] = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Feed name must be less than 255 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
    .trim(),
  body('url')
    .optional()
    .isURL()
    .withMessage('Valid URL is required'),
  body('feed_type')
    .optional()
    .isIn(Object.values(FeedType))
    .withMessage(`Feed type must be one of: ${Object.values(FeedType).join(', ')}`),
  body('fetch_interval')
    .optional()
    .isInt({ min: 5, max: 10080 })
    .withMessage('Fetch interval must be between 5 and 10080 minutes'),
  body('status')
    .optional()
    .isIn(['active', 'paused', 'error', 'pending'])
    .withMessage('Status must be active, paused, error, or pending'),
  body('automation_config')
    .optional()
    .isObject()
    .withMessage('Automation config must be an object')
];

// Automation validation
export const validateAutomationTrigger: ValidationChain[] = [
  body('name')
    .isLength({ min: 1, max: 255 })
    .withMessage('Trigger name is required and must be less than 255 characters')
    .trim(),
  body('trigger_type')
    .isIn(Object.values(TriggerType))
    .withMessage(`Trigger type must be one of: ${Object.values(TriggerType).join(', ')}`),
  body('conditions')
    .isObject()
    .withMessage('Conditions must be an object'),
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean')
];

export const validateAutomationAction: ValidationChain[] = [
  body('name')
    .isLength({ min: 1, max: 255 })
    .withMessage('Action name is required and must be less than 255 characters')
    .trim(),
  body('action_type')
    .isIn(Object.values(ActionType))
    .withMessage(`Action type must be one of: ${Object.values(ActionType).join(', ')}`),
  body('config')
    .isObject()
    .withMessage('Config must be an object'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Priority must be between 1 and 10'),
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean')
];

// Claude Flow validation
export const validateClaudeFlowSession: ValidationChain[] = [
  body('configuration')
    .isObject()
    .withMessage('Configuration must be an object'),
  body('configuration.swarm_topology')
    .isIn(['mesh', 'hierarchical', 'ring', 'star'])
    .withMessage('Swarm topology must be mesh, hierarchical, ring, or star'),
  body('configuration.max_agents')
    .isInt({ min: 1, max: 20 })
    .withMessage('Max agents must be between 1 and 20'),
  body('configuration.agent_types')
    .isArray()
    .withMessage('Agent types must be an array'),
  body('configuration.neural_training')
    .optional()
    .isBoolean()
    .withMessage('Neural training must be a boolean'),
  body('configuration.memory_persistence')
    .optional()
    .isBoolean()
    .withMessage('Memory persistence must be a boolean')
];

// Common parameter validation
export const validateUUID = (paramName: string): ValidationChain =>
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`);

export const validatePagination: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['created_at', 'updated_at', 'name', 'published_at'])
    .withMessage('Sort must be created_at, updated_at, name, or published_at'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc')
];

export const validateSearch: ValidationChain[] = [
  query('q')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Search query must be between 1 and 255 characters')
    .trim(),
  query('filter')
    .optional()
    .isIn(['title', 'content', 'author', 'all'])
    .withMessage('Filter must be title, content, author, or all')
];

// Feed item validation
export const validateFeedItemUpdate: ValidationChain[] = [
  body('processed')
    .optional()
    .isBoolean()
    .withMessage('Processed must be a boolean'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

// Webhook validation
export const validateWebhook: ValidationChain[] = [
  body('url')
    .isURL()
    .withMessage('Valid webhook URL is required'),
  body('secret')
    .optional()
    .isLength({ min: 16 })
    .withMessage('Webhook secret must be at least 16 characters'),
  body('events')
    .isArray()
    .withMessage('Events must be an array'),
  body('events.*')
    .isIn(['feed.created', 'feed.updated', 'item.new', 'automation.completed'])
    .withMessage('Invalid event type')
];

// Export validation
export const validateExport: ValidationChain[] = [
  query('format')
    .isIn(['json', 'csv', 'xml'])
    .withMessage('Format must be json, csv, or xml'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

// Bulk operations validation
export const validateBulkOperation: ValidationChain[] = [
  body('operation')
    .isIn(['delete', 'update', 'mark_processed'])
    .withMessage('Operation must be delete, update, or mark_processed'),
  body('items')
    .isArray({ min: 1, max: 100 })
    .withMessage('Items array must contain 1-100 items'),
  body('items.*')
    .isUUID()
    .withMessage('Each item must be a valid UUID')
];