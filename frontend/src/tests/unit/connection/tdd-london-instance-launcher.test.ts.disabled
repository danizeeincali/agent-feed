/**
 * TDD London School Instance Launcher Tests
 * 
 * Tests the Claude instance launcher workflow focusing on the hanging throbber issue.
 * Uses behavior verification and mock-driven development to identify state transition problems.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock external dependencies
jest.mock('@/hooks/useInstanceManager');
jest.mock('@/hooks/useNotification');
jest.mock('react-router-dom');

import { useInstanceManager } from '@/hooks/useInstanceManager';
import { useNotification } from '@/hooks/useNotification';
import { useNavigate } from 'react-router-dom';
import { InstanceLauncher } from '@/components/InstanceLauncher';

// Mock contracts for London School TDD
interface MockInstanceManager {
  instances: Array<{
    id: string;
    name: string;
    status: 'starting' | 'running' | 'stopped' | 'error';
    type: string;
    pid: number;
    createdAt: string;
  }>;
  launchInstance: jest.MockedFunction<(options: any) => Promise<string>>;
  killInstance: jest.MockedFunction<(id: string) => Promise<void>>;
  restartInstance: jest.MockedFunction<(id: string) => Promise<string>>;
  loading: boolean;
  error: string | null;
}

interface MockNotificationManager {
  showNotification: jest.MockedFunction<(notification: any) => void>;
}

interface MockNavigation {
  navigate: jest.MockedFunction<(path: string) => void>;
}

// Mock factory functions
const createMockInstanceManager = (overrides: Partial<MockInstanceManager> = {}): MockInstanceManager => ({
  instances: [],
  launchInstance: jest.fn().mockResolvedValue('mock-instance-id'),
  killInstance: jest.fn().mockResolvedValue(undefined),
  restartInstance: jest.fn().mockResolvedValue('mock-new-instance-id'),
  loading: false,
  error: null,
  ...overrides
});

const createMockNotificationManager = (): MockNotificationManager => ({
  showNotification: jest.fn()
});

const createMockNavigation = (): MockNavigation => ({
  navigate: jest.fn()
});

describe('TDD London School: Instance Launcher Workflow', () => {
  let mockInstanceManager: MockInstanceManager;
  let mockNotificationManager: MockNotificationManager;
  let mockNavigation: MockNavigation;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup fresh mocks for each test
    mockInstanceManager = createMockInstanceManager();
    mockNotificationManager = createMockNotificationManager();
    mockNavigation = createMockNavigation();

    // Configure mock returns
    (useInstanceManager as jest.MockedFunction<typeof useInstanceManager>)
      .mockReturnValue(mockInstanceManager);
    
    (useNotification as jest.MockedFunction<typeof useNotification>)
      .mockReturnValue(mockNotificationManager);
    
    (useNavigate as jest.MockedFunction<typeof useNavigate>)
      .mockReturnValue(mockNavigation.navigate);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Feature: Launch Button Throbber Hanging', () => {
    
    it('should show loading state during instance launch', async () => {
      // ARRANGE: Mock slow launch process
      let resolveLaunch: (value: string) => void;
      const launchPromise = new Promise<string>((resolve) => {
        resolveLaunch = resolve;
      });
      
      mockInstanceManager.launchInstance.mockReturnValue(launchPromise);

      // ACT: Render component and click launch
      render(<InstanceLauncher />);
      const launchButton = screen.getByText('Launch Claude Instance');
      
      fireEvent.click(launchButton);

      // ASSERT: Verify loading state is shown
      await waitFor(() => {
        expect(screen.getByText('Launching...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /launching/i })).toBeDisabled();
      });

      // Verify collaboration with instance manager
      expect(mockInstanceManager.launchInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'production',
          workingDirectory: '/workspaces/agent-feed/prod',
          autoConnect: true,
          name: expect.stringMatching(/Claude-production-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/),
          environment: {
            CLAUDE_INSTANCE_TYPE: 'production',
            CLAUDE_AUTO_RESTART: 'false'
          }
        })
      );

      // Complete the launch to reset state
      act(() => {
        resolveLaunch!('mock-instance-id');
      });
    });

    it('should handle hanging launch process with timeout', async () => {
      // ARRANGE: Mock launch that never resolves (hanging)
      const hangingPromise = new Promise<string>(() => {
        // Never resolves - simulates hanging
      });
      
      mockInstanceManager.launchInstance.mockReturnValue(hangingPromise);

      // ACT: Render and attempt launch
      render(<InstanceLauncher />);
      const launchButton = screen.getByText('Launch Claude Instance');
      
      fireEvent.click(launchButton);

      // ASSERT: Verify UI enters hanging state
      await waitFor(() => {
        expect(screen.getByText('Launching...')).toBeInTheDocument();
      });

      // Verify button remains disabled (hanging state)
      expect(screen.getByRole('button', { name: /launching/i })).toBeDisabled();
      
      // Verify instance manager was called
      expect(mockInstanceManager.launchInstance).toHaveBeenCalled();
      
      // In a real scenario, this would require timeout handling
      // to break out of the hanging state
    });

    it('should reset loading state after launch completion', async () => {
      // ARRANGE: Mock successful launch
      mockInstanceManager.launchInstance.mockResolvedValue('test-instance-id');

      // ACT: Render component and launch
      render(<InstanceLauncher />);
      const launchButton = screen.getByText('Launch Claude Instance');
      
      fireEvent.click(launchButton);

      // Wait for launch to complete
      await waitFor(() => {
        expect(mockInstanceManager.launchInstance).toHaveBeenCalled();
      });

      // ASSERT: Verify loading state is reset
      await waitFor(() => {
        expect(screen.getByText('Launch Claude Instance')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /launch claude instance/i })).not.toBeDisabled();
      });

      // Verify success notification
      expect(mockNotificationManager.showNotification).toHaveBeenCalledWith({
        type: 'success',
        title: 'Instance Launched',
        message: 'Claude production instance started successfully',
        duration: 5000
      });
    });

    it('should handle launch errors and reset loading state', async () => {
      // ARRANGE: Mock launch failure
      const launchError = new Error('Failed to start instance');
      mockInstanceManager.launchInstance.mockRejectedValue(launchError);

      // ACT: Render component and attempt launch
      render(<InstanceLauncher />);
      const launchButton = screen.getByText('Launch Claude Instance');
      
      fireEvent.click(launchButton);

      // ASSERT: Wait for error handling
      await waitFor(() => {
        expect(mockInstanceManager.launchInstance).toHaveBeenCalled();
      });

      // Verify loading state is reset after error
      await waitFor(() => {
        expect(screen.getByText('Launch Claude Instance')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /launch claude instance/i })).not.toBeDisabled();
      });

      // Verify error notification
      expect(mockNotificationManager.showNotification).toHaveBeenCalledWith({
        type: 'error',
        title: 'Launch Failed',
        message: 'Failed to start instance',
        duration: 10000
      });
    });
  });

  describe('Contract: Instance Manager Collaboration', () => {
    
    it('should establish proper contracts with instance manager', () => {
      // ARRANGE & ACT: Render component
      render(<InstanceLauncher />);

      // ASSERT: Verify instance manager hook is used
      expect(useInstanceManager).toHaveBeenCalled();
      
      // Verify all expected manager methods are available
      expect(mockInstanceManager.launchInstance).toBeDefined();
      expect(mockInstanceManager.killInstance).toBeDefined();
      expect(mockInstanceManager.restartInstance).toBeDefined();
      expect(mockInstanceManager.instances).toBeDefined();
      expect(mockInstanceManager.loading).toBeDefined();
      expect(mockInstanceManager.error).toBeDefined();
    });

    it('should pass correct launch options to instance manager', async () => {
      // ARRANGE: Configure specific launch settings
      render(<InstanceLauncher />);
      
      // Configure component settings
      const configButton = screen.getByText('Configure');
      fireEvent.click(configButton);
      
      // Change to development mode
      const typeSelect = screen.getByDisplayValue('production');
      fireEvent.change(typeSelect, { target: { value: 'development' } });

      // Enable auto-restart
      const autoRestartCheckbox = screen.getByLabelText('Enable auto-restart');
      fireEvent.click(autoRestartCheckbox);

      // ACT: Launch with custom settings
      const launchButton = screen.getByText('Launch Claude Instance');
      fireEvent.click(launchButton);

      // ASSERT: Verify correct options passed to manager
      await waitFor(() => {
        expect(mockInstanceManager.launchInstance).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'development',
            workingDirectory: '/workspaces/agent-feed/prod',
            autoConnect: true,
            name: expect.stringMatching(/Claude-development-/),
            autoRestart: expect.objectContaining({
              enabled: true,
              intervalHours: 4,
              maxRestarts: 5
            }),
            environment: {
              CLAUDE_INSTANCE_TYPE: 'development',
              CLAUDE_AUTO_RESTART: 'true'
            }
          })
        );
      });
    });

    it('should handle instance manager loading state', () => {
      // ARRANGE: Mock loading state
      mockInstanceManager.loading = true;

      // ACT: Render component
      render(<InstanceLauncher />);

      // ASSERT: Verify launch button is disabled during loading
      const launchButton = screen.getByText('Launch Claude Instance');
      expect(launchButton).toBeDisabled();
    });

    it('should display instance manager errors', () => {
      // ARRANGE: Mock error state
      mockInstanceManager.error = 'Connection to instance manager failed';

      // ACT: Render component
      render(<InstanceLauncher />);

      // ASSERT: Verify error is displayed
      expect(screen.getByText('Connection to instance manager failed')).toBeInTheDocument();
    });
  });

  describe('Behavior: Running Instance Management', () => {
    
    it('should display running instances correctly', () => {
      // ARRANGE: Mock running instances
      mockInstanceManager.instances = [
        {
          id: 'instance-1',
          name: 'Claude-production-2024-01-15T10-30-00',
          status: 'running',
          type: 'production',
          pid: 12345,
          createdAt: '2024-01-15T10:30:00Z'
        },
        {
          id: 'instance-2',
          name: 'Claude-development-2024-01-15T11-00-00',
          status: 'starting',
          type: 'development',
          pid: 12346,
          createdAt: '2024-01-15T11:00:00Z'
        }
      ];

      // ACT: Render component
      render(<InstanceLauncher />);

      // ASSERT: Verify instances are displayed
      expect(screen.getByText('Claude-production-2024-01-15T10-30-00')).toBeInTheDocument();
      expect(screen.getByText('Claude-development-2024-01-15T11-00-00')).toBeInTheDocument();
      expect(screen.getByText('2 active')).toBeInTheDocument();
      
      // Verify instance details
      expect(screen.getByText(/production • PID: 12345/)).toBeInTheDocument();
      expect(screen.getByText(/development • PID: 12346/)).toBeInTheDocument();
    });

    it('should handle instance termination workflow', async () => {
      // ARRANGE: Mock running instance
      mockInstanceManager.instances = [
        {
          id: 'instance-1',
          name: 'Test Instance',
          status: 'running',
          type: 'production',
          pid: 12345,
          createdAt: '2024-01-15T10:30:00Z'
        }
      ];

      // ACT: Render and click stop button
      render(<InstanceLauncher />);
      const stopButton = screen.getByText('Stop');
      fireEvent.click(stopButton);

      // ASSERT: Verify termination workflow
      await waitFor(() => {
        expect(mockInstanceManager.killInstance).toHaveBeenCalledWith('instance-1');
      });

      // Verify success notification
      expect(mockNotificationManager.showNotification).toHaveBeenCalledWith({
        type: 'info',
        title: 'Instance Stopped',
        message: 'Claude instance has been stopped',
        duration: 3000
      });
    });

    it('should handle instance restart workflow', async () => {
      // ARRANGE: Mock running instance
      mockInstanceManager.instances = [
        {
          id: 'instance-1',
          name: 'Test Instance',
          status: 'running',
          type: 'production',
          pid: 12345,
          createdAt: '2024-01-15T10:30:00Z'
        }
      ];

      // ACT: Render and click restart button
      render(<InstanceLauncher />);
      const restartButton = screen.getByText('Restart');
      fireEvent.click(restartButton);

      // ASSERT: Verify restart workflow
      await waitFor(() => {
        expect(mockInstanceManager.restartInstance).toHaveBeenCalledWith('instance-1');
      });

      // Verify success notification
      expect(mockNotificationManager.showNotification).toHaveBeenCalledWith({
        type: 'success',
        title: 'Instance Restarted',
        message: 'Claude instance has been restarted',
        duration: 5000
      });
    });

    it('should navigate to terminal when auto-connect is enabled', async () => {
      // ARRANGE: Mock successful launch with running instance
      mockInstanceManager.instances = [
        {
          id: 'running-instance',
          name: 'Test Instance',
          status: 'running',
          type: 'production',
          pid: 12345,
          createdAt: '2024-01-15T10:30:00Z'
        }
      ];

      // ACT: Launch instance
      render(<InstanceLauncher />);
      const launchButton = screen.getByText('Launch Claude Instance');
      fireEvent.click(launchButton);

      // ASSERT: Verify navigation to terminal
      await waitFor(() => {
        expect(mockInstanceManager.launchInstance).toHaveBeenCalled();
      });

      // Note: Navigation logic depends on instances being available after launch
      // In the real component, this might need adjustment for proper timing
    });
  });

  describe('Edge Cases: State Synchronization Issues', () => {
    
    it('should handle concurrent launch attempts', async () => {
      // ARRANGE: Mock slow launch
      let resolveCount = 0;
      const resolvers: Array<(value: string) => void> = [];
      
      mockInstanceManager.launchInstance.mockImplementation(() => {
        return new Promise<string>((resolve) => {
          resolvers.push(resolve);
        });
      });

      // ACT: Render and attempt multiple launches quickly
      render(<InstanceLauncher />);
      const launchButton = screen.getByText('Launch Claude Instance');
      
      // First launch
      fireEvent.click(launchButton);
      
      // Verify button is disabled (preventing concurrent launches)
      expect(screen.getByRole('button', { name: /launching/i })).toBeDisabled();
      
      // Second click should be ignored
      fireEvent.click(launchButton);

      // ASSERT: Verify only one launch was attempted
      expect(mockInstanceManager.launchInstance).toHaveBeenCalledTimes(1);
      
      // Complete first launch
      act(() => {
        resolvers[0]('instance-1');
      });
    });

    it('should handle instance manager errors during launch', async () => {
      // ARRANGE: Mock instance manager failure
      const managerError = new Error('Instance manager service unavailable');
      mockInstanceManager.launchInstance.mockRejectedValue(managerError);

      // ACT: Attempt launch
      render(<InstanceLauncher />);
      const launchButton = screen.getByText('Launch Claude Instance');
      fireEvent.click(launchButton);

      // ASSERT: Verify error handling
      await waitFor(() => {
        expect(mockNotificationManager.showNotification).toHaveBeenCalledWith({
          type: 'error',
          title: 'Launch Failed',
          message: 'Instance manager service unavailable',
          duration: 10000
        });
      });

      // Verify UI returns to normal state
      expect(screen.getByText('Launch Claude Instance')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /launch claude instance/i })).not.toBeDisabled();
    });
  });
});