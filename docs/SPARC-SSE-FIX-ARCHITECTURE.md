# SPARC Architecture: Stable Connection Design

## Executive Summary

This document defines the system architecture for stable real-time connections in the agent-feed application, resolving the Socket.IO proxy upgrade issue while maintaining SSE functionality.

**Problem**: Vite dev server proxy cannot upgrade HTTP → WebSocket for Socket.IO connections.

**Solution**: Direct Socket.IO connections in development, proxied SSE for HTTP streaming.

---

## 1. Connection Topology

### 1.1 Development Environment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (localhost:5173)                    │
│                                                                       │
│  ┌──────────────────────┐         ┌───────────────────────────┐    │
│  │  Socket.IO Client    │         │   EventSource (SSE)       │    │
│  │  (Direct Connection) │         │   (Proxied Connection)    │    │
│  └──────────┬───────────┘         └───────────┬───────────────┘    │
└─────────────┼──────────────────────────────────┼───────────────────┘
              │                                   │
              │ Direct (WS/Polling)               │ HTTP (Proxied)
              │ No Vite Proxy                     │ Through Vite
              │                                   │
              ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Vite Dev Server (localhost:5173)                  │
│                                                                       │
│                    Proxy Configuration                               │
│                    /api/* → localhost:3001                          │
│                    (HTTP only, no upgrade)                          │
│                                   │                                  │
└───────────────────────────────────┼──────────────────────────────────┘
                                    │
              Direct WS ────────────┴─────────── Proxied HTTP
                    │                                   │
                    ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Backend Server (localhost:3001)                  │
│                                                                       │
│  ┌──────────────────────┐         ┌───────────────────────────┐    │
│  │  Socket.IO Server    │         │   SSE Endpoints           │    │
│  │  Port: 3001          │         │   /streaming-ticker       │    │
│  │  Path: /socket.io    │         │   /api/feed/sse          │    │
│  │  Transport:          │         │                           │    │
│  │  - websocket         │         │   Protocol: HTTP/1.1      │    │
│  │  - polling (fallback)│         │   Content-Type:           │    │
│  └──────────────────────┘         │   text/event-stream       │    │
│                                    └───────────────────────────┘    │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Database Layer                             │  │
│  │  SQLite: database.db                                         │  │
│  │  Tables: posts, agents, analytics, activity_events          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Production Environment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Browser (https://example.com)                     │
│                                                                       │
│  ┌──────────────────────┐         ┌───────────────────────────┐    │
│  │  Socket.IO Client    │         │   EventSource (SSE)       │    │
│  │  (Same Origin)       │         │   (Same Origin)           │    │
│  └──────────┬───────────┘         └───────────┬───────────────┘    │
└─────────────┼──────────────────────────────────┼───────────────────┘
              │                                   │
              │ WebSocket (wss://)                │ HTTPS
              │                                   │
              ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy (Port 443)                    │
│                                                                       │
│  Location /socket.io/                                                │
│    - Upgrade: websocket ✓                                           │
│    - Proxy to: http://app:3001                                      │
│                                                                       │
│  Location /api/                                                      │
│    - Proxy to: http://app:3001                                      │
│                                                                       │
│  Location /                                                          │
│    - Serve static: /dist                                            │
│                                                                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Backend Server (app:3001)                        │
│                                                                       │
│  Same architecture as development (Socket.IO + SSE)                 │
│  CORS configured for production domain                              │
│  Origin validation: https://example.com                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Socket.IO Configuration

### 2.1 Direct Connection Strategy

**Development Configuration**:

```javascript
// Frontend: /frontend/src/services/socket.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_CONFIG = {
  development: {
    url: 'http://localhost:3001', // DIRECT - bypass Vite proxy
    options: {
      path: '/socket.io',
      transports: ['websocket', 'polling'], // WebSocket first, polling fallback
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: false, // Manual connection control
      withCredentials: true, // Send cookies for auth
    }
  },
  production: {
    url: '', // Same origin - empty string
    options: {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 30000,
      autoConnect: false,
      withCredentials: true,
      secure: true, // Force HTTPS
    }
  }
};

export function createSocketConnection(): Socket {
  const env = import.meta.env.MODE;
  const config = env === 'production'
    ? SOCKET_CONFIG.production
    : SOCKET_CONFIG.development;

  return io(config.url, config.options);
}
```

**Backend Configuration**:

```javascript
// Backend: /api-server/server.js
import { Server } from 'socket.io';
import http from 'http';

const server = http.createServer(app);

const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL
      : ['http://localhost:5173', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true, // Backwards compatibility
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e6, // 1MB
  allowUpgrades: true,
  perMessageDeflate: {
    threshold: 1024 // Compress messages > 1KB
  }
});

// Connection handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Validate origin
  const origin = socket.handshake.headers.origin;
  if (!isValidOrigin(origin)) {
    socket.disconnect();
    return;
  }

  // Connection health monitoring
  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`);
  });

  socket.on('error', (error) => {
    console.error(`[Socket.IO] Socket error: ${error.message}`);
  });
});
```

### 2.2 Connection Lifecycle Management

```javascript
// Frontend: Socket connection manager
class SocketManager {
  private socket: Socket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      this.socket = createSocketConnection();

      // Connection success
      this.socket.on('connect', () => {
        console.log('[Socket.IO] Connected:', this.socket!.id);
        this.startHealthCheck();
        resolve(this.socket!);
      });

      // Connection error
      this.socket.on('connect_error', (error) => {
        console.error('[Socket.IO] Connection error:', error.message);
        reject(error);
      });

      // Reconnection attempts
      this.socket.on('reconnect_attempt', (attempt) => {
        console.log(`[Socket.IO] Reconnection attempt ${attempt}`);
      });

      // Reconnection success
      this.socket.on('reconnect', (attempt) => {
        console.log(`[Socket.IO] Reconnected after ${attempt} attempts`);
      });

      // Reconnection failure
      this.socket.on('reconnect_failed', () => {
        console.error('[Socket.IO] Reconnection failed');
        this.handleReconnectFailure();
      });

      // Start connection
      this.socket.connect();

      // Timeout fallback
      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping', Date.now());
      }
    }, 30000); // Every 30 seconds
  }

  disconnect(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.socket?.disconnect();
  }

  private handleReconnectFailure(): void {
    // Fallback to SSE-only mode
    console.warn('[Socket.IO] Falling back to SSE-only mode');
    this.emit('fallback_to_sse');
  }
}
```

---

## 3. SSE Configuration

### 3.1 Proxied Connection Strategy

**Vite Proxy Configuration** (Keep Existing):

```javascript
// /frontend/vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // NO secure: false needed - we're not upgrading
        // NO ws: true needed - SSE uses HTTP only
      },
      '/streaming-ticker': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
});
```

**SSE Client Configuration**:

```javascript
// Frontend: /frontend/src/services/sse.ts
interface SSEConfig {
  url: string;
  withCredentials: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

const SSE_CONFIG: Record<string, SSEConfig> = {
  development: {
    url: '/streaming-ticker', // Proxied through Vite
    withCredentials: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10
  },
  production: {
    url: '/streaming-ticker', // Same origin
    withCredentials: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 20
  }
};

class SSEManager {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  connect(): Promise<EventSource> {
    return new Promise((resolve, reject) => {
      const env = import.meta.env.MODE;
      const config = SSE_CONFIG[env] || SSE_CONFIG.development;

      try {
        this.eventSource = new EventSource(config.url, {
          withCredentials: config.withCredentials
        });

        this.eventSource.onopen = () => {
          console.log('[SSE] Connection opened');
          this.reconnectAttempts = 0;
          resolve(this.eventSource!);
        };

        this.eventSource.onerror = (error) => {
          console.error('[SSE] Connection error:', error);
          this.handleError(config);
        };

      } catch (error) {
        console.error('[SSE] Failed to create EventSource:', error);
        reject(error);
      }
    });
  }

  private handleError(config: SSEConfig): void {
    this.eventSource?.close();

    if (this.reconnectAttempts < config.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[SSE] Reconnecting in ${config.reconnectInterval}ms (attempt ${this.reconnectAttempts})`);

      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, config.reconnectInterval);
    } else {
      console.error('[SSE] Max reconnection attempts reached');
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.eventSource?.close();
  }
}
```

### 3.2 Backend SSE Implementation

```javascript
// Backend: /api-server/server.js
app.get('/streaming-ticker', (req, res) => {
  // Validate origin
  const origin = req.headers.origin;
  if (!isValidOrigin(origin)) {
    return res.status(403).send('Forbidden');
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Send initial connection event
  res.write('event: connected\n');
  res.write(`data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);

  // Keep-alive ping every 30 seconds
  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(pingInterval);
    console.log('[SSE] Client disconnected');
  });

  // Error handling
  req.on('error', (error) => {
    console.error('[SSE] Request error:', error);
    clearInterval(pingInterval);
  });
});
```

---

## 4. Error Boundaries & Fallback Strategies

### 4.1 Connection Priority Hierarchy

```
┌─────────────────────────────────────────────────┐
│         Primary: Socket.IO (WebSocket)          │
│         Real-time bidirectional                 │
│         Latency: <50ms                          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼ (On failure)
┌─────────────────────────────────────────────────┐
│         Fallback 1: Socket.IO (Polling)         │
│         Real-time via long polling              │
│         Latency: ~200ms                         │
└────────────────┬────────────────────────────────┘
                 │
                 ▼ (On failure)
┌─────────────────────────────────────────────────┐
│         Fallback 2: SSE (Server-Sent Events)    │
│         One-way streaming                       │
│         Latency: ~500ms                         │
└────────────────┬────────────────────────────────┘
                 │
                 ▼ (On failure)
┌─────────────────────────────────────────────────┐
│         Fallback 3: HTTP Polling                │
│         Regular API calls (5s interval)         │
│         Latency: ~5000ms                        │
└─────────────────────────────────────────────────┘
```

### 4.2 Unified Connection Manager

```javascript
// Frontend: /frontend/src/services/ConnectionManager.ts
type ConnectionMode = 'socket.io' | 'sse' | 'polling' | 'offline';

interface ConnectionState {
  mode: ConnectionMode;
  connected: boolean;
  lastHeartbeat: number;
  reconnectAttempts: number;
  error: Error | null;
}

class UnifiedConnectionManager {
  private state: ConnectionState = {
    mode: 'socket.io',
    connected: false,
    lastHeartbeat: 0,
    reconnectAttempts: 0,
    error: null
  };

  private socketManager = new SocketManager();
  private sseManager = new SSEManager();
  private pollingTimer: NodeJS.Timeout | null = null;

  async connect(): Promise<void> {
    // Try Socket.IO first
    try {
      await this.socketManager.connect();
      this.setState({ mode: 'socket.io', connected: true });
      console.log('[Connection] Connected via Socket.IO');
      return;
    } catch (error) {
      console.warn('[Connection] Socket.IO failed, trying SSE', error);
    }

    // Fallback to SSE
    try {
      await this.sseManager.connect();
      this.setState({ mode: 'sse', connected: true });
      console.log('[Connection] Connected via SSE');
      return;
    } catch (error) {
      console.warn('[Connection] SSE failed, falling back to polling', error);
    }

    // Final fallback to polling
    this.startPolling();
    this.setState({ mode: 'polling', connected: true });
    console.log('[Connection] Using polling mode');
  }

  private startPolling(): void {
    this.pollingTimer = setInterval(async () => {
      try {
        await fetch('/api/feed/latest');
        this.state.lastHeartbeat = Date.now();
      } catch (error) {
        console.error('[Connection] Polling error:', error);
        this.setState({ connected: false, error: error as Error });
      }
    }, 5000);
  }

  disconnect(): void {
    this.socketManager.disconnect();
    this.sseManager.disconnect();
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
    this.setState({ connected: false });
  }

  getState(): ConnectionState {
    return { ...this.state };
  }

  private setState(updates: Partial<ConnectionState>): void {
    this.state = { ...this.state, ...updates };
    // Emit state change event for UI updates
    window.dispatchEvent(new CustomEvent('connection-state-change', {
      detail: this.state
    }));
  }
}
```

### 4.3 React Error Boundary Component

```typescript
// Frontend: /frontend/src/components/ConnectionErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  connectionMode: ConnectionMode;
}

export class ConnectionErrorBoundary extends Component<Props, State> {
  private connectionManager: UnifiedConnectionManager;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      connectionMode: 'socket.io'
    };
    this.connectionManager = new UnifiedConnectionManager();
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      connectionMode: 'offline'
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Connection error:', error, errorInfo);

    // Attempt recovery
    this.attemptRecovery();
  }

  async attemptRecovery(): Promise<void> {
    try {
      await this.connectionManager.connect();
      const state = this.connectionManager.getState();

      this.setState({
        hasError: false,
        error: null,
        connectionMode: state.mode
      });
    } catch (error) {
      console.error('[ErrorBoundary] Recovery failed:', error);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="connection-error">
          <h2>Connection Lost</h2>
          <p>Currently using: {this.state.connectionMode}</p>
          <button onClick={() => this.attemptRecovery()}>
            Retry Connection
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 5. Security Considerations

### 5.1 CORS Configuration Matrix

| Environment | Socket.IO Origin | SSE Origin | Credentials | Methods |
|-------------|------------------|------------|-------------|---------|
| Development | localhost:5173, localhost:3001 | localhost:5173 | true | GET, POST |
| Staging | https://staging.example.com | https://staging.example.com | true | GET, POST |
| Production | https://example.com | https://example.com | true | GET, POST |

### 5.2 Origin Validation

```javascript
// Backend: /api-server/middleware/validateOrigin.js
const ALLOWED_ORIGINS = {
  development: [
    'http://localhost:5173',
    'http://localhost:3001',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3001'
  ],
  production: [
    process.env.FRONTEND_URL,
    process.env.PRODUCTION_URL
  ].filter(Boolean)
};

export function isValidOrigin(origin: string | undefined): boolean {
  if (!origin) return false;

  const env = process.env.NODE_ENV || 'development';
  const allowedOrigins = ALLOWED_ORIGINS[env] || ALLOWED_ORIGINS.development;

  // Exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Pattern match for dynamic subdomains (production only)
  if (env === 'production' && process.env.ALLOW_SUBDOMAIN_PATTERN) {
    const pattern = new RegExp(process.env.ALLOW_SUBDOMAIN_PATTERN);
    return pattern.test(origin);
  }

  return false;
}

export function validateOriginMiddleware(req, res, next) {
  const origin = req.headers.origin;

  if (!isValidOrigin(origin)) {
    console.warn(`[Security] Invalid origin blocked: ${origin}`);
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  next();
}
```

### 5.3 Credential Handling

```javascript
// Frontend: Credential configuration
const CREDENTIAL_CONFIG = {
  socketIO: {
    withCredentials: true, // Send cookies
    extraHeaders: {
      'X-Client-Version': '1.0.0',
      'X-Client-Type': 'browser'
    }
  },
  sse: {
    withCredentials: true // Include cookies in EventSource
  },
  fetch: {
    credentials: 'include', // Include cookies in fetch
    headers: {
      'X-Client-Version': '1.0.0',
      'Content-Type': 'application/json'
    }
  }
};
```

### 5.4 Rate Limiting

```javascript
// Backend: Rate limiting per connection type
import rateLimit from 'express-rate-limit';

const socketIOLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 connections per minute
  message: 'Too many Socket.IO connections',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  }
});

const sseLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30, // 30 SSE connections per minute
  message: 'Too many SSE connections'
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100, // 100 API requests per minute
  message: 'Too many API requests'
});
```

### 5.5 Authentication & Authorization

```javascript
// Backend: Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const user = await verifyToken(token);

    if (!user) {
      return next(new Error('Invalid authentication token'));
    }

    // Attach user to socket
    socket.data.user = user;
    next();

  } catch (error) {
    console.error('[Socket.IO] Authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Room-based authorization
io.on('connection', (socket) => {
  socket.on('join-feed', async (feedId) => {
    const hasAccess = await checkFeedAccess(socket.data.user.id, feedId);

    if (hasAccess) {
      socket.join(`feed:${feedId}`);
    } else {
      socket.emit('error', { message: 'Access denied to feed' });
    }
  });
});
```

---

## 6. Testing Strategy

### 6.1 Connection Testing Matrix

| Test Type | Socket.IO | SSE | Polling | Tools |
|-----------|-----------|-----|---------|-------|
| Unit | ✓ | ✓ | ✓ | Jest, Vitest |
| Integration | ✓ | ✓ | ✓ | Playwright |
| E2E | ✓ | ✓ | ✓ | Cypress |
| Load | ✓ | ✓ | ✓ | Artillery |
| Security | ✓ | ✓ | ✓ | OWASP ZAP |

### 6.2 Unit Tests

```typescript
// Tests: /tests/unit/SocketManager.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SocketManager } from '@/services/SocketManager';
import { io } from 'socket.io-client';

vi.mock('socket.io-client');

describe('SocketManager', () => {
  let manager: SocketManager;
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn(),
      emit: vi.fn(),
      connected: false
    };

    (io as any).mockReturnValue(mockSocket);
    manager = new SocketManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create direct connection in development', async () => {
    import.meta.env.MODE = 'development';

    await manager.connect();

    expect(io).toHaveBeenCalledWith(
      'http://localhost:3001',
      expect.objectContaining({
        path: '/socket.io',
        transports: ['websocket', 'polling']
      })
    );
  });

  it('should handle connection errors gracefully', async () => {
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'connect_error') {
        callback(new Error('Connection failed'));
      }
    });

    await expect(manager.connect()).rejects.toThrow('Connection failed');
  });

  it('should fallback to polling on WebSocket failure', async () => {
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'connect') {
        mockSocket.connected = true;
        callback();
      }
    });

    await manager.connect();

    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
  });

  it('should cleanup resources on disconnect', () => {
    manager.disconnect();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
```

### 6.3 Integration Tests

```typescript
// Tests: /tests/integration/connection-flow.test.ts
import { test, expect } from '@playwright/test';

test.describe('Connection Flow', () => {
  test('should establish Socket.IO connection directly', async ({ page }) => {
    // Monitor network requests
    const socketRequests: string[] = [];

    page.on('websocket', ws => {
      console.log('WebSocket created:', ws.url());
      socketRequests.push(ws.url());
    });

    await page.goto('http://localhost:5173');

    // Wait for Socket.IO connection
    await page.waitForTimeout(2000);

    // Verify direct connection to backend (not through Vite)
    expect(socketRequests.some(url =>
      url.includes('localhost:3001')
    )).toBeTruthy();
  });

  test('should fallback to SSE on Socket.IO failure', async ({ page, context }) => {
    // Block Socket.IO connections
    await context.route('**/socket.io/**', route => route.abort());

    await page.goto('http://localhost:5173');

    // Wait for SSE connection
    const sseResponse = await page.waitForResponse(
      response => response.url().includes('/streaming-ticker')
    );

    expect(sseResponse.ok()).toBeTruthy();
    expect(sseResponse.headers()['content-type']).toBe('text/event-stream');
  });

  test('should maintain connection across page navigation', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Verify initial connection
    await page.waitForSelector('[data-connection-status="connected"]');

    // Navigate to different route
    await page.click('[href="/feed"]');

    // Connection should persist
    await expect(page.locator('[data-connection-status="connected"]')).toBeVisible();
  });
});
```

### 6.4 E2E Tests

```typescript
// Tests: /tests/e2e/realtime-updates.test.ts
import { test, expect } from '@playwright/test';

test.describe('Real-time Updates', () => {
  test('should receive real-time posts via Socket.IO', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for connection
    await page.waitForSelector('[data-connection-status="connected"]');

    // Trigger post creation from backend
    const response = await page.request.post('http://localhost:3001/api/posts', {
      data: {
        content: 'Test post for E2E',
        agentId: 'test-agent'
      }
    });

    expect(response.ok()).toBeTruthy();

    // Verify post appears in real-time (within 1 second)
    await expect(page.locator('text=Test post for E2E')).toBeVisible({ timeout: 1000 });
  });

  test('should sync across multiple browser tabs', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('http://localhost:5173');
    await page2.goto('http://localhost:5173');

    // Both tabs connected
    await page1.waitForSelector('[data-connection-status="connected"]');
    await page2.waitForSelector('[data-connection-status="connected"]');

    // Create post in tab 1
    await page1.click('[data-action="create-post"]');
    await page1.fill('[name="content"]', 'Multi-tab sync test');
    await page1.click('[type="submit"]');

    // Verify appears in tab 2
    await expect(page2.locator('text=Multi-tab sync test')).toBeVisible({ timeout: 2000 });
  });
});
```

### 6.5 Load Testing

```yaml
# Tests: /tests/load/connection-stress.yml
config:
  target: "http://localhost:3001"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 120
      arrivalRate: 100
      name: "Peak load"
  socketio:
    transports: ["websocket", "polling"]

scenarios:
  - name: "Socket.IO Connection Stress"
    engine: socketio
    flow:
      - connect:
          namespace: "/"
          auth:
            token: "test-token"
      - think: 5
      - emit:
          channel: "subscribe"
          data:
            feed: "global"
      - wait:
          seconds: 30
      - emit:
          channel: "unsubscribe"
      - disconnect

  - name: "SSE Connection Stress"
    flow:
      - get:
          url: "/streaming-ticker"
          headers:
            Accept: "text/event-stream"
          capture:
            - json: "$.data"
              as: "eventData"
      - think: 30
```

### 6.6 Connection Health Checks

```typescript
// Tests: /tests/health/connection-monitor.ts
import { describe, it, expect } from 'vitest';
import { io } from 'socket.io-client';

describe('Connection Health Monitoring', () => {
  it('should respond to ping within 100ms', async () => {
    const socket = io('http://localhost:3001');

    await new Promise(resolve => socket.on('connect', resolve));

    const start = Date.now();

    socket.emit('ping', Date.now(), (response: number) => {
      const latency = Date.now() - start;
      expect(latency).toBeLessThan(100);
    });
  });

  it('should maintain connection for 5 minutes', async () => {
    const socket = io('http://localhost:3001');
    let disconnected = false;

    socket.on('disconnect', () => {
      disconnected = true;
    });

    await new Promise(resolve => socket.on('connect', resolve));

    // Wait 5 minutes
    await new Promise(resolve => setTimeout(resolve, 300000));

    expect(disconnected).toBe(false);
    expect(socket.connected).toBe(true);
  });

  it('should reconnect within 5 seconds after network interruption', async () => {
    const socket = io('http://localhost:3001', {
      reconnection: true,
      reconnectionDelay: 1000
    });

    await new Promise(resolve => socket.on('connect', resolve));

    // Simulate network interruption
    socket.disconnect();

    const reconnectStart = Date.now();

    await new Promise(resolve => {
      socket.on('reconnect', () => {
        const reconnectTime = Date.now() - reconnectStart;
        expect(reconnectTime).toBeLessThan(5000);
        resolve(true);
      });
    });
  });
});
```

---

## 7. Monitoring & Observability

### 7.1 Connection Metrics

```javascript
// Backend: Connection metrics tracking
import prometheus from 'prom-client';

const socketIOConnections = new prometheus.Gauge({
  name: 'socketio_connections_total',
  help: 'Total number of active Socket.IO connections'
});

const sseConnections = new prometheus.Gauge({
  name: 'sse_connections_total',
  help: 'Total number of active SSE connections'
});

const connectionErrors = new prometheus.Counter({
  name: 'connection_errors_total',
  help: 'Total number of connection errors',
  labelNames: ['type', 'reason']
});

const messageLatency = new prometheus.Histogram({
  name: 'message_latency_seconds',
  help: 'Message delivery latency',
  labelNames: ['type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

// Track Socket.IO connections
io.on('connection', (socket) => {
  socketIOConnections.inc();

  socket.on('disconnect', () => {
    socketIOConnections.dec();
  });

  socket.on('error', (error) => {
    connectionErrors.inc({ type: 'socketio', reason: error.message });
  });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

### 7.2 Logging Strategy

```javascript
// Backend: Structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/connection-error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/connection-combined.log'
    })
  ]
});

// Log connection events
io.on('connection', (socket) => {
  logger.info('Socket.IO connection established', {
    socketId: socket.id,
    transport: socket.conn.transport.name,
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent']
  });
});
```

---

## 8. Deployment Architecture

### 8.1 Docker Composition

```yaml
# docker-compose.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./dist:/usr/share/nginx/html
    depends_on:
      - backend

  backend:
    build: ./api-server
    environment:
      NODE_ENV: production
      PORT: 3001
      FRONTEND_URL: https://example.com
    volumes:
      - ./database.db:/app/database.db
    expose:
      - "3001"
```

### 8.2 Nginx Configuration

```nginx
# nginx.conf
upstream backend {
    server backend:3001;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Socket.IO WebSocket upgrade
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # SSE endpoint
    location /streaming-ticker {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # SSE-specific settings
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 24h;
        chunked_transfer_encoding off;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Static frontend
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 9. Performance Optimization

### 9.1 Connection Pooling

```javascript
// Backend: Database connection pooling
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbPool = await open({
  filename: './database.db',
  driver: sqlite3.Database
});

// Configure connection pool
dbPool.configure('busyTimeout', 10000);
dbPool.configure('limit', 100);
```

### 9.2 Message Compression

```javascript
// Backend: Enable compression for Socket.IO
io.on('connection', (socket) => {
  socket.compress(true).emit('message', largeData);
});
```

### 9.3 CDN & Caching

```javascript
// Frontend: Service Worker for caching
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/socket.io/')) {
    // Never cache WebSocket connections
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
```

---

## 10. Summary & Best Practices

### 10.1 Key Architectural Decisions

1. **Socket.IO Direct Connection**: Bypass Vite proxy in development
2. **SSE Proxied Connection**: Keep using Vite proxy (HTTP only)
3. **Fallback Hierarchy**: Socket.IO → SSE → Polling → Offline
4. **Origin Validation**: Strict CORS enforcement
5. **Connection Pooling**: Efficient resource management

### 10.2 Implementation Checklist

- [ ] Update Socket.IO client to use direct connection (`http://localhost:3001`)
- [ ] Keep SSE using Vite proxy (`/streaming-ticker`)
- [ ] Implement UnifiedConnectionManager for fallbacks
- [ ] Add ConnectionErrorBoundary component
- [ ] Configure CORS for all connection types
- [ ] Add rate limiting per connection type
- [ ] Implement authentication middleware
- [ ] Create unit tests for all connection types
- [ ] Create integration tests for fallback scenarios
- [ ] Create E2E tests for real-time updates
- [ ] Set up connection health monitoring
- [ ] Configure logging and metrics
- [ ] Update Nginx configuration for production
- [ ] Document deployment process

### 10.3 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Socket.IO Connection Time | <500ms | TBD |
| SSE Connection Time | <1000ms | TBD |
| Message Latency (Socket.IO) | <50ms | TBD |
| Message Latency (SSE) | <200ms | TBD |
| Reconnection Time | <5s | TBD |
| Concurrent Connections | 10,000+ | TBD |
| Uptime | 99.9% | TBD |

---

## Appendix

### A. Environment Variables

```bash
# .env.development
VITE_SOCKET_URL=http://localhost:3001
VITE_API_URL=/api
VITE_SSE_URL=/streaming-ticker

# .env.production
VITE_SOCKET_URL=
VITE_API_URL=/api
VITE_SSE_URL=/streaming-ticker
```

### B. TypeScript Type Definitions

```typescript
// types/connections.ts
export type TransportType = 'websocket' | 'polling' | 'sse' | 'http';
export type ConnectionMode = 'socket.io' | 'sse' | 'polling' | 'offline';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ConnectionConfig {
  url: string;
  options: {
    transports?: TransportType[];
    reconnection?: boolean;
    reconnectionAttempts?: number;
    timeout?: number;
    withCredentials?: boolean;
  };
}

export interface ConnectionState {
  mode: ConnectionMode;
  status: ConnectionStatus;
  connected: boolean;
  lastHeartbeat: number;
  reconnectAttempts: number;
  error: Error | null;
  latency: number;
}
```

### C. References

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Server-Sent Events Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Vite Proxy Configuration](https://vitejs.dev/config/server-options.html#server-proxy)
- [CORS Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [WebSocket Protocol RFC](https://datatracker.ietf.org/doc/html/rfc6455)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-26
**Author**: SPARC Architecture Agent
**Status**: Ready for Review
