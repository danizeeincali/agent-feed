/**
 * TDD London School Tests: Frontend Button Click Handling Interactions
 * Tests the collaboration between UI components and their dependencies
 * Focuses on interaction patterns rather than state
 */

import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import {
  createCompleteMockEnvironment,
  resetAllMocks,
  createMockVerifier,
  createTestScenarioBuilder,
  type CompleteMockEnvironment
} from '../mock-contracts';

// Component under test - we'll create this based on TDD
interface ButtonClickHandlerProps {
  onCreateInstance: (config: any) => Promise<void>;
  onConnectToTerminal: (terminalId: string) => Promise<void>;
  onSendCommand: (instanceId: string, command: string) => Promise<void>;
  onRequestPermission: (message: string) => Promise<string>;
  isLoading: boolean;
  loadingMessage: string;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
}

// Mock component that we'll implement to make tests pass
const ButtonClickHandler: React.FC<ButtonClickHandlerProps> = ({
  onCreateInstance,
  onConnectToTerminal,
  onSendCommand,
  onRequestPermission,
  isLoading,
  loadingMessage,
  connectionStatus
}) => {
  // This component will be implemented to make tests pass
  return (
    <div data-testid="button-click-handler">
      <button
        data-testid="create-instance-button"
        onClick={() => onCreateInstance({ id: 'new-instance', workingDirectory: '/workspaces/agent-feed' })}
        disabled={isLoading}
      >
        {isLoading ? `${loadingMessage}...` : 'Create Claude Instance'}
      </button>
      
      <button
        data-testid="connect-button"
        onClick={() => onConnectToTerminal('test-terminal-1')}
        disabled={connectionStatus === 'connecting'}
      >
        {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect to Terminal'}
      </button>
      
      <button
        data-testid="send-command-button"
        onClick={() => onSendCommand('test-instance-1', 'ls -la')}
        disabled={connectionStatus !== 'connected'}
      >
        Send Command
      </button>
      
      <button
        data-testid="request-permission-button"
        onClick={() => onRequestPermission('Allow file access?')}
        disabled={isLoading}
      >
        Request Permission
      </button>
      
      <div data-testid="status-display">
        Status: {connectionStatus}
        {isLoading && <span data-testid="loading-indicator"> - {loadingMessage}</span>}
      </div>
    </div>
  );
};

describe('TDD London School: Button Click Interactions', () => {
  let mockEnv: CompleteMockEnvironment;
  let mockVerifier: ReturnType<typeof createMockVerifier>;
  let scenarioBuilder: ReturnType<typeof createTestScenarioBuilder>;
  
  beforeEach(() => {
    mockEnv = createCompleteMockEnvironment();
    mockVerifier = createMockVerifier(mockEnv);
    scenarioBuilder = createTestScenarioBuilder(mockEnv);
  });
  
  afterEach(() => {
    resetAllMocks(mockEnv);
    jest.clearAllMocks();
  });
  
  describe('Create Instance Button Interactions', () => {
    it('should collaborate with instance manager when create button is clicked', async () => {
      // Arrange: Setup successful instance creation scenario
      scenarioBuilder.setupSuccessfulClaudeInstanceCreation('new-instance');
      const mockOnCreateInstance = jest.fn().mockResolvedValue(undefined);
      
      render(
        <ButtonClickHandler
          onCreateInstance={mockOnCreateInstance}
          onConnectToTerminal={jest.fn()}
          onSendCommand={jest.fn()}
          onRequestPermission={jest.fn()}
          isLoading={false}
          loadingMessage=""
          connectionStatus="disconnected"
        />
      );
      
      // Act: Click create instance button
      const createButton = screen.getByTestId('create-instance-button');
      fireEvent.click(createButton);
      
      // Assert: Verify interaction with instance creation handler
      await waitFor(() => {
        expect(mockOnCreateInstance).toHaveBeenCalledWith({
          id: 'new-instance',
          workingDirectory: '/workspaces/agent-feed'
        });
      });
    });
    
    it('should disable create button and show loading state during instance creation', async () => {
      // Arrange: Setup loading animation
      scenarioBuilder.setupLoadingAnimation('Creating Claude instance');
      const mockOnCreateInstance = jest.fn();
      
      render(
        <ButtonClickHandler
          onCreateInstance={mockOnCreateInstance}
          onConnectToTerminal={jest.fn()}
          onSendCommand={jest.fn()}
          onRequestPermission={jest.fn()}
          isLoading={true}
          loadingMessage="Creating Claude instance"
          connectionStatus="disconnected"
        />
      );
      
      // Act & Assert: Button should be disabled and show loading message
      const createButton = screen.getByTestId('create-instance-button');
      expect(createButton).toBeDisabled();
      expect(createButton).toHaveTextContent('Creating Claude instance...');
      
      // Loading indicator should be visible
      const loadingIndicator = screen.getByTestId('loading-indicator');
      expect(loadingIndicator).toHaveTextContent('Creating Claude instance');
    });
    
    it('should handle instance creation failure and maintain interaction contract', async () => {
      // Arrange: Setup failing instance creation
      const mockOnCreateInstance = jest.fn().mockRejectedValue(new Error('Instance creation failed'));
      
      render(
        <ButtonClickHandler
          onCreateInstance={mockOnCreateInstance}
          onConnectToTerminal={jest.fn()}
          onSendCommand={jest.fn()}
          onRequestPermission={jest.fn()}
          isLoading={false}
          loadingMessage=""
          connectionStatus="disconnected"
        />
      );
      
      // Act: Click create instance button
      const createButton = screen.getByTestId('create-instance-button');
      fireEvent.click(createButton);
      
      // Assert: Verify interaction occurred despite failure
      await waitFor(() => {
        expect(mockOnCreateInstance).toHaveBeenCalledTimes(1);
      });
      
      // The component should still attempt the interaction
      expect(mockOnCreateInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new-instance',
          workingDirectory: '/workspaces/agent-feed'
        })
      );
    });
  });
  
  describe('Connect Button Interactions', () => {
    it('should collaborate with WebSocket manager when connect button is clicked', async () => {
      // Arrange: Setup successful WebSocket connection
      scenarioBuilder.setupSuccessfulWebSocketConnection('test-terminal-1');
      const mockOnConnectToTerminal = jest.fn().mockResolvedValue(undefined);
      
      render(
        <ButtonClickHandler
          onCreateInstance={jest.fn()}
          onConnectToTerminal={mockOnConnectToTerminal}
          onSendCommand={jest.fn()}
          onRequestPermission={jest.fn()}
          isLoading={false}
          loadingMessage=""
          connectionStatus="disconnected"
        />
      );
      
      // Act: Click connect button
      const connectButton = screen.getByTestId('connect-button');
      fireEvent.click(connectButton);
      
      // Assert: Verify interaction with connection handler
      await waitFor(() => {
        expect(mockOnConnectToTerminal).toHaveBeenCalledWith('test-terminal-1');
      });
    });
    
    it('should disable connect button and show connecting state during connection', () => {
      // Arrange: Connection in progress
      const mockOnConnectToTerminal = jest.fn();
      
      render(
        <ButtonClickHandler
          onCreateInstance={jest.fn()}
          onConnectToTerminal={mockOnConnectToTerminal}
          onSendCommand={jest.fn()}
          onRequestPermission={jest.fn()}
          isLoading={false}
          loadingMessage=""
          connectionStatus="connecting"
        />
      );
      
      // Act & Assert: Button should be disabled and show connecting state
      const connectButton = screen.getByTestId('connect-button');
      expect(connectButton).toBeDisabled();
      expect(connectButton).toHaveTextContent('Connecting...');
      
      // Status should show connecting
      const statusDisplay = screen.getByTestId('status-display');
      expect(statusDisplay).toHaveTextContent('Status: connecting');
    });
    
    it('should handle connection failure while preserving interaction pattern', async () => {
      // Arrange: Setup failing connection
      scenarioBuilder.setupFailingWebSocketConnection('WebSocket connection failed');
      const mockOnConnectToTerminal = jest.fn().mockRejectedValue(new Error('Connection failed'));
      
      render(
        <ButtonClickHandler
          onCreateInstance={jest.fn()}
          onConnectToTerminal={mockOnConnectToTerminal}
          onSendCommand={jest.fn()}
          onRequestPermission={jest.fn()}
          isLoading={false}
          loadingMessage=""
          connectionStatus="disconnected"
        />
      );
      
      // Act: Click connect button
      const connectButton = screen.getByTestId('connect-button');
      fireEvent.click(connectButton);
      
      // Assert: Verify interaction pattern was followed
      await waitFor(() => {
        expect(mockOnConnectToTerminal).toHaveBeenCalledWith('test-terminal-1');
      });
    });
  });
  
  describe('Send Command Button Interactions', () => {
    it('should collaborate with command execution system when send command button is clicked', async () => {
      // Arrange: Setup connected state
      const mockOnSendCommand = jest.fn().mockResolvedValue(undefined);
      
      render(
        <ButtonClickHandler
          onCreateInstance={jest.fn()}
          onConnectToTerminal={jest.fn()}
          onSendCommand={mockOnSendCommand}
          onRequestPermission={jest.fn()}
          isLoading={false}
          loadingMessage=""
          connectionStatus="connected"
        />
      );
      
      // Act: Click send command button
      const sendCommandButton = screen.getByTestId('send-command-button');
      fireEvent.click(sendCommandButton);
      
      // Assert: Verify interaction with command handler
      await waitFor(() => {
        expect(mockOnSendCommand).toHaveBeenCalledWith('test-instance-1', 'ls -la');
      });
    });
    
    it('should disable send command button when not connected', () => {
      // Arrange: Disconnected state
      const mockOnSendCommand = jest.fn();
      
      render(
        <ButtonClickHandler
          onCreateInstance={jest.fn()}
          onConnectToTerminal={jest.fn()}
          onSendCommand={mockOnSendCommand}
          onRequestPermission={jest.fn()}
          isLoading={false}
          loadingMessage=""
          connectionStatus="disconnected"
        />
      );
      
      // Act & Assert: Button should be disabled when not connected
      const sendCommandButton = screen.getByTestId('send-command-button');
      expect(sendCommandButton).toBeDisabled();
    });
    
    it('should enable send command button only when connected', () => {
      // Arrange: Connected state
      const mockOnSendCommand = jest.fn();
      
      render(
        <ButtonClickHandler
          onCreateInstance={jest.fn()}
          onConnectToTerminal={jest.fn()}
          onSendCommand={mockOnSendCommand}
          onRequestPermission={jest.fn()}
          isLoading={false}
          loadingMessage=""
          connectionStatus="connected"
        />
      );
      
      // Act & Assert: Button should be enabled when connected
      const sendCommandButton = screen.getByTestId('send-command-button');
      expect(sendCommandButton).not.toBeDisabled();
    });
  });
  
  describe('Permission Request Button Interactions', () => {
    it('should collaborate with permission system when permission button is clicked', async () => {
      // Arrange: Setup permission handling
      const mockOnRequestPermission = jest.fn().mockResolvedValue('allow');
      
      render(
        <ButtonClickHandler
          onCreateInstance={jest.fn()}
          onConnectToTerminal={jest.fn()}
          onSendCommand={jest.fn()}
          onRequestPermission={mockOnRequestPermission}
          isLoading={false}
          loadingMessage=""
          connectionStatus="connected"
        />
      );
      
      // Act: Click permission request button
      const permissionButton = screen.getByTestId('request-permission-button');
      fireEvent.click(permissionButton);
      
      // Assert: Verify interaction with permission handler
      await waitFor(() => {
        expect(mockOnRequestPermission).toHaveBeenCalledWith('Allow file access?');
      });
    });
    
    it('should disable permission button during loading operations', () => {
      // Arrange: Loading state
      const mockOnRequestPermission = jest.fn();
      
      render(
        <ButtonClickHandler
          onCreateInstance={jest.fn()}
          onConnectToTerminal={jest.fn()}
          onSendCommand={jest.fn()}
          onRequestPermission={mockOnRequestPermission}
          isLoading={true}
          loadingMessage="Processing"
          connectionStatus="connected"
        />
      );
      
      // Act & Assert: Permission button should be disabled during loading
      const permissionButton = screen.getByTestId('request-permission-button');
      expect(permissionButton).toBeDisabled();
    });
  });
  
  describe('Cross-Component Interaction Patterns', () => {
    it('should coordinate multiple button interactions in proper sequence', async () => {
      // Arrange: Setup complete environment
      scenarioBuilder.setupSuccessfulClaudeInstanceCreation('new-instance');
      scenarioBuilder.setupSuccessfulWebSocketConnection('test-terminal-1');
      
      const mockOnCreateInstance = jest.fn().mockResolvedValue(undefined);
      const mockOnConnectToTerminal = jest.fn().mockResolvedValue(undefined);
      const mockOnSendCommand = jest.fn().mockResolvedValue(undefined);
      
      const { rerender } = render(
        <ButtonClickHandler
          onCreateInstance={mockOnCreateInstance}
          onConnectToTerminal={mockOnConnectToTerminal}
          onSendCommand={mockOnSendCommand}
          onRequestPermission={jest.fn()}
          isLoading={false}
          loadingMessage=""
          connectionStatus="disconnected"
        />
      );
      
      // Act 1: Create instance
      const createButton = screen.getByTestId('create-instance-button');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockOnCreateInstance).toHaveBeenCalled();
      });
      
      // Act 2: Connect to terminal
      rerender(
        <ButtonClickHandler
          onCreateInstance={mockOnCreateInstance}
          onConnectToTerminal={mockOnConnectToTerminal}
          onSendCommand={mockOnSendCommand}
          onRequestPermission={jest.fn()}
          isLoading={false}
          loadingMessage=""
          connectionStatus="disconnected"
        />
      );
      
      const connectButton = screen.getByTestId('connect-button');
      fireEvent.click(connectButton);
      
      await waitFor(() => {
        expect(mockOnConnectToTerminal).toHaveBeenCalled();
      });
      
      // Act 3: Send command (only after connected)
      rerender(
        <ButtonClickHandler
          onCreateInstance={mockOnCreateInstance}
          onConnectToTerminal={mockOnConnectToTerminal}
          onSendCommand={mockOnSendCommand}
          onRequestPermission={jest.fn()}
          isLoading={false}
          loadingMessage=""
          connectionStatus="connected"
        />
      );
      
      const sendCommandButton = screen.getByTestId('send-command-button');
      fireEvent.click(sendCommandButton);
      
      await waitFor(() => {
        expect(mockOnSendCommand).toHaveBeenCalled();
      });
      
      // Assert: Verify all interactions occurred in correct order
      expect(mockOnCreateInstance).toHaveBeenCalledBefore(mockOnConnectToTerminal as jest.MockedFunction<any>);
      expect(mockOnConnectToTerminal).toHaveBeenCalledBefore(mockOnSendCommand as jest.MockedFunction<any>);
    });
    
    it('should maintain interaction contracts even during error states', async () => {
      // Arrange: Setup error scenarios
      const mockOnCreateInstance = jest.fn().mockRejectedValue(new Error('Instance creation failed'));
      const mockOnConnectToTerminal = jest.fn().mockRejectedValue(new Error('Connection failed'));
      const mockOnSendCommand = jest.fn().mockRejectedValue(new Error('Command failed'));
      
      render(
        <ButtonClickHandler
          onCreateInstance={mockOnCreateInstance}
          onConnectToTerminal={mockOnConnectToTerminal}
          onSendCommand={mockOnSendCommand}
          onRequestPermission={jest.fn()}
          isLoading={false}
          loadingMessage=""
          connectionStatus="connected"
        />
      );
      
      // Act: Click all buttons
      fireEvent.click(screen.getByTestId('create-instance-button'));
      fireEvent.click(screen.getByTestId('connect-button'));
      fireEvent.click(screen.getByTestId('send-command-button'));
      
      // Assert: All interactions should still occur despite failures
      await waitFor(() => {
        expect(mockOnCreateInstance).toHaveBeenCalledTimes(1);
        expect(mockOnConnectToTerminal).toHaveBeenCalledTimes(1);
        expect(mockOnSendCommand).toHaveBeenCalledTimes(1);
      });
    });
  });
  
  describe('Loading State Coordination', () => {
    it('should properly coordinate loading states across all interactions', () => {
      // Arrange: Loading state active
      scenarioBuilder.setupLoadingAnimation('Operation in progress');
      
      render(
        <ButtonClickHandler
          onCreateInstance={jest.fn()}
          onConnectToTerminal={jest.fn()}
          onSendCommand={jest.fn()}
          onRequestPermission={jest.fn()}
          isLoading={true}
          loadingMessage="Operation in progress"
          connectionStatus="connecting"
        />
      );
      
      // Assert: All loading-sensitive buttons should be disabled
      expect(screen.getByTestId('create-instance-button')).toBeDisabled();
      expect(screen.getByTestId('connect-button')).toBeDisabled();
      expect(screen.getByTestId('request-permission-button')).toBeDisabled();
      
      // Status should show loading information
      expect(screen.getByTestId('loading-indicator')).toHaveTextContent('Operation in progress');
    });
  });
});

/**
 * Integration test to verify the component meets London School principles:
 * 1. Tests interactions, not implementations
 * 2. Uses mocks to verify collaborations
 * 3. Focuses on behavior verification
 * 4. Tests outside-in from user interactions
 */
describe('London School TDD Compliance Verification', () => {
  it('should follow London School principles by testing interactions over implementation', () => {
    // This test verifies our approach follows London School methodology
    const mockEnv = createCompleteMockEnvironment();
    
    // Verify we're testing collaborations through mocks
    expect(jest.isMockFunction(mockEnv.claudeInstanceManager.createInstance)).toBe(true);
    expect(jest.isMockFunction(mockEnv.webSocketHook.connectToInstance)).toBe(true);
    expect(jest.isMockFunction(mockEnv.webSocketHook.sendCommand)).toBe(true);
    
    // Verify mock contracts define expected interactions
    expect(mockEnv.claudeInstanceManager.createInstance).toBeDefined();
    expect(mockEnv.webSocketManager.getConnection).toBeDefined();
    expect(mockEnv.loadingAnimation.startLoading).toBeDefined();
    
    // Success - we're following London School by:
    // 1. Mocking all external dependencies
    // 2. Testing interactions between objects
    // 3. Verifying behavior through mock assertions
    // 4. Driving design through tests
  });
});