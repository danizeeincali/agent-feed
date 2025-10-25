/**
 * Agent Worker - Processes proactive agent tickets
 *
 * Spawned by AVI orchestrator when a URL is detected in a post.
 * Processes the ticket and posts results to the agent feed.
 */

import { promises as fs } from 'fs';
import path from 'path';

class AgentWorker {
  constructor(config = {}) {
    this.workerId = config.workerId;
    this.ticketId = config.ticketId;
    this.agentId = config.agentId;
    this.workQueueRepo = config.workQueueRepo; // Will be injected
    this.websocketService = config.websocketService; // WebSocket service for real-time updates
    this.status = 'idle';
    this.apiBaseUrl = config.apiBaseUrl || 'http://localhost:3001';
    this.postId = null; // Will be set when ticket is fetched
  }

  /**
   * Emit WebSocket event for ticket status update
   * @param {string} status - Status: pending, processing, completed, failed
   * @param {Object} options - Additional options (error message, etc.)
   */
  emitStatusUpdate(status, options = {}) {
    if (!this.websocketService || !this.websocketService.isInitialized()) {
      return; // Silently skip if WebSocket not available
    }

    const payload = {
      post_id: this.postId,
      ticket_id: this.ticketId,
      status: status,
      agent_id: this.agentId,
      timestamp: new Date().toISOString()
    };

    if (options.error) {
      payload.error = options.error;
    }

    this.websocketService.emitTicketStatusUpdate(payload);
  }

  /**
   * Main execution logic - processes ticket and posts to agent feed
   * @returns {Promise<Object>} Result with success, response, tokensUsed, commentId
   */
  async execute() {
    try {
      this.status = 'running';

      // 1. Fetch ticket from work queue
      const ticket = await this.fetchTicket();
      this.postId = ticket.post_id; // Store post_id for WebSocket events

      // Emit processing started event
      this.emitStatusUpdate('processing');

      // 2. Process URL with Claude Code SDK
      const intelligence = await this.processURL(ticket);

      // 3. Post intelligence as comment on original post
      const commentResult = await this.postToAgentFeed(intelligence, ticket);

      // 4. Return success
      this.status = 'completed';

      // Emit completion event
      this.emitStatusUpdate('completed');

      return {
        success: true,
        response: intelligence.summary,
        tokensUsed: intelligence.tokensUsed,
        commentId: commentResult.comment_id
      };
    } catch (error) {
      this.status = 'failed';

      // Emit failure event
      this.emitStatusUpdate('failed', { error: error.message });

      throw error;
    }
  }

  /**
   * Fetch ticket from work queue
   * @returns {Promise<Object>} Ticket object with required fields
   * @throws {Error} If ticket not found or missing required fields
   */
  async fetchTicket() {
    if (!this.workQueueRepo) {
      throw new Error('WorkQueueRepo not initialized - cannot fetch ticket');
    }

    const ticket = await this.workQueueRepo.getTicket(this.ticketId);

    if (!ticket) {
      throw new Error(`Ticket ${this.ticketId} not found in work queue`);
    }

    // Validate required fields
    const requiredFields = ['id', 'agent_id', 'url', 'post_id', 'content'];
    const missingFields = requiredFields.filter(field => !ticket[field]);

    if (missingFields.length > 0) {
      throw new Error(
        `Ticket ${this.ticketId} missing required fields: ${missingFields.join(', ')}`
      );
    }

    return ticket;
  }

  /**
   * Read agent frontmatter to check posts_as_self flag
   * @param {string} agentId - Agent identifier
   * @param {string} agentsDir - Path to agents directory
   * @returns {Promise<Object>} Frontmatter object with posts_as_self flag
   */
  async readAgentFrontmatter(agentId, agentsDir = '/workspaces/agent-feed/prod/.claude/agents') {
    const agentPath = path.join(agentsDir, `${agentId}.md`);

    try {
      const content = await fs.readFile(agentPath, 'utf-8');

      // Extract YAML frontmatter between --- markers
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        return { posts_as_self: false };
      }

      const frontmatterText = frontmatterMatch[1];

      // Parse YAML manually (simple key: value pairs)
      const frontmatter = {};
      frontmatterText.split('\n').forEach(line => {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          // Parse boolean values
          if (value === 'true') frontmatter[key] = true;
          else if (value === 'false') frontmatter[key] = false;
          else frontmatter[key] = value;
        }
      });

      return frontmatter;
    } catch (error) {
      throw new Error(`Failed to read agent file: ${error.message}`);
    }
  }

  /**
   * Extract intelligence from workspace files (briefings and summaries)
   * @param {string} workspaceDir - Path to agent workspace
   * @returns {Promise<string|null>} Extracted intelligence or null if not found
   */
  async extractFromWorkspaceFiles(workspaceDir) {
    // Configuration for universal extraction
    const config = {
      // Directory priority scores (higher = search first)
      directoryPriority: {
        'outputs': 100,
        'strategic-analysis': 90,
        'intelligence': 80,
        'intelligence_archive': 70,
        'summaries': 40,
        'competitive': 30,
        'competitive-analysis': 30,
        'market-research': 30,
        'knowledge-base': 20,
        'analysis': 20,
        'reports': 20
      },
      // System directories to exclude
      excludeDirs: ['.git', 'node_modules', '.claude', 'temp', 'logs', '.swarm', 'test', 'tests', '__tests__'],
      // File patterns in priority order (regex patterns)
      filePatterns: [
        /^agent-feed-post-.*\.md$/,           // P0: Agent feed posts
        /.*-intelligence-.*\.md$/,            // P1: Intelligence reports
        /^lambda-vi-briefing-.*\.md$/,        // P2: Legacy briefings
        /^briefing-.*\.md$/,                  // P3: Generic briefings
        /.*-brief.*\.md$/,                    // P4: Any brief files
        /\.md$/                               // P5: Any markdown (fallback)
      ],
      // Section extraction patterns in priority order
      sectionPatterns: [
        // Pattern 1: ## Executive Brief (with optional parenthesis, flexible whitespace)
        /## Executive Brief(?: \(.*?\))?\n+\s*([\s\S]*?)(?=\n## |$)/i,
        // Pattern 2: **Executive Brief:**
        /\*\*Executive Brief:\*\*\n+([\s\S]*?)(?=\n\*\*|$)/i,
        // Pattern 3: ## Executive Summary
        /## Executive Summary\n+\s*([\s\S]*?)(?=\n## |$)/i,
        // Pattern 4: ## Post Content (with optional **Content Body:** subsection)
        /## Post Content\n+(?:\*\*Content Body:\*\*\n+)?([\s\S]*?)(?=\n## |$)/i,
        // Pattern 5: **Content Body:** (standalone)
        /\*\*Content Body:\*\*\n+([\s\S]*?)(?=\n\*\*|$)/i,
        // Pattern 6: ## Content Body
        /## Content Body:?\n+\s*([\s\S]*?)(?=\n## |$)/i
      ],
      maxDepth: 10,
      maxFiles: 100
    };

    try {
      // Phase 1: Recursive directory discovery
      const directories = await this._discoverDirectories(workspaceDir, config);

      if (directories.length === 0) {
        console.log(`⚠️ No directories found in ${workspaceDir}`);
        return null;
      }

      // Phase 2: Search for matching files in priority order
      for (const dir of directories) {
        try {
          const files = await fs.readdir(dir.path);

          // Phase 3: Match files by patterns
          const matchedFiles = this._matchFilesByPatterns(files, config.filePatterns);

          if (matchedFiles.length === 0) continue;

          // Phase 4: Sort by modification time (most recent first)
          const filesWithStats = await Promise.all(
            matchedFiles.map(async (file) => {
              try {
                const filePath = path.join(dir.path, file.name);
                const stats = await fs.stat(filePath);
                return { name: file.name, path: filePath, mtime: stats.mtime, pattern: file.pattern };
              } catch (err) {
                return null;
              }
            })
          );

          const validFiles = filesWithStats.filter(f => f !== null);
          validFiles.sort((a, b) => b.mtime - a.mtime);

          // Phase 5: Try to extract from each file
          for (const file of validFiles) {
            try {
              const content = await fs.readFile(file.path, 'utf-8');

              // Skip empty or whitespace-only files
              if (!content || content.trim().length === 0) continue;

              // Try section patterns
              const extracted = this._extractWithPatterns(content, config.sectionPatterns);

              if (extracted) {
                console.log(`✅ Found intelligence in ${path.relative(workspaceDir, file.path)}`);
                return extracted;
              }

              // Fallback: Return first 500 chars if file has meaningful content
              const trimmed = content.trim();
              if (trimmed.length > 50) {
                console.log(`⚠️ Using fallback content from ${path.relative(workspaceDir, file.path)}`);
                return trimmed.substring(0, 500);
              }

            } catch (err) {
              // File read error, skip
              continue;
            }
          }

        } catch (err) {
          // Directory read error, skip
          continue;
        }
      }

      console.log(`❌ No intelligence found in workspace ${workspaceDir}`);
      return null;

    } catch (error) {
      console.error(`Error extracting from workspace: ${error.message}`);
      return null;
    }
  }

  /**
   * Recursively discover all directories with priority scoring
   * @private
   */
  async _discoverDirectories(rootDir, config) {
    const directories = [];
    const visited = new Set();

    const traverse = async (currentPath, depth) => {
      if (depth > config.maxDepth) return;

      // Prevent infinite loops (handle symlinks)
      const realPath = await fs.realpath(currentPath).catch(() => currentPath);
      if (visited.has(realPath)) return;
      visited.add(realPath);

      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          // Skip excluded directories
          if (config.excludeDirs.includes(entry.name)) continue;

          const dirPath = path.join(currentPath, entry.name);

          // Calculate priority
          const priority = config.directoryPriority[entry.name] || 10;

          directories.push({ path: dirPath, name: entry.name, priority, depth });

          // Recurse into subdirectory
          await traverse(dirPath, depth + 1);
        }
      } catch (err) {
        // Permission denied or other error, skip
        return;
      }
    };

    // Add root directory
    directories.push({ path: rootDir, name: path.basename(rootDir), priority: 10, depth: 0 });

    // Traverse from root
    await traverse(rootDir, 0);

    // Sort by priority (highest first), then by depth (shallowest first)
    directories.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.depth - b.depth;
    });

    return directories;
  }

  /**
   * Match files against patterns with priority
   * @private
   */
  _matchFilesByPatterns(files, patterns) {
    const matched = [];

    for (const fileName of files) {
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        if (pattern.test(fileName)) {
          matched.push({ name: fileName, pattern: i, priority: patterns.length - i });
          break; // First match wins
        }
      }
    }

    // Sort by pattern priority (earlier patterns = higher priority)
    matched.sort((a, b) => a.pattern - b.pattern);

    return matched;
  }

  /**
   * Extract content using section patterns
   * @private
   */
  _extractWithPatterns(content, patterns) {
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        if (extracted.length > 0) {
          return extracted;
        }
      }
    }
    return null;
  }

  /**
   * Extract intelligence from text messages (existing method)
   * @param {Array} messages - SDK response messages
   * @returns {string} Extracted intelligence
   */
  extractFromTextMessages(messages) {
    if (!messages || messages.length === 0) {
      return '';
    }

    const assistantMessages = messages.filter(m => m.type === 'assistant');

    const intelligence = assistantMessages
      .map(msg => {
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
        if (msg.message?.content) return msg.message.content;
        return '';
      })
      .filter(text => typeof text === 'string' && text.trim())
      .join('\n\n');

    return intelligence;
  }

  /**
   * Extract intelligence with workspace fallback logic
   * @param {string} agentId - Agent identifier
   * @param {Array} messages - SDK response messages
   * @returns {Promise<string>} Extracted intelligence
   */
  async extractIntelligence(agentId, messages) {
    // 1. Check agent configuration
    const frontmatter = await this.readAgentFrontmatter(agentId);

    // 2. For posts_as_self: true agents, prefer workspace files
    if (frontmatter.posts_as_self === true) {
      const workspaceDir = path.join('/workspaces/agent-feed/prod/agent_workspace', agentId);
      const workspaceIntelligence = await this.extractFromWorkspaceFiles(workspaceDir);
      if (workspaceIntelligence) {
        return workspaceIntelligence;
      }
      // Fallback to text messages if workspace files not found
    }

    // 3. For posts_as_self: false agents or fallback, use text messages
    const textIntelligence = this.extractFromTextMessages(messages);
    if (textIntelligence) {
      return textIntelligence;
    }

    // 4. Last resort fallback
    return 'No summary available';
  }

  /**
   * Process URL and generate intelligence summary using Claude Code SDK
   * @param {Object} ticket - Ticket object
   * @returns {Promise<Object>} Intelligence summary with real Claude analysis
   * @throws {Error} If agent instructions not found or SDK execution fails
   */
  async processURL(ticket) {
    const url = ticket.url;
    const agentId = ticket.agent_id;

    // Load agent instructions
    const agentInstructionsPath = path.join(
      '/workspaces/agent-feed/prod/.claude/agents',
      `${agentId}.md`
    );

    let agentInstructions;
    try {
      agentInstructions = await fs.readFile(agentInstructionsPath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to load agent instructions for ${agentId} at ${agentInstructionsPath}: ${error.message}`
      );
    }

    // Execute headless task with Claude Code SDK (using dynamic import)
    const { getClaudeCodeSDKManager } = await import('../../prod/src/services/ClaudeCodeSDKManager.js');
    const sdkManager = getClaudeCodeSDKManager();
    const prompt = `${agentInstructions}\n\nProcess this URL: ${url}\n\nProvide your analysis and intelligence summary.`;

    const result = await sdkManager.executeHeadlessTask(prompt);

    if (!result.success) {
      throw new Error(`Claude Code SDK execution failed: ${result.error}`);
    }

    // Extract intelligence from SDK response using new extraction logic
    const messages = result.messages || [];
    const summary = await this.extractIntelligence(agentId, messages);

    // Calculate token usage from response
    let tokensUsed = 0;
    const usageMessage = messages.find(m => m.type === 'result' && m.usage);
    if (usageMessage) {
      const u = usageMessage.usage;
      tokensUsed = (u.input_tokens || 0) + (u.output_tokens || 0);
    } else {
      // Fallback: sum usage from all messages
      for (const msg of messages) {
        if (msg.usage) {
          tokensUsed += (msg.usage.input_tokens || 0) + (msg.usage.output_tokens || 0);
        }
      }
    }

    return {
      title: `Intelligence: ${url}`,
      summary: summary,
      tokensUsed: tokensUsed,
      completedAt: Date.now()
    };
  }

  /**
   * Post intelligence summary as a comment on the original post
   * @param {Object} intelligence - Intelligence summary
   * @param {Object} ticket - Original ticket
   * @returns {Promise<Object>} Created comment object with comment_id
   * @throws {Error} If post_id missing or comment creation fails
   */
  async postToAgentFeed(intelligence, ticket) {
    // Validate ticket has post_id
    if (!ticket.post_id) {
      throw new Error(`Ticket ${ticket.id} missing post_id - cannot create comment`);
    }

    // Safely convert summary to string and handle edge cases
    const rawSummary = intelligence.summary;
    let content = String(rawSummary || 'No summary available').trim();

    // Use fallback if trimmed content is empty
    if (!content) {
      content = 'No summary available';
    }

    const comment = {
      content: content,
      author: ticket.agent_id,        // Backward compatibility
      author_agent: ticket.agent_id,  // Primary field for agent identification
      parent_id: null,
      mentioned_users: [],
      skipTicket: true  // Prevent infinite loop - don't create ticket for agent response
    };

    // Use built-in fetch (Node.js 18+)
    const response = await fetch(
      `${this.apiBaseUrl}/api/agent-posts/${ticket.post_id}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(
        `Failed to create comment on post ${ticket.post_id}: ${response.status} ${errorText}`
      );
    }

    const result = await response.json();

    // Return comment object with comment_id for compatibility
    return {
      ...result.data,
      comment_id: result.data?.id
    };
  }

  async start() {
    this.status = 'running';
    console.log(`✅ Worker ${this.workerId} started`);
  }

  async stop() {
    this.status = 'stopped';
    console.log(`🛑 Worker ${this.workerId} stopped`);
  }

  getStatus() {
    return {
      id: this.workerId,
      status: this.status
    };
  }
}

export default AgentWorker;
