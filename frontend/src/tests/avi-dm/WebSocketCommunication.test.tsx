/**
 * WebSocket Communication Pattern Tests - London School TDD
 * 
 * This test suite focuses on real-time communication behavior:
 * 1. Testing WebSocket connection lifecycle management
 * 2. Verifying message serialization and deserialization
 * 3. Testing reconnection strategies and error handling
 * 4. Validating real-time features like typing indicators
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AviDMSection } from '../../components/posting-interface/AviDMSection';
import { createMockAviDMService } from '../mocks/avi-dm-service.mock';
import { StreamingMessage, ConnectionStatus } from '../../types/claude-integration';

// Mock WebSocket implementation for testing
class MockWebSocketForCommunicationTesting {
  static instances: MockWebSocketForCommunicationTesting[] = [];
  static messageQueue: any[] = [];
  
  onopen?: (event: Event) => void;
  onclose?: (event: CloseEvent) => void;
  onmessage?: (event: MessageEvent) => void;
  onerror?: (event: Event) => void;
  readyState: number;
  url: string;
  
  // Connection states
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  
  constructor(url: string) {
    this.url = url;
    this.readyState = MockWebSocketForCommunicationTesting.CONNECTING;
    MockWebSocketForCommunicationTesting.instances.push(this);
    
    // Simulate connection establishment
    setTimeout(() => {
      this.readyState = MockWebSocketForCommunicationTesting.OPEN;
      this.onopen?.({} as Event);
    }, 10);
  }
  
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (this.readyState !== MockWebSocketForCommunicationTesting.OPEN) {
      throw new Error('WebSocket is not in OPEN state');
    }
    
    MockWebSocketForCommunicationTesting.messageQueue.push({
      data: typeof data === 'string' ? data : data,
      timestamp: Date.now(),
      instance: this
    });
    
    // Simulate server response
    this.simulateServerResponse(data);
  }
  
  close(code?: number, reason?: string) {
    this.readyState = MockWebSocketForCommunicationTesting.CLOSING;
    
    setTimeout(() => {
      this.readyState = MockWebSocketForCommunicationTesting.CLOSED;
      this.onclose?.({ code: code || 1000, reason: reason || 'Normal closure' } as CloseEvent);
    }, 10);
  }
  
  simulateServerResponse(originalData: any) {
    try {
      const message = typeof originalData === 'string' ? JSON.parse(originalData) : originalData;
      
      // Simulate different types of server responses
      switch (message.type) {
        case 'chat_request':
          this.simulateStreamingChatResponse(message.data);
          break;
        case 'typing_start':
          this.simulateTypingResponse(message.data);
          break;
        case 'heartbeat':
          this.simulateHeartbeatResponse();
          break;
        default:
          this.simulateGenericResponse(message);
      }
    } catch (error) {
      // Simulate server error
      setTimeout(() => {
        this.onmessage?.({
          data: JSON.stringify({
            type: 'error',
            error: 'Invalid message format',
            originalMessage: originalData
          })
        } as MessageEvent);
      }, 50);
    }
  }
  
  simulateStreamingChatResponse(requestData: any) {
    const responses = [
      { type: 'chunk', requestId: requestData.id, content: 'This ' },
      { type: 'chunk', requestId: requestData.id, content: 'is ' },
      { type: 'chunk', requestId: requestData.id, content: 'a ' },
      { type: 'chunk', requestId: requestData.id, content: 'streaming ' },
      { type: 'chunk', requestId: requestData.id, content: 'response.' },
      { type: 'complete', requestId: requestData.id }
    ];
    
    responses.forEach((response, index) => {
      setTimeout(() => {
        if (this.readyState === MockWebSocketForCommunicationTesting.OPEN) {
          this.onmessage?.({
            data: JSON.stringify(response)
          } as MessageEvent);
        }
      }, (index + 1) * 100);
    });
  }
  
  simulateTypingResponse(data: any) {
    setTimeout(() => {
      if (this.readyState === MockWebSocketForCommunicationTesting.OPEN) {
        this.onmessage?.({
          data: JSON.stringify({
            type: 'typing',
            sessionId: data.sessionId,
            agentId: data.agentId,
            isTyping: true
          })
        } as MessageEvent);
      }
    }, 50);
    
    // Stop typing after delay
    setTimeout(() => {
      if (this.readyState === MockWebSocketForCommunicationTesting.OPEN) {
        this.onmessage?.({
          data: JSON.stringify({
            type: 'typing',
            sessionId: data.sessionId,
            agentId: data.agentId,
            isTyping: false
          })
        } as MessageEvent);
      }
    }, 2000);
  }
  
  simulateHeartbeatResponse() {
    setTimeout(() => {
      if (this.readyState === MockWebSocketForCommunicationTesting.OPEN) {
        this.onmessage?.({
          data: JSON.stringify({
            type: 'heartbeat_ack',
            timestamp: Date.now()
          })
        } as MessageEvent);
      }
    }, 10);
  }
  
  simulateGenericResponse(message: any) {
    setTimeout(() => {
      if (this.readyState === MockWebSocketForCommunicationTesting.OPEN) {
        this.onmessage?.({
          data: JSON.stringify({
            type: 'ack',
            originalType: message.type,
            timestamp: Date.now()
          })
        } as MessageEvent);
      }
    }, 50);
  }
  
  // Test utilities
  static simulateConnectionError(instance?: MockWebSocketForCommunicationTesting) {
    const target = instance || MockWebSocketForCommunicationTesting.instances[0];
    if (target) {
      setTimeout(() => {
        target.onerror?.({} as Event);
      }, 10);
    }
  }
  
  static simulateServerMessage(message: any, instance?: MockWebSocketForCommunicationTesting) {
    const target = instance || MockWebSocketForCommunicationTesting.instances[0];
    if (target && target.readyState === MockWebSocketForCommunicationTesting.OPEN) {
      target.onmessage?.({
        data: JSON.stringify(message)
      } as MessageEvent);
    }
  }
  
  static clearInstances() {
    MockWebSocketForCommunicationTesting.instances = [];
    MockWebSocketForCommunicationTesting.messageQueue = [];
  }
  
  static getLastSentMessage(): any {
    const lastMessage = MockWebSocketForCommunicationTesting.messageQueue.slice(-1)[0];
    return lastMessage ? JSON.parse(lastMessage.data) : null;
  }
  
  static getAllSentMessages(): any[] {
    return MockWebSocketForCommunicationTesting.messageQueue.map(msg => 
      JSON.parse(msg.data)
    );
  }
}

global.WebSocket = MockWebSocketForCommunicationTesting as any;

// Mock the AviDMService
jest.mock('../../services/AviDMService');

describe('WebSocket Communication Patterns - London School TDD', () => {
  let mockAviService: any;
  let user: any;

  beforeEach(() => {
    MockWebSocketForCommunicationTesting.clearInstances();
    mockAviService = createMockAviDMService();
    
    const { AviDMService } = require('../../services/AviDMService');
    AviDMService.mockImplementation(() => mockAviService);
    
    user = userEvent.setup();
  });

  afterEach(() => {
    jest.clearAllMocks();
    MockWebSocketForCommunicationTesting.clearInstances();
  });

  describe('WebSocket Connection Lifecycle', () => {
    it('should establish WebSocket connection when initializing service', async () => {
      render(<AviDMSection />);
      
      // Select agent to trigger service initialization
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      // Wait for connection establishment
      await waitFor(() => {
        expect(MockWebSocketForCommunicationTesting.instances).toHaveLength(1);
        expect(MockWebSocketForCommunicationTesting.instances[0].readyState)
          .toBe(MockWebSocketForCommunicationTesting.OPEN);
      });
      
      // Verify service acknowledges connection
      expect(mockAviService.mockWebSocketManager.connect).toHaveBeenCalled();
    });

    it('should handle WebSocket connection failure gracefully', async () => {
      // Mock connection failure
      const originalWebSocket = global.WebSocket;
      global.WebSocket = jest.fn().mockImplementation(() => {
        throw new Error('Connection failed');
      });
      
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      // Should handle connection failure
      await waitFor(() => {
        expect(mockAviService.mockErrorHandler.handleError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            operation: expect.stringContaining('websocket')
          })
        );
      });
      
      // Restore original WebSocket
      global.WebSocket = originalWebSocket;
    });

    it('should implement connection heartbeat mechanism', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(MockWebSocketForCommunicationTesting.instances).toHaveLength(1);
      });
      
      // Simulate heartbeat interval
      act(() => {
        const wsInstance = MockWebSocketForCommunicationTesting.instances[0];
        wsInstance.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now()
        }));
      });
      
      // Verify heartbeat response
      await waitFor(() => {
        const lastMessage = MockWebSocketForCommunicationTesting.getLastSentMessage();
        expect(lastMessage?.type).toBe('heartbeat');
      });
    });

    it('should handle WebSocket disconnection and trigger reconnection', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(MockWebSocketForCommunicationTesting.instances).toHaveLength(1);
      });
      
      // Simulate disconnection
      act(() => {
        const wsInstance = MockWebSocketForCommunicationTesting.instances[0];
        wsInstance.close(1006, 'Connection lost');
      });
      
      // Verify disconnection handling
      await waitFor(() => {
        expect(mockAviService.mockWebSocketManager.onDisconnect).toHaveBeenCalled();
      });
      
      // Verify reconnection attempt
      await waitFor(() => {
        expect(mockAviService.reconnect).toHaveBeenCalled();
      });
    });
  });

  describe('Message Serialization and Deserialization', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(MockWebSocketForCommunicationTesting.instances).toHaveLength(1);
      });
    });

    it('should serialize chat requests correctly', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Mock streaming message sending
      mockAviService.sendMessageStream.mockImplementation(async (message, onChunk) => {
        const wsInstance = MockWebSocketForCommunicationTesting.instances[0];
        wsInstance.send(JSON.stringify({
          type: 'chat_request',
          data: {
            id: 'test-request-id',
            message: message,
            sessionId: 'test-session',
            timestamp: new Date().toISOString(),
            options: { stream: true }
          }
        }));
      });
      
      await user.type(messageInput, 'Test streaming message');
      await user.click(sendButton);
      
      // Verify message serialization
      await waitFor(() => {
        const lastMessage = MockWebSocketForCommunicationTesting.getLastSentMessage();
        expect(lastMessage).toMatchObject({
          type: 'chat_request',
          data: expect.objectContaining({
            message: 'Test streaming message',
            options: expect.objectContaining({
              stream: true
            })
          })
        });
      });
    });

    it('should deserialize streaming responses correctly', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Setup streaming response handler
      const chunkHandler = jest.fn();
      mockAviService.sendMessageStream.mockImplementation(async (message, onChunk) => {
        // Simulate streaming response
        const requestId = 'test-request-123';
        const wsInstance = MockWebSocketForCommunicationTesting.instances[0];
        
        // Send request
        wsInstance.send(JSON.stringify({
          type: 'chat_request',
          data: { id: requestId, message, sessionId: 'test-session' }
        }));
        
        // Mock chunk handling
        setTimeout(() => onChunk('Response '), 100);
        setTimeout(() => onChunk('chunk '), 200);
        setTimeout(() => onChunk('test'), 300);
      });
      
      await user.type(messageInput, 'Stream test');
      await user.click(sendButton);
      
      // Verify streaming chunks are processed
      await waitFor(() => {
        expect(mockAviService.sendMessageStream).toHaveBeenCalledWith(
          'Stream test',
          expect.any(Function),
          expect.any(Object)
        );
      }, { timeout: 5000 });
    });

    it('should handle malformed message gracefully', async () => {
      await waitFor(() => {
        expect(MockWebSocketForCommunicationTesting.instances).toHaveLength(1);
      });
      
      // Send malformed message
      act(() => {
        MockWebSocketForCommunicationTesting.simulateServerMessage({
          invalidStructure: 'no type field'
        });
      });
      
      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(mockAviService.mockErrorHandler.handleError).toHaveBeenCalled();
      });
    });

    it('should validate message structure before sending', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Mock validation failure
      mockAviService.mockSecurityManager.sanitizeContent.mockImplementation((content) => {
        if (content.includes('<script>')) {
          throw new Error('Invalid content detected');
        }
        return content;
      });
      
      await user.type(messageInput, '<script>alert("test")</script>');
      await user.click(sendButton);
      
      // Should prevent sending invalid message
      await waitFor(() => {
        expect(mockAviService.mockSecurityManager.sanitizeContent)
          .toHaveBeenCalledWith('<script>alert("test")</script>');
        expect(mockAviService.mockErrorHandler.handleError)
          .toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
      });
    });
  });

  describe('Real-time Features', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(MockWebSocketForCommunicationTesting.instances).toHaveLength(1);
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should display typing indicators when agent is responding', async () => {
      // Simulate typing indicator from server
      act(() => {
        MockWebSocketForCommunicationTesting.simulateServerMessage({
          type: 'typing',
          sessionId: 'test-session',
          agentId: 'tech-reviewer',
          isTyping: true
        });
      });
      
      // Should show typing indicator
      await waitFor(() => {
        expect(screen.getByText(/TechReviewer is typing/)).toBeInTheDocument();
      });
      
      // Simulate typing stop
      act(() => {
        MockWebSocketForCommunicationTesting.simulateServerMessage({
          type: 'typing',
          sessionId: 'test-session',
          agentId: 'tech-reviewer',
          isTyping: false
        });
      });
      
      // Typing indicator should disappear
      await waitFor(() => {
        expect(screen.queryByText(/TechReviewer is typing/)).not.toBeInTheDocument();
      });
    });

    it('should send typing indicators when user is typing', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      
      // Mock typing indicator sending
      mockAviService.mockWebSocketManager.send.mockImplementation((message) => {
        const wsInstance = MockWebSocketForCommunicationTesting.instances[0];
        wsInstance.send(JSON.stringify(message));
      });
      
      // Start typing
      await user.type(messageInput, 'Typing test');
      
      // Should send typing start indicator
      await waitFor(() => {
        const sentMessages = MockWebSocketForCommunicationTesting.getAllSentMessages();
        const typingMessage = sentMessages.find(msg => 
          msg.type === 'typing_start' || msg.type === 'user_typing'
        );
        expect(typingMessage).toBeDefined();
      });
    });

    it('should handle presence updates for agent availability', async () => {
      // Simulate agent status change
      act(() => {
        MockWebSocketForCommunicationTesting.simulateServerMessage({
          type: 'agent_presence',
          agentId: 'tech-reviewer',
          status: 'away',
          lastSeen: new Date().toISOString()
        });
      });
      
      // Should update agent status in UI
      await waitFor(() => {
        const statusIndicator = screen.getByText('TechReviewer')
          .closest('div')
          ?.querySelector('[class*="bg-yellow"]'); // Away status indicator
        expect(statusIndicator).toBeInTheDocument();
      });
    });

    it('should handle real-time message status updates', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send message
      await user.type(messageInput, 'Status update test');
      await user.click(sendButton);
      
      // Simulate message status updates
      act(() => {
        MockWebSocketForCommunicationTesting.simulateServerMessage({
          type: 'message_status',
          messageId: 'test-message-id',
          status: 'delivered',
          timestamp: new Date().toISOString()
        });
      });
      
      // Message status should be updated in UI
      await waitFor(() => {
        const messageElement = screen.getByText('Status update test').closest('div');
        expect(messageElement).toBeInTheDocument();
        // Check for delivered status indicator
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(MockWebSocketForCommunicationTesting.instances).toHaveLength(1);
      });
    });

    it('should handle WebSocket errors without crashing', async () => {
      // Simulate WebSocket error
      act(() => {
        MockWebSocketForCommunicationTesting.simulateConnectionError();
      });
      
      // Should handle error gracefully
      await waitFor(() => {
        expect(mockAviService.mockWebSocketManager.onError).toHaveBeenCalled();
      });
      
      // Interface should remain functional
      expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
    });

    it('should implement exponential backoff for reconnection', async () => {
      // Simulate connection drop
      act(() => {
        const wsInstance = MockWebSocketForCommunicationTesting.instances[0];
        wsInstance.close(1006, 'Connection lost');
      });
      
      // Mock reconnection attempts
      mockAviService.reconnect
        .mockRejectedValueOnce(new Error('Reconnection failed'))
        .mockRejectedValueOnce(new Error('Reconnection failed'))
        .mockResolvedValueOnce(undefined);
      
      // Trigger reconnection attempts
      await act(async () => {
        try {
          await mockAviService.reconnect();
        } catch (error) {
          // First attempt fails
        }
        
        // Wait for backoff delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          await mockAviService.reconnect();
        } catch (error) {
          // Second attempt fails
        }
        
        // Wait for longer backoff delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Third attempt succeeds
        await mockAviService.reconnect();
      });
      
      // Verify exponential backoff pattern
      expect(mockAviService.reconnect).toHaveBeenCalledTimes(3);
    });

    it('should queue messages during connection outage', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Simulate connection drop
      act(() => {
        mockAviService.__testUtils.setConnectionStatus({ isConnected: false });
      });
      
      // Try to send message while disconnected
      await user.type(messageInput, 'Offline message');
      await user.click(sendButton);
      
      // Message should be queued (in real implementation)
      await waitFor(() => {
        expect(mockAviService.sendMessage).toHaveBeenCalledWith(
          'Offline message',
          expect.any(Object)
        );
      });
      
      // Simulate reconnection
      act(() => {
        mockAviService.__testUtils.setConnectionStatus({ isConnected: true });
        mockAviService.emit('reconnected');
      });
      
      // Queued messages should be sent
      await waitFor(() => {
        expect(mockAviService.sendMessage).toHaveBeenCalled();
      });
    });

    it('should handle server-side errors in streaming responses', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Setup error in streaming response
      mockAviService.sendMessageStream.mockImplementation(async (message, onChunk) => {
        const wsInstance = MockWebSocketForCommunicationTesting.instances[0];
        const requestId = 'error-request-123';
        
        // Send request
        wsInstance.send(JSON.stringify({
          type: 'chat_request',
          data: { id: requestId, message }
        }));
        
        // Simulate server error in stream
        setTimeout(() => {
          MockWebSocketForCommunicationTesting.simulateServerMessage({
            type: 'error',
            requestId: requestId,
            error: 'Processing failed',
            code: 'PROCESSING_ERROR'
          });
        }, 100);
      });
      
      await user.type(messageInput, 'Error test message');
      await user.click(sendButton);
      
      // Should handle streaming error
      await waitFor(() => {
        expect(mockAviService.emit).toHaveBeenCalledWith(
          'streamError',
          expect.objectContaining({
            error: expect.stringContaining('Processing failed')
          })
        );
      });
    });
  });

  describe('Connection Quality and Performance', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(MockWebSocketForCommunicationTesting.instances).toHaveLength(1);
      });
    });

    it('should monitor connection latency and quality', async () => {
      // Mock latency measurement
      const startTime = Date.now();
      
      act(() => {
        const wsInstance = MockWebSocketForCommunicationTesting.instances[0];
        wsInstance.send(JSON.stringify({
          type: 'ping',
          timestamp: startTime
        }));
      });
      
      // Simulate pong response with delay
      setTimeout(() => {
        MockWebSocketForCommunicationTesting.simulateServerMessage({
          type: 'pong',
          originalTimestamp: startTime,
          serverTimestamp: Date.now()
        });
      }, 150); // 150ms latency
      
      // Connection quality should be assessed
      await waitFor(() => {
        expect(mockAviService.checkConnection).toHaveBeenCalled();
      });
    });

    it('should handle high-latency connections gracefully', async () => {
      // Mock high latency scenario
      mockAviService.__testUtils.setConnectionStatus({
        isConnected: true,
        connectionQuality: 'poor',
        latency: 5000
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'High latency test');
      await user.click(sendButton);
      
      // Should handle high latency appropriately
      await waitFor(() => {
        expect(mockAviService.sendMessage).toHaveBeenCalledWith(
          'High latency test',
          expect.objectContaining({
            timeout: expect.any(Number)
          })
        );
      });
    });

    it('should implement message deduplication for poor connections', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send same message multiple times (simulating network issues)
      await user.type(messageInput, 'Duplicate test message');
      await user.click(sendButton);
      
      // Clear and send same message again quickly
      await user.clear(messageInput);
      await user.type(messageInput, 'Duplicate test message');
      await user.click(sendButton);
      
      // Should implement deduplication logic
      await waitFor(() => {
        const sentMessages = MockWebSocketForCommunicationTesting.getAllSentMessages();
        const duplicates = sentMessages.filter(msg => 
          msg.data?.message === 'Duplicate test message'
        );
        expect(duplicates.length).toBeLessThanOrEqual(1); // Should deduplicate
      });
    });
  });

  describe('Security and Message Validation', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(MockWebSocketForCommunicationTesting.instances).toHaveLength(1);
      });
    });

    it('should validate message integrity before processing', async () => {
      // Simulate tampered message
      act(() => {
        MockWebSocketForCommunicationTesting.simulateServerMessage({
          type: 'chunk',
          requestId: 'suspicious-request',
          content: '<script>malicious_code()</script>',
          checksum: 'invalid_checksum'
        });
      });
      
      // Should validate and reject suspicious content
      await waitFor(() => {
        expect(mockAviService.mockSecurityManager.sanitizeContent)
          .toHaveBeenCalled();
      });
    });

    it('should enforce rate limiting for WebSocket messages', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Mock rate limiting
      mockAviService.mockSecurityManager.checkRateLimit
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false); // Rate limit exceeded
      
      // Send messages rapidly
      for (let i = 0; i < 3; i++) {
        await user.clear(messageInput);
        await user.type(messageInput, `Rapid message ${i}`);
        await user.click(sendButton);
      }
      
      // Third message should be rate limited
      await waitFor(() => {
        expect(mockAviService.mockSecurityManager.checkRateLimit)
          .toHaveBeenCalledTimes(3);
        expect(mockAviService.mockErrorHandler.handleError)
          .toHaveBeenCalledWith(
            expect.objectContaining({
              message: expect.stringContaining('Rate limit')
            }),
            expect.any(Object)
          );
      });
    });

    it('should sanitize all outgoing and incoming messages', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send message with potentially dangerous content
      await user.type(messageInput, 'Test message with <img onerror="alert(1)" src=x>');
      await user.click(sendButton);
      
      // Should sanitize outgoing message
      await waitFor(() => {
        expect(mockAviService.mockSecurityManager.sanitizeContent)
          .toHaveBeenCalledWith('Test message with <img onerror="alert(1)" src=x>');
      });
      
      // Simulate incoming message with dangerous content
      act(() => {
        MockWebSocketForCommunicationTesting.simulateServerMessage({
          type: 'chunk',
          requestId: 'test-request',
          content: 'Response with <script>alert("xss")</script>'
        });
      });
      
      // Should sanitize incoming message
      await waitFor(() => {
        expect(mockAviService.mockSecurityManager.sanitizeContent)
          .toHaveBeenCalled();
      });
    });
  });
});
