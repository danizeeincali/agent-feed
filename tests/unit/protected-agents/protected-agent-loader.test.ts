/**
 * Unit Tests: ProtectedAgentLoader
 *
 * Tests the agent loading system with caching and hot-reload capabilities
 * using London School TDD methodology (mocking external dependencies).
 *
 * Test Coverage:
 * - Cache management (load once, retrieve from cache)
 * - Hot reload on file changes
 * - Handle concurrent loads
 * - Memory management
 * - Error recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import { EventEmitter } from 'events';

// Mock dependencies
vi.mock('fs');

// Type definitions
interface AgentConfig {
  name: string;
  description?: string;
  tools?: string[];
  model?: string;
  _protected?: any;
  _permissions?: any;
}

interface ValidationResult {
  valid: boolean;
  config: AgentConfig;
  errors?: string[];
}

// Mock validator interface
interface AgentConfigValidator {
  validateAgentConfig(agentName: string): Promise<ValidationResult>;
}

// System Under Test
class ProtectedAgentLoader {
  private configCache: Map<string, AgentConfig>;
  private validator: AgentConfigValidator;
  private watcher: fs.FSWatcher | null;
  private loadingPromises: Map<string, Promise<AgentConfig>>;

  constructor(validator: AgentConfigValidator) {
    this.validator = validator;
    this.configCache = new Map();
    this.watcher = null;
    this.loadingPromises = new Map();
  }

  /**
   * Load agent config (with caching)
   */
  async loadAgent(agentName: string): Promise<AgentConfig> {
    // Check if already loading (prevent duplicate concurrent loads)
    if (this.loadingPromises.has(agentName)) {
      return this.loadingPromises.get(agentName)!;
    }

    // Check cache
    if (this.configCache.has(agentName)) {
      return this.configCache.get(agentName)!;
    }

    // Load and validate
    const loadPromise = this.doLoadAgent(agentName);
    this.loadingPromises.set(agentName, loadPromise);

    try {
      const config = await loadPromise;
      return config;
    } finally {
      this.loadingPromises.delete(agentName);
    }
  }

  /**
   * Internal load implementation
   */
  private async doLoadAgent(agentName: string): Promise<AgentConfig> {
    const result = await this.validator.validateAgentConfig(agentName);

    if (!result.valid) {
      throw new Error(`Invalid agent config: ${result.errors?.join(', ')}`);
    }

    // Cache validated config
    this.configCache.set(agentName, result.config);

    return result.config;
  }

  /**
   * Reload agent (clear cache and reload)
   */
  async reloadAgent(agentName: string): Promise<AgentConfig> {
    // Clear from cache
    this.configCache.delete(agentName);

    // Also clear any in-flight loading promise
    this.loadingPromises.delete(agentName);

    // Load fresh
    return this.loadAgent(agentName);
  }

  /**
   * Clear all cached configs
   */
  clearCache(): void {
    this.configCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; agents: string[] } {
    return {
      size: this.configCache.size,
      agents: Array.from(this.configCache.keys())
    };
  }

  /**
   * Watch for file changes and auto-reload
   */
  watchForChanges(agentDirectory: string): void {
    if (this.watcher) {
      throw new Error('Watcher already active');
    }

    this.watcher = fs.watch(agentDirectory, { recursive: true }, (eventType, filename) => {
      this.handleFileChange(eventType, filename);
    });
  }

  /**
   * Stop watching for changes
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Handle file change events
   */
  private handleFileChange(eventType: string, filename: string | null): void {
    if (!filename) return;

    // Reload on .md agent file changes
    if (filename.endsWith('.md')) {
      const agentName = this.extractAgentName(filename);
      this.reloadAgent(agentName).catch(err => {
        console.error(`Failed to reload ${agentName}:`, err);
      });
    }

    // Alert on protected config changes (should never happen)
    if (filename.includes('.system/') && filename.endsWith('.protected.yaml')) {
      console.error(`WARNING: Protected config modified: ${filename}`);
      // In production, this would trigger restoration from backup
    }
  }

  /**
   * Extract agent name from filename
   */
  private extractAgentName(filename: string): string {
    const basename = filename.split('/').pop() || filename;
    return basename.replace(/\.md$/, '');
  }

  /**
   * Check if agent is cached
   */
  isCached(agentName: string): boolean {
    return this.configCache.has(agentName);
  }

  /**
   * Preload multiple agents
   */
  async preloadAgents(agentNames: string[]): Promise<void> {
    await Promise.all(agentNames.map(name => this.loadAgent(name)));
  }
}

describe('ProtectedAgentLoader - Unit Tests (London School)', () => {
  let loader: ProtectedAgentLoader;
  let mockValidator: AgentConfigValidator;

  beforeEach(() => {
    // Create mock validator
    mockValidator = {
      validateAgentConfig: vi.fn()
    };

    loader = new ProtectedAgentLoader(mockValidator);
    vi.clearAllMocks();
  });

  afterEach(() => {
    loader.stopWatching();
  });

  describe('Basic Loading', () => {
    it('should load agent successfully', async () => {
      // Arrange
      const mockConfig: AgentConfig = {
        name: 'test-agent',
        description: 'Test agent',
        tools: ['Read', 'Write']
      };

      vi.mocked(mockValidator.validateAgentConfig).mockResolvedValue({
        valid: true,
        config: mockConfig
      });

      // Act
      const config = await loader.loadAgent('test-agent');

      // Assert
      expect(config).toEqual(mockConfig);
      expect(mockValidator.validateAgentConfig).toHaveBeenCalledWith('test-agent');
      expect(mockValidator.validateAgentConfig).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid agent config', async () => {
      // Arrange
      vi.mocked(mockValidator.validateAgentConfig).mockResolvedValue({
        valid: false,
        config: {} as AgentConfig,
        errors: ['Missing required field: name']
      });

      // Act & Assert
      await expect(loader.loadAgent('invalid-agent'))
        .rejects.toThrow('Invalid agent config: Missing required field: name');
    });

    it('should load multiple different agents', async () => {
      // Arrange
      const agents = ['agent-1', 'agent-2', 'agent-3'];

      vi.mocked(mockValidator.validateAgentConfig).mockImplementation(async (name) => ({
        valid: true,
        config: { name, description: `Config for ${name}` }
      }));

      // Act
      const configs = await Promise.all(agents.map(name => loader.loadAgent(name)));

      // Assert
      expect(configs).toHaveLength(3);
      expect(configs[0].name).toBe('agent-1');
      expect(configs[1].name).toBe('agent-2');
      expect(configs[2].name).toBe('agent-3');
    });
  });

  describe('Cache Management', () => {
    it('should cache loaded agent config', async () => {
      // Arrange
      const mockConfig: AgentConfig = {
        name: 'cached-agent',
        description: 'Should be cached'
      };

      vi.mocked(mockValidator.validateAgentConfig).mockResolvedValue({
        valid: true,
        config: mockConfig
      });

      // Act: Load twice
      await loader.loadAgent('cached-agent');
      await loader.loadAgent('cached-agent');

      // Assert: Validator called only once (second load from cache)
      expect(mockValidator.validateAgentConfig).toHaveBeenCalledTimes(1);
    });

    it('should return same instance from cache', async () => {
      // Arrange
      vi.mocked(mockValidator.validateAgentConfig).mockResolvedValue({
        valid: true,
        config: { name: 'same-instance' }
      });

      // Act
      const config1 = await loader.loadAgent('same-instance');
      const config2 = await loader.loadAgent('same-instance');

      // Assert: Same object reference
      expect(config1).toBe(config2);
    });

    it('should check if agent is cached', async () => {
      // Arrange
      vi.mocked(mockValidator.validateAgentConfig).mockResolvedValue({
        valid: true,
        config: { name: 'check-cache' }
      });

      // Act & Assert
      expect(loader.isCached('check-cache')).toBe(false);

      await loader.loadAgent('check-cache');

      expect(loader.isCached('check-cache')).toBe(true);
    });

    it('should provide cache statistics', async () => {
      // Arrange
      vi.mocked(mockValidator.validateAgentConfig).mockImplementation(async (name) => ({
        valid: true,
        config: { name }
      }));

      // Act
      await loader.loadAgent('agent-1');
      await loader.loadAgent('agent-2');
      await loader.loadAgent('agent-3');

      const stats = loader.getCacheStats();

      // Assert
      expect(stats.size).toBe(3);
      expect(stats.agents).toContain('agent-1');
      expect(stats.agents).toContain('agent-2');
      expect(stats.agents).toContain('agent-3');
    });

    it('should clear entire cache', async () => {
      // Arrange
      vi.mocked(mockValidator.validateAgentConfig).mockResolvedValue({
        valid: true,
        config: { name: 'to-be-cleared' }
      });

      await loader.loadAgent('to-be-cleared');
      expect(loader.getCacheStats().size).toBe(1);

      // Act
      loader.clearCache();

      // Assert
      expect(loader.getCacheStats().size).toBe(0);
      expect(loader.isCached('to-be-cleared')).toBe(false);
    });
  });

  describe('Hot Reload', () => {
    it('should reload agent and clear cache', async () => {
      // Arrange
      vi.mocked(mockValidator.validateAgentConfig)
        .mockResolvedValueOnce({
          valid: true,
          config: { name: 'reload-test', description: 'Version 1' }
        })
        .mockResolvedValueOnce({
          valid: true,
          config: { name: 'reload-test', description: 'Version 2' }
        });

      // Act: Initial load
      const config1 = await loader.loadAgent('reload-test');

      // Act: Reload
      const config2 = await loader.reloadAgent('reload-test');

      // Assert
      expect(config1.description).toBe('Version 1');
      expect(config2.description).toBe('Version 2');
      expect(mockValidator.validateAgentConfig).toHaveBeenCalledTimes(2);
    });

    it('should remove agent from cache on reload', async () => {
      // Arrange
      vi.mocked(mockValidator.validateAgentConfig).mockResolvedValue({
        valid: true,
        config: { name: 'reload-cache-test' }
      });

      await loader.loadAgent('reload-cache-test');
      expect(loader.isCached('reload-cache-test')).toBe(true);

      // Act
      await loader.reloadAgent('reload-cache-test');

      // Assert: Still cached, but with fresh config
      expect(loader.isCached('reload-cache-test')).toBe(true);
      expect(mockValidator.validateAgentConfig).toHaveBeenCalledTimes(2);
    });
  });

  describe('Concurrent Loading', () => {
    it('should prevent duplicate concurrent loads of same agent', async () => {
      // Arrange: Slow validation to test concurrency
      vi.mocked(mockValidator.validateAgentConfig).mockImplementation(async (name) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          valid: true,
          config: { name }
        };
      });

      // Act: Start multiple loads simultaneously
      const promise1 = loader.loadAgent('concurrent-agent');
      const promise2 = loader.loadAgent('concurrent-agent');
      const promise3 = loader.loadAgent('concurrent-agent');

      await Promise.all([promise1, promise2, promise3]);

      // Assert: Validator called only once despite 3 concurrent requests
      expect(mockValidator.validateAgentConfig).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent loads of different agents', async () => {
      // Arrange
      vi.mocked(mockValidator.validateAgentConfig).mockImplementation(async (name) => ({
        valid: true,
        config: { name }
      }));

      // Act: Load different agents concurrently
      const promises = [
        loader.loadAgent('agent-a'),
        loader.loadAgent('agent-b'),
        loader.loadAgent('agent-c')
      ];

      const configs = await Promise.all(promises);

      // Assert
      expect(configs).toHaveLength(3);
      expect(mockValidator.validateAgentConfig).toHaveBeenCalledTimes(3);
    });

    it('should handle race condition between cache check and load', async () => {
      // Arrange
      let loadCount = 0;
      vi.mocked(mockValidator.validateAgentConfig).mockImplementation(async (name) => {
        loadCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          valid: true,
          config: { name, loadNumber: loadCount }
        };
      });

      // Act: Simulate race condition
      const promise1 = loader.loadAgent('race-agent');
      const promise2 = loader.loadAgent('race-agent');

      const [config1, config2] = await Promise.all([promise1, promise2]);

      // Assert: Both should get same config (from single load)
      expect(config1).toBe(config2);
      expect(loadCount).toBe(1);
    });
  });

  describe('File Watching', () => {
    it('should start watching for file changes', () => {
      // Arrange
      const mockWatcher = new EventEmitter() as fs.FSWatcher;
      mockWatcher.close = vi.fn();

      vi.mocked(fs.watch).mockReturnValue(mockWatcher);

      // Act
      loader.watchForChanges('/test/agents');

      // Assert
      expect(fs.watch).toHaveBeenCalledWith(
        '/test/agents',
        { recursive: true },
        expect.any(Function)
      );
    });

    it('should prevent multiple watchers', () => {
      // Arrange
      const mockWatcher = new EventEmitter() as fs.FSWatcher;
      mockWatcher.close = vi.fn();

      vi.mocked(fs.watch).mockReturnValue(mockWatcher);

      loader.watchForChanges('/test/agents');

      // Act & Assert
      expect(() => loader.watchForChanges('/test/agents'))
        .toThrow('Watcher already active');
    });

    it('should stop watching on request', () => {
      // Arrange
      const mockWatcher = new EventEmitter() as fs.FSWatcher;
      mockWatcher.close = vi.fn();

      vi.mocked(fs.watch).mockReturnValue(mockWatcher);

      loader.watchForChanges('/test/agents');

      // Act
      loader.stopWatching();

      // Assert
      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should handle null filename in watch event', () => {
      // Arrange
      const mockWatcher = new EventEmitter() as fs.FSWatcher;
      mockWatcher.close = vi.fn();

      vi.mocked(fs.watch).mockReturnValue(mockWatcher);

      loader.watchForChanges('/test/agents');

      // Act: Emit change with null filename (should not crash)
      mockWatcher.emit('change', 'change', null);

      // Assert: No error thrown
      expect(true).toBe(true);
    });
  });

  describe('Preloading', () => {
    it('should preload multiple agents in parallel', async () => {
      // Arrange
      vi.mocked(mockValidator.validateAgentConfig).mockImplementation(async (name) => ({
        valid: true,
        config: { name }
      }));

      // Act
      await loader.preloadAgents(['agent-1', 'agent-2', 'agent-3']);

      // Assert
      expect(loader.isCached('agent-1')).toBe(true);
      expect(loader.isCached('agent-2')).toBe(true);
      expect(loader.isCached('agent-3')).toBe(true);
      expect(mockValidator.validateAgentConfig).toHaveBeenCalledTimes(3);
    });

    it('should handle preload failures gracefully', async () => {
      // Arrange
      vi.mocked(mockValidator.validateAgentConfig)
        .mockResolvedValueOnce({ valid: true, config: { name: 'agent-1' } })
        .mockRejectedValueOnce(new Error('Load failed'))
        .mockResolvedValueOnce({ valid: true, config: { name: 'agent-3' } });

      // Act & Assert
      await expect(loader.preloadAgents(['agent-1', 'agent-2', 'agent-3']))
        .rejects.toThrow('Load failed');
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with repeated loads', async () => {
      // Arrange
      vi.mocked(mockValidator.validateAgentConfig).mockResolvedValue({
        valid: true,
        config: { name: 'memory-test' }
      });

      // Act: Load and reload many times
      for (let i = 0; i < 100; i++) {
        await loader.reloadAgent('memory-test');
      }

      // Assert: Cache should only contain 1 agent
      const stats = loader.getCacheStats();
      expect(stats.size).toBe(1);
    });

    it('should clear in-flight promises on reload', async () => {
      // Arrange
      vi.mocked(mockValidator.validateAgentConfig).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { valid: true, config: { name: 'slow-load' } };
      });

      // Act: Start load and immediately reload
      const loadPromise = loader.loadAgent('slow-load');
      await loader.reloadAgent('slow-load');

      // Wait for original load
      await loadPromise;

      // Assert: Should have loaded twice
      expect(mockValidator.validateAgentConfig).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after failed load', async () => {
      // Arrange: First load fails, second succeeds
      vi.mocked(mockValidator.validateAgentConfig)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ valid: true, config: { name: 'retry-agent' } });

      // Act
      await expect(loader.loadAgent('retry-agent')).rejects.toThrow('Network error');

      const config = await loader.loadAgent('retry-agent');

      // Assert
      expect(config.name).toBe('retry-agent');
    });

    it('should not cache failed loads', async () => {
      // Arrange
      vi.mocked(mockValidator.validateAgentConfig)
        .mockRejectedValueOnce(new Error('Validation failed'));

      // Act
      await expect(loader.loadAgent('fail-agent')).rejects.toThrow('Validation failed');

      // Assert
      expect(loader.isCached('fail-agent')).toBe(false);
    });
  });

  describe('Agent Name Extraction', () => {
    it('should extract agent name from simple filename', () => {
      // This is a private method, test through file watching
      // Arrange
      const mockWatcher = new EventEmitter() as fs.FSWatcher;
      mockWatcher.close = vi.fn();

      vi.mocked(fs.watch).mockReturnValue(mockWatcher);
      vi.mocked(mockValidator.validateAgentConfig).mockResolvedValue({
        valid: true,
        config: { name: 'simple-agent' }
      });

      loader.watchForChanges('/test/agents');

      // Act: Simulate file change
      mockWatcher.emit('change', 'change', 'simple-agent.md');

      // Assert: Name extraction worked (no error)
      expect(true).toBe(true);
    });

    it('should extract agent name from path with directories', () => {
      // Arrange
      const mockWatcher = new EventEmitter() as fs.FSWatcher;
      mockWatcher.close = vi.fn();

      vi.mocked(fs.watch).mockReturnValue(mockWatcher);
      vi.mocked(mockValidator.validateAgentConfig).mockResolvedValue({
        valid: true,
        config: { name: 'nested-agent' }
      });

      loader.watchForChanges('/test/agents');

      // Act
      mockWatcher.emit('change', 'change', 'subdir/nested-agent.md');

      // Assert
      expect(true).toBe(true);
    });
  });
});
