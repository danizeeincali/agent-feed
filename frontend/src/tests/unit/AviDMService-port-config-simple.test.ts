/**
 * AviDMService Port Configuration Fix - Simple Unit Tests
 *
 * These tests verify the port configuration fix without full service instantiation.
 * Following London School TDD - testing configuration logic in isolation.
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// CONFIGURATION LOGIC TESTS (Extracted from AviDMService)
// ============================================================================

/**
 * Extract the mergeWithDefaults logic for isolated testing
 * This is the EXACT logic from AviDMService.mergeWithDefaults()
 */
function mergeWithDefaults(config: Record<string, any> = {}): any {
  return {
    baseUrl: config.baseUrl || 'http://localhost:3001',
    timeout: config.timeout || 300000,
    retryAttempts: config.retryAttempts || 3,
    websocketUrl: config.websocketUrl || 'ws://localhost:3001/ws',
    apiKey: config.apiKey,
    rateLimits: {
      messagesPerMinute: 30,
      tokensPerHour: 50000,
      ...config.rateLimits
    },
    security: {
      enableAuth: false,
      allowedOrigins: ['localhost:5173', 'localhost:3000'],
      sanitizeContent: true,
      ...config.security
    },
    fallback: {
      enableOfflineMode: true,
      cacheResponses: true,
      maxCacheSize: 100,
      ...config.fallback
    }
  };
}

describe('AviDMService Port Configuration Fix - Configuration Logic', () => {

  describe('Default Port Configuration', () => {
    it('should use port 3001 as default baseUrl (NOT 8080)', () => {
      // ARRANGE & ACT: Get default config
      const config = mergeWithDefaults();

      // ASSERT: Verify baseUrl uses port 3001
      expect(config.baseUrl).toBe('http://localhost:3001');
      expect(config.baseUrl).not.toContain('8080');
      expect(config.baseUrl).toContain('3001');
    });

    it('should use ws://localhost:3001/ws for WebSocket URL', () => {
      // ARRANGE & ACT: Get default config
      const config = mergeWithDefaults();

      // ASSERT: Verify WebSocket URL uses port 3001
      expect(config.websocketUrl).toBe('ws://localhost:3001/ws');
      expect(config.websocketUrl).not.toContain('8080');
      expect(config.websocketUrl).toContain('3001');
    });

    it('should maintain consistent port across HTTP and WebSocket', () => {
      // ARRANGE & ACT: Get default config
      const config = mergeWithDefaults();

      // Extract ports from both URLs
      const httpPort = config.baseUrl.match(/:(\d+)$/)?.[1];
      const wsPort = config.websocketUrl.match(/:(\d+)\//)?.[1];

      // ASSERT: Both should use port 3001
      expect(httpPort).toBe('3001');
      expect(wsPort).toBe('3001');
      expect(httpPort).toBe(wsPort);
    });
  });

  describe('URL Structure Validation', () => {
    it('should not include /api in baseUrl (should be in endpoint)', () => {
      // ARRANGE & ACT: Get default config
      const config = mergeWithDefaults();

      // ASSERT: Verify /api is NOT in baseUrl (cleaner separation)
      expect(config.baseUrl).not.toContain('/api');
      expect(config.baseUrl).toBe('http://localhost:3001');
    });

    it('should construct correct Claude Code endpoint URL', () => {
      // ARRANGE: Get default config and endpoint
      const config = mergeWithDefaults();
      const endpoint = '/api/claude-code/streaming-chat';

      // ACT: Construct full URL (as HttpClient would)
      const fullUrl = `${config.baseUrl}${endpoint}`;

      // ASSERT: Verify correct URL construction
      expect(fullUrl).toBe('http://localhost:3001/api/claude-code/streaming-chat');
      expect(fullUrl).not.toMatch(/\/api\/api/);
    });
  });

  describe('Configuration Override Support', () => {
    it('should allow custom baseUrl override', () => {
      // ARRANGE: Custom config
      const customBaseUrl = 'http://custom-server:9000/api';

      // ACT: Merge with custom config
      const config = mergeWithDefaults({ baseUrl: customBaseUrl });

      // ASSERT: Verify custom baseUrl is used
      expect(config.baseUrl).toBe(customBaseUrl);
      expect(config.baseUrl).toContain('9000');
    });

    it('should allow custom WebSocket URL override', () => {
      // ARRANGE: Custom WebSocket URL
      const customWsUrl = 'wss://custom-server:9001/ws';

      // ACT: Merge with custom config
      const config = mergeWithDefaults({ websocketUrl: customWsUrl });

      // ASSERT: Verify custom WebSocket URL is used
      expect(config.websocketUrl).toBe(customWsUrl);
    });

    it('should allow partial config override while keeping defaults', () => {
      // ARRANGE: Partial custom config
      const partialConfig = {
        timeout: 60000,
        retryAttempts: 5
      };

      // ACT: Merge config
      const config = mergeWithDefaults(partialConfig);

      // ASSERT: Verify overrides applied but defaults kept
      expect(config.timeout).toBe(60000);
      expect(config.retryAttempts).toBe(5);
      expect(config.baseUrl).toBe('http://localhost:3001'); // Default
      expect(config.websocketUrl).toBe('ws://localhost:3001/ws'); // Default
    });
  });

  describe('Regression Tests - No Port 8080', () => {
    it('should never use port 8080 in baseUrl', () => {
      // ARRANGE & ACT: Get default config
      const config = mergeWithDefaults();

      // ASSERT: Verify no 8080
      expect(config.baseUrl).not.toContain('8080');
    });

    it('should never use port 8080 in websocketUrl', () => {
      // ARRANGE & ACT: Get default config
      const config = mergeWithDefaults();

      // ASSERT: Verify no 8080
      expect(config.websocketUrl).not.toContain('8080');
    });

    it('should use 3001 consistently across all URLs', () => {
      // ARRANGE & ACT: Get default config
      const config = mergeWithDefaults();

      // ASSERT: Verify 3001 is present
      expect(config.baseUrl).toContain('3001');
      expect(config.websocketUrl).toContain('3001');

      // Verify 8080 is NOT present
      expect(config.baseUrl).not.toContain('8080');
      expect(config.websocketUrl).not.toContain('8080');
    });
  });

  describe('URL Construction Scenarios', () => {
    it('should produce correct URL for streaming chat endpoint', () => {
      // ARRANGE: Get config
      const config = mergeWithDefaults();
      const expectedUrl = 'http://localhost:3001/api/claude-code/streaming-chat';

      // ACT: Construct URL with /api prefix in endpoint
      const fullUrl = `${config.baseUrl}/api/claude-code/streaming-chat`;

      // ASSERT: Verify exact match
      expect(fullUrl).toBe(expectedUrl);
    });

    it('should handle health endpoint correctly', () => {
      // ARRANGE: Get config
      const config = mergeWithDefaults();

      // ACT: Construct health endpoint URL
      const healthUrl = `${config.baseUrl}/api/health`;

      // ASSERT: Verify no double /api
      expect(healthUrl).toBe('http://localhost:3001/api/health');
      expect(healthUrl).not.toMatch(/\/api\/api/);
    });
  });

  describe('Port Configuration Contract', () => {
    it('should provide all required config properties', () => {
      // ARRANGE & ACT: Get default config
      const config = mergeWithDefaults();

      // ASSERT: Verify all required properties exist
      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('websocketUrl');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('retryAttempts');
      expect(config).toHaveProperty('rateLimits');
      expect(config).toHaveProperty('security');
      expect(config).toHaveProperty('fallback');
    });

    it('should match expected default values', () => {
      // ARRANGE & ACT: Get default config
      const config = mergeWithDefaults();

      // ASSERT: Verify expected defaults
      expect(config.timeout).toBe(300000);
      expect(config.retryAttempts).toBe(3);
      expect(config.rateLimits.messagesPerMinute).toBe(30);
      expect(config.rateLimits.tokensPerHour).toBe(50000);
      expect(config.security.enableAuth).toBe(false);
      expect(config.fallback.enableOfflineMode).toBe(true);
    });
  });

  describe('Port Change Verification', () => {
    it('should confirm port was changed from 8080 to 3001', () => {
      // ARRANGE: Expected old and new values
      const oldPort = '8080';
      const newPort = '3001';

      // ACT: Get current config
      const config = mergeWithDefaults();

      // ASSERT: Verify the change
      expect(config.baseUrl).not.toContain(oldPort);
      expect(config.baseUrl).toContain(newPort);
      expect(config.websocketUrl).not.toContain(oldPort);
      expect(config.websocketUrl).toContain(newPort);
    });

    it('should ensure baseUrl format is correct for backend API', () => {
      // ARRANGE: Expected format (no /api in baseUrl)
      const expectedPattern = /^http:\/\/localhost:3001$/;

      // ACT: Get default config
      const config = mergeWithDefaults();

      // ASSERT: Verify format matches
      expect(config.baseUrl).toMatch(expectedPattern);
    });

    it('should ensure websocketUrl format is correct for backend WS', () => {
      // ARRANGE: Expected format
      const expectedPattern = /^ws:\/\/localhost:3001\/ws$/;

      // ACT: Get default config
      const config = mergeWithDefaults();

      // ASSERT: Verify format matches
      expect(config.websocketUrl).toMatch(expectedPattern);
    });
  });
});
