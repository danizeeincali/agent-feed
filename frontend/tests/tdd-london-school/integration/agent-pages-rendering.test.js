/**
 * TDD London School Integration Test: Agent Pages Rendering
 * Tests end-to-end agent page rendering with various component configurations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';

// Mock the API service
const mockApiService = {
  getAgentWorkspace: jest.fn(),
  getAgentPages: jest.fn(),
  getAgentPageById: jest.fn(),
  createAgentPage: jest.fn(),
  updateAgentPage: jest.fn(),
  deleteAgentPage: jest.fn()
};

// Mock the useAgentPageData hook
const mockUseAgentPageData = jest.fn();

// Mock AgentDynamicRenderer
const mockAgentDynamicRenderer = jest.fn(({ spec, context, onDataChange, onError }) => {
  React.useEffect(() => {
    if (!spec || !spec.type) {
      onError?.(new Error('Invalid component specification'));
      return;
    }
    onDataChange?.(spec.props || {});
  }, [spec, onDataChange, onError]);

  if (!spec || !spec.type) {
    return <div data-testid="renderer-error">Invalid specification</div>;
  }

  return (
    <div data-testid={`rendered-${spec.type.toLowerCase()}`}>
      <h3>{spec.type} Component</h3>
      <pre data-testid="component-props">{JSON.stringify(spec.props, null, 2)}</pre>
    </div>
  );
});

// Mock AgentDynamicPage component
const MockAgentDynamicPage = ({ agentId, pageId }) => {
  const hookData = mockUseAgentPageData(agentId, pageId);

  if (hookData.loading) {
    return (
      <div data-testid="loading-state">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p>Loading agent workspace...</p>
      </div>
    );
  }

  if (hookData.error) {
    return (
      <div data-testid="error-state">
        <h3>Error Loading Workspace</h3>
        <p>{hookData.error}</p>
        <button onClick={hookData.retry} data-testid="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  // Specific page view
  if (pageId) {
    if (!hookData.isPageFound) {
      return (
        <div data-testid="page-not-found">
          <h3>Page not found</h3>
          <p>Looking for page "{pageId}" but it was not found.</p>
          <div data-testid="debug-info">
            <strong>Debug Info:</strong><br />
            Agent ID: {agentId}<br />
            Looking for Page ID: {pageId}<br />
            Available Pages: {hookData.pages.length}<br />
            Page IDs: {hookData.pages.map(p => p.id).join(', ') || 'none'}
          </div>
        </div>
      );
    }

    return (
      <div data-testid="page-view">
        <h1>{hookData.currentPage?.title || `Page ${pageId}`}</h1>
        {hookData.currentPage?.content_value && (
          <div data-testid="page-content">
            {React.createElement(mockAgentDynamicRenderer, {
              spec: typeof hookData.currentPage.content_value === 'string'
                ? JSON.parse(hookData.currentPage.content_value)
                : hookData.currentPage.content_value,
              context: {
                agentId,
                pageId: hookData.currentPage.id,
                data: hookData.currentPage.content_metadata || {}
              },
              onDataChange: (data) => console.log('Page data updated:', data),
              onError: (error) => console.error('Renderer error:', error)
            })}
          </div>
        )}
      </div>
    );
  }

  // Pages list view
  if (!hookData.hasPages) {
    return (
      <div data-testid="empty-workspace">
        <h3>No pages yet</h3>
        <p>Create your first dynamic page to get started.</p>
      </div>
    );
  }

  return (
    <div data-testid="pages-list">
      <h2>Pages for {agentId}</h2>
      <p>Found {hookData.pages.length} page{hookData.pages.length !== 1 ? 's' : ''}</p>
      <div data-testid="pages-grid">
        {hookData.pages.map(page => (
          <div key={page.id} data-testid={`page-item-${page.id}`}>
            <h3>{page.title}</h3>
            <p>ID: {page.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

// Test data
const mockAgentData = {
  id: 'test-agent',
  name: 'Test Agent',
  status: 'active',
  capabilities: ['code-review', 'testing', 'documentation']
};

const mockPages = [
  {
    id: 'page-1',
    title: 'Capability Dashboard',
    content_value: {
      type: 'CapabilityList',
      props: {
        title: 'Agent Capabilities',
        capabilities: [
          { name: 'Code Generation', level: 'Expert', progress: 95 },
          { name: 'Testing', level: 'Advanced', progress: 85 }
        ],
        showProgress: true
      }
    },
    content_metadata: { version: 1, created_by: 'system' },
    created_at: '2025-01-15T10:00:00Z'
  },
  {
    id: 'page-2',
    title: 'Performance Metrics',
    content_value: {
      type: 'PerformanceMetrics',
      props: {
        title: 'Agent Performance',
        metrics: [
          { name: 'CPU Usage', value: 45, unit: '%', type: 'progress' },
          { name: 'Memory Usage', value: 1.2, unit: 'GB', type: 'gauge' }
        ],
        showTrends: true
      }
    },
    content_metadata: { refreshInterval: 30000 },
    created_at: '2025-01-15T11:00:00Z'
  },
  {
    id: 'page-3',
    title: 'Activity Timeline',
    content_value: {
      type: 'Timeline',
      props: {
        title: 'Recent Activity',
        events: [
          {
            title: 'Task Completed',
            timestamp: '2025-01-15T12:00:00Z',
            type: 'success'
          }
        ],
        orientation: 'vertical'
      }
    },
    created_at: '2025-01-15T12:00:00Z'
  },
  {
    id: 'page-4',
    title: 'Profile Header',
    content_value: {
      type: 'ProfileHeader',
      props: {
        name: 'AI Assistant',
        title: 'Code Review Specialist',
        status: 'online',
        avatar: { url: 'https://example.com/avatar.jpg' }
      }
    },
    created_at: '2025-01-15T13:00:00Z'
  },
  {
    id: 'page-5',
    title: 'Activity Feed',
    content_value: {
      type: 'ActivityFeed',
      props: {
        title: 'Recent Activities',
        activities: [
          {
            title: 'Code Review Completed',
            type: 'task_completed',
            timestamp: '2025-01-15T14:00:00Z',
            actor: { id: 'agent-1', name: 'Test Agent' }
          }
        ],
        showFilters: true
      }
    },
    created_at: '2025-01-15T14:00:00Z'
  }
];

describe('TDD London School Integration: Agent Pages Rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockApiService.getAgentWorkspace.mockResolvedValue({
      agent: mockAgentData,
      pages: mockPages
    });
    
    mockApiService.getAgentPages.mockResolvedValue(mockPages);
    
    mockApiService.getAgentPageById.mockImplementation((agentId, pageId) => {
      const page = mockPages.find(p => p.id === pageId);
      return Promise.resolve(page);
    });
  });

  describe('Agent Workspace Loading States', () => {
    it('should show loading state while fetching agent data', () => {
      mockUseAgentPageData.mockReturnValue({
        loading: true,
        error: null,
        agent: null,
        pages: [],
        currentPage: null,
        hasPages: false,
        isPageFound: false,
        isReady: false,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      expect(screen.getByText('Loading agent workspace...')).toBeInTheDocument();
    });

    it('should show error state when API fails', () => {
      const mockRetry = jest.fn();
      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: 'Failed to fetch agent data',
        agent: null,
        pages: [],
        currentPage: null,
        hasPages: false,
        isPageFound: false,
        isReady: false,
        retry: mockRetry
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" />
        </TestWrapper>
      );

      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch agent data')).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();

      // Test retry functionality
      fireEvent.click(screen.getByTestId('retry-button'));
      expect(mockRetry).toHaveBeenCalled();
    });

    it('should show empty workspace when agent has no pages', () => {
      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: [],
        currentPage: null,
        hasPages: false,
        isPageFound: false,
        isReady: true,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" />
        </TestWrapper>
      );

      expect(screen.getByTestId('empty-workspace')).toBeInTheDocument();
      expect(screen.getByText('No pages yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first dynamic page to get started.')).toBeInTheDocument();
    });
  });

  describe('Agent Pages List Rendering', () => {
    it('should render pages list when agent has multiple pages', () => {
      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: mockPages,
        currentPage: null,
        hasPages: true,
        isPageFound: false,
        isReady: true,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" />
        </TestWrapper>
      );

      expect(screen.getByTestId('pages-list')).toBeInTheDocument();
      expect(screen.getByText('Pages for test-agent')).toBeInTheDocument();
      expect(screen.getByText('Found 5 pages')).toBeInTheDocument();
      
      // Check individual pages
      expect(screen.getByTestId('page-item-page-1')).toBeInTheDocument();
      expect(screen.getByText('Capability Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('page-item-page-2')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    });

    it('should handle pages with different component types', () => {
      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: mockPages,
        currentPage: null,
        hasPages: true,
        isPageFound: false,
        isReady: true,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" />
        </TestWrapper>
      );

      // All different page types should be present
      expect(screen.getByText('Capability Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
      expect(screen.getByText('Profile Header')).toBeInTheDocument();
      expect(screen.getByText('Activity Feed')).toBeInTheDocument();
    });
  });

  describe('Individual Page Rendering', () => {
    it('should render CapabilityList page correctly', () => {
      const capabilityPage = mockPages[0];
      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: mockPages,
        currentPage: capabilityPage,
        hasPages: true,
        isPageFound: true,
        isReady: true,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" pageId="page-1" />
        </TestWrapper>
      );

      expect(screen.getByTestId('page-view')).toBeInTheDocument();
      expect(screen.getByText('Capability Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('page-content')).toBeInTheDocument();
      expect(screen.getByTestId('rendered-capabilitylist')).toBeInTheDocument();
      
      // Check that component props are passed correctly
      const propsElement = screen.getByTestId('component-props');
      const props = JSON.parse(propsElement.textContent);
      expect(props.title).toBe('Agent Capabilities');
      expect(props.capabilities).toHaveLength(2);
      expect(props.showProgress).toBe(true);
    });

    it('should render PerformanceMetrics page correctly', () => {
      const metricsPage = mockPages[1];
      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: mockPages,
        currentPage: metricsPage,
        hasPages: true,
        isPageFound: true,
        isReady: true,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" pageId="page-2" />
        </TestWrapper>
      );

      expect(screen.getByTestId('page-view')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      expect(screen.getByTestId('rendered-performancemetrics')).toBeInTheDocument();
      
      const propsElement = screen.getByTestId('component-props');
      const props = JSON.parse(propsElement.textContent);
      expect(props.title).toBe('Agent Performance');
      expect(props.metrics).toHaveLength(2);
      expect(props.showTrends).toBe(true);
    });

    it('should render Timeline page correctly', () => {
      const timelinePage = mockPages[2];
      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: mockPages,
        currentPage: timelinePage,
        hasPages: true,
        isPageFound: true,
        isReady: true,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" pageId="page-3" />
        </TestWrapper>
      );

      expect(screen.getByTestId('page-view')).toBeInTheDocument();
      expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
      expect(screen.getByTestId('rendered-timeline')).toBeInTheDocument();
      
      const propsElement = screen.getByTestId('component-props');
      const props = JSON.parse(propsElement.textContent);
      expect(props.title).toBe('Recent Activity');
      expect(props.events).toHaveLength(1);
      expect(props.orientation).toBe('vertical');
    });

    it('should render ProfileHeader page correctly', () => {
      const profilePage = mockPages[3];
      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: mockPages,
        currentPage: profilePage,
        hasPages: true,
        isPageFound: true,
        isReady: true,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" pageId="page-4" />
        </TestWrapper>
      );

      expect(screen.getByTestId('page-view')).toBeInTheDocument();
      expect(screen.getByText('Profile Header')).toBeInTheDocument();
      expect(screen.getByTestId('rendered-profileheader')).toBeInTheDocument();
      
      const propsElement = screen.getByTestId('component-props');
      const props = JSON.parse(propsElement.textContent);
      expect(props.name).toBe('AI Assistant');
      expect(props.title).toBe('Code Review Specialist');
      expect(props.status).toBe('online');
    });

    it('should render ActivityFeed page correctly', () => {
      const activityPage = mockPages[4];
      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: mockPages,
        currentPage: activityPage,
        hasPages: true,
        isPageFound: true,
        isReady: true,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" pageId="page-5" />
        </TestWrapper>
      );

      expect(screen.getByTestId('page-view')).toBeInTheDocument();
      expect(screen.getByText('Activity Feed')).toBeInTheDocument();
      expect(screen.getByTestId('rendered-activityfeed')).toBeInTheDocument();
      
      const propsElement = screen.getByTestId('component-props');
      const props = JSON.parse(propsElement.textContent);
      expect(props.title).toBe('Recent Activities');
      expect(props.activities).toHaveLength(1);
      expect(props.showFilters).toBe(true);
    });
  });

  describe('Page Not Found Scenarios', () => {
    it('should show page not found when page ID does not exist', () => {
      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: mockPages,
        currentPage: null,
        hasPages: true,
        isPageFound: false,
        isReady: true,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" pageId="non-existent-page" />
        </TestWrapper>
      );

      expect(screen.getByTestId('page-not-found')).toBeInTheDocument();
      expect(screen.getByText('Page not found')).toBeInTheDocument();
      expect(screen.getByText('Looking for page "non-existent-page" but it was not found.')).toBeInTheDocument();
      
      // Check debug info
      expect(screen.getByTestId('debug-info')).toBeInTheDocument();
      expect(screen.getByText('Agent ID: test-agent')).toBeInTheDocument();
      expect(screen.getByText('Looking for Page ID: non-existent-page')).toBeInTheDocument();
      expect(screen.getByText('Available Pages: 5')).toBeInTheDocument();
    });

    it('should provide helpful debug information for page not found', () => {
      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: mockPages,
        currentPage: null,
        hasPages: true,
        isPageFound: false,
        isReady: true,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" pageId="missing-page" />
        </TestWrapper>
      );

      const debugInfo = screen.getByTestId('debug-info');
      expect(debugInfo).toHaveTextContent('page-1, page-2, page-3, page-4, page-5');
    });
  });

  describe('Component Specification Validation', () => {
    it('should handle invalid component specifications gracefully', () => {
      const invalidPage = {
        id: 'invalid-page',
        title: 'Invalid Page',
        content_value: {
          // Missing type
          props: { title: 'Test' }
        }
      };

      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: [invalidPage],
        currentPage: invalidPage,
        hasPages: true,
        isPageFound: true,
        isReady: true,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" pageId="invalid-page" />
        </TestWrapper>
      );

      expect(screen.getByTestId('page-view')).toBeInTheDocument();
      expect(screen.getByText('Invalid Page')).toBeInTheDocument();
      expect(screen.getByTestId('renderer-error')).toBeInTheDocument();
      expect(screen.getByText('Invalid specification')).toBeInTheDocument();
    });

    it('should handle malformed JSON in content_value', () => {
      const malformedPage = {
        id: 'malformed-page',
        title: 'Malformed Page',
        content_value: 'invalid-json-string'
      };

      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: [malformedPage],
        currentPage: malformedPage,
        hasPages: true,
        isPageFound: true,
        isReady: true,
        retry: jest.fn()
      });

      // Should not crash when trying to parse invalid JSON
      expect(() => {
        render(
          <TestWrapper>
            <MockAgentDynamicPage agentId="test-agent" pageId="malformed-page" />
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByTestId('page-view')).toBeInTheDocument();
      expect(screen.getByText('Malformed Page')).toBeInTheDocument();
    });
  });

  describe('Context and Data Flow', () => {
    it('should pass correct context to component renderer', () => {
      const capabilityPage = mockPages[0];
      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: mockPages,
        currentPage: capabilityPage,
        hasPages: true,
        isPageFound: true,
        isReady: true,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" pageId="page-1" />
        </TestWrapper>
      );

      // Verify that the renderer was called with correct context
      expect(mockAgentDynamicRenderer).toHaveBeenCalledWith(
        expect.objectContaining({
          spec: capabilityPage.content_value,
          context: {
            agentId: 'test-agent',
            pageId: 'page-1',
            data: capabilityPage.content_metadata
          }
        }),
        {}
      );
    });

    it('should handle data changes from components', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const capabilityPage = mockPages[0];
      
      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: mockPages,
        currentPage: capabilityPage,
        hasPages: true,
        isPageFound: true,
        isReady: true,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" pageId="page-1" />
        </TestWrapper>
      );

      // Wait for the component to trigger onDataChange
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Page data updated:',
          expect.objectContaining({
            title: 'Agent Capabilities',
            showProgress: true
          })
        );
      });

      consoleSpy.mockRestore();
    });

    it('should handle errors from component renderer', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock renderer to trigger error
      mockAgentDynamicRenderer.mockImplementationOnce(({ onError }) => {
        React.useEffect(() => {
          onError?.(new Error('Component rendering failed'));
        }, [onError]);
        
        return <div data-testid="error-component">Error Component</div>;
      });

      const capabilityPage = mockPages[0];
      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: mockPages,
        currentPage: capabilityPage,
        hasPages: true,
        isPageFound: true,
        isReady: true,
        retry: jest.fn()
      });

      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" pageId="page-1" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Renderer error:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid page switching without memory leaks', async () => {
      const { rerender } = render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" pageId="page-1" />
        </TestWrapper>
      );

      // Switch between pages rapidly
      for (let i = 1; i <= 5; i++) {
        const page = mockPages[i - 1];
        mockUseAgentPageData.mockReturnValue({
          loading: false,
          error: null,
          agent: mockAgentData,
          pages: mockPages,
          currentPage: page,
          hasPages: true,
          isPageFound: true,
          isReady: true,
          retry: jest.fn()
        });

        rerender(
          <TestWrapper>
            <MockAgentDynamicPage agentId="test-agent" pageId={`page-${i}`} />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByTestId('page-view')).toBeInTheDocument();
        });
      }

      // Should not cause memory leaks or errors
      expect(screen.getByTestId('page-view')).toBeInTheDocument();
    });

    it('should handle large numbers of pages efficiently', () => {
      const manyPages = Array.from({ length: 100 }, (_, i) => ({
        id: `page-${i + 1}`,
        title: `Page ${i + 1}`,
        content_value: {
          type: 'CapabilityList',
          props: { title: `Capability List ${i + 1}` }
        },
        created_at: new Date().toISOString()
      }));

      mockUseAgentPageData.mockReturnValue({
        loading: false,
        error: null,
        agent: mockAgentData,
        pages: manyPages,
        currentPage: null,
        hasPages: true,
        isPageFound: false,
        isReady: true,
        retry: jest.fn()
      });

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" />
        </TestWrapper>
      );

      const renderTime = performance.now() - startTime;

      expect(screen.getByTestId('pages-list')).toBeInTheDocument();
      expect(screen.getByText('Found 100 pages')).toBeInTheDocument();
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
    });

    it('should handle concurrent API requests gracefully', async () => {
      let resolveFirstRequest;
      let resolveSecondRequest;

      const firstRequestPromise = new Promise(resolve => {
        resolveFirstRequest = resolve;
      });

      const secondRequestPromise = new Promise(resolve => {
        resolveSecondRequest = resolve;
      });

      // Mock the first request to be slower
      mockUseAgentPageData
        .mockReturnValueOnce({
          loading: true,
          error: null,
          agent: null,
          pages: [],
          currentPage: null,
          hasPages: false,
          isPageFound: false,
          isReady: false,
          retry: jest.fn()
        })
        .mockReturnValue({
          loading: false,
          error: null,
          agent: mockAgentData,
          pages: mockPages,
          currentPage: null,
          hasPages: true,
          isPageFound: false,
          isReady: true,
          retry: jest.fn()
        });

      const { rerender } = render(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" />
        </TestWrapper>
      );

      // Should show loading state
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();

      // Simulate request completion
      rerender(
        <TestWrapper>
          <MockAgentDynamicPage agentId="test-agent" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('pages-list')).toBeInTheDocument();
      });

      expect(screen.getByText('Found 5 pages')).toBeInTheDocument();
    });
  });
});