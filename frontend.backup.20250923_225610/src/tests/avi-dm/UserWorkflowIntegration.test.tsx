/**
 * Full User Workflow Integration Tests - London School TDD
 * 
 * This test suite focuses on complete user journeys:
 * 1. Testing end-to-end user workflows
 * 2. Verifying cross-component interactions
 * 3. Testing realistic usage scenarios
 * 4. Validating user experience flows
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AviDMSection } from '../../components/posting-interface/AviDMSection';
import { createMockAviDMService } from '../mocks/avi-dm-service.mock';
import { mockApiHandlers } from '../mocks/server';

// Mock the AviDMService
jest.mock('../../services/AviDMService');

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock performance API for timing measurements
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn()
};
global.performance = mockPerformance as any;

describe('Full User Workflow Integration Tests - London School TDD', () => {
  let mockAviService: any;
  let user: any;

  beforeEach(() => {
    mockAviService = createMockAviDMService();
    
    const { AviDMService } = require('../../services/AviDMService');
    AviDMService.mockImplementation(() => mockAviService);
    
    user = userEvent.setup();
    
    // Reset mocks
    mockFetch.mockClear();
    mockPerformance.now.mockClear();
    mockPerformance.mark.mockClear();
    mockPerformance.measure.mockClear();
    
    // Default successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 'post-123',
          title: 'DM to Agent',
          content: 'Test message'
        }
      })
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('New User First-Time Experience', () => {
    it('should guide new user through complete DM workflow', async () => {
      render(<AviDMSection />);
      
      // Step 1: User sees agent selection interface
      expect(screen.getByText('Select Agent to Message')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search agents by name or expertise...')).toBeInTheDocument();
      
      // User can see all available agents
      expect(screen.getByText('TechReviewer')).toBeInTheDocument();
      expect(screen.getByText('Code Review & Architecture')).toBeInTheDocument();
      expect(screen.getByText('SystemValidator')).toBeInTheDocument();
      expect(screen.getByText('System Testing & Validation')).toBeInTheDocument();
      
      // Step 2: User explores agents before selecting
      const searchInput = screen.getByPlaceholderText('Search agents by name or expertise...');
      await user.type(searchInput, 'review');
      
      // Should filter to relevant agents
      await waitFor(() => {
        expect(screen.getByText('TechReviewer')).toBeInTheDocument();
        expect(screen.queryByText('SystemValidator')).not.toBeInTheDocument();
      });
      
      // Step 3: User clears search and selects agent
      await user.clear(searchInput);
      
      await waitFor(() => {
        expect(screen.getByText('SystemValidator')).toBeInTheDocument();
      });
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      // Step 4: User sees conversation interface with greeting
      await waitFor(() => {
        expect(screen.getByText(/Hello! I'm TechReviewer/)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
        expect(screen.getByText('Quick Replies:')).toBeInTheDocument();
      });
      
      // Step 5: User tries quick reply first
      const quickReplyButton = screen.getByText('Can you review this?');
      await user.click(quickReplyButton);
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...') as HTMLTextAreaElement;
      expect(messageInput.value).toBe('Can you review this?');
      expect(messageInput).toHaveFocus();
      
      // Step 6: User customizes and sends message
      await user.clear(messageInput);
      await user.type(messageInput, 'Hi! I\'m new here. Can you help me review my React component?');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);
      
      // Step 7: User sees their message and agent response flow
      await waitFor(() => {
        expect(screen.getByText(/Can you help me review my React component/)).toBeInTheDocument();
      });
      
      // Should show typing indicator
      await waitFor(() => {
        expect(screen.getByText(/TechReviewer is typing/)).toBeInTheDocument();
      });
      
      // Should show agent response
      await waitFor(() => {
        expect(screen.getByText(/Thanks for the message/)).toBeInTheDocument();
        expect(screen.queryByText(/TechReviewer is typing/)).not.toBeInTheDocument();
      }, { timeout: 6000 });
      
      // Step 8: Verify API call was made correctly
      expect(mockFetch).toHaveBeenCalledWith('/api/agent-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'DM to TechReviewer',
          content: 'Hi! I\'m new here. Can you help me review my React component?',
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

    it('should handle user discovering agent capabilities', async () => {
      render(<AviDMSection />);
      
      // User explores different agent specializations
      const agents = [
        { name: 'TechReviewer', expertise: 'Code Review & Architecture' },
        { name: 'SystemValidator', expertise: 'System Testing & Validation' },
        { name: 'CodeAuditor', expertise: 'Security & Code Quality' },
        { name: 'PerformanceAnalyst', expertise: 'Performance Optimization' }
      ];
      
      for (const agent of agents) {
        // Check agent is displayed with expertise
        expect(screen.getByText(agent.name)).toBeInTheDocument();
        expect(screen.getByText(agent.expertise)).toBeInTheDocument();
        
        // Check status indicator
        const agentElement = screen.getByText(agent.name).closest('button')!;
        const statusIndicator = agentElement.querySelector('[class*="bg-"]');
        expect(statusIndicator).toBeInTheDocument();
      }
      
      // User selects based on specific need
      const perfAnalystButton = screen.getByText('PerformanceAnalyst').closest('button')!;
      await user.click(perfAnalystButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Hello! I'm PerformanceAnalyst/)).toBeInTheDocument();
      });
    });
  });

  describe('Expert User Advanced Workflows', () => {
    it('should support rapid agent switching for multi-expert consultation', async () => {
      render(<AviDMSection />);
      
      // Scenario: User needs code review AND security audit
      
      // First consultation - Code Review
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Please review this authentication logic for best practices');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agent-posts', expect.any(Object));
      });
      
      // Switch to Security Audit
      const changeButton = screen.getByText('Change');
      await user.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Select Agent to Message')).toBeInTheDocument();
      });
      
      const codeAuditorButton = screen.getByText('CodeAuditor').closest('button')!;
      await user.click(codeAuditorButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message CodeAuditor...')).toBeInTheDocument();
      });
      
      const auditorMessageInput = screen.getByPlaceholderText('Message CodeAuditor...');
      const auditorSendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(auditorMessageInput, 'Can you audit the same authentication logic for security vulnerabilities?');
      await user.click(auditorSendButton);
      
      // Verify both consultations were initiated
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/agent-posts', expect.objectContaining({
        body: expect.stringContaining('TechReviewer')
      }));
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/agent-posts', expect.objectContaining({
        body: expect.stringContaining('CodeAuditor')
      }));
    });

    it('should handle complex technical discussions with context', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Multi-turn technical conversation
      const conversationFlow = [
        'I have a React component that\'s re-rendering too frequently',
        'It\'s using useState for a complex object with nested properties',
        'I tried React.memo but it\'s still re-rendering when parent state changes',
        'The component receives props that are sometimes undefined initially'
      ];
      
      for (const message of conversationFlow) {
        await user.clear(messageInput);
        await user.type(messageInput, message);
        await user.click(sendButton);
        
        // Wait for message to be sent
        await waitFor(() => {
          expect(screen.getByText(message)).toBeInTheDocument();
        });
        
        // Wait for agent response
        await waitFor(() => {
          expect(screen.getByText(/Thanks for the message/)).toBeInTheDocument();
        }, { timeout: 6000 });
      }
      
      // Verify all messages were sent with context
      expect(mockFetch).toHaveBeenCalledTimes(conversationFlow.length);
    });

    it('should support keyboard shortcuts for power users', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      
      // User types message
      await user.type(messageInput, 'Quick message using keyboard shortcut');
      
      // User presses Cmd+Enter (or Ctrl+Enter)
      await user.keyboard('{Meta>}{Enter}{/Meta}');
      
      // Message should be sent
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Mobile User Experience Workflows', () => {
    it('should provide optimized mobile experience', async () => {
      render(<AviDMSection isMobile={true} />);
      
      // Mobile layout should be single column
      const agentGrid = screen.getByText('TechReviewer').closest('div')?.parentElement;
      expect(agentGrid).toHaveClass('grid-cols-1');
      
      // Select agent
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Mobile should not show quick replies
      expect(screen.queryByText('Quick Replies:')).not.toBeInTheDocument();
      
      // Send button should not have text on mobile
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).not.toHaveTextContent('Send');
      
      // Textarea should have proper mobile styling
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      expect(messageInput).toHaveClass('text-base'); // Prevents zoom on mobile
    });

    it('should handle touch interactions appropriately', async () => {
      render(<AviDMSection isMobile={true} />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      
      // Simulate touch interaction
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Touch typing simulation
      await user.type(messageInput, 'Mobile touch test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Error Recovery User Journeys', () => {
    it('should guide user through network error recovery', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // First message fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'First message that will fail');
      await user.click(sendButton);
      
      // User sees error
      await waitFor(() => {
        expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
      });
      
      // User modifies message and retries
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });
      
      await user.clear(messageInput);
      await user.type(messageInput, 'Retry message after network error');
      await user.click(sendButton);
      
      // Should succeed on retry
      await waitFor(() => {
        expect(screen.queryByText(/Failed to send message/)).not.toBeInTheDocument();
        expect(screen.getByText('Retry message after network error')).toBeInTheDocument();
      });
    });

    it('should handle API rate limiting gracefully', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Simulate rate limiting
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Rate limit exceeded',
          retryAfter: 60
        })
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Rate limited message');
      await user.click(sendButton);
      
      // User sees rate limit error
      await waitFor(() => {
        expect(screen.getByText(/Rate limit exceeded/)).toBeInTheDocument();
      });
      
      // Send button should be temporarily disabled
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Accessibility-First User Journeys', () => {
    it('should support complete keyboard-only navigation', async () => {
      render(<AviDMSection />);
      
      // Tab to search input
      await user.tab();
      expect(screen.getByPlaceholderText('Search agents by name or expertise...')).toHaveFocus();
      
      // Search for agent
      await user.keyboard('Tech');
      
      await waitFor(() => {
        expect(screen.getByText('TechReviewer')).toBeInTheDocument();
        expect(screen.queryByText('SystemValidator')).not.toBeInTheDocument();
      });
      
      // Tab to agent button and activate
      await user.tab();
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      expect(techReviewerButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      
      // Should open conversation interface
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Tab to message input
      await user.tab();
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      expect(messageInput).toHaveFocus();
      
      // Type and send via keyboard
      await user.keyboard('Keyboard accessibility test message');
      await user.keyboard('{Meta>}{Enter}');
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('should announce status changes to screen readers', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Mock error for screen reader announcement
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Screen reader test');
      await user.click(sendButton);
      
      // Error should have role="alert" for screen readers
      await waitFor(() => {
        const errorElement = screen.getByText(/Failed to send message/);
        expect(errorElement).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Performance-Critical User Workflows', () => {
    it('should maintain responsiveness during high-frequency interactions', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      
      // Rapid typing simulation
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        await user.type(messageInput, `Rapid typing test ${i} `);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should remain responsive (arbitrary threshold)
      expect(duration).toBeLessThan(5000); // 5 seconds for 100 operations
      
      // UI should still be functional
      expect(messageInput).toHaveFocus();
      expect((messageInput as HTMLTextAreaElement).value).toContain('Rapid typing test');
    });

    it('should handle large message content efficiently', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      
      // Large message content
      const largeContent = 'This is a large message content that tests performance. '.repeat(50);
      
      const startTime = performance.now();
      await user.type(messageInput, largeContent);
      const endTime = performance.now();
      
      // Should handle large content efficiently
      expect(endTime - startTime).toBeLessThan(2000); // 2 seconds threshold
      
      // Content should be properly truncated to max length
      expect((messageInput as HTMLTextAreaElement).value).toHaveLength(1000);
    });
  });

  describe('Multi-Agent Collaboration Workflows', () => {
    it('should support consulting multiple agents for complex problems', async () => {
      const onMessageSent = jest.fn();
      render(<AviDMSection onMessageSent={onMessageSent} />);
      
      // Scenario: User needs architecture review, security audit, and performance analysis
      
      const consultationPlan = [
        {
          agent: 'TechReviewer',
          message: 'Can you review the overall architecture of my microservices setup?',
          expertise: 'architecture'
        },
        {
          agent: 'CodeAuditor',
          message: 'Please audit the security aspects of the same microservices architecture',
          expertise: 'security'
        },
        {
          agent: 'PerformanceAnalyst',
          message: 'Can you analyze potential performance bottlenecks in this architecture?',
          expertise: 'performance'
        }
      ];
      
      for (const consultation of consultationPlan) {
        // Select agent
        const agentButton = screen.getByText(consultation.agent).closest('button')!;
        await user.click(agentButton);
        
        await waitFor(() => {
          expect(screen.getByPlaceholderText(`Message ${consultation.agent}...`)).toBeInTheDocument();
        });
        
        // Send consultation message
        const messageInput = screen.getByPlaceholderText(`Message ${consultation.agent}...`);
        const sendButton = screen.getByRole('button', { name: /send/i });
        
        await user.type(messageInput, consultation.message);
        await user.click(sendButton);
        
        await waitFor(() => {
          expect(onMessageSent).toHaveBeenCalled();
        });
        
        // Switch to next agent (except for last iteration)
        if (consultation !== consultationPlan[consultationPlan.length - 1]) {
          const changeButton = screen.getByText('Change');
          await user.click(changeButton);
          
          await waitFor(() => {
            expect(screen.getByText('Select Agent to Message')).toBeInTheDocument();
          });
        }
      }
      
      // Verify all consultations were sent
      expect(mockFetch).toHaveBeenCalledTimes(consultationPlan.length);
      expect(onMessageSent).toHaveBeenCalledTimes(consultationPlan.length);
    });

    it('should maintain context across agent switches', async () => {
      render(<AviDMSection />);
      
      // Start with TechReviewer
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Send message to establish context
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'I have a React performance issue in my dashboard component');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/React performance issue/)).toBeInTheDocument();
      });
      
      // Switch to PerformanceAnalyst with context
      const changeButton = screen.getByText('Change');
      await user.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Select Agent to Message')).toBeInTheDocument();
      });
      
      const perfAnalystButton = screen.getByText('PerformanceAnalyst').closest('button')!;
      await user.click(perfAnalystButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message PerformanceAnalyst...')).toBeInTheDocument();
      });
      
      // Reference previous context
      const perfMessageInput = screen.getByPlaceholderText('Message PerformanceAnalyst...');
      const perfSendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(perfMessageInput, 'Following up on the dashboard performance issue I discussed with TechReviewer - can you provide specific optimization recommendations?');
      await user.click(perfSendButton);
      
      // Both messages should maintain related context
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/agent-posts', expect.objectContaining({
        body: expect.stringContaining('React performance issue')
      }));
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/agent-posts', expect.objectContaining({
        body: expect.stringContaining('dashboard performance issue I discussed with TechReviewer')
      }));
    });
  });
});
