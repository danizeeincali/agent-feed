// SPARC Phase 3: Architecture - Test Base Classes Implementation

import { ReactWrapper, mount } from 'enzyme';
import { render, RenderResult, fireEvent, waitFor } from '@testing-library/react';
import { Page, Browser } from '@playwright/test';
import { AgentPost, Comment, Agent } from '../../../frontend/src/types';

/**
 * Abstract base class for component unit tests
 * Provides standardized setup, teardown, and helper methods
 */
export abstract class ComponentTestBase<T = any> {
  protected wrapper: ReactWrapper | null = null;
  protected renderResult: RenderResult | null = null;

  /**
   * Create component instance with props
   * Must be implemented by concrete test classes
   */
  protected abstract createComponent(props?: Partial<T>): ReactWrapper;
  
  /**
   * Provide default props for the component
   * Must be implemented by concrete test classes  
   */
  protected abstract getDefaultProps(): T;

  /**
   * Standard setup executed before each test
   */
  beforeEach(): void {
    // Clear any existing wrapper
    this.cleanup();
    
    // Setup DOM environment
    this.setupDOMEnvironment();
    
    // Initialize test utilities
    this.initializeTestUtils();
  }

  /**
   * Standard teardown executed after each test
   */
  afterEach(): void {
    this.cleanup();
    this.resetMocks();
    this.clearTimers();
  }

  /**
   * Component visibility assertions
   */
  expectVisible(selector: string): void {
    if (!this.wrapper) throw new Error('Component not rendered');
    const element = this.wrapper.find(selector);
    expect(element).toHaveLength(1);
    expect(element.prop('style')?.display).not.toBe('none');
  }

  expectHidden(selector: string): void {
    if (!this.wrapper) throw new Error('Component not rendered');
    const element = this.wrapper.find(selector);
    if (element.length > 0) {
      expect(element.prop('style')?.display).toBe('none');
    }
  }

  expectText(selector: string, text: string): void {
    if (!this.wrapper) throw new Error('Component not rendered');
    const element = this.wrapper.find(selector);
    expect(element.text()).toContain(text);
  }

  expectElementCount(selector: string, count: number): void {
    if (!this.wrapper) throw new Error('Component not rendered');
    const elements = this.wrapper.find(selector);
    expect(elements).toHaveLength(count);
  }

  /**
   * Event simulation helpers
   */
  simulateClick(selector: string): void {
    if (!this.wrapper) throw new Error('Component not rendered');
    const element = this.wrapper.find(selector);
    expect(element).toHaveLength(1);
    element.simulate('click');
    this.wrapper.update();
  }

  simulateTyping(selector: string, text: string): void {
    if (!this.wrapper) throw new Error('Component not rendered');
    const element = this.wrapper.find(selector);
    expect(element).toHaveLength(1);
    
    // Simulate typing character by character
    for (const char of text) {
      element.simulate('change', { target: { value: element.prop('value') + char } });
      this.wrapper.update();
    }
  }

  simulateKeyPress(selector: string, key: string): void {
    if (!this.wrapper) throw new Error('Component not rendered');
    const element = this.wrapper.find(selector);
    expect(element).toHaveLength(1);
    element.simulate('keyPress', { key });
    this.wrapper.update();
  }

  simulateFormSubmit(selector: string): void {
    if (!this.wrapper) throw new Error('Component not rendered');
    const form = this.wrapper.find(selector);
    expect(form).toHaveLength(1);
    form.simulate('submit');
    this.wrapper.update();
  }

  /**
   * Async operation helpers
   */
  async waitForUpdate(): Promise<void> {
    if (!this.wrapper) throw new Error('Component not rendered');
    await this.wrapper.update();
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  async waitForCondition(condition: () => boolean, timeout: number = 5000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (condition()) return;
      await new Promise(resolve => setTimeout(resolve, 50));
      this.wrapper?.update();
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Performance measurement helpers
   */
  measureRenderTime(renderFn: () => void): number {
    const startTime = performance.now();
    renderFn();
    return performance.now() - startTime;
  }

  measureUpdateTime(updateFn: () => void): number {
    const startTime = performance.now();
    updateFn();
    this.wrapper?.update();
    return performance.now() - startTime;
  }

  /**
   * Memory usage helpers
   */
  getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Private helper methods
   */
  private cleanup(): void {
    if (this.wrapper) {
      this.wrapper.unmount();
      this.wrapper = null;
    }
    if (this.renderResult) {
      this.renderResult.unmount();
      this.renderResult = null;
    }
  }

  private setupDOMEnvironment(): void {
    // Setup any required DOM APIs
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  }

  private initializeTestUtils(): void {
    // Initialize any test-specific utilities
    jest.clearAllMocks();
  }

  private resetMocks(): void {
    jest.clearAllMocks();
    jest.clearAllTimers();
  }

  private clearTimers(): void {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  }
}

/**
 * Abstract base class for integration tests
 * Handles API mocking, WebSocket simulation, and component interaction testing
 */
export abstract class IntegrationTestBase {
  protected mockApi: MockApiManager;
  protected mockWebSocket: MockWebSocketManager;
  protected testContainer: HTMLElement | null = null;

  constructor() {
    this.mockApi = new MockApiManager();
    this.mockWebSocket = new MockWebSocketManager();
  }

  /**
   * Setup executed before all tests in the suite
   */
  async beforeAll(): Promise<void> {
    await this.initializeMocks();
    await this.setupTestEnvironment();
  }

  /**
   * Teardown executed after all tests in the suite
   */
  async afterAll(): Promise<void> {
    await this.cleanupMocks();
    await this.cleanupTestEnvironment();
  }

  /**
   * Setup executed before each test
   */
  async beforeEach(): Promise<void> {
    this.resetMocks();
    this.setupTestContainer();
  }

  /**
   * Teardown executed after each test
   */
  async afterEach(): Promise<void> {
    this.cleanupTestContainer();
    this.resetMocks();
  }

  /**
   * API mocking helpers
   */
  mockApiSuccess(endpoint: string, data: any): void {
    this.mockApi.mockSuccess(endpoint, data);
  }

  mockApiError(endpoint: string, error: Error): void {
    this.mockApi.mockError(endpoint, error);
  }

  mockApiTimeout(endpoint: string): void {
    this.mockApi.mockTimeout(endpoint);
  }

  /**
   * WebSocket simulation helpers
   */
  simulateWebSocketMessage(type: string, data: any): void {
    this.mockWebSocket.sendMessage(type, data);
  }

  simulateWebSocketDisconnect(): void {
    this.mockWebSocket.simulateDisconnect();
  }

  simulateWebSocketReconnect(): void {
    this.mockWebSocket.simulateReconnect();
  }

  simulateWebSocketError(error: Error): void {
    this.mockWebSocket.simulateError(error);
  }

  /**
   * Component interaction helpers
   */
  async renderComponentTree(components: React.ReactElement): Promise<RenderResult> {
    const result = render(components);
    await waitFor(() => {
      // Wait for initial render to complete
    });
    return result;
  }

  async waitForApiCall(endpoint: string, timeout: number = 5000): Promise<void> {
    await this.mockApi.waitForCall(endpoint, timeout);
  }

  async waitForWebSocketMessage(type: string, timeout: number = 5000): Promise<any> {
    return await this.mockWebSocket.waitForMessage(type, timeout);
  }

  /**
   * State validation helpers
   */
  expectApiCallMade(endpoint: string): void {
    expect(this.mockApi.wasCallMade(endpoint)).toBe(true);
  }

  expectWebSocketMessageSent(type: string): void {
    expect(this.mockWebSocket.wasMessageSent(type)).toBe(true);
  }

  expectComponentState(component: any, expectedState: any): void {
    const actualState = component.state();
    expect(actualState).toMatchObject(expectedState);
  }

  /**
   * Private helper methods
   */
  private async initializeMocks(): Promise<void> {
    await this.mockApi.initialize();
    await this.mockWebSocket.initialize();
  }

  private async cleanupMocks(): Promise<void> {
    await this.mockApi.cleanup();
    await this.mockWebSocket.cleanup();
  }

  private resetMocks(): void {
    this.mockApi.reset();
    this.mockWebSocket.reset();
  }

  private async setupTestEnvironment(): Promise<void> {
    // Setup any test-specific environment configuration
  }

  private async cleanupTestEnvironment(): Promise<void> {
    // Cleanup test environment
  }

  private setupTestContainer(): void {
    this.testContainer = document.createElement('div');
    this.testContainer.id = 'test-container';
    document.body.appendChild(this.testContainer);
  }

  private cleanupTestContainer(): void {
    if (this.testContainer) {
      document.body.removeChild(this.testContainer);
      this.testContainer = null;
    }
  }
}

/**
 * Abstract base class for E2E tests
 * Handles browser automation, page navigation, and user workflow testing
 */
export abstract class E2ETestBase {
  protected page: Page;
  protected browser: Browser;
  protected baseUrl: string;

  constructor(browser: Browser, baseUrl: string = 'http://localhost:3000') {
    this.browser = browser;
    this.baseUrl = baseUrl;
  }

  /**
   * Setup executed before all tests
   */
  async beforeAll(): Promise<void> {
    await this.setupBrowser();
  }

  /**
   * Teardown executed after all tests
   */
  async afterAll(): Promise<void> {
    await this.cleanupBrowser();
  }

  /**
   * Setup executed before each test
   */
  async beforeEach(): Promise<void> {
    this.page = await this.browser.newPage();
    await this.setupPage();
  }

  /**
   * Teardown executed after each test
   */
  async afterEach(): Promise<void> {
    await this.cleanupPage();
    await this.page.close();
  }

  /**
   * Navigation helpers
   */
  async navigateToApp(): Promise<void> {
    await this.page.goto(this.baseUrl);
    await this.waitForPageLoad();
  }

  async navigateToPath(path: string): Promise<void> {
    await this.page.goto(`${this.baseUrl}${path}`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('body');
  }

  /**
   * Interaction helpers
   */
  async clickElement(selector: string): Promise<void> {
    await this.page.waitForSelector(selector);
    await this.page.click(selector);
  }

  async typeText(selector: string, text: string): Promise<void> {
    await this.page.waitForSelector(selector);
    await this.page.fill(selector, text);
  }

  async typeTextSlowly(selector: string, text: string, delay: number = 100): Promise<void> {
    await this.page.waitForSelector(selector);
    await this.page.type(selector, text, { delay });
  }

  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  async scrollToElement(selector: string): Promise<void> {
    await this.page.waitForSelector(selector);
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Wait helpers
   */
  async waitForElement(selector: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout });
  }

  async waitForElementToDisappear(selector: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  async waitForText(text: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(
      (text) => document.body.textContent?.includes(text),
      text,
      { timeout }
    );
  }

  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Assertion helpers
   */
  async expectElementVisible(selector: string): Promise<void> {
    await this.page.waitForSelector(selector);
    const isVisible = await this.page.isVisible(selector);
    expect(isVisible).toBe(true);
  }

  async expectElementHidden(selector: string): Promise<void> {
    const isVisible = await this.page.isVisible(selector);
    expect(isVisible).toBe(false);
  }

  async expectElementText(selector: string, text: string): Promise<void> {
    await this.page.waitForSelector(selector);
    const elementText = await this.page.textContent(selector);
    expect(elementText).toContain(text);
  }

  async expectPageUrl(url: string): Promise<void> {
    expect(this.page.url()).toBe(url);
  }

  async expectPageTitle(title: string): Promise<void> {
    const pageTitle = await this.page.title();
    expect(pageTitle).toBe(title);
  }

  /**
   * Screenshot and debugging helpers
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  async captureConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  async captureNetworkErrors(): Promise<any[]> {
    const networkErrors: any[] = [];
    this.page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    return networkErrors;
  }

  /**
   * Performance measurement helpers
   */
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.navigateToApp();
    return Date.now() - startTime;
  }

  async measureActionTime(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    return Date.now() - startTime;
  }

  /**
   * Private helper methods
   */
  private async setupBrowser(): Promise<void> {
    // Browser-level setup
  }

  private async cleanupBrowser(): Promise<void> {
    // Browser-level cleanup
  }

  private async setupPage(): Promise<void> {
    // Set viewport size
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    // Setup console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
  }

  private async cleanupPage(): Promise<void> {
    // Page-level cleanup
    await this.page.removeAllListeners();
  }
}

/**
 * Mock API Manager for integration testing
 */
export class MockApiManager {
  private mocks: Map<string, any> = new Map();
  private callHistory: Map<string, number> = new Map();
  private pendingCalls: Map<string, Promise<any>> = new Map();

  async initialize(): Promise<void> {
    // Initialize mock API infrastructure
  }

  async cleanup(): Promise<void> {
    // Cleanup mock API infrastructure
  }

  reset(): void {
    this.mocks.clear();
    this.callHistory.clear();
    this.pendingCalls.clear();
  }

  mockSuccess(endpoint: string, data: any): void {
    this.mocks.set(endpoint, { success: true, data });
  }

  mockError(endpoint: string, error: Error): void {
    this.mocks.set(endpoint, { success: false, error });
  }

  mockTimeout(endpoint: string): void {
    this.mocks.set(endpoint, { timeout: true });
  }

  wasCallMade(endpoint: string): boolean {
    return this.callHistory.has(endpoint);
  }

  async waitForCall(endpoint: string, timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`API call to ${endpoint} not made within ${timeout}ms`));
      }, timeout);

      const checkCall = () => {
        if (this.wasCallMade(endpoint)) {
          clearTimeout(timeoutId);
          resolve();
        } else {
          setTimeout(checkCall, 50);
        }
      };

      checkCall();
    });
  }
}

/**
 * Mock WebSocket Manager for integration testing
 */
export class MockWebSocketManager {
  private connections: Map<string, any> = new Map();
  private messageHistory: any[] = [];
  private isConnected: boolean = false;

  async initialize(): Promise<void> {
    // Initialize mock WebSocket infrastructure
  }

  async cleanup(): Promise<void> {
    // Cleanup mock WebSocket infrastructure
  }

  reset(): void {
    this.connections.clear();
    this.messageHistory = [];
    this.isConnected = false;
  }

  sendMessage(type: string, data: any): void {
    const message = { type, data, timestamp: Date.now() };
    this.messageHistory.push(message);
    // Simulate message sending to connected clients
  }

  simulateDisconnect(): void {
    this.isConnected = false;
    // Simulate disconnect events
  }

  simulateReconnect(): void {
    this.isConnected = true;
    // Simulate reconnect events
  }

  simulateError(error: Error): void {
    // Simulate WebSocket errors
  }

  wasMessageSent(type: string): boolean {
    return this.messageHistory.some(msg => msg.type === type);
  }

  async waitForMessage(type: string, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`WebSocket message ${type} not received within ${timeout}ms`));
      }, timeout);

      const checkMessage = () => {
        const message = this.messageHistory.find(msg => msg.type === type);
        if (message) {
          clearTimeout(timeoutId);
          resolve(message);
        } else {
          setTimeout(checkMessage, 50);
        }
      };

      checkMessage();
    });
  }
}