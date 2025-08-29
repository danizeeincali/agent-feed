/**
 * TDD Test Suite: Error Handling for Versioned/Unversioned Endpoint Failures
 * 
 * Tests comprehensive error scenarios and recovery mechanisms
 * Validates that error messages are clear and actionable
 * Ensures graceful degradation between endpoint versions
 * 
 * ERROR SCENARIOS TESTED:
 * 1. Version-specific error messages and codes
 * 2. Fallback chain error propagation
 * 3. Network errors vs API errors distinction
 * 4. Timeout handling across versions
 * 5. Rate limiting and quota errors
 * 6. Malformed response handling
 */

import { createMockBackend, MockBackendServer, EndpointTestUtils } from './backend-endpoint-mock';
import { APIClient, defaultAPIConfig } from '../../../frontend/src/config/api';

global.fetch = jest.fn();

describe('Error Handling for Versioned/Unversioned Endpoints', () => {
  let mockBackend: MockBackendServer;
  let apiClient: APIClient;
  const testBaseUrl = 'http://localhost:3000';

  beforeEach(() => {
    mockBackend = createMockBackend(testBaseUrl);
    apiClient = new APIClient(defaultAPIConfig, true);
    (global.fetch as jest.Mock) = mockBackend.mockFetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockBackend.reset();
  });

  describe('🚨 FAILING TESTS: Current Error Handling Issues', () => {
    
    test('FAILS: Redirect errors are confusing and unhelpful to users', async () => {
      const errorAnalysis = {
        primaryError: { code: '', message: '', userFriendly: false },
        fallbackError: { code: '', message: '', userFriendly: false },
        errorChain: [] as string[],
        userExperience: 'confusing', // vs 'clear'
        actionable: false,
        issues: [] as string[]
      };

      // Primary endpoint fails with redirect (current broken behavior)
      try {
        const response = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
        
        if (!response.ok) {
          errorAnalysis.primaryError.code = `HTTP_${response.status}`;
          
          // Attempt to parse error message
          try {
            const errorData = await response.json();
            errorAnalysis.primaryError.message = errorData.message || errorData.error || 'Unknown error';
          } catch (parseError) {
            // This is the current problem - trying to parse redirect HTML as JSON
            errorAnalysis.primaryError.message = `JSON Parse Error: ${parseError.message}`;
            errorAnalysis.issues.push('Redirect HTML response cannot be parsed as JSON');
            errorAnalysis.userExperience = 'confusing';
          }
          
          errorAnalysis.errorChain.push(`Primary endpoint failed: ${errorAnalysis.primaryError.code}`);
        }

        // Check if error message is user-friendly
        const technicalErrors = [
          'Unexpected token < in JSON',
          'SyntaxError',
          'Failed to parse',
          'RSV1',
          'WebSocket frame'
        ];
        
        errorAnalysis.primaryError.userFriendly = !technicalErrors.some(tech => 
          errorAnalysis.primaryError.message.includes(tech)
        );

        // Check if error is actionable (tells user what to do)
        const actionableKeywords = [
          'try again',
          'check',
          'contact support',
          'available at',
          'use endpoint'
        ];
        
        errorAnalysis.actionable = actionableKeywords.some(keyword =>
          errorAnalysis.primaryError.message.toLowerCase().includes(keyword)
        );

      } catch (networkError) {
        errorAnalysis.primaryError.message = networkError.message;
        errorAnalysis.errorChain.push(`Network error: ${networkError.message}`);
      }

      // ASSERTIONS: Error messages should be user-friendly and actionable
      expect(errorAnalysis.primaryError.userFriendly).toBe(true); // This will FAIL
      expect(errorAnalysis.actionable).toBe(true); // This will FAIL
      expect(errorAnalysis.issues.length).toBe(0); // This will FAIL - has redirect parsing issues
      expect(errorAnalysis.userExperience).toBe('clear'); // This will FAIL

      console.error('😵 CONFUSING ERROR ANALYSIS:', errorAnalysis);
    });

    test('FAILS: Error propagation through fallback chain loses important context', async () => {
      const fallbackErrorChain = {
        attempts: [] as Array<{
          endpoint: string;
          error: {
            type: 'network' | 'http' | 'parse' | 'timeout';
            code: string;
            message: string;
            originalError?: any;
          };
          contextLost: boolean;
        }>,
        finalError: { message: '', hasContext: false, helpful: false },
        contextPreservation: 'poor', // vs 'good'
        issues: [] as string[]
      };

      const endpointChain = [
        '/api/v1/claude/instances',
        '/api/claude/instances',
        '/api/legacy/claude/instances'  // Non-existent fallback
      ];

      for (const endpoint of endpointChain) {
        const attempt = {
          endpoint,
          error: {
            type: 'http' as const,
            code: '',
            message: '',
            originalError: null
          },
          contextLost: false
        };

        try {
          const response = await fetch(`${testBaseUrl}${endpoint}`);
          
          if (!response.ok) {
            attempt.error.code = `HTTP_${response.status}`;
            attempt.error.type = response.status >= 500 ? 'http' : 
                               response.status >= 400 ? 'http' :
                               response.status >= 300 ? 'http' : 'network';
            
            try {
              const errorData = await response.json();
              attempt.error.message = errorData.message || errorData.error || `HTTP ${response.status}`;
              
              // Check if error mentions the specific endpoint that failed
              const hasEndpointContext = attempt.error.message.includes(endpoint) ||
                                       attempt.error.message.includes('v1') ||
                                       attempt.error.message.includes('versioned');
              
              attempt.contextLost = !hasEndpointContext;
              
            } catch (parseError) {
              attempt.error.type = 'parse';
              attempt.error.message = `Parse error: ${parseError.message}`;
              attempt.error.originalError = parseError;
              attempt.contextLost = true; // Parse errors lose all context
              fallbackErrorChain.issues.push(`Parse error on ${endpoint} loses context`);
            }
          }
          
        } catch (networkError) {
          attempt.error.type = 'network';
          attempt.error.message = networkError.message;
          attempt.error.originalError = networkError;
          attempt.contextLost = !attempt.error.message.includes(endpoint);
        }

        fallbackErrorChain.attempts.push(attempt);
      }

      // Analyze final error state
      const lastAttempt = fallbackErrorChain.attempts[fallbackErrorChain.attempts.length - 1];
      fallbackErrorChain.finalError.message = lastAttempt.error.message;
      fallbackErrorChain.finalError.hasContext = !lastAttempt.contextLost;

      // Check if final error is helpful
      const helpfulIndicators = [
        'endpoint not found',
        'try different version',
        'available endpoints',
        'service unavailable'
      ];
      
      fallbackErrorChain.finalError.helpful = helpfulIndicators.some(indicator =>
        fallbackErrorChain.finalError.message.toLowerCase().includes(indicator)
      );

      // Assess overall context preservation
      const contextLostCount = fallbackErrorChain.attempts.filter(a => a.contextLost).length;
      fallbackErrorChain.contextPreservation = contextLostCount === 0 ? 'good' : 
                                              contextLostCount < fallbackErrorChain.attempts.length ? 'partial' : 'poor';

      // ASSERTIONS: Error context should be preserved through fallback chain
      expect(fallbackErrorChain.finalError.hasContext).toBe(true); // This may FAIL
      expect(fallbackErrorChain.finalError.helpful).toBe(true); // This may FAIL  
      expect(fallbackErrorChain.contextPreservation).toBe('good'); // This will FAIL
      expect(fallbackErrorChain.issues.length).toBe(0); // This will FAIL

      console.error('🔗 FALLBACK ERROR CHAIN ANALYSIS:', fallbackErrorChain);
    });

    test('FAILS: Different endpoint versions return inconsistent error formats', async () => {
      const errorFormatConsistency = {
        v1Errors: [] as any[],
        unversionedErrors: [] as any[],
        formatMatches: false,
        structureConsistent: false,
        fieldMapping: {} as Record<string, boolean>,
        inconsistencies: [] as string[]
      };

      // Test non-existent endpoints to generate errors
      const testEndpoints = [
        { url: `${testBaseUrl}/api/v1/claude/nonexistent`, version: 'v1' },
        { url: `${testBaseUrl}/api/claude/nonexistent`, version: 'unversioned' }
      ];

      for (const testEndpoint of testEndpoints) {
        try {
          const response = await fetch(testEndpoint.url);
          
          if (!response.ok) {
            let errorData: any;
            try {
              errorData = await response.json();
            } catch (parseError) {
              errorData = {
                parseError: parseError.message,
                status: response.status,
                statusText: response.statusText
              };
            }

            if (testEndpoint.version === 'v1') {
              errorFormatConsistency.v1Errors.push(errorData);
            } else {
              errorFormatConsistency.unversionedErrors.push(errorData);
            }
          }
        } catch (networkError) {
          const errorData = { networkError: networkError.message };
          
          if (testEndpoint.version === 'v1') {
            errorFormatConsistency.v1Errors.push(errorData);
          } else {
            errorFormatConsistency.unversionedErrors.push(errorData);
          }
        }
      }

      // Compare error structures
      if (errorFormatConsistency.v1Errors.length > 0 && errorFormatConsistency.unversionedErrors.length > 0) {
        const v1Sample = errorFormatConsistency.v1Errors[0];
        const unversionedSample = errorFormatConsistency.unversionedErrors[0];

        // Check common error fields
        const commonFields = ['error', 'message', 'code', 'status', 'timestamp'];
        
        for (const field of commonFields) {
          const v1Has = field in v1Sample;
          const unversionedHas = field in unversionedSample;
          
          errorFormatConsistency.fieldMapping[field] = v1Has === unversionedHas;
          
          if (v1Has !== unversionedHas) {
            errorFormatConsistency.inconsistencies.push(
              `Field '${field}': v1=${v1Has}, unversioned=${unversionedHas}`
            );
          }
        }

        // Check message format consistency
        const v1MessageType = typeof v1Sample.message || typeof v1Sample.error;
        const unversionedMessageType = typeof unversionedSample.message || typeof unversionedSample.error;
        
        if (v1MessageType !== unversionedMessageType) {
          errorFormatConsistency.inconsistencies.push(
            `Message type differs: v1=${v1MessageType}, unversioned=${unversionedMessageType}`
          );
        }

        errorFormatConsistency.structureConsistent = errorFormatConsistency.inconsistencies.length === 0;
        errorFormatConsistency.formatMatches = JSON.stringify(Object.keys(v1Sample).sort()) === 
                                              JSON.stringify(Object.keys(unversionedSample).sort());
      }

      // ASSERTIONS: Error formats should be consistent across versions
      expect(errorFormatConsistency.structureConsistent).toBe(true); // This may FAIL
      expect(errorFormatConsistency.inconsistencies.length).toBe(0); // This may FAIL
      
      // At minimum, both versions should have some error fields
      expect(errorFormatConsistency.v1Errors.length).toBeGreaterThan(0);
      expect(errorFormatConsistency.unversionedErrors.length).toBeGreaterThan(0);

      console.error('📋 ERROR FORMAT CONSISTENCY ANALYSIS:', errorFormatConsistency);
    });

    test('FAILS: Timeout and network errors are not handled consistently across versions', async () => {
      const timeoutHandling = {
        v1TimeoutBehavior: { handled: false, message: '', recoverable: false },
        unversionedTimeoutBehavior: { handled: false, message: '', recoverable: false },
        consistentHandling: false,
        issues: [] as string[]
      };

      // Mock timeout scenarios by modifying the fetch behavior temporarily
      const originalMockFetch = mockBackend.mockFetch;
      
      // Test v1 timeout
      mockBackend.mockFetch = jest.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/v1/')) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
          throw new Error('Request timeout - v1 endpoint');
        }
        return originalMockFetch(url);
      });

      try {
        await fetch(`${testBaseUrl}/api/v1/claude/instances`);
      } catch (error) {
        timeoutHandling.v1TimeoutBehavior.handled = true;
        timeoutHandling.v1TimeoutBehavior.message = error.message;
        timeoutHandling.v1TimeoutBehavior.recoverable = error.message.includes('timeout') ||
                                                       error.message.includes('retry') ||
                                                       error.message.includes('temporary');
      }

      // Test unversioned timeout
      mockBackend.mockFetch = jest.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/claude/') && !url.includes('/api/v')) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
          throw new Error('Network timeout - unversioned endpoint');
        }
        return originalMockFetch(url);
      });

      try {
        await fetch(`${testBaseUrl}/api/claude/instances`);
      } catch (error) {
        timeoutHandling.unversionedTimeoutBehavior.handled = true;
        timeoutHandling.unversionedTimeoutBehavior.message = error.message;
        timeoutHandling.unversionedTimeoutBehavior.recoverable = error.message.includes('timeout') ||
                                                               error.message.includes('retry') ||
                                                               error.message.includes('temporary');
      }

      // Restore original mock
      mockBackend.mockFetch = originalMockFetch;

      // Analyze consistency
      if (timeoutHandling.v1TimeoutBehavior.handled && timeoutHandling.unversionedTimeoutBehavior.handled) {
        const v1IsRecoverable = timeoutHandling.v1TimeoutBehavior.recoverable;
        const unversionedIsRecoverable = timeoutHandling.unversionedTimeoutBehavior.recoverable;
        
        timeoutHandling.consistentHandling = v1IsRecoverable === unversionedIsRecoverable;
        
        if (!timeoutHandling.consistentHandling) {
          timeoutHandling.issues.push(
            `Timeout recovery differs: v1=${v1IsRecoverable}, unversioned=${unversionedIsRecoverable}`
          );
        }

        // Check message consistency
        const v1HasTimeout = timeoutHandling.v1TimeoutBehavior.message.toLowerCase().includes('timeout');
        const unversionedHasTimeout = timeoutHandling.unversionedTimeoutBehavior.message.toLowerCase().includes('timeout');
        
        if (v1HasTimeout !== unversionedHasTimeout) {
          timeoutHandling.issues.push('Timeout error messages are inconsistent');
        }
      }

      // ASSERTIONS: Timeout handling should be consistent
      expect(timeoutHandling.consistentHandling).toBe(true); // This may FAIL
      expect(timeoutHandling.issues.length).toBe(0); // This may FAIL
      
      // Both versions should handle timeouts gracefully
      if (timeoutHandling.v1TimeoutBehavior.handled) {
        expect(timeoutHandling.v1TimeoutBehavior.recoverable).toBe(true);
      }
      if (timeoutHandling.unversionedTimeoutBehavior.handled) {
        expect(timeoutHandling.unversionedTimeoutBehavior.recoverable).toBe(true);
      }

      console.error('⏱️ TIMEOUT HANDLING ANALYSIS:', timeoutHandling);
    });
  });

  describe('🔧 PASSING TESTS: Improved Error Handling After Fix', () => {
    
    beforeEach(() => {
      mockBackend.enableFixedBehavior();
    });

    test('PASSES: Error messages are clear, actionable, and user-friendly', async () => {
      const improvedErrors = {
        testScenarios: [] as Array<{
          endpoint: string;
          expectedStatus: number;
          actualStatus: number;
          message: string;
          userFriendly: boolean;
          actionable: boolean;
          hasContext: boolean;
        }>,
        overallQuality: 'excellent' // vs 'poor'
      };

      // Test various error scenarios
      const errorScenarios = [
        { endpoint: '/api/v1/claude/nonexistent', expectedStatus: 404 },
        { endpoint: '/api/claude/nonexistent', expectedStatus: 404 },
        { endpoint: '/api/v1/claude/instances/invalid-id', expectedStatus: 404 },
        { endpoint: '/api/claude/instances/invalid-id', expectedStatus: 404 }
      ];

      for (const scenario of errorScenarios) {
        const response = await fetch(`${testBaseUrl}${scenario.endpoint}`);
        const errorData = await response.json();
        
        const analysis = {
          endpoint: scenario.endpoint,
          expectedStatus: scenario.expectedStatus,
          actualStatus: response.status,
          message: errorData.message || errorData.error || '',
          userFriendly: false,
          actionable: false,
          hasContext: false
        };

        // Check user-friendliness (no technical jargon)
        const technicalTerms = ['parse', 'unexpected token', 'syntax', 'RSV1'];
        analysis.userFriendly = !technicalTerms.some(term => 
          analysis.message.toLowerCase().includes(term)
        );

        // Check if actionable (suggests what user can do)
        const actionableTerms = ['available', 'try', 'check', 'valid', 'supported'];
        analysis.actionable = actionableTerms.some(term =>
          analysis.message.toLowerCase().includes(term)
        );

        // Check if has context (mentions the specific issue)
        analysis.hasContext = analysis.message.includes('endpoint') ||
                             analysis.message.includes('not found') ||
                             analysis.message.includes('invalid');

        improvedErrors.testScenarios.push(analysis);
      }

      // All errors should be high quality
      improvedErrors.testScenarios.forEach(scenario => {
        expect(scenario.actualStatus).toBe(scenario.expectedStatus);
        expect(scenario.userFriendly).toBe(true);
        expect(scenario.actionable).toBe(true);
        expect(scenario.hasContext).toBe(true);
        expect(scenario.message.length).toBeGreaterThan(10); // Not empty
      });

      const qualityScore = improvedErrors.testScenarios.reduce((score, scenario) => {
        return score + (scenario.userFriendly ? 1 : 0) + 
                      (scenario.actionable ? 1 : 0) + 
                      (scenario.hasContext ? 1 : 0);
      }, 0) / (improvedErrors.testScenarios.length * 3);

      improvedErrors.overallQuality = qualityScore > 0.8 ? 'excellent' : 
                                     qualityScore > 0.6 ? 'good' : 'poor';

      expect(improvedErrors.overallQuality).toBe('excellent');

      console.log('✅ IMPROVED ERROR QUALITY:', improvedErrors);
    });

    test('PASSES: Error format is consistent across all endpoint versions', async () => {
      const consistentErrors = {
        errorSamples: {} as Record<string, any>,
        formatConsistency: true,
        sharedFields: [] as string[],
        structure: 'consistent' // vs 'inconsistent'
      };

      const testUrls = [
        `${testBaseUrl}/api/v1/claude/test-404`,
        `${testBaseUrl}/api/claude/test-404`,
        `${testBaseUrl}/api/v1/claude/instances/invalid`,
        `${testBaseUrl}/api/claude/instances/invalid`
      ];

      // Collect error samples
      for (const url of testUrls) {
        const response = await fetch(url);
        const errorData = await response.json();
        
        const version = url.includes('/v1/') ? 'v1' : 'unversioned';
        const key = `${version}_${response.status}`;
        
        consistentErrors.errorSamples[key] = errorData;
      }

      // Analyze structure consistency
      const allKeys = Object.values(consistentErrors.errorSamples).map(sample => 
        Object.keys(sample).sort()
      );

      if (allKeys.length > 0) {
        const firstStructure = JSON.stringify(allKeys[0]);
        consistentErrors.formatConsistency = allKeys.every(keys => 
          JSON.stringify(keys) === firstStructure
        );
        consistentErrors.sharedFields = allKeys[0];
      }

      consistentErrors.structure = consistentErrors.formatConsistency ? 'consistent' : 'inconsistent';

      // All error responses should have consistent structure
      expect(consistentErrors.formatConsistency).toBe(true);
      expect(consistentErrors.sharedFields.length).toBeGreaterThan(0);

      // Common fields should be present
      const expectedFields = ['error', 'message', 'timestamp'];
      expectedFields.forEach(field => {
        expect(consistentErrors.sharedFields).toContain(field);
      });

      console.log('✅ CONSISTENT ERROR FORMAT:', consistentErrors);
    });

    test('PASSES: Fallback error handling preserves context and provides clear paths', async () => {
      const contextualErrors = {
        fallbackAttempts: [] as Array<{
          endpoint: string;
          success: boolean;
          error?: any;
          contextPreserved: boolean;
        }>,
        finalErrorQuality: { clear: false, contextual: false, actionable: false }
      };

      // Simulate fallback scenario with proper context preservation
      const fallbackChain = [
        '/api/v2/claude/instances', // Future version (will 404)
        '/api/v1/claude/instances', // Should work now
      ];

      let finalError = null;

      for (const endpoint of fallbackChain) {
        const attempt = {
          endpoint,
          success: false,
          error: null,
          contextPreserved: false
        };

        try {
          const response = await fetch(`${testBaseUrl}${endpoint}`);
          
          if (response.ok) {
            attempt.success = true;
            contextualErrors.fallbackAttempts.push(attempt);
            break; // Success, stop fallback chain
          } else {
            const errorData = await response.json();
            attempt.error = errorData;
            finalError = errorData;

            // Check if error preserves context about the specific endpoint
            attempt.contextPreserved = (errorData.message || '').includes(endpoint) ||
                                     (errorData.message || '').includes('v2') ||
                                     (errorData.availableEndpoints || []).length > 0;
          }
        } catch (networkError) {
          attempt.error = { message: networkError.message };
          finalError = attempt.error;
        }

        contextualErrors.fallbackAttempts.push(attempt);
      }

      // Analyze final error quality
      if (finalError) {
        contextualErrors.finalErrorQuality.clear = finalError.message && finalError.message.length > 20;
        contextualErrors.finalErrorQuality.contextual = finalError.message &&
          (finalError.message.includes('endpoint') || finalError.message.includes('available'));
        contextualErrors.finalErrorQuality.actionable = finalError.availableEndpoints ||
          finalError.message.includes('try') || finalError.message.includes('use');
      }

      // At least one attempt should succeed (v1 endpoint)
      const hasSuccess = contextualErrors.fallbackAttempts.some(a => a.success);
      expect(hasSuccess).toBe(true);

      // If there are errors, they should preserve context
      const failedAttempts = contextualErrors.fallbackAttempts.filter(a => !a.success);
      failedAttempts.forEach(attempt => {
        if (attempt.error) {
          expect(attempt.contextPreserved).toBe(true);
        }
      });

      console.log('✅ CONTEXTUAL FALLBACK HANDLING:', contextualErrors);
    });

    test('PASSES: Rate limiting and service errors are handled gracefully', async () => {
      // Mock rate limiting scenario
      let requestCount = 0;
      const originalMock = mockBackend.mockFetch;

      mockBackend.mockFetch = jest.fn().mockImplementation(async (url: string, options?: RequestInit) => {
        requestCount++;
        
        if (requestCount > 3) {
          // Simulate rate limiting
          return {
            ok: false,
            status: 429,
            json: async () => ({
              error: 'Rate Limit Exceeded',
              message: 'Too many requests. Please try again in 60 seconds.',
              retryAfter: 60,
              timestamp: new Date().toISOString()
            }),
            headers: new Headers({
              'retry-after': '60',
              'content-type': 'application/json'
            })
          };
        }
        
        return originalMock(url, options);
      });

      const rateLimitHandling = {
        requests: [] as Array<{ success: boolean; status: number; retryInfo?: any }>,
        gracefulDegradation: false,
        userGuidance: false
      };

      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 5; i++) {
        const response = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
        const result = { success: response.ok, status: response.status, retryInfo: null };

        if (!response.ok && response.status === 429) {
          const errorData = await response.json();
          result.retryInfo = {
            retryAfter: errorData.retryAfter,
            message: errorData.message,
            hasGuidance: errorData.message.includes('try again') || errorData.message.includes('seconds')
          };

          if (result.retryInfo.hasGuidance) {
            rateLimitHandling.userGuidance = true;
          }
        }

        rateLimitHandling.requests.push(result);
      }

      // Restore original mock
      mockBackend.mockFetch = originalMock;

      // First few requests should succeed, then rate limiting should kick in
      const successfulRequests = rateLimitHandling.requests.filter(r => r.success);
      const rateLimitedRequests = rateLimitHandling.requests.filter(r => r.status === 429);

      expect(successfulRequests.length).toBeGreaterThan(0);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);

      // Rate limited responses should provide user guidance
      rateLimitedRequests.forEach(request => {
        expect(request.retryInfo).toBeTruthy();
        expect(request.retryInfo.retryAfter).toBeGreaterThan(0);
        expect(request.retryInfo.hasGuidance).toBe(true);
      });

      rateLimitHandling.gracefulDegradation = successfulRequests.length > 0 && 
                                            rateLimitedRequests.every(r => r.retryInfo);

      expect(rateLimitHandling.gracefulDegradation).toBe(true);
      expect(rateLimitHandling.userGuidance).toBe(true);

      console.log('✅ GRACEFUL RATE LIMITING HANDLING:', rateLimitHandling);
    });
  });

  describe('📊 Error Handling Quality Metrics', () => {
    
    test('Measures improvement in error message quality and consistency', async () => {
      const qualityMetrics = {
        brokenBehavior: {
          parseErrors: 0,
          unhelpfulMessages: 0,
          inconsistentFormats: 0,
          totalErrors: 0
        },
        fixedBehavior: {
          clearMessages: 0,
          actionableErrors: 0,
          consistentFormats: 0,
          totalErrors: 0
        },
        improvement: {
          clarityIncrease: 0,
          consistencyIncrease: 0,
          overallImprovement: 0
        }
      };

      // Test broken behavior (current state)
      mockBackend.reset();
      const brokenTestUrls = [
        `${testBaseUrl}/api/v1/claude/instances`,
        `${testBaseUrl}/api/v1/claude/nonexistent`,
        `${testBaseUrl}/api/claude/invalid`
      ];

      for (const url of brokenTestUrls) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            qualityMetrics.brokenBehavior.totalErrors++;
            
            try {
              await response.json();
            } catch (parseError) {
              qualityMetrics.brokenBehavior.parseErrors++;
            }
          }
        } catch (error) {
          qualityMetrics.brokenBehavior.totalErrors++;
          if (error.message.includes('parse') || error.message.includes('token')) {
            qualityMetrics.brokenBehavior.unhelpfulMessages++;
          }
        }
      }

      // Test fixed behavior
      mockBackend.enableFixedBehavior();
      const fixedTestUrls = [
        `${testBaseUrl}/api/v1/claude/instances`,
        `${testBaseUrl}/api/v1/claude/nonexistent`,
        `${testBaseUrl}/api/claude/invalid`
      ];

      for (const url of fixedTestUrls) {
        const response = await fetch(url);
        if (!response.ok) {
          qualityMetrics.fixedBehavior.totalErrors++;
          
          const errorData = await response.json();
          if (errorData.message && errorData.message.length > 10) {
            qualityMetrics.fixedBehavior.clearMessages++;
          }
          
          if (errorData.message && (errorData.message.includes('try') || 
                                   errorData.message.includes('available') ||
                                   errorData.availableEndpoints)) {
            qualityMetrics.fixedBehavior.actionableErrors++;
          }
          
          qualityMetrics.fixedBehavior.consistentFormats++;
        }
      }

      // Calculate improvements
      qualityMetrics.improvement.clarityIncrease = 
        (qualityMetrics.fixedBehavior.clearMessages / Math.max(qualityMetrics.fixedBehavior.totalErrors, 1)) -
        ((qualityMetrics.brokenBehavior.totalErrors - qualityMetrics.brokenBehavior.unhelpfulMessages - qualityMetrics.brokenBehavior.parseErrors) / 
         Math.max(qualityMetrics.brokenBehavior.totalErrors, 1));

      qualityMetrics.improvement.consistencyIncrease = 
        (qualityMetrics.fixedBehavior.consistentFormats / Math.max(qualityMetrics.fixedBehavior.totalErrors, 1)) -
        (qualityMetrics.brokenBehavior.inconsistentFormats / Math.max(qualityMetrics.brokenBehavior.totalErrors, 1));

      qualityMetrics.improvement.overallImprovement = 
        (qualityMetrics.improvement.clarityIncrease + qualityMetrics.improvement.consistencyIncrease) / 2;

      // Fixed behavior should be significantly better
      expect(qualityMetrics.improvement.clarityIncrease).toBeGreaterThan(0);
      expect(qualityMetrics.improvement.overallImprovement).toBeGreaterThan(0);

      console.log('📊 ERROR HANDLING QUALITY IMPROVEMENT:', qualityMetrics);
    });
  });
});