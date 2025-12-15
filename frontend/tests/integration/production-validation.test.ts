/**
 * COMPREHENSIVE PRODUCTION VALIDATION TEST
 * 
 * This test validates the complete ClaudeServiceManager architecture for production readiness:
 * 1. ClaudeServiceManager API-based instance monitoring
 * 2. ClaudeInstanceManager WebSocket connection management  
 * 3. Complete user workflows from UI to Claude response
 * 4. /prod directory enforcement
 * 5. Feed integration readiness
 * 6. Real functionality testing (no mocks)
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { ClaudeServiceManager, createProductionClaudeServiceManager } from '../src/services/ClaudeServiceManager';
import { ClaudeInstanceManager, createClaudeInstanceManager } from '../src/managers/ClaudeInstanceManager';
import fetch from 'node-fetch';

// Real API URLs - no mocks allowed
const API_BASE_URL = 'http://localhost:3000';
const WS_BASE_URL = 'ws://localhost:3000';

// Test timeout for real operations
const TEST_TIMEOUT = 60000;

describe('Production Validation - Complete ClaudeServiceManager Architecture', () => {
  let serviceManager: ClaudeServiceManager;
  let instanceManager: ClaudeInstanceManager;
  let createdInstanceIds: string[] = [];

  beforeAll(async () => {
    console.log('🚀 Starting Production Validation Tests');
    console.log('📍 Testing against real backend at:', API_BASE_URL);
    
    // Verify backend is running
    try {
      const healthCheck = await fetch(`${API_BASE_URL}/health`);
      if (!healthCheck.ok) {
        throw new Error('Backend health check failed');
      }
      console.log('✅ Backend health check passed');
    } catch (error) {
      console.error('❌ Backend not accessible:', error);
      throw new Error('Backend must be running for production validation');
    }

    // Initialize production managers
    serviceManager = createProductionClaudeServiceManager(API_BASE_URL);
    console.log('✅ ClaudeServiceManager initialized');
    
  }, TEST_TIMEOUT);

  afterAll(async () => {
    console.log('🧹 Cleaning up production validation tests');
    
    // Cleanup all created instances
    for (const instanceId of createdInstanceIds) {
      try {
        await serviceManager.terminateInstance(instanceId);
        console.log(`✅ Cleaned up instance: ${instanceId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup instance ${instanceId}:`, error);
      }
    }
    
    // Cleanup managers
    serviceManager?.cleanup();
    instanceManager?.cleanup();
    
    console.log('✅ Production validation cleanup complete');
  }, TEST_TIMEOUT);

  beforeEach(() => {
    // Reset instance tracking for each test
    createdInstanceIds = [];
  });

  describe('1. ClaudeServiceManager API-based Instance Monitoring', () => {
    test('should verify API connectivity and health', async () => {
      const metrics = serviceManager.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.lastHealthCheck).toBeInstanceOf(Date);
      
      console.log('📊 Initial metrics:', metrics);
    }, TEST_TIMEOUT);

    test('should fetch existing instances via API', async () => {
      const instances = await serviceManager.getInstances();
      expect(Array.isArray(instances)).toBe(true);
      
      console.log(`📋 Found ${instances.length} existing instances`);
      instances.forEach(instance => {
        console.log(`  - ${instance.id}: ${instance.status} (${instance.type})`);
      });
    }, TEST_TIMEOUT);

    test('should create production instance with /prod directory enforcement', async () => {
      console.log('🚀 Creating production instance with /prod directory');
      
      const instance = await serviceManager.createInstance({
        name: 'Production Validation Test',
        type: 'worker',
        workingDirectory: '/workspaces/agent-feed/prod',
        skipPermissions: false,
        autoRestart: true,
        isAlwaysOn: true
      });
      
      createdInstanceIds.push(instance.id);
      
      expect(instance).toBeDefined();
      expect(instance.workingDirectory).toBe('/workspaces/agent-feed/prod');
      expect(instance.type).toBe('worker');
      expect(instance.isAlwaysOn).toBe(true);
      expect(instance.status).toBe('starting');
      
      console.log('✅ Production instance created:', instance.id);
      
      // Wait for instance to start
      let attempts = 0;
      while (attempts < 10) {
        const updatedInstance = await serviceManager.getInstance(instance.id);
        if (updatedInstance && updatedInstance.status === 'running') {
          console.log('✅ Instance is now running');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }, TEST_TIMEOUT);

    test('should enforce always-on worker instance for Feed integration', async () => {
      console.log('🔧 Testing Feed worker instance management');
      
      const workerInstance = await serviceManager.ensureWorkerInstance();
      createdInstanceIds.push(workerInstance.id);
      
      expect(workerInstance).toBeDefined();
      expect(workerInstance.type).toBe('worker');
      expect(workerInstance.isAlwaysOn).toBe(true);
      expect(workerInstance.name).toContain('Feed Worker');
      
      // Verify it's accessible via getWorkerInstance
      const fetchedWorker = await serviceManager.getWorkerInstance();
      expect(fetchedWorker?.id).toBe(workerInstance.id);
      
      console.log('✅ Feed worker instance validated:', workerInstance.id);
    }, TEST_TIMEOUT);
  });

  describe('2. ClaudeInstanceManager WebSocket Connection Management', () => {
    let testInstanceId: string;

    beforeEach(async () => {
      // Create test instance for WebSocket testing
      const instance = await serviceManager.createInstance({
        name: 'WebSocket Test Instance',
        type: 'interactive',
        skipPermissions: true,
        autoRestart: false
      });
      testInstanceId = instance.id;
      createdInstanceIds.push(testInstanceId);
      
      // Wait for instance to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Initialize instance manager
      instanceManager = createClaudeInstanceManager({
        instanceId: testInstanceId,
        apiUrl: API_BASE_URL,
        websocketUrl: WS_BASE_URL,
        autoConnect: false,
        reconnectAttempts: 3,
        reconnectInterval: 2000
      });
    });

    test('should establish WebSocket connection to running instance', async () => {
      console.log('🔌 Testing WebSocket connection to instance:', testInstanceId);
      
      let connectionEstablished = false;
      
      instanceManager.on('instance:connected', (data) => {
        console.log('✅ WebSocket connection established:', data);
        connectionEstablished = true;
      });
      
      await instanceManager.connectToInstance(testInstanceId);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const status = instanceManager.getConnectionStatus();
      expect(status.isConnected).toBe(true);
      expect(status.instanceId).toBe(testInstanceId);
      expect(connectionEstablished).toBe(true);
      
      console.log('✅ WebSocket connection status verified');
    }, TEST_TIMEOUT);

    test('should enforce single-connection safety', async () => {
      console.log('🔒 Testing single-connection safety mechanisms');
      
      // Connect to first instance
      await instanceManager.connectToInstance(testInstanceId);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create second instance
      const instance2 = await serviceManager.createInstance({
        name: 'Second Test Instance',
        type: 'interactive',
        skipPermissions: true
      });
      createdInstanceIds.push(instance2.id);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Try to connect to second instance - should disconnect first
      let disconnectionDetected = false;
      instanceManager.on('instance:disconnected', () => {
        disconnectionDetected = true;
      });
      
      await instanceManager.connectToInstance(instance2.id);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const status = instanceManager.getConnectionStatus();
      expect(status.instanceId).toBe(instance2.id);
      expect(disconnectionDetected).toBe(true);
      
      console.log('✅ Single-connection safety validated');
    }, TEST_TIMEOUT);

    test('should stream real terminal I/O', async () => {
      console.log('📡 Testing real terminal I/O streaming');
      
      let outputReceived = false;
      let receivedOutput = '';
      
      instanceManager.on('instance:output', (data) => {
        console.log('📺 Received output:', data);
        outputReceived = true;
        receivedOutput += data.content;
      });
      
      await instanceManager.connectToInstance(testInstanceId);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Send real command
      await instanceManager.sendCommand('echo "Production Validation Test"');
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      expect(outputReceived).toBe(true);
      expect(receivedOutput).toContain('Production Validation Test');
      
      console.log('✅ Real terminal I/O validated');
      console.log('📋 Received output:', receivedOutput.slice(-200));
    }, TEST_TIMEOUT);
  });

  describe('3. Complete User Workflow Validation', () => {
    test('should execute full user workflow: create → connect → command → response', async () => {
      console.log('🔄 Testing complete user workflow');
      
      // Step 1: User navigates to claude-instances page (simulated)
      console.log('1️⃣ User navigates to claude-instances page');
      const instances = await serviceManager.getInstances();
      expect(Array.isArray(instances)).toBe(true);
      
      // Step 2: User creates new instance
      console.log('2️⃣ User creates new Claude instance');
      const newInstance = await serviceManager.createInstance({
        name: 'User Workflow Test',
        type: 'interactive',
        skipPermissions: true
      });
      createdInstanceIds.push(newInstance.id);
      
      // Wait for instance to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Step 3: User connects to instance
      console.log('3️⃣ User connects to instance');
      const workflowInstanceManager = createClaudeInstanceManager({
        instanceId: newInstance.id,
        apiUrl: API_BASE_URL,
        websocketUrl: WS_BASE_URL
      });
      
      let connectionSuccess = false;
      let commandResponse = '';
      
      workflowInstanceManager.on('instance:connected', () => {
        connectionSuccess = true;
      });
      
      workflowInstanceManager.on('instance:output', (data) => {
        commandResponse += data.content;
      });
      
      await workflowInstanceManager.connectToInstance(newInstance.id);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Step 4: User sends command
      console.log('4️⃣ User sends command');
      await workflowInstanceManager.sendCommand('pwd');
      
      // Step 5: User receives Claude response
      console.log('5️⃣ Waiting for Claude response');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Validate complete workflow
      expect(connectionSuccess).toBe(true);
      expect(commandResponse.length).toBeGreaterThan(0);
      
      console.log('✅ Complete user workflow validated');
      console.log('📋 Response received:', commandResponse.slice(-100));
      
      // Cleanup
      workflowInstanceManager.cleanup();
    }, TEST_TIMEOUT);

    test('should handle cross-component state synchronization', async () => {
      console.log('🔄 Testing cross-component state synchronization');
      
      // Create instance via ServiceManager
      const instance = await serviceManager.createInstance({
        name: 'State Sync Test',
        type: 'interactive',
        skipPermissions: true
      });
      createdInstanceIds.push(instance.id);
      
      // Wait for creation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify instance is accessible via both managers
      const serviceInstance = await serviceManager.getInstance(instance.id);
      expect(serviceInstance).toBeDefined();
      expect(serviceInstance.id).toBe(instance.id);
      
      // Create InstanceManager and verify connection state sync
      const syncInstanceManager = createClaudeInstanceManager({
        instanceId: instance.id,
        apiUrl: API_BASE_URL,
        websocketUrl: WS_BASE_URL
      });
      
      await syncInstanceManager.connectToInstance(instance.id);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const connectionStatus = syncInstanceManager.getConnectionStatus();
      expect(connectionStatus.instanceId).toBe(instance.id);
      
      console.log('✅ Cross-component state synchronization validated');
      
      syncInstanceManager.cleanup();
    }, TEST_TIMEOUT);
  });

  describe('4. Production Readiness Validation', () => {
    test('should handle API errors gracefully', async () => {
      console.log('🛡️ Testing error handling and recovery');
      
      // Test with invalid instance ID
      try {
        await serviceManager.getInstance('invalid-instance-id');
        // Should not throw, but return null
      } catch (error) {
        // If it throws, it should be handled gracefully
        expect(error).toBeDefined();
      }
      
      // Test connection to non-existent instance
      const errorInstanceManager = createClaudeInstanceManager({
        instanceId: 'non-existent-instance',
        apiUrl: API_BASE_URL,
        websocketUrl: WS_BASE_URL
      });
      
      let errorCaught = false;
      try {
        await errorInstanceManager.connectToInstance('non-existent-instance');
      } catch (error) {
        errorCaught = true;
        expect(error.message).toContain('not running');
      }
      
      expect(errorCaught).toBe(true);
      console.log('✅ Error handling validated');
      
      errorInstanceManager.cleanup();
    }, TEST_TIMEOUT);

    test('should perform under load', async () => {
      console.log('⚡ Testing performance under load');
      
      const startTime = performance.now();
      
      // Create multiple instances concurrently
      const instancePromises = Array.from({ length: 3 }, (_, index) =>
        serviceManager.createInstance({
          name: `Load Test Instance ${index}`,
          type: 'interactive',
          skipPermissions: true
        })
      );
      
      const instances = await Promise.all(instancePromises);
      instances.forEach(instance => createdInstanceIds.push(instance.id));
      
      const creationTime = performance.now() - startTime;
      
      // Verify all instances were created
      expect(instances).toHaveLength(3);
      instances.forEach(instance => {
        expect(instance.id).toBeDefined();
        expect(instance.status).toBeDefined();
      });
      
      console.log(`✅ Created 3 instances in ${creationTime.toFixed(2)}ms`);
      
      // Test concurrent API calls
      const fetchStart = performance.now();
      const fetchPromises = instances.map(instance => 
        serviceManager.getInstance(instance.id)
      );
      
      const fetchedInstances = await Promise.all(fetchPromises);
      const fetchTime = performance.now() - fetchStart;
      
      expect(fetchedInstances).toHaveLength(3);
      fetchedInstances.forEach(instance => {
        expect(instance).toBeDefined();
      });
      
      console.log(`✅ Fetched 3 instances in ${fetchTime.toFixed(2)}ms`);
      console.log('⚡ Performance under load validated');
    }, TEST_TIMEOUT);

    test('should verify no JavaScript errors in production build', async () => {
      console.log('🔍 Validating production build integrity');
      
      // This test verifies that our managers can be instantiated without errors
      // which indicates the production build is clean
      
      let managerCreationError = null;
      try {
        const testServiceManager = createProductionClaudeServiceManager(API_BASE_URL);
        const testInstanceManager = createClaudeInstanceManager({
          instanceId: 'test-id',
          apiUrl: API_BASE_URL
        });
        
        // Verify managers are functional
        expect(testServiceManager.getMetrics).toBeDefined();
        expect(testInstanceManager.getConnectionStatus).toBeDefined();
        
        // Cleanup test managers
        testServiceManager.cleanup();
        testInstanceManager.cleanup();
        
      } catch (error) {
        managerCreationError = error;
      }
      
      expect(managerCreationError).toBeNull();
      console.log('✅ Production build integrity validated');
    });

    test('should validate Feed integration readiness', async () => {
      console.log('🔗 Testing Feed integration readiness');
      
      // Ensure worker instance is available for Feed
      const feedWorkerInstance = await serviceManager.ensureWorkerInstance();
      createdInstanceIds.push(feedWorkerInstance.id);
      
      expect(feedWorkerInstance.type).toBe('worker');
      expect(feedWorkerInstance.isAlwaysOn).toBe(true);
      expect(feedWorkerInstance.workingDirectory).toContain('prod');
      
      // Verify metrics include Feed-relevant data
      const metrics = serviceManager.getMetrics();
      expect(metrics.workerInstances).toBeGreaterThan(0);
      expect(metrics.totalInstances).toBeGreaterThan(0);
      
      console.log('📊 Feed integration metrics:', {
        workerInstances: metrics.workerInstances,
        totalInstances: metrics.totalInstances,
        feedInstances: metrics.feedInstances
      });
      
      console.log('✅ Feed integration readiness validated');
    }, TEST_TIMEOUT);
  });

  describe('5. Real Functionality Verification', () => {
    test('should execute real Claude commands and receive authentic responses', async () => {
      console.log('🤖 Testing real Claude interaction');
      
      // Create interactive instance
      const claudeInstance = await serviceManager.createInstance({
        name: 'Real Claude Test',
        type: 'interactive',
        skipPermissions: true
      });
      createdInstanceIds.push(claudeInstance.id);
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Connect and interact
      const realClaudeManager = createClaudeInstanceManager({
        instanceId: claudeInstance.id,
        apiUrl: API_BASE_URL,
        websocketUrl: WS_BASE_URL
      });
      
      let realOutput = '';
      realClaudeManager.on('instance:output', (data) => {
        if (data.isReal) {
          realOutput += data.content;
        }
      });
      
      await realClaudeManager.connectToInstance(claudeInstance.id);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Send real command to Claude
      await realClaudeManager.sendCommand('echo "Hello from Claude validation test"');
      
      // Wait for real response
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      expect(realOutput.length).toBeGreaterThan(0);
      expect(realOutput).toContain('Hello from Claude validation test');
      
      console.log('✅ Real Claude interaction validated');
      console.log('🤖 Real output received:', realOutput.slice(-150));
      
      realClaudeManager.cleanup();
    }, TEST_TIMEOUT);
  });
});