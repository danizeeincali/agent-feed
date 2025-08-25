/**
 * Test Setup Configuration
 * 
 * Global test setup for TDD validation suite
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Mock WebSocket for testing
global.WebSocket = vi.fn(() => ({
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onopen: null,
  onclose: null,
  onerror: null,
  onmessage: null
})) as any;

// Mock performance for performance tests
if (typeof performance === 'undefined') {
  global.performance = {
    now: vi.fn(() => Date.now())
  } as any;
}

beforeAll(() => {
  console.log('🚀 Starting TDD Validation Test Suite');
  console.log('📋 Testing terminal regression fixes');
});

afterAll(() => {
  console.log('✅ TDD Validation Test Suite Complete');
});

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks();
});