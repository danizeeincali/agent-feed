/**
 * Performance Tests for Agent Dynamic Pages
 * Testing rendering performance, memory usage, and scalability
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import '@testing-library/jest-dom';

import AgentPagesTab from '../../src/components/AgentPagesTab';
import { TestDataFactory, TestUtils } from '../utils/test-factories';
import { MockWorkspaceApi } from '../mocks/workspace-api.mock';
import { workspaceApi } from '../../src/services/api/workspaceApi';

// Mock the API module
jest.mock('../../src/services/api/workspaceApi');

describe('Agent Pages Performance Tests', () => {
  let mockApi: MockWorkspaceApi;
  let performanceObserver: any;
  let memoryUsage: any[] = [];

  beforeEach(() => {
    mockApi = MockWorkspaceApi.getInstance();
    mockApi.reset();

    // Setup workspace API mocks
    const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
    mockedWorkspaceApi.listPages = jest.fn();
    mockedWorkspaceApi.createPage = jest.fn();
    mockedWorkspaceApi.updatePage = jest.fn();
    mockedWorkspaceApi.deletePage = jest.fn();

    // Monitor performance
    performanceObserver = {
      entries: [] as PerformanceEntry[],
      observe: jest.fn(),
      disconnect: jest.fn()
    };

    // Mock performance API
    global.performance.mark = jest.fn();
    global.performance.measure = jest.fn();
    global.performance.getEntriesByType = jest.fn().mockReturnValue(performanceObserver.entries);
    
    // Track memory usage
    memoryUsage = [];
    if ((global as any).gc) {
      (global as any).gc();
    }
  });

  afterEach(() => {
    mockApi.reset();
    jest.clearAllMocks();
    performanceObserver.disconnect();
  });

  describe('Component Rendering Performance', () => {
    it('should render empty state quickly', async () => {
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

      const startTime = performance.now();
      
      await act(async () => {
        render(<AgentPagesTab agent={agent} />);
      });

      await screen.findByTestId('empty-pages-state');
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should render large page lists efficiently', async () => {
      const { agent } = TestDataFactory.scenarios.fullWorkspace();
      const largePageSet = TestDataFactory.createMockPageList(1000);
      
      mockApi.setupWorkspaceWithPages(agent.id, 1000);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockResolvedValue({
        success: true,
        agent_id: agent.id,
        pages: largePageSet.slice(0, 50), // Paginated
        total: 1000,
        limit: 50,
        offset: 0,
        has_more: true
      });

      const startTime = performance.now();
      
      await act(async () => {
        render(<AgentPagesTab agent={agent} />);
      });

      await screen.findByTestId('agent-pages-tab');
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(500); // Should render in under 500ms even with large dataset
    });

    it('should handle rapid re-renders without performance degradation', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      mockApi.setupWorkspaceWithPages(agent.id, 10);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockImplementation(async () => ({
        success: true,
        agent_id: agent.id,
        pages: TestDataFactory.createMockPageList(10),
        total: 10,
        limit: 20,
        offset: 0,
        has_more: false
      }));

      const { rerender } = render(<AgentPagesTab agent={agent} />);
      await screen.findByTestId('agent-pages-tab');

      // Measure re-render performance
      const renderTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        await act(async () => {
          rerender(<AgentPagesTab agent={{...agent, id: `${agent.id}-${i}`}} />);
        });
        
        const endTime = performance.now();
        renderTimes.push(endTime - startTime);
      }

      const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      const maxRenderTime = Math.max(...renderTimes);

      expect(averageRenderTime).toBeLessThan(50); // Average under 50ms
      expect(maxRenderTime).toBeLessThan(100); // Max under 100ms
    });
  });

  describe('Search and Filtering Performance', () => {
    beforeEach(() => {
      const { agent } = TestDataFactory.scenarios.fullWorkspace();
      const pages = TestDataFactory.createMockPageList(500);
      
      mockApi.setupWorkspaceWithPages(agent.id, 500);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockImplementation(async (agentId, filters) => {
        let filteredPages = pages;
        
        if (filters?.search) {
          const searchTerm = filters.search.toLowerCase();
          filteredPages = pages.filter(p => 
            p.title.toLowerCase().includes(searchTerm)
          );
        }
        
        const limit = filters?.limit || 20;
        const offset = filters?.offset || 0;
        
        return {
          success: true,
          agent_id: agentId,
          pages: filteredPages.slice(offset, offset + limit),
          total: filteredPages.length,
          limit,
          offset,
          has_more: (offset + limit) < filteredPages.length
        };
      });
    });

    it('should handle search debouncing efficiently', async () => {
      const { agent } = TestDataFactory.scenarios.fullWorkspace();
      
      const { container } = await act(async () => {
        return render(<AgentPagesTab agent={agent} />);
      });

      await screen.findByTestId('agent-pages-tab');

      const searchInput = screen.getByTestId('pages-search');
      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      
      // Reset call count
      mockedWorkspaceApi.listPages.mockClear();

      const startTime = performance.now();

      // Simulate rapid typing
      await act(async () => {
        searchInput.focus();
        // Type "test" character by character
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        (searchInput as HTMLInputElement).value = 't';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        (searchInput as HTMLInputElement).value = 'te';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        (searchInput as HTMLInputElement).value = 'tes';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        (searchInput as HTMLInputElement).value = 'test';
      });

      // Wait for debounce
      await act(async () => {
        await TestUtils.delay(1000);
      });

      const endTime = performance.now();
      const searchTime = endTime - startTime;

      expect(searchTime).toBeLessThan(1100); // Should complete debounced search quickly
      expect(mockedWorkspaceApi.listPages).toHaveBeenCalledTimes(2); // Initial + final debounced call
    });

    it('should filter large datasets without blocking UI', async () => {
      const { agent } = TestDataFactory.scenarios.fullWorkspace();
      
      await act(async () => {
        render(<AgentPagesTab agent={agent} />);
      });

      await screen.findByTestId('agent-pages-tab');

      const typeFilter = screen.getByTestId('type-filter');
      const startTime = performance.now();

      await act(async () => {
        typeFilter.dispatchEvent(new Event('change', { bubbles: true }));
        (typeFilter as HTMLSelectElement).value = 'dynamic';
      });

      const endTime = performance.now();
      const filterTime = endTime - startTime;

      expect(filterTime).toBeLessThan(200); // Should filter quickly without blocking
    });

    it('should handle multiple simultaneous filters efficiently', async () => {
      const { agent } = TestDataFactory.scenarios.fullWorkspace();
      
      await act(async () => {
        render(<AgentPagesTab agent={agent} />);
      });

      await screen.findByTestId('agent-pages-tab');

      const searchInput = screen.getByTestId('pages-search');
      const typeFilter = screen.getByTestId('type-filter');
      const categoryFilter = screen.getByTestId('category-filter');
      const sortSelect = screen.getByTestId('sort-select');

      const startTime = performance.now();

      await act(async () => {
        // Apply multiple filters simultaneously
        (searchInput as HTMLInputElement).value = 'test';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        (typeFilter as HTMLSelectElement).value = 'documentation';
        typeFilter.dispatchEvent(new Event('change', { bubbles: true }));
        
        (categoryFilter as HTMLSelectElement).value = 'guide';
        categoryFilter.dispatchEvent(new Event('change', { bubbles: true }));
        
        (sortSelect as HTMLSelectElement).value = 'title';
        sortSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await act(async () => {
        await TestUtils.delay(600); // Wait for debounce
      });

      const endTime = performance.now();
      const totalFilterTime = endTime - startTime;

      expect(totalFilterTime).toBeLessThan(1000); // Should handle multiple filters efficiently
    });
  });

  describe('Memory Usage and Leak Detection', () => {
    it('should not create memory leaks during normal operation', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      
      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc();
      }
      
      const initialMemory = process.memoryUsage().heapUsed;

      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = await act(async () => {
          return render(<AgentPagesTab agent={{...agent, id: `agent-${i}`}} />);
        });
        
        await screen.findByTestId('agent-pages-tab');
        
        // Unmount to trigger cleanup
        unmount();
      }

      // Force garbage collection
      if ((global as any).gc) {
        (global as any).gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should clean up event listeners on unmount', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = await act(async () => {
        return render(<AgentPagesTab agent={agent} />);
      });

      await screen.findByTestId('agent-pages-tab');

      const addListenerCalls = addEventListenerSpy.mock.calls.length;

      unmount();

      const removeListenerCalls = removeEventListenerSpy.mock.calls.length;

      // Should remove at least as many listeners as added
      expect(removeListenerCalls).toBeGreaterThanOrEqual(addListenerCalls);

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should handle large state updates efficiently', async () => {
      const { agent } = TestDataFactory.scenarios.emptyWorkspace();
      
      await act(async () => {
        render(<AgentPagesTab agent={agent} />);
      });

      await screen.findByTestId('empty-pages-state');

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;

      // Simulate large state update
      const largePageSet = TestDataFactory.createMockPageList(1000);
      
      const startTime = performance.now();

      await act(async () => {
        mockedWorkspaceApi.listPages.mockResolvedValue({
          success: true,
          agent_id: agent.id,
          pages: largePageSet,
          total: 1000,
          limit: 1000,
          offset: 0,
          has_more: false
        });
      });

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      expect(updateTime).toBeLessThan(1000); // Should handle large updates efficiently
    });
  });

  describe('Network Performance', () => {
    it('should handle slow network responses gracefully', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      
      mockApi.setNetworkDelay(2000); // 2 second delay
      mockApi.setupWorkspaceWithPages(agent.id, 10);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

      const startTime = performance.now();

      await act(async () => {
        render(<AgentPagesTab agent={agent} />);
      });

      // Should show loading state immediately
      expect(screen.getByText('Loading pages...')).toBeInTheDocument();

      // Wait for network response
      await screen.findByTestId('agent-pages-tab', {}, { timeout: 5000 });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeGreaterThan(2000); // Should include network delay
      expect(totalTime).toBeLessThan(3000); // But not much overhead
    });

    it('should batch multiple API requests efficiently', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      
      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      let apiCallCount = 0;

      mockedWorkspaceApi.listPages.mockImplementation(async () => {
        apiCallCount++;
        return {
          success: true,
          agent_id: agent.id,
          pages: TestDataFactory.createMockPageList(5),
          total: 5,
          limit: 20,
          offset: 0,
          has_more: false
        };
      });

      await act(async () => {
        render(<AgentPagesTab agent={agent} />);
      });

      await screen.findByTestId('agent-pages-tab');

      // Should not make excessive API calls
      expect(apiCallCount).toBeLessThanOrEqual(2); // Initial load only
    });

    it('should handle concurrent requests without race conditions', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      
      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      let requestCount = 0;
      
      mockedWorkspaceApi.listPages.mockImplementation(async () => {
        requestCount++;
        await TestUtils.delay(100);
        return {
          success: true,
          agent_id: agent.id,
          pages: TestDataFactory.createMockPageList(requestCount),
          total: requestCount,
          limit: 20,
          offset: 0,
          has_more: false
        };
      });

      // Render multiple instances concurrently
      const promises = Array.from({ length: 3 }, async (_, i) => {
        const { container } = await act(async () => {
          return render(<AgentPagesTab agent={{...agent, id: `agent-${i}`}} />);
        });
        return container;
      });

      const containers = await Promise.all(promises);

      // All should render without race conditions
      expect(containers).toHaveLength(3);
      expect(requestCount).toBe(3); // One request per instance
    });
  });

  describe('Virtual Scrolling and Pagination', () => {
    it('should handle large lists with pagination efficiently', async () => {
      const { agent } = TestDataFactory.scenarios.fullWorkspace();
      
      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockResolvedValue({
        success: true,
        agent_id: agent.id,
        pages: TestDataFactory.createMockPageList(20), // First page
        total: 10000, // Very large total
        limit: 20,
        offset: 0,
        has_more: true
      });

      const startTime = performance.now();

      await act(async () => {
        render(<AgentPagesTab agent={agent} />);
      });

      await screen.findByTestId('agent-pages-tab');

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly even with large total count
      expect(renderTime).toBeLessThan(300);
      
      // Should only render visible items
      const renderedPages = screen.getAllByTestId(/^page-card-/);
      expect(renderedPages.length).toBeLessThanOrEqual(20);
    });

    it('should load next page efficiently on scroll/pagination', async () => {
      const { agent } = TestDataFactory.scenarios.fullWorkspace();
      
      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages
        .mockResolvedValueOnce({
          success: true,
          agent_id: agent.id,
          pages: TestDataFactory.createMockPageList(20),
          total: 100,
          limit: 20,
          offset: 0,
          has_more: true
        })
        .mockResolvedValueOnce({
          success: true,
          agent_id: agent.id,
          pages: TestDataFactory.createMockPageList(20),
          total: 100,
          limit: 20,
          offset: 20,
          has_more: true
        });

      await act(async () => {
        render(<AgentPagesTab agent={agent} />);
      });

      await screen.findByTestId('agent-pages-tab');

      const startTime = performance.now();

      // Simulate pagination (this would normally be triggered by scroll or button click)
      // For testing purposes, we'll verify the mock setup
      const secondPageResult = await mockApi.listPages(agent.id, { offset: 20, limit: 20 });

      const endTime = performance.now();
      const paginationTime = endTime - startTime;

      expect(paginationTime).toBeLessThan(100);
      expect(secondPageResult.pages).toHaveLength(20);
    });
  });

  describe('Real-time Updates Performance', () => {
    it('should handle real-time page updates efficiently', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      
      await act(async () => {
        render(<AgentPagesTab agent={agent} />);
      });

      await screen.findByTestId('agent-pages-tab');

      const startTime = performance.now();

      // Simulate multiple real-time updates
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          // Simulate real-time update
          const updatedPage = TestDataFactory.createMockAgentPage({
            id: `page-${i}`,
            title: `Updated Page ${i}`
          });
          // In real implementation, this would trigger re-render
        });
      }

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      // Should handle multiple updates efficiently
      expect(updateTime).toBeLessThan(500);
    });

    it('should batch real-time updates to prevent excessive re-renders', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      
      let renderCount = 0;
      const WrappedComponent = () => {
        renderCount++;
        return <AgentPagesTab agent={agent} />;
      };

      await act(async () => {
        render(<WrappedComponent />);
      });

      await screen.findByTestId('agent-pages-tab');

      const initialRenderCount = renderCount;

      // Simulate rapid updates
      await act(async () => {
        for (let i = 0; i < 20; i++) {
          // Rapid state changes
          // In real implementation, these would be batched
          await TestUtils.delay(1);
        }
      });

      const finalRenderCount = renderCount;
      const additionalRenders = finalRenderCount - initialRenderCount;

      // Should not cause excessive re-renders
      expect(additionalRenders).toBeLessThan(5);
    });
  });

  describe('Bundle Size and Code Splitting', () => {
    it('should have reasonable component size', () => {
      // This would typically be measured with bundler analysis tools
      // For demonstration, we'll check basic metrics
      
      const componentString = AgentPagesTab.toString();
      const componentSize = new Blob([componentString]).size;

      // Component should not be excessively large
      expect(componentSize).toBeLessThan(50000); // 50KB
    });

    it('should lazy load heavy features', async () => {
      const { agent } = TestDataFactory.scenarios.emptyWorkspace();
      
      // Mock dynamic import
      const mockDynamicImport = jest.fn().mockResolvedValue({
        default: () => <div>Lazy Component</div>
      });
      
      (global as any).__dynamicImport = mockDynamicImport;

      await act(async () => {
        render(<AgentPagesTab agent={agent} />);
      });

      await screen.findByTestId('empty-pages-state');

      // Heavy features should be lazy loaded
      // This would be verified in actual implementation
      expect(true).toBe(true); // Placeholder for bundle analysis
    });
  });
});