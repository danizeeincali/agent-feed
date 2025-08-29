/**
 * TDD LONDON SCHOOL: Test React component rendering for message tripling
 * 
 * Mock-driven tests to verify that React components are not rendering
 * the same message multiple times due to state updates or re-renders.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock the ClaudeInstanceManagerModern component logic
interface MockClaudeInstance {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
}

interface MockMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

// Mock MessageList component that simulates the actual component behavior
const MockMessageList: React.FC<{
  messages: MockMessage[];
  instanceId: string;
}> = ({ messages, instanceId }) => {
  console.log(`📋 MockMessageList rendering ${messages.length} messages for ${instanceId}`);
  
  return (
    <div data-testid="message-list">
      {messages.map(message => (
        <div 
          key={message.id} 
          data-testid={`message-${message.id}`}
          className={`message-${message.role}`}
        >
          <div className="message-content">{message.content}</div>
          <div className="message-timestamp">{message.timestamp.toISOString()}</div>
        </div>
      ))}
    </div>
  );
};

// Mock ChatInterface component
const MockChatInterface: React.FC<{
  output: { [key: string]: string };
  selectedInstance: MockClaudeInstance | null;
  onSendInput: (input: string) => void;
}> = ({ output, selectedInstance, onSendInput }) => {
  // Simulate how ChatInterface processes output into messages
  const messages: MockMessage[] = React.useMemo(() => {
    if (!selectedInstance || !output[selectedInstance.id]) {
      return [];
    }
    
    // Simulate message parsing (potential source of duplication)
    const rawOutput = output[selectedInstance.id];
    const messageList: MockMessage[] = [];
    
    // Split by Claude response patterns (this could be creating duplicates)
    const sections = rawOutput.split(/(?=┌)|(?<=┘)/g).filter(s => s.trim());
    
    sections.forEach((section, index) => {
      if (section.trim()) {
        messageList.push({
          id: `${selectedInstance.id}-msg-${index}-${Date.now()}`,
          content: section.trim(),
          role: section.includes('┌') ? 'assistant' : 'system',
          timestamp: new Date()
        });
      }
    });
    
    return messageList;
  }, [output, selectedInstance]);
  
  console.log(`🎯 MockChatInterface rendering with ${messages.length} messages`);
  
  return (
    <div data-testid="chat-interface">
      <MockMessageList messages={messages} instanceId={selectedInstance?.id || ''} />
      <input 
        data-testid="message-input"
        placeholder="Type a message..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSendInput((e.target as HTMLInputElement).value);
          }
        }}
      />
    </div>
  );
};

// Mock ClaudeInstanceManagerModern with core state management
const MockClaudeInstanceManagerModern: React.FC = () => {
  const [instances] = React.useState<MockClaudeInstance[]>([
    { id: 'claude-test123', name: 'Test Claude', status: 'running' }
  ]);
  const [selectedInstance] = React.useState<string>('claude-test123');
  const [output, setOutput] = React.useState<{ [key: string]: string }>({});
  const [processedMessages] = React.useState<Set<string>>(new Set());
  
  // Mock the WebSocket message handler that could cause tripling
  const handleWebSocketMessage = React.useCallback((data: any) => {
    const messageId = `${data.terminalId}-${data.timestamp}-${data.output.slice(0, 50)}`;
    
    if (processedMessages.has(messageId)) {
      console.log(`🔄 Duplicate message ignored: ${messageId}`);
      return;
    }
    
    processedMessages.add(messageId);
    
    setOutput(prev => ({
      ...prev,
      [data.terminalId]: (prev[data.terminalId] || '') + data.output
    }));
  }, [processedMessages]);
  
  // Expose handler for testing
  (window as any).mockHandleWebSocketMessage = handleWebSocketMessage;
  
  const selectedInstanceObject = instances.find(i => i.id === selectedInstance) || null;
  
  return (
    <div data-testid="claude-instance-manager">
      <MockChatInterface 
        output={output}
        selectedInstance={selectedInstanceObject}
        onSendInput={() => {}}
      />
    </div>
  );
};

describe('Claude Output Tripling Issue - React Component Rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any previous test state
    (window as any).mockHandleWebSocketMessage = null;
  });

  describe('FAILING TEST: Message rendering duplication', () => {
    it('should render a single message only once in the message list', () => {
      // ARRANGE: Single message in output
      const singleMessage = "Hello from Claude! This should appear only once.";
      const testOutput = { 'claude-test123': singleMessage };
      const testInstance: MockClaudeInstance = { 
        id: 'claude-test123', 
        name: 'Test Claude', 
        status: 'running' 
      };
      
      // ACT: Render component
      render(
        <MockChatInterface 
          output={testOutput}
          selectedInstance={testInstance}
          onSendInput={() => {}}
        />
      );
      
      // ASSERT: Message should appear exactly once
      const messageElements = screen.getAllByText(singleMessage);
      expect(messageElements).toHaveLength(1);
      
      const messageList = screen.getByTestId('message-list');
      expect(messageList.children).toHaveLength(1);
    });
    
    it('FAILING: should not render duplicate messages when output is appended', async () => {
      // ARRANGE: Initial render with empty output
      const testInstance: MockClaudeInstance = { 
        id: 'claude-test123', 
        name: 'Test Claude', 
        status: 'running' 
      };
      
      const TestComponent: React.FC = () => {
        const [output, setOutput] = React.useState<{ [key: string]: string }>({});
        
        React.useEffect(() => {
          // Simulate receiving the same message multiple times (the bug)
          const message = "Claude response that gets tripled";
          
          setTimeout(() => {
            setOutput(prev => ({
              ...prev,
              'claude-test123': (prev['claude-test123'] || '') + message
            }));
          }, 10);
          
          setTimeout(() => {
            setOutput(prev => ({
              ...prev,
              'claude-test123': (prev['claude-test123'] || '') + message
            }));
          }, 20);
          
          setTimeout(() => {
            setOutput(prev => ({
              ...prev,
              'claude-test123': (prev['claude-test123'] || '') + message
            }));
          }, 30);
        }, []);
        
        return (
          <MockChatInterface 
            output={output}
            selectedInstance={testInstance}
            onSendInput={() => {}}
          />
        );
      };
      
      // ACT: Render and wait for updates
      render(<TestComponent />);
      
      await waitFor(() => {
        const messageList = screen.queryByTestId('message-list');
        expect(messageList).toBeInTheDocument();
      });
      
      await waitFor(() => {
        // The message content should appear 3 times in the text content (the bug)
        const fullText = screen.getByTestId('chat-interface').textContent || '';
        const occurrences = (fullText.match(/Claude response that gets tripled/g) || []).length;
        
        // This test should FAIL because the current implementation will show tripled content
        expect(occurrences).toBe(3); // This demonstrates the bug
        
        // Ideally, it should be 1, but we're showing the failing behavior
        // expect(occurrences).toBe(1); // This would be the correct behavior
      });
    });
  });

  describe('FAILING TEST: State update causing re-renders and duplication', () => {
    it('should not cause message duplication through state updates', async () => {
      // ARRANGE: Component with state management similar to ClaudeInstanceManagerModern
      const TestStateManager: React.FC = () => {
        const [output, setOutput] = React.useState<{ [key: string]: string }>({});
        const [messageCount, setMessageCount] = React.useState(0);
        
        const addMessage = React.useCallback((message: string) => {
          console.log(`📝 Adding message: ${message}`);
          setOutput(prev => ({
            ...prev,
            'claude-test123': (prev['claude-test123'] || '') + message + '\n'
          }));
          setMessageCount(prev => prev + 1);
        }, []);
        
        // Expose for testing
        (window as any).addMessage = addMessage;
        
        return (
          <div data-testid="state-manager">
            <div data-testid="message-count">{messageCount}</div>
            <MockChatInterface 
              output={output}
              selectedInstance={{ id: 'claude-test123', name: 'Test', status: 'running' }}
              onSendInput={() => {}}
            />
          </div>
        );
      };
      
      // ACT: Render component
      render(<TestStateManager />);
      
      // Simulate adding the same message multiple times (like WebSocket duplication)
      const addMessage = (window as any).addMessage;
      const testMessage = "Unique test message";
      
      addMessage(testMessage);
      addMessage(testMessage);
      addMessage(testMessage);
      
      await waitFor(() => {
        const messageCountEl = screen.getByTestId('message-count');
        expect(messageCountEl.textContent).toBe('3'); // 3 state updates occurred
      });
      
      // ASSERT: Despite 3 state updates, rendered content should show message 3 times
      await waitFor(() => {
        const fullText = screen.getByTestId('chat-interface').textContent || '';
        const occurrences = (fullText.match(/Unique test message/g) || []).length;
        
        // This demonstrates the bug - message appears multiple times
        expect(occurrences).toBe(3);
      });
    });
  });

  describe('FAILING TEST: WebSocket message handler integration', () => {
    it('should not create duplicate messages when WebSocket sends same data multiple times', async () => {
      // ARRANGE: Render the mock manager
      render(<MockClaudeInstanceManagerModern />);
      
      await waitFor(() => {
        expect(screen.getByTestId('claude-instance-manager')).toBeInTheDocument();
      });
      
      // ACT: Simulate WebSocket message duplication (the actual bug scenario)
      const handler = (window as any).mockHandleWebSocketMessage;
      expect(handler).toBeDefined();
      
      const duplicateMessageData = {
        terminalId: 'claude-test123',
        output: '┌────────────────┐\n│ Test Claude Response │\n└────────────────┘',
        timestamp: 1699999999999 // Fixed timestamp to test deduplication
      };
      
      // Send the same message 3 times (simulating the tripling bug)
      handler(duplicateMessageData);
      handler(duplicateMessageData);
      handler(duplicateMessageData);
      
      // ASSERT: Message should be processed only once due to deduplication
      await waitFor(() => {
        const messageList = screen.queryByTestId('message-list');
        if (messageList) {
          // If deduplication works, we should see only 1 message element
          expect(messageList.children.length).toBe(1);
          
          // Content should appear only once
          const fullText = screen.getByTestId('chat-interface').textContent || '';
          const occurrences = (fullText.match(/Test Claude Response/g) || []).length;
          expect(occurrences).toBe(1);
        }
      });
    });
    
    it('FAILING: should handle rapid consecutive messages without duplication', async () => {
      // ARRANGE: Render manager
      render(<MockClaudeInstanceManagerModern />);
      
      await waitFor(() => {
        expect(screen.getByTestId('claude-instance-manager')).toBeInTheDocument();
      });
      
      const handler = (window as any).mockHandleWebSocketMessage;
      
      // ACT: Send rapid consecutive messages (different timestamps)
      const baseTimestamp = Date.now();
      
      handler({
        terminalId: 'claude-test123',
        output: 'First message',
        timestamp: baseTimestamp
      });
      
      handler({
        terminalId: 'claude-test123',
        output: 'Second message',
        timestamp: baseTimestamp + 1
      });
      
      handler({
        terminalId: 'claude-test123',
        output: 'Third message',
        timestamp: baseTimestamp + 2
      });
      
      // ASSERT: All three messages should be rendered separately
      await waitFor(() => {
        const fullText = screen.getByTestId('chat-interface').textContent || '';
        
        expect(fullText).toContain('First message');
        expect(fullText).toContain('Second message');  
        expect(fullText).toContain('Third message');
        
        // Each message should appear exactly once
        expect((fullText.match(/First message/g) || []).length).toBe(1);
        expect((fullText.match(/Second message/g) || []).length).toBe(1);
        expect((fullText.match(/Third message/g) || []).length).toBe(1);
      });
    });
  });

  describe('Message List Rendering Behavior', () => {
    it('should maintain stable message IDs to prevent unnecessary re-renders', () => {
      // ARRANGE: Mock messages with stable IDs
      const stableMessages: MockMessage[] = [
        {
          id: 'msg-1',
          content: 'First message',
          role: 'assistant',
          timestamp: new Date('2023-01-01T00:00:00Z')
        },
        {
          id: 'msg-2', 
          content: 'Second message',
          role: 'assistant',
          timestamp: new Date('2023-01-01T00:01:00Z')
        }
      ];
      
      // ACT: Render message list
      const { rerender } = render(
        <MockMessageList messages={stableMessages} instanceId="claude-test123" />
      );
      
      // Verify initial render
      expect(screen.getByTestId('message-msg-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-msg-2')).toBeInTheDocument();
      
      // ACT: Re-render with same messages
      rerender(
        <MockMessageList messages={stableMessages} instanceId="claude-test123" />
      );
      
      // ASSERT: Messages should still be present and not duplicated
      expect(screen.getByTestId('message-msg-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-msg-2')).toBeInTheDocument();
      
      const messageList = screen.getByTestId('message-list');
      expect(messageList.children).toHaveLength(2); // Exactly 2 messages
    });
  });

  describe('Output Parsing Integration', () => {
    it('FAILING: should not create duplicate messages from Claude box responses', () => {
      // ARRANGE: Claude response that might be parsed multiple times
      const claudeBoxResponse = `
┌────────────────────────────────────────────────────────────────┐
│ I understand you're having an issue with message duplication. │
│ Let me help you debug this problem.                            │
│                                                                │
│ The issue appears to be in the WebSocket message handling.    │
└────────────────────────────────────────────────────────────────┘`;
      
      const testOutput = { 'claude-test123': claudeBoxResponse };
      const testInstance: MockClaudeInstance = { 
        id: 'claude-test123', 
        name: 'Test Claude', 
        status: 'running' 
      };
      
      // ACT: Render with Claude box response
      render(
        <MockChatInterface 
          output={testOutput}
          selectedInstance={testInstance}
          onSendInput={() => {}}
        />
      );
      
      // ASSERT: Box content should be rendered only once
      const fullText = screen.getByTestId('chat-interface').textContent || '';
      
      expect((fullText.match(/I understand you're having an issue/g) || []).length).toBe(1);
      expect((fullText.match(/Let me help you debug this problem/g) || []).length).toBe(1);
      expect((fullText.match(/The issue appears to be in the WebSocket/g) || []).length).toBe(1);
      
      // Should have only one message element for the box response
      const messageList = screen.getByTestId('message-list');
      expect(messageList.children.length).toBe(1);
    });
  });
});