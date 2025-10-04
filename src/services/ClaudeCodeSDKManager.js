/**
 * Claude Code SDK Manager - Official @anthropic-ai/claude-code Implementation
 * Provides Claude with file system access, bash execution, and development tools
 * Working Directory: /workspaces/agent-feed/prod
 * Permission Mode: bypassPermissions for full automation
 */

import { query } from '@anthropic-ai/claude-code';
import { broadcastToolActivity, formatToolAction } from '../api/routes/claude-code-sdk.js';

class ClaudeCodeSDKManager {
  constructor() {
    this.workingDirectory = '/workspaces/agent-feed/prod';
    this.initialized = false;
    this.sessions = new Map();

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

    try {
      console.log(`🚀 Starting Claude Code session with official SDK`);
      console.log(`📁 Working Directory: ${this.workingDirectory}`);
      console.log(`🛠️ Tools: ${this.allowedTools.join(', ')}`);

      const result = await this.queryClaudeCode(userInput, options);

      if (result.success && result.messages.length > 0) {
        const lastMessage = result.messages[result.messages.length - 1];
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

    try {
      const result = await this.queryClaudeCode(prompt, options);

      if (result.success) {
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