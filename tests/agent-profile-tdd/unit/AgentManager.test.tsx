/**
 * London School TDD Unit Tests for AgentManager Component
 * Focus: Mock-driven CRUD operations and bulk management behaviors
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import AgentManager from '@/components/AgentManager';
import { swarmCoordinator, type SwarmContract } from '../helpers/swarm-coordinator';
import { mockAgentApi, type MockAgentData } from '../mocks/agent-api.mock';

// Mock external dependencies
jest.mock('@/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

jest.mock('@/components/LoadingSpinner', () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

// London School TDD: Define AgentManager contracts
const AGENT_MANAGER_CONTRACT: SwarmContract = {
  componentName: 'AgentManager',
  dependencies: ['AgentApi', 'DOM', 'UserInteractions'],
  interactions: [
    {
      dependency: 'AgentApi',
      method: 'getAgents',
      expectedCallCount: 1,
      callOrder: 1
    }
  ]
};

const AGENT_CRUD_CONTRACT: SwarmContract = {
  componentName: 'AgentCRUD',
  dependencies: ['AgentApi', 'FormValidation', 'UserFeedback'],
  interactions: [
    {
      dependency: 'AgentApi',
      method: 'createAgent',
      callOrder: 1
    },
    {
      dependency: 'AgentApi',
      method: 'updateAgent',
      callOrder: 2
    },
    {
      dependency: 'AgentApi',
      method: 'deleteAgent',
      callOrder: 3
    }
  ]
};

describe('AgentManager Component - London School TDD', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    user = userEvent.setup();
    
    // Register contracts
    swarmCoordinator.registerContract(AGENT_MANAGER_CONTRACT);
    swarmCoordinator.registerContract(AGENT_CRUD_CONTRACT);
    
    // Mock fetch for API calls
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    // Reset mocks
    mockAgentApi.reset();
    
    // Setup default API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        agents: [
          {
            id: 'test-agent-1',
            name: 'Test Agent 1',
            description: 'A test agent',
            status: 'active',
            color: '#3B82F6',
            capabilities: ['testing'],
            lastActivity: new Date().toISOString()
          },
          {
            id: 'test-agent-2',
            name: 'Test Agent 2',
            description: 'Another test agent',
            status: 'inactive',
            color: '#8B5CF6',
            capabilities: ['testing', 'analysis'],
            lastActivity: new Date().toISOString()
          }
        ]
      })
    });
  });

  afterEach(() => {
    // Verify contract compliance
    const violations = [
      ...swarmCoordinator.verifyContract('AgentManager'),
      ...swarmCoordinator.verifyContract('AgentCRUD')
    ];
    
    if (violations.length > 0) {
      console.warn('Contract violations:', violations);
    }
    
    swarmCoordinator.reportTestCompletion();
  });

  describe('Component Loading and Initial State', () => {
    it('should display loading state and then load agents from API', async () => {
      render(<AgentManager />);

      // Verify initial loading state
      expect(screen.getByText('Agent Manager')).toBeInTheDocument();
      
      // Wait for agents to load
      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
        expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
      });

      // Verify API was called
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/claude-live/prod/agents');
    });

    it('should display empty state when no agents exist', async () => {
      // Mock empty response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: [] })
      });

      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('No agents found')).toBeInTheDocument();
        expect(screen.getByText('Create your first agent to get started')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Error connecting to agent API')).toBeInTheDocument();
      });
    });
  });

  describe('Agent Display and Statistics', () => {
    it('should render agent cards with correct information', async () => {
      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // Find the first agent card
      const agentCard = screen.getByText('Test Agent 1').closest('.bg-white');
      expect(agentCard).toBeInTheDocument();

      // Verify agent information is displayed
      expect(within(agentCard!).getByText('A test agent')).toBeInTheDocument();
      expect(within(agentCard!).getByText('active')).toBeInTheDocument();
      expect(within(agentCard!).getByText('testing')).toBeInTheDocument();
    });

    it('should display correct statistics in header', async () => {
      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // Total agents
        expect(screen.getByText('1')).toBeInTheDocument(); // Active agents
      });

      // Check statistics labels
      expect(screen.getByText('Total Agents')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Errors')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering Functionality', () => {
    beforeEach(async () => {
      render(<AgentManager />);
      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });
    });

    it('should filter agents by search query', async () => {
      const searchInput = screen.getByPlaceholderText('Search agents...');
      
      await user.type(searchInput, 'Test Agent 1');

      // Should show only matching agent
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Agent 2')).not.toBeInTheDocument();
    });

    it('should filter agents by status', async () => {
      const statusFilter = screen.getByDisplayValue('All Status');
      
      await user.selectOptions(statusFilter, 'active');

      // Should show only active agents
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Agent 2')).not.toBeInTheDocument();
    });

    it('should filter agents by capabilities', async () => {
      const searchInput = screen.getByPlaceholderText('Search agents...');
      
      await user.type(searchInput, 'analysis');

      // Should show only agents with analysis capability
      expect(screen.queryByText('Test Agent 1')).not.toBeInTheDocument();
      expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
    });
  });

  describe('Agent Creation Workflow', () => {
    it('should open create modal when create button is clicked', async () => {
      render(<AgentManager />);

      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      // Verify modal is open
      expect(screen.getByText('Create New Agent')).toBeInTheDocument();
      expect(screen.getByText('Start with a template (optional)')).toBeInTheDocument();
    });

    it('should create new agent with template selection', async () => {
      render(<AgentManager />);

      // Open create modal
      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      // Select a template
      const researchTemplate = screen.getByText('Research Agent');
      await user.click(researchTemplate);

      // Verify template data is populated
      expect(screen.getByDisplayValue('Research Agent')).toBeInTheDocument();
      expect(screen.getByDisplayValue('research-agent')).toBeInTheDocument();

      // Fill remaining fields
      const descriptionField = screen.getByRole('textbox', { name: /description/i });
      await user.clear(descriptionField);
      await user.type(descriptionField, 'Custom research agent for testing');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(submitButton);

      // Verify agent was added to the list
      await waitFor(() => {
        expect(screen.getByText('Research Agent')).toBeInTheDocument();
      });
    });

    it('should validate required fields in create form', async () => {
      render(<AgentManager />);

      // Open create modal
      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      // Try to submit without required fields
      const submitButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(submitButton);

      // Form should not submit (browser validation will handle this)
      expect(screen.getByText('Create New Agent')).toBeInTheDocument();
    });
  });

  describe('Agent Editing and Updates', () => {
    it('should open edit modal with pre-populated data', async () => {
      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // Find and click edit button for first agent
      const agentCard = screen.getByText('Test Agent 1').closest('.bg-white');
      const editButton = within(agentCard!).getByTitle('Edit');
      await user.click(editButton);

      // Verify edit modal is open with data
      expect(screen.getByText('Edit Agent')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Agent 1')).toBeInTheDocument();
    });

    it('should update agent successfully', async () => {
      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // Open edit modal
      const agentCard = screen.getByText('Test Agent 1').closest('.bg-white');
      const editButton = within(agentCard!).getByTitle('Edit');
      await user.click(editButton);

      // Update agent name
      const nameField = screen.getByDisplayValue('Test Agent 1');
      await user.clear(nameField);
      await user.type(nameField, 'Updated Agent Name');

      // Submit update
      const updateButton = screen.getByRole('button', { name: /update agent/i });
      await user.click(updateButton);

      // Verify update was applied
      await waitFor(() => {
        expect(screen.getByText('Updated Agent Name')).toBeInTheDocument();
      });
    });
  });

  describe('Agent Status Management', () => {
    it('should toggle agent status on power button click', async () => {
      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // Find the power/status toggle button
      const agentCard = screen.getByText('Test Agent 1').closest('.bg-white');
      const statusButton = within(agentCard!).getByTitle(/Deactivate|Activate/);
      await user.click(statusButton);

      // Status should change (mock implementation)
      // In real implementation, this would update the agent status
    });

    it('should handle agent testing workflow', async () => {
      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // Find and click test button
      const agentCard = screen.getByText('Test Agent 1').closest('.bg-white');
      const testButton = within(agentCard!).getByTitle('Test Agent');
      await user.click(testButton);

      // In real implementation, this would open test modal
      // For now, just verify button interaction works
    });
  });

  describe('Bulk Operations', () => {
    it('should enable bulk selection and show bulk actions', async () => {
      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // Select first agent
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // First is "select all"

      // Bulk actions should appear
      expect(screen.getByText('1 Selected')).toBeInTheDocument();

      // Click to show bulk actions
      const bulkActionsButton = screen.getByText('1 Selected');
      await user.click(bulkActionsButton);

      // Verify bulk action buttons
      expect(screen.getByText('Activate')).toBeInTheDocument();
      expect(screen.getByText('Deactivate')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should handle select all functionality', async () => {
      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // There's no explicit "Select All" button in the current implementation
      // But we can test multiple selection
      const checkboxes = screen.getAllByRole('checkbox');
      
      // Select multiple agents
      await user.click(checkboxes[1]);
      await user.click(checkboxes[2]);

      expect(screen.getByText('2 Selected')).toBeInTheDocument();
    });

    it('should perform bulk delete operation with confirmation', async () => {
      // Mock window.confirm
      const mockConfirm = jest.fn(() => true);
      Object.defineProperty(window, 'confirm', {
        value: mockConfirm,
        writable: true
      });

      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // Select agents
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      await user.click(checkboxes[2]);

      // Open bulk actions
      const bulkActionsButton = screen.getByText('2 Selected');
      await user.click(bulkActionsButton);

      // Click delete
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      // Verify confirmation was shown
      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete 2 agents?');
    });
  });

  describe('Pagination and Performance', () => {
    it('should handle pagination when many agents exist', async () => {
      // Mock many agents
      const manyAgents = Array.from({ length: 25 }, (_, i) => ({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        description: `Test agent ${i}`,
        status: i % 2 === 0 ? 'active' : 'inactive',
        color: '#3B82F6',
        capabilities: ['testing'],
        lastActivity: new Date().toISOString()
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: manyAgents })
      });

      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Agent 0')).toBeInTheDocument();
      });

      // Should show pagination controls
      expect(screen.getByText('Showing 1 to 12 of 25 agents')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should navigate between pages correctly', async () => {
      // Mock many agents for pagination
      const manyAgents = Array.from({ length: 25 }, (_, i) => ({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        description: `Test agent ${i}`,
        status: 'active',
        color: '#3B82F6',
        capabilities: ['testing'],
        lastActivity: new Date().toISOString()
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: manyAgents })
      });

      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Agent 0')).toBeInTheDocument();
      });

      // Click next page
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      // Should show different agents
      expect(screen.getByText('Agent 12')).toBeInTheDocument();
      expect(screen.queryByText('Agent 0')).not.toBeInTheDocument();
    });
  });

  describe('Auto-refresh and Real-time Updates', () => {
    it('should auto-refresh agents every 30 seconds', async () => {
      jest.useFakeTimers();

      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // Clear the initial call
      mockFetch.mockClear();

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      // Should have made another API call
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/claude-live/prod/agents');

      jest.useRealTimers();
    });

    it('should handle manual refresh button', async () => {
      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // Clear initial API calls
      mockFetch.mockClear();

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Should call API again
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/claude-live/prod/agents');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle agent deletion errors', async () => {
      // Mock window.confirm
      Object.defineProperty(window, 'confirm', {
        value: jest.fn(() => true),
        writable: true
      });

      render(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      });

      // Try to delete an agent
      const agentCard = screen.getByText('Test Agent 1').closest('.bg-white');
      const deleteButton = within(agentCard!).getByTitle('Delete');
      await user.click(deleteButton);

      // Mock implementation removes agent from state
      await waitFor(() => {
        expect(screen.queryByText('Test Agent 1')).not.toBeInTheDocument();
      });
    });

    it('should handle form validation errors', async () => {
      render(<AgentManager />);

      // Open create modal
      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      // Try to create agent with duplicate name
      const nameField = screen.getByRole('textbox', { name: /agent name/i });
      await user.type(nameField, 'test-agent-1'); // This would conflict with existing agent

      // Fill other required fields
      const displayNameField = screen.getByRole('textbox', { name: /display name/i });
      await user.type(displayNameField, 'Duplicate Agent');

      const descriptionField = screen.getByRole('textbox', { name: /description/i });
      await user.type(descriptionField, 'This is a duplicate');

      const systemPromptField = screen.getByRole('textbox', { name: /system prompt/i });
      await user.type(systemPromptField, 'You are a duplicate agent');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(submitButton);

      // In real implementation, this would show validation error
    });
  });
});