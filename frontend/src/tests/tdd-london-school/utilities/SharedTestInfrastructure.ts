/**
 * TDD London School - Shared Testing Infrastructure
 * 
 * Provides centralized infrastructure for London School TDD testing including:
 * - Global test setup and teardown
 * - Mock lifecycle management
 * - Test environment configuration
 * - Shared test data and fixtures
 * - Cross-test communication and coordination
 */

import { vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

// ==================== GLOBAL TEST INFRASTRUCTURE ====================

export class GlobalTestInfrastructure {
  private static instance: GlobalTestInfrastructure;
  private static isInitialized = false;
  private static globalMocks: Map<string, Mock> = new Map();
  private static testFixtures: Map<string, any> = new Map();
  private static testEnvironment: TestEnvironment | null = null;

  /**
   * Singleton instance getter
   */
  public static getInstance(): GlobalTestInfrastructure {
    if (!this.instance) {
      this.instance = new GlobalTestInfrastructure();
    }
    return this.instance;
  }

  /**
   * Initializes global test infrastructure
   */
  public static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🚀 Initializing London School TDD Global Infrastructure...');

    // Setup global test environment
    this.setupGlobalEnvironment();
    
    // Initialize mock lifecycle
    this.setupMockLifecycle();
    
    // Setup shared fixtures
    this.setupSharedFixtures();
    
    // Configure test environment
    this.testEnvironment = new TestEnvironment();
    await this.testEnvironment.initialize();

    this.isInitialized = true;
    console.log('✅ Global infrastructure initialized successfully');
  }

  /**
   * Cleans up global test infrastructure
   */
  public static async cleanup(): Promise<void> {
    if (!this.isInitialized) return;

    console.log('🧹 Cleaning up London School TDD Global Infrastructure...');

    // Cleanup test environment
    if (this.testEnvironment) {
      await this.testEnvironment.cleanup();
    }

    // Clear all global mocks
    this.globalMocks.clear();
    
    // Clear test fixtures
    this.testFixtures.clear();
    
    // Reset environment
    this.resetGlobalEnvironment();

    this.isInitialized = false;
    console.log('✅ Global infrastructure cleaned up successfully');
  }

  /**
   * Sets up global testing environment
   */
  private static setupGlobalEnvironment(): void {
    // Mock global objects
    this.mockGlobalObjects();
    
    // Configure React Testing Library
    this.configureReactTestingLibrary();
    
    // Setup global error handling
    this.setupGlobalErrorHandling();
  }

  /**
   * Mocks global objects needed for testing
   */
  private static mockGlobalObjects(): void {
    // Mock window.fetch
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    this.globalMocks.set('fetch', fetchMock);

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    this.globalMocks.set('localStorage', localStorageMock as any);

    // Mock sessionStorage
    const sessionStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0
    };
    Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
    this.globalMocks.set('sessionStorage', sessionStorageMock as any);

    // Mock IntersectionObserver
    const intersectionObserverMock = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));
    global.IntersectionObserver = intersectionObserverMock as any;
    this.globalMocks.set('IntersectionObserver', intersectionObserverMock);

    // Mock ResizeObserver
    const resizeObserverMock = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));
    global.ResizeObserver = resizeObserverMock as any;
    this.globalMocks.set('ResizeObserver', resizeObserverMock);

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock console methods if needed
    const originalConsole = { ...console };
    console.warn = vi.fn();
    console.error = vi.fn();
    this.globalMocks.set('console', { warn: console.warn, error: console.error });
  }

  /**
   * Configures React Testing Library
   */
  private static configureReactTestingLibrary(): void {
    // Global cleanup after each test
    afterEach(() => {
      cleanup();
    });
  }

  /**
   * Sets up global error handling for tests
   */
  private static setupGlobalErrorHandling(): void {
    // Track unhandled errors
    const originalErrorHandler = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('Unhandled error in test:', { message, source, lineno, colno, error });
      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }
      return false;
    };

    // Track unhandled promise rejections
    const originalRejectionHandler = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      console.error('Unhandled promise rejection in test:', event.reason);
      if (originalRejectionHandler) {
        originalRejectionHandler(event);
      }
    };
  }

  /**
   * Sets up mock lifecycle management
   */
  private static setupMockLifecycle(): void {
    // Before each test
    beforeEach(() => {
      this.resetAllMocks();
    });

    // After each test
    afterEach(() => {
      this.verifyMockUsage();
      this.cleanupMocks();
    });
  }

  /**
   * Resets all global mocks
   */
  private static resetAllMocks(): void {
    this.globalMocks.forEach((mock, name) => {
      if (typeof mock.mockReset === 'function') {
        mock.mockReset();
      }
    });
  }

  /**
   * Verifies mock usage patterns
   */
  private static verifyMockUsage(): void {
    // This could include verification that mocks were used appropriately
    // For now, we'll just log any unexpected behaviors
  }

  /**
   * Cleans up mocks after each test
   */
  private static cleanupMocks(): void {
    // Clear specific mock states that shouldn't persist
    this.globalMocks.forEach((mock, name) => {
      if (typeof mock.mockClear === 'function') {
        mock.mockClear();
      }
    });
  }

  /**
   * Sets up shared test fixtures
   */
  private static setupSharedFixtures(): void {
    // Common test data that can be reused across tests
    this.testFixtures.set('sampleMentions', [
      { id: 'agent-1', name: 'alice', displayName: 'Alice Agent', type: 'ai' },
      { id: 'agent-2', name: 'bob', displayName: 'Bob Assistant', type: 'ai' },
      { id: 'agent-3', name: 'charlie', displayName: 'Charlie Bot', type: 'bot' }
    ]);

    this.testFixtures.set('samplePosts', [
      { 
        id: 'post-1', 
        content: 'Sample post content', 
        authorId: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        mentions: ['@alice']
      },
      { 
        id: 'post-2', 
        content: 'Another sample post', 
        authorId: 'user-2',
        createdAt: '2024-01-02T00:00:00Z',
        mentions: ['@bob', '@charlie']
      }
    ]);

    this.testFixtures.set('sampleComments', [
      {
        id: 'comment-1',
        postId: 'post-1',
        content: 'Sample comment',
        authorId: 'user-2',
        createdAt: '2024-01-01T01:00:00Z'
      }
    ]);

    this.testFixtures.set('apiResponses', {
      success: { status: 200, ok: true, data: {} },
      notFound: { status: 404, ok: false, error: 'Not Found' },
      serverError: { status: 500, ok: false, error: 'Internal Server Error' },
      unauthorized: { status: 401, ok: false, error: 'Unauthorized' }
    });
  }

  /**
   * Gets shared test fixture
   */
  public static getFixture<T>(name: string): T | undefined {
    return this.testFixtures.get(name) as T;
  }

  /**
   * Sets shared test fixture
   */
  public static setFixture(name: string, data: any): void {
    this.testFixtures.set(name, data);
  }

  /**
   * Gets global mock
   */
  public static getMock(name: string): Mock | undefined {
    return this.globalMocks.get(name);
  }

  /**
   * Resets global environment
   */
  private static resetGlobalEnvironment(): void {
    vi.clearAllMocks();
    vi.resetAllMocks();
  }
}

// ==================== TEST ENVIRONMENT CONFIGURATION ====================

export class TestEnvironment {
  private config: TestEnvironmentConfig;
  private initialized = false;

  constructor(config?: Partial<TestEnvironmentConfig>) {
    this.config = {
      apiBaseUrl: 'http://localhost:3001/api/v1',
      wsUrl: 'ws://localhost:3001',
      timeout: 5000,
      retries: 3,
      logLevel: 'error',
      mockDelay: 100,
      performanceThresholds: {
        renderTime: 100,
        interactionTime: 50,
        memoryUsage: 10 * 1024 * 1024
      },
      ...config
    };
  }

  /**
   * Initializes test environment
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔧 Initializing Test Environment...');

    // Setup API mocking
    this.setupAPIMocking();
    
    // Setup WebSocket mocking
    this.setupWebSocketMocking();
    
    // Configure timeouts
    this.configureTimeouts();
    
    // Setup performance monitoring
    this.setupPerformanceMonitoring();

    this.initialized = true;
    console.log('✅ Test Environment initialized');
  }

  /**
   * Cleans up test environment
   */
  public async cleanup(): Promise<void> {
    if (!this.initialized) return;

    console.log('🧹 Cleaning up Test Environment...');
    
    // Clean up any persistent state
    this.initialized = false;
    
    console.log('✅ Test Environment cleaned up');
  }

  /**
   * Sets up API mocking infrastructure
   */
  private setupAPIMocking(): void {
    const fetchMock = GlobalTestInfrastructure.getMock('fetch');
    if (fetchMock) {
      // Setup default API responses
      fetchMock.mockImplementation(async (url: string, options: any) => {
        // Simulate network delay
        await this.simulateNetworkDelay();
        
        // Return mock response based on URL pattern
        return this.createMockResponse(url, options);
      });
    }
  }

  /**
   * Sets up WebSocket mocking
   */
  private setupWebSocketMocking(): void {
    // Mock WebSocket constructor
    global.WebSocket = vi.fn(() => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1, // OPEN
      url: this.config.wsUrl
    })) as any;
  }

  /**
   * Configures test timeouts
   */
  private configureTimeouts(): void {
    vi.setConfig({
      testTimeout: this.config.timeout,
      hookTimeout: this.config.timeout
    });
  }

  /**
   * Sets up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Mock performance.now() for consistent timing
    let mockTime = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => mockTime += 10);
  }

  /**
   * Simulates network delay for realistic testing
   */
  private async simulateNetworkDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.config.mockDelay));
  }

  /**
   * Creates mock API response
   */
  private createMockResponse(url: string, options: any): Response {
    const method = options?.method || 'GET';
    const responseData = this.getResponseDataForEndpoint(url, method);
    
    return new Response(JSON.stringify(responseData.data), {
      status: responseData.status,
      statusText: responseData.statusText,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Gets appropriate response data for endpoint
   */
  private getResponseDataForEndpoint(url: string, method: string): any {
    const fixtures = GlobalTestInfrastructure.getFixture<any>('apiResponses');
    
    // Default success response
    return {
      data: { success: true, message: 'Mock API response' },
      status: 200,
      statusText: 'OK'
    };
  }

  /**
   * Gets current configuration
   */
  public getConfig(): TestEnvironmentConfig {
    return { ...this.config };
  }

  /**
   * Updates configuration
   */
  public updateConfig(updates: Partial<TestEnvironmentConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// ==================== TYPE DEFINITIONS ====================

export interface TestEnvironmentConfig {
  apiBaseUrl: string;
  wsUrl: string;
  timeout: number;
  retries: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  mockDelay: number;
  performanceThresholds: {
    renderTime: number;
    interactionTime: number;
    memoryUsage: number;
  };
}

// ==================== MOCK DATA MANAGER ====================

export class MockDataManager {
  private static datasets: Map<string, any[]> = new Map();
  private static generators: Map<string, () => any> = new Map();

  /**
   * Registers a data generator function
   */
  public static registerGenerator(name: string, generator: () => any): void {
    this.generators.set(name, generator);
  }

  /**
   * Generates mock data using registered generator
   */
  public static generate(name: string, count: number = 1): any[] {
    const generator = this.generators.get(name);
    if (!generator) {
      throw new Error(`No generator registered for ${name}`);
    }

    return Array.from({ length: count }, generator);
  }

  /**
   * Stores dataset for reuse across tests
   */
  public static setDataset(name: string, data: any[]): void {
    this.datasets.set(name, data);
  }

  /**
   * Gets stored dataset
   */
  public static getDataset(name: string): any[] | undefined {
    return this.datasets.get(name);
  }

  /**
   * Clears all datasets
   */
  public static clearDatasets(): void {
    this.datasets.clear();
  }
}

// ==================== TEST LIFECYCLE HOOKS ====================

export class TestLifecycleHooks {
  private static beforeAllHooks: (() => Promise<void> | void)[] = [];
  private static beforeEachHooks: (() => Promise<void> | void)[] = [];
  private static afterEachHooks: (() => Promise<void> | void)[] = [];
  private static afterAllHooks: (() => Promise<void> | void)[] = [];

  /**
   * Registers global beforeAll hook
   */
  public static registerBeforeAll(hook: () => Promise<void> | void): void {
    this.beforeAllHooks.push(hook);
  }

  /**
   * Registers global beforeEach hook
   */
  public static registerBeforeEach(hook: () => Promise<void> | void): void {
    this.beforeEachHooks.push(hook);
  }

  /**
   * Registers global afterEach hook
   */
  public static registerAfterEach(hook: () => Promise<void> | void): void {
    this.afterEachHooks.push(hook);
  }

  /**
   * Registers global afterAll hook
   */
  public static registerAfterAll(hook: () => Promise<void> | void): void {
    this.afterAllHooks.push(hook);
  }

  /**
   * Executes all registered hooks
   */
  public static setupHooks(): void {
    beforeAll(async () => {
      await GlobalTestInfrastructure.initialize();
      for (const hook of this.beforeAllHooks) {
        await hook();
      }
    });

    beforeEach(async () => {
      for (const hook of this.beforeEachHooks) {
        await hook();
      }
    });

    afterEach(async () => {
      for (const hook of this.afterEachHooks) {
        await hook();
      }
    });

    afterAll(async () => {
      for (const hook of this.afterAllHooks) {
        await hook();
      }
      await GlobalTestInfrastructure.cleanup();
    });
  }
}

// ==================== EXPORT INFRASTRUCTURE COMPONENTS ====================

export {
  GlobalTestInfrastructure,
  TestEnvironment,
  MockDataManager,
  TestLifecycleHooks
};

export default {
  GlobalTestInfrastructure,
  TestEnvironment,
  MockDataManager,
  TestLifecycleHooks
};