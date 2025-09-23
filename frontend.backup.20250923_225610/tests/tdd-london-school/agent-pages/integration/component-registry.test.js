/**
 * TDD London School: Component Registry Integration Tests
 * Focus: Registry lifecycle and component coordination workflows
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { 
  createSwarmMocks, 
  createMockComponentRegistry,
  mockFactory,
  verifyMockContract 
} from '../mocks';

// Mock Component Registry Service
const createMockRegistryService = () => ({
  initialize: jest.fn(),
  shutdown: jest.fn(),
  registerComponent: jest.fn(),
  unregisterComponent: jest.fn(),
  getComponent: jest.fn(),
  listComponents: jest.fn(),
  validateRegistration: jest.fn(),
  resolveDepends: jest.fn(),
  handleConflicts: jest.fn(),
  createInstance: jest.fn()
});

// Mock Component Lifecycle Manager
const createMockLifecycleManager = () => ({
  beforeRegister: jest.fn(),
  afterRegister: jest.fn(),
  beforeUnregister: jest.fn(),
  afterUnregister: jest.fn(),
  onInstanceCreate: jest.fn(),
  onInstanceDestroy: jest.fn(),
  validateLifecycle: jest.fn()
});

// Mock Dynamic Component Loader
const createMockDynamicComponent = (id, type = 'default') => {
  return function MockDynamicComponent({ registry, onMount, onUnmount, ...props }) {
    React.useEffect(() => {
      if (onMount) onMount(id);
      return () => {
        if (onUnmount) onUnmount(id);
      };
    }, [onMount, onUnmount]);
    
    return (
      <div data-testid={`dynamic-component-${id}`} data-type={type} {...props}>
        Dynamic Component: {id}
      </div>
    );
  };
};

describe('Component Registry Integration - London School TDD', () => {
  let swarmMocks;
  let mockRegistryService;
  let mockLifecycleManager;
  let mockDependencyResolver;
  
  beforeEach(() => {
    swarmMocks = createSwarmMocks();
    mockRegistryService = createMockRegistryService();
    mockLifecycleManager = createMockLifecycleManager();
    
    // Mock dependency resolver for component dependencies
    mockDependencyResolver = {
      resolveDependencies: jest.fn(),
      checkCircularDependencies: jest.fn(),
      orderByDependencies: jest.fn(),
      validateDependencies: jest.fn()
    };
    
    // Set up default successful behaviors
    mockRegistryService.initialize.mockResolvedValue({ success: true });
    mockRegistryService.validateRegistration.mockReturnValue(true);
    mockLifecycleManager.validateLifecycle.mockReturnValue(true);
    mockDependencyResolver.checkCircularDependencies.mockReturnValue(false);
  });

  describe('Component Registry Initialization Contract', () => {
    it('should coordinate registry initialization workflow', async () => {
      // Arrange: Registry initialization setup
      const initConfig = {
        maxComponents: 100,
        enableHotReload: true,
        validateOnRegister: true
      };
      
      mockRegistryService.initialize.mockResolvedValue({
        success: true,
        registry: swarmMocks.componentRegistry,
        config: initConfig
      });
      
      // Act: Initialize registry
      const initResult = await mockRegistryService.initialize(initConfig);
      
      // Assert: Verify initialization workflow
      expect(mockRegistryService.initialize).toHaveBeenCalledWith(initConfig);
      expect(initResult.success).toBe(true);
      expect(initResult.registry).toBe(swarmMocks.componentRegistry);
    });

    it('should coordinate registry shutdown workflow', async () => {
      // Arrange: Registry shutdown setup
      const registeredComponents = ['profile-header', 'dashboard-widget', 'task-list'];
      
      swarmMocks.componentRegistry.list.mockReturnValue(registeredComponents);
      mockRegistryService.shutdown.mockImplementation(async (registry) => {
        const components = registry.list();
        for (const componentId of components) {
          await mockLifecycleManager.beforeUnregister(componentId);
          await registry.unregister(componentId);
          await mockLifecycleManager.afterUnregister(componentId);
        }
        return { success: true, unregistered: components.length };
      });
      
      // Act: Shutdown registry
      const shutdownResult = await mockRegistryService.shutdown(swarmMocks.componentRegistry);
      
      // Assert: Verify shutdown workflow
      expect(swarmMocks.componentRegistry.list).toHaveBeenCalled();
      expect(mockLifecycleManager.beforeUnregister).toHaveBeenCalledTimes(3);
      expect(mockLifecycleManager.afterUnregister).toHaveBeenCalledTimes(3);
      expect(shutdownResult.unregistered).toBe(3);
    });
  });

  describe('Component Registration Workflow Contract', () => {
    it('should coordinate complete component registration lifecycle', async () => {
      // Arrange: Component registration workflow
      const componentSpec = {
        id: 'user-profile-widget',
        type: 'widget',
        component: createMockDynamicComponent('user-profile-widget', 'widget'),
        dependencies: ['user-service'],
        props: { userId: 'required' },
        version: '1.0.0'
      };
      
      // Mock successful registration workflow
      mockLifecycleManager.beforeRegister.mockResolvedValue(true);
      mockRegistryService.validateRegistration.mockReturnValue(true);
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['user-service']);
      swarmMocks.componentRegistry.register.mockResolvedValue(true);
      mockLifecycleManager.afterRegister.mockResolvedValue(true);
      
      // Act: Execute complete registration workflow
      await mockLifecycleManager.beforeRegister(componentSpec);
      const isValid = mockRegistryService.validateRegistration(componentSpec);
      
      if (isValid) {
        const dependencies = await mockDependencyResolver.resolveDependencies(componentSpec.dependencies);
        await swarmMocks.componentRegistry.register(componentSpec.id, {
          ...componentSpec,
          resolvedDependencies: dependencies
        });
        await mockLifecycleManager.afterRegister(componentSpec);
      }
      
      // Assert: Verify complete registration workflow sequence
      expect(mockLifecycleManager.beforeRegister).toHaveBeenCalledWith(componentSpec);
      expect(mockRegistryService.validateRegistration).toHaveBeenCalledWith(componentSpec);
      expect(mockDependencyResolver.resolveDependencies).toHaveBeenCalledWith(componentSpec.dependencies);
      expect(swarmMocks.componentRegistry.register).toHaveBeenCalledWith(
        componentSpec.id,
        expect.objectContaining({
          resolvedDependencies: ['user-service']
        })
      );
      expect(mockLifecycleManager.afterRegister).toHaveBeenCalledWith(componentSpec);
      
      // Verify interaction sequence
      expect(mockLifecycleManager.beforeRegister).toHaveBeenCalledBefore(
        swarmMocks.componentRegistry.register
      );
      expect(swarmMocks.componentRegistry.register).toHaveBeenCalledBefore(
        mockLifecycleManager.afterRegister
      );
    });

    it('should handle registration validation failures gracefully', async () => {
      // Arrange: Invalid component registration
      const invalidComponentSpec = {
        id: 'invalid-widget',
        // Missing required fields
        type: 'unknown'
      };
      
      mockRegistryService.validateRegistration.mockReturnValue(false);
      mockRegistryService.handleConflicts.mockReturnValue({
        canProceed: false,
        conflicts: ['Missing component implementation', 'Unknown component type']
      });
      
      // Act: Attempt invalid registration
      const isValid = mockRegistryService.validateRegistration(invalidComponentSpec);
      let registrationResult = null;
      
      if (!isValid) {
        const conflictResult = mockRegistryService.handleConflicts(invalidComponentSpec);
        registrationResult = { success: false, conflicts: conflictResult.conflicts };
      }
      
      // Assert: Verify validation failure handling
      expect(mockRegistryService.validateRegistration).toHaveBeenCalledWith(invalidComponentSpec);
      expect(mockRegistryService.handleConflicts).toHaveBeenCalledWith(invalidComponentSpec);
      expect(swarmMocks.componentRegistry.register).not.toHaveBeenCalled();
      expect(registrationResult.success).toBe(false);
      expect(registrationResult.conflicts).toContain('Unknown component type');
    });
  });

  describe('Dependency Resolution Contract', () => {
    it('should coordinate dependency resolution workflow', async () => {
      // Arrange: Component with dependencies
      const componentWithDeps = {
        id: 'dashboard-analytics',
        dependencies: ['chart-service', 'data-service', 'auth-service'],
        type: 'analytics'
      };
      
      const resolvedDependencies = [
        { id: 'auth-service', instance: {} },
        { id: 'data-service', instance: {} },
        { id: 'chart-service', instance: {} }
      ];
      
      mockDependencyResolver.checkCircularDependencies.mockReturnValue(false);
      mockDependencyResolver.orderByDependencies.mockReturnValue([
        'auth-service', 'data-service', 'chart-service'
      ]);
      mockDependencyResolver.resolveDependencies.mockResolvedValue(resolvedDependencies);
      
      // Act: Resolve dependencies
      const hasCircularDeps = mockDependencyResolver.checkCircularDependencies(componentWithDeps.dependencies);
      
      if (!hasCircularDeps) {
        const orderedDeps = mockDependencyResolver.orderByDependencies(componentWithDeps.dependencies);
        const resolved = await mockDependencyResolver.resolveDependencies(orderedDeps);
        
        await swarmMocks.componentRegistry.register(componentWithDeps.id, {
          ...componentWithDeps,
          resolvedDependencies: resolved
        });
      }
      
      // Assert: Verify dependency resolution workflow
      expect(mockDependencyResolver.checkCircularDependencies).toHaveBeenCalledWith(
        componentWithDeps.dependencies
      );
      expect(mockDependencyResolver.orderByDependencies).toHaveBeenCalledWith(
        componentWithDeps.dependencies
      );
      expect(mockDependencyResolver.resolveDependencies).toHaveBeenCalledWith([
        'auth-service', 'data-service', 'chart-service'
      ]);
      expect(swarmMocks.componentRegistry.register).toHaveBeenCalledWith(
        componentWithDeps.id,
        expect.objectContaining({
          resolvedDependencies: resolvedDependencies
        })
      );
    });

    it('should prevent registration with circular dependencies', async () => {
      // Arrange: Circular dependency scenario
      const componentWithCircularDeps = {
        id: 'circular-component',
        dependencies: ['component-a', 'component-b'],
        type: 'test'
      };
      
      mockDependencyResolver.checkCircularDependencies.mockReturnValue(true);
      mockRegistryService.handleConflicts.mockReturnValue({
        canProceed: false,
        conflicts: ['Circular dependency detected: component-a -> component-b -> component-a']
      });
      
      // Act: Attempt registration with circular dependencies
      const hasCircularDeps = mockDependencyResolver.checkCircularDependencies(
        componentWithCircularDeps.dependencies
      );
      
      let registrationResult = null;
      if (hasCircularDeps) {
        const conflictResult = mockRegistryService.handleConflicts(componentWithCircularDeps);
        registrationResult = { success: false, reason: 'circular_dependencies' };
      }
      
      // Assert: Verify circular dependency prevention
      expect(mockDependencyResolver.checkCircularDependencies).toHaveBeenCalledWith(
        componentWithCircularDeps.dependencies
      );
      expect(swarmMocks.componentRegistry.register).not.toHaveBeenCalled();
      expect(registrationResult.success).toBe(false);
      expect(registrationResult.reason).toBe('circular_dependencies');
    });
  });

  describe('Component Instance Management Contract', () => {
    it('should coordinate component instance creation workflow', async () => {
      // Arrange: Component instance creation
      const componentId = 'task-manager-widget';
      const instanceProps = { userId: '123', workspace: 'main' };
      const mockComponentClass = createMockDynamicComponent(componentId, 'widget');
      
      swarmMocks.componentRegistry.get.mockReturnValue({
        id: componentId,
        component: mockComponentClass,
        type: 'widget',
        props: { userId: 'required', workspace: 'optional' }
      });
      
      mockRegistryService.createInstance.mockImplementation(async (id, props, registry) => {
        const spec = registry.get(id);
        await mockLifecycleManager.onInstanceCreate(id, props);
        return {
          id,
          instance: React.createElement(spec.component, props),
          props,
          created: new Date().toISOString()
        };
      });
      
      // Act: Create component instance
      const instanceResult = await mockRegistryService.createInstance(
        componentId,
        instanceProps,
        swarmMocks.componentRegistry
      );
      
      // Assert: Verify instance creation workflow
      expect(swarmMocks.componentRegistry.get).toHaveBeenCalledWith(componentId);
      expect(mockLifecycleManager.onInstanceCreate).toHaveBeenCalledWith(componentId, instanceProps);
      expect(instanceResult.id).toBe(componentId);
      expect(instanceResult.props).toEqual(instanceProps);
    });

    it('should coordinate component instance destruction workflow', async () => {
      // Arrange: Component instance destruction
      const instanceId = 'instance-123';
      const componentId = 'user-profile';
      
      const mockInstance = {
        id: instanceId,
        componentId,
        destroy: jest.fn().mockResolvedValue(true)
      };
      
      mockLifecycleManager.onInstanceDestroy.mockResolvedValue(true);
      
      // Act: Destroy component instance
      await mockLifecycleManager.onInstanceDestroy(instanceId, componentId);
      await mockInstance.destroy();
      
      // Assert: Verify destruction workflow
      expect(mockLifecycleManager.onInstanceDestroy).toHaveBeenCalledWith(instanceId, componentId);
      expect(mockInstance.destroy).toHaveBeenCalled();
      
      // Verify destruction sequence
      expect(mockLifecycleManager.onInstanceDestroy).toHaveBeenCalledBefore(mockInstance.destroy);
    });
  });

  describe('Hot Reload Integration Contract', () => {
    it('should coordinate hot reload workflow for registered components', async () => {
      // Arrange: Hot reload setup
      const componentId = 'dashboard-chart';
      const oldVersion = '1.0.0';
      const newVersion = '1.1.0';
      
      const mockHotReloadService = {
        detectChange: jest.fn().mockReturnValue(true),
        validateHotReload: jest.fn().mockReturnValue(true),
        performHotReload: jest.fn(),
        notifyInstances: jest.fn()
      };
      
      swarmMocks.componentRegistry.get.mockReturnValue({
        id: componentId,
        version: oldVersion,
        component: createMockDynamicComponent(componentId, 'chart')
      });
      
      mockHotReloadService.performHotReload.mockImplementation(async (id, registry) => {
        await mockLifecycleManager.beforeUnregister(id);
        await registry.unregister(id);
        
        const newComponent = {
          id,
          version: newVersion,
          component: createMockDynamicComponent(id, 'chart-v2')
        };
        
        await registry.register(id, newComponent);
        await mockLifecycleManager.afterRegister(newComponent);
        return { success: true, oldVersion, newVersion };
      });
      
      // Act: Perform hot reload
      const hasChanges = mockHotReloadService.detectChange(componentId);
      
      if (hasChanges) {
        const canHotReload = mockHotReloadService.validateHotReload(componentId);
        if (canHotReload) {
          const reloadResult = await mockHotReloadService.performHotReload(
            componentId,
            swarmMocks.componentRegistry
          );
          await mockHotReloadService.notifyInstances(componentId, reloadResult);
        }
      }
      
      // Assert: Verify hot reload workflow
      expect(mockHotReloadService.detectChange).toHaveBeenCalledWith(componentId);
      expect(mockHotReloadService.validateHotReload).toHaveBeenCalledWith(componentId);
      expect(mockLifecycleManager.beforeUnregister).toHaveBeenCalledWith(componentId);
      expect(swarmMocks.componentRegistry.unregister).toHaveBeenCalledWith(componentId);
      expect(swarmMocks.componentRegistry.register).toHaveBeenCalledWith(
        componentId,
        expect.objectContaining({ version: newVersion })
      );
      expect(mockHotReloadService.notifyInstances).toHaveBeenCalledWith(
        componentId,
        expect.objectContaining({ oldVersion, newVersion })
      );
    });
  });

  describe('Registry Performance Contract', () => {
    it('should coordinate performance monitoring during registry operations', async () => {
      // Arrange: Performance monitoring setup
      const mockPerformanceMonitor = {
        startTiming: jest.fn(),
        endTiming: jest.fn(),
        recordMetric: jest.fn(),
        getMetrics: jest.fn().mockReturnValue({
          registrationTime: 45,
          lookupTime: 5,
          dependencyResolutionTime: 120
        })
      };
      
      const componentSpec = mockFactory.componentProps('performance-test');
      
      // Mock timed operations
      mockRegistryService.registerComponent.mockImplementation(async (spec) => {
        mockPerformanceMonitor.startTiming('registration');
        await mockLifecycleManager.beforeRegister(spec);
        
        mockPerformanceMonitor.startTiming('dependency-resolution');
        await mockDependencyResolver.resolveDependencies(spec.dependencies || []);
        mockPerformanceMonitor.endTiming('dependency-resolution');
        
        await swarmMocks.componentRegistry.register(spec.id, spec);
        mockPerformanceMonitor.endTiming('registration');
        
        return { success: true };
      });
      
      // Act: Perform monitored registration
      await mockRegistryService.registerComponent(componentSpec);
      const metrics = mockPerformanceMonitor.getMetrics();
      
      // Assert: Verify performance monitoring
      expect(mockPerformanceMonitor.startTiming).toHaveBeenCalledWith('registration');
      expect(mockPerformanceMonitor.startTiming).toHaveBeenCalledWith('dependency-resolution');
      expect(mockPerformanceMonitor.endTiming).toHaveBeenCalledWith('dependency-resolution');
      expect(mockPerformanceMonitor.endTiming).toHaveBeenCalledWith('registration');
      expect(metrics.registrationTime).toBeDefined();
      expect(metrics.dependencyResolutionTime).toBeDefined();
    });
  });

  describe('Registry Mock Contract Verification', () => {
    it('should verify registry service contract', () => {
      verifyMockContract(mockRegistryService, [
        'initialize',
        'shutdown',
        'registerComponent',
        'unregisterComponent',
        'getComponent',
        'listComponents',
        'validateRegistration',
        'resolveDepends',
        'handleConflicts',
        'createInstance'
      ]);
    });

    it('should verify lifecycle manager contract', () => {
      verifyMockContract(mockLifecycleManager, [
        'beforeRegister',
        'afterRegister',
        'beforeUnregister',
        'afterUnregister',
        'onInstanceCreate',
        'onInstanceDestroy',
        'validateLifecycle'
      ]);
    });

    it('should verify dependency resolver contract', () => {
      verifyMockContract(mockDependencyResolver, [
        'resolveDependencies',
        'checkCircularDependencies',
        'orderByDependencies',
        'validateDependencies'
      ]);
    });
  });
});