import chokidar from 'chokidar';
import {
  readAgentFile,
  listAgentFiles,
  findAgentFileBySlug,
  hasFileChanged
} from '../repositories/agent.repository.js';

/**
 * Agent Loader Service - Manages agent loading with caching and file watching
 * Uses LRU cache with TTL and chokidar for file system monitoring
 */

// Simple LRU cache implementation
class LRUCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl; // Time-to-live in milliseconds
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const entry = this.cache.get(key);

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, { ...entry, timestamp: Date.now() });

    return entry.value;
  }

  set(key, value) {
    // Remove if exists (to re-add at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    const entry = this.cache.get(key);

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    // Clean expired entries first
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

// Cache configuration
const CACHE_MAX_SIZE = 100;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache instances
const agentCache = new LRUCache(CACHE_MAX_SIZE, CACHE_TTL);
const allAgentsCache = new LRUCache(10, CACHE_TTL);

// File watcher
let fileWatcher = null;

/**
 * Initialize file watcher for agent directory
 * Invalidates cache when files change
 */
export function initializeWatcher() {
  if (fileWatcher) {
    return; // Already initialized
  }

  const AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';

  fileWatcher = chokidar.watch(`${AGENTS_DIR}/*.md`, {
    persistent: true,
    ignoreInitial: true
  });

  fileWatcher
    .on('add', (filePath) => {
      console.log(`📁 Agent file added: ${filePath}`);
      invalidateCaches();
    })
    .on('change', (filePath) => {
      console.log(`📝 Agent file changed: ${filePath}`);
      invalidateCaches();
    })
    .on('unlink', (filePath) => {
      console.log(`🗑️  Agent file removed: ${filePath}`);
      invalidateCaches();
    })
    .on('error', (error) => {
      console.error('❌ File watcher error:', error);
    });

  console.log('👀 File watcher initialized for agent directory');
}

/**
 * Stop file watcher
 */
export async function stopWatcher() {
  if (fileWatcher) {
    await fileWatcher.close();
    fileWatcher = null;
    console.log('👋 File watcher stopped');
  }
}

/**
 * Invalidate all caches
 */
function invalidateCaches() {
  agentCache.clear();
  allAgentsCache.clear();
  console.log('🔄 Agent caches invalidated');
}

/**
 * Load a single agent by slug with caching
 * @param {string} slug - Agent slug (filename without extension)
 * @returns {Promise<Object|null>} - Agent object or null if not found
 */
export async function loadAgent(slug) {
  try {
    // Check cache first
    const cacheKey = `agent:${slug}`;
    if (agentCache.has(cacheKey)) {
      const cached = agentCache.get(cacheKey);

      // Verify file hasn't changed
      const changed = await hasFileChanged(cached.filePath, cached.hash);
      if (!changed) {
        console.log(`✅ Agent loaded from cache: ${slug}`);
        return cached;
      } else {
        console.log(`🔄 Agent cache invalidated (file changed): ${slug}`);
        agentCache.delete(cacheKey);
      }
    }

    // Find agent file
    const filePath = await findAgentFileBySlug(slug);
    if (!filePath) {
      console.log(`❌ Agent not found: ${slug}`);
      return null;
    }

    // Read and parse agent file
    const agent = await readAgentFile(filePath);

    // Cache the agent
    agentCache.set(cacheKey, agent);

    console.log(`📦 Agent loaded from file: ${slug}`);
    return agent;
  } catch (error) {
    console.error(`❌ Error loading agent ${slug}:`, error);
    throw error;
  }
}

/**
 * Load all agents with caching
 * @returns {Promise<Array<Object>>} - Array of agent objects
 */
export async function loadAllAgents() {
  try {
    // Check cache first
    const cacheKey = 'all-agents';
    if (allAgentsCache.has(cacheKey)) {
      const cached = allAgentsCache.get(cacheKey);
      console.log(`✅ All agents loaded from cache (${cached.length} agents)`);
      return cached;
    }

    // Get all agent files
    const filePaths = await listAgentFiles();
    console.log(`📂 Found ${filePaths.length} agent files`);

    // Load all agents in parallel
    const agents = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          return await readAgentFile(filePath);
        } catch (error) {
          console.error(`❌ Failed to load agent from ${filePath}:`, error.message);
          return null;
        }
      })
    );

    // Filter out failed loads and sort by name
    const validAgents = agents
      .filter(agent => agent !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Cache the results
    allAgentsCache.set(cacheKey, validAgents);

    console.log(`📦 Loaded ${validAgents.length} agents`);
    return validAgents;
  } catch (error) {
    console.error('❌ Error loading all agents:', error);
    throw error;
  }
}

/**
 * Force reload of a specific agent (bypass cache)
 * @param {string} slug - Agent slug
 * @returns {Promise<Object|null>} - Reloaded agent object
 */
export async function reloadAgent(slug) {
  // Clear cache for this agent
  agentCache.delete(`agent:${slug}`);
  allAgentsCache.clear(); // Also clear all-agents cache

  console.log(`🔄 Force reloading agent: ${slug}`);
  return await loadAgent(slug);
}

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
export function getCacheStats() {
  return {
    agentCacheSize: agentCache.size(),
    allAgentsCacheSize: allAgentsCache.size(),
    maxCacheSize: CACHE_MAX_SIZE,
    cacheTTL: CACHE_TTL
  };
}

// Initialize file watcher on module load
initializeWatcher();

export default {
  loadAgent,
  loadAllAgents,
  reloadAgent,
  getCacheStats,
  initializeWatcher,
  stopWatcher
};