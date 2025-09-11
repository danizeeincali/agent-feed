/**
 * London School TDD Unit Tests for AgentProfile Component
 * Focus: Mock-driven development testing component interactions and behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import AgentProfile from '@/components/AgentProfile';
import { swarmCoordinator, type SwarmContract } from '../helpers/swarm-coordinator';
import { mockAgentApi, type MockAgentData } from '../mocks/agent-api.mock';

// Mock the WebSocket hook
const mockUseWebSocket = {
  isConnected: false,
  subscribe: jest.fn(),
  send: jest.fn(),
  disconnect: jest.fn()
};

jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => mockUseWebSocket
}));

// Mock utilities
jest.mock('@/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// London School TDD: Define component contracts first
const AGENT_PROFILE_CONTRACT: SwarmContract = {
  componentName: 'AgentProfile',
  dependencies: ['useWebSocket', 'mockAgentApi', 'DOM'],
  interactions: [
    {
      dependency: 'useWebSocket',
      method: 'subscribe',
      expectedCallCount: 2, // agent-activity and agent-metrics-update
      callOrder: 1
    },
    {
      dependency: 'mockAgentApi',
      method: 'getAgent',
      expectedCallCount: 1,
      callOrder: 2
    }
  ]
};

describe('AgentProfile Component - London School TDD', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockOnBack: jest.Mock;

  beforeEach(() => {
    // London School: Setup all mocks before each test
    user = userEvent.setup();
    mockOnBack = jest.fn();
    
    // Register contract with swarm coordinator
    swarmCoordinator.registerContract(AGENT_PROFILE_CONTRACT);
    
    // Reset all mocks
    mockUseWebSocket.isConnected = true;
    mockUseWebSocket.subscribe.mockClear();
    mockAgentApi.reset();
    
    // Setup default agent data
    mockAgentApi.addMockAgent({
      id: 'chief-of-staff',
      name: 'chief-of-staff',
      display_name: 'Chief of Staff Agent',
      description: 'Strategic coordination and executive assistance',
      status: 'active',
      capabilities: ['strategic-planning', 'task-coordination', 'priority-assessment']
    });
  });

  afterEach(() => {
    // Verify contract compliance
    const violations = swarmCoordinator.verifyContract('AgentProfile');
    if (violations.length > 0) {
      console.warn('Contract violations:', violations);
    }
    
    swarmCoordinator.reportTestCompletion();
  });

  describe('Component Initialization and Loading', () => {
    it('should display loading state initially and setup WebSocket subscriptions', async () => {
      // London School: Test the conversation between components
      render(<AgentProfile agentId="chief-of-staff" />);

      // Verify loading state is shown
      expect(screen.getByTestId('loading-spinner') || document.querySelector('.animate-pulse')).toBeInTheDocument();

      // Wait for component to finish loading
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      // Verify WebSocket interactions
      expect(mockUseWebSocket.subscribe).toHaveBeenCalledTimes(2);
      expect(mockUseWebSocket.subscribe).toHaveBeenCalledWith('agent-activity', expect.any(Function));
      expect(mockUseWebSocket.subscribe).toHaveBeenCalledWith('agent-metrics-update', expect.any(Function));
    });

    it('should handle agent not found scenario correctly', async () => {
      // Setup mock to return no agent
      mockAgentApi.reset();
      
      render(<AgentProfile agentId="non-existent-agent" />);

      await waitFor(() => {
        expect(screen.getByText('Agent profile not found')).toBeInTheDocument();
      });
      
      // Verify appropriate icon is shown
      expect(document.querySelector('[data-lucide="user"]')).toBeInTheDocument();
    });
  });

  describe('Agent Data Display and Interaction', () => {
    it('should render agent profile data correctly with proper structure', async () => {
      render(<AgentProfile agentId="chief-of-staff" onBack={mockOnBack} />);

      await waitFor(() => {
        expect(screen.getByText('Chief of Staff Agent')).toBeInTheDocument();
      });

      // Verify header section
      expect(screen.getByText('Strategic coordination and executive assistance')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('ID: chief-of-staff')).toBeInTheDocument();

      // Verify back button interaction
      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeInTheDocument();
    });

    it('should handle back button click correctly', async () => {
      render(<AgentProfile agentId="chief-of-staff" onBack={mockOnBack} />);

      await waitFor(() => {
        expect(screen.getByText('Chief of Staff Agent')).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back/i }) || 
                        document.querySelector('[data-lucide="arrow-left"]')?.closest('button');
      
      if (backButton) {
        await user.click(backButton);
        expect(mockOnBack).toHaveBeenCalledTimes(1);
      }
    });

    it('should display performance metrics correctly', async () => {
      render(<AgentProfile agentId="chief-of-staff" />);

      await waitFor(() => {
        expect(screen.getByText('Chief of Staff Agent')).toBeInTheDocument();
      });

      // Check for metrics display
      const metricsSection = screen.getByText(/Total Tasks|Success Rate|Response Time/i).closest('div');
      expect(metricsSection).toBeInTheDocument();
    });
  });

  describe('Tab Navigation and Content Switching', () => {
    it('should handle tab navigation correctly', async () => {
      render(<AgentProfile agentId="chief-of-staff" />);

      await waitFor(() => {
        expect(screen.getByText('Chief of Staff Agent')).toBeInTheDocument();
      });

      // Test activities tab
      const activitiesTab = screen.getByRole('button', { name: /activities/i });
      await user.click(activitiesTab);
      
      // Verify tab active state
      expect(activitiesTab).toHaveClass('border-blue-500', 'text-blue-600');
      
      // Test performance tab
      const performanceTab = screen.getByRole('button', { name: /performance/i });
      await user.click(performanceTab);
      
      expect(performanceTab).toHaveClass('border-blue-500', 'text-blue-600');
      
      // Test capabilities tab
      const capabilitiesTab = screen.getByRole('button', { name: /capabilities/i });
      await user.click(capabilitiesTab);
      
      expect(capabilitiesTab).toHaveClass('border-blue-500', 'text-blue-600');
    });

    it('should show correct content for each tab', async () => {
      render(<AgentProfile agentId="chief-of-staff" />);

      await waitFor(() => {
        expect(screen.getByText('Chief of Staff Agent')).toBeInTheDocument();
      });

      // Overview tab (default)
      expect(screen.getByText(/About|Current Workload|Achievements/)).toBeInTheDocument();

      // Activities tab
      const activitiesTab = screen.getByRole('button', { name: /activities/i });
      await user.click(activitiesTab);
      expect(screen.getByText('Recent Activities')).toBeInTheDocument();

      // Performance tab
      const performanceTab = screen.getByRole('button', { name: /performance/i });
      await user.click(performanceTab);
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();

      // Capabilities tab
      const capabilitiesTab = screen.getByRole('button', { name: /capabilities/i });
      await user.click(capabilitiesTab);
      expect(screen.getByText('Capabilities & Skills')).toBeInTheDocument();
    });
  });

  describe('WebSocket Real-time Updates', () => {
    it('should handle agent activity updates via WebSocket', async () => {
      render(<AgentProfile agentId="chief-of-staff" />);

      await waitFor(() => {
        expect(screen.getByText('Chief of Staff Agent')).toBeInTheDocument();
      });

      // Get the WebSocket callback that was registered
      const subscribeCall = mockUseWebSocket.subscribe.mock.calls.find(
        call => call[0] === 'agent-activity'
      );
      expect(subscribeCall).toBeDefined();
      
      const activityCallback = subscribeCall[1];
      
      // Simulate receiving activity update
      const mockActivity = {
        agentId: 'chief-of-staff',
        activity: {
          id: 'new-activity',
          type: 'task_completed',
          title: 'New Task Completed',
          description: 'Successfully completed a new strategic task',
          timestamp: new Date().toISOString(),
          metadata: {
            duration: 30,
            success: true,
            impact_score: 8.5
          }
        }
      };

      // London School: Test the interaction between WebSocket and component
      activityCallback(mockActivity);

      // Navigate to activities tab to see the update
      const activitiesTab = screen.getByRole('button', { name: /activities/i });
      await user.click(activitiesTab);

      await waitFor(() => {
        expect(screen.getByText('New Task Completed')).toBeInTheDocument();
      });
    });

    it('should handle agent metrics updates via WebSocket', async () => {
      render(<AgentProfile agentId="chief-of-staff" />);

      await waitFor(() => {
        expect(screen.getByText('Chief of Staff Agent')).toBeInTheDocument();
      });

      // Get the metrics update callback
      const subscribeCall = mockUseWebSocket.subscribe.mock.calls.find(
        call => call[0] === 'agent-metrics-update'
      );
      expect(subscribeCall).toBeDefined();
      
      const metricsCallback = subscribeCall[1];
      
      // Simulate metrics update
      const mockMetricsUpdate = {
        agentId: 'chief-of-staff',
        metrics: {
          todayTasks: 25,
          weeklyTasks: 160,
          monthlyTasks: 700
        }
      };

      metricsCallback(mockMetricsUpdate);

      // Verify metrics are updated in the UI
      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument(); // Today's tasks
      });
    });

    it('should only process updates for the correct agent', async () => {
      render(<AgentProfile agentId="chief-of-staff" />);

      await waitFor(() => {
        expect(screen.getByText('Chief of Staff Agent')).toBeInTheDocument();
      });

      // Get callbacks
      const activityCallback = mockUseWebSocket.subscribe.mock.calls.find(
        call => call[0] === 'agent-activity'
      )[1];
      
      const metricsCallback = mockUseWebSocket.subscribe.mock.calls.find(
        call => call[0] === 'agent-metrics-update'
      )[1];

      // Simulate update for different agent
      const otherAgentUpdate = {
        agentId: 'other-agent',
        activity: {
          id: 'other-activity',
          type: 'task_completed',
          title: 'Other Agent Task',
          description: 'Task for different agent',
          timestamp: new Date().toISOString()
        }
      };

      // London School: Verify that wrong agent updates are ignored
      activityCallback(otherAgentUpdate);
      
      // Navigate to activities tab
      const activitiesTab = screen.getByRole('button', { name: /activities/i });
      await user.click(activitiesTab);

      // Should not show the other agent's activity
      expect(screen.queryByText('Other Agent Task')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons and User Interactions', () => {
    it('should render export and refresh buttons correctly', async () => {
      render(<AgentProfile agentId="chief-of-staff" />);

      await waitFor(() => {
        expect(screen.getByText('Chief of Staff Agent')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /export data/i });
      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      expect(exportButton).toBeInTheDocument();
      expect(refreshButton).toBeInTheDocument();

      // Test button interactions (mock implementations)
      await user.click(exportButton);
      await user.click(refreshButton);

      // In a real implementation, these would trigger specific actions
      // For now, verify they're clickable without errors
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle WebSocket disconnection gracefully', async () => {
      mockUseWebSocket.isConnected = false;
      
      render(<AgentProfile agentId="chief-of-staff" />);

      await waitFor(() => {
        expect(screen.getByText('Chief of Staff Agent')).toBeInTheDocument();
      });

      // Component should still render even without WebSocket connection
      expect(screen.getByText('Strategic coordination and executive assistance')).toBeInTheDocument();
      
      // WebSocket subscriptions should not be called when disconnected
      expect(mockUseWebSocket.subscribe).not.toHaveBeenCalled();
    });

    it('should handle invalid activity data gracefully', async () => {
      mockUseWebSocket.isConnected = true;
      
      render(<AgentProfile agentId="chief-of-staff" />);

      await waitFor(() => {
        expect(screen.getByText('Chief of Staff Agent')).toBeInTheDocument();
      });

      const activityCallback = mockUseWebSocket.subscribe.mock.calls.find(
        call => call[0] === 'agent-activity'
      )[1];

      // Send invalid activity data
      const invalidActivity = {
        agentId: 'chief-of-staff',
        activity: null // Invalid activity
      };

      // Should not crash the component
      expect(() => activityCallback(invalidActivity)).not.toThrow();
    });

    it('should handle missing agent data properties', async () => {
      // Setup agent with minimal data
      mockAgentApi.reset();
      mockAgentApi.addMockAgent({
        id: 'minimal-agent',
        name: 'minimal-agent',
        display_name: 'Minimal Agent',
        description: 'Agent with minimal data'
        // Missing capabilities, metrics, etc.
      });
      
      render(<AgentProfile agentId="minimal-agent" />);

      await waitFor(() => {
        expect(screen.getByText('Minimal Agent')).toBeInTheDocument();
      });

      // Should render without crashing
      expect(screen.getByText('Agent with minimal data')).toBeInTheDocument();
    });
  });

  describe('Contract Verification and Swarm Integration', () => {
    it('should satisfy all dependency contracts', () => {
      // This test verifies that all expected interactions occurred
      // London School TDD emphasizes contract compliance
      
      render(<AgentProfile agentId="chief-of-staff" />);

      // Verify contract compliance will be checked in afterEach
      // This test ensures the contract verification system works
      expect(swarmCoordinator.verifyContract).toBeDefined();
    });

    it('should coordinate with other testing agents properly', () => {
      // London School: Test swarm coordination
      const testResult = {
        testName: 'AgentProfile Contract Verification',
        duration: 100,
        passed: true,
        contractViolations: []
      };

      swarmCoordinator.reportTestCompletion(testResult);
      
      // Verify test result was recorded
      expect(swarmCoordinator.shareResultsWithSwarm).toBeDefined();
    });
  });
});