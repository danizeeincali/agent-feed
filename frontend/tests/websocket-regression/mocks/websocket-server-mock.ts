import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';

// Mock WebSocket Hub Server for testing
export const mockWebSocketHub = {
  server: null as any,
  io: null as any,
  port: 3002,
  clients: new Map(),
  
  start: async () => {
    const httpServer = createServer();
    mockWebSocketHub.server = httpServer;
    mockWebSocketHub.io = new SocketIOServer(httpServer, {
      cors: { origin: '*' }
    });
    
    // Setup mock handlers
    mockWebSocketHub.io.on('connection', (socket: any) => {
      mockWebSocketHub.clients.set(socket.id, socket);
      
      socket.on('registerFrontend', (data: any) => {
        socket.emit('hubRegistered', {
          clientId: socket.id,
          type: 'frontend',
          hubStatus: mockWebSocketHub.getHubStatus()
        });
      });
      
      socket.on('registerClaude', (data: any) => {
        socket.emit('hubRegistered', {
          clientId: socket.id,
          type: 'claude',
          instanceType: data.instanceType || 'production'
        });
      });
      
      socket.on('heartbeat', (data: any) => {
        socket.emit('heartbeatAck', {
          timestamp: new Date().toISOString(),
          hubUptime: Date.now(),
          connectionQuality: 'excellent'
        });
      });
      
      socket.on('disconnect', () => {
        mockWebSocketHub.clients.delete(socket.id);
      });
    });
    
    return new Promise((resolve) => {
      httpServer.listen(mockWebSocketHub.port, () => {
        resolve(void 0);
      });
    });
  },
  
  stop: async () => {
    if (mockWebSocketHub.server) {
      mockWebSocketHub.server.close();
      mockWebSocketHub.clients.clear();
    }
  },
  
  getHubStatus: () => ({
    totalClients: mockWebSocketHub.clients.size,
    frontendClients: 0,
    claudeClients: 0,
    port: mockWebSocketHub.port,
    uptime: Date.now(),
    timestamp: new Date().toISOString()
  }),
  
  simulateConnectionError: () => {
    mockWebSocketHub.clients.forEach((socket) => {
      socket.disconnect(true);
    });
  },
  
  simulateNetworkLatency: (ms: number) => {
    // Add artificial delay to responses
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// MSW Server for REST API mocking
export const server = setupServer(
  // Mock WebSocket Hub health endpoint
  rest.get('http://localhost:3002/health', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'healthy',
        port: 3002,
        uptime: Date.now(),
        metrics: {
          connections: mockWebSocketHub.clients.size,
          messages: 0,
          errors: 0
        },
        timestamp: new Date().toISOString()
      })
    );
  }),
  
  // Mock hub status endpoint
  rest.get('http://localhost:3002/hub/status', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockWebSocketHub.getHubStatus())
    );
  }),
  
  // Mock test endpoint
  rest.get('http://localhost:3002/test', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        message: 'WebSocket Hub is operational',
        timestamp: new Date().toISOString(),
        port: 3002
      })
    );
  })
);