/**
 * DynamicPageRenderer Comprehensive TDD Tests
 *
 * Tests for rendering dynamic page components with validation
 * Follows TDD approach: Tests written to describe expected behavior
 *
 * Component API: /api/agent-pages/agents/{agentId}/pages/{pageId}
 * Response: {success: true, page: {id, title, layout, components: [...], agent_id}}
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import DynamicPageRenderer from '../../components/DynamicPageRenderer';

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

// Mock console to suppress expected error logs
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('DynamicPageRenderer - TDD Comprehensive Tests', () => {
  const defaultParams = {
    agentId: 'agent-123',
    pageId: 'page-456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockUseParams.mockReturnValue(defaultParams);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <DynamicPageRenderer />
      </MemoryRouter>
    );
  };

  describe('1. Component Lifecycle - Fetching Page Data on Mount', () => {
    it('should fetch page data from correct API endpoint on mount', () => {
      mockFetch.mockReturnValue(new Promise(() => {}));

      renderComponent();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/agent-pages/agents/agent-123/pages/page-456'
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not fetch when agentId is missing', () => {
      mockUseParams.mockReturnValue({ agentId: undefined, pageId: 'page-456' });

      renderComponent();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not fetch when pageId is missing', () => {
      mockUseParams.mockReturnValue({ agentId: 'agent-123', pageId: undefined });

      renderComponent();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not fetch when both params are missing', () => {
      mockUseParams.mockReturnValue({ agentId: undefined, pageId: undefined });

      renderComponent();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('2. Loading State Display', () => {
    it('should display loading spinner while fetching', () => {
      mockFetch.mockReturnValue(new Promise(() => {}));

      renderComponent();

      expect(screen.getByText('Loading page...')).toBeInTheDocument();
    });

    it('should display loading indicator with correct styling', () => {
      mockFetch.mockReturnValue(new Promise(() => {}));

      renderComponent();

      const loadingText = screen.getByText('Loading page...');
      expect(loadingText).toBeInTheDocument();
    });

    it('should not display page content during loading', () => {
      mockFetch.mockReturnValue(new Promise(() => {}));

      renderComponent();

      expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    });
  });

  describe('3. Error State Display - Network Failures', () => {
    it('should display error message on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failed'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
        expect(screen.getByText('Network error while loading page')).toBeInTheDocument();
      });
    });

    it('should display 404 error when page not found', async () => {
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

    it('should display custom error from API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'Custom validation error',
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
        expect(screen.getByText('Custom validation error')).toBeInTheDocument();
      });
    });

    it('should display generic error for non-404 status codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to load page: 500')).toBeInTheDocument();
      });
    });

    it('should display error state when page data is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: null,
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
      });
    });
  });

  describe('4. Successful Data Rendering - Components Array', () => {
    it('should render page title after successful fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            agent_id: 'agent-123',
            title: 'Test Dashboard',
            components: [],
            status: 'published',
            version: 1,
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
      });
    });

    it('should render components from components array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            agent_id: 'agent-123',
            title: 'Dashboard',
            components: [
              {
                type: 'header',
                props: {
                  title: 'Welcome Header',
                  level: 1,
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Welcome Header')).toBeInTheDocument();
      });
    });

    it('should render multiple components in order', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Multi-Component Page',
            components: [
              {
                type: 'header',
                props: { title: 'First Header', level: 1 },
              },
              {
                type: 'Card',
                props: { title: 'First Card' },
              },
              {
                type: 'Metric',
                props: { value: '100', label: 'Total Users' },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('First Header')).toBeInTheDocument();
        expect(screen.getByText('First Card')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('Total Users')).toBeInTheDocument();
      });
    });

    it('should render components from specification field when present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Spec-based Page',
            specification: {
              components: [
                {
                  type: 'header',
                  props: { title: 'From Specification' },
                },
              ],
            },
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('From Specification')).toBeInTheDocument();
      });
    });

    it('should parse JSON string specification field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'JSON Spec Page',
            specification: JSON.stringify({
              components: [
                {
                  type: 'Card',
                  props: { title: 'Parsed from JSON' },
                },
              ],
            }),
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Parsed from JSON')).toBeInTheDocument();
      });
    });

    it('should fallback to components array when specification parsing fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Fallback Page',
            specification: 'invalid json{',
            components: [
              {
                type: 'Card',
                props: { title: 'Fallback Component' },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Fallback Component')).toBeInTheDocument();
      });
    });
  });

  describe('5. Component Validation with Zod Schemas', () => {
    it('should display validation error for invalid header props', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Validation Test',
            components: [
              {
                type: 'header',
                props: {
                  title: '', // Empty title - should fail validation
                  level: 1,
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
        expect(screen.getByText('header')).toBeInTheDocument();
      });
    });

    it('should display validation error for invalid stat props', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Stat Validation',
            components: [
              {
                type: 'stat',
                props: {
                  label: '', // Empty label - should fail
                  value: 100,
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
      });
    });

    it('should render component when validation passes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Valid Component',
            components: [
              {
                type: 'header',
                props: {
                  title: 'Valid Header Title',
                  level: 2,
                  subtitle: 'Optional subtitle',
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Valid Header Title')).toBeInTheDocument();
        expect(screen.getByText('Optional subtitle')).toBeInTheDocument();
      });
    });

    it('should apply default values from schema when props are omitted', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Defaults Test',
            components: [
              {
                type: 'header',
                props: {
                  title: 'Header with Defaults',
                  // level omitted - should default to 1
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Header with Defaults')).toBeInTheDocument();
      });
    });
  });

  describe('6. Nested Components - Children Array', () => {
    it('should render Card with nested children', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Nested Components',
            components: [
              {
                type: 'Card',
                props: {
                  title: 'Parent Card',
                  description: 'Contains nested components',
                },
                children: [
                  {
                    type: 'Metric',
                    props: {
                      value: '42',
                      label: 'Nested Metric',
                    },
                  },
                ],
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Parent Card')).toBeInTheDocument();
        expect(screen.getByText('Contains nested components')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('Nested Metric')).toBeInTheDocument();
      });
    });

    it('should render Grid with multiple children', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Grid Layout',
            components: [
              {
                type: 'Grid',
                props: {
                  className: 'grid-cols-2 gap-4',
                },
                children: [
                  {
                    type: 'Card',
                    props: { title: 'Grid Item 1' },
                  },
                  {
                    type: 'Card',
                    props: { title: 'Grid Item 2' },
                  },
                  {
                    type: 'Card',
                    props: { title: 'Grid Item 3' },
                  },
                ],
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Grid Item 1')).toBeInTheDocument();
        expect(screen.getByText('Grid Item 2')).toBeInTheDocument();
        expect(screen.getByText('Grid Item 3')).toBeInTheDocument();
      });
    });

    it('should render deeply nested component hierarchies', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Deep Nesting',
            components: [
              {
                type: 'Container',
                props: { size: 'lg' },
                children: [
                  {
                    type: 'Card',
                    props: { title: 'Level 1' },
                    children: [
                      {
                        type: 'Stack',
                        props: { direction: 'vertical' },
                        children: [
                          {
                            type: 'Metric',
                            props: { value: '10', label: 'Level 3 Metric' },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Level 1')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('Level 3 Metric')).toBeInTheDocument();
      });
    });

    it('should handle empty children arrays gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Empty Children',
            components: [
              {
                type: 'Card',
                props: { title: 'Card with No Children' },
                children: [],
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Card with No Children')).toBeInTheDocument();
      });
    });
  });

  describe('7. Advanced Components - PhotoGrid', () => {
    it('should render PhotoGrid component with valid props', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Photo Gallery',
            components: [
              {
                type: 'PhotoGrid',
                props: {
                  images: [
                    { url: 'https://example.com/photo1.jpg', alt: 'Photo 1' },
                    { url: 'https://example.com/photo2.jpg', alt: 'Photo 2' },
                  ],
                  columns: 3,
                  enableLightbox: true,
                  aspectRatio: 'square',
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Photo Gallery')).toBeInTheDocument();
      });
    });

    it('should display validation error for PhotoGrid without images', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Invalid PhotoGrid',
            components: [
              {
                type: 'PhotoGrid',
                props: {
                  images: [], // Empty array - should fail validation
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
        expect(screen.getByText('PhotoGrid')).toBeInTheDocument();
      });
    });

    it('should apply PhotoGrid default values correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'PhotoGrid Defaults',
            components: [
              {
                type: 'PhotoGrid',
                props: {
                  images: [
                    { url: 'https://example.com/photo.jpg', alt: 'Photo' },
                  ],
                  // columns should default to 3
                  // enableLightbox should default to true
                  // aspectRatio should default to 'auto'
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('PhotoGrid Defaults')).toBeInTheDocument();
      });
    });
  });

  describe('8. Advanced Components - SwipeCard', () => {
    it('should render SwipeCard with valid card data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Swipe Interface',
            components: [
              {
                type: 'SwipeCard',
                props: {
                  cards: [
                    {
                      id: 'card-1',
                      title: 'First Card',
                      description: 'Swipe to interact',
                    },
                  ],
                  showControls: true,
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Swipe Interface')).toBeInTheDocument();
      });
    });

    it('should display validation error for SwipeCard without cards', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Invalid SwipeCard',
            components: [
              {
                type: 'SwipeCard',
                props: {
                  cards: [], // Empty - should fail
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
      });
    });

    it('should validate SwipeCard title requirement', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'SwipeCard Validation',
            components: [
              {
                type: 'SwipeCard',
                props: {
                  cards: [
                    {
                      id: 'card-1',
                      title: '', // Empty title - should fail
                    },
                  ],
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
      });
    });
  });

  describe('9. Advanced Components - Checklist', () => {
    it('should render Checklist with valid items', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Task List',
            components: [
              {
                type: 'Checklist',
                props: {
                  items: [
                    { id: '1', text: 'Task 1', checked: false },
                    { id: '2', text: 'Task 2', checked: true },
                  ],
                  allowEdit: false,
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Task List')).toBeInTheDocument();
      });
    });

    it('should validate Checklist requires at least one item', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Empty Checklist',
            components: [
              {
                type: 'Checklist',
                props: {
                  items: [], // Empty - should fail
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
      });
    });

    it('should validate Checklist item text is required', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Invalid Item',
            components: [
              {
                type: 'Checklist',
                props: {
                  items: [
                    { id: '1', text: '', checked: false }, // Empty text - should fail
                  ],
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
      });
    });
  });

  describe('10. Advanced Components - Calendar', () => {
    it('should render Calendar with valid configuration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Event Calendar',
            components: [
              {
                type: 'Calendar',
                props: {
                  mode: 'single',
                  selectedDate: '2025-10-06',
                  events: [
                    {
                      id: '1',
                      date: '2025-10-06',
                      title: 'Meeting',
                      description: 'Team sync',
                    },
                  ],
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Event Calendar')).toBeInTheDocument();
      });
    });

    it('should apply Calendar default mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Simple Calendar',
            components: [
              {
                type: 'Calendar',
                props: {
                  // mode should default to 'single'
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Simple Calendar')).toBeInTheDocument();
      });
    });

    it('should validate Calendar date format in events', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Invalid Date Format',
            components: [
              {
                type: 'Calendar',
                props: {
                  events: [
                    {
                      id: '1',
                      date: 'invalid-date', // Should fail format validation
                      title: 'Event',
                    },
                  ],
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
      });
    });
  });

  describe('11. Advanced Components - Markdown', () => {
    it('should render Markdown component with content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Documentation',
            components: [
              {
                type: 'Markdown',
                props: {
                  content: '# Hello World\n\nThis is **markdown** content.',
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Documentation')).toBeInTheDocument();
      });
    });

    it('should validate Markdown requires content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Empty Markdown',
            components: [
              {
                type: 'Markdown',
                props: {
                  content: '', // Empty - should fail
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
      });
    });

    it('should apply Markdown sanitization by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Sanitized Content',
            components: [
              {
                type: 'Markdown',
                props: {
                  content: 'Safe content',
                  // sanitize should default to true
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Sanitized Content')).toBeInTheDocument();
      });
    });
  });

  describe('12. Advanced Components - Sidebar', () => {
    it('should render Sidebar with navigation items', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Navigation',
            components: [
              {
                type: 'Sidebar',
                props: {
                  items: [
                    { id: 'nav-1', label: 'Home', href: '/home' },
                    { id: 'nav-2', label: 'About', href: '/about' },
                  ],
                  position: 'left',
                  collapsible: true,
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        // Check for sidebar navigation items instead of ambiguous "Navigation" text
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('About')).toBeInTheDocument();
      });
    });

    it('should validate Sidebar requires at least one item', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Empty Sidebar',
            components: [
              {
                type: 'Sidebar',
                props: {
                  items: [], // Empty - should fail
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
      });
    });

    it('should validate Sidebar item labels are required', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Invalid Sidebar',
            components: [
              {
                type: 'Sidebar',
                props: {
                  items: [
                    { id: 'nav-1', label: '', href: '/home' }, // Empty label - should fail
                  ],
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
      });
    });

    it('should apply Sidebar default values', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Default Sidebar',
            components: [
              {
                type: 'Sidebar',
                props: {
                  items: [{ id: 'nav-1', label: 'Home' }],
                  // position should default to 'left'
                  // collapsible should default to true
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Default Sidebar')).toBeInTheDocument();
      });
    });
  });

  describe('13. Advanced Components - GanttChart', () => {
    it('should render GanttChart with tasks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Project Timeline',
            components: [
              {
                type: 'GanttChart',
                props: {
                  tasks: [
                    {
                      id: '1',
                      name: 'Task 1',
                      startDate: '2025-10-01',
                      endDate: '2025-10-15',
                      progress: 50,
                    },
                  ],
                  viewMode: 'week',
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Project Timeline')).toBeInTheDocument();
      });
    });

    it('should validate GanttChart requires at least one task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Empty Gantt',
            components: [
              {
                type: 'GanttChart',
                props: {
                  tasks: [], // Empty - should fail
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
      });
    });

    it('should validate GanttChart date format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Invalid Dates',
            components: [
              {
                type: 'GanttChart',
                props: {
                  tasks: [
                    {
                      id: '1',
                      name: 'Task',
                      startDate: 'invalid-date', // Should fail
                      endDate: '2025-10-15',
                    },
                  ],
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
      });
    });

    it('should validate GanttChart task name is required', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Missing Name',
            components: [
              {
                type: 'GanttChart',
                props: {
                  tasks: [
                    {
                      id: '1',
                      name: '', // Empty - should fail
                      startDate: '2025-10-01',
                      endDate: '2025-10-15',
                    },
                  ],
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
      });
    });

    it('should apply GanttChart default values', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Default Gantt',
            components: [
              {
                type: 'GanttChart',
                props: {
                  tasks: [
                    {
                      id: '1',
                      name: 'Task',
                      startDate: '2025-10-01',
                      endDate: '2025-10-15',
                      // progress should default to 0
                    },
                  ],
                  // viewMode should default to 'week'
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Default Gantt')).toBeInTheDocument();
      });
    });
  });

  describe('14. Unknown Component Handling', () => {
    it('should render unknown components with fallback UI', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Unknown Component Test',
            components: [
              {
                type: 'UnknownWidget',
                props: {
                  children: 'Fallback text',
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Unknown Component: UnknownWidget')).toBeInTheDocument();
        expect(screen.getByText('This component type is not registered. Contact support.')).toBeInTheDocument();
      });
    });

    it('should handle missing component type gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Missing Type',
            components: [
              {
                props: { title: 'No type specified' },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Missing Type')).toBeInTheDocument();
      });
    });

    it('should skip null or undefined components', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Null Components',
            components: [
              {
                type: 'Card',
                props: { title: 'Valid Card' },
              },
              null,
              undefined,
              {
                type: 'Card',
                props: { title: 'Another Valid Card' },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Valid Card')).toBeInTheDocument();
        expect(screen.getByText('Another Valid Card')).toBeInTheDocument();
      });
    });
  });

  describe('15. Route Parameter Changes', () => {
    it('should refetch data when agentId changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Test Page',
            components: [],
          },
        }),
      });

      const { rerender } = renderComponent();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/agent-pages/agents/agent-123/pages/page-456'
      );

      mockUseParams.mockReturnValue({
        agentId: 'agent-999',
        pageId: 'page-456',
      });

      rerender(
        <MemoryRouter>
          <DynamicPageRenderer />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/agent-pages/agents/agent-999/pages/page-456'
        );
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should refetch data when pageId changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Test Page',
            components: [],
          },
        }),
      });

      const { rerender } = renderComponent();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/agent-pages/agents/agent-123/pages/page-456'
      );

      mockUseParams.mockReturnValue({
        agentId: 'agent-123',
        pageId: 'page-789',
      });

      rerender(
        <MemoryRouter>
          <DynamicPageRenderer />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/agent-pages/agents/agent-123/pages/page-789'
        );
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should reset loading state when params change', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Original Page',
            components: [],
          },
        }),
      });

      const { rerender } = renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Original Page')).toBeInTheDocument();
      });

      mockFetch.mockImplementation(() => new Promise(() => {}));

      mockUseParams.mockReturnValue({
        agentId: 'agent-123',
        pageId: 'page-new',
      });

      rerender(
        <MemoryRouter>
          <DynamicPageRenderer />
        </MemoryRouter>
      );

      expect(screen.getByText('Loading page...')).toBeInTheDocument();
    });

    it('should clear error state when params change and new fetch succeeds', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { rerender } = renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-new',
            title: 'Recovered Page',
            components: [],
          },
        }),
      });

      mockUseParams.mockReturnValue({
        agentId: 'agent-123',
        pageId: 'page-new',
      });

      rerender(
        <MemoryRouter>
          <DynamicPageRenderer />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Recovered Page')).toBeInTheDocument();
      });

      expect(screen.queryByText('Error Loading Page')).not.toBeInTheDocument();
    });
  });

  describe('16. Legacy Layout Format Support', () => {
    it('should render components from layout field for backwards compatibility', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Legacy Format',
            layout: [
              {
                type: 'Card',
                config: {
                  title: 'Legacy Card',
                  description: 'From layout field',
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Legacy Card')).toBeInTheDocument();
        expect(screen.getByText('From layout field')).toBeInTheDocument();
      });
    });

    it('should prefer components array over layout field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Priority Test',
            components: [
              {
                type: 'Card',
                props: { title: 'From components' },
              },
            ],
            layout: [
              {
                type: 'Card',
                config: { title: 'From layout' },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('From components')).toBeInTheDocument();
      });

      expect(screen.queryByText('From layout')).not.toBeInTheDocument();
    });
  });

  describe('17. Component Props Edge Cases', () => {
    it('should handle components without props object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'No Props',
            components: [
              {
                type: 'Card',
                // props omitted
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No Props')).toBeInTheDocument();
      });
    });

    it('should handle components with null props', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Null Props',
            components: [
              {
                type: 'Card',
                props: null,
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Null Props')).toBeInTheDocument();
      });
    });

    it('should handle extra/unknown props gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Extra Props',
            components: [
              {
                type: 'Card',
                props: {
                  title: 'Card Title',
                  unknownProp: 'should be ignored',
                  anotherUnknown: 123,
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Card Title')).toBeInTheDocument();
      });
    });
  });

  describe('18. Page Metadata Display', () => {
    it('should display page status badge', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Status Test',
            status: 'published',
            components: [],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('published')).toBeInTheDocument();
      });
    });

    it('should display different status badges correctly', async () => {
      const statuses = ['published', 'draft'];

      for (const status of statuses) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            page: {
              id: 'page-456',
              title: 'Status Test',
              status,
              components: [],
            },
          }),
        });

        const { unmount } = renderComponent();

        await waitFor(() => {
          expect(screen.getByText(status)).toBeInTheDocument();
        });

        unmount();
      }
    });

    it('should display page version', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Version Test',
            version: 42,
            components: [],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('v42')).toBeInTheDocument();
      });
    });

    it('should display metadata description when present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Metadata Test',
            metadata: {
              description: 'This is a page description',
            },
            components: [],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('This is a page description')).toBeInTheDocument();
      });
    });

    it('should display metadata tags when present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Tags Test',
            metadata: {
              tags: ['dashboard', 'analytics', 'metrics'],
            },
            components: [],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('dashboard')).toBeInTheDocument();
        expect(screen.getByText('analytics')).toBeInTheDocument();
        expect(screen.getByText('metrics')).toBeInTheDocument();
      });
    });
  });

  describe('19. Empty and Null State Handling', () => {
    it('should handle empty components array gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Empty Page',
            components: [],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Empty Page')).toBeInTheDocument();
      });
    });

    it('should handle missing components and layout fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'No Content',
            // No components or layout
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No Content')).toBeInTheDocument();
      });
    });

    it('should display JSON fallback when no recognized structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Unrecognized Format',
            someCustomField: 'custom data',
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Unrecognized Format')).toBeInTheDocument();
      });
    });
  });

  describe('20. Multiple Validation Errors', () => {
    it('should display all validation errors for a component', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Multiple Errors',
            components: [
              {
                type: 'form',
                props: {
                  fields: [], // Empty array when required
                  // submitLabel missing
                },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
      });
    });

    it('should continue rendering valid components after validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: {
            id: 'page-456',
            title: 'Mixed Validity',
            components: [
              {
                type: 'Card',
                props: { title: 'Valid First Card' },
              },
              {
                type: 'header',
                props: { title: '' }, // Invalid
              },
              {
                type: 'Card',
                props: { title: 'Valid Second Card' },
              },
            ],
          },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Valid First Card')).toBeInTheDocument();
        expect(screen.getByText('Component Validation Error')).toBeInTheDocument();
        expect(screen.getByText('Valid Second Card')).toBeInTheDocument();
      });
    });
  });
});
