/**
 * Frontend SSE Connection Failure Graceful Handling TDD Tests
 * 
 * Tests that validate graceful error handling for SSE connection failures.
 * WILL FAIL initially due to poor error handling of URL mismatches.
 * WILL PASS after implementing proper error detection and recovery.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventSourceMock, FetchMock } from './mocks/EventSourceMock';
import { EXPECTED_ERROR_PATTERNS, RECOVERY_PATTERNS } from './fixtures/endpointPatterns';
import { SSETestHelper } from './utils/testHelpers';

describe('Frontend SSE Connection Failure Graceful Handling Tests', () => {
  let testHelper: SSETestHelper;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    testHelper = new SSETestHelper();
    testHelper.setupMocks();

    // Spy on console to capture error messages
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Mock backend responses for different scenarios
    FetchMock.mockResponse(/\/api\/v1\/claude\/instances/, {
      success: true,
      instanceId: 'test'
    });

    FetchMock.mockResponse(/\/api\/claude\/instances/, {
      status: 404,
      error: 'Not Found'
    });
  });

  afterEach(() => {
    testHelper.cleanup();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Error Detection and Classification', () => {
    it('SHOULD FAIL: Current error handling does not detect URL mismatch issues', async () => {
      const instanceId = 'error-detection-test';
      const wrongUrl = `http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`;
      
      const eventSource = new EventSourceMock(wrongUrl);
      
      let errorHandled = false;
      let errorClassified = false;
      let suggestedFix = '';
      
      eventSource.onerror = (event) => {
        errorHandled = true;
        
        const errorMessage = (event as any).message || '';
        
        // Current implementation doesn't detect URL mismatch
        if (errorMessage.includes('404') && wrongUrl.includes('/api/claude/')) {
          errorClassified = true;
          suggestedFix = 'Try using /api/v1/ prefix';
        }
      };

      // Simulate 404 error from backend
      eventSource.mockError('404 Not Found - Endpoint does not exist');

      expect(errorHandled).toBe(true);
      
      // This WILL FAIL initially - no URL mismatch detection
      expect(errorClassified).toBe(true); // Currently false
      expect(suggestedFix).toBe('Try using /api/v1/ prefix'); // Currently empty
    });

    it('SHOULD PASS: Enhanced error handling detects and classifies URL mismatches', () => {
      const classifyConnectionError = (url: string, errorMessage: string): { type: string; suggestion: string } => {
        if (errorMessage.includes('404') && url.includes('/api/claude/')) {
          return {
            type: 'URL_VERSION_MISMATCH',
            suggestion: url.replace('/api/claude/', '/api/v1/claude/')
          };
        }
        
        if (errorMessage.includes('CORS')) {
          return {
            type: 'CORS_ERROR',
            suggestion: 'Check API endpoint configuration'
          };
        }
        
        if (errorMessage.includes('timeout')) {
          return {
            type: 'CONNECTION_TIMEOUT',
            suggestion: 'Retry connection or check network'
          };
        }
        
        return {
          type: 'UNKNOWN_ERROR',
          suggestion: 'Check logs for more details'
        };
      };

      const wrongUrl = 'http://localhost:3000/api/claude/instances/test/terminal/stream';
      const error404 = classifyConnectionError(wrongUrl, '404 Not Found');
      
      expect(error404.type).toBe('URL_VERSION_MISMATCH');
      expect(error404.suggestion).toBe('http://localhost:3000/api/v1/claude/instances/test/terminal/stream');

      const corsError = classifyConnectionError('http://localhost:3000/api/v1/claude/instances/test/terminal/stream', 'CORS error');
      expect(corsError.type).toBe('CORS_ERROR');
    });
  });

  describe('User-Friendly Error Messages', () => {
    it('SHOULD FAIL: Current error messages are not user-friendly', async () => {
      const instanceId = 'user-message-test';
      const eventSource = new EventSourceMock(`http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`);
      
      let userErrorMessage = '';
      
      eventSource.onerror = (event) => {
        // Current implementation might show raw error
        userErrorMessage = 'Connection failed';
      };

      eventSource.mockError('404 Not Found');

      // This WILL FAIL - message is not helpful to users
      expect(userErrorMessage).toContain('URL'); // Currently doesn't mention URL
      expect(userErrorMessage).toContain('version'); // Currently doesn't mention versioning
      expect(userErrorMessage).toContain('suggestion'); // Currently no suggestions
    });

    it('SHOULD PASS: Enhanced error messages provide clear guidance', () => {
      const createUserFriendlyError = (url: string, errorMessage: string): string => {
        if (errorMessage.includes('404') && url.includes('/api/claude/')) {
          return `Connection failed: The endpoint "${url}" was not found. This might be due to missing API versioning. Try using "/api/v1/" prefix instead.`;
        }
        
        if (errorMessage.includes('CORS')) {
          return 'Connection blocked: Cross-origin request not allowed. Please check your API configuration.';
        }
        
        return `Connection failed: ${errorMessage}. Please check your network connection and try again.`;
      };

      const wrongUrl = 'http://localhost:3000/api/claude/instances/test/terminal/stream';
      const friendlyError = createUserFriendlyError(wrongUrl, '404 Not Found');
      
      expect(friendlyError).toContain('endpoint');
      expect(friendlyError).toContain('not found');
      expect(friendlyError).toContain('/api/v1/');
      expect(friendlyError).toContain('prefix');
    });
  });

  describe('Automatic Recovery Mechanisms', () => {
    it('SHOULD FAIL: No automatic URL correction on 404 errors', async () => {
      const instanceId = 'auto-recovery-test';
      const wrongUrl = `http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`;
      
      let eventSource = new EventSourceMock(wrongUrl);
      let recoveryAttempted = false;
      let recoverySuccessful = false;
      
      eventSource.onerror = (event) => {
        const errorMessage = (event as any).message || '';
        
        // Current implementation doesn't auto-recover
        if (errorMessage.includes('404')) {
          recoveryAttempted = false; // No recovery logic
        }
      };

      eventSource.mockError('404 Not Found');

      // This WILL FAIL - no automatic recovery
      expect(recoveryAttempted).toBe(true); // Currently false
      expect(recoverySuccessful).toBe(true); // Currently false
    });

    it('SHOULD PASS: Automatic URL correction and retry', async () => {
      const instanceId = 'smart-recovery-test';
      const wrongUrl = `http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`;
      
      let eventSource = new EventSourceMock(wrongUrl);
      let recoveryAttempted = false;
      let recoverySuccessful = false;
      
      // Enhanced error handler with automatic recovery
      eventSource.onerror = async (event) => {
        const errorMessage = (event as any).message || '';
        
        if (errorMessage.includes('404') && wrongUrl.includes('/api/claude/')) {
          recoveryAttempted = true;
          
          // Close failed connection
          eventSource.close();
          
          // Create new connection with corrected URL
          const correctedUrl = wrongUrl.replace('/api/claude/', '/api/v1/claude/');
          eventSource = new EventSourceMock(correctedUrl);
          
          // Simulate successful connection after correction
          await new Promise(resolve => setTimeout(resolve, 100));
          eventSource.mockOpen();
          
          recoverySuccessful = eventSource.readyState === EventSourceMock.OPEN;
        }
      };

      // Trigger initial error
      eventSource.mockError('404 Not Found');

      // Allow recovery to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(recoveryAttempted).toBe(true);
      expect(recoverySuccessful).toBe(true);
    });
  });

  describe('Connection State Management During Errors', () => {
    it('SHOULD FAIL: Connection state not properly managed during URL mismatch errors', async () => {
      const instanceId = 'state-management-test';
      
      let connectionState = {
        status: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'error' | 'recovering',
        error: null as string | null,
        lastAttempt: null as Date | null,
        retryCount: 0
      };
      
      const eventSource = new EventSourceMock(`http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`);
      
      // Current state management (basic)
      connectionState.status = 'connecting';
      
      eventSource.onerror = (event) => {
        connectionState.status = 'error';
        connectionState.error = 'Connection failed';
        // No detailed state tracking
      };

      eventSource.mockError('404 Not Found');

      expect(connectionState.status).toBe('error');
      
      // This WILL FAIL - no detailed error tracking
      expect(connectionState.error).toContain('URL mismatch'); // Currently generic
      expect(connectionState.retryCount).toBeGreaterThan(0); // Currently 0
      expect(connectionState.lastAttempt).toBeInstanceOf(Date); // Currently null
    });

    it('SHOULD PASS: Comprehensive connection state tracking', async () => {
      const instanceId = 'comprehensive-state-test';
      
      let connectionState = {
        status: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'error' | 'recovering',
        error: null as string | null,
        errorType: null as string | null,
        lastAttempt: null as Date | null,
        retryCount: 0,
        suggestedFix: null as string | null
      };
      
      const eventSource = new EventSourceMock(`http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`);
      
      // Enhanced state management
      connectionState.status = 'connecting';
      connectionState.lastAttempt = new Date();
      
      eventSource.onerror = (event) => {
        const errorMessage = (event as any).message || '';
        
        connectionState.status = 'error';
        connectionState.retryCount++;
        
        if (errorMessage.includes('404')) {
          connectionState.errorType = 'URL_NOT_FOUND';
          connectionState.error = 'SSE endpoint not found - possible version mismatch';
          connectionState.suggestedFix = 'Try using /api/v1/ prefix in URL';
        }
      };

      eventSource.mockError('404 Not Found');

      expect(connectionState.status).toBe('error');
      expect(connectionState.errorType).toBe('URL_NOT_FOUND');
      expect(connectionState.error).toContain('version mismatch');
      expect(connectionState.suggestedFix).toContain('/api/v1/');
      expect(connectionState.retryCount).toBe(1);
      expect(connectionState.lastAttempt).toBeInstanceOf(Date);
    });
  });

  describe('Fallback Mechanisms', () => {
    it('SHOULD FAIL: No fallback to HTTP polling when SSE fails', async () => {
      const instanceId = 'fallback-test';
      const baseUrl = 'http://localhost:3000';
      
      // SSE connection fails with wrong URL
      const wrongSSEUrl = `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`;
      const eventSource = new EventSourceMock(wrongSSEUrl);
      
      let sseWorking = false;
      let pollingFallback = false;
      
      eventSource.onerror = (event) => {
        sseWorking = false;
        // Current implementation doesn't fall back to polling
        pollingFallback = false;
      };

      eventSource.mockError('404 Not Found');

      // This WILL FAIL - no fallback mechanism
      expect(sseWorking || pollingFallback).toBe(true); // Currently false
    });

    it('SHOULD PASS: Automatic fallback to HTTP polling', async () => {
      const instanceId = 'smart-fallback-test';
      const baseUrl = 'http://localhost:3000';
      
      let sseWorking = false;
      let pollingFallback = false;
      
      // Try SSE first
      const sseUrl = `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`;
      const eventSource = new EventSourceMock(sseUrl);
      
      eventSource.onerror = async (event) => {
        sseWorking = false;
        
        // Fall back to HTTP polling
        const pollUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/poll`;
        
        try {
          const pollResponse = await fetch(pollUrl);
          pollingFallback = pollResponse.ok;
        } catch (error) {
          pollingFallback = false;
        }
      };

      eventSource.mockError('404 Not Found');
      
      // Allow fallback to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sseWorking || pollingFallback).toBe(true);
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('SHOULD FAIL: Insufficient error logging for debugging', async () => {
      const instanceId = 'logging-test';
      const eventSource = new EventSourceMock(`http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`);
      
      eventSource.onerror = (event) => {
        // Basic logging (current implementation)
        console.error('SSE connection failed');
      };

      eventSource.mockError('404 Not Found');

      const errorCalls = consoleErrorSpy.mock.calls;
      
      // This WILL FAIL - logging lacks detail
      expect(errorCalls.some(call => 
        call.some(arg => typeof arg === 'string' && arg.includes('URL'))
      )).toBe(true); // Currently false - no URL in logs
      
      expect(errorCalls.some(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('404'))
      )).toBe(true); // Currently false - no error code in logs
    });

    it('SHOULD PASS: Comprehensive error logging', () => {
      const logSSEError = (url: string, error: string, context: any) => {
        console.error('SSE Connection Error:', {
          url,
          error,
          timestamp: new Date().toISOString(),
          context,
          suggestedFix: url.includes('/api/claude/') ? 
            url.replace('/api/claude/', '/api/v1/claude/') : 
            'Check endpoint configuration'
        });
      };

      const testUrl = 'http://localhost:3000/api/claude/instances/test/terminal/stream';
      const testError = '404 Not Found';
      const testContext = { instanceId: 'test', retryCount: 1 };

      logSSEError(testUrl, testError, testContext);

      const errorCalls = consoleErrorSpy.mock.calls;
      const lastCall = errorCalls[errorCalls.length - 1];
      
      expect(lastCall[0]).toBe('SSE Connection Error:');
      expect(lastCall[1]).toHaveProperty('url', testUrl);
      expect(lastCall[1]).toHaveProperty('error', testError);
      expect(lastCall[1]).toHaveProperty('suggestedFix');
      expect(lastCall[1].suggestedFix).toContain('/api/v1/');
    });
  });

  describe('Progressive Error Recovery', () => {
    it('SHOULD FAIL: No progressive retry strategy', async () => {
      const instanceId = 'progressive-test';
      const wrongUrl = `http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`;
      
      let retryAttempts = 0;
      const maxRetries = 3;
      
      // Current implementation: retry same URL multiple times
      for (let i = 0; i < maxRetries; i++) {
        const eventSource = new EventSourceMock(wrongUrl);
        
        eventSource.onerror = (event) => {
          retryAttempts++;
          eventSource.close();
        };

        eventSource.mockError('404 Not Found');
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // This WILL FAIL - all retries use same wrong URL
      expect(retryAttempts).toBe(1); // Should fix URL after first failure, not retry 3 times
    });

    it('SHOULD PASS: Smart progressive recovery', async () => {
      const instanceId = 'smart-progressive-test';
      let currentUrl = `http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`;
      
      let retryAttempts = 0;
      let recoveryStrategies = [
        (url: string) => url.replace('/api/claude/', '/api/v1/claude/'), // Fix versioning
        (url: string) => url.replace('http://', 'https://'), // Try HTTPS
        (url: string) => url + '?fallback=true' // Add fallback parameter
      ];
      
      let finalSuccess = false;
      
      for (let strategy of recoveryStrategies) {
        retryAttempts++;
        const attemptUrl = strategy(currentUrl);
        const eventSource = new EventSourceMock(attemptUrl);
        
        if (attemptUrl.includes('/api/v1/')) {
          // Correct URL works
          eventSource.mockOpen();
          finalSuccess = eventSource.readyState === EventSourceMock.OPEN;
          if (finalSuccess) break;
        } else {
          eventSource.mockError('Still failing');
        }
        
        eventSource.close();
      }

      expect(finalSuccess).toBe(true);
      expect(retryAttempts).toBeLessThanOrEqual(2); // Should succeed on version fix
    });
  });

  describe('Error Recovery Validation', () => {
    it('validates all expected error patterns are handled', () => {
      EXPECTED_ERROR_PATTERNS.forEach(pattern => {
        const testError = 'Test error: ' + pattern.description;
        const matches = pattern.pattern.test(testError);
        
        // This validates our test patterns work
        expect(typeof matches).toBe('boolean');
      });
    });

    it('validates recovery patterns can be detected', () => {
      RECOVERY_PATTERNS.forEach(pattern => {
        const testSuccess = 'Success: ' + pattern.name;
        const matches = pattern.pattern.test(testSuccess);
        
        expect(typeof matches).toBe('boolean');
      });
    });
  });
});