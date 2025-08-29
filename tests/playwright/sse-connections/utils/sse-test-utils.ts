import { Page, expect } from '@playwright/test';

/**
 * Utility classes and functions for SSE connection testing
 */

export interface SSEMessage {
  id?: string;
  type: string;
  data: any;
  timestamp: number;
  eventType?: string;
}

export interface SSEConnectionStats {
  messagesReceived: number;
  connectionEstablished: boolean;
  lastMessageTime: number;
  averageLatency: number;
  connectionDuration: number;
  duplicatesDetected: number;
  errorsEncountered: number;
}

export interface InstanceInfo {
  id: string;
  status: string;
  element: any;
}

/**
 * SSE Connection Monitor for testing purposes
 */
export class SSETestMonitor {
  private messages: SSEMessage[] = [];
  private connectionStart: number = 0;
  private lastMessageTime: number = 0;
  private duplicateHashes = new Set<string>();
  private errors: string[] = [];
  
  constructor(private instanceId: string) {
    this.connectionStart = Date.now();
  }
  
  addMessage(type: string, data: any, eventType?: string): void {
    const timestamp = Date.now();
    const message: SSEMessage = {
      type,
      data,
      timestamp,
      eventType
    };
    
    // Check for duplicates based on content hash
    const messageHash = this.hashMessage(message);
    if (this.duplicateHashes.has(messageHash)) {
      console.warn(`🚨 Duplicate message detected: ${messageHash}`);
    }
    this.duplicateHashes.add(messageHash);
    
    this.messages.push(message);
    this.lastMessageTime = timestamp;
    
    console.log(`📡 SSE Message [${this.instanceId}]: ${type} - ${JSON.stringify(data).substring(0, 100)}`);
  }
  
  addError(error: string): void {
    this.errors.push(error);
    console.error(`❌ SSE Error [${this.instanceId}]: ${error}`);
  }
  
  getStats(): SSEConnectionStats {
    const now = Date.now();
    const latencies = this.messages
      .filter(m => m.timestamp > 0)
      .map(m => now - m.timestamp);
    
    return {
      messagesReceived: this.messages.length,
      connectionEstablished: this.messages.length > 0,
      lastMessageTime: this.lastMessageTime,
      averageLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      connectionDuration: now - this.connectionStart,
      duplicatesDetected: this.messages.length - this.duplicateHashes.size,
      errorsEncountered: this.errors.length
    };
  }
  
  getMessages(): SSEMessage[] {
    return [...this.messages];
  }
  
  getErrors(): string[] {
    return [...this.errors];
  }
  
  clear(): void {
    this.messages = [];
    this.duplicateHashes.clear();
    this.errors = [];
    this.connectionStart = Date.now();
    this.lastMessageTime = 0;
  }
  
  private hashMessage(message: SSEMessage): string {
    return `${message.type}-${JSON.stringify(message.data)}-${message.eventType || ''}`;
  }
}

/**
 * SSE Connection Test Helper
 */
export class SSEConnectionTester {
  private monitors = new Map<string, SSETestMonitor>();
  private eventSources = new Map<string, EventSource>();
  
  /**
   * Establish SSE connection for an instance
   */
  async connectToInstance(instanceId: string, baseUrl: string = 'http://localhost:3000'): Promise<SSETestMonitor> {
    if (this.monitors.has(instanceId)) {
      throw new Error(`Already monitoring instance: ${instanceId}`);
    }
    
    const monitor = new SSETestMonitor(instanceId);
    this.monitors.set(instanceId, monitor);
    
    // Test both potential URL formats to verify URL fix
    const urls = [
      `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`, // Fixed URL with /v1/
      `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`     // Original URL
    ];
    
    let connected = false;
    let lastError: string = '';
    
    for (const url of urls) {
      try {
        console.log(`🔗 Attempting SSE connection: ${url}`);
        
        const eventSource = new EventSource(url);
        this.eventSources.set(instanceId, eventSource);
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            eventSource.close();
            reject(new Error('Connection timeout'));
          }, 10000);
          
          eventSource.onopen = () => {
            console.log(`✅ SSE connection established: ${url}`);
            clearTimeout(timeout);
            connected = true;
            resolve();
          };
          
          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              monitor.addMessage('message', data);
            } catch (err) {
              monitor.addMessage('message', event.data);
            }
          };
          
          eventSource.onerror = (error) => {
            const errorMsg = `Connection error: ${url}`;
            monitor.addError(errorMsg);
            lastError = errorMsg;
            clearTimeout(timeout);
            
            if (eventSource.readyState === EventSource.CLOSED) {
              eventSource.close();
              reject(new Error(errorMsg));
            }
          };
          
          // Handle custom events
          ['output', 'terminal:output', 'status', 'error'].forEach(eventType => {
            eventSource.addEventListener(eventType, (event: any) => {
              try {
                const data = JSON.parse(event.data);
                monitor.addMessage('event', data, eventType);
              } catch (err) {
                monitor.addMessage('event', event.data, eventType);
              }
            });
          });
        });
        
        if (connected) break;
        
      } catch (error) {
        console.warn(`❌ Failed to connect to ${url}: ${error}`);
        lastError = error instanceof Error ? error.message : String(error);
        
        const eventSource = this.eventSources.get(instanceId);
        if (eventSource) {
          eventSource.close();
          this.eventSources.delete(instanceId);
        }
      }
    }
    
    if (!connected) {
      this.monitors.delete(instanceId);
      throw new Error(`Failed to establish SSE connection for ${instanceId}. Last error: ${lastError}`);
    }
    
    return monitor;
  }
  
  /**
   * Disconnect from an instance
   */
  disconnectFromInstance(instanceId: string): void {
    const eventSource = this.eventSources.get(instanceId);
    if (eventSource) {
      eventSource.close();
      this.eventSources.delete(instanceId);
      console.log(`🔌 Disconnected from SSE: ${instanceId}`);
    }
    
    this.monitors.delete(instanceId);
  }
  
  /**
   * Get monitor for an instance
   */
  getMonitor(instanceId: string): SSETestMonitor | undefined {
    return this.monitors.get(instanceId);
  }
  
  /**
   * Disconnect all instances
   */
  disconnectAll(): void {
    for (const instanceId of this.monitors.keys()) {
      this.disconnectFromInstance(instanceId);
    }
  }
  
  /**
   * Get all active connections
   */
  getActiveConnections(): string[] {
    return Array.from(this.monitors.keys());
  }
}

/**
 * Claude Instance Page Object for testing
 */
export class ClaudeInstancePage {
  constructor(private page: Page) {}
  
  async navigateToInstanceManager(): Promise<void> {
    await this.page.goto('/claude-instances');
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.locator('[data-testid="claude-instance-manager"]')).toBeVisible();
  }
  
  async createInstance(type: string = 'skip-permissions'): Promise<InstanceInfo> {
    const createButton = this.page.locator(`button:has-text("${type}")`);
    await expect(createButton).toBeVisible();
    await createButton.click();
    
    // Wait for instance to appear
    await expect(this.page.locator('.instance-item')).toBeVisible({ timeout: 30000 });
    
    const instanceElement = this.page.locator('.instance-item').first();
    const instanceText = await instanceElement.textContent();
    const instanceMatch = instanceText?.match(/ID: ([a-zA-Z0-9-]+)/);
    
    if (!instanceMatch) {
      throw new Error('Could not extract instance ID from UI');
    }
    
    const instanceId = instanceMatch[1];
    console.log(`📋 Created Claude instance: ${instanceId}`);
    
    return {
      id: instanceId,
      status: 'created',
      element: instanceElement
    };
  }
  
  async selectInstance(instance: InstanceInfo): Promise<void> {
    await instance.element.click();
    await expect(this.page.locator('.status-running')).toBeVisible({ timeout: 45000 });
    console.log(`✅ Instance ${instance.id} is running`);
  }
  
  async sendTerminalCommand(command: string): Promise<void> {
    const inputField = this.page.locator('.input-field');
    await expect(inputField).toBeVisible();
    
    await inputField.fill(command);
    await inputField.press('Enter');
    
    console.log(`⌨️ Sent terminal command: ${command}`);
  }
  
  async waitForTerminalOutput(): Promise<void> {
    await expect(this.page.locator('.output-area pre')).toBeVisible();
  }
  
  async getTerminalOutput(): Promise<string> {
    const outputArea = this.page.locator('.output-area pre');
    await expect(outputArea).toBeVisible();
    return await outputArea.textContent() || '';
  }
  
  async destroyInstance(instanceId: string): Promise<void> {
    const destroyButton = this.page.locator(`[data-instance-id="${instanceId}"] .destroy-button`);
    if (await destroyButton.isVisible()) {
      await destroyButton.click();
      await expect(this.page.locator(`[data-instance-id="${instanceId}"]`)).toBeHidden();
      console.log(`🗑️ Destroyed instance: ${instanceId}`);
    }
  }
  
  async getInstanceStatus(instanceId: string): Promise<string> {
    const statusElement = this.page.locator(`[data-instance-id="${instanceId}"] .status`);
    return await statusElement.textContent() || 'unknown';
  }
  
  async waitForInstanceStatus(instanceId: string, status: string, timeout: number = 30000): Promise<void> {
    await expect(this.page.locator(`[data-instance-id="${instanceId}"] .status-${status}`))
      .toBeVisible({ timeout });
  }
}

/**
 * SSE Connection assertions and utilities
 */
export class SSEAssertions {
  static expectHealthyConnection(stats: SSEConnectionStats): void {
    expect(stats.connectionEstablished).toBe(true);
    expect(stats.messagesReceived).toBeGreaterThan(0);
    expect(stats.duplicatesDetected).toBe(0);
    expect(stats.errorsEncountered).toBe(0);
  }
  
  static expectNoBufferStorm(stats: SSEConnectionStats): void {
    // Message rate should be reasonable (not > 20/sec sustained)
    const messageRate = stats.messagesReceived / (stats.connectionDuration / 1000);
    expect(messageRate).toBeLessThan(20);
    
    // No duplicates
    expect(stats.duplicatesDetected).toBe(0);
    
    // Latency should be reasonable (< 5 seconds)
    expect(stats.averageLatency).toBeLessThan(5000);
  }
  
  static expectSuccessfulRecovery(beforeStats: SSEConnectionStats, afterStats: SSEConnectionStats): void {
    expect(afterStats.connectionEstablished).toBe(true);
    expect(afterStats.messagesReceived).toBeGreaterThan(beforeStats.messagesReceived);
    expect(afterStats.duplicatesDetected).toBe(0);
  }
  
  static expectConcurrentConnections(monitors: SSETestMonitor[]): void {
    for (const monitor of monitors) {
      const stats = monitor.getStats();
      expect(stats.connectionEstablished).toBe(true);
      expect(stats.messagesReceived).toBeGreaterThan(0);
      expect(stats.errorsEncountered).toBe(0);
    }
  }
}

/**
 * Performance utilities for SSE testing
 */
export class SSEPerformanceUtils {
  static async measureConnectionTime(instanceId: string, baseUrl: string): Promise<number> {
    const startTime = Date.now();
    
    const eventSource = new EventSource(`${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        eventSource.close();
        reject(new Error('Connection timeout'));
      }, 15000);
      
      eventSource.onopen = () => {
        const connectionTime = Date.now() - startTime;
        clearTimeout(timeout);
        eventSource.close();
        resolve(connectionTime);
      };
      
      eventSource.onerror = () => {
        clearTimeout(timeout);
        eventSource.close();
        reject(new Error('Connection failed'));
      };
    });
  }
  
  static async stressTestConnections(instanceIds: string[], baseUrl: string, duration: number): Promise<SSEConnectionStats[]> {
    const results: SSEConnectionStats[] = [];
    const tester = new SSEConnectionTester();
    
    try {
      // Connect to all instances simultaneously
      const monitors = await Promise.all(
        instanceIds.map(id => tester.connectToInstance(id, baseUrl))
      );
      
      // Let connections run for specified duration
      await new Promise(resolve => setTimeout(resolve, duration));
      
      // Collect stats
      for (const monitor of monitors) {
        results.push(monitor.getStats());
      }
      
    } finally {
      tester.disconnectAll();
    }
    
    return results;
  }
}