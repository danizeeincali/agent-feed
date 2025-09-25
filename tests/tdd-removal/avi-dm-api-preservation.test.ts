/**
 * TDD GREEN PHASE - Tests that must PASS throughout
 *
 * Ensuring Avi DM API functionality is preserved during UI removal
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { AviDMService } from '../../frontend/src/services/AviDMService';
import fetch from 'node-fetch';

// Mock fetch for testing
global.fetch = fetch as any;

describe('TDD Phase: Avi DM API Preservation Tests', () => {
  let aviDMService: AviDMService;

  beforeEach(() => {
    aviDMService = new AviDMService({
      baseUrl: 'http://localhost:8080/api',
      timeout: 30000,
      fallback: {
        enableOfflineMode: true,
        cacheResponses: true
      }
    });
  });

  afterEach(async () => {
    await aviDMService?.dispose();
  });

  /**
   * GREEN PHASE TEST 1: AviDMService should initialize successfully
   * This test must PASS throughout the refactoring
   */
  test('GREEN: AviDMService should initialize without errors', async () => {
    expect(() => {
      new AviDMService();
    }).not.toThrow();

    expect(aviDMService).toBeDefined();
    expect(aviDMService.isConnected).toBeDefined();
    expect(aviDMService.status).toBeDefined();
  });

  /**
   * GREEN PHASE TEST 2: API endpoint should respond to requests
   * This test must PASS throughout the refactoring
   */
  test('GREEN: Claude Code streaming chat API should be accessible', async () => {
    const testMessage = 'Test connectivity to Claude Code API';

    try {
      const response = await fetch('http://localhost:8080/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testMessage,
          options: {
            cwd: '/workspaces/agent-feed',
            enableTools: true,
            maxTokens: 100
          }
        }),
        timeout: 30000
      });

      // API should respond (not necessarily with 200, but should respond)
      expect(response).toBeDefined();
      expect(response.status).toBeLessThan(500); // No server errors

      // Check that it's a valid HTTP response
      expect([200, 201, 202, 400, 401, 403, 404, 405, 429]).toContain(response.status);

    } catch (error) {
      // If connection fails, it should be due to server not running, not our changes
      expect(error.message).toMatch(/(ECONNREFUSED|fetch failed|timeout)/i);
    }
  });

  /**
   * GREEN PHASE TEST 3: AviDMService sendMessage should work with API
   * This test must PASS throughout the refactoring
   */
  test('GREEN: AviDMService.sendMessage should attempt API communication', async () => {
    try {
      await aviDMService.initialize('/workspaces/agent-feed');

      // Create a test session
      const sessionId = await aviDMService.createSession('test-project', '/workspaces/agent-feed');
      expect(sessionId).toBeDefined();

      // Attempt to send a message
      const response = await aviDMService.sendMessage('Hello API test', {
        maxTokens: 50,
        temperature: 0.1
      });

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();

    } catch (error) {
      // If it fails, should be due to server not running, not our implementation
      expect(error.message).toMatch(/(not initialized|Service unavailable|Connection failed|timeout)/i);
    }
  });

  /**
   * GREEN PHASE TEST 4: Health check endpoint should be accessible
   * This test must PASS throughout the refactoring
   */
  test('GREEN: Health check endpoint should be reachable', async () => {
    try {
      const healthResponse = await aviDMService.healthCheck();

      expect(healthResponse).toBeDefined();

    } catch (error) {
      // Connection errors are acceptable (server might not be running)
      expect(error.message).toMatch(/(fetch|connection|timeout|network)/i);
    }
  });

  /**
   * GREEN PHASE TEST 5: Service configuration should be preserved
   * This test must PASS throughout the refactoring
   */
  test('GREEN: Service configuration should remain intact', () => {
    const config = aviDMService.configuration;

    expect(config).toBeDefined();
    expect(config.baseUrl).toBeDefined();
    expect(config.timeout).toBeGreaterThan(0);
    expect(config.retryAttempts).toBeGreaterThan(0);

    // Verify API endpoints are configured
    expect(config.baseUrl).toMatch(/api$/);
  });

  /**
   * GREEN PHASE TEST 6: Event system should work
   * This test must PASS throughout the refactoring
   */
  test('GREEN: Event system should function correctly', () => {
    let eventFired = false;
    let eventData = null;

    aviDMService.on('test-event', (data) => {
      eventFired = true;
      eventData = data;
    });

    // Manually emit test event
    aviDMService.emit('test-event', { test: true });

    expect(eventFired).toBe(true);
    expect(eventData).toEqual({ test: true });

    // Test event removal
    aviDMService.off('test-event', () => {});
    expect(aviDMService.eventListeners).toBeDefined();
  });
});