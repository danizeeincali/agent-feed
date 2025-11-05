/**
 * TDD Unit Tests: Author Utils
 *
 * Tests the authorUtils module for agent ID detection and display name mapping.
 * These utilities determine whether an author is an agent or user and provide
 * the appropriate display name without making API calls for known agents.
 *
 * Test Coverage:
 * - isAgentId() function - 8 tests
 * - getAgentDisplayName() function - 10 tests
 * Total: 18 tests
 */

import { describe, it, expect } from 'vitest';
import { isAgentId, getAgentDisplayName } from '../../utils/authorUtils';

describe('authorUtils', () => {
  describe('isAgentId()', () => {
    it('should return true for avi agent', () => {
      expect(isAgentId('avi')).toBe(true);
    });

    it('should return true for lambda-vi agent', () => {
      expect(isAgentId('lambda-vi')).toBe(true);
    });

    it('should return true for get-to-know-you-agent', () => {
      expect(isAgentId('get-to-know-you-agent')).toBe(true);
    });

    it('should return true for system agent', () => {
      expect(isAgentId('system')).toBe(true);
    });

    it('should return true for personal-todos-agent', () => {
      expect(isAgentId('personal-todos-agent')).toBe(true);
    });

    it('should return true for agent-ideas-agent', () => {
      expect(isAgentId('agent-ideas-agent')).toBe(true);
    });

    it('should return true for link-logger-agent', () => {
      expect(isAgentId('link-logger-agent')).toBe(true);
    });

    it('should return false for user IDs', () => {
      expect(isAgentId('demo-user-123')).toBe(false);
      expect(isAgentId('user-456')).toBe(false);
      expect(isAgentId('user-abc-def')).toBe(false);
    });

    it('should return false for unknown strings', () => {
      expect(isAgentId('unknown-agent')).toBe(false);
      expect(isAgentId('random-id')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isAgentId('')).toBe(false);
    });

    it('should return false for partial agent name matches', () => {
      expect(isAgentId('avi-extra')).toBe(false);
      expect(isAgentId('lambda')).toBe(false);
      expect(isAgentId('get-to-know')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isAgentId('AVI')).toBe(false);
      expect(isAgentId('Lambda-VI')).toBe(false);
      expect(isAgentId('SYSTEM')).toBe(false);
    });
  });

  describe('getAgentDisplayName()', () => {
    it('should return Λvi for avi agent', () => {
      expect(getAgentDisplayName('avi')).toBe('Λvi');
    });

    it('should return Λvi for lambda-vi agent', () => {
      expect(getAgentDisplayName('lambda-vi')).toBe('Λvi');
    });

    it('should return Get-to-Know-You for get-to-know-you-agent', () => {
      expect(getAgentDisplayName('get-to-know-you-agent')).toBe('Get-to-Know-You');
    });

    it('should return System Guide for system agent', () => {
      expect(getAgentDisplayName('system')).toBe('System Guide');
    });

    it('should return Personal Todos for personal-todos-agent', () => {
      expect(getAgentDisplayName('personal-todos-agent')).toBe('Personal Todos');
    });

    it('should return Agent Ideas for agent-ideas-agent', () => {
      expect(getAgentDisplayName('agent-ideas-agent')).toBe('Agent Ideas');
    });

    it('should return Link Logger for link-logger-agent', () => {
      expect(getAgentDisplayName('link-logger-agent')).toBe('Link Logger');
    });

    it('should return raw ID for unmapped agents', () => {
      expect(getAgentDisplayName('unknown-agent')).toBe('unknown-agent');
      expect(getAgentDisplayName('new-agent')).toBe('new-agent');
    });

    it('should return raw ID for user IDs', () => {
      expect(getAgentDisplayName('demo-user-123')).toBe('demo-user-123');
      expect(getAgentDisplayName('user-456')).toBe('user-456');
    });

    it('should return empty string for empty input', () => {
      expect(getAgentDisplayName('')).toBe('');
    });

    it('should handle special characters in unmapped IDs', () => {
      expect(getAgentDisplayName('agent@123')).toBe('agent@123');
      expect(getAgentDisplayName('agent#special')).toBe('agent#special');
    });

    it('should be case-sensitive and return raw ID for wrong case', () => {
      expect(getAgentDisplayName('AVI')).toBe('AVI');
      expect(getAgentDisplayName('Lambda-VI')).toBe('Lambda-VI');
    });

    it('should not modify input for partial matches', () => {
      expect(getAgentDisplayName('avi-extended')).toBe('avi-extended');
      expect(getAgentDisplayName('system-admin')).toBe('system-admin');
    });
  });

  describe('Integration: isAgentId() and getAgentDisplayName()', () => {
    it('should work together for known agents', () => {
      const knownAgents = [
        'avi',
        'lambda-vi',
        'get-to-know-you-agent',
        'system',
        'personal-todos-agent',
        'agent-ideas-agent',
        'link-logger-agent'
      ];

      knownAgents.forEach(agentId => {
        expect(isAgentId(agentId)).toBe(true);
        expect(getAgentDisplayName(agentId)).not.toBe(agentId); // Should have display name
      });
    });

    it('should work together for unknown IDs', () => {
      const unknownIds = ['user-123', 'unknown-agent', 'random-id'];

      unknownIds.forEach(id => {
        expect(isAgentId(id)).toBe(false);
        // For unknown IDs, display name returns the raw ID
        expect(getAgentDisplayName(id)).toBe(id);
      });
    });

    it('should handle consistent behavior across both functions', () => {
      // If isAgentId returns true, getAgentDisplayName should return a mapped name
      const agentId = 'avi';
      if (isAgentId(agentId)) {
        const displayName = getAgentDisplayName(agentId);
        expect(displayName).toBe('Λvi');
        expect(displayName).not.toBe(agentId);
      }
    });
  });
});
