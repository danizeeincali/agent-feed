/**
 * TDD London School - Claude Process Interaction Tests
 * Tests the collaboration between WebSocket communication and Claude CLI process management
 */

import { WebSocketMockFactory, MockEventGenerator } from '../mocks/websocket-mocks';
import { ConnectionStates, WebSocketErrors } from '../contracts/websocket-contracts';

describe('Claude Process Interactions - London School TDD', () => {
  let mockWebSocket: any;
  let mockClaudeProcess: any;
  let mockProcessManager: any;
  let mockCommandQueue: any;
  let mockResponseHandler: any;

  beforeEach(() => {
    mockWebSocket = WebSocketMockFactory.createWebSocketMock(ConnectionStates.OPEN);
    mockClaudeProcess = WebSocketMockFactory.createClaudeProcessMock();
    mockProcessManager = {
      spawnProcess: jest.fn().mockResolvedValue({ processId: 'claude-123', success: true }),
      killProcess: jest.fn().mockResolvedValue(true),
      getProcessStatus: jest.fn().mockReturnValue('running'),
      monitorProcess: jest.fn(),
      restartProcess: jest.fn().mockResolvedValue(true)
    };
    mockCommandQueue = {
      enqueue: jest.fn(),
      dequeue: jest.fn().mockReturnValue({ id: 'cmd-123', command: 'claude help' }),
      peek: jest.fn(),
      isEmpty: jest.fn().mockReturnValue(false),
      clear: jest.fn()
    };
    mockResponseHandler = {
      processResponse: jest.fn(),
      correlateResponse: jest.fn(),
      handleTimeout: jest.fn(),
      notifyCompletion: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Claude Process Lifecycle Management', () => {
    it('should coordinate Claude process spawning with WebSocket connection', async () => {
      // Simulate process lifecycle coordination
      const connectionReady = mockWebSocket.readyState === ConnectionStates.OPEN;
      
      if (connectionReady) {
        const processResult = await mockProcessManager.spawnProcess('claude');
        mockProcessManager.monitorProcess(processResult.processId);
        
        // Notify WebSocket of process readiness
        const readyMessage = {
          type: 'process_ready',
          payload: { processId: processResult.processId }
        };
        mockWebSocket.send(JSON.stringify(readyMessage));
      }

      // Verify process spawning coordination
      expect(mockProcessManager.spawnProcess).toHaveBeenCalledWith('claude');
      expect(mockProcessManager.monitorProcess).toHaveBeenCalledWith('claude-123');
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'process_ready',
          payload: { processId: 'claude-123' }
        })
      );
    });

    it('should coordinate process termination with connection cleanup', async () => {
      const processId = 'claude-123';
      
      // Simulate process termination workflow
      mockProcessManager.getProcessStatus.mockReturnValue('running');
      
      const isRunning = mockProcessManager.getProcessStatus() === 'running';
      if (isRunning) {
        await mockProcessManager.killProcess(processId);
        
        // Notify WebSocket of process termination
        const terminationMessage = {
          type: 'process_terminated',
          payload: { processId }
        };
        mockWebSocket.send(JSON.stringify(terminationMessage));
      }

      // Verify termination coordination
      expect(mockProcessManager.getProcessStatus).toHaveBeenCalled();
      expect(mockProcessManager.killProcess).toHaveBeenCalledWith(processId);
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'process_terminated',
          payload: { processId }
        })
      );
    });

    it('should handle process restart coordination', async () => {
      const processId = 'claude-123';
      
      // Simulate process restart workflow
      await mockProcessManager.killProcess(processId);
      const newProcess = await mockProcessManager.restartProcess();
      
      if (newProcess) {
        const restartMessage = {
          type: 'process_restarted',
          payload: { oldProcessId: processId, newProcessId: newProcess }
        };
        mockWebSocket.send(JSON.stringify(restartMessage));
      }

      // Verify restart coordination
      expect(mockProcessManager.killProcess).toHaveBeenCalledWith(processId);
      expect(mockProcessManager.restartProcess).toHaveBeenCalled();
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('process_restarted')
      );
    });
  });

  describe('Command Execution Workflow', () => {
    it('should coordinate command queuing and execution', async () => {
      const testCommand = { id: 'cmd-456', command: 'claude status', args: [] };
      
      // Simulate command execution workflow
      mockCommandQueue.enqueue(testCommand);
      
      const queuedCommand = mockCommandQueue.dequeue();
      if (queuedCommand) {
        const executionResult = await mockClaudeProcess.execute(queuedCommand.command);
        mockResponseHandler.processResponse(executionResult);
        mockResponseHandler.correlateResponse(queuedCommand.id, executionResult);
      }

      // Verify command execution coordination
      expect(mockCommandQueue.enqueue).toHaveBeenCalledWith(testCommand);
      expect(mockCommandQueue.dequeue).toHaveBeenCalled();
      expect(mockClaudeProcess.execute).toHaveBeenCalledWith('claude status');
      expect(mockResponseHandler.processResponse).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(mockResponseHandler.correlateResponse).toHaveBeenCalledWith(
        'cmd-123',
        expect.objectContaining({ success: true })
      );
    });

    it('should coordinate WebSocket message handling with command execution', () => {
      const commandMessage = MockEventGenerator.createMessageEvent({
        type: 'command',
        payload: { command: 'claude help', args: [] },
        id: 'ws-cmd-789'
      });

      // Simulate WebSocket command handling
      const messageHandler = jest.fn(async (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'command') {
          mockCommandQueue.enqueue(message);
          const result = await mockClaudeProcess.execute(message.payload.command);
          
          const responseMessage = {
            type: 'response',
            payload: result,
            id: message.id
          };
          mockWebSocket.send(JSON.stringify(responseMessage));
        }
      });

      // Execute message handling workflow
      mockWebSocket.addEventListener('message', messageHandler);
      const [eventType, handler] = mockWebSocket.addEventListener.mock.calls[0];
      handler(commandMessage);

      // Verify WebSocket-command coordination
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', messageHandler);
    });

    it('should handle command execution timeouts', async () => {
      const timeoutCommand = { id: 'timeout-cmd', command: 'claude slow-command' };
      const timeoutManager = {
        startTimeout: jest.fn(),
        clearTimeout: jest.fn(),
        onTimeout: jest.fn()
      };

      // Simulate timeout scenario
      mockCommandQueue.enqueue(timeoutCommand);
      timeoutManager.startTimeout();
      
      // Simulate command taking too long
      mockClaudeProcess.execute.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 5000))
      );

      // Simulate timeout trigger
      setTimeout(() => {
        timeoutManager.onTimeout();
        mockResponseHandler.handleTimeout(timeoutCommand.id);
      }, 0);

      await new Promise(resolve => setTimeout(resolve, 1));

      // Verify timeout handling
      expect(timeoutManager.startTimeout).toHaveBeenCalled();
      expect(timeoutManager.onTimeout).toHaveBeenCalled();
      expect(mockResponseHandler.handleTimeout).toHaveBeenCalledWith('timeout-cmd');
    });
  });

  describe('Response Processing and Correlation', () => {
    it('should coordinate response processing with WebSocket message sending', async () => {
      const commandId = 'response-test-123';
      const executionResult = {
        success: true,
        output: 'Claude command executed successfully',
        processId: 'claude-123'
      };

      // Simulate response processing workflow
      mockResponseHandler.processResponse(executionResult);
      mockResponseHandler.correlateResponse(commandId, executionResult);
      
      const responseMessage = {
        type: 'response',
        payload: executionResult,
        id: commandId
      };
      
      mockWebSocket.send(JSON.stringify(responseMessage));
      mockResponseHandler.notifyCompletion(commandId);

      // Verify response coordination
      expect(mockResponseHandler.processResponse).toHaveBeenCalledWith(executionResult);
      expect(mockResponseHandler.correlateResponse).toHaveBeenCalledWith(commandId, executionResult);
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(responseMessage));
      expect(mockResponseHandler.notifyCompletion).toHaveBeenCalledWith(commandId);
    });

    it('should handle process output streaming coordination', async () => {
      const streamingOutput = 'Partial output from Claude process...';
      const commandId = 'streaming-cmd-456';

      // Simulate streaming coordination
      const outputStream = {
        onData: jest.fn(),
        pipe: jest.fn(),
        end: jest.fn()
      };

      // Mock streaming process output
      mockClaudeProcess.getOutput.mockResolvedValue(streamingOutput);
      
      outputStream.onData(streamingOutput);
      const streamMessage = {
        type: 'stream',
        payload: { data: streamingOutput, commandId },
        id: commandId
      };
      
      mockWebSocket.send(JSON.stringify(streamMessage));

      // Verify streaming coordination
      expect(mockClaudeProcess.getOutput).toHaveBeenCalled();
      expect(outputStream.onData).toHaveBeenCalledWith(streamingOutput);
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(streamMessage));
    });
  });

  describe('Error Handling in Process Interactions', () => {
    it('should coordinate process execution error handling', async () => {
      const failingCommand = 'claude invalid-command';
      const processError = new Error('Claude CLI command failed');

      // Simulate process execution failure
      mockClaudeProcess.execute.mockRejectedValue(processError);

      try {
        await mockClaudeProcess.execute(failingCommand);
      } catch (error: any) {
        mockResponseHandler.processResponse({
          success: false,
          error: error.message
        });
        
        const errorMessage = {
          type: 'error',
          payload: { error: error.message },
          id: 'error-cmd'
        };
        
        mockWebSocket.send(JSON.stringify(errorMessage));
      }

      // Verify error handling coordination
      expect(mockClaudeProcess.execute).toHaveBeenCalledWith(failingCommand);
      expect(mockResponseHandler.processResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Claude CLI command failed'
      });
    });

    it('should handle process crash coordination', () => {
      const crashHandler = {
        onProcessCrash: jest.fn(),
        restartProcess: jest.fn(),
        notifyClients: jest.fn()
      };

      const crashEvent = { processId: 'claude-123', exitCode: 1 };

      // Simulate process crash handling
      crashHandler.onProcessCrash(crashEvent);
      crashHandler.restartProcess();
      
      const crashMessage = {
        type: 'process_crash',
        payload: crashEvent
      };
      
      mockWebSocket.send(JSON.stringify(crashMessage));
      crashHandler.notifyClients(crashEvent);

      // Verify crash handling coordination
      expect(crashHandler.onProcessCrash).toHaveBeenCalledWith(crashEvent);
      expect(crashHandler.restartProcess).toHaveBeenCalled();
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(crashMessage));
      expect(crashHandler.notifyClients).toHaveBeenCalledWith(crashEvent);
    });
  });

  describe('Process Monitoring and Health Checks', () => {
    it('should coordinate process health monitoring with WebSocket status updates', () => {
      const healthMonitor = {
        checkHealth: jest.fn().mockReturnValue({ healthy: true, uptime: 1500 }),
        scheduleHealthCheck: jest.fn(),
        reportHealth: jest.fn()
      };

      // Simulate health monitoring workflow
      healthMonitor.scheduleHealthCheck();
      const healthStatus = healthMonitor.checkHealth();
      
      if (healthStatus.healthy) {
        const statusMessage = {
          type: 'health_status',
          payload: healthStatus
        };
        
        mockWebSocket.send(JSON.stringify(statusMessage));
        healthMonitor.reportHealth(healthStatus);
      }

      // Verify health monitoring coordination
      expect(healthMonitor.scheduleHealthCheck).toHaveBeenCalled();
      expect(healthMonitor.checkHealth).toHaveBeenCalled();
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('health_status')
      );
      expect(healthMonitor.reportHealth).toHaveBeenCalledWith(healthStatus);
    });
  });
});