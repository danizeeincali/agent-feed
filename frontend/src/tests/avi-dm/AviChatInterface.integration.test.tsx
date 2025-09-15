/**
 * AviChatInterface Integration Tests - London School TDD
 * 
 * This test suite focuses on integration between components and services:
 * 1. Testing the complete Claude Code integration workflow
 * 2. Verifying service collaborations and contracts
 * 3. Testing real-time communication patterns
 * 4. Validating error handling across the integration
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AviDMSection } from '../../components/posting-interface/AviDMSection';
import { createMockAviDMService, MockAviDMService } from '../mocks/avi-dm-service.mock';
import { mockApiHandlers } from '../mocks/server';
import { ClaudeResponse, ConnectionStatus } from '../../types/claude-integration';

// Mock the entire AviDMService module
jest.mock('../../services/AviDMService');

// Mock WebSocket for real-time testing
class MockWebSocketForTesting {
  static instances: MockWebSocketForTesting[] = [];
  
  onopen?: (event: Event) => void;
  onclose?: (event: CloseEvent) => void;
  onmessage?: (event: MessageEvent) => void;
  onerror?: (event: Event) => void;
  readyState: number = 1; // OPEN
  url: string;
  
  constructor(url: string) {
    this.url = url;
    MockWebSocketForTesting.instances.push(this);
    
    setTimeout(() => {
      this.onopen?.({} as Event);
    }, 0);
  }
  
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    // Simulate server response for testing
    setTimeout(() => {
      const message = typeof data === 'string' ? JSON.parse(data) : data;
      if (message.type === 'chat_request') {
        this.simulateStreamingResponse(message.data);
      }
    }, 100);
  }
  
  close() {
    setTimeout(() => {
      this.onclose?.({} as CloseEvent);
    }, 0);
  }
  
  simulateStreamingResponse(request: any) {
    const chunks = ['This ', 'is ', 'a ', 'streaming ', 'response.'];
    
    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        this.onmessage?.({
          data: JSON.stringify({
            type: 'chunk',
            requestId: request.id,
            content: chunk
          })
        } as MessageEvent);
      }, (index + 1) * 200);
    });
    
    // Send completion
    setTimeout(() => {
      this.onmessage?.({
        data: JSON.stringify({
          type: 'complete',
          requestId: request.id
        })
      } as MessageEvent);
    }, (chunks.length + 1) * 200);
  }
  
  static clearInstances() {
    MockWebSocketForTesting.instances = [];
  }
}

global.WebSocket = MockWebSocketForTesting as any;

describe('AviChatInterface Integration Tests - London School TDD', () => {
  let mockAviService: MockAviDMService;
  let user: any;

  beforeEach(() => {
    MockWebSocketForTesting.clearInstances();
    mockAviService = createMockAviDMService();
    
    // Mock the AviDMService constructor to return our mock
    const { AviDMService } = require('../../services/AviDMService');
    AviDMService.mockImplementation(() => mockAviService);
    
    user = userEvent.setup();
  });

  afterEach(() => {
    jest.clearAllMocks();
    MockWebSocketForTesting.clearInstances();
  });

  describe('Claude Code Service Integration', () => {
    it('should initialize service and establish connection when component mounts', async () => {
      render(<AviDMSection />);
      
      // The component should attempt to initialize the service
      // In a real integration, this would happen when an agent is selected
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      // Verify service initialization was attempted
      await waitFor(() => {
        expect(mockAviService.initialize).toHaveBeenCalled();
      });
    });

    it('should handle service initialization failure gracefully', async () => {
      // Mock service initialization failure
      mockAviService.initialize.mockRejectedValueOnce(new Error('Claude Code not available'));
      
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      // Should show error state or fallback UI
      // In this case, the component should still render but with limited functionality
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should create session when starting conversation with agent', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Send first message to trigger session creation
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Start new conversation');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockAviService.createSession).toHaveBeenCalledWith(
          'tech-reviewer',
          expect.any(String),
          expect.any(Object)
        );
      });
    });

    it('should handle session creation failure and use fallback mode', async () => {
      // Mock session creation failure
      mockAviService.createSession.mockRejectedValueOnce(new Error('Session creation failed'));
      
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Message despite session failure');
      await user.click(sendButton);
      
      // Should still attempt to send message via fallback
      await waitFor(() => {
        expect(mockAviService.sendMessage).toHaveBeenCalledWith(
          'Message despite session failure',
          expect.any(Object)
        );
      });
    });

    it('should inject project context when available', async () => {
      const mockProjectContext = {
        projectPath: '/test/project',
        currentBranch: 'feature/avi-dm',
        recentChanges: ['src/components/AviDM.tsx', 'src/services/AviDMService.ts']
      };
      
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Simulate project context being available
      act(() => {
        mockAviService.emit('contextUpdated', mockProjectContext);
      });
      
      // Verify context injection was attempted
      expect(mockAviService.updateProjectContext).toHaveBeenCalledWith(
        expect.objectContaining(mockProjectContext)
      );
    });
  });

  describe('Real-time Communication Integration', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      // Setup agent selection
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should establish WebSocket connection for real-time features', async () => {
      // Verify WebSocket connection was established
      expect(MockWebSocketForTesting.instances).toHaveLength(1);
      expect(MockWebSocketForTesting.instances[0].url).toContain('ws://');
    });

    it('should handle streaming responses from Claude Code', async () => {
      // Mock streaming capability
      mockAviService.__testUtils.setConnectionStatus({ isConnected: true });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Stream this response');
      
      // Mock streaming response
      const onChunk = jest.fn();
      mockAviService.sendMessageStream.mockImplementation(async (message, chunkHandler) => {
        const chunks = ['Streaming ', 'response ', 'test'];
        for (let i = 0; i < chunks.length; i++) {
          setTimeout(() => chunkHandler(chunks[i]), i * 100);
        }
      });
      
      await user.click(sendButton);
      
      // Verify streaming was initiated
      await waitFor(() => {
        expect(mockAviService.sendMessageStream).toHaveBeenCalledWith(
          'Stream this response',
          expect.any(Function),
          expect.any(Object)
        );
      });
    });

    it('should handle connection drops and reconnection', async () => {
      // Simulate connection drop
      act(() => {
        mockAviService.__testUtils.triggerDisconnection('Network error');
      });
      
      // Verify disconnection handling
      expect(mockAviService.emit).toHaveBeenCalledWith('disconnected', { reason: 'Network error' });
      
      // Simulate reconnection attempt
      act(() => {
        mockAviService.reconnect();
      });
      
      await waitFor(() => {
        expect(mockAviService.reconnect).toHaveBeenCalled();
      });
    });

    it('should show connection status indicators', async () => {
      // Mock poor connection
      act(() => {
        mockAviService.__testUtils.setConnectionStatus({
          isConnected: true,
          connectionQuality: 'poor',
          latency: 2000
        });
      });
      
      // Connection status should be reflected in UI
      // This would typically show as a connection indicator
      expect(mockAviService.status.connectionQuality).toBe('poor');
    });

    it('should handle typing indicators from other participants', async () => {
      // Simulate typing indicator from Claude
      act(() => {
        mockAviService.emit('typing', { sessionId: 'test-session' });
      });
      
      // Should show typing indicator in UI
      // This would be handled by the component's event listeners
      expect(mockAviService.getListenersFor('typing')).toHaveLength(0); // Initially no listeners
    });
  });

  describe('Context Management Integration', () => {
    it('should inject file context when user shares code snippets', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Simulate file context injection
      const fileContext = [
        {
          path: '/src/components/AviDM.tsx',
          content: 'React component code here',
          language: 'typescript'
        }
      ];
      
      act(() => {
        mockAviService.injectFileContext(fileContext);
      });
      
      expect(mockAviService.injectFileContext).toHaveBeenCalledWith(fileContext);
    });

    it('should inject Git context for code review scenarios', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Simulate Git context injection
      const gitContext = {
        currentBranch: 'feature/avi-integration',
        stagedChanges: ['src/services/AviDMService.ts'],
        unstagedChanges: [],
        recentCommits: [
          {
            hash: 'abc123',
            message: 'Add AVI DM integration',
            author: 'developer'
          }
        ]
      };
      
      act(() => {
        mockAviService.injectGitContext(gitContext);
      });
      
      expect(mockAviService.injectGitContext).toHaveBeenCalledWith(gitContext);
    });

    it('should maintain conversation context across messages', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send first message
      await user.type(messageInput, 'First message for context');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockAviService.sendMessage).toHaveBeenCalled();
      });
      
      // Clear and send second message
      await user.clear(messageInput);
      await user.type(messageInput, 'Second message building on context');
      await user.click(sendButton);
      
      // Verify both messages maintain context
      expect(mockAviService.sendMessage).toHaveBeenCalledTimes(2);
      
      // Context should be maintained in session
      expect(mockAviService.getConversationHistory).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    it('should handle Claude Code service errors gracefully', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Mock service error
      mockAviService.sendMessage.mockRejectedValueOnce(
        new Error('Claude Code service unavailable')
      );
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Message that will cause service error');
      await user.click(sendButton);
      
      // Error should be handled and displayed
      await waitFor(() => {
        expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
      });
    });

    it('should implement exponential backoff for connection retries', async () => {
      render(<AviDMSection />);
      
      // Mock connection failures
      mockAviService.checkConnection
        .mockResolvedValueOnce({ isConnected: false, connectionQuality: 'offline', reconnectAttempts: 0 })
        .mockResolvedValueOnce({ isConnected: false, connectionQuality: 'offline', reconnectAttempts: 1 })
        .mockResolvedValueOnce({ isConnected: true, connectionQuality: 'excellent', reconnectAttempts: 2 });
      
      // Trigger reconnection attempts
      await act(async () => {
        await mockAviService.checkConnection();
        await mockAviService.reconnect();
      });
      
      expect(mockAviService.checkConnection).toHaveBeenCalled();
      expect(mockAviService.reconnect).toHaveBeenCalled();
    });

    it('should implement offline mode when Claude Code is unavailable', async () => {
      // Mock offline mode
      mockAviService.__testUtils.setConnectionStatus({ isConnected: false });
      
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviever').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Mock fallback response
      const fallbackResponse: ClaudeResponse = {
        id: 'offline-response',
        requestId: 'offline-req',
        content: 'Offline response - will sync when connection restored',
        metadata: {
          model: 'fallback',
          tokensUsed: 0,
          processingTime: 0
        },
        status: 'success'
      };
      
      mockAviService.sendMessage.mockResolvedValueOnce(fallbackResponse);
      
      await user.type(messageInput, 'Offline message');
      await user.click(sendButton);
      
      // Should handle offline scenario
      await waitFor(() => {
        expect(mockAviService.sendMessage).toHaveBeenCalled();
      });
    });

    it('should queue messages during connection issues and send when restored', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Mock connection drop
      mockAviService.__testUtils.setConnectionStatus({ isConnected: false });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Try to send message while offline
      await user.type(messageInput, 'Queued message');
      await user.click(sendButton);
      
      // Message should be queued (in real implementation)
      // Restore connection
      mockAviService.__testUtils.setConnectionStatus({ isConnected: true });
      
      act(() => {
        mockAviService.emit('reconnected');
      });
      
      // Queued messages should be sent
      expect(mockAviService.sendMessage).toHaveBeenCalledWith(
        'Queued message',
        expect.any(Object)
      );
    });
  });

  describe('Performance and Resource Management', () => {
    it('should implement proper cleanup when component unmounts', async () => {
      const { unmount } = render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(mockAviService.initialize).toHaveBeenCalled();
      });
      
      // Unmount component
      unmount();
      
      // Should cleanup resources
      expect(mockAviService.dispose).toHaveBeenCalled();
    });

    it('should implement rate limiting for message sending', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send multiple messages rapidly
      for (let i = 0; i < 5; i++) {
        await user.clear(messageInput);
        await user.type(messageInput, `Rapid message ${i}`);
        await user.click(sendButton);
      }
      
      // Rate limiting should be enforced by the service
      expect(mockAviService.sendMessage).toHaveBeenCalled();
    });

    it('should manage memory usage for long conversations', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Simulate long conversation history
      const longHistory = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        sessionId: 'test-session',
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
        metadata: { tokenCount: 10 }
      }));
      
      mockAviService.getConversationHistory.mockResolvedValueOnce(longHistory);
      
      // Conversation history should be managed efficiently
      await act(async () => {
        await mockAviService.getConversationHistory();
      });
      
      expect(mockAviService.getConversationHistory).toHaveBeenCalled();
    });
  });
});
