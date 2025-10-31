/**
 * Test Utilities for Comment Processing Tests
 *
 * Provides helpers for creating mock tickets, posts, and waiting for async operations
 */

/**
 * Create mock comment ticket with realistic data
 * @param {string} content - Comment content (the BUG: should be content, not post_content)
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Mock ticket object
 */
export function createMockCommentTicket(content, metadata = {}) {
  const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const postId = metadata.parent_post_id || `post-${Date.now()}`;

  return {
    id: ticketId,
    post_id: commentId,
    content: content, // FIXED: Use correct 'content' field
    post_metadata: {
      type: 'comment',
      parent_post_id: postId,
      parent_comment_id: metadata.parent_comment_id || null,
      ...metadata
    },
    post_author: metadata.author || 'test-user',
    agent_id: metadata.agent_id || 'avi',
    status: 'pending',
    created_at: new Date().toISOString(),
    metadata: {
      type: 'comment',
      parent_post_id: postId,
      parent_comment_id: metadata.parent_comment_id || null
    }
  };
}

/**
 * Create test post for comment context
 * @param {Object} options - Post options
 * @returns {Object} Mock post object
 */
export function createTestPost(options = {}) {
  const postId = options.id || `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: postId,
    title: options.title || 'Test Post',
    content: options.content || 'This is a test post for comment testing',
    contentBody: options.content || 'This is a test post for comment testing',
    author_agent: options.author_agent || 'test-agent',
    authorAgent: options.author_agent || 'test-agent',
    published_at: options.published_at || new Date().toISOString(),
    publishedAt: options.published_at || new Date().toISOString(),
    created_at: options.created_at || new Date().toISOString(),
    metadata: options.metadata || { tags: ['test'] }
  };
}

/**
 * Create test comment for threading
 * @param {Object} options - Comment options
 * @returns {Object} Mock comment object
 */
export function createTestComment(options = {}) {
  const commentId = options.id || `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: commentId,
    content: options.content || 'Test comment content',
    author: options.author || 'test-user',
    author_agent: options.author_agent || null,
    parent_id: options.parent_id || null,
    post_id: options.post_id || null,
    created_at: options.created_at || new Date().toISOString()
  };
}

/**
 * Wait for ticket to complete processing with timeout
 * @param {string} ticketId - Ticket ID to wait for
 * @param {Object} workQueueRepo - Work queue repository instance
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<Object>} Completed ticket
 * @throws {Error} If ticket doesn't complete within timeout
 */
export async function waitForTicketCompletion(ticketId, workQueueRepo, timeout = 30000) {
  const startTime = Date.now();
  const pollInterval = 100; // Poll every 100ms

  while (Date.now() - startTime < timeout) {
    const ticket = await workQueueRepo.getTicket(ticketId);

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    if (ticket.status === 'completed') {
      return ticket;
    }

    if (ticket.status === 'failed') {
      throw new Error(`Ticket ${ticketId} failed: ${ticket.error_message || 'Unknown error'}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Ticket ${ticketId} did not complete within ${timeout}ms timeout`);
}

/**
 * Wait for condition with timeout
 * @param {Function} condition - Async function that returns true when condition is met
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @param {number} pollInterval - Poll interval in milliseconds (default: 100)
 * @returns {Promise<void>}
 * @throws {Error} If condition not met within timeout
 */
export async function waitForCondition(condition, timeout = 5000, pollInterval = 100) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Condition not met within ${timeout}ms timeout`);
}

/**
 * Create mock work queue repository
 * @returns {Object} Mock work queue repository
 */
export function createMockWorkQueueRepo() {
  const tickets = new Map();

  return {
    tickets, // Expose for testing

    async getTicket(ticketId) {
      return tickets.get(ticketId) || null;
    },

    async createTicket(ticket) {
      tickets.set(ticket.id, { ...ticket, status: 'pending' });
      return ticket;
    },

    async updateTicketStatus(ticketId, status) {
      const ticket = tickets.get(ticketId);
      if (ticket) {
        ticket.status = status;
        ticket.updated_at = new Date().toISOString();
      }
      return ticket;
    },

    async completeTicket(ticketId, result) {
      const ticket = tickets.get(ticketId);
      if (ticket) {
        ticket.status = 'completed';
        ticket.result = result;
        ticket.completed_at = new Date().toISOString();
      }
      return ticket;
    },

    async failTicket(ticketId, error) {
      const ticket = tickets.get(ticketId);
      if (ticket) {
        ticket.status = 'failed';
        ticket.error_message = error;
        ticket.failed_at = new Date().toISOString();
      }
      return ticket;
    },

    async getPendingTickets(options = {}) {
      return Array.from(tickets.values())
        .filter(t => t.status === 'pending')
        .slice(0, options.limit || 100);
    }
  };
}

/**
 * Create mock agent worker for testing
 * @param {Object} config - Worker config
 * @returns {Object} Mock agent worker
 */
export function createMockAgentWorker(config = {}) {
  return {
    workerId: config.workerId || 'test-worker',
    ticketId: config.ticketId || 'test-ticket',
    agentId: config.agentId || 'avi',
    mode: config.mode || 'comment',
    context: config.context || null,

    async processComment() {
      return {
        success: true,
        reply: config.mockReply || 'Test reply',
        agent: this.agentId,
        commentId: this.context?.comment?.id || 'test-comment'
      };
    },

    async execute() {
      return {
        success: true,
        response: 'Test response',
        tokensUsed: 100
      };
    }
  };
}

/**
 * Create mock database selector
 * @returns {Object} Mock database selector
 */
export function createMockDatabaseSelector() {
  const posts = new Map();
  const comments = new Map();

  return {
    posts,
    comments,

    async getPostById(postId) {
      return posts.get(postId) || null;
    },

    async getCommentById(commentId) {
      return comments.get(commentId) || null;
    },

    async getCommentsByPostId(postId) {
      return Array.from(comments.values())
        .filter(c => c.post_id === postId);
    },

    async createPost(post) {
      posts.set(post.id, post);
      return post;
    },

    async createComment(comment) {
      comments.set(comment.id, comment);
      return comment;
    }
  };
}

/**
 * Assert ticket has correct structure for comment processing
 * @param {Object} ticket - Ticket to validate
 * @throws {Error} If ticket structure is invalid
 */
export function assertCommentTicketStructure(ticket) {
  if (!ticket) {
    throw new Error('Ticket is null or undefined');
  }

  if (!ticket.id) {
    throw new Error('Ticket missing id field');
  }

  // FIXED: Check correct 'content' field
  if (!ticket.content) {
    throw new Error('Ticket missing content field');
  }

  if (!ticket.metadata || ticket.metadata.type !== 'comment') {
    throw new Error('Ticket missing comment metadata');
  }

  if (!ticket.metadata.parent_post_id) {
    throw new Error('Ticket missing parent_post_id in metadata');
  }
}

/**
 * Measure execution time of async function
 * @param {Function} fn - Async function to measure
 * @returns {Promise<{result: any, duration: number}>}
 */
export async function measureExecutionTime(fn) {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;

  return { result, duration };
}

export default {
  createMockCommentTicket,
  createTestPost,
  createTestComment,
  waitForTicketCompletion,
  waitForCondition,
  createMockWorkQueueRepo,
  createMockAgentWorker,
  createMockDatabaseSelector,
  assertCommentTicketStructure,
  measureExecutionTime
};
