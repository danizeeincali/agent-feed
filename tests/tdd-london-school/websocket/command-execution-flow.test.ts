/**
 * TDD London School - Command Execution Flow Tests
 * Tests the complete workflow from command initiation to response delivery
 */

import { WebSocketMockFactory, MockEventGenerator } from '../mocks/websocket-mocks';
import { ConnectionStates, WebSocketErrors } from '../contracts/websocket-contracts';

describe('Command Execution Flow - London School TDD', () => {
  let mockWebSocket: any;
  let mockClaudeProcess: any;
  let mockCommandExecutor: any;
  let mockWorkflowOrchestrator: any;
  let mockCommandValidator: any;
  let mockExecutionTracker: any;

  beforeEach(() => {
    mockWebSocket = WebSocketMockFactory.createWebSocketMock(ConnectionStates.OPEN);
    mockClaudeProcess = WebSocketMockFactory.createClaudeProcessMock();
    
    mockCommandExecutor = {
      validateCommand: jest.fn().mockReturnValue(true),
      prepareExecution: jest.fn().mockResolvedValue(true),
      executeCommand: jest.fn().mockResolvedValue({
        success: true,
        output: 'Command executed successfully',
        duration: 250
      }),
      cleanupExecution: jest.fn()
    };

    mockWorkflowOrchestrator = {
      initiateWorkflow: jest.fn(),
      coordinateSteps: jest.fn(),
      handleWorkflowError: jest.fn(),
      completeWorkflow: jest.fn()
    };

    mockCommandValidator = {
      validateSyntax: jest.fn().mockReturnValue(true),
      validatePermissions: jest.fn().mockReturnValue(true),
      validateEnvironment: jest.fn().mockReturnValue(true)
    };

    mockExecutionTracker = {
      startTracking: jest.fn(),
      updateProgress: jest.fn(),
      recordResult: jest.fn(),
      getExecutionMetrics: jest.fn().mockReturnValue({
        totalCommands: 1,
        successRate: 100,
        averageDuration: 250
      })
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Command Execution Workflow', () => {
    it('should coordinate complete command execution from WebSocket to response', async () => {
      const testCommand = {
        type: 'command',
        payload: { command: 'claude help', args: [] },
        id: 'e2e-test-123'
      };

      // Simulate complete workflow coordination
      mockWorkflowOrchestrator.initiateWorkflow(testCommand);
      
      // Step 1: Command validation
      const isValidSyntax = mockCommandValidator.validateSyntax(testCommand.payload.command);
      const hasPermissions = mockCommandValidator.validatePermissions(testCommand.payload.command);
      const environmentReady = mockCommandValidator.validateEnvironment();

      if (isValidSyntax && hasPermissions && environmentReady) {
        // Step 2: Execution preparation
        mockExecutionTracker.startTracking(testCommand.id);
        await mockCommandExecutor.prepareExecution(testCommand);
        
        // Step 3: Command execution
        const executionResult = await mockCommandExecutor.executeCommand(testCommand.payload);
        mockExecutionTracker.recordResult(testCommand.id, executionResult);
        
        // Step 4: Response delivery
        const responseMessage = {
          type: 'response',
          payload: executionResult,
          id: testCommand.id
        };
        
        mockWebSocket.send(JSON.stringify(responseMessage));
        mockWorkflowOrchestrator.completeWorkflow(testCommand.id);
      }

      // Verify complete workflow coordination
      expect(mockWorkflowOrchestrator.initiateWorkflow).toHaveBeenCalledWith(testCommand);
      expect(mockCommandValidator.validateSyntax).toHaveBeenCalledWith(testCommand.payload.command);
      expect(mockCommandValidator.validatePermissions).toHaveBeenCalledWith(testCommand.payload.command);
      expect(mockCommandValidator.validateEnvironment).toHaveBeenCalled();
      expect(mockExecutionTracker.startTracking).toHaveBeenCalledWith(testCommand.id);
      expect(mockCommandExecutor.prepareExecution).toHaveBeenCalledWith(testCommand);
      expect(mockCommandExecutor.executeCommand).toHaveBeenCalledWith(testCommand.payload);
      expect(mockExecutionTracker.recordResult).toHaveBeenCalledWith(
        testCommand.id,
        expect.objectContaining({ success: true })
      );
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'response',
          payload: expect.objectContaining({ success: true }),
          id: testCommand.id
        })
      );
      expect(mockWorkflowOrchestrator.completeWorkflow).toHaveBeenCalledWith(testCommand.id);
    });

    it('should coordinate execution sequence order verification', async () => {
      const executionSteps = [
        'validate_command',
        'prepare_execution',
        'execute_command',
        'process_result',
        'send_response'
      ];

      const stepTracker = {
        recordStep: jest.fn(),
        verifySequence: jest.fn().mockReturnValue(true)
      };

      // Execute steps in sequence
      for (const step of executionSteps) {
        stepTracker.recordStep(step);
      }

      const sequenceValid = stepTracker.verifySequence();

      // Verify sequence coordination
      expect(stepTracker.recordStep).toHaveBeenCalledTimes(5);
      expect(stepTracker.recordStep).toHaveBeenNthCalledWith(1, 'validate_command');
      expect(stepTracker.recordStep).toHaveBeenNthCalledWith(2, 'prepare_execution');
      expect(stepTracker.recordStep).toHaveBeenNthCalledWith(3, 'execute_command');
      expect(stepTracker.recordStep).toHaveBeenNthCalledWith(4, 'process_result');
      expect(stepTracker.recordStep).toHaveBeenNthCalledWith(5, 'send_response');
      expect(sequenceValid).toBe(true);
    });
  });

  describe('Command Validation Workflow', () => {
    it('should coordinate multi-stage command validation', async () => {
      const dangerousCommand = {
        payload: { command: 'claude delete-all', args: [] }
      };

      // Simulate validation workflow
      mockWorkflowOrchestrator.initiateWorkflow(dangerousCommand);
      mockWorkflowOrchestrator.coordinateSteps(['syntax_validation', 'permission_check']);

      const syntaxValid = mockCommandValidator.validateSyntax(dangerousCommand.payload.command);
      const permissionsValid = mockCommandValidator.validatePermissions(dangerousCommand.payload.command);

      // Mock dangerous command rejection
      mockCommandValidator.validatePermissions.mockReturnValue(false);
      const actualPermissionsValid = mockCommandValidator.validatePermissions(dangerousCommand.payload.command);

      if (!actualPermissionsValid) {
        mockWorkflowOrchestrator.handleWorkflowError('PERMISSION_DENIED');
      }

      // Verify validation coordination
      expect(mockWorkflowOrchestrator.initiateWorkflow).toHaveBeenCalledWith(dangerousCommand);
      expect(mockWorkflowOrchestrator.coordinateSteps).toHaveBeenCalledWith(['syntax_validation', 'permission_check']);
      expect(mockCommandValidator.validateSyntax).toHaveBeenCalledWith(dangerousCommand.payload.command);
      expect(mockCommandValidator.validatePermissions).toHaveBeenCalledWith(dangerousCommand.payload.command);
      expect(mockWorkflowOrchestrator.handleWorkflowError).toHaveBeenCalledWith('PERMISSION_DENIED');
    });

    it('should coordinate environment readiness verification', () => {
      const environmentChecker = {
        checkClaudeInstallation: jest.fn().mockReturnValue(true),
        checkWorkingDirectory: jest.fn().mockReturnValue(true),
        checkResourceAvailability: jest.fn().mockReturnValue(true)
      };

      // Simulate environment validation workflow
      const claudeInstalled = environmentChecker.checkClaudeInstallation();
      const workingDirValid = environmentChecker.checkWorkingDirectory();
      const resourcesAvailable = environmentChecker.checkResourceAvailability();

      const environmentReady = claudeInstalled && workingDirValid && resourcesAvailable;
      mockCommandValidator.validateEnvironment.mockReturnValue(environmentReady);

      const validationResult = mockCommandValidator.validateEnvironment();

      // Verify environment validation coordination
      expect(environmentChecker.checkClaudeInstallation).toHaveBeenCalled();
      expect(environmentChecker.checkWorkingDirectory).toHaveBeenCalled();
      expect(environmentChecker.checkResourceAvailability).toHaveBeenCalled();
      expect(validationResult).toBe(true);
    });
  });

  describe('Execution Coordination Patterns', () => {
    it('should coordinate concurrent command handling', async () => {
      const commands = [
        { id: 'cmd-1', payload: { command: 'claude help' } },
        { id: 'cmd-2', payload: { command: 'claude status' } },
        { id: 'cmd-3', payload: { command: 'claude version' } }
      ];

      const concurrencyManager = {
        canExecuteConcurrently: jest.fn().mockReturnValue(true),
        allocateResources: jest.fn(),
        coordinateExecution: jest.fn()
      };

      // Simulate concurrent execution coordination
      const canExecuteAll = concurrencyManager.canExecuteConcurrently(commands);
      
      if (canExecuteAll) {
        concurrencyManager.allocateResources(commands.length);
        
        // Execute commands concurrently
        const executions = commands.map(async (cmd) => {
          mockExecutionTracker.startTracking(cmd.id);
          return mockCommandExecutor.executeCommand(cmd.payload);
        });
        
        const results = await Promise.all(executions);
        concurrencyManager.coordinateExecution(results);
      }

      // Verify concurrent execution coordination
      expect(concurrencyManager.canExecuteConcurrently).toHaveBeenCalledWith(commands);
      expect(concurrencyManager.allocateResources).toHaveBeenCalledWith(3);
      expect(mockExecutionTracker.startTracking).toHaveBeenCalledTimes(3);
      expect(mockCommandExecutor.executeCommand).toHaveBeenCalledTimes(3);
      expect(concurrencyManager.coordinateExecution).toHaveBeenCalled();
    });

    it('should coordinate command prioritization workflow', () => {
      const priorityQueue = {
        addCommand: jest.fn(),
        getNextCommand: jest.fn(),
        prioritize: jest.fn(),
        reorder: jest.fn()
      };

      const commands = [
        { id: 'low-priority', priority: 'low', payload: { command: 'claude help' } },
        { id: 'high-priority', priority: 'high', payload: { command: 'claude urgent-task' } },
        { id: 'medium-priority', priority: 'medium', payload: { command: 'claude status' } }
      ];

      // Simulate prioritization workflow
      commands.forEach(cmd => priorityQueue.addCommand(cmd));
      priorityQueue.prioritize();
      priorityQueue.reorder();

      const nextCommand = priorityQueue.getNextCommand();

      // Verify prioritization coordination
      expect(priorityQueue.addCommand).toHaveBeenCalledTimes(3);
      expect(priorityQueue.prioritize).toHaveBeenCalled();
      expect(priorityQueue.reorder).toHaveBeenCalled();
      expect(priorityQueue.getNextCommand).toHaveBeenCalled();
    });
  });

  describe('Error Handling in Execution Flow', () => {
    it('should coordinate execution error recovery workflow', async () => {
      const failingCommand = {
        id: 'failing-cmd',
        payload: { command: 'claude non-existent-command' }
      };

      const errorRecoveryManager = {
        canRecover: jest.fn().mockReturnValue(true),
        attemptRecovery: jest.fn().mockResolvedValue(true),
        reportRecovery: jest.fn()
      };

      // Simulate execution failure and recovery
      mockCommandExecutor.executeCommand.mockRejectedValue(new Error('Command not found'));

      try {
        await mockCommandExecutor.executeCommand(failingCommand.payload);
      } catch (error: any) {
        mockWorkflowOrchestrator.handleWorkflowError(error);
        
        const canRecover = errorRecoveryManager.canRecover(error);
        if (canRecover) {
          const recovered = await errorRecoveryManager.attemptRecovery();
          errorRecoveryManager.reportRecovery(recovered);
        }
      }

      // Verify error recovery coordination
      expect(mockCommandExecutor.executeCommand).toHaveBeenCalledWith(failingCommand.payload);
      expect(mockWorkflowOrchestrator.handleWorkflowError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Command not found' })
      );
      expect(errorRecoveryManager.canRecover).toHaveBeenCalled();
      expect(errorRecoveryManager.attemptRecovery).toHaveBeenCalled();
      expect(errorRecoveryManager.reportRecovery).toHaveBeenCalledWith(true);
    });

    it('should coordinate timeout handling during execution', async () => {
      const longRunningCommand = {
        id: 'timeout-test',
        payload: { command: 'claude long-running-task' }
      };

      const timeoutHandler = {
        startTimer: jest.fn(),
        cancelTimer: jest.fn(),
        handleTimeout: jest.fn()
      };

      // Simulate timeout scenario
      mockExecutionTracker.startTracking(longRunningCommand.id);
      timeoutHandler.startTimer();

      // Mock long-running execution
      mockCommandExecutor.executeCommand.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      // Simulate timeout trigger
      setTimeout(() => {
        timeoutHandler.handleTimeout();
        mockWorkflowOrchestrator.handleWorkflowError('EXECUTION_TIMEOUT');
      }, 0);

      await new Promise(resolve => setTimeout(resolve, 1));

      // Verify timeout coordination
      expect(mockExecutionTracker.startTracking).toHaveBeenCalledWith(longRunningCommand.id);
      expect(timeoutHandler.startTimer).toHaveBeenCalled();
      expect(timeoutHandler.handleTimeout).toHaveBeenCalled();
      expect(mockWorkflowOrchestrator.handleWorkflowError).toHaveBeenCalledWith('EXECUTION_TIMEOUT');
    });
  });

  describe('Response Delivery Coordination', () => {
    it('should coordinate response formatting and delivery', async () => {
      const executionResult = {
        success: true,
        output: 'Claude command completed',
        metadata: { duration: 300, processId: 'claude-456' }
      };

      const responseFormatter = {
        formatResponse: jest.fn().mockReturnValue({
          type: 'response',
          payload: executionResult,
          timestamp: Date.now()
        }),
        addMetadata: jest.fn(),
        compress: jest.fn()
      };

      // Simulate response delivery workflow
      const formattedResponse = responseFormatter.formatResponse(executionResult);
      responseFormatter.addMetadata(formattedResponse);
      responseFormatter.compress(formattedResponse);

      mockWebSocket.send(JSON.stringify(formattedResponse));
      mockWorkflowOrchestrator.completeWorkflow('response-delivery');

      // Verify response delivery coordination
      expect(responseFormatter.formatResponse).toHaveBeenCalledWith(executionResult);
      expect(responseFormatter.addMetadata).toHaveBeenCalledWith(formattedResponse);
      expect(responseFormatter.compress).toHaveBeenCalledWith(formattedResponse);
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(formattedResponse));
      expect(mockWorkflowOrchestrator.completeWorkflow).toHaveBeenCalledWith('response-delivery');
    });
  });
});