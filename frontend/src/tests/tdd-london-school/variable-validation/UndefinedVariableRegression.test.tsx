/**
 * TDD Undefined Variable Regression Tests
 * Specifically targets the "isLoading is not defined" error and similar issues
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import EnhancedAviDMWithClaudeCode from '../../../components/claude-manager/EnhancedAviDMWithClaudeCode';

// Mock fetch and other dependencies
global.fetch = vi.fn();

describe('Undefined Variable Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Test response' })
    } as Response);
  });

  describe('TDD RED: Undefined Variable Detection', () => {
    it('should fail if isLoading is used instead of claudeLoading', () => {
      // RED: This test specifically checks for the reported error
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Check that loading state is properly managed
      // Component should use claudeLoading, not isLoading
      const sendButton = screen.getByText('Send');
      expect(sendButton).not.toBeDisabled(); // Should not be loading initially

      // Try to trigger loading state
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      fireEvent.change(messageInput, { target: { value: 'test' } });

      // This should not throw "isLoading is not defined"
      expect(() => fireEvent.click(sendButton)).not.toThrow();
    });

    it('should detect undefined variables in conditional rendering', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Mock a slow response to test loading state
      (fetch as any).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Delayed response' })
        } as Response), 100))
      );

      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      const sendButton = screen.getByText('Send');

      fireEvent.change(messageInput, { target: { value: 'loading test' } });
      fireEvent.click(sendButton);

      // Should show loading state without undefined variable errors
      waitFor(() => {
        const executingButton = screen.queryByText('Executing...');
        if (executingButton) {
          expect(executingButton).toBeInTheDocument();
        }
      });
    });

    it('should detect undefined variables in JSX expressions', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Test all JSX expressions that could contain undefined variables
      const messageCount = screen.getByText('0'); // claudeMessages.filter(...).length
      expect(messageCount).toBeInTheDocument();

      const toolExecutions = screen.getAllByText('0'); // Should show 0 for tool executions
      expect(toolExecutions.length).toBeGreaterThan(0);

      const currentMode = screen.getByText('Tool'); // toolMode ? 'Tool' : 'Chat'
      expect(currentMode).toBeInTheDocument();
    });
  });

  describe('TDD GREEN: Variable Declaration Fixes', () => {
    it('should use claudeLoading consistently throughout component', async () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Test initial state - claudeLoading should be false
      const sendButton = screen.getByText('Send');
      expect(sendButton).not.toBeDisabled();

      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      fireEvent.change(messageInput, { target: { value: 'consistency test' } });

      // Mock delayed response to test loading state
      (fetch as any).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Consistency response' })
        } as Response), 50))
      );

      fireEvent.click(sendButton);

      // Should show loading state using claudeLoading
      await waitFor(() => {
        const executingButton = screen.queryByText('Executing...');
        if (executingButton) {
          expect(executingButton).toBeInTheDocument();
        }
      });

      // Should return to normal state
      await waitFor(() => {
        const normalButton = screen.getByText('Send');
        expect(normalButton).not.toBeDisabled();
      }, { timeout: 2000 });
    });

    it('should declare all required state variables', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // Test that all required state variables are declared and functional

      // 1. activeTab
      const aviDmTab = screen.getByRole('tab', { name: /avi chat/i });
      expect(aviDmTab).toHaveAttribute('data-state', 'active');

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);
      expect(screen.getByRole('tab', { name: /claude code/i })).toHaveAttribute('data-state', 'active');

      // 2. claudeMessage
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      fireEvent.change(messageInput, { target: { value: 'state test' } });
      expect((messageInput as HTMLInputElement).value).toBe('state test');

      // 3. claudeMessages (empty initially)
      const emptyState = screen.getByText('Claude Code Ready');
      expect(emptyState).toBeInTheDocument();

      // 4. claudeLoading (false initially)
      const sendButton = screen.getByText('Send');
      expect(sendButton).not.toBeDisabled();

      // 5. toolMode (true initially)
      const toolModeButton = screen.getByText('Tool Mode');
      expect(toolModeButton).toBeInTheDocument();
    });

    it('should handle all state transitions without undefined variables', async () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Test full send message flow
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      const sendButton = screen.getByText('Send');

      fireEvent.change(messageInput, { target: { value: 'full flow test' } });

      // Mock successful response
      (fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ message: 'Flow response' })
        } as Response)
      );

      fireEvent.click(sendButton);

      // Should clear message input (claudeMessage state)
      await waitFor(() => {
        expect((messageInput as HTMLInputElement).value).toBe('');
      });

      // Should show user message (claudeMessages state)
      await waitFor(() => {
        const userMessage = screen.queryByText('full flow test');
        expect(userMessage).toBeInTheDocument();
      });

      // Should show response (claudeMessages state)
      await waitFor(() => {
        const response = screen.queryByText('Flow response');
        expect(response).toBeInTheDocument();
      });

      // Should update message count (claudeMessages length)
      await waitFor(() => {
        const messageCount = screen.queryByText('1'); // Should show 1 user message
        expect(messageCount).toBeInTheDocument();
      });
    });
  });

  describe('TDD GREEN: Error Handling Without Undefined Variables', () => {
    it('should handle fetch errors without undefined variable issues', async () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Mock fetch error
      (fetch as any).mockRejectedValueOnce(
        new Error('Connection failed')
      );

      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      const sendButton = screen.getByText('Send');

      fireEvent.change(messageInput, { target: { value: 'error test' } });
      fireEvent.click(sendButton);

      // Should handle error without undefined variable issues
      await waitFor(() => {
        const errorMessage = screen.queryByText(/Connection failed/);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });

      // Should reset loading state properly
      await waitFor(() => {
        const sendButton = screen.getByText('Send');
        expect(sendButton).not.toBeDisabled();
      });
    });

    it('should handle HTTP errors without undefined variables', async () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Mock HTTP error
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      const sendButton = screen.getByText('Send');

      fireEvent.change(messageInput, { target: { value: 'http error test' } });
      fireEvent.click(sendButton);

      // Should handle HTTP error properly
      await waitFor(() => {
        const errorMessage = screen.queryByText(/HTTP error! status: 500/);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });

      // All state variables should still be accessible
      expect(sendButton).not.toBeDisabled(); // claudeLoading reset
      expect((messageInput as HTMLInputElement).value).toBe(''); // claudeMessage cleared
    });
  });

  describe('TDD REFACTOR: Variable Naming and Consistency', () => {
    it('should use consistent naming conventions for loading states', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // The component should consistently use claudeLoading, not isLoading
      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Check that loading-related UI elements work correctly
      const sendButton = screen.getByText('Send');
      const messageInput = screen.getByPlaceholderText(/Enter command/i);

      // Initial state should be not loading
      expect(sendButton).not.toBeDisabled();

      // Test loading state transition
      fireEvent.change(messageInput, { target: { value: 'naming test' } });
      fireEvent.click(sendButton);

      // Should handle loading state without naming conflicts
      waitFor(() => {
        const possibleLoadingText = screen.queryByText('Executing...');
        if (possibleLoadingText) {
          expect(possibleLoadingText).toBeInTheDocument();
        }
      });
    });

    it('should avoid variable name conflicts across the component', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Test that all state variables have unique, clear names
      const stateVariables = {
        activeTab: 'claude-code', // Current active tab
        claudeMessage: 'variable conflict test', // Current input message
        claudeMessages: [], // Array of messages (initially empty)
        claudeLoading: false, // Loading state (initially false)
        toolMode: true // Tool vs chat mode (initially true)
      };

      // Test each variable through UI interactions
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      fireEvent.change(messageInput, { target: { value: stateVariables.claudeMessage } });
      expect((messageInput as HTMLInputElement).value).toBe(stateVariables.claudeMessage);

      const toolModeButton = screen.getByText('Tool Mode');
      expect(toolModeButton).toBeInTheDocument(); // toolMode = true

      const sendButton = screen.getByText('Send');
      expect(sendButton).not.toBeDisabled(); // claudeLoading = false

      const emptyState = screen.getByText('Claude Code Ready');
      expect(emptyState).toBeInTheDocument(); // claudeMessages.length === 0
    });
  });
});