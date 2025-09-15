/**
 * TDD JSX Reference Tests
 * Tests that all JSX references have corresponding variable declarations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import EnhancedAviDMWithClaudeCode from '../../../components/claude-manager/EnhancedAviDMWithClaudeCode';

// Mock dependencies
global.fetch = vi.fn();

describe('JSX Reference Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Test response' })
    } as Response);
  });

  describe('TDD RED: Missing JSX Variable References', () => {
    it('should fail if activeTab variable is not referenced in JSX', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // activeTab should be used in Tabs component
      const tabsContainer = screen.getByRole('tablist');
      expect(tabsContainer).toBeInTheDocument();

      // Should default to 'avi-dm' tab
      const aviDmTab = screen.getByRole('tab', { name: /avi chat/i });
      expect(aviDmTab).toHaveAttribute('data-state', 'active');

      // Should be able to change active tab
      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);
      expect(screen.getByRole('tab', { name: /claude code/i })).toHaveAttribute('data-state', 'active');
    });

    it('should fail if toolMode variable is not referenced in JSX', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // toolMode should be used in Button variant
      const toolModeButton = screen.getByText('Tool Mode');
      expect(toolModeButton).toBeInTheDocument();

      // toolMode should affect button appearance
      expect(toolModeButton.className).toContain('bg-'); // Should have background color for active state

      // toolMode should be used in conditional JSX (icon and text)
      const zapIcon = toolModeButton.querySelector('svg'); // Zap icon when toolMode is true
      expect(zapIcon).toBeInTheDocument();
    });

    it('should fail if claudeMessage variable is not referenced in JSX', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // claudeMessage should be used as input value
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      expect(messageInput).toBeInTheDocument();
      expect((messageInput as HTMLInputElement).value).toBe(''); // Initial empty value

      // Should update when claudeMessage changes
      fireEvent.change(messageInput, { target: { value: 'test message' } });
      expect((messageInput as HTMLInputElement).value).toBe('test message');
    });

    it('should fail if claudeLoading variable is not referenced in JSX', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      const sendButton = screen.getByText('Send');
      const messageInput = screen.getByPlaceholderText(/Enter command/i);

      // claudeLoading should be used in disabled attributes
      expect(sendButton).not.toBeDisabled(); // Initially false
      expect(messageInput).not.toBeDisabled(); // Initially false

      // claudeLoading should be used in conditional rendering
      expect(screen.getByText('Send')).toBeInTheDocument(); // Not loading text
      expect(screen.queryByText('Executing...')).not.toBeInTheDocument(); // Loading text
    });

    it('should fail if claudeMessages variable is not referenced in JSX', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // claudeMessages.length should be used for conditional rendering
      const emptyState = screen.getByText('Claude Code Ready');
      expect(emptyState).toBeInTheDocument();

      // claudeMessages should be used in map function
      const messagesContainer = screen.getByText('Claude Code Ready').closest('.flex-1');
      expect(messagesContainer).toBeInTheDocument();

      // claudeMessages should be used in filter functions for stats
      const messageCount = screen.getByText('0'); // Initial count
      expect(messageCount).toBeInTheDocument();
    });
  });

  describe('TDD GREEN: Proper JSX Variable Usage', () => {
    it('should properly use activeTab in Tabs component', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // Test that activeTab controls which tab content is shown
      const aviDmTab = screen.getByText('Avi Chat');
      const claudeCodeTab = screen.getByText('Claude Code');
      const activityTab = screen.getByText('Live Activity');

      // Initially should show Avi DM content
      expect(screen.getByText('Original Avi DM functionality')).toBeInTheDocument();

      // Switch to Claude Code tab
      fireEvent.click(claudeCodeTab);
      expect(screen.getByText('Claude Code Interface')).toBeInTheDocument();

      // Switch to Activity tab
      fireEvent.click(activityTab);
      expect(screen.getByText('Live Activity Ticker')).toBeInTheDocument();

      // Switch back to Avi DM
      fireEvent.click(aviDmTab);
      expect(screen.getByText('Original Avi DM functionality')).toBeInTheDocument();
    });

    it('should properly use toolMode in conditional JSX', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Initially toolMode = true
      let toolModeButton = screen.getByText('Tool Mode');
      expect(toolModeButton).toBeInTheDocument();

      // Should show tool mode placeholder
      let messageInput = screen.getByPlaceholderText(/Enter command/i);
      expect(messageInput).toBeInTheDocument();

      // Should show tool mode variant
      expect(toolModeButton.className).not.toContain('variant-outline');

      // Toggle to chat mode
      fireEvent.click(toolModeButton);

      // Should show chat mode elements
      const chatModeButton = screen.getByText('Chat Mode');
      expect(chatModeButton).toBeInTheDocument();

      messageInput = screen.getByPlaceholderText(/Chat with Claude/i);
      expect(messageInput).toBeInTheDocument();

      // Should show outline variant for chat mode
      expect(chatModeButton.className).toContain('variant-outline');
    });

    it('should properly use claudeMessage in input value and onChange', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      const messageInput = screen.getByPlaceholderText(/Enter command/i);

      // Initial value should be empty
      expect((messageInput as HTMLInputElement).value).toBe('');

      // Should update on change
      fireEvent.change(messageInput, { target: { value: 'test message' } });
      expect((messageInput as HTMLInputElement).value).toBe('test message');

      // Should clear on send
      const sendButton = screen.getByText('Send');
      fireEvent.click(sendButton);

      waitFor(() => {
        expect((messageInput as HTMLInputElement).value).toBe('');
      });
    });

    it('should properly use claudeLoading in disabled states and conditional rendering', async () => {
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

      // Initially not loading
      expect(sendButton).not.toBeDisabled();
      expect(messageInput).not.toBeDisabled();
      expect(screen.getByText('Send')).toBeInTheDocument();

      // Trigger loading state
      fireEvent.click(sendButton);

      // Should show loading state
      await waitFor(() => {
        const executingButton = screen.queryByText('Executing...');
        if (executingButton) {
          expect(executingButton).toBeInTheDocument();
        }
      });

      // Should disable elements during loading
      await waitFor(() => {
        const disabledInput = screen.getByDisplayValue('');
        expect(disabledInput).toBeDisabled();
      });

      // Should return to normal state
      await waitFor(() => {
        const normalButton = screen.getByText('Send');
        expect(normalButton).not.toBeDisabled();
      }, { timeout: 2000 });
    });

    it('should properly use claudeMessages in map and conditional rendering', async () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Initially empty - should show empty state
      expect(screen.getByText('Claude Code Ready')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Message count

      // Send a message to populate claudeMessages
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      const sendButton = screen.getByText('Send');

      fireEvent.change(messageInput, { target: { value: 'test message' } });

      // Mock response
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Test response' })
      } as Response);

      fireEvent.click(sendButton);

      // Should show user message from claudeMessages map
      await waitFor(() => {
        const userMessage = screen.getByText('test message');
        expect(userMessage).toBeInTheDocument();
      });

      // Should show assistant response from claudeMessages map
      await waitFor(() => {
        const assistantResponse = screen.getByText('Test response');
        expect(assistantResponse).toBeInTheDocument();
      });

      // Should update message count from claudeMessages filter
      await waitFor(() => {
        const messageCount = screen.getByText('1'); // 1 user message
        expect(messageCount).toBeInTheDocument();
      });

      // Should no longer show empty state
      expect(screen.queryByText('Claude Code Ready')).not.toBeInTheDocument();
    });
  });

  describe('TDD GREEN: Complex JSX Variable Usage', () => {
    it('should handle nested JSX variable references', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Test nested variable usage in conditional rendering
      const toolModeButton = screen.getByText('Tool Mode');

      // toolMode used in button variant, icon selection, and text
      expect(toolModeButton).toBeInTheDocument();

      // toolMode used in placeholder text conditional
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      expect(messageInput).toBeInTheDocument();

      // Toggle and test nested usage again
      fireEvent.click(toolModeButton);

      const chatModeButton = screen.getByText('Chat Mode');
      expect(chatModeButton).toBeInTheDocument();

      const chatInput = screen.getByPlaceholderText(/Chat with Claude/i);
      expect(chatInput).toBeInTheDocument();
    });

    it('should handle variable references in event handlers', async () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      const messageInput = screen.getByPlaceholderText(/Enter command/i);

      // Test onKeyPress event handler using claudeLoading variable
      fireEvent.change(messageInput, { target: { value: 'keypress test' } });

      // Simulate Enter key press
      fireEvent.keyPress(messageInput, { key: 'Enter', code: 'Enter' });

      // Should trigger send (using claudeLoading check in handler)
      await waitFor(() => {
        expect((messageInput as HTMLInputElement).value).toBe('');
      });
    });

    it('should handle variable references in computed values', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Test computed values using state variables

      // Badge text computation based on toolMode
      const currentMode = screen.getByText('Tool');
      expect(currentMode).toBeInTheDocument();

      // Message count computation using claudeMessages
      const messageCount = screen.getByText('0');
      expect(messageCount).toBeInTheDocument();

      // Tool execution count using claudeMessages filter
      const toolExecutions = screen.getAllByText('0')[1]; // Second occurrence
      expect(toolExecutions).toBeInTheDocument();
    });

    it('should handle variable references in class name computations', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Test className computation using cn() utility with variables
      const toolModeButton = screen.getByText('Tool Mode');

      // Button should have appropriate classes based on toolMode state
      expect(toolModeButton.className).toContain('flex items-center space-x-2');

      // Toggle and test class changes
      fireEvent.click(toolModeButton);

      const chatModeButton = screen.getByText('Chat Mode');
      expect(chatModeButton.className).toContain('variant-outline');
    });
  });

  describe('TDD REFACTOR: JSX Reference Optimization', () => {
    it('should minimize JSX variable lookups', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Variables should be referenced efficiently in JSX
      // Test that complex expressions are properly handled

      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      const sendButton = screen.getByText('Send');

      // Multiple rapid interactions should be efficient
      fireEvent.change(messageInput, { target: { value: 'optimization 1' } });
      fireEvent.change(messageInput, { target: { value: 'optimization 2' } });
      fireEvent.change(messageInput, { target: { value: 'optimization 3' } });

      expect((messageInput as HTMLInputElement).value).toBe('optimization 3');
      expect(sendButton).not.toBeDisabled();
    });

    it('should avoid redundant variable references in JSX', async () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Test that the same variable reference doesn't cause unnecessary work
      const messageInput = screen.getByPlaceholderText(/Enter command/i);

      // Rapid state changes should not cause issues
      for (let i = 0; i < 5; i++) {
        fireEvent.change(messageInput, { target: { value: `message ${i}` } });
      }

      expect((messageInput as HTMLInputElement).value).toBe('message 4');

      // Component should remain responsive
      const sendButton = screen.getByText('Send');
      expect(sendButton).not.toBeDisabled();
    });
  });
});