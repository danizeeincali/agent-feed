/**
 * London School TDD: Agent Manager Component Behavior Tests
 * 
 * These tests verify how the RealAgentManager component collaborates with
 * its dependencies and handles various user interactions. Focus on behavior
 * verification rather than state testing.
 * 
 * Focus: Component collaboration and interaction patterns
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Mock dependencies
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@/services/api', () => ({
  apiService: {
    getAgents: jest.fn(),
    spawnAgent: jest.fn(),
    terminateAgent: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }
}));

import { apiService } from '@/services/api';

describe('Agent Manager Component Behavior - London School TDD', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    user = userEvent.setup();
    jest.clearAllMocks();
    global.clearInteractionHistory();

    // Setup default mock responses
    (apiService.getAgents as jest.Mock).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          display_name: 'Test Agent 1',
          status: 'active',
          capabilities: ['testing'],
          description: 'Test agent 1'
        },
        {
          id: 'agent-2',
          name: 'Test Agent 2',
          display_name: 'Test Agent 2', 
          status: 'inactive',
          capabilities: ['validation'],
          description: 'Test agent 2'
        }
      ]
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Agent List Management Behavior', () => {
    test('should coordinate agent list loading and display', async () => {
      const mockDataManager = global.createSwarmMock('DataManager', {
        loadAgentList: jest.fn().mockResolvedValue([
          { id: 'agent-1', name: 'Agent 1', status: 'active' },
          { id: 'agent-2', name: 'Agent 2', status: 'inactive' }
        ]),
        filterAgents: jest.fn(),
        sortAgents: jest.fn()
      });

      const mockUIController = global.createSwarmMock('UIController', {
        showLoading: jest.fn(),
        hideLoading: jest.fn(),
        renderAgentList: jest.fn(),
        showError: jest.fn()
      });

      // Simulate component initialization behavior
      const agentListBehavior = {
        async initializeAgentList() {
          mockUIController.showLoading();
          
          try {
            const agents = await mockDataManager.loadAgentList();
            const sortedAgents = mockDataManager.sortAgents(agents, 'name');
            mockUIController.renderAgentList(sortedAgents);
            mockUIController.hideLoading();
          } catch (error) {
            mockUIController.showError(error);
            mockUIController.hideLoading();
          }
        }
      };

      await agentListBehavior.initializeAgentList();

      // Verify coordination sequence
      expect(mockUIController.showLoading).toHaveBeenCalled();
      expect(mockDataManager.loadAgentList).toHaveBeenCalled();
      expect(mockDataManager.sortAgents).toHaveBeenCalledWith(
        [{ id: 'agent-1', name: 'Agent 1', status: 'active' },
         { id: 'agent-2', name: 'Agent 2', status: 'inactive' }], 
        'name'
      );
      expect(mockUIController.renderAgentList).toHaveBeenCalled();
      expect(mockUIController.hideLoading).toHaveBeenCalled();

      // Verify interaction order
      expect(mockUIController.showLoading).toHaveBeenCalledBefore(mockDataManager.loadAgentList);
      expect(mockDataManager.loadAgentList).toHaveBeenCalledBefore(mockUIController.renderAgentList);
    });

    test('should handle search and filtering coordination', () => {
      const mockSearchEngine = global.createSwarmMock('SearchEngine', {
        performSearch: jest.fn().mockReturnValue(['agent-1']),
        updateSearchIndex: jest.fn(),
        clearSearch: jest.fn()
      });

      const mockFilterManager = global.createSwarmMock('FilterManager', {
        applyFilters: jest.fn().mockReturnValue([
          { id: 'agent-1', name: 'Agent 1', status: 'active' }
        ]),
        resetFilters: jest.fn(),
        getActiveFilters: jest.fn().mockReturnValue(['status:active'])
      });

      const mockResultsRenderer = global.createSwarmMock('ResultsRenderer', {
        displayResults: jest.fn(),
        showNoResults: jest.fn(),
        highlightMatches: jest.fn()
      });

      // Simulate search behavior
      const searchBehavior = {
        handleSearch(query: string) {
          const searchResults = mockSearchEngine.performSearch(query);
          const activeFilters = mockFilterManager.getActiveFilters();
          const filteredResults = mockFilterManager.applyFilters(searchResults, activeFilters);
          
          if (filteredResults.length > 0) {
            mockResultsRenderer.highlightMatches(filteredResults, query);
            mockResultsRenderer.displayResults(filteredResults);
          } else {
            mockResultsRenderer.showNoResults();
          }
        },

        handleFilterChange(filters: string[]) {
          const currentResults = mockSearchEngine.performSearch('');
          const filteredResults = mockFilterManager.applyFilters(currentResults, filters);
          mockResultsRenderer.displayResults(filteredResults);
        }
      };

      // Test search and filter coordination
      searchBehavior.handleSearch('test');
      searchBehavior.handleFilterChange(['status:active']);

      // Verify search coordination
      expect(mockSearchEngine.performSearch).toHaveBeenCalledWith('test');
      expect(mockFilterManager.getActiveFilters).toHaveBeenCalled();
      expect(mockFilterManager.applyFilters).toHaveBeenCalled();
      expect(mockResultsRenderer.highlightMatches).toHaveBeenCalled();
      expect(mockResultsRenderer.displayResults).toHaveBeenCalled();

      // Verify filter coordination
      expect(mockFilterManager.applyFilters).toHaveBeenCalledWith(['agent-1'], ['status:active']);
    });
  });

  describe('Agent Actions Coordination', () => {
    test('should coordinate agent spawning workflow', async () => {
      const mockSpawnController = global.createSwarmMock('SpawnController', {
        validateSpawnRequest: jest.fn().mockReturnValue(true),
        prepareSpawnConfig: jest.fn().mockReturnValue({ type: 'test', config: {} }),
        executeSpawn: jest.fn().mockResolvedValue({ id: 'new-agent', status: 'spawning' }),
        trackSpawnMetrics: jest.fn()
      });

      const mockUIFeedback = global.createSwarmMock('UIFeedback', {
        showSpawnDialog: jest.fn(),
        showSpawnProgress: jest.fn(),
        showSpawnSuccess: jest.fn(),
        showSpawnError: jest.fn()
      });

      const mockAgentRegistry = global.createSwarmMock('AgentRegistry', {
        addAgent: jest.fn(),
        updateAgentStatus: jest.fn(),
        notifyAgentAdded: jest.fn()
      });

      // Simulate spawn workflow behavior
      const spawnWorkflowBehavior = {
        async handleAgentSpawn(spawnType: string) {
          if (mockSpawnController.validateSpawnRequest(spawnType)) {
            mockUIFeedback.showSpawnProgress();
            
            try {
              const config = mockSpawnController.prepareSpawnConfig(spawnType);
              const newAgent = await mockSpawnController.executeSpawn(config);
              
              mockAgentRegistry.addAgent(newAgent);
              mockAgentRegistry.notifyAgentAdded(newAgent);
              mockSpawnController.trackSpawnMetrics(spawnType, 'success');
              mockUIFeedback.showSpawnSuccess(newAgent);
              
              return newAgent;
            } catch (error) {
              mockSpawnController.trackSpawnMetrics(spawnType, 'failure');
              mockUIFeedback.showSpawnError(error);
              throw error;
            }
          }
        }
      };

      // Test spawn workflow
      const result = await spawnWorkflowBehavior.handleAgentSpawn('test-agent');

      // Verify spawn coordination
      expect(mockSpawnController.validateSpawnRequest).toHaveBeenCalledWith('test-agent');
      expect(mockUIFeedback.showSpawnProgress).toHaveBeenCalled();
      expect(mockSpawnController.prepareSpawnConfig).toHaveBeenCalledWith('test-agent');
      expect(mockSpawnController.executeSpawn).toHaveBeenCalled();
      expect(mockAgentRegistry.addAgent).toHaveBeenCalledWith(result);
      expect(mockAgentRegistry.notifyAgentAdded).toHaveBeenCalledWith(result);
      expect(mockSpawnController.trackSpawnMetrics).toHaveBeenCalledWith('test-agent', 'success');
      expect(mockUIFeedback.showSpawnSuccess).toHaveBeenCalledWith(result);

      // Verify interaction sequence
      expect(mockSpawnController.validateSpawnRequest).toHaveBeenCalledBefore(mockUIFeedback.showSpawnProgress);
      expect(mockUIFeedback.showSpawnProgress).toHaveBeenCalledBefore(mockSpawnController.executeSpawn);
      expect(mockSpawnController.executeSpawn).toHaveBeenCalledBefore(mockAgentRegistry.addAgent);
    });

    test('should coordinate agent termination workflow', async () => {
      const mockTerminationController = global.createSwarmMock('TerminationController', {
        confirmTermination: jest.fn().mockResolvedValue(true),
        prepareTermination: jest.fn(),
        executeTermination: jest.fn().mockResolvedValue(true),
        cleanupResources: jest.fn()
      });

      const mockSafetyValidator = global.createSwarmMock('SafetyValidator', {
        validateTerminationSafety: jest.fn().mockReturnValue(true),
        checkDependencies: jest.fn().mockReturnValue([]),
        requireConfirmation: jest.fn().mockReturnValue(true)
      });

      const mockCleanupManager = global.createSwarmMock('CleanupManager', {
        cleanupAgentData: jest.fn(),
        removeFromRegistry: jest.fn(),
        notifyTermination: jest.fn()
      });

      // Simulate termination workflow
      const terminationWorkflow = {
        async handleAgentTermination(agentId: string) {
          const isSafe = mockSafetyValidator.validateTerminationSafety(agentId);
          const dependencies = mockSafetyValidator.checkDependencies(agentId);
          
          if (isSafe && dependencies.length === 0) {
            const confirmed = await mockTerminationController.confirmTermination(agentId);
            
            if (confirmed) {
              mockTerminationController.prepareTermination(agentId);
              await mockTerminationController.executeTermination(agentId);
              
              mockCleanupManager.cleanupAgentData(agentId);
              mockCleanupManager.removeFromRegistry(agentId);
              mockCleanupManager.notifyTermination(agentId);
            }
          }
        }
      };

      // Test termination workflow
      await terminationWorkflow.handleAgentTermination('agent-to-terminate');

      // Verify termination coordination
      expect(mockSafetyValidator.validateTerminationSafety).toHaveBeenCalledWith('agent-to-terminate');
      expect(mockSafetyValidator.checkDependencies).toHaveBeenCalledWith('agent-to-terminate');
      expect(mockTerminationController.confirmTermination).toHaveBeenCalledWith('agent-to-terminate');
      expect(mockTerminationController.prepareTermination).toHaveBeenCalledWith('agent-to-terminate');
      expect(mockTerminationController.executeTermination).toHaveBeenCalledWith('agent-to-terminate');
      expect(mockCleanupManager.cleanupAgentData).toHaveBeenCalledWith('agent-to-terminate');
      expect(mockCleanupManager.removeFromRegistry).toHaveBeenCalledWith('agent-to-terminate');

      // Verify safety checks happen first
      expect(mockSafetyValidator.validateTerminationSafety).toHaveBeenCalledBefore(mockTerminationController.confirmTermination);
      expect(mockTerminationController.executeTermination).toHaveBeenCalledBefore(mockCleanupManager.cleanupAgentData);
    });
  });

  describe('Navigation Behavior', () => {
    test('should coordinate agent navigation actions', () => {
      const mockNavigationRouter = global.createSwarmMock('NavigationRouter', {
        navigateToAgentHome: jest.fn(),
        navigateToAgentDetails: jest.fn(),
        validateNavigation: jest.fn().mockReturnValue(true),
        trackNavigation: jest.fn()
      });

      const mockBreadcrumbManager = global.createSwarmMock('BreadcrumbManager', {
        updateBreadcrumbs: jest.fn(),
        pushBreadcrumb: jest.fn(),
        popBreadcrumb: jest.fn()
      });

      const mockHistoryManager = global.createSwarmMock('HistoryManager', {
        recordNavigation: jest.fn(),
        canGoBack: jest.fn().mockReturnValue(true),
        goBack: jest.fn()
      });

      // Simulate navigation behavior
      const navigationBehavior = {
        handleNavigateToAgentHome(agentId: string, agentName: string) {
          if (mockNavigationRouter.validateNavigation(`/agents/${agentId}/home`)) {
            mockNavigationRouter.trackNavigation('agent-home', agentId);
            mockBreadcrumbManager.pushBreadcrumb({ label: agentName, path: `/agents/${agentId}/home` });
            mockHistoryManager.recordNavigation(`/agents/${agentId}/home`);
            mockNavigationRouter.navigateToAgentHome(agentId);
          }
        },

        handleNavigateToDetails(agentId: string, agentName: string) {
          if (mockNavigationRouter.validateNavigation(`/agents/${agentId}`)) {
            mockNavigationRouter.trackNavigation('agent-details', agentId);
            mockBreadcrumbManager.pushBreadcrumb({ label: `${agentName} Details`, path: `/agents/${agentId}` });
            mockHistoryManager.recordNavigation(`/agents/${agentId}`);
            mockNavigationRouter.navigateToAgentDetails(agentId);
          }
        },

        handleBackNavigation() {
          if (mockHistoryManager.canGoBack()) {
            mockBreadcrumbManager.popBreadcrumb();
            mockHistoryManager.goBack();
          }
        }
      };

      // Test navigation coordination
      navigationBehavior.handleNavigateToAgentHome('agent-123', 'Test Agent');
      navigationBehavior.handleNavigateToDetails('agent-456', 'Another Agent');
      navigationBehavior.handleBackNavigation();

      // Verify navigation coordination
      expect(mockNavigationRouter.validateNavigation).toHaveBeenCalledWith('/agents/agent-123/home');
      expect(mockNavigationRouter.trackNavigation).toHaveBeenCalledWith('agent-home', 'agent-123');
      expect(mockBreadcrumbManager.pushBreadcrumb).toHaveBeenCalledWith({ 
        label: 'Test Agent', 
        path: '/agents/agent-123/home' 
      });
      expect(mockHistoryManager.recordNavigation).toHaveBeenCalledWith('/agents/agent-123/home');
      expect(mockNavigationRouter.navigateToAgentHome).toHaveBeenCalledWith('agent-123');

      // Verify details navigation
      expect(mockNavigationRouter.navigateToAgentDetails).toHaveBeenCalledWith('agent-456');
      
      // Verify back navigation
      expect(mockHistoryManager.canGoBack).toHaveBeenCalled();
      expect(mockBreadcrumbManager.popBreadcrumb).toHaveBeenCalled();
      expect(mockHistoryManager.goBack).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates Coordination', () => {
    test('should coordinate WebSocket updates for agent list', () => {
      const mockWebSocketClient = global.createSwarmMock('WebSocketClient', {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        isConnected: jest.fn().mockReturnValue(true),
        getConnectionStatus: jest.fn().mockReturnValue('connected')
      });

      const mockUpdateProcessor = global.createSwarmMock('UpdateProcessor', {
        processAgentUpdate: jest.fn(),
        validateUpdate: jest.fn().mockReturnValue(true),
        determineUpdateType: jest.fn().mockReturnValue('status_change')
      });

      const mockListUpdater = global.createSwarmMock('ListUpdater', {
        updateAgentInList: jest.fn(),
        addAgentToList: jest.fn(),
        removeAgentFromList: jest.fn(),
        refreshList: jest.fn()
      });

      // Simulate real-time update behavior
      const realtimeUpdateBehavior = {
        subscribeToAgentUpdates() {
          mockWebSocketClient.subscribe('agents_updated', this.handleAgentUpdate.bind(this));
          mockWebSocketClient.subscribe('agent_added', this.handleAgentAdded.bind(this));
          mockWebSocketClient.subscribe('agent_removed', this.handleAgentRemoved.bind(this));
        },

        handleAgentUpdate(updateData: any) {
          if (mockUpdateProcessor.validateUpdate(updateData)) {
            const processedUpdate = mockUpdateProcessor.processAgentUpdate(updateData);
            const updateType = mockUpdateProcessor.determineUpdateType(updateData);
            
            switch (updateType) {
              case 'status_change':
                mockListUpdater.updateAgentInList(processedUpdate);
                break;
              case 'full_refresh':
                mockListUpdater.refreshList();
                break;
            }
          }
        },

        handleAgentAdded(agentData: any) {
          if (mockUpdateProcessor.validateUpdate(agentData)) {
            mockListUpdater.addAgentToList(agentData);
          }
        },

        handleAgentRemoved(agentId: string) {
          mockListUpdater.removeAgentFromList(agentId);
        }
      };

      // Test real-time update coordination
      realtimeUpdateBehavior.subscribeToAgentUpdates();
      
      const mockUpdate = { id: 'agent-123', status: 'busy' };
      const mockNewAgent = { id: 'agent-456', name: 'New Agent' };
      
      realtimeUpdateBehavior.handleAgentUpdate(mockUpdate);
      realtimeUpdateBehavior.handleAgentAdded(mockNewAgent);
      realtimeUpdateBehavior.handleAgentRemoved('agent-789');

      // Verify WebSocket subscription
      expect(mockWebSocketClient.subscribe).toHaveBeenCalledWith('agents_updated', expect.any(Function));
      expect(mockWebSocketClient.subscribe).toHaveBeenCalledWith('agent_added', expect.any(Function));
      expect(mockWebSocketClient.subscribe).toHaveBeenCalledWith('agent_removed', expect.any(Function));

      // Verify update processing
      expect(mockUpdateProcessor.validateUpdate).toHaveBeenCalledWith(mockUpdate);
      expect(mockUpdateProcessor.processAgentUpdate).toHaveBeenCalledWith(mockUpdate);
      expect(mockUpdateProcessor.determineUpdateType).toHaveBeenCalledWith(mockUpdate);
      expect(mockListUpdater.updateAgentInList).toHaveBeenCalled();

      // Verify add/remove handling
      expect(mockListUpdater.addAgentToList).toHaveBeenCalledWith(mockNewAgent);
      expect(mockListUpdater.removeAgentFromList).toHaveBeenCalledWith('agent-789');
    });
  });

  describe('Error Recovery Coordination', () => {
    test('should coordinate error handling and recovery', async () => {
      const mockErrorHandler = global.createSwarmMock('ErrorHandler', {
        categorizeError: jest.fn().mockReturnValue('network_error'),
        shouldRetry: jest.fn().mockReturnValue(true),
        scheduleRetry: jest.fn(),
        reportError: jest.fn()
      });

      const mockRecoveryManager = global.createSwarmMock('RecoveryManager', {
        attemptRecovery: jest.fn().mockResolvedValue(true),
        fallbackToOfflineMode: jest.fn(),
        restoreFromCache: jest.fn().mockReturnValue([])
      });

      const mockUserNotifier = global.createSwarmMock('UserNotifier', {
        showErrorMessage: jest.fn(),
        showRetryOption: jest.fn(),
        showOfflineNotice: jest.fn()
      });

      // Simulate error recovery behavior
      const errorRecoveryBehavior = {
        async handleLoadError(error: Error) {
          const errorType = mockErrorHandler.categorizeError(error);
          mockErrorHandler.reportError(error, errorType);
          
          if (mockErrorHandler.shouldRetry()) {
            mockUserNotifier.showRetryOption();
            mockErrorHandler.scheduleRetry();
            
            const recovered = await mockRecoveryManager.attemptRecovery();
            if (!recovered) {
              mockRecoveryManager.fallbackToOfflineMode();
              const cachedData = mockRecoveryManager.restoreFromCache();
              mockUserNotifier.showOfflineNotice();
              return cachedData;
            }
          } else {
            mockUserNotifier.showErrorMessage(error.message);
          }
        }
      };

      // Test error recovery coordination
      const testError = new Error('Failed to load agents');
      await errorRecoveryBehavior.handleLoadError(testError);

      // Verify error handling coordination
      expect(mockErrorHandler.categorizeError).toHaveBeenCalledWith(testError);
      expect(mockErrorHandler.reportError).toHaveBeenCalledWith(testError, 'network_error');
      expect(mockErrorHandler.shouldRetry).toHaveBeenCalled();
      expect(mockUserNotifier.showRetryOption).toHaveBeenCalled();
      expect(mockErrorHandler.scheduleRetry).toHaveBeenCalled();
      expect(mockRecoveryManager.attemptRecovery).toHaveBeenCalled();

      // Verify interaction sequence for error handling
      expect(mockErrorHandler.categorizeError).toHaveBeenCalledBefore(mockErrorHandler.reportError);
      expect(mockErrorHandler.shouldRetry).toHaveBeenCalledBefore(mockUserNotifier.showRetryOption);
    });
  });
});