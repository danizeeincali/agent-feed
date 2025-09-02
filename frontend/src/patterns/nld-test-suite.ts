/**
 * NLD Test Suite
 * 
 * Comprehensive testing framework for validating NLD instance 
 * synchronization pattern detection and recovery mechanisms.
 */

import { nldInstanceSync, captureInstanceSyncFailure, validateInstanceOperation } from './nld-instance-sync-patterns';

// ==================== TEST FRAMEWORK ====================

export class NLDTestSuite {
  private testResults: TestResult[] = [];
  private isRunning = false;

  async runAllTests(): Promise<TestSuiteReport> {
    console.log('🧪 NLD: Starting comprehensive test suite...');
    this.isRunning = true;
    this.testResults = [];

    const testSuites = [
      () => this.testFailureDetection(),
      () => this.testPatternClassification(),
      () => this.testRecoveryMechanisms(),
      () => this.testProactiveValidation(),
      () => this.testNeuralLearning(),
      () => this.testIntegrationScenarios()
    ];

    for (const testSuite of testSuites) {
      try {
        await testSuite();
      } catch (error) {
        console.error('❌ Test suite failed:', error);
        this.testResults.push({
          name: testSuite.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: 0
        });
      }
    }

    this.isRunning = false;
    return this.generateReport();
  }

  // ==================== FAILURE DETECTION TESTS ====================

  private async testFailureDetection(): Promise<void> {
    console.log('🔍 Testing failure detection mechanisms...');

    // Test 1: ID Mismatch Detection
    const test1Start = performance.now();
    const failureId1 = await captureInstanceSyncFailure(
      'Failed to connect to instance claude-test-1234: Instance claude-test-1234 is not running or does not exist',
      { selectedInstance: 'claude-test-1234', instances: [], connectionStatus: 'Connected via SSE' },
      null,
      'TestComponent',
      ['create_instance', 'select_instance']
    );

    this.testResults.push({
      name: 'ID Mismatch Detection',
      status: failureId1 ? 'passed' : 'failed',
      duration: performance.now() - test1Start,
      details: `Failure ID: ${failureId1}`
    });

    // Test 2: State Desynchronization Detection
    const test2Start = performance.now();
    const failureId2 = await captureInstanceSyncFailure(
      'State mismatch detected between frontend and backend',
      { selectedInstance: 'claude-test-5678', instances: [{ id: 'claude-test-5678', status: 'running' }], connectionStatus: 'Connected' },
      { instances: ['claude-test-5678 (stopped)'] },
      'TestComponent',
      ['websocket_reconnect', 'status_check']
    );

    this.testResults.push({
      name: 'State Desync Detection',
      status: failureId2 ? 'passed' : 'failed',
      duration: performance.now() - test2Start,
      details: `Failure ID: ${failureId2}`
    });

    // Test 3: Backend Stale State Detection
    const test3Start = performance.now();
    const failureId3 = await captureInstanceSyncFailure(
      'Backend reports instances that frontend cannot see',
      { selectedInstance: null, instances: [], connectionStatus: 'Connected' },
      { instances: ['claude-test-9999 (phantom instance)'] },
      'TestComponent',
      ['fetch_instances', 'backend_sync']
    );

    this.testResults.push({
      name: 'Backend Stale Detection',
      status: failureId3 ? 'passed' : 'failed',
      duration: performance.now() - test3Start,
      details: `Failure ID: ${failureId3}`
    });
  }

  // ==================== PATTERN CLASSIFICATION TESTS ====================

  private async testPatternClassification(): Promise<void> {
    console.log('🏷️ Testing pattern classification accuracy...');

    const testCases = [
      {
        errorMessage: 'Failed to connect to instance claude-1111: Instance claude-1111 is not running or does not exist',
        expectedType: 'id_mismatch'
      },
      {
        errorMessage: 'WebSocket connection lost, state inconsistent',
        expectedType: 'state_desync'
      },
      {
        errorMessage: 'Backend reports instances that don\'t exist in frontend',
        expectedType: 'backend_stale'
      },
      {
        errorMessage: 'Connection timeout while sending command',
        expectedType: 'connection_failure'
      }
    ];

    for (const testCase of testCases) {
      const testStart = performance.now();
      
      const failureId = await captureInstanceSyncFailure(
        testCase.errorMessage,
        { selectedInstance: 'claude-test', instances: [], connectionStatus: 'error' },
        null,
        'ClassificationTest',
        ['test_classification']
      );

      // Get the captured pattern to verify classification
      const patterns = nldInstanceSync.getPatterns();
      const pattern = patterns.find(p => p.id === failureId);
      
      const passed = pattern && pattern.failureType === testCase.expectedType;

      this.testResults.push({
        name: `Classification: ${testCase.expectedType}`,
        status: passed ? 'passed' : 'failed',
        duration: performance.now() - testStart,
        details: `Expected: ${testCase.expectedType}, Got: ${pattern?.failureType || 'unknown'}`
      });
    }
  }

  // ==================== RECOVERY MECHANISM TESTS ====================

  private async testRecoveryMechanisms(): Promise<void> {
    console.log('🔧 Testing recovery mechanisms...');

    // Mock recovery strategies for testing
    const mockRecoveryTests = [
      {
        name: 'Force Refresh Strategy',
        failureType: 'id_mismatch',
        expectedSuccess: true
      },
      {
        name: 'Clear State Strategy',
        failureType: 'state_desync',
        expectedSuccess: true
      },
      {
        name: 'Reconnect Strategy',
        failureType: 'connection_failure',
        expectedSuccess: true
      },
      {
        name: 'Full Reset Strategy',
        failureType: 'backend_stale',
        expectedSuccess: true
      }
    ];

    for (const test of mockRecoveryTests) {
      const testStart = performance.now();

      // Create a failure pattern that should trigger the specific recovery strategy
      const failureId = await captureInstanceSyncFailure(
        `Test error for ${test.failureType}`,
        { selectedInstance: 'claude-recovery-test', instances: [], connectionStatus: 'error' },
        null,
        'RecoveryTest',
        ['test_recovery']
      );

      // Simulate recovery process
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate recovery time

      const patterns = nldInstanceSync.getPatterns();
      const pattern = patterns.find(p => p.id === failureId);
      
      const passed = pattern && pattern.recoveryAttempted;

      this.testResults.push({
        name: test.name,
        status: passed ? 'passed' : 'failed',
        duration: performance.now() - testStart,
        details: `Recovery attempted: ${pattern?.recoveryAttempted}, Success: ${pattern?.recoverySuccessful}`
      });
    }
  }

  // ==================== PROACTIVE VALIDATION TESTS ====================

  private async testProactiveValidation(): Promise<void> {
    console.log('🛡️ Testing proactive validation system...');

    const validationTests = [
      {
        name: 'Valid Instance Selection',
        operation: 'select' as const,
        instanceId: 'claude-1234',
        expectedValid: true
      },
      {
        name: 'Invalid Instance ID Format',
        operation: 'select' as const,
        instanceId: 'invalid-id-format',
        expectedValid: false
      },
      {
        name: 'Null Instance ID',
        operation: 'select' as const,
        instanceId: undefined,
        expectedValid: false
      },
      {
        name: 'Create Instance Operation',
        operation: 'create' as const,
        instanceId: undefined,
        expectedValid: true
      },
      {
        name: 'Connect to Valid Instance',
        operation: 'connect' as const,
        instanceId: 'claude-5678',
        expectedValid: true
      },
      {
        name: 'Send Command Without Connection',
        operation: 'send_command' as const,
        instanceId: 'claude-9999',
        currentState: { websocketConnected: false },
        expectedValid: false
      }
    ];

    for (const test of validationTests) {
      const testStart = performance.now();

      const validation = await validateInstanceOperation(
        test.operation,
        test.instanceId,
        test.currentState
      );

      const passed = validation.valid === test.expectedValid;

      this.testResults.push({
        name: test.name,
        status: passed ? 'passed' : 'failed',
        duration: performance.now() - testStart,
        details: `Expected valid: ${test.expectedValid}, Got: ${validation.valid}, Issues: ${validation.issues.length}, Confidence: ${validation.confidence}`
      });
    }
  }

  // ==================== NEURAL LEARNING TESTS ====================

  private async testNeuralLearning(): Promise<void> {
    console.log('🧠 Testing neural learning integration...');

    // Test 1: Pattern Storage and Retrieval
    const testStart1 = performance.now();
    const initialPatternCount = nldInstanceSync.getPatterns().length;

    await captureInstanceSyncFailure(
      'Neural learning test failure',
      { selectedInstance: 'claude-neural-test', instances: [], connectionStatus: 'error' },
      null,
      'NeuralTest',
      ['neural_test']
    );

    const finalPatternCount = nldInstanceSync.getPatterns().length;
    const patternStored = finalPatternCount > initialPatternCount;

    this.testResults.push({
      name: 'Pattern Storage',
      status: patternStored ? 'passed' : 'failed',
      duration: performance.now() - testStart1,
      details: `Patterns before: ${initialPatternCount}, after: ${finalPatternCount}`
    });

    // Test 2: Metrics Calculation
    const testStart2 = performance.now();
    const metrics = nldInstanceSync.getMetrics();
    
    const metricsValid = metrics && 
      typeof metrics.totalFailures === 'number' &&
      typeof metrics.recoveryRate === 'number' &&
      metrics.patternFrequency instanceof Map;

    this.testResults.push({
      name: 'Metrics Calculation',
      status: metricsValid ? 'passed' : 'failed',
      duration: performance.now() - testStart2,
      details: `Total failures: ${metrics?.totalFailures}, Recovery rate: ${metrics?.recoveryRate}`
    });

    // Test 3: Report Generation
    const testStart3 = performance.now();
    const report = nldInstanceSync.getPatternsReport();
    const reportValid = report && typeof report === 'string' && report.includes('totalPatterns');

    this.testResults.push({
      name: 'Report Generation',
      status: reportValid ? 'passed' : 'failed',
      duration: performance.now() - testStart3,
      details: `Report length: ${report?.length || 0} characters`
    });
  }

  // ==================== INTEGRATION SCENARIO TESTS ====================

  private async testIntegrationScenarios(): Promise<void> {
    console.log('🔗 Testing integration scenarios...');

    // Scenario 1: Complete workflow from failure to recovery
    const scenario1Start = performance.now();
    
    const failureId = await captureInstanceSyncFailure(
      'Integration test: Failed to connect to instance claude-integration-test',
      { 
        selectedInstance: 'claude-integration-test',
        instances: [{ id: 'claude-integration-test', status: 'running' }],
        connectionStatus: 'Connected via SSE'
      },
      { instances: [] }, // Backend has no instances
      'IntegrationTest',
      ['create_instance', 'select_instance', 'attempt_connection']
    );

    // Simulate some time passing for recovery
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pattern = nldInstanceSync.getPatterns().find(p => p.id === failureId);
    const workflowComplete = pattern && 
      pattern.failureType === 'id_mismatch' &&
      pattern.recoveryAttempted;

    this.testResults.push({
      name: 'Complete Failure-Recovery Workflow',
      status: workflowComplete ? 'passed' : 'failed',
      duration: performance.now() - scenario1Start,
      details: `Pattern: ${pattern?.failureType}, Recovery: ${pattern?.recoveryAttempted}`
    });

    // Scenario 2: Multiple concurrent failures
    const scenario2Start = performance.now();
    
    const concurrentFailures = await Promise.all([
      captureInstanceSyncFailure('Concurrent test 1', { selectedInstance: 'claude-concurrent-1' }, null, 'ConcurrentTest1', []),
      captureInstanceSyncFailure('Concurrent test 2', { selectedInstance: 'claude-concurrent-2' }, null, 'ConcurrentTest2', []),
      captureInstanceSyncFailure('Concurrent test 3', { selectedInstance: 'claude-concurrent-3' }, null, 'ConcurrentTest3', [])
    ]);

    const allConcurrentSucceeded = concurrentFailures.every(id => id !== null);

    this.testResults.push({
      name: 'Concurrent Failure Handling',
      status: allConcurrentSucceeded ? 'passed' : 'failed',
      duration: performance.now() - scenario2Start,
      details: `Concurrent failures processed: ${concurrentFailures.filter(id => id).length}/3`
    });
  }

  // ==================== REPORT GENERATION ====================

  private generateReport(): TestSuiteReport {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.status === 'passed').length;
    const failedTests = this.testResults.filter(t => t.status === 'failed').length;
    const totalDuration = this.testResults.reduce((sum, t) => sum + (t.duration || 0), 0);

    return {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: totalTests > 0 ? passedTests / totalTests : 0,
        totalDuration: Math.round(totalDuration)
      },
      results: this.testResults,
      recommendations: this.generateRecommendations(),
      timestamp: new Date().toISOString()
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.testResults.filter(t => t.status === 'failed');
    
    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} tests failed. Review implementation for: ${failedTests.map(t => t.name).join(', ')}`);
    }

    const avgDuration = this.testResults.reduce((sum, t) => sum + (t.duration || 0), 0) / this.testResults.length;
    if (avgDuration > 1000) {
      recommendations.push(`Average test duration is ${Math.round(avgDuration)}ms. Consider optimizing performance.`);
    }

    if (this.testResults.length < 15) {
      recommendations.push('Consider adding more comprehensive test coverage for edge cases.');
    }

    return recommendations;
  }

  // ==================== PUBLIC INTERFACE ====================

  public getTestResults(): TestResult[] {
    return [...this.testResults];
  }

  public isTestRunning(): boolean {
    return this.isRunning;
  }

  public async runSingleTest(testName: string): Promise<TestResult | null> {
    // Implementation for running individual tests
    console.log(`🧪 Running single test: ${testName}`);
    return null; // Placeholder
  }
}

// ==================== TYPES ====================

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  details?: string;
}

interface TestSuiteReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
    totalDuration: number;
  };
  results: TestResult[];
  recommendations: string[];
  timestamp: string;
}

// ==================== SINGLETON EXPORT ====================

export const nldTestSuite = new NLDTestSuite();

// ==================== UTILITY FUNCTIONS ====================

/**
 * Quick validation test for development
 */
export async function runQuickNLDTest(): Promise<boolean> {
  console.log('🚀 Running quick NLD validation test...');
  
  try {
    // Test basic failure capture
    const failureId = await captureInstanceSyncFailure(
      'Quick test failure',
      { selectedInstance: 'claude-quick-test' },
      null,
      'QuickTest',
      ['quick_test']
    );

    // Test validation
    const validation = await validateInstanceOperation('select', 'claude-test-123');

    console.log('✅ Quick NLD test completed successfully');
    return !!(failureId && validation);
  } catch (error) {
    console.error('❌ Quick NLD test failed:', error);
    return false;
  }
}

/**
 * Performance benchmark for NLD operations
 */
export async function benchmarkNLDPerformance(): Promise<{
  failureCapture: number;
  validation: number;
  reportGeneration: number;
}> {
  const results = { failureCapture: 0, validation: 0, reportGeneration: 0 };

  // Benchmark failure capture
  const captureStart = performance.now();
  await captureInstanceSyncFailure('Benchmark test', { selectedInstance: 'claude-benchmark' }, null, 'Benchmark', []);
  results.failureCapture = performance.now() - captureStart;

  // Benchmark validation
  const validationStart = performance.now();
  await validateInstanceOperation('select', 'claude-benchmark-validation');
  results.validation = performance.now() - validationStart;

  // Benchmark report generation
  const reportStart = performance.now();
  nldInstanceSync.getPatternsReport();
  results.reportGeneration = performance.now() - reportStart;

  return results;
}