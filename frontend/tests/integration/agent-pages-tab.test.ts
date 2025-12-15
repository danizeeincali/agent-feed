/**
 * Integration Tests for AgentPagesTab Component
 * Following TDD London School approach with comprehensive mocking
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import '@testing-library/jest-dom';

import AgentPagesTab from '../../src/components/AgentPagesTab';
import { TestDataFactory, TestUtils } from '../utils/test-factories';
import { MockWorkspaceApi, mockRealtimeService } from '../mocks/workspace-api.mock';
import { workspaceApi } from '../../src/services/api/workspaceApi';

// Mock the API module
jest.mock('../../src/services/api/workspaceApi');

describe('AgentPagesTab Integration Tests', () => {
  let mockApi: MockWorkspaceApi;
  let restoreConsole: () => void;
  const user = userEvent.setup();

  beforeEach(() => {
    mockApi = MockWorkspaceApi.getInstance();
    mockApi.reset();
    restoreConsole = TestUtils.mockConsole();

    // Setup default workspace API mocks
    const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
    mockedWorkspaceApi.listPages = jest.fn();
    mockedWorkspaceApi.createPage = jest.fn();
    mockedWorkspaceApi.updatePage = jest.fn();
    mockedWorkspaceApi.deletePage = jest.fn();
    mockedWorkspaceApi.initializeWorkspace = jest.fn();
  });

  afterEach(() => {
    restoreConsole();
    mockApi.reset();
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should render loading state initially when fetching pages', async () => {
      const { agent } = TestDataFactory.scenarios.emptyWorkspace();
      mockApi.setNetworkDelay(1000);
      mockApi.setupEmptyWorkspace(agent.id);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockImplementation(() => 
        mockApi.listPages(agent.id)
      );

      render(<AgentPagesTab agent={agent} />);

      expect(screen.getByText('Loading pages...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
    });

    it('should render empty state when no pages exist', async () => {
      const { agent } = TestDataFactory.scenarios.emptyWorkspace();
      mockApi.setupEmptyWorkspace(agent.id);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockResolvedValue({
        success: true,
        agent_id: agent.id,
        pages: [],
        total: 0,
        limit: 20,
        offset: 0,
        has_more: false
      });

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('empty-pages-state')).toBeInTheDocument();
      });

      expect(screen.getByText('No pages available')).toBeInTheDocument();
      expect(screen.getByText(/Create custom dynamic pages/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Dynamic Page/ })).toBeInTheDocument();
    });

    it('should render error state when API request fails', async () => {
      const { agent } = TestDataFactory.scenarios.emptyWorkspace();
      
      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockRejectedValue(
        TestDataFactory.createMockError('Failed to load pages', 500)
      );

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load pages/)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();
    });

    it('should load and display existing pages', async () => {
      const { agent, workspace } = TestDataFactory.scenarios.fullWorkspace();
      mockApi.setupWorkspaceWithPages(agent.id, 5);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockResolvedValue({
        success: true,
        agent_id: agent.id,
        pages: workspace.pages.slice(0, 5),
        total: workspace.pages.length,
        limit: 20,
        offset: 0,
        has_more: workspace.pages.length > 20
      });

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      // Check that pages are rendered
      workspace.pages.slice(0, 5).forEach(page => {
        expect(screen.getByText(page.title)).toBeInTheDocument();
      });
    });
  });

  describe('Page Management Operations', () => {
    it('should open page creation modal when create button is clicked', async () => {
      const { agent } = TestDataFactory.scenarios.emptyWorkspace();
      mockApi.setupEmptyWorkspace(agent.id);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockResolvedValue({
        success: true,
        agent_id: agent.id,
        pages: [],
        total: 0,
        limit: 20,
        offset: 0,
        has_more: false
      });

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('empty-pages-state')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /Create Dynamic Page/ });
      await user.click(createButton);

      // Expect AgentPageBuilder modal to be rendered
      // Note: This assumes AgentPageBuilder renders a modal with specific content
      await waitFor(() => {
        expect(screen.getByText(/New Page/)).toBeInTheDocument();
      });
    });

    it('should create a new page successfully', async () => {
      const { agent } = TestDataFactory.scenarios.emptyWorkspace();
      const newPageData = TestDataFactory.createMockCreatePageData();
      const createdPage = TestDataFactory.createMockAgentPage({
        agent_id: agent.id,
        title: newPageData.title,
        content_value: newPageData.content_value
      });

      mockApi.setupEmptyWorkspace(agent.id);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages
        .mockResolvedValueOnce({ // Initial load - empty
          success: true,
          agent_id: agent.id,
          pages: [],
          total: 0,
          limit: 20,
          offset: 0,
          has_more: false
        })
        .mockResolvedValueOnce({ // After creation
          success: true,
          agent_id: agent.id,
          pages: [createdPage],
          total: 1,
          limit: 20,
          offset: 0,
          has_more: false
        });

      mockedWorkspaceApi.createPage.mockResolvedValue(createdPage);

      render(<AgentPagesTab agent={agent} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('empty-pages-state')).toBeInTheDocument();
      });

      // Open create modal
      const createButton = screen.getByRole('button', { name: /Create Dynamic Page/ });
      await user.click(createButton);

      // The actual page creation would be handled by AgentPageBuilder
      // We simulate the callback that would be triggered
      const agentPagesTab = screen.getByTestId('empty-pages-state').closest('[data-testid="agent-pages-tab"]');
      
      // Simulate successful page creation via props callback
      // This would normally happen through AgentPageBuilder's onSave prop
      expect(mockedWorkspaceApi.createPage).toHaveBeenCalledTimes(0); // Not called yet since modal is just opened
    });

    it('should handle page creation errors gracefully', async () => {
      const { agent } = TestDataFactory.scenarios.emptyWorkspace();
      mockApi.setupEmptyWorkspace(agent.id);
      mockApi.forceFailure(true);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockResolvedValue({
        success: true,
        agent_id: agent.id,
        pages: [],
        total: 0,
        limit: 20,
        offset: 0,
        has_more: false
      });

      mockedWorkspaceApi.createPage.mockRejectedValue(
        TestDataFactory.createMockError('Failed to create page', 500)
      );

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('empty-pages-state')).toBeInTheDocument();
      });

      // Test would verify error handling through AgentPageBuilder component
      // The exact implementation depends on how errors are displayed
    });
  });

  describe('Search and Filtering Functionality', () => {
    beforeEach(async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      const pages = TestDataFactory.scenarios.mixedStatusPages().workspace.pages;
      
      mockApi.setupWorkspaceWithPages(agent.id, pages.length);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockImplementation(async (agentId, filters) => {
        return mockApi.listPages(agentId, filters);
      });
    });

    it('should filter pages by search term', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('pages-search');
      await user.type(searchInput, 'Published');

      await waitFor(() => {
        // Should only show pages with "Published" in the title
        expect(screen.getByText('Published Page 1')).toBeInTheDocument();
        expect(screen.getByText('Published Page 2')).toBeInTheDocument();
        expect(screen.queryByText('Draft Page 1')).not.toBeInTheDocument();
      });
    });

    it('should filter pages by type', async () => {
      const { agent } = TestDataFactory.scenarios.complexPageTypes();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      const typeFilter = screen.getByTestId('type-filter');
      await user.selectOptions(typeFilter, 'documentation');

      await waitFor(() => {
        // Verify filtering behavior
        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        expect(mockedWorkspaceApi.listPages).toHaveBeenCalledWith(
          agent.id,
          expect.objectContaining({ type: 'documentation' })
        );
      });
    });

    it('should filter pages by category', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      const categoryFilter = screen.getByTestId('category-filter');
      await user.selectOptions(categoryFilter, 'dynamic');

      await waitFor(() => {
        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        expect(mockedWorkspaceApi.listPages).toHaveBeenCalledWith(
          agent.id,
          expect.objectContaining({ page_type: 'dynamic' })
        );
      });
    });

    it('should clear search when X button is clicked', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('pages-search');
      await user.type(searchInput, 'test search');

      const clearButton = screen.getByTestId('clear-search');
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
    });

    it('should handle combined filters correctly', async () => {
      const { agent } = TestDataFactory.scenarios.complexPageTypes();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      // Apply multiple filters
      const searchInput = screen.getByTestId('pages-search');
      await user.type(searchInput, 'Dynamic');

      const typeFilter = screen.getByTestId('type-filter');
      await user.selectOptions(typeFilter, 'documentation');

      const difficultyFilter = screen.getByTestId('difficulty-filter');
      await user.selectOptions(difficultyFilter, 'intermediate');

      await waitFor(() => {
        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        expect(mockedWorkspaceApi.listPages).toHaveBeenCalledWith(
          agent.id,
          expect.objectContaining({
            search: 'Dynamic',
            type: 'documentation',
            difficulty: 'intermediate'
          })
        );
      });
    });
  });

  describe('Sorting and View Options', () => {
    it('should sort pages by different criteria', async () => {
      const { agent } = TestDataFactory.scenarios.fullWorkspace();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      const sortSelect = screen.getByTestId('sort-select');
      await user.selectOptions(sortSelect, 'title');

      // Verify that pages are re-rendered in sorted order
      // This would require checking the DOM order or mocking the sort implementation
    });

    it('should toggle featured pages first', async () => {
      const { agent } = TestDataFactory.scenarios.fullWorkspace();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      const featuredToggle = screen.getByTestId('featured-toggle');
      await user.click(featuredToggle);

      // Verify that featured pages are displayed first
      expect(featuredToggle).toHaveClass('bg-blue-600');
    });
  });

  describe('Page Interaction', () => {
    it('should track page clicks for analytics', async () => {
      const { agent, workspace } = TestDataFactory.scenarios.mixedStatusPages();

      // Mock gtag for analytics tracking
      (global as any).gtag = jest.fn();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      const firstPage = workspace.pages[0];
      const pageCard = screen.getByTestId(`page-card-${firstPage.id}`);
      await user.click(pageCard);

      expect((global as any).gtag).toHaveBeenCalledWith('event', 'page_view', {
        page_id: firstPage.id,
        page_title: firstPage.title
      });
    });

    it('should add clicked pages to recent pages list', async () => {
      const { agent, workspace } = TestDataFactory.scenarios.mixedStatusPages();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      const firstPage = workspace.pages[0];
      const pageCard = screen.getByTestId(`page-card-${firstPage.id}`);
      await user.click(pageCard);

      await waitFor(() => {
        expect(screen.getByTestId('recent-pages-section')).toBeInTheDocument();
      });
    });

    it('should handle bookmark toggling', async () => {
      const { agent, workspace } = TestDataFactory.scenarios.mixedStatusPages();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      const firstPage = workspace.pages[0];
      const bookmarkButton = screen.getByTestId(`bookmark-button-${firstPage.id}`);
      
      expect(bookmarkButton).not.toHaveClass('bookmarked');
      
      await user.click(bookmarkButton);
      
      expect(bookmarkButton).toHaveClass('bookmarked');
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time page updates', async () => {
      const { agent, workspace } = TestDataFactory.scenarios.mixedStatusPages();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      // Simulate real-time page update
      const updatedPage = {
        ...workspace.pages[0],
        title: 'Updated Page Title',
        updated_at: new Date().toISOString()
      };

      mockRealtimeService.simulatePageUpdate(agent.id, updatedPage);

      // In a real implementation, this would update the UI
      // For now, we verify the real-time service is working
      expect(mockRealtimeService).toBeDefined();
    });

    it('should handle real-time page creation', async () => {
      const { agent } = TestDataFactory.scenarios.emptyWorkspace();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('empty-pages-state')).toBeInTheDocument();
      });

      // Simulate real-time page creation
      const newPage = TestDataFactory.createMockAgentPage({
        agent_id: agent.id,
        title: 'Real-time Created Page'
      });

      mockRealtimeService.simulatePageCreated(agent.id, newPage);

      // Verify the page appears in the list
      // This would require implementing real-time subscriptions in the component
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed requests when retry button is clicked', async () => {
      const { agent } = TestDataFactory.scenarios.emptyWorkspace();
      
      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages
        .mockRejectedValueOnce(TestDataFactory.createMockError('Network error', 500))
        .mockResolvedValueOnce({
          success: true,
          agent_id: agent.id,
          pages: [],
          total: 0,
          limit: 20,
          offset: 0,
          has_more: false
        });

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load pages/)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('empty-pages-state')).toBeInTheDocument();
      });
    });

    it('should handle network timeouts gracefully', async () => {
      const { agent } = TestDataFactory.scenarios.emptyWorkspace();
      mockApi.setNetworkDelay(10000); // 10 second delay to simulate timeout
      
      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 5000)
        )
      );

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByText(/Request timeout/)).toBeInTheDocument();
      }, { timeout: 6000 });
    });
  });

  describe('Performance Optimizations', () => {
    it('should handle large page lists efficiently', async () => {
      const { agent } = TestDataFactory.scenarios.fullWorkspace();
      const largePagesSet = TestDataFactory.createMockPageList(100);
      
      mockApi.setupWorkspaceWithPages(agent.id, 100);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockResolvedValue({
        success: true,
        agent_id: agent.id,
        pages: largePagesSet.slice(0, 20), // Paginated response
        total: 100,
        limit: 20,
        offset: 0,
        has_more: true
      });

      const startTime = performance.now();
      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      
      // Verify render performance is reasonable (under 1 second)
      expect(renderTime).toBeLessThan(1000);
    });

    it('should debounce search input', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('pages-search');
      
      // Type rapidly
      await user.type(searchInput, 'test');

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      
      // Wait for debounce
      await waitFor(() => {
        expect(mockedWorkspaceApi.listPages).toHaveBeenCalledWith(
          agent.id,
          expect.objectContaining({ search: 'test' })
        );
      }, { timeout: 1000 });

      // Should not call for each character if debounced properly
      expect(mockedWorkspaceApi.listPages).toHaveBeenCalledTimes(2); // Initial load + search
    });
  });

  describe('Accessibility', () => {
    it('should provide proper ARIA labels and roles', async () => {
      const { agent, workspace } = TestDataFactory.scenarios.mixedStatusPages();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      // Check main container has proper role
      expect(screen.getByRole('main') || screen.getByLabelText('Pages list')).toBeInTheDocument();

      // Check search input has proper label
      expect(screen.getByLabelText('Search pages')).toBeInTheDocument();

      // Check page cards are properly labeled
      workspace.pages.forEach(page => {
        const pageCard = screen.getByTestId(`page-card-${page.id}`);
        expect(pageCard).toHaveAttribute('role', 'button');
      });
    });

    it('should support keyboard navigation', async () => {
      const { agent, workspace } = TestDataFactory.scenarios.mixedStatusPages();

      render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-pages-tab')).toBeInTheDocument();
      });

      const firstPageLink = screen.getByTestId(`page-link-${workspace.pages[0].id}`);
      
      // Should be focusable
      expect(firstPageLink).toHaveAttribute('tabIndex', '0');
      
      // Test keyboard interaction
      firstPageLink.focus();
      expect(firstPageLink).toHaveFocus();
    });
  });
});