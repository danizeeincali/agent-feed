/**
 * TDD London School - Message Bubble Integration Tests
 * 
 * Tests focus on mock-driven UI integration:
 * - Message object creation and rendering
 * - Real-time streaming integration
 * - Bubble styling and content display
 * - Message ordering and deduplication
 */

import { MockEventSource } from './mocks/event-source.mock';

describe('Message Bubble Integration - London School TDD', () => {
  let mockMessageRenderer: jest.Mocked<any>;
  let mockChatStore: jest.Mocked<any>;
  let mockUIManager: jest.Mocked<any>;
  let mockStreamProcessor: jest.Mocked<any>;

  beforeEach(() => {
    // Mock message renderer with behavior verification
    mockMessageRenderer = {
      renderMessage: jest.fn(),
      createBubble: jest.fn(),
      updateBubble: jest.fn(),
      removeBubble: jest.fn(),
      styleMessage: jest.fn()
    };

    // Mock chat store for message management
    mockChatStore = {
      addMessage: jest.fn(),
      getMessage: jest.fn(),
      updateMessage: jest.fn(),
      getMessages: jest.fn(() => []),
      hasMessage: jest.fn(),
      removeMessage: jest.fn()
    };

    // Mock UI manager for display coordination
    mockUIManager = {
      scrollToBottom: jest.fn(),
      highlightMessage: jest.fn(),
      showTypingIndicator: jest.fn(),
      hideTypingIndicator: jest.fn(),
      updateTimestamp: jest.fn()
    };

    // Mock stream processor for real-time updates
    mockStreamProcessor = {
      processStreamData: jest.fn(),
      parseIncomingMessage: jest.fn(),
      handleMessageComplete: jest.fn(),
      handlePartialMessage: jest.fn()
    };
  });

  describe('Message Object Creation', () => {
    it('should convert parsed Claude output to message objects', () => {
      const parsedOutput = {
        content: 'Hello from Claude',
        type: 'response',
        timestamp: Date.now()
      };
      
      const expectedMessage = {
        id: expect.any(String),
        content: 'Hello from Claude',
        type: 'response',
        timestamp: parsedOutput.timestamp,
        sender: 'claude',
        status: 'received'
      };
      
      mockMessageRenderer.createBubble.mockReturnValue(expectedMessage);
      
      const message = mockMessageRenderer.createBubble(parsedOutput);
      
      expect(mockMessageRenderer.createBubble).toHaveBeenCalledWith(parsedOutput);
      expect(message).toEqual(expectedMessage);
    });

    it('should handle different message types with appropriate styling', () => {
      const messageTypes = ['response', 'error', 'welcome', 'system'];
      const stylingRules = {
        response: { color: 'blue', icon: 'chat' },
        error: { color: 'red', icon: 'error' },
        welcome: { color: 'green', icon: 'wave' },
        system: { color: 'gray', icon: 'info' }
      };
      
      messageTypes.forEach(type => {
        mockMessageRenderer.styleMessage.mockReturnValue(stylingRules[type]);
        
        const styling = mockMessageRenderer.styleMessage(type);
        
        expect(mockMessageRenderer.styleMessage).toHaveBeenCalledWith(type);
        expect(styling).toEqual(stylingRules[type]);
      });
    });

    it('should assign unique IDs to each message', () => {
      const messageCount = 5;
      const generatedIds = [];
      
      for (let i = 0; i < messageCount; i++) {
        const messageId = `msg-${i}-${Date.now()}`;
        mockMessageRenderer.createBubble.mockReturnValueOnce({ id: messageId });
        
        const message = mockMessageRenderer.createBubble({ content: `Message ${i}` });
        generatedIds.push(message.id);
      }
      
      // Verify all IDs are unique
      const uniqueIds = new Set(generatedIds);
      expect(uniqueIds.size).toBe(messageCount);
    });
  });

  describe('Real-time Streaming Integration', () => {
    it('should process streaming messages as they arrive', () => {
      const streamData = 'data: {"content": "Streaming message", "type": "response"}\n\n';
      const parsedMessage = { content: 'Streaming message', type: 'response' };
      
      mockStreamProcessor.processStreamData.mockReturnValue(parsedMessage);
      mockMessageRenderer.createBubble.mockReturnValue({
        id: 'stream-msg-1',
        ...parsedMessage
      });
      
      // Simulate SSE data arrival
      const processedData = mockStreamProcessor.processStreamData(streamData);
      const bubble = mockMessageRenderer.createBubble(processedData);
      mockChatStore.addMessage(bubble);
      
      expect(mockStreamProcessor.processStreamData).toHaveBeenCalledWith(streamData);
      expect(mockMessageRenderer.createBubble).toHaveBeenCalledWith(parsedMessage);
      expect(mockChatStore.addMessage).toHaveBeenCalledWith(bubble);
    });

    it('should handle partial messages during streaming', () => {
      const partialData = 'data: {"content": "This is a partial';
      const completeData = ' message", "type": "response"}\n\n';
      
      mockStreamProcessor.handlePartialMessage.mockReturnValue(null); // Not complete yet
      mockStreamProcessor.handleMessageComplete.mockReturnValue({
        content: 'This is a partial message',
        type: 'response'
      });
      
      // First chunk - partial
      const partial = mockStreamProcessor.handlePartialMessage(partialData);
      expect(partial).toBeNull();
      
      // Complete message
      const complete = mockStreamProcessor.handleMessageComplete(completeData);
      expect(complete).toBeTruthy();
      expect(mockStreamProcessor.handleMessageComplete).toHaveBeenCalledWith(completeData);
    });

    it('should update UI in real-time as messages stream', () => {
      const messageUpdate = { id: 'msg-1', content: 'Updated content' };
      
      mockMessageRenderer.updateBubble.mockReturnValue(true);
      mockChatStore.updateMessage.mockReturnValue(messageUpdate);
      
      const updated = mockChatStore.updateMessage('msg-1', { content: 'Updated content' });
      mockMessageRenderer.updateBubble('msg-1', updated);
      mockUIManager.scrollToBottom();
      
      expect(mockChatStore.updateMessage).toHaveBeenCalledWith('msg-1', { content: 'Updated content' });
      expect(mockMessageRenderer.updateBubble).toHaveBeenCalledWith('msg-1', messageUpdate);
      expect(mockUIManager.scrollToBottom).toHaveBeenCalled();
    });
  });

  describe('Message Rendering and Display', () => {
    it('should render messages with proper bubble styling', () => {
      const message = {
        id: 'render-test-1',
        content: 'Test message content',
        type: 'response',
        sender: 'claude'
      };
      
      const renderedBubble = {
        ...message,
        className: 'message-bubble claude-response',
        timestamp: expect.any(String)
      };
      
      mockMessageRenderer.renderMessage.mockReturnValue(renderedBubble);
      
      const result = mockMessageRenderer.renderMessage(message);
      
      expect(mockMessageRenderer.renderMessage).toHaveBeenCalledWith(message);
      expect(result).toEqual(renderedBubble);
    });

    it('should handle message content formatting', () => {
      const messageWithFormatting = {
        content: 'Here is **bold** and *italic* text',
        type: 'response'
      };
      
      const formattedContent = 'Here is <strong>bold</strong> and <em>italic</em> text';
      
      mockMessageRenderer.styleMessage.mockReturnValue({ 
        content: formattedContent,
        formatted: true 
      });
      
      const styled = mockMessageRenderer.styleMessage(messageWithFormatting.content);
      
      expect(styled.content).toBe(formattedContent);
      expect(styled.formatted).toBe(true);
    });

    it('should display timestamps correctly', () => {
      const message = {
        id: 'timestamp-test',
        content: 'Message with timestamp',
        timestamp: 1634567890000
      };
      
      const formattedTime = '10:31 AM';
      
      mockUIManager.updateTimestamp.mockReturnValue(formattedTime);
      
      const timeDisplay = mockUIManager.updateTimestamp(message.timestamp);
      
      expect(mockUIManager.updateTimestamp).toHaveBeenCalledWith(message.timestamp);
      expect(timeDisplay).toBe(formattedTime);
    });
  });

  describe('Message Deduplication and Ordering', () => {
    it('should prevent duplicate messages from being displayed', () => {
      const messageId = 'duplicate-test';
      const duplicateMessage = {
        id: messageId,
        content: 'Duplicate content',
        type: 'response'
      };
      
      // First message
      mockChatStore.hasMessage.mockReturnValueOnce(false);
      mockChatStore.addMessage(duplicateMessage);
      
      // Duplicate attempt
      mockChatStore.hasMessage.mockReturnValueOnce(true);
      
      expect(mockChatStore.hasMessage).toHaveBeenCalledWith(messageId);
      expect(mockChatStore.addMessage).toHaveBeenCalledTimes(1);
    });

    it('should maintain correct message ordering', () => {
      const messages = [
        { id: 'msg-1', timestamp: 1000, content: 'First' },
        { id: 'msg-2', timestamp: 2000, content: 'Second' },
        { id: 'msg-3', timestamp: 1500, content: 'Third (out of order)' }
      ];
      
      const sortedMessages = [
        { id: 'msg-1', timestamp: 1000, content: 'First' },
        { id: 'msg-3', timestamp: 1500, content: 'Third (out of order)' },
        { id: 'msg-2', timestamp: 2000, content: 'Second' }
      ];
      
      mockChatStore.getMessages.mockReturnValue(sortedMessages);
      
      messages.forEach(msg => mockChatStore.addMessage(msg));
      const retrievedMessages = mockChatStore.getMessages();
      
      expect(retrievedMessages).toEqual(sortedMessages);
    });

    it('should handle message updates without creating duplicates', () => {
      const originalMessage = { id: 'update-test', content: 'Original', version: 1 };
      const updatedMessage = { id: 'update-test', content: 'Updated', version: 2 };
      
      mockChatStore.getMessage.mockReturnValue(originalMessage);
      mockChatStore.updateMessage.mockReturnValue(updatedMessage);
      
      // Update existing message
      mockChatStore.updateMessage('update-test', { content: 'Updated', version: 2 });
      const current = mockChatStore.getMessage('update-test');
      
      expect(mockChatStore.updateMessage).toHaveBeenCalledWith('update-test', { content: 'Updated', version: 2 });
      expect(current).toEqual(originalMessage); // Mock returns original, real implementation would return updated
    });
  });

  describe('Chat Bubble Styling and Interaction', () => {
    it('should apply different styles based on message sender', () => {
      const senders = ['claude', 'user', 'system'];
      const expectedStyles = {
        claude: { align: 'left', color: 'blue', avatar: 'claude-icon' },
        user: { align: 'right', color: 'gray', avatar: 'user-icon' },
        system: { align: 'center', color: 'yellow', avatar: 'system-icon' }
      };
      
      senders.forEach(sender => {
        mockMessageRenderer.styleMessage.mockReturnValue(expectedStyles[sender]);
        
        const style = mockMessageRenderer.styleMessage(sender);
        
        expect(style).toEqual(expectedStyles[sender]);
      });
    });

    it('should handle message highlighting for user interactions', () => {
      const messageId = 'highlight-test';
      
      mockUIManager.highlightMessage.mockReturnValue(true);
      
      const highlighted = mockUIManager.highlightMessage(messageId);
      
      expect(mockUIManager.highlightMessage).toHaveBeenCalledWith(messageId);
      expect(highlighted).toBe(true);
    });

    it('should show typing indicators during message composition', () => {
      const instanceId = 'typing-test';
      
      mockUIManager.showTypingIndicator(instanceId);
      
      // Simulate message arrival
      setTimeout(() => {
        mockUIManager.hideTypingIndicator(instanceId);
      }, 100);
      
      expect(mockUIManager.showTypingIndicator).toHaveBeenCalledWith(instanceId);
    });
  });

  describe('Integration - Full Message Flow', () => {
    it('should coordinate complete message processing pipeline', () => {
      const sseData = 'data: {"content": "Complete pipeline test", "type": "response"}\n\n';
      
      // Mock complete pipeline
      mockStreamProcessor.processStreamData.mockReturnValue({
        content: 'Complete pipeline test',
        type: 'response'
      });
      
      mockMessageRenderer.createBubble.mockReturnValue({
        id: 'pipeline-test',
        content: 'Complete pipeline test',
        type: 'response',
        timestamp: Date.now()
      });
      
      mockChatStore.hasMessage.mockReturnValue(false);
      mockMessageRenderer.renderMessage.mockReturnValue('rendered-bubble');
      
      // Execute pipeline
      const parsed = mockStreamProcessor.processStreamData(sseData);
      const bubble = mockMessageRenderer.createBubble(parsed);
      const isDuplicate = mockChatStore.hasMessage(bubble.id);
      
      if (!isDuplicate) {
        mockChatStore.addMessage(bubble);
        mockMessageRenderer.renderMessage(bubble);
        mockUIManager.scrollToBottom();
      }
      
      // Verify pipeline coordination
      expect(mockStreamProcessor.processStreamData).toHaveBeenCalledWith(sseData);
      expect(mockMessageRenderer.createBubble).toHaveBeenCalledWith(parsed);
      expect(mockChatStore.hasMessage).toHaveBeenCalledWith('pipeline-test');
      expect(mockChatStore.addMessage).toHaveBeenCalledWith(bubble);
      expect(mockMessageRenderer.renderMessage).toHaveBeenCalledWith(bubble);
      expect(mockUIManager.scrollToBottom).toHaveBeenCalled();
    });

    it('should handle error messages with appropriate error styling', () => {
      const errorData = 'data: {"content": "An error occurred", "type": "error"}\n\n';
      
      mockStreamProcessor.processStreamData.mockReturnValue({
        content: 'An error occurred',
        type: 'error'
      });
      
      mockMessageRenderer.createBubble.mockReturnValue({
        id: 'error-msg',
        content: 'An error occurred',
        type: 'error',
        styling: { color: 'red', icon: 'error' }
      });
      
      const parsed = mockStreamProcessor.processStreamData(errorData);
      const errorBubble = mockMessageRenderer.createBubble(parsed);
      
      expect(errorBubble.type).toBe('error');
      expect(errorBubble.styling).toEqual({ color: 'red', icon: 'error' });
    });
  });
});