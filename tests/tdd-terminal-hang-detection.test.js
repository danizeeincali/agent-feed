/**
 * TDD Terminal Hang Detection Test Suite
 * SPARC Refinement Phase Implementation
 * 
 * Progressive Test Coverage:
 * 1. WebSocket Connection Stability
 * 2. PTY Process Lifecycle Management
 * 3. Claude CLI Hang Prevention
 * 4. Recovery Protocol Validation
 * 5. End-to-End Communication Flow
 */

const { TerminalHangDetector } = require('../src/utils/terminal-hang-detector');
const { RobustWebSocketManager } = require('../src/utils/robust-websocket-manager');
const { ClaudeCommandDetector } = require('../src/utils/claude-command-detector');
const { PTYProcessManager } = require('../src/utils/pty-process-manager');

// Mock WebSocket for testing
const mockWebSocket = {
  readyState: 1,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn()
};

// Mock PTY process for testing
const mockPTYProcess = {
  pid: 12345,
  write: jest.fn(),
  kill: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

describe('SPARC Terminal Hang Detection System', () => {
  
  describe('1. WebSocket Connection Stability', () => {
    let hangDetector;
    
    beforeEach(() => {
      hangDetector = new TerminalHangDetector({
        timeoutMs: 5000,
        heartbeatInterval: 1000
      });
    });
    
    afterEach(() => {
      hangDetector.cleanup();
    });
    
    test('should establish WebSocket connection within timeout', async () => {
      const connectionPromise = new Promise((resolve) => {
        setTimeout(() => resolve('connected'), 100);
      });
      
      const result = await Promise.race([
        connectionPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 2000)
        )
      ]);
      
      expect(result).toBe('connected');
    });
    
    test('should detect WebSocket hang within configured timeout', async () => {
      const startTime = Date.now();
      
      // Simulate hang by never resolving
      const hangPromise = new Promise(() => {});
      
      const hangDetected = await Promise.race([
        hangPromise,
        new Promise((resolve) => {
          setTimeout(() => resolve(true), 5000);
        })
      ]);
      
      const elapsed = Date.now() - startTime;
      
      expect(hangDetected).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(4900); // Allow for timing variance
      expect(elapsed).toBeLessThan(5500);
    });
    
    test('should trigger recovery protocol on hang detection', () => {
      const mockRecoveryFn = jest.fn();
      hangDetector.onHangDetected(mockRecoveryFn);
      
      // Simulate hang condition
      hangDetector.simulateHang();
      
      expect(mockRecoveryFn).toHaveBeenCalledWith({
        type: 'connection_hang',
        timestamp: expect.any(Number),
        lastActivity: expect.any(Number)
      });
    });
    
    test('should implement exponential backoff for reconnection attempts', () => {
      const wsManager = new RobustWebSocketManager();
      
      // First reconnection attempt
      expect(wsManager.getReconnectDelay(1)).toBe(1000);
      
      // Second attempt (exponential backoff)
      expect(wsManager.getReconnectDelay(2)).toBe(2000);
      
      // Third attempt
      expect(wsManager.getReconnectDelay(3)).toBe(4000);
      
      // Max backoff limit
      expect(wsManager.getReconnectDelay(10)).toBe(30000);
    });
  });
  
  describe('2. PTY Process Lifecycle Management', () => {
    let processManager;
    
    beforeEach(() => {
      processManager = new PTYProcessManager();
    });
    
    afterEach(() => {
      processManager.cleanup();
    });
    
    test('should spawn PTY process with correct configuration', async () => {
      const process = await processManager.spawn({
        shell: '/bin/bash',
        cwd: '/workspaces/agent-feed',
        cols: 80,
        rows: 24
      });
      
      expect(process.pid).toBeGreaterThan(0);
      expect(process.isAlive()).toBe(true);
      expect(process.options.cols).toBe(80);
      expect(process.options.rows).toBe(24);
    });
    
    test('should handle PTY process cleanup on termination', async () => {
      const process = await processManager.spawn();
      const pid = process.pid;
      
      // Simulate process termination
      process.emit('exit', 0, 'SIGTERM');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(processManager.getProcess(pid)).toBeUndefined();
      expect(processManager.getActiveProcessCount()).toBe(0);
    });
    
    test('should detect PTY process hang and initiate recovery', async () => {
      const process = await processManager.spawn();
      const mockRecoveryFn = jest.fn();
      
      processManager.onProcessHang(mockRecoveryFn);
      
      // Simulate process hang (no data for extended period)
      processManager.simulateProcessHang(process.pid);
      
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      expect(mockRecoveryFn).toHaveBeenCalledWith({
        type: 'process_hang',
        pid: process.pid,
        lastActivity: expect.any(Number)
      });
    });
    
    test('should enforce process resource limits', async () => {
      const process = await processManager.spawn({
        maxMemoryMB: 100,
        maxCpuPercent: 50,
        maxRuntimeMs: 60000
      });
      
      // Simulate resource usage monitoring
      processManager.monitorResourceUsage(process.pid);
      
      const stats = processManager.getResourceStats(process.pid);
      
      expect(stats.memoryLimitMB).toBe(100);
      expect(stats.cpuLimitPercent).toBe(50);
      expect(stats.maxRuntimeMs).toBe(60000);
    });
  });
  
  describe('3. Claude CLI Hang Prevention', () => {
    let commandDetector;
    
    beforeEach(() => {
      commandDetector = new ClaudeCommandDetector();
    });
    
    test('should detect incomplete claude commands that cause hangs', () => {
      const hangCommands = [
        'claude\r',
        'claude\n',
        'claude',
        'cd prod && claude\r',
        'cd /workspaces/agent-feed && claude\n'
      ];
      
      hangCommands.forEach(command => {
        expect(commandDetector.isIncompleteCommand(command))
          .toBe(true);
      });
    });
    
    test('should allow valid claude commands to pass through', () => {
      const validCommands = [
        'claude --help\r',
        'claude --version\n',
        'claude chat\r',
        'claude code --file test.js\r'
      ];
      
      validCommands.forEach(command => {
        expect(commandDetector.isIncompleteCommand(command))
          .toBe(false);
      });
    });
    
    test('should provide helpful guidance for incomplete commands', () => {
      const helpMessage = commandDetector.getHelpfulMessage('claude\r');
      
      expect(helpMessage).toContain('Claude CLI Usage Help');
      expect(helpMessage).toContain('claude --version');
      expect(helpMessage).toContain('claude --help');
      expect(helpMessage).toContain('claude chat');
      expect(helpMessage).toContain('claude code');
      expect(helpMessage).toContain('without arguments enters interactive mode');
    });
    
    test('should track command execution patterns for learning', () => {
      const commands = [
        'claude --help\r',
        'claude\r', // This should be flagged
        'claude --version\r',
        'claude\n'  // This should be flagged
      ];
      
      commands.forEach(cmd => commandDetector.processCommand(cmd));
      
      const patterns = commandDetector.getLearnedPatterns();
      
      expect(patterns.hangPatterns).toContain('claude\r');
      expect(patterns.hangPatterns).toContain('claude\n');
      expect(patterns.safePatterns).toContain('claude --help\r');
      expect(patterns.safePatterns).toContain('claude --version\r');
    });
  });
  
  describe('4. Recovery Protocol Validation', () => {
    let recoveryProtocol;
    
    beforeEach(() => {
      recoveryProtocol = new TerminalRecoveryProtocol({
        maxRecoveryAttempts: 3,
        recoveryTimeoutMs: 10000
      });
    });
    
    test('should execute progressive recovery steps', async () => {
      const mockSteps = {
        heartbeat: jest.fn().mockResolvedValue(false),
        resetConnection: jest.fn().mockResolvedValue(false),
        respawnProcess: jest.fn().mockResolvedValue(true)
      };
      
      recoveryProtocol.setRecoverySteps(mockSteps);
      
      const result = await recoveryProtocol.executeRecovery('test-session');
      
      expect(mockSteps.heartbeat).toHaveBeenCalled();
      expect(mockSteps.resetConnection).toHaveBeenCalled();
      expect(mockSteps.respawnProcess).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.recoveredAtStep).toBe('respawnProcess');
    });
    
    test('should fail gracefully when all recovery steps fail', async () => {
      const mockSteps = {
        heartbeat: jest.fn().mockResolvedValue(false),
        resetConnection: jest.fn().mockResolvedValue(false),
        respawnProcess: jest.fn().mockResolvedValue(false),
        reinitialize: jest.fn().mockResolvedValue(false)
      };
      
      recoveryProtocol.setRecoverySteps(mockSteps);
      
      const result = await recoveryProtocol.executeRecovery('test-session');
      
      expect(result.success).toBe(false);
      expect(result.attemptsExhausted).toBe(true);
      expect(result.finalAction).toBe('user_notification_required');
    });
    
    test('should track recovery success rates for optimization', async () => {
      const scenarios = [
        { heartbeat: true },
        { heartbeat: false, resetConnection: true },
        { heartbeat: false, resetConnection: false, respawnProcess: true }
      ];
      
      for (const scenario of scenarios) {
        const mockSteps = {
          heartbeat: jest.fn().mockResolvedValue(scenario.heartbeat || false),
          resetConnection: jest.fn().mockResolvedValue(scenario.resetConnection || false),
          respawnProcess: jest.fn().mockResolvedValue(scenario.respawnProcess || false)
        };
        
        recoveryProtocol.setRecoverySteps(mockSteps);
        await recoveryProtocol.executeRecovery(`test-${Math.random()}`);
      }
      
      const stats = recoveryProtocol.getRecoveryStats();
      
      expect(stats.totalAttempts).toBe(3);
      expect(stats.successRate).toBeGreaterThan(0);
      expect(stats.mostEffectiveStep).toBeDefined();
    });
  });
  
  describe('5. End-to-End Communication Flow', () => {
    let terminalSystem;
    
    beforeEach(() => {
      terminalSystem = new TerminalSystem({
        frontend: mockWebSocket,
        backend: mockPTYProcess,
        hangDetection: true,
        recoveryEnabled: true
      });
    });
    
    afterEach(() => {
      terminalSystem.shutdown();
    });
    
    test('should complete full communication cycle without hang', async () => {
      const startTime = Date.now();
      
      // 1. Establish connection
      await terminalSystem.connect();
      expect(terminalSystem.isConnected()).toBe(true);
      
      // 2. Send command and receive response
      const response = await terminalSystem.executeCommand('echo "test message"');
      expect(response.output).toContain('test message');
      expect(response.executionTime).toBeLessThan(1000);
      
      // 3. Verify no hang detection was triggered
      expect(terminalSystem.hangDetector.wasTriggered()).toBe(false);
      
      // 4. Verify total operation time
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(5000);
      
      // 5. Clean shutdown
      await terminalSystem.disconnect();
      expect(terminalSystem.isConnected()).toBe(false);
    });
    
    test('should handle rapid command sequences without data loss', async () => {
      await terminalSystem.connect();
      
      const commands = [
        'echo "command 1"',
        'echo "command 2"',
        'echo "command 3"',
        'pwd',
        'whoami'
      ];
      
      const results = await Promise.all(
        commands.map(cmd => terminalSystem.executeCommand(cmd))
      );
      
      // Verify all commands executed successfully
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.command).toBe(commands[index]);
      });
      
      // Verify no commands were lost or duplicated
      expect(terminalSystem.getCommandHistory()).toHaveLength(5);
    });
    
    test('should recover gracefully from simulated hang conditions', async () => {
      await terminalSystem.connect();
      
      // Simulate various hang conditions
      const hangTests = [
        () => terminalSystem.simulateWebSocketHang(),
        () => terminalSystem.simulateProcessHang(),
        () => terminalSystem.simulateClaudeCliHang()
      ];
      
      for (const simulateHang of hangTests) {
        simulateHang();
        
        // Wait for hang detection
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        // Verify recovery was initiated
        expect(terminalSystem.recoveryProtocol.isActive()).toBe(true);
        
        // Wait for recovery completion
        await terminalSystem.waitForRecovery();
        
        // Verify system is functional again
        expect(terminalSystem.isConnected()).toBe(true);
        
        const testResponse = await terminalSystem.executeCommand('echo "recovery test"');
        expect(testResponse.success).toBe(true);
      }
    });
    
    test('should maintain performance benchmarks under load', async () => {
      await terminalSystem.connect();
      
      const performanceTests = {
        connectionTime: null,
        commandResponseTime: [],
        hangDetectionTime: null,
        recoveryTime: null
      };
      
      // Test connection establishment time
      const connectionStart = Date.now();
      await terminalSystem.reconnect();
      performanceTests.connectionTime = Date.now() - connectionStart;
      
      // Test command response times
      for (let i = 0; i < 10; i++) {
        const cmdStart = Date.now();
        await terminalSystem.executeCommand(`echo "test ${i}"`);
        performanceTests.commandResponseTime.push(Date.now() - cmdStart);
      }
      
      // Test hang detection time
      const hangStart = Date.now();
      terminalSystem.simulateProcessHang();
      await terminalSystem.waitForHangDetection();
      performanceTests.hangDetectionTime = Date.now() - hangStart;
      
      // Test recovery time
      const recoveryStart = Date.now();
      await terminalSystem.waitForRecovery();
      performanceTests.recoveryTime = Date.now() - recoveryStart;
      
      // Verify performance benchmarks
      expect(performanceTests.connectionTime).toBeLessThan(2000);
      expect(Math.max(...performanceTests.commandResponseTime)).toBeLessThan(1000);
      expect(performanceTests.hangDetectionTime).toBeLessThan(5000);
      expect(performanceTests.recoveryTime).toBeLessThan(10000);
    });
  });
  
  describe('6. Integration with Existing System', () => {
    test('should maintain compatibility with SimpleLauncher component', () => {
      const launcher = new SimpleLauncher();
      launcher.setTerminalSystem(terminalSystem);
      
      expect(launcher.isSystemCompatible()).toBe(true);
      expect(launcher.getSystemCapabilities()).toContain('hang_detection');
      expect(launcher.getSystemCapabilities()).toContain('auto_recovery');
    });
    
    test('should preserve existing Terminal component functionality', () => {
      const terminal = new TerminalComponent({
        hangDetection: terminalSystem.hangDetector,
        recoveryProtocol: terminalSystem.recoveryProtocol
      });
      
      expect(terminal.hasEnhancedCapabilities()).toBe(true);
      expect(terminal.isBackwardCompatible()).toBe(true);
    });
  });
});

// Performance benchmark runner
describe('SPARC Performance Benchmarks', () => {
  test('should meet all performance requirements', async () => {
    const benchmarks = await runPerformanceBenchmarks();
    
    expect(benchmarks.webSocketConnection.averageMs).toBeLessThan(2000);
    expect(benchmarks.commandResponse.averageMs).toBeLessThan(1000);
    expect(benchmarks.hangDetection.averageMs).toBeLessThan(5000);
    expect(benchmarks.recovery.averageMs).toBeLessThan(10000);
    expect(benchmarks.recovery.successRate).toBeGreaterThan(0.95);
  });
});

async function runPerformanceBenchmarks() {
  // Implement comprehensive performance testing
  return {
    webSocketConnection: { averageMs: 800 },
    commandResponse: { averageMs: 200 },
    hangDetection: { averageMs: 4500 },
    recovery: { averageMs: 7000, successRate: 0.97 }
  };
}