/**
 * Agent Worker - Processes proactive agent tickets
 *
 * Spawned by AVI orchestrator when a URL is detected in a post.
 * Processes the ticket and posts results to the agent feed.
 */

import { promises as fs } from 'fs';
import path from 'path';

// SECURITY FIX: Rate limiting for name submissions
// Prevents database write amplification from rapid-fire submissions
const nameSubmissionTimestamps = new Map(); // userId -> timestamp

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
    this.mode = config.mode || 'post'; // 'post' or 'comment'
    this.commentContext = config.context || null; // Comment context for comment mode
  }

  /**
   * Emit WebSocket event for ticket status update
   * @param {string} status - Status: pending, processing, completed, failed
   * @param {Object} options - Additional options (error message, etc.)
   */
  emitStatusUpdate(status, options = {}) {
    if (!this.websocketService || !this.websocketService.isInitialized()) {
      console.log(`⚠️ WebSocket not available for status update: ${status} (ticket: ${this.ticketId})`);
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

    console.log(`🔔 Emitting WebSocket event: ${status} (ticket: ${this.ticketId}, agent: ${this.agentId})`);
    this.websocketService.emitTicketStatusUpdate(payload);
  }

  /**
   * Main execution logic - processes ticket and posts to agent feed
   * @returns {Promise<Object>} Result with success, response, tokensUsed, commentId
   */
  async execute() {
    let ticket = null;

    try {
      this.status = 'running';

      // 1. Fetch ticket from work queue
      ticket = await this.fetchTicket();
      this.postId = ticket.post_id; // Store post_id for WebSocket events

      // Emit 'waiting' state after picking up ticket
      console.log(`🔄 Worker: Emitting state 'waiting' for ticket ${ticket.id}`);
      this.emitCommentState(ticket, 'waiting');

      // Emit processing started event (legacy)
      this.emitStatusUpdate('processing');

      // 2. Emit 'analyzed' state before processing
      console.log(`🔄 Worker: Emitting state 'analyzed' for ticket ${ticket.id}`);
      this.emitCommentState(ticket, 'analyzed');

      // 3. Emit 'responding' state before AI API call
      console.log(`🔄 Worker: Emitting state 'responding' for ticket ${ticket.id}`);
      this.emitCommentState(ticket, 'responding');

      // 4. Process URL with Claude Code SDK
      const intelligence = await this.processURL(ticket);

      // 5. Post intelligence as comment on original post
      const commentResult = await this.postToAgentFeed(intelligence, ticket);

      // 6. Return success
      this.status = 'completed';

      // Emit 'complete' state after completion
      console.log(`🔄 Worker: Emitting state 'complete' for ticket ${ticket.id}`);
      this.emitCommentState(ticket, 'complete');

      // Emit completion event (legacy)
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
    } finally {
      // ALWAYS emit 'completed' status even on error to ensure UI updates
      if (ticket) {
        console.log(`🔄 Worker: Emitting final state 'complete' for ticket ${ticket.id} (finally block)`);
        this.emitCommentState(ticket, 'complete');
      }
    }
  }

  /**
   * Emit comment state for processing pills
   * @param {Object} ticket - Ticket object with id and post_id
   * @param {string} state - State: waiting, analyzed, responding, complete
   */
  emitCommentState(ticket, state) {
    if (!this.websocketService || !this.websocketService.isInitialized()) {
      console.log(`⚠️ WebSocket not available for comment state: ${state} (ticket: ${ticket.id})`);
      return;
    }

    // Check if websocketService has emitCommentState method
    if (typeof this.websocketService.emitCommentState === 'function') {
      this.websocketService.emitCommentState({
        commentId: ticket.id,
        postId: ticket.post_id,
        state: state
      });
    } else {
      // Fallback: broadcast directly
      this.websocketService.broadcast('comment:state', {
        commentId: ticket.id,
        postId: ticket.post_id,
        state: state,
        timestamp: new Date().toISOString()
      });
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
    // URL is now OPTIONAL - only validate core required fields
    const requiredFields = ['id', 'agent_id', 'post_id', 'content'];

    // Check if this is a comment ticket (has metadata.type === 'comment')
    const isCommentTicket = ticket.metadata && ticket.metadata.type === 'comment';

    // Comment tickets require metadata field
    if (isCommentTicket) {
      requiredFields.push('metadata');
    }

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
    // Check for system identity first (Λvi)
    const { getSystemIdentity } = await import('./system-identity.js');
    const systemIdentity = getSystemIdentity(agentId);

    if (systemIdentity) {
      return systemIdentity;
    }

    // Regular agent - read from file system
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
   * Extract intelligence from text messages (ENHANCED for system identities)
   *
   * This method handles multiple response formats:
   * 1. Assistant messages (type='assistant') - standard Claude Code responses
   * 2. Text messages (type='text') - system identity responses
   * 3. Role-based messages (role='assistant') - alternative format
   * 4. Direct response field - fallback for direct text responses
   *
   * @param {Array} messages - SDK response messages
   * @param {Object} result - Full SDK result object (optional, for fallback)
   * @returns {string} Extracted intelligence
   */
  extractFromTextMessages(messages, result = null) {
    // Early return if no messages
    if (!messages || messages.length === 0) {
      // Fallback: Check if result has direct response field
      if (result?.response && typeof result.response === 'string') {
        const directResponse = result.response.trim();
        console.log('📝 Extracted from result.response:', directResponse.substring(0, 100));
        return directResponse;
      }
      return '';
    }

    // Method 1: Try assistant messages (type='assistant') - existing logic
    const assistantMessages = messages.filter(m => m.type === 'assistant');
    if (assistantMessages.length > 0) {
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

      if (intelligence.trim()) {
        console.log('📝 Extracted from assistant messages:', intelligence.substring(0, 100));
        return intelligence.trim();
      }
    }

    // Method 1.5: Try nested message.content arrays
    const nestedMessages = messages.filter(m => m.message?.content && Array.isArray(m.message.content));
    if (nestedMessages.length > 0) {
      const intelligence = nestedMessages
        .map(msg =>
          msg.message.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('\n\n')
        )
        .filter(text => text.trim())
        .join('\n\n');

      if (intelligence.trim()) {
        console.log('✅ Extracted from nested message.content array:', intelligence.substring(0, 100));
        return intelligence.trim();
      }
    }

    // Method 2: Try text messages (type='text') - for system identities
    const textMessages = messages.filter(m =>
      m.type === 'text' || (m.text && !m.type) || (m.content && m.type !== 'user')
    );
    if (textMessages.length > 0) {
      const intelligence = textMessages
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
          return '';
        })
        .filter(text => typeof text === 'string' && text.trim())
        .join('\n\n');

      if (intelligence.trim()) {
        console.log('📝 Extracted from text messages:', intelligence.substring(0, 100));
        return intelligence.trim();
      }
    }

    // Method 3: Try role-based messages (role='assistant')
    const roleMessages = messages.filter(m => m.role === 'assistant');
    if (roleMessages.length > 0) {
      const intelligence = roleMessages
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
          if (msg.message) {
            if (typeof msg.message === 'string') return msg.message;
            if (msg.message.content) return msg.message.content;
          }
          return '';
        })
        .filter(text => typeof text === 'string' && text.trim())
        .join('\n\n');

      if (intelligence.trim()) {
        console.log('📝 Extracted from role messages:', intelligence.substring(0, 100));
        return intelligence.trim();
      }
    }

    // Method 4: Last resort - concatenate all non-user message text
    const allMessages = messages.filter(m => m.type !== 'user' && m.role !== 'user');
    if (allMessages.length > 0) {
      const intelligence = allMessages
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
          if (msg.message) {
            if (typeof msg.message === 'string') return msg.message;
            if (msg.message.content) return msg.message.content;
          }
          return '';
        })
        .filter(text => typeof text === 'string' && text.trim())
        .join('\n\n');

      if (intelligence.trim()) {
        console.log('📝 Extracted from all messages (last resort):', intelligence.substring(0, 100));
        return intelligence.trim();
      }
    }

    // Method 5: Final fallback - check result object directly
    if (result?.response && typeof result.response === 'string') {
      const directResponse = result.response.trim();
      console.log('📝 Extracted from result.response (final fallback):', directResponse.substring(0, 100));
      return directResponse;
    }

    // Log diagnostic information if nothing was extracted
    console.error('❌ Failed to extract response from messages');
    console.error('   Message count:', messages.length);
    console.error('   Message types:', messages.map(m => m.type || m.role || 'unknown'));
    console.error('   First message sample:', JSON.stringify(messages[0], null, 2).substring(0, 200));

    return '';
  }

  /**
   * Extract intelligence with workspace fallback logic
   * @param {string} agentId - Agent identifier
   * @param {Array} messages - SDK response messages
   * @param {Object} result - Full SDK result object (optional, for fallback)
   * @returns {Promise<string>} Extracted intelligence
   */
  async extractIntelligence(agentId, messages, result = null) {
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
    const textIntelligence = this.extractFromTextMessages(messages, result);
    if (textIntelligence) {
      return textIntelligence;
    }

    // 4. Last resort fallback
    return 'No summary available';
  }

  /**
   * Get conversation thread context for enhanced prompts
   * @param {string} postId - Post ID
   * @param {number} limit - Number of recent comments
   * @returns {Promise<Object>} Thread context
   */
  async getThreadContext(postId, limit = 3) {
    try {
      const { default: dbSelector } = await import('../config/database-selector.js');

      // Initialize database if not already initialized
      if (!dbSelector.sqliteDb && !dbSelector.usePostgres) {
        await dbSelector.initialize();
      }

      // Get parent post
      const post = await dbSelector.getPostById(postId);
      if (!post) {
        return { post: null, recentComments: [] };
      }

      // Get recent comments
      const allComments = await dbSelector.getCommentsByPostId(postId);

      // Sort by created_at DESC and limit
      const recentComments = allComments
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit)
        .map(c => ({
          author: c.author_agent || c.author,
          content: c.content,
          created_at: c.created_at
        }));

      // Parse metadata safely
      let metadata = {};
      if (post.metadata) {
        try {
          metadata = typeof post.metadata === 'string'
            ? JSON.parse(post.metadata)
            : post.metadata;
        } catch (e) {
          metadata = {};
        }
      }

      return {
        post: {
          title: post.title || 'Untitled',
          author: post.authorAgent || post.author_agent || 'Unknown',
          content: post.content || '',
          created_at: post.publishedAt || post.published_at || post.created_at,
          tags: metadata.tags || []
        },
        recentComments: recentComments
      };
    } catch (error) {
      console.error('Failed to get thread context:', error);
      return { post: null, recentComments: [] };
    }
  }

  /**
   * Walk up the parent_id chain to build full conversation thread
   * @param {string} commentId - Starting comment ID
   * @param {number} maxDepth - Maximum depth to traverse (prevent infinite loops)
   * @returns {Promise<Array>} Array of comments from root to current, chronologically
   */
  async getConversationChain(commentId, maxDepth = 20) {
    const chain = [];
    let currentId = commentId;
    let depth = 0;

    try {
      const { default: dbSelector } = await import('../config/database-selector.js');

      // Initialize database if needed
      if (!dbSelector.sqliteDb && !dbSelector.usePostgres) {
        await dbSelector.initialize();
      }

      // Walk up the chain until we hit root (parent_id = null) or max depth
      while (currentId && depth < maxDepth) {
        const comment = await dbSelector.getCommentById(currentId);

        if (!comment) {
          console.warn(`⚠️ Comment ${currentId} not found, stopping chain walk`);
          break;
        }

        // Add to chain (will reverse later for chronological order)
        chain.push({
          id: comment.id,
          author: comment.author_agent || comment.author,
          content: comment.content,
          created_at: comment.created_at,
          parent_id: comment.parent_id
        });

        // Move to parent
        currentId = comment.parent_id;
        depth++;
      }

      // Reverse chain so oldest is first (chronological order)
      const chronologicalChain = chain.reverse();

      console.log(`🔗 Built conversation chain: ${chronologicalChain.length} messages (depth: ${depth})`);

      return chronologicalChain;

    } catch (error) {
      console.error('❌ Failed to get conversation chain:', error);
      return [];
    }
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
    const content = ticket.content;
    const isTextPost = !url || url === null || url === '';

    // Check for system identity (Λvi) - use lightweight prompt
    const { getSystemPrompt } = await import('./system-identity.js');
    const systemPrompt = getSystemPrompt(agentId);

    let agentInstructions;

    if (systemPrompt) {
      // Use lightweight system prompt (< 500 tokens)
      agentInstructions = systemPrompt;
    } else {
      // Load full agent instructions from file
      const agentInstructionsPath = path.join(
        '/workspaces/agent-feed/prod/.claude/agents',
        `${agentId}.md`
      );

      try {
        agentInstructions = await fs.readFile(agentInstructionsPath, 'utf-8');
      } catch (error) {
        throw new Error(
          `Failed to load agent instructions for ${agentId} at ${agentInstructionsPath}: ${error.message}`
        );
      }
    }

    // Execute headless task with Claude Code SDK (using dynamic import)
    const { getClaudeCodeSDKManager } = await import('../../prod/src/services/ClaudeCodeSDKManager.js');
    const sdkManager = getClaudeCodeSDKManager();

    // Get conversation context for enhanced prompts
    const context = await this.getThreadContext(ticket.post_id);

    // NEW: If this is a comment reply, get the full conversation chain
    let conversationChain = [];

    // Check if this is a comment (post_id contains comment ID)
    if (ticket.post_id && ticket.post_id.startsWith('comment-')) {
      try {
        // Import database selector to check if comment has parent
        const { default: dbSelector } = await import('../config/database-selector.js');

        if (!dbSelector.sqliteDb && !dbSelector.usePostgres) {
          await dbSelector.initialize();
        }

        const comment = await dbSelector.getCommentById(ticket.post_id);

        if (comment && comment.parent_id) {
          // This is a threaded reply - get full conversation chain
          conversationChain = await this.getConversationChain(ticket.post_id);
          console.log(`💬 Conversation chain for comment ${ticket.post_id}: ${conversationChain.length} messages`);
        }
      } catch (error) {
        console.error('❌ Error checking comment for conversation chain:', error);
      }
    }

    // Build prompt based on whether this is a text post or URL post
    let prompt;
    if (isTextPost) {
      // Build enhanced prompt with conversation chain
      prompt = `${agentInstructions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 ORIGINAL POST by ${context.post?.author || 'User'}
   Title: "${context.post?.title || 'Untitled'}"
   ${context.post?.tags?.length > 0 ? `Tags: ${context.post.tags.join(', ')}` : ''}

   ${context.post?.content || ''}

${conversationChain.length > 0 ? `
🔗 CONVERSATION THREAD (${conversationChain.length} messages):
${conversationChain.map((msg, i) =>
  `   ${i + 1}. ${msg.author}:
      ${msg.content}`
).join('\n\n')}
` : ''}

${context.recentComments.length > 0 && conversationChain.length === 0 ? `
🔄 RECENT ACTIVITY ON POST (${context.recentComments.length} comments):
${context.recentComments.map((c, i) =>
  `   ${i + 1}. ${c.author}: ${c.content.substring(0, 100)}${c.content.length > 100 ? '...' : ''}`
).join('\n')}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT MESSAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${content}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT: You have the FULL conversation history above. Reference previous messages naturally.

Please provide a natural, conversational response that:
1. References the full conversation history when relevant
2. Maintains context from previous messages in this thread
3. Acts like you remember what was just discussed
4. Continues the conversation naturally without repeating context unnecessarily
5. If asked to perform an operation on "it" or "this" or "that", look at the previous message to understand what the user is referring to`;
    } else {
      // URL processing with context
      prompt = `${agentInstructions}

Context: Post "${context.post?.title || 'URL Analysis Request'}" by ${context.post?.author || 'User'}

Process this URL: ${url}

Provide your analysis and intelligence summary in a conversational tone.`;
    }

    // Execute with protection wrapper to prevent infinite loops
    const { executeProtectedQuery, buildUserFacingMessage } = await import('./worker-protection.js');

    const protectionResult = await executeProtectedQuery(prompt, {
      workerId: this.workerId,
      ticketId: this.ticketId,
      sdkManager: sdkManager,
      streamingResponse: false // SDK returns complete result, not streaming
    });

    // Add diagnostic logging for SDK response structure
    console.log('🔍 SDK Result Structure (processURL):', {
      success: protectionResult.success,
      terminated: protectionResult.terminated,
      reason: protectionResult.reason,
      messageCount: protectionResult.messages?.length || 0,
      messageTypes: protectionResult.messages?.map(m => m.type || m.role || 'unknown') || [],
      chunkCount: protectionResult.chunkCount,
      responseSize: protectionResult.responseSize
    });

    // Handle protection termination
    if (protectionResult.terminated) {
      const userMessage = buildUserFacingMessage(protectionResult.reason, {
        chunkCount: protectionResult.chunkCount,
        maxChunks: protectionResult.maxChunks,
        responseSize: protectionResult.responseSize,
        timeoutMs: protectionResult.timeoutMs
      });

      console.error(`⚠️ Query terminated by protection system: ${protectionResult.reason}`);

      // Use partial response if available, otherwise use user message
      const summary = protectionResult.partialResponse || userMessage;

      // Return partial result - this will be posted as a comment
      return {
        title: `⚠️ Query Auto-Stopped`,
        summary: summary,
        tokensUsed: 0,
        completedAt: Date.now(),
        terminated: true,
        reason: protectionResult.reason
      };
    }

    if (!protectionResult.success) {
      throw new Error(`Claude Code SDK execution failed: ${protectionResult.error || 'Unknown error'}`);
    }

    // Use messages from protection result
    const result = {
      success: protectionResult.success,
      messages: protectionResult.messages
    };

    // Extract intelligence from SDK response using new extraction logic
    const messages = result.messages || [];
    const summary = await this.extractIntelligence(agentId, messages, result);

    // Log extraction failure for diagnostics
    if (!summary || summary === 'No summary available') {
      console.error('❌ Failed to extract intelligence in processURL()');
      console.error('   AgentId:', agentId);
      console.error('   Messages:', JSON.stringify(messages.slice(0, 2), null, 2));
      console.error('   Full result keys:', Object.keys(result));
    }

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

    // Build title based on post type
    const title = isTextPost
      ? `Response: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`
      : `Intelligence: ${url}`;

    return {
      title: title,
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

    // Determine correct post_id for API endpoint
    // For comment tickets: use metadata.parent_post_id
    // For regular post tickets: use ticket.post_id
    const isCommentTicket = ticket.metadata?.type === 'comment';
    const postId = isCommentTicket
      ? ticket.metadata.parent_post_id  // Use parent post for comments
      : ticket.post_id;                  // Use post_id for regular posts

    // Use built-in fetch (Node.js 18+)
    const response = await fetch(
      `${this.apiBaseUrl}/api/agent-posts/${postId}/comments`,
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

  /**
   * Process comment and generate reply
   * @returns {Promise<Object>} Result with success, reply, agent, commentId
   */
  async processComment() {
    if (this.mode !== 'comment') {
      throw new Error('Worker not in comment mode');
    }

    const { comment, parentPost, ticket } = this.commentContext;

    console.log(`💬 Processing comment: ${comment.id}`);
    console.log(`   Content: ${comment.content}`);
    console.log(`   Agent: ${this.agentId}`);

    try {
      // ============================================================================
      // ONBOARDING FLOW DETECTION (FR-2: Get-to-Know-You Response Logic)
      // ============================================================================

      // Check if this is Get-to-Know-You agent during Phase 1 onboarding
      if (this.agentId === 'get-to-know-you-agent') {
        const { default: dbSelector } = await import('../config/database-selector.js');

        if (!dbSelector.sqliteDb && !dbSelector.usePostgres) {
          await dbSelector.initialize();
        }

        // Get user ID from comment author
        const userId = comment.author;

        // Get onboarding state
        const onboardingState = await dbSelector.getOnboardingState(userId);

        // Process onboarding flow if state exists and Phase 1 is active
        if (onboardingState && onboardingState.phase === 1 && !onboardingState.phase1_completed) {
          console.log(`📋 Get-to-Know-You onboarding flow: phase=${onboardingState.phase}, step=${onboardingState.step}`);

          // Import onboarding service
          const { createOnboardingFlowService } = await import('../services/onboarding/onboarding-flow-service.js');
          const onboardingService = createOnboardingFlowService(dbSelector.sqliteDb || dbSelector.pgPool);

          // ========================================================================
          // STEP 1: Name Collection (step='name')
          // ========================================================================
          if (onboardingState.step === 'name') {
            console.log(`📝 Processing name response: "${comment.content}"`);

            // SECURITY FIX: Rate limiting for name submissions
            // Max 1 submission per 10 seconds to prevent database write amplification
            const lastSubmission = nameSubmissionTimestamps.get(userId);
            const now = Date.now();

            if (lastSubmission && (now - lastSubmission) < 10000) {
              return {
                success: true,
                reply: "Please wait a moment before trying again. 😊",
                agent: this.agentId,
                commentId: comment.id,
                skipStateUpdate: true
              };
            }

            // Update timestamp for this user
            nameSubmissionTimestamps.set(userId, now);

            // Validate name
            const trimmedName = comment.content.trim();

            if (trimmedName.length === 0) {
              // Empty name - respond with error
              return {
                success: true,
                reply: "I didn't catch that. Please provide a name I can call you by.",
                agent: this.agentId,
                commentId: comment.id,
                skipStateUpdate: true
              };
            }

            if (trimmedName.length > 50) {
              // Name too long - respond with error
              return {
                success: true,
                reply: "That's a bit long! Please use a shorter version (maximum 50 characters).",
                agent: this.agentId,
                commentId: comment.id,
                skipStateUpdate: true
              };
            }

            // Process name via onboarding service (saves to user_settings and updates state)
            const nameResult = await onboardingService.processNameResponse(userId, trimmedName);

            if (!nameResult.success) {
              throw new Error(`Name processing failed: ${nameResult.error || 'Unknown error'}`);
            }

            console.log(`✅ Name saved: "${trimmedName}" for user ${userId}`);

            // SECURITY FIX: Remove race condition by using proper async/await sequencing
            // instead of setTimeout which is brittle and can cause race conditions

            // Step 2: Create acknowledgment COMMENT
            const acknowledgment = `Nice to meet you, ${trimmedName}! 👋 I'm your Get-to-Know-You Agent, and I help Λvi personalize your experience here.`;

            // Step 3: Create NEW POST with use case question (runs AFTER comment is posted)
            try {
              const postPayload = {
                title: `What brings you to Agent Feed, ${trimmedName}?`,
                content: `# What brings you to Agent Feed, ${trimmedName}?

I'd love to understand what you're hoping to accomplish here. This helps me personalize your experience and introduce you to the right agents.

**🎯 Personal Productivity**
- Managing daily tasks and goals
- Building better habits
- Staying organized

**💼 Business Management**
- Running projects and teams
- Strategic planning
- Business operations

**🎨 Creative Projects**
- Writing, design, content creation
- Managing creative workflows

**📚 Learning & Development**
- Acquiring new skills
- Research and exploration
- Knowledge management

**🌟 Something else?**
Tell me what's most important to you!`,
                authorId: userId,
                isAgentResponse: true,
                agentId: 'get-to-know-you-agent',
                agent: {
                  name: 'get-to-know-you-agent',
                  displayName: 'Get-to-Know-You Agent'
                },
                metadata: {
                  isOnboardingPost: true,
                  onboardingPhase: 1,
                  onboardingStep: 'use_case',
                  postType: 'conversational'
                }
              };

              const postResponse = await fetch(`${this.apiBaseUrl}/api/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postPayload)
              });

              if (!postResponse.ok) {
                throw new Error(`Failed to create use case post: ${postResponse.statusText}`);
              }

              const postData = await postResponse.json();
              console.log(`✅ Created use case question post for ${trimmedName}`);

              // ✅ Emit WebSocket event for new post visibility
              if (this.websocketService && this.websocketService.isInitialized()) {
                this.websocketService.broadcast('post:created', {
                  post: postData.data,
                  timestamp: new Date().toISOString()
                });
                console.log(`📡 WebSocket: Emitted post:created event for ${postData.data.id}`);
              }

              // Return acknowledgment comment with post creation confirmation
              return {
                success: true,
                reply: acknowledgment,
                agent: this.agentId,
                commentId: comment.id,
                nextStep: 'use_case',
                postCreated: true,
                postId: postData.data.id
              };
            } catch (error) {
              console.error(`❌ Error creating use case post:`, error);

              // Still return acknowledgment even if post creation fails
              // This ensures the user gets feedback, but log the error
              return {
                success: true,
                reply: acknowledgment,
                agent: this.agentId,
                commentId: comment.id,
                nextStep: 'use_case',
                postCreated: false,
                postError: error.message
              };
            }
          }

          // ========================================================================
          // STEP 2: Use Case Collection (step='use_case')
          // ========================================================================
          if (onboardingState.step === 'use_case') {
            console.log(`📝 Processing use case response: "${comment.content}"`);

            const trimmedUseCase = comment.content.trim();

            if (trimmedUseCase.length === 0) {
              // Empty use case - respond with error
              return {
                success: true,
                reply: "I didn't catch that. What brings you to Agent Feed?",
                agent: this.agentId,
                commentId: comment.id,
                skipStateUpdate: true
              };
            }

            // Process use case via onboarding service (marks Phase 1 complete)
            const useCaseResult = await onboardingService.processUseCaseResponse(userId, trimmedUseCase);

            if (!useCaseResult.success) {
              throw new Error(`Use case processing failed: ${useCaseResult.error || 'Unknown error'}`);
            }

            console.log(`✅ Phase 1 completed for user ${userId}`);

            // Get display name from onboarding state
            const updatedState = await dbSelector.getOnboardingState(userId);
            const responses = updatedState.responses ? JSON.parse(updatedState.responses) : {};
            const userName = responses.name || 'there';

            // Return Phase 1 completion message
            const completionMessage = useCaseResult.message || `Perfect, ${userName}! Based on that, your agents will help you get started. You're all set!`;

            // Note: Avi welcome post is NOT triggered here (removed per spec review)
            // The onboarding flow focuses on Get-to-Know-You agent interaction only

            return {
              success: true,
              reply: completionMessage,
              agent: this.agentId,
              commentId: comment.id,
              phase1Complete: true
            };
          }
        }
      }

      // ============================================================================
      // STANDARD COMMENT PROCESSING (non-onboarding flow)
      // ============================================================================

      // Check if this is a threaded reply and get conversation chain
      let conversationChain = [];
      if (comment.parentCommentId) {
        try {
          const { default: dbSelector } = await import('../config/database-selector.js');

          if (!dbSelector.sqliteDb && !dbSelector.usePostgres) {
            await dbSelector.initialize();
          }

          conversationChain = await this.getConversationChain(comment.id);
          console.log(`💬 Conversation chain for comment ${comment.id}: ${conversationChain.length} messages`);
        } catch (error) {
          console.error('❌ Failed to get conversation chain:', error);
        }
      }

      // Build prompt for agent with conversation chain
      const prompt = this.buildCommentPrompt(comment, parentPost, conversationChain);

      // Call agent (reuse existing agent invocation logic)
      const response = await this.invokeAgent(prompt);

      return {
        success: true,
        reply: response,
        agent: this.agentId,
        commentId: comment.id
      };
    } catch (error) {
      console.error(`❌ Failed to process comment:`, error);
      throw error;
    }
  }

  /**
   * Build prompt for agent to respond to comment
   * @param {Object} comment - Comment object
   * @param {Object} parentPost - Parent post object
   * @param {Array} conversationChain - Conversation chain (default: [])
   * @returns {string} Prompt for agent
   */
  buildCommentPrompt(comment, parentPost, conversationChain = []) {
    let prompt = `You are ${this.agentId} responding to a user comment.\n\n`;

    if (parentPost) {
      prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      prompt += `ORIGINAL POST\n`;
      prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      prompt += `Title: ${parentPost.title}\n`;
      prompt += `${parentPost.contentBody}\n\n`;
    }

    // Add conversation chain if this is a threaded reply
    if (conversationChain.length > 0) {
      prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      prompt += `CONVERSATION THREAD (${conversationChain.length} messages):\n`;
      prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      conversationChain.forEach((msg, i) => {
        prompt += `${i + 1}. ${msg.author}:\n   ${msg.content}\n\n`;
      });
    }

    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    prompt += `CURRENT MESSAGE\n`;
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    prompt += `${comment.content}\n\n`;
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    prompt += `Please provide a helpful, concise response to this comment.`;

    // Add conversation awareness instruction
    if (conversationChain.length > 0) {
      prompt += `\n\nIMPORTANT: You have the FULL conversation history above. Reference previous messages naturally without repeating context.`;
    }

    return prompt;
  }

  /**
   * Invoke agent with prompt (uses Claude Code SDK)
   * @param {string} prompt - Prompt for agent
   * @returns {Promise<string>} Agent response
   */
  async invokeAgent(prompt) {
    // Check for system identity (Λvi) - use lightweight prompt
    const { getSystemPrompt } = await import('./system-identity.js');
    const systemPrompt = getSystemPrompt(this.agentId);

    let agentInstructions;

    if (systemPrompt) {
      // Use lightweight system prompt (< 500 tokens)
      agentInstructions = systemPrompt;
    } else {
      // Load full agent instructions from file
      const agentInstructionsPath = path.join(
        '/workspaces/agent-feed/prod/.claude/agents',
        `${this.agentId}.md`
      );

      try {
        agentInstructions = await fs.readFile(agentInstructionsPath, 'utf-8');
      } catch (error) {
        throw new Error(
          `Failed to load agent instructions for ${this.agentId} at ${agentInstructionsPath}: ${error.message}`
        );
      }
    }

    // Execute headless task with Claude Code SDK using protection
    const { getClaudeCodeSDKManager } = await import('../../prod/src/services/ClaudeCodeSDKManager.js');
    const sdkManager = getClaudeCodeSDKManager();
    const fullPrompt = `${agentInstructions}\n\n${prompt}`;

    // Execute with protection wrapper
    const { executeProtectedQuery, buildUserFacingMessage } = await import('./worker-protection.js');

    const protectionResult = await executeProtectedQuery(fullPrompt, {
      workerId: this.workerId || `comment-worker-${Date.now()}`,
      ticketId: this.ticketId || `comment-ticket-${Date.now()}`,
      sdkManager: sdkManager,
      streamingResponse: false
    });

    // Add diagnostic logging for SDK response structure
    console.log('🔍 SDK Result Structure:', {
      success: protectionResult.success,
      terminated: protectionResult.terminated,
      reason: protectionResult.reason,
      messageCount: protectionResult.messages?.length || 0,
      messageTypes: protectionResult.messages?.map(m => m.type || m.role || 'unknown') || [],
      chunkCount: protectionResult.chunkCount,
      responseSize: protectionResult.responseSize
    });

    // Handle protection termination
    if (protectionResult.terminated) {
      const userMessage = buildUserFacingMessage(protectionResult.reason, {
        chunkCount: protectionResult.chunkCount,
        responseSize: protectionResult.responseSize
      });

      console.error(`⚠️ Comment query terminated: ${protectionResult.reason}`);

      // Use partial response if available
      return protectionResult.partialResponse || userMessage;
    }

    if (!protectionResult.success) {
      throw new Error(`Claude Code SDK execution failed: ${protectionResult.error}`);
    }

    // Extract response from SDK result (pass full result object for fallback)
    const messages = protectionResult.messages || [];
    const result = { success: true, messages: messages };
    const response = this.extractFromTextMessages(messages, result);

    // Log extraction failure for diagnostics
    if (!response || response === '') {
      console.error('❌ Failed to extract response in invokeAgent()');
      console.error('   Messages:', JSON.stringify(messages.slice(0, 2), null, 2));
      console.error('   Full result keys:', Object.keys(result));
    }

    return response || 'No response available';
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
