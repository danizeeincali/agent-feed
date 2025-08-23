/**
 * Claude Launcher UI Component Tests - London School TDD
 * 
 * Focus: Mock-driven testing for React component interactions
 * Behavior verification for button clicks and API calls
 * Outside-in approach testing user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';

// Mock API service before imports
const mockApiService = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

// Mock WebSocket context
const mockWebSocketContext = {
  isConnected: false,
  connectionStatus: 'disconnected',
  connect: jest.fn(),
  disconnect: jest.fn(),
  sendMessage: jest.fn()
};

// Mock hooks
const mockUseInstanceManager = {
  instances: [],
  launchInstance: jest.fn(),
  killInstance: jest.fn(),
  restartInstance: jest.fn(),
  getInstanceStatus: jest.fn(),
  isLoading: false,
  error: null
};

// Mock modules
jest.mock('../src/services/api', () => ({
  apiService: mockApiService
}));

jest.mock('../src/context/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext
}));

jest.mock('../src/hooks/useInstanceManager', () => ({
  useInstanceManager: () => mockUseInstanceManager
}));

// Mock InstanceLauncher component (will be imported after mocks)
const InstanceLauncher = React.lazy(() => 
  import('../frontend/src/components/InstanceLauncher')
);

describe('Claude Launcher UI - London School TDD', () => {
  let user;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup user event
    user = userEvent.setup();
    
    // Setup default mock responses
    mockApiService.post.mockResolvedValue({
      success: true,
      data: { id: 'test-instance-id', status: 'running' }
    });
    
    mockUseInstanceManager.launchInstance.mockResolvedValue({
      id: 'test-instance-id',
      status: 'running',
      name: 'Test Claude Instance'
    });
  });

  describe('Launch Button Interaction Behavior', () => {
    it('should trigger launch process when Launch button is clicked', async () => {
      // Arrange
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      const launchButton = await screen.findByRole('button', { name: /launch/i });
      
      // Act
      await user.click(launchButton);
      
      // Assert - Verify collaboration with instance manager
      expect(mockUseInstanceManager.launchInstance).toHaveBeenCalledWith({
        type: 'production',
        workingDirectory: '/workspaces/agent-feed/prod',
        autoRestart: expect.objectContaining({
          enabled: expect.any(Boolean),
          intervalHours: expect.any(Number)
        })
      });
    });

    it('should disable launch button during launch process', async () => {
      // Arrange
      mockUseInstanceManager.isLoading = true;
      
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      const launchButton = await screen.findByRole('button', { name: /launch/i });
      
      // Assert
      expect(launchButton).toBeDisabled();
    });

    it('should show loading state while launching instance', async () => {
      // Arrange
      let resolveLoading;
      const loadingPromise = new Promise(resolve => {
        resolveLoading = resolve;
      });
      
      mockUseInstanceManager.launchInstance.mockReturnValue(loadingPromise);
      mockUseInstanceManager.isLoading = true;
      
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      // Act
      const launchButton = await screen.findByRole('button', { name: /launch/i });
      
      // Assert - Verify loading indicators
      expect(screen.getByText(/launching/i)).toBeInTheDocument();
      expect(launchButton).toBeDisabled();
      
      // Cleanup
      resolveLoading({ id: 'test', status: 'running' });
    });
  });

  describe('Status Display Behavior', () => {
    it('should display current instance status when available', async () => {
      // Arrange
      const mockInstance = {
        id: 'test-instance',
        name: 'Test Claude Instance',
        status: 'running',
        pid: 1234,
        startTime: new Date('2024-01-01T10:00:00Z')
      };
      
      mockUseInstanceManager.instances = [mockInstance];
      mockUseInstanceManager.getInstanceStatus.mockReturnValue(mockInstance);
      
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      // Assert - Verify status display
      await waitFor(() => {
        expect(screen.getByText(/running/i)).toBeInTheDocument();
        expect(screen.getByText(/test claude instance/i)).toBeInTheDocument();
        expect(screen.getByText(/1234/)).toBeInTheDocument();
      });
    });

    it('should show "No instances" when no Claude processes are running', async () => {
      // Arrange
      mockUseInstanceManager.instances = [];
      mockUseInstanceManager.getInstanceStatus.mockReturnValue(null);
      
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/no.*instance.*running/i)).toBeInTheDocument();
      });
    });

    it('should update status display when instance changes', async () => {
      // Arrange
      const initialInstance = {
        id: 'test-instance',
        status: 'starting',
        name: 'Test Instance'
      };
      
      const updatedInstance = {
        ...initialInstance,
        status: 'running',
        pid: 1234
      };
      
      mockUseInstanceManager.instances = [initialInstance];
      
      const { rerender } = render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      // Verify initial state
      await waitFor(() => {
        expect(screen.getByText(/starting/i)).toBeInTheDocument();
      });
      
      // Act - Update instance status
      mockUseInstanceManager.instances = [updatedInstance];
      rerender(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/running/i)).toBeInTheDocument();
        expect(screen.getByText(/1234/)).toBeInTheDocument();
      });
    });
  });

  describe('Kill Button Interaction Behavior', () => {
    it('should trigger kill process when Kill button is clicked', async () => {
      // Arrange
      const mockInstance = {
        id: 'test-instance',
        status: 'running',
        name: 'Test Instance'
      };
      
      mockUseInstanceManager.instances = [mockInstance];
      
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      const killButton = await screen.findByRole('button', { name: /kill|stop/i });
      
      // Act
      await user.click(killButton);
      
      // Assert
      expect(mockUseInstanceManager.killInstance).toHaveBeenCalledWith('test-instance');
    });

    it('should show confirmation dialog before killing instance', async () => {
      // Arrange
      const mockInstance = {
        id: 'test-instance',
        status: 'running',
        name: 'Test Instance'
      };
      
      mockUseInstanceManager.instances = [mockInstance];
      
      // Mock window.confirm
      global.confirm = jest.fn(() => true);
      
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      const killButton = await screen.findByRole('button', { name: /kill|stop/i });
      
      // Act
      await user.click(killButton);
      
      // Assert
      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringMatching(/are you sure.*kill.*instance/i)
      );
    });

    it('should not kill instance if user cancels confirmation', async () => {
      // Arrange
      const mockInstance = {
        id: 'test-instance',
        status: 'running',
        name: 'Test Instance'
      };
      
      mockUseInstanceManager.instances = [mockInstance];
      
      // Mock window.confirm to return false (cancel)
      global.confirm = jest.fn(() => false);
      
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      const killButton = await screen.findByRole('button', { name: /kill|stop/i });
      
      // Act
      await user.click(killButton);
      
      // Assert
      expect(mockUseInstanceManager.killInstance).not.toHaveBeenCalled();
    });
  });

  describe('Restart Button Interaction Behavior', () => {
    it('should trigger restart process when Restart button is clicked', async () => {
      // Arrange
      const mockInstance = {
        id: 'test-instance',
        status: 'running',
        name: 'Test Instance'
      };
      
      mockUseInstanceManager.instances = [mockInstance];
      
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      const restartButton = await screen.findByRole('button', { name: /restart/i });
      
      // Act
      await user.click(restartButton);
      
      // Assert
      expect(mockUseInstanceManager.restartInstance).toHaveBeenCalledWith('test-instance');
    });
  });

  describe('Configuration Form Behavior', () => {
    it('should update configuration when form fields change', async () => {
      // Arrange
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      // Act
      const workingDirInput = await screen.findByLabelText(/working directory/i);
      await user.clear(workingDirInput);
      await user.type(workingDirInput, '/custom/working/dir');
      
      const autoRestartCheckbox = await screen.findByLabelText(/auto restart/i);
      await user.click(autoRestartCheckbox);
      
      const launchButton = await screen.findByRole('button', { name: /launch/i });
      await user.click(launchButton);
      
      // Assert
      expect(mockUseInstanceManager.launchInstance).toHaveBeenCalledWith({
        type: 'production',
        workingDirectory: '/custom/working/dir',
        autoRestart: expect.objectContaining({
          enabled: true
        })
      });
    });

    it('should validate configuration before launching', async () => {
      // Arrange
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      // Act - Try to launch with invalid working directory
      const workingDirInput = await screen.findByLabelText(/working directory/i);
      await user.clear(workingDirInput);
      await user.type(workingDirInput, ''); // Empty directory
      
      const launchButton = await screen.findByRole('button', { name: /launch/i });
      await user.click(launchButton);
      
      // Assert - Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/working directory is required/i)).toBeInTheDocument();
      });
      
      expect(mockUseInstanceManager.launchInstance).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling Behavior', () => {
    it('should display error message when launch fails', async () => {
      // Arrange
      const launchError = new Error('Failed to launch Claude instance');
      mockUseInstanceManager.launchInstance.mockRejectedValue(launchError);
      mockUseInstanceManager.error = 'Failed to launch Claude instance';
      
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      const launchButton = await screen.findByRole('button', { name: /launch/i });
      
      // Act
      await user.click(launchButton);
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/failed to launch claude instance/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      // Arrange
      mockUseInstanceManager.error = 'Previous launch failed';
      
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      // Act
      const retryButton = await screen.findByRole('button', { name: /retry|launch/i });
      await user.click(retryButton);
      
      // Assert
      expect(mockUseInstanceManager.launchInstance).toHaveBeenCalled();
    });
  });

  describe('WebSocket Integration Behavior', () => {
    it('should reflect WebSocket connection status in UI', async () => {
      // Arrange
      mockWebSocketContext.isConnected = true;
      mockWebSocketContext.connectionStatus = 'connected';
      
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });

    it('should show disconnected state when WebSocket is not connected', async () => {
      // Arrange
      mockWebSocketContext.isConnected = false;
      mockWebSocketContext.connectionStatus = 'disconnected';
      
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <InstanceLauncher />
        </React.Suspense>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      });
    });
  });
});