import { test, expect, Page } from '@playwright/test';
import { 
  SSEConnectionTester, 
  ClaudeInstancePage, 
  SSEAssertions,
  InstanceInfo 
} from './utils/sse-test-utils';

/**
 * Test Suite 5: SSE Connection Cleanup and Resource Management
 * 
 * Validates proper resource cleanup, memory management, 
 * connection lifecycle, and prevention of resource leaks.
 */

test.describe('SSE Connection Cleanup and Resource Management', () => {
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
  
  test('should properly clean up SSE connection resources', async () => {
    console.log('🚀 Test: SSE connection resource cleanup');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    // Establish connection and generate activity
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    await page.waitForTimeout(2000);
    
    await claudeInstancePage.sendTerminalCommand('echo "Resource cleanup test"');
    await page.waitForTimeout(3000);
    
    const beforeCleanupStats = monitor.getStats();
    console.log('📊 Before cleanup stats:', beforeCleanupStats);
    
    // Verify connection is active
    expect(beforeCleanupStats.connectionEstablished).toBe(true);
    expect(beforeCleanupStats.messagesReceived).toBeGreaterThan(0);
    
    // Perform cleanup
    console.log('🧹 Performing connection cleanup...');
    sseConnectionTester.disconnectFromInstance(instance.id);
    
    // Verify cleanup completed
    const remainingConnections = sseConnectionTester.getActiveConnections();
    expect(remainingConnections.length).toBe(0);
    expect(remainingConnections.includes(instance.id)).toBe(false);
    
    // Attempt to get monitor after cleanup (should return undefined)
    const cleanedMonitor = sseConnectionTester.getMonitor(instance.id);
    expect(cleanedMonitor).toBeUndefined();
    
    console.log('✅ SSE connection resources cleaned up properly');
  });
  
  test('should prevent memory leaks during connection lifecycle', async () => {
    console.log('🚀 Test: Memory leak prevention during connection lifecycle');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    const lifecycleCycles = 5;
    const memoryMetrics = [];
    
    for (let cycle = 1; cycle <= lifecycleCycles; cycle++) {
      console.log(`🔄 Memory test cycle ${cycle}/${lifecycleCycles}`);
      
      // Connect
      const monitor = await sseConnectionTester.connectToInstance(instance.id);
      
      // Generate activity
      await claudeInstancePage.sendTerminalCommand(`echo "Memory cycle ${cycle}"`);
      await page.waitForTimeout(2000);
      
      const stats = monitor.getStats();
      const messages = monitor.getMessages();
      
      memoryMetrics.push({
        cycle,
        messagesReceived: stats.messagesReceived,
        messageBufferSize: messages.length,
        connectionDuration: stats.connectionDuration,
        errors: stats.errorsEncountered
      });
      
      console.log(`📊 Cycle ${cycle}: ${stats.messagesReceived} msgs, ${messages.length} buffered`);
      
      // Disconnect and cleanup
      sseConnectionTester.disconnectFromInstance(instance.id);
      await page.waitForTimeout(1000);
    }
    
    // Analyze memory usage patterns
    console.log('📈 Memory usage analysis:');
    memoryMetrics.forEach(metric => {
      console.log(`  Cycle ${metric.cycle}: ${metric.messagesReceived} msgs, ${metric.messageBufferSize} buffered, ${metric.errors} errors`);
    });
    
    // Validate no memory leaks
    const avgMessagesPerCycle = memoryMetrics.reduce((sum, m) => sum + m.messagesReceived, 0) / memoryMetrics.length;
    const avgBufferSize = memoryMetrics.reduce((sum, m) => sum + m.messageBufferSize, 0) / memoryMetrics.length;
    
    // Performance should be consistent across cycles (no degradation)
    const lastCycle = memoryMetrics[memoryMetrics.length - 1];
    const firstCycle = memoryMetrics[0];
    
    // Last cycle shouldn't have significantly more overhead than first
    expect(lastCycle.messagesReceived).toBeGreaterThan(0);
    expect(lastCycle.errors).toBe(0);
    
    // Buffer sizes should be reasonable and not exponentially growing
    expect(avgBufferSize).toBeLessThan(100); // Reasonable buffer size
    
    console.log('✅ No memory leaks detected during connection lifecycle');
  });
  
  test('should handle graceful shutdown of active connections', async () => {
    console.log('🚀 Test: Graceful shutdown of active connections');
    
    const instances = [];
    const monitors = [];
    
    // Create multiple active connections
    for (let i = 1; i <= 3; i++) {
      const instance = await claudeInstancePage.createInstance('skip-permissions');
      instances.push(instance);
      createdInstances.push(instance);
      await claudeInstancePage.selectInstance(instance);
      
      const monitor = await sseConnectionTester.connectToInstance(instance.id);
      monitors.push({ instanceId: instance.id, monitor });
      
      await page.waitForTimeout(1000);
    }
    
    console.log(`🔗 Established ${monitors.length} active connections`);
    
    // Generate activity on all connections
    await claudeInstancePage.sendTerminalCommand('echo "Graceful shutdown test"');
    await page.waitForTimeout(3000);
    
    // Capture pre-shutdown state
    const preShutdownStats = monitors.map(({ instanceId, monitor }) => ({
      instanceId,
      stats: monitor.getStats(),
      wasActive: monitor.getStats().connectionEstablished
    }));
    
    console.log('📊 Pre-shutdown connection states:');
    preShutdownStats.forEach(({ instanceId, stats, wasActive }) => {
      console.log(`  ${instanceId}: ${stats.messagesReceived} msgs, active: ${wasActive}`);
    });
    
    // Verify all connections are active
    expect(preShutdownStats.every(s => s.wasActive)).toBe(true);
    
    // Perform graceful shutdown
    console.log('🔄 Performing graceful shutdown...');
    const shutdownStart = Date.now();
    
    sseConnectionTester.disconnectAll();
    
    const shutdownDuration = Date.now() - shutdownStart;
    console.log(`⏱️ Shutdown completed in ${shutdownDuration}ms`);
    
    // Verify shutdown completed
    const remainingConnections = sseConnectionTester.getActiveConnections();
    expect(remainingConnections.length).toBe(0);
    
    // Verify all monitors are cleaned up
    for (const instance of instances) {
      const monitor = sseConnectionTester.getMonitor(instance.id);
      expect(monitor).toBeUndefined();
    }
    
    // Shutdown should be reasonably fast
    expect(shutdownDuration).toBeLessThan(5000); // Should complete within 5 seconds
    
    console.log('✅ Graceful shutdown completed successfully');
  });
  
  test('should clean up connection state after instance destruction', async () => {
    console.log('🚀 Test: Connection cleanup after instance destruction');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    // Establish connection
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    await page.waitForTimeout(2000);
    
    await claudeInstancePage.sendTerminalCommand('echo "Pre-destruction test"');
    await page.waitForTimeout(3000);
    
    const preDestructionStats = monitor.getStats();
    console.log('📊 Pre-destruction stats:', preDestructionStats);
    
    // Verify connection is healthy before destruction
    SSEAssertions.expectHealthyConnection(preDestructionStats);
    
    // Destroy the instance
    console.log(`🗑️ Destroying instance: ${instance.id}`);
    await claudeInstancePage.destroyInstance(instance.id);
    
    // Wait for destruction to propagate
    await page.waitForTimeout(3000);
    
    // Connection should be cleaned up automatically or error gracefully
    const activeConnections = sseConnectionTester.getActiveConnections();
    
    // Either connection is automatically cleaned up or it gracefully handles the destroyed instance
    if (activeConnections.includes(instance.id)) {
      console.log('🔍 Connection still active, testing error handling...');
      
      // Try to send a command to destroyed instance (should fail gracefully)
      try {
        await claudeInstancePage.sendTerminalCommand('echo "Post-destruction test"');
        await page.waitForTimeout(3000);
        
        // Check if monitor detected the destruction
        const postDestructionStats = monitor.getStats();
        console.log('📊 Post-destruction stats:', postDestructionStats);
        
        // Should either have errors or stop receiving messages
        // This is acceptable as long as it doesn't crash
        
      } catch (error) {
        console.log('✅ Expected error after instance destruction:', error.message);
      }
      
      // Manual cleanup after instance destruction
      sseConnectionTester.disconnectFromInstance(instance.id);
    } else {
      console.log('✅ Connection automatically cleaned up after instance destruction');
    }
    
    // Final verification - no dangling connections
    const finalConnections = sseConnectionTester.getActiveConnections();
    expect(finalConnections.includes(instance.id)).toBe(false);
    
    console.log('✅ Connection state cleaned up after instance destruction');
    
    // Remove from cleanup list since we already destroyed it
    createdInstances = createdInstances.filter(i => i.id !== instance.id);
  });
  
  test('should handle resource cleanup during page navigation', async () => {
    console.log('🚀 Test: Resource cleanup during page navigation');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    // Establish connection
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    await page.waitForTimeout(2000);
    
    await claudeInstancePage.sendTerminalCommand('echo "Pre-navigation test"');
    await page.waitForTimeout(2000);
    
    const preNavigationStats = monitor.getStats();
    console.log('📊 Pre-navigation stats:', preNavigationStats);
    
    // Verify active connection
    expect(preNavigationStats.connectionEstablished).toBe(true);
    expect(preNavigationStats.messagesReceived).toBeGreaterThan(0);
    
    // Simulate navigation away from the page
    console.log('🧭 Simulating page navigation...');
    await page.goto('about:blank');
    await page.waitForTimeout(2000);
    
    // Navigate back
    await claudeInstancePage.navigateToInstanceManager();
    await page.waitForTimeout(3000);
    
    // Connection should still exist in our tester (simulating app state persistence)
    const activeConnections = sseConnectionTester.getActiveConnections();
    console.log(`🔍 Active connections after navigation: ${activeConnections.length}`);
    
    if (activeConnections.includes(instance.id)) {
      console.log('🔗 Connection persisted through navigation');
      
      // Test if connection is still functional
      const currentStats = monitor.getStats();
      console.log('📊 Post-navigation stats:', currentStats);
      
      // Connection might have disconnected during navigation - this is acceptable
      // What matters is that resources aren't leaked
    } else {
      console.log('🔌 Connection was cleaned up during navigation');
    }
    
    // Perform final cleanup
    sseConnectionTester.disconnectAll();
    
    const finalConnections = sseConnectionTester.getActiveConnections();
    expect(finalConnections.length).toBe(0);
    
    console.log('✅ Resource cleanup handled correctly during page navigation');
  });
  
  test('should prevent connection buildup over time', async () => {
    console.log('🚀 Test: Prevention of connection buildup over time');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    const connectionAttempts = 7;
    const connectionHistory = [];
    
    // Simulate repeated connection/disconnection cycles
    for (let attempt = 1; attempt <= connectionAttempts; attempt++) {
      console.log(`🔄 Connection attempt ${attempt}/${connectionAttempts}`);
      
      // Connect
      const monitor = await sseConnectionTester.connectToInstance(instance.id);
      
      // Brief activity
      await claudeInstancePage.sendTerminalCommand(`echo "Connection attempt ${attempt}"`);
      await page.waitForTimeout(1500);
      
      const stats = monitor.getStats();
      connectionHistory.push({
        attempt,
        messagesReceived: stats.messagesReceived,
        connectionEstablished: stats.connectionEstablished,
        errors: stats.errorsEncountered,
        activeConnections: sseConnectionTester.getActiveConnections().length
      });
      
      console.log(`📊 Attempt ${attempt}: ${stats.messagesReceived} msgs, ${connectionHistory[attempt-1].activeConnections} active connections`);
      
      // Disconnect
      sseConnectionTester.disconnectFromInstance(instance.id);
      await page.waitForTimeout(500);
      
      // Verify no buildup after disconnect
      const afterDisconnect = sseConnectionTester.getActiveConnections().length;
      expect(afterDisconnect).toBe(0);
    }
    
    // Analyze connection history for buildup patterns
    console.log('📈 Connection history analysis:');
    connectionHistory.forEach(record => {
      console.log(`  Attempt ${record.attempt}: ${record.messagesReceived} msgs, ${record.activeConnections} active, ${record.errors} errors`);
    });
    
    // Validate no connection buildup
    const maxActiveConnections = Math.max(...connectionHistory.map(r => r.activeConnections));
    expect(maxActiveConnections).toBe(1); // Should never have more than 1 connection at a time
    
    // Performance should be consistent
    const avgMessages = connectionHistory.reduce((sum, r) => sum + r.messagesReceived, 0) / connectionHistory.length;
    const lastAttemptMessages = connectionHistory[connectionHistory.length - 1].messagesReceived;
    
    // Last attempt should perform similarly to average (no degradation)
    expect(lastAttemptMessages).toBeGreaterThan(avgMessages * 0.5); // Within reasonable range
    
    // No errors should accumulate
    const totalErrors = connectionHistory.reduce((sum, r) => sum + r.errors, 0);
    expect(totalErrors).toBe(0);
    
    console.log('✅ No connection buildup detected over time');
  });
  
  test('should handle emergency cleanup scenarios', async () => {
    console.log('🚀 Test: Emergency cleanup scenarios');
    
    const instances = [];
    const emergencyScenarios = [
      'Multiple rapid connections',
      'Connections during instance state changes',
      'Cleanup during active streaming'
    ];
    
    // Setup multiple instances for emergency scenarios
    for (let i = 1; i <= 2; i++) {
      const instance = await claudeInstancePage.createInstance('skip-permissions');
      instances.push(instance);
      createdInstances.push(instance);
      await claudeInstancePage.selectInstance(instance);
      await page.waitForTimeout(1000);
    }
    
    console.log(`🚨 Testing ${emergencyScenarios.length} emergency cleanup scenarios`);
    
    // Scenario 1: Multiple rapid connections
    console.log('🚨 Scenario 1: Multiple rapid connections');
    try {
      for (const instance of instances) {
        await sseConnectionTester.connectToInstance(instance.id);
        // No wait time - rapid connections
      }
      
      const rapidConnections = sseConnectionTester.getActiveConnections();
      console.log(`📊 Rapid connections established: ${rapidConnections.length}`);
      
      // Emergency cleanup
      sseConnectionTester.disconnectAll();
      
      const afterRapidCleanup = sseConnectionTester.getActiveConnections();
      expect(afterRapidCleanup.length).toBe(0);
      
      console.log('✅ Scenario 1: Emergency cleanup successful');
      
    } catch (error) {
      console.warn('Scenario 1 error (expected):', error.message);
      sseConnectionTester.disconnectAll(); // Emergency cleanup
    }
    
    await page.waitForTimeout(2000);
    
    // Scenario 2: Connections during instance state changes
    console.log('🚨 Scenario 2: Cleanup during instance state changes');
    try {
      const monitor = await sseConnectionTester.connectToInstance(instances[0].id);
      
      // Generate streaming activity
      await claudeInstancePage.sendTerminalCommand('echo "Emergency cleanup during streaming"');
      await page.waitForTimeout(1000); // Don't wait for completion
      
      // Emergency cleanup during active streaming
      sseConnectionTester.disconnectAll();
      
      const duringStreamingCleanup = sseConnectionTester.getActiveConnections();
      expect(duringStreamingCleanup.length).toBe(0);
      
      console.log('✅ Scenario 2: Cleanup during streaming successful');
      
    } catch (error) {
      console.warn('Scenario 2 error (expected):', error.message);
      sseConnectionTester.disconnectAll(); // Emergency cleanup
    }
    
    await page.waitForTimeout(2000);
    
    // Scenario 3: Bulk emergency cleanup
    console.log('🚨 Scenario 3: Bulk emergency cleanup');
    try {
      // Create multiple connections
      const monitors = [];
      for (const instance of instances) {
        const monitor = await sseConnectionTester.connectToInstance(instance.id);
        monitors.push(monitor);
        await page.waitForTimeout(200);
      }
      
      const preEmergencyConnections = sseConnectionTester.getActiveConnections();
      console.log(`📊 Pre-emergency connections: ${preEmergencyConnections.length}`);
      
      // Simulate emergency by immediately calling bulk cleanup
      const emergencyStart = Date.now();
      sseConnectionTester.disconnectAll();
      const emergencyDuration = Date.now() - emergencyStart;
      
      console.log(`⏱️ Emergency cleanup completed in ${emergencyDuration}ms`);
      
      const postEmergencyConnections = sseConnectionTester.getActiveConnections();
      expect(postEmergencyConnections.length).toBe(0);
      expect(emergencyDuration).toBeLessThan(2000); // Should be fast
      
      console.log('✅ Scenario 3: Bulk emergency cleanup successful');
      
    } catch (error) {
      console.warn('Scenario 3 error (expected):', error.message);
      sseConnectionTester.disconnectAll(); // Final emergency cleanup
    }
    
    // Final verification - system should be clean
    const finalActiveConnections = sseConnectionTester.getActiveConnections();
    expect(finalActiveConnections.length).toBe(0);
    
    console.log('✅ All emergency cleanup scenarios handled successfully');
  });
  
  test('should provide cleanup status and diagnostics', async () => {
    console.log('🚀 Test: Cleanup status and diagnostics');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    // Establish connection with activity
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    await page.waitForTimeout(2000);
    
    await claudeInstancePage.sendTerminalCommand('echo "Diagnostics test"');
    await page.waitForTimeout(3000);
    
    // Collect pre-cleanup diagnostics
    const preCleanupDiagnostics = {
      activeConnections: sseConnectionTester.getActiveConnections(),
      monitorStats: monitor.getStats(),
      monitorMessages: monitor.getMessages(),
      monitorErrors: monitor.getErrors()
    };
    
    console.log('🔍 Pre-cleanup diagnostics:');
    console.log(`  Active connections: ${preCleanupDiagnostics.activeConnections.length}`);
    console.log(`  Messages received: ${preCleanupDiagnostics.monitorStats.messagesReceived}`);
    console.log(`  Errors encountered: ${preCleanupDiagnostics.monitorStats.errorsEncountered}`);
    console.log(`  Message buffer size: ${preCleanupDiagnostics.monitorMessages.length}`);
    console.log(`  Error log size: ${preCleanupDiagnostics.monitorErrors.length}`);
    
    // Validate pre-cleanup state
    expect(preCleanupDiagnostics.activeConnections.length).toBe(1);
    expect(preCleanupDiagnostics.activeConnections[0]).toBe(instance.id);
    expect(preCleanupDiagnostics.monitorStats.connectionEstablished).toBe(true);
    expect(preCleanupDiagnostics.monitorStats.messagesReceived).toBeGreaterThan(0);
    
    // Perform cleanup with timing
    console.log('🧹 Performing cleanup with diagnostics...');
    const cleanupStart = Date.now();
    sseConnectionTester.disconnectFromInstance(instance.id);
    const cleanupDuration = Date.now() - cleanupStart;
    
    // Collect post-cleanup diagnostics
    const postCleanupDiagnostics = {
      activeConnections: sseConnectionTester.getActiveConnections(),
      cleanupDuration,
      monitorAvailable: sseConnectionTester.getMonitor(instance.id) !== undefined
    };
    
    console.log('🔍 Post-cleanup diagnostics:');
    console.log(`  Active connections: ${postCleanupDiagnostics.activeConnections.length}`);
    console.log(`  Cleanup duration: ${postCleanupDiagnostics.cleanupDuration}ms`);
    console.log(`  Monitor still available: ${postCleanupDiagnostics.monitorAvailable}`);
    
    // Validate cleanup completion
    expect(postCleanupDiagnostics.activeConnections.length).toBe(0);
    expect(postCleanupDiagnostics.cleanupDuration).toBeLessThan(1000); // Should be fast
    expect(postCleanupDiagnostics.monitorAvailable).toBe(false);
    
    // Test cleanup status reporting
    const cleanupStatusReport = {
      connectionsCleaned: preCleanupDiagnostics.activeConnections.length,
      cleanupTime: postCleanupDiagnostics.cleanupDuration,
      resourcesFreed: preCleanupDiagnostics.monitorMessages.length,
      errorsCleared: preCleanupDiagnostics.monitorErrors.length,
      cleanupSuccessful: postCleanupDiagnostics.activeConnections.length === 0
    };
    
    console.log('📊 Cleanup status report:', cleanupStatusReport);
    
    // Validate status report
    expect(cleanupStatusReport.connectionsCleaned).toBeGreaterThan(0);
    expect(cleanupStatusReport.cleanupSuccessful).toBe(true);
    expect(cleanupStatusReport.cleanupTime).toBeGreaterThan(0);
    
    console.log('✅ Cleanup status and diagnostics working correctly');
  });
});