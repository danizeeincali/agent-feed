/**
 * TDD London School Test Suite for EnhancedChatInterface
 * 
 * Testing enhanced chat interface with image upload support
 * Focus on behavior verification and interaction patterns
 * Mock-driven development for external dependencies
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { EnhancedChatInterface } from '../../../src/components/claude-instances/EnhancedChatInterface';
import {
  ChatInterfaceProps,
  ConversationMessage,
  ClaudeInstance,
  MessageAttachment
} from '../../../src/types/claude-instances';

// London School: Mock collaborator contracts
const mockOnSendMessage = jest.fn();
const mockWebSocketClient = {
  send: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  onMessage: jest.fn(),
  onConnectionChange: jest.fn(),
  readyState: WebSocket.OPEN,
};

const mockSwarmChatCoordinator = {
  shareMessage: jest.fn(),
  coordinateWithPeers: jest.fn(),
  syncConversationState: jest.fn(),
  notifyTyping: jest.fn(),
  shareFileUpload: jest.fn(),
};

const mockFileUploadService = {
  uploadFile: jest.fn(),
  validateFile: jest.fn(),
  generateThumbnail: jest.fn(),
  getUploadProgress: jest.fn(),
};

describe('EnhancedChatInterface - TDD London School', () => {
  const mockInstance: ClaudeInstance = {
    id: 'test-instance',
    type: {
      id: 'claude-default',
      name: 'Claude Default',
      command: 'claude',
      description: 'Test instance',
      available: true,
      configured: true,
      enabled: true,
    },
    status: 'ready',
    connectionState: 'connected',
    createdAt: new Date(),
  };

  const mockMessages: ConversationMessage[] = [
    {
      id: 'msg-1',
      type: 'user',
      content: 'Hello Claude',
      timestamp: new Date(),
    },
    {
      id: 'msg-2', 
      type: 'assistant',
      content: 'Hello! How can I help you?',
      timestamp: new Date(),
    }
  ];

  const defaultProps: ChatInterfaceProps = {
    instanceId: 'test-instance',
    instance: mockInstance,
    messages: mockMessages,
    onSendMessage: mockOnSendMessage,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mock collaborators
    mockWebSocketClient.send.mockClear();
    mockSwarmChatCoordinator.shareMessage.mockClear();
    mockSwarmChatCoordinator.coordinateWithPeers.mockClear();
    mockFileUploadService.uploadFile.mockClear();
    
    // Setup successful upload mock by default
    mockFileUploadService.uploadFile.mockResolvedValue({
      id: 'upload-1',
      url: 'https://example.com/image.jpg',
      thumbnail: 'https://example.com/thumb.jpg'
    });

    mockFileUploadService.validateFile.mockReturnValue({
      isValid: true,
      errors: []
    });
  });

  describe('Message Display and Swarm Synchronization', () => {
    it('should render messages and coordinate display with peer chat agents', () => {
      render(<EnhancedChatInterface {...defaultProps} />);

      expect(screen.getByText('Hello Claude')).toBeInTheDocument();
      expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();

      // Should coordinate message display with swarm
      expect(mockSwarmChatCoordinator.syncConversationState).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        messageCount: 2,
        lastMessageId: 'msg-2',
        conversationLength: expect.any(Number)
      });
    });

    it('should handle message attachments and coordinate with media processing agents', () => {
      const messagesWithAttachments: ConversationMessage[] = [
        {
          id: 'msg-with-image',
          type: 'user',
          content: 'Look at this image',
          attachments: [{
            id: 'att-1',
            type: 'image',
            name: 'test-image.jpg',
            size: 1024,
            url: 'https://example.com/image.jpg',
            thumbnail: 'https://example.com/thumb.jpg'
          }],
          timestamp: new Date(),
        }
      ];

      render(<EnhancedChatInterface {...defaultProps} messages={messagesWithAttachments} />);

      expect(screen.getByText('Look at this image')).toBeInTheDocument();
      expect(screen.getByAltText('test-image.jpg')).toBeInTheDocument();

      // Should coordinate attachment processing with media agents
      expect(mockSwarmChatCoordinator.coordinateWithPeers).toHaveBeenCalledWith({
        action: 'process_attachment',
        attachmentType: 'image',
        processingNeeds: ['thumbnail_generation', 'metadata_extraction']
      });
    });

    it('should auto-scroll to latest messages and coordinate with UI agents', async () => {
      const { rerender } = render(<EnhancedChatInterface {...defaultProps} />);
      
      const newMessages = [
        ...mockMessages,
        {
          id: 'msg-3',
          type: 'assistant',
          content: 'New message',
          timestamp: new Date(),
        }
      ];

      rerender(<EnhancedChatInterface {...defaultProps} messages={newMessages} />);

      await waitFor(() => {
        // Should coordinate scroll behavior with UI coordination agents
        expect(mockSwarmChatCoordinator.coordinateWithPeers).toHaveBeenCalledWith({
          action: 'auto_scroll',
          direction: 'bottom',
          trigger: 'new_message'
        });
      });
    });
  });

  describe('Message Input and Typing Coordination', () => {
    it('should handle text input and coordinate typing indicators with swarm', async () => {
      const user = userEvent.setup();
      render(<EnhancedChatInterface {...defaultProps} />);

      const textArea = screen.getByRole('textbox', { name: /type your message/i });
      await user.type(textArea, 'Test message');

      expect(textArea).toHaveValue('Test message');

      // Should notify swarm about typing activity
      expect(mockSwarmChatCoordinator.notifyTyping).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        isTyping: true,
        content: 'Test message'
      });
    });

    it('should send messages and coordinate with message processing agents', async () => {
      const user = userEvent.setup();
      render(<EnhancedChatInterface {...defaultProps} />);

      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(textArea, 'Hello world');
      await user.click(sendButton);

      // London School: Verify the conversation between objects
      expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world', undefined);
      expect(textArea).toHaveValue(''); // Should clear after sending

      // Should coordinate message processing with swarm
      expect(mockSwarmChatCoordinator.shareMessage).toHaveBeenCalledWith({
        content: 'Hello world',
        type: 'outgoing',
        instanceId: 'test-instance',
        timestamp: expect.any(Date)
      });
    });

    it('should handle keyboard shortcuts and coordinate with accessibility agents', async () => {
      const user = userEvent.setup();
      render(<EnhancedChatInterface {...defaultProps} />);

      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'Message with shortcut');
      
      // Test Ctrl+Enter shortcut
      await user.keyboard('{Control>}{Enter}{/Control}');

      expect(mockOnSendMessage).toHaveBeenCalledWith('Message with shortcut', undefined);

      // Should coordinate keyboard shortcuts with accessibility swarm
      expect(mockSwarmChatCoordinator.coordinateWithPeers).toHaveBeenCalledWith({
        action: 'keyboard_shortcut_used',
        shortcut: 'ctrl_enter',
        accessibility: 'keyboard_navigation'
      });
    });

    it('should handle disabled state and coordinate with connection monitoring agents', async () => {
      const user = userEvent.setup();
      const disconnectedInstance = {
        ...mockInstance,
        connectionState: 'disconnected' as const
      };

      render(<EnhancedChatInterface {...defaultProps} instance={disconnectedInstance} />);

      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i });

      expect(textArea).toBeDisabled();
      expect(sendButton).toBeDisabled();

      // Should coordinate disabled state with connection agents
      expect(mockSwarmChatCoordinator.coordinateWithPeers).toHaveBeenCalledWith({
        action: 'interface_disabled',
        reason: 'connection_lost',
        instanceId: 'test-instance'
      });
    });
  });

  describe('File Upload and Media Coordination', () => {
    it('should handle file selection and coordinate with file processing agents', async () => {
      const user = userEvent.setup();
      render(<EnhancedChatInterface {...defaultProps} />);

      const fileInput = screen.getByLabelText(/attach files/i);
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, testFile);

      // Should validate file with file service
      expect(mockFileUploadService.validateFile).toHaveBeenCalledWith(testFile);

      // Should coordinate file upload with swarm
      expect(mockSwarmChatCoordinator.shareFileUpload).toHaveBeenCalledWith({
        fileName: 'test.jpg',
        fileType: 'image/jpeg',
        fileSize: testFile.size,
        instanceId: 'test-instance'
      });
    });

    it('should display upload progress and coordinate with progress tracking agents', async () => {
      const user = userEvent.setup();
      mockFileUploadService.getUploadProgress.mockReturnValue(50);

      render(<EnhancedChatInterface {...defaultProps} />);

      const fileInput = screen.getByLabelText(/attach files/i);
      const testFile = new File(['test content'], 'uploading.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, testFile);

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByText(/50%/)).toBeInTheDocument();
      });

      // Should coordinate progress with tracking agents
      expect(mockSwarmChatCoordinator.coordinateWithPeers).toHaveBeenCalledWith({
        action: 'upload_progress',
        progress: 50,
        fileName: 'uploading.jpg'
      });
    });

    it('should handle upload errors and coordinate with error handling agents', async () => {
      const user = userEvent.setup();
      mockFileUploadService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      render(<EnhancedChatInterface {...defaultProps} />);

      const fileInput = screen.getByLabelText(/attach files/i);
      const testFile = new File(['test content'], 'error.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, testFile);

      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });

      // Should coordinate error handling with swarm
      expect(mockSwarmChatCoordinator.coordinateWithPeers).toHaveBeenCalledWith({
        action: 'upload_error',
        error: 'Upload failed',
        fileName: 'error.jpg',
        recovery: 'retry_available'
      });
    });

    it('should send messages with attachments and coordinate with message delivery agents', async () => {
      const user = userEvent.setup();
      render(<EnhancedChatInterface {...defaultProps} />);

      const textArea = screen.getByRole('textbox');
      const fileInput = screen.getByLabelText(/attach files/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      await user.type(textArea, 'Check out this image!');
      await user.upload(fileInput, testFile);
      await user.click(sendButton);

      // Should send message with attachments
      expect(mockOnSendMessage).toHaveBeenCalledWith(
        'Check out this image!',
        [testFile]
      );

      // Should coordinate multimodal message with delivery agents
      expect(mockSwarmChatCoordinator.coordinateWithPeers).toHaveBeenCalledWith({
        action: 'multimodal_message',
        hasText: true,
        hasAttachments: true,
        attachmentTypes: ['image']
      });
    });
  });

  describe('Loading States and Connection Coordination', () => {
    it('should display loading state and coordinate with progress agents', () => {
      render(<EnhancedChatInterface {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('status', { name: /sending/i })).toBeInTheDocument();
      expect(screen.getByText(/sending/i)).toBeInTheDocument();

      // Should coordinate loading state with progress tracking
      expect(mockSwarmChatCoordinator.coordinateWithPeers).toHaveBeenCalledWith({
        action: 'message_processing',
        state: 'loading',
        instanceId: 'test-instance'
      });
    });

    it('should handle connection errors and coordinate recovery with connection agents', async () => {
      const errorInstance = {
        ...mockInstance,
        connectionState: 'error' as const
      };

      render(<EnhancedChatInterface {...defaultProps} instance={errorInstance} />);

      expect(screen.getByText(/connection error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

      // Should coordinate error recovery with connection agents
      expect(mockSwarmChatCoordinator.coordinateWithPeers).toHaveBeenCalledWith({
        action: 'connection_error',
        instanceId: 'test-instance',
        recovery: 'retry_available',
        errorType: 'connection_state_error'
      });
    });

    it('should handle reconnection and coordinate with connection stability agents', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<EnhancedChatInterface {...defaultProps} 
        instance={{...mockInstance, connectionState: 'error'}} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Simulate successful reconnection
      rerender(<EnhancedChatInterface {...defaultProps} 
        instance={{...mockInstance, connectionState: 'connected'}} />);

      // Should coordinate successful reconnection
      expect(mockSwarmChatCoordinator.coordinateWithPeers).toHaveBeenCalledWith({
        action: 'connection_restored',
        instanceId: 'test-instance',
        recovery_time: expect.any(Number)
      });
    });
  });

  describe('Message Threading and Context Coordination', () => {
    it('should maintain conversation context and coordinate with context agents', () => {
      render(<EnhancedChatInterface {...defaultProps} />);

      // Should maintain conversation thread
      const messageElements = screen.getAllByTestId(/message-/);
      expect(messageElements).toHaveLength(2);

      // Should coordinate context with memory agents
      expect(mockSwarmChatCoordinator.syncConversationState).toHaveBeenCalledWith({
        conversationId: expect.any(String),
        messageHistory: expect.arrayContaining([
          expect.objectContaining({ id: 'msg-1' }),
          expect.objectContaining({ id: 'msg-2' })
        ])
      });
    });

    it('should handle message reactions and coordinate with sentiment analysis agents', async () => {
      const user = userEvent.setup();
      render(<EnhancedChatInterface {...defaultProps} />);

      const messageWithReaction = screen.getByTestId('message-msg-2');
      const reactionButton = within(messageWithReaction).getByRole('button', { name: /react/i });
      
      await user.click(reactionButton);

      // Should coordinate reaction with sentiment agents
      expect(mockSwarmChatCoordinator.coordinateWithPeers).toHaveBeenCalledWith({
        action: 'message_reaction',
        messageId: 'msg-2',
        reaction: 'thumbs_up',
        sentiment: 'positive'
      });
    });

    it('should handle message editing and coordinate with version control agents', async () => {
      const user = userEvent.setup();
      render(<EnhancedChatInterface {...defaultProps} />);

      const userMessage = screen.getByTestId('message-msg-1');
      const editButton = within(userMessage).getByRole('button', { name: /edit/i });
      
      await user.click(editButton);

      // Should coordinate message editing with version control
      expect(mockSwarmChatCoordinator.coordinateWithPeers).toHaveBeenCalledWith({
        action: 'message_edit_start',
        messageId: 'msg-1',
        originalContent: 'Hello Claude',
        versioning: true
      });
    });
  });

  describe('Contract Verification - London School Style', () => {
    it('should define clear contract for message sending callback', async () => {
      const mockSendCallback = jest.fn();
      const user = userEvent.setup();
      
      render(<EnhancedChatInterface {...defaultProps} onSendMessage={mockSendCallback} />);

      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'Test message');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Contract: onSendMessage(content: string, attachments?: File[])
      expect(mockSendCallback).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array)
      );
      expect(mockSendCallback).toHaveBeenCalledTimes(1);
    });

    it('should enforce contract for attachment handling', async () => {
      const mockSendCallback = jest.fn();
      const user = userEvent.setup();
      
      render(<EnhancedChatInterface {...defaultProps} onSendMessage={mockSendCallback} />);

      const fileInput = screen.getByLabelText(/attach files/i);
      const testFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, testFile);
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Contract: attachments should be File[] when present
      expect(mockSendCallback).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.any(File)
        ])
      );
    });
  });

  describe('Performance and Resource Coordination', () => {
    it('should coordinate message batching with performance optimization agents', async () => {
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        type: 'assistant' as const,
        content: `Message ${i}`,
        timestamp: new Date(),
      }));

      render(<EnhancedChatInterface {...defaultProps} messages={manyMessages} />);

      // Should coordinate message batching for performance
      expect(mockSwarmChatCoordinator.coordinateWithPeers).toHaveBeenCalledWith({
        action: 'optimize_rendering',
        messageCount: 100,
        batchingRequired: true,
        virtualScrolling: true
      });
    });

    it('should coordinate memory cleanup with resource management agents', () => {
      const { unmount } = render(<EnhancedChatInterface {...defaultProps} />);

      unmount();

      // Should coordinate cleanup with resource management
      expect(mockSwarmChatCoordinator.coordinateWithPeers).toHaveBeenCalledWith({
        action: 'cleanup_resources',
        instanceId: 'test-instance',
        resources: ['websocket', 'file_uploads', 'message_cache']
      });
    });
  });
});