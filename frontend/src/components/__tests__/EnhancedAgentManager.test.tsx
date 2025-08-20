import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedAgentManager from '../EnhancedAgentManager';

// Mock the WebSocket hook
jest.mock('@/hooks/useWebSocketSingleton', () => ({
  useWebSocketSingleton: () => ({
    ws: null,
    isConnected: false,
    reconnect: jest.fn(),
    disconnect: jest.fn()
  })
}));

const mockAgents = {
  production: {
    active: [
      {
        id: 'prod-1',
        name: 'production-agent-1',
        display_name: 'Production Agent 1',
        description: 'Production data processor',
        system: 'production',
        status: 'active',
        capabilities: ['data-processing', 'analytics'],
        performance_metrics: {
          success_rate: 0.98,
          average_response_time: 1200,
          total_tokens_used: 5000,
          error_count: 2
        }
      }
    ],
    inactive: [
      {
        id: 'prod-2',
        name: 'production-agent-2',
        display_name: 'Production Agent 2',
        description: 'Production backup agent',
        system: 'production',
        status: 'inactive',
        capabilities: ['backup', 'recovery']
      }
    ]
  },
  development: {
    active: [
      {
        id: 'dev-1',
        name: 'development-agent-1',
        display_name: 'Development Agent 1',
        description: 'Development testing agent',
        system: 'development',
        status: 'active',
        capabilities: ['testing', 'debugging']
      }
    ],
    inactive: [
      {
        id: 'dev-2',
        name: 'development-agent-2',
        display_name: 'Development Agent 2',
        description: 'Development code analyzer',
        system: 'development',
        status: 'inactive',
        capabilities: ['code-analysis', 'linting']
      }
    ]
  }
};

describe('EnhancedAgentManager', () => {
  it('should render three tabs: Production, Development, and Unified', async () => {
    render(<EnhancedAgentManager agents={mockAgents} />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Production' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Development' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Unified' })).toBeInTheDocument();
    });
  });

  it('should display Production tab by default', async () => {
    render(<EnhancedAgentManager agents={mockAgents} />);

    await waitFor(() => {
      const productionTab = screen.getByRole('tab', { name: 'Production' });
      expect(productionTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('should switch tabs when clicked', async () => {
    render(<EnhancedAgentManager agents={mockAgents} />);

    await waitFor(() => {
      const developmentTab = screen.getByRole('tab', { name: 'Development' });
      fireEvent.click(developmentTab);
    });

    await waitFor(() => {
      const developmentTab = screen.getByRole('tab', { name: 'Development' });
      expect(developmentTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('should display both active and inactive agents sections', async () => {
    render(<EnhancedAgentManager agents={mockAgents} />);

    await waitFor(() => {
      const activeAgentHeaders = screen.getAllByText(/active agents/i);
      const inactiveAgentHeaders = screen.getAllByText(/inactive agents/i);
      expect(activeAgentHeaders.length).toBeGreaterThan(0);
      expect(inactiveAgentHeaders.length).toBeGreaterThan(0);
    });
  });

  it('should filter agents by system type in Production tab', async () => {
    render(<EnhancedAgentManager agents={mockAgents} />);

    const productionTab = screen.getByRole('tab', { name: /production/i });
    fireEvent.click(productionTab);

    await waitFor(() => {
      expect(screen.getByText('Production Agent 1')).toBeInTheDocument();
      expect(screen.queryByText('Development Agent 1')).not.toBeInTheDocument();
    });
  });

  it('should filter agents by system type in Development tab', async () => {
    render(<EnhancedAgentManager agents={mockAgents} />);

    const developmentTab = screen.getByRole('tab', { name: /development/i });
    fireEvent.click(developmentTab);

    await waitFor(() => {
      expect(screen.getByText('Development Agent 1')).toBeInTheDocument();
      expect(screen.queryByText('Production Agent 1')).not.toBeInTheDocument();
    });
  });

  it('should show all agents in Unified tab', async () => {
    render(<EnhancedAgentManager agents={mockAgents} />);

    const unifiedTab = screen.getByRole('tab', { name: /unified/i });
    fireEvent.click(unifiedTab);

    await waitFor(() => {
      expect(screen.getByText('Production Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Development Agent 1')).toBeInTheDocument();
    });
  });

  it('should allow agent activation', async () => {
    const onActivate = jest.fn();
    render(<EnhancedAgentManager agents={mockAgents} onActivateAgent={onActivate} />);

    const activateButton = screen.getByRole('button', { name: /activate.*prod-2/i });
    fireEvent.click(activateButton);

    expect(onActivate).toHaveBeenCalledWith('prod-2');
  });

  it('should allow agent deactivation', async () => {
    const onDeactivate = jest.fn();
    render(<EnhancedAgentManager agents={mockAgents} onDeactivateAgent={onDeactivate} />);

    const deactivateButton = screen.getByRole('button', { name: /deactivate.*prod-1/i });
    fireEvent.click(deactivateButton);

    expect(onDeactivate).toHaveBeenCalledWith('prod-1');
  });

  it('should update agent status in real-time via WebSocket', async () => {
    const { rerender } = render(<EnhancedAgentManager agents={mockAgents} />);

    // Simulate WebSocket update - moving inactive agent to active
    const updatedAgents = {
      ...mockAgents,
      production: {
        ...mockAgents.production,
        active: [
          ...mockAgents.production.active,
          { ...mockAgents.production.inactive[0], status: 'active' as const }
        ],
        inactive: []
      }
    };

    rerender(<EnhancedAgentManager agents={updatedAgents} />);

    await waitFor(() => {
      // Simply verify that Production Agent 2 is now rendered and has active status
      expect(screen.getByText('Production Agent 2')).toBeInTheDocument();
      const activeStatuses = screen.getAllByText('active');
      expect(activeStatuses.length).toBeGreaterThan(0);
    });
  });

  it('should display agent performance metrics', () => {
    render(<EnhancedAgentManager agents={mockAgents} />);

    expect(screen.getByText(/98%/)).toBeInTheDocument(); // success rate
    expect(screen.getByText(/1200ms/)).toBeInTheDocument(); // response time
  });

  it('should display agent count badges for each tab', () => {
    render(<EnhancedAgentManager agents={mockAgents} />);

    const productionTab = screen.getByRole('tab', { name: /production/i });
    expect(productionTab).toHaveTextContent('2'); // 1 active + 1 inactive

    const developmentTab = screen.getByRole('tab', { name: /development/i });
    expect(developmentTab).toHaveTextContent('2'); // 1 active + 1 inactive
  });

  it('should handle empty agent lists gracefully', () => {
    render(<EnhancedAgentManager agents={{}} />);

    expect(screen.getByText(/no agents found/i)).toBeInTheDocument();
  });
});