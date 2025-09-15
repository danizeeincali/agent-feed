import express from 'express';
import StreamingTickerManager from '../../services/StreamingTickerManager.js';

const router = express.Router();

// SSE endpoint for streaming ticker
router.get('/stream', (req, res) => {
  try {
    const userId = req.query.userId || 'anonymous';
    const connectionId = StreamingTickerManager.createConnection(req, res, userId);

    console.log(`Streaming ticker connection established: ${connectionId}`);

    // Optional: Start a demo stream for testing
    if (req.query.demo === 'true') {
      setTimeout(() => {
        StreamingTickerManager.streamClaudeExecution(connectionId, 'Demo execution for testing');
      }, 1000);
    }

  } catch (error) {
    console.error('Error creating streaming ticker connection:', error);
    res.status(500).json({ error: 'Failed to establish streaming connection' });
  }
});

// Start Claude Code execution with streaming
router.post('/execute', async (req, res) => {
  try {
    const { prompt, connectionId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // If connectionId provided, stream to that specific connection
    if (connectionId && StreamingTickerManager.connections.has(connectionId)) {
      StreamingTickerManager.streamClaudeExecution(connectionId, prompt);
      res.json({ message: 'Execution started with streaming', connectionId });
    } else {
      // Broadcast to all connections
      StreamingTickerManager.broadcast({
        type: 'execution_start',
        data: { prompt: prompt.substring(0, 100) + '...', timestamp: Date.now() }
      });
      res.json({ message: 'Execution started with broadcast' });
    }

  } catch (error) {
    console.error('Error starting Claude execution:', error);
    res.status(500).json({ error: 'Failed to start execution' });
  }
});

// Send custom ticker message
router.post('/message', (req, res) => {
  try {
    const { message, connectionId, type = 'custom' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const tickerMessage = {
      type,
      data: {
        message,
        timestamp: Date.now(),
        priority: req.body.priority || 'medium'
      }
    };

    if (connectionId) {
      const sent = StreamingTickerManager.sendToConnection(connectionId, tickerMessage);
      res.json({ sent, connectionId });
    } else {
      const sentCount = StreamingTickerManager.broadcast(tickerMessage);
      res.json({ sentCount });
    }

  } catch (error) {
    console.error('Error sending ticker message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get streaming statistics
router.get('/stats', (req, res) => {
  try {
    const stats = StreamingTickerManager.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting streaming stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Close specific connection
router.delete('/connection/:connectionId', (req, res) => {
  try {
    const { connectionId } = req.params;
    StreamingTickerManager.closeConnection(connectionId);
    res.json({ message: 'Connection closed', connectionId });
  } catch (error) {
    console.error('Error closing connection:', error);
    res.status(500).json({ error: 'Failed to close connection' });
  }
});

// Cleanup inactive connections
router.post('/cleanup', (req, res) => {
  try {
    StreamingTickerManager.cleanup();
    const stats = StreamingTickerManager.getStats();
    res.json({ message: 'Cleanup completed', stats });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

export default router;