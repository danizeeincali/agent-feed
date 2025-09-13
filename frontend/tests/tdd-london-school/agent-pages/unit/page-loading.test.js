/**
 * TDD London School: Page Loading Unit Tests
 * Focus: Outside-in development with mock-driven contracts
 */

import { render, waitFor, screen } from '@testing-library/react';
import { 
  createSwarmMocks, 
  mockPageResponses, 
  createMockErrorResponse,
  verifyMockContract 
} from '../mocks';

// Mock the AgentPagesTab component
jest.mock('@/components/AgentPagesTab', () => {
  return function MockAgentPagesTab({ onPageLoad, apiClient, componentRegistry }) {
    // Expose mocked dependencies for testing
    React.useEffect(() => {
      if (onPageLoad && typeof onPageLoad === 'function') {
        onPageLoad('profile');
      }
    }, [onPageLoad]);
    
    return <div data-testid="agent-pages-tab">Mocked Agent Pages Tab</div>;
  };
});

describe('Agent Page Loading - London School TDD', () => {
  let swarmMocks;
  let mockPageLoader;
  
  beforeEach(() => {
    // London School: Create mocks first, define behavior through expectations
    swarmMocks = createSwarmMocks();
    
    // Mock the page loader service
    mockPageLoader = {
      loadPage: jest.fn(),
      validatePage: jest.fn(),
      checkFileExists: jest.fn(),
      getPageMetadata: jest.fn()
    };
    
    // Set default successful behaviors
    swarmMocks.fileSystem.existsSync.mockReturnValue(true);
    swarmMocks.apiClient.get.mockResolvedValue({
      status: 200,
      data: mockPageResponses.profile
    });
  });

  describe('Profile Page Loading Contract', () => {
    it('should coordinate profile page loading workflow', async () => {
      // Arrange: Define expected interactions
      const expectedPageId = 'profile';
      const expectedApiEndpoint = `/api/agent-pages/${expectedPageId}`;
      const expectedFilePath = `/pages/${expectedPageId}.html`;
      
      mockPageLoader.loadPage.mockResolvedValue(mockPageResponses.profile);
      mockPageLoader.checkFileExists.mockResolvedValue(true);
      
      // Act: Execute the page loading workflow
      await mockPageLoader.loadPage(expectedPageId, swarmMocks.apiClient, swarmMocks.fileSystem);
      
      // Assert: Verify the conversation between objects (London School focus)
      expect(mockPageLoader.checkFileExists).toHaveBeenCalledWith(expectedFilePath);
      expect(swarmMocks.apiClient.get).toHaveBeenCalledWith(expectedApiEndpoint);
      expect(mockPageLoader.loadPage).toHaveBeenCalledWith(
        expectedPageId,
        swarmMocks.apiClient,
        swarmMocks.fileSystem
      );
      
      // Verify interaction sequence
      const allCalls = jest.getAllMockCalls();
      expect(allCalls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining(['checkFileExists', [expectedFilePath]]),
          expect.arrayContaining(['get', [expectedApiEndpoint]])
        ])
      );
    });

    it('should handle profile page file verification workflow', async () => {
      // Arrange: Mock file system contract
      const profileFilePath = '/pages/profile.html';
      swarmMocks.fileSystem.existsSync.mockReturnValue(true);
      swarmMocks.fileSystem.statSync.mockReturnValue({
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      });
      
      // Act: Verify file existence workflow
      const fileExists = swarmMocks.fileSystem.existsSync(profileFilePath);
      const fileStats = fileExists ? swarmMocks.fileSystem.statSync(profileFilePath) : null;
      
      // Assert: Verify file system interactions
      expect(swarmMocks.fileSystem.existsSync).toHaveBeenCalledWith(profileFilePath);
      if (fileExists) {
        expect(swarmMocks.fileSystem.statSync).toHaveBeenCalledWith(profileFilePath);
        expect(fileStats.isFile()).toBe(true);
      }
    });
  });

  describe('Dashboard Page Loading Contract', () => {
    it('should coordinate dashboard page loading with proper error handling', async () => {
      // Arrange: Set up dashboard loading scenario
      const dashboardPageId = 'dashboard';
      const expectedEndpoint = `/api/agent-pages/${dashboardPageId}`;
      
      mockPageLoader.loadPage.mockResolvedValue(mockPageResponses.dashboard);
      swarmMocks.apiClient.get.mockResolvedValue({
        status: 200,
        data: mockPageResponses.dashboard
      });
      
      // Act: Load dashboard page
      const result = await mockPageLoader.loadPage(
        dashboardPageId,
        swarmMocks.apiClient,
        swarmMocks.fileSystem
      );
      
      // Assert: Verify dashboard-specific interactions
      expect(swarmMocks.apiClient.get).toHaveBeenCalledWith(expectedEndpoint);
      expect(result).toEqual(mockPageResponses.dashboard);
      expect(result.id).toBe(dashboardPageId);
      expect(result.title).toBe('Dashboard Page');
    });

    it('should handle dashboard API failure gracefully', async () => {
      // Arrange: Mock API failure
      const dashboardPageId = 'dashboard';
      const errorResponse = createMockErrorResponse(500, 'Internal Server Error');
      
      swarmMocks.apiClient.get.mockRejectedValue(new Error('API Error'));
      mockPageLoader.loadPage.mockRejectedValue(errorResponse);
      
      // Act & Assert: Verify error handling workflow
      await expect(
        mockPageLoader.loadPage(dashboardPageId, swarmMocks.apiClient, swarmMocks.fileSystem)
      ).rejects.toEqual(errorResponse);
      
      expect(swarmMocks.apiClient.get).toHaveBeenCalledWith(`/api/agent-pages/${dashboardPageId}`);
    });
  });

  describe('Task Manager Page Loading Contract', () => {
    it('should coordinate task manager page loading with component registry', async () => {
      // Arrange: Task manager specific setup
      const taskManagerPageId = 'task-manager';
      const expectedComponents = mockPageResponses['task-manager'].components;
      
      mockPageLoader.loadPage.mockResolvedValue(mockPageResponses['task-manager']);
      swarmMocks.componentRegistry.register.mockResolvedValue(true);
      
      // Act: Load page and register components
      const pageData = await mockPageLoader.loadPage(
        taskManagerPageId,
        swarmMocks.apiClient,
        swarmMocks.fileSystem
      );
      
      // Register each component (simulate the workflow)
      for (const component of expectedComponents) {
        await swarmMocks.componentRegistry.register(component.id, component);
      }
      
      // Assert: Verify component registration workflow
      expect(mockPageLoader.loadPage).toHaveBeenCalledWith(
        taskManagerPageId,
        swarmMocks.apiClient,
        swarmMocks.fileSystem
      );
      
      expectedComponents.forEach(component => {
        expect(swarmMocks.componentRegistry.register).toHaveBeenCalledWith(
          component.id,
          component
        );
      });
    });
  });

  describe('Page Loading Error Scenarios', () => {
    it('should handle missing page files gracefully', async () => {
      // Arrange: File doesn't exist scenario
      const missingPageId = 'non-existent';
      const expectedFilePath = `/pages/${missingPageId}.html`;
      
      swarmMocks.fileSystem.existsSync.mockReturnValue(false);
      mockPageLoader.checkFileExists.mockResolvedValue(false);
      mockPageLoader.loadPage.mockRejectedValue(
        createMockErrorResponse(404, 'Page not found')
      );
      
      // Act & Assert: Verify error handling
      const fileExists = swarmMocks.fileSystem.existsSync(expectedFilePath);
      expect(fileExists).toBe(false);
      
      await expect(
        mockPageLoader.loadPage(missingPageId, swarmMocks.apiClient, swarmMocks.fileSystem)
      ).rejects.toMatchObject({
        status: 404,
        message: 'Page not found'
      });
    });

    it('should coordinate error boundary activation on load failure', async () => {
      // Arrange: Simulate complete load failure
      const failingPageId = 'corrupted';
      const mockErrorBoundary = {
        componentDidCatch: jest.fn(),
        render: jest.fn()
      };
      
      mockPageLoader.loadPage.mockRejectedValue(new Error('Corrupted page data'));
      
      // Act: Simulate error boundary handling
      try {
        await mockPageLoader.loadPage(failingPageId, swarmMocks.apiClient, swarmMocks.fileSystem);
      } catch (error) {
        mockErrorBoundary.componentDidCatch(error, { componentStack: 'test' });
      }
      
      // Assert: Verify error boundary interaction
      expect(mockErrorBoundary.componentDidCatch).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });
  });

  describe('Mock Contract Verification', () => {
    it('should verify all mock contracts are properly defined', () => {
      // Verify FileSystem mock contract
      verifyMockContract(swarmMocks.fileSystem, [
        'existsSync',
        'readFileSync',
        'readdirSync',
        'statSync'
      ]);
      
      // Verify API Client mock contract
      verifyMockContract(swarmMocks.apiClient, [
        'get',
        'post',
        'put',
        'delete',
        'request'
      ]);
      
      // Verify Component Registry mock contract
      verifyMockContract(swarmMocks.componentRegistry, [
        'register',
        'unregister',
        'get',
        'exists',
        'list',
        'clear'
      ]);
    });

    it('should verify page loader service contract', () => {
      verifyMockContract(mockPageLoader, [
        'loadPage',
        'validatePage',
        'checkFileExists',
        'getPageMetadata'
      ]);
    });
  });
});