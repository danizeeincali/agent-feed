const express = require('express');
const cors = require('cors');
const http = require('http');
const { router: claudeInstanceRouter, setupWebSocket, claudeManager } = require('./routes/claude-instances');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'claude-instances-api',
    timestamp: new Date().toISOString()
  });
});

// Claude instance management routes
app.use('/api/claude', claudeInstanceRouter);

// Legacy endpoints for backward compatibility with 4 buttons
app.post('/api/claude/launch', async (req, res) => {
  try {
    const { mode } = req.body;
    
    // Map old launch modes to new instance creation
    const modeMap = {
      'chat': { name: 'Claude Chat', mode: 'chat' },
      'code': { name: 'Claude Code', mode: 'code' },
      'help': { name: 'Claude Help', mode: 'help' },
      'version': { name: 'Claude Version', mode: 'version' }
    };

    const config = modeMap[mode] || { name: 'Claude Default', mode: 'chat' };
    config.cwd = '/workspaces/agent-feed';

    const instance = await claudeManager.createInstance(config);
    
    res.json({
      success: true,
      instanceId: instance.id,
      name: instance.name,
      pid: instance.pid,
      message: `Claude instance created in ${mode} mode`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/claude/status', (req, res) => {
  const instances = claudeManager.getAllInstances();
  const running = instances.filter(i => i.status === 'running');
  
  res.json({
    running: running.length > 0,
    count: instances.length,
    runningCount: running.length,
    instances: instances.map(i => ({
      id: i.id,
      name: i.name,
      status: i.status,
      pid: i.pid
    }))
  });
});

app.get('/api/claude/check', (req, res) => {
  res.json({
    available: true,
    service: 'claude-instances',
    maxInstances: 4,
    currentCount: claudeManager.getAllInstances().length
  });
});

// Setup WebSocket for real-time communication
setupWebSocket(server);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Claude Instances API Server running on http://localhost:${PORT}`);
  console.log('📊 Endpoints:');
  console.log('   POST   /api/claude/instances - Create new instance');
  console.log('   GET    /api/claude/instances - List all instances');
  console.log('   GET    /api/claude/instances/:id - Get instance details');
  console.log('   POST   /api/claude/instances/:id/input - Send input');
  console.log('   DELETE /api/claude/instances/:id - Terminate instance');
  console.log('   WS     /api/claude/instances/ws - WebSocket for real-time communication');
  console.log('\n📌 Legacy endpoints for 4-button compatibility:');
  console.log('   POST   /api/claude/launch - Launch Claude with mode');
  console.log('   GET    /api/claude/status - Get status');
  console.log('   GET    /api/claude/check - Check availability');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Claude Instances API Server...');
  await claudeManager.terminateAll();
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});

module.exports = server;