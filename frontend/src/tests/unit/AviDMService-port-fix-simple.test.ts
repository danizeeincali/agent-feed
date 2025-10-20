/**
 * Simple Unit Tests: AviDMService Port Fix (403 Error Resolution)
 *
 * Test Suite: Validates correct port configuration without complex mocking
 * Issue: AVI DM 403 Error Fix - Port 8080 → 3001
 * SPARC Phase: 6 - Completion (Testing)
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock all dependencies before importing AviDMService
vi.mock('../../services/HttpClient', () => ({
  HttpClient: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }))
}));

vi.mock('../../services/WebSocketManager', () => ({
  WebSocketManager: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onMessage: vi.fn(),
    onError: vi.fn()
  }))
}));

vi.mock('../../services/ContextManager', () => ({
  ContextManager: vi.fn().mockImplementation(() => ({
    initializeContext: vi.fn(),
    serializeContext: vi.fn().mockResolvedValue('{}'),
    getProjectContext: vi.fn().mockResolvedValue({}),
    updateContext: vi.fn(),
    updateGitContext: vi.fn(),
    dispose: vi.fn()
  }))
}));

vi.mock('../../services/SessionManager', () => ({
  SessionManager: vi.fn().mockImplementation(() => ({
    createSession: vi.fn(),
    endSession: vi.fn(),
    saveSession: vi.fn(),
    addMessage: vi.fn(),
    getMessages: vi.fn().mockResolvedValue([]),
    dispose: vi.fn()
  }))
}));

vi.mock('../../services/ErrorHandler', () => ({
  ErrorHandler: vi.fn().mockImplementation(() => ({
    handleError: vi.fn((error) => error),
    enableOfflineMode: vi.fn(),
    generateFallbackResponse: vi.fn().mockResolvedValue({
      content: 'Fallback',
      suggestions: []
    })
  }))
}));

vi.mock('../../services/SecurityManager', () => ({
  SecurityManager: vi.fn().mockImplementation(() => ({
    sanitizeContent: vi.fn((content) => content),
    checkRateLimit: vi.fn().mockResolvedValue(true),
    recordRequest: vi.fn()
  }))
}));

// Import after mocking
import { AviDMService } from '../../services/AviDMService';

describe('AviDMService - Port Fix (Simple Tests)', () => {

  describe('✅ Default Configuration - Port 3001', () => {

    it('should use http://localhost:3001 as default baseUrl (NOT port 8080)', () => {
      // ARRANGE & ACT
      const service = new AviDMService();
      const config = service.configuration;

      // ASSERT: Correct port
      expect(config.baseUrl).toBe('http://localhost:3001');
      expect(config.baseUrl).toContain('3001');

      // ASSERT: NOT the old incorrect port
      expect(config.baseUrl).not.toContain('8080');
    });

    it('should NOT include /api suffix in baseUrl', () => {
      // ARRANGE & ACT
      const service = new AviDMService();
      const config = service.configuration;

      // ASSERT: No /api suffix
      expect(config.baseUrl).not.toMatch(/\/api$/);

      // ASSERT: Exactly as expected
      expect(config.baseUrl).toBe('http://localhost:3001');
    });

  });

  describe('✅ URL Construction - No Double /api Prefix', () => {

    it('should construct correct full URL for Claude Code endpoint', () => {
      // ARRANGE
      const service = new AviDMService();
      const baseUrl = service.configuration.baseUrl;
      const endpoint = '/api/claude-code/streaming-chat';

      // ACT: Simulate HttpClient URL construction
      const fullUrl = baseUrl + endpoint;

      // ASSERT: Correct full URL
      expect(fullUrl).toBe('http://localhost:3001/api/claude-code/streaming-chat');

      // ASSERT: NO double /api prefix
      expect(fullUrl).not.toContain('/api/api');

      // ASSERT: Only ONE occurrence of '/api'
      const apiCount = (fullUrl.match(/\/api/g) || []).length;
      expect(apiCount).toBe(1);
    });

    it('should construct correct URL for health check', () => {
      // ARRANGE
      const service = new AviDMService();
      const baseUrl = service.configuration.baseUrl;
      const endpoint = '/health';

      // ACT
      const fullUrl = baseUrl + endpoint;

      // ASSERT
      expect(fullUrl).toBe('http://localhost:3001/health');
    });

    it('should construct correct URL for sessions', () => {
      // ARRANGE
      const service = new AviDMService();
      const baseUrl = service.configuration.baseUrl;
      const endpoint = '/sessions';

      // ACT
      const fullUrl = baseUrl + endpoint;

      // ASSERT
      expect(fullUrl).toBe('http://localhost:3001/sessions');
    });

  });

  describe('✅ WebSocket Configuration - Port 3001', () => {

    it('should use ws://localhost:3001/ws for WebSocket URL', () => {
      // ARRANGE & ACT
      const service = new AviDMService();
      const config = service.configuration;

      // ASSERT: Correct WebSocket URL
      expect(config.websocketUrl).toBe('ws://localhost:3001/ws');
      expect(config.websocketUrl).toContain('3001');

      // ASSERT: NOT the old incorrect port
      expect(config.websocketUrl).not.toContain('8080');
    });

  });

  describe('✅ Configuration Override - Backward Compatibility', () => {

    it('should respect custom baseUrl override', () => {
      // ARRANGE: User provides custom URL
      const customUrl = 'https://production-api.example.com';
      const service = new AviDMService({ baseUrl: customUrl });

      // ACT
      const config = service.configuration;

      // ASSERT: Custom URL used
      expect(config.baseUrl).toBe(customUrl);
    });

    it('should respect custom WebSocket URL override', () => {
      // ARRANGE: User provides custom WebSocket URL
      const customWsUrl = 'wss://production-api.example.com/ws';
      const service = new AviDMService({ websocketUrl: customWsUrl });

      // ACT
      const config = service.configuration;

      // ASSERT: Custom WebSocket URL used
      expect(config.websocketUrl).toBe(customWsUrl);
    });

    it('should allow partial config override while keeping defaults', () => {
      // ARRANGE: Only override timeout
      const service = new AviDMService({ timeout: 60000 });

      // ACT
      const config = service.configuration;

      // ASSERT: Custom timeout
      expect(config.timeout).toBe(60000);

      // ASSERT: Default baseUrl still used
      expect(config.baseUrl).toBe('http://localhost:3001');
    });

  });

  describe('❌ Regression Tests - Port 8080 Must NOT Appear', () => {

    it('should NEVER contain port 8080 in baseUrl', () => {
      // ARRANGE & ACT
      const service = new AviDMService();
      const config = service.configuration;

      // ASSERT: No 8080 anywhere
      expect(config.baseUrl).not.toContain('8080');

      // ASSERT: Uses 3001 instead
      expect(config.baseUrl).toContain('3001');
    });

    it('should NEVER contain port 8080 in websocketUrl', () => {
      // ARRANGE & ACT
      const service = new AviDMService();
      const config = service.configuration;

      // ASSERT: No 8080 anywhere
      expect(config.websocketUrl).not.toContain('8080');

      // ASSERT: Uses 3001 instead
      expect(config.websocketUrl).toContain('3001');
    });

    it('should NEVER create URLs with double /api/api prefix', () => {
      // ARRANGE
      const service = new AviDMService();
      const baseUrl = service.configuration.baseUrl;

      // ACT: Test all common endpoints
      const endpoints = [
        '/api/claude-code/streaming-chat',
        '/api/health',
        '/api/status',
        '/api/sessions'
      ];

      // ASSERT: No endpoint produces double /api
      endpoints.forEach(endpoint => {
        const fullUrl = baseUrl + endpoint;
        expect(fullUrl).not.toContain('/api/api');
      });
    });

  });

  describe('🔧 SPARC Fix Validation', () => {

    it('SPARC FIX: baseUrl changed from 8080 to 3001', () => {
      // This test documents the exact fix applied
      const service = new AviDMService();
      const config = service.configuration;

      // BEFORE FIX: 'http://localhost:8080/api' ❌
      // AFTER FIX:  'http://localhost:3001' ✅

      expect(config.baseUrl).toBe('http://localhost:3001');
    });

    it('SPARC FIX: baseUrl no longer has /api suffix to prevent double /api/api', () => {
      // This test documents the second part of the fix
      const service = new AviDMService();
      const config = service.configuration;

      // BEFORE FIX: 'http://localhost:3001/api' ❌ (would create /api/api)
      // AFTER FIX:  'http://localhost:3001' ✅ (clean concatenation)

      expect(config.baseUrl).not.toMatch(/\/api$/);
      expect(config.baseUrl).toBe('http://localhost:3001');
    });

    it('SPARC FIX: Full URL construction now produces correct single /api prefix', () => {
      // This test validates the complete fix result
      const service = new AviDMService();
      const baseUrl = service.configuration.baseUrl;
      const endpoint = '/api/claude-code/streaming-chat';
      const fullUrl = baseUrl + endpoint;

      // BEFORE FIX: 'http://localhost:8080/api/api/claude-code/streaming-chat' ❌
      // AFTER FIX:  'http://localhost:3001/api/claude-code/streaming-chat' ✅

      expect(fullUrl).toBe('http://localhost:3001/api/claude-code/streaming-chat');
      expect(fullUrl).not.toContain('/api/api');
    });

  });

});
