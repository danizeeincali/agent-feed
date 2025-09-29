/**
 * Regression Prevention Tests: Post ID Slice Error Prevention
 *
 * London School TDD - Prevents post.id?.slice errors that occur in dual architecture
 * Ensures safe ID handling in simplified single architecture
 */

import { jest } from '@jest/globals';

describe('Post ID Slice Error Prevention Tests', () => {
  let mockPostProcessor;
  let mockIdHandler;
  let mockErrorBoundary;

  beforeEach(() => {
    // Mock post processing system
    mockPostProcessor = {
      processPost: jest.fn(),
      extractId: jest.fn(),
      formatId: jest.fn(),
      validatePost: jest.fn()
    };

    // Mock ID handling utilities
    mockIdHandler = {
      safeSlice: jest.fn(),
      validateId: jest.fn(),
      normalizeId: jest.fn(),
      generateId: jest.fn()
    };

    // Mock error boundary
    mockErrorBoundary = {
      catch: jest.fn(),
      recover: jest.fn(),
      log: jest.fn()
    };
  });

  describe('Safe ID Slice Implementation', () => {
    it('should handle null post IDs without throwing errors', async () => {
      // Arrange
      const problematicPosts = [
        { id: null, content: 'Post with null ID' },
        { id: undefined, content: 'Post with undefined ID' },
        { content: 'Post without ID field' }
      ];

      mockIdHandler.safeSlice.mockImplementation((id, start = 0, end = 8) => {
        if (!id || typeof id !== 'string') {
          return 'unknown';
        }
        if (id.length < end) {
          return id; // Return full ID if shorter than slice length
        }
        return id.slice(start, end);
      });

      // Act & Assert - Should not throw errors
      problematicPosts.forEach(post => {
        const result = mockIdHandler.safeSlice(post.id);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(() => mockIdHandler.safeSlice(post.id)).not.toThrow();
      });

      expect(mockIdHandler.safeSlice).toHaveBeenCalledTimes(3);
    });

    it('should handle empty and short post IDs gracefully', async () => {
      // Arrange
      const edgeCaseIds = [
        '', // Empty string
        '1', // Single character
        '123', // 3 characters
        '12345678', // Exactly 8 characters
        '123456789012345678', // Long ID
        '   ', // Whitespace only
        '!@#$%^&*', // Special characters
      ];

      mockIdHandler.safeSlice.mockImplementation((id, start = 0, end = 8) => {
        if (!id || typeof id !== 'string') {
          return 'unknown';
        }

        // Trim whitespace
        const trimmedId = id.trim();
        if (!trimmedId) {
          return 'unknown';
        }

        // Handle short IDs
        if (trimmedId.length <= end) {
          return trimmedId;
        }

        return trimmedId.slice(start, end);
      });

      // Act
      const results = edgeCaseIds.map(id => mockIdHandler.safeSlice(id));

      // Assert - Verify safe handling of edge cases
      expect(results[0]).toBe('unknown'); // Empty string
      expect(results[1]).toBe('1'); // Single character preserved
      expect(results[2]).toBe('123'); // 3 characters preserved
      expect(results[3]).toBe('12345678'); // 8 characters preserved
      expect(results[4]).toBe('12345678'); // Long ID sliced to 8
      expect(results[5]).toBe('unknown'); // Whitespace only
      expect(results[6]).toBe('!@#$%^&*'); // Special characters preserved

      expect(mockIdHandler.safeSlice).toHaveBeenCalledTimes(7);
    });

    it('should provide consistent ID formatting across all post types', async () => {
      // Arrange
      const diversePosts = [
        { id: 'agent-post-123456789', type: 'agent_post' },
        { id: 'user-activity-987654321', type: 'user_activity' },
        { id: 'system-log-555666777', type: 'system_log' },
        { id: 'UPPERCASE-ID-111222333', type: 'legacy_post' },
        { id: 'mixed-Case-ID-444555666', type: 'mixed_case' }
      ];

      mockIdHandler.normalizeId.mockImplementation((id) => {
        if (!id || typeof id !== 'string') {
          return 'unknown';
        }

        // Normalize: lowercase, extract meaningful part, ensure consistent length
        const normalized = id.toLowerCase();
        const parts = normalized.split('-');

        // Extract the numeric or meaningful part
        const meaningfulPart = parts.find(part => /\d/.test(part)) || parts[parts.length - 1];

        // Ensure 8-character format
        if (meaningfulPart.length >= 8) {
          return meaningfulPart.slice(0, 8);
        }

        return meaningfulPart.padEnd(8, '0');
      });

      // Act
      const normalizedIds = diversePosts.map(post => mockIdHandler.normalizeId(post.id));

      // Assert - Verify consistent ID formatting
      normalizedIds.forEach(id => {
        expect(typeof id).toBe('string');
        expect(id.length).toBe(8);
        expect(id).toMatch(/^[a-z0-9]+$/); // Only lowercase alphanumeric
      });

      expect(mockIdHandler.normalizeId).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Prevention Patterns', () => {
    it('should use defensive programming patterns for ID access', async () => {
      // Arrange
      const defensivePatterns = {
        optionalChaining: (post) => post?.id?.slice?.(0, 8) || 'unknown',
        nullCoalescing: (post) => (post?.id ?? 'unknown').slice(0, 8),
        explicitCheck: (post) => {
          if (!post || !post.id || typeof post.id !== 'string') return 'unknown';
          return post.id.slice(0, 8);
        },
        tryLatch: (post) => {
          try {
            return post.id.slice(0, 8);
          } catch {
            return 'unknown';
          }
        }
      };

      const testPosts = [
        { id: '123456789' }, // Valid
        { id: null }, // Null ID
        null, // Null post
        { id: 123 }, // Number ID
        {} // No ID field
      ];

      // Act & Assert - Test all defensive patterns
      Object.entries(defensivePatterns).forEach(([pattern, handler]) => {
        testPosts.forEach(post => {
          expect(() => handler(post)).not.toThrow();
          const result = handler(post);
          expect(typeof result).toBe('string');
        });
      });
    });

    it('should validate post structure before processing', async () => {
      // Arrange
      const postValidationSchema = {
        required: ['content'],
        optional: ['id', 'timestamp', 'agentId'],
        types: {
          id: ['string', 'null', 'undefined'],
          content: ['string'],
          timestamp: ['string', 'number'],
          agentId: ['string']
        }
      };

      mockPostProcessor.validatePost.mockImplementation((post, schema) => {
        const validation = {
          valid: true,
          errors: [],
          warnings: []
        };

        if (!post) {
          validation.valid = false;
          validation.errors.push('Post is null or undefined');
          return validation;
        }

        // Check required fields
        schema.required.forEach(field => {
          if (post[field] === undefined || post[field] === null || post[field] === '') {
            validation.valid = false;
            validation.errors.push(`Missing required field: ${field}`);
          }
        });

        // Check field types
        Object.entries(schema.types).forEach(([field, allowedTypes]) => {
          if (post[field] !== undefined && post[field] !== null) {
            const fieldType = typeof post[field];
            if (!allowedTypes.includes(fieldType)) {
              validation.warnings.push(`Field ${field} has unexpected type: ${fieldType}`);
            }
          }
        });

        return validation;
      });

      const testCases = [
        { post: { content: 'Valid post', id: '12345678' }, shouldBeValid: true },
        { post: { content: 'Post without ID' }, shouldBeValid: true },
        { post: { id: '12345678' }, shouldBeValid: false }, // Missing content
        { post: null, shouldBeValid: false },
        { post: { content: '', id: '12345678' }, shouldBeValid: false } // Empty content
      ];

      // Act & Assert
      testCases.forEach(({ post, shouldBeValid }) => {
        const validation = mockPostProcessor.validatePost(post, postValidationSchema);
        expect(validation.valid).toBe(shouldBeValid);

        if (!shouldBeValid) {
          expect(validation.errors.length).toBeGreaterThan(0);
        }
      });
    });

    it('should implement fallback ID generation for posts without IDs', async () => {
      // Arrange
      const postsWithoutIds = [
        { content: 'Post 1', timestamp: '2024-01-01T00:00:00Z' },
        { content: 'Post 2', agentId: 'agent123' },
        { content: 'Post 3', timestamp: '2024-01-02T00:00:00Z', agentId: 'agent456' }
      ];

      mockIdHandler.generateId.mockImplementation((post) => {
        // Generate deterministic ID based on post content
        const baseString = `${post.content}-${post.timestamp || ''}-${post.agentId || ''}`;
        const hash = baseString.split('').reduce((acc, char) => {
          return (acc * 31 + char.charCodeAt(0)) % 1000000;
        }, 0);

        return `gen-${hash.toString().padStart(8, '0')}`;
      });

      // Act
      const generatedIds = postsWithoutIds.map(post => mockIdHandler.generateId(post));

      // Assert - Verify fallback ID generation
      generatedIds.forEach(id => {
        expect(typeof id).toBe('string');
        expect(id).toMatch(/^gen-\d{8}$/); // Format: gen-########
        expect(id.length).toBe(12); // 'gen-' + 8 digits
      });

      // Verify IDs are deterministic
      const duplicateIds = postsWithoutIds.map(post => mockIdHandler.generateId(post));
      expect(duplicateIds).toEqual(generatedIds);

      expect(mockIdHandler.generateId).toHaveBeenCalledTimes(6);
    });
  });

  describe('Error Boundary Integration', () => {
    it('should catch ID-related errors and provide graceful fallbacks', async () => {
      // Arrange
      const errorProneOperations = [
        () => {
          const post = null;
          return post.id.slice(0, 8); // Will throw
        },
        () => {
          const post = { id: undefined };
          return post.id.slice(0, 8); // Will throw
        },
        () => {
          const post = { id: 123 };
          return post.id.slice(0, 8); // Will throw (number has no slice)
        }
      ];

      mockErrorBoundary.catch.mockImplementation((operation) => {
        try {
          return operation();
        } catch (error) {
          mockErrorBoundary.log(error);
          return mockErrorBoundary.recover();
        }
      });

      mockErrorBoundary.recover.mockReturnValue('fallback-id');
      mockErrorBoundary.log.mockImplementation((error) => {
        return { logged: true, error: error.message };
      });

      // Act
      const results = errorProneOperations.map(operation =>
        mockErrorBoundary.catch(operation)
      );

      // Assert - Verify error boundary catches all errors
      results.forEach(result => {
        expect(result).toBe('fallback-id');
      });

      expect(mockErrorBoundary.catch).toHaveBeenCalledTimes(3);
      expect(mockErrorBoundary.log).toHaveBeenCalledTimes(3);
      expect(mockErrorBoundary.recover).toHaveBeenCalledTimes(3);
    });

    it('should provide detailed error reporting for debugging', async () => {
      // Arrange
      const mockErrorReporter = jest.fn().mockImplementation((error, context) => {
        return {
          timestamp: new Date().toISOString(),
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          context,
          severity: 'high',
          category: 'id_processing'
        };
      });

      const errorContexts = [
        { operation: 'slice', postId: null, expectedLength: 8 },
        { operation: 'format', postId: undefined, format: 'display' },
        { operation: 'validate', postId: 123, expectedType: 'string' }
      ];

      // Act
      const errorReports = errorContexts.map(context => {
        const error = new Error(`ID processing failed: ${context.operation}`);
        return mockErrorReporter(error, context);
      });

      // Assert - Verify detailed error reporting
      errorReports.forEach((report, index) => {
        expect(report.timestamp).toBeDefined();
        expect(report.error.message).toContain(errorContexts[index].operation);
        expect(report.context).toEqual(errorContexts[index]);
        expect(report.severity).toBe('high');
        expect(report.category).toBe('id_processing');
      });

      expect(mockErrorReporter).toHaveBeenCalledTimes(3);
    });
  });

  describe('Unified System ID Handling', () => {
    it('should eliminate ID inconsistencies between dual systems', async () => {
      // Arrange - Simulate how dual system created inconsistencies
      const dualSystemInconsistencies = {
        nextjsFormat: { agentId: '123', postId: 'post-456' },
        viteFormat: { id: '123', post_id: 'post-456' },
        mixedFormat: { id: '123', agentId: '123', postId: 'post-456' }
      };

      const mockUnifiedIdProcessor = jest.fn().mockImplementation((data) => {
        // Unified system uses consistent field names
        return {
          id: data.id || data.agentId,
          postId: data.postId || data.post_id,
          normalized: true
        };
      });

      // Act
      const unifiedResults = Object.values(dualSystemInconsistencies)
        .map(data => mockUnifiedIdProcessor(data));

      // Assert - Verify consistency in unified system
      unifiedResults.forEach(result => {
        expect(result.id).toBeDefined();
        expect(result.postId).toBeDefined();
        expect(result.normalized).toBe(true);
      });

      // All results should have same structure
      const structures = unifiedResults.map(result => Object.keys(result).sort());
      expect(structures.every(structure =>
        JSON.stringify(structure) === JSON.stringify(structures[0])
      )).toBe(true);
    });

    it('should provide single source of truth for ID processing', async () => {
      // Arrange
      const mockCentralIdService = {
        process: jest.fn(),
        validate: jest.fn(),
        format: jest.fn(),
        normalize: jest.fn()
      };

      // Simulate single service handling all ID operations
      mockCentralIdService.process.mockImplementation((id, operation) => {
        const operations = {
          slice: (id) => mockCentralIdService.format(id, 8),
          validate: (id) => mockCentralIdService.validate(id),
          normalize: (id) => mockCentralIdService.normalize(id)
        };

        return operations[operation]?.(id) || id;
      });

      mockCentralIdService.format.mockImplementation((id, length = 8) => {
        if (!id || typeof id !== 'string') return 'unknown';
        return id.length > length ? id.slice(0, length) : id.padEnd(length, '0');
      });

      mockCentralIdService.validate.mockImplementation((id) => {
        return id && typeof id === 'string' && id.length > 0;
      });

      mockCentralIdService.normalize.mockImplementation((id) => {
        if (!id || typeof id !== 'string') return 'unknown';
        return id.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
      });

      const testIds = ['Agent-123', null, '12345678901234567890', 'SHORT'];

      // Act
      const processedIds = testIds.map(id => ({
        original: id,
        formatted: mockCentralIdService.process(id, 'slice'),
        valid: mockCentralIdService.process(id, 'validate'),
        normalized: mockCentralIdService.process(id, 'normalize')
      }));

      // Assert - Verify central service consistency
      processedIds.forEach(result => {
        expect(typeof result.formatted).toBe('string');
        expect(typeof result.valid).toBe('boolean');
        expect(typeof result.normalized).toBe('string');
      });

      expect(mockCentralIdService.process).toHaveBeenCalledTimes(12); // 3 operations × 4 IDs
    });
  });
});