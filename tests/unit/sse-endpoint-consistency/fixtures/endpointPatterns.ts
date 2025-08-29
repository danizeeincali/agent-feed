/**
 * SSE Endpoint Pattern Fixtures
 * Defines expected URL patterns and API versioning standards for testing
 */

export interface EndpointPattern {
  name: string;
  frontend: string;
  backend: string;
  version: string;
  description: string;
  shouldMatch: boolean;
}

export interface APIVersionPattern {
  version: string;
  baseUrl: string;
  endpoints: string[];
  deprecated?: boolean;
}

/**
 * Current SSE endpoint patterns that should be consistent between frontend and backend
 * These tests will FAIL initially due to URL mismatches
 */
export const SSE_ENDPOINT_PATTERNS: EndpointPattern[] = [
  {
    name: 'Terminal Stream Connection',
    frontend: '/api/claude/instances/{instanceId}/terminal/stream',
    backend: '/api/v1/claude/instances/{instanceId}/terminal/stream',
    version: 'v1',
    description: 'SSE stream endpoint for terminal output',
    shouldMatch: false // CURRENTLY MISMATCHED - will fail test
  },
  {
    name: 'Terminal Input Command',
    frontend: '/api/claude/instances/{instanceId}/terminal/input',
    backend: '/api/v1/claude/instances/{instanceId}/terminal/input',
    version: 'v1',
    description: 'POST endpoint for sending terminal commands',
    shouldMatch: false // CURRENTLY MISMATCHED - will fail test
  },
  {
    name: 'Terminal Polling Fallback',
    frontend: '/api/v1/claude/instances/{instanceId}/terminal/poll',
    backend: '/api/v1/claude/instances/{instanceId}/terminal/poll',
    version: 'v1',
    description: 'HTTP polling fallback for terminal output',
    shouldMatch: true // CORRECTLY MATCHED
  },
  {
    name: 'Instance Creation',
    frontend: '/api/claude/instances',
    backend: '/api/v1/claude/instances',
    version: 'v1',
    description: 'POST endpoint for creating Claude instances',
    shouldMatch: false // CURRENTLY MISMATCHED - will fail test
  },
  {
    name: 'Instance Status',
    frontend: '/api/claude/instances/{instanceId}',
    backend: '/api/v1/claude/instances/{instanceId}',
    version: 'v1',
    description: 'GET endpoint for instance status',
    shouldMatch: false // CURRENTLY MISMATCHED - will fail test
  },
  {
    name: 'SSE Connection Status',
    frontend: '/api/v1/claude/instances/{instanceId}/sse/status',
    backend: '/api/v1/claude/instances/{instanceId}/sse/status',
    version: 'v1',
    description: 'GET SSE connection health and metrics',
    shouldMatch: true // CORRECTLY MATCHED
  }
];

/**
 * API versioning patterns that should be consistent
 */
export const API_VERSIONING_PATTERNS: APIVersionPattern[] = [
  {
    version: 'v1',
    baseUrl: '/api/v1',
    endpoints: [
      '/claude/instances',
      '/claude/instances/{instanceId}',
      '/claude/instances/{instanceId}/terminal/stream',
      '/claude/instances/{instanceId}/terminal/input',
      '/claude/instances/{instanceId}/terminal/poll',
      '/claude/instances/{instanceId}/sse/status',
      '/sse/statistics',
      '/sse/flush-buffers'
    ],
    deprecated: false
  },
  {
    version: 'unversioned',
    baseUrl: '/api',
    endpoints: [
      '/claude/instances',
      '/claude/instances/{instanceId}',
      '/claude/instances/{instanceId}/terminal/stream',
      '/claude/instances/{instanceId}/terminal/input'
    ],
    deprecated: true // These should be migrated to v1
  }
];

/**
 * Test scenarios for URL construction validation
 */
export const URL_CONSTRUCTION_TEST_CASES = [
  {
    name: 'Basic SSE Connection',
    baseUrl: 'http://localhost:3000',
    instanceId: 'test-instance-123',
    expectedBackend: 'http://localhost:3000/api/v1/claude/instances/test-instance-123/terminal/stream',
    currentFrontend: 'http://localhost:3000/api/claude/instances/test-instance-123/terminal/stream',
    shouldMatch: false
  },
  {
    name: 'HTTPS Production Environment',
    baseUrl: 'https://production.example.com',
    instanceId: 'prod-instance-456',
    expectedBackend: 'https://production.example.com/api/v1/claude/instances/prod-instance-456/terminal/stream',
    currentFrontend: 'https://production.example.com/api/claude/instances/prod-instance-456/terminal/stream',
    shouldMatch: false
  },
  {
    name: 'Localhost with Port',
    baseUrl: 'http://127.0.0.1:3000',
    instanceId: 'local-test-789',
    expectedBackend: 'http://127.0.0.1:3000/api/v1/claude/instances/local-test-789/terminal/stream',
    currentFrontend: 'http://127.0.0.1:3000/api/claude/instances/local-test-789/terminal/stream',
    shouldMatch: false
  }
];

/**
 * Expected error patterns when URLs mismatch
 */
export const EXPECTED_ERROR_PATTERNS = [
  {
    errorType: '404_NOT_FOUND',
    pattern: /404|Not Found/i,
    description: 'Backend endpoint not found due to URL mismatch',
    expectedWhenMismatched: true
  },
  {
    errorType: 'CORS_ERROR',
    pattern: /CORS|Cross-Origin/i,
    description: 'CORS issues due to incorrect endpoint URLs',
    expectedWhenMismatched: true
  },
  {
    errorType: 'CONNECTION_FAILED',
    pattern: /Failed to fetch|Connection failed/i,
    description: 'Connection failure due to non-existent endpoints',
    expectedWhenMismatched: true
  },
  {
    errorType: 'SSE_ERROR',
    pattern: /EventSource failed|SSE connection error/i,
    description: 'SSE connection errors due to URL mismatches',
    expectedWhenMismatched: true
  }
];

/**
 * Recovery patterns after URL fixes
 */
export const RECOVERY_PATTERNS = [
  {
    name: 'Successful SSE Connection',
    pattern: /SSE connection opened|Connected successfully/i,
    expectedAfterFix: true
  },
  {
    name: 'Instance Creation Success',
    pattern: /Instance created|Creation successful/i,
    expectedAfterFix: true
  },
  {
    name: 'Terminal Stream Active',
    pattern: /Terminal stream active|Stream established/i,
    expectedAfterFix: true
  }
];

export default {
  SSE_ENDPOINT_PATTERNS,
  API_VERSIONING_PATTERNS,
  URL_CONSTRUCTION_TEST_CASES,
  EXPECTED_ERROR_PATTERNS,
  RECOVERY_PATTERNS
};