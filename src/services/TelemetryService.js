/**
 * TelemetryService - Enhanced Live Activity Telemetry System
 *
 * Captures, enriches, broadcasts, and persists Claude Code SDK activity events.
 * Follows SPARC architecture and integrates with existing TokenAnalyticsWriter patterns.
 *
 * Key Features:
 * - Real-time tool execution tracking
 * - Agent lifecycle management
 * - Prompt analytics with privacy controls
 * - Progress tracking for multi-step workflows
 * - Session metrics aggregation
 * - SSE broadcasting for live updates
 * - SQLite persistence with graceful error handling
 *
 * @module TelemetryService
 */

import { randomUUID } from 'crypto';
import crypto from 'crypto';

/**
 * Maximum lengths for data sanitization
 */
const MAX_PROMPT_LENGTH = 200;
const MAX_FILE_PATH_LENGTH = 100;
const MAX_ACTION_LENGTH = 150;

/**
 * Sensitive data patterns to redact
 */
const SENSITIVE_PATTERNS = [
  /token=[^&\s]+/gi,
  /key=[^&\s]+/gi,
  /password=[^&\s]+/gi,
  /secret=[^&\s]+/gi,
  /api[_-]?key[:\s=]+[^\s&]+/gi
];

export class TelemetryService {
  /**
   * Initialize TelemetryService
   * @param {Object} db - SQLite database instance (better-sqlite3)
   * @param {Function} sseStream - SSE broadcast function (broadcastToSSE)
   */
  constructor(db, sseStream) {
    this.db = db;
    this.sseStream = sseStream;
    this.eventBuffer = [];
    this.sessionCache = new Map();
    this.activeAgents = new Map(); // agentId -> agent metadata
    this.activeSessions = new Map(); // sessionId -> session metadata
    this.initialized = !!db && !!sseStream;

    console.log('✅ [TelemetryService] Initialized:', {
      hasDatabase: !!db,
      hasSSEStream: !!sseStream,
      initialized: this.initialized
    });
  }

  /**
   * Capture session started event
   * @param {string} sessionId - Unique session identifier
   * @param {string} source - Source of the session (api_request, background_task, etc.)
   */
  async captureSessionStarted(sessionId, source = 'api_request') {
    try {
      const timestamp = new Date().toISOString();

      // Store in active sessions
      this.activeSessions.set(sessionId, {
        sessionId,
        source,
        startTime: timestamp,
        requestCount: 0,
        totalTokens: 0,
        totalCost: 0
      });

      // Create session in database if not exists
      const existingSession = this.db.prepare(`
        SELECT session_id FROM session_metrics WHERE session_id = ?
      `).get(sessionId);

      if (!existingSession) {
        this.db.prepare(`
          INSERT INTO session_metrics (session_id, start_time, status, request_count, total_tokens, total_cost, agent_count, tool_count, error_count)
          VALUES (?, ?, 'active', 0, 0, 0.0, 0, 0, 0)
        `).run(
          sessionId,
          timestamp
        );
      }

      // Broadcast via SSE
      if (this.sseStream?.broadcast) {
        this.sseStream.broadcast({
          type: 'telemetry_event',
          data: {
            event: 'session_started',
            sessionId,
            source,
            timestamp
          }
        });
      }

      console.log(`📊 [TELEMETRY] Session started: ${sessionId} (${source})`);
      return { success: true, sessionId, timestamp };
    } catch (error) {
      console.error('❌ [TELEMETRY] Failed to capture session started:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Capture session ended event
   * @param {string} sessionId - Session identifier
   * @param {string} status - Final status (completed, failed, timeout)
   */
  async captureSessionEnded(sessionId, status = 'completed') {
    try {
      const timestamp = new Date().toISOString();
      const sessionData = this.activeSessions.get(sessionId);

      // Update session in database
      this.db.prepare(`
        UPDATE session_metrics
        SET status = ?, end_time = ?, duration = ?
        WHERE session_id = ?
      `).run(status, timestamp, sessionData ? this.calculateDuration(sessionData.startTime, timestamp) : 0, sessionId);

      // Broadcast via SSE
      if (this.sseStream?.broadcast) {
        this.sseStream.broadcast({
          type: 'telemetry_event',
          data: {
            event: 'session_ended',
            sessionId,
            status,
            duration: sessionData ? this.calculateDuration(sessionData.startTime, timestamp) : 0,
            timestamp
          }
        });
      }

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      console.log(`📊 [TELEMETRY] Session ended: ${sessionId} (${status})`);
      return { success: true, sessionId, status, timestamp };
    } catch (error) {
      console.error('❌ [TELEMETRY] Failed to capture session ended:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Capture prompt submitted event
   * @param {string} sessionId - Session identifier
   * @param {string} prompt - User prompt
   * @param {string} model - Model being used
   */
  async capturePromptSubmitted(sessionId, prompt, model) {
    try {
      const timestamp = new Date().toISOString();
      const promptHash = this.hashContent(prompt);

      // Broadcast via SSE
      if (this.sseStream?.broadcast) {
        this.sseStream.broadcast({
          type: 'telemetry_event',
          data: {
            event: 'prompt_submitted',
            sessionId,
            model,
            promptLength: prompt.length,
            promptPreview: prompt.substring(0, 100),
            timestamp
          }
        });
      }

      console.log(`📊 [TELEMETRY] Prompt submitted: ${sessionId} (${model})`);
      return { success: true, sessionId, promptHash, timestamp };
    } catch (error) {
      console.error('❌ [TELEMETRY] Failed to capture prompt submitted:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Capture agent started event
   * @param {string} agentId - Unique agent identifier
   * @param {string} sessionId - Session this agent belongs to
   * @param {string} agentType - Type of agent (streaming_chat, background_task, etc.)
   * @param {string} task - Task description
   * @param {string} model - Model being used
   */
  async captureAgentStarted(agentId, sessionId, agentType, task, model) {
    try {
      const timestamp = new Date().toISOString();

      // Store in active agents
      this.activeAgents.set(agentId, {
        agentId,
        sessionId,
        agentType,
        task,
        model,
        startTime: timestamp,
        toolExecutions: [],
        status: 'running'
      });

      // Broadcast via SSE
      if (this.sseStream?.broadcast) {
        this.sseStream.broadcast({
          type: 'telemetry_event',
          data: {
            event: 'agent_started',
            agentId,
            sessionId,
            agentType,
            model,
            taskPreview: task.substring(0, 100),
            timestamp
          }
        });
      }

      console.log(`📊 [TELEMETRY] Agent started: ${agentId} (${agentType})`);
      return { success: true, agentId, timestamp };
    } catch (error) {
      console.error('❌ [TELEMETRY] Failed to capture agent started:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Capture agent completed event
   * @param {string} agentId - Agent identifier
   * @param {object} metadata - Completion metadata (tokens, cost, duration, etc.)
   */
  async captureAgentCompleted(agentId, metadata = {}) {
    try {
      const timestamp = new Date().toISOString();
      const agentData = this.activeAgents.get(agentId);

      if (!agentData) {
        console.warn(`⚠️ [TELEMETRY] Agent ${agentId} not found in active agents`);
        return { success: false, error: 'Agent not found' };
      }

      const duration = this.calculateDuration(agentData.startTime, timestamp);

      // Broadcast via SSE
      if (this.sseStream?.broadcast) {
        this.sseStream.broadcast({
          type: 'telemetry_event',
          data: {
            event: 'agent_completed',
            agentId,
            sessionId: agentData.sessionId,
            duration,
            tokens: metadata.tokens || 0,
            cost: metadata.cost || 0,
            toolExecutions: agentData.toolExecutions.length,
            timestamp
          }
        });
      }

      // Update agent status
      agentData.status = 'completed';
      agentData.endTime = timestamp;
      agentData.duration = duration;
      agentData.metadata = metadata;

      console.log(`📊 [TELEMETRY] Agent completed: ${agentId} (${duration}ms)`);
      return { success: true, agentId, duration, timestamp };
    } catch (error) {
      console.error('❌ [TELEMETRY] Failed to capture agent completed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Capture agent failed event
   * @param {string} agentId - Agent identifier
   * @param {Error} error - Error that caused failure
   */
  async captureAgentFailed(agentId, error) {
    try {
      const timestamp = new Date().toISOString();
      const agentData = this.activeAgents.get(agentId);

      if (!agentData) {
        console.warn(`⚠️ [TELEMETRY] Agent ${agentId} not found in active agents`);
        return { success: false, error: 'Agent not found' };
      }

      const duration = this.calculateDuration(agentData.startTime, timestamp);

      // Broadcast via SSE
      if (this.sseStream?.broadcast) {
        this.sseStream.broadcast({
          type: 'telemetry_event',
          data: {
            event: 'agent_failed',
            agentId,
            sessionId: agentData.sessionId,
            duration,
            error: error.message,
            timestamp
          }
        });
      }

      // Update agent status
      agentData.status = 'failed';
      agentData.endTime = timestamp;
      agentData.duration = duration;
      agentData.error = error.message;

      // Remove from active agents
      this.activeAgents.delete(agentId);

      console.log(`📊 [TELEMETRY] Agent failed: ${agentId} - ${error.message}`);
      return { success: true, agentId, duration, timestamp };
    } catch (err) {
      console.error('❌ [TELEMETRY] Failed to capture agent failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Capture tool execution event
   * @param {string} toolName - Name of the tool
   * @param {object} toolInput - Tool input parameters
   * @param {object} toolOutput - Tool output/result
   * @param {number} startTime - Execution start timestamp
   * @param {number} endTime - Execution end timestamp
   */
  async captureToolExecution(toolName, toolInput, toolOutput, startTime, endTime) {
    try {
      const timestamp = new Date().toISOString();
      const duration = endTime - startTime;

      // Find the current active agent (simplified - assumes single agent)
      const activeAgent = Array.from(this.activeAgents.values()).find(a => a.status === 'running');

      if (activeAgent) {
        activeAgent.toolExecutions.push({
          toolName,
          duration,
          timestamp,
          success: !toolOutput?.error
        });
      }

      // Broadcast via SSE
      if (this.sseStream?.broadcast) {
        this.sseStream.broadcast({
          type: 'telemetry_event',
          data: {
            event: 'tool_execution',
            toolName,
            duration,
            success: !toolOutput?.error,
            agentId: activeAgent?.agentId,
            sessionId: activeAgent?.sessionId,
            timestamp
          }
        });
      }

      console.log(`📊 [TELEMETRY] Tool executed: ${toolName} (${duration}ms)`);
      return { success: true, toolName, duration, timestamp };
    } catch (error) {
      console.error('❌ [TELEMETRY] Failed to capture tool execution:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active sessions
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get active agents
   */
  getActiveAgents() {
    return Array.from(this.activeAgents.values());
  }

  /**
   * Get telemetry statistics
   */
  getStatistics() {
    try {
      const stats = this.db.prepare(`
        SELECT
          COUNT(*) as total_sessions,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_sessions,
          SUM(total_requests) as total_requests,
          SUM(total_input_tokens + total_output_tokens) as total_tokens,
          SUM(total_cost_cents) as total_cost_cents
        FROM token_sessions
      `).get();

      return {
        sessions: stats || {},
        activeAgents: this.activeAgents.size,
        activeSessions: this.activeSessions.size
      };
    } catch (error) {
      console.error('❌ [TELEMETRY] Failed to get statistics:', error);
      return {
        sessions: {},
        activeAgents: 0,
        activeSessions: 0
      };
    }
  }

  /**
   * Helper: Calculate duration in milliseconds
   */
  calculateDuration(startTime, endTime) {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return end - start;
  }

  /**
   * Helper: Hash content for deduplication
   */
  hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  // ========================================================================
  // NEW: COMPREHENSIVE HELPER METHODS (Following SPARC Architecture)
  // ========================================================================

  /**
   * Sanitize prompt text by truncating and removing sensitive data
   * @param {string} prompt - Prompt text to sanitize
   * @param {number} maxLength - Maximum length (default: 200)
   * @returns {string} Sanitized prompt
   */
  sanitizePrompt(prompt, maxLength = MAX_PROMPT_LENGTH) {
    if (!prompt || typeof prompt !== 'string') {
      return '';
    }

    let sanitized = prompt;

    // Remove sensitive patterns
    SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    // Truncate if too long
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength - 3) + '...';
    }

    return sanitized;
  }

  /**
   * Sanitize file path by removing user directories
   * @param {string} path - File path to sanitize
   * @returns {string} Sanitized path
   */
  sanitizeFilePath(path) {
    if (!path || typeof path !== 'string') {
      return '';
    }

    // Remove common user directory patterns
    let sanitized = path
      .replace(/\/home\/[^/]+\//g, '~/')
      .replace(/\/Users\/[^/]+\//g, '~/');

    // Truncate if too long
    if (sanitized.length > MAX_FILE_PATH_LENGTH) {
      const parts = sanitized.split('/');
      const filename = parts[parts.length - 1];
      sanitized = '.../' + filename;
    }

    return sanitized;
  }

  /**
   * Sanitize error stack trace
   * @param {string} stack - Stack trace
   * @returns {string} Sanitized stack (first 3 lines only)
   */
  sanitizeStack(stack) {
    if (!stack || typeof stack !== 'string') {
      return '';
    }

    const lines = stack.split('\n').slice(0, 3);
    return lines.join('\n');
  }

  /**
   * Extract file path from tool input
   * @param {Object} toolInput - Tool input parameters
   * @returns {string|null} File path or null
   */
  extractFilePath(toolInput) {
    if (!toolInput) {
      return null;
    }

    // Check common file path fields
    return toolInput.file_path ||
           toolInput.path ||
           toolInput.notebook_path ||
           null;
  }

  /**
   * Calculate output size in bytes
   * @param {Object} output - Tool output
   * @returns {number} Size in bytes
   */
  calculateOutputSize(output) {
    if (!output) {
      return 0;
    }

    try {
      return JSON.stringify(output).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Format tool action for human-readable display
   * @param {string} toolName - Tool name
   * @param {Object} toolInput - Tool input
   * @returns {string} Formatted action string
   */
  formatToolAction(toolName, toolInput) {
    if (!toolInput) {
      return 'unknown action';
    }

    const toolLower = toolName.toLowerCase();

    switch (toolLower) {
      case 'bash':
        return this.sanitizePrompt(toolInput.command || 'command', MAX_ACTION_LENGTH);

      case 'read':
      case 'read_file':
        return this.extractFileName(toolInput.file_path || toolInput.path);

      case 'write':
      case 'write_to_file':
        return this.extractFileName(toolInput.file_path || toolInput.path);

      case 'edit':
      case 'edit_file':
        const filename = this.extractFileName(toolInput.file_path || toolInput.path);
        return filename;

      case 'grep':
        return `pattern: ${this.sanitizePrompt(toolInput.pattern || 'unknown', 50)}`;

      case 'glob':
        return `pattern: ${this.sanitizePrompt(toolInput.pattern || 'unknown', 50)}`;

      case 'task':
        return this.sanitizePrompt(toolInput.description || toolInput.prompt || 'task', 80);

      default:
        return this.sanitizePrompt(JSON.stringify(toolInput), MAX_ACTION_LENGTH);
    }
  }

  /**
   * Extract filename from file path
   * @param {string} path - File path
   * @returns {string} Filename
   */
  extractFileName(path) {
    if (!path) {
      return 'unknown';
    }

    const parts = path.split('/');
    const filename = parts[parts.length - 1];

    if (filename.length > 40) {
      return filename.substring(0, 37) + '...';
    }

    return filename;
  }

  /**
   * Estimate token count from prompt text
   * @param {string} prompt - Prompt text
   * @returns {number} Estimated token count
   */
  estimateTokens(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return 0;
    }

    // Rough estimation: ~4 characters per token
    return Math.ceil(prompt.length / 4);
  }

  /**
   * Classify prompt type based on content patterns
   * @param {string} prompt - Prompt text
   * @returns {string} Prompt type classification
   */
  classifyPromptType(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return 'unknown';
    }

    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('create') || lowerPrompt.includes('build') || lowerPrompt.includes('implement')) {
      return 'code_generation';
    }

    if (lowerPrompt.includes('analyze') || lowerPrompt.includes('review') || lowerPrompt.includes('explain')) {
      return 'code_analysis';
    }

    if (lowerPrompt.includes('fix') || lowerPrompt.includes('debug') || lowerPrompt.includes('error')) {
      return 'debugging';
    }

    if (lowerPrompt.includes('document') || lowerPrompt.includes('comment') || lowerPrompt.includes('readme')) {
      return 'documentation';
    }

    return 'chat';
  }

  /**
   * Enrich event with additional metadata
   * @param {Object} event - Event object
   * @returns {Object} Enriched event
   */
  enrichEvent(event) {
    return {
      ...event,
      enrichedAt: Date.now(),
      priority: this.calculateEventPriority(event),
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Calculate event priority for routing
   * @param {Object} event - Event object
   * @returns {string} Priority level (critical, high, medium, low)
   */
  calculateEventPriority(event) {
    if (event.event === 'agent_failed' || event.type === 'agent_failed') {
      return 'critical';
    }

    if (event.event === 'agent_started' || event.type === 'agent_started' ||
        event.event === 'prompt_submitted' || event.type === 'prompt_submitted') {
      return 'high';
    }

    if (event.event === 'progress_update' || event.type === 'progress_update') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Broadcast event via SSE
   * @param {Object} event - Event to broadcast
   * @param {string} priority - Priority override (optional)
   * @returns {Promise<void>}
   */
  async broadcastEvent(event, priority = null) {
    try {
      if (!this.sseStream) {
        console.warn('⚠️ [TelemetryService] SSE stream not available, skipping broadcast');
        return;
      }

      const message = {
        type: 'telemetry_event',
        data: {
          ...event,
          priority: priority || event.priority || this.calculateEventPriority(event)
        }
      };

      // Call the SSE broadcast function
      if (typeof this.sseStream === 'function') {
        this.sseStream(message);
      } else if (this.sseStream.broadcast) {
        this.sseStream.broadcast(message);
      }

      console.log('📡 [TelemetryService] Event broadcasted:', {
        type: event.event || event.type,
        priority: message.data.priority
      });
    } catch (error) {
      console.error('❌ [TelemetryService] Failed to broadcast event:', error);
      // Buffer event for retry
      this.eventBuffer.push(event);
    }
  }

  /**
   * Persist event to database
   * @param {Object} event - Event to persist
   * @returns {Promise<void>}
   */
  async persistEvent(event) {
    try {
      if (!this.db) {
        console.warn('⚠️ [TelemetryService] Database not available, skipping persistence');
        return;
      }

      // Insert into activity_events table (if it exists)
      // Fallback to simple logging if table doesn't exist
      try {
        const sql = `
          INSERT INTO activity_events (
            id, type, timestamp, session_id, agent_id,
            data, priority
          ) VALUES (
            @id, @type, @timestamp, @sessionId, @agentId,
            @data, @priority
          )
        `;

        const params = {
          id: event.id || randomUUID(),
          type: event.event || event.type || 'unknown',
          timestamp: new Date(event.timestamp || Date.now()).toISOString(),
          sessionId: event.sessionId || null,
          agentId: event.agentId || null,
          data: JSON.stringify(event),
          priority: event.priority || 'medium'
        };

        const stmt = this.db.prepare(sql);
        stmt.run(params);

        console.log('💾 [TelemetryService] Event persisted:', {
          id: params.id,
          type: params.type
        });
      } catch (dbError) {
        // Table might not exist - log but don't fail
        console.warn('⚠️ [TelemetryService] Database persist warning (table may not exist):', dbError.message);
      }
    } catch (error) {
      console.error('❌ [TelemetryService] Failed to persist event:', error);
      // Don't throw - persistence failures should not block execution
    }
  }

  /**
   * Batch persist events for performance
   * @param {Array} events - Events to persist
   * @returns {Promise<void>}
   */
  async batchPersistEvents(events) {
    if (!this.db || !events || events.length === 0) {
      return;
    }

    try {
      const transaction = this.db.transaction((eventsToInsert) => {
        const stmt = this.db.prepare(`
          INSERT INTO activity_events (
            id, type, timestamp, session_id, agent_id,
            data, priority
          ) VALUES (
            @id, @type, @timestamp, @sessionId, @agentId,
            @data, @priority
          )
        `);

        for (const event of eventsToInsert) {
          stmt.run({
            id: event.id || randomUUID(),
            type: event.event || event.type || 'unknown',
            timestamp: new Date(event.timestamp || Date.now()).toISOString(),
            sessionId: event.sessionId || null,
            agentId: event.agentId || null,
            data: JSON.stringify(event),
            priority: event.priority || 'medium'
          });
        }
      });

      transaction(events);

      console.log('💾 [TelemetryService] Batch persisted:', { count: events.length });
    } catch (error) {
      console.error('❌ [TelemetryService] Batch persist failed:', error);
    }
  }

  /**
   * Update session metrics
   * @param {string} sessionId - Session identifier
   * @param {Object} updates - Metrics to update
   * @returns {Promise<void>}
   */
  async updateSessionMetrics(sessionId, updates) {
    try {
      if (!this.db) {
        return;
      }

      const cached = this.sessionCache.get(sessionId);
      if (cached) {
        cached.requestCount = (cached.requestCount || 0) + (updates.requestCount || 0);
        cached.totalCost = (cached.totalCost || 0) + (updates.totalCost || 0);
        cached.totalTokens = (cached.totalTokens || 0) + (updates.totalTokens || 0);
        this.sessionCache.set(sessionId, cached);
      }

      console.log('✅ [TelemetryService] Session metrics updated:', { sessionId });
    } catch (error) {
      console.error('❌ [TelemetryService] Failed to update session metrics:', error);
    }
  }

  /**
   * Get session metrics
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object|null>} Session metrics or null
   */
  async getSessionMetrics(sessionId) {
    try {
      return this.sessionCache.get(sessionId) || null;
    } catch (error) {
      console.error('❌ [TelemetryService] Failed to get session metrics:', error);
      return null;
    }
  }

  /**
   * Capture progress update for multi-step workflows
   * @param {string} sessionId - Session identifier
   * @param {number} currentStep - Current step number
   * @param {number} totalSteps - Total number of steps
   * @param {number} percentage - Completion percentage
   * @param {number} eta - Estimated time remaining (seconds)
   * @param {string} description - Current step description
   * @returns {Promise<void>}
   */
  async captureProgressUpdate(sessionId, currentStep, totalSteps, percentage, eta, description) {
    try {
      const event = {
        id: randomUUID(),
        event: 'progress_update',
        type: 'progress_update',
        timestamp: Date.now(),
        sessionId,
        currentStep,
        totalSteps,
        percentage: Math.round(percentage * 100) / 100,
        eta,
        description: this.sanitizePrompt(description, MAX_ACTION_LENGTH)
      };

      const enrichedEvent = this.enrichEvent(event);

      // Progress updates are high priority for UX
      await this.broadcastEvent(enrichedEvent, 'high');

      console.log('✅ [TelemetryService] Progress update:', {
        sessionId,
        percentage: event.percentage,
        currentStep,
        totalSteps
      });
    } catch (error) {
      console.error('❌ [TelemetryService] Failed to capture progress:', error);
    }
  }

  /**
   * Cleanup old events (for maintenance)
   * @param {number} daysToKeep - Days to keep (default: 30)
   * @returns {Promise<void>}
   */
  async cleanupOldEvents(daysToKeep = 30) {
    try {
      if (!this.db) {
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      try {
        const sql = `
          DELETE FROM activity_events
          WHERE timestamp < @cutoffDate
        `;

        const stmt = this.db.prepare(sql);
        const result = stmt.run({ cutoffDate: cutoffDate.toISOString() });

        console.log('🗑️ [TelemetryService] Cleanup completed:', {
          deletedRows: result.changes,
          cutoffDate: cutoffDate.toISOString()
        });
      } catch (dbError) {
        console.warn('⚠️ [TelemetryService] Cleanup warning:', dbError.message);
      }
    } catch (error) {
      console.error('❌ [TelemetryService] Cleanup failed:', error);
    }
  }

  /**
   * Health check for telemetry system
   * @returns {Object} Health status
   */
  healthCheck() {
    return {
      status: this.initialized ? 'healthy' : 'degraded',
      hasDatabase: !!this.db,
      hasSSEStream: !!this.sseStream,
      bufferSize: this.eventBuffer.length,
      sessionCacheSize: this.sessionCache.size,
      activeAgents: this.activeAgents.size,
      activeSessions: this.activeSessions.size,
      timestamp: Date.now()
    };
  }
}
