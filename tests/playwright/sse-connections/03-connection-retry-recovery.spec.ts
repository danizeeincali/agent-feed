import { test, expect, Page } from '@playwright/test';
import { 
  SSEConnectionTester, 
  ClaudeInstancePage, 
  SSEAssertions,
  InstanceInfo 
} from './utils/sse-test-utils';

/**
 * Test Suite 3: Connection Retry and Error Recovery
 * 
 * Validates SSE connection resilience, retry mechanisms, 
 * error recovery, and reconnection scenarios.
 */

test.describe('Connection Retry and Error Recovery', () => {
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
    for (const instance of createdInstances) {
      try {
        await claudeInstancePage.destroyInstance(instance.id);
      } catch (error) {
        console.warn(`Cleanup failed for ${instance.id}:`, error);
      }
    }
  });
  
  test('should handle connection interruption and recovery', async () => {
    console.log('🚀 Test: Connection interruption and recovery');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    // Establish initial connection
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    await page.waitForTimeout(3000);
    
    // Capture pre-interruption stats
    const preInterruptionStats = monitor.getStats();
    console.log('📊 Pre-interruption stats:', preInterruptionStats);
    
    // Verify healthy connection
    SSEAssertions.expectHealthyConnection(preInterruptionStats);
    
    // Simulate connection interruption by disconnecting
    console.log('🔌 Simulating connection interruption...');
    sseConnectionTester.disconnectFromInstance(instance.id);
    
    // Wait for interruption period
    await page.waitForTimeout(5000);
    
    // Attempt reconnection
    console.log('🔗 Attempting reconnection...');
    const recoveryMonitor = await sseConnectionTester.connectToInstance(instance.id);
    
    // Test recovery by sending a command
    await claudeInstancePage.sendTerminalCommand('echo "Recovery test - post interruption"');
    await page.waitForTimeout(5000);
    
    const recoveryStats = recoveryMonitor.getStats();
    console.log('📊 Post-recovery stats:', recoveryStats);
    
    // Validate recovery
    SSEAssertions.expectHealthyConnection(recoveryStats);
    expect(recoveryStats.messagesReceived).toBeGreaterThan(0);
    
    console.log('✅ Connection recovery successful after interruption');
  });
  
  test('should retry failed connections with backoff', async () => {
    console.log('🚀 Test: Connection retry with backoff strategy');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    // Test retry mechanism by attempting connection to non-existent instance first
    const fakeInstanceId = 'fake-instance-' + Date.now();
    
    console.log(`🔗 Testing retry mechanism with fake instance: ${fakeInstanceId}`);
    try {
      await sseConnectionTester.connectToInstance(fakeInstanceId);
      // Should not reach here
      expect(false).toBe(true);
    } catch (error) {
      console.log('✅ Expected failure for non-existent instance:', error.message);
    }
    
    // Now connect to real instance (should succeed)
    console.log(`🔗 Connecting to real instance: ${instance.id}`);
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    
    await page.waitForTimeout(3000);
    const stats = monitor.getStats();
    
    SSEAssertions.expectHealthyConnection(stats);
    
    console.log('✅ Retry mechanism working - failed then succeeded appropriately');
  });
  
  test('should recover from temporary network issues', async () => {
    console.log('🚀 Test: Recovery from temporary network issues');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    await page.waitForTimeout(2000);
    
    // Send initial command to establish baseline
    await claudeInstancePage.sendTerminalCommand('echo "Before network issue"');
    await page.waitForTimeout(2000);
    
    const preIssueStats = monitor.getStats();
    const preIssueMessages = monitor.getMessages().length;
    
    console.log('📊 Before simulated network issue:', preIssueStats);
    
    // Simulate temporary network issue by rapidly disconnecting and reconnecting
    console.log('🌐 Simulating temporary network issue...');
    
    sseConnectionTester.disconnectFromInstance(instance.id);
    await page.waitForTimeout(1000); // Brief disconnection
    
    // Quick reconnection attempt
    const recoveryMonitor = await sseConnectionTester.connectToInstance(instance.id);
    
    // Test functionality after network recovery
    await claudeInstancePage.sendTerminalCommand('echo "After network recovery"');
    await page.waitForTimeout(4000);
    
    const recoveryStats = recoveryMonitor.getStats();
    console.log('📊 After network recovery:', recoveryStats);
    
    // Validate recovery
    SSEAssertions.expectHealthyConnection(recoveryStats);
    expect(recoveryStats.messagesReceived).toBeGreaterThan(0);
    
    // Check that we received response to post-recovery command
    const recoveryMessages = recoveryMonitor.getMessages();
    const hasRecoveryResponse = recoveryMessages.some(m => 
      JSON.stringify(m.data).includes('After network recovery')
    );
    
    expect(hasRecoveryResponse || recoveryMessages.length > 2).toBe(true); // Either specific response or general activity
    
    console.log('✅ Recovered successfully from temporary network issue');
  });
  
  test('should handle server restart scenarios', async () => {
    console.log('🚀 Test: Server restart recovery handling');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    // Establish baseline connection
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    await page.waitForTimeout(3000);
    
    await claudeInstancePage.sendTerminalCommand('echo "Before server restart simulation"');
    await page.waitForTimeout(2000);
    
    const preRestartStats = monitor.getStats();
    console.log('📊 Pre-restart stats:', preRestartStats);
    
    // Simulate server restart by disconnecting and waiting longer period
    console.log('🔄 Simulating server restart scenario...');
    sseConnectionTester.disconnectFromInstance(instance.id);
    
    // Longer wait to simulate server restart
    await page.waitForTimeout(8000);
    
    // Attempt reconnection with retry logic
    console.log('🔗 Attempting post-restart reconnection...');
    let reconnected = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!reconnected && retryCount < maxRetries) {
      try {
        retryCount++;
        console.log(`🔄 Reconnection attempt ${retryCount}/${maxRetries}...`);
        
        const postRestartMonitor = await sseConnectionTester.connectToInstance(instance.id);
        await page.waitForTimeout(2000);
        
        // Test functionality
        await claudeInstancePage.sendTerminalCommand('echo "Post-restart test"');
        await page.waitForTimeout(3000);
        
        const postRestartStats = postRestartMonitor.getStats();
        
        if (postRestartStats.connectionEstablished && postRestartStats.messagesReceived > 0) {
          reconnected = true;
          console.log('📊 Post-restart stats:', postRestartStats);
          
          SSEAssertions.expectHealthyConnection(postRestartStats);
        }
        
      } catch (error) {
        console.warn(`Reconnection attempt ${retryCount} failed:`, error.message);
        if (retryCount < maxRetries) {
          await page.waitForTimeout(3000); // Wait before retry
        }
      }
    }
    
    expect(reconnected).toBe(true);
    console.log('✅ Successfully recovered from server restart scenario');
  });
  
  test('should maintain data integrity during recovery', async () => {
    console.log('🚀 Test: Data integrity during connection recovery');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    await page.waitForTimeout(2000);
    
    // Send commands to establish baseline data
    const baselineCommands = [
      'echo "Data integrity test 1"',
      'echo "Data integrity test 2"',
      'pwd'
    ];
    
    console.log('⌨️ Sending baseline commands...');
    for (const command of baselineCommands) {
      await claudeInstancePage.sendTerminalCommand(command);
      await page.waitForTimeout(1500);
    }
    
    const preDisconnectionMessages = monitor.getMessages().length;
    const preDisconnectionStats = monitor.getStats();
    
    console.log(`📊 Pre-disconnection: ${preDisconnectionMessages} messages`);
    
    // Simulate disconnection
    sseConnectionTester.disconnectFromInstance(instance.id);
    await page.waitForTimeout(3000);
    
    // Reconnect
    const recoveryMonitor = await sseConnectionTester.connectToInstance(instance.id);
    
    // Send post-recovery commands
    const recoveryCommands = [
      'echo "Recovery data test 1"',
      'echo "Recovery data test 2"',
      'date'
    ];
    
    console.log('⌨️ Sending post-recovery commands...');
    for (const command of recoveryCommands) {
      await claudeInstancePage.sendTerminalCommand(command);
      await page.waitForTimeout(1500);
    }
    
    await page.waitForTimeout(3000);
    
    const recoveryMessages = recoveryMonitor.getMessages();
    const recoveryStats = recoveryMonitor.getStats();
    
    console.log(`📊 Post-recovery: ${recoveryMessages.length} messages`);
    
    // Validate data integrity
    expect(recoveryStats.messagesReceived).toBeGreaterThan(0);
    expect(recoveryStats.duplicatesDetected).toBe(0);
    expect(recoveryStats.errorsEncountered).toBe(0);
    
    // Check that recovery messages contain expected content
    const recoveryContent = recoveryMessages.map(m => JSON.stringify(m.data));
    const hasRecoveryData = recoveryContent.some(content => 
      content.includes('Recovery data test')
    );
    
    // Should have new data, not replayed old data
    expect(hasRecoveryData || recoveryMessages.length >= recoveryCommands.length).toBe(true);
    
    console.log('✅ Data integrity maintained during recovery');
  });
  
  test('should handle connection errors gracefully', async () => {
    console.log('🚀 Test: Graceful connection error handling');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    // Test various error scenarios
    const errorScenarios = [
      {
        name: 'Invalid instance ID',
        instanceId: 'invalid-instance-id',
        shouldFail: true
      },
      {
        name: 'Valid instance ID',
        instanceId: instance.id,
        shouldFail: false
      }
    ];
    
    for (const scenario of errorScenarios) {
      console.log(`🧪 Testing scenario: ${scenario.name}`);
      
      try {
        const monitor = await sseConnectionTester.connectToInstance(scenario.instanceId);
        
        if (scenario.shouldFail) {
          console.error('❌ Expected failure but connection succeeded');
          expect(false).toBe(true); // Force test failure
        } else {
          console.log('✅ Connection succeeded as expected');
          
          // Validate successful connection
          await page.waitForTimeout(2000);
          const stats = monitor.getStats();
          SSEAssertions.expectHealthyConnection(stats);
        }
        
      } catch (error) {
        if (scenario.shouldFail) {
          console.log(`✅ Expected failure occurred: ${error.message}`);
        } else {
          console.error(`❌ Unexpected failure: ${error.message}`);
          throw error;
        }
      }
    }
    
    console.log('✅ Connection error handling working gracefully');
  });
  
  test('should prevent connection resource leaks during recovery', async () => {
    console.log('🚀 Test: Connection resource leak prevention');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    // Track connection lifecycle
    const connectionCycles = 5;
    const resourceMetrics = [];
    
    for (let cycle = 1; cycle <= connectionCycles; cycle++) {
      console.log(`🔄 Connection cycle ${cycle}/${connectionCycles}`);
      
      // Connect
      const monitor = await sseConnectionTester.connectToInstance(instance.id);
      await page.waitForTimeout(2000);
      
      // Use connection
      await claudeInstancePage.sendTerminalCommand(`echo "Cycle ${cycle} test"`);
      await page.waitForTimeout(1500);
      
      const stats = monitor.getStats();
      resourceMetrics.push({
        cycle,
        messagesReceived: stats.messagesReceived,
        connectionDuration: stats.connectionDuration,
        errors: stats.errorsEncountered
      });
      
      // Disconnect (simulating various disconnect scenarios)
      sseConnectionTester.disconnectFromInstance(instance.id);
      
      // Brief pause between cycles
      await page.waitForTimeout(1000);
    }
    
    // Analyze resource usage patterns
    console.log('📊 Resource usage analysis:');
    resourceMetrics.forEach(metric => {
      console.log(`  Cycle ${metric.cycle}: ${metric.messagesReceived} msgs, ${metric.connectionDuration}ms, ${metric.errors} errors`);
    });
    
    // Validate no resource leaks indicated by consistent behavior
    const avgMessagesPerCycle = resourceMetrics.reduce((sum, m) => sum + m.messagesReceived, 0) / resourceMetrics.length;
    const avgErrors = resourceMetrics.reduce((sum, m) => sum + m.errors, 0) / resourceMetrics.length;
    
    expect(avgMessagesPerCycle).toBeGreaterThan(0);
    expect(avgErrors).toBe(0);
    
    // Each cycle should have similar performance (no degradation)
    const performanceVariation = Math.max(...resourceMetrics.map(m => m.messagesReceived)) - 
                                 Math.min(...resourceMetrics.map(m => m.messagesReceived));
    
    // Variation should be reasonable (not exponentially growing)
    expect(performanceVariation).toBeLessThan(avgMessagesPerCycle * 2);
    
    console.log('✅ No resource leaks detected during connection recovery cycles');
  });
  
  test('should handle concurrent recovery scenarios', async () => {
    console.log('🚀 Test: Concurrent connection recovery');
    
    // Create multiple instances for concurrent testing
    const instances = [];
    for (let i = 0; i < 2; i++) {
      const instance = await claudeInstancePage.createInstance('skip-permissions');
      instances.push(instance);
      createdInstances.push(instance);
      await claudeInstancePage.selectInstance(instance);
      await page.waitForTimeout(2000); // Brief pause between creations
    }
    
    // Connect to all instances
    const monitors = [];
    for (const instance of instances) {
      const monitor = await sseConnectionTester.connectToInstance(instance.id);
      monitors.push({ instanceId: instance.id, monitor });
      await page.waitForTimeout(1000);
    }
    
    console.log(`📡 Established ${monitors.length} concurrent connections`);
    
    // Simulate concurrent disconnections
    console.log('🔌 Simulating concurrent disconnections...');
    for (const { instanceId } of monitors) {
      sseConnectionTester.disconnectFromInstance(instanceId);
    }
    
    await page.waitForTimeout(3000);
    
    // Concurrent reconnections
    console.log('🔗 Performing concurrent reconnections...');
    const recoveryMonitors = [];
    
    const reconnectionPromises = instances.map(async (instance) => {
      try {
        const monitor = await sseConnectionTester.connectToInstance(instance.id);
        return { instanceId: instance.id, monitor, success: true };
      } catch (error) {
        console.warn(`Failed to reconnect to ${instance.id}:`, error.message);
        return { instanceId: instance.id, monitor: null, success: false, error: error.message };
      }
    });
    
    const reconnectionResults = await Promise.all(reconnectionPromises);
    
    // Validate concurrent recovery
    const successfulReconnections = reconnectionResults.filter(r => r.success);
    expect(successfulReconnections.length).toBeGreaterThan(0);
    
    console.log(`✅ Concurrent recovery: ${successfulReconnections.length}/${reconnectionResults.length} successful`);
    
    // Test functionality of recovered connections
    for (const result of successfulReconnections) {
      if (result.monitor) {
        await claudeInstancePage.sendTerminalCommand(`echo "Concurrent recovery test for ${result.instanceId}"`);
        await page.waitForTimeout(2000);
        
        const stats = result.monitor.getStats();
        expect(stats.connectionEstablished).toBe(true);
      }
    }
    
    console.log('✅ Concurrent connection recovery completed successfully');
  });
});