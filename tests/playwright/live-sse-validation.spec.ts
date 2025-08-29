import { test, expect, Page } from '@playwright/test';
import { EventSource } from 'eventsource';

/**
 * Comprehensive SSE Buffer Accumulation Storm Validation
 * Tests the live Claude instance SSE streaming behavior to validate
 * incremental output fixes and prevent message duplication.
 */

interface SSEMessage {
  timestamp: number;
  instanceId: string;
  data: string;
  type: string;
  length: number;
}

interface BufferMonitorStats {
  messageCount: number;
  totalDataReceived: number;
  duplicateDetected: boolean;
  messageRate: number;
  bufferGrowthRate: number;
  lastMessageContent: string;
}

class SSEBufferMonitor {
  private messages: SSEMessage[] = [];
  private duplicateMessages = new Set<string>();
  private lastPosition = 0;
  
  addMessage(instanceId: string, data: string, type: string): void {
    const message: SSEMessage = {
      timestamp: Date.now(),
      instanceId,
      data,
      type,
      length: data.length
    };
    
    // Check for exact duplicates
    const messageKey = `${instanceId}-${data}-${type}`;
    if (this.duplicateMessages.has(messageKey)) {
      console.warn('🚨 DUPLICATE MESSAGE DETECTED:', messageKey);
    }
    this.duplicateMessages.add(messageKey);
    
    this.messages.push(message);
    
    // Log incremental position tracking
    console.log(`📡 SSE Message received (position: ${this.lastPosition}):\n  Instance: ${instanceId}\n  Type: ${type}\n  Length: ${data.length}\n  Data: ${data.slice(0, 50)}${data.length > 50 ? '...' : ''}`);
    
    this.lastPosition += data.length;
  }
  
  getStats(): BufferMonitorStats {
    const now = Date.now();
    const recentMessages = this.messages.filter(m => now - m.timestamp < 5000);
    const totalData = this.messages.reduce((sum, msg) => sum + msg.length, 0);
    
    return {
      messageCount: this.messages.length,
      totalDataReceived: totalData,
      duplicateDetected: this.duplicateMessages.size !== this.messages.length,
      messageRate: recentMessages.length / 5, // messages per second
      bufferGrowthRate: totalData / Math.max(1, (now - (this.messages[0]?.timestamp || now)) / 1000),
      lastMessageContent: this.messages[this.messages.length - 1]?.data || ''
    };
  }
  
  detectBufferStorm(): { isStorm: boolean; reason: string; stats: BufferMonitorStats } {
    const stats = this.getStats();
    
    // Detect various buffer storm patterns
    if (stats.messageRate > 10) {
      return { isStorm: true, reason: 'High message rate (>10/sec)', stats };
    }
    
    if (stats.duplicateDetected) {
      return { isStorm: true, reason: 'Duplicate messages detected', stats };
    }
    
    if (stats.bufferGrowthRate > 10000) { // >10KB/sec growth
      return { isStorm: true, reason: 'Excessive buffer growth rate', stats };
    }
    
    // Check for repetitive content patterns
    const recentContent = this.messages.slice(-5).map(m => m.data).join('');
    const patterns = recentContent.match(/(.)\1{10,}/g); // Repeated characters
    if (patterns && patterns.length > 0) {
      return { isStorm: true, reason: 'Repetitive content patterns detected', stats };
    }
    
    return { isStorm: false, reason: 'Normal operation', stats };
  }
  
  clear(): void {
    this.messages = [];
    this.duplicateMessages.clear();
    this.lastPosition = 0;
  }
}

class LiveSSETester {
  private monitor = new SSEBufferMonitor();
  private eventSource: EventSource | null = null;
  
  async connectToInstance(instanceId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sseUrl = `http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`;
      console.log(`🔗 Connecting to SSE stream: ${sseUrl}`);
      
      this.eventSource = new EventSource(sseUrl);
      
      this.eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        resolve();
      };
      
      this.eventSource.onmessage = (event) => {
        this.monitor.addMessage(instanceId, event.data, 'message');
      };
      
      this.eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        reject(error);
      };
      
      // Handle custom event types
      this.eventSource.addEventListener('output', (event: any) => {
        this.monitor.addMessage(instanceId, event.data, 'output');
      });
      
      this.eventSource.addEventListener('terminal:output', (event: any) => {
        this.monitor.addMessage(instanceId, event.data, 'terminal:output');
      });
    });
  }
  
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('🔌 SSE connection closed');
    }
  }
  
  getMonitor(): SSEBufferMonitor {
    return this.monitor;
  }
}

test.describe('Live SSE Buffer Accumulation Storm Validation', () => {
  let page: Page;
  let sseTester: LiveSSETester;
  
  test.beforeEach(async ({ page: p }) => {
    page = p;
    sseTester = new LiveSSETester();
    
    // Navigate to Claude Instance Manager
    await page.goto('http://localhost:5173/claude-instances');
    await page.waitForLoadState('networkidle');
    
    // Wait for initial load
    await expect(page.locator('[data-testid="claude-instance-manager"]')).toBeVisible();
  });
  
  test.afterEach(async () => {
    sseTester.disconnect();
  });
  
  test('should create Claude instance and establish clean SSE connection', async () => {
    console.log('🚀 Test: Creating Claude instance and validating SSE connection');
    
    // Create skip-permissions instance for faster startup
    await page.click('button:has-text("skip-permissions")');
    
    // Wait for instance to appear
    await expect(page.locator('.instance-item')).toBeVisible({ timeout: 15000 });
    
    // Get instance ID from the UI
    const instanceElement = await page.locator('.instance-item').first();
    const instanceText = await instanceElement.textContent();
    const instanceId = instanceText?.match(/ID: ([a-zA-Z0-9-]+)/)?.[1];
    
    expect(instanceId).toBeTruthy();
    console.log(`📋 Created instance: ${instanceId}`);
    
    // Click to select the instance
    await instanceElement.click();
    
    // Wait for status to be running
    await expect(page.locator('.status-running')).toBeVisible({ timeout: 30000 });
    
    // Connect to SSE stream directly
    await sseTester.connectToInstance(instanceId!);
    
    // Wait for initial connection messages
    await page.waitForTimeout(3000);
    
    const monitor = sseTester.getMonitor();
    const initialStats = monitor.getStats();
    
    console.log('📊 Initial SSE connection stats:', initialStats);
    
    // Validate clean initial connection
    expect(initialStats.messageCount).toBeGreaterThan(0);
    expect(initialStats.duplicateDetected).toBe(false);
    
    const stormCheck = monitor.detectBufferStorm();
    expect(stormCheck.isStorm).toBe(false);
    
    console.log('✅ Clean SSE connection established without buffer storms');
  });
  
  test('should handle terminal input without message duplication', async () => {
    console.log('🚀 Test: Terminal input without message duplication');
    
    // Create and connect to instance
    await page.click('button:has-text("skip-permissions")');
    await expect(page.locator('.instance-item')).toBeVisible({ timeout: 15000 });
    
    const instanceElement = await page.locator('.instance-item').first();
    const instanceText = await instanceElement.textContent();
    const instanceId = instanceText?.match(/ID: ([a-zA-Z0-9-]+)/)?.[1];
    
    await instanceElement.click();
    await expect(page.locator('.status-running')).toBeVisible({ timeout: 30000 });
    
    // Connect SSE monitor
    await sseTester.connectToInstance(instanceId!);
    await page.waitForTimeout(2000);
    
    // Clear monitor to start fresh
    sseTester.getMonitor().clear();
    
    // Send "hello" command
    console.log('⌨️ Sending hello command...');
    await page.fill('.input-field', 'hello');
    await page.press('.input-field', 'Enter');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    const stats = sseTester.getMonitor().getStats();
    console.log('📊 After hello command stats:', stats);
    
    // Validate no duplicates
    expect(stats.duplicateDetected).toBe(false);
    
    const stormCheck = sseTester.getMonitor().detectBufferStorm();
    console.log('🌪️ Buffer storm check:', stormCheck);
    expect(stormCheck.isStorm).toBe(false);
    
    // Verify output appears in UI
    const outputArea = page.locator('.output-area pre');
    await expect(outputArea).toBeVisible();
    
    console.log('✅ Terminal input processed without duplication');
  });
  
  test('should handle multiple rapid inputs without exponential growth', async () => {
    console.log('🚀 Test: Multiple rapid inputs stress test');
    
    // Setup instance
    await page.click('button:has-text("skip-permissions")');
    await expect(page.locator('.instance-item')).toBeVisible({ timeout: 15000 });
    
    const instanceElement = await page.locator('.instance-item').first();
    const instanceText = await instanceElement.textContent();
    const instanceId = instanceText?.match(/ID: ([a-zA-Z0-9-]+)/)?.[1];
    
    await instanceElement.click();
    await expect(page.locator('.status-running')).toBeVisible({ timeout: 30000 });
    
    await sseTester.connectToInstance(instanceId!);
    await page.waitForTimeout(2000);
    
    sseTester.getMonitor().clear();
    
    // Send multiple commands rapidly
    const commands = ['pwd', 'ls', 'echo test1', 'echo test2', 'date'];
    
    console.log(`⚡ Sending ${commands.length} rapid commands...`);
    for (let i = 0; i < commands.length; i++) {
      await page.fill('.input-field', commands[i]);
      await page.press('.input-field', 'Enter');
      await page.waitForTimeout(500); // Small delay between commands
      
      // Check for buffer storms after each command
      const intermediateCheck = sseTester.getMonitor().detectBufferStorm();
      if (intermediateCheck.isStorm) {
        console.error(`🚨 Buffer storm detected after command ${i + 1}: ${commands[i]}`);
        console.error('Storm details:', intermediateCheck);
      }
      expect(intermediateCheck.isStorm).toBe(false);
    }
    
    // Wait for all responses
    await page.waitForTimeout(10000);
    
    const finalStats = sseTester.getMonitor().getStats();
    console.log('📊 Final rapid input stats:', finalStats);
    
    // Validate reasonable message count (not exponential)
    expect(finalStats.messageCount).toBeLessThan(100); // Reasonable upper bound
    expect(finalStats.duplicateDetected).toBe(false);
    
    const finalStormCheck = sseTester.getMonitor().detectBufferStorm();
    expect(finalStormCheck.isStorm).toBe(false);
    
    console.log('✅ Multiple rapid inputs handled without exponential growth');
  });
  
  test('should maintain incremental output positioning', async () => {
    console.log('🚀 Test: Incremental output positioning validation');
    
    // Setup instance
    await page.click('button:has-text("skip-permissions")');
    await expect(page.locator('.instance-item')).toBeVisible({ timeout: 15000 });
    
    const instanceElement = await page.locator('.instance-item').first();
    const instanceText = await instanceElement.textContent();
    const instanceId = instanceText?.match(/ID: ([a-zA-Z0-9-]+)/)?.[1];
    
    await instanceElement.click();
    await expect(page.locator('.status-running')).toBeVisible({ timeout: 30000 });
    
    await sseTester.connectToInstance(instanceId!);
    await page.waitForTimeout(2000);
    
    const monitor = sseTester.getMonitor();
    monitor.clear();
    
    // Send command that generates substantial output
    console.log('⌨️ Sending command with substantial output...');
    await page.fill('.input-field', 'ls -la');
    await page.press('.input-field', 'Enter');
    
    // Monitor output in real-time
    let previousContent = '';
    let positionIncreasing = true;
    
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      
      const currentStats = monitor.getStats();
      const currentContent = currentStats.lastMessageContent;
      
      if (currentContent.length < previousContent.length) {
        positionIncreasing = false;
        console.error('🚨 Output position decreased - buffer replay detected!');
        console.error(`Previous length: ${previousContent.length}, Current: ${currentContent.length}`);
      }
      
      previousContent = currentContent;
      
      // Check for storm during monitoring
      const stormCheck = monitor.detectBufferStorm();
      if (stormCheck.isStorm) {
        console.error('🌪️ Buffer storm during positioning test:', stormCheck);
        break;
      }
    }
    
    expect(positionIncreasing).toBe(true);
    
    const finalStats = monitor.getStats();
    expect(finalStats.duplicateDetected).toBe(false);
    
    console.log('✅ Incremental output positioning maintained correctly');
  });
  
  test('should recover from connection interruption without buffer replay', async () => {
    console.log('🚀 Test: Connection interruption recovery');
    
    // Setup instance  
    await page.click('button:has-text("skip-permissions")');
    await expect(page.locator('.instance-item')).toBeVisible({ timeout: 15000 });
    
    const instanceElement = await page.locator('.instance-item').first();
    const instanceText = await instanceElement.textContent();
    const instanceId = instanceText?.match(/ID: ([a-zA-Z0-9-]+)/)?.[1];
    
    await instanceElement.click();
    await expect(page.locator('.status-running')).toBeVisible({ timeout: 30000 });
    
    // Initial connection
    await sseTester.connectToInstance(instanceId!);
    await page.waitForTimeout(2000);
    
    // Send initial command
    await page.fill('.input-field', 'echo "before disconnect"');
    await page.press('.input-field', 'Enter');
    await page.waitForTimeout(3000);
    
    const preDisconnectStats = sseTester.getMonitor().getStats();
    console.log('📊 Pre-disconnect stats:', preDisconnectStats);
    
    // Simulate connection interruption
    console.log('🔌 Simulating connection interruption...');
    sseTester.disconnect();
    
    // Wait for interruption
    await page.waitForTimeout(2000);
    
    // Reconnect
    console.log('🔗 Reconnecting...');
    sseTester.getMonitor().clear(); // Fresh monitor for reconnection
    await sseTester.connectToInstance(instanceId!);
    
    // Send post-reconnection command
    await page.fill('.input-field', 'echo "after reconnect"');
    await page.press('.input-field', 'Enter');
    await page.waitForTimeout(5000);
    
    const postReconnectStats = sseTester.getMonitor().getStats();
    console.log('📊 Post-reconnect stats:', postReconnectStats);
    
    // Validate no buffer replay occurred
    expect(postReconnectStats.duplicateDetected).toBe(false);
    
    const stormCheck = sseTester.getMonitor().detectBufferStorm();
    expect(stormCheck.isStorm).toBe(false);
    
    // Verify we only get new content, not replayed buffer
    const reconnectContent = postReconnectStats.lastMessageContent;
    expect(reconnectContent).not.toContain('before disconnect');
    
    console.log('✅ Connection recovery without buffer replay confirmed');
  });
  
  test('should monitor memory usage during extended session', async () => {
    console.log('🚀 Test: Extended session memory monitoring');
    
    // Setup instance
    await page.click('button:has-text("skip-permissions")');
    await expect(page.locator('.instance-item')).toBeVisible({ timeout: 15000 });
    
    const instanceElement = await page.locator('.instance-item').first();
    const instanceText = await instanceElement.textContent();
    const instanceId = instanceText?.match(/ID: ([a-zA-Z0-9-]+)/)?.[1];
    
    await instanceElement.click();
    await expect(page.locator('.status-running')).toBeVisible({ timeout: 30000 });
    
    await sseTester.connectToInstance(instanceId!);
    await page.waitForTimeout(2000);
    
    const monitor = sseTester.getMonitor();
    monitor.clear();
    
    // Simulate extended usage
    console.log('⏳ Running extended session test (30 commands over 60 seconds)...');
    const startTime = Date.now();
    const memorySnapshots: number[] = [];
    
    for (let i = 0; i < 30; i++) {
      // Send varied commands to generate different output patterns
      const commands = [
        `echo "Test command ${i}"`,
        'pwd',
        'date',
        'ls -la | head -5',
        'echo "Memory check point ${i}"'
      ];
      
      const command = commands[i % commands.length];
      await page.fill('.input-field', command);
      await page.press('.input-field', 'Enter');
      
      // Wait and check memory periodically
      await page.waitForTimeout(2000);
      
      const stats = monitor.getStats();
      memorySnapshots.push(stats.totalDataReceived);
      
      // Check for storm conditions
      const stormCheck = monitor.detectBufferStorm();
      if (stormCheck.isStorm) {
        console.error(`🌪️ Buffer storm detected at command ${i + 1}:`, stormCheck);
        break;
      }
      expect(stormCheck.isStorm).toBe(false);
      
      console.log(`📊 Command ${i + 1}/30 - Memory: ${stats.totalDataReceived} bytes, Messages: ${stats.messageCount}`);
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Analyze memory growth pattern
    const initialMemory = memorySnapshots[0] || 0;
    const finalMemory = memorySnapshots[memorySnapshots.length - 1] || 0;
    const memoryGrowth = finalMemory - initialMemory;
    const memoryGrowthRate = memoryGrowth / duration; // bytes per second
    
    console.log('📊 Extended session results:');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Memory growth: ${memoryGrowth} bytes`);
    console.log(`   Growth rate: ${memoryGrowthRate.toFixed(2)} bytes/sec`);
    console.log(`   Commands sent: 30`);
    console.log(`   Total messages: ${monitor.getStats().messageCount}`);
    
    // Memory growth should be reasonable (not exponential)
    expect(memoryGrowthRate).toBeLessThan(1000); // Less than 1KB/sec growth
    expect(monitor.getStats().duplicateDetected).toBe(false);
    
    // Final storm check
    const finalStormCheck = monitor.detectBufferStorm();
    expect(finalStormCheck.isStorm).toBe(false);
    
    console.log('✅ Extended session completed without memory issues');
  });
});
