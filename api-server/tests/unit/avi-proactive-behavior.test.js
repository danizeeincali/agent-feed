/**
 * Unit Tests: Λvi Proactive "Bag of Holding" Behavior
 * Tests the 3-pattern response system and forbidden phrase detection
 *
 * NO MOCKS - All tests use real AviSessionManager
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import AviSessionManager from '../../avi/session-manager.js';

describe('Λvi Proactive Behavior - 3-Pattern Response System', () => {
  let sessionManager;

  beforeAll(async () => {
    sessionManager = new AviSessionManager({
      idleTimeout: 10 * 60 * 1000 // 10 minutes for tests
    });

    // Initialize session once for all tests
    await sessionManager.initialize();
  });

  afterAll(() => {
    if (sessionManager) {
      sessionManager.cleanup();
    }
  });

  describe('System Prompt Validation', () => {
    it('should include all 3 response patterns in system prompt', () => {
      const prompt = sessionManager.systemPrompt;

      // Verify Pattern 1
      expect(prompt).toContain('Pattern 1: "I can, here is what I did"');
      expect(prompt).toContain('Execute without hesitation');

      // Verify Pattern 2
      expect(prompt).toContain('Pattern 2: "I can\'t right now, but here\'s a plan"');
      expect(prompt).toContain('Provide SPECIFIC plan');

      // Verify Pattern 3
      expect(prompt).toContain('Pattern 3: "I cannot right now, let\'s investigate"');
      expect(prompt).toContain('Propose 2-3 specific investigation approaches');
    });

    it('should explicitly list forbidden responses', () => {
      const prompt = sessionManager.systemPrompt;

      expect(prompt).toContain('FORBIDDEN RESPONSES');
      expect(prompt).toContain('"I don\'t have access to..."');
      expect(prompt).toContain('"I cannot help with..."');
      expect(prompt).toContain('"I\'m unable to..."');
      expect(prompt).toContain('ALWAYS offer solutions, plans, or investigations');
    });

    it('should include proactive tool usage philosophy', () => {
      const prompt = sessionManager.systemPrompt;

      expect(prompt).toContain('Proactive Tool Usage Philosophy');
      expect(prompt).toContain('WebSearch');
      expect(prompt).toContain('WebFetch');
      expect(prompt).toContain('Bash');
      expect(prompt).toContain('GOLDEN RULE');
    });

    it('should include "Bag of Holding" philosophy with pop culture references', () => {
      const prompt = sessionManager.systemPrompt;

      expect(prompt).toContain('Bag of Holding');
      expect(prompt).toContain('Toodles');
      expect(prompt).toContain('Dora\'s Backpack');
      expect(prompt).toContain('Mary Poppins\' Carpetbag');
      expect(prompt).toContain('Hermione\'s Beaded Bag');
      expect(prompt).toContain('Link\'s Inventory');
      expect(prompt).toContain('Everything is possible');
    });

    it('should include tool-to-pattern decision flow', () => {
      const prompt = sessionManager.systemPrompt;

      expect(prompt).toContain('Try Tool → Show Results (Pattern 1)');
      expect(prompt).toContain('Propose Setup Plan (Pattern 2)');
      expect(prompt).toContain('Offer Investigation (Pattern 3)');
    });
  });

  describe('Forbidden Phrase Detection', () => {
    const forbiddenPhrases = [
      "I don't have access",
      "I cannot help",
      "I'm unable to",
      "I don't have the ability",
      "That's outside my capabilities",
      "I don't have permission"
    ];

    it('should detect forbidden phrases in sample responses', () => {
      const badResponse = "I don't have access to weather information.";

      const hasForbidden = forbiddenPhrases.some(phrase =>
        badResponse.toLowerCase().includes(phrase.toLowerCase())
      );

      expect(hasForbidden).toBe(true);
    });

    it('should verify good responses do not contain forbidden phrases', () => {
      const goodResponse1 = "I can check the weather! Let me search for that...";
      const goodResponse2 = "I can't access weather APIs yet, but here's how we can set it up...";
      const goodResponse3 = "Let's investigate weather API options together...";

      for (const response of [goodResponse1, goodResponse2, goodResponse3]) {
        const hasForbidden = forbiddenPhrases.some(phrase =>
          response.toLowerCase().includes(phrase.toLowerCase())
        );
        expect(hasForbidden).toBe(false);
      }
    });
  });

  describe('Pattern Recognition Logic', () => {
    function detectPattern(response) {
      const text = response.toLowerCase();

      // Pattern 2: Plan provided (check first - most specific)
      const pattern2Keywords = ['can\'t right now', 'here\'s a plan', 'here is how', 'we can set it up', 'but here\'s'];
      const hasPattern2 = pattern2Keywords.some(kw => text.includes(kw));

      // Pattern 3: Investigation offered (check second)
      const pattern3Keywords = ['let\'s investigate', 'let\'s explore', 'let\'s find out', 'what would you like'];
      const hasPattern3 = pattern3Keywords.some(kw => text.includes(kw));

      // Pattern 1: Action taken with tools (check last - most general)
      const pattern1Keywords = ['i can', 'here is what i did', 'let me', 'i will', 'i\'ll'];
      const hasPattern1 = pattern1Keywords.some(kw => text.includes(kw));

      // Check in order of specificity
      if (hasPattern2) return 2;
      if (hasPattern3) return 3;
      if (hasPattern1) return 1;
      return 0; // No pattern detected
    }

    it('should detect Pattern 1 (immediate action)', () => {
      const response = "I can check the weather! Let me search for that...";
      expect(detectPattern(response)).toBe(1);
    });

    it('should detect Pattern 2 (plan provided)', () => {
      const response = "I can't access weather APIs directly yet, but here's how we can set it up: 1) Create weather-agent...";
      expect(detectPattern(response)).toBe(2);
    });

    it('should detect Pattern 3 (investigation offered)', () => {
      const response = "Let's investigate weather API options together. I can: 1) Search for APIs, 2) Check documentation...";
      expect(detectPattern(response)).toBe(3);
    });
  });

  describe('Tool Usage Instructions', () => {
    it('should provide specific examples for WebSearch', () => {
      const prompt = sessionManager.systemPrompt;

      expect(prompt).toMatch(/WebSearch.*current weather/i);
      expect(prompt).toContain('For ANY information query');
    });

    it('should provide specific examples for WebFetch', () => {
      const prompt = sessionManager.systemPrompt;

      expect(prompt).toContain('WebFetch');
      expect(prompt).toMatch(/fetch specific URLs/i);
    });

    it('should provide specific examples for Bash', () => {
      const prompt = sessionManager.systemPrompt;

      expect(prompt).toContain('Bash');
      expect(prompt).toMatch(/systemctl status|ps aux/);
    });

    it('should emphasize proactive tool usage', () => {
      const prompt = sessionManager.systemPrompt;

      expect(prompt).toContain('USE THEM PROACTIVELY');
      expect(prompt).toContain('ALWAYS attempt to use tools before saying you cannot');
    });
  });

  describe('Response Quality Standards', () => {
    it('should require responses to offer alternatives when capability is limited', () => {
      const prompt = sessionManager.systemPrompt;

      expect(prompt).toContain('ALWAYS offer solutions, plans, or investigations');
      expect(prompt).toContain('Your job is to find a way forward');
      expect(prompt).toContain('There is ALWAYS a path forward');
    });

    it('should discourage limitation-focused responses', () => {
      const prompt = sessionManager.systemPrompt;

      expect(prompt).toContain('Don\'t answer with limitations');
      expect(prompt).toContain('Answer with capabilities and next steps');
    });

    it('should encourage collaborative problem-solving', () => {
      const prompt = sessionManager.systemPrompt;

      expect(prompt).toContain('Collaborative problem-solving');
      expect(prompt).toContain('Let\'s find out together');
    });
  });

  describe('Philosophy Enforcement', () => {
    it('should establish "everything is possible" mindset', () => {
      const prompt = sessionManager.systemPrompt;

      expect(prompt).toContain('Everything is possible');
      expect(prompt).toContain('proactive orchestrator and problem solver');
      expect(prompt).toContain('make things happen or figure out how to make them happen');
    });

    it('should map capabilities to patterns', () => {
      const prompt = sessionManager.systemPrompt;

      expect(prompt).toContain('If tool exists → Use it immediately (Pattern 1)');
      expect(prompt).toContain('If capability can be built → Plan and propose it (Pattern 2)');
      expect(prompt).toContain('If solution is unclear → Investigate and discover it (Pattern 3)');
    });
  });
});

/**
 * Helper function to verify no forbidden phrases in response
 */
export function verifyNoForbiddenPhrases(response) {
  const forbiddenPhrases = [
    "I don't have access",
    "I cannot help",
    "I'm unable to",
    "I don't have the ability",
    "That's outside my capabilities",
    "I don't have permission"
  ];

  const violations = [];
  const lowerResponse = response.toLowerCase();

  for (const phrase of forbiddenPhrases) {
    if (lowerResponse.includes(phrase.toLowerCase())) {
      violations.push(phrase);
    }
  }

  return {
    passed: violations.length === 0,
    violations: violations,
    message: violations.length > 0
      ? `Found ${violations.length} forbidden phrase(s): ${violations.join(', ')}`
      : 'No forbidden phrases detected'
  };
}
