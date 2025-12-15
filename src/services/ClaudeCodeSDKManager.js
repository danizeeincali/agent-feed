/**
 * Claude Code SDK Manager - Official @anthropic-ai/claude-code Implementation
 * Provides Claude with file system access, bash execution, and development tools
 * Working Directory: /workspaces/agent-feed/prod
 * Permission Mode: bypassPermissions for full automation
 */

import { query } from '@anthropic-ai/claude-code';
import { broadcastToolActivity, formatToolAction } from '../api/routes/claude-code-sdk.js';
import { TelemetryService } from './TelemetryService.js';

class ClaudeCodeSDKManager {
  constructor() {
    this.workingDirectory = '/workspaces/agent-feed/prod';
    this.initialized = false;
    this.sessions = new Map();
    this.telemetry = null; // Will be initialized with db and sse

    // Full tool access configuration
    this.allowedTools = [
      'Bash',
      'Read',
      'Write',
      'Edit',
      'MultiEdit',
      'Grep',
      'Glob',
      'WebFetch',
      'WebSearch'
    ];

    this.model = 'claude-sonnet-4-20250514';
    this.permissionMode = 'bypassPermissions';

    this.init();
  }

  /**
   * Initialize TelemetryService with database and SSE stream
   * Must be called after database is ready
   */
  initializeTelemetry(db, sseStream) {
    this.telemetry = new TelemetryService(db, sseStream);
    console.log('✅ TelemetryService initialized in ClaudeCodeSDKManager');
  }

  async init() {
    try {
      this.initialized = true;
      console.log('✅ Claude Code SDK Manager initialized with official SDK');
      console.log(`📁 Working Directory: ${this.workingDirectory}`);
      console.log(`🤖 Model: ${this.model}`);
      console.log(`🛠️ Tools Available: ${this.allowedTools.join(', ')}`);
      console.log(`🔓 Permission Mode: ${this.permissionMode}`);

    } catch (error) {
      console.error('❌ Failed to initialize Claude Code SDK:', error.message);
      throw error;
    }
  }

  /**
   * Execute a query using the official Claude Code SDK
   */
  async queryClaudeCode(prompt, options = {}) {
    if (!this.initialized) await this.init();

    try {
      console.log('🚀 Executing Claude Code query...');
      console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

      const queryOptions = {
        cwd: options.cwd || this.workingDirectory,
        model: options.model || this.model,
        permissionMode: this.permissionMode,
        allowedTools: options.allowedTools || this.allowedTools,
        maxTurns: 10 // Limit turns to prevent infinite loops
      };

      console.log('🔧 Query options:', JSON.stringify(queryOptions, null, 2));

      const messages = [];
      const queryResponse = query({
        prompt: prompt,
        options: queryOptions
      });

      console.log('🔄 Starting to process messages...');

      for await (const message of queryResponse) {
        console.log(`📨 Received message type: ${message.type}`);
        messages.push(message);

        // Broadcast tool executions to SSE stream
        if (message.type === 'assistant' && message.message?.content) {
          const content = Array.isArray(message.message.content)
            ? message.message.content
            : [message.message.content];

          // Look for tool_use blocks in the content
          content.forEach(block => {
            if (typeof block === 'object' && block.type === 'tool_use') {
              const toolName = block.name;
              const toolInput = block.input;
              const action = formatToolAction(toolName, toolInput);

              console.log(`🔧 Tool execution detected: ${toolName}(${action})`);

              // Broadcast to SSE
              broadcastToolActivity(toolName, action, {
                block_id: block.id,
                message_uuid: message.uuid
              });
            }
          });
        }

        // Log different message types with details
        if (message.type === 'assistant') {
          console.log('💬 Assistant response received:', {
            uuid: message.uuid,
            contentLength: message.message?.content?.length || 0
          });
        } else if (message.type === 'result') {
          console.log(`✅ Query completed: ${message.subtype}`, {
            duration: message.duration_ms,
            cost: message.total_cost_usd,
            turns: message.num_turns
          });
        } else if (message.type === 'system') {
          console.log(`⚙️ System message: ${message.subtype}`, {
            cwd: message.cwd,
            model: message.model,
            tools: message.tools?.length || 0
          });
        } else if (message.type === 'stream_event') {
          console.log('🌊 Stream event received');
        }
      }

      console.log(`✅ Query completed with ${messages.length} messages`);

      return {
        messages,
        success: true
      };

    } catch (error) {
      console.error('❌ Claude Code query failed:', error);
      return {
        messages: [],
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create streaming chat with full Claude Code capabilities
   */
  async createStreamingChat(userInput, options = {}) {
    if (!this.initialized) await this.init();

    const sessionId = options.sessionId || `session_${Date.now()}`;
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log(`🚀 Starting Claude Code session with official SDK`);
      console.log(`📁 Working Directory: ${this.workingDirectory}`);
      console.log(`🛠️ Tools: ${this.allowedTools.join(', ')}`);

      // Capture agent started
      if (this.telemetry) {
        await this.telemetry.captureAgentStarted(
          agentId,
          sessionId,
          'streaming_chat',
          userInput,
          this.model
        );
      }

      const startTime = Date.now();
      const result = await this.queryClaudeCode(userInput, options);
      const endTime = Date.now();

      if (result.success && result.messages.length > 0) {
        const lastMessage = result.messages[result.messages.length - 1];

        // Extract token and cost information from messages
        const tokens = this.extractTokenMetrics(result.messages);
        const cost = this.calculateCost(tokens);

        // Capture agent completed
        if (this.telemetry) {
          await this.telemetry.captureAgentCompleted(agentId, {
            sessionId,
            duration: endTime - startTime,
            tokens,
            cost,
            messageCount: result.messages.length
          });
        }

        return [{
          type: 'assistant',
          content: this.extractContent(lastMessage),
          timestamp: new Date().toISOString(),
          model: this.model,
          workingDirectory: this.workingDirectory,
          toolsEnabled: this.allowedTools,
          permissionMode: this.permissionMode,
          real: true,
          claudeCode: true,
          messages: result.messages
        }];
      } else {
        throw new Error(result.error || 'Query failed');
      }

    } catch (error) {
      console.error('Claude Code streaming chat error:', error);

      // Capture agent failed
      if (this.telemetry) {
        await this.telemetry.captureAgentFailed(agentId, error);
      }

      throw error;
    }
  }

  /**
   * Extract content from SDK message
   */
  extractContent(message) {
    console.log('🔍 Extracting content from message:', { type: message.type, subtype: message.subtype });

    if (message.type === 'assistant' && message.message) {
      if (typeof message.message.content === 'string') {
        console.log('📝 Found string content:', message.message.content.substring(0, 100) + '...');
        return message.message.content;
      } else if (Array.isArray(message.message.content)) {
        const textContent = message.message.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('');
        console.log('📝 Found array content:', textContent.substring(0, 100) + '...');
        return textContent;
      }
    } else if (message.type === 'result') {
      const result = message.result || 'Task completed successfully';
      console.log('🎯 Found result content:', result.substring(0, 100) + '...');
      return result;
    } else if (message.type === 'system') {
      return `System initialized: ${message.model} in ${message.cwd}`;
    }

    console.log('⚠️ No extractable content found, returning default');
    return 'Response received';
  }

  /**
   * Execute headless task with Claude Code
   */
  async executeHeadlessTask(prompt, options = {}) {
    if (!this.initialized) await this.init();

    const sessionId = options.sessionId || `session_${Date.now()}`;
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log(`🚀 Starting headless task with Claude Code SDK`);
      console.log(`📁 Working Directory: ${this.workingDirectory}`);
      console.log(`🛠️ Tools: ${this.allowedTools.join(', ')}`);

      // Capture agent started
      if (this.telemetry) {
        await this.telemetry.captureAgentStarted(
          agentId,
          sessionId,
          'headless_task',
          this.sanitizePrompt(prompt),
          this.model
        );
      }

      const startTime = Date.now();
      const result = await this.queryClaudeCode(prompt, options);
      const endTime = Date.now();

      if (result.success) {
        // Extract token and cost information from messages
        const tokens = this.extractTokenMetrics(result.messages);
        const cost = this.calculateCost(tokens);

        // Track tool executions from messages
        if (this.telemetry) {
          await this.captureToolExecutionsFromMessages(result.messages, agentId);
        }

        // Capture agent completed
        if (this.telemetry) {
          await this.telemetry.captureAgentCompleted(agentId, {
            sessionId,
            duration: endTime - startTime,
            tokens,
            cost,
            messageCount: result.messages.length
          });
        }

        return {
          output: JSON.stringify({
            messages: result.messages,
            timestamp: new Date().toISOString(),
            workingDirectory: this.workingDirectory,
            mode: 'headless_claude_code_official'
          })
        };
      } else {
        throw new Error(result.error || 'Query failed');
      }

    } catch (error) {
      console.error('Headless task error:', error);

      // Capture agent failed
      if (this.telemetry) {
        await this.telemetry.captureAgentFailed(agentId, error);
      }

      throw new Error('Background task failed. Please check configuration.');
    }
  }

  /**
   * Health check for Claude Code SDK
   */
  async healthCheck() {
    try {
      if (!this.initialized) await this.init();

      const result = await this.queryClaudeCode(
        'Use the Read tool to check if package.json exists in the current directory and return "CLAUDE_CODE_HEALTHY" if you can access files',
        { allowedTools: ['Read'] }
      );

      if (result.success) {
        const content = result.messages
          .map(msg => this.extractContent(msg))
          .join(' ');
        return content.includes('CLAUDE_CODE_HEALTHY') || content.includes('package.json');
      }
      return false;

    } catch (error) {
      console.error('Claude Code health check failed:', error);
      return false;
    }
  }

  /**
   * Get SDK status with tool access information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      claudeCodeSDK: '@anthropic-ai/claude-code',
      toolAccessEnabled: true,
      workingDirectory: this.workingDirectory,
      model: this.model,
      allowedTools: this.allowedTools,
      permissionMode: this.permissionMode,
      sessionCount: this.sessions.size
    };
  }

  /**
   * Create new session with context management
   */
  createSession(sessionId = null) {
    const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session = {
      id: id,
      created: new Date().toISOString(),
      workingDirectory: this.workingDirectory,
      context: [],
      toolsEnabled: this.allowedTools,
      active: true
    };

    this.sessions.set(id, session);
    console.log(`✅ Created Claude Code session: ${id}`);

    return session;
  }

  /**
   * Get session information
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Close session and cleanup
   */
  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.active = false;
      session.closed = new Date().toISOString();
      this.sessions.delete(sessionId);
      console.log(`✅ Closed Claude Code session: ${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * Extract token metrics from SDK messages
   */
  extractTokenMetrics(messages) {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    messages.forEach(msg => {
      if (msg.type === 'result' && msg.usage) {
        totalInputTokens += msg.usage.input_tokens || 0;
        totalOutputTokens += msg.usage.output_tokens || 0;
      }
    });

    return {
      input: totalInputTokens,
      output: totalOutputTokens,
      total: totalInputTokens + totalOutputTokens
    };
  }

  /**
   * Calculate cost based on token metrics
   * Claude Sonnet 4 pricing: $3/MTok input, $15/MTok output
   */
  calculateCost(tokens) {
    const inputCost = (tokens.input / 1000000) * 3.0;
    const outputCost = (tokens.output / 1000000) * 15.0;
    return inputCost + outputCost;
  }

  /**
   * Track tool execution with telemetry
   */
  async trackToolExecution(toolName, toolInput, executeFunction) {
    const startTime = Date.now();
    let output = null;
    let error = null;

    try {
      output = await executeFunction();
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const endTime = Date.now();

      if (this.telemetry) {
        await this.telemetry.captureToolExecution(
          toolName,
          toolInput,
          output || { error: error?.message },
          startTime,
          endTime
        );
      }
    }

    return output;
  }

  /**
   * Capture tool executions from SDK messages
   */
  async captureToolExecutionsFromMessages(messages, agentId) {
    for (const message of messages) {
      if (message.type === 'assistant' && message.message?.content) {
        const content = Array.isArray(message.message.content)
          ? message.message.content
          : [message.message.content];

        for (const block of content) {
          if (typeof block === 'object' && block.type === 'tool_use') {
            const toolName = block.name;
            const toolInput = block.input;

            console.log(`🔧 Capturing tool execution: ${toolName}`);

            if (this.telemetry) {
              await this.telemetry.captureToolExecution(
                toolName,
                toolInput,
                { block_id: block.id },
                Date.now(),
                Date.now()
              );
            }
          }
        }
      }
    }
  }

  /**
   * Sanitize prompt to remove sensitive information
   */
  sanitizePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') return prompt;

    // Remove API keys, tokens, passwords
    let sanitized = prompt;
    sanitized = sanitized.replace(/sk-ant-[a-zA-Z0-9_-]+/g, 'sk-***REDACTED***');
    sanitized = sanitized.replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***REDACTED***');
    sanitized = sanitized.replace(/token[=:\s]+[a-zA-Z0-9_-]+/gi, 'token=***REDACTED***');
    sanitized = sanitized.replace(/password[=:]\s*[^\s]+/gi, 'password=***REDACTED***');
    sanitized = sanitized.replace(/apikey[=:]\s*[^\s]+/gi, 'apikey=***REDACTED***');

    return sanitized;
  }
}

// Singleton instance
let claudeCodeInstance = null;

function getClaudeCodeSDKManager() {
  if (!claudeCodeInstance) {
    claudeCodeInstance = new ClaudeCodeSDKManager();
  }
  return claudeCodeInstance;
}

export { ClaudeCodeSDKManager, getClaudeCodeSDKManager };