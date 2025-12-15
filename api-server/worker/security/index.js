/**
 * AVI Worker Security Module
 *
 * Comprehensive security validation for file operations
 *
 * @module worker/security
 * @see {@link ./SECURITY.md} for detailed documentation
 */

export { PathValidator } from './PathValidator.js';
export { FileOperationValidator } from './FileOperationValidator.js';
export { RateLimiter, TieredRateLimiter } from './RateLimiter.js';

/**
 * Create a complete security validation stack
 *
 * @param {Object} config - Configuration options
 * @param {string} config.allowedWorkspace - Allowed workspace directory
 * @param {number} config.maxFileSize - Maximum file size in bytes
 * @param {number} config.maxOperations - Max operations per window
 * @param {number} config.windowMs - Rate limit window in milliseconds
 * @returns {Object} Security validators
 */
export function createSecurityStack(config = {}) {
  const {
    allowedWorkspace = '/workspaces/agent-feed/prod/agent_workspace',
    maxFileSize = 10 * 1024 * 1024,
    maxOperations = 10,
    windowMs = 60000
  } = config;

  const { PathValidator } = await import('./PathValidator.js');
  const { FileOperationValidator } = await import('./FileOperationValidator.js');
  const { TieredRateLimiter } = await import('./RateLimiter.js');

  return {
    pathValidator: new PathValidator({ allowedWorkspace }),
    fileValidator: new FileOperationValidator({ allowedWorkspace, maxFileSize }),
    rateLimiter: new TieredRateLimiter({
      tiers: {
        read: { maxOperations: maxOperations * 2, windowMs },
        write: { maxOperations, windowMs },
        delete: { maxOperations: Math.floor(maxOperations / 2), windowMs }
      }
    })
  };
}

/**
 * Validate and execute a secure file operation
 *
 * @param {Object} validators - Security validators
 * @param {string} userId - User identifier
 * @param {string} operation - Operation type ('read', 'write', 'delete')
 * @param {string} filePath - File path
 * @param {string} [content] - Content for write operations
 * @returns {Promise<Object>} Operation result
 */
export async function secureFileOperation(validators, userId, operation, filePath, content = null) {
  const { rateLimiter, fileValidator } = validators;

  // Check rate limit
  const rateCheck = rateLimiter.recordOperation(userId, operation);
  if (!rateCheck.success) {
    throw new Error(`Rate limit exceeded: ${rateCheck.error}`);
  }

  // Execute validated operation
  switch (operation) {
    case 'read':
      return await fileValidator.safeRead(filePath);

    case 'write':
      if (!content) {
        throw new Error('Content required for write operation');
      }
      return await fileValidator.safeWrite(filePath, content);

    case 'delete':
      return await fileValidator.safeDelete(filePath);

    default:
      throw new Error(`Invalid operation: ${operation}`);
  }
}

/**
 * Get combined security statistics
 *
 * @param {Object} validators - Security validators
 * @returns {Object} Combined statistics
 */
export function getSecurityStats(validators) {
  const { pathValidator, fileValidator, rateLimiter } = validators;

  return {
    path: pathValidator.getStats(),
    file: fileValidator.getStats(),
    rate: rateLimiter.getStats(),
    timestamp: new Date().toISOString()
  };
}

export default {
  PathValidator,
  FileOperationValidator,
  RateLimiter,
  TieredRateLimiter,
  createSecurityStack,
  secureFileOperation,
  getSecurityStats
};
