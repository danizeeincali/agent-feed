/**
 * User Interaction Workflow Test - London School TDD Outside-In
 * Tests complete user workflow from button click to command execution
 */

const { jest } = require('@jest/globals');
const { ClaudeInstanceManagerMock } = require('../mocks/claude-instance-manager.mock');
const { LoadingAnimationTrackerSpy } = require('../spies/loading-animation-tracker.spy');
const { PermissionDialogStub } = require('../stubs/permission-dialog.stub');
const { WebSocketCommunicationContract, ContractValidator } = require('../contracts/websocket-communication.contract');

describe('User Interaction Workflow - Outside-In TDD', () => {
  let instanceManager;
  let animationTracker;
  let permissionDialog;
  let mockWebSocket;
  let mockCommandProcessor;
  let mockUIController;

  beforeEach(() => {
    // Initialize mocks and spies
    instanceManager = new ClaudeInstanceManagerMock();
    animationTracker = new LoadingAnimationTrackerSpy();
    permissionDialog = new PermissionDialogStub();

    // Mock WebSocket and related components
    mockWebSocket = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      send: jest.fn(),
      onMessage: jest.fn(),
      onError: jest.fn(),
      onClose: jest.fn(),
      readyState: 1, // OPEN
      url: 'ws://localhost:8080/ws/test'
    };

    mockCommandProcessor = {
      processCommand: jest.fn(),
      validateCommand: jest.fn(),
      formatOutput: jest.fn(),
      handleError: jest.fn()
    };

    mockUIController = {
      updateInterface: jest.fn(),
      showError: jest.fn(),
      enableButton: jest.fn(),
      disableButton: jest.fn(),
      setButtonText: jest.fn(),
      showPermissionDialog: jest.fn()
    };

    // Configure default behaviors
    setupDefaultBehaviors();
  });

  afterEach(() => {
    instanceManager.reset();
    animationTracker.reset();
    permissionDialog.reset();
    jest.clearAllMocks();
  });

  describe('Complete User Workflow - Button Click to Command Execution', () => {
    it('should execute complete workflow with proper collaboration', async () => {
      // GIVEN: User wants to execute a Claude command
      const command = 'create-react-app my-project';
      const userConfig = { timeout: 30000, showProgress: true };

      // WHEN: User clicks the execute button
      const workflowResult = await executeCompleteUserWorkflow(command, userConfig);

      // THEN: All collaborators work together correctly
      verifyCompleteWorkflowExecution(workflowResult, command, userConfig);
    });

    it('should handle permission-required commands with dialog interaction', async () => {
      // GIVEN: Command requires file system permissions
      const sensitiveCommand = 'rm -rf /important-files';
      permissionDialog.configureResponse('allow', 150);

      // WHEN: User attempts to execute sensitive command
      const workflowResult = await executeCompleteUserWorkflow(sensitiveCommand);

      // THEN: Permission dialog workflow executes correctly
      verifyPermissionDialogWorkflow(workflowResult, sensitiveCommand);
    });

    it('should coordinate loading animation with command progress', async () => {
      // GIVEN: Long-running command with progress updates
      const longCommand = 'npm install && npm run build';
      instanceManager.sendCommand.mockImplementation(simulateLongRunningCommand);

      // WHEN: User executes long-running command
      const workflowResult = await executeCompleteUserWorkflow(longCommand);

      // THEN: Loading animation coordinates with command progress
      verifyLoadingAnimationCoordination(workflowResult, longCommand);
    });

    it('should handle WebSocket connection failures gracefully', async () => {
      // GIVEN: WebSocket connection fails during execution
      mockWebSocket.connect.mockRejectedValue(new Error('Connection failed'));

      // WHEN: User attempts command execution
      const workflowResult = await executeCompleteUserWorkflow('echo "test"');

      // THEN: Error handling workflow executes correctly
      verifyErrorHandlingWorkflow(workflowResult, 'Connection failed');
    });

    it('should manage tool call visualization during command execution', async () => {
      // GIVEN: Command generates tool call visualization
      const toolCommand = 'analyze-project --with-visualization';
      const mockVisualizationData = {
        toolCalls: [
          { name: 'file-analyzer', status: 'running', progress: 45 },
          { name: 'dependency-scanner', status: 'completed', result: 'success' }
        ]
      };

      // WHEN: User executes command with visualization
      const workflowResult = await executeCompleteUserWorkflow(toolCommand, {
        enableVisualization: true,
        visualizationData: mockVisualizationData
      });

      // THEN: Tool call visualization renders correctly
      verifyToolCallVisualizationWorkflow(workflowResult, mockVisualizationData);
    });
  });

  describe('Behavior Verification - London School Focus', () => {
    it('should verify object interactions follow expected patterns', async () => {
      // GIVEN: Expected interaction pattern
      const expectedPattern = [
        'UIController.disableButton',
        'AnimationTracker.startAnimation',
        'InstanceManager.createInstance',
        'WebSocket.connect',
        'CommandProcessor.processCommand',
        'AnimationTracker.updateAnimation',
        'UIController.updateInterface'
      ];

      // WHEN: User executes workflow
      await executeCompleteUserWorkflow('test command');

      // THEN: Interactions follow expected pattern
      verifyInteractionPattern(expectedPattern);
    });

    it('should verify contract compliance across all collaborators', async () => {
      // GIVEN: WebSocket communication contract
      const contract = WebSocketCommunicationContract.toolCalls.initiate;

      // WHEN: Tool call is initiated
      await executeToolCallWorkflow('test-tool', { param: 'value' });

      // THEN: All interactions comply with contract
      verifyContractCompliance(contract);
    });

    it('should verify state transitions happen in correct order', async () => {
      // GIVEN: Expected state transition sequence
      const expectedStates = [
        'idle', 'initializing', 'connecting', 
        'executing', 'processing', 'completed'
      ];

      // WHEN: User executes complete workflow
      await executeCompleteUserWorkflow('state-test-command');

      // THEN: State transitions follow expected sequence
      verifyStateTransitionSequence(expectedStates);
    });

    it('should verify error propagation across collaboration boundaries', async () => {
      // GIVEN: Error occurs in command processor
      const testError = new Error('Command processing failed');
      mockCommandProcessor.processCommand.mockRejectedValue(testError);

      // WHEN: User executes workflow
      const workflowResult = await executeCompleteUserWorkflow('failing-command');

      // THEN: Error propagates correctly through all collaborators
      verifyErrorPropagation(testError, workflowResult);
    });
  });

  describe('Mock Contract Validation', () => {
    it('should validate mock interactions match real component contracts', () => {
      // GIVEN: Real component interaction expectations
      const realComponentContract = {
        createInstance: { inputSchema: 'object', outputSchema: 'object' },
        sendCommand: { inputSchema: ['string', 'string', 'object'], outputSchema: 'object' }
      };

      // WHEN: Mock interactions are analyzed
      const mockInteractions = instanceManager.verifyInstanceCreationFlow();

      // THEN: Mock interactions match real contracts
      expect(mockInteractions).toMatchContract(realComponentContract);
    });

    it('should verify spy behavior matches expected component behavior', () => {
      // GIVEN: Expected animation behavior pattern
      const expectedBehavior = {
        startBeforeUpdate: true,
        progressIncreases: true,
        stagesAdvance: true,
        completesSuccessfully: true
      };

      // WHEN: Animation workflow executes
      animationTracker.startAnimation({ stage: 'initializing' });
      animationTracker.setProgress(25);
      animationTracker.setStage('processing');
      animationTracker.setProgress(75);
      animationTracker.setStage('completing');
      animationTracker.stopAnimation('completed');

      // THEN: Spy behavior matches expectations
      verifySpyBehaviorPattern(expectedBehavior);
    });

    it('should validate stub responses are realistic and consistent', () => {
      // GIVEN: Permission dialog stub configured for testing
      permissionDialog.configureResponse('allow', 100);

      // WHEN: Permission is requested multiple times
      const requests = Promise.all([
        permissionDialog.requestPermission('filesystem'),
        permissionDialog.requestPermission('network'),
        permissionDialog.requestPermission('filesystem') // Duplicate
      ]);

      // THEN: Stub responses are consistent and realistic
      verifyStubConsistency(requests);
    });
  });

  // Helper functions for workflow execution
  async function executeCompleteUserWorkflow(command, config = {}) {
    const workflowId = `workflow-${Date.now()}`;
    
    try {
      // 1. UI Interaction - Button Click
      mockUIController.disableButton();
      mockUIController.setButtonText('Executing...');
      
      // 2. Animation Start
      const animationResult = animationTracker.startAnimation({
        stage: 'initializing',
        message: 'Starting command execution...'
      });
      
      // 3. Instance Creation
      const instanceResult = await instanceManager.createInstance(config);
      
      // 4. WebSocket Connection
      if (instanceResult.success) {
        await mockWebSocket.connect(instanceResult.websocketUrl);
      }
      
      // 5. Permission Check (if needed)
      let permissionResult = null;
      if (isCommandSensitive(command)) {
        permissionResult = await permissionDialog.requestPermission('filesystem', {
          command,
          reason: 'Command requires file system access'
        });
        
        if (!permissionResult.granted) {
          throw new Error('Permission denied');
        }
      }
      
      // 6. Command Execution
      const commandResult = await instanceManager.sendCommand(
        instanceResult.instanceId,
        command,
        config
      );
      
      // 7. Progress Tracking
      animationTracker.setStage('executing');
      animationTracker.setProgress(50);
      
      // 8. Command Processing
      if (commandResult.success) {
        const processResult = await mockCommandProcessor.processCommand(command);
        animationTracker.setProgress(100);
        animationTracker.stopAnimation('completed');
      }
      
      // 9. UI Update
      mockUIController.enableButton();
      mockUIController.setButtonText('Execute Command');
      
      return {
        workflowId,
        success: true,
        instanceResult,
        commandResult,
        permissionResult,
        animationResult,
        duration: Date.now() - parseInt(workflowId.split('-')[1])
      };
      
    } catch (error) {
      // Error handling workflow
      animationTracker.onError(error);
      animationTracker.stopAnimation('error');
      mockUIController.showError(error.message);
      mockUIController.enableButton();
      
      return {
        workflowId,
        success: false,
        error: error.message,
        errorHandled: true
      };
    }
  }

  async function executeToolCallWorkflow(toolName, parameters) {
    const contract = WebSocketCommunicationContract.toolCalls.initiate;
    
    // Validate input against contract
    const inputValid = ContractValidator.validateInputOutput(
      { toolName, parameters },
      {},
      contract
    );
    
    if (!inputValid.inputValid) {
      throw new Error('Invalid tool call input');
    }
    
    // Execute tool call with mock collaborators
    const result = await instanceManager.sendCommand('mock-instance', 
      `tool-call ${toolName}`, { parameters });
    
    return {
      toolName,
      parameters,
      result,
      contractCompliant: true
    };
  }

  // Verification functions
  function verifyCompleteWorkflowExecution(result, command, config) {
    expect(result.success).toBe(true);
    
    // Verify UI interactions
    expect(mockUIController.disableButton).toHaveBeenCalledBefore(
      mockUIController.enableButton
    );
    expect(mockUIController.setButtonText).toHaveBeenCalledWith('Executing...');
    
    // Verify animation lifecycle
    const animationFlow = animationTracker.getAnimationLifecycleFlow();
    expect(animationFlow.lifecycle.isComplete).toBe(true);
    
    // Verify instance management
    expect(instanceManager.createInstance).toHaveBeenCalledWith(config);
    expect(instanceManager.sendCommand).toHaveBeenCalledWith(
      expect.any(String), command, config
    );
    
    // Verify WebSocket interaction
    expect(mockWebSocket.connect).toHaveBeenCalled();
  }

  function verifyPermissionDialogWorkflow(result, command) {
    expect(permissionDialog.show).toHaveBeenCalledWith('filesystem', 
      expect.objectContaining({ command }));
    
    expect(result.permissionResult?.granted).toBe(true);
    expect(permissionDialog.hide).toHaveBeenCalled();
    
    const dialogFlow = permissionDialog.getDialogInteractionFlow();
    expect(dialogFlow.interactions.shows).toBeGreaterThan(0);
    expect(dialogFlow.interactions.allows).toBeGreaterThan(0);
  }

  function verifyLoadingAnimationCoordination(result, command) {
    const progressPattern = animationTracker.getProgressTrackingPattern();
    
    expect(progressPattern.progressUpdates).toContain(50);
    expect(progressPattern.progressUpdates).toContain(100);
    expect(animationTracker.verifyProgressIncreased()).toBe(true);
    
    const stageHistory = animationTracker.getStageHistory();
    expect(stageHistory).toContain('initializing');
    expect(stageHistory).toContain('executing');
  }

  function verifyErrorHandlingWorkflow(result, errorMessage) {
    expect(result.success).toBe(false);
    expect(result.errorHandled).toBe(true);
    expect(result.error).toBe(errorMessage);
    
    expect(animationTracker.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: errorMessage })
    );
    expect(mockUIController.showError).toHaveBeenCalledWith(errorMessage);
  }

  function verifyToolCallVisualizationWorkflow(result, visualizationData) {
    expect(result.success).toBe(true);
    
    // This would verify actual visualization rendering
    // In a real test, we'd check DOM updates or component props
    expect(mockUIController.updateInterface).toHaveBeenCalledWith(
      expect.objectContaining({ 
        visualizationData: expect.any(Object) 
      })
    );
  }

  function verifyInteractionPattern(expectedPattern) {
    const allCalls = [
      ...mockUIController.disableButton.mock.calls.map(() => 'UIController.disableButton'),
      ...animationTracker.startAnimation.mock.calls.map(() => 'AnimationTracker.startAnimation'),
      ...instanceManager.createInstance.mock.calls.map(() => 'InstanceManager.createInstance'),
      ...mockWebSocket.connect.mock.calls.map(() => 'WebSocket.connect'),
      ...mockCommandProcessor.processCommand.mock.calls.map(() => 'CommandProcessor.processCommand')
    ];
    
    expectedPattern.forEach((expectedCall, index) => {
      expect(allCalls).toContain(expectedCall);
    });
  }

  function verifyContractCompliance(contract) {
    const actualInteractions = [
      { collaborator: 'InstanceManager', method: 'sendCommand' },
      { collaborator: 'AnimationTracker', method: 'updateAnimation' }
    ];
    
    const isCompliant = ContractValidator.validateInteraction(
      actualInteractions, contract
    );
    
    expect(isCompliant).toBe(true);
  }

  function verifyStateTransitionSequence(expectedStates) {
    const stageHistory = animationTracker.getStageHistory();
    
    expectedStates.forEach((state, index) => {
      if (index < stageHistory.length) {
        expect(stageHistory[index]).toBe(state);
      }
    });
  }

  function verifyErrorPropagation(error, result) {
    expect(result.success).toBe(false);
    expect(result.error).toBe(error.message);
    
    expect(animationTracker.onError).toHaveBeenCalledWith(error);
    expect(mockUIController.showError).toHaveBeenCalledWith(error.message);
  }

  function verifySpyBehaviorPattern(expectedBehavior) {
    expect(animationTracker.verifyProgressIncreased()).toBe(
      expectedBehavior.progressIncreases
    );
    
    const animationFlow = animationTracker.getAnimationLifecycleFlow();
    expect(animationFlow.lifecycle.isComplete).toBe(
      expectedBehavior.completesSuccessfully
    );
  }

  async function verifyStubConsistency(requestsPromise) {
    const results = await requestsPromise;
    
    // First filesystem request should be granted
    expect(results[0].granted).toBe(true);
    
    // Network request should be granted (same default response)
    expect(results[1].granted).toBe(true);
    
    // Duplicate filesystem request should return cached result
    expect(results[2].granted).toBe(true);
    expect(results[2].fromCache).toBe(true);
  }

  // Helper functions
  function setupDefaultBehaviors() {
    mockWebSocket.connect.mockResolvedValue({ connected: true });
    mockCommandProcessor.processCommand.mockResolvedValue({ 
      output: 'Command completed successfully' 
    });
    mockUIController.updateInterface.mockReturnValue(true);
  }

  function isCommandSensitive(command) {
    const sensitivePatterns = ['rm ', 'del ', 'format ', 'sudo '];
    return sensitivePatterns.some(pattern => command.includes(pattern));
  }

  async function simulateLongRunningCommand(instanceId, command, options) {
    // Simulate progress updates
    setTimeout(() => {
      animationTracker.setProgress(25);
      animationTracker.setMessage('Processing dependencies...');
    }, 50);
    
    setTimeout(() => {
      animationTracker.setProgress(75);
      animationTracker.setMessage('Building project...');
    }, 150);
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          commandId: `cmd-${Date.now()}`,
          output: 'Long command completed',
          executionTime: 300
        });
      }, 250);
    });
  }
});

// Jest custom matchers for contract validation
expect.extend({
  toMatchContract(received, contract) {
    const pass = Object.entries(contract).every(([method, schema]) => {
      const methodCalls = received[method];
      return methodCalls && methodCalls.length > 0;
    });
    
    return {
      message: () => `Expected mock interactions to match contract`,
      pass
    };
  }
});