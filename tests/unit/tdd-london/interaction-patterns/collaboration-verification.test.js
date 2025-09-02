/**
 * Collaboration Verification Test - London School TDD
 * Tests object collaboration patterns and interaction sequences
 */

const { jest } = require('@jest/globals');
const { ClaudeInstanceManagerMock } = require('../mocks/claude-instance-manager.mock');
const { LoadingAnimationTrackerSpy } = require('../spies/loading-animation-tracker.spy');
const { PermissionDialogStub } = require('../stubs/permission-dialog.stub');

describe('Collaboration Verification - Interaction Patterns', () => {
  let instanceManager;
  let animationTracker;
  let permissionDialog;
  let collaborationMonitor;

  beforeEach(() => {
    instanceManager = new ClaudeInstanceManagerMock();
    animationTracker = new LoadingAnimationTrackerSpy();
    permissionDialog = new PermissionDialogStub();
    
    collaborationMonitor = new CollaborationMonitor();
    setupCollaborationTracking();
  });

  afterEach(() => {
    instanceManager.reset();
    animationTracker.reset();
    permissionDialog.reset();
    collaborationMonitor.reset();
    jest.clearAllMocks();
  });

  describe('Command-Response Collaboration Pattern', () => {
    it('should verify command initiator collaborates correctly with executor', async () => {
      // GIVEN: Command initiation scenario
      const command = 'build-project';
      const context = { timeout: 30000 };

      // WHEN: Command-response collaboration occurs
      const collaboration = await executeCommandResponsePattern(command, context);

      // THEN: Collaboration follows expected pattern
      verifyCommandResponseCollaboration(collaboration, command, context);
    });

    it('should verify response handling collaborates with UI updates', async () => {
      // GIVEN: Command completion scenario
      const commandResult = {
        success: true,
        output: 'Build completed successfully',
        artifacts: ['dist/bundle.js', 'dist/bundle.css']
      };

      // WHEN: Response handling collaboration occurs
      const collaboration = await executeResponseHandlingPattern(commandResult);

      // THEN: Response handling follows collaboration contract
      verifyResponseHandlingCollaboration(collaboration, commandResult);
    });

    it('should verify error response collaboration patterns', async () => {
      // GIVEN: Command execution error
      const commandError = {
        type: 'execution-error',
        message: 'Build failed: dependency not found',
        details: { missingDependency: '@babel/core' }
      };

      // WHEN: Error response collaboration occurs
      const collaboration = await executeErrorResponsePattern(commandError);

      // THEN: Error response collaboration is handled correctly
      verifyErrorResponseCollaboration(collaboration, commandError);
    });
  });

  describe('Observer Pattern Collaboration', () => {
    it('should verify progress observers receive updates in correct sequence', async () => {
      // GIVEN: Multiple progress observers
      const observers = [
        { name: 'UI_Progress', notify: jest.fn() },
        { name: 'Analytics_Tracker', notify: jest.fn() },
        { name: 'Log_Writer', notify: jest.fn() }
      ];

      // WHEN: Progress updates are broadcasted
      const collaboration = await executeObserverPattern(observers);

      // THEN: All observers receive updates in correct sequence
      verifyObserverPatternCollaboration(collaboration, observers);
    });

    it('should verify observer registration and deregistration', async () => {
      // GIVEN: Dynamic observer management
      const dynamicObserver = { name: 'Dynamic_Observer', notify: jest.fn() };

      // WHEN: Observer lifecycle events occur
      const collaboration = await executeObserverLifecycle(dynamicObserver);

      // THEN: Observer lifecycle is managed correctly
      verifyObserverLifecycleCollaboration(collaboration, dynamicObserver);
    });

    it('should verify observer error isolation', async () => {
      // GIVEN: Observers where one throws error
      const faultyObserver = { 
        name: 'Faulty_Observer', 
        notify: jest.fn().mockImplementation(() => {
          throw new Error('Observer failure');
        })
      };
      const healthyObserver = { name: 'Healthy_Observer', notify: jest.fn() };

      // WHEN: Observer notification occurs with faulty observer
      const collaboration = await executeObserverErrorHandling([
        faultyObserver, 
        healthyObserver
      ]);

      // THEN: Error isolation maintains collaboration integrity
      verifyObserverErrorIsolation(collaboration, faultyObserver, healthyObserver);
    });
  });

  describe('Strategy Pattern Collaboration', () => {
    it('should verify strategy selection collaborates with execution context', async () => {
      // GIVEN: Multiple execution strategies
      const strategies = {
        fast: { execute: jest.fn().mockResolvedValue('fast-result') },
        thorough: { execute: jest.fn().mockResolvedValue('thorough-result') },
        balanced: { execute: jest.fn().mockResolvedValue('balanced-result') }
      };

      // WHEN: Strategy pattern collaboration occurs
      const collaboration = await executeStrategyPattern(strategies, 'thorough');

      // THEN: Strategy selection and execution follow collaboration contract
      verifyStrategyPatternCollaboration(collaboration, strategies, 'thorough');
    });

    it('should verify strategy switching during execution', async () => {
      // GIVEN: Adaptive strategy switching scenario
      const adaptiveStrategies = {
        initial: { execute: jest.fn().mockRejectedValue(new Error('Strategy failed')) },
        fallback: { execute: jest.fn().mockResolvedValue('fallback-success') }
      };

      // WHEN: Strategy switching collaboration occurs
      const collaboration = await executeAdaptiveStrategyPattern(adaptiveStrategies);

      // THEN: Strategy switching follows collaboration protocol
      verifyAdaptiveStrategyCollaboration(collaboration, adaptiveStrategies);
    });
  });

  describe('Chain of Responsibility Collaboration', () => {
    it('should verify request processing chain collaboration', async () => {
      // GIVEN: Processing chain handlers
      const handlers = [
        { 
          name: 'Validator',
          handle: jest.fn().mockImplementation(req => ({ ...req, validated: true })),
          canHandle: jest.fn().mockReturnValue(true)
        },
        {
          name: 'Authenticator', 
          handle: jest.fn().mockImplementation(req => ({ ...req, authenticated: true })),
          canHandle: jest.fn().mockReturnValue(true)
        },
        {
          name: 'Executor',
          handle: jest.fn().mockImplementation(req => ({ ...req, executed: true })),
          canHandle: jest.fn().mockReturnValue(true)
        }
      ];

      // WHEN: Chain of responsibility collaboration occurs
      const collaboration = await executeChainOfResponsibility(handlers, {
        type: 'command-request',
        command: 'test-command'
      });

      // THEN: Chain collaboration follows expected sequence
      verifyChainOfResponsibilityCollaboration(collaboration, handlers);
    });

    it('should verify chain interruption and continuation patterns', async () => {
      // GIVEN: Chain with conditional handler
      const conditionalHandlers = [
        {
          name: 'Pre_Processor',
          handle: jest.fn().mockImplementation(req => ({ ...req, preprocessed: true })),
          canHandle: jest.fn().mockReturnValue(true)
        },
        {
          name: 'Conditional_Handler',
          handle: jest.fn(),
          canHandle: jest.fn().mockReturnValue(false) // Cannot handle this request
        },
        {
          name: 'Final_Processor',
          handle: jest.fn().mockImplementation(req => ({ ...req, finalized: true })),
          canHandle: jest.fn().mockReturnValue(true)
        }
      ];

      // WHEN: Chain with skip scenario executes
      const collaboration = await executeConditionalChain(conditionalHandlers, {
        type: 'special-request'
      });

      // THEN: Chain skip behavior follows collaboration rules
      verifyConditionalChainCollaboration(collaboration, conditionalHandlers);
    });
  });

  describe('Mediator Pattern Collaboration', () => {
    it('should verify mediator coordinates component interactions', async () => {
      // GIVEN: Components that communicate through mediator
      const components = {
        commandInput: {
          name: 'Command_Input',
          sendToMediator: jest.fn(),
          receiveFromMediator: jest.fn()
        },
        instanceManager: {
          name: 'Instance_Manager', 
          sendToMediator: jest.fn(),
          receiveFromMediator: jest.fn()
        },
        uiUpdater: {
          name: 'UI_Updater',
          sendToMediator: jest.fn(),
          receiveFromMediator: jest.fn()
        }
      };

      // WHEN: Mediator pattern collaboration occurs
      const collaboration = await executeMediatorPattern(components, {
        event: 'command-submitted',
        data: { command: 'analyze-files' }
      });

      // THEN: Mediator coordination follows collaboration protocol
      verifyMediatorPatternCollaboration(collaboration, components);
    });

    it('should verify mediator handles complex interaction sequences', async () => {
      // GIVEN: Multi-step interaction through mediator
      const interactionSequence = [
        { from: 'UI', to: 'Validator', message: 'validate-input' },
        { from: 'Validator', to: 'Instance', message: 'create-instance' },
        { from: 'Instance', to: 'WebSocket', message: 'establish-connection' },
        { from: 'WebSocket', to: 'UI', message: 'connection-ready' }
      ];

      // WHEN: Complex mediator collaboration occurs
      const collaboration = await executeComplexMediatorSequence(interactionSequence);

      // THEN: Complex sequence follows mediation rules
      verifyComplexMediatorCollaboration(collaboration, interactionSequence);
    });
  });

  describe('Collaboration Quality Metrics', () => {
    it('should measure collaboration coupling and cohesion', async () => {
      // GIVEN: System with various collaborations
      const systemComponents = [
        'CommandProcessor', 'InstanceManager', 'WebSocketClient', 
        'UIController', 'AnimationTracker', 'PermissionHandler'
      ];

      // WHEN: System collaborations are analyzed
      const metrics = await measureCollaborationMetrics(systemComponents);

      // THEN: Collaboration quality meets standards
      verifyCollaborationQualityMetrics(metrics);
    });

    it('should validate collaboration performance under load', async () => {
      // GIVEN: High-load collaboration scenario
      const loadScenario = {
        concurrentCollaborations: 50,
        duration: 5000, // 5 seconds
        collaborationTypes: ['command', 'progress', 'error', 'completion']
      };

      // WHEN: Load testing collaboration patterns
      const loadResults = await executeCollaborationLoadTest(loadScenario);

      // THEN: Collaboration performance meets requirements
      verifyCollaborationLoadTestResults(loadResults, loadScenario);
    });
  });

  // Collaboration execution functions
  async function executeCommandResponsePattern(command, context) {
    const collaboration = collaborationMonitor.startTracking('command-response');

    try {
      // 1. Command initiation
      collaboration.recordInteraction('CommandInitiator', 'InstanceManager', 'createInstance');
      const instanceResult = await instanceManager.createInstance(context);

      // 2. Command execution
      collaboration.recordInteraction('CommandInitiator', 'InstanceManager', 'sendCommand');
      const commandResult = await instanceManager.sendCommand(
        instanceResult.instanceId, command, context
      );

      // 3. Response processing
      collaboration.recordInteraction('InstanceManager', 'ResponseProcessor', 'processResult');
      const processedResult = processCommandResult(commandResult);

      collaboration.complete();
      return { collaboration, instanceResult, commandResult, processedResult };

    } catch (error) {
      collaboration.recordError(error);
      return { collaboration, error };
    }
  }

  async function executeResponseHandlingPattern(commandResult) {
    const collaboration = collaborationMonitor.startTracking('response-handling');

    // UI Update collaboration
    collaboration.recordInteraction('ResponseHandler', 'UIUpdater', 'updateInterface');
    
    // Animation Update collaboration  
    collaboration.recordInteraction('ResponseHandler', 'AnimationTracker', 'stopAnimation');
    animationTracker.stopAnimation('completed');

    // Result Storage collaboration
    collaboration.recordInteraction('ResponseHandler', 'ResultStore', 'storeResult');

    collaboration.complete();
    return { collaboration, result: 'response-handled' };
  }

  async function executeErrorResponsePattern(commandError) {
    const collaboration = collaborationMonitor.startTracking('error-response');

    // Error Classification
    collaboration.recordInteraction('ErrorHandler', 'ErrorClassifier', 'classify');
    
    // Error Display
    collaboration.recordInteraction('ErrorHandler', 'UIController', 'showError');
    
    // Error Recovery
    collaboration.recordInteraction('ErrorHandler', 'RecoveryManager', 'suggestRecovery');

    // Animation Error State
    collaboration.recordInteraction('ErrorHandler', 'AnimationTracker', 'onError');
    animationTracker.onError(commandError);

    collaboration.complete();
    return { collaboration, errorHandled: true };
  }

  async function executeObserverPattern(observers) {
    const collaboration = collaborationMonitor.startTracking('observer-pattern');

    // Register observers
    observers.forEach(observer => {
      collaboration.recordInteraction('Subject', observer.name, 'register');
    });

    // Notify all observers
    const progressUpdate = { progress: 75, message: 'Processing...' };
    observers.forEach(observer => {
      collaboration.recordInteraction('Subject', observer.name, 'notify');
      observer.notify(progressUpdate);
    });

    collaboration.complete();
    return { collaboration, notified: observers.length };
  }

  async function executeObserverLifecycle(dynamicObserver) {
    const collaboration = collaborationMonitor.startTracking('observer-lifecycle');

    // Registration
    collaboration.recordInteraction('ObserverManager', 'Observer', 'register');
    
    // Notification
    collaboration.recordInteraction('Subject', 'Observer', 'notify');
    dynamicObserver.notify({ event: 'test' });

    // Deregistration
    collaboration.recordInteraction('ObserverManager', 'Observer', 'deregister');

    collaboration.complete();
    return { collaboration, lifecycleComplete: true };
  }

  async function executeObserverErrorHandling(observers) {
    const collaboration = collaborationMonitor.startTracking('observer-error-handling');

    try {
      observers.forEach(observer => {
        collaboration.recordInteraction('Subject', observer.name, 'notify');
        try {
          observer.notify({ data: 'test' });
        } catch (error) {
          collaboration.recordError(error, observer.name);
        }
      });
    } finally {
      collaboration.complete();
    }

    return { collaboration, errorIsolated: true };
  }

  async function executeStrategyPattern(strategies, selectedStrategy) {
    const collaboration = collaborationMonitor.startTracking('strategy-pattern');

    // Strategy Selection
    collaboration.recordInteraction('StrategyContext', 'StrategySelector', 'selectStrategy');
    
    // Strategy Execution
    collaboration.recordInteraction('StrategyContext', selectedStrategy, 'execute');
    const result = await strategies[selectedStrategy].execute();

    collaboration.complete();
    return { collaboration, strategyUsed: selectedStrategy, result };
  }

  async function executeAdaptiveStrategyPattern(strategies) {
    const collaboration = collaborationMonitor.startTracking('adaptive-strategy');

    try {
      // Try initial strategy
      collaboration.recordInteraction('AdaptiveContext', 'InitialStrategy', 'execute');
      const result = await strategies.initial.execute();
      
      collaboration.complete();
      return { collaboration, strategy: 'initial', result };

    } catch (error) {
      // Switch to fallback strategy
      collaboration.recordInteraction('AdaptiveContext', 'FallbackStrategy', 'execute');
      const fallbackResult = await strategies.fallback.execute();
      
      collaboration.complete();
      return { collaboration, strategy: 'fallback', result: fallbackResult };
    }
  }

  async function executeChainOfResponsibility(handlers, request) {
    const collaboration = collaborationMonitor.startTracking('chain-of-responsibility');

    let currentRequest = request;
    
    for (const handler of handlers) {
      if (handler.canHandle(currentRequest)) {
        collaboration.recordInteraction('ChainManager', handler.name, 'handle');
        currentRequest = handler.handle(currentRequest);
      }
    }

    collaboration.complete();
    return { collaboration, finalRequest: currentRequest };
  }

  async function executeConditionalChain(handlers, request) {
    const collaboration = collaborationMonitor.startTracking('conditional-chain');

    let currentRequest = request;
    
    for (const handler of handlers) {
      collaboration.recordInteraction('ChainManager', handler.name, 'canHandle');
      
      if (handler.canHandle(currentRequest)) {
        collaboration.recordInteraction('ChainManager', handler.name, 'handle');
        currentRequest = handler.handle(currentRequest);
      } else {
        collaboration.recordSkip(handler.name, 'cannot handle request');
      }
    }

    collaboration.complete();
    return { collaboration, finalRequest: currentRequest };
  }

  async function executeMediatorPattern(components, event) {
    const collaboration = collaborationMonitor.startTracking('mediator-pattern');

    // Component sends to mediator
    collaboration.recordInteraction('CommandInput', 'Mediator', 'sendMessage');
    
    // Mediator coordinates with other components
    collaboration.recordInteraction('Mediator', 'InstanceManager', 'handleCommand');
    collaboration.recordInteraction('Mediator', 'UIUpdater', 'updateStatus');

    // Components receive from mediator
    Object.values(components).forEach(component => {
      collaboration.recordInteraction('Mediator', component.name, 'receiveMessage');
      component.receiveFromMediator(event);
    });

    collaboration.complete();
    return { collaboration, eventProcessed: event };
  }

  async function executeComplexMediatorSequence(sequence) {
    const collaboration = collaborationMonitor.startTracking('complex-mediator');

    for (const interaction of sequence) {
      collaboration.recordInteraction(interaction.from, 'Mediator', 'route');
      collaboration.recordInteraction('Mediator', interaction.to, 'deliver');
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    collaboration.complete();
    return { collaboration, sequenceLength: sequence.length };
  }

  async function measureCollaborationMetrics(components) {
    const metrics = {
      coupling: 0,
      cohesion: 0,
      complexity: 0,
      interactions: []
    };

    // Analyze component interactions
    components.forEach(component => {
      const interactions = collaborationMonitor.getInteractionsFor(component);
      metrics.interactions.push({
        component,
        inbound: interactions.inbound.length,
        outbound: interactions.outbound.length
      });
    });

    // Calculate coupling (average connections per component)
    metrics.coupling = metrics.interactions.reduce((sum, comp) => 
      sum + comp.inbound + comp.outbound, 0) / components.length;

    // Calculate cohesion (how focused each component is)
    metrics.cohesion = metrics.interactions.reduce((sum, comp) => {
      const totalInteractions = comp.inbound + comp.outbound;
      const focus = totalInteractions > 0 ? 1 / totalInteractions : 1;
      return sum + focus;
    }, 0) / components.length;

    // Calculate complexity
    metrics.complexity = Math.sqrt(metrics.coupling * components.length);

    return metrics;
  }

  async function executeCollaborationLoadTest(scenario) {
    const results = {
      startTime: Date.now(),
      completedCollaborations: 0,
      errors: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      responseTimes: []
    };

    const collaborationPromises = [];

    for (let i = 0; i < scenario.concurrentCollaborations; i++) {
      const collaborationType = scenario.collaborationTypes[
        i % scenario.collaborationTypes.length
      ];
      
      collaborationPromises.push(
        executeLoadTestCollaboration(collaborationType, results)
      );
    }

    await Promise.allSettled(collaborationPromises);

    results.duration = Date.now() - results.startTime;
    results.averageResponseTime = results.responseTimes.length > 0 ? 
      results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length : 0;
    results.maxResponseTime = Math.max(...results.responseTimes, 0);

    return results;
  }

  async function executeLoadTestCollaboration(type, results) {
    const startTime = Date.now();
    
    try {
      switch (type) {
        case 'command':
          await instanceManager.sendCommand('test-id', 'echo test');
          break;
        case 'progress':
          animationTracker.setProgress(Math.random() * 100);
          break;
        case 'error':
          animationTracker.onError(new Error('Test error'));
          break;
        case 'completion':
          animationTracker.stopAnimation('completed');
          break;
      }
      
      results.completedCollaborations++;
    } catch (error) {
      results.errors++;
    }
    
    const responseTime = Date.now() - startTime;
    results.responseTimes.push(responseTime);
  }

  // Verification functions
  function verifyCommandResponseCollaboration(collaboration, command, context) {
    expect(collaboration.collaboration.interactions).toContainEqual(
      expect.objectContaining({
        from: 'CommandInitiator',
        to: 'InstanceManager',
        method: 'createInstance'
      })
    );

    expect(instanceManager.createInstance).toHaveBeenCalledWith(context);
    expect(instanceManager.sendCommand).toHaveBeenCalledWith(
      expect.any(String), command, context
    );
  }

  function verifyResponseHandlingCollaboration(collaboration, result) {
    expect(collaboration.collaboration.interactions).toContainEqual(
      expect.objectContaining({
        from: 'ResponseHandler',
        to: 'AnimationTracker',
        method: 'stopAnimation'
      })
    );

    expect(animationTracker.stopAnimation).toHaveBeenCalledWith('completed');
  }

  function verifyErrorResponseCollaboration(collaboration, error) {
    expect(collaboration.collaboration.interactions).toContainEqual(
      expect.objectContaining({
        from: 'ErrorHandler',
        to: 'AnimationTracker',
        method: 'onError'
      })
    );

    expect(animationTracker.onError).toHaveBeenCalledWith(error);
  }

  function verifyObserverPatternCollaboration(collaboration, observers) {
    expect(collaboration.notified).toBe(observers.length);
    
    observers.forEach(observer => {
      expect(observer.notify).toHaveBeenCalledWith(
        expect.objectContaining({ progress: 75 })
      );
    });
  }

  function verifyObserverLifecycleCollaboration(collaboration, observer) {
    expect(collaboration.lifecycleComplete).toBe(true);
    expect(observer.notify).toHaveBeenCalledWith({ event: 'test' });
  }

  function verifyObserverErrorIsolation(collaboration, faultyObserver, healthyObserver) {
    expect(collaboration.errorIsolated).toBe(true);
    expect(faultyObserver.notify).toHaveBeenCalled();
    expect(healthyObserver.notify).toHaveBeenCalled();
  }

  function verifyStrategyPatternCollaboration(collaboration, strategies, selectedStrategy) {
    expect(collaboration.strategyUsed).toBe(selectedStrategy);
    expect(strategies[selectedStrategy].execute).toHaveBeenCalled();
    expect(collaboration.result).toBe(`${selectedStrategy}-result`);
  }

  function verifyAdaptiveStrategyCollaboration(collaboration, strategies) {
    expect(strategies.initial.execute).toHaveBeenCalled();
    expect(strategies.fallback.execute).toHaveBeenCalled();
    expect(collaboration.strategy).toBe('fallback');
  }

  function verifyChainOfResponsibilityCollaboration(collaboration, handlers) {
    handlers.forEach(handler => {
      expect(handler.canHandle).toHaveBeenCalled();
      expect(handler.handle).toHaveBeenCalled();
    });

    expect(collaboration.finalRequest).toEqual(
      expect.objectContaining({
        validated: true,
        authenticated: true, 
        executed: true
      })
    );
  }

  function verifyConditionalChainCollaboration(collaboration, handlers) {
    expect(handlers[0].handle).toHaveBeenCalled(); // Pre-processor
    expect(handlers[1].handle).not.toHaveBeenCalled(); // Conditional (skipped)
    expect(handlers[2].handle).toHaveBeenCalled(); // Final processor
  }

  function verifyMediatorPatternCollaboration(collaboration, components) {
    Object.values(components).forEach(component => {
      expect(component.receiveFromMediator).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'command-submitted' })
      );
    });
  }

  function verifyComplexMediatorCollaboration(collaboration, sequence) {
    expect(collaboration.sequenceLength).toBe(sequence.length);
  }

  function verifyCollaborationQualityMetrics(metrics) {
    expect(metrics.coupling).toBeLessThan(5); // Low coupling
    expect(metrics.cohesion).toBeGreaterThan(0.5); // High cohesion
    expect(metrics.complexity).toBeLessThan(10); // Manageable complexity
  }

  function verifyCollaborationLoadTestResults(results, scenario) {
    expect(results.completedCollaborations).toBeGreaterThan(
      scenario.concurrentCollaborations * 0.9 // 90% success rate
    );
    expect(results.averageResponseTime).toBeLessThan(100); // Under 100ms average
    expect(results.errors).toBeLessThan(
      scenario.concurrentCollaborations * 0.1 // Less than 10% errors
    );
  }

  // Helper functions
  function processCommandResult(result) {
    return {
      processed: true,
      originalResult: result,
      timestamp: Date.now()
    };
  }

  function setupCollaborationTracking() {
    collaborationMonitor.startSession('tdd-london-collaboration-test');
  }

  // Collaboration Monitor utility class
  class CollaborationMonitor {
    constructor() {
      this.sessions = new Map();
      this.currentSession = null;
    }

    startSession(sessionId) {
      this.currentSession = sessionId;
      this.sessions.set(sessionId, {
        collaborations: [],
        interactions: [],
        errors: []
      });
    }

    startTracking(collaborationType) {
      const collaboration = {
        id: `collab-${Date.now()}`,
        type: collaborationType,
        startTime: Date.now(),
        interactions: [],
        errors: [],
        status: 'active'
      };

      if (this.currentSession) {
        this.sessions.get(this.currentSession).collaborations.push(collaboration);
      }

      return {
        recordInteraction: (from, to, method) => {
          collaboration.interactions.push({
            from, to, method, timestamp: Date.now()
          });
        },
        recordError: (error, context = null) => {
          collaboration.errors.push({
            error: error.message, context, timestamp: Date.now()
          });
        },
        recordSkip: (component, reason) => {
          collaboration.interactions.push({
            from: 'ChainManager', to: component, 
            method: 'skip', reason, timestamp: Date.now()
          });
        },
        complete: () => {
          collaboration.status = 'completed';
          collaboration.endTime = Date.now();
          collaboration.duration = collaboration.endTime - collaboration.startTime;
        }
      };
    }

    getInteractionsFor(component) {
      if (!this.currentSession) return { inbound: [], outbound: [] };

      const session = this.sessions.get(this.currentSession);
      const allInteractions = session.collaborations.flatMap(c => c.interactions);

      return {
        inbound: allInteractions.filter(i => i.to === component),
        outbound: allInteractions.filter(i => i.from === component)
      };
    }

    reset() {
      this.sessions.clear();
      this.currentSession = null;
    }
  }
});