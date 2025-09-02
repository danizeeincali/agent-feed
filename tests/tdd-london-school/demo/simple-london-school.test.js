/**
 * Simple London School TDD Demonstration
 * 
 * This demonstrates the key principles of London School TDD:
 * 1. Mock-driven development
 * 2. Behavior verification over state testing
 * 3. Outside-in development approach
 * 4. Focus on object interactions
 */

const { jest, describe, it, expect, beforeEach } = require('@jest/globals');

// Mock a Claude Instance API (outside-in approach)
const createClaudeInstanceAPIMock = () => ({
  fetchInstances: jest.fn(),
  createInstance: jest.fn(),
  terminateInstance: jest.fn(),
  connectToInstance: jest.fn(),
  disconnectFromInstance: jest.fn(),
});

// Mock a component manager (behavior focus)
class MockClaudeInstanceManager {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.instances = [];
    this.isAutoCreating = false;
  }

  // This method should NOT auto-create instances
  async initialize() {
    // CORRECT: Only fetch existing instances
    const response = await this.apiClient.fetchInstances();
    this.instances = response.instances || [];
    
    // BUG PREVENTION: Should NOT auto-create instances
    // this.apiClient.createInstance(); // This would be wrong!
  }

  // User-initiated creation only
  async createInstanceForUser(config) {
    const response = await this.apiClient.createInstance(config);
    if (response.success) {
      this.instances.push(response.instance);
    }
    return response;
  }

  // Proper cleanup
  async cleanup() {
    const cleanupPromises = this.instances.map(instance => 
      this.apiClient.terminateInstance(instance.id)
    );
    await Promise.all(cleanupPromises);
    this.instances = [];
  }
}

/**
 * London School TDD: Behavior Testing
 * Focus on HOW objects collaborate, not WHAT they contain
 */
describe('London School TDD: Claude Instance Lifecycle', () => {
  let apiMock;
  let manager;

  beforeEach(() => {
    apiMock = createClaudeInstanceAPIMock();
    manager = new MockClaudeInstanceManager(apiMock);
  });

  /**
   * Contract 1: No Auto-Creation on Initialize
   * London School: Test the BEHAVIOR, not the state
   */
  describe('Initialization Behavior Contract', () => {
    it('MUST fetch existing instances but MUST NOT auto-create', async () => {
      // GIVEN: API returns empty instance list
      apiMock.fetchInstances.mockResolvedValue({ instances: [] });

      // WHEN: Manager initializes
      await manager.initialize();

      // THEN: Verify the CONVERSATION between objects
      expect(apiMock.fetchInstances).toHaveBeenCalledTimes(1);
      
      // CRITICAL: Should NOT auto-create instances
      expect(apiMock.createInstance).not.toHaveBeenCalled();
      
      // London School: Focus on interaction, not internal state
      expect(manager.instances).toEqual([]);
    });

    it('MUST handle existing instances without creating new ones', async () => {
      // GIVEN: API returns existing instances
      const existingInstances = [
        { id: 'instance-1', status: 'running' },
        { id: 'instance-2', status: 'running' }
      ];
      apiMock.fetchInstances.mockResolvedValue({ instances: existingInstances });

      // WHEN: Manager initializes
      await manager.initialize();

      // THEN: Should only fetch, never create
      expect(apiMock.fetchInstances).toHaveBeenCalledTimes(1);
      expect(apiMock.createInstance).not.toHaveBeenCalled();
      
      // Verify correct behavior
      expect(manager.instances).toEqual(existingInstances);
    });
  });

  /**
   * Contract 2: User-Initiated Creation Only
   * London School: Test the interaction pattern
   */
  describe('User-Initiated Creation Contract', () => {
    it('MUST create instance only when user explicitly requests', async () => {
      // GIVEN: User wants to create an instance
      const userConfig = { command: 'claude', name: 'User Claude' };
      const createdInstance = { id: 'user-instance', ...userConfig };
      
      apiMock.createInstance.mockResolvedValue({ 
        success: true, 
        instance: createdInstance 
      });

      // WHEN: User explicitly creates instance
      const result = await manager.createInstanceForUser(userConfig);

      // THEN: Verify the conversation
      expect(apiMock.createInstance).toHaveBeenCalledWith(userConfig);
      expect(apiMock.createInstance).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      
      // Verify side effects
      expect(manager.instances).toContain(createdInstance);
    });

    it('MUST NOT create instances without explicit user action', async () => {
      // GIVEN: Manager is initialized
      apiMock.fetchInstances.mockResolvedValue({ instances: [] });
      await manager.initialize();

      // WHEN: Time passes without user action (simulate)
      await new Promise(resolve => setTimeout(resolve, 100));

      // THEN: Should not have created any instances
      expect(apiMock.createInstance).not.toHaveBeenCalled();
      expect(manager.instances).toEqual([]);
    });
  });

  /**
   * Contract 3: Proper Cleanup Behavior
   * London School: Test the cleanup conversation
   */
  describe('Cleanup Behavior Contract', () => {
    it('MUST terminate all instances during cleanup', async () => {
      // GIVEN: Manager has instances
      const instances = [
        { id: 'cleanup-test-1' },
        { id: 'cleanup-test-2' }
      ];
      manager.instances = instances;
      
      apiMock.terminateInstance.mockResolvedValue({ success: true });

      // WHEN: Cleanup is called
      await manager.cleanup();

      // THEN: Verify cleanup conversation
      expect(apiMock.terminateInstance).toHaveBeenCalledWith('cleanup-test-1');
      expect(apiMock.terminateInstance).toHaveBeenCalledWith('cleanup-test-2');
      expect(apiMock.terminateInstance).toHaveBeenCalledTimes(2);
      
      // Verify final state
      expect(manager.instances).toEqual([]);
    });

    it('MUST handle cleanup even with empty instance list', async () => {
      // GIVEN: Manager has no instances
      manager.instances = [];

      // WHEN: Cleanup is called
      await manager.cleanup();

      // THEN: Should not fail, no API calls needed
      expect(apiMock.terminateInstance).not.toHaveBeenCalled();
      expect(manager.instances).toEqual([]);
    });
  });

  /**
   * Contract 4: Error Handling Behavior
   * London School: Test error conversation patterns
   */
  describe('Error Handling Contracts', () => {
    it('MUST handle API failures gracefully during initialization', async () => {
      // GIVEN: API will fail
      apiMock.fetchInstances.mockRejectedValue(new Error('API Error'));

      // WHEN: Manager initializes
      await expect(manager.initialize()).rejects.toThrow('API Error');

      // THEN: Should have attempted to fetch
      expect(apiMock.fetchInstances).toHaveBeenCalledTimes(1);
      
      // Should not have attempted to create instances on error
      expect(apiMock.createInstance).not.toHaveBeenCalled();
    });

    it('MUST propagate creation errors to user', async () => {
      // GIVEN: Creation will fail
      const userConfig = { command: 'claude' };
      apiMock.createInstance.mockResolvedValue({ 
        success: false, 
        error: 'Creation failed' 
      });

      // WHEN: User tries to create instance
      const result = await manager.createInstanceForUser(userConfig);

      // THEN: Should pass error to user
      expect(result.success).toBe(false);
      expect(result.error).toBe('Creation failed');
      
      // Should not add failed instance to list
      expect(manager.instances).toEqual([]);
    });
  });

  /**
   * Contract 5: Resource Leak Prevention
   * London School: Test resource management patterns
   */
  describe('Resource Leak Prevention Contracts', () => {
    it('MUST not accumulate instances across multiple initializations', async () => {
      // GIVEN: Multiple initialization cycles
      apiMock.fetchInstances.mockResolvedValue({ instances: [] });

      // WHEN: Multiple initializations occur
      for (let i = 0; i < 5; i++) {
        await manager.initialize();
      }

      // THEN: Should only fetch, never accumulate or create
      expect(apiMock.fetchInstances).toHaveBeenCalledTimes(5);
      expect(apiMock.createInstance).not.toHaveBeenCalled();
      
      // No resource accumulation
      expect(manager.instances).toEqual([]);
    });

    it('MUST cleanup resources even after multiple operations', async () => {
      // GIVEN: Multiple instance creation and initialization cycles
      apiMock.fetchInstances.mockResolvedValue({ instances: [] });
      apiMock.createInstance.mockResolvedValue({ 
        success: true, 
        instance: { id: 'test-instance' } 
      });
      apiMock.terminateInstance.mockResolvedValue({ success: true });

      // WHEN: Multiple operations occur
      await manager.initialize();
      await manager.createInstanceForUser({ command: 'claude' });
      await manager.initialize(); // Re-initialize
      
      // AND: Cleanup is called
      await manager.cleanup();

      // THEN: Should properly clean up
      expect(apiMock.terminateInstance).toHaveBeenCalledWith('test-instance');
      expect(manager.instances).toEqual([]);
    });
  });
});

/**
 * Integration Contract Test
 * London School: Test how multiple components collaborate
 */
describe('Component Integration Contracts', () => {
  it('MUST coordinate between multiple managers without interference', async () => {
    // GIVEN: Two separate managers (simulating components)
    const api1 = createClaudeInstanceAPIMock();
    const api2 = createClaudeInstanceAPIMock();
    const manager1 = new MockClaudeInstanceManager(api1);
    const manager2 = new MockClaudeInstanceManager(api2);

    api1.fetchInstances.mockResolvedValue({ instances: [] });
    api2.fetchInstances.mockResolvedValue({ instances: [] });

    // WHEN: Both initialize
    await Promise.all([
      manager1.initialize(),
      manager2.initialize()
    ]);

    // THEN: Each should only interact with its own API
    expect(api1.fetchInstances).toHaveBeenCalledTimes(1);
    expect(api2.fetchInstances).toHaveBeenCalledTimes(1);
    
    // Neither should create instances automatically
    expect(api1.createInstance).not.toHaveBeenCalled();
    expect(api2.createInstance).not.toHaveBeenCalled();
  });
});

// ES module export for demonstration
export {
  createClaudeInstanceAPIMock,
  MockClaudeInstanceManager
};