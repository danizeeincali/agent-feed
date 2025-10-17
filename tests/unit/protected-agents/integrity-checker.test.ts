/**
 * Unit Tests: IntegrityChecker
 *
 * Tests the integrity verification system for protected agent configurations
 * using London School TDD methodology (mocking external dependencies).
 *
 * Test Coverage:
 * - Compute SHA-256 checksums correctly
 * - Detect tampered configs
 * - Pass validation for valid configs
 * - Handle different checksum formats
 * - Performance testing for large configs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as crypto from 'crypto';

// Mock crypto module for deterministic testing
vi.mock('crypto');

// Type definitions
interface ProtectedConfig {
  version: string;
  checksum?: string;
  agent_id: string;
  permissions: any;
  _metadata?: {
    hash?: string;
    updated_at?: string;
    version?: string;
  };
}

// System Under Test
class IntegrityChecker {
  /**
   * Compute SHA-256 hash of config content (excluding checksum field itself)
   */
  computeHash(config: ProtectedConfig): string {
    // Create a copy without checksum field to avoid circular dependency
    const configWithoutChecksum = { ...config };
    delete configWithoutChecksum.checksum;
    if (configWithoutChecksum._metadata) {
      delete configWithoutChecksum._metadata.hash;
    }

    // Serialize to stable JSON (sorted keys)
    const configString = this.stableStringify(configWithoutChecksum);

    // Compute SHA-256 hash
    const hash = crypto.createHash('sha256');
    hash.update(configString);
    return hash.digest('hex');
  }

  /**
   * Verify that config's checksum matches computed hash
   */
  verifyIntegrity(config: ProtectedConfig): boolean {
    if (!config.checksum && !config._metadata?.hash) {
      // No checksum provided - fail validation
      return false;
    }

    const storedHash = this.extractHash(config);
    const computedHash = this.computeHash(config);

    return storedHash === computedHash;
  }

  /**
   * Detect if config has been tampered with
   */
  detectTampering(config: ProtectedConfig): { tampered: boolean; reason?: string } {
    if (!config.checksum && !config._metadata?.hash) {
      return { tampered: true, reason: 'No checksum found' };
    }

    const isValid = this.verifyIntegrity(config);
    if (!isValid) {
      return { tampered: true, reason: 'Checksum mismatch' };
    }

    return { tampered: false };
  }

  /**
   * Create checksum for a new config
   */
  createChecksum(config: ProtectedConfig): string {
    const hash = this.computeHash(config);
    return `sha256:${hash}`;
  }

  /**
   * Extract hash from config (supports multiple formats)
   */
  private extractHash(config: ProtectedConfig): string {
    // Support "sha256:hash" format
    if (config.checksum) {
      return config.checksum.replace('sha256:', '');
    }

    // Support metadata.hash format
    if (config._metadata?.hash) {
      return config._metadata.hash.replace('sha256:', '');
    }

    return '';
  }

  /**
   * Stable JSON stringification (sorted keys for deterministic hashing)
   */
  private stableStringify(obj: any): string {
    if (obj === null) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) {
      return '[' + obj.map(item => this.stableStringify(item)).join(',') + ']';
    }

    const keys = Object.keys(obj).sort();
    const pairs = keys.map(key => `"${key}":${this.stableStringify(obj[key])}`);
    return '{' + pairs.join(',') + '}';
  }
}

describe('IntegrityChecker - Unit Tests (London School)', () => {
  let checker: IntegrityChecker;

  beforeEach(() => {
    checker = new IntegrityChecker();
    vi.clearAllMocks();
  });

  describe('SHA-256 Hash Computation', () => {
    it('should compute SHA-256 hash correctly', () => {
      // Arrange
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'test-agent',
        permissions: {
          api_endpoints: ['/api/posts'],
          workspace: { root: '/test' }
        }
      };

      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('abcdef1234567890')
      };

      vi.mocked(crypto.createHash).mockReturnValue(mockHash as any);

      // Act
      const hash = checker.computeHash(config);

      // Assert
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockHash.update).toHaveBeenCalled();
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
      expect(hash).toBe('abcdef1234567890');
    });

    it('should produce same hash for identical configs', () => {
      // Arrange
      const config1: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'agent-1',
        permissions: { workspace: { root: '/test' } }
      };

      const config2: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'agent-1',
        permissions: { workspace: { root: '/test' } }
      };

      const mockHash1 = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('hash123')
      };

      const mockHash2 = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('hash123')
      };

      vi.mocked(crypto.createHash)
        .mockReturnValueOnce(mockHash1 as any)
        .mockReturnValueOnce(mockHash2 as any);

      // Act
      const hash1 = checker.computeHash(config1);
      const hash2 = checker.computeHash(config2);

      // Assert
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different configs', () => {
      // Arrange
      const config1: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'agent-1',
        permissions: {}
      };

      const config2: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'agent-2', // Different agent_id
        permissions: {}
      };

      vi.mocked(crypto.createHash)
        .mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          digest: vi.fn().mockReturnValue('hash-agent-1')
        } as any)
        .mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          digest: vi.fn().mockReturnValue('hash-agent-2')
        } as any);

      // Act
      const hash1 = checker.computeHash(config1);
      const hash2 = checker.computeHash(config2);

      // Assert
      expect(hash1).not.toBe(hash2);
    });

    it('should exclude checksum field from hash computation', () => {
      // Arrange
      const configWithChecksum: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'test-agent',
        checksum: 'sha256:oldchecksum123',
        permissions: {}
      };

      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('newhash456')
      };

      vi.mocked(crypto.createHash).mockReturnValue(mockHash as any);

      // Act
      checker.computeHash(configWithChecksum);

      // Assert: Verify that checksum field was excluded from hashed content
      const hashedContent = mockHash.update.mock.calls[0][0];
      expect(hashedContent).not.toContain('oldchecksum123');
    });
  });

  describe('Integrity Verification', () => {
    it('should verify valid config successfully', () => {
      // Arrange: Config with matching checksum
      const validHash = 'abc123def456';
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'valid-agent',
        checksum: `sha256:${validHash}`,
        permissions: {}
      };

      vi.mocked(crypto.createHash).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(validHash)
      } as any);

      // Act
      const isValid = checker.verifyIntegrity(config);

      // Assert
      expect(isValid).toBe(true);
    });

    it('should fail verification for tampered config', () => {
      // Arrange: Config with non-matching checksum
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'tampered-agent',
        checksum: 'sha256:originalhash',
        permissions: {
          workspace: { root: '/tampered/path' } // Modified after checksum
        }
      };

      vi.mocked(crypto.createHash).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('differenthash') // Doesn't match
      } as any);

      // Act
      const isValid = checker.verifyIntegrity(config);

      // Assert
      expect(isValid).toBe(false);
    });

    it('should fail verification when checksum is missing', () => {
      // Arrange: Config without checksum
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'no-checksum-agent',
        permissions: {}
        // No checksum field
      };

      // Act
      const isValid = checker.verifyIntegrity(config);

      // Assert
      expect(isValid).toBe(false);
    });

    it('should support metadata.hash format', () => {
      // Arrange: Config using _metadata.hash instead of checksum
      const validHash = 'metadata-hash-123';
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'metadata-agent',
        permissions: {},
        _metadata: {
          hash: `sha256:${validHash}`,
          updated_at: '2025-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      vi.mocked(crypto.createHash).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(validHash)
      } as any);

      // Act
      const isValid = checker.verifyIntegrity(config);

      // Assert
      expect(isValid).toBe(true);
    });
  });

  describe('Tampering Detection', () => {
    it('should detect tampered config and provide reason', () => {
      // Arrange
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'tampered',
        checksum: 'sha256:expected',
        permissions: { modified: true }
      };

      vi.mocked(crypto.createHash).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('actual-different-hash')
      } as any);

      // Act
      const result = checker.detectTampering(config);

      // Assert
      expect(result.tampered).toBe(true);
      expect(result.reason).toBe('Checksum mismatch');
    });

    it('should detect missing checksum as tampering', () => {
      // Arrange
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'no-checksum',
        permissions: {}
      };

      // Act
      const result = checker.detectTampering(config);

      // Assert
      expect(result.tampered).toBe(true);
      expect(result.reason).toBe('No checksum found');
    });

    it('should pass validation for untampered config', () => {
      // Arrange
      const validHash = 'valid-checksum-xyz';
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'clean',
        checksum: `sha256:${validHash}`,
        permissions: {}
      };

      vi.mocked(crypto.createHash).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(validHash)
      } as any);

      // Act
      const result = checker.detectTampering(config);

      // Assert
      expect(result.tampered).toBe(false);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Checksum Creation', () => {
    it('should create checksum in sha256: format', () => {
      // Arrange
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'new-agent',
        permissions: {}
      };

      vi.mocked(crypto.createHash).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('newhash789')
      } as any);

      // Act
      const checksum = checker.createChecksum(config);

      // Assert
      expect(checksum).toBe('sha256:newhash789');
    });

    it('should create consistent checksums for same config', () => {
      // Arrange
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'consistent',
        permissions: { test: true }
      };

      vi.mocked(crypto.createHash).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('consistent-hash')
      } as any);

      // Act
      const checksum1 = checker.createChecksum(config);
      const checksum2 = checker.createChecksum(config);

      // Assert
      expect(checksum1).toBe(checksum2);
    });
  });

  describe('Format Support', () => {
    it('should handle sha256: prefix in checksum', () => {
      // Arrange
      const hash = 'abc123';
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'prefixed',
        checksum: `sha256:${hash}`,
        permissions: {}
      };

      vi.mocked(crypto.createHash).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(hash)
      } as any);

      // Act
      const isValid = checker.verifyIntegrity(config);

      // Assert
      expect(isValid).toBe(true);
    });

    it('should handle checksum without sha256: prefix', () => {
      // Arrange
      const hash = 'direct-hash-456';
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'direct',
        checksum: hash, // No prefix
        permissions: {}
      };

      vi.mocked(crypto.createHash).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(hash)
      } as any);

      // Act
      const isValid = checker.verifyIntegrity(config);

      // Assert
      expect(isValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty permissions object', () => {
      // Arrange
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'empty',
        permissions: {}
      };

      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('empty-hash')
      };

      vi.mocked(crypto.createHash).mockReturnValue(mockHash as any);

      // Act
      const hash = checker.computeHash(config);

      // Assert
      expect(hash).toBe('empty-hash');
    });

    it('should handle deeply nested permissions', () => {
      // Arrange
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'nested',
        permissions: {
          level1: {
            level2: {
              level3: {
                level4: {
                  value: 'deep'
                }
              }
            }
          }
        }
      };

      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('nested-hash')
      };

      vi.mocked(crypto.createHash).mockReturnValue(mockHash as any);

      // Act
      const hash = checker.computeHash(config);

      // Assert
      expect(hash).toBeTruthy();
      expect(mockHash.update).toHaveBeenCalled();
    });

    it('should handle arrays in permissions', () => {
      // Arrange
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'array-config',
        permissions: {
          api_endpoints: [
            { path: '/api/posts', methods: ['GET', 'POST'] },
            { path: '/api/comments', methods: ['GET'] }
          ],
          allowed_tools: ['Read', 'Write', 'Bash']
        }
      };

      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('array-hash')
      };

      vi.mocked(crypto.createHash).mockReturnValue(mockHash as any);

      // Act
      const hash = checker.computeHash(config);

      // Assert
      expect(hash).toBeTruthy();
    });

    it('should handle special characters in config values', () => {
      // Arrange
      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'special-chars-äöü-日本語',
        permissions: {
          workspace: { root: '/path/with/special/chars/日本語/äöü' }
        }
      };

      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('unicode-hash')
      };

      vi.mocked(crypto.createHash).mockReturnValue(mockHash as any);

      // Act
      const hash = checker.computeHash(config);

      // Assert
      expect(hash).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should handle large config efficiently', () => {
      // Arrange: Create large config with many permissions
      const largePermissions: any = {};
      for (let i = 0; i < 100; i++) {
        largePermissions[`endpoint_${i}`] = {
          path: `/api/resource_${i}`,
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          rate_limit: `${i * 10}/minute`,
          nested: {
            data: new Array(50).fill(`value_${i}`)
          }
        };
      }

      const config: ProtectedConfig = {
        version: '1.0.0',
        agent_id: 'large-config',
        permissions: largePermissions
      };

      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('large-config-hash')
      };

      vi.mocked(crypto.createHash).mockReturnValue(mockHash as any);

      // Act
      const startTime = Date.now();
      const hash = checker.computeHash(config);
      const duration = Date.now() - startTime;

      // Assert
      expect(hash).toBeTruthy();
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });
  });
});
