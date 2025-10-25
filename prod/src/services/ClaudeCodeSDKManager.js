/**
 * Claude Code SDK Manager (JavaScript Version)
 * Official @anthropic-ai/claude-code integration with minimal implementation
 *
 * Features:
 * - Official SDK query() function
 * - bypassPermissions mode for full tool access
 * - Working directory: /workspaces/agent-feed/prod
 * - Model: claude-sonnet-4-20250514
 * - Tools: Bash, Read, Write, Edit, MultiEdit, Glob, Grep
 */

import { query } from '@anthropic-ai/claude-code';

export class ClaudeCodeSDKManager {
  constructor() {
    this.config = {
      workingDirectory: '/workspaces/agent-feed/prod',
      model: 'claude-sonnet-4-20250514',
      permissionMode: 'bypassPermissions',
      allowedTools: [
        'Bash', 'Read', 'Write', 'Edit', 'MultiEdit',
        'Glob', 'Grep', 'WebFetch', 'WebSearch'
      ]
    };

    this.initialized = true;
    console.log('✅ Claude Code SDK Manager initialized');
    console.log(`📁 Working Directory: ${this.config.workingDirectory}`);
    console.log(`🤖 Model: ${this.config.model}`);
    console.log(`🔓 Permission Mode: ${this.config.permissionMode}`);
    console.log(`🛠️ Tools: ${this.config.allowedTools.join(', ')}`);
  }

  /**
   * Execute a query using the official Claude Code SDK
   */
  async query(options) {
    if (!this.initialized) {
      throw new Error('SDK Manager not initialized');
    }

    try {
      console.log('🚀 Executing Claude Code query...');
      console.log(`📝 Prompt: ${options.prompt.substring(0, 100)}...`);

      const queryOptions = {
        cwd: options.cwd || this.config.workingDirectory,
        model: options.model || this.config.model,
        permissionMode: options.permissionMode || this.config.permissionMode,
        allowedTools: options.allowedTools || this.config.allowedTools
      };

      const messages = [];
      const queryResponse = query({
        prompt: options.prompt,
        options: queryOptions
      });

      for await (const message of queryResponse) {
        messages.push(message);

        // Log different message types
        if (message.type === 'assistant') {
          console.log('💬 Assistant response received');
        } else if (message.type === 'result') {
          console.log(`✅ Query completed: ${message.subtype}`);
        } else if (message.type === 'system') {
          console.log(`⚙️ System message: ${message.subtype}`);
        }
      }

      return {
        messages,
        success: true
      };

    } catch (error) {
      console.error('❌ Claude Code query failed:', error);
      return {
        messages: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute a headless task using the official Claude Code SDK
   */
  async executeHeadlessTask(prompt, options = {}) {
    console.log('🔧 Executing headless task...');

    return this.query({
      prompt,
      cwd: options.cwd || this.config.workingDirectory,
      model: options.model || this.config.model,
      permissionMode: 'bypassPermissions',
      allowedTools: options.allowedTools || this.config.allowedTools
    });
  }

  /**
   * Get SDK configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      workingDirectory: this.config.workingDirectory,
      model: this.config.model,
      permissionMode: this.config.permissionMode,
      allowedTools: this.config.allowedTools,
      sdkVersion: '@anthropic-ai/claude-code'
    };
  }

  /**
   * Health check using a simple query
   */
  async healthCheck() {
    try {
      const result = await this.query({
        prompt: 'Use the Read tool to check if package.json exists and respond with "HEALTH_CHECK_OK"'
      });
      return result.success;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance factory
let sdkManagerInstance = null;

export function getClaudeCodeSDKManager() {
  if (!sdkManagerInstance) {
    sdkManagerInstance = new ClaudeCodeSDKManager();
  }
  return sdkManagerInstance;
}
