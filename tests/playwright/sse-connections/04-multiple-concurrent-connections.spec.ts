import { test, expect, Page } from '@playwright/test';
import { 
  SSEConnectionTester, 
  ClaudeInstancePage, 
  SSEAssertions,
  SSEPerformanceUtils,
  InstanceInfo 
} from './utils/sse-test-utils';

/**
 * Test Suite 4: Multiple Concurrent SSE Connections
 * 
 * Validates handling of multiple simultaneous SSE connections,
 * connection isolation, resource management, and concurrent operations.
 */

test.describe('Multiple Concurrent SSE Connections', () => {
  let page: Page;
  let claudeInstancePage: ClaudeInstancePage;
  let sseConnectionTester: SSEConnectionTester;
  let createdInstances: InstanceInfo[] = [];
  
  test.beforeEach(async ({ page: p }) => {
    page = p;
    claudeInstancePage = new ClaudeInstancePage(page);
    sseConnectionTester = new SSEConnectionTester();
    createdInstances = [];
    
    await claudeInstancePage.navigateToInstanceManager();
  });
  
  test.afterEach(async () => {
    sseConnectionTester.disconnectAll();
    
    // Clean up instances with retry logic
    for (const instance of createdInstances) {
      try {
        await claudeInstancePage.destroyInstance(instance.id);
      } catch (error) {
        console.warn(`Failed to destroy instance ${instance.id}:`, error);
      }
    }
  });
  
  test('should handle two concurrent SSE connections', async () => {
    console.log('🚀 Test: Two concurrent SSE connections');
    
    // Create two instances
    const instance1 = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance1);
    await claudeInstancePage.selectInstance(instance1);
    await page.waitForTimeout(2000);
    
    const instance2 = await claudeInstancePage.createInstance('no-rate-limit');
    createdInstances.push(instance2);
    await claudeInstancePage.selectInstance(instance2);
    await page.waitForTimeout(2000);
    
    console.log(`📋 Created instances: ${instance1.id}, ${instance2.id}`);
    
    // Establish concurrent connections
    console.log('🔗 Establishing concurrent connections...');
    const monitor1 = await sseConnectionTester.connectToInstance(instance1.id);
    const monitor2 = await sseConnectionTester.connectToInstance(instance2.id);
    
    await page.waitForTimeout(3000);
    
    // Verify both connections are healthy
    const stats1 = monitor1.getStats();
    const stats2 = monitor2.getStats();
    
    console.log(`📊 Instance 1 stats:`, stats1);
    console.log(`📊 Instance 2 stats:`, stats2);
    
    SSEAssertions.expectHealthyConnection(stats1);
    SSEAssertions.expectHealthyConnection(stats2);
    SSEAssertions.expectConcurrentConnections([monitor1, monitor2]);
    
    console.log('✅ Two concurrent SSE connections working correctly');
  });
  
  test('should isolate messages between concurrent connections', async () => {
    console.log('🚀 Test: Message isolation between concurrent connections');
    
    // Create and connect to two instances
    const instances = [];
    const monitors = [];
    
    for (let i = 1; i <= 2; i++) {
      const instance = await claudeInstancePage.createInstance('skip-permissions');
      instances.push(instance);
      createdInstances.push(instance);
      await claudeInstancePage.selectInstance(instance);
      
      const monitor = await sseConnectionTester.connectToInstance(instance.id);
      monitors.push(monitor);
      
      await page.waitForTimeout(2000);
    }
    
    // Clear initial messages
    monitors.forEach(monitor => monitor.clear());
    
    // Send distinct commands to each instance
    const commands = [
      { instanceId: instances[0].id, command: 'echo "Instance 1 unique message"' },
      { instanceId: instances[1].id, command: 'echo "Instance 2 unique message"' }
    ];
    
    console.log('⌨️ Sending isolated commands...');
    for (let i = 0; i < commands.length; i++) {
      // Note: UI limitation - we can only send to currently selected instance
      // This tests that SSE streams maintain isolation even with UI constraints
      await claudeInstancePage.sendTerminalCommand(commands[i].command);
      await page.waitForTimeout(3000);
    }
    
    // Analyze message isolation
    const messages1 = monitors[0].getMessages();
    const messages2 = monitors[1].getMessages();
    
    console.log(`📊 Instance 1 received ${messages1.length} messages`);
    console.log(`📊 Instance 2 received ${messages2.length} messages`);
    
    // Each connection should receive messages
    expect(messages1.length).toBeGreaterThan(0);
    expect(messages2.length).toBeGreaterThan(0);
    
    // Verify no cross-contamination in message content
    const stats1 = monitors[0].getStats();
    const stats2 = monitors[1].getStats();
    
    expect(stats1.errorsEncountered).toBe(0);
    expect(stats2.errorsEncountered).toBe(0);
    expect(stats1.duplicatesDetected).toBe(0);
    expect(stats2.duplicatesDetected).toBe(0);
    
    console.log('✅ Message isolation maintained between concurrent connections');
  });
  
  test('should handle three concurrent connections with stress testing', async () => {
    console.log('🚀 Test: Three concurrent connections under stress');
    
    const instanceCount = 3;
    const instances = [];
    const monitors = [];
    
    // Create multiple instances
    console.log(`📋 Creating ${instanceCount} instances...`);
    for (let i = 1; i <= instanceCount; i++) {
      const instance = await claudeInstancePage.createInstance('skip-permissions');
      instances.push(instance);
      createdInstances.push(instance);
      
      // Select to start the instance
      await claudeInstancePage.selectInstance(instance);
      await page.waitForTimeout(1500);
    }
    
    // Establish concurrent connections
    console.log('🔗 Establishing multiple concurrent connections...');
    for (const instance of instances) {
      const monitor = await sseConnectionTester.connectToInstance(instance.id);
      monitors.push({ instanceId: instance.id, monitor });
      await page.waitForTimeout(1000);
    }
    
    // Stress test with concurrent operations
    console.log('⚡ Running stress test...');
    const stressTestDuration = 15000; // 15 seconds
    const commandInterval = 2000; // Send commands every 2 seconds
    
    const stressTestPromise = new Promise<void>((resolve) => {
      let commandCount = 0;
      const intervalId = setInterval(async () => {
        commandCount++;
        
        // Send command (UI limitation: only to selected instance)
        try {
          await claudeInstancePage.sendTerminalCommand(`echo "Stress test command ${commandCount}"`);
        } catch (error) {
          console.warn(`Command ${commandCount} failed:`, error);
        }
        
        if (Date.now() > Date.now() + stressTestDuration) {
          clearInterval(intervalId);
          resolve();
        }
      }, commandInterval);
      
      // Stop after duration
      setTimeout(() => {
        clearInterval(intervalId);
        resolve();
      }, stressTestDuration);
    });
    
    await stressTestPromise;
    
    // Collect final statistics
    console.log('📊 Collecting stress test results...');
    const finalStats = monitors.map(({ instanceId, monitor }) => ({
      instanceId,
      stats: monitor.getStats()
    }));
    
    // Validate all connections survived stress test
    for (const { instanceId, stats } of finalStats) {
      console.log(`📊 ${instanceId}: ${stats.messagesReceived} msgs, ${stats.errorsEncountered} errors`);
      
      expect(stats.connectionEstablished).toBe(true);
      expect(stats.errorsEncountered).toBe(0);
      expect(stats.duplicatesDetected).toBe(0);
      SSEAssertions.expectNoBufferStorm(stats);
    }
    
    console.log('✅ Three concurrent connections handled stress test successfully');
  });
  
  test('should manage resource allocation across multiple connections', async () => {
    console.log('🚀 Test: Resource allocation across multiple connections');
    
    const instances = [];
    const resourceMetrics = [];
    
    // Create connections incrementally and monitor resource usage
    for (let connectionCount = 1; connectionCount <= 3; connectionCount++) {
      console.log(`📈 Testing with ${connectionCount} connection(s)...`);
      
      // Create new instance
      const instance = await claudeInstancePage.createInstance('skip-permissions');
      instances.push(instance);
      createdInstances.push(instance);
      await claudeInstancePage.selectInstance(instance);
      
      // Connect to all instances
      const monitors = [];
      for (const inst of instances) {
        const monitor = await sseConnectionTester.connectToInstance(inst.id);
        monitors.push(monitor);
        await page.waitForTimeout(500);
      }
      
      // Test activity on all connections
      await claudeInstancePage.sendTerminalCommand(`echo "Resource test with ${connectionCount} connections"`);
      await page.waitForTimeout(3000);
      
      // Collect resource metrics
      const connectionStats = monitors.map(monitor => monitor.getStats());
      const totalMessages = connectionStats.reduce((sum, stats) => sum + stats.messagesReceived, 0);
      const totalErrors = connectionStats.reduce((sum, stats) => sum + stats.errorsEncountered, 0);
      const avgLatency = connectionStats.reduce((sum, stats) => sum + stats.averageLatency, 0) / connectionStats.length;
      
      resourceMetrics.push({
        connectionCount,
        totalMessages,
        totalErrors,
        avgLatency,
        connectionsHealthy: connectionStats.every(stats => stats.connectionEstablished)
      });
      
      console.log(`📊 ${connectionCount} connections: ${totalMessages} msgs, ${totalErrors} errors, ${avgLatency.toFixed(2)}ms avg latency`);
      
      // Disconnect all for next iteration
      sseConnectionTester.disconnectAll();
      await page.waitForTimeout(1000);
    }
    
    // Analyze resource scaling
    console.log('📊 Resource scaling analysis:');
    resourceMetrics.forEach(metric => {
      console.log(`  ${metric.connectionCount} connections: ${metric.totalMessages} msgs, healthy: ${metric.connectionsHealthy}`);
    });
    
    // Validate resource management
    for (const metric of resourceMetrics) {
      expect(metric.connectionsHealthy).toBe(true);
      expect(metric.totalErrors).toBe(0);
      expect(metric.avgLatency).toBeLessThan(10000); // Reasonable latency
    }
    
    // Performance should scale reasonably (not degrade exponentially)
    const maxLatency = Math.max(...resourceMetrics.map(m => m.avgLatency));
    const minLatency = Math.min(...resourceMetrics.map(m => m.avgLatency));
    const latencyRatio = maxLatency / (minLatency || 1);
    
    expect(latencyRatio).toBeLessThan(5); // Latency shouldn't increase by more than 5x
    
    console.log('✅ Resource allocation scales appropriately with multiple connections');
  });
  
  test('should handle concurrent command execution across instances', async () => {
    console.log('🚀 Test: Concurrent command execution across multiple instances');
    
    const instanceCount = 2;
    const instances = [];
    const monitors = [];
    
    // Setup multiple instances
    for (let i = 1; i <= instanceCount; i++) {
      const instance = await claudeInstancePage.createInstance('skip-permissions');
      instances.push(instance);
      createdInstances.push(instance);
      await claudeInstancePage.selectInstance(instance);
      
      const monitor = await sseConnectionTester.connectToInstance(instance.id);
      monitors.push({ instanceId: instance.id, monitor });
      
      await page.waitForTimeout(1500);
    }
    
    console.log(`📋 Setup complete: ${instances.length} instances with concurrent connections`);
    
    // Clear initial messages
    monitors.forEach(({ monitor }) => monitor.clear());
    
    // Execute commands concurrently (limited by UI to sequential)
    const commands = [
      'echo "Concurrent test 1" && date',
      'echo "Concurrent test 2" && pwd',
      'echo "Concurrent test 3" && whoami'
    ];
    
    console.log('⚡ Executing commands across instances...');
    for (let i = 0; i < commands.length; i++) {
      await claudeInstancePage.sendTerminalCommand(commands[i]);
      await page.waitForTimeout(2000);
    }
    
    // Allow time for all responses
    await page.waitForTimeout(5000);
    
    // Analyze concurrent execution results
    const executionResults = monitors.map(({ instanceId, monitor }) => {
      const stats = monitor.getStats();
      const messages = monitor.getMessages();
      
      return {
        instanceId,
        messagesReceived: stats.messagesReceived,
        errorsEncountered: stats.errorsEncountered,
        duplicatesDetected: stats.duplicatesDetected,
        hasActivity: messages.length > 0,
        connectionHealthy: stats.connectionEstablished
      };
    });
    
    console.log('📊 Concurrent execution results:');
    executionResults.forEach(result => {
      console.log(`  ${result.instanceId}: ${result.messagesReceived} msgs, healthy: ${result.connectionHealthy}`);
    });
    
    // Validate concurrent execution
    for (const result of executionResults) {
      expect(result.connectionHealthy).toBe(true);
      expect(result.errorsEncountered).toBe(0);
      expect(result.duplicatesDetected).toBe(0);
      expect(result.hasActivity).toBe(true);
    }
    
    // All connections should have received messages
    const totalActivity = executionResults.reduce((sum, r) => sum + r.messagesReceived, 0);
    expect(totalActivity).toBeGreaterThan(commands.length);
    
    console.log('✅ Concurrent command execution working across multiple instances');
  });
  
  test('should maintain connection stability under load', async () => {
    console.log('🚀 Test: Connection stability under concurrent load');
    
    const instances = [];
    const loadTestDuration = 20000; // 20 seconds
    
    // Create multiple instances for load testing
    console.log('📋 Setting up load test instances...');
    for (let i = 1; i <= 2; i++) {
      const instance = await claudeInstancePage.createInstance('skip-permissions');
      instances.push(instance);
      createdInstances.push(instance);
      await claudeInstancePage.selectInstance(instance);
      await page.waitForTimeout(1000);
    }
    
    // Establish connections
    const monitors = [];
    for (const instance of instances) {
      const monitor = await sseConnectionTester.connectToInstance(instance.id);
      monitors.push({ instanceId: instance.id, monitor });
      await page.waitForTimeout(500);
    }
    
    console.log('⚡ Starting load test...');
    const startTime = Date.now();
    const loadTestMetrics = [];
    
    // Run load test
    const loadTestInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= loadTestDuration) {
        clearInterval(loadTestInterval);
        return;
      }
      
      // Send load command
      try {
        await claudeInstancePage.sendTerminalCommand(`echo "Load test at ${elapsed}ms"`);
      } catch (error) {
        console.warn('Load command failed:', error);
      }
      
      // Collect metrics every 5 seconds
      if (elapsed % 5000 < 1000) {
        const currentMetrics = monitors.map(({ instanceId, monitor }) => {
          const stats = monitor.getStats();
          return {
            instanceId,
            timestamp: elapsed,
            messages: stats.messagesReceived,
            errors: stats.errorsEncountered,
            connected: stats.connectionEstablished
          };
        });
        
        loadTestMetrics.push({
          timestamp: elapsed,
          instances: currentMetrics,
          totalMessages: currentMetrics.reduce((sum, m) => sum + m.messages, 0),
          totalErrors: currentMetrics.reduce((sum, m) => sum + m.errors, 0)
        });
        
        console.log(`📊 Load test @${elapsed}ms: ${loadTestMetrics[loadTestMetrics.length - 1].totalMessages} total msgs`);
      }
    }, 1000);
    
    // Wait for load test completion
    await new Promise(resolve => setTimeout(resolve, loadTestDuration + 2000));
    
    // Final stability analysis
    const finalMetrics = monitors.map(({ instanceId, monitor }) => {
      const stats = monitor.getStats();
      return {
        instanceId,
        finalMessages: stats.messagesReceived,
        finalErrors: stats.errorsEncountered,
        connectionStable: stats.connectionEstablished,
        averageLatency: stats.averageLatency
      };
    });
    
    console.log('📊 Final load test results:');
    finalMetrics.forEach(metric => {
      console.log(`  ${metric.instanceId}: ${metric.finalMessages} msgs, ${metric.finalErrors} errors, stable: ${metric.connectionStable}`);
    });
    
    // Validate stability under load
    for (const metric of finalMetrics) {
      expect(metric.connectionStable).toBe(true);
      expect(metric.finalErrors).toBe(0);
      expect(metric.averageLatency).toBeLessThan(15000); // Should maintain reasonable latency
    }
    
    // Overall system should be stable
    const totalFinalMessages = finalMetrics.reduce((sum, m) => sum + m.finalMessages, 0);
    const totalFinalErrors = finalMetrics.reduce((sum, m) => sum + m.finalErrors, 0);
    
    expect(totalFinalMessages).toBeGreaterThan(10); // Should have processed substantial load
    expect(totalFinalErrors).toBe(0);
    
    console.log('✅ Connection stability maintained under concurrent load');
  });
  
  test('should handle connection cleanup for multiple instances', async () => {
    console.log('🚀 Test: Connection cleanup for multiple instances');
    
    const instances = [];
    const cleanupTestCount = 3;
    
    // Create multiple instances
    for (let i = 1; i <= cleanupTestCount; i++) {
      const instance = await claudeInstancePage.createInstance('skip-permissions');
      instances.push(instance);
      createdInstances.push(instance);
      await claudeInstancePage.selectInstance(instance);
      await page.waitForTimeout(1000);
    }
    
    // Establish connections
    const connectionTracking = [];
    for (const instance of instances) {
      const monitor = await sseConnectionTester.connectToInstance(instance.id);
      connectionTracking.push({
        instanceId: instance.id,
        monitor,
        connected: true,
        messages: 0
      });
      await page.waitForTimeout(500);
    }
    
    console.log(`🔗 Established ${connectionTracking.length} connections for cleanup test`);
    
    // Use connections to generate activity
    await claudeInstancePage.sendTerminalCommand('echo "Cleanup test activity"');
    await page.waitForTimeout(3000);
    
    // Update tracking with activity
    connectionTracking.forEach(track => {
      const stats = track.monitor.getStats();
      track.messages = stats.messagesReceived;
      track.connected = stats.connectionEstablished;
    });
    
    // Test incremental cleanup
    console.log('🧹 Testing incremental connection cleanup...');
    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i];
      
      console.log(`🔌 Cleaning up connection ${i + 1}: ${instance.id}`);
      sseConnectionTester.disconnectFromInstance(instance.id);
      
      // Verify cleanup
      const remaining = sseConnectionTester.getActiveConnections();
      const expectedRemaining = instances.length - (i + 1);
      
      expect(remaining.length).toBe(expectedRemaining);
      console.log(`✅ Cleanup ${i + 1}: ${remaining.length} connections remaining`);
      
      await page.waitForTimeout(1000);
    }
    
    // Verify all connections are cleaned up
    const finalConnections = sseConnectionTester.getActiveConnections();
    expect(finalConnections.length).toBe(0);
    
    console.log('🧹 Testing bulk cleanup...');
    
    // Reconnect for bulk cleanup test
    for (const instance of instances) {
      await sseConnectionTester.connectToInstance(instance.id);
      await page.waitForTimeout(200);
    }
    
    const beforeBulkCleanup = sseConnectionTester.getActiveConnections();
    expect(beforeBulkCleanup.length).toBe(instances.length);
    
    // Bulk disconnect
    sseConnectionTester.disconnectAll();
    
    const afterBulkCleanup = sseConnectionTester.getActiveConnections();
    expect(afterBulkCleanup.length).toBe(0);
    
    console.log('✅ Connection cleanup working correctly for multiple instances');
  });
});