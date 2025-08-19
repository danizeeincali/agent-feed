import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DualInstanceDashboard from '@/components/DualInstanceDashboard';
import { WebSocketProvider } from '@/context/WebSocketContext';

// Mock fetch responses
const mockProductionAgents = [
  {
    id: 'prod-1',
    name: 'Chief of Staff',
    description: 'Strategic coordination and delegation',
    status: 'active',
    instance: 'production',
    capabilities: ['coordination', 'strategy', 'delegation'],
    priority: 'critical',
    color: '#3B82F6',
    lastActivity: new Date().toISOString()
  },
  {
    id: 'prod-2',
    name: 'Market Research Analyst',
    description: 'Market analysis and insights',
    status: 'active',
    instance: 'production',
    capabilities: ['analysis', 'research', 'reporting'],
    priority: 'high',
    color: '#10B981',
    lastActivity: new Date().toISOString()
  }
];

const mockDevelopmentAgents = [
  {
    id: 'dev-1',
    name: 'Code Generator',
    description: 'Automated code generation',
    status: 'active',
    instance: 'development',
    capabilities: ['coding', 'testing', 'refactoring'],
    priority: 'high',
    color: '#8B5CF6',
    lastActivity: new Date().toISOString()
  }
];

const mockActivities = [
  {
    id: 'act-1',
    agentName: 'Chief of Staff',
    instance: 'production',
    type: 'delegation',
    description: 'Delegated task to Market Research Analyst',
    timestamp: new Date(),
    metadata: {}
  },
  {
    id: 'act-2',
    agentName: 'Code Generator',
    instance: 'development',
    type: 'code_generation',
    description: 'Generated React component',
    timestamp: new Date(),
    metadata: {}
  }
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider config={{ autoConnect: false }}>
        {component}
      </WebSocketProvider>
    </QueryClientProvider>
  );
};

describe('DualInstanceDashboard', () => {
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Unified View', () => {
    it('should display both production and development agents in unified view', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: mockDevelopmentAgents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: mockProductionAgents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ activities: mockActivities })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ handoffs: [] })
        });

      renderWithProviders(<DualInstanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Unified View')).toBeInTheDocument();
      });

      // Click on unified view tab
      fireEvent.click(screen.getByText('Unified View'));

      await waitFor(() => {
        // Should show agents from both instances
        expect(screen.getByText('Chief of Staff')).toBeInTheDocument();
        expect(screen.getByText('Market Research Analyst')).toBeInTheDocument();
        expect(screen.getByText('Code Generator')).toBeInTheDocument();
      });
    });

    it('should display activities from both instances in unified view', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: mockDevelopmentAgents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: mockProductionAgents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ activities: mockActivities })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ handoffs: [] })
        });

      renderWithProviders(<DualInstanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      });

      // Should show activities from both instances
      await waitFor(() => {
        expect(screen.getByText('Delegated task to Market Research Analyst')).toBeInTheDocument();
        expect(screen.getByText('Generated React component')).toBeInTheDocument();
      });
    });
  });

  describe('Filtered Views', () => {
    it('should show only development agents in development view', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: mockDevelopmentAgents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: mockProductionAgents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ activities: mockActivities })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ handoffs: [] })
        });

      renderWithProviders(<DualInstanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Development')).toBeInTheDocument();
      });

      // Click on development tab
      fireEvent.click(screen.getByText('Development'));

      await waitFor(() => {
        // Should only show development agents
        expect(screen.getByText('Code Generator')).toBeInTheDocument();
        expect(screen.queryByText('Chief of Staff')).not.toBeInTheDocument();
        expect(screen.queryByText('Market Research Analyst')).not.toBeInTheDocument();
      });
    });

    it('should show only production agents in production view', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: mockDevelopmentAgents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: mockProductionAgents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ activities: mockActivities })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ handoffs: [] })
        });

      renderWithProviders(<DualInstanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Production')).toBeInTheDocument();
      });

      // Click on production tab
      fireEvent.click(screen.getByText('Production'));

      await waitFor(() => {
        // Should only show production agents
        expect(screen.getByText('Chief of Staff')).toBeInTheDocument();
        expect(screen.getByText('Market Research Analyst')).toBeInTheDocument();
        expect(screen.queryByText('Code Generator')).not.toBeInTheDocument();
      });
    });
  });

  describe('Real Data Integration', () => {
    it('should fetch real production agents from API', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: mockProductionAgents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ activities: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ handoffs: [] })
        });

      renderWithProviders(<DualInstanceDashboard />);

      await waitFor(() => {
        // Check that the correct API endpoints were called
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/agents/development');
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/agents/production');
      });
    });

    it('should not display mock or demo data', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: mockProductionAgents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ activities: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ handoffs: [] })
        });

      renderWithProviders(<DualInstanceDashboard />);

      await waitFor(() => {
        // Should not call demo endpoints
        expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/demo/'));
      });
    });
  });

  describe('Instance Counters', () => {
    it('should display correct agent counts for each instance', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: mockDevelopmentAgents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: mockProductionAgents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ activities: mockActivities })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ handoffs: [] })
        });

      renderWithProviders(<DualInstanceDashboard />);

      await waitFor(() => {
        // Check development instance counter
        expect(screen.getByText('1')).toBeInTheDocument(); // 1 dev agent
        // Check production instance counter
        expect(screen.getByText('2')).toBeInTheDocument(); // 2 prod agents
      });
    });
  });

  describe('Activity Feed', () => {
    it('should filter activities by instance in filtered views', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: mockDevelopmentAgents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: mockProductionAgents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ activities: mockActivities })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ handoffs: [] })
        });

      renderWithProviders(<DualInstanceDashboard />);

      // Switch to development view
      fireEvent.click(screen.getByText('Development'));

      await waitFor(() => {
        // Should only show development activities
        expect(screen.getByText('Generated React component')).toBeInTheDocument();
        expect(screen.queryByText('Delegated task to Market Research Analyst')).not.toBeInTheDocument();
      });
    });
  });
});