/**
 * TDD London School Test Suite for InstanceStatusIndicator
 * 
 * Testing connection status display and real-time updates
 * Focus on behavior verification and swarm coordination patterns
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { InstanceStatusIndicator } from '../../../src/components/claude-instances/InstanceStatusIndicator';
import {
  InstanceStatusProps,
  ClaudeInstance,
  InstanceStatus,
  ConnectionState,
  InstanceHealth
} from '../../../src/types/claude-instances';

// London School: Mock collaborator contracts
const mockHealthMonitor = {
  checkHealth: jest.fn(),
  subscribeToUpdates: jest.fn(),
  unsubscribe: jest.fn(),
  getLatency: jest.fn(),
  getErrorCount: jest.fn(),
};

const mockSwarmStatusCoordinator = {
  shareStatus: jest.fn(),
  coordinateHealthChecks: jest.fn(),
  notifyStatusChange: jest.fn(),
  aggregateMetrics: jest.fn(),
};

const mockConnectionManager = {
  getConnectionState: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  reconnect: jest.fn(),
};

const mockMetricsCollector = {
  recordStatusChange: jest.fn(),
  getPerformanceMetrics: jest.fn(),
  trackHealthTrends: jest.fn(),
};

describe('InstanceStatusIndicator - TDD London School', () => {
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
    processInfo: {
      pid: 1234,
      memoryUsage: 128 * 1024 * 1024,
      cpuUsage: 15.5,
      uptime: 3600,
      lastHealthCheck: new Date(),
    }
  };

  const defaultProps: InstanceStatusProps = {
    instance: mockInstance,
    showDetails: false,
    compact: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default health responses
    mockHealthMonitor.checkHealth.mockResolvedValue({
      status: 'healthy',
      latency: 45,
      lastResponse: new Date(),
      errorCount: 0,
    });

    mockHealthMonitor.getLatency.mockReturnValue(45);
    mockHealthMonitor.getErrorCount.mockReturnValue(0);

    mockConnectionManager.getConnectionState.mockReturnValue('connected');
    
    mockMetricsCollector.getPerformanceMetrics.mockReturnValue({
      averageLatency: 45,
      successRate: 99.5,
      errorRate: 0.5,
    });
  });

  describe('Basic Status Display and Coordination', () => {
    it('should render status indicator and coordinate with health monitoring agents', () => {
      render(<InstanceStatusIndicator {...defaultProps} />);

      const statusIndicator = screen.getByTestId('status-indicator');
      expect(statusIndicator).toBeInTheDocument();
      expect(statusIndicator).toHaveClass('status-ready');

      const statusText = screen.getByText('Ready');
      expect(statusText).toBeInTheDocument();

      // Should coordinate status display with swarm
      expect(mockSwarmStatusCoordinator.shareStatus).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        status: 'ready',
        connectionState: 'connected',
        displayMode: 'basic'
      });
    });

    it('should display connection state and coordinate with connection monitoring agents', () => {
      render(<InstanceStatusIndicator {...defaultProps} />);

      const connectionIndicator = screen.getByTestId('connection-indicator');
      expect(connectionIndicator).toBeInTheDocument();
      expect(connectionIndicator).toHaveClass('connection-connected');

      // Should coordinate connection state with monitoring agents
      expect(mockSwarmStatusCoordinator.coordinateHealthChecks).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        connectionState: 'connected',
        healthCheckRequired: true
      });
    });

    it('should handle different status states and coordinate appropriate actions', () => {
      const testCases = [
        { status: 'starting', expectedClass: 'status-starting', color: 'text-yellow-500' },
        { status: 'busy', expectedClass: 'status-busy', color: 'text-blue-500' },
        { status: 'error', expectedClass: 'status-error', color: 'text-red-500' },
        { status: 'stopped', expectedClass: 'status-stopped', color: 'text-gray-500' },
      ] as const;

      testCases.forEach(({ status, expectedClass, color }) => {
        const instanceWithStatus = { ...mockInstance, status };
        const { rerender } = render(<InstanceStatusIndicator {...defaultProps} instance={instanceWithStatus} />);

        const statusIndicator = screen.getByTestId('status-indicator');
        expect(statusIndicator).toHaveClass(expectedClass);

        const statusText = screen.getByText(status.charAt(0).toUpperCase() + status.slice(1));
        expect(statusText).toHaveClass(color);

        // Should coordinate status-specific actions with swarm
        expect(mockSwarmStatusCoordinator.notifyStatusChange).toHaveBeenCalledWith({
          instanceId: 'test-instance',
          newStatus: status,
          previousStatus: expect.any(String),
          timestamp: expect.any(Date)
        });

        rerender(<div />); // Clear for next test
      });
    });

    it('should handle connection state changes and coordinate recovery actions', () => {
      const connectionStates = [
        { state: 'connecting', expectedClass: 'connection-connecting', action: 'monitor_connection' },
        { state: 'disconnected', expectedClass: 'connection-disconnected', action: 'initiate_reconnection' },
        { state: 'error', expectedClass: 'connection-error', action: 'error_recovery' },
        { state: 'reconnecting', expectedClass: 'connection-reconnecting', action: 'monitor_reconnection' },
      ] as const;

      connectionStates.forEach(({ state, expectedClass, action }) => {
        const instanceWithConnection = { ...mockInstance, connectionState: state };
        render(<InstanceStatusIndicator {...defaultProps} instance={instanceWithConnection} />);

        const connectionIndicator = screen.getByTestId('connection-indicator');
        expect(connectionIndicator).toHaveClass(expectedClass);

        // Should coordinate appropriate recovery actions
        expect(mockSwarmStatusCoordinator.coordinateHealthChecks).toHaveBeenCalledWith({
          instanceId: 'test-instance',
          connectionState: state,
          recommendedAction: action
        });
      });
    });
  });

  describe('Detailed View and Metrics Coordination', () => {
    it('should display detailed information when showDetails is true and coordinate with metrics agents', () => {
      render(<InstanceStatusIndicator {...defaultProps} showDetails={true} />);

      expect(screen.getByText('PID: 1234')).toBeInTheDocument();
      expect(screen.getByText(/Memory: 128 MB/)).toBeInTheDocument();
      expect(screen.getByText(/CPU: 15.5%/)).toBeInTheDocument();
      expect(screen.getByText(/Uptime: 1h/)).toBeInTheDocument();

      // Should coordinate detailed metrics with performance agents
      expect(mockSwarmStatusCoordinator.aggregateMetrics).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        metrics: {
          pid: 1234,
          memoryUsage: 134217728,
          cpuUsage: 15.5,
          uptime: 3600
        },
        detailLevel: 'full'
      });
    });

    it('should display health metrics and coordinate with health analysis agents', async () => {
      render(<InstanceStatusIndicator {...defaultProps} showDetails={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Latency: 45ms/)).toBeInTheDocument();
        expect(screen.getByText(/Errors: 0/)).toBeInTheDocument();
      });

      // Should coordinate health analysis with specialized agents
      expect(mockSwarmStatusCoordinator.coordinateHealthChecks).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        healthMetrics: {
          latency: 45,
          errorCount: 0,
          healthStatus: 'healthy'
        },
        analysisRequired: true
      });
    });

    it('should handle performance metrics and coordinate with optimization agents', async () => {
      render(<InstanceStatusIndicator {...defaultProps} showDetails={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Success Rate: 99.5%/)).toBeInTheDocument();
      });

      // Should coordinate performance data with optimization agents
      expect(mockSwarmStatusCoordinator.aggregateMetrics).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        performance: {
          averageLatency: 45,
          successRate: 99.5,
          errorRate: 0.5
        },
        optimizationOpportunity: expect.any(Boolean)
      });
    });

    it('should update metrics in real-time and coordinate with monitoring agents', async () => {
      const { rerender } = render(<InstanceStatusIndicator {...defaultProps} showDetails={true} />);

      // Simulate metrics update
      mockMetricsCollector.getPerformanceMetrics.mockReturnValue({
        averageLatency: 120,
        successRate: 95.0,
        errorRate: 5.0,
      });

      const updatedInstance = {
        ...mockInstance,
        processInfo: {
          ...mockInstance.processInfo!,
          cpuUsage: 45.2,
          memoryUsage: 256 * 1024 * 1024,
        }
      };

      rerender(<InstanceStatusIndicator {...defaultProps} instance={updatedInstance} showDetails={true} />);

      await waitFor(() => {
        expect(screen.getByText(/CPU: 45.2%/)).toBeInTheDocument();
        expect(screen.getByText(/Memory: 256 MB/)).toBeInTheDocument();
      });

      // Should coordinate metric changes with trend analysis agents
      expect(mockSwarmStatusCoordinator.notifyStatusChange).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        metricsUpdate: {
          cpuUsage: { from: 15.5, to: 45.2 },
          memoryUsage: { from: 134217728, to: 268435456 }
        },
        trendAnalysis: 'degradation_detected'
      });
    });
  });

  describe('Compact Mode and Space-Optimized Coordination', () => {
    it('should display compact status and coordinate with UI layout agents', () => {
      render(<InstanceStatusIndicator {...defaultProps} compact={true} />);

      const compactIndicator = screen.getByTestId('status-indicator-compact');
      expect(compactIndicator).toBeInTheDocument();
      expect(compactIndicator).toHaveClass('compact-mode');

      // Should show only essential status
      expect(screen.queryByText('PID:')).not.toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();

      // Should coordinate compact layout with UI agents
      expect(mockSwarmStatusCoordinator.shareStatus).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        displayMode: 'compact',
        layoutOptimization: 'space_efficient'
      });
    });

    it('should provide tooltip information in compact mode and coordinate with accessibility agents', async () => {
      const user = userEvent.setup();
      render(<InstanceStatusIndicator {...defaultProps} compact={true} />);

      const compactIndicator = screen.getByTestId('status-indicator-compact');
      await user.hover(compactIndicator);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText(/Instance Status: Ready/)).toBeInTheDocument();
      });

      // Should coordinate tooltip accessibility with accessibility agents
      expect(mockSwarmStatusCoordinator.coordinateHealthChecks).toHaveBeenCalledWith({
        action: 'accessibility_tooltip',
        componentState: 'compact',
        tooltipContent: expect.stringContaining('Ready')
      });
    });
  });

  describe('Error States and Recovery Coordination', () => {
    it('should display error status and coordinate with error recovery agents', () => {
      const errorInstance = {
        ...mockInstance,
        status: 'error' as InstanceStatus,
        connectionState: 'error' as ConnectionState,
      };

      render(<InstanceStatusIndicator {...defaultProps} instance={errorInstance} />);

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByTestId('status-indicator')).toHaveClass('status-error');
      expect(screen.getByTestId('connection-indicator')).toHaveClass('connection-error');

      // Should coordinate error recovery with specialized agents
      expect(mockSwarmStatusCoordinator.coordinateHealthChecks).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        errorState: true,
        recovery: {
          required: true,
          strategies: ['reconnection', 'restart', 'fallback']
        }
      });
    });

    it('should handle health check failures and coordinate diagnostic actions', async () => {
      mockHealthMonitor.checkHealth.mockRejectedValue(new Error('Health check failed'));

      render(<InstanceStatusIndicator {...defaultProps} showDetails={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Health check failed/)).toBeInTheDocument();
      });

      // Should coordinate diagnostic actions with troubleshooting agents
      expect(mockSwarmStatusCoordinator.coordinateHealthChecks).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        healthCheckFailed: true,
        diagnostic: {
          required: true,
          scope: 'connection_and_process'
        }
      });
    });

    it('should provide recovery actions and coordinate with repair agents', async () => {
      const user = userEvent.setup();
      const errorInstance = {
        ...mockInstance,
        status: 'error' as InstanceStatus,
        connectionState: 'error' as ConnectionState,
      };

      render(<InstanceStatusIndicator {...defaultProps} instance={errorInstance} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      await user.click(retryButton);

      // Should coordinate retry action with repair agents
      expect(mockSwarmStatusCoordinator.coordinateHealthChecks).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        userAction: 'retry_requested',
        repairSequence: 'initiated'
      });
    });
  });

  describe('Real-time Updates and Subscription Coordination', () => {
    it('should subscribe to real-time updates and coordinate with data streaming agents', () => {
      render(<InstanceStatusIndicator {...defaultProps} />);

      expect(mockHealthMonitor.subscribeToUpdates).toHaveBeenCalledWith(
        'test-instance',
        expect.any(Function)
      );

      expect(mockConnectionManager.subscribe).toHaveBeenCalledWith(
        'test-instance',
        expect.any(Function)
      );

      // Should coordinate subscription with data streaming agents
      expect(mockSwarmStatusCoordinator.coordinateHealthChecks).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        subscriptions: {
          health: 'active',
          connection: 'active',
          metrics: 'active'
        }
      });
    });

    it('should handle real-time status updates and coordinate with notification agents', async () => {
      const mockUpdateHandler = jest.fn();
      mockHealthMonitor.subscribeToUpdates.mockImplementation((instanceId, callback) => {
        mockUpdateHandler.mockImplementation(callback);
        return jest.fn(); // unsubscribe function
      });

      render(<InstanceStatusIndicator {...defaultProps} />);

      // Simulate real-time update
      const healthUpdate = {
        status: 'degraded',
        latency: 150,
        errorCount: 3,
        lastResponse: new Date(),
      };

      mockUpdateHandler(healthUpdate);

      await waitFor(() => {
        expect(screen.getByText(/Latency: 150ms/)).toBeInTheDocument();
      });

      // Should coordinate update notification with notification agents
      expect(mockSwarmStatusCoordinator.notifyStatusChange).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        realTimeUpdate: true,
        healthChange: {
          latency: { from: 45, to: 150 },
          status: { from: 'healthy', to: 'degraded' }
        }
      });
    });

    it('should cleanup subscriptions on unmount and coordinate with resource management agents', () => {
      const mockUnsubscribe = jest.fn();
      mockHealthMonitor.subscribeToUpdates.mockReturnValue(mockUnsubscribe);
      mockConnectionManager.subscribe.mockReturnValue(mockUnsubscribe);

      const { unmount } = render(<InstanceStatusIndicator {...defaultProps} />);

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(2);

      // Should coordinate resource cleanup with management agents
      expect(mockSwarmStatusCoordinator.coordinateHealthChecks).toHaveBeenCalledWith({
        action: 'cleanup_subscriptions',
        instanceId: 'test-instance',
        resourcesReleased: ['health_monitor', 'connection_manager']
      });
    });
  });

  describe('Performance Monitoring and Optimization Coordination', () => {
    it('should track rendering performance and coordinate with performance agents', () => {
      const performanceStart = performance.now();
      render(<InstanceStatusIndicator {...defaultProps} />);
      const performanceEnd = performance.now();

      // Should coordinate performance metrics with optimization agents
      expect(mockMetricsCollector.recordStatusChange).toHaveBeenCalledWith({
        component: 'status_indicator',
        renderTime: expect.any(Number),
        instanceId: 'test-instance'
      });
    });

    it('should optimize update frequency and coordinate with efficiency agents', async () => {
      const { rerender } = render(<InstanceStatusIndicator {...defaultProps} />);

      // Simulate rapid updates
      for (let i = 0; i < 10; i++) {
        const updatedInstance = {
          ...mockInstance,
          processInfo: {
            ...mockInstance.processInfo!,
            cpuUsage: 15.5 + i,
          }
        };
        rerender(<InstanceStatusIndicator {...defaultProps} instance={updatedInstance} />);
      }

      // Should coordinate update throttling with efficiency agents
      expect(mockSwarmStatusCoordinator.aggregateMetrics).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        updateOptimization: {
          throttlingRequired: true,
          updateFrequency: 'high',
          recommendation: 'batch_updates'
        }
      });
    });
  });

  describe('Contract Verification - London School Style', () => {
    it('should define clear contract for instance prop requirements', () => {
      // Contract: instance prop must have required fields
      const minimalInstance = {
        id: 'minimal-instance',
        type: {
          id: 'minimal-type',
          name: 'Minimal',
          command: 'minimal',
          description: 'Minimal instance',
          available: true,
          configured: true,
          enabled: true,
        },
        status: 'ready' as InstanceStatus,
        connectionState: 'connected' as ConnectionState,
        createdAt: new Date(),
      };

      render(<InstanceStatusIndicator {...defaultProps} instance={minimalInstance} />);

      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
    });

    it('should enforce contract for optional process info', () => {
      const instanceWithoutProcessInfo = {
        ...mockInstance,
        processInfo: undefined,
      };

      render(<InstanceStatusIndicator {...defaultProps} instance={instanceWithoutProcessInfo} showDetails={true} />);

      // Should handle missing process info gracefully
      expect(screen.queryByText(/PID:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Memory:/)).not.toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('should maintain consistent prop interface across different states', () => {
      const testStates: InstanceStatus[] = ['starting', 'ready', 'busy', 'error', 'stopped'];
      
      testStates.forEach(status => {
        const instanceWithStatus = { ...mockInstance, status };
        const { unmount } = render(<InstanceStatusIndicator {...defaultProps} instance={instanceWithStatus} />);
        
        // Contract: component should render for all valid status states
        expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Swarm Integration and Coordination Patterns', () => {
    it('should coordinate with health monitoring swarm for distributed health checks', () => {
      render(<InstanceStatusIndicator {...defaultProps} />);

      // Should register with health monitoring swarm
      expect(mockSwarmStatusCoordinator.coordinateHealthChecks).toHaveBeenCalledWith({
        action: 'register_monitoring',
        instanceId: 'test-instance',
        monitoringCapabilities: ['status', 'connection', 'health', 'metrics']
      });
    });

    it('should share aggregated metrics with performance analysis swarm', async () => {
      render(<InstanceStatusIndicator {...defaultProps} showDetails={true} />);

      await waitFor(() => {
        // Should share comprehensive metrics with analysis agents
        expect(mockSwarmStatusCoordinator.aggregateMetrics).toHaveBeenCalledWith({
          instanceId: 'test-instance',
          aggregatedData: {
            status: 'ready',
            health: 'healthy',
            performance: expect.any(Object),
            trends: expect.any(Object)
          }
        });
      });
    });

    it('should coordinate alert generation with notification swarm', () => {
      const criticalInstance = {
        ...mockInstance,
        status: 'error' as InstanceStatus,
        processInfo: {
          ...mockInstance.processInfo!,
          cpuUsage: 95.0,
          memoryUsage: 2048 * 1024 * 1024,
        }
      };

      render(<InstanceStatusIndicator {...defaultProps} instance={criticalInstance} />);

      // Should coordinate critical alerts with notification agents
      expect(mockSwarmStatusCoordinator.notifyStatusChange).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        alertLevel: 'critical',
        conditions: ['status_error', 'high_cpu', 'high_memory'],
        notificationRequired: true
      });
    });
  });
});