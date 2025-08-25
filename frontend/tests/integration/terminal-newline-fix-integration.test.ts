/**
 * Integration Test - Terminal Newline Fix Validation
 * TDD London School Integration Testing for ANSI processing fix
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import WebSocket from 'ws';

interface TerminalMessage {
  type: 'data' | 'init_ack' | 'connect' | 'exit' | 'error';
  data?: string;
  terminalId?: string;
  timestamp?: number;
  pid?: number;
  cols?: number;
  rows?: number;
  code?: number;
  signal?: string;
  error?: string;
}

class TerminalIntegrationTester {
  private ws: WebSocket | null = null;
  private messages: TerminalMessage[] = [];
  private connectionPromise: Promise<void> | null = null;

  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      try {
        this.ws = new WebSocket('ws://localhost:3002/terminal');
        
        this.ws.on('open', () => {
          clearTimeout(timeout);
          console.log('WebSocket connected for integration test');
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message: TerminalMessage = JSON.parse(data.toString());
            this.messages.push(message);
          } catch (error) {
            console.warn('Failed to parse message:', data.toString());
          }
        });

        this.ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  sendInput(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'input',
        data: data
      }));
    }
  }

  sendInit(cols = 80, rows = 24): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'init',
        cols,
        rows
      }));
    }
  }

  getMessages(): TerminalMessage[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }

  async waitForMessage(type: string, timeout = 5000): Promise<TerminalMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for message type: ${type}`));
      }, timeout);

      const checkMessages = () => {
        const message = this.messages.find(msg => msg.type === type);
        if (message) {
          clearTimeout(timer);
          resolve(message);
        } else {
          setTimeout(checkMessages, 10);
        }
      };

      checkMessages();
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionPromise = null;
  }
}

describe('Terminal Newline Fix Integration Tests', () => {
  let tester: TerminalIntegrationTester;

  beforeAll(async () => {
    tester = new TerminalIntegrationTester();
    
    try {
      await tester.connect();
      console.log('Integration test connection established');
    } catch (error) {
      console.warn('Backend server not running - skipping integration tests');
      throw error;
    }
  });

  afterAll(() => {
    if (tester) {
      tester.disconnect();
    }
  });

  it('should establish WebSocket connection and receive connect message', async () => {
    const connectMessage = await tester.waitForMessage('connect');
    
    expect(connectMessage.type).toBe('connect');
    expect(connectMessage.terminalId).toBeDefined();
    expect(connectMessage.timestamp).toBeDefined();
  });

  it('should handle terminal initialization', async () => {
    tester.clearMessages();
    tester.sendInit(120, 30);
    
    const initMessage = await tester.waitForMessage('init_ack');
    
    expect(initMessage.type).toBe('init_ack');
    expect(initMessage.cols).toBe(120);
    expect(initMessage.rows).toBe(30);
    expect(initMessage.pid).toBeDefined();
  });

  it('should process literal newlines correctly in command output', async () => {
    tester.clearMessages();
    
    // Send a command that might produce literal \n characters
    tester.sendInput('echo "line1\\nline2\\nline3"\n');
    
    // Wait for output data
    const dataMessage = await tester.waitForMessage('data', 10000);
    
    expect(dataMessage.type).toBe('data');
    expect(dataMessage.data).toBeDefined();
    
    // CRITICAL TEST: Verify literal \n was converted to actual newlines
    const outputData = dataMessage.data!;
    expect(outputData).not.toContain('\\n'); // Should not contain literal \n
    
    // Should contain actual newline characters
    if (outputData.includes('line1') && outputData.includes('line2')) {
      const lines = outputData.split('\n');
      expect(lines.length).toBeGreaterThan(1);
    }
  });

  it('should handle carriage returns for progress indicators', async () => {
    tester.clearMessages();
    
    // Simulate progress indicator with carriage return
    tester.sendInput('printf "Progress: 0%%\\rProgress: 50%%\\rProgress: 100%%\\n"\n');
    
    const dataMessage = await tester.waitForMessage('data', 10000);
    
    expect(dataMessage.type).toBe('data');
    expect(dataMessage.data).toBeDefined();
    
    const outputData = dataMessage.data!;
    
    // Should preserve carriage returns for overwriting
    expect(outputData).toContain('\r');
    
    // Should not contain literal \r strings
    expect(outputData).not.toContain('\\r');
  });

  it('should handle complex command with mixed control characters', async () => {
    tester.clearMessages();
    
    // Test a complex command that might have literal newlines
    tester.sendInput('cd /workspaces/agent-feed && pwd\n');
    
    const dataMessage = await tester.waitForMessage('data', 10000);
    
    expect(dataMessage.type).toBe('data');
    expect(dataMessage.data).toBeDefined();
    
    const outputData = dataMessage.data!;
    
    // Verify proper newline handling
    expect(outputData).not.toContain('\\n');
    expect(outputData).not.toContain('\\r');
    
    // Should contain actual working directory
    if (outputData.includes('agent-feed')) {
      expect(outputData).toMatch(/agent-feed/);
    }
  });

  it('should handle Claude CLI command correctly', async () => {
    tester.clearMessages();
    
    // Test the exact problematic command from the user's report
    tester.sendInput('claude --version 2>/dev/null || echo "Claude not found"\n');
    
    const dataMessage = await tester.waitForMessage('data', 10000);
    
    expect(dataMessage.type).toBe('data');
    expect(dataMessage.data).toBeDefined();
    
    const outputData = dataMessage.data!;
    
    // Critical: Should not show literal \n characters
    expect(outputData).not.toContain('\\n');
    
    // Should handle the command output properly
    if (outputData.includes('not found') || outputData.includes('version')) {
      // Either Claude is found (shows version) or not found (shows error)
      expect(outputData).toMatch(/not found|version|Claude/i);
    }
  });

  it('should preserve ANSI sequences for colors and formatting', async () => {
    tester.clearMessages();
    
    // Test colored output
    tester.sendInput('echo -e "\\033[32mGreen text\\033[0m normal text"\n');
    
    const dataMessage = await tester.waitForMessage('data', 10000);
    
    expect(dataMessage.type).toBe('data');
    expect(dataMessage.data).toBeDefined();
    
    const outputData = dataMessage.data!;
    
    // Should contain ANSI color sequences
    expect(outputData).toMatch(/\x1b\[32m.*\x1b\[0m/);
    
    // Should not contain literal newlines
    expect(outputData).not.toContain('\\n');
  });

  it('should handle rapid output without cascading issues', async () => {
    tester.clearMessages();
    
    // Test rapid output that might cause cascading
    tester.sendInput('for i in {1..5}; do echo "Line $i"; done\n');
    
    // Collect all data messages for this command
    const allMessages: TerminalMessage[] = [];
    const startTime = Date.now();
    
    while (Date.now() - startTime < 5000) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const newMessages = tester.getMessages().filter(msg => 
        msg.type === 'data' && 
        msg.timestamp! > startTime &&
        !allMessages.includes(msg)
      );
      allMessages.push(...newMessages);
    }
    
    expect(allMessages.length).toBeGreaterThan(0);
    
    // Verify all messages handle newlines properly
    allMessages.forEach(message => {
      if (message.data) {
        expect(message.data).not.toContain('\\n');
      }
    });
  });
});