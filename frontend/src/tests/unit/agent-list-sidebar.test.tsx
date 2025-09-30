/**
 * TDD Unit Tests - AgentListSidebar Component
 * London School TDD: Test doubles (mocks/stubs) for all dependencies
 *
 * Component Responsibilities:
 * - Render list of agents
 * - Highlight selected agent
 * - Handle click to select agent
 * - Filter agents based on search
 * - Show empty/loading states
 * - Keyboard navigation support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Agent } from '../../types/api';

// Component to be implemented
interface AgentListSidebarProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  loading?: boolean;
}

// Mock component for now - will be implemented after tests are written
const AgentListSidebar: React.FC<AgentListSidebarProps> = () => {
  return <div data-testid="agent-list-sidebar">Not Implemented</div>;
};

const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    slug: 'agent-1',
    name: 'Code Assistant',
    display_name: 'Code Assistant',
    description: 'Helps with coding tasks',
    system_prompt: 'You are a code assistant',
    avatar_color: '#3B82F6',
    capabilities: ['coding', 'debugging'],
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    last_used: '2025-01-15T00:00:00Z',
    usage_count: 42,
    version: '1.0.0',
    configuration: {},
    performance_metrics: {
      success_rate: 0.95,
      average_response_time: 150,
      total_tokens_used: 10000,
      error_count: 2,
      uptime_percentage: 99.5,
      last_performance_check: '2025-01-15T00:00:00Z',
      performance_trend: 'stable'
    },
    health_status: {
      cpu_usage: 25,
      memory_usage: 512,
      response_time: 120,
      last_heartbeat: '2025-01-15T00:00:00Z',
      connection_status: 'connected',
      error_count_24h: 0
    }
  },
  {
    id: 'agent-2',
    slug: 'agent-2',
    name: 'Data Analyzer',
    display_name: 'Data Analyzer',
    description: 'Analyzes data patterns',
    system_prompt: 'You are a data analyzer',
    avatar_color: '#10B981',
    capabilities: ['analysis', 'visualization'],
    status: 'active',
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    last_used: null,
    usage_count: 15,
    version: '1.0.0',
    configuration: {},
    performance_metrics: {
      success_rate: 0.98,
      average_response_time: 200,
      total_tokens_used: 5000,
      error_count: 1,
      uptime_percentage: 99.8,
      last_performance_check: '2025-01-15T00:00:00Z',
      performance_trend: 'improving'
    },
    health_status: {
      cpu_usage: 15,
      memory_usage: 256,
      response_time: 180,
      last_heartbeat: '2025-01-15T00:00:00Z',
      connection_status: 'connected',
      error_count_24h: 0
    }
  },
  {
    id: 'agent-3',
    slug: 'agent-3',
    name: 'Content Writer',
    display_name: 'Content Writer',
    description: 'Creates written content',
    system_prompt: 'You are a content writer',
    avatar_color: '#8B5CF6',
    capabilities: ['writing', 'editing'],
    status: 'inactive',
    created_at: '2025-01-03T00:00:00Z',
    updated_at: '2025-01-03T00:00:00Z',
    last_used: null,
    usage_count: 0,
    version: '1.0.0',
    configuration: {},
    performance_metrics: {
      success_rate: 0,
      average_response_time: 0,
      total_tokens_used: 0,
      error_count: 0,
      uptime_percentage: 0,
      last_performance_check: '2025-01-15T00:00:00Z',
      performance_trend: 'stable'
    },
    health_status: {
      cpu_usage: 0,
      memory_usage: 0,
      response_time: 0,
      last_heartbeat: '2025-01-03T00:00:00Z',
      connection_status: 'disconnected',
      error_count_24h: 0
    }
  }
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AgentListSidebar - TDD Unit Tests', () => {
  let mockOnSelectAgent: ReturnType<typeof vi.fn>;
  let mockOnSearchChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSelectAgent = vi.fn();
    mockOnSearchChange = vi.fn();
  });

  describe('Rendering - Basic Display', () => {
    it('should render the sidebar container', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      expect(screen.getByTestId('agent-list-sidebar')).toBeInTheDocument();
    });

    it('should render all agents in the list', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      expect(screen.getByText('Code Assistant')).toBeInTheDocument();
      expect(screen.getByText('Data Analyzer')).toBeInTheDocument();
      expect(screen.getByText('Content Writer')).toBeInTheDocument();
    });

    it('should render agent descriptions', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      expect(screen.getByText('Helps with coding tasks')).toBeInTheDocument();
      expect(screen.getByText('Analyzes data patterns')).toBeInTheDocument();
    });

    it('should render agent status indicators', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const statusBadges = screen.getAllByText(/active|inactive/i);
      expect(statusBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('should render agent avatars with correct colors', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const avatars = screen.getAllByTestId(/agent-avatar/i);
      expect(avatars.length).toBe(3);
    });
  });

  describe('Selection - Highlighting Selected Agent', () => {
    it('should highlight the selected agent', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId="agent-1"
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const selectedItem = screen.getByTestId('agent-item-agent-1');
      expect(selectedItem).toHaveClass('selected');
    });

    it('should not highlight non-selected agents', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId="agent-1"
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const nonSelectedItem = screen.getByTestId('agent-item-agent-2');
      expect(nonSelectedItem).not.toHaveClass('selected');
    });

    it('should apply visual distinction to selected agent (background color)', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId="agent-2"
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const selectedItem = screen.getByTestId('agent-item-agent-2');
      expect(selectedItem).toHaveStyle({ backgroundColor: expect.any(String) });
    });
  });

  describe('Interaction - Click to Select', () => {
    it('should call onSelectAgent when clicking an agent', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const agentItem = screen.getByTestId('agent-item-agent-1');
      fireEvent.click(agentItem);

      expect(mockOnSelectAgent).toHaveBeenCalledWith('agent-1');
      expect(mockOnSelectAgent).toHaveBeenCalledTimes(1);
    });

    it('should call onSelectAgent with correct agent ID when clicking different agents', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId="agent-1"
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const agent2Item = screen.getByTestId('agent-item-agent-2');
      fireEvent.click(agent2Item);

      expect(mockOnSelectAgent).toHaveBeenCalledWith('agent-2');
    });

    it('should allow re-selecting the currently selected agent', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId="agent-1"
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const agent1Item = screen.getByTestId('agent-item-agent-1');
      fireEvent.click(agent1Item);

      expect(mockOnSelectAgent).toHaveBeenCalledWith('agent-1');
    });

    it('should have clickable agent items with pointer cursor', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const agentItem = screen.getByTestId('agent-item-agent-1');
      expect(agentItem).toHaveStyle({ cursor: 'pointer' });
    });
  });

  describe('Search - Filtering Agents', () => {
    it('should render search input', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search agents/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should call onSearchChange when typing in search input', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search agents/i);
      fireEvent.change(searchInput, { target: { value: 'Code' } });

      expect(mockOnSearchChange).toHaveBeenCalledWith('Code');
    });

    it('should display current search term in input', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm="Data"
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search agents/i) as HTMLInputElement;
      expect(searchInput.value).toBe('Data');
    });

    it('should filter agents by name (case-insensitive)', () => {
      const filteredAgents = mockAgents.filter(a =>
        a.name.toLowerCase().includes('code')
      );

      renderWithRouter(
        <AgentListSidebar
          agents={filteredAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm="code"
          onSearchChange={mockOnSearchChange}
        />
      );

      expect(screen.getByText('Code Assistant')).toBeInTheDocument();
      expect(screen.queryByText('Data Analyzer')).not.toBeInTheDocument();
    });

    it('should show clear search button when search term is present', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm="test"
          onSearchChange={mockOnSearchChange}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('should clear search when clicking clear button', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm="test"
          onSearchChange={mockOnSearchChange}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      fireEvent.click(clearButton);

      expect(mockOnSearchChange).toHaveBeenCalledWith('');
    });
  });

  describe('Empty State - No Agents', () => {
    it('should show empty state when no agents are provided', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={[]}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      expect(screen.getByText(/no agents found/i)).toBeInTheDocument();
    });

    it('should show empty state message for search with no results', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={[]}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm="nonexistent"
          onSearchChange={mockOnSearchChange}
        />
      );

      expect(screen.getByText(/no agents match your search/i)).toBeInTheDocument();
    });

    it('should display empty state icon', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={[]}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const emptyIcon = screen.getByTestId('empty-state-icon');
      expect(emptyIcon).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading is true', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={[]}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
          loading={true}
        />
      );

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should show multiple skeleton items when loading', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={[]}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
          loading={true}
        />
      );

      const skeletons = screen.getAllByTestId(/skeleton-item/i);
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });

    it('should hide loading state when loading is false', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
          loading={false}
        />
      );

      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
    });

    it('should not show agents while loading', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
          loading={true}
        />
      );

      expect(screen.queryByText('Code Assistant')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should select next agent on arrow down key', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId="agent-1"
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const sidebar = screen.getByTestId('agent-list-sidebar');
      fireEvent.keyDown(sidebar, { key: 'ArrowDown', code: 'ArrowDown' });

      expect(mockOnSelectAgent).toHaveBeenCalledWith('agent-2');
    });

    it('should select previous agent on arrow up key', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId="agent-2"
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const sidebar = screen.getByTestId('agent-list-sidebar');
      fireEvent.keyDown(sidebar, { key: 'ArrowUp', code: 'ArrowUp' });

      expect(mockOnSelectAgent).toHaveBeenCalledWith('agent-1');
    });

    it('should not go below first agent when pressing arrow up', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId="agent-1"
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const sidebar = screen.getByTestId('agent-list-sidebar');
      fireEvent.keyDown(sidebar, { key: 'ArrowUp', code: 'ArrowUp' });

      expect(mockOnSelectAgent).not.toHaveBeenCalled();
    });

    it('should not go beyond last agent when pressing arrow down', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId="agent-3"
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const sidebar = screen.getByTestId('agent-list-sidebar');
      fireEvent.keyDown(sidebar, { key: 'ArrowDown', code: 'ArrowDown' });

      expect(mockOnSelectAgent).not.toHaveBeenCalled();
    });

    it('should have keyboard focus indicators on agent items', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const agentItem = screen.getByTestId('agent-item-agent-1');
      agentItem.focus();

      expect(agentItem).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on agent items', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId="agent-1"
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const agentItem = screen.getByTestId('agent-item-agent-1');
      expect(agentItem).toHaveAttribute('aria-label');
    });

    it('should mark selected agent with aria-selected', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId="agent-1"
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const selectedItem = screen.getByTestId('agent-item-agent-1');
      expect(selectedItem).toHaveAttribute('aria-selected', 'true');
    });

    it('should have role="listbox" on sidebar', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const sidebar = screen.getByRole('listbox');
      expect(sidebar).toBeInTheDocument();
    });

    it('should have role="option" on agent items', () => {
      renderWithRouter(
        <AgentListSidebar
          agents={mockAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const options = screen.getAllByRole('option');
      expect(options.length).toBe(3);
    });
  });

  describe('Performance - Rendering Optimization', () => {
    it('should render efficiently with many agents', () => {
      const manyAgents = Array.from({ length: 100 }, (_, i) => ({
        ...mockAgents[0],
        id: `agent-${i}`,
        name: `Agent ${i}`
      }));

      const startTime = performance.now();

      renderWithRouter(
        <AgentListSidebar
          agents={manyAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render in less than 100ms even with 100 agents
      expect(renderTime).toBeLessThan(100);
    });

    it('should use virtualization for long lists', () => {
      const manyAgents = Array.from({ length: 100 }, (_, i) => ({
        ...mockAgents[0],
        id: `agent-${i}`,
        name: `Agent ${i}`
      }));

      renderWithRouter(
        <AgentListSidebar
          agents={manyAgents}
          selectedAgentId={null}
          onSelectAgent={mockOnSelectAgent}
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        />
      );

      // Should only render visible items (not all 100)
      const renderedItems = screen.getAllByTestId(/agent-item/i);
      expect(renderedItems.length).toBeLessThan(manyAgents.length);
    });
  });
});
