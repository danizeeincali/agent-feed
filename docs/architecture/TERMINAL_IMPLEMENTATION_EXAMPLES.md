# Terminal Implementation Examples

## Raw WebSocket Implementation (Recommended)

### Frontend: RawTerminalClient.ts
```typescript
/**
 * Raw WebSocket Terminal Client
 * Bulletproof terminal input handling with direct WebSocket communication
 */

import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

interface TerminalMessage {
  type: 'input' | 'resize' | 'output' | 'ping' | 'pong' | 'error';
  data?: string;
  cols?: number;
  rows?: number;
  timestamp?: number;
  error?: string;
}

interface TerminalClientOptions {
  url: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  debugMode?: boolean;
}

class RawTerminalClient {
  private ws: WebSocket | null = null;
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  
  private readonly url: string;
  private readonly debugMode: boolean;
  private readonly reconnectDelay: number;
  private readonly maxReconnectAttempts: number;
  
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private inputQueue: string[] = [];
  private isConnected = false;
  
  // Event callbacks
  private onConnectedCallback?: () => void;
  private onDisconnectedCallback?: (reason?: string) => void;
  private onErrorCallback?: (error: string) => void;
  
  constructor(options: TerminalClientOptions) {
    this.url = options.url;
    this.debugMode = options.debugMode || false;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
  }
  
  /**
   * Initialize terminal with bulletproof configuration
   */
  initializeTerminal(container: HTMLElement): Terminal {
    this.log('🔧 Initializing terminal...');
    
    // Create terminal with optimal settings
    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"Fira Code", "SF Mono", Monaco, Consolas, monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5'
      },
      scrollback: 10000,
      allowTransparency: false,
      convertEol: true,
      cols: 80,
      rows: 24
    });
    
    // Add essential addons
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    
    // Open terminal
    this.terminal.open(container);
    this.fitAddon.fit();
    
    // Setup bulletproof input handling
    this.setupInputHandling();
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
    
    return this.terminal;
  }
  
  /**
   * CRITICAL: Bulletproof input handling
   */
  private setupInputHandling(): void {
    if (!this.terminal) return;
    
    this.terminal.onData((data: string) => {
      this.log('📝 Input captured:', {
        data: JSON.stringify(data),
        length: data.length,
        charCodes: Array.from(data).map(c => c.charCodeAt(0)),
        isConnected: this.isConnected
      });
      
      // Always queue input, even if not connected
      this.queueInput(data);
    });
    
    this.terminal.onResize((size) => {
      this.log('📐 Terminal resized:', size);
      this.sendResize(size.cols, size.rows);
    });
  }
  
  /**
   * Queue input for reliable delivery
   */
  private queueInput(data: string): void {
    this.inputQueue.push(data);
    this.processInputQueue();
  }
  
  /**
   * Process input queue with retry logic
   */
  private processInputQueue(): void {
    if (!this.isConnected || this.inputQueue.length === 0) {
      return;
    }
    
    while (this.inputQueue.length > 0) {
      const data = this.inputQueue.shift()!;
      const success = this.sendInput(data);
      
      if (!success) {
        // Put it back at the front of the queue
        this.inputQueue.unshift(data);
        break;
      }
    }
  }
  
  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    this.log('🔌 Connecting to:', this.url);
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        // Connection timeout
        const timeout = setTimeout(() => {
          this.ws?.close();
          reject(new Error('Connection timeout'));
        }, 10000);
        
        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.log('✅ WebSocket connected successfully');
          
          this.startHeartbeat();
          this.processInputQueue(); // Process any queued input
          this.onConnectedCallback?.();
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          this.isConnected = false;
          this.stopHeartbeat();
          
          const reason = event.reason || `Connection closed (code: ${event.code})`;
          this.log('❌ WebSocket closed:', reason);
          
          this.onDisconnectedCallback?.(reason);
          
          // Auto-reconnect if not a clean close
          if (event.code !== 1000) {
            this.scheduleReconnect();
          }
        };
        
        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          this.isConnected = false;
          this.log('🚨 WebSocket error:', error);
          this.onErrorCallback?.('WebSocket connection error');
          reject(error);
        };
        
      } catch (error) {
        this.log('💥 Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message: TerminalMessage = JSON.parse(data);
      this.log('📨 Received message:', message);
      
      switch (message.type) {
        case 'output':
          if (message.data && this.terminal) {
            this.terminal.write(message.data);
          }
          break;
        case 'pong':
          this.log('💓 Heartbeat received');
          break;
        case 'error':
          this.log('🚨 Server error:', message.error);
          this.onErrorCallback?.(message.error || 'Unknown server error');
          break;
        default:
          this.log('❓ Unknown message type:', message.type);
      }
    } catch (error) {
      // Handle raw data (fallback for non-JSON messages)
      this.log('📄 Raw data received:', data);
      if (this.terminal) {
        this.terminal.write(data);
      }
    }
  }
  
  /**
   * Send input to server
   */
  private sendInput(data: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('⚠️ Cannot send input - not connected');
      return false;
    }
    
    try {
      const message: TerminalMessage = {
        type: 'input',
        data,
        timestamp: Date.now()
      };
      
      this.ws.send(JSON.stringify(message));
      this.log('✅ Input sent successfully:', JSON.stringify(data));
      return true;
    } catch (error) {
      this.log('❌ Failed to send input:', error);
      return false;
    }
  }
  
  /**
   * Send resize event to server
   */
  private sendResize(cols: number, rows: number): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      const message: TerminalMessage = {
        type: 'resize',
        cols,
        rows,
        timestamp: Date.now()
      };
      
      this.ws.send(JSON.stringify(message));
      this.log('✅ Resize sent:', { cols, rows });
      return true;
    } catch (error) {
      this.log('❌ Failed to send resize:', error);
      return false;
    }
  }
  
  /**
   * Handle window resize
   */
  private handleResize(): void {
    if (this.fitAddon && this.terminal) {
      this.fitAddon.fit();
    }
  }
  
  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const message: TerminalMessage = {
          type: 'ping',
          timestamp: Date.now()
        };
        this.ws.send(JSON.stringify(message));
      }
    }, 30000);
  }
  
  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('💀 Max reconnection attempts reached');
      this.onErrorCallback?.('Max reconnection attempts reached');
      return;
    }
    
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    this.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        this.log('🚨 Reconnection failed:', error);
      });
    }, delay);
  }
  
  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.log('🔌 Disconnecting...');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }
  
  /**
   * Event listeners
   */
  onConnected(callback: () => void): void {
    this.onConnectedCallback = callback;
  }
  
  onDisconnected(callback: (reason?: string) => void): void {
    this.onDisconnectedCallback = callback;
  }
  
  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }
  
  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (this.isConnected) return 'connected';
    if (this.ws?.readyState === WebSocket.CONNECTING) return 'connecting';
    return 'disconnected';
  }
  
  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString();
      if (data) {
        console.log(`[${timestamp}] ${message}`, data);
      } else {
        console.log(`[${timestamp}] ${message}`);
      }
    }
  }
}

export default RawTerminalClient;
```

### Backend: RawTerminalServer.ts
```typescript
/**
 * Raw WebSocket Terminal Server
 * Direct PTY communication with bulletproof message handling
 */

import WebSocket from 'ws';
import * as pty from 'node-pty';
import { EventEmitter } from 'events';

interface TerminalMessage {
  type: 'input' | 'resize' | 'output' | 'ping' | 'pong' | 'error';
  data?: string;
  cols?: number;
  rows?: number;
  timestamp?: number;
  error?: string;
}

interface ClientInfo {
  id: string;
  ws: WebSocket;
  lastActivity: Date;
}

class RawTerminalServer extends EventEmitter {
  private wss: WebSocket.Server;
  private ptyProcess: pty.IPty | null = null;
  private clients: Map<string, ClientInfo> = new Map();
  private debugMode: boolean;
  
  constructor(port: number, debugMode = false) {
    super();
    
    this.debugMode = debugMode;
    this.wss = new WebSocket.Server({ 
      port,
      perMessageDeflate: false, // Disable compression for lower latency
    });
    
    this.log(`🚀 Terminal server starting on port ${port}`);
    
    this.initializePty();
    this.setupServer();
    this.startCleanupInterval();
  }
  
  /**
   * Initialize PTY process
   */
  private initializePty(): void {
    this.log('🔧 Initializing PTY process...');
    
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const args = process.platform === 'win32' ? [] : ['-l']; // Login shell
    
    try {
      this.ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: {
          ...process.env,
          TERM: 'xterm-color',
          COLORTERM: 'truecolor',
        } as { [key: string]: string }
      });
      
      this.log('✅ PTY process created with PID:', this.ptyProcess.pid);
      
      // Forward PTY output to all connected clients
      this.ptyProcess.onData((data: string) => {
        this.log('📤 PTY output:', JSON.stringify(data.substring(0, 100)));
        this.broadcastToClients({
          type: 'output',
          data,
          timestamp: Date.now()
        });
      });
      
      this.ptyProcess.onExit(({ exitCode, signal }) => {
        this.log('💀 PTY process exited:', { exitCode, signal });
        
        // Notify clients
        this.broadcastToClients({
          type: 'error',
          error: `Shell process exited (code: ${exitCode}, signal: ${signal})`,
          timestamp: Date.now()
        });
        
        // Restart PTY after short delay
        setTimeout(() => {
          this.log('🔄 Restarting PTY process...');
          this.initializePty();
        }, 1000);
      });
      
    } catch (error) {
      this.log('💥 Failed to create PTY process:', error);
      throw error;
    }
  }
  
  /**
   * Setup WebSocket server
   */
  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      const clientInfo: ClientInfo = {
        id: clientId,
        ws,
        lastActivity: new Date()
      };
      
      this.clients.set(clientId, clientInfo);
      this.log(`✅ Client connected: ${clientId} (${this.clients.size} total)`);
      
      // Send welcome message
      this.sendToClient(clientId, {
        type: 'output',
        data: `\r\n🎯 Connected to Claude Terminal (Client: ${clientId})\r\n`,
        timestamp: Date.now()
      });
      
      // Handle client messages
      ws.on('message', (data: WebSocket.Data) => {
        clientInfo.lastActivity = new Date();
        this.handleClientMessage(clientId, data);
      });
      
      // Handle client disconnect
      ws.on('close', (code, reason) => {
        this.log(`❌ Client disconnected: ${clientId} (code: ${code}, reason: ${reason})`);
        this.clients.delete(clientId);
      });
      
      // Handle client errors
      ws.on('error', (error) => {
        this.log(`🚨 Client error: ${clientId}`, error);
        this.clients.delete(clientId);
      });
      
      // Send heartbeat ping
      ws.on('pong', () => {
        clientInfo.lastActivity = new Date();
      });
    });
    
    this.wss.on('error', (error) => {
      this.log('💥 WebSocket server error:', error);
    });
    
    this.log(`✅ WebSocket server listening on port ${this.wss.options.port}`);
  }
  
  /**
   * Handle incoming client messages
   */
  private handleClientMessage(clientId: string, data: WebSocket.Data): void {
    try {
      const message: TerminalMessage = JSON.parse(data.toString());
      this.log(`📨 Message from ${clientId}:`, message);
      
      switch (message.type) {
        case 'input':
          this.handleInput(message.data || '');
          break;
        case 'resize':
          this.handleResize(message.cols || 80, message.rows || 24);
          break;
        case 'ping':
          this.sendToClient(clientId, {
            type: 'pong',
            timestamp: Date.now()
          });
          break;
        default:
          this.log(`❓ Unknown message type from ${clientId}:`, message.type);
      }
    } catch (error) {
      // Handle raw data as input (fallback)
      const rawData = data.toString();
      this.log(`📄 Raw input from ${clientId}:`, JSON.stringify(rawData));
      this.handleInput(rawData);
    }
  }
  
  /**
   * Handle terminal input
   */
  private handleInput(data: string): void {
    if (!this.ptyProcess) {
      this.log('⚠️ Cannot send input - PTY not initialized');
      return;
    }
    
    try {
      this.ptyProcess.write(data);
      this.log('✅ Input sent to PTY:', JSON.stringify(data));
    } catch (error) {
      this.log('❌ Failed to send input to PTY:', error);
    }
  }
  
  /**
   * Handle terminal resize
   */
  private handleResize(cols: number, rows: number): void {
    if (!this.ptyProcess) {
      this.log('⚠️ Cannot resize - PTY not initialized');
      return;
    }
    
    try {
      this.ptyProcess.resize(cols, rows);
      this.log('✅ PTY resized:', { cols, rows });
    } catch (error) {
      this.log('❌ Failed to resize PTY:', error);
    }
  }
  
  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: TerminalMessage): boolean {
    const client = this.clients.get(clientId);
    
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.log(`❌ Failed to send message to ${clientId}:`, error);
      this.clients.delete(clientId);
      return false;
    }
  }
  
  /**
   * Broadcast message to all connected clients
   */
  private broadcastToClients(message: TerminalMessage): void {
    const messageStr = JSON.stringify(message);
    
    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
        } catch (error) {
          this.log(`❌ Failed to broadcast to ${clientId}:`, error);
          this.clients.delete(clientId);
        }
      } else {
        // Remove dead connections
        this.clients.delete(clientId);
      }
    }
  }
  
  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Start cleanup interval for dead connections
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = new Date();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes
      
      for (const [clientId, client] of this.clients) {
        const timeSinceActivity = now.getTime() - client.lastActivity.getTime();
        
        if (timeSinceActivity > staleThreshold || client.ws.readyState !== WebSocket.OPEN) {
          this.log(`🧹 Cleaning up stale client: ${clientId}`);
          this.clients.delete(clientId);
          
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.close();
          }
        }
      }
    }, 60000); // Check every minute
  }
  
  /**
   * Get server statistics
   */
  getStats() {
    return {
      connectedClients: this.clients.size,
      ptyPid: this.ptyProcess?.pid,
      ptyRunning: !!this.ptyProcess,
      uptime: process.uptime()
    };
  }
  
  /**
   * Shutdown server gracefully
   */
  shutdown(): void {
    this.log('🛑 Shutting down terminal server...');
    
    // Notify all clients
    this.broadcastToClients({
      type: 'error',
      error: 'Server shutting down',
      timestamp: Date.now()
    });
    
    // Close all client connections
    for (const [clientId, client] of this.clients) {
      client.ws.close(1001, 'Server shutdown');
    }
    
    // Close WebSocket server
    this.wss.close();
    
    // Kill PTY process
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
    
    this.log('✅ Terminal server shutdown complete');
  }
  
  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString();
      if (data) {
        console.log(`[${timestamp}] ${message}`, data);
      } else {
        console.log(`[${timestamp}] ${message}`);
      }
    }
  }
}

export default RawTerminalServer;
```

### Usage Example
```typescript
// Frontend Usage
const terminalClient = new RawTerminalClient({
  url: 'ws://localhost:8080',
  debugMode: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 10
});

// Initialize terminal in DOM element
const container = document.getElementById('terminal-container')!;
const terminal = terminalClient.initializeTerminal(container);

// Setup event handlers
terminalClient.onConnected(() => {
  console.log('🎯 Terminal connected and ready!');
});

terminalClient.onError((error) => {
  console.error('🚨 Terminal error:', error);
});

// Connect to server
terminalClient.connect().then(() => {
  console.log('✅ Connected successfully');
}).catch((error) => {
  console.error('❌ Connection failed:', error);
});

// Backend Usage
const terminalServer = new RawTerminalServer(8080, true);

// Handle graceful shutdown
process.on('SIGINT', () => {
  terminalServer.shutdown();
  process.exit(0);
});
```

## Key Features of This Implementation

### 1. Bulletproof Input Capture
- Every keypress is logged with detailed debugging information
- Input is queued and retried if connection is lost
- Fallback handling for both JSON and raw data messages

### 2. Robust Connection Management
- Exponential backoff for reconnections
- Heartbeat/ping-pong to detect connection issues
- Graceful handling of network interruptions

### 3. Comprehensive Error Handling
- Every error is caught and logged
- Client and server errors are properly propagated
- Automatic recovery from PTY process crashes

### 4. Performance Optimizations
- Direct WebSocket communication (no abstraction layers)
- Message compression disabled for lower latency
- Efficient client cleanup and memory management

### 5. Debug-Friendly
- Extensive logging with timestamps
- Message tracing throughout the entire pipeline
- Clear error messages and status reporting

This implementation will guarantee that terminal input is captured and forwarded correctly, with full visibility into any issues that may arise.