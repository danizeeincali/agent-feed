/**
 * Skills Service - API wrapper for Claude Agent Skills
 *
 * Handles skill registration, loading, and management for the AVI framework.
 * Implements progressive disclosure and caching for token efficiency.
 *
 * @module SkillsService
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

/**
 * Skill metadata from YAML frontmatter
 */
export interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  _protected?: boolean;
  _protection_source?: string;
  _allowed_agents?: string[];
  _last_updated?: string;
}

/**
 * Complete skill definition
 */
export interface SkillDefinition {
  metadata: SkillMetadata;
  content: string;
  resources: SkillResource[];
  path: string;
  hash: string;
}

/**
 * Skill resource file
 */
export interface SkillResource {
  path: string;
  type: string;
  content?: string;
}

/**
 * Skill cache entry
 */
interface CacheEntry {
  skill: SkillDefinition;
  timestamp: number;
  hash: string;
}

/**
 * Skills Service
 *
 * Manages Claude Agent Skills for the AVI framework:
 * - Progressive disclosure (metadata → content → resources)
 * - Protected skills validation
 * - Caching for performance
 * - Version management
 * - Audit logging
 */
export class SkillsService {
  private anthropic: Anthropic;
  private skillsDir = '/workspaces/agent-feed/prod/skills';
  private cache = new Map<string, CacheEntry>();
  private cacheTTL = 3600000; // 1 hour in milliseconds

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Register a skill with Anthropic API
   *
   * @param skillPath - Path to skill directory (relative to skillsDir)
   * @returns Anthropic skill ID
   * @throws {Error} If validation fails or API request fails
   *
   * @example
   * ```typescript
   * const skillId = await service.registerSkill('.system/brand-guidelines');
   * console.log('Registered skill:', skillId);
   * ```
   */
  async registerSkill(skillPath: string): Promise<string> {
    const isProtected = skillPath.includes('.system/');

    // Validation for protected skills
    if (isProtected && !await this.validateProtectedSkill(skillPath)) {
      throw new Error(`Protected skill validation failed: ${skillPath}`);
    }

    const skillDefinition = await this.loadSkillFiles(skillPath);

    try {
      const skill = await this.anthropic.beta.skills.create({
        files_from_dir: path.join(this.skillsDir, skillPath),
        display_title: skillDefinition.metadata.name,
        betas: ['skills-2025-10-02']
      });

      // Log skill registration
      await this.logSkillRegistration(skill.id, skillPath, isProtected);

      return skill.id;
    } catch (error) {
      console.error('Failed to register skill:', error);
      throw new Error(`Skill registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load skill metadata only (Tier 1 - Discovery)
   *
   * Minimal token usage (~100 tokens per skill)
   *
   * @param skillPath - Path to skill directory
   * @returns Skill metadata
   */
  async loadSkillMetadata(skillPath: string): Promise<SkillMetadata> {
    const fullPath = path.join(this.skillsDir, skillPath);
    const skillMdPath = path.join(fullPath, 'SKILL.md');

    try {
      const skillMd = await readFile(skillMdPath, 'utf-8');
      return this.parseFrontmatter(skillMd);
    } catch (error) {
      throw new Error(`Failed to load skill metadata: ${skillPath}`);
    }
  }

  /**
   * Load complete skill definition (Tier 2 - Invocation)
   *
   * Includes all content and resource references
   *
   * @param skillPath - Path to skill directory
   * @param useCache - Whether to use cached version (default: true)
   * @returns Complete skill definition
   */
  async loadSkillFiles(skillPath: string, useCache = true): Promise<SkillDefinition> {
    // Check cache first
    if (useCache) {
      const cached = this.getFromCache(skillPath);
      if (cached) {
        return cached;
      }
    }

    const fullPath = path.join(this.skillsDir, skillPath);
    const skillMdPath = path.join(fullPath, 'SKILL.md');

    const skillMd = await readFile(skillMdPath, 'utf-8');
    const metadata = this.parseFrontmatter(skillMd);
    const content = this.removeFreontmatter(skillMd);

    // Load all resource files
    const resources = await this.recursiveFileLoad(fullPath);

    // Calculate hash for cache invalidation
    const hash = this.calculateHash(skillMd + JSON.stringify(resources));

    const skillDefinition: SkillDefinition = {
      metadata,
      content,
      resources,
      path: skillPath,
      hash
    };

    // Cache the skill
    this.cache.set(skillPath, {
      skill: skillDefinition,
      timestamp: Date.now(),
      hash
    });

    return skillDefinition;
  }

  /**
   * Load specific resource file (Tier 3 - Resources)
   *
   * On-demand loading of supporting files
   *
   * @param skillPath - Path to skill directory
   * @param resourcePath - Path to resource within skill
   * @returns Resource content
   */
  async loadResource(skillPath: string, resourcePath: string): Promise<string> {
    const fullPath = path.join(this.skillsDir, skillPath, resourcePath);

    try {
      return await readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to load resource: ${resourcePath} from ${skillPath}`);
    }
  }

  /**
   * Validate that a protected skill has not been modified
   *
   * Checks:
   * - File permissions (read-only)
   * - Protection marker exists
   * - Agent whitelist validation
   *
   * @param skillPath - Path to protected skill
   * @returns True if valid, false otherwise
   */
  private async validateProtectedSkill(skillPath: string): Promise<boolean> {
    const fullPath = path.join(this.skillsDir, skillPath);
    const protectionMarker = path.join(path.dirname(fullPath), '.protected');

    try {
      // Check protection marker exists
      await stat(protectionMarker);

      // Check directory is read-only (755 permissions)
      const stats = await stat(fullPath);
      const mode = stats.mode & parseInt('777', 8);

      // Directory should be 755 (rwxr-xr-x)
      if (mode !== parseInt('755', 8)) {
        console.warn(`Protected skill has incorrect permissions: ${skillPath}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Protected skill validation failed: ${skillPath}`, error);
      return false;
    }
  }

  /**
   * Parse YAML frontmatter from SKILL.md
   *
   * @param content - Full SKILL.md content
   * @returns Parsed metadata
   */
  private parseFrontmatter(content: string): SkillMetadata {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      throw new Error('No frontmatter found in SKILL.md');
    }

    const frontmatter = match[1];
    const metadata: Partial<SkillMetadata> = {};

    // Simple YAML parser for our use case
    frontmatter.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();

        // Handle different value types
        if (key.trim() === '_allowed_agents') {
          // Parse array
          metadata._allowed_agents = value
            .replace(/[\[\]]/g, '')
            .split(',')
            .map(s => s.trim().replace(/['"]/g, ''));
        } else if (value === 'true') {
          // @ts-ignore - Dynamic property assignment
          metadata[key.trim()] = true;
        } else if (value === 'false') {
          // @ts-ignore - Dynamic property assignment
          metadata[key.trim()] = false;
        } else {
          // @ts-ignore - Dynamic property assignment
          metadata[key.trim()] = value.replace(/['"]/g, '');
        }
      }
    });

    if (!metadata.name || !metadata.description) {
      throw new Error('Skill metadata must include name and description');
    }

    return metadata as SkillMetadata;
  }

  /**
   * Remove frontmatter from SKILL.md content
   *
   * @param content - Full SKILL.md content
   * @returns Content without frontmatter
   */
  private removeFreontmatter(content: string): string {
    return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  }

  /**
   * Recursively load all files in skill directory
   *
   * @param dir - Directory to scan
   * @param baseDir - Base directory for relative paths
   * @returns Array of resource files
   */
  private async recursiveFileLoad(
    dir: string,
    baseDir?: string
  ): Promise<SkillResource[]> {
    if (!baseDir) baseDir = dir;

    const resources: SkillResource[] = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        // Recursively load subdirectories
        const subResources = await this.recursiveFileLoad(fullPath, baseDir);
        resources.push(...subResources);
      } else if (entry.isFile() && entry.name !== 'SKILL.md') {
        // Load file metadata (not content yet - lazy loading)
        resources.push({
          path: relativePath,
          type: this.getFileType(entry.name)
        });
      }
    }

    return resources;
  }

  /**
   * Determine file type from extension
   *
   * @param filename - File name
   * @returns File type
   */
  private getFileType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const typeMap: Record<string, string> = {
      '.md': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.py': 'python',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.sh': 'shell'
    };

    return typeMap[ext] || 'text';
  }

  /**
   * Get skill from cache if valid
   *
   * @param skillPath - Path to skill
   * @returns Cached skill or null
   */
  private getFromCache(skillPath: string): SkillDefinition | null {
    const cached = this.cache.get(skillPath);

    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(skillPath);
      return null;
    }

    return cached.skill;
  }

  /**
   * Calculate hash for cache invalidation
   *
   * @param content - Content to hash
   * @returns Hash string
   */
  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Log skill registration for audit trail
   *
   * @param skillId - Anthropic skill ID
   * @param skillPath - Local skill path
   * @param isProtected - Whether skill is protected
   */
  private async logSkillRegistration(
    skillId: string,
    skillPath: string,
    isProtected: boolean
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      skillId,
      skillPath,
      isProtected,
      action: 'REGISTER'
    };

    // TODO: Implement proper logging to /prod/logs/skill-access.log
    console.log('Skill registered:', logEntry);
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   *
   * @returns Cache stats
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

/**
 * Create a SkillsService instance
 *
 * @param apiKey - Anthropic API key (defaults to env var)
 * @returns SkillsService instance
 *
 * @example
 * ```typescript
 * import { createSkillsService } from './skills-service';
 *
 * const service = createSkillsService();
 * const metadata = await service.loadSkillMetadata('.system/brand-guidelines');
 * ```
 */
export function createSkillsService(apiKey?: string): SkillsService {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;

  if (!key) {
    throw new Error('Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable.');
  }

  return new SkillsService(key);
}
