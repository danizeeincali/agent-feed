/**
 * TDD Variable Validation Test Suite Index
 *
 * This module exports all TDD tests for variable validation in the EnhancedAviDMWithClaudeCode component.
 *
 * Test Categories:
 * - Variable Declaration: Ensures all used variables are properly declared
 * - Scope Validation: Tests variable accessibility within component scope
 * - State Management: Verifies useState declarations for loading states
 * - JSX Reference: Checks all JSX references have corresponding declarations
 * - Import Validation: Verifies imported variables are available
 * - Undefined Variable Regression: Specific tests for the "isLoading is not defined" error
 */

import { vi } from 'vitest';

// Main test files
export * from './EnhancedAviDMVariableDeclaration.test';
export * from './ScopeValidation.test';
export * from './StateManagement.test';
export * from './JSXReference.test';
export * from './ImportValidation.test';
export * from './UndefinedVariableRegression.test';

// Test utilities and helpers
export const TEST_CONSTANTS = {
  COMPONENT_NAME: 'EnhancedAviDMWithClaudeCode',
  EXPECTED_STATE_VARIABLES: [
    'activeTab',
    'claudeMessage',
    'claudeMessages',
    'claudeLoading',
    'toolMode'
  ],
  EXPECTED_IMPORTS: [
    'React',
    'useState',
    'Tabs',
    'Card',
    'Badge',
    'Button',
    'Alert',
    'lucide-react icons',
    'StreamingTickerWorking',
    'cn utility'
  ],
  COMMON_UNDEFINED_VARIABLES: [
    'isLoading', // Should be claudeLoading
    'loading',   // Should be claudeLoading
    'messages',  // Should be claudeMessages
    'message',   // Should be claudeMessage
    'mode',      // Should be toolMode
    'tab'        // Should be activeTab
  ]
} as const;

export const TEST_HELPERS = {
  /**
   * Helper to simulate navigation to Claude Code tab
   */
  navigateToClaudeCodeTab: (screen: any, fireEvent: any) => {
    const claudeCodeTab = screen.getByText('Claude Code');
    fireEvent.click(claudeCodeTab);
    return {
      messageInput: screen.getByPlaceholderText(/Enter command/i),
      sendButton: screen.getByText('Send'),
      toolModeButton: screen.getByText('Tool Mode')
    };
  },

  /**
   * Helper to send a test message
   */
  sendTestMessage: async (screen: any, fireEvent: any, message: string) => {
    const { messageInput, sendButton } = TEST_HELPERS.navigateToClaudeCodeTab(screen, fireEvent);
    fireEvent.change(messageInput, { target: { value: message } });
    fireEvent.click(sendButton);
  },

  /**
   * Helper to mock fetch responses
   */
  mockFetchResponse: (response: any) => {
    return vi.fn().mockResolvedValue({
      ok: true,
      json: async () => response
    } as Response);
  },

  /**
   * Helper to mock fetch errors
   */
  mockFetchError: (error: Error) => {
    return vi.fn().mockRejectedValue(error);
  }
} as const;

/**
 * Test suite configuration
 */
export const VARIABLE_VALIDATION_CONFIG = {
  testTimeout: 10000,
  retryAttempts: 3,
  mockDefaults: {
    fetch: {
      ok: true,
      json: async () => ({ message: 'Test response' })
    },
    StreamingTickerWorking: {
      enabled: true,
      demo: true,
      userId: 'agent-feed-user',
      maxMessages: 5
    }
  }
} as const;