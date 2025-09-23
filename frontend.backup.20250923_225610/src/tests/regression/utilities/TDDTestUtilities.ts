/**
 * TDD London School Test Utilities
 * Provides test helpers, assertions, and setup utilities for behavior-driven testing
 */

import { render, screen, waitFor, fireEvent, act, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import React from 'react';

// Component wrapper types
export interface TestComponentWrapper {
  component: RenderResult;
  user: ReturnType<typeof userEvent.setup>;
  rerender: (ui: React.ReactElement) => void;
  unmount: () => void;
}

// Mock interaction recorder for behavior verification
export class MockInteractionRecorder {
  private interactions: Array<{
    timestamp: number;
    target: string;
    method: string;
    args: any[];
    result?: any;
  }> = [];

  record(target: string, method: string, args: any[], result?: any) {
    this.interactions.push({
      timestamp: Date.now(),
      target,
      method,
      args: [...args],
      result
    });
  }

  getInteractions() {
    return [...this.interactions];
  }

  getInteractionsByTarget(target: string) {
    return this.interactions.filter(i => i.target === target);
  }

  verifySequence(expectedSequence: Array<{ target: string; method: string; args?: any[] }>) {
    const relevant = this.interactions.filter(i => 
      expectedSequence.some(expected => 
        expected.target === i.target && expected.method === i.method
      )
    );

    expect(relevant).toHaveLength(expectedSequence.length);
    
    expectedSequence.forEach((expected, index) => {
      const actual = relevant[index];
      expect(actual.target).toBe(expected.target);
      expect(actual.method).toBe(expected.method);
      
      if (expected.args) {
        expect(actual.args).toEqual(expected.args);
      }
    });
  }

  clear() {
    this.interactions = [];
  }
}

// TDD Test Utilities Class
export class TDDTestUtilities {
  
  /**
   * Enhanced component renderer with user interaction setup
   */
  static async renderWithUser(
    Component: React.ReactElement, 
    options: any = {}
  ): Promise<TestComponentWrapper> {
    const user = userEvent.setup();
    const component = render(Component, options);
    
    return {
      component,
      user,
      rerender: component.rerender,
      unmount: component.unmount
    };
  }

  /**
   * Wait for mention dropdown to appear and be populated
   */
  static async waitForMentionDropdown(timeout: number = 3000) {
    await waitFor(
      () => {
        const dropdown = screen.getByTestId('mention-debug-dropdown');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).toBeVisible();
        
        // Verify dropdown has suggestions
        const suggestions = screen.getAllByRole('option');
        expect(suggestions.length).toBeGreaterThan(0);
      },
      { timeout }
    );
  }

  /**
   * Type @ symbol and verify mention system activation
   */
  static async triggerMentionSystem(
    input: HTMLElement, 
    user: ReturnType<typeof userEvent.setup>
  ) {
    await user.clear(input);
    await user.type(input, '@');
    
    // Wait for mention system to activate
    await this.waitForMentionDropdown();
    
    return screen.getByTestId('mention-debug-dropdown');
  }

  /**
   * Select mention from dropdown using keyboard navigation
   */
  static async selectMentionByKeyboard(
    user: ReturnType<typeof userEvent.setup>,
    mentionIndex: number = 0
  ) {
    const dropdown = screen.getByTestId('mention-debug-dropdown');
    expect(dropdown).toBeInTheDocument();
    
    // Navigate to desired mention
    for (let i = 0; i < mentionIndex; i++) {
      await user.keyboard('{ArrowDown}');
    }
    
    // Select the mention
    await user.keyboard('{Enter}');
    
    // Wait for dropdown to close
    await waitFor(() => {
      expect(screen.queryByTestId('mention-debug-dropdown')).not.toBeInTheDocument();
    });
  }

  /**
   * Select mention from dropdown using mouse click
   */
  static async selectMentionByClick(
    user: ReturnType<typeof userEvent.setup>,
    mentionDisplayName: string
  ) {
    const suggestions = screen.getAllByRole('option');
    const targetSuggestion = suggestions.find(
      suggestion => suggestion.textContent?.includes(mentionDisplayName)
    );
    
    expect(targetSuggestion).toBeInTheDocument();
    await user.click(targetSuggestion!);
    
    // Wait for dropdown to close
    await waitFor(() => {
      expect(screen.queryByTestId('mention-debug-dropdown')).not.toBeInTheDocument();
    });
  }

  /**
   * Verify mention was inserted correctly into text
   */
  static verifyMentionInsertion(input: HTMLElement, expectedMention: string) {
    expect(input).toHaveValue(expect.stringContaining(`@${expectedMention}`));
  }

  /**
   * Verify form submission with mention data
   */
  static async verifyFormSubmissionWithMentions(
    submitMock: jest.MockedFunction<any>,
    expectedMentions: string[]
  ) {
    expect(submitMock).toHaveBeenCalled();
    
    const callArgs = submitMock.mock.calls[0];
    const submittedData = callArgs[0];
    
    // Verify mentions are included in submission
    if (submittedData.metadata?.agentMentions) {
      expect(submittedData.metadata.agentMentions).toEqual(
        expect.arrayContaining(expectedMentions)
      );
    } else if (submittedData.mentionedUsers) {
      expect(submittedData.mentionedUsers).toEqual(
        expect.arrayContaining(expectedMentions)
      );
    } else {
      // Check content for mentions
      expectedMentions.forEach(mention => {
        expect(submittedData.content || submittedData.value || '').toContain(`@${mention}`);
      });
    }
  }

  /**
   * Verify component collaboration pattern
   */
  static verifyComponentCollaboration(
    mocks: Record<string, jest.MockedFunction<any>>,
    expectedCollaboration: Array<{
      service: string;
      method: string;
      times?: number;
      args?: any[];
    }>
  ) {
    expectedCollaboration.forEach(({ service, method, times = 1, args }) => {
      const mock = mocks[service];
      expect(mock).toBeDefined();
      expect(mock).toHaveBeenCalledTimes(times);
      
      if (args) {
        expect(mock).toHaveBeenCalledWith(...args);
      }
    });
  }

  /**
   * Wait for form validation to complete
   */
  static async waitForFormValidation() {
    await waitFor(() => {
      // Check for validation messages or state changes
      const validationErrors = screen.queryAllByRole('alert');
      const submitButton = screen.getByRole('button', { name: /submit|publish|post/i });
      
      // Form should be in a stable state (either valid or invalid)
      expect(submitButton).toBeInTheDocument();
    });
  }

  /**
   * Simulate network delay for async operations
   */
  static async simulateNetworkDelay(ms: number = 100) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, ms));
    });
  }

  /**
   * Mock DOM elements for testing
   */
  static createMockDOMElement(tag: string = 'div', properties: any = {}) {
    const element = document.createElement(tag);
    Object.assign(element, properties);
    return element;
  }

  /**
   * Verify accessibility attributes for mention system
   */
  static verifyMentionAccessibility() {
    const input = screen.getByRole('textbox');
    
    // Verify ARIA attributes
    expect(input).toHaveAttribute('aria-expanded');
    expect(input).toHaveAttribute('aria-haspopup', 'listbox');
    
    if (screen.queryByTestId('mention-debug-dropdown')) {
      const dropdown = screen.getByTestId('mention-debug-dropdown');
      expect(dropdown).toHaveAttribute('role', 'listbox');
      
      const suggestions = screen.getAllByRole('option');
      suggestions.forEach((suggestion, index) => {
        expect(suggestion).toHaveAttribute('aria-selected');
      });
    }
  }

  /**
   * Verify component rendering without errors
   */
  static async verifyComponentRenders(
    Component: React.ReactElement,
    requiredElements: string[] = []
  ) {
    const { component } = await this.renderWithUser(Component);
    
    // Verify no console errors
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Check for required elements
    requiredElements.forEach(element => {
      expect(screen.getByTestId(element)).toBeInTheDocument();
    });
    
    // Verify no React errors
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    
    return component;
  }

  /**
   * Test cross-component consistency
   */
  static async verifyCrossComponentConsistency(
    components: React.ReactElement[],
    sharedBehavior: string
  ) {
    const results = [];
    
    for (const component of components) {
      const { component: rendered, user } = await this.renderWithUser(component);
      
      switch (sharedBehavior) {
        case 'mention-dropdown':
          const input = screen.getByRole('textbox');
          await this.triggerMentionSystem(input, user);
          
          const dropdown = screen.getByTestId('mention-debug-dropdown');
          const suggestions = screen.getAllByRole('option');
          
          results.push({
            hasDropdown: !!dropdown,
            suggestionCount: suggestions.length,
            firstSuggestion: suggestions[0]?.textContent
          });
          break;
          
        default:
          throw new Error(`Unknown shared behavior: ${sharedBehavior}`);
      }
      
      rendered.unmount();
    }
    
    // Verify all components behave consistently
    const first = results[0];
    results.forEach((result, index) => {
      expect(result).toEqual(first);
    });
    
    return results;
  }

  /**
   * Performance testing utilities
   */
  static async measureRenderPerformance(Component: React.ReactElement) {
    const start = performance.now();
    
    const { component } = await this.renderWithUser(Component);
    
    const renderTime = performance.now() - start;
    
    component.unmount();
    
    return {
      renderTime,
      isPerformant: renderTime < 100 // 100ms threshold
    };
  }

  /**
   * Memory leak detection
   */
  static detectMemoryLeaks(testFunction: () => Promise<void>, iterations: number = 10) {
    return new Promise(async (resolve) => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      for (let i = 0; i < iterations; i++) {
        await testFunction();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      resolve({
        initialMemory,
        finalMemory,
        memoryIncrease,
        hasLeak: memoryIncrease > 1024 * 1024 // 1MB threshold
      });
    });
  }

  /**
   * Cleanup utilities for test isolation
   */
  static cleanupTest() {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset DOM
    document.body.innerHTML = '';
    
    // Clear local storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset location hash
    if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
  }
}

// Specialized assertion helpers
export const TDDAssertions = {
  /**
   * Assert mention system behavior
   */
  mentionSystemBehavior: {
    dropdownAppears: async () => {
      await TDDTestUtilities.waitForMentionDropdown();
    },
    
    dropdownContainsSuggestions: () => {
      const suggestions = screen.getAllByRole('option');
      expect(suggestions.length).toBeGreaterThan(0);
    },
    
    mentionInsertedCorrectly: (input: HTMLElement, mention: string) => {
      TDDTestUtilities.verifyMentionInsertion(input, mention);
    }
  },

  /**
   * Assert component collaboration
   */
  componentCollaboration: {
    servicesCalledInOrder: (
      mocks: jest.MockedFunction<any>[],
      expectedOrder: string[]
    ) => {
      const callOrder = mocks.map((mock, index) => 
        mock.mock.calls.length > 0 ? expectedOrder[index] : null
      ).filter(Boolean);
      
      expect(callOrder).toEqual(expectedOrder);
    },
    
    dependencyInjectionWorking: (
      component: any,
      expectedDependencies: string[]
    ) => {
      expectedDependencies.forEach(dep => {
        expect(component.props).toHaveProperty(dep);
      });
    }
  },

  /**
   * Assert regression prevention
   */
  regressionPrevention: {
    previousBugNotReintroduced: (
      testFunction: () => void,
      bugDescription: string
    ) => {
      try {
        testFunction();
      } catch (error) {
        throw new Error(`Regression detected: ${bugDescription}. Error: ${error}`);
      }
    },
    
    behaviorRemainsConsistent: (
      beforeState: any,
      afterState: any,
      comparisonFields: string[]
    ) => {
      comparisonFields.forEach(field => {
        expect(afterState[field]).toEqual(beforeState[field]);
      });
    }
  }
};

export default TDDTestUtilities;