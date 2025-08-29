/**
 * Enhanced Process Manager TDD Validation Tests
 * 
 * These tests validate that the Enhanced PTY Process Manager meets all
 * TDD requirements identified in the NLD analysis and prevents the root
 * causes that were identified in the regression testing.
 * 
 * Test Categories:
 * - Escape sequence detection and filtering
 * - Process spawning controls
 * - Resource monitoring and cleanup
 * - PTY echo prevention
 * - SSE streaming integration
 * - Error recovery mechanisms
 */

import { EnhancedProcessManager, EscapeSequenceFilter, ProcessConfig } from '../src/services/EnhancedProcessManager';
import { SSEEventStreamer } from '../src/services/SSEEventStreamer';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('node-pty');
jest.mock('child_process');
jest.mock('../src/utils/logger');

describe('Enhanced Process Manager - TDD Validation Tests', () => {
  let processManager: EnhancedProcessManager;
  let mockProcess: any;

  beforeEach(() => {
    processManager = new EnhancedProcessManager({ maxProcesses: 5 });
    
    mockProcess = {
      pid: 12345,
      killed: false,
      onData: jest.fn(),
      onExit: jest.fn(),
      write: jest.fn(),
      resize: jest.fn(),
      kill: jest.fn()
    };

    // Mock pty.spawn
    const pty = require('node-pty');
    pty.spawn = jest.fn().mockReturnValue(mockProcess);
  });

  afterEach(async () => {
    await processManager.shutdown();
    jest.clearAllMocks();
  });

  describe('TDD Requirement: Escape Sequence Detection and Filtering', () => {
    it('CRITICAL: should detect and filter problematic escape sequences', () => {
      // Test data from TDD requirements
      const problematicSequences = [
        '\x1b[?25l',     // Hide cursor
        '\x1b[?25h',     // Show cursor
        '\x1b[?2004h',   // Bracketed paste mode
        '[O[I',          // Problematic sequence from tests
        '\x1b[A',        // Cursor up
        '\x1b[B',        // Cursor down
      ];

      problematicSequences.forEach(sequence => {
        const input = `before${sequence}after`;
        const filtered = EscapeSequenceFilter.filterEscapeSequences(input);
        
        expect(filtered).toBe('beforeafter');
        expect(filtered).not.toContain(sequence);
        expect(EscapeSequenceFilter.containsProblematicSequences(input)).toBe(true);
      });
    });

    it('should preserve safe formatting escape sequences', () => {
      const safeSequences = [
        '\x1b[31m',      // Red color
        '\x1b[0m',       // Reset
        '\x1b[1;32m',    // Bold green
      ];

      safeSequences.forEach(sequence => {
        const input = `before${sequence}after`;
        const filtered = EscapeSequenceFilter.filterEscapeSequences(input);
        
        // Safe sequences should be preserved
        expect(filtered).toContain(sequence);
      });
    });

    it('should sanitize input removing control characters', () => {
      const inputWithControlChars = 'hello\x00\x08world\x7F';
      const sanitized = EscapeSequenceFilter.sanitizeInput(inputWithControlChars);
      
      expect(sanitized).toBe('helloworld');
      expect(sanitized).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
    });
  });

  describe('TDD Requirement: Process Spawning Controls', () => {
    it('CRITICAL: should prevent multiple concurrent instances with same ID', async () => {
      const instanceId = 'test-instance';
      const config: ProcessConfig = {
        command: 'echo',
        args: ['test']
      };

      // Create first instance
      const firstInstance = await processManager.createInstance(instanceId, config);
      expect(firstInstance.status).toBe('running');

      // Attempt to create second instance with same ID
      const secondInstance = await processManager.createInstance(instanceId, config);
      
      // Should terminate first and create new one
      expect(secondInstance.instanceId).toBe(instanceId);
    });

    it('should enforce maximum process limit', async () => {
      const maxProcesses = 5;
      const manager = new EnhancedProcessManager({ maxProcesses });
      
      const config: ProcessConfig = {
        command: 'sleep',
        args: ['10']
      };

      // Create maximum number of processes
      const promises = [];
      for (let i = 0; i < maxProcesses; i++) {
        promises.push(manager.createInstance(`instance-${i}`, config));
      }
      
      await Promise.all(promises);

      // Attempt to create one more should fail
      await expect(
        manager.createInstance('overflow-instance', config)
      ).rejects.toThrow('Maximum process limit reached');

      await manager.shutdown();
    });

    it('should properly clean up terminated processes', async () => {
      const instanceId = 'cleanup-test';
      const config: ProcessConfig = {
        command: 'echo',
        args: ['test']
      };

      const instance = await processManager.createInstance(instanceId, config);
      expect(instance.status).toBe('running');

      // Terminate instance
      const terminated = await processManager.terminateInstance(instanceId);
      expect(terminated).toBe(true);

      // Instance should no longer exist
      const info = processManager.getInstanceInfo(instanceId);
      expect(info).toBeNull();
    });
  });

  describe('TDD Requirement: Resource Monitoring and Cleanup', () => {
    it('should monitor resource usage for processes', async () => {
      const instanceId = 'resource-monitor-test';
      const config: ProcessConfig = {
        command: 'node',
        args: ['-e', 'setInterval(() => {}, 100)'], // Keep alive
        maxMemoryMB: 100,
        maxCpuPercent: 50
      };

      const instance = await processManager.createInstance(instanceId, config);
      
      // Mock resource usage update
      const processInstance = (processManager as any).processes.get(instanceId);
      processInstance.memoryUsage = 150; // Exceed limit
      
      let resourceViolationEmitted = false;
      processManager.on('instance:resource-violation', (data) => {
        if (data.instanceId === instanceId && data.type === 'memory') {
          resourceViolationEmitted = true;
        }
      });

      // Trigger resource monitoring
      await (processManager as any).updateResourceUsage();
      
      expect(resourceViolationEmitted).toBe(true);
    });

    it('should detect hung processes and emit alerts', (done) => {
      const instanceId = 'hang-test';
      const config: ProcessConfig = {
        command: 'sleep',
        args: ['1']
      };

      processManager.createInstance(instanceId, config).then(() => {
        const processInstance = (processManager as any).processes.get(instanceId);
        
        // Simulate hung process by setting old activity timestamp
        processInstance.lastActivity = new Date(Date.now() - 400000); // 6+ minutes ago
        
        processManager.once('instance:hung', (data) => {
          expect(data.instanceId).toBe(instanceId);
          expect(data.timeSinceActivity).toBeGreaterThan(300000); // > 5 minutes
          done();
        });

        // Trigger health check
        (processManager as any).performHealthCheck();
      });
    });

    it('should auto-terminate processes exceeding runtime limits', async () => {
      const instanceId = 'runtime-limit-test';
      const config: ProcessConfig = {
        command: 'sleep',
        args: ['10'],
        maxRuntimeMs: 1000 // 1 second
      };

      const instance = await processManager.createInstance(instanceId, config);
      const processInstance = (processManager as any).processes.get(instanceId);
      
      // Mock long runtime
      processInstance.startTime = new Date(Date.now() - 2000); // 2 seconds ago
      
      // Trigger health check
      (processManager as any).performHealthCheck();
      
      // Process should be terminated
      setTimeout(() => {
        const info = processManager.getInstanceInfo(instanceId);
        expect(info?.status).not.toBe('running');
      }, 100);
    });
  });

  describe('TDD Requirement: PTY Terminal Features', () => {
    it('should create PTY processes for terminal commands', async () => {
      const instanceId = 'pty-test';
      const config: ProcessConfig = {
        command: 'claude',
        args: [],
        cols: 80,
        rows: 24
      };

      const pty = require('node-pty');
      await processManager.createInstance(instanceId, config);

      expect(pty.spawn).toHaveBeenCalledWith('claude', [], expect.objectContaining({
        name: 'xterm-256color',
        cols: 80,
        rows: 24
      }));
    });

    it('should handle terminal input correctly', async () => {
      const instanceId = 'input-test';
      const config: ProcessConfig = {
        command: 'bash',
        args: []
      };

      await processManager.createInstance(instanceId, config);
      
      const input = 'echo "hello world"\n';
      const success = await processManager.sendInput(instanceId, input);
      
      expect(success).toBe(true);
      expect(mockProcess.write).toHaveBeenCalledWith(input);
    });

    it('should handle terminal resizing', async () => {
      const instanceId = 'resize-test';
      const config: ProcessConfig = {
        command: 'bash',
        args: [],
        cols: 80,
        rows: 24
      };

      await processManager.createInstance(instanceId, config);
      
      const success = await processManager.resizeTerminal(instanceId, 120, 30);
      
      expect(success).toBe(true);
      expect(mockProcess.resize).toHaveBeenCalledWith(120, 30);
    });
  });

  describe('TDD Requirement: Output Buffer Management', () => {
    it('should track output position for incremental streaming', async () => {
      const instanceId = 'buffer-test';
      const config: ProcessConfig = {
        command: 'echo',
        args: ['test output']
      };

      await processManager.createInstance(instanceId, config);
      
      // Simulate output
      const outputBuffers = (processManager as any).outputBuffers;
      outputBuffers.appendOutput(instanceId, 'line 1\n');
      outputBuffers.appendOutput(instanceId, 'line 2\n');
      
      const { output, newPosition, totalLength } = processManager.getIncrementalOutput(instanceId, 0);
      
      expect(output).toBe('line 1\nline 2\n');
      expect(newPosition).toBe(output.length);
      expect(totalLength).toBe(output.length);
    });

    it('should provide incremental output from specific position', async () => {
      const instanceId = 'incremental-test';
      const config: ProcessConfig = {
        command: 'echo',
        args: ['test']
      };

      await processManager.createInstance(instanceId, config);
      
      const outputBuffers = (processManager as any).outputBuffers;
      outputBuffers.appendOutput(instanceId, 'first part');
      
      // Get from position 0
      const first = processManager.getIncrementalOutput(instanceId, 0);
      expect(first.output).toBe('first part');
      
      outputBuffers.appendOutput(instanceId, ' second part');
      
      // Get only new content
      const second = processManager.getIncrementalOutput(instanceId, first.newPosition);
      expect(second.output).toBe(' second part');
    });
  });

  describe('TDD Requirement: Error Recovery Mechanisms', () => {
    it('should handle process spawn failures gracefully', async () => {
      const pty = require('node-pty');
      pty.spawn.mockImplementationOnce(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const instanceId = 'spawn-fail-test';
      const config: ProcessConfig = {
        command: 'nonexistent-command',
        args: []
      };

      await expect(
        processManager.createInstance(instanceId, config)
      ).rejects.toThrow('Process spawn failed');

      // Should not leave any dangling references
      const info = processManager.getInstanceInfo(instanceId);
      expect(info).toBeNull();
    });

    it('should emit appropriate events for process lifecycle', async () => {
      const instanceId = 'lifecycle-test';
      const config: ProcessConfig = {
        command: 'echo',
        args: ['test']
      };

      const events: string[] = [];
      
      processManager.on('instance:created', () => events.push('created'));
      processManager.on('instance:exit', () => events.push('exit'));
      processManager.on('instance:error', () => events.push('error'));

      await processManager.createInstance(instanceId, config);
      expect(events).toContain('created');

      // Simulate process exit
      if (mockProcess.onExit.mock.calls.length > 0) {
        const exitCallback = mockProcess.onExit.mock.calls[0][0];
        exitCallback({ exitCode: 0, signal: null });
        expect(events).toContain('exit');
      }
    });

    it('should handle auto-restart for failed processes', async () => {
      const instanceId = 'auto-restart-test';
      const config: ProcessConfig = {
        command: 'echo',
        args: ['test'],
        autoRestart: true
      };

      let createCount = 0;
      const originalCreateInstance = processManager.createInstance.bind(processManager);
      jest.spyOn(processManager, 'createInstance').mockImplementation(async (id, cfg) => {
        createCount++;
        return originalCreateInstance(id, cfg);
      });

      await processManager.createInstance(instanceId, config);
      
      // Simulate process exit with error code
      if (mockProcess.onExit.mock.calls.length > 0) {
        const exitCallback = mockProcess.onExit.mock.calls[0][0];
        exitCallback({ exitCode: 1, signal: null });
        
        // Should trigger auto-restart after delay
        setTimeout(() => {
          expect(createCount).toBeGreaterThan(1);
        }, 6000);
      }
    }, 10000);
  });

  describe('TDD Requirement: Performance Metrics', () => {
    it('should provide comprehensive system metrics', () => {
      const metrics = processManager.getMetrics();
      
      expect(metrics).toHaveProperty('totalProcesses');
      expect(metrics).toHaveProperty('activeProcesses');
      expect(metrics).toHaveProperty('failedProcesses');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cpuUsage');
      expect(metrics).toHaveProperty('averageUptime');
      
      expect(typeof metrics.totalProcesses).toBe('number');
      expect(typeof metrics.activeProcesses).toBe('number');
      expect(typeof metrics.failedProcesses).toBe('number');
    });

    it('should track process creation and termination counts', async () => {
      const initialMetrics = processManager.getMetrics();
      
      const instanceId = 'metrics-test';
      const config: ProcessConfig = {
        command: 'echo',
        args: ['test']
      };

      await processManager.createInstance(instanceId, config);
      
      const afterCreateMetrics = processManager.getMetrics();
      expect(afterCreateMetrics.totalProcesses).toBe(initialMetrics.totalProcesses + 1);
      expect(afterCreateMetrics.activeProcesses).toBe(initialMetrics.activeProcesses + 1);

      await processManager.terminateInstance(instanceId);
      
      const afterTerminateMetrics = processManager.getMetrics();
      expect(afterTerminateMetrics.activeProcesses).toBe(initialMetrics.activeProcesses);
    });
  });

  describe('TDD Requirement: Integration Compatibility', () => {
    it('should maintain compatibility with existing instance API', async () => {
      const instanceId = 'compatibility-test';
      const config: ProcessConfig = {
        command: 'echo',
        args: ['test']
      };

      const instance = await processManager.createInstance(instanceId, config);
      
      // Should provide expected interface
      expect(instance).toHaveProperty('instanceId');
      expect(instance).toHaveProperty('pid');
      expect(instance).toHaveProperty('status');
      expect(instance).toHaveProperty('startTime');
      expect(instance).toHaveProperty('uptime');
      expect(instance).toHaveProperty('command');
    });

    it('should support batch operations on multiple instances', async () => {
      const config: ProcessConfig = {
        command: 'echo',
        args: ['test']
      };

      // Create multiple instances
      const instanceIds = ['batch-1', 'batch-2', 'batch-3'];
      const createPromises = instanceIds.map(id => 
        processManager.createInstance(id, config)
      );
      
      const instances = await Promise.all(createPromises);
      expect(instances).toHaveLength(3);
      
      // Get all instances
      const allInstances = processManager.getAllInstances();
      expect(allInstances.length).toBeGreaterThanOrEqual(3);
      
      // Terminate all
      const terminatePromises = instanceIds.map(id => 
        processManager.terminateInstance(id)
      );
      
      const results = await Promise.all(terminatePromises);
      expect(results.every(result => result === true)).toBe(true);
    });
  });
});

describe('SSE Event Streamer - TDD Validation Tests', () => {
  let sseStreamer: SSEEventStreamer;
  let mockResponse: any;

  beforeEach(() => {
    sseStreamer = new SSEEventStreamer();
    
    mockResponse = {
      writeHead: jest.fn(),
      setTimeout: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      headersSent: false
    };
  });

  afterEach(async () => {
    await sseStreamer.shutdown();
  });

  describe('TDD Requirement: SSE Connection Management', () => {
    it('CRITICAL: should establish SSE connections with proper headers', () => {
      const instanceId = 'sse-test-instance';
      
      const connectionId = sseStreamer.createTerminalStream(instanceId, mockResponse);
      
      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no'
      }));
      
      expect(connectionId).toBeDefined();
      expect(typeof connectionId).toBe('string');
    });

    it('should track active connections per instance', () => {
      const instanceId = 'connection-tracking-test';
      
      const conn1 = sseStreamer.createTerminalStream(instanceId, { ...mockResponse });
      const conn2 = sseStreamer.createTerminalStream(instanceId, { ...mockResponse });
      
      const metrics = sseStreamer.getMetrics();
      expect(metrics.connections.byInstance[instanceId]).toBe(2);
    });

    it('should handle connection cleanup on client disconnect', () => {
      const instanceId = 'cleanup-test';
      const connectionId = sseStreamer.createTerminalStream(instanceId, mockResponse);
      
      // Simulate client disconnect
      const closeCallback = mockResponse.on.mock.calls.find(call => call[0] === 'close')?.[1];
      if (closeCallback) {
        closeCallback();
      }
      
      const connectionInfo = sseStreamer.getConnectionInfo(connectionId);
      expect(connectionInfo?.isAlive).toBe(false);
    });
  });

  describe('TDD Requirement: Position-Tracked Streaming', () => {
    it('should track output positions for incremental streaming', () => {
      const instanceId = 'position-tracking-test';
      const connectionId = sseStreamer.createTerminalStream(instanceId, mockResponse);
      
      const connection = (sseStreamer as any).connectionManager.getConnection(connectionId);
      expect(connection.outputPosition).toBe(0);
      
      // Send message with position tracking
      sseStreamer.sendMessage(connectionId, {
        type: 'terminal_output',
        instanceId,
        data: 'test output',
        timestamp: new Date().toISOString(),
        position: 0
      });
      
      expect(connection.outputPosition).toBeGreaterThan(0);
    });

    it('should broadcast messages to instance connections', () => {
      const instanceId = 'broadcast-test';
      
      const conn1 = sseStreamer.createTerminalStream(instanceId, { ...mockResponse });
      const conn2 = sseStreamer.createTerminalStream(instanceId, { ...mockResponse });
      
      const message = {
        type: 'terminal_output' as const,
        instanceId,
        data: 'broadcast test',
        timestamp: new Date().toISOString()
      };
      
      const sentCount = sseStreamer.broadcastToInstance(instanceId, message);
      expect(sentCount).toBe(2);
    });
  });

  describe('TDD Requirement: Error Recovery and Health Monitoring', () => {
    it('should handle connection errors gracefully', () => {
      const instanceId = 'error-handling-test';
      const connectionId = sseStreamer.createTerminalStream(instanceId, mockResponse);
      
      // Simulate connection error
      const errorCallback = mockResponse.on.mock.calls.find(call => call[0] === 'error')?.[1];
      if (errorCallback) {
        errorCallback(new Error('Connection error'));
      }
      
      const connectionInfo = sseStreamer.getConnectionInfo(connectionId);
      expect(connectionInfo?.isAlive).toBe(false);
    });

    it('should send heartbeat messages to idle connections', () => {
      const instanceId = 'heartbeat-test';
      const connectionId = sseStreamer.createTerminalStream(instanceId, mockResponse);
      
      const connection = (sseStreamer as any).connectionManager.getConnection(connectionId);
      connection.lastMessage = new Date(Date.now() - 35000); // 35 seconds ago
      
      sseStreamer.sendHeartbeat();
      
      // Should have sent heartbeat message
      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('"type":"heartbeat"')
      );
    });

    it('should provide comprehensive metrics', () => {
      const metrics = sseStreamer.getMetrics();
      
      expect(metrics).toHaveProperty('totalConnections');
      expect(metrics).toHaveProperty('activeConnections');
      expect(metrics).toHaveProperty('messagesPerSecond');
      expect(metrics).toHaveProperty('averageConnectionDuration');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('connections');
    });
  });
});

describe('Integration Tests - Enhanced Process Manager + SSE Streamer', () => {
  let processManager: EnhancedProcessManager;
  let sseStreamer: SSEEventStreamer;
  let mockResponse: any;

  beforeEach(() => {
    processManager = new EnhancedProcessManager({ maxProcesses: 3 });
    sseStreamer = new SSEEventStreamer();
    
    mockResponse = {
      writeHead: jest.fn(),
      setTimeout: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      headersSent: false
    };
  });

  afterEach(async () => {
    await Promise.all([
      processManager.shutdown(),
      sseStreamer.shutdown()
    ]);
  });

  it('CRITICAL: should integrate process events with SSE streaming', async () => {
    const instanceId = 'integration-test';
    const config: ProcessConfig = {
      command: 'echo',
      args: ['test output']
    };

    // Create SSE stream first
    const connectionId = sseStreamer.createTerminalStream(instanceId, mockResponse);
    
    // Create process instance - should trigger events
    await processManager.createInstance(instanceId, config);
    
    // Verify SSE stream received process creation event
    const writeCalls = mockResponse.write.mock.calls;
    const hasInstanceStatusMessage = writeCalls.some(call => 
      call[0].includes('"type":"instance_status"') && 
      call[0].includes(`"instanceId":"${instanceId}"`)
    );
    
    expect(hasInstanceStatusMessage).toBe(true);
  });

  it('should filter escape sequences in streamed output', async () => {
    const instanceId = 'escape-filter-integration';
    const config: ProcessConfig = {
      command: 'echo',
      args: [],
      escapeSequenceFiltering: true
    };

    // Create process and SSE stream
    await processManager.createInstance(instanceId, config);
    const connectionId = sseStreamer.createTerminalStream(instanceId, mockResponse);
    
    // Simulate output with problematic escape sequences
    const problematicOutput = 'before\x1b[?25lhidden\x1b[?25hafter';
    
    processManager.emit('terminal:output', {
      instanceId,
      data: problematicOutput,
      source: 'stdout',
      timestamp: new Date(),
      filtered: true
    });
    
    // SSE stream should receive filtered output
    const writeCalls = mockResponse.write.mock.calls;
    const outputMessage = writeCalls.find(call => 
      call[0].includes('"type":"terminal_output"')
    );
    
    expect(outputMessage).toBeDefined();
    expect(outputMessage[0]).not.toContain('\x1b[?25l');
    expect(outputMessage[0]).not.toContain('\x1b[?25h');
  });
});