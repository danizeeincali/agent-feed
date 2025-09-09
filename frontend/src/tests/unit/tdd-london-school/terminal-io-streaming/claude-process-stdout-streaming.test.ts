/**
 * TDD London School Tests: Claude Process stdout Streaming via SSE
 * 
 * Focus: Testing the collaboration between ClaudeProcessManager, SSEStreamer, 
 * and TerminalInterface for real-time stdout streaming from actual Claude processes.
 */

import { jest } from '@jest/globals';

describe('Claude Process stdout Streaming via SSE', () => {
  let mockClaudeProcess: any;
  let mockSSEStreamer: any;
  let mockTerminalInterface: any;
  let claudeProcessManager: any;
  let realClaudeOutput: string[];
  
  beforeEach(() => {
    // Mock the collaborators following London School approach
    mockClaudeProcess = {
      spawn: jest.fn(),
      stdout: {
        on: jest.fn(),
        pipe: jest.fn()
      },
      stderr: {
        on: jest.fn()
      },
      stdin: {
        write: jest.fn()
      },
      pid: 12345,
      kill: jest.fn()
    };

    mockSSEStreamer = {
      broadcast: jest.fn(),
      sendTerminalOutput: jest.fn(),
      sendProcessStatus: jest.fn(),
      getConnectedClients: jest.fn().mockReturnValue(2)
    };

    mockTerminalInterface = {
      appendOutput: jest.fn(),
      updateWorkingDirectory: jest.fn(),
      showProcessStart: jest.fn(),
      filterMockResponses: jest.fn()
    };

    // Real Claude output samples for testing
    realClaudeOutput = [
      'Claude Code, v1.0.0\n',
      'Initializing workspace...\n',
      'Working directory: /workspaces/agent-feed/src/nld\n',
      'Ready to assist with your development tasks.\n',
      '> '
    ];
  });

  describe('Real Claude Process stdout Streaming', () => {
    it('should stream Claude process stdout directly to frontend via SSE', async () => {
      // Arrange: Set up Claude process with real stdout behavior
      const claudeProcessManager = new ClaudeProcessManager(mockSSEStreamer);
      mockClaudeProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          // Simulate real Claude startup output
          setTimeout(() => callback(Buffer.from(realClaudeOutput[0])), 10);
          setTimeout(() => callback(Buffer.from(realClaudeOutput[1])), 20);
          setTimeout(() => callback(Buffer.from(realClaudeOutput[2])), 30);
        }
      });

      // Act: Start Claude process and capture stdout
      await claudeProcessManager.startProcess('claude-code', mockClaudeProcess);

      // Assert: Verify stdout collaboration pattern
      expect(mockClaudeProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
      
      // Wait for async stdout events
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify SSE streaming calls were made with real output
      expect(mockSSEStreamer.sendTerminalOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stdout',
          data: 'Claude Code, v1.0.0\n',
          source: 'claude-process',
          timestamp: expect.any(Number)
        })
      );
      
      expect(mockSSEStreamer.sendTerminalOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stdout', 
          data: 'Initializing workspace...\n',
          source: 'claude-process'
        })
      );
    });

    it('should reject any mock or hardcoded terminal responses', () => {
      const claudeTerminalStreamer = new ClaudeTerminalStreamer(mockSSEStreamer);
      const mockResponses = [
        '[RESPONSE] Claude Code session started',
        'Working directory: /workspaces/agent-feed',
        '[MOCK] Simulated Claude response'
      ];

      // Act: Attempt to send mock responses
      mockResponses.forEach(response => {
        claudeTerminalStreamer.sendOutput(response);
      });

      // Assert: Mock responses should be filtered out
      expect(mockSSEStreamer.sendTerminalOutput).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.stringContaining('[RESPONSE]')
        })
      );
      
      expect(mockSSEStreamer.sendTerminalOutput).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: 'Working directory: /workspaces/agent-feed'
        })
      );
    });

    it('should coordinate process startup with terminal interface updates', async () => {
      const processCoordinator = new ProcessTerminalCoordinator(
        mockClaudeProcess,
        mockSSEStreamer,
        mockTerminalInterface
      );

      // Setup real Claude startup sequence
      mockClaudeProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          realClaudeOutput.forEach((output, index) => {
            setTimeout(() => callback(Buffer.from(output)), index * 10);
          });
        }
      });

      // Act: Start coordinated process
      await processCoordinator.startWithTerminalIntegration();

      // Assert: Verify coordination sequence
      expect(mockTerminalInterface.showProcessStart).toHaveBeenCalledWith({
        processId: 12345,
        command: 'claude-code',
        timestamp: expect.any(Number)
      });

      // Wait for output processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify working directory was extracted and updated
      expect(mockTerminalInterface.updateWorkingDirectory).toHaveBeenCalledWith(
        '/workspaces/agent-feed/src/nld'
      );
    });
  });

  describe('Output Filtering and Validation', () => {
    it('should validate all terminal output comes from actual Claude process', () => {
      const outputValidator = new TerminalOutputValidator();
      const testOutputs = [
        { data: 'Claude Code, v1.0.0\n', source: 'claude-process', valid: true },
        { data: '[RESPONSE] Mock message', source: 'frontend', valid: false },
        { data: 'Working directory: /real/path', source: 'claude-process', valid: true },
        { data: 'Working directory: /workspaces/agent-feed', source: 'hardcoded', valid: false }
      ];

      testOutputs.forEach(output => {
        const result = outputValidator.validateOutput(output);
        
        if (output.valid) {
          expect(result.isValid).toBe(true);
          expect(result.source).toBe('claude-process');
        } else {
          expect(result.isValid).toBe(false);
          expect(result.reason).toMatch(/(mock|hardcoded|invalid-source)/);
        }
      });
    });

    it('should ensure no frontend-generated mock responses reach terminal', () => {
      const terminalOutputFilter = new TerminalOutputFilter();
      const forbiddenPatterns = [
        /\[RESPONSE\]/,
        /Claude Code session started/,
        /Working directory: \/workspaces\/agent-feed$/,
        /\[MOCK\]/,
        /Simulated/
      ];

      forbiddenPatterns.forEach(pattern => {
        const mockOutput = 'This is a [RESPONSE] Claude Code session started message';
        const result = terminalOutputFilter.shouldBlock(mockOutput);
        
        expect(result.blocked).toBe(true);
        expect(result.reason).toBe('contains-forbidden-pattern');
        expect(result.pattern).toMatch(pattern);
      });
    });
  });

  describe('Real-time Streaming Performance', () => {
    it('should stream output with minimal latency', async () => {
      const performanceMonitor = new StreamingPerformanceMonitor();
      const streamingManager = new RealTimeStreamingManager(
        mockSSEStreamer,
        performanceMonitor
      );

      const startTime = Date.now();
      
      // Simulate rapid output from Claude
      const rapidOutput = Array.from({ length: 10 }, (_, i) => `Line ${i}\n`);
      
      // Act: Stream outputs rapidly
      for (const output of rapidOutput) {
        await streamingManager.streamOutput({
          type: 'stdout',
          data: output,
          source: 'claude-process'
        });
      }

      const endTime = Date.now();
      const totalLatency = endTime - startTime;

      // Assert: Verify performance requirements
      expect(totalLatency).toBeLessThan(100); // Total processing under 100ms
      expect(mockSSEStreamer.sendTerminalOutput).toHaveBeenCalledTimes(10);
      
      // Verify streaming order maintained
      const calls = mockSSEStreamer.sendTerminalOutput.mock.calls;
      calls.forEach((call, index) => {
        expect(call[0].data).toBe(`Line ${index}\n`);
      });
    });
  });
});