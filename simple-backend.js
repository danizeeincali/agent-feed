/**
 * Simple HTTP/SSE Backend Server for Testing
 * Clean implementation without WebSocket dependencies
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Terminal session management
const instanceSessions = new Map(); // Track terminal state per instance
const sseConnections = new Map(); // Track SSE connections per instance

// CRITICAL FIX: Dynamic instance storage for Option A validation
const instances = new Map(); // Track all created instances dynamically

// Initialize with default instances
instances.set('claude-2426', {
  id: 'claude-2426',
  name: 'prod/claude',
  status: 'running',
  pid: 2426,
  startTime: new Date(Date.now() - 300000) // 5 minutes ago
});

instances.set('claude-3891', {
  id: 'claude-3891', 
  name: 'skip-permissions',
  status: 'running',
  pid: 3891,
  startTime: new Date(Date.now() - 180000) // 3 minutes ago
});

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
  
  // CRITICAL FIX: Return dynamic instances list for Option A validation
  const instanceList = Array.from(instances.values());
  console.log(`📋 Returning ${instanceList.length} instances:`, instanceList.map(i => `${i.id} (${i.name})`));
  
  res.json({
    success: true,
    instances: instanceList,
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
  
  // CRITICAL FIX: Add new instance to dynamic storage for Option A validation
  instances.set(newId, newInstance);
  console.log(`✅ Claude instance created and added to list: ${newId} (${instanceName}, PID: ${newPid})`);
  console.log(`📊 Total instances now: ${instances.size}`);
  
  // Simulate instance becoming running after short delay
  setTimeout(() => {
    const instance = instances.get(newId);
    if (instance) {
      instance.status = 'running';
      console.log(`🚀 Claude instance ${newId} now running`);
    }
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
  
  // CRITICAL FIX: Remove instance from dynamic storage
  const removed = instances.delete(instanceId);
  console.log(`📊 Instance ${instanceId} ${removed ? 'removed' : 'not found'}. Total instances now: ${instances.size}`);
  
  res.json({
    success: true,
    message: `Claude instance ${instanceId} terminated successfully`,
    instanceId,
    removed,
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

// Terminal command processing utilities
function processTerminalInput(instanceId, input) {
  // Initialize session if not exists
  if (!instanceSessions.has(instanceId)) {
    instanceSessions.set(instanceId, {
      workingDirectory: '/workspaces/agent-feed',
      history: [],
      environment: {
        USER: 'claude',
        PWD: '/workspaces/agent-feed',
        HOME: '/home/claude'
      }
    });
  }
  
  const session = instanceSessions.get(instanceId);
  session.history.push(input);
  
  // Process basic commands
  const trimmedInput = input.trim();
  let response = '';
  
  if (trimmedInput === '') {
    response = '';
  } else if (trimmedInput === 'help') {
    response = `Available commands:\n  echo <text>     - Print text\n  ls              - List directory contents\n  pwd             - Show current directory\n  whoami          - Show current user\n  clear           - Clear terminal\n  history         - Show command history\n  help            - Show this help`;
  } else if (trimmedInput === 'ls') {
    response = `total 24\ndrwxr-xr-x  12 claude claude  384 Aug 27 00:00 .\ndrwxr-xr-x   3 claude claude   96 Aug 27 00:00 ..\n-rw-r--r--   1 claude claude 1234 Aug 27 00:00 package.json\n-rw-r--r--   1 claude claude 2345 Aug 27 00:00 simple-backend.js\ndrwxr-xr-x   8 claude claude  256 Aug 27 00:00 frontend\ndrwxr-xr-x   4 claude claude  128 Aug 27 00:00 src\n-rw-r--r--   1 claude claude  567 Aug 27 00:00 README.md`;
  } else if (trimmedInput === 'pwd') {
    response = session.workingDirectory;
  } else if (trimmedInput === 'whoami') {
    response = 'claude';
  } else if (trimmedInput === 'clear') {
    response = '\x1B[2J\x1B[H'; // ANSI clear screen
  } else if (trimmedInput === 'history') {
    response = session.history.map((cmd, idx) => `  ${idx + 1}  ${cmd}`).join('\n');
  } else if (trimmedInput.startsWith('echo ')) {
    response = trimmedInput.substring(5);
  } else if (trimmedInput.startsWith('cd ')) {
    const newDir = trimmedInput.substring(3).trim();
    if (newDir === '..') {
      session.workingDirectory = '/workspaces';
    } else if (newDir === 'frontend') {
      session.workingDirectory = '/workspaces/agent-feed/frontend';
    } else {
      session.workingDirectory = `/workspaces/agent-feed/${newDir}`;
    }
    session.environment.PWD = session.workingDirectory;
    response = '';
  } else {
    response = `bash: ${trimmedInput}: command not found`;
  }
  
  return response;
}

// Broadcast message to all SSE connections for an instance
function broadcastToInstance(instanceId, message) {
  const connections = sseConnections.get(instanceId) || [];
  const data = `data: ${JSON.stringify(message)}\n\n`;
  
  connections.forEach((connection, index) => {
    try {
      connection.write(data);
    } catch (error) {
      console.error(`❌ Error broadcasting to connection ${index} for instance ${instanceId}:`, error);
      // Remove dead connection
      connections.splice(index, 1);
    }
  });
}

// Terminal SSE streaming function (shared between endpoints)
function createTerminalSSEStream(req, res, instanceId) {
  console.log(`📡 SSE Claude terminal stream requested for instance: ${instanceId}`);
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Add connection to tracking
  if (!sseConnections.has(instanceId)) {
    sseConnections.set(instanceId, []);
  }
  sseConnections.get(instanceId).push(res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    instanceId,
    message: `✅ Terminal connected to Claude instance ${instanceId}`,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Send initial prompt
  res.write(`data: ${JSON.stringify({
    type: 'output',
    instanceId,
    data: `Claude Code session started for instance ${instanceId}\r\nWorking directory: /workspaces/agent-feed\r\n$ `,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Send periodic keep-alive messages (less frequent now that we have input)
  const interval = setInterval(() => {
    const timestamp = new Date().toLocaleTimeString();
    
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      instanceId,
      data: `[${timestamp}] System operational\r\n`,
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 30000); // Every 30 seconds instead of 2

  // Handle client disconnect
  req.on('close', () => {
    console.log(`🔌 SSE connection closed for Claude instance: ${instanceId}`);
    clearInterval(interval);
    
    // Remove connection from tracking
    const connections = sseConnections.get(instanceId) || [];
    const index = connections.indexOf(res);
    if (index !== -1) {
      connections.splice(index, 1);
    }
  });

  // Handle connection errors
  req.on('error', (err) => {
    console.error(`❌ SSE connection error for instance ${instanceId}:`, err);
    clearInterval(interval);
    
    // Remove connection from tracking
    const connections = sseConnections.get(instanceId) || [];
    const index = connections.indexOf(res);
    if (index !== -1) {
      connections.splice(index, 1);
    }
  });
}

// Primary SSE endpoint that frontend expects
app.get('/api/v1/claude/instances/:instanceId/terminal/stream', (req, res) => {
  const { instanceId } = req.params;
  createTerminalSSEStream(req, res, instanceId);
});

// Alias endpoint for compatibility (without /v1/)
app.get('/api/claude/instances/:instanceId/terminal/stream', (req, res) => {
  const { instanceId } = req.params;
  createTerminalSSEStream(req, res, instanceId);
});

// Enhanced terminal input endpoints with SSE broadcasting
app.post('/api/v1/claude/instances/:instanceId/terminal/input', (req, res) => {
  const { instanceId } = req.params;
  const { input } = req.body;
  
  console.log(`⌨️ Terminal input for Claude instance ${instanceId}: ${input}`);
  
  // Process the input and get response
  const commandResponse = processTerminalInput(instanceId, input);
  
  // Broadcast input echo to all SSE connections
  broadcastToInstance(instanceId, {
    type: 'input_echo',
    instanceId,
    data: `${input}`,
    timestamp: new Date().toISOString()
  });
  
  // Broadcast command response if any
  if (commandResponse) {
    broadcastToInstance(instanceId, {
      type: 'output',
      instanceId,
      data: `${commandResponse}\r\n$ `,
      timestamp: new Date().toISOString()
    });
  } else {
    // Just show new prompt
    broadcastToInstance(instanceId, {
      type: 'output', 
      instanceId,
      data: `$ `,
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    instanceId,
    input,
    processed: true,
    response: commandResponse || 'Command processed',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/claude/instances/:instanceId/terminal/input', (req, res) => {
  const { instanceId } = req.params;
  const { input } = req.body;
  
  console.log(`⌨️ Terminal input for Claude instance ${instanceId}: ${input}`);
  
  // Process the input and get response
  const commandResponse = processTerminalInput(instanceId, input);
  
  // Broadcast input echo to all SSE connections
  broadcastToInstance(instanceId, {
    type: 'input_echo',
    instanceId,
    data: `${input}`,
    timestamp: new Date().toISOString()
  });
  
  // Broadcast command response if any
  if (commandResponse) {
    broadcastToInstance(instanceId, {
      type: 'output',
      instanceId,
      data: `${commandResponse}\r\n$ `,
      timestamp: new Date().toISOString()
    });
  } else {
    // Just show new prompt
    broadcastToInstance(instanceId, {
      type: 'output',
      instanceId,
      data: `$ `,
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    instanceId,
    input,
    processed: true,
    response: commandResponse || 'Command processed',
    timestamp: new Date().toISOString()
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

// Legacy terminal input endpoint (enhanced)
app.post('/api/v1/terminal/input/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  const { input } = req.body;
  
  console.log(`⌨️ Terminal input for ${instanceId}: ${input}`);
  
  // Process the input and get response
  const commandResponse = processTerminalInput(instanceId, input);
  
  // Broadcast input echo to all SSE connections
  broadcastToInstance(instanceId, {
    type: 'input_echo',
    instanceId,
    data: `${input}`,
    timestamp: new Date().toISOString()
  });
  
  // Broadcast command response if any
  if (commandResponse) {
    broadcastToInstance(instanceId, {
      type: 'output',
      instanceId,
      data: `${commandResponse}\r\n$ `,
      timestamp: new Date().toISOString()
    });
  } else {
    // Just show new prompt
    broadcastToInstance(instanceId, {
      type: 'output',
      instanceId,
      data: `$ `,
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    instanceId,
    echo: input,
    processed: true,
    response: commandResponse || 'HTTP/SSE input received - WebSocket eliminated!',
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 HTTP/SSE Server running on http://localhost:${PORT}`);
  console.log(`✅ WebSocket connection storm eliminated!`);
  console.log(`📡 Claude Terminal SSE endpoints available:`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - Claude Terminal Stream (v1): http://localhost:${PORT}/api/v1/claude/instances/{instanceId}/terminal/stream`);
  console.log(`   - Claude Terminal Stream: http://localhost:${PORT}/api/claude/instances/{instanceId}/terminal/stream`);
  console.log(`   - Terminal Input (v1): http://localhost:${PORT}/api/v1/claude/instances/{instanceId}/terminal/input`);
  console.log(`   - Terminal Input: http://localhost:${PORT}/api/claude/instances/{instanceId}/terminal/input`);
  console.log(`   - Legacy SSE Stream: http://localhost:${PORT}/api/v1/terminal/stream/{instanceId}`);
  console.log(`   - HTTP Polling: http://localhost:${PORT}/api/v1/terminal/poll/{instanceId}`);
  console.log(`🎉 Clean HTTP/SSE architecture - Frontend terminal connection ready!`);
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