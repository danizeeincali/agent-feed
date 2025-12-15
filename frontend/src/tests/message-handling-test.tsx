/**
 * Message Handling System Test
 * Tests the new robust message queue and processing system
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DualModeInterface from '../components/claude-manager/DualModeInterface';
import { getGlobalMessageQueue, destroyGlobalMessageQueue } from '../services/MessageQueue';
import { getGlobalMessageProcessor, destroyGlobalMessageProcessor } from '../services/MessageProcessor';
import { getGlobalWebSocketService, destroyGlobalWebSocketService } from '../services/WebSocketService';

// Mock WebSocket
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState = WebSocket.CONNECTING;
  url = '';
  
  constructor(url: string) {
    this.url = url;
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }
  
  send(data: string) {
    console.log('MockWebSocket send:', data);
    // Simulate echo response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'ack',
            messageId: JSON.parse(data).messageId
          })
        }));
      }
    }, 5);
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code: 1000 }));
  }
}

// Mock global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('Message Handling System', () => {
  beforeEach(() => {
    // Clean up any existing services
    destroyGlobalMessageQueue();
    destroyGlobalMessageProcessor();
    destroyGlobalWebSocketService();
  });
  
  afterEach(() => {
    // Clean up after each test
    destroyGlobalMessageQueue();
    destroyGlobalMessageProcessor();
    destroyGlobalWebSocketService();
  });
  
  const mockInstance = {
    id: 'test-claude-instance',
    name: 'Test Claude Instance',
    status: 'running' as const,
    pid: 12345,
    startTime: new Date()
  };
  
  const mockProps = {
    selectedInstance: mockInstance,
    output: {},
    connectionType: 'websocket',
    isConnected: true,
    onSendInput: jest.fn(),
    onInstanceSelect: jest.fn(),
    instances: [mockInstance],
    loading: false,
    error: null
  };

  it('should initialize message queue and processor', () => {
    render(<DualModeInterface {...mockProps} />);
    
    const messageQueue = getGlobalMessageQueue();
    const messageProcessor = getGlobalMessageProcessor();
    
    expect(messageQueue).toBeDefined();
    expect(messageProcessor).toBeDefined();
    
    // Check initial stats
    const queueStats = messageQueue.getStats();
    const processorStats = messageProcessor.getStats();
    
    expect(queueStats.queueSize).toBe(0);
    expect(processorStats.chatMessages).toBe(0);
    expect(processorStats.terminalMessages).toBe(0);
  });
  
  it('should display message statistics in UI', () => {
    render(<DualModeInterface {...mockProps} />);
    
    // Should show message counts
    expect(screen.getByText('0 msgs')).toBeInTheDocument();
    expect(screen.getByText('0 terminal')).toBeInTheDocument();
    expect(screen.getByText('0 tools')).toBeInTheDocument();
  });
  
  it('should handle message queue deduplication', () => {
    const messageQueue = getGlobalMessageQueue();
    
    const message1 = {
      id: 'test-msg-1',
      type: 'chat' as const,
      content: 'Hello',
      instanceId: 'test-instance'
    };
    
    const message2 = {
      id: 'test-msg-1', // Same ID - should be deduplicated
      type: 'chat' as const,
      content: 'Hello again',
      instanceId: 'test-instance'
    };
    
    const result1 = messageQueue.enqueue(message1);
    const result2 = messageQueue.enqueue(message2);
    
    expect(result1).toBe(true); // First message should be enqueued
    expect(result2).toBe(false); // Duplicate should be rejected
    
    const stats = messageQueue.getStats();
    expect(stats.queueSize).toBe(1);
  });
  
  it('should classify messages correctly', () => {
    const messageProcessor = getGlobalMessageProcessor();
    
    const chatMessage = {
      id: 'chat-1',
      type: 'chat' as const,
      content: 'I can help you with that task.',
      timestamp: Date.now(),
      instanceId: 'test-instance'
    };
    
    const toolMessage = {
      id: 'tool-1',
      type: 'terminal' as const,
      content: '<function_calls>\n<invoke name="Read">',
      timestamp: Date.now(),
      instanceId: 'test-instance'
    };
    
    const terminalMessage = {
      id: 'terminal-1',
      type: 'terminal' as const,
      content: 'Directory listing:\nfile1.txt\nfile2.txt',
      timestamp: Date.now(),
      instanceId: 'test-instance'
    };
    
    const processedChat = messageProcessor.processMessage(chatMessage);
    const processedTool = messageProcessor.processMessage(toolMessage);
    const processedTerminal = messageProcessor.processMessage(terminalMessage);
    
    expect(processedChat.length).toBeGreaterThan(0);
    expect(processedChat[0].displayType).toBe('chat-assistant');
    
    expect(processedTool.length).toBeGreaterThan(0);
    expect(processedTool[0].displayType).toBe('tool-call');
    
    expect(processedTerminal.length).toBeGreaterThan(0);
    expect(processedTerminal[0].displayType).toBe('terminal-output');
  });
  
  it('should handle WebSocket connection', async () => {
    const webSocketService = getGlobalWebSocketService();
    
    await webSocketService.connect();
    
    expect(webSocketService.isConnected()).toBe(true);
    
    const stats = webSocketService.getStats();
    expect(stats.connection.isConnected).toBe(true);
  });
  
  it('should render different message types with proper styling', () => {
    render(<DualModeInterface {...mockProps} />);
    
    // Check that view mode selector is present
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Terminal')).toBeInTheDocument();
    expect(screen.getByText('Both')).toBeInTheDocument();
  });
  
  it('should switch between view modes', () => {
    render(<DualModeInterface {...mockProps} />);
    
    // Default should be split view (Both)
    const chatSection = screen.getByText('AI Conversation');
    const terminalSection = screen.getByText('Terminal Monitor');
    
    expect(chatSection).toBeInTheDocument();
    expect(terminalSection).toBeInTheDocument();
    
    // Switch to chat only
    fireEvent.click(screen.getByText('Chat'));
    
    expect(screen.getByText('AI Conversation')).toBeInTheDocument();
    // Terminal section should still be visible in DOM but hidden
    
    // Switch to terminal only
    fireEvent.click(screen.getByText('Terminal'));
    
    expect(screen.getByText('Terminal Monitor')).toBeInTheDocument();
  });
  
  it('should handle message sending', async () => {
    const { container } = render(<DualModeInterface {...mockProps} />);
    
    const messageInput = container.querySelector('textarea');
    const sendButton = container.querySelector('button[type="submit"]');
    
    expect(messageInput).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
    
    if (messageInput && sendButton) {
      fireEvent.change(messageInput, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
      
      // Should show the message in chat immediately (optimistic update)
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    }
  });
  
  it('should display connection status correctly', () => {
    render(<DualModeInterface {...mockProps} />);
    
    // Should show connected status
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getAllByText('Live')).toHaveLength(2); // One in each view
  });
  
  it('should handle error states', () => {
    const propsWithError = {
      ...mockProps,
      error: 'Connection failed'
    };
    
    render(<DualModeInterface {...propsWithError} />);
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });
  
  it('should show proper empty states', () => {
    render(<DualModeInterface {...mockProps} />);
    
    // Chat empty state
    expect(screen.getByText('Start a conversation with Claude AI')).toBeInTheDocument();
    
    // Terminal empty state  
    expect(screen.getByText('Waiting for Claude Code output...')).toBeInTheDocument();
  });
});

// Integration test for full message flow
describe('Message Flow Integration', () => {
  beforeEach(() => {
    destroyGlobalMessageQueue();
    destroyGlobalMessageProcessor();
    destroyGlobalWebSocketService();
  });
  
  afterEach(() => {
    destroyGlobalMessageQueue();
    destroyGlobalMessageProcessor();
    destroyGlobalWebSocketService();
  });
  
  it('should process messages through the complete pipeline', async () => {
    const messageQueue = getGlobalMessageQueue();
    const messageProcessor = getGlobalMessageProcessor();
    
    // Add a consumer to capture processed messages
    const processedMessages: any[] = [];
    messageQueue.addConsumer({
      onMessage: async (message) => {
        const processed = messageProcessor.processMessage(message);
        processedMessages.push(...processed);
        messageQueue.acknowledge(message.id);
      }
    });
    
    // Enqueue a test message
    const testMessage = {
      id: 'integration-test-1',
      type: 'chat' as const,
      content: 'I\'ll help you implement this feature.',
      instanceId: 'test-instance'
    };
    
    messageQueue.enqueue(testMessage);
    
    // Wait for processing
    await waitFor(() => {
      expect(processedMessages.length).toBeGreaterThan(0);
    });
    
    // Verify message was processed correctly
    expect(processedMessages[0].type).toBe('chat');
    expect(processedMessages[0].displayType).toBe('chat-assistant');
    expect(processedMessages[0].content).toContain('help you implement');
  });
});
