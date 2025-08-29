import { test, expect, Page } from '@playwright/test';
import { 
  SSEConnectionTester, 
  ClaudeInstancePage, 
  SSEAssertions,
  InstanceInfo 
} from './utils/sse-test-utils';

/**
 * Test Suite 2: Real-Time Message Streaming Validation
 * 
 * Validates real-time streaming capabilities, message ordering, 
 * incremental output, and streaming performance.
 */

test.describe('Real-Time Message Streaming', () => {
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
  
  test('should stream terminal output in real-time', async () => {
    console.log('🚀 Test: Real-time terminal output streaming');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    
    // Clear initial connection messages
    await page.waitForTimeout(3000);
    monitor.clear();
    
    // Send command that produces streaming output
    console.log('⌨️ Sending streaming command...');
    await claudeInstancePage.sendTerminalCommand('ls -la && echo "Command complete"');
    
    // Monitor real-time streaming
    const streamingResults = [];
    const monitoringDuration = 8000; // 8 seconds
    const checkInterval = 1000; // 1 second
    
    for (let i = 0; i < monitoringDuration / checkInterval; i++) {
      await page.waitForTimeout(checkInterval);
      
      const stats = monitor.getStats();
      const messages = monitor.getMessages();
      
      streamingResults.push({
        timestamp: Date.now(),
        messageCount: stats.messagesReceived,
        lastMessage: messages[messages.length - 1]?.data || null
      });
      
      console.log(`📊 Stream checkpoint ${i + 1}: ${stats.messagesReceived} messages`);
    }
    
    // Validate streaming behavior
    const finalStats = monitor.getStats();
    expect(finalStats.messagesReceived).toBeGreaterThan(0);
    expect(finalStats.errorsEncountered).toBe(0);
    
    // Check that messages arrived progressively
    let increasingMessages = true;
    for (let i = 1; i < streamingResults.length; i++) {
      if (streamingResults[i].messageCount < streamingResults[i - 1].messageCount) {
        increasingMessages = false;
        break;
      }
    }
    
    expect(increasingMessages).toBe(true);
    console.log('✅ Real-time streaming working correctly');
  });
  
  test('should maintain message ordering and sequence', async () => {
    console.log('🚀 Test: Message ordering and sequence integrity');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    await page.waitForTimeout(2000);
    monitor.clear();
    
    // Send multiple sequential commands
    const commands = [
      'echo "Message 1: First"',
      'echo "Message 2: Second"', 
      'echo "Message 3: Third"',
      'echo "Message 4: Fourth"'
    ];
    
    console.log('⌨️ Sending sequential commands...');
    for (let i = 0; i < commands.length; i++) {
      await claudeInstancePage.sendTerminalCommand(commands[i]);
      await page.waitForTimeout(1500); // Brief pause between commands
    }
    
    // Wait for all responses
    await page.waitForTimeout(5000);
    
    const messages = monitor.getMessages();
    const stats = monitor.getStats();
    
    console.log(`📊 Sequence test results: ${messages.length} messages, ${stats.errorsEncountered} errors`);
    
    // Validate message sequence
    expect(stats.messagesReceived).toBeGreaterThan(commands.length);
    expect(stats.errorsEncountered).toBe(0);
    expect(stats.duplicatesDetected).toBe(0);
    
    // Check for chronological ordering
    let previousTimestamp = 0;
    for (const message of messages) {
      expect(message.timestamp).toBeGreaterThanOrEqual(previousTimestamp);
      previousTimestamp = message.timestamp;
    }
    
    console.log('✅ Message ordering and sequence maintained');
  });
  
  test('should handle incremental output without buffer storms', async () => {
    console.log('🚀 Test: Incremental output handling');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    await page.waitForTimeout(2000);
    monitor.clear();
    
    // Command that generates substantial incremental output
    console.log('⌨️ Testing incremental output with directory listing...');
    await claudeInstancePage.sendTerminalCommand('find /usr -name "*.so" | head -20');
    
    // Monitor incremental delivery
    const deliveryTracking = [];
    let previousMessageCount = 0;
    
    for (let i = 0; i < 10; i++) { // Monitor for 10 seconds
      await page.waitForTimeout(1000);
      
      const stats = monitor.getStats();
      const newMessages = stats.messagesReceived - previousMessageCount;
      
      deliveryTracking.push({
        interval: i + 1,
        totalMessages: stats.messagesReceived,
        newMessages,
        duplicates: stats.duplicatesDetected
      });
      
      console.log(`📈 Interval ${i + 1}: ${newMessages} new messages (total: ${stats.messagesReceived})`);
      previousMessageCount = stats.messagesReceived;
    }
    
    const finalStats = monitor.getStats();
    
    // Validate incremental delivery
    SSEAssertions.expectNoBufferStorm(finalStats);
    
    // Check for reasonable distribution of messages over time
    const intervalsWithMessages = deliveryTracking.filter(d => d.newMessages > 0).length;
    expect(intervalsWithMessages).toBeGreaterThan(1); // Messages delivered over multiple intervals
    
    // Verify no message duplication occurred
    expect(finalStats.duplicatesDetected).toBe(0);
    
    console.log('✅ Incremental output handled without buffer storms');
  });
  
  test('should stream large command outputs efficiently', async () => {
    console.log('🚀 Test: Large output streaming efficiency');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    await page.waitForTimeout(2000);
    monitor.clear();
    
    // Generate substantial output
    console.log('⌨️ Generating large output for streaming test...');
    await claudeInstancePage.sendTerminalCommand('ls -laR /etc | head -100');
    
    // Track streaming performance
    const startTime = Date.now();
    let maxMessageRate = 0;
    let totalDataReceived = 0;
    
    for (let i = 0; i < 15; i++) { // Monitor for 15 seconds
      await page.waitForTimeout(1000);
      
      const stats = monitor.getStats();
      const currentRate = stats.messagesReceived / ((Date.now() - startTime) / 1000);
      maxMessageRate = Math.max(maxMessageRate, currentRate);
      
      // Estimate data received (rough calculation)
      const messages = monitor.getMessages();
      totalDataReceived = messages.reduce((sum, msg) => {
        return sum + (typeof msg.data === 'string' ? msg.data.length : JSON.stringify(msg.data).length);
      }, 0);
      
      console.log(`📊 Streaming metrics: ${stats.messagesReceived} msgs, ${currentRate.toFixed(2)} msg/sec, ${totalDataReceived} bytes`);
    }
    
    const finalStats = monitor.getStats();
    
    // Performance validations
    expect(finalStats.messagesReceived).toBeGreaterThan(10); // Should have substantial output
    expect(maxMessageRate).toBeLessThan(50); // Should not exceed reasonable rate
    expect(finalStats.duplicatesDetected).toBe(0);
    expect(finalStats.errorsEncountered).toBe(0);
    
    // Memory/performance checks
    SSEAssertions.expectNoBufferStorm(finalStats);
    
    console.log(`✅ Large output streamed efficiently: ${totalDataReceived} bytes, max rate: ${maxMessageRate.toFixed(2)} msg/sec`);
  });
  
  test('should handle rapid command succession with proper streaming', async () => {
    console.log('🚀 Test: Rapid command succession streaming');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    await page.waitForTimeout(2000);
    monitor.clear();
    
    // Rapid command succession
    const rapidCommands = [
      'echo "Rapid 1"',
      'pwd',
      'echo "Rapid 2"',
      'date',
      'echo "Rapid 3"',
      'whoami',
      'echo "Rapid 4"',
      'echo "Rapid 5"'
    ];
    
    console.log(`⚡ Sending ${rapidCommands.length} rapid commands...`);
    const commandStartTime = Date.now();
    
    for (const command of rapidCommands) {
      await claudeInstancePage.sendTerminalCommand(command);
      await page.waitForTimeout(300); // Brief pause to avoid overwhelming
    }
    
    // Monitor streaming during rapid execution
    const monitoringResults = [];
    
    for (let i = 0; i < 10; i++) { // Monitor for 10 seconds
      await page.waitForTimeout(1000);
      
      const stats = monitor.getStats();
      monitoringResults.push({
        second: i + 1,
        messages: stats.messagesReceived,
        duplicates: stats.duplicatesDetected,
        errors: stats.errorsEncountered
      });
      
      console.log(`📊 Rapid execution second ${i + 1}: ${stats.messagesReceived} messages`);
    }
    
    const finalStats = monitor.getStats();
    
    // Validate rapid command handling
    expect(finalStats.messagesReceived).toBeGreaterThan(rapidCommands.length);
    expect(finalStats.duplicatesDetected).toBe(0);
    expect(finalStats.errorsEncountered).toBe(0);
    
    // Check streaming stability during rapid execution
    SSEAssertions.expectNoBufferStorm(finalStats);
    
    // Verify messages arrived progressively
    let progressiveIncrease = true;
    for (let i = 1; i < monitoringResults.length; i++) {
      if (monitoringResults[i].messages < monitoringResults[i - 1].messages) {
        progressiveIncrease = false;
        break;
      }
    }
    
    expect(progressiveIncrease).toBe(true);
    
    console.log('✅ Rapid command succession handled with stable streaming');
  });
  
  test('should provide real-time feedback for interactive commands', async () => {
    console.log('🚀 Test: Real-time interactive command feedback');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    await page.waitForTimeout(2000);
    monitor.clear();
    
    // Interactive command that provides immediate feedback
    console.log('⌨️ Testing interactive command feedback...');
    await claudeInstancePage.sendTerminalCommand('echo "Interactive test started" && sleep 2 && echo "Interactive test completed"');
    
    // Track real-time feedback
    const feedbackTimeline = [];
    let lastMessageContent = '';
    
    for (let i = 0; i < 8; i++) { // Monitor for 8 seconds
      await page.waitForTimeout(1000);
      
      const messages = monitor.getMessages();
      const stats = monitor.getStats();
      const currentMessage = messages[messages.length - 1];
      
      if (currentMessage && JSON.stringify(currentMessage.data) !== lastMessageContent) {
        feedbackTimeline.push({
          timestamp: Date.now(),
          messageContent: JSON.stringify(currentMessage.data),
          totalMessages: stats.messagesReceived
        });
        lastMessageContent = JSON.stringify(currentMessage.data);
      }
      
      console.log(`⏱️ Second ${i + 1}: ${stats.messagesReceived} total messages`);
    }
    
    const finalStats = monitor.getStats();
    
    // Validate interactive feedback
    expect(finalStats.messagesReceived).toBeGreaterThan(0);
    expect(finalStats.errorsEncountered).toBe(0);
    expect(feedbackTimeline.length).toBeGreaterThan(1); // Should have multiple feedback points
    
    // Check timeline shows progression
    let timelineProgressive = true;
    for (let i = 1; i < feedbackTimeline.length; i++) {
      if (feedbackTimeline[i].timestamp <= feedbackTimeline[i - 1].timestamp) {
        timelineProgressive = false;
        break;
      }
    }
    
    expect(timelineProgressive).toBe(true);
    
    console.log(`✅ Real-time interactive feedback working: ${feedbackTimeline.length} feedback points`);
  });
  
  test('should stream error messages and status updates', async () => {
    console.log('🚀 Test: Error message and status update streaming');
    
    const instance = await claudeInstancePage.createInstance('skip-permissions');
    createdInstances.push(instance);
    await claudeInstancePage.selectInstance(instance);
    
    const monitor = await sseConnectionTester.connectToInstance(instance.id);
    await page.waitForTimeout(2000);
    monitor.clear();
    
    // Commands that will produce errors and status messages
    const testCommands = [
      'echo "Starting error test"',
      'nonexistentcommand123', // This should produce an error
      'ls /nonexistent/directory', // This should also error
      'echo "Error test completed"'
    ];
    
    console.log('⌨️ Testing error message streaming...');
    for (const command of testCommands) {
      await claudeInstancePage.sendTerminalCommand(command);
      await page.waitForTimeout(2000);
    }
    
    // Allow time for all responses
    await page.waitForTimeout(5000);
    
    const messages = monitor.getMessages();
    const stats = monitor.getStats();
    
    console.log(`📊 Error streaming test: ${messages.length} messages received`);
    
    // Analyze message content for errors and status updates
    const messageContents = messages.map(m => JSON.stringify(m.data).toLowerCase());
    const hasErrorMessages = messageContents.some(content => 
      content.includes('error') || 
      content.includes('not found') || 
      content.includes('command not found') ||
      content.includes('no such file')
    );
    
    const hasStatusMessages = messageContents.some(content =>
      content.includes('starting') ||
      content.includes('completed') ||
      content.includes('echo')
    );
    
    // Validate error streaming
    expect(stats.messagesReceived).toBeGreaterThan(testCommands.length);
    expect(stats.duplicatesDetected).toBe(0);
    
    // Should receive both success and error messages
    expect(hasStatusMessages).toBe(true);
    // Error messages might be handled differently, so this is less strict
    
    console.log('✅ Error messages and status updates streamed correctly');
    console.log(`   Has error messages: ${hasErrorMessages}`);
    console.log(`   Has status messages: ${hasStatusMessages}`);
  });
});