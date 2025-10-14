/**
 * PathValidator - Comprehensive Path Security Validation
 *
 * Security Features:
 * - Directory traversal prevention
 * - Symlink blocking
 * - Hidden file blocking
 * - Sensitive file pattern detection
 * - Workspace boundary enforcement
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PathValidator {
  constructor(config = {}) {
    // Allowed workspace directory
    this.allowedWorkspace = config.allowedWorkspace ||
      '/workspaces/agent-feed/prod/agent_workspace';

    // Normalize to absolute path
    this.allowedWorkspace = path.resolve(this.allowedWorkspace);

    // Sensitive file patterns (regex)
    this.sensitivePatterns = [
      /\.env$/i,
      /\.env\..*/i,
      /\.git\//,
      /\.ssh\//,
      /id_rsa/i,
      /\.pem$/i,
      /\.key$/i,
      /password/i,
      /secret/i,
      /credentials/i,
      /\.aws\//,
      /\.npmrc$/,
      /\.pypirc$/,
      /config\.json$/i,
      /database\.json$/i,
      /\.pgpass$/,
      /authorized_keys/i
    ];

    // Directory traversal patterns
    this.traversalPatterns = [
      /\.\.\//,           // ../
      /\.\.\\/,           // ..\
      /%2e%2e%2f/i,       // URL encoded ../
      /%2e%2e%5c/i,       // URL encoded ..\
      /\.\.%2f/i,         // Mixed encoding
      /\.\.%5c/i,         // Mixed encoding
      /%252e%252e/i,      // Double URL encoded
      /\.\.\x00/,         // Null byte tricks
      /\.\.\x2f/,         // Hex encoded /
      /\.\.\x5c/          // Hex encoded \
    ];

    // Statistics tracking
    this.stats = {
      validations: 0,
      rejections: 0,
      traversalAttempts: 0,
      symlinkAttempts: 0,
      sensitiveFileAttempts: 0,
      hiddenFileAttempts: 0
    };
  }

  /**
   * Validate a file path against all security rules
   * @param {string} filePath - Path to validate
   * @returns {Promise<{valid: boolean, reason?: string, normalizedPath?: string}>}
   */
  async validate(filePath) {
    this.stats.validations++;

    // Input validation
    if (!filePath || typeof filePath !== 'string') {
      this.stats.rejections++;
      return {
        valid: false,
        reason: 'Invalid path: path must be a non-empty string'
      };
    }

    // Check for null bytes
    if (filePath.includes('\0')) {
      this.stats.rejections++;
      return {
        valid: false,
        reason: 'Invalid path: contains null byte'
      };
    }

    // Check for directory traversal patterns BEFORE normalization
    const traversalCheck = this.checkTraversalPatterns(filePath);
    if (!traversalCheck.valid) {
      this.stats.rejections++;
      this.stats.traversalAttempts++;
      return traversalCheck;
    }

    // Normalize path
    let normalizedPath;
    try {
      normalizedPath = path.normalize(filePath);

      // Convert to absolute path if relative
      if (!path.isAbsolute(normalizedPath)) {
        normalizedPath = path.resolve(this.allowedWorkspace, normalizedPath);
      }
    } catch (error) {
      this.stats.rejections++;
      return {
        valid: false,
        reason: `Path normalization failed: ${error.message}`
      };
    }

    // Check workspace boundary
    const boundaryCheck = this.checkWorkspaceBoundary(normalizedPath);
    if (!boundaryCheck.valid) {
      this.stats.rejections++;
      return boundaryCheck;
    }

    // Check for hidden files
    const hiddenCheck = this.checkHiddenFiles(normalizedPath);
    if (!hiddenCheck.valid) {
      this.stats.rejections++;
      this.stats.hiddenFileAttempts++;
      return hiddenCheck;
    }

    // Check for sensitive file patterns
    const sensitiveCheck = this.checkSensitiveFiles(normalizedPath);
    if (!sensitiveCheck.valid) {
      this.stats.rejections++;
      this.stats.sensitiveFileAttempts++;
      return sensitiveCheck;
    }

    // Check for symlinks (if file exists)
    const symlinkCheck = await this.checkSymlinks(normalizedPath);
    if (!symlinkCheck.valid) {
      this.stats.rejections++;
      this.stats.symlinkAttempts++;
      return symlinkCheck;
    }

    // Additional post-resolution check for traversal
    const postResolveCheck = this.checkWorkspaceBoundary(normalizedPath);
    if (!postResolveCheck.valid) {
      this.stats.rejections++;
      this.stats.traversalAttempts++;
      return postResolveCheck;
    }

    return {
      valid: true,
      normalizedPath
    };
  }

  /**
   * Check for directory traversal patterns
   */
  checkTraversalPatterns(filePath) {
    for (const pattern of this.traversalPatterns) {
      if (pattern.test(filePath)) {
        return {
          valid: false,
          reason: 'Path traversal attempt detected'
        };
      }
    }
    return { valid: true };
  }

  /**
   * Check if path is within allowed workspace
   */
  checkWorkspaceBoundary(normalizedPath) {
    // Ensure the path is within the allowed workspace
    const relativePath = path.relative(this.allowedWorkspace, normalizedPath);

    // If relative path starts with '..', it's outside the workspace
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return {
        valid: false,
        reason: 'Path outside allowed workspace'
      };
    }

    return { valid: true };
  }

  /**
   * Check for hidden files (starting with dot)
   */
  checkHiddenFiles(normalizedPath) {
    const basename = path.basename(normalizedPath);

    if (basename.startsWith('.')) {
      return {
        valid: false,
        reason: 'Hidden files not allowed'
      };
    }

    // Check all path segments for hidden directories
    const segments = normalizedPath.split(path.sep);
    for (const segment of segments) {
      if (segment.startsWith('.') && segment !== '.') {
        return {
          valid: false,
          reason: 'Hidden directories not allowed in path'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Check for sensitive file patterns
   */
  checkSensitiveFiles(normalizedPath) {
    for (const pattern of this.sensitivePatterns) {
      if (pattern.test(normalizedPath)) {
        return {
          valid: false,
          reason: 'Sensitive file pattern detected'
        };
      }
    }
    return { valid: true };
  }

  /**
   * Check for symlinks
   */
  async checkSymlinks(normalizedPath) {
    try {
      // Check if file exists
      const stats = await fs.lstat(normalizedPath).catch(() => null);

      if (stats && stats.isSymbolicLink()) {
        return {
          valid: false,
          reason: 'Symlinks not allowed'
        };
      }

      // Check all parent directories for symlinks
      let currentPath = normalizedPath;
      while (currentPath !== this.allowedWorkspace && currentPath !== '/') {
        const parentPath = path.dirname(currentPath);

        try {
          const parentStats = await fs.lstat(parentPath);
          if (parentStats.isSymbolicLink()) {
            return {
              valid: false,
              reason: 'Symlinks in path not allowed'
            };
          }
        } catch (error) {
          // Directory doesn't exist, continue checking parents
        }

        currentPath = parentPath;

        // Safety check to prevent infinite loop
        if (currentPath === parentPath) break;
      }

      return { valid: true };
    } catch (error) {
      // If file doesn't exist, symlink check passes (will be created)
      return { valid: true };
    }
  }

  /**
   * Validate multiple paths in batch
   */
  async validateBatch(filePaths) {
    const results = await Promise.all(
      filePaths.map(async (filePath) => ({
        path: filePath,
        result: await this.validate(filePath)
      }))
    );

    const valid = results.filter(r => r.result.valid);
    const invalid = results.filter(r => !r.result.valid);

    return {
      valid,
      invalid,
      allValid: invalid.length === 0
    };
  }

  /**
   * Get validation statistics
   */
  getStats() {
    return {
      ...this.stats,
      rejectionRate: this.stats.validations > 0
        ? (this.stats.rejections / this.stats.validations * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      validations: 0,
      rejections: 0,
      traversalAttempts: 0,
      symlinkAttempts: 0,
      sensitiveFileAttempts: 0,
      hiddenFileAttempts: 0
    };
  }

  /**
   * Get allowed workspace path
   */
  getAllowedWorkspace() {
    return this.allowedWorkspace;
  }
}

export default PathValidator;
