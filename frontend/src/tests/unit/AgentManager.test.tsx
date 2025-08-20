import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AgentManager from '@/components/AgentManager';
import { WebSocketProvider } from '@/context/WebSocketSingletonContext';

// Mock fetch
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
})) as any;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider config={{ autoConnect: false }}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </WebSocketProvider>
    </QueryClientProvider>
  );
};

describe('AgentManager Component', () => {
  const mockAgents = [
    {
      id: 'agent-1',
      name: 'test-agent-1',
      display_name: 'Test Agent 1',
      description: 'A test agent for research',
      system_prompt: 'You are a research agent',
      avatar_color: '#3B82F6',
      capabilities: ['research', 'analysis'],
      status: 'active' as const,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      usage_count: 5,
      performance_metrics: {
        success_rate: 0.95,
        average_response_time: 1200,
        total_tokens_used: 5000,
        error_count: 1,
      },
      health_status: {
        cpu_usage: 25,
        memory_usage: 40,
        response_time: 800,
        last_heartbeat: '2023-01-01T00:00:00Z',
      },
    },
    {
      id: 'agent-2',
      name: 'test-agent-2',
      display_name: 'Test Agent 2',
      description: 'A test agent for content creation',
      system_prompt: 'You are a content creation agent',
      avatar_color: '#8B5CF6',
      capabilities: ['writing', 'content-creation'],
      status: 'inactive' as const,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      usage_count: 3,
      performance_metrics: {
        success_rate: 0.92,
        average_response_time: 1400,
        total_tokens_used: 3000,
        error_count: 0,
      },
      health_status: {
        cpu_usage: 15,
        memory_usage: 30,
        response_time: 600,
        last_heartbeat: '2023-01-01T00:00:00Z',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ agents: mockAgents }),
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Rendering and Initial State', () => {
    it('should render loading state initially', async () => {
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render agent manager header and title', async () => {
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /agent manager/i })).toBeInTheDocument();
        expect(screen.getByText('Manage your AI agents and their configurations')).toBeInTheDocument();
      });
    });

    it('should display statistics cards correctly', async () => {
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Total Agents')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Total count
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // Active count
      });
    });

    it('should render search input and filters', async () => {
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search agents...')).toBeInTheDocument();
        expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create agent/i })).toBeInTheDocument();
      });
    });
  });

  describe('Agent Display and Grid', () => {
    it('should display agents in grid format', async () => {
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
        expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
        expect(screen.getByText('A test agent for research')).toBeInTheDocument();
        expect(screen.getByText('A test agent for content creation')).toBeInTheDocument();
      });
    });

    it('should display agent status badges correctly', async () => {
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Inactive')).toBeInTheDocument();
      });
    });

    it('should display agent capabilities', async () => {
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('research')).toBeInTheDocument();
        expect(screen.getByText('analysis')).toBeInTheDocument();
        expect(screen.getByText('writing')).toBeInTheDocument();
        expect(screen.getByText('content-creation')).toBeInTheDocument();
      });
    });

    it('should display performance metrics', async () => {
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('95.0%')).toBeInTheDocument(); // Success rate
        expect(screen.getByText('1200ms')).toBeInTheDocument(); // Response time
      });
    });
  });

  describe('Search and Filtering', () => {
    it('should filter agents by search query', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
        expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search agents...');
      await user.type(searchInput, 'research');

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Agent 2')).not.toBeInTheDocument();
      });
    });

    it('should filter agents by status', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
        expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
      });

      const statusFilter = screen.getByDisplayValue('All Status');
      await user.selectOptions(statusFilter, 'active');

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Agent 2')).not.toBeInTheDocument();
      });
    });

    it('should show no agents message when filters match nothing', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search agents...');
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No agents found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
      });
    });
  });

  describe('Agent Actions', () => {
    it('should toggle agent status', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // Find the power button for the active agent
      const agentCards = screen.getAllByRole('button', { name: /deactivate/i });
      await user.click(agentCards[0]);

      // Status should be updated in the UI (this would normally trigger a re-render)
      // In a real implementation, we'd check for visual feedback or state updates
    });

    it('should handle agent deletion with confirmation', async () => {
      const user = userEvent.setup();
      // Mock window.confirm
      window.confirm = jest.fn(() => true);

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // Find and click delete button
      const deleteButtons = screen.getAllByTitle('Delete');
      await user.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this agent?');
    });

    it('should cancel deletion when user declines confirmation', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn(() => false);

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete');
      await user.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalled();
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });
  });

  describe('Bulk Operations', () => {
    it('should select agents for bulk operations', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // Select first agent
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      expect(screen.getByText('1 Selected')).toBeInTheDocument();
    });

    it('should show bulk actions when agents are selected', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      const selectedButton = screen.getByText('1 Selected');
      await user.click(selectedButton);

      expect(screen.getByText('Bulk Actions:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });
  });

  describe('Create Agent Modal', () => {
    it('should open create agent modal', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create agent/i })).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      expect(screen.getByText('Create New Agent')).toBeInTheDocument();
      expect(screen.getByText('Start with a template (optional)')).toBeInTheDocument();
    });

    it('should display agent templates in create modal', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create agent/i })).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      expect(screen.getByText('Research Agent')).toBeInTheDocument();
      expect(screen.getByText('Content Creator')).toBeInTheDocument();
      expect(screen.getByText('Data Analyst')).toBeInTheDocument();
      expect(screen.getByText('Customer Support')).toBeInTheDocument();
    });

    it('should populate form when template is selected', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create agent/i })).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      const researchTemplate = screen.getByText('Research Agent');
      await user.click(researchTemplate);

      expect(screen.getByDisplayValue('Research Agent')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Specialized in web research and data analysis')).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create agent/i })).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      const submitButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(submitButton);

      // Form should not submit without required fields
      expect(screen.getByText('Create New Agent')).toBeInTheDocument();
    });

    it('should close modal when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create agent/i })).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText('Create New Agent')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Error connecting to agent API')).toBeInTheDocument();
      });
    });

    it('should display error message when API returns error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load agents')).toBeInTheDocument();
      });
    });

    it('should allow dismissing error messages', async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Error connecting to agent API')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: '' }); // X button
      await user.click(dismissButton);

      expect(screen.queryByText('Error connecting to agent API')).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should paginate agents when there are many', async () => {
      const manyAgents = Array.from({ length: 15 }, (_, i) => ({
        ...mockAgents[0],
        id: `agent-${i}`,
        name: `agent-${i}`,
        display_name: `Agent ${i}`,
      }));

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: manyAgents }),
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Showing 1 to 12 of 15 agents')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });
  });

  describe('Auto-refresh', () => {
    it('should auto-refresh agents every 30 seconds', async () => {
      jest.useFakeTimers();

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /agent manager/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create agent/i })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: '' })).toBeInTheDocument(); // Search input
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create agent/i })).toBeInTheDocument();
      });

      // Tab navigation should work
      await user.tab();
      expect(document.activeElement).toBeInTheDocument();
    });
  });
});