/**
 * Test utilities for WebSocket stability testing
 */

const { spawn } = require('child_process');
const { WebSocket } = require('ws');
const path = require('path');

class TestServer {
  constructor(port = 3001) {
    this.port = port;
    this.process = null;
    this.isReady = false;
  }

  async start() {
    return new Promise((resolve, reject) => {
      const serverPath = path.join(__dirname, '../../../simple-backend.js');
      
      this.process = spawn('node', [serverPath], {
        env: { ...process.env, PORT: this.port },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdoutBuffer = '';
      let stderrBuffer = '';

      this.process.stdout.on('data', (data) => {
        stdoutBuffer += data.toString();
        if (stdoutBuffer.includes('Server running on port')) {
          this.isReady = true;
          console.log(`[TEST] Server started on port ${this.port}`);
          resolve();
        }
      });

      this.process.stderr.on('data', (data) => {
        stderrBuffer += data.toString();
      });

      this.process.on('error', (error) => {
        console.error('[TEST] Server process error:', error);
        reject(error);
      });

      this.process.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`Server exited with code ${code}. stderr: ${stderrBuffer}`));
        }
      });

      // Timeout fallback
      setTimeout(() => {
        if (!this.isReady) {
          reject(new Error('Server start timeout'));
        }
      }, 10000);
    });
  }

  async stop() {
    if (this.process) {
      this.process.kill('SIGTERM');
      
      return new Promise((resolve) => {
        this.process.on('exit', () => {
          console.log(`[TEST] Server stopped on port ${this.port}`);
          resolve();
        });
        
        // Force kill after timeout
        setTimeout(() => {
          if (!this.process.killed) {
            this.process.kill('SIGKILL');
            resolve();
          }
        }, 5000);
      });
    }
  }
}

class WebSocketTestClient {
  constructor(url = `ws://localhost:3001`) {
    this.url = url;
    this.ws = null;
    this.messages = [];
    this.connectionEvents = [];
    this.isConnected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.isConnected = true;
        this.connectionEvents.push({ type: 'open', timestamp: Date.now() });
        console.log('[TEST] WebSocket connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messages.push({
            ...data,
            receivedAt: Date.now()
          });
        } catch (error) {
          this.messages.push({
            raw: event.data,
            receivedAt: Date.now()
          });
        }
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.connectionEvents.push({ 
          type: 'close', 
          code: event.code, 
          reason: event.reason, 
          timestamp: Date.now() 
        });
        console.log(`[TEST] WebSocket closed: ${event.code} - ${event.reason}`);
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeout);
        this.connectionEvents.push({ type: 'error', error, timestamp: Date.now() });
        console.error('[TEST] WebSocket error:', error);
        reject(error);
      };
    });
  }

  async sendMessage(message) {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      try {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        this.ws.send(messageStr);
        console.log('[TEST] Message sent:', messageStr.substring(0, 100));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async waitForMessage(timeout = 5000, filter = null) {
    const startCount = this.messages.length;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const newMessages = this.messages.slice(startCount);
        
        for (const message of newMessages) {
          if (!filter || filter(message)) {
            clearInterval(checkInterval);
            resolve(message);
            return;
          }
        }

        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`Message timeout. Received ${newMessages.length} messages but none matched filter.`));
        }
      }, 100);
    });
  }

  getConnectionStats() {
    return {
      isConnected: this.isConnected,
      messageCount: this.messages.length,
      connectionEvents: this.connectionEvents.length,
      lastMessage: this.messages[this.messages.length - 1],
      connectionHistory: this.connectionEvents
    };
  }

  async disconnect() {
    if (this.ws && this.isConnected) {
      this.ws.close(1000, 'Test complete');
      
      return new Promise((resolve) => {
        const checkDisconnected = () => {
          if (!this.isConnected) {
            resolve();
          } else {
            setTimeout(checkDisconnected, 100);
          }
        };
        checkDisconnected();
      });
    }
  }
}

class ConnectionMonitor {
  constructor() {
    this.events = [];
  }

  logEvent(type, data = {}) {
    this.events.push({
      type,
      timestamp: Date.now(),
      data
    });
    console.log(`[TEST] Connection event: ${type}`, data);
  }

  getEvents(type = null) {
    if (type) {
      return this.events.filter(event => event.type === type);
    }
    return this.events;
  }

  clear() {
    this.events = [];
  }

  getTimeline() {
    return this.events.map(event => ({
      type: event.type,
      timestamp: event.timestamp,
      relativeTime: event.timestamp - this.events[0]?.timestamp || 0,
      data: event.data
    }));
  }
}

// Performance measurement utilities
const performanceUtils = {
  measure: async (name, fn) => {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds

    console.log(`[TEST] Performance: ${name} took ${duration.toFixed(2)}ms`);
    
    return {
      result,
      duration,
      timestamp: Date.now()
    };
  },

  createTimer: () => {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1000000;
    };
  }
};

// Sleep utility for test timing
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry utility for flaky operations
const retry = async (fn, maxAttempts = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      console.log(`[TEST] Retry ${attempt}/${maxAttempts} failed:`, error.message);
      await sleep(delay);
    }
  }
};

module.exports = {
  TestServer,
  WebSocketTestClient,
  ConnectionMonitor,
  performanceUtils,
  sleep,
  retry
};