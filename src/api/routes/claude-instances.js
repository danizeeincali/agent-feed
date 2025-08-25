const express = require('express');
const WebSocket = require('ws');
const ClaudeProcessManager = require('../../services/ClaudeProcessManager');

const router = express.Router();
const claudeManager = new ClaudeProcessManager();

/**
 * GET /api/claude/instances - List all Claude instances
 */
router.get('/instances', (req, res) => {
  try {
    const instances = claudeManager.getAllInstances();
    res.json({
      success: true,
      count: instances.length,
      instances: instances.map(inst => ({
        id: inst.id,
        name: inst.name,
        status: inst.status,
        pid: inst.pid,
        startTime: inst.startTime,
        mode: inst.config.mode,
        cwd: inst.config.cwd
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/claude/instances - Create a new Claude instance
 */
router.post('/instances', async (req, res) => {
  try {
    const { name, mode, cwd, env, additionalArgs } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Instance name is required'
      });
    }

    const instance = await claudeManager.createInstance({
      name,
      mode: mode || 'chat',
      cwd: cwd || process.cwd(),
      env,
      additionalArgs
    });

    res.json({
      success: true,
      instance: {
        id: instance.id,
        name: instance.name,
        status: instance.status,
        pid: instance.pid,
        startTime: instance.startTime
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/claude/instances/:id - Get instance details
 */
router.get('/instances/:id', (req, res) => {
  try {
    const instance = claudeManager.getInstance(req.params.id);
    
    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }

    res.json({
      success: true,
      instance: {
        id: instance.id,
        name: instance.name,
        status: instance.status,
        pid: instance.pid,
        startTime: instance.startTime,
        config: instance.config,
        outputSample: claudeManager.getOutput(instance.id, 10)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/claude/instances/:id/output - Get instance output
 */
router.get('/instances/:id/output', (req, res) => {
  try {
    const lines = parseInt(req.query.lines) || 50;
    const output = claudeManager.getOutput(req.params.id, lines);
    
    res.json({
      success: true,
      instanceId: req.params.id,
      output,
      lines
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/claude/instances/:id/input - Send input to instance
 */
router.post('/instances/:id/input', (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({
        success: false,
        error: 'Input is required'
      });
    }

    claudeManager.sendInput(req.params.id, input);
    
    res.json({
      success: true,
      instanceId: req.params.id,
      input
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/claude/instances/:id/resize - Resize instance terminal
 */
router.post('/instances/:id/resize', (req, res) => {
  try {
    const { cols, rows } = req.body;
    
    if (!cols || !rows) {
      return res.status(400).json({
        success: false,
        error: 'Cols and rows are required'
      });
    }

    claudeManager.resizeInstance(req.params.id, cols, rows);
    
    res.json({
      success: true,
      instanceId: req.params.id,
      cols,
      rows
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/claude/instances/:id - Terminate instance
 */
router.delete('/instances/:id', async (req, res) => {
  try {
    await claudeManager.terminateInstance(req.params.id);
    
    res.json({
      success: true,
      instanceId: req.params.id,
      message: 'Instance terminated'
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/claude/instances/create-defaults - Create default 4 instances
 */
router.post('/instances/create-defaults', async (req, res) => {
  try {
    const results = await claudeManager.createDefaultInstances();
    
    res.json({
      success: true,
      message: 'Default instances created',
      results: results.map(r => ({
        id: r.id,
        name: r.name || r.config?.name,
        status: r.status,
        error: r.error
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * WebSocket endpoint for real-time instance communication
 */
function setupWebSocket(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/api/claude/instances/ws'
  });

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection for Claude instances');
    
    // Send initial instances list
    ws.send(JSON.stringify({
      type: 'instances',
      data: claudeManager.getAllInstances().map(inst => ({
        id: inst.id,
        name: inst.name,
        status: inst.status
      }))
    }));

    // Handle instance output events
    const outputHandler = ({ instanceId, data }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'output',
          instanceId,
          data
        }));
      }
    };

    // Handle instance status changes
    const statusHandler = (instance) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'status',
          instanceId: instance.id,
          status: instance.status
        }));
      }
    };

    claudeManager.on('instance:output', outputHandler);
    claudeManager.on('instance:ready', statusHandler);
    claudeManager.on('instance:exit', statusHandler);

    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString());
        
        switch (msg.type) {
          case 'input':
            if (msg.instanceId && msg.data) {
              claudeManager.sendInput(msg.instanceId, msg.data);
            }
            break;
            
          case 'subscribe':
            // Client wants to subscribe to a specific instance
            console.log(`Client subscribed to instance ${msg.instanceId}`);
            break;
            
          case 'unsubscribe':
            // Client wants to unsubscribe from an instance
            console.log(`Client unsubscribed from instance ${msg.instanceId}`);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      claudeManager.off('instance:output', outputHandler);
      claudeManager.off('instance:ready', statusHandler);
      claudeManager.off('instance:exit', statusHandler);
    });
  });

  return wss;
}

module.exports = { router, setupWebSocket, claudeManager };