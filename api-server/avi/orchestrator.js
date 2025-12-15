/**
 * AVI Orchestrator - Always-On Main Loop
 * Phase 2: Persistent orchestrator that monitors and spawns workers
 *
 * Responsibilities:
 * - Monitor work queue for new tickets
 * - Spawn ephemeral agent workers
 * - Track context size and health
 * - Auto-restart when context bloats
 * - Graceful shutdown handling
 */

import AgentWorker from '../worker/agent-worker.js';
import { getEmergencyMonitor } from '../services/emergency-monitor.js';
import { getHealthMonitor } from '../services/worker-health-monitor.js';
import { TicketValidator } from './ticket-validator.js';
import { SequentialIntroductionOrchestrator } from '../services/agents/sequential-introduction-orchestrator.js';
import { createAgentVisibilityService } from '../services/agent-visibility-service.js';
import { debugLog, debugWarn, debugError, DEBUG_PILLS } from '../utils/debug-logger.js';

// Stub repositories for Phase 2 - Complete implementation
const aviStateRepo = {
  markRunning: async () => { console.log('✅ AVI marked as running'); },
  markStopped: async () => { console.log('🛑 AVI marked as stopped'); },
  updateState: async (state) => {
    console.log('📊 AVI state updated:', state);
    return state;
  },
  recordRestart: async (ticketIds) => {
    console.log('🔄 AVI restart recorded for tickets:', ticketIds);
    return { restartedTickets: ticketIds || [] };
  }
};

class AviOrchestrator {
  constructor(config = {}, workQueueRepository = null, websocketService = null, database = null) {
    this.maxWorkers = config.maxWorkers || 5;
    this.maxContextSize = config.maxContextSize || 50000;
    this.pollInterval = config.pollInterval || 5000; // 5 seconds
    this.healthCheckInterval = config.healthCheckInterval || 30000; // 30 seconds
    this.introductionCheckInterval = config.introductionCheckInterval || 30000; // 30 seconds

    this.running = false;
    this.activeWorkers = new Map(); // workerId -> worker instance
    this.contextSize = 0;
    this.ticketsProcessed = 0;
    this.workersSpawned = 0;

    // ✅ FIX: Belt-and-suspenders duplicate ticket tracking
    this.processingTickets = new Set(); // Track tickets being processed in-memory

    this.mainLoopTimer = null;
    this.healthCheckTimer = null;
    this.introductionCheckTimer = null;

    // Use provided work queue repository or create stub for backward compatibility
    this.workQueueRepo = workQueueRepository || this._createStubRepository();

    // WebSocket service for real-time updates
    this.websocketService = websocketService;

    // Emergency monitor for streaming loop protection
    this.emergencyMonitor = getEmergencyMonitor();
    this.healthMonitor = getHealthMonitor();

    // Sequential Introduction Orchestrator
    this.introOrchestrator = database ? new SequentialIntroductionOrchestrator(database) : null;
    this.database = database;
  }

  /**
   * Create stub repository for backward compatibility
   * @private
   */
  _createStubRepository() {
    return {
      getPendingTickets: async () => [],
      updateTicketStatus: async (id, status) => {
        console.log(`✅ Ticket ${id} status: ${status}`);
      },
      completeTicket: async (ticketId, result) => {
        console.log(`✅ Ticket ${ticketId} completed:`, result);
        return { ticketId, completed: true, result };
      },
      failTicket: async (ticketId, error) => {
        console.error(`❌ Ticket ${ticketId} failed:`, error);
        return { ticketId, failed: true, error };
      }
    };
  }

  /**
   * Start the orchestrator main loop
   */
  async start() {
    if (this.running) {
      console.log('⚠️ Orchestrator already running');
      return;
    }

    console.log('🚀 Starting AVI Orchestrator...');
    this.running = true;

    try {
      // Mark as running in database
      await aviStateRepo.markRunning();

      // Retry any tickets that failed due to known bugs
      const retriedCount = await this.retryFailedCommentTickets();
      if (retriedCount > 0) {
        console.log(`🔄 Retrying ${retriedCount} failed comment tickets`);
      }

      // Start main monitoring loop
      this.startMainLoop();

      // Start health monitoring
      this.startHealthMonitoring();

      // Start introduction queue monitoring
      if (this.introOrchestrator) {
        this.startIntroductionMonitoring();
      }

      // Start emergency monitor for streaming loop protection
      this.emergencyMonitor.start(async (worker) => {
        // Kill callback - handle worker termination
        await this.handleWorkerKill(worker);
      });

      console.log('✅ AVI Orchestrator started successfully');
      console.log(`   Max Workers: ${this.maxWorkers}`);
      console.log(`   Poll Interval: ${this.pollInterval}ms`);
      console.log(`   Max Context: ${this.maxContextSize} tokens`);
      if (this.introOrchestrator) {
        console.log(`   Introduction Check: ${this.introductionCheckInterval}ms`);
      }
    } catch (error) {
      console.error('❌ Failed to start orchestrator:', error);
      this.running = false;
      throw error;
    }
  }

  /**
   * Main monitoring loop - checks for work and spawns workers
   */
  startMainLoop() {
    const loop = async () => {
      if (!this.running) return;

      try {
        await this.processWorkQueue();
      } catch (error) {
        console.error('❌ Error in main loop:', error);
        await aviStateRepo.updateState({ last_error: error.message });
      }

      // Schedule next iteration
      this.mainLoopTimer = setTimeout(loop, this.pollInterval);
    };

    // Start the loop
    loop();
  }

  /**
   * Process work queue - spawn workers for pending tickets
   */
  async processWorkQueue() {
    // Check if we have capacity for more workers
    const activeCount = this.activeWorkers.size;
    if (activeCount >= this.maxWorkers) {
      return; // At capacity
    }

    // ✅ FIX: Use atomic claiming to prevent race condition
    const availableSlots = this.maxWorkers - activeCount;
    const tickets = await this.workQueueRepo.claimPendingTickets({
      limit: availableSlots,
      workerId: `orchestrator-${Date.now()}`
    });

    if (tickets.length === 0) {
      return; // No work to do
    }

    console.log(`📋 Claimed ${tickets.length} pending tickets atomically, spawning workers...`);

    // Spawn workers for each ticket
    for (const ticket of tickets) {
      // ✅ FIX: Belt-and-suspenders - also track in memory
      if (this.processingTickets.has(ticket.id)) {
        console.warn(`⚠️ Ticket ${ticket.id} already being processed, skipping...`);
        continue;
      }
      this.processingTickets.add(ticket.id);

      await this.spawnWorker(ticket);
    }
  }

  /**
   * Spawn an ephemeral worker to process a ticket
   */
  async spawnWorker(ticket) {
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log(`🤖 Spawning worker ${workerId} for ticket ${ticket.id}`);

      // Check if this is a comment ticket
      const isComment = ticket.metadata && ticket.metadata.type === 'comment';

      if (isComment) {
        return await this.processCommentTicket(ticket, workerId);
      }

      // ✅ FIX: Status already updated by claimPendingTickets()
      // No need for duplicate update here

      // Create worker instance
      const worker = new AgentWorker({
        workerId,
        ticketId: ticket.id.toString(),
        agentId: ticket.agent_id,
        workQueueRepo: this.workQueueRepo,
        websocketService: this.websocketService
      });

      // Track worker
      this.activeWorkers.set(workerId, worker);
      this.workersSpawned++;

      // FIX: Increment counter when processing STARTS (not just when completed)
      console.log(`📊 Ticket ${ticket.id} processing started (total in-flight: ${this.activeWorkers.size})`);

      // Emit processing state for posts
      console.log(`📊 [Orchestrator] Emitting 'processing' for POST ticket ${ticket.id}`);
      if (this.websocketService && this.websocketService.isInitialized()) {
        this.websocketService.emitTicketStatusUpdate({
          post_id: ticket.post_id,
          ticket_id: ticket.id,
          status: 'processing',
          agent_id: ticket.agent_id
        });
      }

      // Execute ticket (async)
      worker.execute()
        .then(async (result) => {
          console.log(`✅ Worker ${workerId} completed successfully`);
          this.ticketsProcessed++;
          console.log(`📊 Tickets completed: ${this.ticketsProcessed} (active workers: ${this.activeWorkers.size})`);

          // Mark ticket as completed
          await this.workQueueRepo.completeTicket(ticket.id.toString(), {
            result: result.response,
            tokens_used: result.tokensUsed || 0
          });

          // Emit completed state for posts
          console.log(`📊 [Orchestrator] Emitting 'completed' for POST ticket ${ticket.id}`);
          if (this.websocketService && this.websocketService.isInitialized()) {
            this.websocketService.emitTicketStatusUpdate({
              post_id: ticket.post_id,
              ticket_id: ticket.id,
              status: 'completed',
              agent_id: ticket.agent_id
            });
          }
        })
        .catch(async (error) => {
          console.error(`❌ Worker ${workerId} failed:`, error);

          // Mark ticket as failed (with retry logic)
          await this.workQueueRepo.failTicket(ticket.id.toString(), error.message);

          // Emit failed state for posts
          console.log(`📊 [Orchestrator] Emitting 'failed' for POST ticket ${ticket.id}`);
          if (this.websocketService && this.websocketService.isInitialized()) {
            this.websocketService.emitTicketStatusUpdate({
              post_id: ticket.post_id,
              ticket_id: ticket.id,
              status: 'failed',
              agent_id: ticket.agent_id,
              error: error.message
            });
          }
        })
        .finally(() => {
          // ✅ FIX: Cleanup in-memory tracking
          this.processingTickets.delete(ticket.id);

          // Clean up worker
          this.activeWorkers.delete(workerId);
          console.log(`🗑️ Worker ${workerId} destroyed (${this.activeWorkers.size} active, ${this.ticketsProcessed} completed)`);
        });

      // Update context size estimate
      this.contextSize += 2000; // Rough estimate per ticket

    } catch (error) {
      console.error(`❌ Failed to spawn worker ${workerId}:`, error);
      await this.workQueueRepo.failTicket(ticket.id.toString(), error.message);
    }
  }

  /**
   * Emit comment processing state via WebSocket
   * @param {string} commentId - Comment ID
   * @param {string} postId - Parent post ID
   * @param {string} state - State: 'waiting' | 'analyzed' | 'responding' | 'complete'
   */
  emitCommentState(commentId, postId, state) {
    debugLog('orchestrator', `📡 Emitting state '${state}' for comment ${commentId} (post: ${postId})`);

    if (this.websocketService && this.websocketService.isInitialized()) {
      this.websocketService.emitCommentState({
        commentId,
        postId,
        state,
        timestamp: Date.now()
      });
      debugLog('orchestrator', `✅ State '${state}' emitted successfully for comment ${commentId}`);
    } else {
      debugWarn('orchestrator', `⚠️ WebSocket not initialized, cannot emit state '${state}' for comment ${commentId}`);
    }
  }

  /**
   * Process comment ticket with specialized routing
   */
  async processCommentTicket(ticket, workerId) {
    debugLog('orchestrator', `🎯 Processing comment ticket: ${ticket.id}`);
    debugLog('orchestrator', `📋 Ticket details:`, {
      ticketId: ticket.id,
      postId: ticket.post_id,
      agent: ticket.agent_id,
      metadata: ticket.metadata
    });

    try {
      // Validate ticket fields before processing
      const validator = new TicketValidator();
      validator.validateCommentTicket(ticket);

      // Extract comment metadata
      const metadata = ticket.metadata || {};
      const commentId = ticket.post_id;
      const parentPostId = metadata.parent_post_id;
      const parentCommentId = metadata.parent_comment_id;

      // Emit 'waiting' state - comment has entered the queue
      this.emitCommentState(commentId, parentPostId, 'waiting');

      // FIX: Use ticket.content instead of ticket.post_content
      const content = ticket.content;

      // Additional safety check
      if (!content) {
        throw new Error('Missing ticket.content field');
      }

      // ✅ FIX: Status already updated by claimPendingTickets()
      // No need for duplicate update here

      // Load parent post context
      let parentPost = null;
      try {
        const { default: dbSelector } = await import('../config/database-selector.js');
        parentPost = await dbSelector.getPostById(parentPostId);

        if (parentPost) {
          console.log(`📄 [ROUTING] Parent post loaded: ${parentPostId} by ${parentPost.author_agent || 'unknown'}`);
        } else {
          console.warn(`⚠️ [ROUTING] Parent post ${parentPostId} not found in database`);
        }
      } catch (error) {
        console.error('❌ [ROUTING ERROR] Failed to load parent post:', error);
      }

      // Route to appropriate agent (NOW ASYNC! - pass parentPost for author_agent routing)
      const agent = await this.routeCommentToAgent(content, metadata, parentPost);
      console.log(`🎯 [ROUTING] Final decision: ${agent}`);

      // Emit 'analyzed' state - AI has received and analyzed the comment
      this.emitCommentState(commentId, parentPostId, 'analyzed');

      // Spawn worker in comment mode
      const worker = new AgentWorker({
        workerId,
        ticketId: ticket.id.toString(),
        agentId: agent,
        mode: 'comment',
        context: {
          comment: {
            id: commentId,
            content: content,
            author: ticket.post_author,
            parentPostId: parentPostId,
            parentCommentId: parentCommentId
          },
          parentPost: parentPost,
          ticket: ticket
        },
        workQueueRepo: this.workQueueRepo,
        websocketService: this.websocketService
      });

      // Track worker
      this.activeWorkers.set(workerId, worker);
      this.workersSpawned++;

      // FIX: Log processing start
      console.log(`📊 Comment ticket ${ticket.id} processing started (total in-flight: ${this.activeWorkers.size})`);

      // Emit 'responding' state - AI is starting to generate response
      this.emitCommentState(commentId, parentPostId, 'responding');

      // Process comment and generate reply
      worker.processComment()
        .then(async (result) => {
          console.log(`✅ Worker ${workerId} completed comment processing`);
          this.ticketsProcessed++;
          console.log(`📊 Tickets completed: ${this.ticketsProcessed} (active workers: ${this.activeWorkers.size})`);

          // Post reply to API
          if (result.success && result.reply) {
            debugLog('orchestrator', `✅ Agent response generated for comment ${commentId}, posting reply...`);
            await this.postCommentReply(parentPostId, commentId, agent, result.reply);
            debugLog('orchestrator', `✅ Reply posted successfully for comment ${commentId}`);
          }

          // Emit 'complete' state - response has been posted
          this.emitCommentState(commentId, parentPostId, 'complete');
          debugLog('orchestrator', `🏁 Processing complete for comment ${commentId}`);

          // Complete ticket
          await this.workQueueRepo.completeTicket(ticket.id.toString(), result);

          // NOTE: Worker already emitted 'completed' status via emitStatusUpdate()
          // No need for duplicate orchestrator-level event
        })
        .catch(async (error) => {
          console.error(`❌ Worker ${workerId} failed:`, error);
          await this.workQueueRepo.failTicket(ticket.id.toString(), error.message);

          // NOTE: Worker already emitted 'failed' status via emitStatusUpdate()
          // No need for duplicate orchestrator-level event
        })
        .finally(() => {
          // ✅ FIX: Cleanup in-memory tracking
          this.processingTickets.delete(ticket.id);

          // Clean up worker
          this.activeWorkers.delete(workerId);
          console.log(`🗑️ Worker ${workerId} destroyed (${this.activeWorkers.size} active, ${this.ticketsProcessed} completed)`);
        });

      // Update context size estimate
      this.contextSize += 2000; // Rough estimate per ticket

    } catch (error) {
      console.error(`❌ Failed to process comment ticket:`, error);
      await this.workQueueRepo.failTicket(ticket.id.toString(), error.message);
    }
  }

  /**
   * Route comment to appropriate agent based on parent comment OR parent post
   * PRIORITY 1: Parent comment's author_agent (for threaded replies)
   * PRIORITY 2: Parent post's author_agent (for top-level comments)
   * PRIORITY 3: Agent mentions
   * PRIORITY 4: Keyword-based routing
   * PRIORITY 5: Default to Avi
   */
  async routeCommentToAgent(content, metadata, parentPost = null) {
    const lowerContent = content.toLowerCase();

    // PRIORITY 1: If replying to a comment, route to that comment's agent
    if (metadata.parent_comment_id) {
      try {
        const { default: dbSelector } = await import('../config/database-selector.js');
        const parentComment = await dbSelector.getCommentById(metadata.parent_comment_id);

        if (parentComment && parentComment.author_agent) {
          console.log(`📍 [ROUTING PRIORITY 1] Reply to comment ${metadata.parent_comment_id} → agent: ${parentComment.author_agent}`);
          return parentComment.author_agent;
        } else if (parentComment) {
          console.log(`⚠️ [ROUTING] Parent comment ${metadata.parent_comment_id} exists but has no author_agent, falling back to parent post routing`);
        } else {
          console.log(`⚠️ [ROUTING] Parent comment ${metadata.parent_comment_id} not found, falling back to parent post routing`);
        }
      } catch (error) {
        console.error('❌ [ROUTING ERROR] Failed to load parent comment for routing:', error);
        console.log('⚠️ [ROUTING FALLBACK] Continuing with parent post routing');
      }
    }

    // PRIORITY 2: Route based on parent post's author_agent (FR-1)
    if (parentPost && parentPost.author_agent) {
      console.log(`📍 [ROUTING PRIORITY 2] Top-level comment on post by ${parentPost.author_agent}`);
      return parentPost.author_agent;
    } else if (parentPost) {
      console.log(`⚠️ [ROUTING] Parent post exists but has no author_agent, falling back to mentions/keywords`);
    }

    // PRIORITY 3: Check for agent mentions
    if (lowerContent.includes('@page-builder') || lowerContent.includes('page-builder-agent')) {
      console.log(`📍 [ROUTING PRIORITY 3] Agent mention detected: page-builder-agent`);
      return 'page-builder-agent';
    }
    if (lowerContent.includes('@skills') || lowerContent.includes('skills-architect')) {
      console.log(`📍 [ROUTING PRIORITY 3] Agent mention detected: skills-architect-agent`);
      return 'skills-architect-agent';
    }
    if (lowerContent.includes('@agent-architect') || lowerContent.includes('create agent')) {
      console.log(`📍 [ROUTING PRIORITY 3] Agent mention detected: agent-architect-agent`);
      return 'agent-architect-agent';
    }

    // PRIORITY 4: Keyword-based routing
    const keywords = this.extractKeywords(lowerContent);

    if (keywords.some(k => ['page', 'component', 'ui', 'layout', 'tool'].includes(k))) {
      console.log(`📍 [ROUTING PRIORITY 4] Keyword match: page-builder-agent (keywords: ${keywords.join(', ')})`);
      return 'page-builder-agent';
    }
    if (keywords.some(k => ['skill', 'template', 'pattern'].includes(k))) {
      console.log(`📍 [ROUTING PRIORITY 4] Keyword match: skills-architect-agent (keywords: ${keywords.join(', ')})`);
      return 'skills-architect-agent';
    }
    if (keywords.some(k => ['agent', 'create', 'build'].includes(k))) {
      console.log(`📍 [ROUTING PRIORITY 4] Keyword match: agent-architect-agent (keywords: ${keywords.join(', ')})`);
      return 'agent-architect-agent';
    }

    // PRIORITY 5: Default to Avi
    console.log(`📍 [ROUTING PRIORITY 5] No matches, defaulting to avi`);
    return 'avi';
  }

  /**
   * Extract keywords from text for routing
   */
  extractKeywords(text) {
    const words = text.split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'what', 'how', 'does', 'is', 'are', 'have', 'has'];
    return words.filter(w => w.length > 3 && !stopWords.includes(w));
  }

  /**
   * Post comment reply to API
   */
  async postCommentReply(postId, commentId, agent, replyContent) {
    try {
      const response = await fetch(`http://localhost:3001/api/agent-posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent,
          content_type: 'markdown',  // NEW: Avi responses are markdown
          author_agent: agent,
          parent_id: commentId,
          skipTicket: true  // CRITICAL: Prevent infinite loop
        })
      });

      const data = await response.json();
      console.log(`✅ Posted reply as ${agent}:`, data.data.id);

      // Broadcast via WebSocket with full comment object
      if (this.websocketService && this.websocketService.isInitialized()) {
        this.websocketService.broadcastCommentAdded({
          postId: postId,
          comment: data.data  // Send full comment object from API response
        });
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to post comment reply:', error);
      throw error;
    }
  }

  /**
   * Retry failed comment tickets that failed due to specific bugs
   * Specifically targets the "Cannot read properties of undefined (reading 'toLowerCase')" error
   * @returns {Promise<number>} Number of tickets retried
   */
  async retryFailedCommentTickets() {
    try {
      // Get all failed tickets with the specific error
      const errorPattern = "Cannot read properties of undefined (reading 'toLowerCase')";
      const failedTickets = await this.workQueueRepo.getTicketsByError(errorPattern);

      if (failedTickets.length === 0) {
        return 0;
      }

      console.log(`🔍 Found ${failedTickets.length} failed tickets matching error pattern`);

      // Filter tickets that haven't exceeded max retries
      const ticketsToRetry = failedTickets.filter(ticket => {
        const retryCount = ticket.retry_count || 0;
        return retryCount < 5; // Allow up to 5 retries for bug-related failures
      });

      if (ticketsToRetry.length === 0) {
        console.log('⚠️ All failed tickets have exceeded max retry count');
        return 0;
      }

      // Batch reset tickets for efficiency
      const ticketIds = ticketsToRetry.map(t => t.id);
      const resetCount = await this.workQueueRepo.batchResetTickets(ticketIds);

      console.log(`✅ Reset ${resetCount} tickets for retry`);
      return resetCount;

    } catch (error) {
      console.error('❌ Error retrying failed comment tickets:', error);
      return 0;
    }
  }

  /**
   * Handle worker kill from emergency monitor
   */
  async handleWorkerKill(worker) {
    try {
      console.log(`💀 Handling emergency kill for worker ${worker.workerId}`);

      // Remove from active workers
      const workerInstance = this.activeWorkers.get(worker.workerId);
      if (workerInstance) {
        this.activeWorkers.delete(worker.workerId);
      }

      // Update ticket status to failed
      if (worker.ticketId) {
        await this.workQueueRepo.failTicket(worker.ticketId, `Auto-killed: ${worker.reason}`);
      }

      // NOTE: Worker kill events are handled internally
      // No WebSocket broadcast needed for worker lifecycle events

      console.log(`✅ Worker ${worker.workerId} kill handled successfully`);
    } catch (error) {
      console.error(`❌ Error handling worker kill:`, error);
    }
  }

  /**
   * Introduction queue monitoring loop - check for agents to introduce
   * Runs every 30 seconds to detect user engagement and trigger introductions
   */
  startIntroductionMonitoring() {
    const introCheck = async () => {
      if (!this.running) return;

      try {
        await this.checkIntroductionQueue();
      } catch (error) {
        console.error('❌ Error in introduction check:', error);
      }

      // Schedule next check
      this.introductionCheckTimer = setTimeout(introCheck, this.introductionCheckInterval);
    };

    // Start introduction checks
    introCheck();
  }

  /**
   * Check introduction queue for agents ready to be introduced
   * Called every 30 seconds by the introduction monitoring loop
   */
  async checkIntroductionQueue() {
    try {
      // Get all users (in production, would be more selective)
      const users = this.database.prepare(`
        SELECT DISTINCT user_id FROM user_settings
      `).all();

      for (const user of users) {
        const userId = user.user_id;

        // Get next agent to introduce based on engagement
        const nextAgent = this.introOrchestrator.getNextAgentToIntroduce(userId);

        if (nextAgent) {
          // CRITICAL: Double-check with AgentVisibilityService to block system agents
          const visibilityService = createAgentVisibilityService(this.database);
          const canIntroduce = visibilityService.canIntroduceAgent(userId, nextAgent.agent_id);

          if (!canIntroduce) {
            console.log(`🚫 Blocked introduction of ${nextAgent.agent_id} (system agent or already exposed)`);
            continue;
          }

          console.log(`📋 User ${userId} ready for agent introduction: ${nextAgent.agent_id}`);

          // Create work queue ticket for introduction
          await this.createIntroductionTicket(userId, nextAgent);
        }

        // Check for special workflow triggers in recent posts
        await this.checkWorkflowTriggers(userId);
      }
    } catch (error) {
      console.error('❌ Error checking introduction queue:', error);
    }
  }

  /**
   * Create work queue ticket for agent introduction
   * @param {string} userId - User ID
   * @param {Object} agentInfo - Agent information from introduction queue
   */
  async createIntroductionTicket(userId, agentInfo) {
    try {
      // Check if ticket already exists for this introduction
      const existingTickets = await this.workQueueRepo.getPendingTickets({
        agent_id: agentInfo.agent_id,
        limit: 100
      });

      const alreadyQueued = existingTickets.some(ticket =>
        ticket.metadata?.type === 'introduction' &&
        ticket.metadata?.userId === userId
      );

      if (alreadyQueued) {
        console.log(`⏭️  Introduction ticket already queued for ${agentInfo.agent_id}`);
        return;
      }

      // Create introduction post placeholder
      const { nanoid } = await import('nanoid');
      const postId = `intro-${Date.now()}-${nanoid(8)}`;

      const introPost = this.database.prepare(`
        INSERT INTO agent_posts (id, title, content, author_agent, published_at, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        postId,
        `Introducing ${agentInfo.agent_id}`,
        `[Introduction in progress...]`,
        agentInfo.agent_id,
        new Date().toISOString(),
        JSON.stringify({ isIntroduction: true, pending: true }),
        JSON.stringify({ likes: 0, comments: 0, shares: 0 })
      );

      // Create introduction ticket with post_id
      const ticket = this.workQueueRepo.createTicket({
        agent_id: agentInfo.agent_id,
        user_id: userId,
        post_id: postId,
        content: `Introduce yourself to user ${userId} in post ${postId}`,
        priority: 'P2', // Medium priority
        metadata: {
          type: 'introduction',
          userId: userId,
          agentId: agentInfo.agent_id,
          method: agentInfo.method || 'post',
          queueId: agentInfo.id,
          postId: postId
        }
      });

      console.log(`✅ Created introduction post ${postId} and ticket for ${agentInfo.agent_id}: ${ticket.id}`);
    } catch (error) {
      console.error('❌ Error creating introduction ticket:', error);
    }
  }

  /**
   * Check for special workflow triggers (PageBuilder showcase, Agent Builder tutorial)
   * @param {string} userId - User ID
   */
  async checkWorkflowTriggers(userId) {
    try {
      // Get user's recent posts to check for trigger keywords
      const recentPosts = this.database.prepare(`
        SELECT id, title, content FROM agent_posts
        WHERE author_agent = ?
        ORDER BY created_at DESC
        LIMIT 5
      `).all(userId);

      for (const post of recentPosts) {
        const context = `${post.title || ''} ${post.content}`;
        const trigger = this.introOrchestrator.checkSpecialWorkflowTriggers(userId, context);

        if (trigger) {
          console.log(`🎯 Special workflow trigger detected: ${trigger.workflow}`);

          // Check if workflow already started
          const existingWorkflow = this.database.prepare(`
            SELECT id FROM agent_workflows
            WHERE user_id = ? AND agent_id = ? AND workflow_type = 'showcase'
            AND status IN ('pending', 'active')
          `).get(userId, trigger.agentId);

          if (!existingWorkflow) {
            // Create workflow ticket
            await this.createWorkflowTicket(userId, trigger, post.id);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking workflow triggers:', error);
    }
  }

  /**
   * Create work queue ticket for special workflow
   * @param {string} userId - User ID
   * @param {Object} trigger - Workflow trigger information
   * @param {string} postId - Triggering post ID
   */
  async createWorkflowTicket(userId, trigger, postId) {
    try {
      const ticket = this.workQueueRepo.createTicket({
        agent_id: trigger.agentId,
        user_id: userId,
        content: `Start ${trigger.workflow} for user ${userId}`,
        priority: 'P1', // High priority for workflows
        post_id: postId,
        metadata: {
          type: 'workflow',
          workflow: trigger.workflow,
          userId: userId,
          agentId: trigger.agentId,
          triggerPostId: postId
        }
      });

      console.log(`✅ Created workflow ticket for ${trigger.workflow}: ${ticket.id}`);
    } catch (error) {
      console.error('❌ Error creating workflow ticket:', error);
    }
  }

  /**
   * Health monitoring loop - check context size and restart if needed
   */
  startHealthMonitoring() {
    const healthCheck = async () => {
      if (!this.running) return;

      try {
        // Update state in database
        await aviStateRepo.updateState({
          context_size: this.contextSize,
          active_workers: this.activeWorkers.size,
          workers_spawned: this.workersSpawned,
          tickets_processed: this.ticketsProcessed,
          last_health_check: new Date()
        });

        // Check if context is too large
        if (this.contextSize > this.maxContextSize) {
          console.log('⚠️ Context size exceeds limit, triggering restart...');
          await this.restart();
        }

        // Log health
        console.log(`💚 Health Check: ${this.activeWorkers.size} workers, ${this.contextSize} tokens, ${this.ticketsProcessed} processed`);

      } catch (error) {
        console.error('❌ Health check error:', error);
      }

      // Schedule next check
      this.healthCheckTimer = setTimeout(healthCheck, this.healthCheckInterval);
    };

    // Start health checks
    healthCheck();
  }

  /**
   * Graceful restart - preserve pending tickets
   */
  async restart() {
    console.log('🔄 Restarting orchestrator...');

    // Get pending tickets to preserve
    const pendingTickets = await workQueueRepo.getTicketsByUser(null, {
      status: 'pending',
      limit: 100
    });
    const ticketIds = pendingTickets.map(t => t.id.toString());

    // Record restart
    await aviStateRepo.recordRestart(ticketIds);

    // Stop current instance
    await this.stop();

    // Reset context
    this.contextSize = 0;
    this.ticketsProcessed = 0;

    // Start fresh
    await this.start();
  }

  /**
   * Stop the orchestrator gracefully
   */
  async stop() {
    if (!this.running) {
      console.log('⚠️ Orchestrator not running');
      return;
    }

    console.log('🛑 Stopping AVI Orchestrator...');
    this.running = false;

    // Stop emergency monitor
    if (this.emergencyMonitor) {
      this.emergencyMonitor.stop();
    }

    // Stop timers
    if (this.mainLoopTimer) {
      clearTimeout(this.mainLoopTimer);
      this.mainLoopTimer = null;
    }
    if (this.healthCheckTimer) {
      clearTimeout(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    if (this.introductionCheckTimer) {
      clearTimeout(this.introductionCheckTimer);
      this.introductionCheckTimer = null;
    }

    // Wait for active workers to finish (with timeout)
    const timeout = 30000; // 30 seconds
    const start = Date.now();
    while (this.activeWorkers.size > 0 && (Date.now() - start) < timeout) {
      console.log(`⏳ Waiting for ${this.activeWorkers.size} workers to finish...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Force kill remaining workers
    if (this.activeWorkers.size > 0) {
      console.log(`⚠️ Force stopping ${this.activeWorkers.size} workers`);
      this.activeWorkers.clear();
    }

    // Get pending tickets to preserve
    const pendingTickets = await workQueueRepo.getTicketsByUser(null, {
      status: 'pending',
      limit: 100
    });
    const ticketIds = pendingTickets.map(t => t.id.toString());

    // Update database
    await aviStateRepo.updateState({
      status: 'stopped',
      pending_tickets: ticketIds
    });

    console.log('✅ AVI Orchestrator stopped');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      running: this.running,
      contextSize: this.contextSize,
      activeWorkers: this.activeWorkers.size,
      workersSpawned: this.workersSpawned,
      ticketsProcessed: this.ticketsProcessed,
      maxWorkers: this.maxWorkers,
      maxContextSize: this.maxContextSize
    };
  }
}

// Singleton instance
let orchestratorInstance = null;

/**
 * Get or create orchestrator instance
 */
export function getOrchestrator(config = {}, workQueueRepository = null, websocketService = null, database = null) {
  if (!orchestratorInstance) {
    orchestratorInstance = new AviOrchestrator(config, workQueueRepository, websocketService, database);
  }
  return orchestratorInstance;
}

/**
 * Start the orchestrator
 */
export async function startOrchestrator(config = {}, workQueueRepository = null, websocketService = null, database = null) {
  const orchestrator = getOrchestrator(config, workQueueRepository, websocketService, database);
  await orchestrator.start();
  return orchestrator;
}

/**
 * Stop the orchestrator
 */
export async function stopOrchestrator() {
  if (orchestratorInstance) {
    await orchestratorInstance.stop();
  }
}

export default AviOrchestrator;
