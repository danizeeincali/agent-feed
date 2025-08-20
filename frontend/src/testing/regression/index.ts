/**
 * Regression Test Framework - Main Export
 * Provides a unified interface to the complete regression testing system
 */

// Core framework
export { RegressionTestFramework } from './core/RegressionTestFramework';
export { TestRunner } from './core/TestRunner';
export { TestResultCollector } from './core/TestResultCollector';

// Managers
export { TestSuiteManager } from './managers/TestSuiteManager';
export { TestDocumentationManager } from './managers/TestDocumentationManager';

// Reporters
export { PMReportGenerator } from './reporters/PMReportGenerator';

// Workflow
export { ChangeVerificationWorkflow } from './workflow/ChangeVerificationWorkflow';

// NLD Integration
export { NLDIntegration } from './nld/NLDIntegration';

// Types
export * from './types';

/**
 * Factory function to create a complete regression test framework instance
 */
import {
  RegressionTestFramework,
  TestConfiguration,
  TestSuite,
  TestCase,
  TestCategory,
  TestPriority,
  TestStatus
} from './types';

export interface RegressionTestConfig extends TestConfiguration {
  outputDir?: string;
  enableNLD?: boolean;
  enableVerificationWorkflow?: boolean;
  generatePMReports?: boolean;
}

/**
 * Create and configure a complete regression test framework
 */
export function createRegressionFramework(config: RegressionTestConfig): RegressionTestFramework {
  const framework = new RegressionTestFramework(config);
  
  // Auto-initialize if needed
  framework.initialize().catch(error => {
    console.error('Failed to initialize regression framework:', error);
  });
  
  return framework;
}

/**
 * Helper function to create test cases
 */
export function createTestCase(options: {
  id: string;
  name: string;
  description: string;
  category: TestCategory;
  priority?: TestPriority;
  tags?: string[];
  timeout?: number;
  retries?: number;
  dependencies?: string[];
  execute: () => Promise<any>;
}): TestCase {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    category: options.category,
    priority: options.priority || TestPriority.MEDIUM,
    tags: options.tags || [],
    timeout: options.timeout,
    retries: options.retries,
    dependencies: options.dependencies,
    metadata: {},
    execute: async () => {
      const startTime = Date.now();
      let status = TestStatus.PASSED;
      let error: Error | undefined;
      let output: string | undefined;
      
      try {
        const result = await options.execute();
        if (result && typeof result === 'object' && 'output' in result) {
          output = result.output;
        }
      } catch (err) {
        status = TestStatus.FAILED;
        error = err instanceof Error ? err : new Error(String(err));
      }
      
      return {
        testId: options.id,
        status,
        duration: Date.now() - startTime,
        startTime: new Date(startTime),
        endTime: new Date(),
        error,
        output,
        logs: [],
        artifacts: []
      };
    }
  };
}

/**
 * Helper function to create test suites
 */
export function createTestSuite(options: {
  id: string;
  name: string;
  description: string;
  category: TestCategory;
  testCases: TestCase[];
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
}): TestSuite {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    category: options.category,
    testCases: options.testCases,
    beforeAll: options.beforeAll,
    afterAll: options.afterAll,
    beforeEach: options.beforeEach,
    afterEach: options.afterEach
  };
}

/**
 * Utility functions for common test patterns
 */
export const TestUtils = {
  /**
   * Create a simple assertion test case
   */
  createAssertionTest: (id: string, name: string, assertion: () => boolean | Promise<boolean>): TestCase => {
    return createTestCase({
      id,
      name,
      description: `Assertion test: ${name}`,
      category: TestCategory.UNIT,
      execute: async () => {
        const result = await assertion();
        if (!result) {
          throw new Error(`Assertion failed: ${name}`);
        }
        return { passed: true };
      }
    });
  },

  /**
   * Create an async operation test case
   */
  createAsyncTest: (
    id: string, 
    name: string, 
    operation: () => Promise<any>,
    validator?: (result: any) => boolean
  ): TestCase => {
    return createTestCase({
      id,
      name,
      description: `Async test: ${name}`,
      category: TestCategory.INTEGRATION,
      execute: async () => {
        const result = await operation();
        
        if (validator && !validator(result)) {
          throw new Error(`Validation failed for: ${name}`);
        }
        
        return { result, passed: true };
      }
    });
  },

  /**
   * Create a performance test case
   */
  createPerformanceTest: (
    id: string, 
    name: string, 
    operation: () => Promise<any>,
    maxDuration: number
  ): TestCase => {
    return createTestCase({
      id,
      name,
      description: `Performance test: ${name}`,
      category: TestCategory.PERFORMANCE,
      timeout: maxDuration * 2, // Allow some buffer
      execute: async () => {
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;
        
        if (duration > maxDuration) {
          throw new Error(`Performance test failed: took ${duration}ms, expected < ${maxDuration}ms`);
        }
        
        return { 
          result, 
          duration,
          passed: true,
          metrics: { executionTime: duration }
        };
      }
    });
  }
};

/**
 * Default configuration factory
 */
export function getDefaultConfig(): RegressionTestConfig {
  return {
    parallel: true,
    maxWorkers: Math.min(4, require('os').cpus().length),
    timeout: 30000,
    retries: 0,
    reporters: ['console', 'json'],
    coverage: true,
    screenshots: false,
    videos: false,
    outputDir: './test-reports',
    enableNLD: true,
    enableVerificationWorkflow: true,
    generatePMReports: true
  };
}

/**
 * Quick start function for simple setups
 */
export async function quickStart(testSuites: TestSuite[]): Promise<void> {
  const config = getDefaultConfig();
  const framework = createRegressionFramework(config);
  
  // Register all suites
  for (const suite of testSuites) {
    await framework.registerSuite(suite);
  }
  
  // Run all tests
  const execution = await framework.runAll();
  
  // Generate reports
  const pmReport = await framework.generatePMReport(execution);
  console.log(`\n📊 PM Report Generated: ${pmReport.title}`);
  console.log(`📈 Overall Status: ${pmReport.status}`);
  console.log(`✅ Success Rate: ${execution.summary.total > 0 ? 
    ((execution.summary.passed / execution.summary.total) * 100).toFixed(1) : 0}%`);
  
  // Cleanup
  await framework.cleanup();
}

// Re-export enums for convenience
export { TestCategory, TestPriority, TestStatus, OverallStatus, HealthStatus, RiskLevel } from './types';