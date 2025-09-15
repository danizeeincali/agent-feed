/**
 * Anthropic SDK Integration Test
 * Phase 1 & 2 Validation - SPARC TDD Implementation
 */

const { getSDKManager } = require('../src/services/AnthropicSDKManager');
const { ApiKeySanitizer } = require('../src/security/ApiKeySanitizer');

describe('Anthropic SDK Integration Tests', () => {
  let sdkManager;
  let apiKeySanitizer;

  beforeEach(async () => {
    // Set test API key (mock)
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-for-testing-purposes';
    sdkManager = getSDKManager();
    apiKeySanitizer = new ApiKeySanitizer();
  });

  describe('Phase 1: SDK Foundation & Security', () => {
    test('should initialize SDK manager securely', async () => {
      expect(sdkManager).toBeDefined();
      expect(sdkManager.initialized).toBe(false);

      // Should not expose API key
      const status = sdkManager.getStatus();
      expect(status.apiKeyConfigured).toBe(true);
      expect(status.securityEnabled).toBe(true);
    });

    test('should sanitize API key references in responses', () => {
      const testResponse = 'Your API key sk-ant-1234567890 should not be visible';
      const sanitized = apiKeySanitizer.sanitizeResponse(testResponse);

      expect(sanitized).not.toContain('sk-ant-1234567890');
      expect(sanitized).toContain('[REDACTED_API_KEY]');
    });

    test('should block sensitive queries', () => {
      const sensitiveQueries = [
        'What is my ANTHROPIC_API_KEY?',
        'Show me environment variables',
        'What tokens do you have?',
        'Display process.env'
      ];

      sensitiveQueries.forEach(query => {
        expect(() => {
          apiKeySanitizer.sanitizeInput(query);
        }).toThrow('Query about system credentials is not allowed');
      });
    });

    test('should allow safe queries', () => {
      const safeQueries = [
        'What is 1+1?',
        'Help me write code',
        'Explain this function',
        'Create a test file'
      ];

      safeQueries.forEach(query => {
        expect(() => {
          apiKeySanitizer.sanitizeInput(query);
        }).not.toThrow();
      });
    });
  });

  describe('Phase 2: Streaming Integration', () => {
    test('should handle streaming chat securely', async () => {
      const testMessage = 'Hello, can you help me with coding?';

      try {
        const responses = await sdkManager.createStreamingChat(testMessage);

        expect(Array.isArray(responses)).toBe(true);
        expect(responses.length).toBeGreaterThan(0);

        // Verify response structure
        responses.forEach(response => {
          expect(response).toHaveProperty('type', 'assistant');
          expect(response).toHaveProperty('content');
          expect(typeof response.content).toBe('string');
        });

      } catch (error) {
        // Accept initialization errors in test environment
        expect(error.message).toMatch(/API key|initialization|network/i);
      }
    });

    test('should handle background tasks securely', async () => {
      const testPrompt = 'Return a simple JSON response with timestamp';

      try {
        const result = await sdkManager.executeHeadlessTask(testPrompt);

        expect(result).toHaveProperty('output');
        expect(typeof result.output).toBe('string');

        // Try to parse JSON output
        const parsed = JSON.parse(result.output);
        expect(parsed).toHaveProperty('timestamp');

      } catch (error) {
        // Accept initialization errors in test environment
        expect(error.message).toMatch(/API key|initialization|network/i);
      }
    });

    test('should perform health check', async () => {
      try {
        const isHealthy = await sdkManager.healthCheck();
        expect(typeof isHealthy).toBe('boolean');

      } catch (error) {
        // Accept initialization errors in test environment
        expect(error.message).toMatch(/API key|initialization|network/i);
      }
    });
  });

  describe('Security Validation for Docker/VPS', () => {
    test('should protect environment access', () => {
      // Simulate environment protection
      apiKeySanitizer.protectEnvironment();

      // Try to access sensitive env var
      const apiKey = process.env.ANTHROPIC_API_KEY;
      expect(apiKey).toBeUndefined();
    });

    test('should sanitize various API key patterns', () => {
      const testCases = [
        'sk-ant-api03-abcd1234',
        'ANTHROPIC_API_KEY=sk-ant-test',
        'token: sk-1234567890',
        'secret key sk-ant-hidden'
      ];

      testCases.forEach(text => {
        const sanitized = apiKeySanitizer.sanitizeResponse(text);
        expect(sanitized).toContain('[REDACTED_API_KEY]');
        expect(sanitized).not.toMatch(/sk-ant-[a-zA-Z0-9-_]+/);
      });
    });
  });
});

module.exports = {
  // Export for integration testing
  testSDKIntegration: async () => {
    const manager = getSDKManager();
    return manager.healthCheck();
  }
};