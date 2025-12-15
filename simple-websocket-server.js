const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = createServer(app);

// Enable CORS
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

let connectedUsers = [];
let systemStats = {
  connectedUsers: 0,
  activeRooms: 1,
  totalSockets: 0,
  timestamp: new Date().toISOString()
};

io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);
  
  systemStats.connectedUsers++;
  systemStats.totalSockets++;
  systemStats.timestamp = new Date().toISOString();
  
  // Send immediate connection confirmation
  socket.emit('connect_confirmed', {
    socketId: socket.id,
    timestamp: new Date().toISOString(),
    status: 'connected'
  });
  
  // Send system stats
  socket.emit('system_stats', systemStats);
  
  // Add to connected users
  const user = {
    id: socket.id,
    username: `User-${socket.id.substring(0, 8)}`,
    lastSeen: new Date().toISOString()
  };
  connectedUsers.push(user);
  
  // Broadcast online users
  io.emit('online_users', connectedUsers);
  
  // Handle agent spawning
  socket.on('spawn_agent', (data) => {
    console.log('🤖 Agent spawn request:', data);
    socket.emit('agent_spawned', {
      id: `agent-${Date.now()}`,
      type: data.type || 'assistant',
      status: 'active',
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle instance management
  socket.on('manage_instance', (data) => {
    console.log('🏠 Instance management:', data);
    socket.emit('instance_response', {
      action: data.action,
      status: 'success',
      timestamp: new Date().toISOString()
    });
  });
  
  
  // Handle comments
  socket.on('new_comment', (data) => {
    console.log('💬 New comment:', data);
    io.emit('comment_added', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle feed subscriptions
  socket.on('subscribe_feed', (data) => {
    console.log('📡 Feed subscription:', data);
    socket.join(data.feedId);
    socket.emit('feed_subscribed', {
      feedId: data.feedId,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
    
    systemStats.connectedUsers--;
    systemStats.timestamp = new Date().toISOString();
    
    // Remove from connected users
    connectedUsers = connectedUsers.filter(user => user.id !== socket.id);
    
    // Broadcast updated stats
    io.emit('online_users', connectedUsers);
    io.emit('system_stats', systemStats);
  });
  
  // Health check heartbeat
  const heartbeat = setInterval(() => {
    if (socket.connected) {
      socket.emit('heartbeat', {
        timestamp: new Date().toISOString(),
        socketId: socket.id
      });
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connections: systemStats.connectedUsers,
    uptime: process.uptime()
  });
});

// WebSocket endpoint info
app.get('/ws', (req, res) => {
  res.json({
    message: 'WebSocket server running',
    endpoint: '/socket.io/',
    stats: systemStats
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}/socket.io/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});