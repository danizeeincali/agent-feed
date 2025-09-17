/**
 * Mock API Server for Integration Testing
 * Provides isolated testing environment with controllable responses
 */

import express from 'express';
import { Server } from 'http';
import { EventEmitter } from 'events';
import cors from 'cors';
import {
  aviChatTestMessages,
  claudeCodeTestMessages,
  streamingTickerTestData,
  errorTestCases,
  createTestResponse,
  delay
} from '../fixtures/test-data';

export interface MockServerConfig {
  port?: number;
  cors?: boolean;
  rateLimiting?: boolean;
  requestDelay?: number;
  errorRate?: number;
  logging?: boolean;
}

export interface MockResponse {
  status: number;
  data: any;
  delay?: number;
  headers?: Record<string, string>;
}

export class MockApiServer extends EventEmitter {
  private app: express.Application;
  private server: Server | null = null;
  private port: number;
  private config: MockServerConfig;
  private requestCount = 0;
  private responseOverrides = new Map<string, MockResponse>();
  private middleware: express.RequestHandler[] = [];

  constructor(config: MockServerConfig = {}) {
    super();
    this.config = {
      port: 3001,
      cors: true,
      rateLimiting: false,
      requestDelay: 0,
      errorRate: 0,
      logging: true,
      ...config
    };
    this.port = this.config.port!;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS
    if (this.config.cors) {
      this.app.use(cors());
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request counting and logging
    this.app.use((req, res, next) => {
      this.requestCount++;

      if (this.config.logging) {
        console.log(`[MockServer] ${req.method} ${req.path} - Request #${this.requestCount}`);
      }

      this.emit('request', {
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query,
        headers: req.headers,
        count: this.requestCount
      });

      next();
    });

    // Rate limiting simulation
    if (this.config.rateLimiting) {
      this.app.use(this.rateLimitMiddleware.bind(this));
    }

    // Request delay simulation
    if (this.config.requestDelay && this.config.requestDelay > 0) {
      this.app.use(async (req, res, next) => {
        await delay(this.config.requestDelay!);
        next();
      });
    }

    // Error rate simulation
    if (this.config.errorRate && this.config.errorRate > 0) {
      this.app.use(this.errorRateMiddleware.bind(this));
    }

    // Custom middleware
    this.middleware.forEach(mw => this.app.use(mw));
  }

  private rateLimitMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
    const windowSize = 60000; // 1 minute
    const maxRequests = 100;
    const now = Date.now();
    const window = Math.floor(now / windowSize);
    const key = `${req.ip}:${window}`;

    // Simple in-memory rate limiting (not production-ready)
    const requests = (this as any).rateLimitStore?.get(key) || 0;

    if (requests >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        retryAfter: windowSize - (now % windowSize)
      });
    }

    if (!(this as any).rateLimitStore) {
      (this as any).rateLimitStore = new Map();
    }
    (this as any).rateLimitStore.set(key, requests + 1);

    next();
  }

  private errorRateMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
    if (Math.random() < this.config.errorRate!) {
      const errors = Object.values(errorTestCases);
      const randomError = errors[Math.floor(Math.random() * errors.length)];

      return res.status(randomError.mockResponse.status).json({
        success: false,
        error: randomError.mockResponse.error,
        simulatedError: true
      });
    }

    next();
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        requestCount: this.requestCount,
        uptime: process.uptime()
      });
    });

    // Mock Avi Chat API
    this.setupAviChatRoutes();

    // Mock Claude Code API
    this.setupClaudeCodeRoutes();

    // Mock Streaming Ticker API
    this.setupStreamingTickerRoutes();

    // Generic test endpoints
    this.setupTestRoutes();

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        path: req.originalUrl,
        method: req.method
      });
    });

    // Error handler
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('[MockServer] Error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message
      });
    });
  }

  private setupAviChatRoutes(): void {
    // POST /api/avi/streaming-chat
    this.app.post('/api/avi/streaming-chat', async (req, res) => {
      const { message, options = {} } = req.body;
      const routeKey = `POST:/api/avi/streaming-chat`;

      if (this.responseOverrides.has(routeKey)) {
        const override = this.responseOverrides.get(routeKey)!;
        if (override.delay) await delay(override.delay);
        return res.status(override.status).json(override.data);
      }

      if (!message || typeof message !== 'string') {
        return res.status(400).json(aviChatTestMessages.empty.expected);
      }

      // Simulate processing delay
      await delay(Math.random() * 1000 + 500);

      const response = createTestResponse({
        responses: [{
          content: `Mock Avi response to: ${message.substring(0, 50)}...`,
          role: 'assistant',
          timestamp: new Date().toISOString()
        }]
      });

      res.json(response);
    });

    // GET /api/avi/health
    this.app.get('/api/avi/health', (req, res) => {
      res.json({
        success: true,
        healthy: true,
        status: { initialized: true, ready: true },
        timestamp: new Date().toISOString()
      });
    });

    // GET /api/avi/status
    this.app.get('/api/avi/status', (req, res) => {
      res.json({
        success: true,
        status: {
          initialized: true,
          ready: true,
          apiKeyConfigured: true,
          requestCount: this.requestCount
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupClaudeCodeRoutes(): void {
    // POST /api/claude-code/streaming-chat
    this.app.post('/api/claude-code/streaming-chat', async (req, res) => {
      const { message, options = {} } = req.body;
      const routeKey = `POST:/api/claude-code/streaming-chat`;

      if (this.responseOverrides.has(routeKey)) {
        const override = this.responseOverrides.get(routeKey)!;
        if (override.delay) await delay(override.delay);
        return res.status(override.status).json(override.data);
      }

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Message is required and must be a string'
        });
      }

      // Simulate tool execution delay
      await delay(Math.random() * 2000 + 1000);

      const mockToolResults = this.generateMockToolResults(message, options);

      res.json({
        success: true,
        message: `Mock Claude Code response for: ${message.substring(0, 50)}...`,
        responses: mockToolResults,
        timestamp: new Date().toISOString(),
        claudeCode: true,
        toolsEnabled: true
      });
    });

    // GET /api/claude-code/health
    this.app.get('/api/claude-code/health', (req, res) => {
      res.json({
        success: true,
        healthy: true,
        timestamp: new Date().toISOString(),
        toolsEnabled: true,
        claudeCode: true
      });
    });

    // GET /api/claude-code/status
    this.app.get('/api/claude-code/status', (req, res) => {
      res.json({
        success: true,
        status: {
          initialized: true,
          toolsEnabled: true,
          activeSession: null,
          requestCount: this.requestCount
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupStreamingTickerRoutes(): void {
    // GET /api/streaming-ticker/stream (SSE)
    this.app.get('/api/streaming-ticker/stream', (req, res) => {
      const userId = req.query.userId || 'anonymous';

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial connection event
      this.sendSSEEvent(res, 'connection', {
        connectionId: `mock-${Date.now()}`,
        userId,
        timestamp: Date.now()
      });

      // Simulate periodic updates
      const interval = setInterval(() => {
        const event = streamingTickerTestData.toolActivity;
        this.sendSSEEvent(res, event.type, {
          ...event.data,
          timestamp: Date.now(),
          mock: true
        });
      }, 2000);

      // Handle client disconnect
      req.on('close', () => {
        clearInterval(interval);
        console.log('[MockServer] SSE client disconnected');
      });

      req.on('error', (err) => {
        clearInterval(interval);
        console.error('[MockServer] SSE error:', err);
      });
    });

    // POST /api/streaming-ticker/message
    this.app.post('/api/streaming-ticker/message', (req, res) => {
      const { message, connectionId, type = 'custom' } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      res.json({
        sent: true,
        connectionId: connectionId || 'broadcast',
        message,
        type,
        timestamp: Date.now()
      });
    });

    // GET /api/streaming-ticker/stats
    this.app.get('/api/streaming-ticker/stats', (req, res) => {
      res.json({
        activeConnections: Math.floor(Math.random() * 10),
        totalMessages: this.requestCount * 3,
        uptime: process.uptime() * 1000,
        timestamp: Date.now()
      });
    });
  }

  private setupTestRoutes(): void {
    // Endpoint for testing timeouts
    this.app.get('/test/timeout/:seconds', async (req, res) => {
      const seconds = parseInt(req.params.seconds);
      await delay(seconds * 1000);
      res.json({ delayed: seconds, timestamp: Date.now() });
    });

    // Endpoint for testing specific status codes
    this.app.get('/test/status/:code', (req, res) => {
      const code = parseInt(req.params.code);
      res.status(code).json({
        statusCode: code,
        message: `Test response with status ${code}`,
        timestamp: Date.now()
      });
    });

    // Endpoint for testing large payloads
    this.app.post('/test/large-payload', (req, res) => {
      const size = Buffer.byteLength(JSON.stringify(req.body));
      res.json({
        received: true,
        payloadSize: size,
        timestamp: Date.now()
      });
    });

    // Endpoint for testing concurrent requests
    this.app.get('/test/concurrent/:id', async (req, res) => {
      const id = req.params.id;
      const delay_ms = Math.random() * 1000 + 500;
      await delay(delay_ms);
      res.json({
        id,
        delay: delay_ms,
        timestamp: Date.now(),
        requestCount: this.requestCount
      });
    });
  }

  private generateMockToolResults(message: string, options: any): any[] {
    const results = [];

    if (message.includes('read') || message.includes('file')) {
      results.push({
        tool: 'Read',
        result: 'Mock file content',
        timestamp: Date.now()
      });
    }

    if (message.includes('ls') || message.includes('bash') || message.includes('command')) {
      results.push({
        tool: 'Bash',
        result: 'drwxr-xr-x 2 user user 4096 Jan 1 12:00 mock-dir\n-rw-r--r-- 1 user user 1234 Jan 1 12:00 mock-file.txt',
        timestamp: Date.now()
      });
    }

    if (message.includes('search') || message.includes('grep')) {
      results.push({
        tool: 'Grep',
        result: ['mock-file-1.js', 'mock-file-2.ts'],
        timestamp: Date.now()
      });
    }

    return results.length > 0 ? results : [{
      tool: 'thinking',
      result: 'Mock response generated',
      timestamp: Date.now()
    }];
  }

  private sendSSEEvent(res: express.Response, event: string, data: any): void {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Public methods for test control
  public setResponseOverride(route: string, response: MockResponse): void {
    this.responseOverrides.set(route, response);
  }

  public clearResponseOverride(route: string): void {
    this.responseOverrides.delete(route);
  }

  public clearAllOverrides(): void {
    this.responseOverrides.clear();
  }

  public addMiddleware(middleware: express.RequestHandler): void {
    this.middleware.push(middleware);
  }

  public getRequestCount(): number {
    return this.requestCount;
  }

  public resetRequestCount(): void {
    this.requestCount = 0;
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          if (this.config.logging) {
            console.log(`[MockServer] Started on port ${this.port}`);
          }
          this.emit('started', { port: this.port });
          resolve();
        });

        this.server.on('error', (err) => {
          console.error('[MockServer] Server error:', err);
          this.emit('error', err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          console.error('[MockServer] Error stopping server:', err);
          reject(err);
        } else {
          if (this.config.logging) {
            console.log('[MockServer] Stopped');
          }
          this.emit('stopped');
          this.server = null;
          resolve();
        }
      });
    });
  }

  public isRunning(): boolean {
    return this.server !== null;
  }

  public getUrl(): string {
    return `http://localhost:${this.port}`;
  }

  public getApp(): express.Application {
    return this.app;
  }
}

export default MockApiServer;