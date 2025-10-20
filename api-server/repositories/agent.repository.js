import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';

/**
 * Agent Repository - Filesystem operations for agent markdown files
 * Reads agent files from /workspaces/agent-feed/prod/.claude/agents/
 * Parses YAML frontmatter and validates agent structure
 */

const AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';

/**
 * Generate stable UUID from agent name using SHA256
 * @param {string} name - Agent name
 * @returns {string} - UUID v5-style format
 */
function generateAgentId(name) {
  const hash = crypto.createHash('sha256').update(name).digest('hex');
  // Convert to UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

/**
 * Calculate SHA256 hash of file content for cache invalidation
 * @param {string} content - File content
 * @returns {string} - SHA256 hash
 */
function calculateHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Parse agent tools array from various formats
 * @param {any} tools - Tools field from frontmatter
 * @returns {Array<string>} - Normalized tools array
 */
function parseTools(tools) {
  if (Array.isArray(tools)) {
    return tools.map(t => String(t).trim());
  }
  if (typeof tools === 'string') {
    // Handle [tool1, tool2] format
    const match = tools.match(/\[(.*?)\]/);
    if (match) {
      return match[1].split(',').map(t => t.trim());
    }
    // Handle comma-separated format
    return tools.split(',').map(t => t.trim());
  }
  return [];
}

/**
 * Validate agent data structure
 * @param {Object} agent - Agent object to validate
 * @throws {Error} - If validation fails
 */
function validateAgent(agent) {
  const required = ['id', 'slug', 'name', 'description'];
  const missing = required.filter(field => !agent[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  if (agent.tools && !Array.isArray(agent.tools)) {
    throw new Error('Tools must be an array');
  }

  if (agent.priority && !/^P[0-7]$/.test(agent.priority)) {
    throw new Error('Priority must be in format P0-P7');
  }
}

/**
 * Read and parse a single agent markdown file
 * @param {string} filePath - Absolute path to agent file
 * @returns {Promise<Object>} - Parsed agent object with metadata
 */
export async function readAgentFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(content);

    // Extract frontmatter data
    const { data: frontmatter, content: markdownContent } = parsed;

    // Get filename without extension for slug
    const filename = path.basename(filePath, '.md');

    // Build agent object
    const agent = {
      id: generateAgentId(frontmatter.name || filename),
      slug: filename,
      name: frontmatter.name || filename,
      description: frontmatter.description || '',
      tools: parseTools(frontmatter.tools || []),
      color: frontmatter.color || '#6366f1',
      avatar_url: frontmatter.avatar_url || null,
      status: frontmatter.status || 'active',
      model: frontmatter.model || 'sonnet',
      proactive: frontmatter.proactive === true || frontmatter.proactive === 'true',
      priority: frontmatter.priority || 'P3',
      usage: frontmatter.usage || '',
      // Tier system fields
      tier: frontmatter.tier || 1, // Default to T1 if not specified
      visibility: frontmatter.visibility || 'public',
      icon: frontmatter.icon || null,
      icon_type: frontmatter.icon_type || 'emoji',
      icon_emoji: frontmatter.icon_emoji || '🤖',
      posts_as_self: frontmatter.posts_as_self !== false, // Default true
      show_in_default_feed: frontmatter.show_in_default_feed !== false, // Default true
      content: markdownContent.trim(),
      hash: calculateHash(content),
      filePath,
      lastModified: (await fs.stat(filePath)).mtime.toISOString()
    };

    // Validate agent structure
    validateAgent(agent);

    return agent;
  } catch (error) {
    throw new Error(`Failed to read agent file ${filePath}: ${error.message}`);
  }
}

/**
 * List all agent markdown files in the agents directory
 * @returns {Promise<Array<string>>} - Array of absolute file paths
 */
export async function listAgentFiles() {
  try {
    const files = await fs.readdir(AGENTS_DIR);
    return files
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(AGENTS_DIR, file));
  } catch (error) {
    throw new Error(`Failed to list agent files: ${error.message}`);
  }
}

/**
 * Find agent file by slug
 * @param {string} slug - Agent slug (filename without extension)
 * @returns {Promise<string|null>} - Absolute file path or null if not found
 */
export async function findAgentFileBySlug(slug) {
  const filePath = path.join(AGENTS_DIR, `${slug}.md`);
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

/**
 * Check if agent file has been modified since given hash
 * @param {string} filePath - Absolute path to agent file
 * @param {string} cachedHash - Previously calculated hash
 * @returns {Promise<boolean>} - True if file has changed
 */
export async function hasFileChanged(filePath, cachedHash) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const currentHash = calculateHash(content);
    return currentHash !== cachedHash;
  } catch {
    return true; // If we can't read file, consider it changed
  }
}

/**
 * Get all agents for a user
 * @param {string} userId - User ID (optional, for future customization)
 * @param {Object} options - Filtering options
 * @param {number|'all'} options.tier - Tier filter (1, 2, or 'all')
 * @param {boolean} options.include_system - Legacy parameter for backward compatibility
 * @returns {Promise<Array>} - Array of agent objects
 */
export async function getAllAgents(userId = 'anonymous', options = {}) {
  try {
    const filePaths = await listAgentFiles();
    console.log(`📂 Found ${filePaths.length} agent files`);

    const agents = await Promise.all(
      filePaths.map(filePath => readAgentFile(filePath))
    );
    console.log(`✅ Parsed ${agents.length} agents`);

    // Apply tier filtering
    let filteredAgents = agents;

    // Handle legacy include_system parameter
    if (options.include_system !== undefined && options.tier === undefined) {
      options.tier = options.include_system ? 'all' : 1;
    }

    // Default to tier 1 if not specified
    const tier = options.tier !== undefined ? options.tier : 1;
    console.log(`🔍 Filtering for tier: ${tier} (type: ${typeof tier})`);

    if (tier !== 'all') {
      // Log tier values BEFORE filtering
      console.log('Agent tiers before filtering:', agents.map(a => ({ name: a.name, tier: a.tier, tierType: typeof a.tier })));

      const tierNumber = Number(tier);
      filteredAgents = agents.filter(agent => {
        const matches = agent.tier === tierNumber;
        if (!matches) {
          console.log(`  ❌ Agent "${agent.name}" tier ${agent.tier} (${typeof agent.tier}) !== ${tierNumber} (number)`);
        }
        return matches;
      });

      console.log(`✅ Filtered to ${filteredAgents.length} agents matching tier ${tierNumber}`);
    } else {
      console.log(`✅ Returning all ${filteredAgents.length} agents (tier=all)`);
    }

    // Sort by name alphabetically
    filteredAgents.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`📂 Loaded ${filteredAgents.length}/${agents.length} agents (tier=${tier})`);
    console.log(`📤 Returning ${filteredAgents.length} agents:`, filteredAgents.map(a => ({ name: a.name, tier: a.tier })));

    return filteredAgents;
  } catch (error) {
    console.error('Failed to get all agents:', error);
    throw error;
  }
}

/**
 * Get agent by slug
 * @param {string} slug - Agent slug (filename without extension)
 * @param {string} userId - User ID (optional, for future customization)
 * @returns {Promise<Object|null>} - Agent object or null if not found
 */
export async function getAgentBySlug(slug, userId = 'anonymous') {
  try {
    const filePath = await findAgentFileBySlug(slug);
    if (!filePath) {
      return null;
    }

    const agent = await readAgentFile(filePath);
    return agent;
  } catch (error) {
    console.error(`Failed to get agent by slug ${slug}:`, error);
    return null;
  }
}

/**
 * Get agent by name
 * @param {string} agentName - Agent name
 * @param {string} userId - User ID (optional, for future customization)
 * @returns {Promise<Object|null>} - Agent object or null if not found
 */
export async function getAgentByName(agentName, userId = 'anonymous') {
  try {
    const agents = await getAllAgents(userId, { tier: 'all' });
    const agent = agents.find(a => a.name === agentName);
    return agent || null;
  } catch (error) {
    console.error(`Failed to get agent by name ${agentName}:`, error);
    return null;
  }
}

/**
 * Calculate tier metadata for agents
 * @param {Array} allAgents - All agents (unfiltered)
 * @param {Array} filteredAgents - Filtered agents
 * @param {number|'all'} appliedTier - Applied tier filter
 * @returns {Object} - Metadata object with tier counts
 */
export function calculateTierMetadata(allAgents, filteredAgents, appliedTier) {
  const tier1Count = allAgents.filter(a => a.tier === 1).length;
  const tier2Count = allAgents.filter(a => a.tier === 2).length;
  const protectedCount = allAgents.filter(a => a.visibility === 'protected').length;

  return {
    total: allAgents.length,
    tier1: tier1Count,
    tier2: tier2Count,
    protected: protectedCount,
    filtered: filteredAgents.length,
    appliedTier: String(appliedTier)
  };
}

export default {
  readAgentFile,
  listAgentFiles,
  findAgentFileBySlug,
  hasFileChanged,
  generateAgentId,
  calculateHash,
  getAllAgents,
  getAgentBySlug,
  getAgentByName,
  calculateTierMetadata
};