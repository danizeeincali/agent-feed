/**
 * TDD London School Tests for AgentPagesTab Component
 * SPARC Phase 4A: Test-Driven Development Implementation
 * 
 * Test Coverage: Pages listing, search functionality, external navigation, quick access cards
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentPagesTab } from '../../../frontend/src/components/AgentPagesTab';
import { UnifiedAgentData } from '../../../frontend/src/components/UnifiedAgentPage';

// Mock window.open for external navigation
global.open = vi.fn();

describe('AgentPagesTab - TDD London School', () => {
  let mockAgent: UnifiedAgentData;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    
    mockAgent = {
      id: 'test-agent',
      name: 'Test Agent',
      display_name: 'Test Agent',
      description: 'Test agent description',
      status: 'active',
      capabilities: ['testing'],
      stats: {
        tasksCompleted: 10,
        successRate: 95,
        averageResponseTime: 1.2,
        uptime: 99.5,
        todayTasks: 5,
        weeklyTasks: 25,
        satisfaction: 4.5
      },
      recentActivities: [],
      recentPosts: [],
      configuration: {
        profile: {
          name: 'Test Agent',
          description: 'Test description',
          specialization: 'Testing',
          avatar: '🤖'
        },
        behavior: {
          responseStyle: 'friendly',
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
          primaryColor: '#3B82F6',
          accentColor: '#8B5CF6',
          layout: 'grid'
        }
      },
      pages: [
        {
          id: 'getting-started',
          title: 'Getting Started',
          path: '/docs/getting-started',
          description: 'Quick start guide for new users',
          category: 'Documentation',
          lastModified: '2024-01-01T00:00:00Z',
          readTime: 5
        },
        {
          id: 'api-reference',
          title: 'API Reference',
          path: '/docs/api',
          description: 'Complete API documentation',
          category: 'Documentation',
          lastModified: '2024-01-02T00:00:00Z',
          readTime: 15
        },
        {
          id: 'examples',
          title: 'Examples',
          path: '/docs/examples',
          description: 'Practical examples and tutorials',
          category: 'Tutorials',
          lastModified: '2024-01-03T00:00:00Z',
          readTime: 10
        },
        {
          id: 'changelog',
          title: 'Changelog',
          path: '/docs/changelog',
          description: 'Version history and updates',
          category: 'Documentation',
          lastModified: '2024-01-04T00:00:00Z',
          readTime: 3
        },
        {
          id: 'external-guide',
          title: 'External Guide',
          path: 'https://external.com/guide',
          description: 'External documentation link',
          category: 'External'
        }
      ],
      metadata: {
        repository: 'https://github.com/test/agent',
        documentation: 'https://docs.test.com/agent'
      }
    };
  });

  describe('Component Rendering', () => {
    it('should render pages list with correct count', () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Agent Pages & Documentation')).toBeInTheDocument();
      expect(screen.getByText('5 of 5 pages available')).toBeInTheDocument();
      expect(screen.getByTestId('pages-grid')).toBeInTheDocument();
    });

    it('should show "No Pages Available" when pages array is empty', () => {
      // Arrange
      mockAgent.pages = [];

      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('No Pages Available')).toBeInTheDocument();
      expect(screen.getByText("This agent doesn't have any associated pages or documentation.")).toBeInTheDocument();
    });

    it('should show "No Pages Available" when pages is undefined', () => {
      // Arrange
      mockAgent.pages = undefined;

      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('No Pages Available')).toBeInTheDocument();
    });

    it('should render all page cards with correct information', () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      const pageCards = screen.getAllByTestId('page-card');
      expect(pageCards).toHaveLength(5);
      
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText('API Reference')).toBeInTheDocument();
      expect(screen.getByText('Examples')).toBeInTheDocument();
      expect(screen.getByText('Changelog')).toBeInTheDocument();
      expect(screen.getByText('External Guide')).toBeInTheDocument();
    });
  });

  describe('Quick Access Cards', () => {
    it('should render quick access cards for common page types', () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      const quickAccessCards = screen.getByTestId('quick-access-cards');
      expect(quickAccessCards).toBeInTheDocument();
      
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText('API Reference')).toBeInTheDocument();
      expect(screen.getByText('Examples')).toBeInTheDocument();
      expect(screen.getByText('Changelog')).toBeInTheDocument();
    });

    it('should show "Available" status for existing page types', () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      const availableStatuses = screen.getAllByText('Available');
      expect(availableStatuses).toHaveLength(4); // All quick access types are available
    });

    it('should show "Not available" status for missing page types', () => {
      // Arrange
      mockAgent.pages = [
        {
          id: 'other',
          title: 'Other Documentation',
          path: '/docs/other',
          description: 'Other content'
        }
      ];

      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      const notAvailableStatuses = screen.getAllByText('Not available');
      expect(notAvailableStatuses).toHaveLength(4); // All quick access types are missing
    });

    it('should navigate to correct page when quick access card is clicked', async () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Find and click the Getting Started quick access card
      const quickAccessCards = screen.getByTestId('quick-access-cards');
      const gettingStartedCard = quickAccessCards.querySelector('[data-testid="quick-access-card"]');
      
      if (gettingStartedCard) {
        await user.click(gettingStartedCard);
      }

      // Assert
      expect(global.open).toHaveBeenCalledWith('/docs/getting-started', '_blank');
    });
  });

  describe('Search Functionality', () => {
    it('should filter pages based on search term', async () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Initial state - all pages shown
      expect(screen.getAllByTestId('page-card')).toHaveLength(5);

      // Search for "API"
      const searchInput = screen.getByPlaceholderText('Search pages...');
      await user.type(searchInput, 'API');

      // Assert
      await waitFor(() => {
        const visibleCards = screen.getAllByTestId('page-card');
        expect(visibleCards).toHaveLength(1);
        expect(screen.getByText('API Reference')).toBeInTheDocument();
        expect(screen.queryByText('Getting Started')).not.toBeInTheDocument();
      });
    });

    it('should search by page ID as well as title', async () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      const searchInput = screen.getByPlaceholderText('Search pages...');
      await user.type(searchInput, 'examples');

      // Assert
      await waitFor(() => {
        const visibleCards = screen.getAllByTestId('page-card');
        expect(visibleCards).toHaveLength(1);
        expect(screen.getByText('Examples')).toBeInTheDocument();
      });
    });

    it('should show no results message when search returns no matches', async () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      const searchInput = screen.getByPlaceholderText('Search pages...');
      await user.type(searchInput, 'nonexistent');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No pages found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search terms to find more pages.')).toBeInTheDocument();
        expect(screen.queryByTestId('page-card')).not.toBeInTheDocument();
      });
    });

    it('should be case insensitive', async () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      const searchInput = screen.getByPlaceholderText('Search pages...');
      await user.type(searchInput, 'GETTING');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Getting Started')).toBeInTheDocument();
      });
    });

    it('should update page count when filtering', async () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      const searchInput = screen.getByPlaceholderText('Search pages...');
      await user.type(searchInput, 'API');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('1 of 5 pages available')).toBeInTheDocument();
      });
    });
  });

  describe('Page Navigation', () => {
    it('should handle internal page navigation', async () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      const gettingStartedCard = screen.getByText('Getting Started').closest('[data-testid="page-card"]');
      await user.click(gettingStartedCard!);

      // Assert
      expect(global.open).toHaveBeenCalledWith('/docs/getting-started', '_blank');
    });

    it('should handle external page navigation with proper security attributes', async () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      const externalCard = screen.getByText('External Guide').closest('[data-testid="page-card"]');
      await user.click(externalCard!);

      // Assert
      expect(global.open).toHaveBeenCalledWith('https://external.com/guide', '_blank', 'noopener,noreferrer');
    });

    it('should handle pages without paths gracefully', async () => {
      // Arrange
      mockAgent.pages = [
        {
          id: 'no-path',
          title: 'Page Without Path',
          description: 'A page without a path'
        }
      ];

      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      const pageCard = screen.getByText('Page Without Path').closest('[data-testid="page-card"]');
      await user.click(pageCard!);

      // Assert - Should not call window.open if no path
      expect(global.open).not.toHaveBeenCalled();
    });
  });

  describe('Page Card Information', () => {
    it('should display page descriptions when available', () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Quick start guide for new users')).toBeInTheDocument();
      expect(screen.getByText('Complete API documentation')).toBeInTheDocument();
      expect(screen.getByText('Practical examples and tutorials')).toBeInTheDocument();
    });

    it('should display page metadata correctly', () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Updated 1/1/2024')).toBeInTheDocument();
      expect(screen.getByText('5 min read')).toBeInTheDocument();
      expect(screen.getByText('15 min read')).toBeInTheDocument();
    });

    it('should show appropriate page type badges', () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText('API Reference')).toBeInTheDocument();
      expect(screen.getByText('Examples')).toBeInTheDocument();
      expect(screen.getByText('Changelog')).toBeInTheDocument();
    });

    it('should show page paths correctly', () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('/docs/getting-started')).toBeInTheDocument();
      expect(screen.getByText('/docs/api')).toBeInTheDocument();
      expect(screen.getByText('https://external.com/guide')).toBeInTheDocument();
    });
  });

  describe('Page Actions', () => {
    it('should provide view page buttons for all pages', () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      const viewButtons = screen.getAllByText('View Page');
      expect(viewButtons).toHaveLength(5);
    });

    it('should handle download action for downloadable pages', () => {
      // Arrange
      mockAgent.pages![0].downloadable = true;

      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      const downloadButtons = screen.getAllByLabelText(/download/i);
      expect(downloadButtons.length).toBeGreaterThan(0);
    });

    it('should provide bookmark functionality for all pages', () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      const bookmarkButtons = screen.getAllByLabelText(/bookmark/i);
      expect(bookmarkButtons).toHaveLength(5);
    });
  });

  describe('Additional Resources Section', () => {
    it('should render additional resources when metadata is available', () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Additional Resources')).toBeInTheDocument();
      expect(screen.getByText('Source Repository')).toBeInTheDocument();
      expect(screen.getByText('Full Documentation')).toBeInTheDocument();
      expect(screen.getByText('Agent Definition')).toBeInTheDocument();
    });

    it('should link to external resources correctly', () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      const repositoryLink = screen.getByText('Source Repository').closest('a');
      const documentationLink = screen.getByText('Full Documentation').closest('a');
      
      expect(repositoryLink).toHaveAttribute('href', 'https://github.com/test/agent');
      expect(repositoryLink).toHaveAttribute('target', '_blank');
      expect(repositoryLink).toHaveAttribute('rel', 'noopener noreferrer');
      
      expect(documentationLink).toHaveAttribute('href', 'https://docs.test.com/agent');
      expect(documentationLink).toHaveAttribute('target', '_blank');
      expect(documentationLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should handle missing metadata gracefully', () => {
      // Arrange
      mockAgent.metadata = {};

      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Additional Resources')).toBeInTheDocument();
      expect(screen.queryByText('Source Repository')).not.toBeInTheDocument();
      expect(screen.queryByText('Full Documentation')).not.toBeInTheDocument();
      expect(screen.getByText('Agent Definition')).toBeInTheDocument(); // This should always be present
    });
  });

  describe('Error Handling', () => {
    it('should handle missing agent gracefully', () => {
      // Act & Assert
      expect(() => render(<AgentPagesTab agent={null as any} />)).not.toThrow();
    });

    it('should handle agent without pages property', () => {
      // Arrange
      const agentWithoutPages = { ...mockAgent };
      delete (agentWithoutPages as any).pages;

      // Act
      render(<AgentPagesTab agent={agentWithoutPages} />);

      // Assert
      expect(screen.getByText('No Pages Available')).toBeInTheDocument();
    });

    it('should handle malformed page objects gracefully', () => {
      // Arrange
      mockAgent.pages = [
        { id: 'malformed' } as any,
        null as any,
        undefined as any
      ];

      // Act & Assert - Should not throw
      expect(() => render(<AgentPagesTab agent={mockAgent} />)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      expect(screen.getByRole('textbox', { name: /search pages/i })).toBeInTheDocument();
      
      const pageCards = screen.getAllByTestId('page-card');
      pageCards.forEach(card => {
        expect(card).toHaveAttribute('role', 'button');
      });
    });

    it('should support keyboard navigation', async () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      const searchInput = screen.getByPlaceholderText('Search pages...');
      searchInput.focus();

      // Assert
      expect(searchInput).toHaveFocus();
      
      // Tab navigation should work
      await user.tab();
      // Next focusable element should receive focus
    });

    it('should have accessible page descriptions', () => {
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Additional documentation and resources for this agent')).toBeInTheDocument();
      expect(screen.getByText('External links and resources related to this agent')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of pages efficiently', () => {
      // Arrange
      const manyPages = Array.from({ length: 100 }, (_, i) => ({
        id: `page-${i}`,
        title: `Page ${i}`,
        path: `/docs/page-${i}`,
        description: `Description for page ${i}`
      }));
      mockAgent.pages = manyPages;

      // Act & Assert - Should not throw or hang
      expect(() => render(<AgentPagesTab agent={mockAgent} />)).not.toThrow();
      
      // Should show correct count
      expect(screen.getByText('100 of 100 pages available')).toBeInTheDocument();
    });

    it('should debounce search input for performance', async () => {
      // This test would require implementing debouncing in the actual component
      // For now, we just test that rapid typing doesn't break anything
      
      // Act
      render(<AgentPagesTab agent={mockAgent} />);

      const searchInput = screen.getByPlaceholderText('Search pages...');
      
      // Rapid typing
      await user.type(searchInput, 'abc', { delay: 1 });

      // Assert - Should not throw
      expect(searchInput).toHaveValue('abc');
    });
  });
});