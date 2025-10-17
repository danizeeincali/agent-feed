/**
 * IntegrityChecker - SHA-256 integrity verification for protected agent configs
 *
 * Phase 3: Core Components Implementation
 *
 * Responsibility:
 * - Compute SHA-256 checksums for protected configurations
 * - Verify integrity by comparing stored vs computed checksums
 * - Support multiple checksum formats (sha256:..., plain hex)
 * - Deterministic hashing via sorted object keys
 */

import * as crypto from 'crypto';
import logger from '../../utils/logger';

/**
 * Protected configuration type (minimal for integrity checking)
 */
interface ProtectedConfig {
  version: string;
  agent_id: string;
  checksum?: string;
  permissions?: any;
  [key: string]: any;
}

/**
 * IntegrityChecker class
 * Handles all checksum computation and verification
 */
export class IntegrityChecker {
  /**
   * Verify protected config integrity
   * @param config - Protected configuration object
   * @param filePath - Path to protected config file (for logging)
   * @returns Promise resolving to true if valid, false otherwise
   */
  async verify(config: ProtectedConfig, filePath: string): Promise<boolean> {
    try {
      // Extract stored checksum
      const storedChecksum = this.extractChecksum(config.checksum);

      if (!storedChecksum) {
        logger.warn('No checksum found in protected config', { filePath });
        return false;
      }

      // Compute current checksum (exclude checksum field itself)
      const configWithoutChecksum = { ...config };
      delete configWithoutChecksum.checksum;

      const computedChecksum = this.computeHash(configWithoutChecksum);

      // Compare
      const isValid = storedChecksum === computedChecksum;

      if (!isValid) {
        logger.error('Integrity check failed', {
          filePath,
          stored: this.truncateHash(storedChecksum),
          computed: this.truncateHash(computedChecksum),
        });
      } else {
        logger.debug('Integrity check passed', {
          filePath,
          checksum: this.truncateHash(computedChecksum),
        });
      }

      return isValid;

    } catch (error) {
      logger.error('Integrity check error', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Compute SHA-256 hash of configuration
   * @param config - Configuration object (any)
   * @returns Hex-encoded SHA-256 hash
   */
  computeHash(config: ProtectedConfig | any): string {
    // Normalize config to stable JSON (sorted keys)
    const normalized = this.normalizeConfig(config);

    // Compute SHA-256
    const hash = crypto.createHash('sha256');
    hash.update(normalized);

    return hash.digest('hex');
  }

  /**
   * Add checksum to protected config
   * @param config - Configuration object
   * @returns Updated configuration with new checksum
   */
  addChecksum(config: ProtectedConfig): ProtectedConfig {
    const configWithoutChecksum = { ...config };
    delete configWithoutChecksum.checksum;

    const checksum = this.computeHash(configWithoutChecksum);

    return {
      ...config,
      checksum: `sha256:${checksum}`,
    };
  }

  /**
   * Verify checksum format
   * @param config - Configuration object
   * @returns True if checksum exists and is properly formatted
   */
  verifyChecksum(config: ProtectedConfig): boolean {
    if (!config.checksum) {
      return false;
    }

    // Accept both "sha256:..." and plain hex formats
    const checksum = this.extractChecksum(config.checksum);
    return !!checksum && /^[a-f0-9]{64}$/i.test(checksum);
  }

  /**
   * Extract checksum from various formats
   * Supports: "sha256:abc123...", "abc123..." (plain hex)
   * @param checksumField - Checksum string
   * @returns Extracted hex checksum or null
   */
  private extractChecksum(checksumField?: string): string | null {
    if (!checksumField) {
      return null;
    }

    // Handle "sha256:..." prefix
    if (checksumField.startsWith('sha256:')) {
      return checksumField.substring(7);
    }

    // Handle plain hex
    if (/^[a-f0-9]{64}$/i.test(checksumField)) {
      return checksumField;
    }

    return null;
  }

  /**
   * Normalize config to deterministic JSON string
   * @param config - Configuration object
   * @returns JSON string with sorted keys
   */
  private normalizeConfig(config: any): string {
    // Sort keys recursively for deterministic hashing
    const sortedConfig = this.sortObjectKeys(config);
    return JSON.stringify(sortedConfig);
  }

  /**
   * Recursively sort object keys for deterministic hashing
   * @param obj - Object to sort
   * @returns Object with sorted keys
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }

    const sorted: any = {};
    Object.keys(obj)
      .sort()
      .forEach(key => {
        sorted[key] = this.sortObjectKeys(obj[key]);
      });

    return sorted;
  }

  /**
   * Truncate hash for logging (first 16 chars + ellipsis)
   * @param hash - Full hash string
   * @returns Truncated hash
   */
  private truncateHash(hash: string): string {
    return hash.substring(0, 16) + '...';
  }
}

/**
 * Export singleton instance for convenience
 */
export const integrityChecker = new IntegrityChecker();
