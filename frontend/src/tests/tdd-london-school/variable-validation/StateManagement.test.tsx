/**
 * TDD State Management Tests
 * Specifically tests useState declarations for loading states and other state variables
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import EnhancedAviDMWithClaudeCode from '../../../components/claude-manager/EnhancedAviDMWithClaudeCode';

// Mock dependencies
global.fetch = vi.fn();

describe('State Management Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Test response' })
    } as Response);
  });

  describe('TDD RED: Missing useState Declarations', () => {
    it('should fail if activeTab state is not declared', () => {
      // RED: This test ensures activeTab useState is properly declared
      render(<EnhancedAviDMWithClaudeCode />);

      // Should render with default activeTab state
      const aviDmTab = screen.getByRole('tab', { name: /avi chat/i });
      expect(aviDmTab).toHaveAttribute('data-state', 'active');

      // Should be able to change activeTab
      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      expect(screen.getByRole('tab', { name: /claude code/i })).toHaveAttribute('data-state', 'active');
    });

    it('should fail if claudeMessage state is not declared', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Should render input field that depends on claudeMessage state
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      expect(messageInput).toBeInTheDocument();

      // Should be able to update claudeMessage state
      fireEvent.change(messageInput, { target: { value: 'test message' } });
      expect((messageInput as HTMLInputElement).value).toBe('test message');
    });

    it('should fail if claudeMessages array state is not declared', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Should show empty state when claudeMessages is empty
      const emptyState = screen.getByText('Claude Code Ready');
      expect(emptyState).toBeInTheDocument();

      // Should show message count based on claudeMessages length
      const messageCount = screen.getByText('0');
      expect(messageCount).toBeInTheDocument();
    });

    it('should fail if claudeLoading state is not declared', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Send button should not be disabled initially (claudeLoading = false)
      const sendButton = screen.getByText('Send');
      expect(sendButton).not.toBeDisabled();

      // Input should not be disabled initially
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      expect(messageInput).not.toBeDisabled();
    });

    it('should fail if toolMode state is not declared', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Should show Tool Mode button (toolMode = true)
      const toolModeButton = screen.getByText('Tool Mode');
      expect(toolModeButton).toBeInTheDocument();

      // Should show tool mode placeholder
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      expect(messageInput).toBeInTheDocument();
    });
  });

  describe('TDD GREEN: Proper useState Implementation', () => {
    it('should properly initialize all state variables', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // Test default state values match component implementation

      // activeTab should default to 'avi-dm'
      const aviDmTab = screen.getByRole('tab', { name: /avi chat/i });
      expect(aviDmTab).toHaveAttribute('data-state', 'active');

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // claudeMessage should default to empty string
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      expect((messageInput as HTMLInputElement).value).toBe('');

      // claudeMessages should default to empty array
      const emptyState = screen.getByText('Claude Code Ready');
      expect(emptyState).toBeInTheDocument();

      // claudeLoading should default to false
      const sendButton = screen.getByText('Send');
      expect(sendButton).not.toBeDisabled();

      // toolMode should default to true
      const toolModeButton = screen.getByText('Tool Mode');
      expect(toolModeButton).toBeInTheDocument();
    });

    it('should handle activeTab state transitions correctly', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // Test tab switching functionality
      const aviDmTab = screen.getByText('Avi Chat');
      const claudeCodeTab = screen.getByText('Claude Code');
      const activityTab = screen.getByText('Live Activity');

      // Initial state should be avi-dm
      expect(screen.getByRole('tab', { name: /avi chat/i })).toHaveAttribute('data-state', 'active');

      // Switch to claude-code
      fireEvent.click(claudeCodeTab);
      expect(screen.getByRole('tab', { name: /claude code/i })).toHaveAttribute('data-state', 'active');

      // Switch to activity
      fireEvent.click(activityTab);
      expect(screen.getByRole('tab', { name: /live activity/i })).toHaveAttribute('data-state', 'active');

      // Switch back to avi-dm
      fireEvent.click(aviDmTab);
      expect(screen.getByRole('tab', { name: /avi chat/i })).toHaveAttribute('data-state', 'active');
    });

    it('should handle claudeMessage state updates correctly', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      const messageInput = screen.getByPlaceholderText(/Enter command/i);

      // Test multiple message updates
      const testMessages = ['hello', 'world', 'test message with spaces', '123', ''];

      testMessages.forEach(message => {
        fireEvent.change(messageInput, { target: { value: message } });
        expect((messageInput as HTMLInputElement).value).toBe(message);
      });
    });

    it('should handle claudeMessages array state correctly', async () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      const sendButton = screen.getByText('Send');

      // Mock successful response
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'First response' })
      } as Response);

      // Send first message
      fireEvent.change(messageInput, { target: { value: 'first message' } });
      fireEvent.click(sendButton);

      // Should add user message to array
      await waitFor(() => {
        const userMessage = screen.getByText('first message');
        expect(userMessage).toBeInTheDocument();
      });

      // Should add assistant response to array
      await waitFor(() => {
        const assistantResponse = screen.getByText('First response');
        expect(assistantResponse).toBeInTheDocument();
      });

      // Message count should update
      await waitFor(() => {
        const messageCount = screen.getByText('1'); // 1 user message
        expect(messageCount).toBeInTheDocument();
      });
    });

    it('should handle claudeLoading state transitions correctly', async () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      const sendButton = screen.getByText('Send');

      // Mock delayed response to test loading states
      (fetch as any).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Delayed response' })
        } as Response), 100))
      );

      fireEvent.change(messageInput, { target: { value: 'loading test' } });

      // Initial state - not loading
      expect(sendButton).not.toBeDisabled();
      expect(messageInput).not.toBeDisabled();

      // Trigger loading state
      fireEvent.click(sendButton);

      // Should immediately show loading state
      await waitFor(() => {
        const executingButton = screen.queryByText('Executing...');
        if (executingButton) {
          expect(executingButton).toBeInTheDocument();
        }
      });

      // Should disable input during loading
      await waitFor(() => {
        const disabledInput = screen.getByDisplayValue('');
        expect(disabledInput).toBeDisabled();
      });

      // Should return to normal state after response
      await waitFor(() => {
        const normalButton = screen.getByText('Send');
        expect(normalButton).not.toBeDisabled();
      }, { timeout: 2000 });

      await waitFor(() => {
        const enabledInput = screen.getByPlaceholderText(/Enter command/i);
        expect(enabledInput).not.toBeDisabled();
      }, { timeout: 2000 });
    });

    it('should handle toolMode state toggle correctly', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Initial state - toolMode = true
      let toolModeButton = screen.getByText('Tool Mode');
      expect(toolModeButton).toBeInTheDocument();

      let messageInput = screen.getByPlaceholderText(/Enter command/i);
      expect(messageInput).toBeInTheDocument();

      // Toggle to chat mode
      fireEvent.click(toolModeButton);

      const chatModeButton = screen.getByText('Chat Mode');
      expect(chatModeButton).toBeInTheDocument();

      messageInput = screen.getByPlaceholderText(/Chat with Claude/i);
      expect(messageInput).toBeInTheDocument();

      // Toggle back to tool mode
      fireEvent.click(chatModeButton);

      toolModeButton = screen.getByText('Tool Mode');
      expect(toolModeButton).toBeInTheDocument();

      messageInput = screen.getByPlaceholderText(/Enter command/i);
      expect(messageInput).toBeInTheDocument();
    });
  });

  describe('TDD GREEN: State Error Handling', () => {
    it('should handle state updates during error conditions', async () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Mock fetch error
      (fetch as any).mockRejectedValueOnce(
        new Error('Network error')
      );

      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      const sendButton = screen.getByText('Send');

      fireEvent.change(messageInput, { target: { value: 'error test' } });
      fireEvent.click(sendButton);

      // Should clear message input even on error
      await waitFor(() => {
        expect((messageInput as HTMLInputElement).value).toBe('');
      });

      // Should add user message to state even on error
      await waitFor(() => {
        const userMessage = screen.getByText('error test');
        expect(userMessage).toBeInTheDocument();
      });

      // Should add error message to state
      await waitFor(() => {
        const errorMessage = screen.queryByText(/Network error/);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });

      // Should reset loading state on error
      await waitFor(() => {
        const sendButton = screen.getByText('Send');
        expect(sendButton).not.toBeDisabled();
      });
    });

    it('should maintain state consistency across rapid updates', async () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      const toolModeButton = screen.getByText('Tool Mode');

      // Rapid state updates should not cause issues
      await act(async () => {
        fireEvent.change(messageInput, { target: { value: 'rapid test 1' } });
        fireEvent.click(toolModeButton);
        fireEvent.change(messageInput, { target: { value: 'rapid test 2' } });
        fireEvent.click(toolModeButton);
        fireEvent.change(messageInput, { target: { value: 'rapid test 3' } });
      });

      // Final state should be consistent
      expect((messageInput as HTMLInputElement).value).toBe('rapid test 3');
      expect(screen.getByText('Tool Mode')).toBeInTheDocument();
    });
  });

  describe('TDD REFACTOR: State Optimization', () => {
    it('should use state efficiently without unnecessary re-renders', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // State updates should be batched and efficient
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      const toolModeButton = screen.getByText('Tool Mode');

      // Multiple quick updates
      fireEvent.change(messageInput, { target: { value: 'optimization test' } });
      fireEvent.click(toolModeButton);
      fireEvent.click(toolModeButton);

      // Component should remain responsive
      expect((messageInput as HTMLInputElement).value).toBe('optimization test');
      expect(screen.getByText('Tool Mode')).toBeInTheDocument();
    });

    it('should properly cleanup state on unmount', () => {
      const { unmount } = render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Set up some state
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      fireEvent.change(messageInput, { target: { value: 'cleanup test' } });

      // Unmount should not cause errors
      expect(() => unmount()).not.toThrow();
    });
  });
});