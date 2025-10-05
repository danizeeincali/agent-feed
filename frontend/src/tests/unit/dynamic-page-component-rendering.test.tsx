/**
 * TDD Test Suite: DynamicPageRenderer Component Rendering Fix
 *
 * Purpose: Comprehensive test coverage for handling multiple page formats
 *
 * Test Coverage Areas:
 * 1. Detection logic for components array vs layout array
 * 2. Rendering components from `components` array (new format)
 * 3. Rendering components from `layout` array (backward compatibility)
 * 4. Handling nested children in component trees
 * 5. Handling missing/invalid data structures
 * 6. All component types with proper prop handling
 *
 * Expected Behavior:
 * - THESE TESTS WILL FAIL until the component rendering fix is implemented
 * - Tests follow TDD London School approach
 * - Focus on behavior rather than implementation details
 *
 * Page Format Variations:
 * Format 1 (Old): { layout: [...components] }
 * Format 2 (New): { layout: "string", components: [...] } with specification field
 * Format 3 (Mixed): Both layout and components present
 * Format 4 (Nested): Deep component tree with Container → Stack → Grid → Card
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DynamicPageRenderer from '../../components/DynamicPageRenderer';

// Mock router hooks
const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DynamicPageRenderer - Component Rendering Fix (TDD)', () => {
  const baseParams = {
    agentId: 'personal-todos-agent',
    pageId: 'test-page',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue(baseParams);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <DynamicPageRenderer />
      </MemoryRouter>
    );
  };

  // ==========================================
  // 1. FORMAT DETECTION TESTS
  // ==========================================

  describe('Format Detection Logic', () => {
    it('should detect old format with layout as array', async () => {
      const oldFormatPage = {
        id: 'test-page',
        agentId: 'personal-todos-agent',
        title: 'Old Format Page',
        version: '1.0.0',
        layout: [
          {
            type: 'header',
            config: { title: 'Old Format Header', level: 1 }
          }
        ],
        status: 'published',
        createdAt: '2025-10-04T00:00:00Z',
        updatedAt: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: oldFormatPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Old Format Header')).toBeInTheDocument();
      });
    });

    it('should detect new format with specification field containing components array', async () => {
      const newFormatPage = {
        id: 'test-page',
        agent_id: 'personal-todos-agent',
        title: 'New Format Page',
        specification: JSON.stringify({
          id: 'test-page',
          title: 'New Format Page',
          layout: 'mobile-first',
          responsive: true,
          components: [
            {
              type: 'Card',
              props: { title: 'New Format Card' },
              children: []
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: newFormatPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('New Format Card')).toBeInTheDocument();
      });
    });

    it('should prefer components array over layout array when both exist', async () => {
      const mixedFormatPage = {
        id: 'test-page',
        agentId: 'personal-todos-agent',
        title: 'Mixed Format Page',
        specification: JSON.stringify({
          components: [
            { type: 'Card', props: { title: 'Components Array Card' }, children: [] }
          ]
        }),
        layout: [
          { type: 'header', config: { title: 'Layout Array Header' } }
        ],
        version: '1.0.0',
        status: 'published',
        createdAt: '2025-10-04T00:00:00Z',
        updatedAt: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: mixedFormatPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Components Array Card')).toBeInTheDocument();
        expect(screen.queryByText('Layout Array Header')).not.toBeInTheDocument();
      });
    });

    it('should handle specification field with string layout value', async () => {
      const pageWithStringLayout = {
        id: 'test-page',
        agent_id: 'personal-todos-agent',
        title: 'String Layout Page',
        specification: JSON.stringify({
          layout: 'mobile-first',
          components: [
            { type: 'Card', props: { title: 'Mobile First Card' }, children: [] }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: pageWithStringLayout
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Mobile First Card')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // 2. NESTED COMPONENT TREE TESTS
  // ==========================================

  describe('Nested Component Tree Rendering', () => {
    it('should render Container → Stack → Grid → Card hierarchy', async () => {
      const nestedPage = {
        id: 'comprehensive-dashboard',
        agent_id: 'personal-todos-agent',
        title: 'Comprehensive Dashboard',
        specification: JSON.stringify({
          components: [
            {
              type: 'Container',
              props: { size: 'lg', className: 'p-4' },
              children: [
                {
                  type: 'Stack',
                  props: { className: 'gap-6' },
                  children: [
                    {
                      type: 'Grid',
                      props: { className: 'grid-cols-2 gap-4' },
                      children: [
                        {
                          type: 'Card',
                          props: { title: 'Nested Card 1' },
                          children: []
                        },
                        {
                          type: 'Card',
                          props: { title: 'Nested Card 2' },
                          children: []
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: nestedPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Nested Card 1')).toBeInTheDocument();
        expect(screen.getByText('Nested Card 2')).toBeInTheDocument();
      });
    });

    it('should render deeply nested children (5 levels)', async () => {
      const deeplyNestedPage = {
        id: 'deep-nested',
        agent_id: 'personal-todos-agent',
        title: 'Deep Nesting Test',
        specification: JSON.stringify({
          components: [
            {
              type: 'Container',
              props: {},
              children: [
                {
                  type: 'Stack',
                  props: {},
                  children: [
                    {
                      type: 'Grid',
                      props: {},
                      children: [
                        {
                          type: 'Card',
                          props: { title: 'Level 4 Card' },
                          children: [
                            {
                              type: 'Metric',
                              props: { label: 'Deep Metric', value: '100' },
                              children: []
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: deeplyNestedPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Level 4 Card')).toBeInTheDocument();
        expect(screen.getByText('Deep Metric')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
      });
    });

    it('should render multiple children at same level', async () => {
      const multipleChildrenPage = {
        id: 'multiple-children',
        agent_id: 'personal-todos-agent',
        title: 'Multiple Children Test',
        specification: JSON.stringify({
          components: [
            {
              type: 'Stack',
              props: { className: 'gap-4' },
              children: [
                { type: 'Card', props: { title: 'Card 1' }, children: [] },
                { type: 'Card', props: { title: 'Card 2' }, children: [] },
                { type: 'Card', props: { title: 'Card 3' }, children: [] }
              ]
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: multipleChildrenPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Card 1')).toBeInTheDocument();
        expect(screen.getByText('Card 2')).toBeInTheDocument();
        expect(screen.getByText('Card 3')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // 3. COMPONENT TYPE TESTS
  // ==========================================

  describe('Component Type Rendering', () => {
    it('should render Container component with proper props', async () => {
      const containerPage = {
        id: 'container-test',
        agent_id: 'personal-todos-agent',
        title: 'Container Test',
        specification: JSON.stringify({
          components: [
            {
              type: 'Container',
              props: { size: 'lg', className: 'custom-container' },
              children: [
                { type: 'Card', props: { title: 'Inside Container' }, children: [] }
              ]
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: containerPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Inside Container')).toBeInTheDocument();
      });
    });

    it('should render Stack component with gap spacing', async () => {
      const stackPage = {
        id: 'stack-test',
        agent_id: 'personal-todos-agent',
        title: 'Stack Test',
        specification: JSON.stringify({
          components: [
            {
              type: 'Stack',
              props: { className: 'gap-6' },
              children: [
                { type: 'Card', props: { title: 'Stack Item 1' }, children: [] },
                { type: 'Card', props: { title: 'Stack Item 2' }, children: [] }
              ]
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: stackPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Stack Item 1')).toBeInTheDocument();
        expect(screen.getByText('Stack Item 2')).toBeInTheDocument();
      });
    });

    it('should render Grid component with columns and gap', async () => {
      const gridPage = {
        id: 'grid-test',
        agent_id: 'personal-todos-agent',
        title: 'Grid Test',
        specification: JSON.stringify({
          components: [
            {
              type: 'Grid',
              props: { className: 'grid-cols-3 gap-4' },
              children: [
                { type: 'Card', props: { title: 'Grid 1' }, children: [] },
                { type: 'Card', props: { title: 'Grid 2' }, children: [] },
                { type: 'Card', props: { title: 'Grid 3' }, children: [] }
              ]
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: gridPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Grid 1')).toBeInTheDocument();
        expect(screen.getByText('Grid 2')).toBeInTheDocument();
        expect(screen.getByText('Grid 3')).toBeInTheDocument();
      });
    });

    it('should render Card component with title and description', async () => {
      const cardPage = {
        id: 'card-test',
        agent_id: 'personal-todos-agent',
        title: 'Card Test',
        specification: JSON.stringify({
          components: [
            {
              type: 'Card',
              props: {
                title: 'Test Card Title',
                description: 'Test Card Description',
                className: 'custom-card'
              },
              children: []
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: cardPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Card Title')).toBeInTheDocument();
        expect(screen.getByText('Test Card Description')).toBeInTheDocument();
      });
    });

    it('should render Badge component with variants', async () => {
      const badgePage = {
        id: 'badge-test',
        agent_id: 'personal-todos-agent',
        title: 'Badge Test',
        specification: JSON.stringify({
          components: [
            { type: 'Badge', props: { variant: 'default', children: 'Default Badge' }, children: [] },
            { type: 'Badge', props: { variant: 'destructive', children: 'Error Badge' }, children: [] },
            { type: 'Badge', props: { variant: 'secondary', children: 'Secondary Badge' }, children: [] },
            { type: 'Badge', props: { variant: 'outline', children: 'Outline Badge' }, children: [] }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: badgePage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Default Badge')).toBeInTheDocument();
        expect(screen.getByText('Error Badge')).toBeInTheDocument();
        expect(screen.getByText('Secondary Badge')).toBeInTheDocument();
        expect(screen.getByText('Outline Badge')).toBeInTheDocument();
      });
    });

    it('should render Button component with variants', async () => {
      const buttonPage = {
        id: 'button-test',
        agent_id: 'personal-todos-agent',
        title: 'Button Test',
        specification: JSON.stringify({
          components: [
            { type: 'Button', props: { variant: 'default', children: 'Default Button' }, children: [] },
            { type: 'Button', props: { variant: 'destructive', children: 'Delete Button' }, children: [] },
            { type: 'Button', props: { variant: 'outline', children: 'Outline Button' }, children: [] }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: buttonPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Default Button')).toBeInTheDocument();
        expect(screen.getByText('Delete Button')).toBeInTheDocument();
        expect(screen.getByText('Outline Button')).toBeInTheDocument();
      });
    });

    it('should render Metric component with label and value', async () => {
      const metricPage = {
        id: 'metric-test',
        agent_id: 'personal-todos-agent',
        title: 'Metric Test',
        specification: JSON.stringify({
          components: [
            {
              type: 'Metric',
              props: {
                label: 'Total Tasks',
                value: '42',
                description: 'Active items'
              },
              children: []
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: metricPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Total Tasks')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('Active items')).toBeInTheDocument();
      });
    });

    it('should render Progress component with value', async () => {
      const progressPage = {
        id: 'progress-test',
        agent_id: 'personal-todos-agent',
        title: 'Progress Test',
        specification: JSON.stringify({
          components: [
            {
              type: 'Progress',
              props: {
                value: 75,
                max: 100,
                variant: 'success',
                className: 'h-2'
              },
              children: []
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: progressPage
        })
      });

      renderComponent();

      await waitFor(() => {
        const progressElement = screen.getByRole('progressbar');
        expect(progressElement).toBeInTheDocument();
        expect(progressElement).toHaveAttribute('aria-valuenow', '75');
        expect(progressElement).toHaveAttribute('aria-valuemax', '100');
      });
    });

    it('should render DataCard component with all props', async () => {
      const dataCardPage = {
        id: 'datacard-test',
        agent_id: 'personal-todos-agent',
        title: 'DataCard Test',
        specification: JSON.stringify({
          components: [
            {
              type: 'DataCard',
              props: {
                title: 'Total Tasks',
                value: '{{stats.total_tasks}}',
                subtitle: 'Active items',
                trend: 'up',
                className: 'w-full'
              },
              children: []
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: dataCardPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Total Tasks')).toBeInTheDocument();
        expect(screen.getByText('Active items')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // 4. COMPREHENSIVE DASHBOARD TEST
  // ==========================================

  describe('Real-World Comprehensive Dashboard', () => {
    it('should render the complete comprehensive dashboard with all nested components', async () => {
      // This is the actual comprehensive dashboard data structure
      const comprehensiveDashboard = {
        id: 'comprehensive-dashboard',
        agent_id: 'personal-todos-agent',
        title: 'Personal Todos - Comprehensive Task Management Dashboard',
        specification: JSON.stringify({
          id: 'comprehensive-dashboard',
          title: 'Personal Todos Dashboard',
          layout: 'mobile-first',
          responsive: true,
          components: [
            {
              type: 'Container',
              props: { size: 'lg', className: 'p-4 md:p-6' },
              children: [
                {
                  type: 'Stack',
                  props: { className: 'gap-6' },
                  children: [
                    {
                      type: 'Grid',
                      props: { className: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4' },
                      children: [
                        {
                          type: 'DataCard',
                          props: {
                            title: 'Total Tasks',
                            value: '{{stats.total_tasks}}',
                            subtitle: 'Active items',
                            trend: 'up',
                            className: 'w-full'
                          }
                        },
                        {
                          type: 'DataCard',
                          props: {
                            title: 'Completed',
                            value: '{{stats.completed_tasks}}',
                            subtitle: 'This week',
                            trend: 'up',
                            className: 'w-full'
                          }
                        }
                      ]
                    },
                    {
                      type: 'Card',
                      props: {
                        title: 'Priority Distribution',
                        description: 'Fibonacci IMPACT Priorities (P0-P7)',
                        className: 'w-full'
                      },
                      children: [
                        {
                          type: 'Stack',
                          props: { className: 'gap-3' },
                          children: [
                            {
                              type: 'Stack',
                              props: { className: 'flex-row items-center justify-between' },
                              children: [
                                {
                                  type: 'Badge',
                                  props: { variant: 'destructive', children: 'P0 Critical' }
                                },
                                {
                                  type: 'Metric',
                                  props: { value: '{{priorities.P0}}', className: 'text-lg' }
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: comprehensiveDashboard
        })
      });

      renderComponent();

      await waitFor(() => {
        // Verify top-level structure
        expect(screen.getByText('Personal Todos - Comprehensive Task Management Dashboard')).toBeInTheDocument();

        // Verify DataCards render
        expect(screen.getByText('Total Tasks')).toBeInTheDocument();
        expect(screen.getByText('Active items')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('This week')).toBeInTheDocument();

        // Verify nested Card with Priority Distribution
        expect(screen.getByText('Priority Distribution')).toBeInTheDocument();
        expect(screen.getByText('Fibonacci IMPACT Priorities (P0-P7)')).toBeInTheDocument();
        expect(screen.getByText('P0 Critical')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // 5. ERROR HANDLING & EDGE CASES
  // ==========================================

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing components array gracefully', async () => {
      const noComponentsPage = {
        id: 'no-components',
        agent_id: 'personal-todos-agent',
        title: 'No Components Page',
        specification: JSON.stringify({
          layout: 'mobile-first'
          // No components field
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: noComponentsPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No Components Page')).toBeInTheDocument();
      });
    });

    it('should handle empty components array', async () => {
      const emptyComponentsPage = {
        id: 'empty-components',
        agent_id: 'personal-todos-agent',
        title: 'Empty Components Page',
        specification: JSON.stringify({
          components: []
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: emptyComponentsPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Empty Components Page')).toBeInTheDocument();
      });
    });

    it('should handle components with no children property', async () => {
      const noChildrenPage = {
        id: 'no-children',
        agent_id: 'personal-todos-agent',
        title: 'No Children Page',
        specification: JSON.stringify({
          components: [
            {
              type: 'Card',
              props: { title: 'Card Without Children' }
              // No children property
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: noChildrenPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Card Without Children')).toBeInTheDocument();
      });
    });

    it('should handle components with empty children array', async () => {
      const emptyChildrenPage = {
        id: 'empty-children',
        agent_id: 'personal-todos-agent',
        title: 'Empty Children Page',
        specification: JSON.stringify({
          components: [
            {
              type: 'Stack',
              props: { className: 'gap-4' },
              children: []
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: emptyChildrenPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Empty Children Page')).toBeInTheDocument();
      });
    });

    it('should handle malformed specification JSON', async () => {
      const malformedPage = {
        id: 'malformed',
        agent_id: 'personal-todos-agent',
        title: 'Malformed Spec Page',
        specification: '{ invalid json',
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: malformedPage
        })
      });

      renderComponent();

      await waitFor(() => {
        // Should fall back to displaying page data
        expect(screen.getByText('Malformed Spec Page')).toBeInTheDocument();
      });
    });

    it('should handle unknown component types gracefully', async () => {
      const unknownTypePage = {
        id: 'unknown-type',
        agent_id: 'personal-todos-agent',
        title: 'Unknown Type Page',
        specification: JSON.stringify({
          components: [
            {
              type: 'UnknownComponent',
              props: { title: 'Unknown Component' },
              children: []
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: unknownTypePage
        })
      });

      renderComponent();

      await waitFor(() => {
        // Should render with fallback display
        expect(screen.getByText(/Component: UnknownComponent/i)).toBeInTheDocument();
      });
    });

    it('should handle null specification field', async () => {
      const nullSpecPage = {
        id: 'null-spec',
        agentId: 'personal-todos-agent',
        title: 'Null Spec Page',
        specification: null,
        layout: [
          {
            type: 'header',
            config: { title: 'Fallback Header' }
          }
        ],
        version: '1.0.0',
        status: 'published',
        createdAt: '2025-10-04T00:00:00Z',
        updatedAt: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: nullSpecPage
        })
      });

      renderComponent();

      await waitFor(() => {
        // Should fall back to layout array
        expect(screen.getByText('Fallback Header')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // 6. BACKWARD COMPATIBILITY TESTS
  // ==========================================

  describe('Backward Compatibility with Old Format', () => {
    it('should still render old format pages with layout array', async () => {
      const oldFormatPage = {
        id: 'old-format',
        agentId: 'personal-todos-agent',
        title: 'Old Format Page',
        layout: [
          {
            type: 'header',
            config: { title: 'Old Header', level: 2 }
          },
          {
            type: 'stat',
            config: { label: 'Old Stat', value: '99' }
          }
        ],
        version: '1.0.0',
        status: 'published',
        createdAt: '2025-10-04T00:00:00Z',
        updatedAt: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: oldFormatPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Old Header')).toBeInTheDocument();
        expect(screen.getByText('Old Stat')).toBeInTheDocument();
        expect(screen.getByText('99')).toBeInTheDocument();
      });
    });

    it('should handle old format with various component types', async () => {
      const oldFormatVariousPage = {
        id: 'old-various',
        agentId: 'personal-todos-agent',
        title: 'Old Format Various',
        layout: [
          {
            type: 'header',
            config: { title: 'Header Component', level: 1 }
          },
          {
            type: 'todoList',
            config: { sortBy: 'priority', showCompleted: true }
          },
          {
            type: 'list',
            config: { items: ['Item 1', 'Item 2'], ordered: false }
          }
        ],
        version: '1.0.0',
        status: 'published',
        createdAt: '2025-10-04T00:00:00Z',
        updatedAt: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: oldFormatVariousPage
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Header Component')).toBeInTheDocument();
        expect(screen.getByText(/Tasks/i)).toBeInTheDocument();
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // 7. COMPONENT RENDERING HELPER TESTS
  // ==========================================

  describe('Component Rendering Helper Functions', () => {
    it('should render Container as a wrapper div with proper classes', async () => {
      const containerTest = {
        id: 'container-wrapper',
        agent_id: 'personal-todos-agent',
        title: 'Container Wrapper Test',
        specification: JSON.stringify({
          components: [
            {
              type: 'Container',
              props: { size: 'lg', className: 'test-container-class' },
              children: [
                { type: 'Card', props: { title: 'Test Card' }, children: [] }
              ]
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: containerTest
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Card')).toBeInTheDocument();
      });
    });

    it('should render Stack as a flex container', async () => {
      const stackTest = {
        id: 'stack-flex',
        agent_id: 'personal-todos-agent',
        title: 'Stack Flex Test',
        specification: JSON.stringify({
          components: [
            {
              type: 'Stack',
              props: { className: 'flex-col gap-4' },
              children: [
                { type: 'Badge', props: { children: 'Badge 1' }, children: [] },
                { type: 'Badge', props: { children: 'Badge 2' }, children: [] }
              ]
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: stackTest
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Badge 1')).toBeInTheDocument();
        expect(screen.getByText('Badge 2')).toBeInTheDocument();
      });
    });

    it('should render Grid with proper grid classes', async () => {
      const gridTest = {
        id: 'grid-classes',
        agent_id: 'personal-todos-agent',
        title: 'Grid Classes Test',
        specification: JSON.stringify({
          components: [
            {
              type: 'Grid',
              props: { className: 'grid-cols-4 gap-6' },
              children: [
                { type: 'Metric', props: { label: 'M1', value: '1' }, children: [] },
                { type: 'Metric', props: { label: 'M2', value: '2' }, children: [] },
                { type: 'Metric', props: { label: 'M3', value: '3' }, children: [] },
                { type: 'Metric', props: { label: 'M4', value: '4' }, children: [] }
              ]
            }
          ]
        }),
        version: 1,
        created_at: '2025-10-04T00:00:00Z',
        updated_at: '2025-10-04T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          page: gridTest
        })
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('M1')).toBeInTheDocument();
        expect(screen.getByText('M2')).toBeInTheDocument();
        expect(screen.getByText('M3')).toBeInTheDocument();
        expect(screen.getByText('M4')).toBeInTheDocument();
      });
    });
  });
});
