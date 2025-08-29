const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// CRITICAL FIX: Claude instances endpoints for testing integration
app.get('/api/claude/instances', (req, res) => {
  console.log('📋 GET /api/claude/instances');
  res.json({
    success: true,
    instances: [
      {
        id: 'claude-1234',
        name: 'test/claude',
        status: 'running',
        type: 'test',
        pid: 12345
      }
    ],
    pagination: { total: 1, limit: 50, offset: 0, hasMore: false }
  });
});

app.post('/api/claude/instances', (req, res) => {
  const instanceId = `claude-${Math.floor(Math.random() * 9000) + 1000}`;
  console.log('🚀 POST /api/claude/instances ->', instanceId);
  
  res.status(201).json({
    success: true,
    instanceId,
    instance: {
      id: instanceId,
      name: `${req.body.instanceType || 'default'}/claude`,
      status: 'running',
      type: req.body.instanceType || 'default',
      workingDirectory: process.cwd(),
      pid: Math.floor(Math.random() * 50000) + 1000
    },
    message: 'Claude instance created successfully'
  });
});

app.post('/api/claude/instances/:id/terminal/input', (req, res) => {
  const { id } = req.params;
  const { input } = req.body;
  
  console.log(`💬 Terminal input for ${id}: "${input?.slice(0, 50)}"`);
  
  // Validate input
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Input must be a non-empty string',
      instanceId: id
    });
  }
  
  res.json({
    success: true,
    message: 'Terminal input received successfully',
    instanceId: id,
    inputLength: input.length,
    timestamp: new Date().toISOString()
  });
});

// Also mount on v1 path
app.get('/api/v1/claude/instances', (req, res) => {
  console.log('📋 GET /api/v1/claude/instances');
  res.json({
    success: true,
    instances: [],
    pagination: { total: 0, limit: 50, offset: 0, hasMore: false }
  });
});

app.post('/api/v1/claude/instances', (req, res) => {
  const instanceId = `claude-${Math.floor(Math.random() * 9000) + 1000}`;
  console.log('🚀 POST /api/v1/claude/instances ->', instanceId);
  
  res.status(201).json({
    success: true,
    instanceId,
    instance: {
      id: instanceId,
      name: `${req.body.instanceType || 'default'}/claude`,
      status: 'running',
      type: req.body.instanceType || 'default'
    }
  });
});

app.post('/api/v1/claude/instances/:id/terminal/input', (req, res) => {
  const { id } = req.params;
  const { input } = req.body;
  
  console.log(`💬 V1 Terminal input for ${id}: "${input?.slice(0, 50)}"`);
  
  // Validate input  
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Input must be a non-empty string',
      instanceId: id
    });
  }
  
  res.json({
    success: true,
    message: 'Terminal input received',
    instanceId: id,
    timestamp: new Date().toISOString()
  });
});

const PORT = 3333;
app.listen(PORT, () => {
  console.log(`🚀 Minimal test server running on http://localhost:${PORT}`);
  console.log('🔗 Available endpoints:');
  console.log('   GET  /api/claude/instances');
  console.log('   POST /api/claude/instances');
  console.log('   POST /api/claude/instances/:id/terminal/input');
  console.log('   GET  /api/v1/claude/instances');  
  console.log('   POST /api/v1/claude/instances');
  console.log('   POST /api/v1/claude/instances/:id/terminal/input');
});