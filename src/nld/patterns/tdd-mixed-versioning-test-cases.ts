import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * TDD Test Cases for Mixed API Versioning Prevention
 * 
 * These test cases are generated based on real detected patterns
 * and provide comprehensive coverage for preventing mixed versioning
 * anti-patterns in API endpoint usage.
 */

export interface TDDTestCase {
  testName: string;
  description: string;
  testCode: string;
  expectedBehavior: string;
  preventionStrategy: string;
}

export class MixedVersioningTDDTestCases {
  private readonly testCasesPath: string;

  constructor() {
    this.testCasesPath = path.join(process.cwd(), 'src/nld/patterns/test-cases');
  }

  /**
   * Generate comprehensive TDD test cases
   */
  async generateTDDTestCases(): Promise<TDDTestCase[]> {
    const testCases: TDDTestCase[] = [
      {
        testName: 'should prevent mixed API versioning in Claude endpoints',
        description: 'Ensures all Claude-related endpoints use consistent versioning scheme',
        testCode: `
import { API_ENDPOINTS } from '../config/endpoints';

describe('Endpoint Consistency Prevention', () => {
  test('should prevent mixed API versioning in Claude endpoints', () => {
    const claudeEndpoints = Object.values(API_ENDPOINTS)
      .filter(endpoint => endpoint.includes('claude'));
    
    claudeEndpoints.forEach(endpoint => {
      // No endpoint should contain version numbers
      expect(endpoint).not.toMatch(/\\/api\\/v\\d+\\//); 
      // All should start with /api/ (not versioned)
      expect(endpoint).toMatch(/^\\/api\\/[^v]/);
    });
  });
});`,
        expectedBehavior: 'All Claude endpoints use unified /api/ prefix without version numbers',
        preventionStrategy: 'Centralized endpoint configuration'
      },
      {
        testName: 'should complete user workflow without mixed versioning',
        description: 'Tests complete Claude instance workflow for endpoint consistency',
        testCode: `
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClaudeInstanceManager } from '../components/ClaudeInstanceManager';

describe('Complete User Workflow - No Mixed Versioning', () => {
  test('should complete workflow without API inconsistencies', async () => {
    const apiCalls: string[] = [];
    const mockFetch = jest.fn().mockImplementation((url: string) => {
      apiCalls.push(url);
      return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ success: true, instanceId: 'claude-123' }) 
      });
    });
    global.fetch = mockFetch;
    
    render(<ClaudeInstanceManager />);
    
    // Simulate complete workflow
    fireEvent.click(screen.getByText('Launch Claude'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    
    // Verify no mixed versioning in API calls
    apiCalls.forEach(call => {
      if (call.includes('claude')) {
        expect(call).not.toMatch(/\\/api\\/v\\d+\\//);
        expect(call).toMatch(/^\\/api\\/claude\\//);
      }
    });
  });
});`,
        expectedBehavior: 'Complete user workflow uses consistent endpoint versioning',
        preventionStrategy: 'End-to-end workflow testing'
      },
      {
        testName: 'should validate backend redirects work correctly',
        description: 'Ensures versioned endpoints redirect to unversioned equivalents',
        testCode: `
describe('Backend Redirect Validation', () => {
  test('should redirect versioned endpoints correctly', async () => {
    const versionedEndpoints = [
      '/api/v1/claude/instances', 
      '/api/v2/claude/instances'
    ];
    
    for (const endpoint of versionedEndpoints) {
      const response = await fetch(endpoint, { redirect: 'manual' });
      expect(response.status).toBe(301);
      expect(response.headers.get('Location')).toBe('/api/claude/instances');
    }
  });
});`,
        expectedBehavior: 'All versioned endpoints redirect to unified unversioned endpoints',
        preventionStrategy: 'Consistent backend redirect rules'
      },
      {
        testName: 'should prevent hardcoded API paths in codebase',
        description: 'Detects and prevents hardcoded API endpoint usage',
        testCode: `
import { scanSourceFiles, findHardcodedApiPaths } from '../utils/codebase-scanner';

describe('Hardcoded Path Prevention', () => {
  test('should have no hardcoded API paths', () => {
    const codeFiles = scanSourceFiles();
    const hardcodedPaths = findHardcodedApiPaths(codeFiles);
    
    // Should have no hardcoded API paths
    expect(hardcodedPaths).toHaveLength(0);
  });
  
  test('should use centralized endpoint configuration', () => {
    // Verify all API calls use API_ENDPOINTS
    const apiCalls = extractApiCallsFromCode();
    apiCalls.forEach(call => {
      expect(call).toMatch(/API_ENDPOINTS\\./);
    });
  });
});`,
        expectedBehavior: 'No hardcoded API paths exist in codebase',
        preventionStrategy: 'Centralized configuration enforcement'
      },
      {
        testName: 'should handle EventSource connections consistently',
        description: 'Ensures SSE connections use consistent endpoint versioning',
        testCode: `
describe('EventSource Consistency', () => {
  test('should create EventSource with unified endpoints', () => {
    const instanceId = 'claude-test-456';
    
    const mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn()
    };
    global.EventSource = jest.fn(() => mockEventSource);

    const streamUrl = API_ENDPOINTS.CLAUDE_TERMINAL_STREAM(instanceId);
    new EventSource(streamUrl);

    expect(global.EventSource).toHaveBeenCalledWith(
      expect.not.stringMatching(/\\/api\\/v\\d+\\//);
    );
    expect(global.EventSource).toHaveBeenCalledWith(
      expect.stringContaining('/api/claude/instances/')
    );
  });
});`,
        expectedBehavior: 'EventSource connections use consistent endpoint scheme',
        preventionStrategy: 'Unified endpoint configuration for SSE'
      }
    ];

    await fs.mkdir(this.testCasesPath, { recursive: true });
    
    // Write each test case to separate file
    for (const testCase of testCases) {
      const filename = testCase.testName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + '.test.ts';
      const filePath = path.join(this.testCasesPath, filename);
      
      await fs.writeFile(filePath, testCase.testCode, 'utf-8');
    }

    console.log(`✅ Generated ${testCases.length} TDD test cases in: ${this.testCasesPath}`);
    return testCases;
  }

  /**
   * Generate test suite summary
   */
  async generateTestSuiteSummary(testCases: TDDTestCase[]): Promise<void> {
    const summary = {
      title: 'Mixed API Versioning Prevention - TDD Test Suite',
      description: 'Comprehensive test cases for preventing mixed API versioning anti-patterns',
      totalTestCases: testCases.length,
      testCategories: {
        endpointConsistency: testCases.filter(tc => tc.preventionStrategy.includes('configuration')).length,
        workflowTesting: testCases.filter(tc => tc.preventionStrategy.includes('workflow')).length,
        redirectValidation: testCases.filter(tc => tc.preventionStrategy.includes('redirect')).length,
        codebaseEnforcement: testCases.filter(tc => tc.preventionStrategy.includes('enforcement')).length
      },
      preventionStrategies: Array.from(new Set(testCases.map(tc => tc.preventionStrategy))),
      expectedOutcomes: testCases.map(tc => tc.expectedBehavior),
      implementationGuide: {
        step1: 'Run all test cases to establish baseline',
        step2: 'Implement centralized endpoint configuration',
        step3: 'Add backend redirect rules',
        step4: 'Configure development-time validation',
        step5: 'Integrate with CI/CD pipeline'
      }
    };

    const summaryPath = path.join(this.testCasesPath, 'test-suite-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`📋 Test suite summary generated: ${summaryPath}`);
  }
}

export default MixedVersioningTDDTestCases;