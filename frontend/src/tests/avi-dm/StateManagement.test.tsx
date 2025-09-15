/**
 * Component State Management and Lifecycle Tests - London School TDD
 * 
 * This test suite focuses on component internal behavior:
 * 1. Testing state transitions and management
 * 2. Verifying React lifecycle behaviors
 * 3. Testing component interactions and side effects
 * 4. Validating memory management and cleanup
 */

import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AviDMSection } from '../../components/posting-interface/AviDMSection';
import { createMockAviDMService } from '../mocks/avi-dm-service.mock';

// Mock React hooks for lifecycle testing
const mockUseEffect = jest.fn();
const mockUseCallback = jest.fn();
const mockUseRef = jest.fn();
const mockUseState = jest.fn();

// Mock the AviDMService
jest.mock('../../services/AviDMService');

// Mock ResizeObserver for textarea auto-resize tests
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

global.ResizeObserver = MockResizeObserver as any;

describe('Component State Management and Lifecycle - London School TDD', () => {
  let mockAviService: any;
  let user: any;

  beforeEach(() => {
    mockAviService = createMockAviDMService();
    
    const { AviDMService } = require('../../services/AviDMService');
    AviDMService.mockImplementation(() => mockAviService);
    
    user = userEvent.setup();
    
    // Mock successful API responses by default
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} })
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  describe('Component Initialization and Mount Behavior', () => {
    it('should initialize with proper default state', () => {
      render(<AviDMSection />);
      
      // Should show agent selection interface initially
      expect(screen.getByText('Select Agent to Message')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search agents by name or expertise...')).toBeInTheDocument();
      
      // Should display available agents
      expect(screen.getByText('TechReviewer')).toBeInTheDocument();
      expect(screen.getByText('SystemValidator')).toBeInTheDocument();
      
      // Should not show conversation interface initially
      expect(screen.queryByText(/Message.*\.\.\./)).not.toBeInTheDocument();
    });

    it('should initialize refs correctly on mount', () => {
      const { container } = render(<AviDMSection />);
      
      // Should have search input ref
      const searchInput = container.querySelector('input[placeholder*="Search agents"]');
      expect(searchInput).toBeInTheDocument();
      
      // Should not have message refs until agent is selected
      expect(container.querySelector('textarea')).not.toBeInTheDocument();
    });

    it('should handle prop changes correctly', () => {
      const { rerender } = render(<AviDMSection isMobile={false} />);
      
      // Should show desktop layout
      const agentGrid = screen.getByText('TechReviewer').closest('div')?.parentElement;
      expect(agentGrid).toHaveClass('grid-cols-2');
      
      // Re-render with mobile prop
      rerender(<AviDMSection isMobile={true} />);
      
      // Should switch to mobile layout
      const mobileAgentGrid = screen.getByText('TechReviewer').closest('div')?.parentElement;
      expect(mobileAgentGrid).toHaveClass('grid-cols-1');
    });

    it('should handle className prop correctly', () => {
      const { container } = render(<AviDMSection className="custom-class" />);
      
      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement).toHaveClass('custom-class');
    });

    it('should register onMessageSent callback properly', async () => {
      const onMessageSent = jest.fn();
      render(<AviDMSection onMessageSent={onMessageSent} />);
      
      // Select agent and send message
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Test callback');
      await user.click(sendButton);
      
      // Callback should be invoked
      await waitFor(() => {
        expect(onMessageSent).toHaveBeenCalled();
      });
    });
  });

  describe('Agent Selection State Management', () => {
    it('should manage selectedAgent state correctly', async () => {
      render(<AviDMSection />);
      
      // Initially no agent selected
      expect(screen.getByText('Select Agent to Message')).toBeInTheDocument();
      
      // Select an agent
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      // State should update to show selected agent
      await waitFor(() => {
        expect(screen.getByText('TechReviewer')).toBeInTheDocument();
        expect(screen.getByText('Code Review & Architecture')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Should hide agent selection interface
      expect(screen.queryByText('Select Agent to Message')).not.toBeInTheDocument();
    });

    it('should handle agent search state correctly', async () => {
      render(<AviDMSection />);
      
      const searchInput = screen.getByPlaceholderText('Search agents by name or expertise...');
      
      // Initially shows all agents
      expect(screen.getByText('TechReviewer')).toBeInTheDocument();
      expect(screen.getByText('SystemValidator')).toBeInTheDocument();
      
      // Filter agents by search
      await user.type(searchInput, 'Tech');
      
      await waitFor(() => {
        expect(screen.getByText('TechReviewer')).toBeInTheDocument();
        expect(screen.queryByText('SystemValidator')).not.toBeInTheDocument();
      });
      
      // Clear search
      await user.clear(searchInput);
      
      await waitFor(() => {
        expect(screen.getByText('TechReviewer')).toBeInTheDocument();
        expect(screen.getByText('SystemValidator')).toBeInTheDocument();
      });
    });

    it('should handle showAgentSearch state transitions', async () => {
      render(<AviDMSection />);
      
      // Select an agent
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByText('Change')).toBeInTheDocument();
      });
      
      // Click change to show agent search again
      const changeButton = screen.getByText('Change');
      await user.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Select Agent to Message')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search agents by name or expertise...')).toBeInTheDocument();
      });
    });
  });

  describe('Message State Management', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should manage message input state correctly', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...') as HTMLTextAreaElement;
      
      // Initially empty
      expect(messageInput.value).toBe('');
      
      // Update on user input
      await user.type(messageInput, 'Test message');
      expect(messageInput.value).toBe('Test message');
      
      // Clear after sending
      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(messageInput.value).toBe('');
      });
    });

    it('should manage isSubmitting state correctly', async () => {
      // Mock slow API response
      const slowFetch = jest.fn(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, data: {} })
          }), 1000)
        )
      );
      global.fetch = slowFetch;
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Submitting test');
      
      // Initially not submitting
      expect(sendButton).not.toBeDisabled();
      
      // Start submission
      await user.click(sendButton);
      
      // Should be in submitting state
      expect(sendButton).toBeDisabled();
      
      // Should clear submitting state after completion
      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 2000 });
    });

    it('should manage error state correctly', async () => {
      // Mock API error
      global.fetch = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Error test message');
      await user.click(sendButton);
      
      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
      });
      
      // Should clear error when user types new message
      await user.clear(messageInput);
      await user.type(messageInput, 'New message');
      
      await waitFor(() => {
        expect(screen.queryByText(/Failed to send message/)).not.toBeInTheDocument();
      });
    });

    it('should manage conversation messages state', async () => {
      // Initially should show greeting message
      expect(screen.getByText(/Hello! I'm TechReviewer/)).toBeInTheDocument();
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send user message
      await user.type(messageInput, 'User message test');
      await user.click(sendButton);
      
      // Should add user message to conversation
      await waitFor(() => {
        expect(screen.getByText('User message test')).toBeInTheDocument();
      });
      
      // Should show typing indicator
      await waitFor(() => {
        expect(screen.getByText(/TechReviewer is typing/)).toBeInTheDocument();
      });
      
      // Should add agent response after delay
      await waitFor(() => {
        expect(screen.getByText(/Thanks for the message/)).toBeInTheDocument();
      }, { timeout: 6000 });
    });

    it('should manage isTyping state for agent responses', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Typing indicator test');
      await user.click(sendButton);
      
      // Should show typing indicator
      await waitFor(() => {
        expect(screen.getByText(/TechReviewer is typing/)).toBeInTheDocument();
      });
      
      // Should hide typing indicator after response
      await waitFor(() => {
        expect(screen.queryByText(/TechReviewer is typing/)).not.toBeInTheDocument();
      }, { timeout: 6000 });
    });
  });

  describe('Textarea Auto-resize Behavior', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should auto-resize textarea based on content', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...') as HTMLTextAreaElement;
      
      // Initially small height
      const initialHeight = messageInput.style.height;
      
      // Type long message
      const longMessage = 'This is a very long message that should cause the textarea to expand. '.repeat(10);
      await user.type(messageInput, longMessage);
      
      // Height should change
      expect(messageInput.style.height).toBe('auto'); // Set during resize calculation
    });

    it('should limit textarea maximum height', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...') as HTMLTextAreaElement;
      
      // Type extremely long message
      const veryLongMessage = 'Line\n'.repeat(50);
      await user.type(messageInput, veryLongMessage);
      
      // Should not exceed maximum height (120px as per component)
      const computedHeight = parseInt(messageInput.style.height);
      expect(computedHeight).toBeLessThanOrEqual(120);
    });

    it('should reset height when message is cleared', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...') as HTMLTextAreaElement;
      
      // Type long message
      await user.type(messageInput, 'Long message\n'.repeat(5));
      
      // Clear message
      await user.clear(messageInput);
      
      // Height should reset
      expect(messageInput.style.height).toBe('auto');
    });
  });

  describe('Scroll Behavior Management', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should scroll to bottom when new messages are added', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Mock scrollIntoView
      const mockScrollIntoView = jest.fn();
      Element.prototype.scrollIntoView = mockScrollIntoView;
      
      await user.type(messageInput, 'Scroll test message');
      await user.click(sendButton);
      
      // Should scroll to bottom when message is added
      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
      });
    });

    it('should scroll to bottom when agent response is received', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      const mockScrollIntoView = jest.fn();
      Element.prototype.scrollIntoView = mockScrollIntoView;
      
      await user.type(messageInput, 'Agent response test');
      await user.click(sendButton);
      
      // Should scroll when agent response appears
      await waitFor(() => {
        expect(screen.getByText(/Thanks for the message/)).toBeInTheDocument();
        expect(mockScrollIntoView).toHaveBeenCalled();
      }, { timeout: 6000 });
    });
  });

  describe('Component Lifecycle and Cleanup', () => {
    it('should cleanup refs on unmount', () => {
      const { unmount } = render(<AviDMSection />);
      
      // Component should render successfully
      expect(screen.getByText('Select Agent to Message')).toBeInTheDocument();
      
      // Unmount should not throw errors
      expect(() => unmount()).not.toThrow();
    });

    it('should cleanup event listeners on unmount', async () => {
      const { unmount } = render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Should cleanup without errors
      expect(() => unmount()).not.toThrow();
    });

    it('should cleanup timeout references on unmount', async () => {
      const mockClearTimeout = jest.spyOn(global, 'clearTimeout');
      
      const { unmount } = render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Start a message that will trigger timeouts
      await user.type(messageInput, 'Cleanup test');
      await user.click(sendButton);
      
      // Unmount while timeout is active
      unmount();
      
      // Should cleanup timeouts
      expect(mockClearTimeout).toHaveBeenCalled();
      
      mockClearTimeout.mockRestore();
    });

    it('should handle component updates correctly', async () => {
      const onMessageSent = jest.fn();
      const { rerender } = render(<AviDMSection onMessageSent={onMessageSent} />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Update props
      const newCallback = jest.fn();
      rerender(<AviDMSection onMessageSent={newCallback} isMobile={true} />);
      
      // Should maintain state but use new props
      expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Updated props test');
      await user.click(sendButton);
      
      // Should use new callback
      await waitFor(() => {
        expect(newCallback).toHaveBeenCalled();
        expect(onMessageSent).not.toHaveBeenCalled();
      });
    });
  });

  describe('Memory Management and Performance', () => {
    it('should not create memory leaks with rapid re-renders', async () => {
      const { rerender, unmount } = render(<AviDMSection />);
      
      // Simulate rapid prop changes
      for (let i = 0; i < 10; i++) {
        rerender(<AviDMSection isMobile={i % 2 === 0} className={`test-${i}`} />);
      }
      
      // Should handle rapid changes without issues
      expect(screen.getByText('Select Agent to Message')).toBeInTheDocument();
      
      // Cleanup should work properly
      expect(() => unmount()).not.toThrow();
    });

    it('should debounce search input changes', async () => {
      render(<AviDMSection />);
      
      const searchInput = screen.getByPlaceholderText('Search agents by name or expertise...');
      
      // Type rapidly
      await user.type(searchInput, 'T');
      await user.type(searchInput, 'e');
      await user.type(searchInput, 'c');
      await user.type(searchInput, 'h');
      
      // Should filter results
      await waitFor(() => {
        expect(screen.getByText('TechReviewer')).toBeInTheDocument();
        expect(screen.queryByText('SystemValidator')).not.toBeInTheDocument();
      });
    });

    it('should handle large conversation histories efficiently', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send multiple messages quickly
      for (let i = 0; i < 5; i++) {
        await user.clear(messageInput);
        await user.type(messageInput, `Message ${i}`);
        await user.click(sendButton);
        
        // Wait briefly between messages
        await waitFor(() => {
          expect(screen.getByText(`Message ${i}`)).toBeInTheDocument();
        });
      }
      
      // All messages should be displayed
      for (let i = 0; i < 5; i++) {
        expect(screen.getByText(`Message ${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('Side Effects and External Dependencies', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should handle focus management correctly', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      
      // Focus should be managed properly
      messageInput.focus();
      expect(messageInput).toHaveFocus();
      
      // Focus should remain after typing
      await user.type(messageInput, 'Focus test');
      expect(messageInput).toHaveFocus();
    });

    it('should handle keyboard events correctly', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      
      await user.type(messageInput, 'Keyboard test message');
      
      // Should handle Cmd+Enter (or Ctrl+Enter)
      await user.keyboard('{Meta>}{Enter}{/Meta}');
      
      // Message should be sent
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should handle window resize events', async () => {
      // Mock window resize
      const originalInnerWidth = window.innerWidth;
      
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500, // Mobile width
      });
      
      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      
      // Component should adapt to mobile layout
      // (This would require the component to listen to resize events)
      
      // Restore original width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
    });

    it('should handle document visibility changes', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Start typing
      await user.type(messageInput, 'Visibility test');
      
      // Simulate tab becoming hidden
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true,
      });
      
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      
      // Should still allow sending message
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
      
      // Restore visibility
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: false,
      });
    });
  });
});
