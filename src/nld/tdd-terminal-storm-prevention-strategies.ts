/**
 * TDD Terminal Storm Prevention Strategies
 * Test-driven development patterns to prevent terminal escape sequence storms
 * Part of NLD (Neuro-Learning Development) system
 */

import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TDDTestCase {
  testId: string;
  testName: string;
  testType: 'unit' | 'integration' | 'e2e' | 'stress';
  category: 'pty_config' | 'process_spawn' | 'sse_connection' | 'button_debouncing' | 'terminal_io';
  description: string;
  scenario: string;
  expectedBehavior: string;
  testImplementation: string;
  assertionStrategy: string;
  mockingStrategy: string;
  preventedFailureType: string[];
  relatedPatterns: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface PreventionStrategy {
  strategyId: string;
  strategyName: string;
  targetPattern: string;
  preventionApproach: 'debouncing' | 'validation' | 'lifecycle_management' | 'state_tracking' | 'resource_limiting';
  tddTestCases: TDDTestCase[];
  implementationGuidelines: string[];
  validationCriteria: string[];
  monitoringMetrics: string[];
  successThreshold: number;
}

export class TDDTerminalStormPreventionStrategies extends EventEmitter {
  private strategies: PreventionStrategy[] = [];
  private testCaseLibrary: TDDTestCase[] = [];
  private storageFile: string;

  constructor(storageDir: string) {
    super();
    this.storageFile = join(storageDir, 'tdd-terminal-storm-prevention.json');
    this.initializeStrategies();
    this.loadExistingStrategies();
    console.log('🧪 TDD Terminal Storm Prevention Strategies initialized');
  }

  /**
   * Initialize built-in prevention strategies
   */
  private initializeStrategies(): void {
    // Strategy 1: PTY Configuration Management
    this.addStrategy({
      strategyId: 'pty-config-management',
      strategyName: 'PTY Configuration Management',
      targetPattern: 'cursor_control_storm',
      preventionApproach: 'lifecycle_management',
      tddTestCases: [
        {
          testId: 'pty-cursor-state-test',
          testName: 'PTY Cursor State Management',
          testType: 'unit',
          category: 'pty_config',
          description: 'Validate that PTY cursor control sequences are properly managed',
          scenario: 'When PTY process starts, cursor control sequences should be set once and not repeated',
          expectedBehavior: 'Only one [?25l and one [?25h sequence per PTY session lifecycle',
          testImplementation: `
describe('PTY Cursor State Management', () => {
  it('should emit cursor control sequences only once per session', async () => {
    const pty = new MockPTY();
    const outputCapture = new OutputCapture();
    
    pty.on('data', outputCapture.capture);
    pty.start();
    
    await waitForInitialization();
    
    const hideCursorCount = outputCapture.countSequence('[?25l');
    const showCursorCount = outputCapture.countSequence('[?25h');
    
    expect(hideCursorCount).toBeLessThanOrEqual(1);
    expect(showCursorCount).toBeLessThanOrEqual(1);
  });
  
  it('should not duplicate cursor sequences on PTY resize', async () => {
    const pty = new MockPTY();
    const outputCapture = new OutputCapture();
    
    pty.on('data', outputCapture.capture);
    pty.start();
    
    await waitForInitialization();
    outputCapture.clear();
    
    pty.resize(120, 30);
    await waitForResize();
    
    const cursorSequences = outputCapture.getCursorControlSequences();
    expect(cursorSequences.length).toBe(0);
  });
});`,
          assertionStrategy: 'Count-based assertion on escape sequence occurrences',
          mockingStrategy: 'Mock PTY process with controllable output capture',
          preventedFailureType: ['cursor_control_storm', 'pty_config_loop'],
          relatedPatterns: ['[?25l', '[?25h'],
          priority: 'high'
        },
        {
          testId: 'bracketed-paste-lifecycle-test',
          testName: 'Bracketed Paste Mode Lifecycle',
          testType: 'integration',
          category: 'pty_config',
          description: 'Ensure bracketed paste mode is enabled/disabled correctly',
          scenario: 'PTY session should enable bracketed paste once at start and disable once at end',
          expectedBehavior: 'Single [?2004h at start, single [?2004l at cleanup',
          testImplementation: `
describe('Bracketed Paste Mode Lifecycle', () => {
  it('should manage bracketed paste mode correctly', async () => {
    const ptyManager = new PTYProcessManager();
    const outputMonitor = new EscapeSequenceMonitor();
    
    const session = await ptyManager.spawn({ shell: '/bin/bash' });
    session.on('data', outputMonitor.track);
    
    await waitForSessionStart();
    
    const enableCount = outputMonitor.countSequence('[?2004h');
    expect(enableCount).toBe(1);
    
    await session.cleanup();
    
    const disableCount = outputMonitor.countSequence('[?2004l');
    expect(disableCount).toBe(1);
  });
});`,
          assertionStrategy: 'Lifecycle-based counting of bracketed paste sequences',
          mockingStrategy: 'Mock PTY session with lifecycle tracking',
          preventedFailureType: ['bracketed_paste_storm', 'pty_reset_loop'],
          relatedPatterns: ['[?2004h', '[?2004l'],
          priority: 'high'
        }
      ],
      implementationGuidelines: [
        'Implement PTY state machine with explicit cursor control tracking',
        'Add escape sequence deduplication in PTY output stream',
        'Create PTY configuration validation before process spawn',
        'Implement cleanup validation to ensure proper sequence termination'
      ],
      validationCriteria: [
        'No duplicate cursor control sequences in single PTY session',
        'Bracketed paste mode enabled/disabled exactly once per session',
        'PTY cleanup properly terminates all control sequences'
      ],
      monitoringMetrics: [
        'cursor_control_sequence_count_per_session',
        'bracketed_paste_lifecycle_violations',
        'pty_config_reset_events'
      ],
      successThreshold: 0.95
    });

    // Strategy 2: Process Spawn Debouncing
    this.addStrategy({
      strategyId: 'process-spawn-debouncing',
      strategyName: 'Process Spawn Debouncing',
      targetPattern: 'process_multiplication_storm',
      preventionApproach: 'debouncing',
      tddTestCases: [
        {
          testId: 'button-click-debouncing-test',
          testName: 'Button Click Debouncing',
          testType: 'e2e',
          category: 'button_debouncing',
          description: 'Prevent rapid button clicks from spawning multiple processes',
          scenario: 'User rapidly clicks "Start Claude" button multiple times',
          expectedBehavior: 'Only one process spawned regardless of click frequency',
          testImplementation: `
describe('Button Click Debouncing', () => {
  it('should debounce rapid start button clicks', async () => {
    const startButton = screen.getByRole('button', { name: /start claude/i });
    const processManager = new ProcessManager();
    const spawnSpy = jest.spyOn(processManager, 'spawn');
    
    // Rapid clicks simulation
    for (let i = 0; i < 10; i++) {
      fireEvent.click(startButton);
      await waitFor(() => {}, { timeout: 50 });
    }
    
    await waitFor(() => {
      expect(spawnSpy).toHaveBeenCalledTimes(1);
    });
    
    const activeProcesses = processManager.getActiveProcessCount();
    expect(activeProcesses).toBe(1);
  });
  
  it('should allow new process after previous completes', async () => {
    const startButton = screen.getByRole('button', { name: /start claude/i });
    const processManager = new ProcessManager();
    
    fireEvent.click(startButton);
    await waitForProcessStart();
    
    const firstProcess = processManager.getActiveProcesses()[0];
    await firstProcess.terminate();
    await waitForProcessCleanup();
    
    fireEvent.click(startButton);
    await waitForProcessStart();
    
    const processes = processManager.getActiveProcesses();
    expect(processes.length).toBe(1);
    expect(processes[0].pid).not.toBe(firstProcess.pid);
  });
});`,
          assertionStrategy: 'Spy-based process spawn counting with timing validation',
          mockingStrategy: 'Mock DOM interactions and process manager lifecycle',
          preventedFailureType: ['button_click_storm', 'process_multiplication'],
          relatedPatterns: ['Claude welcome message duplication'],
          priority: 'critical'
        },
        {
          testId: 'process-lifecycle-management-test',
          testName: 'Process Lifecycle Management',
          testType: 'integration',
          category: 'process_spawn',
          description: 'Ensure proper process lifecycle prevents overlapping spawns',
          scenario: 'Process spawning should respect lifecycle states and prevent concurrent spawns',
          expectedBehavior: 'Only one active process per instance at any time',
          testImplementation: `
describe('Process Lifecycle Management', () => {
  it('should prevent concurrent process spawns for same instance', async () => {
    const instanceManager = new ClaudeInstanceManager();
    const instanceId = 'test-instance-1';
    
    const spawnPromises = Array(5).fill(null).map(() => 
      instanceManager.spawnProcess(instanceId)
    );
    
    const results = await Promise.allSettled(spawnPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');
    
    expect(successful.length).toBe(1);
    expect(failed.length).toBe(4);
    
    const activeProcesses = instanceManager.getProcessesForInstance(instanceId);
    expect(activeProcesses.length).toBe(1);
  });
});`,
          assertionStrategy: 'Promise settlement analysis for concurrent operations',
          mockingStrategy: 'Mock instance manager with concurrent spawn attempts',
          preventedFailureType: ['concurrent_process_spawn', 'resource_exhaustion'],
          relatedPatterns: ['Multiple Claude process initialization'],
          priority: 'high'
        }
      ],
      implementationGuidelines: [
        'Implement button state management with debounce timer',
        'Add process spawn mutex to prevent concurrent spawning',
        'Create process lifecycle state machine',
        'Implement graceful process cleanup with state tracking'
      ],
      validationCriteria: [
        'Button clicks debounced with minimum 2-second interval',
        'Only one active process per instance at any time',
        'Process state transitions properly validated'
      ],
      monitoringMetrics: [
        'button_click_rate_per_minute',
        'concurrent_spawn_attempts_blocked',
        'process_lifecycle_violations'
      ],
      successThreshold: 0.98
    });

    // Strategy 3: SSE Connection Management
    this.addStrategy({
      strategyId: 'sse-connection-deduplication',
      strategyName: 'SSE Connection Deduplication',
      targetPattern: 'sse_handler_multiplication_storm',
      preventionApproach: 'state_tracking',
      tddTestCases: [
        {
          testId: 'sse-connection-singleton-test',
          testName: 'SSE Connection Singleton Pattern',
          testType: 'unit',
          category: 'sse_connection',
          description: 'Ensure only one SSE connection per instance/endpoint combination',
          scenario: 'Multiple SSE connection attempts should reuse existing connection',
          expectedBehavior: 'Single EventSource instance per unique endpoint',
          testImplementation: `
describe('SSE Connection Singleton', () => {
  it('should reuse existing SSE connection', () => {
    const sseManager = new SSEConnectionManager();
    const endpoint = '/api/claude/instances/test/terminal/stream';
    
    const connection1 = sseManager.connect(endpoint);
    const connection2 = sseManager.connect(endpoint);
    const connection3 = sseManager.connect(endpoint);
    
    expect(connection1).toBe(connection2);
    expect(connection2).toBe(connection3);
    
    const activeConnections = sseManager.getActiveConnections();
    expect(activeConnections.size).toBe(1);
  });
  
  it('should cleanup closed connections', async () => {
    const sseManager = new SSEConnectionManager();
    const endpoint = '/api/claude/instances/test/terminal/stream';
    
    const connection = sseManager.connect(endpoint);
    expect(sseManager.getActiveConnections().size).toBe(1);
    
    connection.close();
    await waitForCleanup();
    
    expect(sseManager.getActiveConnections().size).toBe(0);
    
    const newConnection = sseManager.connect(endpoint);
    expect(newConnection).not.toBe(connection);
  });
});`,
          assertionStrategy: 'Reference equality and connection state tracking',
          mockingStrategy: 'Mock EventSource with state tracking capabilities',
          preventedFailureType: ['sse_connection_leak', 'event_handler_duplication'],
          relatedPatterns: ['Multiple SSE event registrations'],
          priority: 'high'
        }
      ],
      implementationGuidelines: [
        'Implement SSE connection registry with singleton pattern',
        'Add automatic cleanup of closed/failed connections',
        'Create event handler deduplication mechanism',
        'Implement connection health monitoring'
      ],
      validationCriteria: [
        'No duplicate EventSource instances for same endpoint',
        'Proper cleanup of closed connections',
        'Event handlers registered only once per connection'
      ],
      monitoringMetrics: [
        'active_sse_connections_count',
        'duplicate_connection_attempts_blocked',
        'connection_cleanup_success_rate'
      ],
      successThreshold: 0.99
    });

    // Strategy 4: Terminal I/O Buffer Management
    this.addStrategy({
      strategyId: 'terminal-buffer-management',
      strategyName: 'Terminal I/O Buffer Management',
      targetPattern: 'terminal_output_accumulation_storm',
      preventionApproach: 'resource_limiting',
      tddTestCases: [
        {
          testId: 'output-buffer-size-limit-test',
          testName: 'Output Buffer Size Limiting',
          testType: 'stress',
          category: 'terminal_io',
          description: 'Prevent terminal output buffer from growing infinitely',
          scenario: 'Large amounts of terminal output should be properly managed',
          expectedBehavior: 'Buffer size remains within configured limits',
          testImplementation: `
describe('Output Buffer Management', () => {
  it('should limit buffer size to prevent memory exhaustion', async () => {
    const bufferManager = new TerminalBufferManager({ maxSizeMB: 10 });
    const largeOutput = 'x'.repeat(1024 * 1024); // 1MB chunks
    
    for (let i = 0; i < 20; i++) {
      bufferManager.append(largeOutput);
    }
    
    const bufferSizeMB = bufferManager.getSizeMB();
    expect(bufferSizeMB).toBeLessThanOrEqual(10);
    
    const totalLines = bufferManager.getLineCount();
    expect(totalLines).toBeGreaterThan(0);
  });
  
  it('should maintain recent output when buffer is full', () => {
    const bufferManager = new TerminalBufferManager({ maxLines: 100 });
    
    for (let i = 0; i < 200; i++) {
      bufferManager.append(\`Line \${i}\\n\`);
    }
    
    const lines = bufferManager.getLines();
    expect(lines.length).toBe(100);
    expect(lines[0]).toContain('Line 100');
    expect(lines[99]).toContain('Line 199');
  });
});`,
          assertionStrategy: 'Resource consumption monitoring with limits validation',
          mockingStrategy: 'Mock terminal output with controllable data generation',
          preventedFailureType: ['memory_exhaustion', 'ui_freeze'],
          relatedPatterns: ['Infinite output accumulation'],
          priority: 'medium'
        }
      ],
      implementationGuidelines: [
        'Implement circular buffer for terminal output',
        'Add buffer size monitoring and alerting',
        'Create output rate limiting mechanism',
        'Implement UI virtualization for large outputs'
      ],
      validationCriteria: [
        'Terminal buffer size never exceeds configured limit',
        'Recent output always available for display',
        'UI remains responsive during large output operations'
      ],
      monitoringMetrics: [
        'terminal_buffer_size_mb',
        'buffer_overflow_events',
        'ui_responsiveness_score'
      ],
      successThreshold: 0.95
    });
  }

  /**
   * Add a new prevention strategy
   */
  addStrategy(strategy: PreventionStrategy): void {
    this.strategies.push(strategy);
    
    // Add test cases to library
    strategy.tddTestCases.forEach(testCase => {
      this.testCaseLibrary.push(testCase);
    });

    this.persistStrategies();
    this.emit('strategyAdded', strategy);
  }

  /**
   * Get strategies for specific pattern
   */
  getStrategiesForPattern(pattern: string): PreventionStrategy[] {
    return this.strategies.filter(s => 
      s.targetPattern.includes(pattern) || 
      s.tddTestCases.some(tc => tc.relatedPatterns.includes(pattern))
    );
  }

  /**
   * Generate TDD test suite for pattern
   */
  generateTDDTestSuite(pattern: string): string {
    const relevantStrategies = this.getStrategiesForPattern(pattern);
    
    if (relevantStrategies.length === 0) {
      return this.generateGenericTestSuite(pattern);
    }

    let testSuite = `// TDD Test Suite for Pattern: ${pattern}\n`;
    testSuite += `// Generated by NLD Terminal Storm Prevention System\n\n`;
    
    relevantStrategies.forEach(strategy => {
      testSuite += `// Strategy: ${strategy.strategyName}\n`;
      testSuite += `// Prevention Approach: ${strategy.preventionApproach}\n\n`;
      
      strategy.tddTestCases.forEach(testCase => {
        testSuite += `// Test Case: ${testCase.testName}\n`;
        testSuite += `// Priority: ${testCase.priority}\n`;
        testSuite += `// Description: ${testCase.description}\n`;
        testSuite += `// Scenario: ${testCase.scenario}\n`;
        testSuite += `// Expected: ${testCase.expectedBehavior}\n\n`;
        testSuite += testCase.testImplementation + '\n\n';
      });
    });

    return testSuite;
  }

  /**
   * Generate generic test suite for unknown patterns
   */
  private generateGenericTestSuite(pattern: string): string {
    return `// Generic TDD Test Suite for Pattern: ${pattern}
// Generated by NLD Terminal Storm Prevention System

describe('Generic Terminal Storm Prevention for ${pattern}', () => {
  it('should detect pattern occurrence', () => {
    const detector = new PatternDetector();
    const testInput = generatePatternInput('${pattern}');
    
    const detected = detector.analyze(testInput);
    expect(detected.patterns).toContainPattern('${pattern}');
  });
  
  it('should prevent pattern escalation', async () => {
    const preventer = new PatternPreventer();
    const monitor = new PatternMonitor();
    
    preventer.enable('${pattern}');
    
    const simulation = new PatternSimulation('${pattern}');
    await simulation.run();
    
    const escalations = monitor.getEscalations('${pattern}');
    expect(escalations.length).toBe(0);
  });
  
  it('should provide recovery mechanism', async () => {
    const recovery = new PatternRecovery();
    
    // Simulate pattern occurrence
    const patternEvent = new PatternEvent('${pattern}', { severity: 'high' });
    
    const recovered = await recovery.handle(patternEvent);
    expect(recovered).toBe(true);
    
    const systemHealth = recovery.getSystemHealth();
    expect(systemHealth.status).toBe('healthy');
  });
});`;
  }

  /**
   * Validate strategy effectiveness
   */
  validateStrategyEffectiveness(strategyId: string, metrics: Record<string, number>): {
    isEffective: boolean;
    score: number;
    recommendations: string[];
  } {
    const strategy = this.strategies.find(s => s.strategyId === strategyId);
    if (!strategy) {
      return { isEffective: false, score: 0, recommendations: ['Strategy not found'] };
    }

    const scores: number[] = [];
    const recommendations: string[] = [];

    // Check monitoring metrics
    strategy.monitoringMetrics.forEach(metricName => {
      const value = metrics[metricName];
      if (value !== undefined) {
        // Normalize metric value (this would be more sophisticated in real implementation)
        const normalizedScore = Math.max(0, Math.min(1, (100 - value) / 100));
        scores.push(normalizedScore);
      } else {
        recommendations.push(`Missing metric: ${metricName}`);
      }
    });

    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const isEffective = averageScore >= strategy.successThreshold;

    if (!isEffective) {
      recommendations.push(`Strategy effectiveness below threshold (${averageScore.toFixed(2)} < ${strategy.successThreshold})`);
      recommendations.push(...strategy.implementationGuidelines);
    }

    return {
      isEffective,
      score: averageScore,
      recommendations
    };
  }

  /**
   * Get test cases by category
   */
  getTestCasesByCategory(category: TDDTestCase['category']): TDDTestCase[] {
    return this.testCaseLibrary.filter(tc => tc.category === category);
  }

  /**
   * Get test cases by priority
   */
  getTestCasesByPriority(priority: TDDTestCase['priority']): TDDTestCase[] {
    return this.testCaseLibrary.filter(tc => tc.priority === priority);
  }

  /**
   * Generate comprehensive prevention report
   */
  generatePreventionReport(): string {
    let report = '=== TDD Terminal Storm Prevention Report ===\n\n';
    
    report += `📊 STRATEGY OVERVIEW:\n`;
    report += `- Total Strategies: ${this.strategies.length}\n`;
    report += `- Total Test Cases: ${this.testCaseLibrary.length}\n\n`;
    
    report += `🧪 TEST CASE BREAKDOWN:\n`;
    const categoryBreakdown = this.getTestCaseCategoryBreakdown();
    Object.entries(categoryBreakdown).forEach(([category, count]) => {
      report += `- ${category}: ${count} tests\n`;
    });
    report += '\n';
    
    report += `⚡ HIGH PRIORITY TEST CASES:\n`;
    const highPriorityTests = this.getTestCasesByPriority('critical').concat(
      this.getTestCasesByPriority('high')
    );
    
    highPriorityTests.forEach(testCase => {
      report += `- ${testCase.testName} (${testCase.priority})\n`;
      report += `  Category: ${testCase.category}\n`;
      report += `  Prevents: ${testCase.preventedFailureType.join(', ')}\n\n`;
    });
    
    report += `🛡️ PREVENTION STRATEGIES:\n`;
    this.strategies.forEach(strategy => {
      report += `- ${strategy.strategyName}\n`;
      report += `  Target: ${strategy.targetPattern}\n`;
      report += `  Approach: ${strategy.preventionApproach}\n`;
      report += `  Tests: ${strategy.tddTestCases.length}\n`;
      report += `  Success Threshold: ${(strategy.successThreshold * 100).toFixed(1)}%\n\n`;
    });
    
    return report;
  }

  /**
   * Get test case category breakdown
   */
  private getTestCaseCategoryBreakdown(): Record<string, number> {
    return this.testCaseLibrary.reduce((acc, testCase) => {
      acc[testCase.category] = (acc[testCase.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Load existing strategies from storage
   */
  private loadExistingStrategies(): void {
    try {
      if (existsSync(this.storageFile)) {
        const data = readFileSync(this.storageFile, 'utf8');
        const parsed = JSON.parse(data);
        
        // Load custom strategies (built-in ones are already initialized)
        if (parsed.customStrategies) {
          parsed.customStrategies.forEach((strategy: PreventionStrategy) => {
            this.strategies.push(strategy);
            strategy.tddTestCases.forEach(testCase => {
              this.testCaseLibrary.push(testCase);
            });
          });
        }
        
        console.log(`📂 Loaded ${parsed.customStrategies?.length || 0} custom TDD prevention strategies`);
      }
    } catch (error) {
      console.error('Failed to load existing TDD strategies:', error);
    }
  }

  /**
   * Persist strategies to storage
   */
  private persistStrategies(): void {
    try {
      // Only save custom strategies (built-in ones will be re-initialized)
      const customStrategies = this.strategies.filter(s => 
        !['pty-config-management', 'process-spawn-debouncing', 'sse-connection-deduplication', 'terminal-buffer-management'].includes(s.strategyId)
      );
      
      const data = {
        customStrategies,
        lastUpdated: new Date().toISOString()
      };
      
      writeFileSync(this.storageFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to persist TDD strategies:', error);
    }
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): PreventionStrategy[] {
    return [...this.strategies];
  }

  /**
   * Get all test cases
   */
  getAllTestCases(): TDDTestCase[] {
    return [...this.testCaseLibrary];
  }
}

export default TDDTerminalStormPreventionStrategies;