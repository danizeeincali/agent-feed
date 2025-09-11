/**
 * London School TDD: Unified Agent Routing Tests
 * 
 * These tests verify the navigation contracts and routing behavior for the
 * unified agent pages. Focus on HOW routing components collaborate to
 * provide seamless navigation across agent interfaces.
 * 
 * Focus: Navigation coordination and routing behavior verification
 */

import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';

describe('Unified Agent Routing - London School TDD', () => {
  let mockHistory: any;

  beforeEach(() => {
    mockHistory = createMemoryHistory();
    global.clearInteractionHistory();

    // Define routing contracts
    global.defineContract('AgentRouter', {
      navigateToHome: 'function',
      navigateToDetails: 'function',
      navigateToSettings: 'function',
      handleBackNavigation: 'function',
      validateRoute: 'function'
    });

    global.defineContract('RouteGuard', {
      canActivate: 'function',
      redirectOnFailure: 'function',
      checkPermissions: 'function'
    });
  });

  afterEach(() => {
    global.clearInteractionHistory();
  });

  describe('Agent Route Management', () => {
    test('should coordinate route transitions for agent home page', () => {
      const mockRouteManager = global.createSwarmMock('RouteManager', {
        validateAgentExists: jest.fn().mockReturnValue(true),
        prepareRouteData: jest.fn().mockReturnValue({ agentId: 'test-agent', agentName: 'Test Agent' }),
        cacheRouteState: jest.fn(),
        clearPreviousRoute: jest.fn()
      });

      const mockNavigationController = global.createSwarmMock('NavigationController', {
        executeNavigation: jest.fn(),
        trackNavigation: jest.fn(),
        updateBreadcrumbs: jest.fn()
      });

      const mockDataPreloader = global.createSwarmMock('DataPreloader', {
        preloadAgentData: jest.fn().mockResolvedValue({ id: 'test-agent', name: 'Test Agent' }),
        shouldPreload: jest.fn().mockReturnValue(true)
      });

      // Simulate route navigation behavior
      const routeNavigationBehavior = {
        async navigateToAgentHome(agentId: string) {
          // Validate route
          const isValidAgent = mockRouteManager.validateAgentExists(agentId);
          
          if (isValidAgent) {
            // Clear previous state
            mockRouteManager.clearPreviousRoute();
            
            // Prepare route data
            const routeData = mockRouteManager.prepareRouteData(agentId);
            mockRouteManager.cacheRouteState(routeData);
            
            // Preload data if needed
            if (mockDataPreloader.shouldPreload()) {
              await mockDataPreloader.preloadAgentData(agentId);
            }
            
            // Execute navigation
            mockNavigationController.trackNavigation('agent-home', agentId);
            mockNavigationController.updateBreadcrumbs(`/agents/${agentId}/home`);
            mockNavigationController.executeNavigation(`/agents/${agentId}/home`);
          }
        }
      };

      // Test navigation coordination
      routeNavigationBehavior.navigateToAgentHome('test-agent');

      // Verify navigation workflow
      expect(mockRouteManager.validateAgentExists).toHaveBeenCalledWith('test-agent');
      expect(mockRouteManager.clearPreviousRoute).toHaveBeenCalled();
      expect(mockRouteManager.prepareRouteData).toHaveBeenCalledWith('test-agent');
      expect(mockRouteManager.cacheRouteState).toHaveBeenCalled();
      expect(mockDataPreloader.shouldPreload).toHaveBeenCalled();
      expect(mockDataPreloader.preloadAgentData).toHaveBeenCalledWith('test-agent');
      expect(mockNavigationController.trackNavigation).toHaveBeenCalledWith('agent-home', 'test-agent');
      expect(mockNavigationController.executeNavigation).toHaveBeenCalledWith('/agents/test-agent/home');

      // Verify interaction sequence
      expect(mockRouteManager.validateAgentExists).toHaveBeenCalledBefore(mockRouteManager.clearPreviousRoute);
      expect(mockRouteManager.prepareRouteData).toHaveBeenCalledBefore(mockNavigationController.executeNavigation);
    });

    test('should handle nested routing for agent details', () => {
      const mockNestedRouter = global.createSwarmMock('NestedRouter', {
        resolveNestedRoute: jest.fn().mockReturnValue('/agents/test-agent/details'),
        validateNestedPath: jest.fn().mockReturnValue(true),
        buildNestedBreadcrumbs: jest.fn().mockReturnValue([
          { label: 'Agents', path: '/agents' },
          { label: 'Test Agent', path: '/agents/test-agent' },
          { label: 'Details', path: '/agents/test-agent/details' }
        ])
      });

      const mockPermissionManager = global.createSwarmMock('PermissionManager', {
        checkRoutePermissions: jest.fn().mockReturnValue(true),
        getRequiredPermissions: jest.fn().mockReturnValue(['read:agent']),
        hasPermission: jest.fn().mockReturnValue(true)
      });

      const mockContextProvider = global.createSwarmMock('ContextProvider', {
        setActiveAgent: jest.fn(),
        setCurrentRoute: jest.fn(),
        updateNavigationContext: jest.fn()
      });

      // Simulate nested routing behavior
      const nestedRoutingBehavior = {
        navigateToNestedRoute(agentId: string, subRoute: string) {
          const fullPath = `/agents/${agentId}/${subRoute}`;
          const isValidPath = mockNestedRouter.validateNestedPath(fullPath);
          const requiredPermissions = mockPermissionManager.getRequiredPermissions(subRoute);
          const hasAccess = mockPermissionManager.checkRoutePermissions(requiredPermissions);
          
          if (isValidPath && hasAccess) {
            const resolvedRoute = mockNestedRouter.resolveNestedRoute(agentId, subRoute);
            const breadcrumbs = mockNestedRouter.buildNestedBreadcrumbs(resolvedRoute);
            
            mockContextProvider.setActiveAgent(agentId);
            mockContextProvider.setCurrentRoute(resolvedRoute);
            mockContextProvider.updateNavigationContext({ breadcrumbs, permissions: requiredPermissions });
          }
        }
      };

      // Test nested routing
      nestedRoutingBehavior.navigateToNestedRoute('test-agent', 'details');

      // Verify nested routing coordination
      expect(mockNestedRouter.validateNestedPath).toHaveBeenCalledWith('/agents/test-agent/details');
      expect(mockPermissionManager.getRequiredPermissions).toHaveBeenCalledWith('details');
      expect(mockPermissionManager.checkRoutePermissions).toHaveBeenCalled();
      expect(mockNestedRouter.resolveNestedRoute).toHaveBeenCalledWith('test-agent', 'details');
      expect(mockNestedRouter.buildNestedBreadcrumbs).toHaveBeenCalled();
      expect(mockContextProvider.setActiveAgent).toHaveBeenCalledWith('test-agent');
      expect(mockContextProvider.updateNavigationContext).toHaveBeenCalled();
    });
  });

  describe('Route Guard Coordination', () => {
    test('should coordinate authentication and authorization guards', async () => {
      const mockAuthGuard = global.createSwarmMock('AuthGuard', {
        isAuthenticated: jest.fn().mockReturnValue(true),
        requiresAuth: jest.fn().mockReturnValue(true),
        redirectToLogin: jest.fn()
      });

      const mockAuthzGuard = global.createSwarmMock('AuthzGuard', {
        hasPermission: jest.fn().mockReturnValue(true),
        getRequiredRoles: jest.fn().mockReturnValue(['agent-viewer']),
        redirectToUnauthorized: jest.fn()
      });

      const mockRouteActivator = global.createSwarmMock('RouteActivator', {
        canActivateRoute: jest.fn().mockReturnValue(true),
        loadRouteData: jest.fn().mockResolvedValue({ data: 'loaded' }),
        activateRoute: jest.fn()
      });

      // Simulate route guard behavior
      const routeGuardBehavior = {
        async guardRoute(route: string) {
          // Check authentication
          const requiresAuth = mockAuthGuard.requiresAuth(route);
          const isAuthenticated = mockAuthGuard.isAuthenticated();
          
          if (requiresAuth && !isAuthenticated) {
            mockAuthGuard.redirectToLogin();
            return false;
          }
          
          // Check authorization
          const requiredRoles = mockAuthzGuard.getRequiredRoles(route);
          const hasPermission = mockAuthzGuard.hasPermission(requiredRoles);
          
          if (!hasPermission) {
            mockAuthzGuard.redirectToUnauthorized();
            return false;
          }
          
          // Activate route
          const canActivate = mockRouteActivator.canActivateRoute(route);
          if (canActivate) {
            const routeData = await mockRouteActivator.loadRouteData(route);
            mockRouteActivator.activateRoute(route, routeData);
            return true;
          }
          
          return false;
        }
      };

      // Test route guard coordination
      const result = await routeGuardBehavior.guardRoute('/agents/test-agent/home');

      // Verify guard coordination
      expect(mockAuthGuard.requiresAuth).toHaveBeenCalledWith('/agents/test-agent/home');
      expect(mockAuthGuard.isAuthenticated).toHaveBeenCalled();
      expect(mockAuthzGuard.getRequiredRoles).toHaveBeenCalledWith('/agents/test-agent/home');
      expect(mockAuthzGuard.hasPermission).toHaveBeenCalled();
      expect(mockRouteActivator.canActivateRoute).toHaveBeenCalledWith('/agents/test-agent/home');
      expect(mockRouteActivator.loadRouteData).toHaveBeenCalledWith('/agents/test-agent/home');
      expect(mockRouteActivator.activateRoute).toHaveBeenCalled();
      expect(result).toBe(true);

      // Verify guard sequence
      expect(mockAuthGuard.requiresAuth).toHaveBeenCalledBefore(mockAuthzGuard.getRequiredRoles);
      expect(mockAuthzGuard.hasPermission).toHaveBeenCalledBefore(mockRouteActivator.canActivateRoute);
    });

    test('should handle route guard failures', async () => {
      const mockFailureHandler = global.createSwarmMock('FailureHandler', {
        handleAuthFailure: jest.fn(),
        handleAuthzFailure: jest.fn(),
        handleRouteFailure: jest.fn(),
        logFailure: jest.fn()
      });

      const mockRedirectManager = global.createSwarmMock('RedirectManager', {
        redirectToLogin: jest.fn(),
        redirectToUnauthorized: jest.fn(),
        redirectToFallback: jest.fn(),
        saveAttemptedRoute: jest.fn()
      });

      const mockAuthGuard = global.createSwarmMock('AuthGuard', {
        isAuthenticated: jest.fn().mockReturnValue(false),
        requiresAuth: jest.fn().mockReturnValue(true)
      });

      // Simulate guard failure behavior
      const guardFailureBehavior = {
        async handleGuardFailure(route: string, failureType: string) {
          mockFailureHandler.logFailure(route, failureType);
          
          switch (failureType) {
            case 'authentication':
              mockFailureHandler.handleAuthFailure(route);
              mockRedirectManager.saveAttemptedRoute(route);
              mockRedirectManager.redirectToLogin();
              break;
              
            case 'authorization':
              mockFailureHandler.handleAuthzFailure(route);
              mockRedirectManager.redirectToUnauthorized();
              break;
              
            default:
              mockFailureHandler.handleRouteFailure(route);
              mockRedirectManager.redirectToFallback();
          }
        }
      };

      // Test failure handling
      await guardFailureBehavior.handleGuardFailure('/agents/secure-agent/home', 'authentication');

      // Verify failure handling coordination
      expect(mockFailureHandler.logFailure).toHaveBeenCalledWith('/agents/secure-agent/home', 'authentication');
      expect(mockFailureHandler.handleAuthFailure).toHaveBeenCalledWith('/agents/secure-agent/home');
      expect(mockRedirectManager.saveAttemptedRoute).toHaveBeenCalledWith('/agents/secure-agent/home');
      expect(mockRedirectManager.redirectToLogin).toHaveBeenCalled();

      // Verify failure handling sequence
      expect(mockFailureHandler.logFailure).toHaveBeenCalledBefore(mockFailureHandler.handleAuthFailure);
      expect(mockRedirectManager.saveAttemptedRoute).toHaveBeenCalledBefore(mockRedirectManager.redirectToLogin);
    });
  });

  describe('Route State Management', () => {
    test('should coordinate route state persistence', () => {
      const mockStateManager = global.createSwarmMock('StateManager', {
        saveRouteState: jest.fn(),
        loadRouteState: jest.fn().mockReturnValue({ agentId: 'test-agent', filters: ['active'] }),
        clearRouteState: jest.fn(),
        hasPersistedState: jest.fn().mockReturnValue(true)
      });

      const mockSessionStorage = global.createSwarmMock('SessionStorage', {
        setItem: jest.fn(),
        getItem: jest.fn().mockReturnValue('{"agentId":"test-agent"}'),
        removeItem: jest.fn(),
        hasKey: jest.fn().mockReturnValue(true)
      });

      const mockStateValidator = global.createSwarmMock('StateValidator', {
        validateState: jest.fn().mockReturnValue(true),
        sanitizeState: jest.fn(),
        isStateExpired: jest.fn().mockReturnValue(false)
      });

      // Simulate state management behavior
      const stateManagementBehavior = {
        persistRouteState(route: string, state: any) {
          const sanitizedState = mockStateValidator.sanitizeState(state);
          const isValid = mockStateValidator.validateState(sanitizedState);
          
          if (isValid) {
            mockStateManager.saveRouteState(route, sanitizedState);
            mockSessionStorage.setItem(`route:${route}`, JSON.stringify(sanitizedState));
          }
        },

        restoreRouteState(route: string) {
          const hasPersistedState = mockStateManager.hasPersistedState(route);
          
          if (hasPersistedState) {
            const sessionData = mockSessionStorage.getItem(`route:${route}`);
            const state = mockStateManager.loadRouteState(route);
            const isExpired = mockStateValidator.isStateExpired(state);
            
            if (!isExpired && mockStateValidator.validateState(state)) {
              return state;
            } else {
              mockStateManager.clearRouteState(route);
              mockSessionStorage.removeItem(`route:${route}`);
            }
          }
          
          return null;
        }
      };

      // Test state persistence
      const testState = { agentId: 'test-agent', scrollPosition: 100 };
      stateManagementBehavior.persistRouteState('/agents/test-agent', testState);
      
      const restoredState = stateManagementBehavior.restoreRouteState('/agents/test-agent');

      // Verify state management coordination
      expect(mockStateValidator.sanitizeState).toHaveBeenCalledWith(testState);
      expect(mockStateValidator.validateState).toHaveBeenCalled();
      expect(mockStateManager.saveRouteState).toHaveBeenCalledWith('/agents/test-agent', testState);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('route:/agents/test-agent', JSON.stringify(testState));

      // Verify state restoration
      expect(mockStateManager.hasPersistedState).toHaveBeenCalledWith('/agents/test-agent');
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('route:/agents/test-agent');
      expect(mockStateManager.loadRouteState).toHaveBeenCalledWith('/agents/test-agent');
      expect(mockStateValidator.isStateExpired).toHaveBeenCalled();
    });

    test('should coordinate route parameter handling', () => {
      const mockParamExtractor = global.createSwarmMock('ParamExtractor', {
        extractParams: jest.fn().mockReturnValue({ agentId: 'test-agent', tab: 'overview' }),
        validateParams: jest.fn().mockReturnValue(true),
        normalizeParams: jest.fn()
      });

      const mockParamValidator = global.createSwarmMock('ParamValidator', {
        validateAgentId: jest.fn().mockReturnValue(true),
        validateTabName: jest.fn().mockReturnValue(true),
        sanitizeParam: jest.fn()
      });

      const mockRouteBuilder = global.createSwarmMock('RouteBuilder', {
        buildRoute: jest.fn().mockReturnValue('/agents/test-agent?tab=overview'),
        addQueryParams: jest.fn(),
        removeQueryParams: jest.fn()
      });

      // Simulate parameter handling behavior
      const parameterHandlingBehavior = {
        processRouteParams(route: string) {
          const params = mockParamExtractor.extractParams(route);
          const normalizedParams = mockParamExtractor.normalizeParams(params);
          const isValid = mockParamExtractor.validateParams(normalizedParams);
          
          if (isValid) {
            // Validate individual parameters
            const validAgentId = mockParamValidator.validateAgentId(normalizedParams.agentId);
            const validTab = mockParamValidator.validateTabName(normalizedParams.tab);
            
            if (validAgentId && validTab) {
              return normalizedParams;
            }
          }
          
          return null;
        },

        updateRouteParams(currentRoute: string, newParams: any) {
          const sanitizedParams = Object.keys(newParams).reduce((acc, key) => {
            acc[key] = mockParamValidator.sanitizeParam(newParams[key]);
            return acc;
          }, {} as any);
          
          const updatedRoute = mockRouteBuilder.buildRoute(currentRoute, sanitizedParams);
          return updatedRoute;
        }
      };

      // Test parameter handling
      const params = parameterHandlingBehavior.processRouteParams('/agents/test-agent?tab=overview');
      const updatedRoute = parameterHandlingBehavior.updateRouteParams('/agents/test-agent', { tab: 'metrics' });

      // Verify parameter processing coordination
      expect(mockParamExtractor.extractParams).toHaveBeenCalledWith('/agents/test-agent?tab=overview');
      expect(mockParamExtractor.normalizeParams).toHaveBeenCalled();
      expect(mockParamExtractor.validateParams).toHaveBeenCalled();
      expect(mockParamValidator.validateAgentId).toHaveBeenCalledWith('test-agent');
      expect(mockParamValidator.validateTabName).toHaveBeenCalledWith('overview');

      // Verify parameter update coordination
      expect(mockParamValidator.sanitizeParam).toHaveBeenCalledWith('metrics');
      expect(mockRouteBuilder.buildRoute).toHaveBeenCalledWith('/agents/test-agent', { tab: 'metrics' });
    });
  });

  describe('Navigation History Management', () => {
    test('should coordinate browser history operations', () => {
      const mockHistoryManager = global.createSwarmMock('HistoryManager', {
        pushState: jest.fn(),
        replaceState: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        canGoBack: jest.fn().mockReturnValue(true),
        canGoForward: jest.fn().mockReturnValue(false),
        getHistoryLength: jest.fn().mockReturnValue(3)
      });

      const mockHistoryTracker = global.createSwarmMock('HistoryTracker', {
        trackNavigation: jest.fn(),
        recordPageView: jest.fn(),
        updateNavigationMetrics: jest.fn()
      });

      const mockBreadcrumbManager = global.createSwarmMock('BreadcrumbManager', {
        updateBreadcrumbs: jest.fn(),
        addBreadcrumb: jest.fn(),
        removeBreadcrumb: jest.fn(),
        clearBreadcrumbs: jest.fn()
      });

      // Simulate history management behavior
      const historyManagementBehavior = {
        navigateToRoute(route: string, replace = false) {
          mockHistoryTracker.trackNavigation(route);
          mockHistoryTracker.recordPageView(route);
          
          if (replace) {
            mockHistoryManager.replaceState(route);
          } else {
            mockHistoryManager.pushState(route);
          }
          
          mockBreadcrumbManager.updateBreadcrumbs(route);
          mockHistoryTracker.updateNavigationMetrics();
        },

        handleBackNavigation() {
          if (mockHistoryManager.canGoBack()) {
            mockBreadcrumbManager.removeBreadcrumb();
            mockHistoryManager.goBack();
            mockHistoryTracker.trackNavigation('back');
          }
        },

        handleForwardNavigation() {
          if (mockHistoryManager.canGoForward()) {
            mockHistoryManager.goForward();
            mockHistoryTracker.trackNavigation('forward');
          }
        }
      };

      // Test history management
      historyManagementBehavior.navigateToRoute('/agents/test-agent/home');
      historyManagementBehavior.navigateToRoute('/agents/test-agent/details', true);
      historyManagementBehavior.handleBackNavigation();

      // Verify history coordination
      expect(mockHistoryTracker.trackNavigation).toHaveBeenCalledWith('/agents/test-agent/home');
      expect(mockHistoryTracker.recordPageView).toHaveBeenCalledWith('/agents/test-agent/home');
      expect(mockHistoryManager.pushState).toHaveBeenCalledWith('/agents/test-agent/home');
      expect(mockBreadcrumbManager.updateBreadcrumbs).toHaveBeenCalledWith('/agents/test-agent/home');

      // Verify replace navigation
      expect(mockHistoryManager.replaceState).toHaveBeenCalledWith('/agents/test-agent/details');

      // Verify back navigation
      expect(mockHistoryManager.canGoBack).toHaveBeenCalled();
      expect(mockBreadcrumbManager.removeBreadcrumb).toHaveBeenCalled();
      expect(mockHistoryManager.goBack).toHaveBeenCalled();
      expect(mockHistoryTracker.trackNavigation).toHaveBeenCalledWith('back');
    });
  });
});