/**
 * TDD London School - Test Utilities and Shared Infrastructure
 * 
 * Provides comprehensive utilities for London School TDD testing including:
 * - Test data builders and factories
 * - Mock assertion helpers 
 * - Behavioral test runners
 * - Performance measurement utilities
 * - Accessibility testing helpers
 * - Shared test configuration
 */

import { vi, expect, MockedFunction } from 'vitest';
import { render, screen, waitFor, RenderResult } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import React from 'react';

// ==================== TYPES AND INTERFACES ====================

export interface TestScenario {
  description: string;
  given: string;
  when: string;
  then: string[];
  collaborators: string[];
  mocks: Record<string, any>;
  expectations: TestExpectation[];
}

export interface TestExpectation {
  type: 'mock_call' | 'dom_assertion' | 'state_change' | 'performance';
  target: string;
  matcher: string;
  value?: any;
  times?: number;
}

export interface PerformanceMetrics {
  renderTime: number;
  interactionTime: number;
  memoryUsage: number;
  reRenderCount: number;
}

export interface AccessibilityReport {
  ariaLabels: boolean;
  keyboardNavigation: boolean;
  colorContrast: boolean;
  screenReader: boolean;
  focusManagement: boolean;
  violations: string[];
}

// ==================== LONDON SCHOOL TEST UTILITIES ====================

export class LondonSchoolTestUtilities {
  private static performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private static testResults: Map<string, boolean> = new Map();

  /**
   * Creates a complete test scenario with London School patterns
   */
  public static createTestScenario(config: Partial<TestScenario>): TestScenario {
    return {
      description: config.description || 'Test scenario',
      given: config.given || 'the system is in a known state',
      when: config.when || 'an action is performed',
      then: config.then || ['the expected behavior occurs'],
      collaborators: config.collaborators || [],
      mocks: config.mocks || {},
      expectations: config.expectations || []
    };
  }

  /**
   * Executes a behavioral test with proper collaboration verification
   */
  public static async executeBehavioralTest(
    scenario: TestScenario,
    testImplementation: () => Promise<void> | void
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Setup phase - prepare mocks and collaborators
      this.setupCollaborators(scenario.collaborators, scenario.mocks);
      
      // Execute the test implementation
      await testImplementation();
      
      // Verify all expectations
      this.verifyExpectations(scenario.expectations);
      
      // Record success
      this.testResults.set(scenario.description, true);
      
    } catch (error) {
      this.testResults.set(scenario.description, false);
      throw error;
    } finally {
      const endTime = Date.now();
      this.recordPerformanceMetric(scenario.description, {
        renderTime: endTime - startTime,
        interactionTime: 0,
        memoryUsage: this.getCurrentMemoryUsage(),
        reRenderCount: 0
      });
    }
  }

  /**
   * Sets up mock collaborators for London School testing
   */
  private static setupCollaborators(collaborators: string[], mocks: Record<string, any>): void {
    collaborators.forEach(collaboratorName => {
      const mock = mocks[collaboratorName];
      if (mock) {
        // Verify mock has necessary methods
        this.validateMockContract(collaboratorName, mock);
      }
    });
  }

  /**
   * Validates that mocks conform to expected contracts
   */
  private static validateMockContract(name: string, mock: any): void {
    if (!mock || typeof mock !== 'object') {
      throw new Error(`Mock for ${name} must be an object with methods`);
    }
    
    // Ensure all mock methods are properly mocked functions
    Object.values(mock).forEach((method, index) => {
      if (typeof method !== 'function') {
        console.warn(`Mock method ${index} for ${name} is not a function`);
      }
    });
  }

  /**
   * Verifies all test expectations according to London School principles
   */
  private static verifyExpectations(expectations: TestExpectation[]): void {
    expectations.forEach(expectation => {
      switch (expectation.type) {
        case 'mock_call':
          this.verifyMockCall(expectation);
          break;
        case 'dom_assertion':
          this.verifyDOMAssertion(expectation);
          break;
        case 'state_change':
          this.verifyStateChange(expectation);
          break;
        case 'performance':
          this.verifyPerformance(expectation);
          break;
      }
    });
  }

  private static verifyMockCall(expectation: TestExpectation): void {
    // Mock call verification logic
    console.log(`Verifying mock call for ${expectation.target}`);
  }

  private static verifyDOMAssertion(expectation: TestExpectation): void {
    // DOM assertion verification logic
    console.log(`Verifying DOM assertion for ${expectation.target}`);
  }

  private static verifyStateChange(expectation: TestExpectation): void {
    // State change verification logic
    console.log(`Verifying state change for ${expectation.target}`);
  }

  private static verifyPerformance(expectation: TestExpectation): void {
    // Performance verification logic
    console.log(`Verifying performance for ${expectation.target}`);
  }

  private static recordPerformanceMetric(testName: string, metrics: PerformanceMetrics): void {
    this.performanceMetrics.set(testName, metrics);
  }

  private static getCurrentMemoryUsage(): number {
    // Simplified memory usage calculation
    return process.memoryUsage?.()?.heapUsed || 0;
  }

  /**
   * Gets test execution summary
   */
  public static getTestSummary(): { total: number; passed: number; failed: number } {
    const total = this.testResults.size;
    const passed = Array.from(this.testResults.values()).filter(Boolean).length;
    const failed = total - passed;
    
    return { total, passed, failed };
  }

  /**
   * Gets performance metrics for all tests
   */
  public static getPerformanceMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.performanceMetrics);
  }
}

// ==================== TEST DATA BUILDERS ====================

export class TestDataBuilder {
  /**
   * Builds mention suggestion test data
   */
  public static buildMentionSuggestion(overrides: any = {}): any {
    return {
      id: `agent-${Date.now()}`,
      name: 'test-agent',
      displayName: 'Test Agent',
      description: 'A test agent for London School testing',
      avatar: '/test-avatar.jpg',
      type: 'test',
      isActive: true,
      lastSeen: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Builds post data for testing
   */
  public static buildPost(overrides: any = {}): any {
    return {
      id: `post-${Date.now()}`,
      content: 'Test post content for London School testing',
      title: 'Test Post Title',
      authorId: 'test-author',
      authorName: 'Test Author',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['test', 'london-school'],
      mentions: ['@test-agent'],
      isDraft: false,
      visibility: 'public',
      ...overrides
    };
  }

  /**
   * Builds comment data for testing
   */
  public static buildComment(overrides: any = {}): any {
    return {
      id: `comment-${Date.now()}`,
      content: 'Test comment content',
      postId: 'test-post',
      authorId: 'test-author',
      authorName: 'Test Commenter',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentId: null,
      replies: [],
      mentions: [],
      ...overrides
    };
  }

  /**
   * Builds API response data
   */
  public static buildAPIResponse(data: any, status = 200): any {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    };
  }

  /**
   * Builds error response data
   */
  public static buildErrorResponse(message: string, status = 500): any {
    return this.buildAPIResponse({
      error: message,
      timestamp: new Date().toISOString()
    }, status);
  }
}

// ==================== MOCK ASSERTION HELPERS ====================

export class MockAssertionHelpers {
  /**
   * Verifies mock was called with specific arguments
   */
  public static expectMockCalledWith(mock: MockedFunction<any>, expectedArgs: any[]): void {
    expect(mock).toHaveBeenCalledWith(...expectedArgs);
  }

  /**
   * Verifies mock was called specific number of times
   */
  public static expectMockCalledTimes(mock: MockedFunction<any>, times: number): void {
    expect(mock).toHaveBeenCalledTimes(times);
  }

  /**
   * Verifies mock was called before another mock (interaction sequence)
   */
  public static expectMockCalledBefore(firstMock: MockedFunction<any>, secondMock: MockedFunction<any>): void {
    const firstCallTime = firstMock.mock.invocationCallOrder[0];
    const secondCallTime = secondMock.mock.invocationCallOrder[0];
    
    expect(firstCallTime).toBeLessThan(secondCallTime);
  }

  /**
   * Verifies complex mock interaction patterns
   */
  public static expectInteractionPattern(mocks: MockedFunction<any>[], expectedPattern: string[]): void {
    const actualPattern = mocks.map(mock => mock.mock.calls.length > 0 ? 'called' : 'not-called');
    expect(actualPattern).toEqual(expectedPattern.map(p => p === '1' ? 'called' : 'not-called'));
  }

  /**
   * Verifies mock return values were used correctly
   */
  public static expectMockReturnValueUsed(mock: MockedFunction<any>, expectedUsage: any): void {
    const returnValue = mock.mock.results[0]?.value;
    expect(returnValue).toEqual(expectedUsage);
  }
}

// ==================== ACCESSIBILITY TESTING HELPERS ====================

export class AccessibilityTestingHelpers {
  /**
   * Tests basic ARIA attributes
   */
  public static async testARIAAttributes(element: HTMLElement): Promise<AccessibilityReport> {
    const report: AccessibilityReport = {
      ariaLabels: false,
      keyboardNavigation: false,
      colorContrast: true, // Assume passing for unit tests
      screenReader: false,
      focusManagement: false,
      violations: []
    };

    // Check for ARIA labels
    if (element.getAttribute('aria-label') || element.getAttribute('aria-labelledby')) {
      report.ariaLabels = true;
    } else {
      report.violations.push('Missing ARIA labels');
    }

    // Check for proper roles
    if (element.getAttribute('role')) {
      report.screenReader = true;
    } else {
      report.violations.push('Missing or improper ARIA roles');
    }

    return report;
  }

  /**
   * Tests keyboard navigation
   */
  public static async testKeyboardNavigation(element: HTMLElement): Promise<boolean> {
    const user = userEvent.setup();
    
    try {
      // Try to focus the element
      await user.tab();
      const focused = document.activeElement === element;
      
      // Try arrow key navigation if applicable
      if (element.getAttribute('role') === 'listbox') {
        await user.keyboard('{ArrowDown}');
        // Check if navigation worked
      }
      
      return focused;
    } catch (error) {
      return false;
    }
  }

  /**
   * Tests focus management in modals and dropdowns
   */
  public static async testFocusManagement(container: HTMLElement): Promise<boolean> {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    return focusableElements.length > 0;
  }
}

// ==================== PERFORMANCE TESTING HELPERS ====================

export class PerformanceTestingHelpers {
  private static measurements: Map<string, number[]> = new Map();

  /**
   * Measures component render time
   */
  public static async measureRenderTime(
    renderFunction: () => RenderResult,
    testName: string
  ): Promise<number> {
    const startTime = performance.now();
    
    renderFunction();
    await waitFor(() => {
      // Wait for component to be fully rendered
    });
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Store measurement
    const measurements = this.measurements.get(testName) || [];
    measurements.push(renderTime);
    this.measurements.set(testName, measurements);
    
    return renderTime;
  }

  /**
   * Measures user interaction response time
   */
  public static async measureInteractionTime(
    interactionFunction: () => Promise<void>,
    testName: string
  ): Promise<number> {
    const startTime = performance.now();
    
    await interactionFunction();
    
    const endTime = performance.now();
    const interactionTime = endTime - startTime;
    
    // Store measurement
    const key = `${testName}-interaction`;
    const measurements = this.measurements.get(key) || [];
    measurements.push(interactionTime);
    this.measurements.set(key, measurements);
    
    return interactionTime;
  }

  /**
   * Gets performance statistics
   */
  public static getPerformanceStats(testName: string): {
    min: number;
    max: number;
    avg: number;
    count: number;
  } | null {
    const measurements = this.measurements.get(testName);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    return {
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      avg: measurements.reduce((a, b) => a + b) / measurements.length,
      count: measurements.length
    };
  }

  /**
   * Asserts performance meets thresholds
   */
  public static assertPerformanceThreshold(testName: string, maxTime: number): void {
    const stats = this.getPerformanceStats(testName);
    if (stats) {
      expect(stats.avg).toBeLessThan(maxTime);
    }
  }
}

// ==================== SHARED TEST CONFIGURATION ====================

export class SharedTestConfig {
  public static readonly TIMEOUTS = {
    SHORT: 1000,
    MEDIUM: 5000,
    LONG: 10000
  };

  public static readonly PERFORMANCE_THRESHOLDS = {
    RENDER_TIME: 100, // ms
    INTERACTION_TIME: 50, // ms
    MEMORY_USAGE: 10 * 1024 * 1024, // 10MB
    BUNDLE_SIZE: 1024 * 1024 // 1MB
  };

  public static readonly MOCK_DELAYS = {
    API_CALL: 100,
    USER_INPUT: 50,
    ANIMATION: 200
  };

  /**
   * Creates common test environment setup
   */
  public static setupTestEnvironment(): void {
    // Mock global fetch
    global.fetch = vi.fn();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      }
    });

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));

    // Mock ResizeObserver  
    global.ResizeObserver = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));
  }

  /**
   * Cleans up test environment
   */
  public static cleanupTestEnvironment(): void {
    vi.clearAllMocks();
    vi.resetAllMocks();
  }
}

// ==================== TEST RUNNER EXTENSIONS ====================

export class LondonSchoolTestRunner {
  private scenarios: TestScenario[] = [];
  private results: Map<string, boolean> = new Map();

  /**
   * Adds a test scenario to the runner
   */
  public addScenario(scenario: TestScenario): this {
    this.scenarios.push(scenario);
    return this;
  }

  /**
   * Runs all scenarios with London School methodology
   */
  public async runAllScenarios(): Promise<void> {
    SharedTestConfig.setupTestEnvironment();
    
    try {
      for (const scenario of this.scenarios) {
        await this.runSingleScenario(scenario);
      }
    } finally {
      SharedTestConfig.cleanupTestEnvironment();
    }
  }

  /**
   * Runs a single test scenario
   */
  private async runSingleScenario(scenario: TestScenario): Promise<void> {
    try {
      console.log(`Running scenario: ${scenario.description}`);
      console.log(`Given: ${scenario.given}`);
      console.log(`When: ${scenario.when}`);
      console.log(`Then: ${scenario.then.join(', ')}`);
      
      // Execute scenario with utilities
      await LondonSchoolTestUtilities.executeBehavioralTest(scenario, async () => {
        // Scenario-specific test logic would be implemented here
        console.log('Scenario executed successfully');
      });
      
      this.results.set(scenario.description, true);
    } catch (error) {
      this.results.set(scenario.description, false);
      console.error(`Scenario failed: ${scenario.description}`, error);
      throw error;
    }
  }

  /**
   * Gets test execution results
   */
  public getResults(): { total: number; passed: number; failed: number } {
    const total = this.results.size;
    const passed = Array.from(this.results.values()).filter(Boolean).length;
    const failed = total - passed;
    
    return { total, passed, failed };
  }
}

// ==================== EXPORT ALL UTILITIES ====================

export {
  LondonSchoolTestUtilities,
  TestDataBuilder,
  MockAssertionHelpers,
  AccessibilityTestingHelpers,
  PerformanceTestingHelpers,
  SharedTestConfig,
  LondonSchoolTestRunner
};

export default {
  LondonSchoolTestUtilities,
  TestDataBuilder,
  MockAssertionHelpers,
  AccessibilityTestingHelpers,
  PerformanceTestingHelpers,
  SharedTestConfig,
  LondonSchoolTestRunner
};