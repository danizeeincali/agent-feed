/**
 * TokenAnalyticsWriter Service
 *
 * Responsible for extracting token usage metrics from SDK messages,
 * calculating costs, and writing analytics to the database.
 *
 * Key Features:
 * - Extracts token metrics from SDK result messages
 * - Calculates estimated costs with cache discounts
 * - Writes metrics to token_analytics table
 * - Graceful error handling (never throws)
 */

import { randomUUID } from 'crypto';

/**
 * Pricing constants for Claude Sonnet 4
 * All prices are per 1,000 tokens
 */
const PRICING = {
  'claude-sonnet-4-20250514': {
    input: 0.003,        // $0.003 per 1K tokens
    output: 0.015,       // $0.015 per 1K tokens
    cacheRead: 0.0003,   // $0.0003 per 1K tokens (90% discount)
    cacheCreation: 0.003 // $0.003 per 1K tokens (same as input)
  }
};

// Default pricing for unknown models
const DEFAULT_PRICING = PRICING['claude-sonnet-4-20250514'];

class TokenAnalyticsWriter {
  constructor(database) {
    this.db = database;
    this.initialized = !!database;
  }

  /**
   * Extract token metrics from SDK result messages
   *
   * @param {Array} messages - Array of SDK messages
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Extracted metrics or null if extraction fails
   */
  extractMetricsFromSDK(messages, sessionId) {
    try {
      console.log('🔍 [TokenAnalyticsWriter] Starting metric extraction:', {
        messagesCount: messages?.length || 0,
        messageTypes: messages?.map(m => m.type) || [],
        sessionId
      });

      // Validate inputs
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        console.warn('⚠️ [TokenAnalyticsWriter] Invalid messages array:', {
          isNull: messages === null,
          isArray: Array.isArray(messages),
          length: messages?.length
        });
        return null;
      }

      if (!sessionId) {
        console.warn('⚠️ [TokenAnalyticsWriter] No sessionId provided');
        return null;
      }

      // Find all result messages
      const resultMessages = messages.filter(msg => msg.type === 'result');

      console.log('🔍 [TokenAnalyticsWriter] Found result messages:', resultMessages.length);

      if (resultMessages.length === 0) {
        console.warn('⚠️ [TokenAnalyticsWriter] No result messages found in messages array');
        return null;
      }

      // Use the last result message
      const resultMessage = resultMessages[resultMessages.length - 1];

      console.log('🔍 [TokenAnalyticsWriter] Result message structure:', {
        hasUsage: !!resultMessage.usage,
        hasModelUsage: !!resultMessage.modelUsage,
        usageKeys: resultMessage.usage ? Object.keys(resultMessage.usage) : [],
        modelUsageKeys: resultMessage.modelUsage ? Object.keys(resultMessage.modelUsage) : []
      });

      // Validate required fields
      if (!resultMessage.usage || !resultMessage.modelUsage) {
        console.warn('⚠️ [TokenAnalyticsWriter] Missing required fields:', {
          hasUsage: !!resultMessage.usage,
          hasModelUsage: !!resultMessage.modelUsage
        });
        return null;
      }

      const { usage, modelUsage } = resultMessage;

      // Extract model name (use first model in modelUsage)
      const modelNames = Object.keys(modelUsage);
      if (modelNames.length === 0) {
        console.warn('⚠️ [TokenAnalyticsWriter] No models found in modelUsage');
        return null;
      }
      const model = modelNames[0];

      // Extract token counts
      const inputTokens = usage.input_tokens || 0;
      const outputTokens = usage.output_tokens || 0;
      const cacheReadTokens = usage.cache_read_input_tokens || 0;
      const cacheCreationTokens = usage.cache_creation_input_tokens || 0;

      // Calculate total tokens (input + output)
      const totalTokens = inputTokens + outputTokens;

      console.log('✅ [TokenAnalyticsWriter] Successfully extracted metrics:', {
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        cacheReadTokens,
        cacheCreationTokens
      });

      // Build metrics object
      const metrics = {
        sessionId,
        operation: 'sdk_operation',
        model,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreationTokens,
        totalTokens,
        sdkReportedCost: resultMessage.total_cost_usd || 0,
        duration_ms: resultMessage.duration_ms || 0,
        num_turns: resultMessage.num_turns || 0
      };

      return metrics;
    } catch (error) {
      console.error('❌ [TokenAnalyticsWriter] Failed to extract metrics from SDK:', error);
      console.error('❌ [TokenAnalyticsWriter] Error stack:', error.stack);
      return null;
    }
  }

  /**
   * Calculate estimated cost based on token usage and model pricing
   *
   * @param {Object} usage - Token usage object
   * @param {string} model - Model identifier
   * @returns {number} Estimated cost in USD
   */
  calculateEstimatedCost(usage, model) {
    try {
      // Validate usage object
      if (!usage) {
        return 0;
      }

      // Get pricing for model (use default if unknown)
      const pricing = PRICING[model] || DEFAULT_PRICING;

      // Extract token counts with defaults
      const inputTokens = usage.inputTokens || 0;
      const outputTokens = usage.outputTokens || 0;
      const cacheReadTokens = usage.cacheReadTokens || 0;
      const cacheCreationTokens = usage.cacheCreationTokens || 0;

      // Calculate costs for each token type
      const inputCost = (inputTokens * pricing.input) / 1000;
      const outputCost = (outputTokens * pricing.output) / 1000;
      const cacheReadCost = (cacheReadTokens * pricing.cacheRead) / 1000;
      const cacheCreationCost = (cacheCreationTokens * pricing.cacheCreation) / 1000;

      // Total cost
      const totalCost = inputCost + outputCost + cacheReadCost + cacheCreationCost;

      return totalCost;
    } catch (error) {
      console.error('Failed to calculate estimated cost:', error);
      return 0;
    }
  }

  /**
   * Write metrics to the database
   *
   * @param {Object} metrics - Metrics object to write
   * @returns {Promise<void>}
   */
  async writeToDatabase(metrics) {
    try {
      console.log('🔍 [TokenAnalyticsWriter] Starting database write:', {
        hasMetrics: !!metrics,
        hasDb: !!this.db,
        sessionId: metrics?.sessionId
      });

      // Validate metrics
      if (!metrics) {
        console.warn('⚠️ [TokenAnalyticsWriter] No metrics provided to writeToDatabase');
        return;
      }

      // Validate database connection
      if (!this.db) {
        console.error('❌ [TokenAnalyticsWriter] Database not initialized');
        return;
      }

      // Generate unique ID and timestamp
      const id = randomUUID();
      const timestamp = new Date().toISOString();

      // Prepare SQL statement (better-sqlite3 uses @ for named parameters)
      const sql = `
        INSERT INTO token_analytics (
          id, timestamp, sessionId, operation, model,
          inputTokens, outputTokens, totalTokens, estimatedCost
        ) VALUES (
          @id, @timestamp, @sessionId, @operation, @model,
          @inputTokens, @outputTokens, @totalTokens, @estimatedCost
        )
      `;

      // Prepare parameters
      const params = {
        id: id,
        timestamp: timestamp,
        sessionId: metrics.sessionId,
        operation: metrics.operation,
        model: metrics.model,
        inputTokens: metrics.inputTokens,
        outputTokens: metrics.outputTokens,
        totalTokens: metrics.totalTokens,
        estimatedCost: metrics.estimatedCost
      };

      console.log('🔍 [TokenAnalyticsWriter] Executing database write with params:', params);

      // Execute database write (better-sqlite3 is synchronous)
      const stmt = this.db.prepare(sql);
      const result = stmt.run(params);

      console.log('✅ [TokenAnalyticsWriter] Token analytics record written successfully:', {
        id,
        sessionId: metrics.sessionId,
        totalTokens: metrics.totalTokens,
        estimatedCost: metrics.estimatedCost,
        changes: result.changes
      });
    } catch (error) {
      console.error('❌ [TokenAnalyticsWriter] Failed to write token analytics:', error);
      console.error('❌ [TokenAnalyticsWriter] Error stack:', error.stack);
      console.error('❌ [TokenAnalyticsWriter] Metrics that failed to write:', metrics);
      // Don't throw - graceful error handling
    }
  }

  /**
   * Main entry point: Extract metrics, calculate cost, and write to database
   *
   * @param {Array} messages - Array of SDK messages
   * @param {string} sessionId - Session identifier
   * @returns {Promise<void>}
   */
  async writeTokenMetrics(messages, sessionId) {
    try {
      console.log('🚀 [TokenAnalyticsWriter] Starting writeTokenMetrics:', {
        messagesCount: messages?.length || 0,
        sessionId
      });

      // Step 1: Extract metrics from SDK messages
      const metrics = this.extractMetricsFromSDK(messages, sessionId);

      if (!metrics) {
        // Extraction failed - don't proceed
        console.warn('⚠️ [TokenAnalyticsWriter] Metric extraction failed, aborting write');
        return;
      }

      console.log('✅ [TokenAnalyticsWriter] Metrics extracted successfully');

      // Step 2: Calculate estimated cost
      const estimatedCost = this.calculateEstimatedCost(metrics, metrics.model);

      console.log('✅ [TokenAnalyticsWriter] Cost calculated:', { estimatedCost });

      // Step 3: Add calculated cost to metrics
      metrics.estimatedCost = estimatedCost;

      // Step 4: Write to database
      await this.writeToDatabase(metrics);

      console.log('🎉 [TokenAnalyticsWriter] writeTokenMetrics completed successfully');
    } catch (error) {
      console.error('❌ [TokenAnalyticsWriter] Failed to write token metrics:', error);
      console.error('❌ [TokenAnalyticsWriter] Error stack:', error.stack);
      // Don't throw - graceful error handling
    }
  }
}

export { TokenAnalyticsWriter };
export default TokenAnalyticsWriter;
