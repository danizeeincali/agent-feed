import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RealDynamicPagesTab from '../../components/RealDynamicPagesTab';

import { vi } from 'vitest';

// Mock React Router hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console.error to suppress error logging in tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('RealDynamicPagesTab', () => {
  const defaultProps = {
    agentId: 'test-agent-123',
  };

  const mockPagesResponse = {
    success: true,
    data: {
      pages: [
        {
          id: 'page-1',
          agent_id: 'test-agent-123',
          title: 'Test Page 1',
          page_type: 'dashboard',
          content_type: 'json',
          content_value: '{}',
          content_metadata: {},
          status: 'published',
          tags: ['tag1', 'tag2'],
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          version: 1,
        },
        {
          id: 'page-2',
          agent_id: 'test-agent-123',
          title: 'Test Page 2',
          page_type: 'widget',
          content_type: 'json',
          content_value: '{}',
          content_metadata: {},
          status: 'draft',
          tags: [],
          created_at: '2023-01-03T00:00:00Z',
          updated_at: '2023-01-04T00:00:00Z',
          version: 2,
        },
      ],
    },
  };

  const mockCreatePageResponse = {
    success: true,
    page: {
      id: 'new-page-id',
      title: 'New Dynamic Page',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  const renderComponent = (props = {}) => {
    return render(
      <MemoryRouter>
        <RealDynamicPagesTab {...defaultProps} {...props} />
      </MemoryRouter>
    );
  };

  describe('Initial Loading State', () => {
    it('should display loading state while fetching pages', () => {
      // Mock pending fetch
      mockFetch.mockReturnValue(new Promise(() => {}));

      renderComponent();

      expect(screen.getByText('Loading dynamic pages...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should fetch pages on component mount', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPagesResponse),
      });

      renderComponent();

      expect(mockFetch).toHaveBeenCalledWith('/api/agents/test-agent-123/pages');
    });
  });

  describe('Successful Data Fetching', () => {
    it('should display pages when fetch succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPagesResponse),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Page 1')).toBeInTheDocument();
        expect(screen.getByText('Test Page 2')).toBeInTheDocument();
      });

      expect(screen.getByText('Dynamic Pages')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create page/i })).toBeInTheDocument();
    });

    it('should display page metadata correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPagesResponse),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('published')).toBeInTheDocument();
        expect(screen.getByText('draft')).toBeInTheDocument();
        expect(screen.getByText('dashboard')).toBeInTheDocument();
        expect(screen.getByText('widget')).toBeInTheDocument();
      });
    });

    it('should display page statistics correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPagesResponse),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('2 pages total')).toBeInTheDocument();
        expect(screen.getByText('1 published')).toBeInTheDocument();
        expect(screen.getByText('1 draft')).toBeInTheDocument();
        expect(screen.getByText('0 archived')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error state when fetch fails with network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Pages')).toBeInTheDocument();
        expect(screen.getByText('Network error while fetching pages')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should display error state when API returns error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Pages')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch pages: 500')).toBeInTheDocument();
      });
    });

    it('should display error state when API returns unsuccessful response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'Custom error message',
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Pages')).toBeInTheDocument();
        expect(screen.getByText('Custom error message')).toBeInTheDocument();
      });
    });

    it('should handle 404 responses gracefully by showing empty state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No Dynamic Pages Yet')).toBeInTheDocument();
        expect(screen.getByText('Create Your First Page')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no pages exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { pages: [] },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No Dynamic Pages Yet')).toBeInTheDocument();
        expect(screen.getByText('Create dynamic pages for this agent to enhance functionality and provide custom interfaces.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create your first page/i })).toBeInTheDocument();
      });
    });

    it('should display empty state when pages data is undefined', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {},
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No Dynamic Pages Yet')).toBeInTheDocument();
      });
    });
  });

  describe('Page Creation', () => {
    it('should create a new page when create button is clicked', async () => {
      // First call for initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPagesResponse),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create page/i })).toBeInTheDocument();
      });

      // Second call for page creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCreatePageResponse),
      });

      // Third call for refresh after creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPagesResponse),
      });

      fireEvent.click(screen.getByRole('button', { name: /create page/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/test-agent-123/pages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'New Dynamic Page',
            description: 'A new dynamic page for this agent',
            type: 'dashboard',
            content: JSON.stringify({
              type: 'dashboard',
              widgets: [],
            }),
          }),
        });
      });
    });

    it('should show loading state during page creation', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create page/i })).toBeInTheDocument();
      });

      // Mock a slow create request
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      fireEvent.click(screen.getByRole('button', { name: /create page/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create page/i })).toBeDisabled();
      });
    });

    it('should navigate to new page after successful creation', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create page/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /create page/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/agents/test-agent-123/pages/new-page-id');
      });
    });

    it('should handle page creation errors gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPagesResponse),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create page/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /create page/i }));

      await waitFor(() => {
        expect(screen.getByText('Error Loading Pages')).toBeInTheDocument();
        expect(screen.getByText('Network error while creating page')).toBeInTheDocument();
      });
    });

    it('should handle API error responses during creation', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPagesResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
        });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create page/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /create page/i }));

      await waitFor(() => {
        expect(screen.getByText('Error Loading Pages')).toBeInTheDocument();
        expect(screen.getByText('Failed to create page: 400')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Interactions', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPagesResponse),
      });
    });

    it('should navigate to page view when View button is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByText('View')[0]).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByText('View')[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/agents/test-agent-123/pages/page-1');
    });

    it('should navigate to page edit when Edit button is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByText('Edit')[0]).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByText('Edit')[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/agents/test-agent-123/pages/page-1/edit');
    });
  });

  describe('Retry Functionality', () => {
    it('should retry fetching pages when Try Again button is clicked', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPagesResponse),
        });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getByText('Test Page 1')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Component Re-rendering on Props Change', () => {
    it('should fetch new data when agentId changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPagesResponse),
      });

      const { rerender } = renderComponent();

      expect(mockFetch).toHaveBeenCalledWith('/api/agents/test-agent-123/pages');

      rerender(
        <MemoryRouter>
          <RealDynamicPagesTab agentId="different-agent-456" />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/different-agent-456/pages');
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA roles and labels', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPagesResponse),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create page/i })).toBeInTheDocument();
      });

      expect(screen.getAllByRole('button')).toHaveLength(5); // Create + 2 View + 2 Edit buttons
    });

    it('should have proper loading indicators', () => {
      mockFetch.mockReturnValue(new Promise(() => {}));

      renderComponent();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed API responses gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No Dynamic Pages Yet')).toBeInTheDocument();
      });
    });

    it('should handle pages with missing optional fields', async () => {
      const incompletePageResponse = {
        success: true,
        data: {
          pages: [
            {
              id: 'incomplete-page',
              agent_id: 'test-agent-123',
              title: 'Incomplete Page',
              page_type: 'basic',
              content_type: 'text',
              content_value: 'Simple content',
              status: 'published',
              tags: [],
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z',
              version: 1,
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(incompletePageResponse),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Incomplete Page')).toBeInTheDocument();
        expect(screen.getByText('basic')).toBeInTheDocument();
      });
    });

    it('should handle extremely long page titles gracefully', async () => {
      const longTitleResponse = {
        success: true,
        data: {
          pages: [
            {
              id: 'long-title-page',
              agent_id: 'test-agent-123',
              title: 'This is an extremely long page title that should be handled gracefully by the component without breaking the layout or causing any display issues',
              page_type: 'dashboard',
              content_type: 'json',
              content_value: '{}',
              status: 'published',
              tags: ['long', 'title', 'test'],
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z',
              version: 1,
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(longTitleResponse),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/This is an extremely long page title/)).toBeInTheDocument();
      });
    });
  });
});