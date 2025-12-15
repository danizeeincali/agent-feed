#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Simple test server for Claude instance testing'
  });
});

// Mock Claude instances endpoints
app.get('/api/claude/instances', (req, res) => {
  res.json({
    success: true,
    instances: []
  });
});

app.post('/api/claude/instances', (req, res) => {
  const instanceId = `claude-${Date.now()}`;
  console.log(`🚀 Mock Claude instance creation requested:`, req.body);
  console.log(`📦 Generated instance ID: ${instanceId}`);
  
  res.json({
    success: true,
    instanceId,
    instance: {
      id: instanceId,
      name: `Claude Instance ${instanceId.slice(-4)}`,
      status: 'starting',
      pid: Math.floor(Math.random() * 10000) + 1000
    }
  });
});

// Mock SSE endpoint
app.get('/api/v1/claude/instances/:instanceId/terminal/stream', (req, res) => {
  const instanceId = req.params.instanceId;
  console.log(`📡 SSE connection requested for: ${instanceId}`);
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Send connection event
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    instanceId,
    message: 'Mock SSE connection established'
  })}\n\n`);
  
  // Simulate terminal output every few seconds
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'terminal_output',
      output: `Mock terminal output from ${instanceId} at ${new Date().toLocaleTimeString()}\n`,
      instanceId,
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 3000);
  
  // Cleanup on client disconnect
  req.on('close', () => {
    console.log(`🔌 SSE connection closed for: ${instanceId}`);
    clearInterval(interval);
  });
});

app.listen(PORT, () => {
  console.log(`✅ Simple test server running on port ${PORT}`);
  console.log(`🔗 Frontend can connect to: http://localhost:${PORT}`);
  console.log(`🧪 Use this to test button debouncing and SSE connections`);
});