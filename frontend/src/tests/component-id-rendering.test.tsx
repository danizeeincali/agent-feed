/**
 * TDD London School: Component ID Attribute Rendering Tests
 *
 * Tests for ensuring components render `id` attributes so anchor links work properly
 *
 * RED PHASE: All tests should FAIL initially because components don't render IDs yet
 *
 * London School Approach:
 * - Mock-first: Define collaborator contracts through mocks
 * - Outside-in: Start with user behavior (anchor clicks) and work inward
 * - Behavior verification: Focus on HOW components collaborate
 * - Interaction testing: Verify component conversations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';

// Component to test
import DynamicPageRenderer from '../components/DynamicPageRenderer';

// Mock dependencies (London School: Define collaborators through mocks)
const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams()
  };
});

// Mock fetch API for component data
global.fetch = vi.fn();

/**
 * Helper: Creates mock page data with components
 */
const createMockPageData = (components: any[]) => ({
  id: 'test-page-1',
  agentId: 'agent-1',
  title: 'Test Page',
  version: '1.0',
  status: 'published',
  components,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

/**
 * Helper: Creates mock fetch response
 */
const mockFetchSuccess = (pageData: any) => {
  (global.fetch as any).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      page: pageData
    })
  });
};

/**
 * Test Wrapper with Router
 */
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('TDD London School: Component ID Rendering', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({
      agentId: 'agent-1',
      pageId: 'page-1'
    });
  });

  /**
   * RED PHASE TEST 1: Header components should render with id attribute from props
   *
   * London School Focus:
   * - Mock the component configuration
   * - Verify the rendered HTML contains the id attribute
   * - Test the contract: component with id prop -> DOM element with id attribute
   */
  describe('Header Component ID Rendering', () => {
    test('should render h1 header with id attribute from props', async () => {
      // ARRANGE: Mock component with id
      const mockComponents = [
        {
          type: 'header',
          props: {
            id: 'main-heading',
            level: 1,
            title: 'Main Heading'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      // ACT: Render component
      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Main Heading')).toBeInTheDocument();
      });

      // ASSERT: Verify id attribute exists in DOM
      const heading = screen.getByText('Main Heading');
      expect(heading).toHaveAttribute('id', 'main-heading');
    });

    test('should render h2 header with id attribute from props', async () => {
      const mockComponents = [
        {
          type: 'header',
          props: {
            id: 'section-heading',
            level: 2,
            title: 'Section Heading'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Section Heading')).toBeInTheDocument();
      });

      const heading = screen.getByText('Section Heading');
      expect(heading).toHaveAttribute('id', 'section-heading');
    });

    test('should render h3 header with id attribute from props', async () => {
      const mockComponents = [
        {
          type: 'header',
          props: {
            id: 'subsection-heading',
            level: 3,
            title: 'Subsection Heading'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Subsection Heading')).toBeInTheDocument();
      });

      const heading = screen.getByText('Subsection Heading');
      expect(heading).toHaveAttribute('id', 'subsection-heading');
    });

    test('should render headers at all levels (h1-h6) with id attributes', async () => {
      const mockComponents = [
        { type: 'header', props: { id: 'h1-id', level: 1, title: 'H1 Title' } },
        { type: 'header', props: { id: 'h2-id', level: 2, title: 'H2 Title' } },
        { type: 'header', props: { id: 'h3-id', level: 3, title: 'H3 Title' } },
        { type: 'header', props: { id: 'h4-id', level: 4, title: 'H4 Title' } },
        { type: 'header', props: { id: 'h5-id', level: 5, title: 'H5 Title' } },
        { type: 'header', props: { id: 'h6-id', level: 6, title: 'H6 Title' } }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('H1 Title')).toBeInTheDocument();
      });

      // Verify each header has correct id
      expect(screen.getByText('H1 Title')).toHaveAttribute('id', 'h1-id');
      expect(screen.getByText('H2 Title')).toHaveAttribute('id', 'h2-id');
      expect(screen.getByText('H3 Title')).toHaveAttribute('id', 'h3-id');
      expect(screen.getByText('H4 Title')).toHaveAttribute('id', 'h4-id');
      expect(screen.getByText('H5 Title')).toHaveAttribute('id', 'h5-id');
      expect(screen.getByText('H6 Title')).toHaveAttribute('id', 'h6-id');
    });
  });

  /**
   * RED PHASE TEST 2: Card components should render with id attribute
   *
   * London School Focus:
   * - Verify Card component renders id to DOM
   * - Test the collaboration between Card props and DOM output
   */
  describe('Card Component ID Rendering', () => {
    test('should render Card component with id attribute from props', async () => {
      const mockComponents = [
        {
          type: 'Card',
          props: {
            id: 'overview-card',
            title: 'Overview Card',
            description: 'This is an overview'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Overview Card')).toBeInTheDocument();
      });

      // Find the card container by id
      const card = document.getElementById('overview-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('id', 'overview-card');
    });

    test('should render multiple Card components with unique id attributes', async () => {
      const mockComponents = [
        {
          type: 'Card',
          props: {
            id: 'card-1',
            title: 'First Card'
          }
        },
        {
          type: 'Card',
          props: {
            id: 'card-2',
            title: 'Second Card'
          }
        },
        {
          type: 'Card',
          props: {
            id: 'card-3',
            title: 'Third Card'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('First Card')).toBeInTheDocument();
      });

      // Verify all cards have their unique IDs
      expect(document.getElementById('card-1')).toBeInTheDocument();
      expect(document.getElementById('card-2')).toBeInTheDocument();
      expect(document.getElementById('card-3')).toBeInTheDocument();
    });
  });

  /**
   * RED PHASE TEST 3: Container components should render with id attribute
   *
   * London School Focus:
   * - Mock Container component configuration
   * - Verify id attribute is passed to DOM
   */
  describe('Container Component ID Rendering', () => {
    test('should render Container component with id attribute from props', async () => {
      const mockComponents = [
        {
          type: 'Container',
          props: {
            id: 'main-container',
            size: 'md'
          },
          children: [
            {
              type: 'header',
              props: {
                level: 1,
                title: 'Container Content'
              }
            }
          ]
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Container Content')).toBeInTheDocument();
      });

      const container = document.getElementById('main-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('id', 'main-container');
    });

    test('should render nested Container components with unique ids', async () => {
      const mockComponents = [
        {
          type: 'Container',
          props: {
            id: 'outer-container',
            size: 'lg'
          },
          children: [
            {
              type: 'Container',
              props: {
                id: 'inner-container',
                size: 'sm'
              },
              children: [
                {
                  type: 'header',
                  props: {
                    level: 2,
                    title: 'Nested Content'
                  }
                }
              ]
            }
          ]
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Nested Content')).toBeInTheDocument();
      });

      expect(document.getElementById('outer-container')).toBeInTheDocument();
      expect(document.getElementById('inner-container')).toBeInTheDocument();
    });
  });

  /**
   * RED PHASE TEST 4: All component types with id prop should render it to DOM
   *
   * London School Focus:
   * - Test contract for all component types
   * - Verify consistent id rendering behavior across components
   */
  describe('All Component Types ID Rendering', () => {
    test('should render DataCard component with id attribute', async () => {
      const mockComponents = [
        {
          type: 'DataCard',
          props: {
            id: 'metrics-card',
            title: 'Metrics',
            value: '1,234'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Metrics')).toBeInTheDocument();
      });

      expect(document.getElementById('metrics-card')).toBeInTheDocument();
    });

    test('should render stat component with id attribute', async () => {
      const mockComponents = [
        {
          type: 'stat',
          props: {
            id: 'user-count-stat',
            label: 'Active Users',
            value: '500'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Active Users')).toBeInTheDocument();
      });

      expect(document.getElementById('user-count-stat')).toBeInTheDocument();
    });

    test('should render todoList component with id attribute', async () => {
      const mockComponents = [
        {
          type: 'todoList',
          props: {
            id: 'project-todos'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Tasks')).toBeInTheDocument();
      });

      expect(document.getElementById('project-todos')).toBeInTheDocument();
    });

    test('should render form component with id attribute', async () => {
      const mockComponents = [
        {
          type: 'form',
          props: {
            id: 'contact-form',
            fields: [
              { label: 'Name', type: 'text' },
              { label: 'Email', type: 'email' }
            ]
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Name')).toBeInTheDocument();
      });

      expect(document.getElementById('contact-form')).toBeInTheDocument();
    });
  });

  /**
   * RED PHASE TEST 5: Anchor links should find elements by ID
   *
   * London School Focus:
   * - Test interaction between anchor elements and target components
   * - Verify DOM query behavior matches expected contract
   */
  describe('Anchor Link Navigation', () => {
    test('should allow getElementById to find component by id', async () => {
      const mockComponents = [
        {
          type: 'header',
          props: {
            id: 'introduction',
            level: 2,
            title: 'Introduction'
          }
        },
        {
          type: 'Card',
          props: {
            id: 'features',
            title: 'Features'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Introduction')).toBeInTheDocument();
      });

      // Verify elements can be found by ID
      const introElement = document.getElementById('introduction');
      const featuresElement = document.getElementById('features');

      expect(introElement).toBeInTheDocument();
      expect(featuresElement).toBeInTheDocument();
      expect(introElement?.textContent).toContain('Introduction');
      expect(featuresElement?.textContent).toContain('Features');
    });

    test('should allow querySelector with hash to find component', async () => {
      const mockComponents = [
        {
          type: 'header',
          props: {
            id: 'getting-started',
            level: 2,
            title: 'Getting Started'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Getting Started')).toBeInTheDocument();
      });

      // Verify querySelector with hash works
      const element = document.querySelector('#getting-started');
      expect(element).toBeInTheDocument();
      expect(element?.textContent).toContain('Getting Started');
    });
  });

  /**
   * RED PHASE TEST 6: Components without id prop should not crash
   *
   * London School Focus:
   * - Test defensive behavior
   * - Verify components handle missing id gracefully
   */
  describe('Components Without ID Prop', () => {
    test('should render header without id prop without crashing', async () => {
      const mockComponents = [
        {
          type: 'header',
          props: {
            level: 2,
            title: 'Header Without ID'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Header Without ID')).toBeInTheDocument();
      });

      // Should render but not have id attribute
      const heading = screen.getByText('Header Without ID');
      expect(heading).toBeInTheDocument();
    });

    test('should render Card without id prop without crashing', async () => {
      const mockComponents = [
        {
          type: 'Card',
          props: {
            title: 'Card Without ID'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Card Without ID')).toBeInTheDocument();
      });

      const card = screen.getByText('Card Without ID').closest('div');
      expect(card).toBeInTheDocument();
    });

    test('should render mix of components with and without ids', async () => {
      const mockComponents = [
        {
          type: 'header',
          props: {
            id: 'with-id',
            level: 2,
            title: 'Has ID'
          }
        },
        {
          type: 'header',
          props: {
            level: 2,
            title: 'No ID'
          }
        },
        {
          type: 'Card',
          props: {
            id: 'card-with-id',
            title: 'Card Has ID'
          }
        },
        {
          type: 'Card',
          props: {
            title: 'Card No ID'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Has ID')).toBeInTheDocument();
      });

      // Components with IDs should be findable
      expect(document.getElementById('with-id')).toBeInTheDocument();
      expect(document.getElementById('card-with-id')).toBeInTheDocument();

      // Components without IDs should still render
      expect(screen.getByText('No ID')).toBeInTheDocument();
      expect(screen.getByText('Card No ID')).toBeInTheDocument();
    });
  });

  /**
   * RED PHASE TEST 7: ID should be properly sanitized
   *
   * London School Focus:
   * - Verify id sanitization behavior
   * - Test contract for safe DOM id generation
   */
  describe('ID Sanitization', () => {
    test('should handle ids with hyphens', async () => {
      const mockComponents = [
        {
          type: 'header',
          props: {
            id: 'multi-word-heading',
            level: 2,
            title: 'Multi Word Heading'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Multi Word Heading')).toBeInTheDocument();
      });

      expect(document.getElementById('multi-word-heading')).toBeInTheDocument();
    });

    test('should handle ids with underscores', async () => {
      const mockComponents = [
        {
          type: 'Card',
          props: {
            id: 'card_with_underscores',
            title: 'Underscore Card'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Underscore Card')).toBeInTheDocument();
      });

      expect(document.getElementById('card_with_underscores')).toBeInTheDocument();
    });

    test('should handle ids with numbers', async () => {
      const mockComponents = [
        {
          type: 'header',
          props: {
            id: 'section-123',
            level: 2,
            title: 'Section 123'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Section 123')).toBeInTheDocument();
      });

      expect(document.getElementById('section-123')).toBeInTheDocument();
    });

    test('should handle camelCase ids', async () => {
      const mockComponents = [
        {
          type: 'Card',
          props: {
            id: 'mySpecialCard',
            title: 'CamelCase ID Card'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('CamelCase ID Card')).toBeInTheDocument();
      });

      expect(document.getElementById('mySpecialCard')).toBeInTheDocument();
    });
  });

  /**
   * RED PHASE TEST 8: Integration - Sidebar anchor click scrolls to element
   *
   * London School Focus:
   * - Test full collaboration chain
   * - Mock Sidebar component interaction
   * - Verify scroll behavior contract
   */
  describe('Integration: Sidebar Navigation', () => {
    test('should support anchor navigation from sidebar to content sections', async () => {
      const mockComponents = [
        {
          type: 'Sidebar',
          props: {
            items: [
              { id: 'overview', label: 'Overview', href: '#overview' },
              { id: 'features', label: 'Features', href: '#features' },
              { id: 'pricing', label: 'Pricing', href: '#pricing' }
            ]
          }
        },
        {
          type: 'header',
          props: {
            id: 'overview',
            level: 2,
            title: 'Overview'
          }
        },
        {
          type: 'header',
          props: {
            id: 'features',
            level: 2,
            title: 'Features'
          }
        },
        {
          type: 'header',
          props: {
            id: 'pricing',
            level: 2,
            title: 'Pricing'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });

      // Verify all anchor targets exist
      expect(document.getElementById('overview')).toBeInTheDocument();
      expect(document.getElementById('features')).toBeInTheDocument();
      expect(document.getElementById('pricing')).toBeInTheDocument();

      // Verify sections can be queried by hash
      expect(document.querySelector('#overview')).toBeInTheDocument();
      expect(document.querySelector('#features')).toBeInTheDocument();
      expect(document.querySelector('#pricing')).toBeInTheDocument();
    });

    test('should handle anchor links with scrollIntoView', async () => {
      const mockComponents = [
        {
          type: 'header',
          props: {
            id: 'target-section',
            level: 2,
            title: 'Target Section'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Target Section')).toBeInTheDocument();
      });

      const targetElement = document.getElementById('target-section');
      expect(targetElement).toBeInTheDocument();

      // Mock scrollIntoView
      const mockScrollIntoView = vi.fn();
      if (targetElement) {
        targetElement.scrollIntoView = mockScrollIntoView;
      }

      // Simulate anchor click
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }

      expect(mockScrollIntoView).toHaveBeenCalled();
    });

    test('should support table of contents navigation', async () => {
      const mockComponents = [
        {
          type: 'Container',
          props: {
            id: 'table-of-contents'
          },
          children: [
            {
              type: 'header',
              props: {
                level: 2,
                title: 'Table of Contents'
              }
            }
          ]
        },
        {
          type: 'header',
          props: {
            id: 'introduction',
            level: 2,
            title: 'Introduction'
          }
        },
        {
          type: 'header',
          props: {
            id: 'methodology',
            level: 2,
            title: 'Methodology'
          }
        },
        {
          type: 'header',
          props: {
            id: 'conclusion',
            level: 2,
            title: 'Conclusion'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Introduction')).toBeInTheDocument();
      });

      // Verify all sections are accessible by id
      const sections = ['introduction', 'methodology', 'conclusion'];
      sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        expect(section).toBeInTheDocument();
        expect(section?.hasAttribute('id')).toBe(true);
      });
    });
  });

  /**
   * London School: Mock Verification Tests
   * Verify that mocks were called with expected parameters
   */
  describe('Mock Interaction Verification', () => {
    test('should fetch page data with correct parameters', async () => {
      const mockComponents = [
        {
          type: 'header',
          props: {
            id: 'test-header',
            level: 1,
            title: 'Test'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      // Verify fetch was called with correct URL
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/agent-pages/agents/agent-1/pages/page-1')
      );
    });

    test('should handle component rendering contract', async () => {
      const mockComponents = [
        {
          type: 'Card',
          props: {
            id: 'test-card',
            title: 'Test Card',
            description: 'Test Description'
          }
        }
      ];

      const pageData = createMockPageData(mockComponents);
      mockFetchSuccess(pageData);

      const { container } = render(
        <TestWrapper>
          <DynamicPageRenderer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Card')).toBeInTheDocument();
      });

      // Verify component rendered with correct structure
      const card = container.querySelector('[id="test-card"]');
      expect(card).toBeInTheDocument();
      expect(card?.getAttribute('id')).toBe('test-card');
    });
  });
});
