/**
 * London School TDD: Swarm Coordinator for Test Orchestration
 * Manages test contracts and interactions between test agents
 */

import { vi } from 'vitest';

export interface SwarmContract {
  name: string;
  version: string;
  interactions: Array<{
    method: string;
    endpoint: string;
    expectedHeaders?: Record<string, string>;
    expectedBehaviors?: string[];
    successResponse?: any;
    errorResponse?: any;
  }>;
  collaborators: string[];
}

export interface SwarmInteraction {
  type: string;
  component?: string;
  endpoint?: string;
  method?: string;
  behavior?: string;
  success?: boolean;
  error?: string;
  response?: any;
  timestamp: string;
  [key: string]: any;
}

export interface SwarmPerformanceMetrics {
  operation: string;
  duration: number;
  callCount?: number;
  successRate?: number;
  [key: string]: any;
}

class SwarmCoordinator {
  private contracts: Map<string, SwarmContract> = new Map();
  private interactions: Map<string, SwarmInteraction[]> = new Map();
  private sessions: Set<string> = new Set();

  async initializeSession(sessionId: string): Promise<string> {
    this.sessions.add(sessionId);
    this.interactions.set(sessionId, []);
    console.log(`🔄 Swarm session initialized: ${sessionId}`);
    return sessionId;
  }

  async finalizeSession(sessionId: string): Promise<void> {
    const sessionInteractions = this.interactions.get(sessionId) || [];
    console.log(`✅ Swarm session finalized: ${sessionId} with ${sessionInteractions.length} interactions`);
    this.sessions.delete(sessionId);
    this.interactions.delete(sessionId);
  }

  async registerContract(contract: SwarmContract): Promise<void> {
    this.contracts.set(contract.name, contract);
    console.log(`📋 Contract registered: ${contract.name} v${contract.version}`);
  }

  async logInteraction(interaction: SwarmInteraction): Promise<void> {
    // Log to all active sessions
    this.sessions.forEach(sessionId => {
      const sessionInteractions = this.interactions.get(sessionId) || [];
      sessionInteractions.push(interaction);
      this.interactions.set(sessionId, sessionInteractions);
    });
    
    console.log(`📊 Interaction logged: ${interaction.type}`, interaction);
  }

  async logPerformanceMetrics(metrics: SwarmPerformanceMetrics): Promise<void> {
    console.log(`⚡ Performance metrics:`, metrics);
    
    await this.logInteraction({
      type: 'performance_metrics',
      ...metrics,
      timestamp: new Date().toISOString()
    });
  }

  async verifyContractCompliance(contract: SwarmContract, interaction: {
    method: string;
    endpoint: string;
    response?: any;
  }): Promise<boolean> {
    const matchingInteraction = contract.interactions.find(
      i => i.method === interaction.method && 
           this.matchesEndpoint(i.endpoint, interaction.endpoint)
    );

    if (!matchingInteraction) {
      throw new Error(`Contract violation: No matching interaction for ${interaction.method} ${interaction.endpoint}`);
    }

    if (interaction.response && matchingInteraction.successResponse) {
      this.verifyResponseStructure(matchingInteraction.successResponse, interaction.response);
    }

    await this.logInteraction({
      type: 'contract_verification',
      contract: contract.name,
      method: interaction.method,
      endpoint: interaction.endpoint,
      success: true,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  private matchesEndpoint(pattern: string, actual: string): boolean {
    // Simple pattern matching for endpoints with parameters
    const patternRegex = pattern.replace(/:[\w]+/g, '[^/]+');
    return new RegExp(`^${patternRegex}$`).test(actual);
  }

  private verifyResponseStructure(expected: any, actual: any): void {
    if (typeof expected === 'object' && expected !== null && typeof actual === 'object' && actual !== null) {
      for (const key in expected) {
        if (expected[key] && typeof expected[key] === 'object' && expected[key].asymmetricMatch) {
          // Handle Jest/Vitest matchers
          if (!expected[key].asymmetricMatch(actual[key])) {
            throw new Error(`Contract violation: Response structure mismatch for ${key}`);
          }
        } else if (expected[key] !== undefined && actual[key] === undefined) {
          throw new Error(`Contract violation: Missing required field ${key} in response`);
        }
      }
    }
  }

  getSessionInteractions(sessionId: string): SwarmInteraction[] {
    return this.interactions.get(sessionId) || [];
  }

  getContract(name: string): SwarmContract | undefined {
    return this.contracts.get(name);
  }

  getAllContracts(): SwarmContract[] {
    return Array.from(this.contracts.values());
  }
}

// Singleton instance for test coordination
export const swarmCoordinator = new SwarmCoordinator();