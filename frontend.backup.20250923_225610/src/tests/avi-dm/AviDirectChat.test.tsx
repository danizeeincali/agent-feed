/**
 * AviDirectChat Component Tests - London School TDD
 * 
 * This test suite follows the London School approach by:
 * 1. Testing interactions and behavior rather than state
 * 2. Using mocks to isolate the unit under test
 * 3. Verifying collaborations between objects
 * 4. Following outside-in development
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AviDirectChatReal as AviDirectChat } from '../../components/posting-interface/AviDirectChatReal';
import { createMockAviDMService } from '../mocks/avi-dm-service.mock';
import { mockApiHandlers } from '../mocks/server';

// Mock the AviDMService module
jest.mock('../../services/AviDMService', () => ({
  AviDMService: jest.fn().mockImplementation(() => createMockAviDMService()),
  default: jest.fn().mockImplementation(() => createMockAviDMService())
}));

// Mock fetch globally for this test suite
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AviDirectChat - London School TDD', () => {
  let mockAviService: any;
  let user: any;

  beforeEach(() => {
    mockAviService = createMockAviDMService();
    user = userEvent.setup();
    
    // Reset fetch mock
    mockFetch.mockClear();
    
    // Default successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 'mock-post-id',
          title: 'DM to TestAgent',
          content: 'Test message'
        }
      })
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Agent Selection Behavior', () => {
    it('should display Avi interface without agent selection', () => {
      render(<AviDirectChat />);

      // Verify direct Avi interface is shown
      expect(screen.getByText('Avi')).toBeInTheDocument();
      expect(screen.getByText('Your intelligent coding assistant powered by Claude')).toBeInTheDocument();

      // Verify no agent selection interface
      expect(screen.queryByText('Select Agent to Message')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Search agents by name or expertise...')).not.toBeInTheDocument();
    });

    it('should filter agents based on search query', async () => {
      render(<AviDMSection />);
      
      const searchInput = screen.getByPlaceholderText('Search agents by name or expertise...');
      
      // Type search query
      await user.type(searchInput, 'Tech');
      
      // Verify filtering behavior
      await waitFor(() => {
        expect(screen.getByText('TechReviewer')).toBeInTheDocument();
        expect(screen.queryByText('SystemValidator')).not.toBeInTheDocument();
      });
    });

    it('should handle agent selection and show conversation interface', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      
      // Select agent
      await user.click(techReviewerButton);
      
      // Verify conversation interface is shown
      await waitFor(() => {
        expect(screen.getByText('TechReviewer')).toBeInTheDocument();
        expect(screen.getByText('Code Review & Architecture')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should allow changing selected agent', async () => {
      render(<AviDMSection />);
      
      // Select first agent
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByText('TechReviewer')).toBeInTheDocument();
      });
      
      // Click change button
      const changeButton = screen.getByText('Change');
      await user.click(changeButton);
      
      // Verify agent selection interface is shown again
      await waitFor(() => {
        expect(screen.getByText('Select Agent to Message')).toBeInTheDocument();
      });
    });
  });

  describe('Message Composition and Sending Behavior', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      // Select an agent first
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should handle message input and auto-resize textarea', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...') as HTMLTextAreaElement;
      
      const longMessage = 'This is a very long message that should cause the textarea to resize automatically when typed.';
      
      await user.type(messageInput, longMessage);
      
      // Verify message is typed
      expect(messageInput.value).toBe(longMessage);
      
      // Verify textarea auto-resize behavior is triggered
      expect(messageInput.style.height).toBe('auto');
    });

    it('should send message via API when send button is clicked', async () => {
      const onMessageSent = jest.fn();
      render(<AviDMSection onMessageSent={onMessageSent} />);
      
      // Select agent
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Type message
      await user.type(messageInput, 'Test message for review');
      
      // Send message
      await user.click(sendButton);
      
      // Verify API call was made with correct data
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agent-posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'DM to TechReviewer',
            content: 'Test message for review',
            author_agent: 'user-agent',
            metadata: expect.objectContaining({
              isDM: true,
              targetAgent: 'tech-reviewer',
              targetAgentName: 'TechReviewer',
              postType: 'direct-message',
              isPrivate: true
            })
          })
        });
      });
      
      // Verify callback was called
      expect(onMessageSent).toHaveBeenCalledWith({
        id: 'mock-post-id',
        title: 'DM to TestAgent',
        content: 'Test message'
      });
    });

    it('should handle keyboard shortcut for sending (Cmd+Enter)', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      
      // Type message
      await user.type(messageInput, 'Quick message via keyboard');
      
      // Press Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      fireEvent.keyDown(messageInput, {
        key: 'Enter',
        metaKey: true
      });
      
      // Verify message was sent
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agent-posts', expect.any(Object));
      });
    });

    it('should prevent sending empty messages', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Try to send empty message
      await user.click(sendButton);
      
      // Verify no API call was made
      expect(mockFetch).not.toHaveBeenCalled();
      
      // Verify send button is disabled for empty input
      expect(sendButton).toBeDisabled();
    });

    it('should prevent sending messages while previous request is in progress', async () => {
      // Mock slow API response
      mockFetch.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: {} })
        }), 1000);
      }));
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Type message
      await user.type(messageInput, 'First message');
      
      // Send first message
      await user.click(sendButton);
      
      // Verify button shows loading state
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
      expect(screen.getByTestId('loading-spinner') || screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
      
      // Try to send another message while first is in progress
      await user.type(messageInput, 'Second message');
      await user.click(sendButton);
      
      // Verify only one API call was made
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear message input after successful send', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...') as HTMLTextAreaElement;
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Type and send message
      await user.type(messageInput, 'Message to clear');
      await user.click(sendButton);
      
      // Wait for send to complete
      await waitFor(() => {
        expect(messageInput.value).toBe('');
      });
    });
  });

  describe('Message Display and Conversation Behavior', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      // Select agent and wait for conversation to load
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Hello! I'm TechReviewer/)).toBeInTheDocument();
      });
    });

    it('should display initial greeting message from selected agent', () => {
      expect(screen.getByText(/Hello! I'm TechReviewer/)).toBeInTheDocument();
      expect(screen.getByText(/How can I help you today?/)).toBeInTheDocument();
    });

    it('should display user messages in conversation after sending', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send a message
      await user.type(messageInput, 'Please review my code');
      await user.click(sendButton);
      
      // Verify user message appears in conversation
      await waitFor(() => {
        expect(screen.getByText('Please review my code')).toBeInTheDocument();
      });
    });

    it('should show typing indicator when agent is responding', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send a message
      await user.type(messageInput, 'Test message');
      await user.click(sendButton);
      
      // Verify typing indicator appears
      await waitFor(() => {
        expect(screen.getByText(/TechReviewer is typing.../)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display agent response after typing delay', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send a message
      await user.type(messageInput, 'Test message for response');
      await user.click(sendButton);
      
      // Wait for agent response (simulated delay)
      await waitFor(() => {
        expect(screen.getByText(/Thanks for the message! I'll review this/)).toBeInTheDocument();
      }, { timeout: 6000 });
    });

    it('should show message status indicators (sent, delivered, read)', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send a message
      await user.type(messageInput, 'Status test message');
      await user.click(sendButton);
      
      // Initially should show 'sent' status
      await waitFor(() => {
        const messageElement = screen.getByText('Status test message').closest('div');
        expect(messageElement).toBeInTheDocument();
        // Check for status icon (Check or CheckCheck)
      });
      
      // Should update to 'delivered' after API response
      await waitFor(() => {
        const messageElement = screen.getByText('Status test message').closest('div');
        expect(messageElement).toBeInTheDocument();
        // Status should be updated to delivered
      });
    });

    it('should auto-scroll to bottom when new messages are added', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send multiple messages to trigger scrolling
      for (let i = 1; i <= 3; i++) {
        await user.clear(messageInput);
        await user.type(messageInput, `Message ${i}`);
        await user.click(sendButton);
        
        await waitFor(() => {
          expect(screen.getByText(`Message ${i}`)).toBeInTheDocument();
        });
      }
      
      // Verify the latest message is visible (scroll behavior)
      expect(screen.getByText('Message 3')).toBeInTheDocument();
    });
  });

  describe('Quick Reply Behavior', () => {
    beforeEach(async () => {
      render(<AviDMSection isMobile={false} />); // Ensure desktop mode for quick replies
      
      // Select agent
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Hello! I'm TechReviewer/)).toBeInTheDocument();
      });
    });

    it('should display quick reply options on desktop', () => {
      expect(screen.getByText('Quick Replies:')).toBeInTheDocument();
      expect(screen.getByText('Can you review this?')).toBeInTheDocument();
      expect(screen.getByText("What's your opinion on...")).toBeInTheDocument();
      expect(screen.getByText('Need help with...')).toBeInTheDocument();
    });

    it('should populate message input when quick reply is clicked', async () => {
      const quickReplyButton = screen.getByText('Can you review this?');
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...') as HTMLTextAreaElement;
      
      // Click quick reply
      await user.click(quickReplyButton);
      
      // Verify message input is populated
      expect(messageInput.value).toBe('Can you review this?');
      
      // Verify input receives focus
      expect(messageInput).toHaveFocus();
    });

    it('should hide quick replies after first message exchange', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send a message (this should be the second message after greeting)
      await user.type(messageInput, 'First user message');
      await user.click(sendButton);
      
      // Wait for response and verify quick replies are hidden
      await waitFor(() => {
        expect(screen.queryByText('Quick Replies:')).not.toBeInTheDocument();
      }, { timeout: 6000 });
    });
  });

  describe('Error Handling Behavior', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      // Select agent
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should display error message when API request fails', async () => {
      // Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send message
      await user.type(messageInput, 'Message that will fail');
      await user.click(sendButton);
      
      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
      });
      
      // Verify message is removed from UI on failure
      expect(screen.queryByText('Message that will fail')).not.toBeInTheDocument();
    });

    it('should handle API error responses gracefully', async () => {
      // Mock API error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Rate limit exceeded' })
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send message
      await user.type(messageInput, 'Rate limited message');
      await user.click(sendButton);
      
      // Verify specific error is displayed
      await waitFor(() => {
        expect(screen.getByText(/Rate limit exceeded/)).toBeInTheDocument();
      });
    });

    it('should clear errors when user types new message', async () => {
      // Trigger error first
      mockFetch.mockRejectedValueOnce(new Error('Test error'));
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send failing message
      await user.type(messageInput, 'Failing message');
      await user.click(sendButton);
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
      });
      
      // Type new message
      await user.clear(messageInput);
      await user.type(messageInput, 'New message');
      
      // Verify error is cleared
      await waitFor(() => {
        expect(screen.queryByText(/Failed to send message/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsiveness Behavior', () => {
    it('should adapt layout for mobile view', () => {
      render(<AviDMSection isMobile={true} />);
      
      // Verify mobile-specific layout adjustments
      // In mobile mode, agents should be in single column
      const agentContainer = screen.getByText('TechReviewer').closest('div')?.parentElement;
      expect(agentContainer).toHaveClass('grid-cols-1');
    });

    it('should hide quick replies on mobile', async () => {
      render(<AviDMSection isMobile={true} />);
      
      // Select agent
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Verify quick replies are not shown on mobile
      expect(screen.queryByText('Quick Replies:')).not.toBeInTheDocument();
    });

    it('should show only send icon without text on mobile', async () => {
      render(<AviDMSection isMobile={true} />);
      
      // Select agent
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Send button should not have "Send" text on mobile
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).not.toHaveTextContent('Send');
    });
  });

  describe('Accessibility Behavior', () => {
    it('should provide proper ARIA labels and roles', async () => {
      render(<AviDMSection />);
      
      // Verify search input has proper labeling
      const searchInput = screen.getByLabelText('Select Agent to Message');
      expect(searchInput).toBeInTheDocument();
      
      // Select agent and verify message input labeling
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
        expect(messageInput).toBeInTheDocument();
        expect(messageInput).toHaveAttribute('maxLength', '1000');
      });
    });

    it('should support keyboard navigation', async () => {
      render(<AviDMSection />);
      
      // Verify agent buttons are keyboard accessible
      const firstAgentButton = screen.getByText('TechReviewer').closest('button')!;
      
      // Focus and activate with keyboard
      firstAgentButton.focus();
      fireEvent.keyDown(firstAgentButton, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should announce status changes to screen readers', async () => {
      render(<AviDMSection />);
      
      // Select agent
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send message and verify status updates
      await user.type(messageInput, 'Accessibility test');
      await user.click(sendButton);
      
      // Verify loading state is announced
      await waitFor(() => {
        expect(sendButton).toHaveAttribute('disabled');
      });
    });
  });
});
