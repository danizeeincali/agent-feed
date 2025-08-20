/**
 * Token Analytics WebSocket Handler
 * Handles real-time token cost tracking and analytics
 */

import { broadcastTokenAnalytics } from '../server';
import { logger } from '@/utils/logger';

export interface TokenUsage {
  id: string;
  timestamp: string;
  provider: 'claude' | 'openai' | 'mcp' | 'claude-flow';
  model: string;
  tokensUsed: number;
  estimatedCost: number;
  requestType: string;
  component?: string;
  metadata?: Record<string, any>;
}

/**
 * Broadcast token usage update to all subscribed clients
 */
export const broadcastTokenUsageUpdate = (tokenUsage: TokenUsage) => {
  try {
    broadcastTokenAnalytics('token-usage-update', tokenUsage);
    logger.debug('Token usage update broadcasted', { tokenUsage });
  } catch (error) {
    logger.error('Failed to broadcast token usage update', { error, tokenUsage });
  }
};

/**
 * Track new token usage and broadcast to clients
 */
export const trackTokenUsage = async (usage: Omit<TokenUsage, 'id' | 'timestamp'>) => {
  try {
    const tokenUsage: TokenUsage = {
      ...usage,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    // Broadcast to all subscribers
    broadcastTokenUsageUpdate(tokenUsage);

    // TODO: Store in database for persistence
    // await tokenUsageRepository.save(tokenUsage);

    return tokenUsage;
  } catch (error) {
    logger.error('Failed to track token usage', { error, usage });
    throw error;
  }
};