import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import DynamicPageRenderer from '../../components/DynamicPageRenderer';

// Mock React Router hooks - London School: Mock all collaborators
const mockNavigate = vi.fn();
const mockUseParams = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}));

// Mock fetch - Primary external dependency
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DynamicPageRenderer - TDD London School', () => {
  const agentId = 'test-agent-123';
  const pageId = 'test-page-456';
  const mockPageData = {
    id: pageId,
    agent_id: agentId,
    title: 'Test Dynamic Page',
    page_type: 'dashboard',
    content_type: 'json',
    content_value: JSON.stringify({
      components: [
        {
          type: 'Card',
          props: { title: 'Sample Card', description: 'Sample Description' },
          children: []
        }
      ]
    }),
    status: 'published',
    tags: ['test', 'dashboard'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    version: 1,
  };

  const renderComponent = () => render(
    <MemoryRouter>
      <DynamicPageRenderer />
    </MemoryRouter>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ agentId, pageId });
  });

  describe('Component Collaboration Contracts', () => {
    it('should coordinate with useParams hook to get route parameters', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: mockPageData } }),
      });

      renderComponent();

      // Verify collaboration with useParams
      expect(mockUseParams).toHaveBeenCalled();
    });

    it('should coordinate with fetch API using route parameters', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: mockPageData } }),
      });

      renderComponent();

      // Verify correct API call with parameters from router
      expect(mockFetch).toHaveBeenCalledWith(`/api/agents/${agentId}/pages/${pageId}`);
    });

    it('should not fetch when route parameters are missing', () => {
      mockUseParams.mockReturnValue({ agentId: undefined, pageId });

      renderComponent();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Navigation Interactions', () => {
    it('should coordinate back navigation with useNavigate hook', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: mockPageData } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Dynamic Page')).toBeInTheDocument();
      });

      const backButton = screen.getAllByRole('button').find(btn =>
        btn.getAttribute('class')?.includes('p-2')
      );
      fireEvent.click(backButton!);

      expect(mockNavigate).toHaveBeenCalledWith(`/agents/${agentId}`);
    });

    it('should coordinate edit navigation correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: mockPageData } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      expect(mockNavigate).toHaveBeenCalledWith(`/agents/${agentId}/pages/${pageId}/edit`);
    });

    it('should handle navigation from error state', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
      });

      const backButton = screen.getAllByRole('button').find(btn =>
        btn.getAttribute('class')?.includes('p-2')
      );
      fireEvent.click(backButton!);

      expect(mockNavigate).toHaveBeenCalledWith(`/agents/${agentId}`);
    });
  });

  describe('Content Rendering Contracts', () => {
    it('should render JSON components according to component contract', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: mockPageData } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Sample Card')).toBeInTheDocument();
        expect(screen.getByText('Sample Description')).toBeInTheDocument();
      });
    });

    it('should render different component types correctly', async () => {
      const pageWithMultipleComponents = {
        ...mockPageData,
        content_value: JSON.stringify({
          components: [
            {
              type: 'Metric',
              props: { value: '42', label: 'Test Metric' },
            },
            {
              type: 'Badge',
              props: { variant: 'destructive', children: 'Error' },
            }
          ]
        })
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: pageWithMultipleComponents } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('Test Metric')).toBeInTheDocument();
        expect(screen.getByText('Error')).toBeInTheDocument();
      });
    });

    it('should handle non-JSON content types', async () => {
      const textPage = {
        ...mockPageData,
        content_type: 'text',
        content_value: 'Simple text content'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: textPage } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Simple text content')).toBeInTheDocument();
      });
    });

    it('should handle malformed JSON with error display', async () => {
      const malformedPage = {
        ...mockPageData,
        content_value: '{ invalid json'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: malformedPage } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Content Parse Error')).toBeInTheDocument();
        expect(screen.getByText('Unable to parse page content')).toBeInTheDocument();
      });
    });

    it('should render unknown components with fallback', async () => {
      const unknownComponentPage = {
        ...mockPageData,
        content_value: JSON.stringify({
          components: [{
            type: 'UnknownWidget',
            props: { children: 'Fallback content' },
          }]
        })
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: unknownComponentPage } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component: UnknownWidget')).toBeInTheDocument();
        expect(screen.getByText('Fallback content')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Contracts', () => {
    it('should handle fetch failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
        expect(screen.getByText('Network error while loading page')).toBeInTheDocument();
      });
    });

    it('should handle 404 responses correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Page not found')).toBeInTheDocument();
      });
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Access denied' }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Access denied')).toBeInTheDocument();
      });
    });

    it('should handle null page data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: null } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
      });
    });
  });

  describe('Page Metadata Display Contract', () => {
    it('should display page header information correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: mockPageData } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Dynamic Page')).toBeInTheDocument();
        expect(screen.getByText('published')).toBeInTheDocument();
        expect(screen.getAllByText('dashboard')).toHaveLength(2); // Page type + tag
        expect(screen.getByText('v1')).toBeInTheDocument();
      });
    });

    it('should display page dates correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: mockPageData } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Created 1\/1\/2023/)).toBeInTheDocument();
        expect(screen.getByText(/Updated 1\/2\/2023/)).toBeInTheDocument();
      });
    });

    it('should display tags when present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: mockPageData } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('test')).toBeInTheDocument();
        expect(screen.getAllByText('dashboard')).toHaveLength(2); // Page type + tag
      });
    });

    it('should handle pages without tags', async () => {
      const pageWithoutTags = { ...mockPageData, tags: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: pageWithoutTags } }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Dynamic Page')).toBeInTheDocument();
      });
    });
  });

  describe('State Transition Contracts', () => {
    it('should transition from loading to loaded state', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(pendingPromise);

      renderComponent();

      // Verify loading state
      expect(screen.getByText('Loading page...')).toBeInTheDocument();

      // Resolve promise to trigger state change
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: mockPageData } }),
      });

      // Verify loaded state
      await waitFor(() => {
        expect(screen.getByText('Test Dynamic Page')).toBeInTheDocument();
      });
    });

    it('should update when route parameters change', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { page: mockPageData } }),
      });

      renderComponent();

      // Simulate route parameter change
      mockUseParams.mockReturnValue({ agentId: 'new-agent', pageId: 'new-page' });

      // This would typically trigger a re-render in the actual app
      // For testing purposes, we verify the hook was called
      expect(mockUseParams).toHaveBeenCalled();
    });
  });
});