/**
 * FileOperationExecutor - Executes file operations with security validation
 * Phase 2: File Operation Support
 *
 * Security features:
 * - Path traversal prevention
 * - Workspace boundary enforcement
 * - File size limits
 * - Content sanitization
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { WorkerResult } from '../types/worker';

export interface FileOperationParams {
  operation: 'create' | 'read' | 'write' | 'delete';
  path: string;
  content?: string;
}

export interface FileOperationResult {
  success: boolean;
  path?: string;
  content?: string;
  error?: string;
  bytesWritten?: number;
}

/**
 * Executes file operations with comprehensive security validation
 */
export class FileOperationExecutor {
  private readonly allowedWorkspace: string;
  private readonly maxFileSize: number;

  constructor(config?: { allowedWorkspace?: string; maxFileSize?: number }) {
    this.allowedWorkspace = config?.allowedWorkspace || '/workspaces/agent-feed/prod/agent_workspace';
    this.maxFileSize = config?.maxFileSize || 10 * 1024 * 1024; // 10MB default
  }

  /**
   * Execute file operation
   */
  async execute(params: FileOperationParams): Promise<WorkerResult> {
    const startTime = Date.now();

    try {
      // Validate parameters
      this.validateParams(params);

      // Validate and resolve path
      const safePath = await this.validateAndResolvePath(params.path);

      // Execute operation
      let result: FileOperationResult;
      switch (params.operation) {
        case 'create':
        case 'write':
          result = await this.createFile(safePath, params.content || '');
          break;
        case 'read':
          result = await this.readFile(safePath);
          break;
        case 'delete':
          result = await this.deleteFile(safePath);
          break;
        default:
          throw new Error(`Unsupported operation: ${params.operation}`);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: result,
        tokensUsed: 0,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        error: error as Error,
        tokensUsed: 0,
        duration,
      };
    }
  }

  /**
   * Validate operation parameters
   */
  private validateParams(params: FileOperationParams): void {
    if (!params.operation) {
      throw new Error('Operation is required');
    }

    if (!params.path) {
      throw new Error('Path is required');
    }

    if ((params.operation === 'create' || params.operation === 'write') && params.content === undefined) {
      throw new Error('Content is required for create/write operations');
    }
  }

  /**
   * Validate and resolve file path with security checks
   */
  private async validateAndResolvePath(filePath: string): Promise<string> {
    // Remove any null bytes (security: null byte injection)
    if (filePath.includes('\0')) {
      throw new Error('Path contains null bytes');
    }

    // Resolve to absolute path
    const resolvedPath = path.resolve(this.allowedWorkspace, filePath);

    // Security check 1: Ensure path is within allowed workspace
    if (!resolvedPath.startsWith(this.allowedWorkspace)) {
      throw new Error('Path traversal detected: operation outside allowed workspace');
    }

    // Security check 2: Block directory traversal patterns
    const pathSegments = filePath.split(/[/\\]/);
    for (const segment of pathSegments) {
      if (segment === '..' || segment === '.') {
        throw new Error('Path traversal detected: .. or . in path');
      }
    }

    // Security check 3: Block hidden files and sensitive patterns
    const filename = path.basename(resolvedPath);
    if (filename.startsWith('.')) {
      throw new Error('Hidden files are not allowed');
    }

    // Security check 4: Block sensitive file patterns
    const sensitivePatterns = [
      /\.env/i,
      /\.git/i,
      /\.ssh/i,
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /credential/i,
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(filename)) {
        throw new Error(`Sensitive file pattern detected: ${filename}`);
      }
    }

    // Security check 5: Ensure parent directory exists or can be created
    const parentDir = path.dirname(resolvedPath);
    if (!parentDir.startsWith(this.allowedWorkspace)) {
      throw new Error('Invalid parent directory');
    }

    return resolvedPath;
  }

  /**
   * Create or write file with content
   */
  private async createFile(filePath: string, content: string): Promise<FileOperationResult> {
    // Validate content size
    const contentSize = Buffer.byteLength(content, 'utf8');
    if (contentSize > this.maxFileSize) {
      throw new Error(`File size ${contentSize} bytes exceeds maximum ${this.maxFileSize} bytes`);
    }

    // Sanitize content (remove control characters except newlines/tabs)
    const sanitized = this.sanitizeContent(content);

    // Ensure parent directory exists
    const parentDir = path.dirname(filePath);
    await fs.mkdir(parentDir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, sanitized, 'utf8');

    // Verify file was created
    const stats = await fs.stat(filePath);

    return {
      success: true,
      path: filePath,
      bytesWritten: stats.size,
    };
  }

  /**
   * Read file content
   */
  private async readFile(filePath: string): Promise<FileOperationResult> {
    // Check if file exists
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch {
      throw new Error(`File not found or not readable: ${filePath}`);
    }

    // Check file size before reading
    const stats = await fs.stat(filePath);
    if (stats.size > this.maxFileSize) {
      throw new Error(`File size ${stats.size} bytes exceeds maximum ${this.maxFileSize} bytes`);
    }

    // Read file
    const content = await fs.readFile(filePath, 'utf8');

    return {
      success: true,
      path: filePath,
      content,
    };
  }

  /**
   * Delete file
   */
  private async deleteFile(filePath: string): Promise<FileOperationResult> {
    // Check if file exists
    try {
      await fs.access(filePath, fs.constants.F_OK);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }

    // Ensure it's a file, not a directory
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      throw new Error('Cannot delete directories');
    }

    // Delete file
    await fs.unlink(filePath);

    return {
      success: true,
      path: filePath,
    };
  }

  /**
   * Sanitize file content
   * Removes control characters except newlines (\n), carriage returns (\r), and tabs (\t)
   */
  private sanitizeContent(content: string): string {
    // Remove null bytes
    let sanitized = content.replace(/\0/g, '');

    // Remove control characters except \n, \r, \t
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return sanitized;
  }

  /**
   * Get allowed workspace path
   */
  getAllowedWorkspace(): string {
    return this.allowedWorkspace;
  }

  /**
   * Get max file size
   */
  getMaxFileSize(): number {
    return this.maxFileSize;
  }
}
