/**
 * TDD London School - API Mock Contracts
 * 
 * Focus on collaboration contracts and interaction verification
 * Mock API responses to isolate useState behavior testing
 */

import { vi, type MockedFunction } from 'vitest';
import type { AgentPage } from '../../../src/components/AgentDynamicPage';

// API interaction tracking
interface ApiCallTracker {
  endpoint: string;
  method: string;
  payload?: any;
  timestamp: number;
  stackTrace: string;
  responsePromise?: Promise<any>;
  responseValue?: any;
  responseError?: Error;
}

// API mock state
class ApiMockState {
  private calls: ApiCallTracker[] = [];
  private responseDelays: Map<string, number> = new Map();
  private errorConditions: Map<string, Error> = new Map();
  
  trackCall(call: ApiCallTracker): void {
    this.calls.push(call);
    console.log('🔍 TDD API MOCK: API call tracked', {
      endpoint: call.endpoint,
      method: call.method,
      timestamp: call.timestamp
    });
  }
  
  getCalls(): ApiCallTracker[] {
    return [...this.calls];
  }
  
  getCallsForEndpoint(endpoint: string): ApiCallTracker[] {
    return this.calls.filter(call => call.endpoint.includes(endpoint));
  }
  
  clearCalls(): void {
    this.calls = [];
  }
  
  setResponseDelay(endpoint: string, delay: number): void {
    this.responseDelays.set(endpoint, delay);
  }
  
  setErrorCondition(endpoint: string, error: Error): void {
    this.errorConditions.set(endpoint, error);
  }
  
  clearErrorCondition(endpoint: string): void {
    this.errorConditions.delete(endpoint);
  }
  
  getResponseDelay(endpoint: string): number {
    return this.responseDelays.get(endpoint) || 0;
  }
  
  getErrorCondition(endpoint: string): Error | undefined {
    return this.errorConditions.get(endpoint);
  }
}

// Global API mock state
const apiMockState = new ApiMockState();

// Mock API responses for AgentDynamicPage
export const createMockAgentPagesApi = () => {
  const mockGetAgentPages = vi.fn(async (agentId: string) => {
    const stackTrace = new Error().stack?.split('\n').slice(2, 6).join('\n') || 'No stack trace';
    const endpoint = `/api/agents/${agentId}/pages`;
    
    // Track the API call
    const call: ApiCallTracker = {
      endpoint,
      method: 'GET',
      timestamp: Date.now(),
      stackTrace
    };
    
    apiMockState.trackCall(call);
    
    // Check for error conditions
    const error = apiMockState.getErrorCondition(endpoint);
    if (error) {
      call.responseError = error;
      throw error;
    }
    
    // Simulate response delay
    const delay = apiMockState.getResponseDelay(endpoint);
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Generate mock response based on agentId
    const mockPages: AgentPage[] = generateMockPages(agentId);
    
    const response = {
      success: true,
      data: mockPages
    };
    
    call.responseValue = response;
    console.log('🔍 TDD API MOCK: getAgentPages response', {
      agentId,
      pagesCount: mockPages.length,
      success: true
    });
    
    return response;
  });
  
  const mockSaveAgentPage = vi.fn(async (page: Partial<AgentPage>) => {
    const stackTrace = new Error().stack?.split('\n').slice(2, 6).join('\n') || 'No stack trace';
    const endpoint = `/api/agents/${page.agentId}/pages`;
    
    const call: ApiCallTracker = {
      endpoint,
      method: 'POST',
      payload: page,
      timestamp: Date.now(),
      stackTrace
    };
    
    apiMockState.trackCall(call);
    
    // Check for error conditions
    const error = apiMockState.getErrorCondition(endpoint);
    if (error) {
      call.responseError = error;
      throw error;
    }
    
    // Generate mock saved page
    const savedPage: AgentPage = {
      id: `page-${Date.now()}`,
      title: page.title || 'Untitled Page',
      content: page.content || { type: 'text', value: '' },
      agentId: page.agentId || 'test-agent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'published',
      tags: page.tags || []
    };
    
    const response = {
      success: true,
      data: savedPage
    };
    
    call.responseValue = response;
    return response;
  });
  
  const mockDeleteAgentPage = vi.fn(async (agentId: string, pageId: string) => {
    const stackTrace = new Error().stack?.split('\n').slice(2, 6).join('\n') || 'No stack trace';
    const endpoint = `/api/agents/${agentId}/pages/${pageId}`;
    
    const call: ApiCallTracker = {
      endpoint,
      method: 'DELETE',
      timestamp: Date.now(),
      stackTrace
    };
    
    apiMockState.trackCall(call);
    
    // Check for error conditions
    const error = apiMockState.getErrorCondition(endpoint);
    if (error) {
      call.responseError = error;
      throw error;
    }
    
    const response = { success: true };
    call.responseValue = response;
    return response;
  });
  
  const mockCreateAgentWorkspace = vi.fn(async (agentId: string) => {
    const stackTrace = new Error().stack?.split('\n').slice(2, 6).join('\n') || 'No stack trace';
    const endpoint = `/api/agents/${agentId}/workspace`;
    
    const call: ApiCallTracker = {
      endpoint,
      method: 'POST',
      timestamp: Date.now(),
      stackTrace
    };
    
    apiMockState.trackCall(call);
    
    // Check for error conditions
    const error = apiMockState.getErrorCondition(endpoint);
    if (error) {
      call.responseError = error;
      throw error;
    }
    
    const response = {
      success: true,
      path: `/prod/agent_workspace/${agentId}`
    };
    
    call.responseValue = response;
    return response;
  });
  
  return {
    getAgentPages: mockGetAgentPages,
    saveAgentPage: mockSaveAgentPage,
    deleteAgentPage: mockDeleteAgentPage,
    createAgentWorkspace: mockCreateAgentWorkspace
  };
};

// Generate mock pages for testing
function generateMockPages(agentId: string): AgentPage[] {
  const pageTemplates = [
    {
      title: 'Getting Started Guide',
      content: { type: 'markdown' as const, value: '# Welcome\nThis is a getting started guide.' },
      status: 'published' as const
    },
    {
      title: 'API Documentation',
      content: { type: 'json' as const, value: { endpoints: ['/api/test'], methods: ['GET'] } },
      status: 'draft' as const
    },
    {
      title: 'Configuration Settings',
      content: { type: 'component' as const, value: { componentType: 'ConfigPanel', props: {} } },
      status: 'published' as const
    }
  ];
  
  return pageTemplates.map((template, index) => ({
    id: `page-${agentId}-${index + 1}`,
    title: template.title,
    content: template.content,
    agentId,
    createdAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
    updatedAt: new Date(Date.now() - (index * 12 * 60 * 60 * 1000)).toISOString(),
    status: template.status,
    tags: [`tag-${index + 1}`, `category-${Math.floor(index / 2) + 1}`]
  }));
}

// Contract verification utilities
export const ApiMockContracts = {
  // Reset all API mocks
  resetApiMocks: () => {
    apiMockState.clearCalls();
    console.log('🔍 TDD API MOCK: All API mocks reset');
  },
  
  // Get API call history
  getApiCalls: () => {
    return apiMockState.getCalls();
  },
  
  // Get calls for specific endpoint
  getCallsForEndpoint: (endpoint: string) => {
    return apiMockState.getCallsForEndpoint(endpoint);
  },
  
  // Set response delay for testing loading states
  setResponseDelay: (endpoint: string, delay: number) => {
    apiMockState.setResponseDelay(endpoint, delay);
  },
  
  // Set error condition for testing error handling
  setErrorCondition: (endpoint: string, error: Error) => {
    apiMockState.setErrorCondition(endpoint, error);
  },
  
  // Clear error condition
  clearErrorCondition: (endpoint: string) => {
    apiMockState.clearErrorCondition(endpoint);
  },
  
  // Verify API call was made
  verifyApiCallMade: (endpoint: string, method: string = 'GET'): boolean => {
    const calls = apiMockState.getCalls();
    const match = calls.find(call => 
      call.endpoint.includes(endpoint) && call.method === method
    );
    
    console.log(`🔍 TDD API VERIFICATION: ${endpoint} ${method}`, {
      found: !!match,
      totalCalls: calls.length,
      matchingCalls: calls.filter(call => call.endpoint.includes(endpoint)).length
    });
    
    return !!match;
  },
  
  // Verify API call sequence
  verifyApiCallSequence: (expectedSequence: Array<{endpoint: string; method: string}>): boolean => {
    const calls = apiMockState.getCalls();
    const actualSequence = calls.map(call => ({
      endpoint: call.endpoint,
      method: call.method
    }));
    
    const matches = expectedSequence.every((expected, index) => {
      const actual = actualSequence[index];
      return actual && 
             actual.endpoint.includes(expected.endpoint) && 
             actual.method === expected.method;
    });
    
    console.log(`🔍 TDD API VERIFICATION: Call sequence`, {
      expected: expectedSequence,
      actual: actualSequence.slice(0, expectedSequence.length),
      matches
    });
    
    return matches;
  },
  
  // Verify no API calls were made
  verifyNoApiCalls: (): boolean => {
    const calls = apiMockState.getCalls();
    const noCalls = calls.length === 0;
    
    console.log(`🔍 TDD API VERIFICATION: No API calls`, {
      noCalls,
      actualCallCount: calls.length
    });
    
    return noCalls;
  },
  
  // Assert API call with payload
  assertApiCallWithPayload: (endpoint: string, expectedPayload: any): boolean => {
    const calls = apiMockState.getCallsForEndpoint(endpoint);
    const matchingCall = calls.find(call => 
      JSON.stringify(call.payload) === JSON.stringify(expectedPayload)
    );
    
    console.log(`🔍 TDD API ASSERTION: Call with payload to ${endpoint}`, {
      expectedPayload,
      found: !!matchingCall,
      actualCalls: calls.map(call => call.payload)
    });
    
    return !!matchingCall;
  }
};

// Test scenario builders
export const ApiTestScenarios = {
  // Scenario: Successful page loading
  setupSuccessfulPageLoading: (agentId: string) => {
    ApiMockContracts.resetApiMocks();
    console.log(`🔍 TDD SCENARIO: Setup successful page loading for agent ${agentId}`);
  },
  
  // Scenario: API error during page loading
  setupApiError: (agentId: string, error: Error = new Error('API Error')) => {
    ApiMockContracts.resetApiMocks();
    ApiMockContracts.setErrorCondition(`/api/agents/${agentId}/pages`, error);
    console.log(`🔍 TDD SCENARIO: Setup API error for agent ${agentId}`, error.message);
  },
  
  // Scenario: Slow API response
  setupSlowApi: (agentId: string, delay: number = 2000) => {
    ApiMockContracts.resetApiMocks();
    ApiMockContracts.setResponseDelay(`/api/agents/${agentId}/pages`, delay);
    console.log(`🔍 TDD SCENARIO: Setup slow API response for agent ${agentId} (${delay}ms delay)`);
  },
  
  // Scenario: Empty pages response
  setupEmptyPages: (agentId: string) => {
    ApiMockContracts.resetApiMocks();
    console.log(`🔍 TDD SCENARIO: Setup empty pages response for agent ${agentId}`);
    
    // Override the mock to return empty pages
    return {
      getAgentPages: vi.fn(async () => ({
        success: true,
        data: []
      }))
    };
  }
};