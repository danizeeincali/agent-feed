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
 * - Dynamic skill loading via SkillLoader
 * - Token cost estimation and logging
 */

import { query } from '@anthropic-ai/claude-code';
import { getSkillLoader } from './SkillLoader.js';

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

    // Initialize SkillLoader
    this.skillLoader = getSkillLoader({
      manifestPath: '/workspaces/agent-feed/prod/agent_workspace/skills/avi/skills-manifest.json',
      tokenBudget: 25000,
      enableCaching: true,
      cacheTTL: 3600
    });

    this.initialized = true;
    console.log('✅ Claude Code SDK Manager initialized');
    console.log(`📁 Working Directory: ${this.config.workingDirectory}`);
    console.log(`🤖 Model: ${this.config.model}`);
    console.log(`🔓 Permission Mode: ${this.config.permissionMode}`);
    console.log(`🛠️ Tools: ${this.config.allowedTools.join(', ')}`);
    console.log('📚 SkillLoader integrated');
  }

  /**
   * Extract user query from full prompt
   * Handles various prompt formats from AVI session manager
   * @param {string} fullPrompt - Full prompt including system instructions and user query
   * @returns {string} Extracted user query
   */
  extractUserQuery(fullPrompt) {
    // Method 1: For comment threads with conversation history
    // Look for separator before instructions and extract everything before it
    // This preserves CONVERSATION THREAD + CURRENT MESSAGE
    const separator = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    if (fullPrompt.includes(separator)) {
      const parts = fullPrompt.split(separator);

      // Check if the last part contains instruction keywords
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart.toLowerCase().includes('please provide') ||
          lastPart.toLowerCase().includes('important:') ||
          lastPart.toLowerCase().includes('helpful, concise response') ||
          lastPart.length < 200) {
        // This is instructions, not user content
        // Join all parts EXCEPT the last one (which is instructions)
        const userContent = parts.slice(0, -1).join(separator).trim();
        console.log('✅ Extracted user content (preserving conversation thread)');
        return userContent;
      } else {
        // Last part doesn't look like instructions, keep it
        console.log('✅ Extracted user query via separator method');
        return lastPart;
      }
    }

    // Method 3: Look for "User:" or "Question:" markers
    const userMarkerMatch = fullPrompt.match(/(?:User:|Question:|Query:)\s*(.+?)$/is);
    if (userMarkerMatch) {
      const userQuery = userMarkerMatch[1].trim();
      console.log('✅ Extracted user query via marker method');
      return userQuery;
    }

    // Method 4: Look for last paragraph (after double newline)
    const paragraphs = fullPrompt.split('\n\n');
    const lastParagraph = paragraphs[paragraphs.length - 1].trim();

    // If last paragraph is short (< 500 chars) and doesn't have instruction keywords
    if (lastParagraph.length < 500 && lastParagraph.length > 0) {
      // Filter out instruction paragraphs
      if (!lastParagraph.toLowerCase().includes('please provide') &&
          !lastParagraph.toLowerCase().includes('important:') &&
          !lastParagraph.toLowerCase().includes('helpful, concise response')) {
        console.log('✅ Extracted user query via paragraph method');
        return lastParagraph;
      }
    }

    // Method 5: Fallback - use last 200 chars (but check for instructions)
    const fallback = fullPrompt.slice(-200).trim();
    if (!fallback.toLowerCase().includes('please provide') &&
        !fallback.toLowerCase().includes('important:')) {
      console.log('⚠️ Using fallback method for user query extraction');
      return fallback;
    }

    // Last resort - return first 200 chars
    console.log('⚠️ Using first 200 chars as fallback');
    return fullPrompt.slice(0, 200).trim();
  }

  /**
   * Execute a query using the official Claude Code SDK with dynamic skill loading
   * @param {Object} options - Query options
   * @param {string} options.prompt - User prompt/message
   * @param {string} options.cwd - Working directory (optional)
   * @param {string} options.model - Model to use (optional)
   * @param {string} options.permissionMode - Permission mode (optional)
   * @param {Array<string>} options.allowedTools - Allowed tools (optional)
   * @param {boolean} options.enableSkillLoading - Enable dynamic skill loading (default: true)
   * @param {string} options.baseSystemPrompt - Base system prompt (optional)
   * @param {Object} options.conversationContext - Conversation context for skill detection
   * @returns {Promise<Object>} Query result with messages and metadata
   */
  async query(options) {
    if (!this.initialized) {
      throw new Error('SDK Manager not initialized');
    }

    try {
      console.log('🚀 Executing Claude Code query...');

      // Extract user query from the full prompt (preserves conversation thread)
      const userContent = this.extractUserQuery(options.prompt);
      console.log(`📝 User content extracted: "${userContent.substring(0, 100)}..."`);

      // Extract ONLY current message for skill detection (avoid false positives)
      const currentMessageMatch = userContent.match(/CURRENT MESSAGE\n━+\n\n(.*?)(?:\n\n━+|$)/s);
      const currentMessage = currentMessageMatch ? currentMessageMatch[1].trim() : userContent;
      console.log(`🔍 Current message for skill detection: "${currentMessage.substring(0, 100)}..."`);

      const queryOptions = {
        cwd: options.cwd || this.config.workingDirectory,
        model: options.model || this.config.model,
        permissionMode: options.permissionMode || this.config.permissionMode,
        allowedTools: options.allowedTools || this.config.allowedTools
      };

      // Build system prompt with skill loading (if enabled)
      // CRITICAL: Use currentMessage for skill detection to avoid false positives
      // But send FULL userContent to Claude (includes conversation thread)
      let systemPrompt = '';
      let skillMetadata = null;

      if (options.enableSkillLoading !== false) {
        try {
          console.log('📚 Building system prompt with skill loading...');
          console.log('🔍 Detecting skills based on CURRENT MESSAGE only (not full conversation)...');

          const promptResult = await this.skillLoader.buildSystemPrompt(
            currentMessage,  // ← Use only current message for skill detection
            options.conversationContext || {}
          );

          if (promptResult.systemPrompt) {
            systemPrompt = promptResult.systemPrompt;
            skillMetadata = {
              loadedSkills: promptResult.skills || [],
              tokenEstimate: promptResult.tokenEstimate || 0,
              budgetAnalysis: promptResult.budgetAnalysis || {}
            };

            // Enhanced logging
            console.log(`📊 Skills detected for current message: ${skillMetadata.loadedSkills.length} skills`);
            console.log(`💰 Token estimate: ${skillMetadata.tokenEstimate} tokens`);
            console.log(`🎯 Skills loaded: ${skillMetadata.loadedSkills.map(s => s.name || s).join(', ') || 'none (using core only)'}`);

            if (promptResult.budgetAnalysis) {
              console.log(`📈 Budget utilization: ${promptResult.budgetAnalysis.budgetUtilization || 0}%`);
            }
          }
        } catch (skillError) {
          console.error('⚠️ Skill loading failed, continuing with original prompt:', skillError.message);
          // Continue with original prompt if skill loading fails
          systemPrompt = '';
        }
      } else {
        console.log('ℹ️ Skill loading disabled for this query');
      }

      // Combine system prompt with user content (includes conversation thread)
      const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${userContent}`
        : userContent;

      // Check prompt size before spawning (prevent E2BIG error)
      const promptSizeKB = Buffer.byteLength(fullPrompt, 'utf8') / 1024;
      console.log(`📏 Final prompt size: ${promptSizeKB.toFixed(1)}KB`);

      if (promptSizeKB > 100) {
        console.warn(`⚠️ Large prompt detected: ${promptSizeKB.toFixed(1)}KB`);
      }

      if (promptSizeKB > 200) {
        throw new Error(
          `Prompt too large (${promptSizeKB.toFixed(1)}KB). ` +
          `This would cause E2BIG error. Try reducing skill complexity or conversation context.`
        );
      }

      const messages = [];
      const queryResponse = query({
        prompt: fullPrompt,
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
        success: true,
        skillMetadata
      };

    } catch (error) {
      console.error('❌ Claude Code query failed:', error);

      // Enhanced error logging for E2BIG errors
      if (error.code === 'E2BIG') {
        console.error('🚨 E2BIG Error: Argument list too long');
        console.error('💡 This usually means the prompt is too large for the system to handle');
        console.error('💡 Try reducing the number of skills loaded or simplifying the conversation context');
      }

      return {
        messages: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        skillMetadata: null
      };
    }
  }

  /**
   * Execute a headless task using the official Claude Code SDK
   * @param {string} prompt - Task prompt
   * @param {Object} options - Task options
   * @param {string} options.cwd - Working directory (optional)
   * @param {string} options.model - Model to use (optional)
   * @param {Array<string>} options.allowedTools - Allowed tools (optional)
   * @param {boolean} options.enableSkillLoading - Enable skill loading (default: true)
   * @param {string} options.baseSystemPrompt - Base system prompt (optional)
   * @returns {Promise<Object>} Task result
   */
  async executeHeadlessTask(prompt, options = {}) {
    console.log('🔧 Executing headless task...');

    return this.query({
      prompt,
      cwd: options.cwd || this.config.workingDirectory,
      model: options.model || this.config.model,
      permissionMode: 'bypassPermissions',
      allowedTools: options.allowedTools || this.config.allowedTools,
      enableSkillLoading: options.enableSkillLoading,
      baseSystemPrompt: options.baseSystemPrompt
    });
  }

  /**
   * Get SDK configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get status information including skill loader statistics
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      workingDirectory: this.config.workingDirectory,
      model: this.config.model,
      permissionMode: this.config.permissionMode,
      allowedTools: this.config.allowedTools,
      sdkVersion: '@anthropic-ai/claude-code',
      skillLoader: this.skillLoader.getStatistics()
    };
  }

  /**
   * Health check using a simple query
   * @returns {Promise<boolean>} Health check result
   */
  async healthCheck() {
    try {
      const result = await this.query({
        prompt: 'Use the Read tool to check if package.json exists and respond with "HEALTH_CHECK_OK"',
        enableSkillLoading: false // Disable skill loading for health check
      });
      return result.success;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get skill loader instance (for advanced use cases)
   * @returns {SkillLoader} SkillLoader instance
   */
  getSkillLoader() {
    return this.skillLoader;
  }

  /**
   * Clear skill cache
   */
  clearSkillCache() {
    console.log('🗑️ Clearing skill cache...');
    this.skillLoader.clearCache();
  }

  /**
   * Reload skill manifest
   * @returns {Promise<void>}
   */
  async reloadSkillManifest() {
    console.log('🔄 Reloading skill manifest...');
    await this.skillLoader.reloadManifest();
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
