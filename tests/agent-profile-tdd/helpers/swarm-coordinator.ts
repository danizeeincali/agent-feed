/**
 * Swarm Test Coordination for London School TDD
 * Manages test execution across multiple testing agents
 */

interface TestResult {
  testName: string;
  duration: number;
  passed: boolean;
  mockInteractions: MockInteraction[];
  contractViolations: string[];
}

interface MockInteraction {
  mockName: string;
  method: string;
  args: any[];
  timestamp: number;
  callOrder: number;
}

interface SwarmContract {
  componentName: string;
  dependencies: string[];
  interactions: ContractRule[];
}

interface ContractRule {
  dependency: string;
  method: string;
  expectedArgs?: any[];
  expectedCallCount?: number;
  callOrder?: number;
}

class SwarmTestCoordinator {
  private currentSession: string | null = null;
  private testResults: TestResult[] = [];
  private contracts: Map<string, SwarmContract> = new Map();
  private mockInteractions: MockInteraction[] = [];
  private callCounter = 0;

  initializeTestSession(sessionId?: string): void {
    this.currentSession = sessionId || `session-${Date.now()}`;
    this.testResults = [];
    this.mockInteractions = [];
    this.callCounter = 0;
    
    console.log(`🏁 Swarm test session initialized: ${this.currentSession}`);
  }

  registerContract(contract: SwarmContract): void {
    this.contracts.set(contract.componentName, contract);
    console.log(`📋 Contract registered for ${contract.componentName}`);
  }

  recordMockInteraction(interaction: Omit<MockInteraction, 'callOrder' | 'timestamp'>): void {
    const fullInteraction: MockInteraction = {
      ...interaction,
      callOrder: ++this.callCounter,
      timestamp: Date.now()
    };
    
    this.mockInteractions.push(fullInteraction);
  }

  verifyContract(componentName: string): string[] {
    const contract = this.contracts.get(componentName);
    if (!contract) {
      return [`No contract found for ${componentName}`];
    }

    const violations: string[] = [];
    
    // Verify all dependencies were interacted with
    contract.dependencies.forEach(dep => {
      const interactions = this.mockInteractions.filter(i => i.mockName === dep);
      if (interactions.length === 0) {
        violations.push(`Missing interactions with dependency: ${dep}`);
      }
    });

    // Verify specific interaction rules
    contract.interactions.forEach(rule => {
      const interactions = this.mockInteractions.filter(
        i => i.mockName === rule.dependency && i.method === rule.method
      );
      
      if (rule.expectedCallCount !== undefined && interactions.length !== rule.expectedCallCount) {
        violations.push(
          `Expected ${rule.expectedCallCount} calls to ${rule.dependency}.${rule.method}, got ${interactions.length}`
        );
      }
      
      if (rule.callOrder !== undefined) {
        const interaction = interactions[0];
        if (!interaction || interaction.callOrder !== rule.callOrder) {
          violations.push(
            `${rule.dependency}.${rule.method} called in wrong order. Expected: ${rule.callOrder}, Actual: ${interaction?.callOrder}`
          );
        }
      }
    });

    return violations;
  }

  reportTestCompletion(testResult?: Partial<TestResult>): void {
    if (testResult) {
      const result: TestResult = {
        testName: testResult.testName || 'Unknown Test',
        duration: testResult.duration || 0,
        passed: testResult.passed || false,
        mockInteractions: [...this.mockInteractions],
        contractViolations: testResult.contractViolations || []
      };
      
      this.testResults.push(result);
    }
    
    // Clear interactions for next test
    this.mockInteractions = [];
    this.callCounter = 0;
  }

  shareResultsWithSwarm(): void {
    const summary = {
      sessionId: this.currentSession,
      totalTests: this.testResults.length,
      passedTests: this.testResults.filter(r => r.passed).length,
      failedTests: this.testResults.filter(r => !r.passed).length,
      averageDuration: this.testResults.reduce((sum, r) => sum + r.duration, 0) / this.testResults.length,
      contractViolations: this.testResults.flatMap(r => r.contractViolations),
      mockUsageStats: this.generateMockUsageStats()
    };
    
    console.log('📊 Swarm Test Results:', summary);
    
    // In a real implementation, this would send results to other swarm agents
    this.notifySwarmAgents(summary);
  }

  private generateMockUsageStats() {
    const stats = new Map<string, { callCount: number, methods: Set<string> }>();
    
    this.testResults.forEach(result => {
      result.mockInteractions.forEach(interaction => {
        if (!stats.has(interaction.mockName)) {
          stats.set(interaction.mockName, {
            callCount: 0,
            methods: new Set()
          });
        }
        
        const mockStats = stats.get(interaction.mockName)!;
        mockStats.callCount++;
        mockStats.methods.add(interaction.method);
      });
    });
    
    return Object.fromEntries(
      Array.from(stats.entries()).map(([name, data]) => [
        name,
        {
          callCount: data.callCount,
          methods: Array.from(data.methods)
        }
      ])
    );
  }

  private notifySwarmAgents(summary: any): void {
    // Mock swarm notification - in real implementation would use WebSockets or message queue
    console.log('🔄 Notifying swarm agents of test completion');
    
    // Simulate sending to integration test agents
    this.notifyIntegrationAgents(summary);
    
    // Simulate sending to architecture agents
    this.notifyArchitectureAgents(summary);
  }

  private notifyIntegrationAgents(summary: any): void {
    console.log('🔗 Notifying integration agents:', {
      mockContracts: Array.from(this.contracts.keys()),
      interactionPatterns: summary.mockUsageStats
    });
  }

  private notifyArchitectureAgents(summary: any): void {
    console.log('🏗️ Notifying architecture agents:', {
      componentInteractions: summary.contractViolations,
      designInsights: this.extractDesignInsights()
    });
  }

  private extractDesignInsights(): any {
    return {
      highlyMockedComponents: this.findHighlyMockedComponents(),
      commonInteractionPatterns: this.findCommonPatterns(),
      potentialRefactorings: this.suggestRefactorings()
    };
  }

  private findHighlyMockedComponents(): string[] {
    const mockCounts = new Map<string, number>();
    
    this.testResults.forEach(result => {
      result.mockInteractions.forEach(interaction => {
        mockCounts.set(interaction.mockName, (mockCounts.get(interaction.mockName) || 0) + 1);
      });
    });
    
    return Array.from(mockCounts.entries())
      .filter(([_, count]) => count > 10)
      .map(([name]) => name);
  }

  private findCommonPatterns(): string[] {
    // Analyze interaction sequences to find common patterns
    const patterns = [];
    
    this.testResults.forEach(result => {
      const sequence = result.mockInteractions
        .sort((a, b) => a.callOrder - b.callOrder)
        .map(i => `${i.mockName}.${i.method}`)
        .join(' -> ');
        
      if (sequence.length > 0) {
        patterns.push(sequence);
      }
    });
    
    return [...new Set(patterns)];
  }

  private suggestRefactorings(): string[] {
    const suggestions = [];
    
    // Look for too many dependencies (suggests need for facade)
    this.contracts.forEach((contract, componentName) => {
      if (contract.dependencies.length > 5) {
        suggestions.push(`Consider facade pattern for ${componentName} (${contract.dependencies.length} dependencies)`);
      }
    });
    
    return suggestions;
  }

  // Utility methods for test coordination
  createMockContract<T>(name: string, mockImplementation?: Partial<T>): jest.Mocked<T> {
    const mock = jest.fn() as any;
    
    if (mockImplementation) {
      Object.keys(mockImplementation).forEach(key => {
        mock[key] = jest.fn().mockImplementation(mockImplementation[key]);
      });
    }
    
    // Track mock interactions
    const originalMock = mock;
    const coordinator = this;
    
    return new Proxy(mock, {
      get(target, prop) {
        if (typeof target[prop] === 'function') {
          return function(...args: any[]) {
            coordinator.recordMockInteraction({
              mockName: name,
              method: prop.toString(),
              args
            });
            return target[prop](...args);
          };
        }
        return target[prop];
      }
    });
  }

  expectInteractionOrder(interactions: Array<{ mock: string, method: string }>) {
    const actualOrder = this.mockInteractions
      .sort((a, b) => a.callOrder - b.callOrder)
      .map(i => ({ mock: i.mockName, method: i.method }));
    
    interactions.forEach((expected, index) => {
      const actual = actualOrder[index];
      if (!actual || actual.mock !== expected.mock || actual.method !== expected.method) {
        throw new Error(
          `Expected interaction ${expected.mock}.${expected.method} at position ${index}, ` +
          `but got ${actual?.mock}.${actual?.method}`
        );
      }
    });
  }
}

// Export singleton instance
export const swarmCoordinator = new SwarmTestCoordinator();
export type { SwarmContract, ContractRule, TestResult, MockInteraction };