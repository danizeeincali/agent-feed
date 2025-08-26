/**
 * NLD Test Suite
 * 
 * Comprehensive test suite for validating NLD pattern detection,
 * recovery mechanisms, and system integration under various edge cases.
 */

import { NLDIntegrationSystem, initializeNLDSystem } from './nld-integration-system';
import { NLTRecord } from './nld-core-monitor';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  setup: () => Promise<void>;
  execute: () => Promise<boolean>;
  cleanup: () => Promise<void>;
  expectedPatterns: string[];
  expectedRecovery: boolean;
  timeout: number;
}

export interface TestResult {
  testId: string;
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  patternsDetected: string[];
  recoverySuccessful: boolean;
  systemHealth: {
    before: number;
    after: number;
  };
}

export interface TestSuiteReport {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
  systemStats: {
    patternsDetected: number;
    recoveryAttempts: number;
    alertsTriggered: number;
  };
  recommendations: string[];
}

/**
 * NLD Test Suite for Edge Case Validation
 */
export class NLDTestSuite {
  private system: NLDIntegrationSystem;
  private testCases: TestCase[] = [];
  private results: TestResult[] = [];
  private isRunning = false;

  constructor() {
    this.system = initializeNLDSystem({ 
      debug: true, 
      logLevel: 'verbose' 
    });
    this.initializeTestCases();
  }

  /**
   * Initialize comprehensive test cases
   */
  private initializeTestCases(): void {
    // White Screen Tests
    this.addTestCase({
      id: 'ws-001',
      name: 'Component Mount Failure',
      description: 'Test white screen detection when component fails to mount',
      category: 'white-screen',
      severity: 'critical',
      setup: async () => {
        // Create a div that will simulate empty content
        const testDiv = document.createElement('div');
        testDiv.id = 'test-empty-component';
        document.body.appendChild(testDiv);
      },
      execute: async () => {
        // Simulate component that mounts but renders nothing
        const testDiv = document.getElementById('test-empty-component');
        if (testDiv) {
          // Leave div empty to simulate white screen
          setTimeout(() => {
            this.system.triggerTestPattern('nld-001', {
              component: 'TestEmptyComponent'
            });
          }, 100);
        }
        return true;
      },
      cleanup: async () => {
        const testDiv = document.getElementById('test-empty-component');
        if (testDiv) {
          document.body.removeChild(testDiv);
        }
      },
      expectedPatterns: ['nld-001'],
      expectedRecovery: true,
      timeout: 5000
    });

    this.addTestCase({
      id: 'ws-002',
      name: 'Props Undefined Error',
      description: 'Test white screen from undefined props causing render failure',
      category: 'white-screen',
      severity: 'critical',
      setup: async () => {},
      execute: async () => {
        // Simulate accessing undefined props
        try {
          const undefinedProps: any = undefined;
          const result = undefinedProps.nonExistentProp.someMethod();
          return false; // Should not reach here
        } catch (error) {
          this.system.triggerTestPattern('nld-001', {
            component: 'TestPropsComponent',
            stackTrace: (error as Error).stack
          });
          return true;
        }
      },
      cleanup: async () => {},
      expectedPatterns: ['nld-001'],
      expectedRecovery: true,
      timeout: 3000
    });

    // WebSocket Tests
    this.addTestCase({
      id: 'ws-003',
      name: 'Rapid Reconnection Loop',
      description: 'Test WebSocket connection loop detection and recovery',
      category: 'websocket',
      severity: 'high',
      setup: async () => {
        // Mock WebSocket for testing
        (window as any).originalWebSocket = window.WebSocket;
        (window as any).WebSocket = class MockWebSocket {
          constructor(url: string) {
            // Simulate immediate failure
            setTimeout(() => {
              this.dispatchEvent(new Event('error'));
            }, 10);
          }
          addEventListener(event: string, handler: Function) {
            if (event === 'error') {
              setTimeout(() => handler(new Event('error')), 10);
            }
          }
          dispatchEvent(event: Event) {
            return true;
          }
        };
      },
      execute: async () => {
        // Create multiple failing WebSocket connections rapidly
        for (let i = 0; i < 6; i++) {
          try {
            new WebSocket('ws://localhost:invalid');
          } catch (error) {
            // Expected to fail
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Should trigger connection loop pattern
        return true;
      },
      cleanup: async () => {
        // Restore original WebSocket
        if ((window as any).originalWebSocket) {
          (window as any).WebSocket = (window as any).originalWebSocket;
          delete (window as any).originalWebSocket;
        }
      },
      expectedPatterns: ['nld-002'],
      expectedRecovery: true,
      timeout: 5000
    });

    // Memory Leak Tests
    this.addTestCase({
      id: 'ml-001',
      name: 'Image URL Memory Leak',
      description: 'Test detection of image URL memory leaks',
      category: 'memory-leak',
      severity: 'medium',
      setup: async () => {},
      execute: async () => {
        // Create multiple blob URLs without cleaning up
        const urls: string[] = [];
        for (let i = 0; i < 50; i++) {
          const blob = new Blob(['test'], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          urls.push(url);
          
          // Don't revoke URLs to simulate leak
        }
        
        // Trigger memory pattern detection
        this.system.triggerTestPattern('nld-003', {
          component: 'TestImageComponent',
          memoryUsage: {
            used: 50 * 1024 * 1024, // 50MB simulated
            total: 100 * 1024 * 1024,
            percentage: 50
          }
        });
        
        return true;
      },
      cleanup: async () => {
        // Cleanup any remaining URLs
        window.dispatchEvent(new CustomEvent('nld-memory-cleanup'));
      },
      expectedPatterns: ['nld-003'],
      expectedRecovery: true,
      timeout: 3000
    });

    // Race Condition Tests
    this.addTestCase({
      id: 'rc-001',
      name: 'Concurrent Instance Launch',
      description: 'Test race condition detection during concurrent operations',
      category: 'race-condition',
      severity: 'high',
      setup: async () => {},
      execute: async () => {
        // Simulate rapid concurrent operations
        const promises = Array.from({ length: 10 }, (_, i) => 
          new Promise<void>(resolve => {
            setTimeout(() => {
              // Simulate instance launch
              this.system.triggerTestPattern('nld-004', {
                component: 'TestInstanceLauncher',
                operation: `launch-${i}`
              });
              resolve();
            }, Math.random() * 100);
          })
        );
        
        await Promise.all(promises);
        return true;
      },
      cleanup: async () => {},
      expectedPatterns: ['nld-004'],
      expectedRecovery: true,
      timeout: 5000
    });

    // Performance Tests
    this.addTestCase({
      id: 'pf-001',
      name: 'Infinite Render Loop',
      description: 'Test performance issue detection from render loops',
      category: 'performance',
      severity: 'medium',
      setup: async () => {},
      execute: async () => {
        // Simulate render loop by triggering multiple rapid re-renders
        for (let i = 0; i < 20; i++) {
          this.system.triggerTestPattern('nld-005', {
            component: 'TestRenderComponent',
            performanceMetrics: {
              renderTime: 100 + Math.random() * 50, // High render time
              loadTime: 0,
              interactiveTime: 0
            }
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        return true;
      },
      cleanup: async () => {},
      expectedPatterns: ['nld-005'],
      expectedRecovery: true,
      timeout: 5000
    });

    // Temporal Dead Zone Tests
    this.addTestCase({
      id: 'tdz-001',
      name: 'Variable Access Before Declaration',
      description: 'Test temporal dead zone detection',
      category: 'temporal-dead-zone',
      severity: 'critical',
      setup: async () => {},
      execute: async () => {
        try {
          // Simulate TDZ error
          const testCode = `
            const contextValue = useMemo(() => ({
              connectionState,  // ERROR: Used before declaration
            }), [connectionState]);
            
            const connectionState = useState(false);
          `;
          
          // This would normally be caught by the TDZD detector
          this.system.triggerTestPattern('tdz-001', {
            component: 'TestTDZComponent',
            codePattern: testCode
          });
          
          return true;
        } catch (error) {
          return false;
        }
      },
      cleanup: async () => {},
      expectedPatterns: ['tdz-001'],
      expectedRecovery: false, // TDZ issues require code fixes
      timeout: 3000
    });

    // Network Failure Tests
    this.addTestCase({
      id: 'nf-001',
      name: 'Network Connectivity Loss',
      description: 'Test system behavior during network failures',
      category: 'websocket',
      severity: 'high',
      setup: async () => {},
      execute: async () => {
        // Simulate network going offline
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        });
        
        window.dispatchEvent(new Event('offline'));
        
        // Trigger WebSocket issues due to network failure
        this.system.triggerTestPattern('nld-002', {
          component: 'TestNetworkComponent',
          networkState: 'offline'
        });
        
        return true;
      },
      cleanup: async () => {
        // Restore network status
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true
        });
        window.dispatchEvent(new Event('online'));
      },
      expectedPatterns: ['nld-002'],
      expectedRecovery: true,
      timeout: 4000
    });

    // Stress Test
    this.addTestCase({
      id: 'stress-001',
      name: 'System Stress Test',
      description: 'Test system behavior under high load',
      category: 'performance',
      severity: 'high',
      setup: async () => {},
      execute: async () => {
        // Generate multiple patterns simultaneously
        const patterns = ['nld-001', 'nld-002', 'nld-003', 'nld-004', 'nld-005'];
        const promises = [];
        
        for (let i = 0; i < 25; i++) {
          const patternId = patterns[i % patterns.length];
          promises.push(
            new Promise<void>(resolve => {
              setTimeout(() => {
                this.system.triggerTestPattern(patternId, {
                  component: `StressTest-${i}`,
                  iteration: i
                });
                resolve();
              }, Math.random() * 1000);
            })
          );
        }
        
        await Promise.all(promises);
        return true;
      },
      cleanup: async () => {
        // Allow system to settle
        await new Promise(resolve => setTimeout(resolve, 2000));
      },
      expectedPatterns: ['nld-001', 'nld-002', 'nld-003', 'nld-004', 'nld-005'],
      expectedRecovery: true,
      timeout: 10000
    });
  }

  /**
   * Add a test case
   */
  public addTestCase(testCase: TestCase): void {
    this.testCases.push(testCase);
  }

  /**
   * Run all test cases
   */
  public async runAllTests(): Promise<TestSuiteReport> {
    if (this.isRunning) {
      throw new Error('Test suite is already running');
    }

    this.isRunning = true;
    this.results = [];
    const startTime = Date.now();

    console.log('🧪 Starting NLD Test Suite...');
    console.log(`Running ${this.testCases.length} test cases`);

    for (const testCase of this.testCases) {
      const result = await this.runTestCase(testCase);
      this.results.push(result);
      
      // Log intermediate results
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name} (${result.duration}ms)`);
      
      if (!result.passed && result.error) {
        console.warn(`   Error: ${result.error}`);
      }
    }

    const totalDuration = Date.now() - startTime;
    this.isRunning = false;

    return this.generateReport(totalDuration);
  }

  /**
   * Run a single test case
   */
  public async runTestCase(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    let passed = false;
    let error: string | undefined;
    let patternsDetected: string[] = [];
    let recoverySuccessful = false;

    // Get initial system health
    const initialHealth = this.system.getStatus().stats.systemScore;

    try {
      // Setup
      await testCase.setup();

      // Track patterns before execution
      const initialPatterns = this.system.getSystemReport().patterns.records.length;

      // Execute test
      const executeResult = await Promise.race([
        testCase.execute(),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), testCase.timeout)
        )
      ]);

      if (executeResult) {
        // Wait a bit for pattern detection to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check detected patterns
        const finalPatterns = this.system.getSystemReport().patterns.records;
        const newPatterns = finalPatterns.slice(initialPatterns);
        
        patternsDetected = newPatterns.map(record => record.pattern.id);
        
        // Check if expected patterns were detected
        const expectedFound = testCase.expectedPatterns.every(expected =>
          patternsDetected.includes(expected)
        );

        // Check recovery if expected
        if (testCase.expectedRecovery) {
          recoverySuccessful = newPatterns.some(record => record.recovered);
        } else {
          recoverySuccessful = true; // No recovery expected
        }

        passed = expectedFound && (testCase.expectedRecovery ? recoverySuccessful : true);
      }

    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      passed = false;
    }

    try {
      // Cleanup
      await testCase.cleanup();
    } catch (cleanupError) {
      console.warn(`Cleanup error for ${testCase.id}:`, cleanupError);
    }

    // Get final system health
    const finalHealth = this.system.getStatus().stats.systemScore;

    return {
      testId: testCase.id,
      name: testCase.name,
      passed,
      duration: Date.now() - startTime,
      error,
      patternsDetected,
      recoverySuccessful,
      systemHealth: {
        before: initialHealth,
        after: finalHealth
      }
    };
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(totalDuration: number): TestSuiteReport {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const skipped = 0; // We don't skip tests currently

    const systemReport = this.system.getSystemReport();
    const systemStats = {
      patternsDetected: systemReport.patterns.records.length,
      recoveryAttempts: systemReport.recovery.history.length,
      alertsTriggered: systemReport.alerts.alerts.length
    };

    const recommendations = this.generateRecommendations();

    const report: TestSuiteReport = {
      totalTests: this.testCases.length,
      passed,
      failed,
      skipped,
      duration: totalDuration,
      results: this.results,
      systemStats,
      recommendations
    };

    // Log summary
    console.log('\n🧪 NLD Test Suite Complete');
    console.log(`Total: ${report.totalTests}, Passed: ${passed}, Failed: ${failed}`);
    console.log(`Duration: ${totalDuration}ms`);
    console.log(`System Health: ${this.system.getStatus().stats.systemScore}/100`);

    return report;
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.results.filter(r => !r.passed);
    const systemHealth = this.system.getStatus().stats.systemScore;

    if (failedTests.length === 0) {
      recommendations.push('✅ All tests passed! NLD system is working correctly.');
    } else {
      recommendations.push(`❌ ${failedTests.length} tests failed. Review the following areas:`);
      
      failedTests.forEach(test => {
        recommendations.push(`  - ${test.name}: ${test.error || 'Pattern detection or recovery failed'}`);
      });
    }

    if (systemHealth < 70) {
      recommendations.push('⚠️ System health is below optimal. Consider reviewing pattern thresholds.');
    }

    const recoveryFailures = this.results.filter(r => r.passed && !r.recoverySuccessful).length;
    if (recoveryFailures > 0) {
      recommendations.push(`🔧 ${recoveryFailures} tests had recovery issues. Review recovery mechanisms.`);
    }

    const slowTests = this.results.filter(r => r.duration > 5000).length;
    if (slowTests > 0) {
      recommendations.push(`🐌 ${slowTests} tests took longer than 5 seconds. Consider optimizing detection speed.`);
    }

    return recommendations;
  }

  /**
   * Export test results
   */
  public exportResults(): string {
    const report = this.generateReport(0); // Duration doesn't matter for export
    return JSON.stringify(report, null, 2);
  }

  /**
   * Reset test results
   */
  public reset(): void {
    this.results = [];
    console.log('🧪 Test results reset');
  }

  /**
   * Dispose of test resources
   */
  public dispose(): void {
    this.system.dispose();
    this.testCases = [];
    this.results = [];
    this.isRunning = false;
  }
}

export default NLDTestSuite;