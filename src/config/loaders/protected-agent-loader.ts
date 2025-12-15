/**
 * ProtectedAgentLoader - Loads and caches agent configurations with protected sidecar support
 *
 * Phase 3: Core Components Implementation
 *
 * Responsibility:
 * - Load agent configurations with caching
 * - Hot-reload on file changes via fs.watch()
 * - Prevent duplicate concurrent loads
 * - LRU cache eviction when needed
 * - Integration point for WorkerSpawnerAdapter
 */

import * as fs from 'fs';
import * as path from 'path';
import type { FSWatcher } from 'fs';
import { AgentConfigValidator, AgentConfig } from '../validators/agent-config-validator';
import logger from '../../utils/logger';

/**
 * Cached configuration entry
 */
interface CachedConfig {
  config: AgentConfig;
  timestamp: number;
  ttl: number;
  hits: number;
}

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

/**
 * Loader options
 */
interface LoaderOptions {
  agentDirectory?: string;
  cacheTTL?: number;
  maxCacheSize?: number;
  enableFileWatcher?: boolean;
}

/**
 * ProtectedAgentLoader class
 * Main loader with caching and file watching
 */
export class ProtectedAgentLoader {
  private validator: AgentConfigValidator;
  private configCache: Map<string, CachedConfig>;
  private loadingPromises: Map<string, Promise<AgentConfig>>; // Prevent concurrent loads
  private watcher?: FSWatcher;
  private agentDirectory: string;
  private cacheTTL: number;
  private maxCacheSize: number;
  private enableFileWatcher: boolean;

  // Cache statistics
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(options?: LoaderOptions) {
    this.validator = new AgentConfigValidator({
      agentDirectory: options?.agentDirectory,
    });

    this.configCache = new Map();
    this.loadingPromises = new Map();
    this.agentDirectory = options?.agentDirectory || '/workspaces/agent-feed/.claude/agents';
    this.cacheTTL = options?.cacheTTL || parseInt(process.env.AGENT_CONFIG_CACHE_TTL || '60000'); // 1 minute
    this.maxCacheSize = options?.maxCacheSize || parseInt(process.env.AGENT_CONFIG_CACHE_MAX_SIZE || '100');
    this.enableFileWatcher = options?.enableFileWatcher !== false;

    logger.info('ProtectedAgentLoader initialized', {
      agentDirectory: this.agentDirectory,
      cacheTTL: this.cacheTTL,
      maxCacheSize: this.maxCacheSize,
      fileWatcherEnabled: this.enableFileWatcher,
    });
  }

  /**
   * Load agent configuration with caching
   * Main entry point - called by WorkerSpawnerAdapter
   *
   * @param agentName - Agent identifier (e.g., "strategic-planner")
   * @returns Promise resolving to validated agent configuration
   * @throws AgentNotFoundError if agent file doesn't exist
   * @throws SecurityError if integrity check fails
   */
  async loadAgent(agentName: string): Promise<AgentConfig> {
    try {
      // Check if already loading (prevent duplicate concurrent loads)
      const existingLoad = this.loadingPromises.get(agentName);
      if (existingLoad) {
        logger.debug('Agent already loading, waiting for existing load', { agentName });
        return existingLoad;
      }

      // Check cache first
      const cached = this.configCache.get(agentName);
      if (cached && !this.isCacheExpired(cached)) {
        this.cacheStats.hits++;
        cached.hits++;
        logger.debug('Cache hit for agent', {
          agentName,
          cacheAge: Date.now() - cached.timestamp,
          totalHits: cached.hits,
        });
        return cached.config;
      }

      // Cache miss - load from file system
      this.cacheStats.misses++;
      logger.debug('Cache miss for agent', { agentName });

      // Create loading promise to prevent concurrent loads
      const loadPromise = this.loadAgentFromFileSystem(agentName);
      this.loadingPromises.set(agentName, loadPromise);

      try {
        const config = await loadPromise;

        // Cache result
        this.configCache.set(agentName, {
          config,
          timestamp: Date.now(),
          ttl: this.cacheTTL,
          hits: 0,
        });

        // Enforce cache size limit
        await this.enforceCacheSizeLimit();

        logger.info('Loaded agent', {
          agentName,
          hasProtection: !!config._protected,
          cacheSize: this.configCache.size,
        });

        return config;

      } finally {
        // Remove loading promise
        this.loadingPromises.delete(agentName);
      }

    } catch (error) {
      logger.error('Failed to load agent', {
        agentName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Reload agent configuration (clears cache)
   * Useful after protected config updates
   *
   * @param agentName - Agent identifier
   */
  async reloadAgent(agentName: string): Promise<void> {
    logger.info('Reloading agent config', { agentName });

    // Clear cache entry
    this.configCache.delete(agentName);

    // Load fresh copy
    await this.loadAgent(agentName);

    logger.info('Agent config reloaded', { agentName });
  }

  /**
   * Watch for file changes and auto-reload
   * Watches both .md agent files and .system/*.protected.yaml files
   */
  watchForChanges(): void {
    if (!this.enableFileWatcher) {
      logger.info('File watcher disabled');
      return;
    }

    if (this.watcher) {
      logger.warn('File watcher already started');
      return;
    }

    try {
      this.watcher = fs.watch(
        this.agentDirectory,
        { recursive: true },
        (eventType, filename) => {
          if (!filename) return;

          // Handle .md agent file changes
          if (filename.endsWith('-agent.md')) {
            const agentName = this.extractAgentName(filename);
            logger.info('Agent file changed, reloading', {
              filename,
              agentName,
              eventType,
            });

            this.reloadAgent(agentName).catch((error) => {
              logger.error('Failed to reload agent after file change', {
                agentName,
                error: error instanceof Error ? error.message : String(error),
              });
            });
          }

          // Handle protected config changes
          if (filename.includes('.system/') && filename.endsWith('.protected.yaml')) {
            const agentName = path.basename(filename, '.protected.yaml');
            logger.warn('Protected config modified', {
              filename,
              agentName,
              eventType,
              timestamp: new Date().toISOString(),
            });

            // Clear cache to force integrity re-check on next load
            this.configCache.delete(agentName);

            logger.info('Cleared cache for agent due to protected config change', {
              agentName,
            });
          }
        }
      );

      logger.info('File watcher started', {
        directory: this.agentDirectory,
      });

    } catch (error) {
      logger.error('Failed to start file watcher', {
        directory: this.agentDirectory,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Stop file watcher
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
      logger.info('File watcher stopped');
    }
  }

  /**
   * Clear all cached configurations
   */
  clearCache(): void {
    const size = this.configCache.size;
    this.configCache.clear();
    logger.info('Cleared agent config cache', { entriesCleared: size });
  }

  /**
   * Get cache statistics
   * @returns Current cache statistics
   */
  getCacheStats(): CacheStats {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? this.cacheStats.hits / total : 0;

    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      evictions: this.cacheStats.evictions,
      size: this.configCache.size,
      hitRate,
    };
  }

  /**
   * Load agent from file system (bypasses cache)
   * @param agentName - Agent identifier
   * @returns Promise resolving to agent configuration
   */
  private async loadAgentFromFileSystem(agentName: string): Promise<AgentConfig> {
    const startTime = Date.now();

    const config = await this.validator.validateAgentConfig(agentName);

    const duration = Date.now() - startTime;
    logger.debug('Loaded agent from file system', {
      agentName,
      duration,
      hasProtection: !!config._protected,
    });

    return config;
  }

  /**
   * Check if cached entry is expired
   * @param cached - Cached configuration entry
   * @returns True if expired
   */
  private isCacheExpired(cached: CachedConfig): boolean {
    return Date.now() - cached.timestamp > cached.ttl;
  }

  /**
   * Extract agent name from filename
   * @param filename - Filename (e.g., "strategic-planner-agent.md")
   * @returns Agent name (e.g., "strategic-planner")
   */
  private extractAgentName(filename: string): string {
    return path.basename(filename, '-agent.md');
  }

  /**
   * Enforce cache size limit using LRU eviction
   * Removes least-recently-used entries when cache exceeds maxCacheSize
   */
  private async enforceCacheSizeLimit(): Promise<void> {
    if (this.configCache.size <= this.maxCacheSize) {
      return;
    }

    // Sort by last access time (oldest first)
    const entries = Array.from(this.configCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Calculate how many to evict
    const evictCount = this.configCache.size - this.maxCacheSize;
    const toEvict = entries.slice(0, evictCount);

    // Evict oldest entries
    toEvict.forEach(([key]) => {
      this.configCache.delete(key);
      this.cacheStats.evictions++;
    });

    logger.info('Evicted least-recently-used cache entries', {
      evicted: toEvict.length,
      remaining: this.configCache.size,
      maxSize: this.maxCacheSize,
    });
  }
}

/**
 * Export singleton instance for convenience
 */
export const protectedAgentLoader = new ProtectedAgentLoader();
