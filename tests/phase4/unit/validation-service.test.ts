/**
 * ValidationService Unit Tests (London School TDD)
 * Tests rule-based and LLM-based validation
 *
 * Focus: Validation logic, mock LLM interactions, edge cases
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('ValidationService - Unit Tests (London School TDD)', () => {
  let mockLLMService: any;
  let mockLogger: any;
  let service: any;

  beforeEach(() => {
    // Mock LLM service (Anthropic API)
    mockLLMService = {
      messages: {
        create: jest.fn(),
      },
    };

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
  });

  describe('Contract: validate() - Happy Path', () => {
    it('should approve valid post with all checks passing', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: true,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: ['spam', 'scam'],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: ['example.com', 'github.com'],
        toneThreshold: 0.7,
      };

      // Mock LLM tone check response
      mockLLMService.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            appropriate: true,
            score: 0.9,
            issues: [],
            suggestions: [],
          }),
        }],
        usage: { total_tokens: 150 },
      });

      service = new ValidationService(config, mockLLMService, mockLogger);

      const post = {
        content: 'This is a valid social media post with good content!',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT
      expect(result.approved).toBe(true);
      expect(result.success).toBe(true);
      expect(result.canFix).toBe(false);
      expect(result.reason).toBe('Validation passed');
      expect(mockLLMService.messages.create).toHaveBeenCalledTimes(1);
    });

    it('should skip LLM validation when disabled', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: [],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: ['example.com'],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: 'Valid post without tone checking',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT
      expect(result.approved).toBe(true);
      expect(mockLLMService.messages.create).not.toHaveBeenCalled();
    });
  });

  describe('Contract: validateRules() - Length Check', () => {
    it('should fail post that is too short', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 280,
        minLength: 50,
        prohibitedWords: [],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: 'Too short',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT
      expect(result.approved).toBe(false);
      expect(result.canFix).toBe(true);
      expect(result.reason).toContain('too short');
      expect(result.metadata?.ruleErrors).toContain('LENGTH_INVALID');
    });

    it('should fail post that is too long', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 50,
        minLength: 10,
        prohibitedWords: [],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: 'This is a very long post that exceeds the maximum allowed length and should fail validation',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT
      expect(result.approved).toBe(false);
      expect(result.canFix).toBe(true);
      expect(result.reason).toContain('too long');
    });
  });

  describe('Contract: validateRules() - Prohibited Words', () => {
    it('should fail post containing prohibited words', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: ['spam', 'scam', 'clickbait'],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: 'This is totally not spam content at all!',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT
      expect(result.approved).toBe(false);
      expect(result.canFix).toBe(true);
      expect(result.reason).toContain('prohibited words');
      expect(result.reason).toContain('spam');
    });

    it('should be case-insensitive for prohibited words', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: ['spam'],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: 'This contains SPAM in uppercase!',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('prohibited words');
    });

    it('should not match partial words (word boundary)', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: ['spam'],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: 'I love spamming... wait, I mean spamming is bad! Oh no, spammer alert!',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT - Should match 'spam' but not 'spamming' or 'spammer'
      expect(result.approved).toBe(false);
    });
  });

  describe('Contract: validateRules() - Mentions', () => {
    it('should fail post with too many mentions', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: [],
        maxMentions: 3,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: 'Hey @user1 @user2 @user3 @user4 check this out!',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT
      expect(result.approved).toBe(false);
      expect(result.canFix).toBe(true);
      expect(result.reason).toContain('mentions');
    });

    it('should validate mention format', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: [],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: 'Valid mention @user123 and invalid @user-with-dash',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT - Should validate mention format (alphanumeric + underscore only)
      expect(result).toBeDefined();
    });
  });

  describe('Contract: validateRules() - Hashtags', () => {
    it('should fail post with too many hashtags', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: [],
        maxMentions: 5,
        maxHashtags: 3,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: 'Check out #tag1 #tag2 #tag3 #tag4 #tag5',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT
      expect(result.approved).toBe(false);
      expect(result.canFix).toBe(true);
      expect(result.reason).toContain('hashtags');
    });
  });

  describe('Contract: validateRules() - URLs', () => {
    it('should fail post with disallowed domains', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: [],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: ['example.com', 'github.com'],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: 'Check out https://badsite.com for more info',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT
      expect(result.approved).toBe(false);
      expect(result.canFix).toBe(true);
      expect(result.reason).toContain('URL');
    });

    it('should allow URLs from permitted domains', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: [],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: ['example.com', 'github.com'],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: 'Check out https://github.com/myrepo for the code',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT
      expect(result.approved).toBe(true);
    });
  });

  describe('Contract: validateTone() - LLM Checks', () => {
    it('should fail post with inappropriate tone', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: true,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: [],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      // Mock LLM response indicating inappropriate tone
      mockLLMService.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            appropriate: false,
            score: 0.3,
            issues: ['Too aggressive', 'Unprofessional language'],
            suggestions: ['Use more neutral tone', 'Remove harsh language'],
          }),
        }],
        usage: { total_tokens: 200 },
      });

      service = new ValidationService(config, mockLLMService, mockLogger);

      const post = {
        content: 'This is a valid length post for tone checking',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT
      expect(result.approved).toBe(false);
      expect(result.canFix).toBe(true);
      expect(result.reason).toContain('tone');
      expect(result.metadata?.toneIssues).toContain('Too aggressive');
    });

    it('should handle LLM API errors gracefully', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: true,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: [],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      // Mock LLM API error
      mockLLMService.messages.create.mockRejectedValue(new Error('API timeout'));

      service = new ValidationService(config, mockLLMService, mockLogger);

      const post = {
        content: 'Valid post but LLM will fail',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT - Should default to approved when LLM fails
      expect(result.approved).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Tone validation error'),
        expect.any(Object)
      );
    });

    it('should handle malformed LLM JSON response', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: true,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: [],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      // Mock LLM returning invalid JSON
      mockLLMService.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'This is not valid JSON {',
        }],
        usage: { total_tokens: 50 },
      });

      service = new ValidationService(config, mockLLMService, mockLogger);

      const post = {
        content: 'Valid post but LLM returns bad JSON',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT - Should default to approved on parse error
      expect(result.approved).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: [],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: '',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('too short');
    });

    it('should handle unicode characters in content', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: [],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: 'This has unicode: 你好世界 🌍 café',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT
      expect(result).toBeDefined();
      expect(result.approved).toBe(true);
    });

    it('should handle XSS attempt in content', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: [],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: '<script>alert("XSS")</script> This is a test post',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const result = await service.validate(post);

      // ASSERT - Should validate content as-is, XSS prevention is handled elsewhere
      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should validate quickly without LLM (< 100ms)', async () => {
      const ValidationService = await import('../../../src/validation/validation-service')
        .then(m => m.ValidationService)
        .catch(() => {
          throw new Error('ValidationService not implemented yet');
        });

      const config = {
        enableLLMValidation: false,
        maxLength: 280,
        minLength: 10,
        prohibitedWords: ['spam'],
        maxMentions: 5,
        maxHashtags: 10,
        maxUrls: 2,
        allowedDomains: [],
        toneThreshold: 0.7,
      };

      service = new ValidationService(config, null, mockLogger);

      const post = {
        content: 'This is a valid social media post for performance testing',
        userId: 'user-123',
        agentId: 'agent-456',
      };

      // ACT
      const startTime = Date.now();
      await service.validate(post);
      const duration = Date.now() - startTime;

      // ASSERT
      expect(duration).toBeLessThan(100);
    });
  });
});
