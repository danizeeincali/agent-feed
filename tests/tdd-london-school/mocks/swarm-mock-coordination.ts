/**
 * London School TDD: Swarm Mock Coordination System
 * 
 * This module provides advanced mock coordination capabilities for swarm-based
 * testing. Enables sophisticated interaction tracking and behavior verification
 * across multiple collaborating objects.
 * 
 * Focus: Mock coordination and swarm testing patterns
 */

interface MockInteraction {
  mockName: string;
  methodName: string;
  args: any[];
  timestamp: number;
  returnValue?: any;
  callOrder: number;
}

interface SwarmMockContract {
  [methodName: string]: {
    signature: string;
    expectations?: {
      callCount?: number;
      args?: any[][];
      returnValues?: any[];
      sideEffects?: (() => void)[];
    };
  };
}

interface SwarmMockConfig {
  name: string;
  contract: SwarmMockContract;
  collaborators?: string[];
  behaviors?: Record<string, (...args: any[]) => any>;
  state?: Record<string, any>;
}

class SwarmMockRegistry {
  private static instance: SwarmMockRegistry;
  private mocks: Map<string, SwarmMockInstance> = new Map();
  private interactions: MockInteraction[] = [];
  private callOrderCounter = 0;

  static getInstance(): SwarmMockRegistry {
    if (!SwarmMockRegistry.instance) {
      SwarmMockRegistry.instance = new SwarmMockRegistry();
    }
    return SwarmMockRegistry.instance;
  }

  registerMock(name: string, mock: SwarmMockInstance): void {
    this.mocks.set(name, mock);
  }

  getMock(name: string): SwarmMockInstance | undefined {
    return this.mocks.get(name);
  }

  recordInteraction(interaction: MockInteraction): void {
    interaction.callOrder = ++this.callOrderCounter;
    this.interactions.push(interaction);
  }

  getInteractions(): MockInteraction[] {
    return [...this.interactions];
  }

  getInteractionsByMock(mockName: string): MockInteraction[] {
    return this.interactions.filter(i => i.mockName === mockName);
  }

  clearInteractions(): void {
    this.interactions = [];
    this.callOrderCounter = 0;
  }

  clearAll(): void {
    this.mocks.clear();
    this.clearInteractions();
  }

  // Verify interaction patterns
  verifyCallSequence(expectedSequence: Array<{ mock: string; method: string }>): boolean {
    const actualSequence = this.interactions
      .sort((a, b) => a.callOrder - b.callOrder)
      .map(i => ({ mock: i.mockName, method: i.methodName }));

    if (actualSequence.length < expectedSequence.length) {
      return false;
    }

    for (let i = 0; i < expectedSequence.length; i++) {
      const expected = expectedSequence[i];
      const actual = actualSequence[i];
      
      if (actual.mock !== expected.mock || actual.method !== expected.method) {
        return false;
      }
    }

    return true;
  }

  // Verify collaboration patterns
  verifyCollaboration(mockName: string, expectedCollaborators: string[]): boolean {
    const mockInteractions = this.getInteractionsByMock(mockName);
    const actualCollaborators = new Set<string>();

    // Find calls made by this mock to other mocks
    mockInteractions.forEach(interaction => {
      // Check if any other mock was called during this interaction's execution
      const contextualCalls = this.interactions.filter(i => 
        i.timestamp >= interaction.timestamp && 
        i.timestamp <= interaction.timestamp + 100 && // 100ms window
        i.mockName !== mockName
      );
      
      contextualCalls.forEach(call => {
        actualCollaborators.add(call.mockName);
      });
    });

    return expectedCollaborators.every(expected => actualCollaborators.has(expected));
  }

  // Generate collaboration report
  generateCollaborationReport(): Record<string, string[]> {
    const report: Record<string, string[]> = {};

    this.mocks.forEach((mock, mockName) => {
      const collaborators = new Set<string>();
      const mockInteractions = this.getInteractionsByMock(mockName);

      mockInteractions.forEach(interaction => {
        const contextualCalls = this.interactions.filter(i =>
          Math.abs(i.timestamp - interaction.timestamp) <= 50 && // 50ms window
          i.mockName !== mockName
        );

        contextualCalls.forEach(call => {
          collaborators.add(call.mockName);
        });
      });

      report[mockName] = Array.from(collaborators);
    });

    return report;
  }
}

class SwarmMockInstance {
  private name: string;
  private contract: SwarmMockContract;
  private collaborators: string[];
  private state: Record<string, any>;
  private mockMethods: Record<string, jest.MockedFunction<any>>;
  private registry: SwarmMockRegistry;

  constructor(config: SwarmMockConfig) {
    this.name = config.name;
    this.contract = config.contract;
    this.collaborators = config.collaborators || [];
    this.state = config.state || {};
    this.mockMethods = {};
    this.registry = SwarmMockRegistry.getInstance();

    this.setupMethods(config.behaviors);
    this.registry.registerMock(this.name, this);
  }

  private setupMethods(behaviors: Record<string, (...args: any[]) => any> = {}): void {
    Object.keys(this.contract).forEach(methodName => {
      const contractMethod = this.contract[methodName];
      
      // Create jest mock
      this.mockMethods[methodName] = jest.fn();

      // Setup default behavior if provided
      if (behaviors[methodName]) {
        this.mockMethods[methodName].mockImplementation(behaviors[methodName]);
      }

      // Wrap with interaction tracking
      const originalImpl = this.mockMethods[methodName];
      this.mockMethods[methodName] = jest.fn().mockImplementation((...args: any[]) => {
        const interaction: MockInteraction = {
          mockName: this.name,
          methodName,
          args,
          timestamp: Date.now(),
          callOrder: 0 // Will be set by registry
        };

        let result;
        try {
          result = originalImpl(...args);
          interaction.returnValue = result;
        } catch (error) {
          interaction.returnValue = error;
          throw error;
        } finally {
          this.registry.recordInteraction(interaction);
        }

        return result;
      });

      // Add method to instance
      (this as any)[methodName] = this.mockMethods[methodName];
    });
  }

  // Get method mock for advanced assertions
  getMethod(methodName: string): jest.MockedFunction<any> {
    return this.mockMethods[methodName];
  }

  // Set up method behavior
  setMethodBehavior(methodName: string, implementation: (...args: any[]) => any): void {
    if (this.mockMethods[methodName]) {
      this.mockMethods[methodName].mockImplementation(implementation);
    }
  }

  // Set up method return value
  setMethodReturnValue(methodName: string, returnValue: any): void {
    if (this.mockMethods[methodName]) {
      this.mockMethods[methodName].mockReturnValue(returnValue);
    }
  }

  // Update mock state
  updateState(newState: Record<string, any>): void {
    this.state = { ...this.state, ...newState };
  }

  // Get current state
  getState(): Record<string, any> {
    return { ...this.state };
  }

  // Reset all mocks
  resetAllMocks(): void {
    Object.values(this.mockMethods).forEach(mock => mock.mockReset());
  }

  // Get interaction history for this mock
  getInteractionHistory(): MockInteraction[] {
    return this.registry.getInteractionsByMock(this.name);
  }

  // Verify this mock was called before another mock
  wasCalledBefore(otherMockName: string, methodName?: string): boolean {
    const thisInteractions = this.getInteractionHistory();
    const otherInteractions = this.registry.getInteractionsByMock(otherMockName);

    const thisLastCall = methodName 
      ? thisInteractions.filter(i => i.methodName === methodName).pop()
      : thisInteractions.pop();
    
    const otherFirstCall = otherInteractions[0];

    return thisLastCall && otherFirstCall 
      ? thisLastCall.callOrder < otherFirstCall.callOrder
      : false;
  }

  // Verify this mock collaborated with another mock
  collaboratedWith(otherMockName: string): boolean {
    const thisInteractions = this.getInteractionHistory();
    const otherInteractions = this.registry.getInteractionsByMock(otherMockName);

    // Check if there are overlapping time windows
    return thisInteractions.some(thisCall => 
      otherInteractions.some(otherCall => 
        Math.abs(thisCall.timestamp - otherCall.timestamp) <= 100
      )
    );
  }
}

// Enhanced global mock factory
export function createAdvancedSwarmMock(config: SwarmMockConfig): SwarmMockInstance {
  return new SwarmMockInstance(config);
}

// Mock coordination utilities
export class SwarmMockCoordinator {
  private registry: SwarmMockRegistry;

  constructor() {
    this.registry = SwarmMockRegistry.getInstance();
  }

  // Create multiple coordinated mocks
  createMockSwarm(configs: SwarmMockConfig[]): Record<string, SwarmMockInstance> {
    const swarm: Record<string, SwarmMockInstance> = {};

    configs.forEach(config => {
      swarm[config.name] = new SwarmMockInstance(config);
    });

    return swarm;
  }

  // Verify mock coordination patterns
  verifyCoordinationPattern(pattern: {
    initiator: string;
    sequence: Array<{ mock: string; method: string }>;
    collaborationTimeWindow?: number;
  }): boolean {
    const interactions = this.registry.getInteractions();
    const initiatorCalls = interactions.filter(i => i.mockName === pattern.initiator);

    if (initiatorCalls.length === 0) return false;

    const firstInitiatorCall = initiatorCalls[0];
    const timeWindow = pattern.collaborationTimeWindow || 1000;

    // Find all interactions within the time window
    const windowInteractions = interactions.filter(i => 
      i.timestamp >= firstInitiatorCall.timestamp && 
      i.timestamp <= firstInitiatorCall.timestamp + timeWindow
    );

    // Verify the sequence occurs within the window
    return pattern.sequence.every((step, index) => {
      const matchingInteraction = windowInteractions.find(i => 
        i.mockName === step.mock && i.methodName === step.method
      );
      
      if (!matchingInteraction) return false;
      
      // If not the first step, verify it happens after the previous step
      if (index > 0) {
        const previousStep = pattern.sequence[index - 1];
        const previousInteraction = windowInteractions.find(i =>
          i.mockName === previousStep.mock && i.methodName === previousStep.method
        );
        
        return previousInteraction && 
               matchingInteraction.callOrder > previousInteraction.callOrder;
      }
      
      return true;
    });
  }

  // Generate comprehensive test report
  generateTestReport(): {
    totalMocks: number;
    totalInteractions: number;
    collaborationGraph: Record<string, string[]>;
    interactionTimeline: MockInteraction[];
    patternAnalysis: {
      mostActiveMock: string;
      avgInteractionsPerMock: number;
      collaborationDensity: number;
    };
  } {
    const interactions = this.registry.getInteractions();
    const collaborationGraph = this.registry.generateCollaborationReport();
    
    // Calculate statistics
    const mockNames = Array.from(this.registry['mocks'].keys());
    const interactionCounts = mockNames.map(name => 
      interactions.filter(i => i.mockName === name).length
    );
    
    const mostActiveMock = mockNames[interactionCounts.indexOf(Math.max(...interactionCounts))];
    const avgInteractions = interactionCounts.reduce((a, b) => a + b, 0) / mockNames.length;
    
    const totalConnections = Object.values(collaborationGraph)
      .reduce((sum, collaborators) => sum + collaborators.length, 0);
    const maxPossibleConnections = mockNames.length * (mockNames.length - 1);
    const collaborationDensity = totalConnections / maxPossibleConnections;

    return {
      totalMocks: mockNames.length,
      totalInteractions: interactions.length,
      collaborationGraph,
      interactionTimeline: interactions.sort((a, b) => a.callOrder - b.callOrder),
      patternAnalysis: {
        mostActiveMock,
        avgInteractionsPerMock: avgInteractions,
        collaborationDensity
      }
    };
  }

  // Clean up all mocks
  cleanup(): void {
    this.registry.clearAll();
  }
}

// Export singleton instance
export const swarmMockCoordinator = new SwarmMockCoordinator();

// Enhanced global setup for swarm mocks
declare global {
  var createAdvancedSwarmMock: typeof createAdvancedSwarmMock;
  var swarmMockCoordinator: SwarmMockCoordinator;
  var verifySwarmCollaboration: (mockName: string, collaborators: string[]) => boolean;
  var verifySwarmSequence: (sequence: Array<{ mock: string; method: string }>) => boolean;
}

global.createAdvancedSwarmMock = createAdvancedSwarmMock;
global.swarmMockCoordinator = swarmMockCoordinator;

global.verifySwarmCollaboration = (mockName: string, collaborators: string[]) => {
  return SwarmMockRegistry.getInstance().verifyCollaboration(mockName, collaborators);
};

global.verifySwarmSequence = (sequence: Array<{ mock: string; method: string }>) => {
  return SwarmMockRegistry.getInstance().verifyCallSequence(sequence);
};