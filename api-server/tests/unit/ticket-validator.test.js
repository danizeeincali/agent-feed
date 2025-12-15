/**
 * Unit tests for TicketValidator
 *
 * Tests all validation scenarios for comment and post tickets
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TicketValidator } from '../../avi/ticket-validator.js';

describe('TicketValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new TicketValidator();
  });

  describe('validateCommentTicket', () => {
    it('should validate a valid comment ticket', () => {
      const ticket = {
        content: 'This is a comment',
        metadata: {
          type: 'comment',
          parent_post_id: 'post-123'
        }
      };

      expect(() => validator.validateCommentTicket(ticket)).not.toThrow();
      expect(validator.validateCommentTicket(ticket)).toBe(true);
    });

    it('should throw error when ticket is null', () => {
      expect(() => validator.validateCommentTicket(null))
        .toThrow('Ticket object is required');
    });

    it('should throw error when ticket is undefined', () => {
      expect(() => validator.validateCommentTicket(undefined))
        .toThrow('Ticket object is required');
    });

    it('should throw error when content field is missing', () => {
      const ticket = {
        metadata: {
          parent_post_id: 'post-123'
        }
      };

      expect(() => validator.validateCommentTicket(ticket))
        .toThrow('Missing ticket.content field');
    });

    it('should throw error when content is not a string', () => {
      const ticket = {
        content: 12345,
        metadata: {
          parent_post_id: 'post-123'
        }
      };

      expect(() => validator.validateCommentTicket(ticket))
        .toThrow('ticket.content must be a string');
    });

    it('should throw error when content is empty string', () => {
      const ticket = {
        content: '   ',
        metadata: {
          parent_post_id: 'post-123'
        }
      };

      expect(() => validator.validateCommentTicket(ticket))
        .toThrow('ticket.content cannot be empty');
    });

    it('should throw error when parent_post_id is missing', () => {
      const ticket = {
        content: 'Valid content',
        metadata: {
          type: 'comment'
        }
      };

      expect(() => validator.validateCommentTicket(ticket))
        .toThrow('Missing metadata.parent_post_id for comment ticket');
    });

    it('should throw error when metadata is missing', () => {
      const ticket = {
        content: 'Valid content'
      };

      expect(() => validator.validateCommentTicket(ticket))
        .toThrow('Missing metadata.parent_post_id for comment ticket');
    });
  });

  describe('validatePostTicket', () => {
    it('should validate a valid post ticket', () => {
      const ticket = {
        content: 'This is a post',
        post_id: 'post-123'
      };

      expect(() => validator.validatePostTicket(ticket)).not.toThrow();
      expect(validator.validatePostTicket(ticket)).toBe(true);
    });

    it('should throw error when ticket is null', () => {
      expect(() => validator.validatePostTicket(null))
        .toThrow('Ticket object is required');
    });

    it('should throw error when content field is missing', () => {
      const ticket = {
        post_id: 'post-123'
      };

      expect(() => validator.validatePostTicket(ticket))
        .toThrow('Missing ticket.content field');
    });

    it('should throw error when content is not a string', () => {
      const ticket = {
        content: { text: 'invalid' },
        post_id: 'post-123'
      };

      expect(() => validator.validatePostTicket(ticket))
        .toThrow('ticket.content must be a string');
    });

    it('should throw error when content is empty string', () => {
      const ticket = {
        content: '',
        post_id: 'post-123'
      };

      expect(() => validator.validatePostTicket(ticket))
        .toThrow('ticket.content cannot be empty');
    });
  });

  describe('validateTicket (auto-detect)', () => {
    it('should validate comment ticket with type metadata', () => {
      const ticket = {
        content: 'Comment content',
        metadata: {
          type: 'comment',
          parent_post_id: 'post-123'
        }
      };

      expect(() => validator.validateTicket(ticket)).not.toThrow();
    });

    it('should validate post ticket without comment metadata', () => {
      const ticket = {
        content: 'Post content',
        metadata: {
          type: 'post'
        }
      };

      expect(() => validator.validateTicket(ticket)).not.toThrow();
    });

    it('should throw error for null ticket', () => {
      expect(() => validator.validateTicket(null))
        .toThrow('Ticket object is required');
    });
  });

  describe('validateMetadata', () => {
    it('should validate valid comment metadata', () => {
      const metadata = {
        type: 'comment',
        parent_post_id: 'post-123',
        parent_comment_id: 'comment-456'
      };

      const result = validator.validateMetadata(metadata);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when metadata is null', () => {
      const result = validator.validateMetadata(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Metadata is required');
    });

    it('should return error when type is missing', () => {
      const metadata = {
        parent_post_id: 'post-123'
      };

      const result = validator.validateMetadata(metadata);
      expect(result.errors).toContain('metadata.type is missing');
    });

    it('should return error when comment is missing parent_post_id', () => {
      const metadata = {
        type: 'comment'
      };

      const result = validator.validateMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('metadata.parent_post_id is required for comments');
    });

    it('should validate post metadata without parent references', () => {
      const metadata = {
        type: 'post'
      };

      const result = validator.validateMetadata(metadata);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle ticket with both content and post_content (content takes precedence)', () => {
      const ticket = {
        content: 'Correct content',
        post_content: 'Old field content',
        metadata: {
          parent_post_id: 'post-123'
        }
      };

      expect(() => validator.validateCommentTicket(ticket)).not.toThrow();
    });

    it('should handle unicode content', () => {
      const ticket = {
        content: '你好世界 🌍 مرحبا',
        metadata: {
          parent_post_id: 'post-123'
        }
      };

      expect(() => validator.validateCommentTicket(ticket)).not.toThrow();
    });

    it('should handle very long content', () => {
      const ticket = {
        content: 'a'.repeat(10000),
        metadata: {
          parent_post_id: 'post-123'
        }
      };

      expect(() => validator.validateCommentTicket(ticket)).not.toThrow();
    });

    it('should reject content with only whitespace', () => {
      const ticket = {
        content: '\n\t   \r\n',
        metadata: {
          parent_post_id: 'post-123'
        }
      };

      expect(() => validator.validateCommentTicket(ticket))
        .toThrow('ticket.content cannot be empty');
    });
  });
});
