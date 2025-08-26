/**
 * Simple HTTP/SSE Backend Server for Testing
 * Clean implementation without WebSocket dependencies
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: 'HTTP/SSE Only - WebSocket Eliminated',
    message: 'WebSocket connection storm successfully eliminated!'
  });
});

// Mock Claude instances endpoint
app.get('/api/v1/claude-live/prod/agents', (req, res) => {
  res.json([
    {
      id: 'claude-2426',
      name: 'Claude Instance 1',
      status: 'running',
      pid: 2426,
      type: 'development',
      created: new Date().toISOString()
    },
    {
      id: 'claude-3891',
      name: 'Claude Instance 2', 
      status: 'running',
      pid: 3891,
      type: 'production',
      created: new Date().toISOString()
    }
  ]);
});

// Mock activities endpoint
app.get('/api/v1/claude-live/prod/activities', (req, res) => {
  res.json([
    {
      id: '1',
      message: 'HTTP/SSE terminal connection established',
      timestamp: new Date().toISOString(),
      type: 'connection'
    },
    {
      id: '2', 
      message: 'WebSocket connection storm eliminated',
      timestamp: new Date().toISOString(),
      type: 'success'
    }
  ]);
});

// Mock agent posts endpoint
app.get('/api/v1/agent-posts', (req, res) => {
  res.json({
    success: true,
    message: 'HTTP/SSE mode active - WebSocket eliminated',
    posts: [
      {
        id: '1',
        title: 'WebSocket Storm Eliminated',
        content: 'Successfully converted to HTTP/SSE architecture',
        timestamp: new Date().toISOString()
      }
    ]
  });
});

// Frontend-compatible Claude instances endpoint (GET - fetch instances)
app.get('/api/claude/instances', (req, res) => {
  console.log('🔍 Fetching Claude instances for frontend');
  
  // Mock instance data that matches frontend expectations
  const instances = [
    {
      id: 'claude-2426',
      name: 'prod/claude',
      status: 'running',
      pid: 2426,
      startTime: new Date(Date.now() - 300000) // 5 minutes ago
    },
    {
      id: 'claude-3891', 
      name: 'skip-permissions',
      status: 'running',
      pid: 3891,
      startTime: new Date(Date.now() - 180000) // 3 minutes ago
    }
  ];
  
  res.json({
    success: true,
    instances,
    timestamp: new Date().toISOString()
  });
});

// Create new Claude instance endpoint (frontend-compatible path)
app.post('/api/claude/instances', (req, res) => {
  const { command, workingDirectory } = req.body;
  
  console.log(`🆕 Creating Claude instance: ${JSON.stringify({ command, workingDirectory })}`);
  
  // Generate new instance ID and PID
  const newId = `claude-${Math.floor(Math.random() * 9000) + 1000}`;
  const newPid = Math.floor(Math.random() * 9000) + 1000;
  
  // Determine instance name based on command
  let instanceName = 'Claude Instance';
  if (command && Array.isArray(command)) {
    if (command.includes('--dangerously-skip-permissions')) {
      if (command.includes('--resume')) {
        instanceName = 'skip-permissions --resume';
      } else if (command.includes('-c')) {
        instanceName = 'skip-permissions -c';
      } else {
        instanceName = 'skip-permissions';
      }
    } else {
      instanceName = 'prod/claude';
    }
  }
  
  const newInstance = {
    id: newId,
    name: instanceName,
    status: 'starting',
    pid: newPid,
    startTime: new Date(),
    command,
    workingDirectory
  };
  
  console.log(`✅ Claude instance created: ${newId} (${instanceName}, PID: ${newPid})`);
  
  // Simulate instance becoming running after short delay
  setTimeout(() => {
    newInstance.status = 'running';
    console.log(`🚀 Claude instance ${newId} now running`);
  }, 2000);
  
  res.status(201).json({
    success: true,
    instanceId: newId,
    instance: newInstance,
    message: 'Claude instance created successfully',
    timestamp: new Date().toISOString()
  });
});

// Delete Claude instance endpoint (frontend-compatible path) 
app.delete('/api/claude/instances/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  
  console.log(`🗑️ Terminating Claude instance: ${instanceId}`);
  
  res.json({
    success: true,
    message: `Claude instance ${instanceId} terminated successfully`,
    instanceId,
    timestamp: new Date().toISOString()
  });
});

// Create new Claude instance endpoint (legacy v1 path - keep for compatibility)
app.post('/api/v1/claude/instances', (req, res) => {
  const { name, type } = req.body;
  
  console.log(`🆕 Creating new Claude instance: ${JSON.stringify({ name, type })}`);
  
  // Generate new instance ID and PID
  const newId = `claude-${Math.floor(Math.random() * 9000) + 1000}`;
  const newPid = Math.floor(Math.random() * 9000) + 1000;
  
  const newInstance = {
    id: newId,
    name: name || `Claude Instance ${newId}`,
    status: 'starting',
    pid: newPid,
    type: type || 'development',
    created: new Date().toISOString()
  };
  
  console.log(`✅ Claude instance created: ${newId} (PID: ${newPid})`);
  
  res.status(201).json({
    success: true,
    message: 'Claude instance created successfully',
    instance: newInstance,
    timestamp: new Date().toISOString()
  });
});

// Delete Claude instance endpoint
app.delete('/api/v1/claude/instances/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  
  console.log(`🗑️ Deleting Claude instance: ${instanceId}`);
  
  res.json({
    success: true,
    message: `Claude instance ${instanceId} deleted successfully`,
    instanceId,
    timestamp: new Date().toISOString()
  });
});

// Additional Claude terminal endpoints the frontend is calling
app.get('/api/v1/claude/instances/:instanceId/terminal/stream', (req, res) => {
  const { instanceId } = req.params;
  
  console.log(`📡 SSE Claude terminal stream requested for instance: ${instanceId}`);
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    instanceId,
    message: `✅ HTTP/SSE Claude terminal connected to instance ${instanceId}`,
    timestamp: new Date().toISOString()
  })}\\n\\n`);

  // Send periodic updates
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'output',
      instanceId,
      data: `[${new Date().toLocaleTimeString()}] Claude ${instanceId} - HTTP/SSE active!\\r\\n$ `,
      timestamp: new Date().toISOString()
    })}\\n\\n`);
  }, 3000);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`🔌 SSE connection closed for Claude instance: ${instanceId}`);
    clearInterval(interval);
  });
});

app.get('/api/v1/claude/terminal/output/:pid', (req, res) => {
  const { pid } = req.params;
  
  console.log(`🔄 HTTP polling request for Claude PID: ${pid}`);
  
  res.json({
    success: true,
    pid,
    output: `[${new Date().toLocaleTimeString()}] Claude PID ${pid} - HTTP polling successful!\\r\\n$ `,
    timestamp: new Date().toISOString(),
    message: 'HTTP/SSE conversion successful - WebSocket eliminated!'
  });
});

app.get('/api/v1/claude-live/dev/agents', (req, res) => {
  res.json([
    {
      id: 'claude-dev-1',
      name: 'Claude Dev Instance',
      status: 'running',
      pid: 1234,
      type: 'development',
      created: new Date().toISOString()
    }
  ]);
});

// SSE Terminal Stream endpoint
app.get('/api/v1/terminal/stream/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  
  console.log(`📡 SSE terminal stream requested for instance: ${instanceId}`);
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    instanceId,
    message: `✅ HTTP/SSE terminal connected to Claude instance ${instanceId}`,
    timestamp: new Date().toISOString()
  })}\\n\\n`);

  // Send periodic updates
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'output',
      instanceId,
      data: `[${new Date().toLocaleTimeString()}] HTTP/SSE terminal active - WebSocket storm eliminated!\\r\\n$ `,
      timestamp: new Date().toISOString()
    })}\\n\\n`);
  }, 3000);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`🔌 SSE connection closed for instance: ${instanceId}`);
    clearInterval(interval);
  });
});

// HTTP Polling endpoint for terminal
app.get('/api/v1/terminal/poll/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  
  console.log(`🔄 HTTP polling request for instance: ${instanceId}`);
  
  res.json({
    success: true,
    instanceId,
    data: `[${new Date().toLocaleTimeString()}] HTTP polling active - no WebSocket needed!\\r\\n$ `,
    timestamp: new Date().toISOString(),
    message: 'HTTP/SSE conversion successful'
  });
});

// Terminal input endpoint
app.post('/api/v1/terminal/input/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  const { input } = req.body;
  
  console.log(`⌨️ Terminal input for ${instanceId}: ${input}`);
  
  res.json({
    success: true,
    instanceId,
    echo: input,
    response: 'HTTP/SSE input received - WebSocket eliminated!',
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 HTTP/SSE Server running on http://localhost:${PORT}`);
  console.log(`✅ WebSocket connection storm eliminated!`);
  console.log(`📡 SSE endpoints available:`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - SSE Stream: http://localhost:${PORT}/api/v1/terminal/stream/{instanceId}`);
  console.log(`   - HTTP Polling: http://localhost:${PORT}/api/v1/terminal/poll/{instanceId}`);
  console.log(`🎉 Clean HTTP/SSE architecture - no WebSocket dependencies!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down HTTP/SSE server...');
  server.close(() => {
    console.log('✅ HTTP/SSE server shutdown complete');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down HTTP/SSE server...');
  server.close(() => {
    console.log('✅ HTTP/SSE server shutdown complete');
  });
});