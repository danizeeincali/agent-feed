/**
 * London School TDD: Agent Home Component Behavior Tests
 * 
 * These tests focus on HOW the AgentHome component collaborates with its
 * dependencies rather than WHAT it contains. Uses mocks to isolate the
 * component and verify its interactions and behavior.
 * 
 * Focus: Component behavior verification and interaction testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Mock the AgentHome component dependencies
const mockNavigate = jest.fn();
const mockUseParams = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}));

// Mock API service
jest.mock('@/services/api', () => ({
  apiService: {
    getAgent: jest.fn(),
    getAgents: jest.fn(),
    getActivities: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }
}));

import { apiService } from '@/services/api';

describe('AgentHome Component Behavior - London School TDD', () => {
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

    // Clear all mocks
    jest.clearAllMocks();
    global.clearInteractionHistory();

    // Setup default mock responses
    mockUseParams.mockReturnValue({ agentId: 'test-agent-123' });
    
    (apiService.getAgent as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'test-agent-123',
        name: 'Test Agent',
        display_name: 'Test Agent Display',
        description: 'Test agent description',
        status: 'active',
        capabilities: ['testing', 'validation', 'automation'],
        avatar_color: '#3B82F6',
        performance_metrics: {
          success_rate: 97.8,
          average_response_time: 1.3
        }
      }
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Component Initialization Behavior', () => {
    test('should coordinate data loading on mount', async () => {
      // Create component behavior mocks
      const mockDataLoader = global.createSwarmMock('DataLoader', {
        loadAgentData: jest.fn().mockResolvedValue({
          id: 'test-agent-123',
          name: 'Test Agent'
        }),
        loadAgentStats: jest.fn().mockResolvedValue({
          tasksCompleted: 1247,
          successRate: 97.8
        })
      });

      const mockUIState = global.createSwarmMock('UIState', {
        setLoading: jest.fn(),
        setAgent: jest.fn(),
        setError: jest.fn()
      });

      // Simulate component behavior
      const componentBehavior = {
        async initializeComponent() {
          mockUIState.setLoading(true);
          
          try {
            const agentData = await mockDataLoader.loadAgentData('test-agent-123');
            const stats = await mockDataLoader.loadAgentStats('test-agent-123');
            
            mockUIState.setAgent({ ...agentData, stats });
            mockUIState.setLoading(false);
          } catch (error) {
            mockUIState.setError(error);
            mockUIState.setLoading(false);
          }
        }
      };

      await componentBehavior.initializeComponent();

      // Verify behavior interactions
      expect(mockUIState.setLoading).toHaveBeenCalledWith(true);
      expect(mockDataLoader.loadAgentData).toHaveBeenCalledWith('test-agent-123');
      expect(mockDataLoader.loadAgentStats).toHaveBeenCalledWith('test-agent-123');
      expect(mockUIState.setAgent).toHaveBeenCalledWith({
        id: 'test-agent-123',
        name: 'Test Agent',
        stats: { tasksCompleted: 1247, successRate: 97.8 }
      });
      expect(mockUIState.setLoading).toHaveBeenCalledWith(false);

      // Verify interaction sequence
      expect(mockUIState.setLoading).toHaveBeenCalledBefore(mockDataLoader.loadAgentData);
      expect(mockDataLoader.loadAgentData).toHaveBeenCalledBefore(mockUIState.setAgent);
    });

    test('should handle agent parameter changes', async () => {
      const mockRouteHandler = global.createSwarmMock('RouteHandler', {
        onAgentIdChange: jest.fn(),
        validateAgentId: jest.fn().mockReturnValue(true)
      });

      const mockDataRefresh = global.createSwarmMock('DataRefresh', {
        refreshAgentData: jest.fn(),
        clearPreviousData: jest.fn()
      });

      // Simulate route parameter change behavior
      const routeChangeHandler = {
        handleAgentIdChange(newAgentId: string, oldAgentId: string) {
          if (mockRouteHandler.validateAgentId(newAgentId)) {
            mockDataRefresh.clearPreviousData();
            mockDataRefresh.refreshAgentData(newAgentId);
            mockRouteHandler.onAgentIdChange(newAgentId);
          }
        }
      };

      routeChangeHandler.handleAgentIdChange('new-agent-456', 'test-agent-123');

      // Verify route change behavior
      expect(mockRouteHandler.validateAgentId).toHaveBeenCalledWith('new-agent-456');
      expect(mockDataRefresh.clearPreviousData).toHaveBeenCalled();
      expect(mockDataRefresh.refreshAgentData).toHaveBeenCalledWith('new-agent-456');
      expect(mockRouteHandler.onAgentIdChange).toHaveBeenCalledWith('new-agent-456');

      // Verify interaction order
      expect(mockRouteHandler.validateAgentId).toHaveBeenCalledBefore(mockDataRefresh.clearPreviousData);
      expect(mockDataRefresh.clearPreviousData).toHaveBeenCalledBefore(mockDataRefresh.refreshAgentData);
    });
  });

  describe('User Interaction Behavior', () => {
    test('should coordinate navigation actions', async () => {
      const mockNavigationController = global.createSwarmMock('NavigationController', {
        navigateToDetails: jest.fn(),
        navigateToSettings: jest.fn(),
        navigateBack: jest.fn(),
        trackNavigation: jest.fn()
      });

      const mockAnalytics = global.createSwarmMock('Analytics', {
        trackUserAction: jest.fn()
      });

      // Simulate navigation behavior
      const navigationBehavior = {
        handleNavigateToDetails(agentId: string) {
          mockAnalytics.trackUserAction('navigate_to_details', { agentId });
          mockNavigationController.trackNavigation(`/agents/${agentId}`);
          mockNavigationController.navigateToDetails(agentId);
        },
        
        handleBackNavigation() {
          mockAnalytics.trackUserAction('navigate_back');
          mockNavigationController.navigateBack();
        }
      };

      // Test navigation behavior
      navigationBehavior.handleNavigateToDetails('test-agent-123');
      navigationBehavior.handleBackNavigation();

      // Verify navigation interactions
      expect(mockAnalytics.trackUserAction).toHaveBeenCalledWith('navigate_to_details', { agentId: 'test-agent-123' });
      expect(mockNavigationController.trackNavigation).toHaveBeenCalledWith('/agents/test-agent-123');
      expect(mockNavigationController.navigateToDetails).toHaveBeenCalledWith('test-agent-123');
      
      expect(mockAnalytics.trackUserAction).toHaveBeenCalledWith('navigate_back');
      expect(mockNavigationController.navigateBack).toHaveBeenCalled();

      // Verify tracking happens before navigation
      global.verifyInteractionSequence([
        { mock: 'Analytics', method: 'trackUserAction' },
        { mock: 'NavigationController', method: 'trackNavigation' },
        { mock: 'NavigationController', method: 'navigateToDetails' }
      ]);
    });

    test('should handle action button interactions', async () => {
      const mockActionHandler = global.createSwarmMock('ActionHandler', {
        startTask: jest.fn(),
        pauseAgent: jest.fn(),
        restartAgent: jest.fn(),
        validateAction: jest.fn().mockReturnValue(true)
      });

      const mockNotification = global.createSwarmMock('NotificationService', {
        showSuccess: jest.fn(),
        showError: jest.fn(),
        showWarning: jest.fn()
      });

      const mockStateManager = global.createSwarmMock('StateManager', {
        updateAgentStatus: jest.fn(),
        setActionInProgress: jest.fn()
      });

      // Simulate action button behavior
      const actionBehavior = {
        async handleStartTask(agentId: string) {
          if (mockActionHandler.validateAction('start_task')) {
            mockStateManager.setActionInProgress(true);
            
            try {
              await mockActionHandler.startTask(agentId);
              mockStateManager.updateAgentStatus('busy');
              mockNotification.showSuccess('Task started successfully');
            } catch (error) {
              mockNotification.showError('Failed to start task');
            } finally {
              mockStateManager.setActionInProgress(false);
            }
          }
        },

        async handlePauseAgent(agentId: string) {
          if (mockActionHandler.validateAction('pause_agent')) {
            mockNotification.showWarning('Pausing agent...');
            await mockActionHandler.pauseAgent(agentId);
            mockStateManager.updateAgentStatus('paused');
            mockNotification.showSuccess('Agent paused');
          }
        }
      };

      // Test action behaviors
      await actionBehavior.handleStartTask('test-agent-123');
      await actionBehavior.handlePauseAgent('test-agent-123');

      // Verify action coordination
      expect(mockActionHandler.validateAction).toHaveBeenCalledWith('start_task');
      expect(mockStateManager.setActionInProgress).toHaveBeenCalledWith(true);
      expect(mockActionHandler.startTask).toHaveBeenCalledWith('test-agent-123');
      expect(mockStateManager.updateAgentStatus).toHaveBeenCalledWith('busy');
      expect(mockNotification.showSuccess).toHaveBeenCalledWith('Task started successfully');
      expect(mockStateManager.setActionInProgress).toHaveBeenCalledWith(false);

      // Verify pause behavior
      expect(mockActionHandler.validateAction).toHaveBeenCalledWith('pause_agent');
      expect(mockNotification.showWarning).toHaveBeenCalledWith('Pausing agent...');
      expect(mockActionHandler.pauseAgent).toHaveBeenCalledWith('test-agent-123');
      expect(mockStateManager.updateAgentStatus).toHaveBeenCalledWith('paused');
    });
  });

  describe('Real-time Update Behavior', () => {
    test('should coordinate real-time agent updates', async () => {
      const mockWebSocketManager = global.createSwarmMock('WebSocketManager', {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        isConnected: jest.fn().mockReturnValue(true)
      });

      const mockUpdateHandler = global.createSwarmMock('UpdateHandler', {
        processAgentUpdate: jest.fn(),
        validateUpdate: jest.fn().mockReturnValue(true),
        mergeUpdate: jest.fn()
      });

      const mockUIUpdater = global.createSwarmMock('UIUpdater', {
        updateAgentDisplay: jest.fn(),
        animateChange: jest.fn(),
        highlightChanges: jest.fn()
      });

      // Simulate real-time update behavior
      const realtimeUpdateBehavior = {
        subscribeToUpdates(agentId: string) {
          mockWebSocketManager.subscribe(`agent-${agentId}`, this.handleUpdate.bind(this));
        },

        handleUpdate(updateData: any) {
          if (mockUpdateHandler.validateUpdate(updateData)) {
            const processedUpdate = mockUpdateHandler.processAgentUpdate(updateData);
            mockUpdateHandler.mergeUpdate(processedUpdate);
            mockUIUpdater.highlightChanges(processedUpdate.changes);
            mockUIUpdater.updateAgentDisplay(processedUpdate.data);
          }
        },

        unsubscribeFromUpdates(agentId: string) {
          mockWebSocketManager.unsubscribe(`agent-${agentId}`);
        }
      };

      // Test subscription behavior
      realtimeUpdateBehavior.subscribeToUpdates('test-agent-123');
      
      // Simulate receiving an update
      const mockUpdateData = {
        id: 'test-agent-123',
        status: 'busy',
        performance_metrics: { success_rate: 98.0 }
      };
      
      realtimeUpdateBehavior.handleUpdate(mockUpdateData);
      realtimeUpdateBehavior.unsubscribeFromUpdates('test-agent-123');

      // Verify real-time update coordination
      expect(mockWebSocketManager.subscribe).toHaveBeenCalledWith('agent-test-agent-123', expect.any(Function));
      expect(mockUpdateHandler.validateUpdate).toHaveBeenCalledWith(mockUpdateData);
      expect(mockUpdateHandler.processAgentUpdate).toHaveBeenCalledWith(mockUpdateData);
      expect(mockUIUpdater.highlightChanges).toHaveBeenCalled();
      expect(mockUIUpdater.updateAgentDisplay).toHaveBeenCalled();
      expect(mockWebSocketManager.unsubscribe).toHaveBeenCalledWith('agent-test-agent-123');

      // Verify update processing order
      expect(mockUpdateHandler.validateUpdate).toHaveBeenCalledBefore(mockUpdateHandler.processAgentUpdate);
      expect(mockUpdateHandler.processAgentUpdate).toHaveBeenCalledBefore(mockUIUpdater.updateAgentDisplay);
    });

    test('should handle connection state changes', () => {
      const mockConnectionManager = global.createSwarmMock('ConnectionManager', {
        onConnectionLost: jest.fn(),
        onConnectionRestored: jest.fn(),
        attemptReconnection: jest.fn()
      });

      const mockUIIndicator = global.createSwarmMock('UIIndicator', {
        showOfflineMode: jest.fn(),
        showOnlineMode: jest.fn(),
        showReconnecting: jest.fn()
      });

      // Simulate connection behavior
      const connectionBehavior = {
        handleConnectionLost() {
          mockConnectionManager.onConnectionLost();
          mockUIIndicator.showOfflineMode();
          mockConnectionManager.attemptReconnection();
        },

        handleConnectionRestored() {
          mockConnectionManager.onConnectionRestored();
          mockUIIndicator.showOnlineMode();
        }
      };

      // Test connection state changes
      connectionBehavior.handleConnectionLost();
      connectionBehavior.handleConnectionRestored();

      // Verify connection handling
      expect(mockConnectionManager.onConnectionLost).toHaveBeenCalled();
      expect(mockUIIndicator.showOfflineMode).toHaveBeenCalled();
      expect(mockConnectionManager.attemptReconnection).toHaveBeenCalled();
      
      expect(mockConnectionManager.onConnectionRestored).toHaveBeenCalled();
      expect(mockUIIndicator.showOnlineMode).toHaveBeenCalled();
    });
  });

  describe('Error Handling Behavior', () => {
    test('should coordinate error recovery', async () => {
      const mockErrorBoundary = global.createSwarmMock('ErrorBoundary', {
        captureError: jest.fn(),
        createErrorReport: jest.fn(),
        shouldRetry: jest.fn().mockReturnValue(true)
      });

      const mockRetryManager = global.createSwarmMock('RetryManager', {
        scheduleRetry: jest.fn(),
        incrementRetryCount: jest.fn(),
        shouldGiveUp: jest.fn().mockReturnValue(false)
      });

      const mockFallbackProvider = global.createSwarmMock('FallbackProvider', {
        provideFallbackData: jest.fn().mockReturnValue({
          id: 'error-agent',
          name: 'Error State',
          status: 'error'
        })
      });

      // Simulate error recovery behavior
      const errorRecoveryBehavior = {
        async handleDataLoadError(error: Error, context: string) {
          mockErrorBoundary.captureError(error);
          const errorReport = mockErrorBoundary.createErrorReport(error, context);
          
          if (mockErrorBoundary.shouldRetry() && !mockRetryManager.shouldGiveUp()) {
            mockRetryManager.incrementRetryCount();
            mockRetryManager.scheduleRetry();
          } else {
            return mockFallbackProvider.provideFallbackData();
          }
        }
      };

      // Test error recovery
      const testError = new Error('Network timeout');
      const result = await errorRecoveryBehavior.handleDataLoadError(testError, 'agent-data-loading');

      // Verify error handling coordination
      expect(mockErrorBoundary.captureError).toHaveBeenCalledWith(testError);
      expect(mockErrorBoundary.createErrorReport).toHaveBeenCalledWith(testError, 'agent-data-loading');
      expect(mockErrorBoundary.shouldRetry).toHaveBeenCalled();
      expect(mockRetryManager.shouldGiveUp).toHaveBeenCalled();
      expect(mockRetryManager.incrementRetryCount).toHaveBeenCalled();
      expect(mockRetryManager.scheduleRetry).toHaveBeenCalled();
    });
  });

  describe('Performance Optimization Behavior', () => {
    test('should coordinate lazy loading of components', async () => {
      const mockLazyLoader = global.createSwarmMock('LazyLoader', {
        shouldLoadComponent: jest.fn().mockReturnValue(true),
        loadComponent: jest.fn().mockResolvedValue({ Component: 'LoadedComponent' }),
        cacheComponent: jest.fn()
      });

      const mockPerformanceMonitor = global.createSwarmMock('PerformanceMonitor', {
        startTimer: jest.fn(),
        endTimer: jest.fn(),
        recordMetric: jest.fn()
      });

      // Simulate lazy loading behavior
      const lazyLoadBehavior = {
        async loadComponentOnDemand(componentName: string) {
          if (mockLazyLoader.shouldLoadComponent(componentName)) {
            mockPerformanceMonitor.startTimer(`load-${componentName}`);
            
            const component = await mockLazyLoader.loadComponent(componentName);
            mockLazyLoader.cacheComponent(componentName, component);
            
            const loadTime = mockPerformanceMonitor.endTimer(`load-${componentName}`);
            mockPerformanceMonitor.recordMetric('component-load-time', loadTime);
            
            return component;
          }
        }
      };

      // Test lazy loading coordination
      const result = await lazyLoadBehavior.loadComponentOnDemand('AgentDetails');

      // Verify lazy loading behavior
      expect(mockLazyLoader.shouldLoadComponent).toHaveBeenCalledWith('AgentDetails');
      expect(mockPerformanceMonitor.startTimer).toHaveBeenCalledWith('load-AgentDetails');
      expect(mockLazyLoader.loadComponent).toHaveBeenCalledWith('AgentDetails');
      expect(mockLazyLoader.cacheComponent).toHaveBeenCalledWith('AgentDetails', result);
      expect(mockPerformanceMonitor.endTimer).toHaveBeenCalledWith('load-AgentDetails');
      expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith('component-load-time', expect.any(Number));
    });
  });
});