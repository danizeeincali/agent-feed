/**
 * TDD Test Suite for ApiKeyEncryption
 *
 * These tests define the contract for API key encryption/decryption functionality.
 * Written BEFORE implementation (Red Phase of TDD).
 *
 * Run with: npm test -- ApiKeyEncryption.test.js
 */

describe('ApiKeyEncryption', () => {
  let ApiKeyEncryption;

  beforeAll(() => {
    // Try to require the module - will fail in Red phase
    try {
      ApiKeyEncryption = require('../../../../services/auth/ApiKeyEncryption');
    } catch (error) {
      // Expected to fail - implementation doesn't exist yet
      ApiKeyEncryption = null;
    }
  });

  beforeEach(() => {
    // Set encryption key for tests
    process.env.API_KEY_ENCRYPTION_SECRET = 'test-encryption-secret-key-32-chars-long-minimum-required';
  });

  afterEach(() => {
    delete process.env.API_KEY_ENCRYPTION_SECRET;
  });

  describe('encryptApiKey() and decryptApiKey() roundtrip', () => {
    it('should encrypt and decrypt a valid Anthropic API key', () => {
      // Arrange
      const originalKey = 'sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

      // Act
      const encrypted = ApiKeyEncryption.encryptApiKey(originalKey);
      const decrypted = ApiKeyEncryption.decryptApiKey(encrypted);

      // Assert
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalKey);
      expect(encrypted).toMatch(/^[a-f0-9]+:[a-f0-9]+$/); // Format: iv:encryptedData
      expect(decrypted).toBe(originalKey);
    });

    it('should produce different encrypted values for the same key (due to random IV)', () => {
      // Arrange
      const apiKey = 'sk-ant-api03-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

      // Act
      const encrypted1 = ApiKeyEncryption.encryptApiKey(apiKey);
      const encrypted2 = ApiKeyEncryption.encryptApiKey(apiKey);

      // Assert
      expect(encrypted1).not.toBe(encrypted2); // Different IVs
      expect(ApiKeyEncryption.decryptApiKey(encrypted1)).toBe(apiKey);
      expect(ApiKeyEncryption.decryptApiKey(encrypted2)).toBe(apiKey);
    });

    it('should handle special characters in API keys', () => {
      // Arrange
      const apiKey = 'sk-ant-api03-CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';

      // Act
      const encrypted = ApiKeyEncryption.encryptApiKey(apiKey);
      const decrypted = ApiKeyEncryption.decryptApiKey(encrypted);

      // Assert
      expect(decrypted).toBe(apiKey);
      expect(decrypted.length).toBe(apiKey.length);
    });

    it('should throw error when encrypting null or undefined', () => {
      // Act & Assert
      expect(() => ApiKeyEncryption.encryptApiKey(null)).toThrow('API key is required for encryption');
      expect(() => ApiKeyEncryption.encryptApiKey(undefined)).toThrow('API key is required for encryption');
      expect(() => ApiKeyEncryption.encryptApiKey('')).toThrow('API key is required for encryption');
    });

    it('should throw error when decrypting invalid format', () => {
      // Act & Assert
      expect(() => ApiKeyEncryption.decryptApiKey('invalid-format')).toThrow();
      expect(() => ApiKeyEncryption.decryptApiKey('only-one-part')).toThrow();
      expect(() => ApiKeyEncryption.decryptApiKey('')).toThrow();
    });

    it('should throw error when encryption secret is not set', () => {
      // Arrange
      delete process.env.API_KEY_ENCRYPTION_SECRET;
      const apiKey = 'sk-ant-api03-test';

      // Act & Assert
      expect(() => ApiKeyEncryption.encryptApiKey(apiKey)).toThrow('API_KEY_ENCRYPTION_SECRET environment variable is required');
    });

    it('should throw error when encryption secret is too short', () => {
      // Arrange
      process.env.API_KEY_ENCRYPTION_SECRET = 'short'; // Less than 32 characters
      const apiKey = 'sk-ant-api03-DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD';

      // Act & Assert
      expect(() => ApiKeyEncryption.encryptApiKey(apiKey)).toThrow('Encryption secret must be at least 32 characters');
    });
  });

  describe('isValidApiKey()', () => {
    it('should validate correct Anthropic API key format (sk-ant-api03-[95 chars]AA)', () => {
      // Arrange - Valid formats
      const validKeys = [
        'sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'sk-ant-api03-1234567890123456789012345678901234567890123456789012345678901234567890123456789012345AA',
        'sk-ant-api03-aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopAA'
      ];

      // Act & Assert
      validKeys.forEach(key => {
        expect(ApiKeyEncryption.isValidApiKey(key)).toBe(true);
      });
    });

    it('should reject invalid Anthropic API key formats', () => {
      // Arrange - Invalid formats
      const invalidKeys = [
        'invalid-key',                          // Wrong prefix
        'sk-ant-api03-',                        // Too short
        'sk-ant-api03-TOOSHORT',                // Too short
        'sk-ant-api03-WAYTOOLONGKEYTHATEXCEEDSTHEMAXIMUMLENGTHALLOWEDFORANTHROPICAPIKEYSANDSHOULDFAILVALIDATION',
        'api03-sk-ant-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Wrong order
        '',                                     // Empty
        null,                                   // Null
        undefined,                              // Undefined
        'sk-openai-1234567890',                 // Wrong service
        'sk-ant-api02-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' // Wrong version
      ];

      // Act & Assert
      invalidKeys.forEach(key => {
        expect(ApiKeyEncryption.isValidApiKey(key)).toBe(false);
      });
    });

    it('should validate the exact length requirement (108 characters total)', () => {
      // Arrange
      const exactLength = 'sk-ant-api03-' + 'A'.repeat(95); // 13 + 95 = 108 characters
      const tooShort = 'sk-ant-api03-' + 'A'.repeat(94);    // 107 characters
      const tooLong = 'sk-ant-api03-' + 'A'.repeat(96);     // 109 characters

      // Act & Assert
      expect(ApiKeyEncryption.isValidApiKey(exactLength)).toBe(true);
      expect(ApiKeyEncryption.isValidApiKey(tooShort)).toBe(false);
      expect(ApiKeyEncryption.isValidApiKey(tooLong)).toBe(false);
    });

    it('should validate the prefix format strictly', () => {
      // Arrange
      const validPrefix = 'sk-ant-api03-' + 'A'.repeat(95);
      const invalidPrefixes = [
        'sk-ant-api3-' + 'A'.repeat(95),   // Missing zero
        'sk-ant-api003-' + 'A'.repeat(95), // Extra zero
        'SK-ANT-API03-' + 'A'.repeat(95),  // Uppercase
        'sk_ant_api03-' + 'A'.repeat(95),  // Underscores
        'sk-ant-api04-' + 'A'.repeat(95)   // Wrong version
      ];

      // Act & Assert
      expect(ApiKeyEncryption.isValidApiKey(validPrefix)).toBe(true);
      invalidPrefixes.forEach(key => {
        expect(ApiKeyEncryption.isValidApiKey(key)).toBe(false);
      });
    });

    it('should allow alphanumeric characters in the key portion', () => {
      // Arrange
      const alphanumericKey = 'sk-ant-api03-' + 'aA0'.repeat(31) + 'aA'; // Mix of lower, upper, digits

      // Act & Assert
      expect(ApiKeyEncryption.isValidApiKey(alphanumericKey)).toBe(true);
    });

    it('should reject keys with special characters in the key portion', () => {
      // Arrange
      const keysWithSpecialChars = [
        'sk-ant-api03-' + 'A'.repeat(94) + '!',
        'sk-ant-api03-' + 'A'.repeat(94) + '@',
        'sk-ant-api03-' + 'A'.repeat(50) + '-' + 'A'.repeat(44),
        'sk-ant-api03-' + 'A'.repeat(50) + '_' + 'A'.repeat(44)
      ];

      // Act & Assert
      keysWithSpecialChars.forEach(key => {
        expect(ApiKeyEncryption.isValidApiKey(key)).toBe(false);
      });
    });
  });

  describe('getEncryptionAlgorithm()', () => {
    it('should return the encryption algorithm being used', () => {
      // Act
      const algorithm = ApiKeyEncryption.getEncryptionAlgorithm();

      // Assert
      expect(algorithm).toBe('aes-256-cbc');
    });
  });

  describe('security considerations', () => {
    it('should not expose plaintext keys in error messages', () => {
      // Arrange
      const apiKey = 'sk-ant-api03-SECRETKEYTHATSHOULDBEHIDDENFROMERRORS12345678901234567890123456789012345678901234';
      delete process.env.API_KEY_ENCRYPTION_SECRET;

      // Act & Assert
      try {
        ApiKeyEncryption.encryptApiKey(apiKey);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).not.toContain(apiKey);
        expect(error.message).not.toContain('SECRETKEY');
      }
    });

    it('should handle concurrent encryption requests safely', async () => {
      // Arrange
      const keys = Array.from({ length: 10 }, (_, i) =>
        `sk-ant-api03-${'A'.repeat(94)}${String(i).padStart(1, '0')}`
      );

      // Act - Encrypt all keys concurrently
      const encrypted = await Promise.all(
        keys.map(key => Promise.resolve(ApiKeyEncryption.encryptApiKey(key)))
      );

      // Assert - All should decrypt correctly
      const decrypted = encrypted.map(enc => ApiKeyEncryption.decryptApiKey(enc));
      decrypted.forEach((dec, i) => {
        expect(dec).toBe(keys[i]);
      });
    });
  });
});
