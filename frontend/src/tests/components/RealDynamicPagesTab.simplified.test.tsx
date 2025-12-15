import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import RealDynamicPagesTab from '../../components/RealDynamicPagesTab';

// Mock React Router hooks - London School: Mock all collaborators
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

// Mock fetch - Primary external dependency
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RealDynamicPagesTab - TDD London School', () => {
  const agentId = 'test-agent-123';
  const mockPages = [
    {
      id: 'page-1',
      agent_id: agentId,
      title: 'Test Page 1',
      page_type: 'dashboard',
      content_type: 'json',
      content_value: '{}',
      status: 'published',
      tags: ['test'],
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      version: 1,
    }
  ];

  const renderComponent = () => render(
    <MemoryRouter>
      <RealDynamicPagesTab agentId={agentId} />
    </MemoryRouter>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Interactions - Behavior Verification', () => {
    it('should coordinate with fetch API to load pages on mount', async () => {
      // Mock the fetch collaborator
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { pages: mockPages } }),
      });

      renderComponent();

      // Verify interaction with fetch collaborator
      expect(mockFetch).toHaveBeenCalledWith(`/api/agents/${agentId}/pages`);

      await waitFor(() => {
        expect(screen.getByText('Test Page 1')).toBeInTheDocument();
      });
    });

    it('should coordinate create page workflow with multiple collaborators', async () => {
      // Setup initial pages fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { pages: [] } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No Dynamic Pages Yet')).toBeInTheDocument();
      });

      // Setup create page interaction
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: { id: 'new-page', title: 'New Dynamic Page' }
        }),
      });

      // Setup refresh after creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { pages: mockPages } }),
      });

      const createButton = screen.getByRole('button', { name: /create your first page/i });
      fireEvent.click(createButton);

      // Verify correct interaction sequence
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(`/api/agents/${agentId}/pages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'New Dynamic Page',
            description: 'A new dynamic page for this agent',
            type: 'dashboard',
            content: JSON.stringify({ type: 'dashboard', widgets: [] }),
          }),
        });
      });

      // Verify navigation collaboration
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(`/agents/${agentId}/pages/new-page`);
      });
    });

    it('should coordinate navigation interactions for page actions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { pages: mockPages } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Page 1')).toBeInTheDocument();
      });

      // Test View button navigation
      const viewButton = screen.getByRole('button', { name: /view/i });
      fireEvent.click(viewButton);
      expect(mockNavigate).toHaveBeenCalledWith(`/agents/${agentId}/pages/page-1`);

      // Test Edit button navigation
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      expect(mockNavigate).toHaveBeenCalledWith(`/agents/${agentId}/pages/page-1/edit`);
    });
  });

  describe('Error Handling Contracts', () => {
    it('should handle fetch collaboration failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Pages')).toBeInTheDocument();
        expect(screen.getByText('Network error while fetching pages')).toBeInTheDocument();
      });
    });

    it('should handle API error responses through fetch contract', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch pages: 500')).toBeInTheDocument();
      });
    });

    it('should handle unsuccessful API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Permission denied' }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Permission denied')).toBeInTheDocument();
      });
    });
  });

  describe('State Transitions and Contracts', () => {
    it('should transition from loading to success state through fetch contract', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(pendingPromise);

      renderComponent();

      // Verify loading state
      expect(screen.getByText('Loading dynamic pages...')).toBeInTheDocument();

      // Resolve the promise to trigger state transition
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { pages: mockPages } }),
      });

      // Verify success state
      await waitFor(() => {
        expect(screen.getByText('Test Page 1')).toBeInTheDocument();
      });
    });

    it('should transition to empty state when no pages returned', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { pages: [] } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No Dynamic Pages Yet')).toBeInTheDocument();
      });
    });

    it('should handle 404 responses as empty state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No Dynamic Pages Yet')).toBeInTheDocument();
      });
    });
  });

  describe('Component Contract Verification', () => {
    it('should render page metadata according to data contract', async () => {
      const pageWithMetadata = {
        ...mockPages[0],
        status: 'draft',
        page_type: 'widget',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { pages: [pageWithMetadata] }
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('draft')).toBeInTheDocument();
        expect(screen.getByText('widget')).toBeInTheDocument();
      });
    });

    it('should display page statistics according to status contract', async () => {
      const pagesWithVariousStatuses = [
        { ...mockPages[0], status: 'published' },
        { ...mockPages[0], id: 'page-2', status: 'draft' },
        { ...mockPages[0], id: 'page-3', status: 'archived' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { pages: pagesWithVariousStatuses }
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('3 pages total')).toBeInTheDocument();
        expect(screen.getByText('1 published')).toBeInTheDocument();
        expect(screen.getByText('1 draft')).toBeInTheDocument();
        expect(screen.getByText('1 archived')).toBeInTheDocument();
      });
    });
  });

  describe('Retry Behavior Contracts', () => {
    it('should retry fetch operation when try again is clicked', async () => {
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Pages')).toBeInTheDocument();
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { pages: mockPages } }),
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Test Page 1')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});