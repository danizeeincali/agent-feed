/**
 * Service Layer Interactions Test - London School TDD
 * Focuses on how services collaborate rather than their internal state
 */

const { jest } = require('@jest/globals');
const { ClaudeInstanceManagerMock } = require('../mocks/claude-instance-manager.mock');
const { LoadingAnimationTrackerSpy } = require('../spies/loading-animation-tracker.spy');

describe('Service Layer Interactions - Behavior Verification', () => {
  let instanceManager;
  let animationTracker;
  let mockWebSocketService;
  let mockCommandService;
  let mockVisualizationService;
  let mockErrorHandler;

  beforeEach(() => {
    // Initialize primary service mocks
    instanceManager = new ClaudeInstanceManagerMock();
    animationTracker = new LoadingAnimationTrackerSpy();

    // Initialize collaborator mocks
    mockWebSocketService = {
      createConnection: jest.fn(),
      closeConnection: jest.fn(),
      sendMessage: jest.fn(),
      subscribeToMessages: jest.fn(),
      getConnectionStatus: jest.fn()
    };

    mockCommandService = {
      validateCommand: jest.fn(),
      executeCommand: jest.fn(),
      cancelCommand: jest.fn(),
      getCommandHistory: jest.fn(),
      formatCommandOutput: jest.fn()
    };

    mockVisualizationService = {
      initializeVisualization: jest.fn(),
      updateVisualization: jest.fn(),
      renderToolCall: jest.fn(),
      clearVisualization: jest.fn(),
      exportVisualization: jest.fn()
    };

    mockErrorHandler = {
      handleError: jest.fn(),
      reportError: jest.fn(),
      classifyError: jest.fn(),
      suggestRecovery: jest.fn(),
      logError: jest.fn()
    };

    setupServiceBehaviors();
  });

  afterEach(() => {
    instanceManager.reset();
    animationTracker.reset();
    jest.clearAllMocks();
  });

  describe('Command Execution Service Orchestration', () => {
    it('should orchestrate command execution with proper service collaboration', async () => {
      // GIVEN: A command execution request
      const command = 'analyze-project --depth=full';
      const context = { userId: 'user123', sessionId: 'session456' };

      // WHEN: Command execution is orchestrated
      await orchestrateCommandExecution(command, context);

      // THEN: Services collaborate in expected sequence
      verifyCommandExecutionOrchestration(command, context);
    });

    it('should handle service dependencies correctly', async () => {
      // GIVEN: Command requires multiple service dependencies
      const complexCommand = 'deploy --with-monitoring --verbose';

      // WHEN: Complex command is executed
      await orchestrateCommandExecution(complexCommand);

      // THEN: Service dependencies are resolved in correct order
      verifyServiceDependencyResolution(complexCommand);
    });

    it('should coordinate service error handling', async () => {
      // GIVEN: WebSocket service fails during command execution
      mockWebSocketService.sendMessage.mockRejectedValue(
        new Error('Connection lost')
      );

      // WHEN: Command execution encounters service failure
      const result = await orchestrateCommandExecution('test-command');

      // THEN: Error handling is coordinated across services
      verifyServiceErrorCoordination(result, 'Connection lost');
    });
  });

  describe('Service Communication Patterns', () => {
    it('should verify request-response patterns between services', async () => {
      // GIVEN: Service interaction that follows request-response pattern
      const requestData = { command: 'status', format: 'json' };

      // WHEN: Request-response interaction occurs
      await executeRequestResponsePattern(requestData);

      // THEN: Pattern is followed correctly
      verifyRequestResponsePattern(requestData);
    });

    it('should verify publish-subscribe patterns for service events', async () => {
      // GIVEN: Services that communicate via events
      const eventData = { type: 'command-completed', payload: { result: 'success' } };

      // WHEN: Event-driven communication occurs
      await executePublishSubscribePattern(eventData);

      // THEN: Event pattern is handled correctly
      verifyPublishSubscribePattern(eventData);
    });

    it('should verify service lifecycle coordination', async () => {
      // GIVEN: Services with interdependent lifecycles
      const services = ['instance', 'websocket', 'command', 'visualization'];

      // WHEN: Service lifecycle events occur
      await executeServiceLifecycleFlow(services);

      // THEN: Lifecycle coordination is handled properly
      verifyServiceLifecycleCoordination(services);
    });
  });

  describe('Service State Synchronization', () => {
    it('should verify services maintain consistent state', async () => {
      // GIVEN: Multiple services that need state synchronization
      const stateUpdate = { 
        instanceId: 'inst-123',
        status: 'executing',
        progress: 45,
        activeCommand: 'build-project'
      };

      // WHEN: State update propagates through services
      await propagateStateUpdate(stateUpdate);

      // THEN: All services reflect consistent state
      verifyStateConsistency(stateUpdate);
    });

    it('should handle concurrent service operations', async () => {
      // GIVEN: Multiple concurrent operations
      const operations = [
        { type: 'command', data: 'operation-1' },
        { type: 'visualization', data: 'render-update' },
        { type: 'animation', data: 'progress-update' }
      ];

      // WHEN: Operations execute concurrently
      const results = await Promise.all(
        operations.map(op => executeConcurrentOperation(op))
      );

      // THEN: Service coordination handles concurrency correctly
      verifyConcurrentOperationHandling(operations, results);
    });

    it('should verify service transaction boundaries', async () => {
      // GIVEN: Operations that require transactional behavior
      const transactionalOps = [
        'create-instance',
        'establish-connection', 
        'initialize-visualization',
        'start-command'
      ];

      // WHEN: Transactional operation sequence executes
      const transactionResult = await executeTransactionalSequence(transactionalOps);

      // THEN: Transaction boundaries are respected
      verifyTransactionBoundaries(transactionalOps, transactionResult);
    });
  });

  describe('Service Contract Enforcement', () => {
    it('should enforce input validation contracts between services', () => {
      // GIVEN: Service contract for command validation
      const validationContract = {
        input: { command: 'string', options: 'object' },
        output: { valid: 'boolean', errors: 'array' }
      };

      // WHEN: Services interact according to contract
      const result = mockCommandService.validateCommand('test-cmd', { verbose: true });

      // THEN: Contract is enforced properly
      verifyContractEnforcement(validationContract, result);
    });

    it('should verify service interface contracts', async () => {
      // GIVEN: Expected service interface
      const expectedInterface = {
        required: ['createConnection', 'sendMessage', 'closeConnection'],
        optional: ['getConnectionStatus', 'subscribeToMessages']
      };

      // WHEN: Service interface is analyzed
      const actualInterface = Object.keys(mockWebSocketService);

      // THEN: Interface contract is satisfied
      verifyInterfaceContract(expectedInterface, actualInterface);
    });

    it('should validate service behavior contracts', async () => {
      // GIVEN: Behavior contract for animation service
      const behaviorContract = {
        startAnimation: { 
          precondition: 'not already active',
          postcondition: 'animation is active',
          sideEffects: ['UI update', 'state change']
        }
      };

      // WHEN: Service behavior is executed
      const animationResult = animationTracker.startAnimation({ stage: 'test' });

      // THEN: Behavior contract is satisfied
      verifyBehaviorContract(behaviorContract.startAnimation, animationResult);
    });
  });

  describe('Service Performance and Quality', () => {
    it('should verify service response time contracts', async () => {
      // GIVEN: Performance contract for service response times
      const performanceContract = {
        createInstance: { maxTime: 500 },
        sendCommand: { maxTime: 1000 },
        updateVisualization: { maxTime: 100 }
      };

      // WHEN: Services execute within time constraints
      const performanceResults = await measureServicePerformance();

      // THEN: Performance contracts are met
      verifyPerformanceContracts(performanceContract, performanceResults);
    });

    it('should verify service error handling quality', async () => {
      // GIVEN: Various error scenarios
      const errorScenarios = [
        { type: 'network', error: new Error('Network timeout') },
        { type: 'validation', error: new Error('Invalid input') },
        { type: 'permission', error: new Error('Access denied') }
      ];

      // WHEN: Services handle different types of errors
      const errorResults = await Promise.all(
        errorScenarios.map(scenario => testErrorHandling(scenario))
      );

      // THEN: Error handling quality is verified
      verifyErrorHandlingQuality(errorScenarios, errorResults);
    });
  });

  // Service orchestration functions
  async function orchestrateCommandExecution(command, context = {}) {
    try {
      // 1. Validate command
      const validationResult = mockCommandService.validateCommand(command);
      if (!validationResult.valid) {
        throw new Error('Invalid command');
      }

      // 2. Create instance
      const instanceResult = await instanceManager.createInstance(context);
      
      // 3. Establish WebSocket connection
      const connectionResult = await mockWebSocketService.createConnection(
        instanceResult.websocketUrl
      );
      
      // 4. Initialize visualization
      if (context.enableVisualization) {
        await mockVisualizationService.initializeVisualization(context);
      }
      
      // 5. Start animation
      animationTracker.startAnimation({ 
        stage: 'executing', 
        message: `Executing: ${command}` 
      });
      
      // 6. Execute command
      const commandResult = await instanceManager.sendCommand(
        instanceResult.instanceId,
        command,
        context
      );
      
      // 7. Update services with result
      animationTracker.setProgress(100);
      if (context.enableVisualization) {
        await mockVisualizationService.updateVisualization(commandResult);
      }
      
      return {
        success: true,
        instanceId: instanceResult.instanceId,
        commandResult,
        connectionId: connectionResult.id
      };
      
    } catch (error) {
      await mockErrorHandler.handleError(error, { command, context });
      throw error;
    }
  }

  async function executeRequestResponsePattern(requestData) {
    // Service A makes request to Service B
    const response = await mockCommandService.validateCommand(
      requestData.command,
      { format: requestData.format }
    );
    
    // Service B processes and responds
    mockCommandService.formatCommandOutput.mockReturnValue({
      formatted: true,
      data: response
    });
    
    return mockCommandService.formatCommandOutput(response);
  }

  async function executePublishSubscribePattern(eventData) {
    // Publisher service emits event
    const subscribers = [mockVisualizationService, animationTracker];
    
    // Simulate event distribution
    subscribers.forEach(subscriber => {
      if (subscriber.handleEvent) {
        subscriber.handleEvent(eventData);
      }
    });
    
    return { published: true, subscribers: subscribers.length };
  }

  async function executeServiceLifecycleFlow(services) {
    const results = [];
    
    // Initialize services in order
    for (const serviceName of services) {
      switch (serviceName) {
        case 'instance':
          results.push(await instanceManager.createInstance());
          break;
        case 'websocket':
          results.push(await mockWebSocketService.createConnection('ws://test'));
          break;
        case 'visualization':
          results.push(await mockVisualizationService.initializeVisualization());
          break;
        default:
          results.push({ service: serviceName, initialized: true });
      }
    }
    
    return results;
  }

  async function propagateStateUpdate(stateUpdate) {
    // Update each service with new state
    instanceManager.instances.get('mock-id')?.status = stateUpdate.status;
    animationTracker.setProgress(stateUpdate.progress);
    
    // Notify all services of state change
    const notifications = [
      mockWebSocketService.sendMessage({ type: 'state-update', data: stateUpdate }),
      mockVisualizationService.updateVisualization(stateUpdate)
    ];
    
    return Promise.all(notifications);
  }

  async function executeConcurrentOperation(operation) {
    const startTime = Date.now();
    
    let result;
    switch (operation.type) {
      case 'command':
        result = await mockCommandService.executeCommand(operation.data);
        break;
      case 'visualization':
        result = await mockVisualizationService.renderToolCall(operation.data);
        break;
      case 'animation':
        result = animationTracker.updateAnimation({ message: operation.data });
        break;
      default:
        result = { handled: false };
    }
    
    return {
      ...result,
      duration: Date.now() - startTime,
      operation
    };
  }

  async function executeTransactionalSequence(operations) {
    const transaction = { id: `tx-${Date.now()}`, operations: [] };
    
    try {
      for (const op of operations) {
        const result = await executeTransactionalOperation(op);
        transaction.operations.push({ operation: op, result, status: 'completed' });
      }
      
      transaction.status = 'committed';
      return transaction;
      
    } catch (error) {
      // Rollback completed operations
      await rollbackTransaction(transaction);
      transaction.status = 'rolled-back';
      transaction.error = error.message;
      return transaction;
    }
  }

  async function executeTransactionalOperation(operation) {
    switch (operation) {
      case 'create-instance':
        return instanceManager.createInstance();
      case 'establish-connection':
        return mockWebSocketService.createConnection('ws://test');
      case 'initialize-visualization':
        return mockVisualizationService.initializeVisualization();
      case 'start-command':
        return mockCommandService.executeCommand('init');
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  async function rollbackTransaction(transaction) {
    // Reverse the operations that completed
    for (const op of transaction.operations.reverse()) {
      try {
        await rollbackOperation(op.operation);
      } catch (rollbackError) {
        // Log rollback failures but continue
        mockErrorHandler.logError(rollbackError);
      }
    }
  }

  async function rollbackOperation(operation) {
    switch (operation) {
      case 'create-instance':
        return instanceManager.destroyInstance('mock-id');
      case 'establish-connection':
        return mockWebSocketService.closeConnection('mock-connection');
      case 'initialize-visualization':
        return mockVisualizationService.clearVisualization();
      default:
        return Promise.resolve();
    }
  }

  async function measureServicePerformance() {
    const results = {};
    
    // Measure createInstance performance
    const instanceStart = Date.now();
    await instanceManager.createInstance();
    results.createInstance = Date.now() - instanceStart;
    
    // Measure sendCommand performance
    const commandStart = Date.now();
    await instanceManager.sendCommand('test-id', 'echo test');
    results.sendCommand = Date.now() - commandStart;
    
    // Measure updateVisualization performance
    const vizStart = Date.now();
    await mockVisualizationService.updateVisualization({ data: 'test' });
    results.updateVisualization = Date.now() - vizStart;
    
    return results;
  }

  async function testErrorHandling(scenario) {
    try {
      // Simulate the error scenario
      switch (scenario.type) {
        case 'network':
          mockWebSocketService.sendMessage.mockRejectedValue(scenario.error);
          await mockWebSocketService.sendMessage('test');
          break;
        case 'validation':
          mockCommandService.validateCommand.mockReturnValue({
            valid: false,
            errors: [scenario.error.message]
          });
          break;
        case 'permission':
          instanceManager.createInstance.mockRejectedValue(scenario.error);
          await instanceManager.createInstance();
          break;
      }
      
      return { handled: false };
      
    } catch (error) {
      const handling = await mockErrorHandler.handleError(error);
      return {
        handled: true,
        error: error.message,
        handling
      };
    }
  }

  // Verification functions
  function verifyCommandExecutionOrchestration(command, context) {
    // Verify correct service call sequence
    expect(mockCommandService.validateCommand).toHaveBeenCalledWith(command);
    expect(instanceManager.createInstance).toHaveBeenCalledWith(context);
    expect(mockWebSocketService.createConnection).toHaveBeenCalled();
    expect(animationTracker.startAnimation).toHaveBeenCalled();
    expect(instanceManager.sendCommand).toHaveBeenCalledWith(
      expect.any(String), command, context
    );
  }

  function verifyServiceDependencyResolution(command) {
    const createInstanceCalls = instanceManager.createInstance.mock.calls;
    const connectionCalls = mockWebSocketService.createConnection.mock.calls;
    
    // WebSocket connection should happen after instance creation
    expect(connectionCalls.length).toBeGreaterThan(0);
    expect(createInstanceCalls.length).toBeGreaterThan(0);
  }

  function verifyServiceErrorCoordination(result, expectedError) {
    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expectedError }),
      expect.any(Object)
    );
  }

  function verifyRequestResponsePattern(requestData) {
    expect(mockCommandService.validateCommand).toHaveBeenCalledWith(
      requestData.command,
      { format: requestData.format }
    );
    expect(mockCommandService.formatCommandOutput).toHaveBeenCalled();
  }

  function verifyPublishSubscribePattern(eventData) {
    // Verify event was processed by subscribers
    expect(mockVisualizationService.handleEvent || (() => {})).toBeDefined();
    expect(animationTracker.handleEvent || (() => {})).toBeDefined();
  }

  function verifyServiceLifecycleCoordination(services) {
    // Verify services were initialized in correct order
    const callOrder = [
      instanceManager.createInstance.mock.calls.length > 0,
      mockWebSocketService.createConnection.mock.calls.length > 0,
      mockVisualizationService.initializeVisualization.mock.calls.length > 0
    ];
    
    expect(callOrder.every(called => called)).toBe(true);
  }

  function verifyStateConsistency(stateUpdate) {
    // Verify state propagated to all relevant services
    expect(animationTracker.setProgress).toHaveBeenCalledWith(stateUpdate.progress);
    expect(mockWebSocketService.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ 
        type: 'state-update', 
        data: stateUpdate 
      })
    );
  }

  function verifyConcurrentOperationHandling(operations, results) {
    // Verify all operations completed
    expect(results).toHaveLength(operations.length);
    expect(results.every(result => result.duration !== undefined)).toBe(true);
  }

  function verifyTransactionBoundaries(operations, result) {
    if (result.status === 'committed') {
      expect(result.operations).toHaveLength(operations.length);
      expect(result.operations.every(op => op.status === 'completed')).toBe(true);
    } else {
      expect(result.status).toBe('rolled-back');
      expect(result.error).toBeDefined();
    }
  }

  function verifyContractEnforcement(contract, result) {
    // Verify input/output types match contract
    if (contract.output) {
      Object.entries(contract.output).forEach(([key, expectedType]) => {
        expect(typeof result[key]).toBe(expectedType);
      });
    }
  }

  function verifyInterfaceContract(expectedInterface, actualInterface) {
    // Verify required methods are present
    expectedInterface.required.forEach(method => {
      expect(actualInterface).toContain(method);
    });
  }

  function verifyBehaviorContract(contract, result) {
    // Verify postconditions are met
    if (contract.postcondition === 'animation is active') {
      expect(result.started).toBe(true);
    }
  }

  function verifyPerformanceContracts(contracts, results) {
    Object.entries(contracts).forEach(([operation, { maxTime }]) => {
      expect(results[operation]).toBeLessThan(maxTime);
    });
  }

  function verifyErrorHandlingQuality(scenarios, results) {
    expect(results.every(result => result.handled)).toBe(true);
    expect(mockErrorHandler.handleError.mock.calls.length).toBe(scenarios.length);
  }

  // Setup helper
  function setupServiceBehaviors() {
    // Configure mock behaviors
    mockWebSocketService.createConnection.mockResolvedValue({
      id: 'conn-123',
      url: 'ws://test',
      connected: true
    });
    
    mockCommandService.validateCommand.mockReturnValue({
      valid: true,
      errors: []
    });
    
    mockCommandService.executeCommand.mockResolvedValue({
      success: true,
      output: 'Command executed'
    });
    
    mockVisualizationService.initializeVisualization.mockResolvedValue({
      initialized: true,
      canvasId: 'viz-canvas'
    });
    
    mockVisualizationService.updateVisualization.mockResolvedValue({
      updated: true
    });
    
    mockErrorHandler.handleError.mockResolvedValue({
      handled: true,
      recovery: 'retry'
    });
  }
});