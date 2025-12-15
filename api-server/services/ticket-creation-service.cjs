/**
 * Ticket Creation Service
 * Processes post content and creates work queue tickets for proactive agents
 */

const { extractURLs, extractContext, matchProactiveAgents, determinePriority } = require('./url-detection-service.cjs');
const crypto = require('crypto');

/**
 * Process post content and create work queue tickets for proactive agents
 * @param {object} post - Post object with content and author info
 * @param {object} workQueueRepo - Work queue repository instance
 * @returns {Promise<object[]>} - Array of created tickets
 */
async function processPostForProactiveAgents(post, workQueueRepo) {
  const urls = extractURLs(post.content);

  if (urls.length === 0) {
    return [];  // No URLs, no tickets
  }

  const ticketsCreated = [];

  for (const url of urls) {
    const matchedAgents = matchProactiveAgents(url, post.content);
    const context = extractContext(post.content, url);

    for (const agentId of matchedAgents) {
      const priority = determinePriority(agentId, post.content);

      const ticket = await workQueueRepo.createTicket({
        user_id: post.author_id || post.authorId,
        agent_id: agentId,
        content: post.content,
        url: url,
        priority: priority,
        post_id: post.id,
        metadata: {
          post_id: post.id,
          detected_at: Date.now(),
          context: context
        }
      });

      ticketsCreated.push(ticket);

      console.log(`✅ Ticket created for ${agentId}: ${url}`);
    }
  }

  return ticketsCreated;
}

module.exports = {
  processPostForProactiveAgents
};
