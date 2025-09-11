/**
 * Agent API Mock for London School TDD
 * Provides controlled mock behavior for agent API interactions
 */

import { swarmCoordinator } from '../helpers/swarm-coordinator';

interface MockAgentData {
  id: string;
  name: string;
  display_name: string;
  description: string;
  status: 'active' | 'inactive' | 'error' | 'testing';
  avatar_color: string;
  capabilities: string[];
  created_at: string;
  updated_at: string;
  performance_metrics: {
    success_rate: number;
    average_response_time: number;
    total_tokens_used: number;
    error_count: number;
  };
  health_status: {
    cpu_usage: number;
    memory_usage: number;
    response_time: number;
    last_heartbeat: string;
  };
}

class MockAgentApi {
  private agents: Map<string, MockAgentData> = new Map();
  private shouldFail = false;
  private delay = 0;
  private callHistory: Array<{ method: string; args: any[]; timestamp: number }> = [];

  constructor() {
    this.setupDefaultAgents();
  }

  // Mock control methods
  setShouldFail(fail: boolean, error?: any) {
    this.shouldFail = fail;
    this.failureError = error || new Error('Mock API failure');
  }

  setDelay(ms: number) {
    this.delay = ms;
  }

  private failureError: any;

  private recordCall(method: string, args: any[]) {
    this.callHistory.push({
      method,
      args,
      timestamp: Date.now()
    });

    swarmCoordinator.recordMockInteraction({
      mockName: 'AgentApi',
      method,
      args
    });
  }

  private async simulateDelay() {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
  }

  private throwIfShouldFail() {
    if (this.shouldFail) {
      throw this.failureError;
    }
  }

  // Agent API mock methods
  async getAgents(filters = {}): Promise<{ success: boolean; data: MockAgentData[] }> {
    this.recordCall('getAgents', [filters]);
    await this.simulateDelay();
    this.throwIfShouldFail();

    let agents = Array.from(this.agents.values());

    // Apply filters
    if (filters.status) {
      agents = agents.filter(agent => agent.status === filters.status);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      agents = agents.filter(agent => 
        agent.name.toLowerCase().includes(searchLower) ||
        agent.description.toLowerCase().includes(searchLower)
      );
    }

    return {
      success: true,
      data: agents
    };
  }

  async getAgent(id: string): Promise<{ success: boolean; data?: MockAgentData; error?: any }> {
    this.recordCall('getAgent', [id]);
    await this.simulateDelay();
    this.throwIfShouldFail();

    const agent = this.agents.get(id);
    if (!agent) {
      return {
        success: false,
        error: { message: 'Agent not found', code: 'AGENT_NOT_FOUND' }
      };
    }

    return {
      success: true,
      data: agent
    };
  }

  async createAgent(agentData: Partial<MockAgentData>): Promise<{ success: boolean; data?: MockAgentData; error?: any }> {
    this.recordCall('createAgent', [agentData]);
    await this.simulateDelay();
    this.throwIfShouldFail();

    // Check for duplicate names
    const existingAgent = Array.from(this.agents.values())
      .find(agent => agent.name === agentData.name);
    
    if (existingAgent) {
      return {
        success: false,
        error: { message: 'Agent name already exists', code: 'DUPLICATE_AGENT_NAME' }
      };
    }

    const newAgent: MockAgentData = {
      id: `agent-${Date.now()}`,
      name: agentData.name || '',
      display_name: agentData.display_name || '',
      description: agentData.description || '',
      status: agentData.status || 'active',
      avatar_color: agentData.avatar_color || '#3B82F6',
      capabilities: agentData.capabilities || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      performance_metrics: {
        success_rate: 0,
        average_response_time: 0,
        total_tokens_used: 0,
        error_count: 0
      },
      health_status: {
        cpu_usage: 20,
        memory_usage: 30,
        response_time: 500,
        last_heartbeat: new Date().toISOString()
      }
    };

    this.agents.set(newAgent.id, newAgent);

    return {
      success: true,
      data: newAgent
    };
  }

  async updateAgent(id: string, updates: Partial<MockAgentData>): Promise<{ success: boolean; data?: MockAgentData; error?: any }> {
    this.recordCall('updateAgent', [id, updates]);
    await this.simulateDelay();
    this.throwIfShouldFail();

    const agent = this.agents.get(id);
    if (!agent) {
      return {
        success: false,
        error: { message: 'Agent not found', code: 'AGENT_NOT_FOUND' }
      };
    }

    // Check for duplicate names if name is being updated
    if (updates.name && updates.name !== agent.name) {
      const existingAgent = Array.from(this.agents.values())
        .find(a => a.id !== id && a.name === updates.name);
      
      if (existingAgent) {
        return {
          success: false,
          error: { message: 'Agent name already exists', code: 'DUPLICATE_AGENT_NAME' }
        };
      }
    }

    const updatedAgent = {
      ...agent,
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.agents.set(id, updatedAgent);

    return {
      success: true,
      data: updatedAgent
    };
  }

  async deleteAgent(id: string): Promise<{ success: boolean; error?: any }> {
    this.recordCall('deleteAgent', [id]);
    await this.simulateDelay();
    this.throwIfShouldFail();

    if (!this.agents.has(id)) {
      return {
        success: false,
        error: { message: 'Agent not found', code: 'AGENT_NOT_FOUND' }
      };
    }

    this.agents.delete(id);

    return {
      success: true
    };
  }

  async testAgent(id: string, prompt: string): Promise<{ success: boolean; data?: any; error?: any }> {
    this.recordCall('testAgent', [id, prompt]);
    await this.simulateDelay();
    this.throwIfShouldFail();

    const agent = this.agents.get(id);
    if (!agent) {
      return {
        success: false,
        error: { message: 'Agent not found', code: 'AGENT_NOT_FOUND' }
      };
    }

    // Update agent status to testing
    agent.status = 'testing';
    this.agents.set(id, agent);

    // Simulate test processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update back to active
    agent.status = 'active';
    agent.updated_at = new Date().toISOString();
    this.agents.set(id, agent);

    return {
      success: true,
      data: {
        test_id: `test-${Date.now()}`,
        agent_id: id,
        prompt,
        response: `Test response from ${agent.display_name}: I received "${prompt}" and I'm ready to help!`,
        metadata: {
          response_time: 1200,
          tokens_used: 85,
          confidence: 0.92,
          model_version: '1.0.0'
        },
        timestamp: new Date().toISOString()
      }
    };
  }

  async bulkOperation(agentIds: string[], action: 'activate' | 'deactivate' | 'delete'): Promise<{ success: boolean; affected_count?: number; error?: any }> {
    this.recordCall('bulkOperation', [agentIds, action]);
    await this.simulateDelay();
    this.throwIfShouldFail();

    let affectedCount = 0;

    for (const id of agentIds) {
      const agent = this.agents.get(id);
      if (agent) {
        switch (action) {
          case 'activate':
            agent.status = 'active';
            agent.updated_at = new Date().toISOString();
            this.agents.set(id, agent);
            affectedCount++;
            break;
          case 'deactivate':
            agent.status = 'inactive';
            agent.updated_at = new Date().toISOString();
            this.agents.set(id, agent);
            affectedCount++;
            break;
          case 'delete':
            this.agents.delete(id);
            affectedCount++;
            break;
        }
      }
    }

    return {
      success: true,
      affected_count: affectedCount
    };
  }

  // Utility methods for testing
  getCallHistory() {
    return [...this.callHistory];
  }

  clearCallHistory() {
    this.callHistory = [];
  }

  reset() {
    this.agents.clear();
    this.setupDefaultAgents();
    this.callHistory = [];
    this.shouldFail = false;
    this.delay = 0;
  }

  addMockAgent(agent: Partial<MockAgentData>) {
    const mockAgent: MockAgentData = {
      id: agent.id || `mock-${Date.now()}`,
      name: agent.name || 'Mock Agent',
      display_name: agent.display_name || 'Mock Agent',
      description: agent.description || 'A mock agent for testing',
      status: agent.status || 'active',
      avatar_color: agent.avatar_color || '#3B82F6',
      capabilities: agent.capabilities || ['testing'],
      created_at: agent.created_at || new Date().toISOString(),
      updated_at: agent.updated_at || new Date().toISOString(),
      performance_metrics: agent.performance_metrics || {
        success_rate: 0.95,
        average_response_time: 1200,
        total_tokens_used: 5000,
        error_count: 2
      },
      health_status: agent.health_status || {
        cpu_usage: 25,
        memory_usage: 40,
        response_time: 800,
        last_heartbeat: new Date().toISOString()
      }
    };

    this.agents.set(mockAgent.id, mockAgent);
    return mockAgent;
  }

  private setupDefaultAgents() {
    // Add some default mock agents
    this.addMockAgent({
      id: 'test-agent-1',
      name: 'researcher-agent',
      display_name: 'Research Agent',
      description: 'Specialized in research and data analysis',
      capabilities: ['research', 'analysis', 'data-mining'],
      avatar_color: '#3B82F6'
    });

    this.addMockAgent({
      id: 'test-agent-2',
      name: 'content-creator-agent',
      display_name: 'Content Creator',
      description: 'Creates engaging content and marketing materials',
      capabilities: ['writing', 'content-creation', 'marketing'],
      avatar_color: '#8B5CF6'
    });

    this.addMockAgent({
      id: 'test-agent-3',
      name: 'customer-support-agent',
      display_name: 'Customer Support',
      description: 'Handles customer inquiries and support tasks',
      capabilities: ['customer-service', 'troubleshooting', 'communication'],
      avatar_color: '#F59E0B',
      status: 'inactive'
    });
  }
}

// Export singleton mock instance
export const mockAgentApi = new MockAgentApi();
export type { MockAgentData };