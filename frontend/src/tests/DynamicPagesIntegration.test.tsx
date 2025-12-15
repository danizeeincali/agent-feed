/**
 * Integration tests for Dynamic Pages real data implementation
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PageManager from '../components/PageManager';
import DynamicAgentPageRenderer from '../components/DynamicAgentPageRenderer';
import { apiService } from '../services/api';
import { DynamicPage } from '../types/page.types';

// Mock the API service
jest.mock('../services/api', () => ({
  apiService: {
    getDynamicPages: jest.fn(),
    getDynamicPage: jest.fn(),
    createDynamicPage: jest.fn(),
    updateDynamicPage: jest.fn(),
    deleteDynamicPage: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }
}));

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ agentId: 'test-agent', pageId: 'test-page' })
}));

describe('Dynamic Pages Real Data Integration', () => {
  const mockPages: DynamicPage[] = [
    {
      id: 'page-1',
      agent_id: 'test-agent',
      title: 'Test Dashboard',
      description: 'A test dashboard page',
      content_type: 'markdown',
      content_value: '# Test Dashboard\n\nThis is a test page.',
      page_type: 'dynamic',
      status: 'published',
      version: 1,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      access_count: 5
    },
    {
      id: 'page-2',
      agent_id: 'test-agent',
      title: 'Task Manager',
      description: 'Task management interface',
      content_type: 'component',
      content_value: '<div>Task Manager Component</div>',
      page_type: 'persistent',
      status: 'draft',
      version: 1,
      created_at: '2025-01-01T01:00:00Z',
      updated_at: '2025-01-01T01:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PageManager Component', () => {
    it('should load and display pages from API', async () => {
      (apiService.getDynamicPages as jest.Mock).mockResolvedValue({
        success: true,
        agent_id: 'test-agent',
        pages: mockPages,
        total: 2,
        limit: 20,
        offset: 0,
        has_more: false
      });

      render(
        <BrowserRouter>
          <PageManager agentId="test-agent" />
        </BrowserRouter>
      );

      // Should show loading state initially
      expect(screen.getByText('Loading pages...')).toBeInTheDocument();

      // Wait for pages to load
      await waitFor(() => {
        expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Task Manager')).toBeInTheDocument();
      });

      // Verify API was called
      expect(apiService.getDynamicPages).toHaveBeenCalledWith('test-agent', {
        limit: 20,
        offset: 0,
        sort_by: 'updated_at',
        sort_order: 'desc'
      });
    });

    it('should handle API errors gracefully', async () => {
      (apiService.getDynamicPages as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Failed to load pages',
        pages: [],
        total: 0,
        has_more: false
      });

      render(
        <BrowserRouter>
          <PageManager agentId="test-agent" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load pages')).toBeInTheDocument();
      });
    });

    it('should show empty state when no pages exist', async () => {
      (apiService.getDynamicPages as jest.Mock).mockResolvedValue({
        success: true,
        agent_id: 'test-agent',
        pages: [],
        total: 0,
        limit: 20,
        offset: 0,
        has_more: false
      });

      render(
        <BrowserRouter>
          <PageManager agentId="test-agent" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No pages found')).toBeInTheDocument();
        expect(screen.getByText('Get started by creating your first dynamic page.')).toBeInTheDocument();
      });
    });

    it('should open create page modal when Create Page button is clicked', async () => {
      (apiService.getDynamicPages as jest.Mock).mockResolvedValue({
        success: true,
        agent_id: 'test-agent',
        pages: [],
        total: 0,
        has_more: false
      });

      render(
        <BrowserRouter>
          <PageManager agentId="test-agent" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Create Page')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Page'));

      await waitFor(() => {
        expect(screen.getByText('Create New Page')).toBeInTheDocument();
      });
    });

    it('should filter pages by search query', async () => {
      (apiService.getDynamicPages as jest.Mock).mockResolvedValue({
        success: true,
        agent_id: 'test-agent',
        pages: mockPages,
        total: 2,
        has_more: false
      });

      render(
        <BrowserRouter>
          <PageManager agentId="test-agent" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search pages...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search pages...');
      fireEvent.change(searchInput, { target: { value: 'dashboard' } });

      await waitFor(() => {
        expect(apiService.getDynamicPages).toHaveBeenCalledWith('test-agent', {
          limit: 20,
          offset: 0,
          sort_by: 'updated_at',
          sort_order: 'desc',
          search: 'dashboard'
        });
      });
    });
  });

  describe('DynamicAgentPageRenderer Component', () => {
    it('should load and display a specific page', async () => {
      (apiService.getDynamicPage as jest.Mock).mockResolvedValue({
        success: true,
        page: mockPages[0]
      });

      render(
        <BrowserRouter>
          <DynamicAgentPageRenderer />
        </BrowserRouter>
      );

      // Should show loading state initially
      expect(screen.getByText('Loading dynamic page...')).toBeInTheDocument();

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
        expect(screen.getByText('published')).toBeInTheDocument();
        expect(screen.getByText('dynamic')).toBeInTheDocument();
      });

      // Verify API was called
      expect(apiService.getDynamicPage).toHaveBeenCalledWith('test-agent', 'test-page');
    });

    it('should handle page not found error', async () => {
      (apiService.getDynamicPage as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Page not found',
        page: null
      });

      render(
        <BrowserRouter>
          <DynamicAgentPageRenderer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
        expect(screen.getByText('Page not found')).toBeInTheDocument();
      });
    });

    it('should render different content types correctly', async () => {
      const markdownPage = {
        ...mockPages[0],
        content_type: 'markdown' as const,
        content_value: '# Markdown Content\n\nThis is markdown.'
      };

      (apiService.getDynamicPage as jest.Mock).mockResolvedValue({
        success: true,
        page: markdownPage
      });

      render(
        <BrowserRouter>
          <DynamicAgentPageRenderer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
        // Content should be rendered (though exact rendering depends on markdown parser)
        expect(screen.getByText('markdown')).toBeInTheDocument();
      });
    });

    it('should show refresh button and handle refresh action', async () => {
      (apiService.getDynamicPage as jest.Mock).mockResolvedValue({
        success: true,
        page: mockPages[0]
      });

      render(
        <BrowserRouter>
          <DynamicAgentPageRenderer />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Refresh page')).toBeInTheDocument();
      });

      const refreshButton = screen.getByTitle('Refresh page');
      fireEvent.click(refreshButton);

      // Should call API again
      await waitFor(() => {
        expect(apiService.getDynamicPage).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should register for real-time updates', () => {
      render(
        <BrowserRouter>
          <PageManager agentId="test-agent" />
        </BrowserRouter>
      );

      expect(apiService.on).toHaveBeenCalledWith('dynamic_pages_updated', expect.any(Function));
    });

    it('should clean up event listeners on unmount', () => {
      const { unmount } = render(
        <BrowserRouter>
          <PageManager agentId="test-agent" />
        </BrowserRouter>
      );

      unmount();

      expect(apiService.off).toHaveBeenCalledWith('dynamic_pages_updated', expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (apiService.getDynamicPages as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <BrowserRouter>
          <PageManager agentId="test-agent" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });
});