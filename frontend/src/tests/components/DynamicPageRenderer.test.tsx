import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DynamicPageRenderer from '../../components/DynamicPageRenderer';

import { vi } from 'vitest';

// Mock React Router hooks
const mockNavigate = vi.fn();
const mockUseParams = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console.error to suppress error logging in tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('DynamicPageRenderer', () => {
  const defaultParams = {
    agentId: 'test-agent-123',
    pageId: 'test-page-456',
  };

  const mockPageData = {
    id: 'test-page-456',
    agent_id: 'test-agent-123',
    title: 'Test Dynamic Page',
    page_type: 'dashboard',
    content_type: 'json',
    content_value: JSON.stringify({
      components: [
        {
          type: 'Card',
          props: {
            title: 'Sample Card',
            description: 'This is a sample card component',
            className: 'custom-class',
          },
          children: [
            {
              type: 'Metric',
              props: {
                value: '42',
                label: 'Sample Metric',
                description: 'A sample metric display',
              },
            },
          ],
        },
      ],
    }),
    content_metadata: { version: 1 },
    status: 'published',
    tags: ['dashboard', 'analytics'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    version: 1,
  };

  const mockApiResponse = {
    success: true,
    data: {
      page: mockPageData,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockUseParams.mockReturnValue(defaultParams);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <DynamicPageRenderer />
      </MemoryRouter>
    );
  };

  describe('Initial Loading State', () => {
    it('should display loading state while fetching page data', () => {
      mockFetch.mockReturnValue(new Promise(() => {}));

      renderComponent();

      expect(screen.getByText('Loading page...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should fetch page data on component mount', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      renderComponent();

      expect(mockFetch).toHaveBeenCalledWith('/api/agents/test-agent-123/pages/test-page-456');
    });

    it('should not fetch data when agentId or pageId is missing', () => {
      mockUseParams.mockReturnValue({ agentId: undefined, pageId: 'test-page' });

      renderComponent();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Successful Data Loading', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });
    });

    it('should display page header with title and metadata', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Dynamic Page')).toBeInTheDocument();
        expect(screen.getByText('published')).toBeInTheDocument();
        expect(screen.getByText('dashboard')).toBeInTheDocument();
        expect(screen.getByText('v1')).toBeInTheDocument();
      });
    });

    it('should display page dates correctly', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Created 1\/1\/2023/)).toBeInTheDocument();
        expect(screen.getByText(/Updated 1\/2\/2023/)).toBeInTheDocument();
      });
    });

    it('should display page tags when present', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('dashboard')).toBeInTheDocument();
        expect(screen.getByText('analytics')).toBeInTheDocument();
      });
    });

    it('should render component content correctly', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Sample Card')).toBeInTheDocument();
        expect(screen.getByText('This is a sample card component')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('Sample Metric')).toBeInTheDocument();
      });
    });
  });

  describe('Component Rendering', () => {
    it('should render Card components correctly', async () => {
      const cardContent = {
        type: 'Card',
        props: {
          title: 'Test Card',
          description: 'Test Description',
          className: 'test-class',
        },
        children: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            page: {
              ...mockPageData,
              content_value: JSON.stringify({ components: [cardContent] }),
            },
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Card')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
      });
    });

    it('should render Grid components correctly', async () => {
      const gridContent = {
        type: 'Grid',
        props: { cols: 2, gap: 4 },
        children: [
          {
            type: 'Card',
            props: { title: 'Grid Item 1' },
            children: [],
          },
          {
            type: 'Card',
            props: { title: 'Grid Item 2' },
            children: [],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            page: {
              ...mockPageData,
              content_value: JSON.stringify({ components: [gridContent] }),
            },
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Grid Item 1')).toBeInTheDocument();
        expect(screen.getByText('Grid Item 2')).toBeInTheDocument();
      });
    });

    it('should render Badge components with different variants', async () => {
      const badgeContent = {
        type: 'Badge',
        props: {
          variant: 'destructive',
          children: 'Error Badge',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            page: {
              ...mockPageData,
              content_value: JSON.stringify({ components: [badgeContent] }),
            },
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Badge')).toBeInTheDocument();
      });
    });

    it('should render ProfileHeader components correctly', async () => {
      const profileContent = {
        type: 'ProfileHeader',
        props: {
          name: 'Test Agent',
          description: 'Test Description',
          status: 'Active',
          specialization: 'AI Assistant',
          avatar_color: '#FF6B6B',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            page: {
              ...mockPageData,
              content_value: JSON.stringify({ components: [profileContent] }),
            },
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      });
    });

    it('should render CapabilityList components correctly', async () => {
      const capabilityContent = {
        type: 'CapabilityList',
        props: {
          title: 'Capabilities',
          capabilities: ['Capability 1', 'Capability 2', 'Capability 3'],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            page: {
              ...mockPageData,
              content_value: JSON.stringify({ components: [capabilityContent] }),
            },
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Capabilities')).toBeInTheDocument();
        expect(screen.getByText('Capability 1')).toBeInTheDocument();
        expect(screen.getByText('Capability 2')).toBeInTheDocument();
        expect(screen.getByText('Capability 3')).toBeInTheDocument();
      });
    });

    it('should render unknown components with fallback display', async () => {
      const unknownContent = {
        type: 'UnknownComponent',
        props: {
          children: 'Fallback content',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            page: {
              ...mockPageData,
              content_value: JSON.stringify({ components: [unknownContent] }),
            },
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component: UnknownComponent')).toBeInTheDocument();
        expect(screen.getByText('Fallback content')).toBeInTheDocument();
      });
    });
  });

  describe('Content Type Handling', () => {
    it('should handle non-JSON content types correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            page: {
              ...mockPageData,
              content_type: 'text',
              content_value: 'Plain text content',
            },
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Plain text content')).toBeInTheDocument();
      });
    });

    it('should handle single component JSON structure', async () => {
      const singleComponent = {
        type: 'Card',
        props: { title: 'Single Card' },
        children: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            page: {
              ...mockPageData,
              content_value: JSON.stringify(singleComponent),
            },
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Single Card')).toBeInTheDocument();
      });
    });

    it('should handle complex JSON structures as formatted text', async () => {
      const complexData = {
        data: {
          values: [1, 2, 3],
          metadata: { version: 1 },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            page: {
              ...mockPageData,
              content_value: JSON.stringify(complexData),
            },
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/{\s*"data":/)).toBeInTheDocument();
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            page: {
              ...mockPageData,
              content_value: '{ invalid json',
            },
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Content Parse Error')).toBeInTheDocument();
        expect(screen.getByText('Unable to parse page content')).toBeInTheDocument();
        expect(screen.getByText('Show raw content')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error state when fetch fails with network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
        expect(screen.getByText('Network error while loading page')).toBeInTheDocument();
      });
    });

    it('should display error state when API returns 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
        expect(screen.getByText('Page not found')).toBeInTheDocument();
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
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
        expect(screen.getByText('Custom error message')).toBeInTheDocument();
      });
    });

    it('should display error state when API returns error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
        expect(screen.getByText('Failed to load page: 500')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Interactions', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });
    });

    it('should navigate back to agent page when back button is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /go back/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/agents/test-agent-123');
    });

    it('should navigate to edit page when Edit button is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /edit/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/agents/test-agent-123/pages/test-page-456/edit');
    });

    it('should navigate back from error state when back button is clicked', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /go back/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/agents/test-agent-123');
    });
  });

  describe('Component Re-rendering on Params Change', () => {
    it('should fetch new data when agentId or pageId changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      const { rerender } = renderComponent();

      expect(mockFetch).toHaveBeenCalledWith('/api/agents/test-agent-123/pages/test-page-456');

      mockUseParams.mockReturnValue({
        agentId: 'different-agent',
        pageId: 'different-page',
      });

      rerender(
        <MemoryRouter>
          <DynamicPageRenderer />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/different-agent/pages/different-page');
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });
    });

    it('should have proper ARIA roles and labels', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      expect(screen.getAllByRole('button')).toHaveLength(2); // Back + Edit buttons
    });

    it('should have proper heading structure', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Dynamic Page');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle pages without tags gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            page: {
              ...mockPageData,
              tags: [],
            },
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Dynamic Page')).toBeInTheDocument();
      });

      // Tags section should not be present
      expect(screen.queryByTestId('tags-section')).not.toBeInTheDocument();
    });

    it('should handle empty content gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            page: {
              ...mockPageData,
              content_value: '',
            },
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Dynamic Page')).toBeInTheDocument();
      });
    });

    it('should handle null page data gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            page: null,
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
        expect(screen.getByText('Page not found')).toBeInTheDocument();
      });
    });

    it('should handle different status values correctly', async () => {
      const statusVariants = ['draft', 'published', 'archived'];

      for (const status of statusVariants) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              page: {
                ...mockPageData,
                status,
              },
            },
          }),
        });

        const { unmount } = renderComponent();

        await waitFor(() => {
          expect(screen.getByText(status)).toBeInTheDocument();
        });

        unmount();
        vi.clearAllMocks();
      }
    });
  });

  describe('Raw Content Display', () => {
    it('should show raw content when details are expanded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            page: {
              ...mockPageData,
              content_value: '{ invalid json',
            },
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Show raw content')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Show raw content'));

      expect(screen.getByText('{ invalid json')).toBeInTheDocument();
    });
  });
});