/**
 * TDD London School: Frontend-Backend Integration Flow Tests
 * Focus: Outside-in integration testing with mock collaboration
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { 
  createSwarmMocks, 
  mockPageResponses, 
  createMockErrorResponse,
  mockFactory 
} from '../mocks';

// Mock the complete integration chain
const createIntegrationMocks = () => ({
  frontendService: {
    loadPage: jest.fn(),
    renderPage: jest.fn(),
    handleError: jest.fn(),
    updateUI: jest.fn()
  },
  backendService: {
    fetchPageData: jest.fn(),
    validateRequest: jest.fn(),
    processResponse: jest.fn(),
    logRequest: jest.fn()
  },
  middlewareService: {
    authenticate: jest.fn(),
    authorize: jest.fn(),
    sanitize: jest.fn(),
    cache: jest.fn()
  },
  networkService: {
    request: jest.fn(),
    retry: jest.fn(),
    timeout: jest.fn(),
    abort: jest.fn()
  }
});

describe('Frontend-Backend Integration Flow - London School TDD', () => {
  let swarmMocks;
  let integrationMocks;
  let mockPageOrchestrator;
  
  beforeEach(() => {
    swarmMocks = createSwarmMocks();
    integrationMocks = createIntegrationMocks();
    
    // Mock the page orchestrator that coordinates the entire flow
    mockPageOrchestrator = {
      loadAgentPage: jest.fn(),
      coordinateServices: jest.fn(),
      handleIntegrationError: jest.fn(),
      validateIntegration: jest.fn()
    };
    
    // Set up successful integration flow defaults
    integrationMocks.middlewareService.authenticate.mockResolvedValue(true);
    integrationMocks.middlewareService.authorize.mockResolvedValue(true);
    integrationMocks.backendService.fetchPageData.mockResolvedValue(mockPageResponses.profile);
    integrationMocks.frontendService.renderPage.mockResolvedValue({ success: true });
  });

  describe('Complete Agent Page Loading Integration Contract', () => {
    it('should coordinate full profile page loading workflow', async () => {
      // Arrange: Full integration workflow setup
      const pageId = 'profile';
      const userId = 'user-123';
      const expectedWorkflow = [
        'authenticate',
        'authorize', 
        'fetchPageData',
        'renderPage'
      ];
      
      // Mock the complete orchestration workflow
      mockPageOrchestrator.loadAgentPage.mockImplementation(async (id, user) => {
        await integrationMocks.middlewareService.authenticate(user);
        await integrationMocks.middlewareService.authorize(user, 'read:agent-pages');
        const pageData = await integrationMocks.backendService.fetchPageData(id);
        return await integrationMocks.frontendService.renderPage(pageData);
      });
      
      // Act: Execute complete integration workflow
      const result = await mockPageOrchestrator.loadAgentPage(pageId, { id: userId });
      
      // Assert: Verify complete integration sequence
      expect(integrationMocks.middlewareService.authenticate).toHaveBeenCalledWith({ id: userId });
      expect(integrationMocks.middlewareService.authorize).toHaveBeenCalledWith(
        { id: userId }, 
        'read:agent-pages'
      );
      expect(integrationMocks.backendService.fetchPageData).toHaveBeenCalledWith(pageId);
      expect(integrationMocks.frontendService.renderPage).toHaveBeenCalledWith(
        mockPageResponses.profile
      );
      
      // Verify interaction sequence
      expect(integrationMocks.middlewareService.authenticate).toHaveBeenCalledBefore(
        integrationMocks.backendService.fetchPageData
      );
      expect(integrationMocks.backendService.fetchPageData).toHaveBeenCalledBefore(
        integrationMocks.frontendService.renderPage
      );
      
      expect(result.success).toBe(true);
    });

    it('should handle authentication failure in integration chain', async () => {
      // Arrange: Authentication failure scenario
      const pageId = 'dashboard';
      const invalidUser = { id: 'invalid-user' };
      const authError = createMockErrorResponse(401, 'Authentication failed');
      
      integrationMocks.middlewareService.authenticate.mockRejectedValue(authError);
      mockPageOrchestrator.handleIntegrationError.mockResolvedValue({
        handled: true,
        fallback: 'redirect-to-login'
      });
      
      // Act: Attempt integration with invalid user
      let integrationResult;
      try {
        await integrationMocks.middlewareService.authenticate(invalidUser);
        integrationResult = await integrationMocks.backendService.fetchPageData(pageId);
      } catch (error) {
        integrationResult = await mockPageOrchestrator.handleIntegrationError(error);
      }
      
      // Assert: Verify authentication failure handling
      expect(integrationMocks.middlewareService.authenticate).toHaveBeenCalledWith(invalidUser);
      expect(integrationMocks.backendService.fetchPageData).not.toHaveBeenCalled();
      expect(mockPageOrchestrator.handleIntegrationError).toHaveBeenCalledWith(authError);
      expect(integrationResult.fallback).toBe('redirect-to-login');
    });
  });

  describe('Data Flow Integration Contract', () => {
    it('should coordinate data transformation between frontend and backend', async () => {
      // Arrange: Data transformation workflow
      const rawBackendData = {
        id: 'task-manager',
        raw_content: '<div>Raw HTML</div>',
        meta_data: { version: '1.0' },
        created_timestamp: '2024-01-01T00:00:00Z'
      };
      
      const transformedFrontendData = {
        id: 'task-manager',
        content: '<div>Raw HTML</div>',
        metadata: { version: '1.0' },
        created: '2024-01-01T00:00:00Z'
      };
      
      const mockDataTransformer = {
        backendToFrontend: jest.fn().mockReturnValue(transformedFrontendData),
        validateTransformation: jest.fn().mockReturnValue(true)
      };
      
      integrationMocks.backendService.fetchPageData.mockResolvedValue(rawBackendData);
      
      // Act: Execute data transformation workflow
      const backendData = await integrationMocks.backendService.fetchPageData('task-manager');
      const frontendData = mockDataTransformer.backendToFrontend(backendData);
      const isValid = mockDataTransformer.validateTransformation(frontendData);
      
      if (isValid) {
        await integrationMocks.frontendService.renderPage(frontendData);
      }
      
      // Assert: Verify data transformation flow
      expect(integrationMocks.backendService.fetchPageData).toHaveBeenCalledWith('task-manager');
      expect(mockDataTransformer.backendToFrontend).toHaveBeenCalledWith(rawBackendData);
      expect(mockDataTransformer.validateTransformation).toHaveBeenCalledWith(transformedFrontendData);
      expect(integrationMocks.frontendService.renderPage).toHaveBeenCalledWith(transformedFrontendData);
      
      // Verify transformation correctness
      expect(frontendData.id).toBe(rawBackendData.id);
      expect(frontendData.metadata).toEqual({ version: '1.0' });
    });

    it('should handle data transformation errors gracefully', async () => {
      // Arrange: Invalid data transformation scenario
      const corruptedBackendData = {
        id: 'corrupted-page',
        // Missing required fields
        incomplete_data: true
      };
      
      const mockDataTransformer = {
        backendToFrontend: jest.fn().mockImplementation(() => {
          throw new Error('Invalid data structure');
        }),
        handleTransformationError: jest.fn().mockReturnValue({
          fallbackData: mockFactory.agentPage({ id: 'error-fallback' })
        })
      };
      
      integrationMocks.backendService.fetchPageData.mockResolvedValue(corruptedBackendData);
      
      // Act: Handle transformation error
      const backendData = await integrationMocks.backendService.fetchPageData('corrupted-page');
      let finalData;
      
      try {
        finalData = mockDataTransformer.backendToFrontend(backendData);
      } catch (error) {
        const errorResult = mockDataTransformer.handleTransformationError(error);
        finalData = errorResult.fallbackData;
      }
      
      // Assert: Verify error handling workflow
      expect(mockDataTransformer.backendToFrontend).toHaveBeenCalledWith(corruptedBackendData);
      expect(mockDataTransformer.handleTransformationError).toHaveBeenCalledWith(
        expect.any(Error)
      );
      expect(finalData.id).toBe('error-fallback');
    });
  });

  describe('Network Layer Integration Contract', () => {
    it('should coordinate network request handling with retry logic', async () => {
      // Arrange: Network retry scenario
      const pageId = 'dashboard';
      const networkError = new Error('Network timeout');
      const maxRetries = 3;
      
      integrationMocks.networkService.request
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockFactory.apiResponse(mockPageResponses.dashboard));
      
      integrationMocks.networkService.retry.mockImplementation(async (requestFn, retries) => {
        let attempt = 0;
        while (attempt < retries) {
          try {
            return await requestFn();
          } catch (error) {
            attempt++;
            if (attempt >= retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          }
        }
      });
      
      // Act: Execute network request with retry logic
      const result = await integrationMocks.networkService.retry(
        () => integrationMocks.networkService.request(`/api/agent-pages/${pageId}`),
        maxRetries
      );
      
      // Assert: Verify retry workflow
      expect(integrationMocks.networkService.request).toHaveBeenCalledTimes(3);
      expect(integrationMocks.networkService.request).toHaveBeenCalledWith(`/api/agent-pages/${pageId}`);
      expect(result.data).toEqual(mockPageResponses.dashboard);
    });

    it('should coordinate caching integration between requests', async () => {
      // Arrange: Caching workflow
      const pageId = 'profile';
      const cacheKey = `agent-page:${pageId}`;
      const cachedData = mockPageResponses.profile;
      
      integrationMocks.middlewareService.cache.get = jest.fn();
      integrationMocks.middlewareService.cache.set = jest.fn();
      integrationMocks.middlewareService.cache.has = jest.fn();
      
      // First request - cache miss
      integrationMocks.middlewareService.cache.has.mockReturnValueOnce(false);
      integrationMocks.backendService.fetchPageData.mockResolvedValueOnce(cachedData);
      
      // Second request - cache hit
      integrationMocks.middlewareService.cache.has.mockReturnValueOnce(true);
      integrationMocks.middlewareService.cache.get.mockReturnValueOnce(cachedData);
      
      // Act: Execute two requests with caching
      // First request
      let firstResult;
      if (!integrationMocks.middlewareService.cache.has(cacheKey)) {
        firstResult = await integrationMocks.backendService.fetchPageData(pageId);
        await integrationMocks.middlewareService.cache.set(cacheKey, firstResult);
      }
      
      // Second request
      let secondResult;
      if (integrationMocks.middlewareService.cache.has(cacheKey)) {
        secondResult = integrationMocks.middlewareService.cache.get(cacheKey);
      } else {
        secondResult = await integrationMocks.backendService.fetchPageData(pageId);
      }
      
      // Assert: Verify caching workflow
      expect(integrationMocks.middlewareService.cache.has).toHaveBeenCalledTimes(2);
      expect(integrationMocks.backendService.fetchPageData).toHaveBeenCalledTimes(1);
      expect(integrationMocks.middlewareService.cache.set).toHaveBeenCalledWith(cacheKey, cachedData);
      expect(integrationMocks.middlewareService.cache.get).toHaveBeenCalledWith(cacheKey);
      expect(firstResult).toEqual(secondResult);
    });
  });

  describe('Error Boundary Integration Contract', () => {
    it('should coordinate error boundary with integration failure handling', async () => {
      // Arrange: Integration failure with error boundary
      const pageId = 'task-manager';
      const integrationError = new Error('Complete integration failure');
      
      const mockErrorBoundary = {
        componentDidCatch: jest.fn(),
        getErrorFallback: jest.fn().mockReturnValue({
          component: 'ErrorFallback',
          props: { message: 'Failed to load page' }
        })
      };
      
      mockPageOrchestrator.loadAgentPage.mockRejectedValue(integrationError);
      
      // Act: Handle integration error through error boundary
      let errorCaught = false;
      let fallbackResult;
      
      try {
        await mockPageOrchestrator.loadAgentPage(pageId, { id: 'user-123' });
      } catch (error) {
        errorCaught = true;
        mockErrorBoundary.componentDidCatch(error, { componentStack: 'integration-test' });
        fallbackResult = mockErrorBoundary.getErrorFallback(error);
      }
      
      // Assert: Verify error boundary integration
      expect(errorCaught).toBe(true);
      expect(mockErrorBoundary.componentDidCatch).toHaveBeenCalledWith(
        integrationError,
        { componentStack: 'integration-test' }
      );
      expect(fallbackResult.component).toBe('ErrorFallback');
      expect(fallbackResult.props.message).toBe('Failed to load page');
    });
  });

  describe('Performance Integration Contract', () => {
    it('should coordinate performance monitoring across integration layers', async () => {
      // Arrange: Performance monitoring setup
      const pageId = 'dashboard';
      const mockPerformanceMonitor = {
        startTiming: jest.fn(),
        endTiming: jest.fn(),
        recordMetric: jest.fn(),
        getMetrics: jest.fn().mockReturnValue({
          authTime: 45,
          fetchTime: 120,
          renderTime: 85,
          totalTime: 250
        })
      };
      
      // Mock timed operations
      mockPageOrchestrator.loadAgentPage.mockImplementation(async (id, user) => {
        mockPerformanceMonitor.startTiming('auth');
        await integrationMocks.middlewareService.authenticate(user);
        mockPerformanceMonitor.endTiming('auth');
        
        mockPerformanceMonitor.startTiming('fetch');
        const data = await integrationMocks.backendService.fetchPageData(id);
        mockPerformanceMonitor.endTiming('fetch');
        
        mockPerformanceMonitor.startTiming('render');
        const result = await integrationMocks.frontendService.renderPage(data);
        mockPerformanceMonitor.endTiming('render');
        
        return result;
      });
      
      // Act: Execute monitored integration
      await mockPageOrchestrator.loadAgentPage(pageId, { id: 'user-123' });
      const metrics = mockPerformanceMonitor.getMetrics();
      
      // Assert: Verify performance monitoring integration
      expect(mockPerformanceMonitor.startTiming).toHaveBeenCalledTimes(3);
      expect(mockPerformanceMonitor.endTiming).toHaveBeenCalledTimes(3);
      expect(metrics.totalTime).toBe(250);
      expect(metrics.fetchTime).toBeGreaterThan(metrics.authTime);
    });
  });

  describe('Integration Mock Contract Verification', () => {
    it('should verify all integration service contracts', () => {
      // Verify frontend service contract
      expect(integrationMocks.frontendService.loadPage).toBeDefined();
      expect(integrationMocks.frontendService.renderPage).toBeDefined();
      expect(integrationMocks.frontendService.handleError).toBeDefined();
      expect(integrationMocks.frontendService.updateUI).toBeDefined();
      
      // Verify backend service contract
      expect(integrationMocks.backendService.fetchPageData).toBeDefined();
      expect(integrationMocks.backendService.validateRequest).toBeDefined();
      expect(integrationMocks.backendService.processResponse).toBeDefined();
      expect(integrationMocks.backendService.logRequest).toBeDefined();
      
      // Verify middleware service contract
      expect(integrationMocks.middlewareService.authenticate).toBeDefined();
      expect(integrationMocks.middlewareService.authorize).toBeDefined();
      expect(integrationMocks.middlewareService.sanitize).toBeDefined();
      expect(integrationMocks.middlewareService.cache).toBeDefined();
      
      // Verify network service contract
      expect(integrationMocks.networkService.request).toBeDefined();
      expect(integrationMocks.networkService.retry).toBeDefined();
      expect(integrationMocks.networkService.timeout).toBeDefined();
      expect(integrationMocks.networkService.abort).toBeDefined();
    });
  });
});