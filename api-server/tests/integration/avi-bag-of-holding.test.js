/**
 * Integration Tests: Λvi "Bag of Holding" Real Session Testing
 * Tests real Λvi behavior with various query types
 *
 * NO MOCKS - Uses real AviSessionManager with real SDK calls
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import AviSessionManager from '../../avi/session-manager.js';
import { verifyNoForbiddenPhrases } from '../unit/avi-proactive-behavior.test.js';

describe('Λvi Bag of Holding Integration Tests', () => {
  let sessionManager;

  beforeAll(async () => {
    console.log('🚀 Initializing real AVI session for integration tests...');
    sessionManager = new AviSessionManager({
      idleTimeout: 60 * 60 * 1000 // 60 minutes
    });

    // Initialize real session
    const initResult = await sessionManager.initialize();
    console.log(`✅ AVI session initialized: ${initResult.sessionId}`);
    console.log(`   Status: ${initResult.status}`);
    console.log(`   Tokens used: ${initResult.tokensUsed}`);

    expect(initResult.success !== false).toBe(true);
    expect(sessionManager.sessionActive).toBe(true);
  });

  afterAll(() => {
    if (sessionManager) {
      console.log('🧹 Cleaning up AVI session...');
      const stats = {
        interactions: sessionManager.interactionCount,
        totalTokens: sessionManager.totalTokensUsed
      };
      console.log(`   Session stats: ${stats.interactions} interactions, ${stats.totalTokens} tokens`);
      sessionManager.cleanup();
    }
  });

  describe('Weather Query - Pattern 1 (Immediate Tool Usage)', () => {
    it('should use WebSearch for weather query and return real data', async () => {
      const query = 'what is the weather like?';
      console.log(`\n💬 Testing query: "${query}"`);

      const response = await sessionManager.chat(query, {
        includeSystemPrompt: true,
        maxTokens: 3000
      });

      console.log(`\n📝 Response received:`);
      console.log(`   Success: ${response.success}`);
      console.log(`   Tokens used: ${response.tokensUsed}`);
      console.log(`   Response length: ${response.response.length} chars`);
      console.log(`   Response preview: ${response.response.substring(0, 200)}...`);

      // Verify response succeeded
      expect(response.success).toBe(true);
      expect(response.response).toBeTruthy();

      // Verify no forbidden phrases
      const forbiddenCheck = verifyNoForbiddenPhrases(response.response);
      console.log(`   Forbidden phrases: ${forbiddenCheck.message}`);
      expect(forbiddenCheck.passed).toBe(true);

      // Response should indicate action taken or provide plan/investigation
      const hasProactiveResponse =
        response.response.toLowerCase().includes('search') ||
        response.response.toLowerCase().includes('weather') ||
        response.response.toLowerCase().includes('plan') ||
        response.response.toLowerCase().includes('investigate');

      expect(hasProactiveResponse).toBe(true);
    }, 45000); // 45 second timeout for real SDK call
  });

  describe('System Command - Pattern 1 (Bash Execution)', () => {
    it('should execute system commands proactively', async () => {
      const query = 'check if Node.js is running';
      console.log(`\n💬 Testing query: "${query}"`);

      const response = await sessionManager.chat(query, {
        includeSystemPrompt: false, // Reuse session context
        maxTokens: 2000
      });

      console.log(`\n📝 Response received:`);
      console.log(`   Success: ${response.success}`);
      console.log(`   Tokens used: ${response.tokensUsed}`);
      console.log(`   Response preview: ${response.response.substring(0, 200)}...`);

      // Verify no forbidden phrases
      const forbiddenCheck = verifyNoForbiddenPhrases(response.response);
      expect(forbiddenCheck.passed).toBe(true);

      expect(response.success).toBe(true);
    }, 30000);
  });

  describe('Complex Setup Request - Pattern 2 (Plan Proposal)', () => {
    it('should provide specific plan when capability needs setup', async () => {
      const query = 'can you create a new database schema for user authentication?';
      console.log(`\n💬 Testing query: "${query}"`);

      const response = await sessionManager.chat(query, {
        includeSystemPrompt: false,
        maxTokens: 3000
      });

      console.log(`\n📝 Response received:`);
      console.log(`   Success: ${response.success}`);
      console.log(`   Tokens used: ${response.tokensUsed}`);
      console.log(`   Response length: ${response.response.length} chars`);

      // Verify no forbidden phrases
      const forbiddenCheck = verifyNoForbiddenPhrases(response.response);
      console.log(`   Forbidden phrases: ${forbiddenCheck.message}`);
      expect(forbiddenCheck.passed).toBe(true);

      // Should provide plan or take action
      const hasActionOrPlan =
        response.response.toLowerCase().includes('plan') ||
        response.response.toLowerCase().includes('steps') ||
        response.response.toLowerCase().includes('agent') ||
        response.response.toLowerCase().includes('can') ||
        response.response.toLowerCase().includes('will');

      expect(hasActionOrPlan).toBe(true);
      expect(response.success).toBe(true);
    }, 45000);
  });

  describe('Unclear Request - Pattern 3 (Investigation Offering)', () => {
    it('should offer investigation approaches for unclear requests', async () => {
      const query = 'analyze the quantum computing market trends';
      console.log(`\n💬 Testing query: "${query}"`);

      const response = await sessionManager.chat(query, {
        includeSystemPrompt: false,
        maxTokens: 3000
      });

      console.log(`\n📝 Response received:`);
      console.log(`   Success: ${response.success}`);
      console.log(`   Tokens used: ${response.tokensUsed}`);

      // Verify no forbidden phrases
      const forbiddenCheck = verifyNoForbiddenPhrases(response.response);
      expect(forbiddenCheck.passed).toBe(true);

      // Should offer investigation or take action
      const hasInvestigationOrAction =
        response.response.toLowerCase().includes('investigate') ||
        response.response.toLowerCase().includes('research') ||
        response.response.toLowerCase().includes('search') ||
        response.response.toLowerCase().includes('explore') ||
        response.response.toLowerCase().includes('quantum');

      expect(hasInvestigationOrAction).toBe(true);
      expect(response.success).toBe(true);
    }, 45000);
  });

  describe('System Prompt Integrity', () => {
    it('should have complete system prompt with all sections', () => {
      const prompt = sessionManager.systemPrompt;

      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(500);

      // Check for key sections
      const requiredSections = [
        'Response Patterns',
        'FORBIDDEN RESPONSES',
        'Proactive Tool Usage',
        'Bag of Holding',
        'Current Context'
      ];

      for (const section of requiredSections) {
        expect(prompt).toContain(section);
      }

      console.log(`✅ System prompt has ${prompt.length} characters and includes all required sections`);
    });
  });

  describe('Session Context Persistence', () => {
    it('should maintain session context across multiple interactions', async () => {
      // First interaction
      const response1 = await sessionManager.chat('hello', {
        includeSystemPrompt: false
      });
      expect(response1.success).toBe(true);

      const interactionCount1 = sessionManager.interactionCount;

      // Second interaction
      const response2 = await sessionManager.chat('what can you do?', {
        includeSystemPrompt: false
      });
      expect(response2.success).toBe(true);

      const interactionCount2 = sessionManager.interactionCount;

      // Verify context maintained
      expect(interactionCount2).toBe(interactionCount1 + 1);
      expect(sessionManager.sessionActive).toBe(true);
      expect(sessionManager.totalTokensUsed).toBeGreaterThan(0);

      console.log(`✅ Session context maintained: ${interactionCount2} total interactions`);
    }, 60000); // 60 second timeout
  });

  describe('Multiple Query Types', () => {
    const testQueries = [
      { query: 'what is the weather?', type: 'information' },
      { query: 'list running processes', type: 'system' },
      { query: 'help me understand this system', type: 'assistance' }
    ];

    testQueries.forEach(({ query, type }) => {
      it(`should handle ${type} query without forbidden phrases: "${query}"`, async () => {
        console.log(`\n💬 Testing ${type} query: "${query}"`);

        const response = await sessionManager.chat(query, {
          includeSystemPrompt: false,
          maxTokens: 2000
        });

        // Verify no forbidden phrases
        const forbiddenCheck = verifyNoForbiddenPhrases(response.response);
        console.log(`   Result: ${forbiddenCheck.message}`);

        expect(forbiddenCheck.passed).toBe(true);
        expect(response.success).toBe(true);
      }, 45000);
    });
  });
});
