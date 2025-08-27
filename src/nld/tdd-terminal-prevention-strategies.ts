/**
 * TDD Terminal Prevention Strategies
 * 
 * Provides comprehensive TDD strategies to prevent terminal pipe failures
 * Based on real failure patterns detected by NLD system
 * Generates actionable test patterns for London School TDD approach
 */

import * as fs from 'fs';
import * as path from 'path';

interface TDDPreventionStrategy {
  id: string;
  name: string;
  targetFailurePattern: string;
  category: 'unit' | 'integration' | 'contract' | 'e2e' | 'property';
  priority: 'low' | 'medium' | 'high' | 'critical';
  testPattern: {
    description: string;
    testCode: string;
    mockingStrategy: string;
    assertions: string[];
  };
  londonSchoolPrinciples: {
    outsideInApproach: string;
    mockingDoubles: string[];
    behaviorVerification: string[];
  };
  preventionEffectiveness: number; // 0-1 score
  implementationGuide: string[];
  realWorldScenarios: Array<{
    scenario: string;
    testCase: string;
    expectedPrevention: string;
  }>;
}

export class TDDTerminalPreventionStrategies {
  private strategies: Map<string, TDDPreventionStrategy> = new Map();
  private effectivenessTracking: Map<string, number[]> = new Map();

  constructor(private options = {
    logDirectory: '/workspaces/agent-feed/src/nld/patterns/terminal-pipe-failures',
    generateTestFiles: true
  }) {
    this.initializePreventionStrategies();
  }

  /**
   * Initialize comprehensive TDD prevention strategies
   */
  private initializePreventionStrategies(): void {
    
    // Strategy 1: Mock Data Prevention
    this.addStrategy({
      id: 'mock-data-prevention',
      name: 'Mock Data Detection Prevention',
      targetFailurePattern: 'mock_data_detected',
      category: 'contract',
      priority: 'high',
      testPattern: {
        description: 'Contract tests to ensure real process output reaches frontend',
        testCode: `
describe('Real Process Output Contract', () => {
  let processManager: ProcessManager;
  let terminalSSE: TerminalSSEBridge;
  
  beforeEach(() => {
    processManager = new ProcessManager();
    terminalSSE = new TerminalSSEBridge();
  });

  it('should stream real process stdout to frontend', async () => {
    // Arrange
    const instanceId = 'test-instance';
    const realProcess = await processManager.spawnClaudeInstance(instanceId);
    const sseConnection = terminalSSE.createConnection(instanceId);
    
    // Act
    realProcess.stdin.write('echo "real-output"\\n');
    const output = await sseConnection.waitForOutput(2000);
    
    // Assert
    expect(output).toContain('real-output');
    expect(output).not.toContain('HTTP/SSE mode active');
    expect(output).not.toContain('mock response');
    expect(output).not.toContain('WebSocket eliminated');
  });

  it('should fail when mock data is returned instead of real output', async () => {
    // This test should FAIL if mock data prevention is not working
    const mockOutput = 'HTTP/SSE mode active - WebSocket eliminated';
    
    expect(() => {
      validateRealProcessOutput(mockOutput);
    }).toThrow('Mock data detected in process output');
  });
});`,
        mockingStrategy: 'Mock SSE connection, real process execution',
        assertions: [
          'Output contains process-specific content',
          'Output does not contain mock patterns',
          'Working directory matches expected path',
          'Response time indicates real execution'
        ]
      },
      londonSchoolPrinciples: {
        outsideInApproach: 'Start with frontend expectation, work inward to process layer',
        mockingDoubles: ['SSE Connection', 'Process Manager', 'Event Broadcaster'],
        behaviorVerification: [
          'Verify process.stdout.on("data") is called',
          'Verify SSE event broadcast is triggered',
          'Verify frontend receives real data'
        ]
      },
      preventionEffectiveness: 0.9,
      implementationGuide: [
        '1. Create ProcessOutputValidator class to detect mock patterns',
        '2. Implement contract tests between backend and frontend',
        '3. Add real-time monitoring for mock pattern detection',
        '4. Set up alerts for mock data in production',
        '5. Use property-based testing for output validation'
      ],
      realWorldScenarios: [
        {
          scenario: 'User runs pwd command in terminal',
          testCase: 'Verify pwd returns actual working directory, not mock path',
          expectedPrevention: 'Test fails if mock directory like "/tmp/mock" is returned'
        },
        {
          scenario: 'User runs npm install command',
          testCase: 'Verify output contains actual npm messages, not "HTTP/SSE active"',
          expectedPrevention: 'Test catches when real command output is replaced with mock'
        }
      ]
    });

    // Strategy 2: Stdout Pipe Connection Prevention
    this.addStrategy({
      id: 'stdout-pipe-connection',
      name: 'Stdout Pipe Connection Verification',
      targetFailurePattern: 'broken_pipe',
      category: 'integration',
      priority: 'critical',
      testPattern: {
        description: 'Integration tests to ensure stdout/stderr pipes are properly connected',
        testCode: `
describe('Process Pipe Integration', () => {
  let processManager: ProcessManager;
  let outputCollector: OutputCollector;

  it('should connect stdout pipe from process to SSE broadcaster', async () => {
    // Arrange
    const instanceId = 'pipe-test';
    const mockSSEBroadcaster = {
      broadcast: jest.fn(),
      connections: new Map()
    };
    
    // Act
    const process = await processManager.createRealClaudeInstance(instanceId);
    process.stdout.write('test-output');
    
    await waitForEventPropagation(100);
    
    // Assert
    expect(mockSSEBroadcaster.broadcast).toHaveBeenCalledWith(
      instanceId,
      expect.objectContaining({
        type: 'output',
        data: 'test-output'
      })
    );
  });

  it('should detect when stdout pipe is disconnected', async () => {
    const process = await processManager.spawnProcess();
    const pipeMonitor = new PipeMonitor(process);
    
    // Simulate pipe disconnection
    process.stdout.removeAllListeners('data');
    
    process.stdout.write('this-should-trigger-alert');
    
    await waitFor(() => 
      expect(pipeMonitor.isPipeConnected()).toBe(false)
    );
  });
});`,
        mockingStrategy: 'Mock SSE broadcaster, real process spawning',
        assertions: [
          'Process stdout events trigger SSE broadcasts',
          'Process stderr events are captured',
          'Pipe disconnection is detected',
          'Failed broadcasts are logged'
        ]
      },
      londonSchoolPrinciples: {
        outsideInApproach: 'Test from SSE endpoint expectation down to process pipe',
        mockingDoubles: ['SSE Response Stream', 'Event Broadcaster', 'Connection Manager'],
        behaviorVerification: [
          'Verify stdout.on("data", handler) is called',
          'Verify handler calls broadcaster.broadcast()',
          'Verify SSE response.write() is called'
        ]
      },
      preventionEffectiveness: 0.95,
      implementationGuide: [
        '1. Create PipeMonitor class to track pipe health',
        '2. Implement integration tests for process -> SSE flow',
        '3. Add pipe connection validation in process setup',
        '4. Monitor for stdout event handler attachment',
        '5. Implement automatic pipe reconnection'
      ],
      realWorldScenarios: [
        {
          scenario: 'Process spawns but user sees no output',
          testCase: 'Verify stdout data events reach SSE broadcaster',
          expectedPrevention: 'Test fails when pipe is disconnected, alerting to issue'
        }
      ]
    });

    // Strategy 3: SSE Event Flow Prevention
    this.addStrategy({
      id: 'sse-event-flow-validation',
      name: 'SSE Event Flow Validation',
      targetFailurePattern: 'sse_gap',
      category: 'integration',
      priority: 'high',
      testPattern: {
        description: 'Tests to ensure SSE events flow properly from backend to frontend',
        testCode: `
describe('SSE Event Flow Validation', () => {
  let sseServer: SSEServer;
  let eventTracker: EventTracker;

  it('should deliver all sent events to active connections', async () => {
    // Arrange
    const instanceId = 'sse-test';
    const connection1 = sseServer.createConnection(instanceId);
    const connection2 = sseServer.createConnection(instanceId);
    
    const sentEvents = [];
    const receivedEvents = [];
    
    // Act
    for (let i = 0; i < 10; i++) {
      const event = { type: 'output', data: \`test-\${i}\` };
      sentEvents.push(event);
      sseServer.broadcast(instanceId, event);
    }
    
    await connection1.collectEvents(receivedEvents);
    
    // Assert
    expect(receivedEvents.length).toBe(sentEvents.length);
    sentEvents.forEach((sent, index) => {
      expect(receivedEvents[index]).toMatchObject(sent);
    });
  });

  it('should detect when SSE connections become stale', async () => {
    const connection = sseServer.createConnection('stale-test');
    const healthMonitor = new SSEHealthMonitor();
    
    // Simulate stale connection
    connection.markAsStale();
    
    sseServer.broadcast('stale-test', { type: 'output', data: 'test' });
    
    await waitFor(() => 
      expect(healthMonitor.hasStaleConnections()).toBe(true)
    );
  });
});`,
        mockingStrategy: 'Mock HTTP response streams, real event generation',
        assertions: [
          'All sent events are received',
          'Event order is preserved',
          'Stale connections are detected',
          'Connection cleanup works properly'
        ]
      },
      londonSchoolPrinciples: {
        outsideInApproach: 'Test from frontend event receipt down to backend generation',
        mockingDoubles: ['HTTP Response', 'Connection Manager', 'Event Queue'],
        behaviorVerification: [
          'Verify response.write() called for each connection',
          'Verify stale connections are removed',
          'Verify event serialization is correct'
        ]
      },
      preventionEffectiveness: 0.85,
      implementationGuide: [
        '1. Create SSEHealthMonitor to track connection states',
        '2. Implement event delivery confirmation',
        '3. Add connection heartbeat mechanism',
        '4. Monitor event delivery success rates',
        '5. Implement automatic connection cleanup'
      ],
      realWorldScenarios: [
        {
          scenario: 'Multiple users connected to same Claude instance',
          testCase: 'Verify all users receive terminal output events',
          expectedPrevention: 'Test catches when some connections miss events'
        }
      ]
    });

    // Strategy 4: Working Directory Validation
    this.addStrategy({
      id: 'working-directory-validation',
      name: 'Working Directory Path Validation',
      targetFailurePattern: 'wrong_directory',
      category: 'unit',
      priority: 'medium',
      testPattern: {
        description: 'Unit tests to validate working directory resolution and display',
        testCode: `
describe('Working Directory Validation', () => {
  let directoryResolver: DirectoryResolver;

  it('should resolve correct working directory for instance type', async () => {
    // Arrange
    directoryResolver = new DirectoryResolver('/workspaces/agent-feed');
    
    // Act & Assert
    const prodDir = await directoryResolver.resolveWorkingDirectory('prod');
    expect(prodDir).toBe('/workspaces/agent-feed/prod');
    
    const frontendDir = await directoryResolver.resolveWorkingDirectory('frontend');
    expect(frontendDir).toBe('/workspaces/agent-feed/frontend');
    
    const defaultDir = await directoryResolver.resolveWorkingDirectory('unknown');
    expect(defaultDir).toBe('/workspaces/agent-feed');
  });

  it('should reject invalid or mock directory paths', () => {
    const invalidPaths = [
      '/mock/directory',
      '/tmp/mock',
      'C:\\\\Users\\\\Default',
      '/var/tmp/fake'
    ];
    
    invalidPaths.forEach(path => {
      expect(() => {
        directoryResolver.validateWorkingDirectory(path);
      }).toThrow('Invalid or mock directory path detected');
    });
  });

  it('should ensure directory exists and is accessible', async () => {
    const validPath = '/workspaces/agent-feed/frontend';
    const invalidPath = '/nonexistent/directory';
    
    expect(await directoryResolver.validateDirectory(validPath)).toBe(true);
    expect(await directoryResolver.validateDirectory(invalidPath)).toBe(false);
  });
});`,
        mockingStrategy: 'Mock file system access, real path validation logic',
        assertions: [
          'Correct directory mapping for instance types',
          'Invalid paths are rejected',
          'Directory existence is verified',
          'Path security is validated'
        ]
      },
      londonSchoolPrinciples: {
        outsideInApproach: 'Test directory display requirement down to path resolution',
        mockingDoubles: ['File System', 'Path Resolver', 'Directory Validator'],
        behaviorVerification: [
          'Verify fs.stat() called for path validation',
          'Verify security checks are performed',
          'Verify correct mapping logic'
        ]
      },
      preventionEffectiveness: 0.75,
      implementationGuide: [
        '1. Create DirectoryValidator with security rules',
        '2. Add path mapping validation tests',
        '3. Implement directory existence verification',
        '4. Add security boundary checking',
        '5. Monitor for mock path patterns'
      ],
      realWorldScenarios: [
        {
          scenario: 'User creates frontend instance',
          testCase: 'Verify working directory shows /workspaces/agent-feed/frontend',
          expectedPrevention: 'Test catches when mock path like /tmp is shown instead'
        }
      ]
    });

    // Strategy 5: End-to-End Terminal Flow
    this.addStrategy({
      id: 'e2e-terminal-flow',
      name: 'End-to-End Terminal Flow Validation',
      targetFailurePattern: 'complete_flow_failure',
      category: 'e2e',
      priority: 'high',
      testPattern: {
        description: 'Complete end-to-end tests for terminal functionality',
        testCode: `
describe('End-to-End Terminal Flow', () => {
  let browser: Browser;
  let page: Page;
  let backendServer: BackendServer;

  beforeAll(async () => {
    backendServer = await startBackendServer();
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  it('should complete full terminal interaction cycle', async () => {
    // Navigate to application
    await page.goto('http://localhost:5173');
    
    // Create Claude instance
    await page.click('[data-testid="create-instance"]');
    await page.selectOption('[data-testid="instance-type"]', 'frontend');
    await page.click('[data-testid="create-button"]');
    
    // Wait for terminal connection
    await page.waitForSelector('[data-testid="terminal-connected"]', { timeout: 10000 });
    
    // Send command and verify real output
    await page.type('[data-testid="terminal-input"]', 'pwd');
    await page.press('[data-testid="terminal-input"]', 'Enter');
    
    // Wait for and verify response
    const output = await page.waitForSelector('[data-testid="terminal-output"]');
    const outputText = await output.textContent();
    
    expect(outputText).toContain('/workspaces/agent-feed/frontend');
    expect(outputText).not.toContain('HTTP/SSE mode active');
    expect(outputText).not.toContain('mock');
    
    // Test error handling
    await page.type('[data-testid="terminal-input"]', 'invalidcommand123');
    await page.press('[data-testid="terminal-input"]', 'Enter');
    
    const errorOutput = await page.waitForSelector('[data-testid="terminal-output"]:last-child');
    const errorText = await errorOutput.textContent();
    
    expect(errorText).toContain('command not found');
  });
});`,
        mockingStrategy: 'No mocks - real browser and backend integration',
        assertions: [
          'Instance creation works end-to-end',
          'Terminal displays real process output',
          'Commands execute properly',
          'Error handling works correctly'
        ]
      },
      londonSchoolPrinciples: {
        outsideInApproach: 'Test complete user journey from frontend to backend',
        mockingDoubles: [], // No mocks in E2E tests
        behaviorVerification: [
          'Verify user interactions trigger correct backend calls',
          'Verify real process execution occurs',
          'Verify output flows back to frontend'
        ]
      },
      preventionEffectiveness: 0.8,
      implementationGuide: [
        '1. Set up Playwright for E2E testing',
        '2. Create test fixtures for Claude instances',
        '3. Implement terminal interaction helpers',
        '4. Add visual regression testing',
        '5. Set up CI/CD integration'
      ],
      realWorldScenarios: [
        {
          scenario: 'New user creates their first Claude instance',
          testCase: 'Complete workflow from instance creation to terminal usage',
          expectedPrevention: 'Catches any break in the complete user journey'
        }
      ]
    });

    console.log(`🛡️ TDD Prevention Strategies initialized with ${this.strategies.size} strategies`);
  }

  /**
   * Add a prevention strategy
   */
  private addStrategy(strategy: TDDPreventionStrategy): void {
    this.strategies.set(strategy.id, strategy);
    this.effectivenessTracking.set(strategy.id, []);
  }

  /**
   * Get prevention strategies for specific failure pattern
   */
  public getStrategiesForFailure(failurePattern: string): TDDPreventionStrategy[] {
    return Array.from(this.strategies.values())
      .filter(s => s.targetFailurePattern === failurePattern)
      .sort((a, b) => b.preventionEffectiveness - a.preventionEffectiveness);
  }

  /**
   * Generate test code for failure prevention
   */
  public generateTestCode(failurePattern: string): string {
    const strategies = this.getStrategiesForFailure(failurePattern);
    
    if (strategies.length === 0) {
      return '// No prevention strategies found for this failure pattern';
    }

    const testCode = strategies
      .map(strategy => `
// ${strategy.name} - Effectiveness: ${strategy.preventionEffectiveness}
// London School Approach: ${strategy.londonSchoolPrinciples.outsideInApproach}

${strategy.testPattern.testCode}

// Implementation Guide:
${strategy.implementationGuide.map(step => `// ${step}`).join('\n')}
`)
      .join('\n\n');

    return testCode;
  }

  /**
   * Generate complete test file for terminal pipe failure prevention
   */
  public generateCompleteTestFile(): string {
    const testFile = `
/**
 * Terminal Pipe Failure Prevention Test Suite
 * Generated by NLD TDD Prevention Strategies
 * 
 * This test suite prevents the following failure patterns:
 * - Mock data being displayed instead of real process output
 * - Stdout/stderr pipe disconnections
 * - SSE event flow gaps
 * - Working directory mismatches
 * - Complete terminal flow failures
 */

import { jest } from '@jest/globals';
import { chromium, Browser, Page } from 'playwright';

${Array.from(this.strategies.values())
  .map(strategy => strategy.testPattern.testCode)
  .join('\n\n')}

// Property-based testing for output validation
describe('Property-Based Terminal Output Tests', () => {
  it('should never return mock patterns for any valid command', () => {
    const mockPatterns = [
      'HTTP/SSE mode active',
      'WebSocket eliminated', 
      'mock response',
      'placeholder data'
    ];
    
    const validCommands = ['pwd', 'ls', 'echo test', 'whoami', 'date'];
    
    validCommands.forEach(async command => {
      const output = await executeRealCommand(command);
      mockPatterns.forEach(pattern => {
        expect(output).not.toContain(pattern);
      });
    });
  });
});

// Contract testing between layers
describe('Terminal Component Contracts', () => {
  it('should maintain contract between ProcessManager and TerminalSSE', async () => {
    const processManager = new ProcessManager();
    const terminalSSE = new TerminalSSE();
    
    // Contract: ProcessManager stdout events must trigger TerminalSSE broadcasts
    const process = await processManager.spawn('test-instance');
    const broadcastSpy = jest.spyOn(terminalSSE, 'broadcast');
    
    process.stdout.emit('data', 'test output');
    
    expect(broadcastSpy).toHaveBeenCalledWith(
      'test-instance',
      expect.objectContaining({
        type: 'output',
        data: 'test output'
      })
    );
  });
});
`;

    if (this.options.generateTestFiles) {
      const testPath = path.join(this.options.logDirectory, 'terminal-pipe-prevention.test.ts');
      fs.writeFileSync(testPath, testFile);
      console.log(`🧪 Test file generated: ${testPath}`);
    }

    return testFile;
  }

  /**
   * Track prevention effectiveness
   */
  public trackEffectiveness(strategyId: string, prevented: boolean): void {
    const tracking = this.effectivenessTracking.get(strategyId) || [];
    tracking.push(prevented ? 1 : 0);
    
    // Keep only last 100 measurements
    if (tracking.length > 100) {
      tracking.splice(0, tracking.length - 100);
    }
    
    this.effectivenessTracking.set(strategyId, tracking);
  }

  /**
   * Get effectiveness statistics
   */
  public getEffectivenessStats(): {
    byStrategy: Record<string, {
      name: string;
      theoreticalEffectiveness: number;
      measuredEffectiveness: number;
      sampleSize: number;
    }>;
    overallEffectiveness: number;
  } {
    const byStrategy: Record<string, any> = {};
    let totalMeasurements = 0;
    let totalPrevented = 0;

    for (const [strategyId, measurements] of this.effectivenessTracking.entries()) {
      const strategy = this.strategies.get(strategyId)!;
      const prevented = measurements.filter(m => m === 1).length;
      const measuredEffectiveness = measurements.length > 0 ? prevented / measurements.length : 0;
      
      byStrategy[strategyId] = {
        name: strategy.name,
        theoreticalEffectiveness: strategy.preventionEffectiveness,
        measuredEffectiveness,
        sampleSize: measurements.length
      };
      
      totalMeasurements += measurements.length;
      totalPrevented += prevented;
    }

    return {
      byStrategy,
      overallEffectiveness: totalMeasurements > 0 ? totalPrevented / totalMeasurements : 0
    };
  }

  /**
   * Export strategies for neural training
   */
  public exportForNeuralTraining(): void {
    const exportData = Array.from(this.strategies.values()).map(strategy => ({
      strategy_id: strategy.id,
      failure_pattern: strategy.targetFailurePattern,
      category: strategy.category,
      effectiveness: strategy.preventionEffectiveness,
      priority: strategy.priority,
      test_assertions: strategy.testPattern.assertions,
      london_school_principles: strategy.londonSchoolPrinciples,
      implementation_complexity: strategy.implementationGuide.length
    }));

    const exportPath = path.join(this.options.logDirectory, 'tdd-strategies-neural-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    
    console.log(`🧠 TDD strategies exported for neural training: ${exportPath}`);
  }

  /**
   * Get all strategies
   */
  public getAllStrategies(): TDDPreventionStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get strategy by ID
   */
  public getStrategy(id: string): TDDPreventionStrategy | undefined {
    return this.strategies.get(id);
  }
}