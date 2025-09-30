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
      model: frontmatter.model || 'sonnet',
      proactive: frontmatter.proactive === true || frontmatter.proactive === 'true',
      priority: frontmatter.priority || 'P3',
      usage: frontmatter.usage || '',
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

export default {
  readAgentFile,
  listAgentFiles,
  findAgentFileBySlug,
  hasFileChanged,
  generateAgentId,
  calculateHash
};