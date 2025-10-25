/**
 * AVI Session Manager - Persistent Claude Code Instance
 *
 * Manages a single persistent AVI session that:
 * - Starts on first interaction (post/DM)
 * - Stays alive for 60 minutes of idle time
 * - Auto-cleans after idle period
 * - Reuses context across conversations (95% token savings)
 */

import { getClaudeCodeSDKManager } from '../../prod/src/services/ClaudeCodeSDKManager.js';

class AviSessionManager {
  constructor(config = {}) {
    this.sessionId = null;
    this.sdkManager = null;
    this.lastActivity = null;
    this.idleTimeout = config.idleTimeout || 60 * 60 * 1000; // 60 minutes
    this.cleanupTimer = null;
    this.sessionActive = false;

    // AVI system prompt (loaded once, reused)
    this.systemPrompt = null;

    // Token tracking
    this.totalTokensUsed = 0;
    this.interactionCount = 0;
  }

  /**
   * Initialize AVI session on first use
   * Cost: ~30K tokens (full context load)
   */
  async initialize() {
    if (this.sessionActive) {
      console.log('✅ AVI session already active, reusing...');
      this.updateActivity();
      return {
        sessionId: this.sessionId,
        status: 'reused',
        tokensUsed: 0
      };
    }

    console.log('🚀 Initializing AVI Claude Code session...');

    try {
      // Get SDK manager
      this.sdkManager = getClaudeCodeSDKManager();

      // Load AVI system prompt from CLAUDE.md
      this.systemPrompt = await this.loadAviPrompt();

      // Create session
      this.sessionId = `avi-session-${Date.now()}`;
      this.sessionActive = true;
      this.updateActivity();

      // Start idle cleanup timer
      this.startCleanupTimer();

      console.log(`✅ AVI session initialized: ${this.sessionId}`);
      console.log(`   Idle timeout: ${this.idleTimeout / 1000}s`);

      return {
        sessionId: this.sessionId,
        status: 'initialized',
        tokensUsed: 30000 // Approximate initial cost
      };

    } catch (error) {
      console.error('❌ Failed to initialize AVI session:', error);
      this.sessionActive = false;
      throw error;
    }
  }

  /**
   * Load AVI system prompt from CLAUDE.md
   * This defines AVI's personality and capabilities
   */
  async loadAviPrompt() {
    const { promises: fs } = await import('fs');
    const path = await import('path');

    // Load core AVI instructions from CLAUDE.md
    const claudeMdPath = path.join(
      '/workspaces/agent-feed/prod/CLAUDE.md'
    );

    const claudeMd = await fs.readFile(claudeMdPath, 'utf-8');

    // Extract AVI-specific sections
    const aviSections = [
      '## 🤖 Meet Λvi - Your Chief of Staff',
      '## 🚨 MANDATORY: Λvi Behavioral Patterns',
      '## 🎯 Specialized Agent Routing'
    ];

    let prompt = 'You are Λvi (AVI), Chief of Staff for this system.\n\n';

    // Extract relevant sections from CLAUDE.md
    for (const section of aviSections) {
      const sectionStart = claudeMd.indexOf(section);
      if (sectionStart !== -1) {
        const nextSection = claudeMd.indexOf('\n## ', sectionStart + 1);
        const sectionContent = nextSection !== -1
          ? claudeMd.slice(sectionStart, nextSection)
          : claudeMd.slice(sectionStart);
        prompt += sectionContent + '\n\n';
      }
    }

    // Add working directory context
    prompt += `
## Current Context
- Working Directory: /workspaces/agent-feed/prod/agent_workspace/
- System Mode: Production
- Available Specialists: skills-architect, agent-architect, system-architect, learning-optimizer
- Active Orchestrator: Monitoring for proactive agent tickets (link-logger, etc.)

## Your Role
- Answer user questions about the system
- Coordinate specialist agents when needed
- Provide status updates and system information
- Route complex tasks to appropriate specialists
- Keep responses concise and helpful (max 2000 tokens)

## Important
- You are a persistent session - context is maintained across conversations
- Respond naturally and conversationally
- Use tools when appropriate (Read, Bash, etc.)
- Be concise but complete in your answers
`;

    return prompt;
  }

  /**
   * Process user message through persistent AVI session
   * Cost: ~1,700 tokens (reuses context)
   */
  async chat(userMessage, options = {}) {
    // Initialize session if not active
    if (!this.sessionActive) {
      await this.initialize();
    }

    this.updateActivity();
    this.interactionCount++;

    try {
      console.log(`💬 AVI interaction #${this.interactionCount}: "${userMessage.substring(0, 50)}..."`);

      // Build prompt with context
      const prompt = options.includeSystemPrompt
        ? `${this.systemPrompt}\n\nUser: ${userMessage}`
        : userMessage;

      // Execute through SDK (reuses session context)
      const result = await this.sdkManager.executeHeadlessTask(prompt, {
        maxTokens: options.maxTokens || 2000,
        temperature: 0.7,
        sessionId: this.sessionId
      });

      if (!result.success) {
        throw new Error(`AVI chat failed: ${result.error}`);
      }

      // Extract response
      const response = this.extractResponse(result);

      // Track tokens
      const tokensUsed = result.usage?.total_tokens || 1700;
      this.totalTokensUsed += tokensUsed;

      console.log(`✅ AVI responded (${response.length} chars, ${tokensUsed} tokens)`);
      console.log(`   Total session tokens: ${this.totalTokensUsed}`);

      return {
        success: true,
        response: response,
        tokensUsed: tokensUsed,
        sessionId: this.sessionId,
        totalTokens: this.totalTokensUsed,
        interactionCount: this.interactionCount
      };

    } catch (error) {
      console.error('❌ AVI chat error:', error);

      // If session died, try to recover
      if (error.message.includes('session')) {
        console.log('🔄 Session lost, reinitializing...');
        this.sessionActive = false;
        await this.initialize();
        return await this.chat(userMessage, options); // Retry once
      }

      throw error;
    }
  }

  /**
   * Extract text response from SDK result
   */
  extractResponse(result) {
    const messages = result.messages || [];
    const assistantMessages = messages.filter(m => m.type === 'assistant');

    const response = assistantMessages
      .map(msg => {
        // Check message.message.content (SDK format)
        if (msg.message && msg.message.content) {
          if (Array.isArray(msg.message.content)) {
            return msg.message.content
              .filter(block => block.type === 'text')
              .map(block => block.text)
              .join('\n');
          }
        }
        // Fallback: check direct properties
        if (typeof msg === 'string') return msg;
        if (msg.text) return msg.text;
        if (msg.content) {
          if (typeof msg.content === 'string') return msg.content;
          if (Array.isArray(msg.content)) {
            return msg.content
              .filter(block => block.type === 'text')
              .map(block => block.text)
              .join('\n');
          }
        }
        return '';
      })
      .filter(text => text.trim())
      .join('\n\n');

    return response || 'I apologize, I was unable to generate a response.';
  }

  /**
   * Update last activity timestamp
   */
  updateActivity() {
    this.lastActivity = Date.now();
  }

  /**
   * Start idle cleanup timer
   */
  startCleanupTimer() {
    // Clear existing timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Schedule cleanup check every minute
    this.cleanupTimer = setInterval(() => {
      this.checkIdleTimeout();
    }, 60000); // Check every minute
  }

  /**
   * Check if session is idle and cleanup if needed
   */
  checkIdleTimeout() {
    if (!this.sessionActive) return;

    const idleTime = Date.now() - this.lastActivity;

    if (idleTime > this.idleTimeout) {
      console.log(`⏰ AVI session idle for ${Math.round(idleTime / 1000)}s, cleaning up...`);
      console.log(`   Session stats: ${this.interactionCount} interactions, ${this.totalTokensUsed} tokens`);
      this.cleanup();
    }
  }

  /**
   * Clean up session resources
   */
  cleanup() {
    console.log('🧹 Cleaning up AVI session...');

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    const stats = {
      sessionId: this.sessionId,
      interactions: this.interactionCount,
      tokensUsed: this.totalTokensUsed
    };

    this.sessionActive = false;
    this.sessionId = null;
    this.lastActivity = null;

    console.log('✅ AVI session cleaned up:', stats);
  }

  /**
   * Get session status
   */
  getStatus() {
    return {
      active: this.sessionActive,
      sessionId: this.sessionId,
      lastActivity: this.lastActivity,
      idleTime: this.lastActivity ? Date.now() - this.lastActivity : null,
      idleTimeout: this.idleTimeout,
      interactionCount: this.interactionCount,
      totalTokensUsed: this.totalTokensUsed,
      averageTokensPerInteraction: this.interactionCount > 0
        ? Math.round(this.totalTokensUsed / this.interactionCount)
        : 0
    };
  }
}

// Singleton instance (single-user system)
let aviSessionInstance = null;

/**
 * Get or create AVI session manager
 */
export function getAviSession(config = {}) {
  if (!aviSessionInstance) {
    aviSessionInstance = new AviSessionManager(config);
  }
  return aviSessionInstance;
}

export default AviSessionManager;
