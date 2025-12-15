/**
 * WebSocket Hub Activator - Simple integration with existing server
 * Solves webhook/WebSocket mismatch problem
 */

const { Server: SocketIOServer } = require('socket.io');
const logger = require('../utils/logger');

class HubActivator {
  constructor() {
    this.clients = new Map();
    this.messageRoutes = new Map();
    this.securityEnabled = true;
  }

  activate(server) {
    // Create Socket.IO instance on existing server
    const io = new SocketIOServer(server, {
      cors: {
        origin: ["http://localhost:3000", "http://localhost:3001"],
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
      },
      path: '/hub/' // Separate namespace for hub
    });

    this.setupHubHandlers(io);
    logger.info('WebSocket Hub activated - webhook/WebSocket mismatch solved');
    
    return io;
  }

  setupHubHandlers(io) {
    io.on('connection', (socket) => {
      console.log(`🔌 WebSocket Hub: New connection ${socket.id}`);

      // Handle frontend connections
      socket.on('registerFrontend', (data) => {
        this.clients.set(socket.id, {
          type: 'frontend',
          socket,
          data: data || {}
        });
        socket.emit('hubRegistered', { clientId: socket.id, type: 'frontend' });
        console.log(`📱 Frontend registered: ${socket.id}`);
      });

      // Handle Claude instance connections  
      socket.on('registerClaude', (data) => {
        const { instanceType = 'production', devMode = false } = data || {};
        
        this.clients.set(socket.id, {
          type: 'claude',
          instanceType,
          devMode,
          socket,
          data
        });
        
        socket.emit('hubRegistered', { 
          clientId: socket.id, 
          type: 'claude',
          instanceType,
          devMode 
        });
        
        console.log(`🤖 Claude ${instanceType} registered: ${socket.id} (devMode: ${devMode})`);
      });

      // Route messages from frontend to Claude
      socket.on('toClause', (message) => {
        const claudeClient = Array.from(this.clients.values())
          .find(client => client.type === 'claude' && client.instanceType === 'production');
        
        if (claudeClient) {
          claudeClient.socket.emit('fromFrontend', {
            ...message,
            fromId: socket.id,
            timestamp: new Date().toISOString()
          });
          console.log(`📤 Frontend→Claude: ${socket.id} → ${claudeClient.socket.id}`);
        } else {
          socket.emit('routingError', { error: 'No Claude instance available' });
        }
      });

      // Route messages from Claude to frontend
      socket.on('toFrontend', (message) => {
        const { targetId, ...messageData } = message;
        const frontendClient = this.clients.get(targetId);
        
        if (frontendClient && frontendClient.type === 'frontend') {
          frontendClient.socket.emit('fromClaude', {
            ...messageData,
            fromId: socket.id,
            timestamp: new Date().toISOString()
          });
          console.log(`📤 Claude→Frontend: ${socket.id} → ${targetId}`);
        } else {
          socket.emit('routingError', { error: 'Frontend client not found' });
        }
      });

      // Handle disconnections
      socket.on('disconnect', () => {
        const client = this.clients.get(socket.id);
        if (client) {
          console.log(`🔌 Disconnected: ${client.type} ${socket.id}`);
          this.clients.delete(socket.id);
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`❌ WebSocket Hub error: ${socket.id}`, error);
      });
    });

    // Status endpoint for monitoring
    setInterval(() => {
      const status = {
        totalClients: this.clients.size,
        frontendClients: Array.from(this.clients.values()).filter(c => c.type === 'frontend').length,
        claudeClients: Array.from(this.clients.values()).filter(c => c.type === 'claude').length,
        timestamp: new Date().toISOString()
      };
      
      io.emit('hubStatus', status);
    }, 30000); // Every 30 seconds
  }

  getStatus() {
    return {
      active: true,
      clients: this.clients.size,
      types: Array.from(this.clients.values()).reduce((acc, client) => {
        acc[client.type] = (acc[client.type] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

module.exports = { HubActivator };