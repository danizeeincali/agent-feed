/**
 * Regression Framework Validation Tests
 * Comprehensive tests to validate the regression test framework itself
 */

import {
  RegressionTestFramework,
  TestSuiteManager,
  TestRunner,
  TestResultCollector,
  PMReportGenerator,
  TestDocumentationManager,
  ChangeVerificationWorkflow,
  NLDIntegration,
  createTestSuite,
  createTestCase,
  TestCategory,
  TestPriority,
  TestStatus,
  getDefaultConfig
} from '../../src/testing/regression';

// Mock test data
const createMockTestCase = (id: string, shouldPass = true) => {
  return createTestCase({
    id,
    name: `Mock Test ${id}`,
    description: `Mock test case for ${id}`,
    category: TestCategory.UNIT,
    priority: TestPriority.MEDIUM,
    tags: ['mock', 'test'],
    execute: async () => {
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      
      if (!shouldPass) {
        throw new Error(`Mock test ${id} failed intentionally`);
      }
      
      return {
        testId: id,
        status: TestStatus.PASSED,
        duration: 10,
        startTime: new Date(),
        endTime: new Date(),
        output: `Mock test ${id} completed successfully`
      };
    }
  });
};

const createMockTestSuite = (suiteId: string, testCount = 5, failureCount = 0) => {
  const testCases = [];
  
  // Add passing tests
  for (let i = 0; i < testCount - failureCount; i++) {
    testCases.push(createMockTestCase(`${suiteId}-test-${i}`, true));
  }
  
  // Add failing tests
  for (let i = 0; i < failureCount; i++) {
    testCases.push(createMockTestCase(`${suiteId}-fail-${i}`, false));
  }
  
  return createTestSuite({
    id: suiteId,
    name: `Mock Suite ${suiteId}`,
    description: `Mock test suite with ${testCount} tests`,
    category: TestCategory.UNIT,
    testCases
  });
};

describe('Regression Test Framework', () => {
  let framework: RegressionTestFramework;
  
  beforeEach(async () => {
    const config = getDefaultConfig();
    config.parallel = false; // Use sequential for predictable testing
    config.timeout = 5000;
    framework = new RegressionTestFramework(config);
    await framework.initialize();
  });
  
  afterEach(async () => {
    await framework.cleanup();
  });

  describe('Framework Initialization', () => {
    test('should initialize all components successfully', async () => {
      expect(framework).toBeDefined();
      expect(framework.isRunning).toBe(false);
      expect(framework.configuration).toBeDefined();
    });

    test('should handle configuration properly', () => {
      const config = framework.configuration;
      expect(config.parallel).toBe(false);
      expect(config.timeout).toBe(5000);
      expect(config.reporters).toBeDefined();
    });
  });

  describe('Test Suite Management', () => {
    test('should register test suites', async () => {
      const mockSuite = createMockTestSuite('test-suite-1', 3, 0);
      await framework.registerSuite(mockSuite);
      
      // Verify suite was registered (we'd need access to the suite manager)
      // For now, we'll test through execution
      const execution = await framework.runAll();
      expect(execution.results).toHaveLength(3);
    });

    test('should handle multiple test suites', async () => {
      const suite1 = createMockTestSuite('suite-1', 2, 0);
      const suite2 = createMockTestSuite('suite-2', 3, 1);
      
      await framework.registerSuite(suite1);
      await framework.registerSuite(suite2);
      
      const execution = await framework.runAll();
      expect(execution.results).toHaveLength(5);
      expect(execution.summary.passed).toBe(4);
      expect(execution.summary.failed).toBe(1);
    });
  });

  describe('Test Execution', () => {
    test('should execute tests and collect results', async () => {
      const mockSuite = createMockTestSuite('execution-test', 5, 2);
      await framework.registerSuite(mockSuite);
      
      const execution = await framework.runAll();
      
      expect(execution).toBeDefined();
      expect(execution.results).toHaveLength(5);
      expect(execution.summary.total).toBe(5);
      expect(execution.summary.passed).toBe(3);
      expect(execution.summary.failed).toBe(2);
      expect(execution.summary.duration).toBeGreaterThan(0);
    });

    test('should handle test timeouts', async () => {
      const slowTest = createTestCase({
        id: 'slow-test',
        name: 'Slow Test',
        description: 'Test that takes too long',
        category: TestCategory.UNIT,
        timeout: 100, // Very short timeout
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 200)); // Takes longer than timeout
          return {
            testId: 'slow-test',
            status: TestStatus.PASSED,
            duration: 200,
            startTime: new Date(),
            endTime: new Date()
          };
        }
      });
      
      const suite = createTestSuite({
        id: 'timeout-suite',
        name: 'Timeout Test Suite',
        description: 'Suite with timeout test',
        category: TestCategory.UNIT,
        testCases: [slowTest]
      });
      
      await framework.registerSuite(suite);
      const execution = await framework.runAll();
      
      // The test should fail due to timeout
      expect(execution.summary.failed).toBeGreaterThan(0);
    }, 10000);

    test('should generate execution metadata', async () => {
      const mockSuite = createMockTestSuite('metadata-test', 2, 0);
      await framework.registerSuite(mockSuite);
      
      const execution = await framework.runAll();
      
      expect(execution.id).toBeDefined();
      expect(execution.startTime).toBeInstanceOf(Date);
      expect(execution.endTime).toBeInstanceOf(Date);
      expect(execution.environment).toBeDefined();
      expect(execution.environment.platform).toBeDefined();
      expect(execution.environment.nodeVersion).toBeDefined();
    });
  });

  describe('Report Generation', () => {
    test('should generate PM reports', async () => {
      const mockSuite = createMockTestSuite('pm-report-test', 10, 3);
      await framework.registerSuite(mockSuite);
      
      const execution = await framework.runAll();
      const pmReport = await framework.generatePMReport(execution);
      
      expect(pmReport).toBeDefined();
      expect(pmReport.id).toBeDefined();
      expect(pmReport.title).toBeDefined();
      expect(pmReport.status).toBeDefined();
      expect(pmReport.summary).toBeDefined();
      expect(pmReport.riskAssessment).toBeDefined();
      expect(pmReport.recommendations).toBeDefined();
      expect(pmReport.nextSteps).toBeDefined();
      
      // Verify summary content
      expect(pmReport.summary.overallHealth).toBeDefined();
      expect(pmReport.summary.criticalIssues).toBeGreaterThanOrEqual(0);
    });

    test('should generate technical reports', async () => {
      const mockSuite = createMockTestSuite('tech-report-test', 5, 1);
      await framework.registerSuite(mockSuite);
      
      const execution = await framework.runAll();
      const techReport = await framework.generateTechnicalReport(execution);
      
      expect(techReport).toBeDefined();
      expect(typeof techReport).toBe('string');
      expect(techReport.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle test execution errors gracefully', async () => {
      const errorTest = createTestCase({
        id: 'error-test',
        name: 'Error Test',
        description: 'Test that throws an error',
        category: TestCategory.UNIT,
        execute: async () => {
          throw new Error('Intentional test error');
        }
      });
      
      const suite = createTestSuite({
        id: 'error-suite',
        name: 'Error Test Suite',
        description: 'Suite with error test',
        category: TestCategory.UNIT,
        testCases: [errorTest]
      });
      
      await framework.registerSuite(suite);
      const execution = await framework.runAll();
      
      expect(execution.summary.failed).toBe(1);
      expect(execution.results[0].error).toBeDefined();
      expect(execution.results[0].error?.message).toBe('Intentional test error');
    });

    test('should continue execution after individual test failures', async () => {
      const tests = [
        createMockTestCase('success-1', true),
        createMockTestCase('failure-1', false),
        createMockTestCase('success-2', true),
        createMockTestCase('failure-2', false),
        createMockTestCase('success-3', true)
      ];
      
      const suite = createTestSuite({
        id: 'mixed-suite',
        name: 'Mixed Results Suite',
        description: 'Suite with mixed success/failure tests',
        category: TestCategory.UNIT,
        testCases: tests
      });
      
      await framework.registerSuite(suite);
      const execution = await framework.runAll();
      
      expect(execution.summary.total).toBe(5);
      expect(execution.summary.passed).toBe(3);
      expect(execution.summary.failed).toBe(2);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large test suites efficiently', async () => {
      const largeSuite = createMockTestSuite('large-suite', 100, 5);
      await framework.registerSuite(largeSuite);
      
      const startTime = Date.now();
      const execution = await framework.runAll();
      const executionTime = Date.now() - startTime;
      
      expect(execution.summary.total).toBe(100);
      expect(execution.summary.passed).toBe(95);
      expect(execution.summary.failed).toBe(5);
      
      // Should complete in reasonable time (adjust based on performance requirements)
      expect(executionTime).toBeLessThan(10000); // 10 seconds
    }, 15000);

    test('should provide accurate timing information', async () => {
      const mockSuite = createMockTestSuite('timing-test', 3, 0);
      await framework.registerSuite(mockSuite);
      
      const execution = await framework.runAll();
      
      expect(execution.summary.duration).toBeGreaterThan(0);
      expect(execution.endTime.getTime()).toBeGreaterThan(execution.startTime.getTime());
      
      for (const result of execution.results) {
        expect(result.duration).toBeGreaterThan(0);
        expect(result.endTime.getTime()).toBeGreaterThan(result.startTime.getTime());
      }
    });
  });

  describe('Framework Integration', () => {
    test('should integrate all components seamlessly', async () => {
      // Test that all major components work together
      const suite1 = createMockTestSuite('integration-1', 5, 1);
      const suite2 = createMockTestSuite('integration-2', 3, 0);
      
      await framework.registerSuite(suite1);
      await framework.registerSuite(suite2);
      
      // Run tests
      const execution = await framework.runAll();
      
      // Generate reports
      const pmReport = await framework.generatePMReport(execution);
      const techReport = await framework.generateTechnicalReport(execution);
      
      // Verify everything worked together
      expect(execution.summary.total).toBe(8);
      expect(pmReport).toBeDefined();
      expect(techReport).toBeDefined();
      
      // Verify PM report reflects the execution results
      expect(pmReport.executionId).toBe(execution.id);
    });
  });
});

describe('Component Tests', () => {
  describe('TestSuiteManager', () => {
    let manager: TestSuiteManager;
    
    beforeEach(async () => {
      manager = new TestSuiteManager();
      await manager.initialize();
    });
    
    test('should register and retrieve test suites', async () => {
      const mockSuite = createMockTestSuite('component-suite', 3, 0);
      await manager.registerSuite(mockSuite);
      
      const allSuites = await manager.getAllSuites();
      expect(allSuites).toHaveLength(1);
      expect(allSuites[0].id).toBe('component-suite');
      
      const retrievedSuite = await manager.getSuiteById('component-suite');
      expect(retrievedSuite).toBeDefined();
      expect(retrievedSuite?.name).toBe('Mock Suite component-suite');
    });
    
    test('should categorize suites correctly', async () => {
      const unitSuite = createTestSuite({
        id: 'unit-suite',
        name: 'Unit Suite',
        description: 'Unit test suite',
        category: TestCategory.UNIT,
        testCases: []
      });
      
      const integrationSuite = createTestSuite({
        id: 'integration-suite',
        name: 'Integration Suite',
        description: 'Integration test suite',
        category: TestCategory.INTEGRATION,
        testCases: []
      });
      
      await manager.registerSuite(unitSuite);
      await manager.registerSuite(integrationSuite);
      
      const unitSuites = await manager.getSuitesByCategory(TestCategory.UNIT);
      const integrationSuites = await manager.getSuitesByCategory(TestCategory.INTEGRATION);
      
      expect(unitSuites).toHaveLength(1);
      expect(integrationSuites).toHaveLength(1);
      expect(unitSuites[0].id).toBe('unit-suite');
      expect(integrationSuites[0].id).toBe('integration-suite');
    });
  });

  describe('TestResultCollector', () => {
    let collector: TestResultCollector;
    
    beforeEach(async () => {
      collector = new TestResultCollector();
      await collector.initialize();
    });
    
    test('should collect and analyze test results', async () => {
      const results = [
        {
          testId: 'test-1',
          status: TestStatus.PASSED,
          duration: 100,
          startTime: new Date(),
          endTime: new Date()
        },
        {
          testId: 'test-2',
          status: TestStatus.FAILED,
          duration: 150,
          startTime: new Date(),
          endTime: new Date(),
          error: new Error('Test failed')
        }
      ];
      
      collector.addResults(results);
      
      const summary = collector.generateSummary(results);
      expect(summary.total).toBe(2);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.duration).toBe(250);
    });
    
    test('should provide failure analysis', async () => {
      const failedResults = [
        {
          testId: 'fail-1',
          status: TestStatus.FAILED,
          duration: 100,
          startTime: new Date(),
          endTime: new Date(),
          error: new Error('Network timeout')
        },
        {
          testId: 'fail-2',
          status: TestStatus.FAILED,
          duration: 120,
          startTime: new Date(),
          endTime: new Date(),
          error: new Error('Network timeout')
        }
      ];
      
      collector.addResults(failedResults);
      const analysis = collector.getFailureAnalysis();
      
      expect(analysis.totalFailures).toBe(2);
      expect(analysis.uniqueErrors.size).toBeGreaterThan(0);
    });
  });
});

// Integration test with actual test execution
describe('End-to-End Framework Test', () => {
  test('should run complete regression test workflow', async () => {
    const config = getDefaultConfig();
    config.parallel = false;
    config.generatePMReports = true;
    
    const framework = new RegressionTestFramework(config);
    await framework.initialize();
    
    try {
      // Register multiple suites with different characteristics
      const criticalSuite = createMockTestSuite('critical-tests', 5, 0);
      const normalSuite = createMockTestSuite('normal-tests', 10, 2);
      const performanceSuite = createMockTestSuite('performance-tests', 3, 1);
      
      await framework.registerSuite(criticalSuite);
      await framework.registerSuite(normalSuite);
      await framework.registerSuite(performanceSuite);
      
      // Run all tests
      const execution = await framework.runAll();
      
      // Verify execution results
      expect(execution.summary.total).toBe(18);
      expect(execution.summary.passed).toBe(15);
      expect(execution.summary.failed).toBe(3);
      
      // Generate and verify PM report
      const pmReport = await framework.generatePMReport(execution);
      expect(pmReport.status).toBeDefined();
      expect(pmReport.summary.overallHealth).toBeDefined();
      expect(pmReport.recommendations.length).toBeGreaterThan(0);
      
      // Generate technical documentation
      const techReport = await framework.generateTechnicalReport(execution);
      expect(typeof techReport).toBe('string');
      expect(techReport).toBeTruthy();
      
      // Get execution history
      const history = await framework.getExecutionHistory(5);
      expect(history.length).toBe(1);
      expect(history[0].id).toBe(execution.id);
      
    } finally {
      await framework.cleanup();
    }
  }, 30000);
});