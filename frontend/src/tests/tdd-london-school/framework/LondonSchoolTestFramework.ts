/**
 * TDD London School Framework
 * Mock-driven, behavior-focused testing infrastructure
 */

import { vi, type MockedFunction, type MockedObject, type MockInstance } from 'vitest';

// Core London School testing utilities
export interface MockContract<T = any> {
  readonly name: string;
  readonly interface: T;
  readonly methods: readonly string[];
  readonly expectations: readonly ExpectationRule[];
}

export interface ExpectationRule {
  method: string;
  args?: any[];
  returns?: any;
  throws?: Error;
  times?: number;
  calledWith?: any[];
  calledBefore?: string;
  calledAfter?: string;
}

export interface CollaboratorMap {
  [key: string]: MockedObject<any>;
}

export interface BehaviorSpec {
  given: string;
  when: string;
  then: string[];
  collaborators: string[];
}

export interface InteractionPattern {
  object: string;
  method: string;
  arguments: any[];
  returnValue?: any;
  sequence: number;
}

/**
 * London School Mock Factory
 * Creates and manages mock objects with behavior verification
 */
export class LondonMockFactory {
  private static instance: LondonMockFactory;
  private contracts: Map<string, MockContract> = new Map();
  private collaborators: Map<string, MockedObject<any>> = new Map();
  private interactions: InteractionPattern[] = [];

  public static getInstance(): LondonMockFactory {
    if (!this.instance) {
      this.instance = new LondonMockFactory();
    }
    return this.instance;
  }

  /**
   * Register a contract for a collaborator
   */
  public registerContract<T>(contract: MockContract<T>): MockContract<T> {
    this.contracts.set(contract.name, contract);
    return contract;
  }

  /**
   * Create mock for a registered contract
   */
  public createMock<T>(contractName: string, overrides?: Partial<T>): MockedObject<T> {
    const contract = this.contracts.get(contractName);
    if (!contract) {
      throw new Error(`Contract '${contractName}' not found. Register it first.`);
    }

    const mock = this.createCollaboratorMock<T>(contract, overrides);
    this.collaborators.set(contractName, mock);
    return mock;
  }

  /**
   * Create a mock object with method tracking
   */
  private createCollaboratorMock<T>(contract: MockContract<T>, overrides?: Partial<T>): MockedObject<T> {
    const mock = {} as MockedObject<T>;
    
    // Create mock methods based on contract
    contract.methods.forEach((methodName) => {
      const mockFn = vi.fn().mockImplementation((...args: any[]) => {
        // Track interaction
        this.recordInteraction({
          object: contract.name,
          method: methodName,
          arguments: args,
          sequence: this.interactions.length
        });
        
        // Return default or override value
        const override = overrides && (overrides as any)[methodName];
        return override || this.getDefaultReturn(methodName);
      });
      
      (mock as any)[methodName] = mockFn;
    });

    // Apply any override values
    if (overrides) {
      Object.assign(mock, overrides);
    }

    return mock;
  }

  /**
   * Record interaction for verification
   */
  private recordInteraction(interaction: InteractionPattern): void {
    this.interactions.push(interaction);
  }

  /**
   * Get default return value for method
   */
  private getDefaultReturn(methodName: string): any {
    // Convention-based defaults
    if (methodName.startsWith('is') || methodName.startsWith('has')) {
      return false;
    }
    if (methodName.startsWith('get') || methodName.startsWith('find')) {
      return null;
    }
    if (methodName.includes('async') || methodName.includes('Promise')) {
      return Promise.resolve(null);
    }
    return undefined;
  }

  /**
   * Verify interactions match expected pattern
   */
  public verifyInteractions(expectations: ExpectationRule[]): void {
    expectations.forEach((expectation) => {
      this.verifyExpectation(expectation);
    });
  }

  /**
   * Verify single expectation
   */
  private verifyExpectation(expectation: ExpectationRule): void {
    const matchingInteractions = this.interactions.filter(
      (interaction) => interaction.method === expectation.method
    );

    if (expectation.times !== undefined) {
      expect(matchingInteractions).toHaveLength(expectation.times);
    }

    if (expectation.calledWith) {
      const interaction = matchingInteractions.find((i) =>
        JSON.stringify(i.arguments) === JSON.stringify(expectation.calledWith)
      );
      expect(interaction).toBeDefined();
    }

    if (expectation.calledBefore) {
      const currentMethodCalls = this.interactions
        .filter((i) => i.method === expectation.method)
        .map((i) => i.sequence);
      const beforeMethodCalls = this.interactions
        .filter((i) => i.method === expectation.calledBefore)
        .map((i) => i.sequence);
      
      if (currentMethodCalls.length > 0 && beforeMethodCalls.length > 0) {
        expect(Math.min(...currentMethodCalls)).toBeLessThan(Math.min(...beforeMethodCalls));
      }
    }
  }

  /**
   * Reset all mocks and interactions
   */
  public reset(): void {
    this.collaborators.clear();
    this.interactions = [];
    vi.clearAllMocks();
  }

  /**
   * Get recorded interactions for debugging
   */
  public getInteractions(): readonly InteractionPattern[] {
    return [...this.interactions];
  }
}

/**
 * Behavior-driven test builder
 */
export class BehaviorTestBuilder {
  private spec: Partial<BehaviorSpec> = {};
  private mockFactory = LondonMockFactory.getInstance();

  public given(description: string): BehaviorTestBuilder {
    this.spec.given = description;
    return this;
  }

  public when(description: string): BehaviorTestBuilder {
    this.spec.when = description;
    return this;
  }

  public then(expectations: string[]): BehaviorTestBuilder {
    this.spec.then = expectations;
    return this;
  }

  public withCollaborators(collaborators: string[]): BehaviorTestBuilder {
    this.spec.collaborators = collaborators;
    return this;
  }

  public build(): BehaviorSpec {
    if (!this.spec.given || !this.spec.when || !this.spec.then) {
      throw new Error('Incomplete behavior spec: given, when, and then are required');
    }
    return this.spec as BehaviorSpec;
  }
}

/**
 * Contract definition utilities
 */
export class ContractBuilder<T> {
  private contract: Partial<MockContract<T>> = {};

  public named(name: string): ContractBuilder<T> {
    this.contract.name = name;
    return this;
  }

  public withInterface(interfaceRef: T): ContractBuilder<T> {
    this.contract.interface = interfaceRef;
    return this;
  }

  public withMethods(methods: string[]): ContractBuilder<T> {
    this.contract.methods = methods;
    return this;
  }

  public withExpectations(expectations: ExpectationRule[]): ContractBuilder<T> {
    this.contract.expectations = expectations;
    return this;
  }

  public build(): MockContract<T> {
    if (!this.contract.name || !this.contract.methods) {
      throw new Error('Contract must have name and methods');
    }
    return this.contract as MockContract<T>;
  }
}

/**
 * London School Test Suite base class
 */
export abstract class LondonSchoolTestSuite {
  protected mockFactory = LondonMockFactory.getInstance();
  protected collaborators: CollaboratorMap = {};

  protected beforeEach(): void {
    this.mockFactory.reset();
    this.collaborators = {};
    this.setupCollaborators();
  }

  protected afterEach(): void {
    this.verifyAllInteractions();
  }

  /**
   * Override to set up test-specific collaborators
   */
  protected abstract setupCollaborators(): void;

  /**
   * Override to define interaction expectations
   */
  protected abstract verifyAllInteractions(): void;

  /**
   * Create and register a collaborator mock
   */
  protected createCollaborator<T>(contractName: string, overrides?: Partial<T>): MockedObject<T> {
    const mock = this.mockFactory.createMock<T>(contractName, overrides);
    this.collaborators[contractName] = mock;
    return mock;
  }

  /**
   * Test behavior with Given-When-Then structure
   */
  protected testBehavior(spec: BehaviorSpec, testFn: () => void): void {
    describe(`Given ${spec.given}`, () => {
      describe(`When ${spec.when}`, () => {
        spec.then.forEach((expectation) => {
          it(`Then ${expectation}`, testFn);
        });
      });
    });
  }
}

/**
 * Utility functions for London School testing
 */
export const LondonTestUtils = {
  /**
   * Create a contract builder
   */
  contract: <T>() => new ContractBuilder<T>(),

  /**
   * Create a behavior builder
   */
  behavior: () => new BehaviorTestBuilder(),

  /**
   * Verify mock was called with specific arguments
   */
  verifyCalledWith: (mockFn: MockedFunction<any>, expectedArgs: any[]) => {
    expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
  },

  /**
   * Verify method call order
   */
  verifyCallOrder: (firstMock: MockedFunction<any>, secondMock: MockedFunction<any>) => {
    const firstCallTime = (firstMock as any).mock.invocationCallOrder?.[0] || 0;
    const secondCallTime = (secondMock as any).mock.invocationCallOrder?.[0] || 0;
    expect(firstCallTime).toBeLessThan(secondCallTime);
  },

  /**
   * Create a spy that tracks all calls
   */
  createInteractionSpy: () => {
    const calls: any[] = [];
    return {
      calls,
      spy: vi.fn((...args: any[]) => {
        calls.push(args);
      })
    };
  },

  /**
   * Mock promise that can be resolved/rejected manually
   */
  createControllablePromise: <T>() => {
    let resolve: (value: T) => void;
    let reject: (error: Error) => void;
    
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return {
      promise,
      resolve: resolve!,
      reject: reject!
    };
  }
};

// Export main factory instance
export const mockFactory = LondonMockFactory.getInstance();