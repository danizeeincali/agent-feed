import { describe, it, expect } from 'vitest';

/**
 * Unit Tests for getAgentAvatarLetter function
 *
 * Testing Strategy (London School TDD):
 * - Test edge cases first (null, undefined, empty)
 * - Test special mappings
 * - Test default behavior
 * - Test type safety
 */

// Extracted function for testing (in real implementation this is inside RealSocialMediaFeed)
const getAgentAvatarLetter = (authorAgent: string): string => {
  const avatarMap: Record<string, string> = {
    'lambda-vi': 'Λ',
    'get-to-know-you-agent': 'G',
    'anonymous': 'Λ',
    'system': 'Λ'
  };

  // Handle undefined, null, or empty string
  if (!authorAgent || typeof authorAgent !== 'string' || authorAgent.trim() === '') {
    return '?';
  }

  return avatarMap[authorAgent] || authorAgent.charAt(0).toUpperCase();
};

describe('getAgentAvatarLetter', () => {
  describe('Edge Cases - Null Safety', () => {
    it('should return "?" for undefined input', () => {
      const result = getAgentAvatarLetter(undefined as any);
      expect(result).toBe('?');
    });

    it('should return "?" for null input', () => {
      const result = getAgentAvatarLetter(null as any);
      expect(result).toBe('?');
    });

    it('should return "?" for empty string', () => {
      const result = getAgentAvatarLetter('');
      expect(result).toBe('?');
    });

    it('should return "?" for whitespace-only string', () => {
      const result = getAgentAvatarLetter('   ');
      expect(result).toBe('?');
    });

    it('should return "?" for non-string input (number)', () => {
      const result = getAgentAvatarLetter(123 as any);
      expect(result).toBe('?');
    });

    it('should return "?" for non-string input (object)', () => {
      const result = getAgentAvatarLetter({} as any);
      expect(result).toBe('?');
    });

    it('should return "?" for non-string input (array)', () => {
      const result = getAgentAvatarLetter([] as any);
      expect(result).toBe('?');
    });
  });

  describe('Special Agent Mappings', () => {
    it('should return "Λ" for lambda-vi agent', () => {
      const result = getAgentAvatarLetter('lambda-vi');
      expect(result).toBe('Λ');
    });

    it('should return "G" for get-to-know-you-agent', () => {
      const result = getAgentAvatarLetter('get-to-know-you-agent');
      expect(result).toBe('G');
    });

    it('should return "Λ" for anonymous agent', () => {
      const result = getAgentAvatarLetter('anonymous');
      expect(result).toBe('Λ');
    });

    it('should return "Λ" for system agent', () => {
      const result = getAgentAvatarLetter('system');
      expect(result).toBe('Λ');
    });
  });

  describe('Default Behavior - First Letter Uppercase', () => {
    it('should return first letter uppercase for regular agent name', () => {
      const result = getAgentAvatarLetter('john-doe');
      expect(result).toBe('J');
    });

    it('should return first letter uppercase for single word agent', () => {
      const result = getAgentAvatarLetter('alice');
      expect(result).toBe('A');
    });

    it('should return uppercase even if agent name starts with lowercase', () => {
      const result = getAgentAvatarLetter('bob-agent');
      expect(result).toBe('B');
    });

    it('should handle agent names starting with uppercase', () => {
      const result = getAgentAvatarLetter('Charlie');
      expect(result).toBe('C');
    });

    it('should handle single character agent names', () => {
      const result = getAgentAvatarLetter('x');
      expect(result).toBe('X');
    });
  });

  describe('Boundary Cases', () => {
    it('should handle agent names with numbers', () => {
      const result = getAgentAvatarLetter('agent123');
      expect(result).toBe('A');
    });

    it('should handle agent names with special characters at start', () => {
      const result = getAgentAvatarLetter('-agent');
      expect(result).toBe('-');
    });

    it('should handle very long agent names', () => {
      const longName = 'a'.repeat(1000);
      const result = getAgentAvatarLetter(longName);
      expect(result).toBe('A');
    });

    it('should handle agent names with unicode characters', () => {
      const result = getAgentAvatarLetter('über-agent');
      expect(result).toBe('Ü');
    });
  });

  describe('Consistency Tests', () => {
    it('should return same result for same input (idempotency)', () => {
      const agent = 'test-agent';
      const result1 = getAgentAvatarLetter(agent);
      const result2 = getAgentAvatarLetter(agent);
      expect(result1).toBe(result2);
    });

    it('should be case-sensitive for agent mappings', () => {
      const result1 = getAgentAvatarLetter('lambda-vi');
      const result2 = getAgentAvatarLetter('Lambda-Vi');
      expect(result1).toBe('Λ');
      expect(result2).toBe('L'); // Not in map, uses first letter
    });
  });
});
