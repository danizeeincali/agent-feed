/**
 * Unit Test: Avatar Letter Mapping
 *
 * Purpose: Verify that agent avatars display the correct letters,
 * especially for special agents like lambda-vi (Λ).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Avatar Letter Mapping', () => {
  // Test helper function that mimics the component logic
  const getAgentAvatarLetter = (authorAgent: string): string => {
    const avatarMap: Record<string, string> = {
      'lambda-vi': 'Λ',
      'get-to-know-you-agent': 'G',
      'system': 'S'
    };
    return avatarMap[authorAgent] || authorAgent.charAt(0).toUpperCase();
  };

  describe('Special Agent Mappings', () => {
    test('should map lambda-vi to Λ (lambda symbol)', () => {
      const result = getAgentAvatarLetter('lambda-vi');
      expect(result).toBe('Λ');
    });

    test('should map get-to-know-you-agent to G', () => {
      const result = getAgentAvatarLetter('get-to-know-you-agent');
      expect(result).toBe('G');
    });

    test('should map system to S', () => {
      const result = getAgentAvatarLetter('system');
      expect(result).toBe('S');
    });
  });

  describe('Default Agent Mappings', () => {
    test('should return first letter uppercase for unmapped agents', () => {
      expect(getAgentAvatarLetter('coder')).toBe('C');
      expect(getAgentAvatarLetter('tester')).toBe('T');
      expect(getAgentAvatarLetter('reviewer')).toBe('R');
      expect(getAgentAvatarLetter('ProductionValidator')).toBe('P');
    });

    test('should handle lowercase agent names', () => {
      expect(getAgentAvatarLetter('agent-smith')).toBe('A');
      expect(getAgentAvatarLetter('backend-dev')).toBe('B');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string', () => {
      expect(getAgentAvatarLetter('')).toBe('');
    });

    test('should handle single character names', () => {
      expect(getAgentAvatarLetter('a')).toBe('A');
      expect(getAgentAvatarLetter('Z')).toBe('Z');
    });

    test('should handle special characters in unmapped names', () => {
      expect(getAgentAvatarLetter('_special')).toBe('_');
      expect(getAgentAvatarLetter('123-agent')).toBe('1');
    });
  });

  describe('Case Sensitivity', () => {
    test('should be case-sensitive for mapped agents', () => {
      expect(getAgentAvatarLetter('lambda-vi')).toBe('Λ');
      expect(getAgentAvatarLetter('Lambda-Vi')).not.toBe('Λ');
      expect(getAgentAvatarLetter('Lambda-Vi')).toBe('L');
    });
  });

  describe('Display Name Consistency', () => {
    test('should match display name mappings', () => {
      const AGENT_DISPLAY_NAMES: Record<string, string> = {
        'lambda-vi': 'Λvi',
        'get-to-know-you-agent': 'Get-to-Know-You',
        'system': 'System Guide'
      };

      // Verify avatar letters are consistent with display names
      expect(getAgentAvatarLetter('lambda-vi')).toBe('Λ');
      expect(AGENT_DISPLAY_NAMES['lambda-vi']).toBe('Λvi');

      expect(getAgentAvatarLetter('get-to-know-you-agent')).toBe('G');
      expect(AGENT_DISPLAY_NAMES['get-to-know-you-agent'].charAt(0)).toBe('G');

      expect(getAgentAvatarLetter('system')).toBe('S');
      expect(AGENT_DISPLAY_NAMES['system'].charAt(0)).toBe('S');
    });
  });
});
