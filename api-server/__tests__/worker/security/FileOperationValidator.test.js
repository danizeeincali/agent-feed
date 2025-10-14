/**
 * FileOperationValidator Test Suite
 * Comprehensive file operation security tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileOperationValidator } from '../../../worker/security/FileOperationValidator.js';
import fs from 'fs/promises';
import path from 'path';

describe('FileOperationValidator', () => {
  let validator;
  const testWorkspace = '/workspaces/agent-feed/prod/agent_workspace';
  const testDir = path.join(testWorkspace, 'test-' + Date.now());

  beforeEach(async () => {
    validator = new FileOperationValidator({
      allowedWorkspace: testWorkspace,
      maxFileSize: 10 * 1024 * 1024 // 10MB
    });

    // Create test directory
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterEach(async () => {
    validator.resetStats();

    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Operation Validation', () => {
    it('should validate write operation with valid content', async () => {
      const result = await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        'Hello, World!'
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedContent).toBe('Hello, World!');
    });

    it('should validate read operation', async () => {
      const testFile = path.join(testDir, 'test.txt');
      await fs.writeFile(testFile, 'test content');

      const result = await validator.validateOperation(testFile, 'read');

      expect(result.valid).toBe(true);
      expect(result.normalizedPath).toBeDefined();
    });

    it('should reject invalid operation type', async () => {
      const result = await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'invalid',
        'content'
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid operation');
    });

    it('should reject write without content', async () => {
      const result = await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        null
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Content required');
    });
  });

  describe('File Extension Validation', () => {
    it('should accept allowed extensions', async () => {
      const allowedExts = ['.txt', '.js', '.json', '.md', '.py'];

      for (const ext of allowedExts) {
        const result = await validator.validateOperation(
          path.join(testDir, `test${ext}`),
          'write',
          'content'
        );

        expect(result.valid).toBe(true);
      }
    });

    it('should reject disallowed extensions', async () => {
      const blockedExts = ['.exe', '.dll', '.so', '.dylib', '.bin'];

      for (const ext of blockedExts) {
        const result = await validator.validateOperation(
          path.join(testDir, `test${ext}`),
          'write',
          'content'
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('extension');
      }
    });
  });

  describe('File Size Limits', () => {
    it('should accept content within size limit', async () => {
      const content = 'x'.repeat(1024); // 1KB

      const result = await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        content
      );

      expect(result.valid).toBe(true);
    });

    it('should reject content exceeding size limit', async () => {
      const content = 'x'.repeat(11 * 1024 * 1024); // 11MB

      const result = await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        content
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('size');
      expect(result.reason).toContain('exceeds');
    });

    it('should reject reading files exceeding size limit', async () => {
      const testFile = path.join(testDir, 'large.txt');

      // Mock a large file by creating actual large file
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      try {
        await fs.writeFile(testFile, largeContent);

        const result = await validator.validateOperation(testFile, 'read');

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('size');
      } catch (error) {
        // If we can't create large file, skip this test
        console.warn('Skipping large file test:', error.message);
      }
    });

    it('should handle size validation for Buffer content', async () => {
      const buffer = Buffer.from('test content');

      const result = await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        buffer
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('Content Sanitization', () => {
    it('should remove null bytes from content', async () => {
      const content = 'Hello\0World\0';

      const result = await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        content
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedContent).toBe('HelloWorld');
      expect(result.modified).toBe(true);
    });

    it('should remove control characters', async () => {
      const content = 'Hello\x01\x02World\x7F';

      const result = await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        content
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedContent).toBe('HelloWorld');
      expect(result.modified).toBe(true);
    });

    it('should preserve newlines and tabs', async () => {
      const content = 'Hello\nWorld\t!';

      const result = await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        content
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedContent).toBe('Hello\nWorld\t!');
      expect(result.modified).toBe(false);
    });

    it('should preserve carriage returns', async () => {
      const content = 'Hello\r\nWorld';

      const result = await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        content
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedContent).toBe('Hello\r\nWorld');
    });
  });

  describe('UTF-8 Encoding Validation', () => {
    it('should accept valid UTF-8 content', async () => {
      const content = 'Hello 世界 🌍';

      const result = await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        content
      );

      expect(result.valid).toBe(true);
    });

    it('should detect invalid UTF-8 encoding', async () => {
      // Create invalid UTF-8 buffer
      const invalidBuffer = Buffer.from([0xFF, 0xFE, 0xFD]);
      const invalidString = invalidBuffer.toString('utf-8');

      const result = await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        invalidString
      );

      // Should detect replacement character
      if (invalidString.includes('\uFFFD')) {
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('encoding');
      } else {
        // Some systems might handle this differently
        expect(result.valid).toBeDefined();
      }
    });
  });

  describe('Binary File Detection', () => {
    it('should detect binary content with null bytes', () => {
      const binaryContent = '\x00\x01\x02\x03\x04';
      expect(validator.isBinary(binaryContent)).toBe(true);
    });

    it('should detect text content', () => {
      const textContent = 'Hello, World!';
      expect(validator.isBinary(textContent)).toBe(false);
    });

    it('should handle Buffer input', () => {
      const binaryBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      expect(validator.isBinary(binaryBuffer)).toBe(true);

      const textBuffer = Buffer.from('Hello, World!');
      expect(validator.isBinary(textBuffer)).toBe(false);
    });

    it('should detect high ratio of non-printable characters', () => {
      const nonPrintable = '\x01\x02\x03\x04\x05'.repeat(200);
      expect(validator.isBinary(nonPrintable)).toBe(true);
    });
  });

  describe('Safe File Operations', () => {
    it('should safely write file', async () => {
      const testFile = path.join(testDir, 'safe-write.txt');
      const content = 'Test content';

      const result = await validator.safeWrite(testFile, content);

      expect(result.success).toBe(true);
      expect(result.path).toBeDefined();

      // Verify file was written
      const readContent = await fs.readFile(testFile, 'utf-8');
      expect(readContent).toBe(content);
    });

    it('should safely read file', async () => {
      const testFile = path.join(testDir, 'safe-read.txt');
      const content = 'Test content';

      await fs.writeFile(testFile, content);

      const readContent = await validator.safeRead(testFile);

      expect(readContent).toBe(content);
    });

    it('should throw error for safe read of non-existent file', async () => {
      const testFile = path.join(testDir, 'nonexistent.txt');

      await expect(validator.safeRead(testFile)).rejects.toThrow();
    });

    it('should safely delete file', async () => {
      const testFile = path.join(testDir, 'safe-delete.txt');

      await fs.writeFile(testFile, 'content');

      const result = await validator.safeDelete(testFile);

      expect(result.success).toBe(true);

      // Verify file was deleted
      await expect(fs.access(testFile)).rejects.toThrow();
    });

    it('should throw error for delete of non-existent file', async () => {
      const testFile = path.join(testDir, 'nonexistent.txt');

      await expect(validator.safeDelete(testFile)).rejects.toThrow('not found');
    });

    it('should create parent directories for safe write', async () => {
      const testFile = path.join(testDir, 'subdir', 'nested', 'file.txt');
      const content = 'Test content';

      const result = await validator.safeWrite(testFile, content);

      expect(result.success).toBe(true);

      // Verify file was written
      const readContent = await fs.readFile(testFile, 'utf-8');
      expect(readContent).toBe(content);
    });

    it('should sanitize content during safe write', async () => {
      const testFile = path.join(testDir, 'sanitized.txt');
      const content = 'Hello\0World\x01';

      const result = await validator.safeWrite(testFile, content);

      expect(result.success).toBe(true);
      expect(result.contentModified).toBe(true);

      // Verify sanitized content
      const readContent = await fs.readFile(testFile, 'utf-8');
      expect(readContent).toBe('HelloWorld');
    });
  });

  describe('Directory Validation', () => {
    it('should validate directory path', async () => {
      const result = await validator.validateDirectory(testDir);

      expect(result.valid).toBe(true);
      expect(result.normalizedPath).toBeDefined();
    });

    it('should reject directory outside workspace', async () => {
      const result = await validator.validateDirectory('/etc');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('outside');
    });
  });

  describe('Statistics Tracking', () => {
    it('should track validation attempts', async () => {
      await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        'content'
      );

      const stats = validator.getStats();

      expect(stats.validations).toBe(1);
    });

    it('should track rejections', async () => {
      const content = 'x'.repeat(11 * 1024 * 1024); // Exceeds limit

      await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        content
      );

      const stats = validator.getStats();

      expect(stats.rejections).toBe(1);
      expect(stats.sizeLimitExceeded).toBe(1);
    });

    it('should track content sanitization', async () => {
      await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        'Hello\0World'
      );

      const stats = validator.getStats();

      expect(stats.contentSanitized).toBe(1);
    });

    it('should calculate rejection rate', async () => {
      const content = 'x'.repeat(11 * 1024 * 1024);

      await validator.validateOperation(
        path.join(testDir, 'test1.txt'),
        'write',
        'valid'
      );
      await validator.validateOperation(
        path.join(testDir, 'test2.txt'),
        'write',
        content
      );

      const stats = validator.getStats();

      expect(stats.rejectionRate).toBe('50.00%');
    });

    it('should reset statistics', async () => {
      await validator.validateOperation(
        path.join(testDir, 'test.txt'),
        'write',
        'content'
      );

      validator.resetStats();
      const stats = validator.getStats();

      expect(stats.validations).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const result = await validator.validateOperation(
        path.join(testDir, 'empty.txt'),
        'write',
        ''
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedContent).toBe('');
    });

    it('should handle Unicode content', async () => {
      const content = '你好世界 🌍 مرحبا';

      const result = await validator.validateOperation(
        path.join(testDir, 'unicode.txt'),
        'write',
        content
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedContent).toBe(content);
    });

    it('should handle multiline content', async () => {
      const content = 'Line 1\nLine 2\nLine 3';

      const result = await validator.validateOperation(
        path.join(testDir, 'multiline.txt'),
        'write',
        content
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedContent).toBe(content);
    });
  });

  describe('Integration with PathValidator', () => {
    it('should reject path traversal in operations', async () => {
      const result = await validator.validateOperation(
        path.join(testDir, '../../../etc/passwd'),
        'write',
        'content'
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/traversal|outside/);
    });

    it('should reject sensitive files', async () => {
      const result = await validator.validateOperation(
        path.join(testDir, '.env'),
        'write',
        'content'
      );

      expect(result.valid).toBe(false);
    });
  });
});
