/**
 * FileOperationValidator - File Size and Content Security Validation
 *
 * Security Features:
 * - File size limits (prevent disk exhaustion)
 * - Content sanitization (null bytes, control characters)
 * - UTF-8 encoding validation
 * - MIME type validation
 * - Binary file detection
 */

import fs from 'fs/promises';
import { PathValidator } from './PathValidator.js';

export class FileOperationValidator {
  constructor(config = {}) {
    // File size limit (default 10MB)
    this.maxFileSize = config.maxFileSize || 10 * 1024 * 1024; // 10MB in bytes

    // Initialize path validator
    this.pathValidator = config.pathValidator || new PathValidator(config);

    // Allowed file extensions (whitelist)
    this.allowedExtensions = config.allowedExtensions || [
      '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx',
      '.html', '.css', '.scss', '.yaml', '.yml', '.xml',
      '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h',
      '.sh', '.bash', '.sql', '.graphql', '.proto'
    ];

    // Blocked MIME types (executables, archives)
    this.blockedMimeTypes = [
      'application/x-executable',
      'application/x-sharedlib',
      'application/x-mach-binary',
      'application/x-msdownload',
      'application/x-dosexec',
      'application/zip',
      'application/x-tar',
      'application/x-gzip',
      'application/x-bzip2',
      'application/x-7z-compressed'
    ];

    // Statistics
    this.stats = {
      validations: 0,
      rejections: 0,
      sizeLimitExceeded: 0,
      invalidEncoding: 0,
      contentSanitized: 0,
      blockedExtensions: 0
    };
  }

  /**
   * Validate file operation (read/write)
   * @param {string} filePath - Path to validate
   * @param {string} operation - 'read' or 'write'
   * @param {string|Buffer} content - Content to validate (for write operations)
   * @returns {Promise<{valid: boolean, reason?: string, sanitizedContent?: string}>}
   */
  async validateOperation(filePath, operation, content = null) {
    this.stats.validations++;

    // Validate path first
    const pathValidation = await this.pathValidator.validate(filePath);
    if (!pathValidation.valid) {
      this.stats.rejections++;
      return pathValidation;
    }

    const normalizedPath = pathValidation.normalizedPath;

    // Validate file extension
    const extensionCheck = this.validateExtension(normalizedPath);
    if (!extensionCheck.valid) {
      this.stats.rejections++;
      this.stats.blockedExtensions++;
      return extensionCheck;
    }

    // Operation-specific validation
    if (operation === 'write') {
      return await this.validateWrite(normalizedPath, content);
    } else if (operation === 'read') {
      return await this.validateRead(normalizedPath);
    }

    return {
      valid: false,
      reason: 'Invalid operation type'
    };
  }

  /**
   * Validate write operation
   */
  async validateWrite(normalizedPath, content) {
    if (content === null || content === undefined) {
      this.stats.rejections++;
      return {
        valid: false,
        reason: 'Content required for write operation'
      };
    }

    // Convert Buffer to string
    let contentStr = content;
    if (Buffer.isBuffer(content)) {
      contentStr = content.toString('utf-8');
    }

    // Validate content size
    const sizeCheck = this.validateSize(contentStr);
    if (!sizeCheck.valid) {
      this.stats.rejections++;
      this.stats.sizeLimitExceeded++;
      return sizeCheck;
    }

    // Validate encoding
    const encodingCheck = this.validateEncoding(contentStr);
    if (!encodingCheck.valid) {
      this.stats.rejections++;
      this.stats.invalidEncoding++;
      return encodingCheck;
    }

    // Sanitize content
    const sanitized = this.sanitizeContent(contentStr);
    if (sanitized.modified) {
      this.stats.contentSanitized++;
    }

    return {
      valid: true,
      normalizedPath,
      sanitizedContent: sanitized.content,
      modified: sanitized.modified
    };
  }

  /**
   * Validate read operation
   */
  async validateRead(normalizedPath) {
    try {
      // Check if file exists
      const stats = await fs.stat(normalizedPath);

      // Validate file size
      if (stats.size > this.maxFileSize) {
        this.stats.rejections++;
        this.stats.sizeLimitExceeded++;
        return {
          valid: false,
          reason: `File size ${stats.size} exceeds maximum ${this.maxFileSize} bytes`
        };
      }

      // Check if it's a regular file
      if (!stats.isFile()) {
        this.stats.rejections++;
        return {
          valid: false,
          reason: 'Not a regular file'
        };
      }

      return {
        valid: true,
        normalizedPath,
        fileSize: stats.size
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist - OK for read operations (will return not found)
        return {
          valid: true,
          normalizedPath,
          fileExists: false
        };
      }

      this.stats.rejections++;
      return {
        valid: false,
        reason: `File access error: ${error.message}`
      };
    }
  }

  /**
   * Validate file extension
   */
  validateExtension(filePath) {
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();

    if (!this.allowedExtensions.includes(ext)) {
      return {
        valid: false,
        reason: `File extension ${ext} not allowed`
      };
    }

    return { valid: true };
  }

  /**
   * Validate content size
   */
  validateSize(content) {
    const size = Buffer.byteLength(content, 'utf-8');

    if (size > this.maxFileSize) {
      return {
        valid: false,
        reason: `Content size ${size} exceeds maximum ${this.maxFileSize} bytes`
      };
    }

    return { valid: true };
  }

  /**
   * Validate UTF-8 encoding
   */
  validateEncoding(content) {
    try {
      // Try to encode and decode
      const buffer = Buffer.from(content, 'utf-8');
      const decoded = buffer.toString('utf-8');

      // Check for replacement characters (indicates invalid UTF-8)
      if (decoded.includes('\uFFFD')) {
        return {
          valid: false,
          reason: 'Invalid UTF-8 encoding detected'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: 'Content encoding validation failed'
      };
    }
  }

  /**
   * Sanitize content (remove dangerous characters)
   */
  sanitizeContent(content) {
    let sanitized = content;
    let modified = false;

    // Remove null bytes
    if (sanitized.includes('\0')) {
      sanitized = sanitized.replace(/\0/g, '');
      modified = true;
    }

    // Remove control characters (except common ones like \n, \r, \t)
    const originalLength = sanitized.length;
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    if (sanitized.length !== originalLength) {
      modified = true;
    }

    return {
      content: sanitized,
      modified
    };
  }

  /**
   * Detect if content is binary
   */
  isBinary(content) {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

    // Check first 8000 bytes for null bytes (common in binary files)
    const checkLength = Math.min(buffer.length, 8000);
    for (let i = 0; i < checkLength; i++) {
      if (buffer[i] === 0) {
        return true;
      }
    }

    // Check for high ratio of non-printable characters
    let nonPrintable = 0;
    for (let i = 0; i < checkLength; i++) {
      const byte = buffer[i];
      if (byte < 0x20 && byte !== 0x09 && byte !== 0x0A && byte !== 0x0D) {
        nonPrintable++;
      }
    }

    const ratio = nonPrintable / checkLength;
    return ratio > 0.3; // More than 30% non-printable = likely binary
  }

  /**
   * Validate directory operation
   */
  async validateDirectory(dirPath) {
    // Validate path
    const pathValidation = await this.pathValidator.validate(dirPath);
    if (!pathValidation.valid) {
      return pathValidation;
    }

    return {
      valid: true,
      normalizedPath: pathValidation.normalizedPath
    };
  }

  /**
   * Safe file read with validation
   */
  async safeRead(filePath) {
    const validation = await this.validateOperation(filePath, 'read');
    if (!validation.valid) {
      throw new Error(`File validation failed: ${validation.reason}`);
    }

    if (validation.fileExists === false) {
      throw new Error('File not found');
    }

    try {
      const content = await fs.readFile(validation.normalizedPath, 'utf-8');

      // Validate the content we read
      const encodingCheck = this.validateEncoding(content);
      if (!encodingCheck.valid) {
        throw new Error('File contains invalid UTF-8 encoding');
      }

      return content;
    } catch (error) {
      throw new Error(`File read error: ${error.message}`);
    }
  }

  /**
   * Safe file write with validation
   */
  async safeWrite(filePath, content) {
    const validation = await this.validateOperation(filePath, 'write', content);
    if (!validation.valid) {
      throw new Error(`File validation failed: ${validation.reason}`);
    }

    try {
      // Ensure directory exists
      const dirPath = validation.normalizedPath.substring(
        0,
        validation.normalizedPath.lastIndexOf('/')
      );
      await fs.mkdir(dirPath, { recursive: true });

      // Write sanitized content
      await fs.writeFile(
        validation.normalizedPath,
        validation.sanitizedContent,
        'utf-8'
      );

      return {
        success: true,
        path: validation.normalizedPath,
        contentModified: validation.modified
      };
    } catch (error) {
      throw new Error(`File write error: ${error.message}`);
    }
  }

  /**
   * Safe file delete with validation
   */
  async safeDelete(filePath) {
    const pathValidation = await this.pathValidator.validate(filePath);
    if (!pathValidation.valid) {
      throw new Error(`Path validation failed: ${pathValidation.reason}`);
    }

    try {
      await fs.unlink(pathValidation.normalizedPath);
      return {
        success: true,
        path: pathValidation.normalizedPath
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('File not found');
      }
      throw new Error(`File delete error: ${error.message}`);
    }
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
      sizeLimitExceeded: 0,
      invalidEncoding: 0,
      contentSanitized: 0,
      blockedExtensions: 0
    };
    this.pathValidator.resetStats();
  }
}

export default FileOperationValidator;
