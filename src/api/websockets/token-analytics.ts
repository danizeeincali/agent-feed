/**
 * Token Analytics WebSocket Handler
 * Handles real-time token cost tracking and analytics
 */

import { logger } from '@/utils/logger';
import { TokenUsageRecord } from '@/database/token-analytics-db';

// WebSocket clients storage
const wsClients = new Set<any>();

export interface TokenUsageUpdate {
  id: number;
  timestamp: string;
  provider: 'anthropic' | 'claude-flow' | 'mcp' | 'openai';
  model: string;
  total_tokens: number;
  cost_total: number; // cents
  request_type: string;
  component?: string;
  processing_time_ms?: number;
  session_id: string;
}

export interface AnalyticsUpdate {
  type: 'token-usage' | 'hourly-summary' | 'daily-summary' | 'cost-alert';
  data: any;
  timestamp: string;
}

/**
 * Add WebSocket client to subscribers
 */
export const addWebSocketClient = (ws: any) => {
  wsClients.add(ws);
  logger.debug('WebSocket client added for token analytics', { clientCount: wsClients.size });

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connection',
    data: { connected: true, timestamp: new Date().toISOString() }
  }));

  // Remove client when connection closes
  ws.on('close', () => {
    wsClients.delete(ws);
    logger.debug('WebSocket client removed', { clientCount: wsClients.size });
  });

  ws.on('error', (error: Error) => {
    logger.error('WebSocket client error', { error });
    wsClients.delete(ws);
  });
};

/**
 * Broadcast message to all connected WebSocket clients
 */
const broadcast = (message: AnalyticsUpdate) => {
  if (wsClients.size === 0) return;

  const messageStr = JSON.stringify(message);
  const disconnectedClients = new Set();

  for (const client of wsClients) {
    try {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(messageStr);
      } else {
        disconnectedClients.add(client);
      }
    } catch (error) {
      logger.error('Failed to send WebSocket message', { error });
      disconnectedClients.add(client);
    }
  }

  // Clean up disconnected clients
  for (const client of disconnectedClients) {
    wsClients.delete(client);
  }

  if (disconnectedClients.size > 0) {
    logger.debug('Removed disconnected WebSocket clients', {
      removed: disconnectedClients.size,
      remaining: wsClients.size
    });
  }
};

/**
 * Broadcast token usage update to all subscribed clients
 */
export const broadcastTokenUsageUpdate = (tokenUsage: TokenUsageRecord) => {
  try {
    const update: AnalyticsUpdate = {
      type: 'token-usage',
      data: {
        id: tokenUsage.id,
        timestamp: tokenUsage.timestamp || tokenUsage.created_at,
        provider: tokenUsage.provider,
        model: tokenUsage.model,
        total_tokens: tokenUsage.input_tokens + tokenUsage.output_tokens,
        cost_total: (tokenUsage.cost_input || 0) + (tokenUsage.cost_output || 0),
        request_type: tokenUsage.request_type,
        component: tokenUsage.component,
        processing_time_ms: tokenUsage.processing_time_ms,
        session_id: tokenUsage.session_id
      },
      timestamp: new Date().toISOString()
    };

    broadcast(update);
    logger.debug('Token usage update broadcasted', {
      clientCount: wsClients.size,
      tokenUsage: update.data
    });
  } catch (error) {
    logger.error('Failed to broadcast token usage update', { error, tokenUsage });
  }
};

/**
 * Broadcast hourly summary update
 */
export const broadcastHourlySummary = (summary: any) => {
  try {
    const update: AnalyticsUpdate = {
      type: 'hourly-summary',
      data: summary,
      timestamp: new Date().toISOString()
    };

    broadcast(update);
    logger.debug('Hourly summary broadcasted', { clientCount: wsClients.size });
  } catch (error) {
    logger.error('Failed to broadcast hourly summary', { error });
  }
};

/**
 * Broadcast daily summary update
 */
export const broadcastDailySummary = (summary: any) => {
  try {
    const update: AnalyticsUpdate = {
      type: 'daily-summary',
      data: summary,
      timestamp: new Date().toISOString()
    };

    broadcast(update);
    logger.debug('Daily summary broadcasted', { clientCount: wsClients.size });
  } catch (error) {
    logger.error('Failed to broadcast daily summary', { error });
  }
};

/**
 * Broadcast cost alert
 */
export const broadcastCostAlert = (alert: {
  type: 'daily_limit' | 'monthly_limit' | 'unusual_usage';
  message: string;
  threshold: number;
  current: number;
  severity: 'warning' | 'critical';
}) => {
  try {
    const update: AnalyticsUpdate = {
      type: 'cost-alert',
      data: alert,
      timestamp: new Date().toISOString()
    };

    broadcast(update);
    logger.warn('Cost alert broadcasted', { alert, clientCount: wsClients.size });
  } catch (error) {
    logger.error('Failed to broadcast cost alert', { error });
  }
};

/**
 * Get WebSocket connection status
 */
export const getWebSocketStatus = () => {
  return {
    connected_clients: wsClients.size,
    server_status: 'active'
  };
};

/**
 * Send heartbeat to all clients (keep connections alive)
 */
export const sendHeartbeat = () => {
  const heartbeat: AnalyticsUpdate = {
    type: 'token-usage', // Using existing type to avoid breaking clients
    data: { heartbeat: true },
    timestamp: new Date().toISOString()
  };

  broadcast(heartbeat);
};

// Send heartbeat every 30 seconds
setInterval(sendHeartbeat, 30000);

// Legacy function for backwards compatibility
export const trackTokenUsage = async (usage: Omit<TokenUsageUpdate, 'id' | 'timestamp'>) => {
  try {
    const tokenUsage: TokenUsageUpdate = {
      ...usage,
      id: Date.now(),
      timestamp: new Date().toISOString()
    };

    broadcastTokenUsageUpdate(tokenUsage as any);
    return tokenUsage;
  } catch (error) {
    logger.error('Failed to track token usage', { error, usage });
    throw error;
  }
};