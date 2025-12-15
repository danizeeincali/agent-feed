#!/usr/bin/env node
/**
 * Main Backend Server - Port 3000
 * Orchestrates all microservices and provides unified API for frontend
 * 
 * This is the missing critical piece identified in the architecture analysis
 */

const express = require('express');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios').default;

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Service configuration
const SERVICES = {
  CLAUDE_INSTANCES: {
    url: 'http://localhost:3001',
    path: '/api/claude',
    name: 'Claude Instances API'
  },
  TERMINAL: {
    url: 'http://localhost:3002', 
    path: '/api/terminals',
    name: 'Terminal WebSocket Server'
  },
  WEBSOCKET_HUB: {
    url: 'http://localhost:3003',
    path: '/hub',
    name: 'WebSocket Hub'
  }
};

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging with detailed path debugging
app.use((req, res, next) => {
  console.log(`📡 ${new Date().toISOString()} | ${req.method} ${req.originalUrl} (path: ${req.path}) | Origin: ${req.get('Origin') || 'none'}`);
  if (req.originalUrl.includes('/api/claude')) {
    console.log(`🚨 SPARC DEBUG: Claude API request detected - should be proxied!`);
  }
  next();
});

// Socket.IO setup with CORS
const io = new SocketIOServer(server, {
  cors: corsOptions,
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// In-memory state for coordination
const state = {
  connectedClients: new Map(),
  claudeInstances: new Map(),
  terminalSessions: new Map(),
  serviceHealth: new Map()
};

// Service health monitoring
async function checkServiceHealth(serviceName, serviceUrl) {
  try {
    const response = await axios.get(`${serviceUrl}/health`, { timeout: 5000 });
    state.serviceHealth.set(serviceName, {
      status: 'healthy',
      lastCheck: new Date(),
      response: response.data
    });
    return true;
  } catch (error) {
    state.serviceHealth.set(serviceName, {
      status: 'unhealthy', 
      lastCheck: new Date(),
      error: error.message
    });
    return false;
  }
}

// Health check all services
async function healthCheckServices() {
  console.log('🔍 Performing service health checks...');
  
  const checks = await Promise.allSettled([
    checkServiceHealth('claude-instances', SERVICES.CLAUDE_INSTANCES.url),
    checkServiceHealth('terminal', SERVICES.TERMINAL.url),
    checkServiceHealth('websocket-hub', SERVICES.WEBSOCKET_HUB.url)
  ]);
  
  const healthySvcs = checks.filter(c => c.status === 'fulfilled' && c.value).length;
  console.log(`📊 Service Health: ${healthySvcs}/${checks.length} services healthy`);
  
  // Log unhealthy services
  state.serviceHealth.forEach((health, service) => {
    if (health.status === 'unhealthy') {
      console.warn(`⚠️  ${service}: ${health.error}`);
    }
  });
}

// Proxy middleware for Claude Instances API
console.log('🔧 SPARC DEBUG: Setting up Claude API proxy middleware');
app.use('/api/claude', createProxyMiddleware({
  target: SERVICES.CLAUDE_INSTANCES.url,
  changeOrigin: true,
  pathRewrite: {
    '^(.*)': '/api/claude$1' // Prepend /api/claude to the stripped path
  },
  onError: (err, req, res) => {
    console.error(`❌ Claude API proxy error:`, err.message);
    res.status(503).json({
      success: false,
      error: 'Claude Instances service unavailable',
      service: 'claude-instances'
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔀 PROXY HIT! ${req.method} ${req.originalUrl} -> ${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`🔄 PROXY RESPONSE: ${proxyRes.statusCode} for ${req.method} ${req.originalUrl}`);
  }
}));

// Proxy middleware for Terminal API  
app.use('/api/terminals', createProxyMiddleware({
  target: SERVICES.TERMINAL.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/terminals': '/api/terminals'
  },
  onError: (err, req, res) => {
    console.error(`❌ Terminal API proxy error:`, err.message);
    res.status(503).json({
      success: false,
      error: 'Terminal service unavailable', 
      service: 'terminal'
    });
  }
}));

// Health endpoint
app.get('/health', async (req, res) => {
  await healthCheckServices();
  
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: Object.fromEntries(state.serviceHealth),
    connections: {
      socketio: io.engine.clientsCount,
      clients: state.connectedClients.size
    },
    memory: process.memoryUsage(),
    port: PORT
  };
  
  res.json(healthData);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Main Backend Server',
    version: '1.0.0',
    description: 'Unified backend orchestrator for Claude Instance Management',
    status: 'operational',
    endpoints: {
      health: '/health',
      claude: '/api/claude/*',
      terminals: '/api/terminals/*'
    },
    websocket: '/socket.io',
    services: Object.keys(SERVICES),
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id} (total: ${io.engine.clientsCount})`);
  
  // Store client info
  state.connectedClients.set(socket.id, {
    id: socket.id,
    connectedAt: new Date(),
    lastActivity: new Date(),
    type: 'unknown'
  });

  // Client registration
  socket.on('register', (data) => {
    const clientInfo = {
      ...state.connectedClients.get(socket.id),
      type: data.type || 'frontend',
      version: data.version,
      lastActivity: new Date()
    };
    
    state.connectedClients.set(socket.id, clientInfo);
    console.log(`📱 Client registered: ${socket.id} as ${clientInfo.type}`);
    
    socket.emit('registered', {
      clientId: socket.id,
      serverTime: new Date().toISOString(),
      supportedEvents: [
        'instances:list', 'instance:create', 'instance:start', 
        'instance:stop', 'instance:delete', 'chat:message'
      ]
    });
  });

  // Claude instance management events
  socket.on('instance:create', async (config) => {
    try {
      console.log(`🚀 Creating Claude instance:`, config);
      const response = await axios.post(`${SERVICES.CLAUDE_INSTANCES.url}/api/claude/instances`, config);
      
      if (response.data.success) {
        const instance = response.data.instance;
        state.claudeInstances.set(instance.id, instance);
        
        // Broadcast to all clients
        io.emit('instance:created', instance);
        console.log(`✅ Claude instance created: ${instance.id}`);
      } else {
        socket.emit('instance:error', {
          instanceId: config.id,
          error: response.data.error || 'Failed to create instance'
        });
      }
    } catch (error) {
      console.error(`❌ Failed to create Claude instance:`, error.message);
      socket.emit('instance:error', {
        instanceId: config.id || 'unknown',
        error: error.message
      });
    }
  });

  socket.on('instance:start', async (data) => {
    try {
      console.log(`▶️  Starting Claude instance: ${data.instanceId}`);
      const response = await axios.post(`${SERVICES.CLAUDE_INSTANCES.url}/api/claude/instances/${data.instanceId}/start`);
      
      if (response.data.success) {
        const status = response.data.status;
        io.emit('instance:started', status);
        console.log(`✅ Claude instance started: ${data.instanceId}`);
      } else {
        socket.emit('instance:error', {
          instanceId: data.instanceId,
          error: response.data.error || 'Failed to start instance'
        });
      }
    } catch (error) {
      console.error(`❌ Failed to start Claude instance:`, error.message);
      socket.emit('instance:error', {
        instanceId: data.instanceId,
        error: error.message
      });
    }
  });

  socket.on('instance:stop', async (data) => {
    try {
      console.log(`⏹️  Stopping Claude instance: ${data.instanceId}`);
      const response = await axios.post(`${SERVICES.CLAUDE_INSTANCES.url}/api/claude/instances/${data.instanceId}/stop`);
      
      if (response.data.success) {
        const status = response.data.status;
        io.emit('instance:stopped', status);
        console.log(`✅ Claude instance stopped: ${data.instanceId}`);
      } else {
        socket.emit('instance:error', {
          instanceId: data.instanceId,
          error: response.data.error || 'Failed to stop instance'
        });
      }
    } catch (error) {
      console.error(`❌ Failed to stop Claude instance:`, error.message);
      socket.emit('instance:error', {
        instanceId: data.instanceId,
        error: error.message
      });
    }
  });

  socket.on('instance:delete', async (data) => {
    try {
      console.log(`🗑️  Deleting Claude instance: ${data.instanceId}`);
      const response = await axios.delete(`${SERVICES.CLAUDE_INSTANCES.url}/api/claude/instances/${data.instanceId}`);
      
      if (response.data.success) {
        state.claudeInstances.delete(data.instanceId);
        io.emit('instance:deleted', { instanceId: data.instanceId });
        console.log(`✅ Claude instance deleted: ${data.instanceId}`);
      } else {
        socket.emit('instance:error', {
          instanceId: data.instanceId,
          error: response.data.error || 'Failed to delete instance'
        });
      }
    } catch (error) {
      console.error(`❌ Failed to delete Claude instance:`, error.message);
      socket.emit('instance:error', {
        instanceId: data.instanceId,
        error: error.message
      });
    }
  });

  socket.on('instances:list', async () => {
    try {
      console.log(`📋 Listing Claude instances for client: ${socket.id}`);
      const response = await axios.get(`${SERVICES.CLAUDE_INSTANCES.url}/api/claude/instances`);
      
      if (response.data.success) {
        socket.emit('instances:list', response.data.instances);
      } else {
        socket.emit('instances:list', []);
      }
    } catch (error) {
      console.error(`❌ Failed to list Claude instances:`, error.message);
      socket.emit('instances:list', []);
    }
  });

  socket.on('chat:message', async (message) => {
    try {
      console.log(`💬 Chat message for instance ${message.instanceId}`);
      const response = await axios.post(`${SERVICES.CLAUDE_INSTANCES.url}/api/claude/instances/${message.instanceId}/chat`, {
        message: message.content,
        images: message.images
      });
      
      if (response.data.success) {
        // Broadcast response to all clients
        io.emit('chat:message', {
          ...message,
          id: `resp-${Date.now()}`,
          type: 'assistant',
          role: 'assistant', 
          content: response.data.response,
          timestamp: new Date(),
          metadata: response.data.metadata
        });
      } else {
        socket.emit('chat:error', {
          instanceId: message.instanceId,
          error: response.data.error || 'Chat failed'
        });
      }
    } catch (error) {
      console.error(`❌ Chat message failed:`, error.message);
      socket.emit('chat:error', {
        instanceId: message.instanceId,
        error: error.message
      });
    }
  });

  // Heartbeat
  socket.on('heartbeat', () => {
    const client = state.connectedClients.get(socket.id);
    if (client) {
      client.lastActivity = new Date();
      state.connectedClients.set(socket.id, client);
    }
    
    socket.emit('heartbeatAck', {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      connections: io.engine.clientsCount
    });
  });

  // Disconnect handling
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} (reason: ${reason})`);
    state.connectedClients.delete(socket.id);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`❌ Socket error for client ${socket.id}:`, error);
  });
});

// Periodic health monitoring
setInterval(() => {
  healthCheckServices();
}, 30000); // Check every 30 seconds

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  
  io.emit('serverShutdown', { reason: 'SIGTERM', gracePeriod: 5000 });
  
  setTimeout(() => {
    server.close(() => {
      console.log('✅ Server shut down gracefully');
      process.exit(0);
    });
  }, 2000);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  
  io.emit('serverShutdown', { reason: 'SIGINT', gracePeriod: 5000 });
  
  setTimeout(() => {
    server.close(() => {
      console.log('✅ Server shut down gracefully'); 
      process.exit(0);
    });
  }, 2000);
});

// Start server
server.listen(PORT, async () => {
  console.log('\n🚀 MAIN BACKEND SERVER STARTED!');
  console.log('======================================');
  console.log(`   Port: ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Socket.IO: http://localhost:${PORT}/socket.io`);
  console.log('');
  console.log('🔗 API Proxying:');
  console.log(`   /api/claude/* → ${SERVICES.CLAUDE_INSTANCES.url}`);
  console.log(`   /api/terminals/* → ${SERVICES.TERMINAL.url}`);
  console.log('');
  console.log('📡 WebSocket Events:');
  console.log('   - instance:create, start, stop, delete');  
  console.log('   - instances:list');
  console.log('   - chat:message');
  console.log('   - heartbeat');
  console.log('');
  
  // Initial health check
  await healthCheckServices();
  
  console.log('✅ Ready to orchestrate Claude instances!');
  console.log('');
});

module.exports = { server, app, io };