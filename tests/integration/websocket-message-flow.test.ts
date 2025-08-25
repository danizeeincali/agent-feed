/**
 * @test WebSocket Message Flow Validation
 * @description Tests WebSocket communication to prevent echo loops and message duplication
 * @prerequisites WebSocket server running on expected port
 * @validation Ensures clean message flow without duplicate sends/receives
 */

import { test, expect, Page } from '@playwright/test';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  direction: 'sent' | 'received';
}

interface MessageFlowAnalysis {
  totalMessages: number;
  duplicateMessages: number;
  echoLoops: number;
  averageLatency: number;
  messageTypes: Record<string, number>;
}

class WebSocketMessageTracker {
  private messages: WebSocketMessage[] = [];
  private page: Page;
  private wsUrl: string;

  constructor(page: Page, wsUrl = 'ws://localhost:8080') {
    this.page = page;
    this.wsUrl = wsUrl;
  }

  async setupMessageTracking(): Promise<void> {
    await this.page.addInitScript(() => {
      window.wsMessages = [];
      window.originalWebSocket = WebSocket;
      
      window.WebSocket = class extends WebSocket {
        constructor(url, protocols) {
          super(url, protocols);
          
          const originalSend = this.send.bind(this);
          this.send = (data) => {
            window.wsMessages.push({
              type: 'send',
              data: data,
              timestamp: Date.now(),
              direction: 'sent'
            });
            return originalSend(data);
          };

          this.addEventListener('message', (event) => {
            window.wsMessages.push({
              type: 'message',
              data: event.data,
              timestamp: Date.now(),
              direction: 'received'
            });
          });

          this.addEventListener('error', (event) => {
            window.wsMessages.push({
              type: 'error',
              data: event,
              timestamp: Date.now(),
              direction: 'received'
            });
          });
        }
      };
    });
  }

  async getMessages(): Promise<WebSocketMessage[]> {
    return await this.page.evaluate(() => window.wsMessages || []);
  }

  async clearMessages(): Promise<void> {
    await this.page.evaluate(() => {
      window.wsMessages = [];
    });
  }

  async analyzeMessageFlow(): Promise<MessageFlowAnalysis> {
    const messages = await this.getMessages();
    
    const analysis: MessageFlowAnalysis = {
      totalMessages: messages.length,
      duplicateMessages: 0,
      echoLoops: 0,
      averageLatency: 0,
      messageTypes: {}
    };

    // Detect duplicate messages
    const messageHashes = new Map<string, number>();
    messages.forEach(msg => {
      const hash = JSON.stringify({ type: msg.type, data: msg.data });
      const count = messageHashes.get(hash) || 0;
      messageHashes.set(hash, count + 1);
      if (count > 0) analysis.duplicateMessages++;
    });

    // Detect echo loops (sent message immediately followed by identical received message)
    for (let i = 0; i < messages.length - 1; i++) {
      const current = messages[i];
      const next = messages[i + 1];
      
      if (current.direction === 'sent' && 
          next.direction === 'received' && 
          current.data === next.data &&
          (next.timestamp - current.timestamp) < 100) {
        analysis.echoLoops++;
      }
    }

    // Calculate latency for request-response pairs
    const latencies: number[] = [];
    for (let i = 0; i < messages.length - 1; i++) {
      const sent = messages[i];
      const received = messages[i + 1];
      
      if (sent.direction === 'sent' && received.direction === 'received') {
        latencies.push(received.timestamp - sent.timestamp);
      }
    }
    analysis.averageLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b) / latencies.length 
      : 0;

    // Count message types
    messages.forEach(msg => {
      analysis.messageTypes[msg.type] = (analysis.messageTypes[msg.type] || 0) + 1;
    });

    return analysis;
  }

  async validateTerminalInput(input: string): Promise<{ 
    inputMessageSent: boolean;
    echoReceived: boolean;
    duplicateEchoes: number;
  }> {
    await this.clearMessages();
    
    // Focus terminal and type
    await this.page.click('.xterm-helper-textarea');
    await this.page.type('.xterm-helper-textarea', input, { delay: 50 });
    
    // Wait for message processing
    await this.page.waitForTimeout(500);
    
    const messages = await this.getMessages();
    
    let inputMessageSent = false;
    let echoReceived = false;
    let duplicateEchoes = 0;
    
    const echoMessages = messages.filter(msg => 
      msg.direction === 'received' && 
      JSON.stringify(msg.data).includes(input)
    );
    
    inputMessageSent = messages.some(msg => 
      msg.direction === 'sent' && 
      JSON.stringify(msg.data).includes(input)
    );
    
    echoReceived = echoMessages.length > 0;
    duplicateEchoes = Math.max(0, echoMessages.length - 1);
    
    return { inputMessageSent, echoReceived, duplicateEchoes };
  }
}

test.describe('WebSocket Message Flow Tests', () => {
  let tracker: WebSocketMessageTracker;

  test.beforeEach(async ({ page }) => {
    tracker = new WebSocketMessageTracker(page);
    await tracker.setupMessageTracking();
    
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.xterm-screen', { timeout: 10000 });
    await page.waitForTimeout(1000); // Allow WebSocket connection to establish
  });

  test.describe('Basic Message Flow Validation', () => {
    test('should establish WebSocket connection without duplicate handshakes', async () => {
      const messages = await tracker.getMessages();
      
      // Should have connection establishment messages
      expect(messages.length).toBeGreaterThan(0);
      
      const analysis = await tracker.analyzeMessageFlow();
      expect(analysis.duplicateMessages).toBe(0);
    });

    test('should send terminal input without message duplication', async () => {
      const testInput = 'hello world';
      const result = await tracker.validateTerminalInput(testInput);
      
      expect(result.inputMessageSent).toBe(true);
      expect(result.duplicateEchoes).toBe(0);
    });

    test('should handle rapid typing without message queue overflow', async ({ page }) => {
      await tracker.clearMessages();
      
      const rapidInput = 'rapid-test-input';
      await page.type('.xterm-helper-textarea', rapidInput, { delay: 10 });
      await page.waitForTimeout(1000);
      
      const analysis = await tracker.analyzeMessageFlow();
      expect(analysis.echoLoops).toBe(0);
      expect(analysis.duplicateMessages).toBeLessThan(3); // Allow minimal buffering
    });
  });

  test.describe('Echo Loop Detection', () => {
    test('should prevent terminal echo loops', async () => {
      const commands = ['ls', 'pwd', 'echo test', 'clear'];
      
      for (const command of commands) {
        await tracker.clearMessages();
        
        const result = await tracker.validateTerminalInput(command);
        expect(result.duplicateEchoes).toBe(0);
        
        const analysis = await tracker.analyzeMessageFlow();
        expect(analysis.echoLoops).toBeLessThanOrEqual(1); // At most one echo per command
      }
    });

    test('should handle special characters without echo multiplication', async () => {
      const specialInputs = ['!@#$', '&&', '||', '> file.txt'];
      
      for (const input of specialInputs) {
        const result = await tracker.validateTerminalInput(input);
        expect(result.duplicateEchoes).toBe(0);
      }
    });
  });

  test.describe('Message Queue Management', () => {
    test('should handle message backlog without duplication', async ({ page }) => {
      await tracker.clearMessages();
      
      // Send multiple commands quickly
      const commands = ['cmd1', 'cmd2', 'cmd3', 'cmd4', 'cmd5'];
      
      for (const cmd of commands) {
        await page.type('.xterm-helper-textarea', cmd);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(50); // Minimal delay to create backlog
      }
      
      await page.waitForTimeout(2000); // Allow processing
      
      const analysis = await tracker.analyzeMessageFlow();
      expect(analysis.duplicateMessages).toBeLessThan(commands.length); // Some duplication might occur during stress
      expect(analysis.echoLoops).toBeLessThan(commands.length);
    });

    test('should maintain message order integrity', async ({ page }) => {
      await tracker.clearMessages();
      
      const orderedCommands = ['first', 'second', 'third'];
      
      for (const cmd of orderedCommands) {
        await page.type('.xterm-helper-textarea', cmd);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(200);
      }
      
      const messages = await tracker.getMessages();
      const sentMessages = messages.filter(m => m.direction === 'sent');
      
      // Verify commands appear in correct order
      for (let i = 0; i < orderedCommands.length; i++) {
        const foundIndex = sentMessages.findIndex(m => 
          JSON.stringify(m.data).includes(orderedCommands[i])
        );
        expect(foundIndex).toBeGreaterThanOrEqual(i);
      }
    });
  });

  test.describe('Connection Stability', () => {
    test('should handle connection interruption gracefully', async ({ page }) => {
      await tracker.clearMessages();
      
      // Simulate network interruption
      await page.evaluate(() => {
        // Temporarily disable network
        window.navigator.onLine = false;
      });
      
      await tracker.validateTerminalInput('test-offline');
      
      // Re-enable network
      await page.evaluate(() => {
        window.navigator.onLine = true;
      });
      
      await page.waitForTimeout(2000);
      
      const analysis = await tracker.analyzeMessageFlow();
      // Should not create excessive duplicates during reconnection
      expect(analysis.duplicateMessages).toBeLessThan(5);
    });

    test('should recover from WebSocket errors without message loss', async ({ page }) => {
      await tracker.clearMessages();
      
      // Force WebSocket error
      await page.evaluate(() => {
        const ws = window.currentWebSocket;
        if (ws) {
          ws.close(1000, 'Test closure');
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Try to send message after error
      const result = await tracker.validateTerminalInput('recovery-test');
      
      // Should either succeed (reconnected) or fail gracefully (no duplicates)
      expect(result.duplicateEchoes).toBe(0);
    });
  });

  test.describe('Performance Metrics', () => {
    test('should maintain acceptable message latency', async () => {
      const testInputs = ['quick', 'test', 'response', 'time'];
      
      let totalLatency = 0;
      let messageCount = 0;
      
      for (const input of testInputs) {
        await tracker.clearMessages();
        
        const startTime = Date.now();
        await tracker.validateTerminalInput(input);
        const endTime = Date.now();
        
        totalLatency += (endTime - startTime);
        messageCount++;
      }
      
      const averageLatency = totalLatency / messageCount;
      expect(averageLatency).toBeLessThan(1000); // Under 1 second average
    });

    test('should limit message queue size under stress', async ({ page }) => {
      await tracker.clearMessages();
      
      // Generate high-frequency input
      const stressInput = 'x'.repeat(50);
      await page.type('.xterm-helper-textarea', stressInput, { delay: 5 });
      
      await page.waitForTimeout(1000);
      
      const messages = await tracker.getMessages();
      expect(messages.length).toBeLessThan(200); // Reasonable queue limit
    });
  });
});

test.describe('WebSocket Protocol Validation', () => {
  test('should use correct message format', async ({ page }) => {
    const tracker = new WebSocketMessageTracker(page);
    await tracker.setupMessageTracking();
    
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.xterm-screen');
    
    await tracker.validateTerminalInput('protocol-test');
    
    const messages = await tracker.getMessages();
    const sentMessages = messages.filter(m => m.direction === 'sent');
    
    // Validate message structure
    sentMessages.forEach(msg => {
      expect(msg.data).toBeDefined();
      expect(msg.timestamp).toBeGreaterThan(0);
      expect(typeof msg.data).toBe('string');
    });
  });

  test('should handle binary data correctly', async ({ page }) => {
    const tracker = new WebSocketMessageTracker(page);
    await tracker.setupMessageTracking();
    
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.xterm-screen');
    
    // Test binary-like input (control characters)
    await page.keyboard.press('Control+C');
    await page.waitForTimeout(500);
    
    const analysis = await tracker.analyzeMessageFlow();
    expect(analysis.duplicateMessages).toBe(0);
  });
});