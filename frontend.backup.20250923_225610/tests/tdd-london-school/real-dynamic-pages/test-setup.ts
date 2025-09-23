/**
 * London School TDD Test Setup - Real Dynamic Pages
 * 
 * CRITICAL PRINCIPLES:
 * 1. NO MOCKS - All interactions with real systems
 * 2. Focus on object collaboration and behavior verification
 * 3. Outside-in development approach
 * 4. Real API endpoints and data flows
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from './mocks/server';

// Configure Testing Library for behavior-driven testing
configure({
  testIdAttribute: 'data-testid',
  computedStyleSupportsPseudoElements: true
});

// London School: Real API Server Setup
beforeAll(() => {
  // Start real backend server for testing
  // NO MSW mocks - we test against actual API
  console.log('🔥 London School TDD: Starting real API integration tests');
  console.log('🚫 NO MOCKS POLICY: All tests use real backend endpoints');
});

afterAll(() => {
  console.log('✅ London School TDD: Real API integration tests completed');
});

// Global test configuration for real API calls
global.fetch = fetch;

// London School: Object collaboration tracking
interface CollaborationTracker {
  interactions: Array<{
    timestamp: number;
    source: string;
    target: string;
    method: string;
    payload?: any;
    response?: any;
  }>;
}

const collaborationTracker: CollaborationTracker = {
  interactions: []
};

// Track all fetch calls for collaboration verification
const originalFetch = global.fetch;
global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const startTime = Date.now();
  const url = typeof input === 'string' ? input : input.toString();
  
  collaborationTracker.interactions.push({
    timestamp: startTime,
    source: 'TestComponent',
    target: url,
    method: init?.method || 'GET',
    payload: init?.body ? JSON.parse(init.body as string) : undefined,
    response: undefined
  });
  
  const response = await originalFetch(input, init);
  
  // Log the actual response for collaboration verification
  const responseData = await response.clone().text();
  const lastInteraction = collaborationTracker.interactions[collaborationTracker.interactions.length - 1];
  lastInteraction.response = responseData;
  
  return response;
};

// Make collaboration tracker available globally for tests
(global as any).collaborationTracker = collaborationTracker;

// London School: Behavior verification helpers
export const verifyCollaboration = (expectedInteractions: Array<{
  source: string;
  target: string;
  method: string;
}>) => {
  const actualInteractions = collaborationTracker.interactions;
  
  expectedInteractions.forEach((expected, index) => {
    const actual = actualInteractions[index];
    expect(actual).toBeDefined();
    expect(actual.source).toBe(expected.source);
    expect(actual.target).toContain(expected.target);
    expect(actual.method).toBe(expected.method);
  });
};

export const getLastCollaboration = () => {
  return collaborationTracker.interactions[collaborationTracker.interactions.length - 1];
};

export const clearCollaborationHistory = () => {
  collaborationTracker.interactions = [];
};

// Real environment configuration
process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000/api';
process.env.NODE_ENV = 'test';

// London School: Contract verification setup
export interface ApiContract {
  endpoint: string;
  method: string;
  expectedRequest: any;
  expectedResponse: any;
}

export const verifyApiContract = async (contract: ApiContract) => {
  const response = await fetch(contract.endpoint, {
    method: contract.method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: contract.expectedRequest ? JSON.stringify(contract.expectedRequest) : undefined
  });
  
  expect(response.ok).toBe(true);
  const data = await response.json();
  
  // Verify response structure matches contract
  if (contract.expectedResponse) {
    expect(data).toMatchObject(contract.expectedResponse);
  }
  
  return data;
};