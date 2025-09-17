/**
 * Mock Backend Server for Claude Code Regression Testing
 * Simulates the backend API endpoints to test frontend integration
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock Claude Code SDK routes
const claudeCodeRouter = express.Router();

// Health endpoint
claudeCodeRouter.get('/health', (req, res) => {
  console.log('🔧 Mock: Health check requested');
  res.json({
    success: true,
    healthy: true,
    timestamp: new Date().toISOString(),
    toolsEnabled: true,
    claudeCode: true
  });
});

// Streaming chat endpoint
claudeCodeRouter.post('/streaming-chat', async (req, res) => {
  const { message, options = {} } = req.body;
  console.log('📡 Mock: Streaming chat requested:', { message: message?.substring(0, 100), options });

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500));

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Message is required and must be a string'
    });
  }

  // Simulate successful response
  res.json({
    success: true,
    message: `Mock Claude Code response to: ${message}`,
    responses: [{
      content: `This is a mock response to your message: "${message}". The Claude Code SDK is working correctly.`,
      timestamp: new Date().toISOString(),
      type: 'text'
    }],
    timestamp: new Date().toISOString(),
    claudeCode: true,
    toolsEnabled: true
  });
});

// Background task endpoint
claudeCodeRouter.post('/background-task', async (req, res) => {
  const { prompt, options = {} } = req.body;
  console.log('🔧 Mock: Background task requested:', { prompt: prompt?.substring(0, 100), options });

  if (!prompt) {
    return res.status(400).json({
      success: false,
      error: 'Prompt is required and must be a string'
    });
  }

  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 1000));

  res.json({
    success: true,
    result: {
      output: `Mock background task completed for: ${prompt}`,
      status: 'completed'
    },
    timestamp: new Date().toISOString(),
    mode: 'headless',
    claudeCode: true
  });
});

// Session management
claudeCodeRouter.post('/session', (req, res) => {
  const { sessionId } = req.body;
  console.log('🔧 Mock: Session creation requested:', sessionId);

  res.json({
    success: true,
    session: {
      id: sessionId || `mock-session-${Date.now()}`,
      status: 'active',
      created: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
});

claudeCodeRouter.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  console.log('🔧 Mock: Session info requested:', sessionId);

  res.json({
    success: true,
    session: {
      id: sessionId,
      status: 'active',
      created: new Date(Date.now() - 60000).toISOString(),
      lastActivity: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
});

claudeCodeRouter.delete('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  console.log('🔧 Mock: Session deletion requested:', sessionId);

  res.json({
    success: true,
    message: 'Session closed successfully',
    timestamp: new Date().toISOString()
  });
});

// Cost tracking endpoints
claudeCodeRouter.get('/cost-tracking', (req, res) => {
  const { timeRange = '24h' } = req.query;
  console.log('🔧 Mock: Cost tracking requested:', timeRange);

  res.json({
    success: true,
    costMetrics: {
      totalCost: 2.35,
      totalTokens: 15420,
      totalRequests: 47,
      averageCostPerRequest: 0.05,
      timeRange,
      budgetStatus: {
        budget: 10.0,
        used: 2.35,
        percentage: 23.5,
        alertLevel: 'safe'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Status endpoint
claudeCodeRouter.get('/status', (req, res) => {
  console.log('🔧 Mock: Status requested');

  res.json({
    success: true,
    status: {
      active: true,
      sessions: 1,
      uptime: Math.floor(process.uptime()),
      version: '1.0.0-mock'
    },
    timestamp: new Date().toISOString()
  });
});

// Mount Claude Code routes
app.use('/api/claude-code', claudeCodeRouter);

// Other mock routes for streaming ticker
app.get('/api/streaming-ticker/stream', (req, res) => {
  console.log('📡 Mock: Streaming ticker requested');

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    status: 'connected',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Send periodic updates
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'tool_activity',
      data: {
        tool: 'claude',
        action: 'processing request',
        timestamp: new Date().toISOString()
      }
    })}\n\n`);
  }, 2000);

  req.on('close', () => {
    clearInterval(interval);
    console.log('📡 Mock: Streaming ticker client disconnected');
  });
});

// Health check for overall API
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      api: 'up',
      claude_code: 'up'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ Mock: Route not found:', req.method, req.path);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock Backend Server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Claude Code Health: http://localhost:${PORT}/api/claude-code/health`);
  console.log(`   Claude Code Chat: POST http://localhost:${PORT}/api/claude-code/streaming-chat`);
});

module.exports = app;