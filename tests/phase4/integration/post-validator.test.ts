/**
 * PostValidator Integration Tests (London School TDD)
 * Tests complete validation → retry → escalation flow
 *
 * Focus: Component orchestration, state transitions, error flows
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('PostValidator - Integration Tests (London School TDD)', () => {
  let mockValidationService: any;
  let mockRetryService: any;
  let mockEscalationService: any;
  let mockAviDatabase: any;
  let mockHealthMonitor: any;
  let mockLogger: any;
  let validator: any;

  beforeEach(() => {
    // Mock ValidationService
    mockValidationService = {
      validate: jest.fn(),
      validateRules: jest.fn(),
      validateTone: jest.fn(),
    };

    // Mock RetryService
    mockRetryService = {
      retry: jest.fn(),
      canRetry: jest.fn(),
      getRetryStrategy: jest.fn(),
      getRetryDelay: jest.fn(),
    };

    // Mock EscalationService
    mockEscalationService = {
      escalate: jest.fn(),
      createSystemPost: jest.fn(),
      logError: jest.fn(),
      notifyUser: jest.fn(),
    };

    // Mock AviDatabase
    mockAviDatabase = {
      createPost: jest.fn(),
      updateTicket: jest.fn(),
      logValidationAttempt: jest.fn(),
    };

    // Mock HealthMonitor
    mockHealthMonitor = {
      recordSuccess: jest.fn(),
      recordFailure: jest.fn(),
      recordMetric: jest.fn(),
    };

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
  });

  describe('Flow: Successful Validation', () => {
    it('should approve valid post and save to database', async () => {
      const PostValidator = await import('../../../src/validation/post-validator')
        .then(m => m.PostValidator)
        .catch(() => {
          throw new Error('PostValidator not implemented yet');
        });

      // Mock successful validation
      mockValidationService.validate.mockResolvedValue({
        success: true,
        approved: true,
        canFix: false,
        reason: 'Validation passed',
        feedback: '',
        retrying: false,
        escalated: false,
        metadata: {
          validationAttempts: 1,
          timestamp: new Date(),
        },
      });

      mockAviDatabase.createPost.mockResolvedValue('post-123');
      mockAviDatabase.updateTicket.mockResolvedValue(undefined);

      validator = new PostValidator(
        mockValidationService,
        mockRetryService,
        mockEscalationService,
        mockAviDatabase,
        mockHealthMonitor,
        mockLogger
      );

      const post = {
        content: 'This is a valid social media post!',
        userId: 'user-456',
        agentId: 'agent-789',
        metadata: {
          prompt: 'Write a post',
          attemptNumber: 1,
        },
      };

      const workTicket = {
        id: 'ticket-123',
        userId: 'user-456',
        agentId: 'agent-789',
        prompt: 'Write a post',
        status: 'processing',
        retryCount: 0,
      };

      // ACT
      const result = await validator.validateAndProcess(post, workTicket);

      // ASSERT
      expect(result.success).toBe(true);
      expect(result.approved).toBe(true);
      expect(mockAviDatabase.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          agentId: 'agent-789',
          content: post.content,
        })
      );
      expect(mockAviDatabase.updateTicket).toHaveBeenCalledWith(
        'ticket-123',
        expect.objectContaining({
          status: 'completed',
        })
      );
      expect(mockHealthMonitor.recordSuccess).toHaveBeenCalledWith('validation');
    });
  });

  describe('Flow: Validation Failure → Retry', () => {
    it('should retry fixable validation errors', async () => {
      const PostValidator = await import('../../../src/validation/post-validator')
        .then(m => m.PostValidator)
        .catch(() => {
          throw new Error('PostValidator not implemented yet');
        });

      // Mock validation failure
      mockValidationService.validate.mockResolvedValue({
        success: false,
        approved: false,
        canFix: true,
        reason: 'Post too long: 350 characters (max: 280)',
        feedback: 'Shorten by 70 characters',
        retrying: false,
        escalated: false,
        metadata: {
          ruleErrors: ['LENGTH_INVALID'],
          validationAttempts: 1,
        },
      });

      mockRetryService.canRetry.mockReturnValue(true);
      mockRetryService.getRetryStrategy.mockReturnValue('retry_same');
      mockRetryService.retry.mockResolvedValue({
        success: true,
        strategy: 'retry_same',
        delay: 5,
        scheduledAt: new Date(),
      });

      mockAviDatabase.logValidationAttempt.mockResolvedValue(undefined);

      validator = new PostValidator(
        mockValidationService,
        mockRetryService,
        mockEscalationService,
        mockAviDatabase,
        mockHealthMonitor,
        mockLogger
      );

      const post = {
        content: 'This is a very long post that exceeds the maximum character limit and needs to be shortened',
        userId: 'user-456',
        agentId: 'agent-789',
      };

      const workTicket = {
        id: 'ticket-123',
        userId: 'user-456',
        agentId: 'agent-789',
        retryCount: 0,
      };

      // ACT
      const result = await validator.validateAndProcess(post, workTicket);

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.retrying).toBe(true);
      expect(result.retryStrategy).toBe('retry_same');
      expect(result.retryDelay).toBe(5);
      expect(mockRetryService.retry).toHaveBeenCalledWith(
        workTicket,
        'Shorten by 70 characters'
      );
      expect(mockAviDatabase.logValidationAttempt).toHaveBeenCalled();
      expect(mockHealthMonitor.recordFailure).toHaveBeenCalledWith('validation');
    });

    it('should retry with different strategies on subsequent failures', async () => {
      const PostValidator = await import('../../../src/validation/post-validator')
        .then(m => m.PostValidator)
        .catch(() => {
          throw new Error('PostValidator not implemented yet');
        });

      // Mock validation failure
      mockValidationService.validate.mockResolvedValue({
        success: false,
        approved: false,
        canFix: true,
        reason: 'Too many hashtags',
        feedback: 'Reduce hashtag count',
        retrying: false,
        escalated: false,
      });

      mockRetryService.canRetry.mockReturnValue(true);
      mockRetryService.getRetryStrategy.mockReturnValue('simplify_post');
      mockRetryService.retry.mockResolvedValue({
        success: true,
        strategy: 'simplify_post',
        delay: 30,
        scheduledAt: new Date(),
        simplifiedPrompt: 'Simplified prompt',
      });

      validator = new PostValidator(
        mockValidationService,
        mockRetryService,
        mockEscalationService,
        mockAviDatabase,
        mockHealthMonitor,
        mockLogger
      );

      const post = {
        content: 'Post with #too #many #hashtags #everywhere #spam',
        userId: 'user-456',
        agentId: 'agent-789',
      };

      const workTicket = {
        id: 'ticket-123',
        userId: 'user-456',
        agentId: 'agent-789',
        retryCount: 1, // Second attempt
      };

      // ACT
      const result = await validator.validateAndProcess(post, workTicket);

      // ASSERT
      expect(result.retrying).toBe(true);
      expect(result.retryStrategy).toBe('simplify_post');
      expect(mockRetryService.getRetryStrategy).toHaveBeenCalledWith(workTicket);
    });
  });

  describe('Flow: Max Retries → Escalation', () => {
    it('should escalate after max retries exhausted', async () => {
      const PostValidator = await import('../../../src/validation/post-validator')
        .then(m => m.PostValidator)
        .catch(() => {
          throw new Error('PostValidator not implemented yet');
        });

      // Mock validation failure
      mockValidationService.validate.mockResolvedValue({
        success: false,
        approved: false,
        canFix: true,
        reason: 'Validation failed',
        feedback: 'Cannot fix',
        retrying: false,
        escalated: false,
      });

      mockRetryService.canRetry.mockReturnValue(false); // Max retries reached

      mockEscalationService.escalate.mockResolvedValue({
        escalated: true,
        systemPostCreated: true,
        errorLogged: true,
        userNotified: true,
        notifications: [],
        timestamp: new Date(),
      });

      mockAviDatabase.updateTicket.mockResolvedValue(undefined);

      validator = new PostValidator(
        mockValidationService,
        mockRetryService,
        mockEscalationService,
        mockAviDatabase,
        mockHealthMonitor,
        mockLogger
      );

      const post = {
        content: 'Invalid post after all retries',
        userId: 'user-456',
        agentId: 'agent-789',
      };

      const workTicket = {
        id: 'ticket-123',
        userId: 'user-456',
        agentId: 'agent-789',
        retryCount: 3, // Max retries
      };

      // ACT
      const result = await validator.validateAndProcess(post, workTicket);

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.escalated).toBe(true);
      expect(mockEscalationService.escalate).toHaveBeenCalledWith(
        workTicket,
        'Validation failed'
      );
      expect(mockAviDatabase.updateTicket).toHaveBeenCalledWith(
        'ticket-123',
        expect.objectContaining({
          status: 'failed',
        })
      );
    });

    it('should escalate immediately for critical errors', async () => {
      const PostValidator = await import('../../../src/validation/post-validator')
        .then(m => m.PostValidator)
        .catch(() => {
          throw new Error('PostValidator not implemented yet');
        });

      // Mock critical validation failure
      mockValidationService.validate.mockResolvedValue({
        success: false,
        approved: false,
        canFix: false, // Cannot fix
        reason: 'Critical content violation',
        feedback: 'Content cannot be posted',
        retrying: false,
        escalated: false,
      });

      mockEscalationService.escalate.mockResolvedValue({
        escalated: true,
        systemPostCreated: true,
        errorLogged: true,
        userNotified: true,
        notifications: [],
        timestamp: new Date(),
      });

      validator = new PostValidator(
        mockValidationService,
        mockRetryService,
        mockEscalationService,
        mockAviDatabase,
        mockHealthMonitor,
        mockLogger
      );

      const post = {
        content: 'Critical violation content',
        userId: 'user-456',
        agentId: 'agent-789',
      };

      const workTicket = {
        id: 'ticket-123',
        userId: 'user-456',
        agentId: 'agent-789',
        retryCount: 0,
      };

      // ACT
      const result = await validator.validateAndProcess(post, workTicket);

      // ASSERT
      expect(result.escalated).toBe(true);
      expect(mockRetryService.retry).not.toHaveBeenCalled();
      expect(mockEscalationService.escalate).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation service errors', async () => {
      const PostValidator = await import('../../../src/validation/post-validator')
        .then(m => m.PostValidator)
        .catch(() => {
          throw new Error('PostValidator not implemented yet');
        });

      mockValidationService.validate.mockRejectedValue(
        new Error('Validation service unavailable')
      );

      mockEscalationService.escalate.mockResolvedValue({
        escalated: true,
        systemPostCreated: false,
        errorLogged: true,
        userNotified: false,
        notifications: [],
        timestamp: new Date(),
      });

      validator = new PostValidator(
        mockValidationService,
        mockRetryService,
        mockEscalationService,
        mockAviDatabase,
        mockHealthMonitor,
        mockLogger
      );

      const post = {
        content: 'Test post',
        userId: 'user-456',
        agentId: 'agent-789',
      };

      const workTicket = {
        id: 'ticket-123',
        userId: 'user-456',
        agentId: 'agent-789',
        retryCount: 0,
      };

      // ACT
      const result = await validator.validateAndProcess(post, workTicket);

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.escalated).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Validation error'),
        expect.any(Object)
      );
    });

    it('should handle database save errors', async () => {
      const PostValidator = await import('../../../src/validation/post-validator')
        .then(m => m.PostValidator)
        .catch(() => {
          throw new Error('PostValidator not implemented yet');
        });

      mockValidationService.validate.mockResolvedValue({
        success: true,
        approved: true,
        canFix: false,
        reason: 'Validation passed',
        feedback: '',
        retrying: false,
        escalated: false,
      });

      mockAviDatabase.createPost.mockRejectedValue(new Error('Database write failed'));

      validator = new PostValidator(
        mockValidationService,
        mockRetryService,
        mockEscalationService,
        mockAviDatabase,
        mockHealthMonitor,
        mockLogger
      );

      const post = {
        content: 'Valid post',
        userId: 'user-456',
        agentId: 'agent-789',
      };

      const workTicket = {
        id: 'ticket-123',
        userId: 'user-456',
        agentId: 'agent-789',
        retryCount: 0,
      };

      // ACT & ASSERT
      await expect(validator.validateAndProcess(post, workTicket)).rejects.toThrow(
        'Database write failed'
      );
    });

    it('should handle retry service errors', async () => {
      const PostValidator = await import('../../../src/validation/post-validator')
        .then(m => m.PostValidator)
        .catch(() => {
          throw new Error('PostValidator not implemented yet');
        });

      mockValidationService.validate.mockResolvedValue({
        success: false,
        approved: false,
        canFix: true,
        reason: 'Fixable error',
        feedback: 'Fix this',
        retrying: false,
        escalated: false,
      });

      mockRetryService.canRetry.mockReturnValue(true);
      mockRetryService.retry.mockRejectedValue(new Error('Retry service error'));

      validator = new PostValidator(
        mockValidationService,
        mockRetryService,
        mockEscalationService,
        mockAviDatabase,
        mockHealthMonitor,
        mockLogger
      );

      const post = {
        content: 'Test post',
        userId: 'user-456',
        agentId: 'agent-789',
      };

      const workTicket = {
        id: 'ticket-123',
        userId: 'user-456',
        agentId: 'agent-789',
        retryCount: 0,
      };

      // ACT & ASSERT - Should handle gracefully
      await expect(validator.validateAndProcess(post, workTicket)).rejects.toThrow();
    });
  });

  describe('State Transitions', () => {
    it('should transition ticket from processing → completed on success', async () => {
      const PostValidator = await import('../../../src/validation/post-validator')
        .then(m => m.PostValidator)
        .catch(() => {
          throw new Error('PostValidator not implemented yet');
        });

      mockValidationService.validate.mockResolvedValue({
        success: true,
        approved: true,
        canFix: false,
        reason: 'Validation passed',
        feedback: '',
        retrying: false,
        escalated: false,
      });

      mockAviDatabase.createPost.mockResolvedValue('post-123');
      mockAviDatabase.updateTicket.mockResolvedValue(undefined);

      validator = new PostValidator(
        mockValidationService,
        mockRetryService,
        mockEscalationService,
        mockAviDatabase,
        mockHealthMonitor,
        mockLogger
      );

      const post = {
        content: 'Valid post',
        userId: 'user-456',
        agentId: 'agent-789',
      };

      const workTicket = {
        id: 'ticket-123',
        status: 'processing',
        retryCount: 0,
      };

      // ACT
      await validator.validateAndProcess(post, workTicket);

      // ASSERT
      expect(mockAviDatabase.updateTicket).toHaveBeenCalledWith(
        'ticket-123',
        expect.objectContaining({
          status: 'completed',
        })
      );
    });

    it('should transition ticket to pending on retry', async () => {
      const PostValidator = await import('../../../src/validation/post-validator')
        .then(m => m.PostValidator)
        .catch(() => {
          throw new Error('PostValidator not implemented yet');
        });

      mockValidationService.validate.mockResolvedValue({
        success: false,
        approved: false,
        canFix: true,
        reason: 'Fixable',
        feedback: 'Fix it',
        retrying: false,
        escalated: false,
      });

      mockRetryService.canRetry.mockReturnValue(true);
      mockRetryService.retry.mockResolvedValue({
        success: true,
        strategy: 'retry_same',
        delay: 5,
        scheduledAt: new Date(),
      });

      validator = new PostValidator(
        mockValidationService,
        mockRetryService,
        mockEscalationService,
        mockAviDatabase,
        mockHealthMonitor,
        mockLogger
      );

      const post = {
        content: 'Test post',
        userId: 'user-456',
        agentId: 'agent-789',
      };

      const workTicket = {
        id: 'ticket-123',
        status: 'processing',
        retryCount: 0,
      };

      // ACT
      const result = await validator.validateAndProcess(post, workTicket);

      // ASSERT
      expect(result.retrying).toBe(true);
      // Note: Ticket status updated by RetryService
    });

    it('should transition ticket to failed on escalation', async () => {
      const PostValidator = await import('../../../src/validation/post-validator')
        .then(m => m.PostValidator)
        .catch(() => {
          throw new Error('PostValidator not implemented yet');
        });

      mockValidationService.validate.mockResolvedValue({
        success: false,
        approved: false,
        canFix: false,
        reason: 'Cannot fix',
        feedback: '',
        retrying: false,
        escalated: false,
      });

      mockEscalationService.escalate.mockResolvedValue({
        escalated: true,
        systemPostCreated: true,
        errorLogged: true,
        userNotified: true,
        notifications: [],
        timestamp: new Date(),
      });

      mockAviDatabase.updateTicket.mockResolvedValue(undefined);

      validator = new PostValidator(
        mockValidationService,
        mockRetryService,
        mockEscalationService,
        mockAviDatabase,
        mockHealthMonitor,
        mockLogger
      );

      const post = {
        content: 'Invalid post',
        userId: 'user-456',
        agentId: 'agent-789',
      };

      const workTicket = {
        id: 'ticket-123',
        status: 'processing',
        retryCount: 3,
      };

      // ACT
      await validator.validateAndProcess(post, workTicket);

      // ASSERT
      expect(mockAviDatabase.updateTicket).toHaveBeenCalledWith(
        'ticket-123',
        expect.objectContaining({
          status: 'failed',
        })
      );
    });
  });

  describe('Metrics and Logging', () => {
    it('should record success metrics', async () => {
      const PostValidator = await import('../../../src/validation/post-validator')
        .then(m => m.PostValidator)
        .catch(() => {
          throw new Error('PostValidator not implemented yet');
        });

      mockValidationService.validate.mockResolvedValue({
        success: true,
        approved: true,
        canFix: false,
        reason: 'Validation passed',
        feedback: '',
        retrying: false,
        escalated: false,
      });

      mockAviDatabase.createPost.mockResolvedValue('post-123');
      mockAviDatabase.updateTicket.mockResolvedValue(undefined);

      validator = new PostValidator(
        mockValidationService,
        mockRetryService,
        mockEscalationService,
        mockAviDatabase,
        mockHealthMonitor,
        mockLogger
      );

      const post = {
        content: 'Valid post',
        userId: 'user-456',
        agentId: 'agent-789',
      };

      const workTicket = {
        id: 'ticket-123',
        retryCount: 0,
      };

      // ACT
      await validator.validateAndProcess(post, workTicket);

      // ASSERT
      expect(mockHealthMonitor.recordSuccess).toHaveBeenCalledWith('validation');
      expect(mockHealthMonitor.recordMetric).toHaveBeenCalledWith(
        'validation_attempts',
        expect.objectContaining({
          approved: true,
          canFix: false,
          retrying: false,
          escalated: false,
        })
      );
    });

    it('should log validation attempts', async () => {
      const PostValidator = await import('../../../src/validation/post-validator')
        .then(m => m.PostValidator)
        .catch(() => {
          throw new Error('PostValidator not implemented yet');
        });

      mockValidationService.validate.mockResolvedValue({
        success: false,
        approved: false,
        canFix: true,
        reason: 'Fix needed',
        feedback: 'Fix this',
        retrying: false,
        escalated: false,
      });

      mockRetryService.canRetry.mockReturnValue(true);
      mockRetryService.retry.mockResolvedValue({
        success: true,
        strategy: 'retry_same',
        delay: 5,
        scheduledAt: new Date(),
      });

      mockAviDatabase.logValidationAttempt.mockResolvedValue(undefined);

      validator = new PostValidator(
        mockValidationService,
        mockRetryService,
        mockEscalationService,
        mockAviDatabase,
        mockHealthMonitor,
        mockLogger
      );

      const post = {
        content: 'Test post',
        userId: 'user-456',
        agentId: 'agent-789',
      };

      const workTicket = {
        id: 'ticket-123',
        retryCount: 1,
      };

      // ACT
      await validator.validateAndProcess(post, workTicket);

      // ASSERT
      expect(mockAviDatabase.logValidationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 'ticket-123',
          attemptNumber: 2,
          approved: false,
          canFix: true,
          reason: 'Fix needed',
          feedback: 'Fix this',
        })
      );
    });
  });
});
