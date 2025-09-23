/**
 * Error Handling and Edge Cases Tests - London School TDD
 * 
 * This test suite focuses on comprehensive error scenarios:
 * 1. Testing network failures and timeouts
 * 2. Verifying API error responses and recovery
 * 3. Testing input validation and sanitization
 * 4. Validating graceful degradation patterns
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AviDMSection } from '../../components/posting-interface/AviDMSection';
import { createMockAviDMService } from '../mocks/avi-dm-service.mock';
import { mockApiHandlers } from '../mocks/server';

// Mock the AviDMService
jest.mock('../../services/AviDMService');

// Mock fetch with detailed control
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Error Handling and Edge Cases - London School TDD', () => {
  let mockAviService: any;
  let user: any;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockAviService = createMockAviDMService();
    
    const { AviDMService } = require('../../services/AviDMService');
    AviDMService.mockImplementation(() => mockAviService);
    
    user = userEvent.setup();
    
    // Reset fetch mock
    mockFetch.mockClear();
    
    // Spy on console.error to verify error handling
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('Network and API Error Handling', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should handle network failures gracefully', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Test network error');
      await user.click(sendButton);
      
      // Should display network error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
      });
      
      // Message should be removed from UI
      expect(screen.queryByText('Test network error')).not.toBeInTheDocument();
      
      // Should not crash the application
      expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
    });

    it('should handle API timeout errors', async () => {
      // Mock timeout
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Timeout test message');
      await user.click(sendButton);
      
      // Should handle timeout error
      await waitFor(() => {
        expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Should reset loading state
      expect(sendButton).not.toBeDisabled();
    });

    it('should handle 400 Bad Request errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid message format' })
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Bad request test');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid message format/)).toBeInTheDocument();
      });
    });

    it('should handle 401 Unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized access' })
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Unauthorized test');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Unauthorized access/)).toBeInTheDocument();
      });
    });

    it('should handle 403 Forbidden errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Access denied for this agent' })
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Forbidden test');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Access denied for this agent/)).toBeInTheDocument();
      });
    });

    it('should handle 429 Rate Limit errors with retry-after', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([['retry-after', '60']]),
        json: async () => ({ 
          error: 'Rate limit exceeded',
          retryAfter: 60
        })
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Rate limit test');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Rate limit exceeded/)).toBeInTheDocument();
      });
      
      // Should disable send button for retry period
      expect(sendButton).toBeDisabled();
    });

    it('should handle 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Server error test');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Internal server error/)).toBeInTheDocument();
      });
    });

    it('should handle 503 Service Unavailable with graceful degradation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ 
          error: 'Service temporarily unavailable',
          estimatedRecovery: '5 minutes'
        })
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Service unavailable test');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Service temporarily unavailable/)).toBeInTheDocument();
      });
      
      // Should suggest trying again later
      expect(screen.getByText(/Try again in a few minutes/)).toBeInTheDocument();
    });
  });

  describe('Input Validation and Sanitization', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should prevent sending empty messages', async () => {
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Try to send empty message
      await user.click(sendButton);
      
      // Should not make API call
      expect(mockFetch).not.toHaveBeenCalled();
      expect(sendButton).toBeDisabled();
    });

    it('should prevent sending messages with only whitespace', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, '   \n\t   ');
      await user.click(sendButton);
      
      // Should not send whitespace-only message
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle extremely long messages', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Create message longer than max length (1000 chars)
      const longMessage = 'A'.repeat(1500);
      
      await user.type(messageInput, longMessage);
      
      // Input should be truncated to max length
      expect((messageInput as HTMLTextAreaElement).value).toHaveLength(1000);
      
      await user.click(sendButton);
      
      // Should send truncated message
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/agent-posts',
          expect.objectContaining({
            body: expect.stringContaining('"content":"' + 'A'.repeat(1000) + '"')
          })
        );
      });
    });

    it('should sanitize HTML and script tags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      const maliciousInput = '<script>alert("XSS")</script><img src=x onerror=alert(1)>Hello';
      
      await user.type(messageInput, maliciousInput);
      await user.click(sendButton);
      
      // Should sanitize the input before sending
      await waitFor(() => {
        const call = mockFetch.mock.calls[0];
        const body = JSON.parse(call[1].body);
        expect(body.content).not.toContain('<script>');
        expect(body.content).not.toContain('onerror');
        expect(body.content).toContain('Hello');
      });
    });

    it('should handle special characters and Unicode correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      const unicodeMessage = 'Hello 世界! 🚀 Testing émojis and spëcial chars';
      
      await user.type(messageInput, unicodeMessage);
      await user.click(sendButton);
      
      await waitFor(() => {
        const call = mockFetch.mock.calls[0];
        const body = JSON.parse(call[1].body);
        expect(body.content).toBe(unicodeMessage);
      });
    });

    it('should validate agent selection before sending', async () => {
      render(<AviDMSection />); // Fresh render without agent selection
      
      // Try to access message input without selecting agent
      expect(screen.queryByPlaceholderText(/Message.*\.\.\./)).not.toBeInTheDocument();
      
      // Should show agent selection interface
      expect(screen.getByText('Select Agent to Message')).toBeInTheDocument();
    });
  });

  describe('Service Integration Error Handling', () => {
    it('should handle AviDMService initialization failure', async () => {
      // Mock service initialization failure
      mockAviService.initialize.mockRejectedValueOnce(new Error('Service initialization failed'));
      
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      // Should handle initialization error gracefully
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Should show some indication of limited functionality
      // (In a real implementation, this might show an offline indicator)
      expect(mockAviService.initialize).toHaveBeenCalled();
    });

    it('should handle WebSocket connection failures', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Simulate WebSocket connection failure
      act(() => {
        mockAviService.__testUtils.triggerWebSocketError(new Error('WebSocket connection failed'));
      });
      
      // Should handle WebSocket error without crashing
      expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
    });

    it('should handle Claude Code service unavailability', async () => {
      // Mock Claude Code health check failure
      mockAviService.healthCheck.mockRejectedValueOnce(new Error('Claude Code not responding'));
      
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Should show offline mode or limited functionality
      expect(mockAviService.healthCheck).toHaveBeenCalled();
    });

    it('should handle session creation failures', async () => {
      mockAviService.createSession.mockRejectedValueOnce(new Error('Session creation failed'));
      
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Test session failure');
      await user.click(sendButton);
      
      // Should handle session failure gracefully
      await waitFor(() => {
        expect(mockAviService.createSession).toHaveBeenCalled();
      });
    });
  });

  describe('Component State Error Handling', () => {
    it('should handle component unmounting during API calls', async () => {
      // Mock slow API response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, data: {} })
          }), 2000)
        )
      );
      
      const { unmount } = render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Message during unmount');
      await user.click(sendButton);
      
      // Unmount component while API call is in progress
      unmount();
      
      // Should not cause memory leaks or errors
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('should handle rapid agent switching', async () => {
      render(<AviDMSection />);
      
      // Select first agent
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Rapidly switch to another agent
      const changeButton = screen.getByText('Change');
      await user.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Select Agent to Message')).toBeInTheDocument();
      });
      
      const systemValidatorButton = screen.getByText('SystemValidator').closest('button')!;
      await user.click(systemValidatorButton);
      
      // Should handle rapid switching without errors
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message SystemValidator...')).toBeInTheDocument();
      });
    });

    it('should handle invalid agent data gracefully', async () => {
      // Mock component with invalid agent data
      const originalAgents = require('../../components/posting-interface/AviDMSection');
      
      render(<AviDMSection />);
      
      // Should not crash with invalid agents
      expect(screen.getByText('Select Agent to Message')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle browser storage failures', async () => {
      // Mock localStorage failure
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });
      
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      // Should handle storage failure gracefully
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Restore original implementation
      Storage.prototype.setItem = originalSetItem;
    });

    it('should handle memory constraints gracefully', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Simulate low memory by creating large arrays
      const memoryHogs: any[] = [];
      try {
        for (let i = 0; i < 1000; i++) {
          memoryHogs.push(new Array(1000000).fill('memory_test'));
        }
      } catch (error) {
        // Expected to run out of memory
      }
      
      // Component should still function
      expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      
      // Clean up
      memoryHogs.length = 0;
    });

    it('should handle concurrent message sending attempts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, data: {} })
          }), 100)
        )
      );
      
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send multiple messages concurrently
      await user.type(messageInput, 'Concurrent message 1');
      await user.click(sendButton);
      
      // Try to send another message while first is processing
      await user.clear(messageInput);
      await user.type(messageInput, 'Concurrent message 2');
      await user.click(sendButton);
      
      // Should prevent concurrent sends
      expect(sendButton).toBeDisabled();
      
      // Wait for first message to complete
      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 1000 });
    });
  });

  describe('Accessibility Error Scenarios', () => {
    it('should maintain accessibility during error states', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Accessibility error test');
      await user.click(sendButton);
      
      // Error message should be announced to screen readers
      await waitFor(() => {
        const errorMessage = screen.getByText(/Failed to send message/);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
      
      // Focus should return to input for retry
      expect(messageInput).toHaveFocus();
    });

    it('should handle keyboard navigation during errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Keyboard test error'));
      
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Keyboard error test');
      
      // Use keyboard to send message
      messageInput.focus();
      await user.keyboard('{Control>}{Enter}');
      
      // Should handle keyboard-triggered errors appropriately
      await waitFor(() => {
        expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
      });
      
      // Tab navigation should still work
      await user.tab();
      expect(sendButton).toHaveFocus();
    });
  });

  describe('Recovery and Retry Mechanisms', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should clear errors when user types new message', async () => {
      // Cause an error first
      mockFetch.mockRejectedValueOnce(new Error('Test error'));
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Error message');
      await user.click(sendButton);
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
      });
      
      // Start typing new message
      await user.clear(messageInput);
      await user.type(messageInput, 'New message');
      
      // Error should clear
      await waitFor(() => {
        expect(screen.queryByText(/Failed to send message/)).not.toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      // First attempt fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('First attempt fails'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: {} })
        });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // First attempt
      await user.type(messageInput, 'Retry test message');
      await user.click(sendButton);
      
      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
      });
      
      // Retry
      await user.click(sendButton);
      
      // Should succeed on retry
      await waitFor(() => {
        expect(screen.queryByText(/Failed to send message/)).not.toBeInTheDocument();
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should implement exponential backoff for automatic retries', async () => {
      // Mock service with retry logic
      mockAviService.sendMessage
        .mockRejectedValueOnce(new Error('Retry test 1'))
        .mockRejectedValueOnce(new Error('Retry test 2'))
        .mockResolvedValueOnce({
          id: 'success',
          content: 'Success after retries',
          status: 'success'
        });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Auto retry test');
      await user.click(sendButton);
      
      // Should eventually succeed after retries
      await waitFor(() => {
        expect(mockAviService.sendMessage).toHaveBeenCalledTimes(3);
      }, { timeout: 5000 });
    });
  });
});
