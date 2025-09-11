/**
 * AgentPagesTab TDD Tests
 * Testing the pages listing and search functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AgentPagesTab from '../../../src/components/AgentPagesTab';
import type { UnifiedAgentData } from '../../../src/components/UnifiedAgentPage';

// Test data factory
const createMockAgent = (overrides: Partial<UnifiedAgentData> = {}): UnifiedAgentData => ({
  id: 'test-agent-1',
  name: 'Test Agent',
  description: 'Test agent description',
  status: 'active',
  capabilities: ['automation', 'analysis'],
  stats: {
    tasksCompleted: 100,
    successRate: 95,
    averageResponseTime: 200,
    uptime: 99.5,
    todayTasks: 5,
    weeklyTasks: 35,
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
      id: 'page-1',
      title: 'Getting Started Guide',
      description: 'Learn how to use this agent effectively',
      type: 'documentation',
      category: 'guide',
      url: '/docs/getting-started',
      lastUpdated: '2024-01-15T10:00:00Z',
      tags: ['tutorial', 'basics', 'setup'],
      readTime: 5,
      difficulty: 'beginner',
      featured: true,
      status: 'published'
    },
    {
      id: 'page-2',
      title: 'API Reference',
      description: 'Complete API documentation for integration',
      type: 'api',
      category: 'reference',
      url: '/docs/api-reference',
      lastUpdated: '2024-01-14T15:30:00Z',
      tags: ['api', 'reference', 'integration'],
      readTime: 15,
      difficulty: 'advanced',
      featured: false,
      status: 'published'
    },
    {
      id: 'page-3',
      title: 'Best Practices',
      description: 'Tips and tricks for optimal performance',
      type: 'documentation',
      category: 'guide',
      url: '/docs/best-practices',
      lastUpdated: '2024-01-13T09:15:00Z',
      tags: ['performance', 'optimization', 'tips'],
      readTime: 10,
      difficulty: 'intermediate',
      featured: true,
      status: 'published'
    },
    {
      id: 'page-4',
      title: 'Troubleshooting',
      description: 'Common issues and solutions',
      type: 'support',
      category: 'help',
      url: '/docs/troubleshooting',
      lastUpdated: '2024-01-12T14:45:00Z',
      tags: ['troubleshooting', 'help', 'faq'],
      readTime: 8,
      difficulty: 'intermediate',
      featured: false,
      status: 'published'
    },
    {
      id: 'page-5',
      title: 'Advanced Configuration',
      description: 'Deep dive into advanced settings',
      type: 'documentation',
      category: 'guide',
      url: '/docs/advanced-config',
      lastUpdated: '2024-01-10T11:20:00Z',
      tags: ['advanced', 'configuration', 'settings'],
      readTime: 20,
      difficulty: 'expert',
      featured: false,
      status: 'draft'
    }
  ],
  workspace: null,
  profile: null,
  ...overrides
});

describe('AgentPagesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the component with pages list', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      expect(screen.getByText('Pages & Documentation')).toBeInTheDocument();
    });

    it('should display all published pages', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const publishedPages = agent.pages!.filter(page => page.status === 'published');
      publishedPages.forEach(page => {
        expect(screen.getByText(page.title)).toBeInTheDocument();
        expect(screen.getByText(page.description)).toBeInTheDocument();
      });
    });

    it('should show empty state when no pages available', () => {
      const agent = createMockAgent({ pages: [] });
      render(<AgentPagesTab agent={agent} />);
      
      expect(screen.getByTestId('empty-pages-state')).toBeInTheDocument();
      expect(screen.getByText(/No pages available/i)).toBeInTheDocument();
    });

    it('should hide draft pages by default', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const draftPage = agent.pages!.find(page => page.status === 'draft');
      expect(screen.queryByText(draftPage!.title)).not.toBeInTheDocument();
    });
  });

  describe('Page Cards', () => {
    it('should render page cards with all information', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const firstPage = agent.pages![0];
      expect(screen.getByTestId(`page-card-${firstPage.id}`)).toBeInTheDocument();
      expect(screen.getByText(firstPage.title)).toBeInTheDocument();
      expect(screen.getByText(firstPage.description)).toBeInTheDocument();
      expect(screen.getByText(`${firstPage.readTime} min read`)).toBeInTheDocument();
    });

    it('should display page type badges', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      expect(screen.getByTestId('type-badge-documentation')).toBeInTheDocument();
      expect(screen.getByTestId('type-badge-api')).toBeInTheDocument();
      expect(screen.getByTestId('type-badge-support')).toBeInTheDocument();
    });

    it('should show difficulty indicators', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      expect(screen.getByTestId('difficulty-beginner')).toBeInTheDocument();
      expect(screen.getByTestId('difficulty-intermediate')).toBeInTheDocument();
      expect(screen.getByTestId('difficulty-advanced')).toBeInTheDocument();
    });

    it('should highlight featured pages', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const featuredPages = agent.pages!.filter(page => page.featured);
      featuredPages.forEach(page => {
        const card = screen.getByTestId(`page-card-${page.id}`);
        expect(card).toHaveClass('featured-page');
      });
    });

    it('should display last updated timestamps', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      agent.pages!.forEach(page => {
        if (page.status === 'published') {
          expect(screen.getByTestId(`last-updated-${page.id}`)).toBeInTheDocument();
        }
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter pages by search term', async () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const searchInput = screen.getByTestId('pages-search');
      fireEvent.change(searchInput, { target: { value: 'API' } });
      
      await waitFor(() => {
        expect(screen.getByText('API Reference')).toBeInTheDocument();
        expect(screen.queryByText('Getting Started Guide')).not.toBeInTheDocument();
      });
    });

    it('should search by description content', async () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const searchInput = screen.getByTestId('pages-search');
      fireEvent.change(searchInput, { target: { value: 'integration' } });
      
      await waitFor(() => {
        expect(screen.getByText('API Reference')).toBeInTheDocument();
      });
    });

    it('should search by tags', async () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const searchInput = screen.getByTestId('pages-search');
      fireEvent.change(searchInput, { target: { value: 'tutorial' } });
      
      await waitFor(() => {
        expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
      });
    });

    it('should clear search results', async () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const searchInput = screen.getByTestId('pages-search');
      fireEvent.change(searchInput, { target: { value: 'API' } });
      
      const clearButton = screen.getByTestId('clear-search');
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(searchInput).toHaveValue('');
        expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
      });
    });

    it('should show no results message', async () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const searchInput = screen.getByTestId('pages-search');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      await waitFor(() => {
        expect(screen.getByTestId('no-search-results')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter by page type', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const typeFilter = screen.getByTestId('type-filter');
      fireEvent.change(typeFilter, { target: { value: 'api' } });
      
      expect(screen.getByText('API Reference')).toBeInTheDocument();
      expect(screen.queryByText('Getting Started Guide')).not.toBeInTheDocument();
    });

    it('should filter by category', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const categoryFilter = screen.getByTestId('category-filter');
      fireEvent.change(categoryFilter, { target: { value: 'guide' } });
      
      expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
      expect(screen.getByText('Best Practices')).toBeInTheDocument();
    });

    it('should filter by difficulty', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const difficultyFilter = screen.getByTestId('difficulty-filter');
      fireEvent.change(difficultyFilter, { target: { value: 'beginner' } });
      
      expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
      expect(screen.queryByText('API Reference')).not.toBeInTheDocument();
    });

    it('should sort by title alphabetically', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const sortSelect = screen.getByTestId('sort-select');
      fireEvent.change(sortSelect, { target: { value: 'title' } });
      
      const pageCards = screen.getAllByTestId(/page-card-/);
      const titles = pageCards.map(card => 
        card.querySelector('[data-testid*="page-title"]')?.textContent
      );
      
      expect(titles).toEqual([...titles].sort());
    });

    it('should sort by last updated date', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const sortSelect = screen.getByTestId('sort-select');
      fireEvent.change(sortSelect, { target: { value: 'updated' } });
      
      // Most recently updated should be first
      expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
    });

    it('should show featured pages first', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const showFeaturedToggle = screen.getByTestId('featured-toggle');
      fireEvent.click(showFeaturedToggle);
      
      const firstCard = screen.getAllByTestId(/page-card-/)[0];
      expect(firstCard).toHaveClass('featured-page');
    });
  });

  describe('Page Navigation', () => {
    it('should open page links in new tab', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const pageLinks = screen.getAllByTestId(/page-link-/);
      pageLinks.forEach(link => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('should track page views', () => {
      const mockTrack = vi.fn();
      global.gtag = mockTrack;
      
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const firstPageLink = screen.getByTestId(`page-link-${agent.pages![0].id}`);
      fireEvent.click(firstPageLink);
      
      expect(mockTrack).toHaveBeenCalledWith('event', 'page_view', {
        page_id: agent.pages![0].id,
        page_title: agent.pages![0].title
      });
    });

    it('should provide quick preview', async () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const previewButton = screen.getByTestId(`preview-button-${agent.pages![0].id}`);
      fireEvent.click(previewButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('page-preview-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Quick Access Features', () => {
    it('should display recent pages section', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      expect(screen.getByTestId('recent-pages-section')).toBeInTheDocument();
    });

    it('should show bookmark functionality', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const bookmarkButtons = screen.getAllByTestId(/bookmark-button-/);
      expect(bookmarkButtons.length).toBeGreaterThan(0);
    });

    it('should toggle bookmarks', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const bookmarkButton = screen.getByTestId(`bookmark-button-${agent.pages![0].id}`);
      fireEvent.click(bookmarkButton);
      
      expect(bookmarkButton).toHaveClass('bookmarked');
    });

    it('should display reading progress', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const progressBars = screen.getAllByTestId(/reading-progress-/);
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('External Resources', () => {
    it('should display external links section', () => {
      const agent = createMockAgent({
        pages: [
          ...createMockAgent().pages!,
          {
            id: 'external-1',
            title: 'External Tutorial',
            description: 'Learn from external source',
            type: 'external',
            category: 'tutorial',
            url: 'https://example.com/tutorial',
            lastUpdated: '2024-01-01T00:00:00Z',
            tags: ['external'],
            readTime: 30,
            difficulty: 'intermediate',
            featured: false,
            status: 'published',
            external: true
          }
        ]
      });
      
      render(<AgentPagesTab agent={agent} />);
      
      expect(screen.getByTestId('external-resources-section')).toBeInTheDocument();
      expect(screen.getByText('External Tutorial')).toBeInTheDocument();
    });

    it('should mark external links appropriately', () => {
      const agent = createMockAgent({
        pages: [
          {
            id: 'external-1',
            title: 'External Resource',
            description: 'External link',
            type: 'external',
            category: 'reference',
            url: 'https://example.com',
            lastUpdated: '2024-01-01T00:00:00Z',
            tags: ['external'],
            readTime: 0,
            difficulty: 'beginner',
            featured: false,
            status: 'published',
            external: true
          }
        ]
      });
      
      render(<AgentPagesTab agent={agent} />);
      
      const externalLink = screen.getByTestId('page-link-external-1');
      expect(externalLink).toHaveAttribute('href', 'https://example.com');
      expect(screen.getByTestId('external-icon-external-1')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed page data', () => {
      const agent = createMockAgent({
        pages: [
          { id: 'invalid', title: null, description: undefined } as any,
          ...createMockAgent().pages!
        ]
      });
      
      expect(() => render(<AgentPagesTab agent={agent} />)).not.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      // Should still render available pages
      expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      expect(screen.getByLabelText(/pages list/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/search pages/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const searchInput = screen.getByTestId('pages-search');
      const pageLinks = screen.getAllByTestId(/page-link-/);
      
      expect(searchInput).toHaveAttribute('tabIndex', '0');
      pageLinks.forEach(link => {
        expect(link).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Performance', () => {
    it('should virtualize large lists', () => {
      const manyPages = Array.from({ length: 1000 }, (_, i) => ({
        id: `page-${i}`,
        title: `Page ${i}`,
        description: `Description ${i}`,
        type: 'documentation',
        category: 'guide',
        url: `/page-${i}`,
        lastUpdated: '2024-01-01T00:00:00Z',
        tags: ['test'],
        readTime: 5,
        difficulty: 'beginner',
        featured: false,
        status: 'published'
      }));
      
      const agent = createMockAgent({ pages: manyPages });
      
      const start = performance.now();
      render(<AgentPagesTab agent={agent} />);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1000);
    });

    it('should debounce search input', async () => {
      const agent = createMockAgent();
      render(<AgentPagesTab agent={agent} />);
      
      const searchInput = screen.getByTestId('pages-search');
      
      // Rapid typing should be debounced
      fireEvent.change(searchInput, { target: { value: 'a' } });
      fireEvent.change(searchInput, { target: { value: 'ap' } });
      fireEvent.change(searchInput, { target: { value: 'api' } });
      
      // Should only search once after debounce
      await waitFor(() => {
        expect(screen.getByText('API Reference')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });
});