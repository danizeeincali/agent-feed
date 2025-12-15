/**
 * Ticket Status Service
 * Provides ticket status tracking and aggregation for posts and comments
 *
 * This service provides real-time status information for proactive agent tickets
 * created by the work queue system (link-logger-agent, follow-up agents, etc.)
 */

/**
 * Get ticket status summary for a specific post
 * @param {string} postId - The post ID to query
 * @param {import('better-sqlite3').Database} db - Database instance
 * @returns {Object} Ticket status information
 */
export function getPostTicketStatus(postId, db) {
  if (!postId || typeof postId !== 'string') {
    throw new Error('Invalid post_id: must be a non-empty string');
  }

  if (!db) {
    throw new Error('Database instance is required');
  }

  try {
    // Query all tickets for this post
    const stmt = db.prepare(`
      SELECT
        id,
        agent_id,
        content,
        url,
        priority,
        status,
        retry_count,
        metadata,
        result,
        last_error,
        post_id,
        created_at,
        assigned_at,
        completed_at
      FROM work_queue_tickets
      WHERE post_id = ?
      ORDER BY created_at DESC
    `);

    const tickets = stmt.all(postId);

    // Deserialize JSON fields
    const deserializedTickets = tickets.map(ticket => ({
      ...ticket,
      metadata: ticket.metadata ? JSON.parse(ticket.metadata) : null,
      result: ticket.result ? JSON.parse(ticket.result) : null
    }));

    // Generate summary
    const summary = getTicketStatusSummary(deserializedTickets);

    return {
      post_id: postId,
      tickets: deserializedTickets,
      summary
    };
  } catch (error) {
    console.error('Error fetching post ticket status:', error);
    throw new Error(`Failed to fetch ticket status: ${error.message}`);
  }
}

/**
 * Get multiple posts with their ticket status
 * Optimized with a single JOIN query to avoid N+1 problems
 * @param {import('better-sqlite3').Database} db - Database instance
 * @param {number} limit - Maximum number of posts to return
 * @param {number} offset - Offset for pagination
 * @returns {Array} Array of posts with ticket information
 */
export function getPostsWithTicketStatus(db, limit = 20, offset = 0) {
  if (!db) {
    throw new Error('Database instance is required');
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const parsedOffset = Math.max(parseInt(offset) || 0, 0);

  try {
    // First, get the posts
    const postsStmt = db.prepare(`
      SELECT
        id,
        agent_id,
        title,
        content,
        published_at,
        updated_at,
        author_name,
        author_username,
        metadata
      FROM agent_posts
      ORDER BY published_at DESC
      LIMIT ? OFFSET ?
    `);

    const posts = postsStmt.all(parsedLimit, parsedOffset);

    // Get all tickets for these posts in a single query
    if (posts.length === 0) {
      return [];
    }

    const postIds = posts.map(p => p.id);
    const placeholders = postIds.map(() => '?').join(',');

    const ticketsStmt = db.prepare(`
      SELECT
        id,
        post_id,
        agent_id,
        content,
        url,
        priority,
        status,
        retry_count,
        metadata,
        result,
        last_error,
        created_at,
        assigned_at,
        completed_at
      FROM work_queue_tickets
      WHERE post_id IN (${placeholders})
      ORDER BY created_at DESC
    `);

    const allTickets = ticketsStmt.all(...postIds);

    // Deserialize and group tickets by post_id
    const ticketsByPost = {};
    allTickets.forEach(ticket => {
      if (!ticketsByPost[ticket.post_id]) {
        ticketsByPost[ticket.post_id] = [];
      }
      ticketsByPost[ticket.post_id].push({
        ...ticket,
        metadata: ticket.metadata ? JSON.parse(ticket.metadata) : null,
        result: ticket.result ? JSON.parse(ticket.result) : null
      });
    });

    // Combine posts with their tickets
    return posts.map(post => {
      const tickets = ticketsByPost[post.id] || [];
      const summary = getTicketStatusSummary(tickets);

      return {
        ...post,
        metadata: post.metadata ? JSON.parse(post.metadata) : null,
        ticket_status: {
          tickets,
          summary
        }
      };
    });
  } catch (error) {
    console.error('Error fetching posts with ticket status:', error);
    throw new Error(`Failed to fetch posts with tickets: ${error.message}`);
  }
}

/**
 * Aggregate ticket statuses into a summary
 * @param {Array} tickets - Array of ticket objects
 * @returns {Object} Status summary
 */
export function getTicketStatusSummary(tickets) {
  if (!Array.isArray(tickets)) {
    throw new Error('Invalid tickets: must be an array');
  }

  const summary = {
    total: tickets.length,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    agents: []
  };

  // Count by status and collect unique agents
  const agentSet = new Set();

  tickets.forEach(ticket => {
    // Map 'in_progress' to 'processing' for user-facing display
    if (ticket.status === 'pending') {
      summary.pending++;
    } else if (ticket.status === 'in_progress') {
      summary.processing++;
    } else if (ticket.status === 'completed') {
      summary.completed++;
    } else if (ticket.status === 'failed') {
      summary.failed++;
    }

    if (ticket.agent_id) {
      agentSet.add(ticket.agent_id);
    }
  });

  summary.agents = Array.from(agentSet);

  return summary;
}

/**
 * Get ticket statistics across all posts
 * Useful for dashboard/monitoring views
 * @param {import('better-sqlite3').Database} db - Database instance
 * @returns {Object} Global ticket statistics
 */
export function getGlobalTicketStats(db) {
  if (!db) {
    throw new Error('Database instance is required');
  }

  try {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        COUNT(DISTINCT agent_id) as unique_agents,
        COUNT(DISTINCT post_id) as posts_with_tickets
      FROM work_queue_tickets
    `);

    const stats = stmt.get();

    return {
      total: stats.total || 0,
      pending: stats.pending || 0,
      processing: stats.processing || 0,
      completed: stats.completed || 0,
      failed: stats.failed || 0,
      unique_agents: stats.unique_agents || 0,
      posts_with_tickets: stats.posts_with_tickets || 0
    };
  } catch (error) {
    console.error('Error fetching global ticket stats:', error);
    throw new Error(`Failed to fetch ticket stats: ${error.message}`);
  }
}

export default {
  getPostTicketStatus,
  getPostsWithTicketStatus,
  getTicketStatusSummary,
  getGlobalTicketStats
};
