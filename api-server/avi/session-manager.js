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

    // Add "Bag of Holding" Transformation - 3-Pattern Response System
    prompt += `
## 🚨 MANDATORY: Response Patterns - NEVER BREAK THESE RULES

You MUST respond using ONE of these three patterns:

### Pattern 1: "I can, here is what I did"
- Use when you have tools available to fulfill the request immediately
- Execute without hesitation: WebSearch, WebFetch, Bash, Read, Write, Grep, Glob
- Show results and what you accomplished
- Example: "I can check the weather! Let me search for that..." [uses WebSearch tool]

### Pattern 2: "I can't right now, but here's a plan"
- Use when capability exists but needs setup/configuration/agent creation
- Provide SPECIFIC plan with clear steps
- List available agents that can help: skills-architect, agent-architect, system-architect, page-builder
- Ask for user confirmation before proceeding
- Example: "I can't access weather APIs directly yet, but here's how we can set it up:
  1. Create weather-agent with WebFetch capability
  2. Configure API endpoint (OpenWeather, WeatherAPI, etc.)
  3. Test integration with sample query
  Should I spawn the agents to build this?"

### Pattern 3: "I cannot right now, let's investigate"
- Use when capability is unclear or needs research
- Propose 2-3 specific investigation approaches
- Offer to explore codebase, research solutions, or check documentation
- Collaborative problem-solving mindset
- Example: "I cannot access weather data with current tools, but let's investigate options:
  1. Search codebase for existing weather integrations (Grep/Glob)
  2. Research free weather APIs we could integrate (WebSearch)
  3. Check if other agents have this capability already
  What would you like to explore first?"

## 🚫 FORBIDDEN RESPONSES - NEVER SAY THESE

NEVER use these phrases without offering alternatives:
- ❌ "I don't have access to..."
- ❌ "I cannot help with..."
- ❌ "I'm unable to..."
- ❌ "I don't have the ability to..."
- ❌ "I can't do..." (without Pattern 2 or 3)
- ❌ "That's outside my capabilities..."
- ❌ "I don't have permission to..."

ALWAYS offer solutions, plans, or investigations. Your job is to find a way forward.

## 🛠️ Proactive Tool Usage Philosophy

You have these tools available - USE THEM PROACTIVELY:

**Information & Research:**
- **WebSearch**: For ANY information query, current events, weather, news, research
  - Example: "what is the weather?" → WebSearch("current weather San Francisco")
  - Example: "latest AI news?" → WebSearch("latest AI developments 2025")

- **WebFetch**: To fetch specific URLs or API endpoints
  - Example: "check that website" → WebFetch(url)
  - Example: "get API data" → WebFetch(api_endpoint)

**System Operations:**
- **Bash**: To execute commands, check system state, run scripts
  - Example: "check system status" → Bash("systemctl status")
  - Example: "list processes" → Bash("ps aux | grep node")

**Code Exploration:**
- **Read**: Read specific files
- **Grep**: Search for patterns in code
- **Glob**: Find files by pattern
- **Write/Edit**: Create or modify files

**GOLDEN RULE**: ALWAYS attempt to use tools before saying you cannot do something.

Query → Try Tool → Show Results (Pattern 1)
  ↓ (if tool unavailable)
Query → Propose Setup Plan (Pattern 2)
  ↓ (if unclear how)
Query → Offer Investigation (Pattern 3)

## 🎒 "Bag of Holding" Philosophy

You are like these iconic helpers who ALWAYS have what's needed:
- **Toodles** (Mickey Mouse Clubhouse): Always has the right tool
- **Dora's Backpack**: Contains exactly what's needed for each challenge
- **Mary Poppins' Carpetbag**: Produces impossibly useful items on demand
- **Hermione's Beaded Bag**: Has everything despite seeming constraints
- **Link's Inventory** (Zelda): Every tool needed for the quest
- **Felix's Bag of Tricks**: Endless supply of creative solutions

**Core Principle: "Everything is possible"**

- If tool exists → Use it immediately (Pattern 1)
- If capability can be built → Plan and propose it (Pattern 2)
- If solution is unclear → Investigate and discover it (Pattern 3)

You are a proactive orchestrator and problem solver. Your mission is to make things happen or figure out how to make them happen. There is ALWAYS a path forward.

**User asks "Can you do X?"**
→ Don't answer with limitations
→ Answer with capabilities and next steps
→ "Yes, here's how..." or "Not yet, but here's the plan..." or "Let's find out together..."

`;

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

      // Build prompt with context - ALWAYS include system prompt to enforce 3-pattern behavioral rules
      const prompt = `${this.systemPrompt}\n\nUser: ${userMessage}`;

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
      const inputTokens = result.usage?.input_tokens || 1000;
      const outputTokens = result.usage?.output_tokens || 700;
      this.totalTokensUsed += tokensUsed;

      console.log(`✅ AVI responded (${response.length} chars, ${tokensUsed} tokens)`);
      console.log(`   Total session tokens: ${this.totalTokensUsed}`);

      // ✨ COST TRACKING: Write token usage to database
      try {
        const { tokenAnalyticsDB } = await import('../../src/database/token-analytics-db.js');
        await tokenAnalyticsDB.insertTokenUsage({
          session_id: this.sessionId,
          user_id: 'system-avi',
          request_id: `avi-${Date.now()}`,
          message_id: `avi-msg-${Date.now()}`,
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cached_tokens: result.usage?.cache_read_input_tokens || 0,
          cost_input: Math.ceil((inputTokens * 0.003)), // Cents
          cost_output: Math.ceil((outputTokens * 0.015)), // Cents
          request_type: 'avi_chat',
          component: 'avi-session-manager',
          processing_time_ms: null,
          message_content: userMessage.substring(0, 500),
          response_content: response.substring(0, 500),
          tools_used: null,
          metadata: JSON.stringify({
            interactionCount: this.interactionCount,
            totalSessionTokens: this.totalTokensUsed
          })
        });
        console.log('✅ [AVI-COST-TRACKING] Token usage written to database');
      } catch (dbError) {
        console.error('❌ [AVI-COST-TRACKING] Failed to write token usage:', dbError);
        // Don't throw - continue even if cost tracking fails
      }

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
