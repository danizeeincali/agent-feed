/**
 * Activity Broadcasting via WebSocket
 * Real-time activity broadcasting with no mock data
 * Handles WebSocket connections and activity event distribution
 */

const WebSocket = require('ws');

class ActivityBroadcaster {
  constructor(wss, activitiesDatabase) {
    this.wss = wss;
    this.activitiesDb = activitiesDatabase;
    this.clients = new Set();

    this.setupWebSocketHandlers();
  }

  /**
   * Setup WebSocket connection handlers
   */
  setupWebSocketHandlers() {
    this.wss.on('connection', (ws) => {
      console.log('New WebSocket client connected for activities');
      this.clients.add(ws);

      // Send initial empty state to new client
      this.sendToClient(ws, {
        type: 'connection_established',
        message: 'Connected to activities feed',
        timestamp: new Date().toISOString()
      });

      // Handle client disconnection
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      // Handle client errors
      ws.on('error', (error) => {
        console.error('WebSocket client error:', error);
        this.clients.delete(ws);
      });

      // Handle client messages (for subscription management)
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('Invalid JSON from WebSocket client:', error);
        }
      });
    });
  }

  /**
   * Handle messages from WebSocket clients
   */
  handleClientMessage(ws, data) {
    switch (data.type) {
      case 'subscribe_activities':
        // Client wants to subscribe to activity updates
        this.sendToClient(ws, {
          type: 'subscription_confirmed',
          subscription: 'activities',
          timestamp: new Date().toISOString()
        });
        break;

      case 'ping':
        // Client ping for connection health
        this.sendToClient(ws, {
          type: 'pong',
          timestamp: new Date().toISOString()
        });
        break;

      default:
        console.warn('Unknown message type from client:', data.type);
    }
  }

  /**
   * Broadcast activity to all connected clients
   */
  async broadcastActivity(activityId) {
    try {
      // Get activity data from database
      const activityData = await this.activitiesDb.getActivityForBroadcast(activityId);

      if (!activityData) {
        console.error(`Activity not found for broadcast: ${activityId}`);
        return;
      }

      // Create broadcast message
      const message = {
        type: 'activity_update',
        data: activityData,
        timestamp: new Date().toISOString(),
        source: 'real_database',
        no_fake_data: true
      };

      // Broadcast to all connected clients
      this.broadcastToAll(message);

      console.log(`Broadcasted activity ${activityId} to ${this.clients.size} clients`);
    } catch (error) {
      console.error('Error broadcasting activity:', error);
    }
  }

  /**
   * Broadcast feed update to all clients
   */
  async broadcastFeedUpdate(activityId) {
    try {
      // Get recent activities for feed update
      const recentActivities = await this.activitiesDb.getActivities({
        page: 1,
        limit: 10
      });

      const message = {
        type: 'feed_update',
        data: {
          activities: recentActivities.activities,
          latest_activity_id: activityId,
          total_count: recentActivities.pagination.total
        },
        timestamp: new Date().toISOString(),
        source: 'real_database'
      };

      this.broadcastToAll(message);
    } catch (error) {
      console.error('Error broadcasting feed update:', error);
    }
  }

  /**
   * Send message to all connected clients
   */
  broadcastToAll(message) {
    const messageStr = JSON.stringify(message);
    const disconnectedClients = [];

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('Error sending to WebSocket client:', error);
          disconnectedClients.push(ws);
        }
      } else {
        disconnectedClients.push(ws);
      }
    });

    // Clean up disconnected clients
    disconnectedClients.forEach(ws => {
      this.clients.delete(ws);
    });
  }

  /**
   * Send message to specific client
   */
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending to specific client:', error);
        this.clients.delete(ws);
      }
    }
  }

  /**
   * Get count of connected clients
   */
  getConnectedClientsCount() {
    // Clean up dead connections first
    const activeClients = [];
    this.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        activeClients.push(ws);
      }
    });

    // Update clients set
    this.clients.clear();
    activeClients.forEach(ws => this.clients.add(ws));

    return this.clients.size;
  }

  /**
   * Broadcast system status update
   */
  async broadcastSystemStatus(status) {
    const message = {
      type: 'system_status',
      data: {
        status,
        connected_clients: this.getConnectedClientsCount(),
        timestamp: new Date().toISOString()
      },
      source: 'system'
    };

    this.broadcastToAll(message);
  }

  /**
   * Close broadcaster and cleanup connections
   */
  close() {
    // Notify clients of shutdown
    const shutdownMessage = {
      type: 'server_shutdown',
      message: 'Activity broadcaster shutting down',
      timestamp: new Date().toISOString()
    };

    this.broadcastToAll(shutdownMessage);

    // Close all client connections
    this.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Server shutdown');
      }
    });

    this.clients.clear();
  }
}

module.exports = ActivityBroadcaster;