import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import App from '../App';
import RealAgentManager from '../components/RealAgentManager';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    getAgents: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    spawnAgent: vi.fn(),
    terminateAgent: vi.fn(),
  }
}));

const mockAgents = [
  {
    id: 'test-agent-1',
    name: 'TestAgent',
    display_name: 'Test Agent',
    description: 'Test agent for routing',
    status: 'active',
    avatar_color: '#10B981',
    capabilities: ['testing'],
    created_at: '2025-09-09T00:00:00Z',
    updated_at: '2025-09-09T00:00:00Z',
    last_used: '2025-09-09T00:00:00Z',
    usage_count: 1,
    performance_metrics: {
      success_rate: 100,
      average_response_time: 200
    }
  }
];

describe('Agents Route Functionality', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('FAILING TEST: /agents route should load and display agents', async () => {
    // Arrange: Mock successful API response
    const { apiService } = require('../services/api');
    apiService.getAgents.mockResolvedValue({
      success: true,
      data: mockAgents
    });

    // Act: Navigate to /agents route
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/agents']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Assert: Should display agent manager
    expect(screen.getByText('Loading real agent data...')).toBeInTheDocument();

    // Wait for agents to load
    await waitFor(() => {
      expect(screen.getByText('Agent Manager')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Should show agent data
    await waitFor(() => {
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      expect(screen.getByText('Test agent for routing')).toBeInTheDocument();
    });

    // Should call the correct API endpoint
    expect(apiService.getAgents).toHaveBeenCalled();
  });

  it('FAILING TEST: API service should call correct endpoint for agents', async () => {
    // Arrange: Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockAgents
      })
    });

    // Act: Test the RealAgentManager component directly
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RealAgentManager />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Assert: Should show loading state first
    expect(screen.getByText('Loading real agent data...')).toBeInTheDocument();

    // Wait for API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/agents'),
        expect.any(Object)
      );
    });
  });

  it('FAILING TEST: Should handle API errors gracefully', async () => {
    // Arrange: Mock API error
    const { apiService } = require('../services/api');
    apiService.getAgents.mockRejectedValue(new Error('API Error: 404 - Endpoint not found'));

    // Act: Render component
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RealAgentManager />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Assert: Should show error message
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText(/API Error: 404 - Endpoint not found/)).toBeInTheDocument();
    });
  });

  it('FAILING TEST: Should show empty state when no agents exist', async () => {
    // Arrange: Mock empty response
    const { apiService } = require('../services/api');
    apiService.getAgents.mockResolvedValue({
      success: true,
      data: []
    });

    // Act: Render component
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RealAgentManager />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Assert: Should show empty state
    await waitFor(() => {
      expect(screen.getByText('No agents found')).toBeInTheDocument();
      expect(screen.getByText('No agents have been created yet.')).toBeInTheDocument();
      expect(screen.getByText('Create First Agent')).toBeInTheDocument();
    });
  });
});