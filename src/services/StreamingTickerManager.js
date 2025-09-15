import { EventEmitter } from 'events';

class StreamingTickerManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.isRunning = false;
    this.connectionTimeout = 30000; // 30 seconds
  }

  // SSE Connection Management
  createConnection(req, res, userId = 'anonymous') {
    const connectionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Store connection
    this.connections.set(connectionId, {
      response: res,
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now()
    });

    // Send initial connection event
    this.sendToConnection(connectionId, {
      type: 'connection',
      data: { status: 'connected', connectionId }
    });

    // Setup heartbeat
    const heartbeat = setInterval(() => {
      this.sendToConnection(connectionId, {
        type: 'heartbeat',
        data: { timestamp: Date.now() }
      });
    }, 15000);

    // Handle connection close
    req.on('close', () => {
      clearInterval(heartbeat);
      this.connections.delete(connectionId);
      this.emit('connectionClosed', connectionId);
    });

    // Handle timeout
    setTimeout(() => {
      if (this.connections.has(connectionId)) {
        this.closeConnection(connectionId);
      }
    }, this.connectionTimeout);

    return connectionId;
  }

  // Send message to specific connection
  sendToConnection(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        const eventData = `data: ${JSON.stringify(message)}\n\n`;
        connection.response.write(eventData);
        connection.lastActivity = Date.now();
        return true;
      } catch (error) {
        console.error(`Failed to send to connection ${connectionId}:`, error);
        this.closeConnection(connectionId);
        return false;
      }
    }
    return false;
  }

  // Broadcast to all connections
  broadcast(message) {
    let sentCount = 0;
    for (const [connectionId, connection] of this.connections) {
      if (this.sendToConnection(connectionId, message)) {
        sentCount++;
      }
    }
    return sentCount;
  }

  // Close specific connection
  closeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        connection.response.end();
      } catch (error) {
        console.error(`Error closing connection ${connectionId}:`, error);
      }
      this.connections.delete(connectionId);
    }
  }

  // Claude Code Output Parser
  parseClaudeOutput(output) {
    const messages = [];

    // Tool detection patterns
    const toolPatterns = {
      bash: /(?:Running command:|Executing:)\s*(.+)/gi,
      read: /(?:Reading file:|Opening:)\s*(.+)/gi,
      write: /(?:Writing to file:|Creating:)\s*(.+)/gi,
      edit: /(?:Editing file:|Modifying:)\s*(.+)/gi,
      search: /(?:Searching for:|Looking for:)\s*(.+)/gi,
      thinking: /(?:Let me|I'll|I need to|I'm going to)\s*(.+)/gi
    };

    // Parse each pattern
    for (const [tool, pattern] of Object.entries(toolPatterns)) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        messages.push({
          type: 'tool_activity',
          tool,
          action: match[1].trim(),
          timestamp: Date.now(),
          priority: this.getToolPriority(tool)
        });
      }
    }

    // Parse progress indicators
    const progressPattern = /(\d+)%|(?:Step\s+(\d+))|(?:(\d+)\s*of\s*(\d+))/gi;
    let progressMatch;
    while ((progressMatch = progressPattern.exec(output)) !== null) {
      messages.push({
        type: 'progress',
        percentage: progressMatch[1] || null,
        step: progressMatch[2] || progressMatch[3] || null,
        total: progressMatch[4] || null,
        timestamp: Date.now(),
        priority: 'medium'
      });
    }

    return messages;
  }

  // Get tool priority for ordering
  getToolPriority(tool) {
    const priorities = {
      thinking: 'low',
      read: 'medium',
      search: 'medium',
      write: 'high',
      edit: 'high',
      bash: 'critical'
    };
    return priorities[tool] || 'medium';
  }

  // Stream Claude Code execution updates
  streamClaudeExecution(connectionId, prompt) {
    // Send initial execution start
    this.sendToConnection(connectionId, {
      type: 'execution_start',
      data: {
        prompt: prompt.substring(0, 100) + '...',
        timestamp: Date.now()
      }
    });

    // Simulate progressive updates (in real implementation, this would parse actual Claude output)
    const simulateProgress = () => {
      const activities = [
        { tool: 'thinking', action: 'analyzing request', duration: 1000 },
        { tool: 'read', action: 'checking project structure', duration: 800 },
        { tool: 'search', action: 'finding relevant files', duration: 1200 },
        { tool: 'edit', action: 'implementing changes', duration: 2000 },
        { tool: 'bash', action: 'running tests', duration: 1500 }
      ];

      let index = 0;
      const sendNext = () => {
        if (index < activities.length && this.connections.has(connectionId)) {
          const activity = activities[index];
          this.sendToConnection(connectionId, {
            type: 'tool_activity',
            data: {
              tool: activity.tool,
              action: activity.action,
              timestamp: Date.now(),
              priority: this.getToolPriority(activity.tool)
            }
          });

          index++;
          setTimeout(sendNext, activity.duration);
        } else {
          // Send completion
          this.sendToConnection(connectionId, {
            type: 'execution_complete',
            data: { timestamp: Date.now() }
          });
        }
      };

      sendNext();
    };

    setTimeout(simulateProgress, 500);
  }

  // Get connection statistics
  getStats() {
    return {
      activeConnections: this.connections.size,
      connections: Array.from(this.connections.entries()).map(([id, conn]) => ({
        id,
        userId: conn.userId,
        createdAt: conn.createdAt,
        lastActivity: conn.lastActivity,
        duration: Date.now() - conn.createdAt
      }))
    };
  }

  // Cleanup inactive connections
  cleanup() {
    const now = Date.now();
    const inactiveThreshold = 60000; // 1 minute

    for (const [connectionId, connection] of this.connections) {
      if (now - connection.lastActivity > inactiveThreshold) {
        this.closeConnection(connectionId);
      }
    }
  }
}

export default new StreamingTickerManager();