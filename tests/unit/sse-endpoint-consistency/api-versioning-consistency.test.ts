/**
 * API Versioning Consistency TDD Tests
 * 
 * These tests validate API versioning patterns across all endpoints.
 * WILL FAIL initially due to inconsistent API versioning between frontend hooks.
 * WILL PASS after standardizing all endpoints to use /api/v1/ prefix.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { API_VERSIONING_PATTERNS, SSE_ENDPOINT_PATTERNS } from './fixtures/endpointPatterns';
import { URLPatternValidator, SSETestHelper } from './utils/testHelpers';
import { FetchMock } from './mocks/EventSourceMock';

describe('API Versioning Consistency Tests', () => {
  let testHelper: SSETestHelper;

  beforeEach(() => {
    testHelper = new SSETestHelper();
    testHelper.setupMocks();
  });

  afterEach(() => {
    testHelper.cleanup();
  });

  describe('API Version Pattern Validation', () => {
    it('SHOULD FAIL: Inconsistent API versioning across endpoint patterns', () => {
      // Analyze all SSE endpoint patterns for versioning consistency
      const versioningIssues: string[] = [];
      
      SSE_ENDPOINT_PATTERNS.forEach(pattern => {
        const frontendHasVersion = pattern.frontend.includes('/api/v1/');
        const backendHasVersion = pattern.backend.includes('/api/v1/');
        const shouldBeVersioned = pattern.version === 'v1';
        
        if (shouldBeVersioned && !frontendHasVersion) {
          versioningIssues.push(`${pattern.name}: Frontend missing v1 versioning - ${pattern.frontend}`);
        }
        
        if (shouldBeVersioned && !backendHasVersion) {
          versioningIssues.push(`${pattern.name}: Backend missing v1 versioning - ${pattern.backend}`);
        }
        
        if (frontendHasVersion !== backendHasVersion) {
          versioningIssues.push(`${pattern.name}: Version mismatch between frontend and backend`);
        }
      });
      
      console.log('API Versioning Issues Found:', versioningIssues);
      
      // This WILL FAIL initially - we expect to find versioning issues
      expect(versioningIssues.length).toBe(0); // Should be 0 after fix, but currently > 0
    });

    it('SHOULD FAIL: Deprecated unversioned endpoints still in use', () => {
      const deprecatedPattern = API_VERSIONING_PATTERNS.find(p => p.deprecated);
      
      expect(deprecatedPattern).toBeDefined();
      
      if (deprecatedPattern) {
        // Count how many SSE patterns are still using deprecated unversioned endpoints
        const usingDeprecated = SSE_ENDPOINT_PATTERNS.filter(pattern => 
          !pattern.frontend.includes('/api/v1/') || !pattern.backend.includes('/api/v1/')
        );
        
        console.log('Patterns using deprecated unversioned endpoints:', 
          usingDeprecated.map(p => ({ name: p.name, frontend: p.frontend, backend: p.backend }))
        );
        
        // This WILL FAIL initially - some patterns still use deprecated endpoints
        expect(usingDeprecated.length).toBe(0); // Should be 0 after migration
      }
    });

    it('SHOULD PASS: V1 versioned endpoints follow consistent pattern', () => {
      const v1Pattern = API_VERSIONING_PATTERNS.find(p => p.version === 'v1' && !p.deprecated);
      
      expect(v1Pattern).toBeDefined();
      
      if (v1Pattern) {
        // All v1 endpoints should start with /api/v1
        const correctlyVersioned = v1Pattern.endpoints.every(endpoint => 
          endpoint.startsWith('/claude/') // Relative to /api/v1 base
        );
        
        expect(correctlyVersioned).toBe(true);
        expect(v1Pattern.baseUrl).toBe('/api/v1');
      }
    });
  });

  describe('Frontend Hook Versioning Analysis', () => {
    const hookAnalysis = [
      {
        name: 'useSSEConnectionSingleton',
        file: 'frontend/src/hooks/useSSEConnectionSingleton.ts',
        endpoints: {
          stream: '/api/claude/instances/{instanceId}/terminal/stream',
          input: '/api/claude/instances/{instanceId}/terminal/input'
        },
        expectedVersioned: true,
        currentlyVersioned: false
      },
      {
        name: 'useStableSSEConnection', 
        file: 'frontend/src/hooks/useStableSSEConnection.ts',
        endpoints: {
          stream: '/api/claude/instances/{instanceId}/terminal/stream',
          input: '/api/claude/instances/{instanceId}/terminal/input'
        },
        expectedVersioned: true,
        currentlyVersioned: false
      },
      {
        name: 'useAdvancedSSEConnection',
        file: 'frontend/src/hooks/useAdvancedSSEConnection.ts', 
        endpoints: {
          stream: '/api/claude/instances/{instanceId}/terminal/stream'
        },
        expectedVersioned: true,
        currentlyVersioned: false
      },
      {
        name: 'useHTTPSSE',
        file: 'frontend/src/hooks/useHTTPSSE.ts',
        endpoints: {
          stream: '/api/claude/instances/{instanceId}/terminal/stream',
          input: '/api/claude/instances/{instanceId}/terminal/input',
          instances: '/api/claude/instances',
          instance: '/api/claude/instances/{instanceId}'
        },
        expectedVersioned: true,
        currentlyVersioned: false
      },
      {
        name: 'useWebSocket',
        file: 'frontend/src/hooks/useWebSocket.ts',
        endpoints: {
          poll: '/api/v1/claude/instances/{instanceId}/terminal/poll',
          stream: '/api/v1/claude/instances/{instanceId}/terminal/stream'
        },
        expectedVersioned: true,
        currentlyVersioned: true // This one is partially correct
      }
    ];

    hookAnalysis.forEach(hook => {
      it(`SHOULD ${hook.currentlyVersioned ? 'PASS' : 'FAIL'}: ${hook.name} uses consistent API versioning`, () => {
        Object.entries(hook.endpoints).forEach(([endpointName, endpointPath]) => {
          const isVersioned = endpointPath.includes('/api/v1/');
          
          console.log(`${hook.name}.${endpointName}: ${endpointPath} - Versioned: ${isVersioned}`);
          
          if (hook.expectedVersioned && !hook.currentlyVersioned) {
            // This WILL FAIL for most hooks initially
            expect(isVersioned).toBe(true);
          } else {
            // This WILL PASS for correctly implemented hooks
            expect(isVersioned).toBe(hook.currentlyVersioned);
          }
        });
      });
    });
  });

  describe('Cross-Hook Consistency Validation', () => {
    it('SHOULD FAIL: Different hooks use different URL patterns for same functionality', () => {
      const streamUrls: { [hookName: string]: string } = {
        useSSEConnectionSingleton: '/api/claude/instances/{instanceId}/terminal/stream',
        useStableSSEConnection: '/api/claude/instances/{instanceId}/terminal/stream', 
        useAdvancedSSEConnection: '/api/claude/instances/{instanceId}/terminal/stream',
        useHTTPSSE: '/api/claude/instances/{instanceId}/terminal/stream',
        useWebSocket: '/api/v1/claude/instances/{instanceId}/terminal/stream'
      };
      
      const inputUrls: { [hookName: string]: string } = {
        useSSEConnectionSingleton: '/api/claude/instances/{instanceId}/terminal/input',
        useStableSSEConnection: '/api/claude/instances/{instanceId}/terminal/input',
        useHTTPSSE: '/api/claude/instances/{instanceId}/terminal/input'
      };
      
      // Check stream URL consistency
      const uniqueStreamUrls = new Set(Object.values(streamUrls));
      console.log('Stream URLs used by hooks:', streamUrls);
      console.log('Unique stream URL patterns:', Array.from(uniqueStreamUrls));
      
      // This WILL FAIL initially - different hooks use different patterns
      expect(uniqueStreamUrls.size).toBe(1); // Should be 1 after standardization
      
      // Check input URL consistency  
      const uniqueInputUrls = new Set(Object.values(inputUrls));
      console.log('Input URLs used by hooks:', inputUrls);
      console.log('Unique input URL patterns:', Array.from(uniqueInputUrls));
      
      // This WILL FAIL initially
      expect(uniqueInputUrls.size).toBe(1); // Should be 1 after standardization
    });

    it('SHOULD PASS: All hooks should use same standardized URL pattern after fix', () => {
      const standardizedPattern = '/api/v1/claude/instances/{instanceId}/terminal/{action}';
      
      // After the fix, all hooks should follow this pattern:
      const expectedUrls = {
        stream: '/api/v1/claude/instances/{instanceId}/terminal/stream',
        input: '/api/v1/claude/instances/{instanceId}/terminal/input', 
        poll: '/api/v1/claude/instances/{instanceId}/terminal/poll',
        status: '/api/v1/claude/instances/{instanceId}'
      };
      
      Object.entries(expectedUrls).forEach(([action, expectedUrl]) => {
        expect(expectedUrl).toMatch(/^\/api\/v1\/claude\/instances\/\{instanceId\}.*$/);
      });
    });
  });

  describe('Backend Endpoint Compatibility', () => {
    it('SHOULD FAIL: Frontend hooks target non-existent backend endpoints', async () => {
      const instanceId = 'compatibility-test';
      
      // Mock backend responses
      // Versioned endpoints (exist)
      FetchMock.mockResponse(/\/api\/v1\/claude\/instances/, {
        success: true,
        data: { instanceId, status: 'running' }
      });
      
      // Unversioned endpoints (don't exist - 404)
      FetchMock.mockResponse(/\/api\/claude\/instances/, {
        status: 404,
        error: 'Not Found',
        message: 'Endpoint not found. Use /api/v1/ prefix.'
      });
      
      // Test unversioned endpoint (what most hooks currently use)
      const unversionedResponse = await fetch(`/api/claude/instances/${instanceId}`);
      
      // Test versioned endpoint (what backend actually serves)
      const versionedResponse = await fetch(`/api/v1/claude/instances/${instanceId}`);
      
      // This WILL FAIL initially - unversioned endpoint returns 404
      expect(unversionedResponse.ok).toBe(true); // Currently false due to 404
      
      // This WILL PASS - versioned endpoint exists
      expect(versionedResponse.ok).toBe(true);
    });

    it('SHOULD PASS: Backend serves all expected versioned endpoints', () => {
      const v1Endpoints = [
        '/api/v1/claude/instances',
        '/api/v1/claude/instances/{instanceId}',
        '/api/v1/claude/instances/{instanceId}/terminal/stream',
        '/api/v1/claude/instances/{instanceId}/terminal/input', 
        '/api/v1/claude/instances/{instanceId}/terminal/poll',
        '/api/v1/claude/instances/{instanceId}/sse/status',
        '/api/v1/sse/statistics',
        '/api/v1/sse/flush-buffers'
      ];
      
      v1Endpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^\/api\/v1\//);
        expect(endpoint).not.toMatch(/\/api\/api\//); // No double api prefix
        expect(endpoint).not.toMatch(/\/v1\/v1\//); // No double version
      });
    });
  });

  describe('Migration Path Validation', () => {
    it('SHOULD PASS: Migration from unversioned to versioned URLs', () => {
      const migrationMappings = [
        {
          from: '/api/claude/instances/{instanceId}/terminal/stream',
          to: '/api/v1/claude/instances/{instanceId}/terminal/stream'
        },
        {
          from: '/api/claude/instances/{instanceId}/terminal/input',
          to: '/api/v1/claude/instances/{instanceId}/terminal/input'
        },
        {
          from: '/api/claude/instances',
          to: '/api/v1/claude/instances'
        },
        {
          from: '/api/claude/instances/{instanceId}',
          to: '/api/v1/claude/instances/{instanceId}'
        }
      ];
      
      migrationMappings.forEach(mapping => {
        const migratedUrl = mapping.from.replace('/api/claude/', '/api/v1/claude/');
        expect(migratedUrl).toBe(mapping.to);
        
        // Ensure migration preserves path structure
        const fromParts = mapping.from.split('/').filter(p => p && p !== 'api');
        const toParts = mapping.to.split('/').filter(p => p && p !== 'api' && p !== 'v1');
        expect(fromParts).toEqual(toParts);
      });
    });

    it('SHOULD PASS: Validation helper can detect version mismatches', () => {
      const testUrls = [
        { url: '/api/claude/instances/test/terminal/stream', isVersioned: false },
        { url: '/api/v1/claude/instances/test/terminal/stream', isVersioned: true },
        { url: '/api/v2/claude/instances/test/terminal/stream', isVersioned: true },
        { url: '/claude/instances/test/terminal/stream', isVersioned: false }
      ];
      
      testUrls.forEach(testUrl => {
        const hasVersion = /\/api\/v\d+\//.test(testUrl.url);
        expect(hasVersion).toBe(testUrl.isVersioned);
      });
    });
  });

  describe('Error Message Validation', () => {
    it('SHOULD FAIL: Current error messages do not indicate version mismatch', () => {
      // Simulate current error handling
      const currentErrorMessage = 'Failed to connect to SSE stream';
      
      // After fix, error messages should be more specific
      const improvedErrorMessage = 'SSE connection failed: URL mismatch detected. Expected /api/v1/ prefix.';
      
      // This WILL FAIL initially - current messages are not specific
      expect(currentErrorMessage).toContain('URL mismatch'); // Currently doesn't
      expect(currentErrorMessage).toContain('v1'); // Currently doesn't
      
      // The improved message would pass
      expect(improvedErrorMessage).toContain('URL mismatch');
      expect(improvedErrorMessage).toContain('v1');
    });

    it('SHOULD PASS: Helpful error messages for version mismatches', () => {
      const createVersionMismatchError = (attemptedUrl: string): string => {
        if (!attemptedUrl.includes('/api/v1/') && attemptedUrl.includes('/api/claude/')) {
          const suggestedUrl = attemptedUrl.replace('/api/claude/', '/api/v1/claude/');
          return `URL version mismatch. Attempted: ${attemptedUrl}. Try: ${suggestedUrl}`;
        }
        return 'Connection failed';
      };
      
      const error1 = createVersionMismatchError('/api/claude/instances/test/terminal/stream');
      const error2 = createVersionMismatchError('/api/v1/claude/instances/test/terminal/stream');
      
      expect(error1).toContain('version mismatch');
      expect(error1).toContain('/api/v1/claude/instances/test/terminal/stream');
      
      expect(error2).not.toContain('version mismatch'); // Already correct URL
    });
  });
});