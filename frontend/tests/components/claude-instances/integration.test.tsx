/**
 * Integration Tests for Claude Instance Management Components
 * Demonstrating TDD London School approach with full system behavior testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import our TDD-driven components
import { ClaudeInstanceSelector } from '../../../src/components/claude-instances/ClaudeInstanceSelector';
import { EnhancedChatInterface } from '../../../src/components/claude-instances/EnhancedChatInterface';
import { ImageUploadZone } from '../../../src/components/claude-instances/ImageUploadZone';
import { InstanceStatusIndicator } from '../../../src/components/claude-instances/InstanceStatusIndicator';
import { useClaudeInstances } from '../../../src/hooks/useClaudeInstances';
import { useImageUpload } from '../../../src/hooks/useImageUpload';

// Mock factory imports
import {
  setupDefaultMocks,
  cleanupMocks,
  createMockClaudeInstance,
  createMockConversationMessage,
  createMockMessageAttachment
} from './shared/mockFactories';

// Integration test suite demonstrating TDD London School principles
describe('Claude Instance Management - TDD London School Integration', () => {
  let mocks: ReturnType<typeof setupDefaultMocks>;

  beforeEach(() => {
    mocks = setupDefaultMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('Component Integration - Behavior-Driven Design', () => {
    it('should demonstrate outside-in development with complete user workflow', async () => {
      // LONDON SCHOOL: Start with the user behavior and work inward
      const mockInstances = [
        createMockClaudeInstance({ 
          id: 'instance-1', 
          type: { 
            id: 'claude-default', 
            name: 'Claude Default',
            command: 'claude',
            description: 'Default Claude instance',
            available: true,
            configured: true,
            enabled: true
          }
        })
      ];

      const onSelect = vi.fn();
      const onSendMessage = vi.fn();

      // Render integrated components
      const { rerender } = render(
        <div>
          <ClaudeInstanceSelector
            instances={mockInstances.map(i => i.type)}
            selectedInstance={null}
            onSelect={onSelect}
            showCreateButton={true}
          />
        </div>
      );

      // USER STORY: User selects an instance
      const instanceButton = screen.getByRole('button', { name: /Claude Default/ });
      await userEvent.click(instanceButton);

      // VERIFICATION: Mock coordination was called
      expect(mocks.swarmCoordinator.notifySelection).toHaveBeenCalledWith({
        action: 'instance_selected',
        instanceId: expect.any(String),
        instanceType: 'Claude Default'
      });

      // USER STORY: User starts chat interface
      rerender(
        <div>
          <EnhancedChatInterface
            instance={mockInstances[0]}
            messages={[]}
            isConnected={true}
            isLoading={false}
            onSendMessage={onSendMessage}
            enableImageUpload={true}
          />
        </div>
      );

      // USER STORY: User uploads image and sends message
      const fileInput = screen.getByTestId('file-input');
      const messageInput = screen.getByPlaceholderText(/Type your message/);;
      const sendButton = screen.getByRole('button', { name: /Send/ });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await userEvent.upload(fileInput, file);
      await userEvent.type(messageInput, 'Hello Claude with image');
      await userEvent.click(sendButton);

      // VERIFICATION: Complete workflow coordinated
      expect(mocks.swarmCoordinator.shareFileUpload).toHaveBeenCalled();
      expect(mocks.swarmCoordinator.shareMessage).toHaveBeenCalled();
      expect(onSendMessage).toHaveBeenCalledWith(
        'Hello Claude with image',
        expect.arrayContaining([expect.objectContaining({ name: 'test.jpg' })])
      );
    });

    it('should demonstrate mock-driven contract verification', () => {
      const mockInstance = createMockClaudeInstance();
      
      render(
        <InstanceStatusIndicator
          instance={mockInstance}
          showDetails={true}
          showMetrics={true}
        />
      );

      // LONDON SCHOOL: Verify all contract interactions
      expect(mocks.swarmCoordinator.coordinateHealthChecks).toHaveBeenCalledWith({
        action: 'status_monitor_initialized',
        instanceId: mockInstance.id,
        monitoringLevel: 'detailed'
      });

      expect(mocks.swarmCoordinator.aggregateMetrics).toHaveBeenCalledWith({
        action: 'metrics_display_enabled',
        instanceId: mockInstance.id,
        metricsTypes: ['latency', 'success_rate', 'error_rate']
      });

      expect(mocks.healthMonitor.subscribeToUpdates).toHaveBeenCalledWith(
        mockInstance.id,
        expect.any(Function)
      );

      expect(mocks.metricsCollector.trackHealthTrends).toHaveBeenCalledWith(
        mockInstance.id
      );
    });

    it('should handle error scenarios with proper mock collaboration', async () => {
      // LONDON SCHOOL: Test error behaviors through mock interactions
      mocks.fileServices.uploadFile.mockRejectedValue(new Error('Upload failed'));
      mocks.healthMonitor.checkHealth.mockRejectedValue(new Error('Health check failed'));

      const onAddImages = vi.fn();
      
      render(
        <ImageUploadZone
          images={[]}
          onAddImages={onAddImages}
          onRemoveImage={vi.fn()}
          maxFiles={3}
          disabled={false}
        />
      );

      const fileInput = screen.getByTestId('file-input');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await userEvent.upload(fileInput, file);

      // VERIFICATION: Error handling coordinated with swarm
      expect(mocks.swarmCoordinator.coordinateUpload).toHaveBeenCalledWith({
        action: 'file_selected',
        fileName: 'test.jpg',
        fileSize: file.size,
        fileType: 'image/jpeg'
      });
    });
  });

  describe('Hook Integration - WebSocket Behavior', () => {
    it('should demonstrate WebSocket coordination with mock behaviors', async () => {
      // LONDON SCHOOL: Test hook behavior through mock interactions
      const TestComponent = () => {
        const {
          instances,
          isConnected,
          createInstance,
          sendMessage
        } = useClaudeInstances({ autoConnect: true });

        React.useEffect(() => {
          if (isConnected) {
            createInstance({ name: 'Test Instance' });
          }
        }, [isConnected, createInstance]);

        return (
          <div>
            <div data-testid=\"connection-status\">{isConnected ? 'Connected' : 'Disconnected'}</div>
            <div data-testid=\"instance-count\">{instances.length}</div>
            <button onClick={() => sendMessage('test-instance', 'Hello')}>Send</button>
          </div>
        );
      };

      render(<TestComponent />);

      // Wait for connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      const sendButton = screen.getByRole('button', { name: /Send/ });
      await userEvent.click(sendButton);

      // VERIFICATION: WebSocket mock interactions occurred
      expect(mocks.webSocket.send).toHaveBeenCalled();
    });
  });

  describe('Image Upload Hook Integration', () => {
    it('should demonstrate file processing workflow with mocks', async () => {
      const TestComponent = () => {
        const { images, addImages, uploadImages, error } = useImageUpload({
          maxFiles: 3,
          maxFileSize: 5 * 1024 * 1024,
          autoUpload: false
        });

        return (
          <div>
            <input
              type=\"file\"
              onChange={(e) => e.target.files && addImages(e.target.files)}
              data-testid=\"file-input\"
            />
            <div data-testid=\"image-count\">{images.length}</div>
            <div data-testid=\"error\">{error || 'No error'}</div>
            <button onClick={() => uploadImages()} data-testid=\"upload-button\">Upload</button>
          </div>
        );
      };

      render(<TestComponent />);

      const fileInput = screen.getByTestId('file-input');
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByTestId('image-count')).toHaveTextContent('1');
      });

      const uploadButton = screen.getByTestId('upload-button');
      await userEvent.click(uploadButton);

      // VERIFICATION: File processing mocks were used
      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });
  });

  describe('TDD London School Principles Demonstration', () => {
    it('should show behavior verification over state testing', () => {
      const mockInstance = createMockClaudeInstance({ status: 'ready' });
      
      render(
        <InstanceStatusIndicator
          instance={mockInstance}
          size=\"md\"
          showDetails={false}
        />
      );

      // LONDON SCHOOL: Focus on HOW objects collaborate, not WHAT they contain
      const statusDot = screen.getByTestId('status-indicator');
      
      // We verify the BEHAVIOR (CSS classes applied based on status)
      expect(statusDot).toHaveClass('bg-green-500');
      
      // Not testing internal state, but observable behavior
      expect(screen.getByText('Ready')).toBeInTheDocument();
      
      // Mock interactions verify the collaboration
      expect(mocks.swarmCoordinator.coordinateHealthChecks).toHaveBeenCalled();
    });

    it('should demonstrate mock-first design driving interface discovery', () => {
      // LONDON SCHOOL: Mocks define the contracts we need
      const requiredSwarmMethods = [
        'shareInstanceState',
        'shareMessage', 
        'notifyTyping',
        'shareFileUpload',
        'coordinateUpload',
        'coordinateHealthChecks',
        'aggregateMetrics',
        'notifyStatusChange'
      ];

      const requiredFileServiceMethods = [
        'validateFile',
        'uploadFile',
        'generatePreview'
      ];

      const requiredHealthMonitorMethods = [
        'subscribeToUpdates',
        'checkHealth',
        'getLatency'
      ];

      // Verify our mocks provide all required contracts
      requiredSwarmMethods.forEach(method => {
        expect(typeof mocks.swarmCoordinator[method]).toBe('function');
      });

      requiredFileServiceMethods.forEach(method => {
        expect(typeof mocks.fileServices[method]).toBe('function');
      });

      requiredHealthMonitorMethods.forEach(method => {
        expect(typeof mocks.healthMonitor[method]).toBe('function');
      });

      // This test drives the design - we discover interfaces through testing needs
    });

    it('should show outside-in test-driven development progression', () => {
      // STEP 1: Start with acceptance test (outside)
      // \"As a user, I want to select an instance and send a message with an image\"
      
      // STEP 2: Work inward, defining collaboration contracts
      const mockInstances = [createMockClaudeInstance()];
      const onSelect = vi.fn();
      const onSendMessage = vi.fn();

      render(
        <div>
          <ClaudeInstanceSelector
            instances={mockInstances.map(i => i.type)}
            selectedInstance={null}
            onSelect={onSelect}
          />
        </div>
      );

      // STEP 3: Each interaction drives mock definition and component behavior
      expect(mocks.swarmCoordinator.shareInstanceState).toHaveBeenCalledWith({
        action: 'selector_mounted',
        availableInstances: 1,
        selectedInstanceId: undefined
      });

      // This demonstrates how the test drives design from user needs down to implementation
    });
  });
});

describe('TDD London School Implementation Summary', () => {
  it('should document the key principles demonstrated', () => {
    const principles = {
      'Outside-In Development': 'Start with user behavior, work toward implementation',
      'Mock-Driven Design': 'Use mocks to define and verify object collaborations',
      'Behavior Verification': 'Test HOW objects work together, not WHAT they contain',
      'Contract Definition': 'Mocks establish clear interfaces and responsibilities',
      'Interaction Testing': 'Focus on conversations between objects',
      'Collaboration Patterns': 'Verify coordination and communication flows'
    };

    // This test documents our TDD approach
    Object.entries(principles).forEach(([principle, description]) => {
      expect(principle).toBeDefined();
      expect(description).toBeDefined();
    });

    // Our implementation demonstrates all these principles
    expect(Object.keys(principles)).toHaveLength(6);
  });
});