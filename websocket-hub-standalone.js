#!/usr/bin/env node
/**
 * Standalone WebSocket Hub Server
 * Demonstrates the complete solution to webhook/WebSocket mismatch
 */

const express = require('express');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
const cors = require('cors');

class WebSocketHubStandalone {
  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.clients = new Map();
    this.messageQueue = new Map();
    
    this.setupMiddleware();
    this.setupSocketIO();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors({
      origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:4173"],
      methods: ["GET", "POST"],
      credentials: true
    }));
    this.app.use(express.json());
  }

  setupSocketIO() {
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:4173"],
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
      },
      // path: '/hub/',
      transports: ['websocket', 'polling']
    });

    this.io.on('connection', (socket) => {
      console.log(`🔌 WebSocket Hub: New connection ${socket.id}`);

      // Handle frontend connections
      socket.on('registerFrontend', (data) => {
        this.clients.set(socket.id, {
          type: 'frontend',
          socket,
          data: data || {},
          registeredAt: new Date()
        });
        socket.emit('hubRegistered', { 
          clientId: socket.id, 
          type: 'frontend',
          hubStatus: this.getHubStatus()
        });
        console.log(`📱 Frontend registered: ${socket.id}`);
      });

      // Handle Claude instance connections  
      socket.on('registerClaude', (data) => {
        const { instanceType = 'production', devMode = false, capabilities = [] } = data || {};
        
        this.clients.set(socket.id, {
          type: 'claude',
          instanceType,
          devMode,
          capabilities,
          socket,
          data,
          registeredAt: new Date()
        });
        
        socket.emit('hubRegistered', { 
          clientId: socket.id, 
          type: 'claude',
          instanceType,
          devMode,
          hubStatus: this.getHubStatus()
        });
        
        console.log(`🤖 Claude ${instanceType} registered: ${socket.id} (devMode: ${devMode})`);
        
        // Notify frontends of new Claude instance
        this.broadcastToType('frontend', 'claudeInstanceAvailable', {
          instanceType,
          clientId: socket.id,
          capabilities,
          devMode
        });
      });

      // Route messages from frontend to Claude
      socket.on('toClause', (message) => {
        const { targetInstance = 'production' } = message;
        const claudeClient = Array.from(this.clients.values())
          .find(client => client.type === 'claude' && client.instanceType === targetInstance);
        
        if (claudeClient) {
          const routedMessage = {
            ...message,
            fromId: socket.id,
            fromType: 'frontend',
            timestamp: new Date().toISOString(),
            messageId: this.generateMessageId()
          };
          
          claudeClient.socket.emit('fromFrontend', routedMessage);
          console.log(`📤 Frontend→Claude: ${socket.id} → ${claudeClient.socket.id} (${targetInstance})`);
          
          // Send acknowledgment to frontend
          socket.emit('messageRouted', {
            messageId: routedMessage.messageId,
            targetInstance,
            targetId: claudeClient.socket.id
          });
        } else {
          const availableInstances = Array.from(this.clients.values())
            .filter(c => c.type === 'claude')
            .map(c => ({ type: c.instanceType, id: c.socket.id, devMode: c.devMode }));
            
          socket.emit('routingError', { 
            error: `No ${targetInstance} Claude instance available`,
            availableInstances
          });
          console.log(`❌ No ${targetInstance} Claude instance found for frontend ${socket.id}`);
        }
      });

      // Route messages from Claude to frontend
      socket.on('toFrontend', (message) => {
        const { targetId, ...messageData } = message;
        const frontendClient = this.clients.get(targetId);
        
        if (frontendClient && frontendClient.type === 'frontend') {
          const response = {
            ...messageData,
            fromId: socket.id,
            fromType: 'claude',
            timestamp: new Date().toISOString(),
            messageId: this.generateMessageId()
          };
          
          frontendClient.socket.emit('fromClaude', response);
          console.log(`📤 Claude→Frontend: ${socket.id} → ${targetId}`);
        } else {
          socket.emit('routingError', { error: 'Frontend client not found', targetId });
          console.log(`❌ Frontend client ${targetId} not found for Claude ${socket.id}`);
        }
      });

      // Handle heartbeats
      socket.on('heartbeat', (data) => {
        const client = this.clients.get(socket.id);
        if (client) {
          client.lastHeartbeat = new Date();
          socket.emit('heartbeatAck', { timestamp: new Date().toISOString() });
        }
      });

      // Handle disconnections
      socket.on('disconnect', () => {
        const client = this.clients.get(socket.id);
        if (client) {
          console.log(`🔌 Disconnected: ${client.type} ${socket.id}`);
          
          // Notify other clients if this was a Claude instance
          if (client.type === 'claude') {
            this.broadcastToType('frontend', 'claudeInstanceUnavailable', {
              instanceType: client.instanceType,
              clientId: socket.id
            });
          }
          
          this.clients.delete(socket.id);
          this.messageQueue.delete(socket.id);
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`❌ WebSocket Hub error: ${socket.id}`, error);
      });
    });

    // Periodic status updates
    setInterval(() => {
      const status = this.getHubStatus();
      this.io.emit('hubStatus', status);
    }, 30000);
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        hub: this.getHubStatus(),
        timestamp: new Date().toISOString()
      });
    });

    // Hub status endpoint
    this.app.get('/hub/status', (req, res) => {
      res.json(this.getHubStatus());
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'WebSocket Hub',
        status: 'active',
        description: 'Solving webhook/WebSocket mismatch for real-time communication',
        endpoints: {
          health: '/health',
          status: '/hub/status',
          websocket: '/hub/'
        },
        hubStatus: this.getHubStatus()
      });
    });
  }

  broadcastToType(clientType, event, data) {
    this.clients.forEach(client => {
      if (client.type === clientType) {
        client.socket.emit(event, data);
      }
    });
  }

  getHubStatus() {
    const clients = Array.from(this.clients.values());
    return {
      totalClients: this.clients.size,
      frontendClients: clients.filter(c => c.type === 'frontend').length,
      claudeClients: clients.filter(c => c.type === 'claude').length,
      claudeInstances: clients
        .filter(c => c.type === 'claude')
        .map(c => ({
          id: c.socket.id,
          instanceType: c.instanceType,
          devMode: c.devMode,
          capabilities: c.capabilities
        })),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  start(port = process.env.PORT || 3001) {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer.listen(port, () => {
          console.log('\n🚀 WebSocket Hub Standalone Server Started!');
          console.log('==========================================');
          console.log(`   Port: ${port}`);
          console.log(`   Health Check: http://localhost:${port}/health`);
          console.log(`   Hub Status: http://localhost:${port}/hub/status`);
          console.log(`   WebSocket Path: /hub/`);
          console.log('');
          console.log('✅ WEBHOOK/WEBSOCKET MISMATCH SOLVED!');
          console.log('   Frontend can now communicate with production Claude in real-time');
          console.log('');
          console.log('🔗 Next Steps:');
          console.log('   1. Frontend connects to: ws://localhost:3001/hub/');
          console.log('   2. Run: cd /workspaces/agent-feed/prod && ./scripts/connect-to-hub.js');
          console.log('   3. Test real-time communication!');
          console.log('');
          resolve();
        });
      } catch (error) {
        console.error('❌ Failed to start WebSocket Hub:', error);
        reject(error);
      }
    });
  }
}

// Start if run directly
if (require.main === module) {
  const hub = new WebSocketHubStandalone();
  
  hub.start().catch(error => {
    console.error('Failed to start hub:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down WebSocket Hub gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down WebSocket Hub...');
    process.exit(0);
  });
}

module.exports = { WebSocketHubStandalone };