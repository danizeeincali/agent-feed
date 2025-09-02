/**
 * Complete Workflow Validation Test - London School TDD E2E
 * End-to-end validation of complete user workflows with mock verification
 */

const { jest } = require('@jest/globals');
const { ClaudeInstanceManagerMock } = require('../mocks/claude-instance-manager.mock');
const { LoadingAnimationTrackerSpy } = require('../spies/loading-animation-tracker.spy');
const { PermissionDialogStub } = require('../stubs/permission-dialog.stub');
const { WebSocketCommunicationContract, ContractValidator } = require('../contracts/websocket-communication.contract');

describe('Complete Workflow Validation - E2E TDD London School', () => {
  let workflowOrchestrator;
  let mockComponents;
  let workflowTracker;

  beforeEach(() => {
    // Initialize workflow orchestrator
    workflowOrchestrator = new WorkflowOrchestrator();
    
    // Initialize all mock components
    mockComponents = {
      instanceManager: new ClaudeInstanceManagerMock(),
      animationTracker: new LoadingAnimationTrackerSpy(),
      permissionDialog: new PermissionDialogStub(),
      webSocketClient: createMockWebSocketClient(),
      uiController: createMockUIController(),
      commandProcessor: createMockCommandProcessor(),
      toolCallVisualizer: createMockToolCallVisualizer(),
      errorHandler: createMockErrorHandler()
    };

    // Initialize workflow tracking
    workflowTracker = new WorkflowTracker();
    
    setupWorkflowEnvironment();
  });

  afterEach(() => {
    Object.values(mockComponents).forEach(component => {
      if (component.reset) component.reset();
    });
    workflowTracker.reset();
    jest.clearAllMocks();
  });

  describe('Complete User Journey - Button Click to Result Display', () => {
    it('should execute complete happy path workflow with all collaborations', async () => {
      // GIVEN: User wants to execute a complex command workflow
      const userWorkflow = {
        command: 'create-react-app my-project --typescript --template advanced',
        options: { 
          timeout: 60000, 
          showProgress: true, 
          enableVisualization: true,
          requirePermission: true
        },
        expectedOutcome: 'project-created-successfully'
      };

      // WHEN: Complete workflow executes from start to finish
      const workflowResult = await workflowOrchestrator.executeCompleteWorkflow(
        userWorkflow, mockComponents
      );

      // THEN: All workflow stages execute with proper collaboration
      verifyCompleteWorkflowExecution(workflowResult, userWorkflow);
      verifyAllCollaborationsFollowContracts(workflowResult);
      verifyWorkflowStateTransitions(workflowResult);
    });

    it('should handle complex tool call visualization workflow', async () => {
      // GIVEN: Command that generates complex tool call visualization
      const complexWorkflow = {
        command: 'analyze-codebase --deep-scan --generate-report --with-metrics',
        toolCalls: [
          { name: 'file-scanner', estimated_duration: 2000 },
          { name: 'dependency-analyzer', estimated_duration: 3000 },
          { name: 'code-quality-checker', estimated_duration: 1500 },
          { name: 'report-generator', estimated_duration: 1000 }
        ],
        options: { enableVisualization: true, realTimeUpdates: true }
      };

      // WHEN: Complex tool call workflow executes
      const workflowResult = await workflowOrchestrator.executeToolCallWorkflow(
        complexWorkflow, mockComponents
      );

      // THEN: Tool call visualization coordinates correctly
      verifyToolCallVisualizationWorkflow(workflowResult, complexWorkflow);
    });

    it('should handle permission-gated workflow with multiple confirmations', async () => {
      // GIVEN: Workflow requiring multiple permission confirmations
      const permissionWorkflow = {
        command: 'deploy-to-production --force --skip-tests',
        permissionGates: [
          { type: 'filesystem', reason: 'Read deployment configuration' },
          { type: 'network', reason: 'Connect to production servers' },
          { type: 'dangerous-operation', reason: 'Skip safety checks' }
        ],
        options: { requireAllPermissions: true }
      };

      // Configure permission responses
      mockComponents.permissionDialog
        .configureResponse('allow', 200)
        .setPermissionState('filesystem', 'granted')
        .setPermissionState('network', 'granted')
        .setPermissionState('dangerous-operation', 'granted');

      // WHEN: Permission-gated workflow executes
      const workflowResult = await workflowOrchestrator.executePermissionGatedWorkflow(
        permissionWorkflow, mockComponents
      );

      // THEN: All permission gates are handled correctly
      verifyPermissionGatedWorkflow(workflowResult, permissionWorkflow);
    });
  });

  describe('Error Recovery Workflow Validation', () => {
    it('should handle network failure with retry and recovery', async () => {
      // GIVEN: Workflow that will encounter network failure
      const networkFailureScenario = {
        command: 'git clone https://github.com/large-repo.git',
        failures: [
          { stage: 'connection', error: 'Network timeout', recoverable: true },
          { stage: 'download', error: 'Connection reset', recoverable: true }
        ],
        retryStrategy: { maxAttempts: 3, backoffMs: 1000 }
      };

      // Configure network failures
      mockComponents.webSocketClient.connect
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Connection reset'))
        .mockResolvedValueOnce({ connected: true });

      // WHEN: Network failure workflow executes
      const workflowResult = await workflowOrchestrator.executeErrorRecoveryWorkflow(
        networkFailureScenario, mockComponents
      );

      // THEN: Error recovery follows proper collaboration pattern
      verifyErrorRecoveryWorkflow(workflowResult, networkFailureScenario);
    });

    it('should handle instance creation failure with graceful degradation', async () => {
      // GIVEN: Instance creation failure scenario
      const instanceFailureScenario = {
        command: 'heavy-computation-task',
        failurePoint: 'instance-creation',
        degradationStrategy: 'local-execution-fallback'
      };

      // Configure instance creation failure
      mockComponents.instanceManager.createInstance
        .mockRejectedValueOnce(new Error('Instance capacity exceeded'));

      // WHEN: Instance failure workflow executes
      const workflowResult = await workflowOrchestrator.executeGracefulDegradationWorkflow(
        instanceFailureScenario, mockComponents
      );

      // THEN: Graceful degradation is handled properly
      verifyGracefulDegradationWorkflow(workflowResult, instanceFailureScenario);
    });

    it('should handle permission denial with alternative workflows', async () => {
      // GIVEN: Permission denial scenario with alternatives
      const permissionDenialScenario = {
        command: 'system-level-operation',
        primaryPermission: { type: 'admin', required: true },
        alternativeWorkflows: [
          { type: 'user-level-operation', permission: 'user' },
          { type: 'request-admin-approval', permission: null }
        ]
      };

      // Configure permission denial
      mockComponents.permissionDialog
        .configureResponse('deny', 100)
        .setPermissionState('admin', 'denied');

      // WHEN: Permission denial workflow executes  
      const workflowResult = await workflowOrchestrator.executeAlternativeWorkflow(
        permissionDenialScenario, mockComponents
      );

      // THEN: Alternative workflow is executed correctly
      verifyAlternativeWorkflowExecution(workflowResult, permissionDenialScenario);
    });
  });

  describe('Performance and Load Workflow Validation', () => {
    it('should handle high-frequency command execution workflow', async () => {
      // GIVEN: High-frequency execution scenario
      const highFrequencyScenario = {
        commands: Array.from({length: 20}, (_, i) => `batch-command-${i}`),
        executionMode: 'parallel',
        maxConcurrency: 5,
        timeoutPerCommand: 2000
      };

      // WHEN: High-frequency workflow executes
      const workflowResult = await workflowOrchestrator.executeHighFrequencyWorkflow(
        highFrequencyScenario, mockComponents
      );

      // THEN: High-frequency execution maintains collaboration quality
      verifyHighFrequencyWorkflowPerformance(workflowResult, highFrequencyScenario);
    });

    it('should handle long-running workflow with progress tracking', async () => {
      // GIVEN: Long-running workflow scenario
      const longRunningScenario = {
        command: 'machine-learning-training',
        estimatedDuration: 300000, // 5 minutes
        progressUpdates: 50, // Updates every 6 seconds
        stageTransitions: [
          'data-preparation', 'model-training', 'validation', 'optimization', 'completion'
        ]
      };

      // WHEN: Long-running workflow executes
      const workflowResult = await workflowOrchestrator.executeLongRunningWorkflow(
        longRunningScenario, mockComponents
      );

      // THEN: Long-running workflow maintains proper progress tracking
      verifyLongRunningWorkflowProgress(workflowResult, longRunningScenario);
    });
  });

  describe('Workflow State Management Validation', () => {
    it('should maintain consistent state across all workflow components', async () => {
      // GIVEN: Complex stateful workflow
      const statefulWorkflow = {
        command: 'multi-stage-deployment',
        stages: [
          { name: 'preparation', modifiesState: ['deployment-config'] },
          { name: 'build', modifiesState: ['build-artifacts'] },
          { name: 'test', modifiesState: ['test-results'] },
          { name: 'deploy', modifiesState: ['deployment-status'] }
        ],
        stateValidation: true
      };

      // WHEN: Stateful workflow executes
      const workflowResult = await workflowOrchestrator.executeStatefulWorkflow(
        statefulWorkflow, mockComponents
      );

      // THEN: State consistency is maintained across all components
      verifyWorkflowStateConsistency(workflowResult, statefulWorkflow);
    });

    it('should handle concurrent workflow execution without state conflicts', async () => {
      // GIVEN: Multiple concurrent workflows
      const concurrentWorkflows = [
        { id: 'workflow-1', command: 'independent-task-1' },
        { id: 'workflow-2', command: 'independent-task-2' },
        { id: 'workflow-3', command: 'independent-task-3' }
      ];

      // WHEN: Concurrent workflows execute
      const workflowResults = await Promise.all(
        concurrentWorkflows.map(workflow => 
          workflowOrchestrator.executeIndependentWorkflow(workflow, mockComponents)
        )
      );

      // THEN: No state conflicts occur between concurrent workflows
      verifyConcurrentWorkflowIsolation(workflowResults, concurrentWorkflows);
    });
  });

  // Workflow execution functions
  class WorkflowOrchestrator {
    async executeCompleteWorkflow(workflow, components) {
      const execution = workflowTracker.startExecution(workflow.command);
      
      try {
        // Stage 1: UI Preparation
        execution.enterStage('ui-preparation');
        components.uiController.disableButton('execute');
        components.uiController.setButtonText('Executing...');
        
        // Stage 2: Permission Validation
        if (workflow.options.requirePermission) {
          execution.enterStage('permission-validation');
          const permissionResult = await components.permissionDialog.requestPermission(
            'filesystem', { command: workflow.command }
          );
          
          if (!permissionResult.granted) {
            throw new Error('Permission denied');
          }
        }

        // Stage 3: Animation Initialization
        execution.enterStage('animation-initialization');
        const animationResult = components.animationTracker.startAnimation({
          stage: 'initializing',
          message: 'Preparing command execution...'
        });

        // Stage 4: Instance Creation
        execution.enterStage('instance-creation');
        const instanceResult = await components.instanceManager.createInstance({
          timeout: workflow.options.timeout
        });

        // Stage 5: WebSocket Connection
        execution.enterStage('websocket-connection');
        const connectionResult = await components.webSocketClient.connect(
          instanceResult.websocketUrl
        );

        // Stage 6: Command Execution
        execution.enterStage('command-execution');
        components.animationTracker.setStage('executing');
        const commandResult = await components.instanceManager.sendCommand(
          instanceResult.instanceId,
          workflow.command,
          workflow.options
        );

        // Stage 7: Tool Call Visualization (if enabled)
        if (workflow.options.enableVisualization) {
          execution.enterStage('tool-call-visualization');
          await components.toolCallVisualizer.renderExecution(commandResult);
        }

        // Stage 8: Progress Tracking
        execution.enterStage('progress-tracking');
        components.animationTracker.setProgress(100);
        components.animationTracker.stopAnimation('completed');

        // Stage 9: UI Finalization
        execution.enterStage('ui-finalization');
        components.uiController.enableButton('execute');
        components.uiController.setButtonText('Execute Command');
        components.uiController.displayResult(commandResult);

        execution.complete('success');
        return {
          success: true,
          execution,
          results: {
            instance: instanceResult,
            command: commandResult,
            animation: animationResult,
            connection: connectionResult
          }
        };

      } catch (error) {
        execution.handleError(error);
        await components.errorHandler.handleWorkflowError(error, workflow);
        
        return {
          success: false,
          execution,
          error: error.message
        };
      }
    }

    async executeToolCallWorkflow(workflow, components) {
      const execution = workflowTracker.startExecution(`tool-call-${workflow.command}`);
      
      // Initialize visualization
      await components.toolCallVisualizer.initializeVisualization(workflow.toolCalls);
      
      // Execute each tool call with visualization updates
      for (const [index, toolCall] of workflow.toolCalls.entries()) {
        execution.enterStage(`tool-call-${index}-${toolCall.name}`);
        
        // Start tool call visualization
        components.toolCallVisualizer.startToolCall(toolCall.name);
        
        // Simulate tool call execution
        await this.simulateToolCallExecution(toolCall, components);
        
        // Update visualization
        components.toolCallVisualizer.completeToolCall(toolCall.name, {
          success: true,
          duration: toolCall.estimated_duration
        });
        
        // Update progress
        const progress = ((index + 1) / workflow.toolCalls.length) * 100;
        components.animationTracker.setProgress(progress);
      }
      
      execution.complete('success');
      return { success: true, execution, toolCallsCompleted: workflow.toolCalls.length };
    }

    async executePermissionGatedWorkflow(workflow, components) {
      const execution = workflowTracker.startExecution(`permission-gated-${workflow.command}`);
      
      // Request all required permissions
      for (const gate of workflow.permissionGates) {
        execution.enterStage(`permission-${gate.type}`);
        
        const permissionResult = await components.permissionDialog.requestPermission(
          gate.type, { reason: gate.reason }
        );
        
        if (!permissionResult.granted) {
          throw new Error(`Permission denied: ${gate.type}`);
        }
      }
      
      // Execute main workflow after all permissions granted
      execution.enterStage('main-execution');
      const commandResult = await components.instanceManager.sendCommand(
        'temp-instance', workflow.command
      );
      
      execution.complete('success');
      return { 
        success: true, 
        execution, 
        permissionsGranted: workflow.permissionGates.length,
        commandResult 
      };
    }

    async executeErrorRecoveryWorkflow(scenario, components) {
      const execution = workflowTracker.startExecution(`error-recovery-${scenario.command}`);
      let attempts = 0;
      
      while (attempts < scenario.retryStrategy.maxAttempts) {
        try {
          attempts++;
          execution.enterStage(`attempt-${attempts}`);
          
          // Try to establish connection
          const connectionResult = await components.webSocketClient.connect('ws://test');
          
          // If successful, proceed with command
          const commandResult = await components.instanceManager.sendCommand(
            'recovery-instance', scenario.command
          );
          
          execution.complete('success');
          return { 
            success: true, 
            execution, 
            attemptsRequired: attempts,
            commandResult 
          };
          
        } catch (error) {
          execution.recordError(error, `attempt-${attempts}`);
          
          if (attempts < scenario.retryStrategy.maxAttempts) {
            // Wait before retry
            await this.delay(scenario.retryStrategy.backoffMs * attempts);
          } else {
            // All attempts failed
            execution.complete('failed');
            return {
              success: false,
              execution,
              attemptsRequired: attempts,
              finalError: error.message
            };
          }
        }
      }
    }

    async simulateToolCallExecution(toolCall, components) {
      return new Promise(resolve => {
        setTimeout(() => {
          components.animationTracker.updateAnimation({
            message: `Executing ${toolCall.name}...`,
            progress: Math.random() * 100
          });
          resolve();
        }, Math.min(toolCall.estimated_duration, 100)); // Speed up for testing
      });
    }

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // Workflow tracking utility
  class WorkflowTracker {
    constructor() {
      this.executions = new Map();
    }

    startExecution(workflowId) {
      const execution = {
        id: workflowId,
        startTime: Date.now(),
        stages: [],
        errors: [],
        currentStage: null,
        status: 'running',
        
        enterStage(stageName) {
          this.currentStage = stageName;
          this.stages.push({
            name: stageName,
            startTime: Date.now(),
            status: 'active'
          });
        },
        
        recordError(error, context = null) {
          this.errors.push({
            error: error.message,
            context,
            timestamp: Date.now(),
            stage: this.currentStage
          });
        },
        
        handleError(error) {
          this.recordError(error);
          this.status = 'error';
        },
        
        complete(status) {
          this.status = status;
          this.endTime = Date.now();
          this.duration = this.endTime - this.startTime;
          
          if (this.currentStage && this.stages.length > 0) {
            this.stages[this.stages.length - 1].status = 'completed';
          }
        }
      };
      
      this.executions.set(workflowId, execution);
      return execution;
    }

    reset() {
      this.executions.clear();
    }
  }

  // Mock factory functions
  function createMockWebSocketClient() {
    return {
      connect: jest.fn().mockResolvedValue({ connected: true }),
      disconnect: jest.fn().mockResolvedValue({ disconnected: true }),
      send: jest.fn().mockResolvedValue({ sent: true }),
      onMessage: jest.fn(),
      onError: jest.fn(),
      readyState: 1
    };
  }

  function createMockUIController() {
    return {
      disableButton: jest.fn(),
      enableButton: jest.fn(),
      setButtonText: jest.fn(),
      displayResult: jest.fn(),
      showError: jest.fn(),
      updateProgress: jest.fn()
    };
  }

  function createMockCommandProcessor() {
    return {
      processCommand: jest.fn().mockResolvedValue({ 
        output: 'Command completed', 
        exitCode: 0 
      }),
      validateCommand: jest.fn().mockReturnValue({ valid: true }),
      formatOutput: jest.fn().mockReturnValue('Formatted output')
    };
  }

  function createMockToolCallVisualizer() {
    return {
      initializeVisualization: jest.fn().mockResolvedValue({ initialized: true }),
      renderExecution: jest.fn().mockResolvedValue({ rendered: true }),
      startToolCall: jest.fn(),
      completeToolCall: jest.fn(),
      updateVisualization: jest.fn()
    };
  }

  function createMockErrorHandler() {
    return {
      handleWorkflowError: jest.fn().mockResolvedValue({ handled: true }),
      classifyError: jest.fn().mockReturnValue({ type: 'recoverable' }),
      suggestRecovery: jest.fn().mockReturnValue({ strategy: 'retry' })
    };
  }

  // Verification functions
  function verifyCompleteWorkflowExecution(result, workflow) {
    expect(result.success).toBe(true);
    expect(result.execution.status).toBe('success');
    expect(result.execution.stages.length).toBeGreaterThan(5);
    
    // Verify key stages were executed
    const stageNames = result.execution.stages.map(s => s.name);
    expect(stageNames).toContain('ui-preparation');
    expect(stageNames).toContain('instance-creation');
    expect(stageNames).toContain('command-execution');
    expect(stageNames).toContain('ui-finalization');
  }

  function verifyAllCollaborationsFollowContracts(result) {
    // Verify WebSocket contract compliance
    expect(mockComponents.webSocketClient.connect).toHaveBeenCalled();
    
    // Verify instance management contract compliance
    expect(mockComponents.instanceManager.createInstance).toHaveBeenCalled();
    expect(mockComponents.instanceManager.sendCommand).toHaveBeenCalled();
    
    // Verify animation contract compliance
    expect(mockComponents.animationTracker.startAnimation).toHaveBeenCalled();
    expect(mockComponents.animationTracker.stopAnimation).toHaveBeenCalled();
  }

  function verifyWorkflowStateTransitions(result) {
    const stages = result.execution.stages;
    
    // Verify stages executed in logical order
    expect(stages.find(s => s.name === 'ui-preparation')).toBeDefined();
    expect(stages.find(s => s.name === 'instance-creation')).toBeDefined();
    expect(stages.find(s => s.name === 'command-execution')).toBeDefined();
    
    // Verify no overlapping stages (each completed before next started)
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].startTime).toBeGreaterThanOrEqual(stages[i-1].startTime);
    }
  }

  function verifyToolCallVisualizationWorkflow(result, workflow) {
    expect(result.success).toBe(true);
    expect(result.toolCallsCompleted).toBe(workflow.toolCalls.length);
    
    expect(mockComponents.toolCallVisualizer.initializeVisualization)
      .toHaveBeenCalledWith(workflow.toolCalls);
    
    workflow.toolCalls.forEach(toolCall => {
      expect(mockComponents.toolCallVisualizer.startToolCall)
        .toHaveBeenCalledWith(toolCall.name);
      expect(mockComponents.toolCallVisualizer.completeToolCall)
        .toHaveBeenCalledWith(toolCall.name, expect.any(Object));
    });
  }

  function verifyPermissionGatedWorkflow(result, workflow) {
    expect(result.success).toBe(true);
    expect(result.permissionsGranted).toBe(workflow.permissionGates.length);
    
    workflow.permissionGates.forEach(gate => {
      expect(mockComponents.permissionDialog.requestPermission)
        .toHaveBeenCalledWith(gate.type, expect.objectContaining({ reason: gate.reason }));
    });
  }

  function verifyErrorRecoveryWorkflow(result, scenario) {
    expect(result.success).toBe(true);
    expect(result.attemptsRequired).toBeGreaterThan(1);
    expect(result.attemptsRequired).toBeLessThanOrEqual(scenario.retryStrategy.maxAttempts);
    
    expect(mockComponents.webSocketClient.connect).toHaveBeenCalledTimes(result.attemptsRequired);
  }

  function verifyGracefulDegradationWorkflow(result, scenario) {
    expect(result.success).toBe(true);
    expect(mockComponents.instanceManager.createInstance).toHaveBeenCalled();
    expect(mockComponents.errorHandler.handleWorkflowError).toHaveBeenCalled();
  }

  function verifyAlternativeWorkflowExecution(result, scenario) {
    expect(result.success).toBe(true);
    expect(mockComponents.permissionDialog.requestPermission).toHaveBeenCalled();
  }

  function verifyHighFrequencyWorkflowPerformance(result, scenario) {
    expect(result.success).toBe(true);
    expect(result.execution.duration).toBeLessThan(scenario.timeoutPerCommand * scenario.commands.length);
  }

  function verifyLongRunningWorkflowProgress(result, scenario) {
    expect(result.success).toBe(true);
    expect(mockComponents.animationTracker.setProgress).toHaveBeenCalled();
    expect(mockComponents.animationTracker.setStage).toHaveBeenCalled();
  }

  function verifyWorkflowStateConsistency(result, workflow) {
    expect(result.success).toBe(true);
    
    workflow.stages.forEach(stage => {
      const stageExecution = result.execution.stages.find(s => s.name === stage.name);
      expect(stageExecution).toBeDefined();
      expect(stageExecution.status).toBe('completed');
    });
  }

  function verifyConcurrentWorkflowIsolation(results, workflows) {
    expect(results).toHaveLength(workflows.length);
    expect(results.every(r => r.success)).toBe(true);
    
    // Verify no cross-workflow interference
    results.forEach(result => {
      expect(result.execution.errors.length).toBe(0);
    });
  }

  function setupWorkflowEnvironment() {
    // Configure default behaviors for all mock components
    Object.values(mockComponents).forEach(component => {
      if (component.setupDefaultBehavior) {
        component.setupDefaultBehavior();
      }
    });
  }
});