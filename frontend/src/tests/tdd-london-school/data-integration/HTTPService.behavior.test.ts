/**
 * HTTP Service Behavior Tests - TDD London School
 * Tests the HTTP service layer interactions and contracts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LondonSchoolTestSuite, LondonTestUtils } from '../framework/LondonSchoolTestFramework';
import { testSetup } from '../factories/MockFactory';
import type { IHTTPService, ICacheService, INotificationService } from '../contracts/ComponentContracts';

// Mock HTTP Service Implementation for testing
class MockHTTPService implements IHTTPService {
  private cache: ICacheService;
  private notifications: INotificationService;

  constructor(cache: ICacheService, notifications: INotificationService) {
    this.cache = cache;
    this.notifications = notifications;
  }

  async get<T>(url: string, options?: any): Promise<T> {
    // Check cache first
    const cacheKey = `GET:${url}:${JSON.stringify(options)}`;
    const cached = this.cache.get<T>(cacheKey);
    
    if (cached && options?.useCache !== false) {
      return cached;
    }

    try {
      const response = await fetch(url, { method: 'GET', ...options });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache successful responses
      if (options?.cache !== false) {
        this.cache.set(cacheKey, data, options?.cacheTTL || 300000); // 5 minutes default
      }

      return data;
    } catch (error) {
      this.notifications.error(`GET request failed: ${(error as Error).message}`);
      throw error;
    }
  }

  async post<T>(url: string, data: any, options?: any): Promise<T> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(data),
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Invalidate related cache entries
      this.invalidateRelatedCache(url, 'POST');
      
      this.notifications.success('Data saved successfully');
      return result;
    } catch (error) {
      this.notifications.error(`POST request failed: ${(error as Error).message}`);
      throw error;
    }
  }

  async put<T>(url: string, data: any, options?: any): Promise<T> {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(data),
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Invalidate cache
      this.invalidateRelatedCache(url, 'PUT');
      
      return result;
    } catch (error) {
      this.notifications.error(`PUT request failed: ${(error as Error).message}`);
      throw error;
    }
  }

  async delete<T>(url: string, options?: any): Promise<T> {
    try {
      const response = await fetch(url, { method: 'DELETE', ...options });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Invalidate cache
      this.invalidateRelatedCache(url, 'DELETE');
      
      this.notifications.success('Data deleted successfully');
      
      return response.status === 204 ? undefined as T : await response.json();
    } catch (error) {
      this.notifications.error(`DELETE request failed: ${(error as Error).message}`);
      throw error;
    }
  }

  async patch<T>(url: string, data: any, options?: any): Promise<T> {
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(data),
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Invalidate cache
      this.invalidateRelatedCache(url, 'PATCH');
      
      return result;
    } catch (error) {
      this.notifications.error(`PATCH request failed: ${(error as Error).message}`);
      throw error;
    }
  }

  private invalidateRelatedCache(url: string, method: string): void {
    // Simple cache invalidation strategy
    const baseUrl = url.split('?')[0].split('/').slice(0, -1).join('/');
    const cacheKeys = this.cache.keys();
    
    cacheKeys.forEach(key => {
      if (key.includes(baseUrl) || key.includes('GET:')) {
        this.cache.delete(key);
      }
    });
  }
}

class HTTPServiceBehaviorSuite extends LondonSchoolTestSuite {
  private httpService!: IHTTPService;
  private mockCacheService!: ICacheService;
  private mockNotificationService!: INotificationService;

  protected setupCollaborators(): void {
    this.mockCacheService = testSetup.mockService('CacheService', {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      has: vi.fn().mockReturnValue(false),
      keys: vi.fn().mockReturnValue([])
    });

    this.mockNotificationService = testSetup.mockService('NotificationService', {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      dismiss: vi.fn(),
      dismissAll: vi.fn()
    });

    // Create HTTP service with collaborators
    this.httpService = new MockHTTPService(
      this.mockCacheService,
      this.mockNotificationService
    );

    // Mock global fetch
    global.fetch = vi.fn();
  }

  protected verifyAllInteractions(): void {
    // Verify HTTP service collaborates correctly with cache and notifications
  }

  public testGETRequestBehavior(): void {
    describe('GET request behavior', () => {
      it('should fetch data and cache successful responses', async () => {
        // Arrange
        const mockData = { id: 1, name: 'Test Data' };
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockData)
        });

        // Act
        const result = await this.httpService.get('/api/data');

        // Assert - London School: Verify collaboration patterns
        expect(global.fetch).toHaveBeenCalledWith('/api/data', { method: 'GET' });
        expect(this.mockCacheService.get).toHaveBeenCalledWith('GET:/api/data:undefined');
        expect(this.mockCacheService.set).toHaveBeenCalledWith(
          'GET:/api/data:undefined',
          mockData,
          300000
        );
        expect(result).toEqual(mockData);
      });

      it('should return cached data when available', async () => {
        // Arrange
        const cachedData = { id: 2, name: 'Cached Data' };
        this.mockCacheService.get = vi.fn().mockReturnValue(cachedData);

        // Act
        const result = await this.httpService.get('/api/cached');

        // Assert - Should use cache, not fetch
        expect(this.mockCacheService.get).toHaveBeenCalledWith('GET:/api/cached:undefined');
        expect(global.fetch).not.toHaveBeenCalled();
        expect(result).toEqual(cachedData);
      });

      it('should handle HTTP errors and notify user', async () => {
        // Arrange
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        });

        // Act & Assert
        await expect(this.httpService.get('/api/nonexistent')).rejects.toThrow('HTTP 404: Not Found');
        
        expect(this.mockNotificationService.error).toHaveBeenCalledWith(
          'GET request failed: HTTP 404: Not Found'
        );
      });

      it('should handle network errors gracefully', async () => {
        // Arrange
        (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

        // Act & Assert
        await expect(this.httpService.get('/api/unreachable')).rejects.toThrow('Network error');
        
        expect(this.mockNotificationService.error).toHaveBeenCalledWith(
          'GET request failed: Network error'
        );
      });

      it('should bypass cache when useCache is false', async () => {
        // Arrange
        const mockData = { id: 3, fresh: true };
        this.mockCacheService.get = vi.fn().mockReturnValue({ id: 3, fresh: false });
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockData)
        });

        // Act
        const result = await this.httpService.get('/api/fresh', { useCache: false });

        // Assert - Should fetch fresh data despite cache
        expect(global.fetch).toHaveBeenCalled();
        expect(result).toEqual(mockData);
      });
    });
  }

  public testPOSTRequestBehavior(): void {
    describe('POST request behavior', () => {
      it('should send data and invalidate related cache', async () => {
        // Arrange
        const postData = { name: 'New Item' };
        const responseData = { id: 4, ...postData };
        
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(responseData)
        });

        this.mockCacheService.keys = vi.fn().mockReturnValue([
          'GET:/api/items:undefined',
          'GET:/api/other:undefined'
        ]);

        // Act
        const result = await this.httpService.post('/api/items', postData);

        // Assert - Verify API call and cache invalidation
        expect(global.fetch).toHaveBeenCalledWith('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        });
        
        expect(this.mockCacheService.keys).toHaveBeenCalled();
        expect(this.mockCacheService.delete).toHaveBeenCalled();
        expect(this.mockNotificationService.success).toHaveBeenCalledWith('Data saved successfully');
        expect(result).toEqual(responseData);
      });

      it('should handle POST errors with proper notification', async () => {
        // Arrange
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request'
        });

        // Act & Assert
        await expect(
          this.httpService.post('/api/items', { invalid: 'data' })
        ).rejects.toThrow('HTTP 400: Bad Request');

        expect(this.mockNotificationService.error).toHaveBeenCalledWith(
          'POST request failed: HTTP 400: Bad Request'
        );
      });

      it('should include custom headers when provided', async () => {
        // Arrange
        const postData = { name: 'Item with custom headers' };
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({})
        });

        // Act
        await this.httpService.post('/api/items', postData, {
          headers: { 'X-Custom-Header': 'custom-value' }
        });

        // Assert
        expect(global.fetch).toHaveBeenCalledWith('/api/items', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value'
          },
          body: JSON.stringify(postData)
        });
      });
    });
  }

  public testPUTRequestBehavior(): void {
    describe('PUT request behavior', () => {
      it('should update data and invalidate cache', async () => {
        // Arrange
        const updateData = { id: 5, name: 'Updated Item' };
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(updateData)
        });

        // Act
        const result = await this.httpService.put('/api/items/5', updateData);

        // Assert
        expect(global.fetch).toHaveBeenCalledWith('/api/items/5', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
        
        expect(this.mockCacheService.keys).toHaveBeenCalled();
        expect(result).toEqual(updateData);
      });
    });
  }

  public testDELETERequestBehavior(): void {
    describe('DELETE request behavior', () => {
      it('should delete data and show success notification', async () => {
        // Arrange
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          status: 204
        });

        // Act
        await this.httpService.delete('/api/items/6');

        // Assert
        expect(global.fetch).toHaveBeenCalledWith('/api/items/6', { method: 'DELETE' });
        expect(this.mockNotificationService.success).toHaveBeenCalledWith('Data deleted successfully');
        expect(this.mockCacheService.keys).toHaveBeenCalled();
      });

      it('should handle DELETE responses with content', async () => {
        // Arrange
        const responseData = { deleted: true, id: 7 };
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(responseData)
        });

        // Act
        const result = await this.httpService.delete('/api/items/7');

        // Assert
        expect(result).toEqual(responseData);
      });
    });
  }

  public testPATCHRequestBehavior(): void {
    describe('PATCH request behavior', () => {
      it('should partially update data', async () => {
        // Arrange
        const patchData = { name: 'Partially Updated' };
        const responseData = { id: 8, name: 'Partially Updated', other: 'unchanged' };
        
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(responseData)
        });

        // Act
        const result = await this.httpService.patch('/api/items/8', patchData);

        // Assert
        expect(global.fetch).toHaveBeenCalledWith('/api/items/8', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchData)
        });
        
        expect(result).toEqual(responseData);
      });
    });
  }

  public testCacheManagementBehavior(): void {
    describe('Cache management behavior', () => {
      it('should invalidate related cache entries on mutations', async () => {
        // Arrange
        this.mockCacheService.keys = vi.fn().mockReturnValue([
          'GET:/api/items:undefined',
          'GET:/api/items/1:undefined',
          'GET:/api/users:undefined'
        ]);

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({})
        });

        // Act - POST to /api/items should invalidate item-related cache
        await this.httpService.post('/api/items', { name: 'New Item' });

        // Assert - Should delete related cache keys
        expect(this.mockCacheService.delete).toHaveBeenCalledWith('GET:/api/items:undefined');
        expect(this.mockCacheService.delete).toHaveBeenCalledWith('GET:/api/items/1:undefined');
        // Should not delete unrelated cache
        expect(this.mockCacheService.delete).not.toHaveBeenCalledWith('GET:/api/users:undefined');
      });

      it('should support custom cache TTL', async () => {
        // Arrange
        const mockData = { id: 9, name: 'Custom TTL Data' };
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockData)
        });

        // Act
        await this.httpService.get('/api/data', { cacheTTL: 60000 }); // 1 minute

        // Assert
        expect(this.mockCacheService.set).toHaveBeenCalledWith(
          expect.any(String),
          mockData,
          60000
        );
      });
    });
  }

  public testErrorHandlingBehavior(): void {
    describe('Error handling behavior', () => {
      it('should handle different HTTP error status codes appropriately', async () => {
        const errorCases = [
          { status: 400, statusText: 'Bad Request' },
          { status: 401, statusText: 'Unauthorized' },
          { status: 403, statusText: 'Forbidden' },
          { status: 404, statusText: 'Not Found' },
          { status: 500, statusText: 'Internal Server Error' }
        ];

        for (const errorCase of errorCases) {
          // Arrange
          (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: errorCase.status,
            statusText: errorCase.statusText
          });

          // Act & Assert
          await expect(this.httpService.get('/api/error')).rejects.toThrow(
            `HTTP ${errorCase.status}: ${errorCase.statusText}`
          );

          expect(this.mockNotificationService.error).toHaveBeenCalledWith(
            `GET request failed: HTTP ${errorCase.status}: ${errorCase.statusText}`
          );
        }
      });

      it('should handle network timeouts and connection errors', async () => {
        // Arrange
        const networkErrors = [
          new Error('Network timeout'),
          new Error('Connection refused'),
          new Error('DNS resolution failed')
        ];

        for (const error of networkErrors) {
          (global.fetch as any).mockRejectedValueOnce(error);

          // Act & Assert
          await expect(this.httpService.get('/api/unreachable')).rejects.toThrow(error.message);
          
          expect(this.mockNotificationService.error).toHaveBeenCalledWith(
            `GET request failed: ${error.message}`
          );
        }
      });
    });
  }
}

// Test Suite Execution
describe('HTTP Service Behavior Tests (London School TDD)', () => {
  let behaviorSuite: HTTPServiceBehaviorSuite;

  beforeEach(() => {
    testSetup.resetAll();
    behaviorSuite = new HTTPServiceBehaviorSuite();
    behaviorSuite.beforeEach();
  });

  afterEach(() => {
    behaviorSuite.afterEach();
    vi.clearAllMocks();
  });

  // Execute test categories
  behaviorSuite.testGETRequestBehavior();
  behaviorSuite.testPOSTRequestBehavior();
  behaviorSuite.testPUTRequestBehavior();
  behaviorSuite.testDELETERequestBehavior();
  behaviorSuite.testPATCHRequestBehavior();
  behaviorSuite.testCacheManagementBehavior();
  behaviorSuite.testErrorHandlingBehavior();

  // High-level service collaboration tests
  describe('HTTP service collaboration patterns', () => {
    it('should coordinate with cache and notification services correctly', async () => {
      const behaviorSpec = LondonTestUtils.behavior()
        .given('HTTP service needs to manage requests with caching and user feedback')
        .when('various HTTP operations are performed')
        .then([
          'cache should be consulted before making requests',
          'successful responses should be cached appropriately',
          'cache should be invalidated on mutations',
          'user should be notified of successes and failures',
          'errors should be handled gracefully'
        ])
        .withCollaborators(['HTTPService', 'CacheService', 'NotificationService'])
        .build();

      expect(behaviorSpec.collaborators).toHaveLength(3);
      expect(behaviorSpec.then).toHaveLength(5);
    });
  });
});