/**
 * AgentPagesTab TDD London School Tests  
 * Red-Green-Refactor implementation with behavior verification
 * Tests page listing, search functionality, quick access cards, and navigation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentPagesTab } from '../../../frontend/src/components/AgentPagesTab';
import { UnifiedAgentData } from '../../../frontend/src/components/UnifiedAgentPage';
import { jest } from '@jest/globals';

// Mock window.open for external navigation testing
const mockWindowOpen = jest.fn();
Object.assign(window, { open: mockWindowOpen });

describe('AgentPagesTab - London School TDD', () => {
  let mockAgent: UnifiedAgentData;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    
    // Real agent data with comprehensive pages structure
    mockAgent = {
      id: 'pages-agent-001',
      name: 'Documentation Agent',
      display_name: 'Advanced Documentation Agent',
      description: 'AI agent specialized in documentation and knowledge management',
      status: 'active',
      capabilities: ['Documentation', 'Knowledge Management', 'Content Creation'],
      stats: {
        tasksCompleted: 1250,
        successRate: 98.5,
        averageResponseTime: 1.1,
        uptime: 99.8,
        todayTasks: 15,
        weeklyTasks: 89,
        satisfaction: 4.9
      },
      configuration: {
        profile: {
          name: 'Documentation Agent',
          description: 'Specialized in creating and managing documentation',
          specialization: 'Technical Writing and Documentation',
          avatar: '📚'
        },
        behavior: {
          responseStyle: 'formal',
          proactivity: 'medium',
          verbosity: 'detailed'
        },
        privacy: {
          isPublic: true,
          showMetrics: true,
          showActivity: true,
          allowComments: true
        },
        theme: {
          primaryColor: '#10B981',
          accentColor: '#F59E0B',
          layout: 'list'
        }
      },
      recentActivities: [],
      recentPosts: [],
      // Comprehensive pages data structure
      pages: [
        {
          id: 'getting-started-guide',
          title: 'Getting Started Guide',
          description: 'Complete guide to getting started with the Documentation Agent',
          path: 'https://docs.example.com/getting-started',
          category: 'Getting Started',
          lastModified: '2024-01-15T10:30:00Z',
          readTime: 5,
          downloadable: true
        },
        {
          id: 'api-reference',
          title: 'API Reference Documentation',
          description: 'Comprehensive API reference with endpoints and examples',
          path: 'https://api.example.com/docs',
          category: 'API Reference',
          lastModified: '2024-01-14T16:20:00Z',
          readTime: 15,
          downloadable: true
        },
        {
          id: 'tutorial-basics',
          title: 'Basic Tutorial: First Steps',
          description: 'Step-by-step tutorial for new users',
          path: '/tutorials/basics',
          category: 'Tutorial',
          lastModified: '2024-01-13T09:15:00Z',
          readTime: 8,
          downloadable: false
        },
        {
          id: 'examples-collection',
          title: 'Code Examples Collection',
          description: 'Real-world examples and use cases',
          path: '/examples',
          category: 'Examples',
          lastModified: '2024-01-12T14:45:00Z',
          readTime: 12,
          downloadable: true
        },
        {
          id: 'changelog-v2',
          title: 'Changelog v2.0',
          description: 'Latest changes and updates in version 2.0',
          path: '/changelog/v2',
          category: 'Changelog',
          lastModified: '2024-01-16T08:00:00Z',
          readTime: 3,
          downloadable: false
        },
        {
          id: 'advanced-configuration',
          title: 'Advanced Configuration Guide',
          description: 'Advanced settings and customization options',
          path: 'https://docs.example.com/advanced',
          category: 'Documentation',
          lastModified: '2024-01-11T13:30:00Z',
          readTime: 20,
          downloadable: true
        }
      ],
      metadata: {
        languages: ['Python', 'TypeScript', 'Markdown'],
        repository: 'https://github.com/ai-agents/documentation-agent',
        documentation: 'https://docs.ai-agents.com/documentation-agent',
        author: 'Documentation Team',
        license: 'Apache 2.0'
      },
      createdAt: '2024-01-01T00:00:00Z',
      lastActiveAt: '2024-01-16T11:45:00Z',
      version: '2.0.1'
    };

    jest.clearAllMocks();
  });

  describe('RED PHASE - Failing Tests', () => {
    test('SHOULD display pages count and search functionality', () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      // FAILING: Should display correct page count
      expect(screen.getByText('6 of 6 pages available')).toBeInTheDocument();
      
      // FAILING: Should have search input
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search pages...')).toBeInTheDocument();
      
      // FAILING: Should display main heading
      expect(screen.getByText('Agent Pages & Documentation')).toBeInTheDocument();
    });

    test('SHOULD render quick access cards for common page types', () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      // FAILING: Should render quick access cards
      expect(screen.getByTestId('quick-access-cards')).toBeInTheDocument();
      
      // FAILING: Should show Getting Started card as available
      const gettingStartedCard = screen.getByText('Getting Started').closest('[role="button"], .cursor-pointer');
      expect(gettingStartedCard).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument(); // At least one available indicator
      
      // FAILING: Should show API Reference card as available
      expect(screen.getByText('API Reference')).toBeInTheDocument();
      
      // FAILING: Should show Examples card as available
      expect(screen.getByText('Examples')).toBeInTheDocument();
      
      // FAILING: Should show Changelog card as available
      expect(screen.getByText('Changelog')).toBeInTheDocument();
    });

    test('SHOULD display all pages in the grid with proper metadata', () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      // FAILING: Should render pages grid
      expect(screen.getByTestId('pages-grid')).toBeInTheDocument();
      
      // FAILING: Should display all page titles
      mockAgent.pages!.forEach(page => {
        expect(screen.getByText(page.title)).toBeInTheDocument();
      });
      
      // FAILING: Should display page descriptions
      expect(screen.getByText('Complete guide to getting started with the Documentation Agent')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive API reference with endpoints and examples')).toBeInTheDocument();
      
      // FAILING: Should show page cards
      const pageCards = screen.getAllByTestId('page-card');
      expect(pageCards).toHaveLength(6); // All 6 pages
    });

    test('SHOULD display page metadata correctly', () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      // FAILING: Should show page metadata sections
      const metadataSections = screen.getAllByTestId('page-metadata');
      expect(metadataSections.length).toBeGreaterThan(0);
      
      // FAILING: Should display last modified dates
      expect(screen.getByText('Updated 1/15/2024')).toBeInTheDocument(); // Getting started
      expect(screen.getByText('Updated 1/16/2024')).toBeInTheDocument(); // Changelog
      
      // FAILING: Should display read times
      expect(screen.getByText('5 min read')).toBeInTheDocument();
      expect(screen.getByText('15 min read')).toBeInTheDocument();
      expect(screen.getByText('3 min read')).toBeInTheDocument();
      
      // FAILING: Should display page paths
      expect(screen.getByText('https://docs.example.com/getting-started')).toBeInTheDocument();
      expect(screen.getByText('/tutorials/basics')).toBeInTheDocument();
    });

    test('SHOULD provide page action buttons', () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      // FAILING: Should show page actions
      const actionsSections = screen.getAllByTestId('page-actions');
      expect(actionsSections.length).toBeGreaterThan(0);
      
      // FAILING: Should have View Page buttons
      const viewButtons = screen.getAllByText('View Page');
      expect(viewButtons.length).toBeGreaterThan(0);
      
      // FAILING: Should have download buttons for downloadable pages
      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      expect(downloadButtons.length).toBeGreaterThan(0);
      
      // FAILING: Should have bookmark buttons
      const bookmarkButtons = screen.getAllByRole('button', { name: /bookmark/i });
      expect(bookmarkButtons.length).toBeGreaterThan(0);
    });

    test('SHOULD implement search functionality', async () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      const searchInput = screen.getByTestId('search-input');
      
      // FAILING: Should filter pages by title
      await user.type(searchInput, 'API');
      
      // Should only show API reference page
      expect(screen.getByText('API Reference Documentation')).toBeInTheDocument();
      expect(screen.queryByText('Getting Started Guide')).not.toBeInTheDocument();
      
      // FAILING: Should update page count
      expect(screen.getByText('1 of 6 pages available')).toBeInTheDocument();
      
      // FAILING: Should search in descriptions
      await user.clear(searchInput);
      await user.type(searchInput, 'tutorial');
      
      expect(screen.getByText('Basic Tutorial: First Steps')).toBeInTheDocument();
    });

    test('SHOULD implement category filtering', async () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      // FAILING: Should show category filter buttons
      expect(screen.getByText('Filter by category:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      
      // FAILING: Should have category buttons for each category
      const categories = ['Getting Started', 'API Reference', 'Tutorial', 'Examples', 'Changelog', 'Documentation'];
      categories.forEach(category => {
        expect(screen.getByRole('button', { name: category })).toBeInTheDocument();
      });
      
      // FAILING: Should filter by category
      const apiButton = screen.getByRole('button', { name: 'API Reference' });
      await user.click(apiButton);
      
      expect(screen.getByText('API Reference Documentation')).toBeInTheDocument();
      expect(screen.queryByText('Getting Started Guide')).not.toBeInTheDocument();
    });

    test('SHOULD handle page navigation clicks', async () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      // FAILING: Should handle external URL clicks
      const gettingStartedCard = screen.getByText('Getting Started Guide').closest('[data-testid="page-card"]');
      expect(gettingStartedCard).toBeInTheDocument();
      
      await user.click(gettingStartedCard!);
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://docs.example.com/getting-started',
        '_blank',
        'noopener,noreferrer'
      );
      
      // FAILING: Should handle internal path clicks
      const tutorialCard = screen.getByText('Basic Tutorial: First Steps').closest('[data-testid="page-card"]');
      await user.click(tutorialCard!);
      
      expect(mockWindowOpen).toHaveBeenCalledWith('/tutorials/basics', '_blank');
    });

    test('SHOULD display additional resources section', () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      // FAILING: Should render additional resources
      expect(screen.getByTestId('additional-resources')).toBeInTheDocument();
      expect(screen.getByText('Additional Resources')).toBeInTheDocument();
      
      // FAILING: Should display repository link
      const repoLink = screen.getByText('Source Repository').closest('a');
      expect(repoLink).toHaveAttribute('href', mockAgent.metadata!.repository);
      expect(repoLink).toHaveAttribute('target', '_blank');
      
      // FAILING: Should display documentation link
      const docLink = screen.getByText('Full documentation').closest('a');
      expect(docLink).toHaveAttribute('href', mockAgent.metadata!.documentation);
      
      // FAILING: Should display built-in agent definition link
      expect(screen.getByText('Agent Definition')).toBeInTheDocument();
      expect(screen.getByText('Built-in')).toBeInTheDocument();
    });

    test('SHOULD handle empty search results gracefully', async () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      const searchInput = screen.getByTestId('search-input');
      
      // FAILING: Should show no results message for non-matching search
      await user.type(searchInput, 'nonexistent-page-name-xyz');
      
      expect(screen.getByText('No pages found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search terms to find more pages.')).toBeInTheDocument();
      
      // FAILING: Should show search icon in empty state
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // Search icon
    });

    test('SHOULD handle agent with no pages gracefully', () => {
      const agentWithoutPages = { ...mockAgent, pages: [] };
      render(<AgentPagesTab agent={agentWithoutPages} />);
      
      // FAILING: Should show no pages message
      expect(screen.getByText('No Pages Available')).toBeInTheDocument();
      expect(screen.getByText("This agent doesn't have any associated pages or documentation.")).toBeInTheDocument();
      
      // FAILING: Should not show pages grid
      expect(screen.queryByTestId('pages-grid')).not.toBeInTheDocument();
    });

    test('SHOULD handle null/undefined agent gracefully', () => {
      render(<AgentPagesTab agent={null as any} />);
      
      // FAILING: Should show no pages available message
      expect(screen.getByText('No Pages Available')).toBeInTheDocument();
    });
  });

  describe('Behavior Verification - London School Contracts', () => {
    test('SHOULD verify search interaction behavior', async () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      const searchInput = screen.getByTestId('search-input');
      
      // FAILING: Should maintain search state
      await user.type(searchInput, 'guide');
      expect(searchInput).toHaveValue('guide');
      
      // FAILING: Should filter results reactively
      expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
      expect(screen.getByText('Advanced Configuration Guide')).toBeInTheDocument();
      expect(screen.queryByText('API Reference Documentation')).not.toBeInTheDocument();
    });

    test('SHOULD verify category filter interaction contracts', async () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      const allButton = screen.getByRole('button', { name: 'All' });
      const examplesButton = screen.getByRole('button', { name: 'Examples' });
      
      // FAILING: Should track active filter state
      expect(allButton).toHaveClass(/default/); // Initially active
      
      await user.click(examplesButton);
      
      expect(examplesButton).toHaveClass(/default/); // Now active
      expect(allButton).toHaveClass(/outline/); // Now inactive
    });

    test('SHOULD verify page type badge generation contracts', () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      // FAILING: Should generate appropriate badges based on page titles
      expect(screen.getByText('Getting Started')).toBeInTheDocument(); // Badge for getting started
      expect(screen.getByText('API Reference')).toBeInTheDocument(); // Badge for API
      expect(screen.getByText('Examples')).toBeInTheDocument(); // Badge for examples
      expect(screen.getByText('Tutorial')).toBeInTheDocument(); // Badge for tutorial
      expect(screen.getByText('Changelog')).toBeInTheDocument(); // Badge for changelog
    });

    test('SHOULD verify quick access card availability logic', () => {
      const agentWithLimitedPages = {
        ...mockAgent,
        pages: [
          mockAgent.pages![0], // Getting started only
        ]
      };
      
      render(<AgentPagesTab agent={agentWithLimitedPages} />);
      
      // FAILING: Should show available for existing pages
      const gettingStartedCard = screen.getByText('Getting Started').closest('.cursor-pointer');
      expect(gettingStartedCard).not.toHaveClass('opacity-50');
      
      // FAILING: Should show not available for missing pages
      const apiCard = screen.getByText('API Reference').closest('.cursor-not-allowed');
      expect(apiCard).toHaveClass('opacity-50');
    });
  });

  describe('Real Data Integration Contracts', () => {
    test('SHOULD handle real page data structure variations', () => {
      const realPageData = {
        ...mockAgent,
        pages: [
          {
            id: 'real-page-1',
            title: 'Real Documentation Page',
            path: 'https://real-docs.com/page1',
            // Missing optional fields to test robustness
          },
          {
            id: 'real-page-2',
            title: 'Another Real Page',
            description: 'Real description content',
            path: '/internal/page',
            category: 'Real Category',
            lastModified: '2024-01-15T10:30:00Z'
            // Missing readTime and downloadable
          }
        ]
      };

      render(<AgentPagesTab agent={realPageData} />);
      
      // FAILING: Should handle pages with missing optional fields
      expect(screen.getByText('Real Documentation Page')).toBeInTheDocument();
      expect(screen.getByText('Another Real Page')).toBeInTheDocument();
      expect(screen.getByText('Real description content')).toBeInTheDocument();
    });

    test('SHOULD verify zero mock data contamination', () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      // FAILING: Should contain only real page data, no mock strings
      const pagesGrid = screen.getByTestId('pages-grid');
      
      expect(pagesGrid.textContent).not.toMatch(/lorem ipsum/i);
      expect(pagesGrid.textContent).not.toMatch(/placeholder/i);
      expect(pagesGrid.textContent).not.toMatch(/sample.*page/i);
      expect(pagesGrid.textContent).not.toMatch(/mock.*documentation/i);
      
      // Should contain actual page data
      expect(pagesGrid.textContent).toContain('Complete guide to getting started');
      expect(pagesGrid.textContent).toContain('Comprehensive API reference');
    });

    test('SHOULD verify page metadata displays real timestamps', () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      // FAILING: Should format and display real lastModified dates
      const realDate = new Date(mockAgent.pages![0].lastModified!);
      const formattedDate = realDate.toLocaleDateString();
      expect(screen.getByText(`Updated ${formattedDate}`)).toBeInTheDocument();
      
      // FAILING: Should not show generic timestamps
      expect(screen.queryByText(/updated.*yesterday/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/updated.*ago/i)).not.toBeInTheDocument();
    });

    test('SHOULD verify search works with real page content', async () => {
      render(<AgentPagesTab agent={mockAgent} />);
      
      const searchInput = screen.getByTestId('search-input');
      
      // FAILING: Should search in real page descriptions
      await user.type(searchInput, 'comprehensive');
      
      // Should find the API reference page with "Comprehensive" in description
      expect(screen.getByText('API Reference Documentation')).toBeInTheDocument();
      expect(screen.queryByText('Getting Started Guide')).not.toBeInTheDocument();
      
      // FAILING: Should match case-insensitive
      await user.clear(searchInput);
      await user.type(searchInput, 'COMPLETE');
      
      expect(screen.getByText('Getting Started Guide')).toBeInTheDocument(); // "Complete guide"
    });
  });
});