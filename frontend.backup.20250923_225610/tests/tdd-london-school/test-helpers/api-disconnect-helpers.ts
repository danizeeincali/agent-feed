/**
 * TDD London School: API Disconnect Test Helpers
 * 
 * Helper functions and utilities for reproducing and analyzing
 * the data loading disconnect between API success and component failure.
 */

import { act, waitFor } from '@testing-library/react';

export interface ApiResponse {
  success: boolean;
  pages?: Array<{
    id: string;
    title: string;
    content_type: string;
    content_value: string;
  }>;
  data?: any[];
  error?: string;
}

export interface ComponentState {
  pages: any[];
  loading: boolean;
  error: string | null;
  selectedPageId?: string;
}

export const API_TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 15000,
  retries: 3,
  testAgent: {
    id: 'personal-todos-agent',
    name: 'Personal Todos Agent'
  },
  testPage: {
    id: '015b7296-a144-4096-9c60-ee5d7f900723',
    title: 'Personal Todos Dashboard'
  }
};

/**
 * Direct API call helper - bypasses all React/component layers
 */
export async function callApiDirectly(agentId: string): Promise<ApiResponse> {
  const url = `${API_TEST_CONFIG.baseUrl}/api/agents/${agentId}/pages`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Direct API call failed:', error);
    throw error;
  }
}

/**
 * Simulates the exact data transformation that components perform
 */
export function simulateComponentTransformation(apiResponse: ApiResponse): ComponentState {
  return {
    pages: apiResponse.pages || apiResponse.data || [],
    loading: false,
    error: apiResponse.success ? null : (apiResponse.error || 'Unknown error'),
    selectedPageId: undefined
  };
}

/**
 * Captures console logs during test execution for debugging
 */
export class ConsoleCapture {
  private originalLog: typeof console.log;
  private originalError: typeof console.error;
  private logs: string[] = [];
  private errors: string[] = [];
  
  constructor() {
    this.originalLog = console.log;
    this.originalError = console.error;
  }
  
  start() {
    this.logs = [];
    this.errors = [];
    
    console.log = (...args) => {
      this.logs.push(args.join(' '));
      this.originalLog(...args);
    };
    
    console.error = (...args) => {
      this.errors.push(args.join(' '));
      this.originalError(...args);
    };
  }
  
  stop() {
    console.log = this.originalLog;
    console.error = this.originalError;
  }
  
  getLogs() {
    return [...this.logs];
  }
  
  getErrors() {
    return [...this.errors];
  }
  
  hasErrorsContaining(text: string): boolean {
    return this.errors.some(error => error.includes(text));
  }
}

/**
 * Network request interceptor for analyzing API calls
 */
export class NetworkInterceptor {
  private requests: Array<{
    url: string;
    method: string;
    timestamp: number;
    response?: any;
    error?: any;
  }> = [];
  
  private originalFetch: typeof fetch;
  
  constructor() {
    this.originalFetch = global.fetch;
  }
  
  start() {
    this.requests = [];
    
    global.fetch = async (url: string | Request | URL, options?: RequestInit) => {
      const requestUrl = url.toString();
      const method = options?.method || 'GET';
      const timestamp = Date.now();
      
      const request = {
        url: requestUrl,
        method,
        timestamp
      };
      
      this.requests.push(request);
      
      try {
        const response = await this.originalFetch(url, options);
        const responseData = await response.clone().json();
        
        request.response = {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        };
        
        return response;
        
      } catch (error) {
        request.error = error;
        throw error;
      }
    };
  }
  
  stop() {
    global.fetch = this.originalFetch;
  }
  
  getRequests() {
    return [...this.requests];
  }
  
  getRequestsToEndpoint(endpoint: string) {
    return this.requests.filter(req => req.url.includes(endpoint));
  }
  
  getLastRequest() {
    return this.requests[this.requests.length - 1];
  }
}

/**
 * React state monitoring utility
 */
export class ReactStateMonitor {
  private stateHistory: Array<{
    timestamp: number;
    state: any;
    action?: string;
  }> = [];
  
  recordState(state: any, action?: string) {
    this.stateHistory.push({
      timestamp: Date.now(),
      state: { ...state },
      action
    });
  }
  
  getStateHistory() {
    return [...this.stateHistory];
  }
  
  getStateTransitions() {
    const transitions = [];
    
    for (let i = 1; i < this.stateHistory.length; i++) {
      const prev = this.stateHistory[i - 1];
      const current = this.stateHistory[i];
      
      transitions.push({
        from: prev.state,
        to: current.state,
        action: current.action,
        timeDiff: current.timestamp - prev.timestamp
      });
    }
    
    return transitions;
  }
  
  findStateWhere(predicate: (state: any) => boolean) {
    return this.stateHistory.find(entry => predicate(entry.state));
  }
}

/**
 * Async operation tracker for identifying race conditions
 */
export class AsyncTracker {
  private operations: Array<{
    id: string;
    name: string;
    startTime: number;
    endTime?: number;
    result?: any;
    error?: any;
  }> = [];
  
  startOperation(name: string): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.operations.push({
      id,
      name,
      startTime: Date.now()
    });
    
    return id;
  }
  
  endOperation(id: string, result?: any, error?: any) {
    const operation = this.operations.find(op => op.id === id);
    if (operation) {
      operation.endTime = Date.now();
      operation.result = result;
      operation.error = error;
    }
  }
  
  getOverlappingOperations() {
    const overlapping = [];
    
    for (let i = 0; i < this.operations.length; i++) {
      for (let j = i + 1; j < this.operations.length; j++) {
        const op1 = this.operations[i];
        const op2 = this.operations[j];
        
        if (op1.endTime && op2.endTime) {
          const op1End = op1.endTime;
          const op2Start = op2.startTime;
          const op2End = op2.endTime;
          const op1Start = op1.startTime;
          
          // Check if operations overlap
          if ((op1Start < op2End && op1End > op2Start) ||
              (op2Start < op1End && op2End > op1Start)) {
            overlapping.push([op1, op2]);
          }
        }
      }
    }
    
    return overlapping;
  }
  
  getOperationDurations() {
    return this.operations
      .filter(op => op.endTime)
      .map(op => ({
        name: op.name,
        duration: op.endTime! - op.startTime,
        success: !op.error
      }));
  }
}

/**
 * Test data factory for consistent test scenarios
 */
export const TestDataFactory = {
  createValidApiResponse(): ApiResponse {
    return {
      success: true,
      pages: [
        {
          id: API_TEST_CONFIG.testPage.id,
          title: API_TEST_CONFIG.testPage.title,
          content_type: 'json',
          content_value: '{"type": "div", "props": {"children": "Dashboard Content"}}'
        },
        {
          id: '2',
          title: 'Another Page',
          content_type: 'json',
          content_value: '{"type": "div", "props": {"children": "Other Content"}}'
        }
      ]
    };
  },
  
  createFailedApiResponse(): ApiResponse {
    return {
      success: false,
      error: 'Failed to load pages'
    };
  },
  
  createEmptyApiResponse(): ApiResponse {
    return {
      success: true,
      pages: []
    };
  },
  
  createMalformedApiResponse(): any {
    return {
      // Missing success field
      data: [],
      pages: null
    };
  }
};

/**
 * Waits for condition with detailed timeout information
 */
export async function waitForConditionWithDetails<T>(
  condition: () => T | Promise<T>,
  predicate: (value: T) => boolean,
  options: {
    timeout?: number;
    interval?: number;
    description?: string;
  } = {}
): Promise<{ value: T; attempts: number; duration: number }> {
  const { timeout = 5000, interval = 100, description = 'condition' } = options;
  
  const startTime = Date.now();
  let attempts = 0;
  let lastValue: T;
  
  while (Date.now() - startTime < timeout) {
    attempts++;
    
    try {
      lastValue = await condition();
      
      if (predicate(lastValue)) {
        return {
          value: lastValue,
          attempts,
          duration: Date.now() - startTime
        };
      }
      
    } catch (error) {
      console.warn(`Condition check failed (attempt ${attempts}):`, error);
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for ${description} after ${timeout}ms (${attempts} attempts). Last value:`, lastValue!);
}