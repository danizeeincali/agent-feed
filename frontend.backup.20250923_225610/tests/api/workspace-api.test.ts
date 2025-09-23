/**
 * API Tests for Workspace Endpoints
 * Following TDD London School approach with comprehensive endpoint testing
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { workspaceApi } from '../../src/services/api/workspaceApi';
import { TestDataFactory, TestUtils } from '../utils/test-factories';

describe('Workspace API Tests', () => {
  let restoreFetch: () => void;

  beforeEach(() => {
    // Mock global fetch for each test
    restoreFetch = TestUtils.mockFetch({});
  });

  afterEach(() => {
    restoreFetch();
    jest.clearAllMocks();
  });

  describe('Workspace Initialization', () => {
    it('should initialize workspace successfully', async () => {
      const mockWorkspace = TestDataFactory.createMockWorkspaceInfo();
      restoreFetch = TestUtils.mockFetch({
        'POST /api/agents/test-agent-1/workspace/init': {
          status: 200,
          data: { workspace: mockWorkspace }
        }
      });

      const result = await workspaceApi.initializeWorkspace('test-agent-1');

      expect(result).toEqual(mockWorkspace);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/test-agent-1/workspace/init',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should handle workspace initialization failure', async () => {
      restoreFetch = TestUtils.mockFetch({
        'POST /api/agents/test-agent-1/workspace/init': {
          status: 500,
          data: { message: 'Internal server error' }
        }
      });

      await expect(workspaceApi.initializeWorkspace('test-agent-1'))
        .rejects.toThrow('Internal server error');
    });

    it('should handle network errors during initialization', async () => {
      restoreFetch = TestUtils.mockFetch({});

      await expect(workspaceApi.initializeWorkspace('test-agent-1'))
        .rejects.toThrow('No mock response configured');
    });
  });

  describe('Get Workspace Info', () => {
    it('should retrieve workspace info successfully', async () => {
      const mockWorkspace = TestDataFactory.createMockWorkspaceInfo();
      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/workspace': {
          status: 200,
          data: mockWorkspace
        }
      });

      const result = await workspaceApi.getWorkspaceInfo('test-agent-1');

      expect(result).toEqual(mockWorkspace);
      expect(global.fetch).toHaveBeenCalledWith('/api/agents/test-agent-1/workspace');
    });

    it('should handle workspace not found', async () => {
      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/workspace': {
          status: 404,
          data: { message: 'Workspace not found' }
        }
      });

      await expect(workspaceApi.getWorkspaceInfo('test-agent-1'))
        .rejects.toThrow('Workspace not found');
    });

    it('should handle server errors', async () => {
      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/workspace': {
          status: 500,
          data: { message: 'Server error' }
        }
      });

      await expect(workspaceApi.getWorkspaceInfo('test-agent-1'))
        .rejects.toThrow('Server error');
    });

    it('should handle malformed response', async () => {
      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/workspace': {
          status: 200,
          data: null
        }
      });

      const result = await workspaceApi.getWorkspaceInfo('test-agent-1');
      expect(result).toBeNull();
    });
  });

  describe('List Pages', () => {
    it('should list pages with default parameters', async () => {
      const mockPages = TestDataFactory.createMockPageList(5);
      const mockResponse = {
        success: true,
        agent_id: 'test-agent-1',
        pages: mockPages,
        total: 5,
        limit: 20,
        offset: 0,
        has_more: false
      };

      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/pages': {
          status: 200,
          data: mockResponse
        }
      });

      const result = await workspaceApi.listPages('test-agent-1');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('/api/agents/test-agent-1/pages');
    });

    it('should list pages with filters', async () => {
      const mockPages = TestDataFactory.createMockPageList(3);
      const mockResponse = {
        success: true,
        agent_id: 'test-agent-1',
        pages: mockPages,
        total: 3,
        limit: 10,
        offset: 0,
        has_more: false
      };

      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/pages?page_type=dynamic&status=published&limit=10&search=test': {
          status: 200,
          data: mockResponse
        }
      });

      const result = await workspaceApi.listPages('test-agent-1', {
        page_type: 'dynamic',
        status: 'published',
        limit: 10,
        search: 'test'
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/test-agent-1/pages?page_type=dynamic&status=published&limit=10&search=test'
      );
    });

    it('should handle pagination parameters', async () => {
      const mockPages = TestDataFactory.createMockPageList(10);
      const mockResponse = {
        success: true,
        agent_id: 'test-agent-1',
        pages: mockPages,
        total: 50,
        limit: 10,
        offset: 20,
        has_more: true
      };

      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/pages?limit=10&offset=20': {
          status: 200,
          data: mockResponse
        }
      });

      const result = await workspaceApi.listPages('test-agent-1', {
        limit: 10,
        offset: 20
      });

      expect(result).toEqual(mockResponse);
      expect(result.has_more).toBe(true);
      expect(result.total).toBe(50);
    });

    it('should handle empty page list', async () => {
      const mockResponse = {
        success: true,
        agent_id: 'test-agent-1',
        pages: [],
        total: 0,
        limit: 20,
        offset: 0,
        has_more: false
      };

      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/pages': {
          status: 200,
          data: mockResponse
        }
      });

      const result = await workspaceApi.listPages('test-agent-1');

      expect(result.pages).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle list pages error', async () => {
      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/pages': {
          status: 500,
          data: { message: 'Failed to list pages' }
        }
      });

      await expect(workspaceApi.listPages('test-agent-1'))
        .rejects.toThrow('Failed to list pages');
    });

    it('should filter out null/undefined parameters', async () => {
      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/pages?status=published': {
          status: 200,
          data: {
            success: true,
            agent_id: 'test-agent-1',
            pages: [],
            total: 0,
            limit: 20,
            offset: 0,
            has_more: false
          }
        }
      });

      await workspaceApi.listPages('test-agent-1', {
        status: 'published',
        page_type: undefined,
        search: null as any,
        limit: undefined
      });

      // Should only include non-null/undefined parameters
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/test-agent-1/pages?status=published'
      );
    });
  });

  describe('Create Page', () => {
    it('should create page successfully', async () => {
      const pageData = TestDataFactory.createMockCreatePageData();
      const mockPage = TestDataFactory.createMockAgentPage({
        title: pageData.title,
        content_value: pageData.content_value
      });

      restoreFetch = TestUtils.mockFetch({
        'POST /api/agents/test-agent-1/pages': {
          status: 200,
          data: { page: mockPage }
        }
      });

      const result = await workspaceApi.createPage('test-agent-1', pageData);

      expect(result).toEqual(mockPage);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/test-agent-1/pages',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pageData)
        })
      );
    });

    it('should handle validation errors', async () => {
      const pageData = TestDataFactory.createMockCreatePageData({ title: '' });

      restoreFetch = TestUtils.mockFetch({
        'POST /api/agents/test-agent-1/pages': {
          status: 400,
          data: { message: 'Title is required' }
        }
      });

      await expect(workspaceApi.createPage('test-agent-1', pageData))
        .rejects.toThrow('Title is required');
    });

    it('should handle quota exceeded errors', async () => {
      const pageData = TestDataFactory.createMockCreatePageData();

      restoreFetch = TestUtils.mockFetch({
        'POST /api/agents/test-agent-1/pages': {
          status: 429,
          data: { message: 'Page quota exceeded' }
        }
      });

      await expect(workspaceApi.createPage('test-agent-1', pageData))
        .rejects.toThrow('Page quota exceeded');
    });

    it('should handle different content types', async () => {
      const jsonPageData = TestDataFactory.createMockCreatePageData({
        content_type: 'json',
        content_value: JSON.stringify({ type: 'dashboard', widgets: ['chart'] })
      });

      const mockPage = TestDataFactory.createMockAgentPage({
        content_type: 'json',
        content_value: jsonPageData.content_value
      });

      restoreFetch = TestUtils.mockFetch({
        'POST /api/agents/test-agent-1/pages': {
          status: 200,
          data: { page: mockPage }
        }
      });

      const result = await workspaceApi.createPage('test-agent-1', jsonPageData);

      expect(result.content_type).toBe('json');
      expect(result.content_value).toBe(jsonPageData.content_value);
    });

    it('should handle large content payloads', async () => {
      const largeContent = 'A'.repeat(100000); // 100KB content
      const pageData = TestDataFactory.createMockCreatePageData({
        content_value: largeContent
      });

      const mockPage = TestDataFactory.createMockAgentPage({
        content_value: largeContent
      });

      restoreFetch = TestUtils.mockFetch({
        'POST /api/agents/test-agent-1/pages': {
          status: 200,
          data: { page: mockPage }
        }
      });

      const result = await workspaceApi.createPage('test-agent-1', pageData);

      expect(result.content_value).toBe(largeContent);
    });
  });

  describe('Get Page', () => {
    it('should retrieve specific page successfully', async () => {
      const mockPage = TestDataFactory.createMockAgentPage({
        id: 'page-123',
        title: 'Specific Page'
      });

      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/pages/page-123': {
          status: 200,
          data: { page: mockPage }
        }
      });

      const result = await workspaceApi.getPage('test-agent-1', 'page-123');

      expect(result).toEqual(mockPage);
      expect(global.fetch).toHaveBeenCalledWith('/api/agents/test-agent-1/pages/page-123');
    });

    it('should handle page not found', async () => {
      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/pages/nonexistent': {
          status: 404,
          data: { message: 'Page not found' }
        }
      });

      await expect(workspaceApi.getPage('test-agent-1', 'nonexistent'))
        .rejects.toThrow('Page not found');
    });

    it('should handle access denied', async () => {
      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/pages/restricted': {
          status: 403,
          data: { message: 'Access denied' }
        }
      });

      await expect(workspaceApi.getPage('test-agent-1', 'restricted'))
        .rejects.toThrow('Access denied');
    });
  });

  describe('Update Page', () => {
    it('should update page successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        content_value: 'Updated content',
        status: 'published' as const
      };

      const mockUpdatedPage = TestDataFactory.createMockAgentPage({
        id: 'page-123',
        ...updateData,
        version: 2
      });

      restoreFetch = TestUtils.mockFetch({
        'PUT /api/agents/test-agent-1/pages/page-123': {
          status: 200,
          data: { page: mockUpdatedPage }
        }
      });

      const result = await workspaceApi.updatePage('test-agent-1', 'page-123', updateData);

      expect(result).toEqual(mockUpdatedPage);
      expect(result.version).toBe(2);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/test-agent-1/pages/page-123',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })
      );
    });

    it('should handle partial updates', async () => {
      const updateData = { title: 'New Title Only' };
      const mockUpdatedPage = TestDataFactory.createMockAgentPage({
        id: 'page-123',
        title: 'New Title Only',
        version: 2
      });

      restoreFetch = TestUtils.mockFetch({
        'PUT /api/agents/test-agent-1/pages/page-123': {
          status: 200,
          data: { page: mockUpdatedPage }
        }
      });

      const result = await workspaceApi.updatePage('test-agent-1', 'page-123', updateData);

      expect(result.title).toBe('New Title Only');
      expect(result.version).toBe(2);
    });

    it('should handle update validation errors', async () => {
      const updateData = { title: '' }; // Invalid empty title

      restoreFetch = TestUtils.mockFetch({
        'PUT /api/agents/test-agent-1/pages/page-123': {
          status: 400,
          data: { message: 'Title cannot be empty' }
        }
      });

      await expect(workspaceApi.updatePage('test-agent-1', 'page-123', updateData))
        .rejects.toThrow('Title cannot be empty');
    });

    it('should handle optimistic locking conflicts', async () => {
      const updateData = { content_value: 'Updated content' };

      restoreFetch = TestUtils.mockFetch({
        'PUT /api/agents/test-agent-1/pages/page-123': {
          status: 409,
          data: { message: 'Page was modified by another user' }
        }
      });

      await expect(workspaceApi.updatePage('test-agent-1', 'page-123', updateData))
        .rejects.toThrow('Page was modified by another user');
    });
  });

  describe('Delete Page', () => {
    it('should delete page successfully', async () => {
      restoreFetch = TestUtils.mockFetch({
        'DELETE /api/agents/test-agent-1/pages/page-123': {
          status: 204,
          data: {}
        }
      });

      await expect(workspaceApi.deletePage('test-agent-1', 'page-123'))
        .resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/test-agent-1/pages/page-123',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should handle delete page not found', async () => {
      restoreFetch = TestUtils.mockFetch({
        'DELETE /api/agents/test-agent-1/pages/nonexistent': {
          status: 404,
          data: { message: 'Page not found' }
        }
      });

      await expect(workspaceApi.deletePage('test-agent-1', 'nonexistent'))
        .rejects.toThrow('Page not found');
    });

    it('should handle delete permission denied', async () => {
      restoreFetch = TestUtils.mockFetch({
        'DELETE /api/agents/test-agent-1/pages/protected': {
          status: 403,
          data: { message: 'Cannot delete protected page' }
        }
      });

      await expect(workspaceApi.deletePage('test-agent-1', 'protected'))
        .rejects.toThrow('Cannot delete protected page');
    });

    it('should handle foreign key constraint errors', async () => {
      restoreFetch = TestUtils.mockFetch({
        'DELETE /api/agents/test-agent-1/pages/referenced': {
          status: 409,
          data: { message: 'Cannot delete page with active references' }
        }
      });

      await expect(workspaceApi.deletePage('test-agent-1', 'referenced'))
        .rejects.toThrow('Cannot delete page with active references');
    });
  });

  describe('Health Check', () => {
    it('should check service health successfully', async () => {
      const mockHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 86400
      };

      restoreFetch = TestUtils.mockFetch({
        'GET /api/workspace/health': {
          status: 200,
          data: mockHealth
        }
      });

      const result = await workspaceApi.checkHealth();

      expect(result).toEqual(mockHealth);
      expect(result.status).toBe('healthy');
    });

    it('should handle unhealthy service', async () => {
      restoreFetch = TestUtils.mockFetch({
        'GET /api/workspace/health': {
          status: 503,
          data: { 
            message: 'Service unavailable',
            status: 'unhealthy',
            errors: ['Database connection failed']
          }
        }
      });

      await expect(workspaceApi.checkHealth())
        .rejects.toThrow('Service unavailable');
    });

    it('should handle health check timeout', async () => {
      // Simulate timeout by not providing a response
      restoreFetch = TestUtils.mockFetch({});

      await expect(workspaceApi.checkHealth())
        .rejects.toThrow('No mock response configured');
    });
  });

  describe('Error Handling', () => {
    it('should handle network connectivity issues', async () => {
      // Simulate network error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(workspaceApi.getWorkspaceInfo('test-agent-1'))
        .rejects.toThrow('Network error');
    });

    it('should handle malformed JSON responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON'))
      } as any);

      await expect(workspaceApi.getWorkspaceInfo('test-agent-1'))
        .rejects.toThrow('Invalid JSON');
    });

    it('should handle rate limiting', async () => {
      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/pages': {
          status: 429,
          data: { 
            message: 'Too many requests',
            retryAfter: 60
          }
        }
      });

      await expect(workspaceApi.listPages('test-agent-1'))
        .rejects.toThrow('Too many requests');
    });

    it('should handle server maintenance mode', async () => {
      restoreFetch = TestUtils.mockFetch({
        'POST /api/agents/test-agent-1/pages': {
          status: 503,
          data: { 
            message: 'Service temporarily unavailable',
            maintenanceWindow: '2024-01-01T10:00:00Z'
          }
        }
      });

      const pageData = TestDataFactory.createMockCreatePageData();

      await expect(workspaceApi.createPage('test-agent-1', pageData))
        .rejects.toThrow('Service temporarily unavailable');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent page creation', async () => {
      const pageData1 = TestDataFactory.createMockCreatePageData({ title: 'Page 1' });
      const pageData2 = TestDataFactory.createMockCreatePageData({ title: 'Page 2' });
      
      const mockPage1 = TestDataFactory.createMockAgentPage({ title: 'Page 1' });
      const mockPage2 = TestDataFactory.createMockAgentPage({ title: 'Page 2' });

      restoreFetch = TestUtils.mockFetch({
        'POST /api/agents/test-agent-1/pages': {
          status: 200,
          data: { page: mockPage1 }
        }
      });

      // Mock multiple responses for concurrent requests
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ page: mockPage1 })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ page: mockPage2 })
        });

      const [result1, result2] = await Promise.all([
        workspaceApi.createPage('test-agent-1', pageData1),
        workspaceApi.createPage('test-agent-1', pageData2)
      ]);

      expect(result1.title).toBe('Page 1');
      expect(result2.title).toBe('Page 2');
    });

    it('should handle concurrent updates to same page', async () => {
      const update1 = { title: 'Update 1' };
      const update2 = { title: 'Update 2' };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ 
            page: TestDataFactory.createMockAgentPage({ title: 'Update 1', version: 2 })
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: () => Promise.resolve({ message: 'Page was modified by another user' })
        });

      const [result1, result2] = await Promise.allSettled([
        workspaceApi.updatePage('test-agent-1', 'page-123', update1),
        workspaceApi.updatePage('test-agent-1', 'page-123', update2)
      ]);

      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('rejected');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large page listings efficiently', async () => {
      const largePagesSet = TestDataFactory.createMockPageList(1000);
      const mockResponse = {
        success: true,
        agent_id: 'test-agent-1',
        pages: largePagesSet.slice(0, 100), // Paginated
        total: 1000,
        limit: 100,
        offset: 0,
        has_more: true
      };

      restoreFetch = TestUtils.mockFetch({
        'GET /api/agents/test-agent-1/pages?limit=100': {
          status: 200,
          data: mockResponse
        }
      });

      const startTime = performance.now();
      const result = await workspaceApi.listPages('test-agent-1', { limit: 100 });
      const endTime = performance.now();

      expect(result.pages).toHaveLength(100);
      expect(result.total).toBe(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle rapid sequential requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        TestDataFactory.createMockCreatePageData({ title: `Rapid Page ${i}` })
      );

      // Mock responses for all requests
      requests.forEach((_, index) => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ 
            page: TestDataFactory.createMockAgentPage({ title: `Rapid Page ${index}` })
          })
        });
      });

      const startTime = performance.now();
      const results = await Promise.all(
        requests.map(pageData => workspaceApi.createPage('test-agent-1', pageData))
      );
      const endTime = performance.now();

      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Data Integrity', () => {
    it('should preserve special characters in content', async () => {
      const specialContent = '{"emoji": "🚀", "unicode": "∑∆∞", "html": "<div>Test</div>"}';
      const pageData = TestDataFactory.createMockCreatePageData({
        content_type: 'json',
        content_value: specialContent
      });

      const mockPage = TestDataFactory.createMockAgentPage({
        content_value: specialContent
      });

      restoreFetch = TestUtils.mockFetch({
        'POST /api/agents/test-agent-1/pages': {
          status: 200,
          data: { page: mockPage }
        }
      });

      const result = await workspaceApi.createPage('test-agent-1', pageData);

      expect(result.content_value).toBe(specialContent);
    });

    it('should handle null and undefined values correctly', async () => {
      const pageData = {
        title: 'Test Page',
        content_type: 'text' as const,
        content_value: 'Content',
        metadata: null
      };

      const mockPage = TestDataFactory.createMockAgentPage({
        title: 'Test Page',
        metadata: null
      });

      restoreFetch = TestUtils.mockFetch({
        'POST /api/agents/test-agent-1/pages': {
          status: 200,
          data: { page: mockPage }
        }
      });

      const result = await workspaceApi.createPage('test-agent-1', pageData);

      expect(result.metadata).toBeNull();
    });

    it('should maintain data consistency across operations', async () => {
      const originalPage = TestDataFactory.createMockAgentPage({
        id: 'consistency-test',
        version: 1
      });

      const updateData = { title: 'Updated Title' };
      const updatedPage = { ...originalPage, ...updateData, version: 2 };

      // Mock get, update, get sequence
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ page: originalPage })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ page: updatedPage })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ page: updatedPage })
        });

      // Get original
      const original = await workspaceApi.getPage('test-agent-1', 'consistency-test');
      expect(original.version).toBe(1);

      // Update
      const updated = await workspaceApi.updatePage('test-agent-1', 'consistency-test', updateData);
      expect(updated.version).toBe(2);
      expect(updated.title).toBe('Updated Title');

      // Verify update
      const verified = await workspaceApi.getPage('test-agent-1', 'consistency-test');
      expect(verified.version).toBe(2);
      expect(verified.title).toBe('Updated Title');
    });
  });
});