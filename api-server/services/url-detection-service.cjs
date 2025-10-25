/**
 * URL Detection Service
 * Extracts URLs from content and matches proactive agents
 */

/**
 * Extract all URLs from text content
 * @param {string} content - Text content to search
 * @returns {string[]} - Array of URLs found
 */
function extractURLs(content) {
  if (!content) return [];

  // Regex for URLs (http, https)
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

  const matches = content.match(urlRegex);
  return matches || [];
}

/**
 * Extract context around URL (100 chars before/after)
 * @param {string} content - Full text content
 * @param {string} url - URL to find context for
 * @returns {string} - Context around the URL
 */
function extractContext(content, url) {
  if (!content || !url) return '';

  const urlIndex = content.indexOf(url);
  if (urlIndex === -1) return '';

  const start = Math.max(0, urlIndex - 100);
  const end = Math.min(content.length, urlIndex + url.length + 100);

  const context = content.substring(start, end).trim();
  return context;
}

/**
 * Match proactive agents that should handle this URL
 * @param {string} url - URL to match against
 * @param {string} content - Content containing the URL
 * @returns {string[]} - Array of agent IDs that should handle this URL
 */
function matchProactiveAgents(url, content) {
  const matches = [];

  // Get all proactive agents
  const proactiveAgents = getProactiveAgents();

  for (const agent of proactiveAgents) {
    if (shouldAgentHandle(agent, url, content)) {
      matches.push(agent.id);
    }
  }

  return matches;
}

/**
 * Determine if specific agent should handle URL
 * @param {object} agent - Agent configuration
 * @param {string} url - URL to check
 * @param {string} content - Content containing URL
 * @returns {boolean} - True if agent should handle
 */
function shouldAgentHandle(agent, url, content) {
  // link-logger-agent handles ALL URLs
  if (agent.id === 'link-logger-agent') {
    return true;
  }

  // follow-ups-agent handles if content mentions "follow up", "remind"
  if (agent.id === 'follow-ups-agent') {
    const followUpKeywords = /follow.?up|remind|check.?back|later/i;
    return followUpKeywords.test(content);
  }

  // personal-todos-agent handles if content mentions "todo", "task"
  if (agent.id === 'personal-todos-agent') {
    const todoKeywords = /todo|task|action.?item|need.?to/i;
    return todoKeywords.test(content);
  }

  // meeting-next-steps-agent handles if content mentions meeting-related keywords
  if (agent.id === 'meeting-next-steps-agent') {
    const meetingKeywords = /meeting|agenda|action.?items|next.?steps/i;
    return meetingKeywords.test(content);
  }

  // get-to-know-you-agent handles if content mentions personal/social keywords
  if (agent.id === 'get-to-know-you-agent') {
    const personalKeywords = /introduce|background|bio|about.?me|get.?to.?know/i;
    return personalKeywords.test(content);
  }

  return false;
}

/**
 * Get all proactive agents from filesystem
 * @returns {object[]} - Array of proactive agent configurations
 */
function getProactiveAgents() {
  // This would read from /prod/.claude/agents/*.md
  // For now, return known proactive agents
  return [
    { id: 'link-logger-agent', priority: 'P2' },
    { id: 'follow-ups-agent', priority: 'P2' },
    { id: 'personal-todos-agent', priority: 'P2' },
    { id: 'meeting-next-steps-agent', priority: 'P2' },
    { id: 'get-to-know-you-agent', priority: 'P3' }
  ];
}

/**
 * Determine priority based on agent and content
 * @param {string} agentId - Agent ID
 * @param {string} content - Content to analyze
 * @returns {string} - Priority level (P0, P1, P2, P3)
 */
function determinePriority(agentId, content) {
  // Urgent keywords → P0
  if (/urgent|asap|immediately|critical/i.test(content)) {
    return 'P0';
  }

  // Important keywords → P1
  if (/important|priority|soon/i.test(content)) {
    return 'P1';
  }

  // Default to P2
  return 'P2';
}

module.exports = {
  extractURLs,
  extractContext,
  matchProactiveAgents,
  determinePriority
};
