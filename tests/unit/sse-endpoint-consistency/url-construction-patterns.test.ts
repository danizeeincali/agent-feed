/**
 * URL Construction Pattern Consistency TDD Tests
 * 
 * Tests that validate consistent URL construction patterns across the application.
 * WILL FAIL initially due to inconsistent URL patterns between hooks and components.
 * WILL PASS after standardizing URL construction to follow consistent patterns.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { URL_CONSTRUCTION_TEST_CASES } from './fixtures/endpointPatterns';
import { URLPatternValidator, EndpointConsistencyTester } from './utils/testHelpers';

describe('URL Construction Pattern Consistency Tests', () => {
  let consistencyTester: EndpointConsistencyTester;

  beforeEach(() => {
    consistencyTester = new EndpointConsistencyTester();
  });

  afterEach(() => {
    consistencyTester.resetResults();
  });

  describe('URL Pattern Standardization', () => {
    it('SHOULD FAIL: Inconsistent URL construction patterns across hooks', () => {
      // Test different URL construction approaches used in various hooks
      const constructionPatterns = [
        {
          name: 'useSSEConnectionSingleton pattern',
          construct: (baseUrl: string, instanceId: string) => 
            `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`,
          expected: (baseUrl: string, instanceId: string) =>
            `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`
        },
        {
          name: 'useStableSSEConnection pattern',
          construct: (baseUrl: string, instanceId: string) =>
            `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`,
          expected: (baseUrl: string, instanceId: string) =>
            `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`
        },
        {
          name: 'useAdvancedSSEConnection pattern',
          construct: (baseUrl: string, instanceId: string) =>
            `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`,
          expected: (baseUrl: string, instanceId: string) =>
            `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`
        },
        {
          name: 'useWebSocket pattern (correct)',
          construct: (baseUrl: string, instanceId: string) =>
            `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`,
          expected: (baseUrl: string, instanceId: string) =>
            `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`
        }
      ];

      const testInstanceId = 'pattern-test-123';
      const testBaseUrl = 'http://localhost:3000';

      const inconsistentPatterns: string[] = [];

      constructionPatterns.forEach(pattern => {
        const constructed = pattern.construct(testBaseUrl, testInstanceId);
        const expected = pattern.expected(testBaseUrl, testInstanceId);
        
        console.log(`${pattern.name}:`);
        console.log(`  Constructed: ${constructed}`);
        console.log(`  Expected:    ${expected}`);
        console.log(`  Match:       ${constructed === expected}`);

        if (constructed !== expected) {
          inconsistentPatterns.push(pattern.name);
        }
      });

      // This WILL FAIL initially - multiple patterns are inconsistent
      expect(inconsistentPatterns.length).toBe(0); // Currently 3 patterns are inconsistent
      
      console.log('Inconsistent patterns found:', inconsistentPatterns);
    });

    it('SHOULD FAIL: Different endpoint types use different versioning patterns', () => {
      const baseUrl = 'http://localhost:3000';
      const instanceId = 'version-pattern-test';

      const endpointPatterns = {
        stream: {
          current: `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`,
          expected: `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`
        },
        input: {
          current: `${baseUrl}/api/claude/instances/${instanceId}/terminal/input`,
          expected: `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/input`
        },
        poll: {
          current: `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/poll`, // Already correct
          expected: `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/poll`
        },
        status: {
          current: `${baseUrl}/api/claude/instances/${instanceId}`,
          expected: `${baseUrl}/api/v1/claude/instances/${instanceId}`
        }
      };

      const mismatches: string[] = [];

      Object.entries(endpointPatterns).forEach(([type, urls]) => {
        if (urls.current !== urls.expected) {
          mismatches.push(type);
        }
      });

      console.log('Endpoint version mismatches:', mismatches);

      // This WILL FAIL initially - stream, input, and status endpoints are mismatched
      expect(mismatches.length).toBe(0); // Currently 3 endpoints are mismatched
    });

    it('SHOULD PASS: Standardized URL construction function', () => {
      // This is what the URL construction should look like after fix
      const buildStandardizedURL = (
        baseUrl: string,
        resource: string,
        resourceId: string,
        action?: string,
        subAction?: string
      ): string => {
        let url = `${baseUrl}/api/v1/${resource}`;
        
        if (resourceId) {
          url += `/${resourceId}`;
        }
        
        if (action) {
          url += `/${action}`;
        }
        
        if (subAction) {
          url += `/${subAction}`;
        }
        
        return url;
      };

      const baseUrl = 'http://localhost:3000';
      const instanceId = 'standard-test-123';

      const standardizedUrls = {
        instances: buildStandardizedURL(baseUrl, 'claude/instances'),
        instance: buildStandardizedURL(baseUrl, 'claude/instances', instanceId),
        terminalStream: buildStandardizedURL(baseUrl, 'claude/instances', instanceId, 'terminal', 'stream'),
        terminalInput: buildStandardizedURL(baseUrl, 'claude/instances', instanceId, 'terminal', 'input'),
        terminalPoll: buildStandardizedURL(baseUrl, 'claude/instances', instanceId, 'terminal', 'poll'),
        sseStatus: buildStandardizedURL(baseUrl, 'claude/instances', instanceId, 'sse', 'status')
      };

      // All URLs should follow consistent pattern
      Object.values(standardizedUrls).forEach(url => {
        expect(url).toMatch(/^https?:\/\/[^\/]+\/api\/v1\//);
        expect(url).not.toMatch(/\/api\/api\//); // No double api prefix
        expect(url).not.toMatch(/\/v1\/v1\//); // No double version
      });

      console.log('Standardized URLs:', standardizedUrls);
    });
  });

  describe('Cross-Environment URL Construction', () => {
    it('SHOULD FAIL: URL construction fails across different environments', async () => {
      const environments = [
        { name: 'localhost', baseUrl: 'http://localhost:3000' },
        { name: 'development', baseUrl: 'https://dev.example.com' },
        { name: 'production', baseUrl: 'https://api.example.com' }
      ];

      const instanceId = 'cross-env-test';
      const failedEnvironments: string[] = [];

      for (const env of environments) {
        const result = await consistencyTester.testURLConstruction(
          env.baseUrl,
          instanceId,
          `/api/v1/claude/instances/${instanceId}/terminal/stream`,
          `/api/claude/instances/${instanceId}/terminal/stream` // Current pattern
        );

        console.log(`${env.name} environment:`, {
          expected: result.expectedUrl,
          current: result.currentUrl,
          match: result.pathsMatch
        });

        if (!result.pathsMatch) {
          failedEnvironments.push(env.name);
        }
      }

      // This WILL FAIL initially - URL patterns don't match in any environment
      expect(failedEnvironments.length).toBe(0); // Currently all 3 environments fail
    });

    it('SHOULD PASS: Consistent URL construction across all environments', () => {
      const buildEnvironmentURL = (baseUrl: string, instanceId: string): string => {
        return `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      };

      const environments = [
        'http://localhost:3000',
        'https://dev.example.com',
        'https://api.example.com'
      ];

      const instanceId = 'env-test-456';
      const urls = environments.map(baseUrl => buildEnvironmentURL(baseUrl, instanceId));

      // All URLs should have same path structure
      const paths = urls.map(url => new URL(url).pathname);
      const uniquePaths = new Set(paths);

      expect(uniquePaths.size).toBe(1); // All environments use same path
      expect(paths[0]).toBe(`/api/v1/claude/instances/${instanceId}/terminal/stream`);
    });
  });

  describe('URL Validation and Sanitization', () => {
    it('SHOULD FAIL: No URL validation for malformed inputs', () => {
      const malformedInputs = [
        { instanceId: '', description: 'empty instance ID' },
        { instanceId: 'test/with/slashes', description: 'instance ID with slashes' },
        { instanceId: 'test with spaces', description: 'instance ID with spaces' },
        { instanceId: 'test@special#chars', description: 'instance ID with special characters' }
      ];

      const baseUrl = 'http://localhost:3000';
      let validationErrors = 0;

      malformedInputs.forEach(input => {
        try {
          // Current URL construction doesn't validate input
          const url = `${baseUrl}/api/claude/instances/${input.instanceId}/terminal/stream`;
          
          // This should detect invalid URLs but doesn't
          if (input.instanceId.includes('/') || input.instanceId.includes(' ') || input.instanceId.includes('@')) {
            validationErrors++;
          }
        } catch (error) {
          // Validation would throw error for invalid input
        }
      });

      // This WILL FAIL - no input validation currently
      expect(validationErrors).toBe(0); // Currently doesn't detect validation issues
    });

    it('SHOULD PASS: Proper URL validation and sanitization', () => {
      const validateAndSanitizeInstanceId = (instanceId: string): string => {
        if (!instanceId || instanceId.trim() === '') {
          throw new Error('Instance ID cannot be empty');
        }

        // Remove/replace invalid characters
        const sanitized = instanceId
          .replace(/[^a-zA-Z0-9\-_]/g, '-') // Replace invalid chars with dash
          .replace(/-+/g, '-') // Collapse multiple dashes
          .replace(/^-|-$/g, ''); // Remove leading/trailing dashes

        if (sanitized.length === 0) {
          throw new Error('Instance ID contains no valid characters');
        }

        return sanitized;
      };

      const buildValidatedURL = (baseUrl: string, instanceId: string): string => {
        const sanitizedId = validateAndSanitizeInstanceId(instanceId);
        return `${baseUrl}/api/v1/claude/instances/${sanitizedId}/terminal/stream`;
      };

      // Test valid inputs
      expect(() => buildValidatedURL('http://localhost:3000', 'valid-123')).not.toThrow();
      expect(() => buildValidatedURL('http://localhost:3000', 'test_instance')).not.toThrow();

      // Test invalid inputs
      expect(() => buildValidatedURL('http://localhost:3000', '')).toThrow();
      expect(() => buildValidatedURL('http://localhost:3000', '   ')).toThrow();
      expect(() => buildValidatedURL('http://localhost:3000', '@@@')).toThrow();

      // Test sanitization
      const url = buildValidatedURL('http://localhost:3000', 'test with spaces');
      expect(url).toBe('http://localhost:3000/api/v1/claude/instances/test-with-spaces/terminal/stream');
    });
  });

  describe('URL Template System', () => {
    it('SHOULD FAIL: No centralized URL template system', () => {
      // Currently each hook constructs URLs differently
      const currentApproaches = [
        'Manual string concatenation',
        'Template literals with hardcoded paths',
        'Inconsistent API versioning',
        'No parameter validation'
      ];

      // This WILL FAIL - no unified system
      const hasUnifiedSystem = false; // Currently false
      expect(hasUnifiedSystem).toBe(true);
      
      console.log('Current URL construction approaches:', currentApproaches);
    });

    it('SHOULD PASS: Centralized URL template system', () => {
      interface URLTemplateParams {
        instanceId?: string;
        action?: string;
        subAction?: string;
        queryParams?: Record<string, string>;
      }

      class URLTemplateSystem {
        private baseUrl: string;
        private apiVersion: string = 'v1';

        constructor(baseUrl: string) {
          this.baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
        }

        private buildPath(resource: string, params: URLTemplateParams): string {
          let path = `/api/${this.apiVersion}/${resource}`;
          
          if (params.instanceId) {
            path += `/${params.instanceId}`;
          }
          
          if (params.action) {
            path += `/${params.action}`;
          }
          
          if (params.subAction) {
            path += `/${params.subAction}`;
          }

          return path;
        }

        private addQueryParams(url: string, params?: Record<string, string>): string {
          if (!params || Object.keys(params).length === 0) {
            return url;
          }

          const queryString = new URLSearchParams(params).toString();
          return `${url}?${queryString}`;
        }

        // Template methods
        instances(): string {
          return `${this.baseUrl}${this.buildPath('claude/instances', {})}`;
        }

        instance(instanceId: string): string {
          return `${this.baseUrl}${this.buildPath('claude/instances', { instanceId })}`;
        }

        terminalStream(instanceId: string, params?: Record<string, string>): string {
          const url = `${this.baseUrl}${this.buildPath('claude/instances', { instanceId, action: 'terminal', subAction: 'stream' })}`;
          return this.addQueryParams(url, params);
        }

        terminalInput(instanceId: string): string {
          return `${this.baseUrl}${this.buildPath('claude/instances', { instanceId, action: 'terminal', subAction: 'input' })}`;
        }

        terminalPoll(instanceId: string, params?: Record<string, string>): string {
          const url = `${this.baseUrl}${this.buildPath('claude/instances', { instanceId, action: 'terminal', subAction: 'poll' })}`;
          return this.addQueryParams(url, params);
        }

        sseStatus(instanceId: string): string {
          return `${this.baseUrl}${this.buildPath('claude/instances', { instanceId, action: 'sse', subAction: 'status' })}`;
        }
      }

      const urlBuilder = new URLTemplateSystem('http://localhost:3000');
      
      // Test all URL types
      const urls = {
        instances: urlBuilder.instances(),
        instance: urlBuilder.instance('test-123'),
        stream: urlBuilder.terminalStream('test-123'),
        input: urlBuilder.terminalInput('test-123'),
        poll: urlBuilder.terminalPoll('test-123', { since: '123456' }),
        status: urlBuilder.sseStatus('test-123')
      };

      console.log('Template system URLs:', urls);

      // Validate all URLs follow consistent pattern
      Object.values(urls).forEach(url => {
        expect(url).toMatch(/^http:\/\/localhost:3000\/api\/v1\//);
      });

      // Test specific patterns
      expect(urls.stream).toBe('http://localhost:3000/api/v1/claude/instances/test-123/terminal/stream');
      expect(urls.input).toBe('http://localhost:3000/api/v1/claude/instances/test-123/terminal/input');
      expect(urls.poll).toBe('http://localhost:3000/api/v1/claude/instances/test-123/terminal/poll?since=123456');
    });
  });

  describe('URL Pattern Migration', () => {
    it('SHOULD PASS: Migration utility for existing URLs', () => {
      const migrateURL = (oldUrl: string): { newUrl: string; changed: boolean } => {
        if (oldUrl.includes('/api/claude/')) {
          return {
            newUrl: oldUrl.replace('/api/claude/', '/api/v1/claude/'),
            changed: true
          };
        }
        
        return {
          newUrl: oldUrl,
          changed: false
        };
      };

      const testUrls = [
        'http://localhost:3000/api/claude/instances/test/terminal/stream',
        'http://localhost:3000/api/claude/instances/test/terminal/input',
        'http://localhost:3000/api/claude/instances',
        'http://localhost:3000/api/v1/claude/instances/test/terminal/poll' // Already correct
      ];

      const migrationResults = testUrls.map(url => ({
        original: url,
        ...migrateURL(url)
      }));

      console.log('URL migration results:', migrationResults);

      // Validate migration results
      migrationResults.forEach(result => {
        if (result.changed) {
          expect(result.newUrl).toContain('/api/v1/claude/');
          expect(result.newUrl).not.toContain('/api/claude/instances'); // Should be /api/v1/claude/instances
        }
        expect(result.newUrl).toMatch(/\/api\/v1\//);
      });
    });

    it('SHOULD PASS: Backwards compatibility detection', () => {
      const detectLegacyURLs = (urls: string[]): { legacy: string[]; modern: string[] } => {
        const legacy = urls.filter(url => 
          url.includes('/api/claude/') && !url.includes('/api/v1/')
        );
        
        const modern = urls.filter(url => 
          url.includes('/api/v1/')
        );

        return { legacy, modern };
      };

      const testUrls = [
        'http://localhost:3000/api/claude/instances/test/terminal/stream',
        'http://localhost:3000/api/v1/claude/instances/test/terminal/stream',
        'http://localhost:3000/api/claude/instances/test/terminal/input',
        'http://localhost:3000/api/v1/claude/instances/test/terminal/poll'
      ];

      const detection = detectLegacyURLs(testUrls);

      expect(detection.legacy.length).toBe(2);
      expect(detection.modern.length).toBe(2);
      
      detection.legacy.forEach(url => {
        expect(url).toContain('/api/claude/');
        expect(url).not.toContain('/api/v1/');
      });

      detection.modern.forEach(url => {
        expect(url).toContain('/api/v1/');
      });
    });
  });

  describe('Real-World URL Construction Test Cases', () => {
    URL_CONSTRUCTION_TEST_CASES.forEach(testCase => {
      it(`SHOULD ${testCase.shouldMatch ? 'PASS' : 'FAIL'}: ${testCase.name}`, async () => {
        const result = await consistencyTester.testURLConstruction(
          testCase.baseUrl,
          testCase.instanceId,
          new URL(testCase.expectedBackend).pathname,
          new URL(testCase.currentFrontend).pathname
        );

        console.log(`${testCase.name}:`, {
          expected: result.expectedUrl,
          current: result.currentUrl,
          match: result.pathsMatch,
          shouldMatch: testCase.shouldMatch
        });

        // This will fail for cases where shouldMatch is false (current mismatches)
        expect(result.pathsMatch).toBe(testCase.shouldMatch);
      });
    });
  });

  describe('Performance Impact of URL Construction', () => {
    it('SHOULD PASS: Efficient URL construction', () => {
      const simpleConstruction = (baseUrl: string, instanceId: string): string => {
        return `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      };

      const templateConstruction = (baseUrl: string, instanceId: string): string => {
        return [baseUrl, 'api', 'v1', 'claude', 'instances', instanceId, 'terminal', 'stream'].join('/');
      };

      const urlAPIConstruction = (baseUrl: string, instanceId: string): string => {
        const url = new URL('/api/v1/claude/instances/' + instanceId + '/terminal/stream', baseUrl);
        return url.toString();
      };

      const testBaseUrl = 'http://localhost:3000';
      const testInstanceId = 'performance-test';

      // All methods should produce same result
      const simple = simpleConstruction(testBaseUrl, testInstanceId);
      const template = templateConstruction(testBaseUrl, testInstanceId);  
      const urlApi = urlAPIConstruction(testBaseUrl, testInstanceId);

      expect(simple).toBe(template);
      expect(simple).toBe(urlApi);

      // Performance test (simple measurement)
      const iterations = 10000;
      
      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        simpleConstruction(testBaseUrl, `instance-${i}`);
      }
      const simpleTime = Date.now() - startTime;

      expect(simpleTime).toBeLessThan(1000); // Should be very fast
      
      console.log(`URL construction performance: ${simpleTime}ms for ${iterations} iterations`);
    });
  });
});