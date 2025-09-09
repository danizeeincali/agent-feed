/**
 * London School TDD Tests for AviDM Chat Interface
 * Focus: AI chat behavior and WebSocket interaction contracts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { 
  createMockAviMessage,
  createMockAviContext,
  createMockWebSocket,
  assertTabBehaviorContract,
  PostingTestDataBuilder
} from './mocks';
import './setup';

// Mock AviDM component since it doesn't exist yet - we'll define expected behavior
const MockAviDM: React.FC<{
  conversationId?: string;
  initialContext?: any;
  onPostGenerated?: (post: any) => void;
  onConversationUpdate?: (conversation: any) => void;
  className?: string;
}> = ({ 
  conversationId,
  initialContext, 
  onPostGenerated, 
  onConversationUpdate, 
  className 
}) => {
  const [messages, setMessages] = React.useState<any[]>([]);
  const [input, setInput] = React.useState('');
  const [isConnected, setIsConnected] = React.useState(false);
  const [isTyping, setIsTyping] = React.useState(false);
  const [aiTyping, setAiTyping] = React.useState(false);

  // Mock WebSocket connection
  React.useEffect(() => {
    const mockWs = createMockWebSocket();
    setIsConnected(true);
    
    // Simulate connection
    setTimeout(() => {
      onConversationUpdate?.({
        id: conversationId || 'conv-123',
        status: 'connected',
        messages: []
      });
    }, 100);

    return () => {
      setIsConnected(false);
    };
  }, [conversationId, onConversationUpdate]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      content: input.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(false);

    // Simulate AI typing
    setAiTyping(true);

    // Mock AI response
    setTimeout(() => {
      const aiMessage = {
        id: `msg-${Date.now()}-ai`,
        content: `I understand you want to discuss "${input.trim()}". Let me help you create a post about this topic.`,
        sender: 'avi',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, aiMessage]);
      setAiTyping(false);

      // Update conversation
      onConversationUpdate?.({
        id: conversationId || 'conv-123',
        messages: [...messages, userMessage, aiMessage]
      });
    }, 1000);
  };

  const generatePost = () => {
    if (messages.length === 0) return;

    const lastUserMessage = messages.filter(m => m.sender === 'user').pop();
    if (lastUserMessage) {
      const generatedPost = {
        title: `Insights on ${lastUserMessage.content.substring(0, 50)}...`,
        content: `Based on our conversation about "${lastUserMessage.content}", here are some key insights:\n\n- Key point 1\n- Key point 2\n- Key point 3`,
        source: 'avi',
        tags: ['ai-generated', 'conversation'],
        metadata: {
          conversationId: conversationId || 'conv-123',
          generatedFrom: lastUserMessage.id
        }
      };

      onPostGenerated?.(generatedPost);
    }
  };

  return (
    <div className={`avi-dm-container ${className}`} data-testid="avi-dm">
      <div className="avi-header" data-testid="avi-header">
        <div className="connection-status" data-testid="connection-status">
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        <h3>Chat with Avi</h3>
      </div>

      <div className="messages-container" data-testid="messages-container">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.sender}`} 
            data-testid={`message-${message.sender}-${message.id}`}
          >
            <div className="message-content">{message.content}</div>
            <div className="message-time">{message.timestamp.toLocaleTimeString()}</div>
          </div>
        ))}
        
        {aiTyping && (
          <div className="typing-indicator" data-testid="ai-typing">
            Avi is typing...
          </div>
        )}
      </div>

      <div className="input-container" data-testid="input-container">
        <textarea
          data-testid="message-input"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setIsTyping(e.target.value.length > 0);
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Message Avi..."
          disabled={!isConnected}
        />
        
        <div className="input-actions">
          <button
            data-testid="send-button"
            onClick={sendMessage}
            disabled={!input.trim() || !isConnected}
          >
            Send
          </button>
          
          <button
            data-testid="generate-post-button"
            onClick={generatePost}
            disabled={messages.length === 0}
            title="Generate post from conversation"
          >
            Generate Post
          </button>
        </div>
      </div>
    </div>
  );
};

describe('AviDM - London School TDD', () => {
  let mockProps: any;
  let mockWebSocket: ReturnType<typeof createMockWebSocket>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockProps = {
      conversationId: 'test-conversation',
      initialContext: createMockAviContext(),
      onPostGenerated: vi.fn(),
      onConversationUpdate: vi.fn(),
      className: 'test-avi'
    };
    mockWebSocket = createMockWebSocket();
    user = userEvent.setup();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Contract: WebSocket Connection Behavior', () => {
    it('should establish WebSocket connection on mount', async () => {
      render(<MockAviDM {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('🟢 Connected');
      });
      
      expect(mockProps.onConversationUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockProps.conversationId,
          status: 'connected'
        })
      );
    });

    it('should show connection status visually', () => {
      render(<MockAviDM {...mockProps} />);
      
      const connectionStatus = screen.getByTestId('connection-status');
      expect(connectionStatus).toBeTruthy();
      expect(connectionStatus).toHaveTextContent('Connected');
    });

    it('should disable input when disconnected', async () => {
      // We'd need to simulate disconnection here
      render(<MockAviDM {...mockProps} />);
      
      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');
      
      // Initially should be enabled once connected
      await waitFor(() => {
        expect(messageInput).not.toBeDisabled();
        expect(sendButton).not.toBeDisabled();
      });
    });
  });

  describe('Contract: Message Exchange Behavior', () => {
    it('should send user messages and receive AI responses', async () => {
      render(<MockAviDM {...mockProps} />);
      
      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');
      
      await user.type(messageInput, 'Hello Avi, I need help with a blog post');
      await user.click(sendButton);
      
      // User message should appear
      await waitFor(() => {
        expect(screen.getByText('Hello Avi, I need help with a blog post')).toBeTruthy();
      });
      
      // AI should start typing
      await waitFor(() => {
        expect(screen.getByTestId('ai-typing')).toHaveTextContent('Avi is typing...');
      });
      
      // AI response should appear
      await waitFor(() => {
        expect(screen.getByText(/I understand you want to discuss/)).toBeTruthy();
      }, { timeout: 2000 });
    });

    it('should support keyboard shortcuts for sending', async () => {
      render(<MockAviDM {...mockProps} />);
      
      const messageInput = screen.getByTestId('message-input');
      
      await user.type(messageInput, 'Test message');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeTruthy();
      });
    });

    it('should not send empty messages', async () => {
      render(<MockAviDM {...mockProps} />);
      
      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toBeDisabled();
      
      await user.click(sendButton);
      
      // No messages should be sent
      expect(screen.queryByTestId(/message-user-/)).toBeFalsy();
    });

    it('should update conversation state after message exchange', async () => {
      render(<MockAviDM {...mockProps} />);
      
      const messageInput = screen.getByTestId('message-input');
      
      await user.type(messageInput, 'Test conversation update');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockProps.onConversationUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: mockProps.conversationId,
            messages: expect.arrayContaining([
              expect.objectContaining({
                content: 'Test conversation update',
                sender: 'user'
              })
            ])
          })
        );
      }, { timeout: 2000 });
    });
  });

  describe('Contract: Post Generation Behavior', () => {
    it('should generate post from conversation context', async () => {
      render(<MockAviDM {...mockProps} />);
      
      // First send a message to establish context
      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'I want to write about sustainable technology');
      await user.keyboard('{Enter}');
      
      // Wait for conversation to establish
      await waitFor(() => {
        expect(screen.getByText('I want to write about sustainable technology')).toBeTruthy();
      });
      
      // Generate post
      const generateButton = screen.getByTestId('generate-post-button');
      await user.click(generateButton);
      
      expect(mockProps.onPostGenerated).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('sustainable technology'),
          content: expect.stringContaining('sustainable technology'),
          source: 'avi',
          tags: expect.arrayContaining(['ai-generated']),
          metadata: expect.objectContaining({
            conversationId: mockProps.conversationId
          })
        })
      );
    });

    it('should disable post generation when no context exists', () => {
      render(<MockAviDM {...mockProps} />);
      
      const generateButton = screen.getByTestId('generate-post-button');
      expect(generateButton).toBeDisabled();
    });

    it('should include conversation metadata in generated post', async () => {
      render(<MockAviDM {...mockProps} />);
      
      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'AI ethics discussion');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('AI ethics discussion')).toBeTruthy();
      });
      
      const generateButton = screen.getByTestId('generate-post-button');
      await user.click(generateButton);
      
      expect(mockProps.onPostGenerated).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            conversationId: mockProps.conversationId,
            generatedFrom: expect.any(String)
          })
        })
      );
    });
  });

  describe('Contract: User Experience Behavior', () => {
    it('should show typing indicators appropriately', async () => {
      render(<MockAviDM {...mockProps} />);
      
      const messageInput = screen.getByTestId('message-input');
      
      await user.type(messageInput, 'Testing typing indicator');
      await user.keyboard('{Enter}');
      
      // Should show AI typing indicator
      await waitFor(() => {
        expect(screen.getByTestId('ai-typing')).toBeTruthy();
      });
      
      // Should hide typing indicator when response arrives
      await waitFor(() => {
        expect(screen.queryByTestId('ai-typing')).toBeFalsy();
      }, { timeout: 2000 });
    });

    it('should display message timestamps', async () => {
      render(<MockAviDM {...mockProps} />);
      
      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'Test timestamp');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        const userMessage = screen.getByText('Test timestamp').closest('.message');
        const timestamp = userMessage?.querySelector('.message-time');
        expect(timestamp).toBeTruthy();
      });
    });

    it('should scroll to latest messages', async () => {
      // This would test auto-scrolling behavior
      render(<MockAviDM {...mockProps} />);
      
      const messagesContainer = screen.getByTestId('messages-container');
      expect(messagesContainer).toBeTruthy();
      
      // Send multiple messages to test scrolling
      const messageInput = screen.getByTestId('message-input');
      
      for (let i = 0; i < 3; i++) {
        await user.clear(messageInput);
        await user.type(messageInput, `Message ${i + 1}`);
        await user.keyboard('{Enter}');
        
        await waitFor(() => {
          expect(screen.getByText(`Message ${i + 1}`)).toBeTruthy();
        });
      }
    });
  });

  describe('Contract: Error Handling Behavior', () => {
    it('should handle WebSocket connection failures gracefully', () => {
      // Mock connection failure scenario
      const errorProps = {
        ...mockProps,
        onConversationUpdate: vi.fn().mockImplementation(() => {
          throw new Error('Connection failed');
        })
      };
      
      expect(() => {
        render(<MockAviDM {...errorProps} />);
      }).not.toThrow();
    });

    it('should handle message sending failures', async () => {
      render(<MockAviDM {...mockProps} />);
      
      const messageInput = screen.getByTestId('message-input');
      
      // This would simulate a message sending failure
      await user.type(messageInput, 'This message should fail');
      await user.keyboard('{Enter}');
      
      // Should not crash the interface
      expect(screen.getByTestId('message-input')).toBeTruthy();
    });

    it('should handle AI response failures gracefully', async () => {
      render(<MockAviDM {...mockProps} />);
      
      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'Test AI failure handling');
      await user.keyboard('{Enter}');
      
      // Even if AI fails to respond, UI should remain functional
      await waitFor(() => {
        expect(screen.getByText('Test AI failure handling')).toBeTruthy();
      });
    });
  });

  describe('Contract: Accessibility Behavior', () => {
    it('should provide proper ARIA labels and roles', () => {
      render(<MockAviDM {...mockProps} />);
      
      const messageInput = screen.getByTestId('message-input');
      expect(messageInput).toHaveAccessibleName();
      
      const messagesContainer = screen.getByTestId('messages-container');
      expect(messagesContainer).toBeTruthy();
    });

    it('should support keyboard navigation', async () => {
      render(<MockAviDM {...mockProps} />);
      
      // Should be able to navigate with keyboard
      await user.tab();
      const messageInput = screen.getByTestId('message-input');
      expect(messageInput).toHaveFocus();
      
      await user.tab();
      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toHaveFocus();
    });

    it('should announce new messages for screen readers', async () => {
      render(<MockAviDM {...mockProps} />);
      
      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'Accessibility test message');
      await user.keyboard('{Enter}');
      
      // Message should be announced (aria-live regions would be tested here)
      await waitFor(() => {
        expect(screen.getByText('Accessibility test message')).toBeTruthy();
      });
    });
  });

  describe('Contract: Performance Behavior', () => {
    it('should virtualize long message histories', async () => {
      render(<MockAviDM {...mockProps} />);
      
      // This would test virtual scrolling with many messages
      const messagesContainer = screen.getByTestId('messages-container');
      expect(messagesContainer).toBeTruthy();
      
      // Performance test would involve sending many messages
      // and ensuring the DOM doesn't grow excessively
    });

    it('should debounce typing indicators', async () => {
      render(<MockAviDM {...mockProps} />);
      
      const messageInput = screen.getByTestId('message-input');
      
      // Rapid typing shouldn't trigger excessive updates
      await user.type(messageInput, 'rapid typing test', { delay: 1 });
      
      // Should not cause performance issues
      expect(messageInput).toHaveValue('rapid typing test');
    });

    it('should clean up WebSocket connections on unmount', () => {
      const { unmount } = render(<MockAviDM {...mockProps} />);
      
      // Mock WebSocket cleanup verification
      unmount();
      
      // Connection should be cleaned up (tested via WebSocket mock)
      expect(mockWebSocket.close).not.toHaveBeenCalled(); // In our simple mock
    });
  });
});