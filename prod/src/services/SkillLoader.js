/**
 * SkillLoader - Dynamic skill loading system for Λvi (Avi)
 *
 * Provides intelligent skill detection, loading, and system prompt building
 * with token budget management and comprehensive logging.
 *
 * Features:
 * - Keyword-based skill detection
 * - Token budget tracking and enforcement
 * - Skill caching for performance
 * - Dependency resolution
 * - Cost estimation logging
 * - Comprehensive error handling
 *
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * SkillLoader class for managing dynamic skill loading
 */
export class SkillLoader {
  /**
   * Initialize SkillLoader
   * @param {Object} options - Configuration options
   * @param {string} options.manifestPath - Path to skills manifest file
   * @param {number} options.tokenBudget - Maximum token budget (default: 25000)
   * @param {boolean} options.enableCaching - Enable skill content caching (default: true)
   * @param {number} options.cacheTTL - Cache TTL in seconds (default: 3600)
   */
  constructor(options = {}) {
    this.manifestPath = options.manifestPath ||
      '/workspaces/agent-feed/prod/agent_workspace/skills/avi/skills-manifest.json';
    this.tokenBudget = options.tokenBudget || 25000;
    this.enableCaching = options.enableCaching !== false;
    this.cacheTTL = options.cacheTTL || 3600;

    // Internal state
    this.manifest = null;
    this.skillCache = new Map();
    this.cacheTimestamps = new Map();
    this.initialized = false;

    console.log('📚 SkillLoader initialized');
    console.log(`📁 Manifest: ${this.manifestPath}`);
    console.log(`💰 Token Budget: ${this.tokenBudget}`);
    console.log(`🗃️ Caching: ${this.enableCaching ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Initialize the skill loader by reading the manifest
   * @returns {Promise<void>}
   * @throws {Error} If manifest cannot be loaded
   */
  async initialize() {
    if (this.initialized) {
      console.log('✅ SkillLoader already initialized');
      return;
    }

    try {
      console.log('🔄 Loading skills manifest...');
      const manifestContent = await fs.readFile(this.manifestPath, 'utf-8');
      this.manifest = JSON.parse(manifestContent);

      console.log(`✅ Loaded ${this.manifest.skills.length} skill definitions`);
      console.log(`📊 Manifest version: ${this.manifest.version}`);

      // Validate manifest structure
      this._validateManifest();

      this.initialized = true;
      console.log('✅ SkillLoader initialization complete');
    } catch (error) {
      console.error('❌ Failed to initialize SkillLoader:', error.message);
      throw new Error(`SkillLoader initialization failed: ${error.message}`);
    }
  }

  /**
   * Validate manifest structure
   * @private
   * @throws {Error} If manifest is invalid
   */
  _validateManifest() {
    if (!this.manifest.skills || !Array.isArray(this.manifest.skills)) {
      throw new Error('Invalid manifest: missing or invalid skills array');
    }

    const requiredFields = ['id', 'name', 'filePath', 'triggerKeywords', 'tokenEstimate'];
    for (const skill of this.manifest.skills) {
      for (const field of requiredFields) {
        if (!skill[field]) {
          throw new Error(`Invalid manifest: skill ${skill.id || 'unknown'} missing required field: ${field}`);
        }
      }
    }

    console.log('✅ Manifest validation passed');
  }

  /**
   * Detect which skills are relevant for a given user message
   * @param {string} userMessage - The user's input message
   * @param {Object} options - Detection options
   * @param {boolean} options.includeAlwaysLoad - Include always-load skills (default: true)
   * @param {number} options.minKeywordMatches - Minimum keyword matches for detection (default: 1)
   * @returns {Promise<Array<Object>>} Array of detected skill definitions with match scores
   */
  async detectSkills(userMessage, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const includeAlwaysLoad = options.includeAlwaysLoad !== false;
    const minKeywordMatches = options.minKeywordMatches || 1;

    console.log('🔍 Detecting relevant skills...');
    console.log(`📝 Message: "${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}"`);

    const messageLower = userMessage.toLowerCase();
    const detectedSkills = [];

    // Always-load skills
    if (includeAlwaysLoad && this.manifest.loadingStrategy?.alwaysLoad) {
      for (const skillId of this.manifest.loadingStrategy.alwaysLoad) {
        const skill = this.manifest.skills.find(s => s.id === skillId);
        if (skill && skill.enabled) {
          detectedSkills.push({
            ...skill,
            matchScore: 100, // Always-load skills get max score
            matchReason: 'always-load'
          });
          console.log(`✅ Always-load skill: ${skill.name}`);
        }
      }
    }

    // Keyword-based detection
    for (const skill of this.manifest.skills) {
      if (!skill.enabled) {
        continue;
      }

      // Skip if already included as always-load
      if (detectedSkills.some(s => s.id === skill.id)) {
        continue;
      }

      // Count keyword matches
      const matches = skill.triggerKeywords.filter(keyword =>
        messageLower.includes(keyword.toLowerCase())
      );

      if (matches.length >= minKeywordMatches) {
        const matchScore = (matches.length / skill.triggerKeywords.length) * 100;
        detectedSkills.push({
          ...skill,
          matchScore: Math.round(matchScore),
          matchReason: 'keyword-match',
          matchedKeywords: matches
        });
        console.log(`✅ Detected skill: ${skill.name} (score: ${Math.round(matchScore)}%, keywords: ${matches.join(', ')})`);
      }
    }

    // Sort by priority (lower number = higher priority) then by match score
    detectedSkills.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.matchScore - a.matchScore;
    });

    console.log(`🎯 Detected ${detectedSkills.length} relevant skills`);
    return detectedSkills;
  }

  /**
   * Load skill content from file system
   * @param {Object} skill - Skill definition from manifest
   * @returns {Promise<string>} Skill content
   * @throws {Error} If skill file cannot be read
   */
  async loadSkillContent(skill) {
    // Check cache first
    if (this.enableCaching && this.skillCache.has(skill.id)) {
      const cacheTimestamp = this.cacheTimestamps.get(skill.id);
      const age = (Date.now() - cacheTimestamp) / 1000;

      if (age < this.cacheTTL) {
        console.log(`📦 Using cached skill: ${skill.name} (age: ${Math.round(age)}s)`);
        return this.skillCache.get(skill.id);
      } else {
        console.log(`♻️ Cache expired for skill: ${skill.name} (age: ${Math.round(age)}s)`);
        this.skillCache.delete(skill.id);
        this.cacheTimestamps.delete(skill.id);
      }
    }

    try {
      console.log(`📖 Loading skill from file: ${skill.filePath}`);
      const content = await fs.readFile(skill.filePath, 'utf-8');

      // Cache the content
      if (this.enableCaching) {
        this.skillCache.set(skill.id, content);
        this.cacheTimestamps.set(skill.id, Date.now());
        console.log(`💾 Cached skill: ${skill.name}`);
      }

      return content;
    } catch (error) {
      console.error(`❌ Failed to load skill ${skill.name}:`, error.message);
      throw new Error(`Failed to load skill ${skill.id}: ${error.message}`);
    }
  }

  /**
   * Resolve skill dependencies
   * @param {Array<Object>} skills - Array of skill definitions
   * @returns {Promise<Array<Object>>} Skills with dependencies resolved
   */
  async resolveDependencies(skills) {
    console.log('🔗 Resolving skill dependencies...');

    const resolvedSkills = new Map(skills.map(s => [s.id, s]));
    const addedDependencies = [];

    for (const skill of skills) {
      if (!skill.dependencies || skill.dependencies.length === 0) {
        continue;
      }

      for (const depId of skill.dependencies) {
        if (!resolvedSkills.has(depId)) {
          const depSkill = this.manifest.skills.find(s => s.id === depId);
          if (depSkill && depSkill.enabled) {
            resolvedSkills.set(depId, {
              ...depSkill,
              matchScore: 50,
              matchReason: 'dependency'
            });
            addedDependencies.push(depSkill.name);
            console.log(`✅ Added dependency: ${depSkill.name} (required by ${skill.name})`);
          } else {
            console.warn(`⚠️ Dependency not found or disabled: ${depId} (required by ${skill.name})`);
          }
        }
      }
    }

    if (addedDependencies.length > 0) {
      console.log(`🔗 Added ${addedDependencies.length} dependencies: ${addedDependencies.join(', ')}`);
    } else {
      console.log('✅ No additional dependencies needed');
    }

    return Array.from(resolvedSkills.values());
  }

  /**
   * Check if skills fit within token budget
   * @param {Array<Object>} skills - Array of skill definitions
   * @returns {Object} Budget analysis result
   */
  checkTokenBudget(skills) {
    const totalTokens = skills.reduce((sum, skill) => sum + skill.tokenEstimate, 0);
    const budgetUtilization = (totalTokens / this.tokenBudget) * 100;

    const warningThreshold = this.manifest.tokenBudget?.warningThreshold || (this.tokenBudget * 0.8);
    const criticalThreshold = this.manifest.tokenBudget?.criticalThreshold || (this.tokenBudget * 0.92);

    const result = {
      totalTokens,
      budgetLimit: this.tokenBudget,
      budgetUtilization: Math.round(budgetUtilization * 10) / 10,
      remainingTokens: this.tokenBudget - totalTokens,
      isWithinBudget: totalTokens <= this.tokenBudget,
      warningLevel: totalTokens >= criticalThreshold ? 'critical' :
                    totalTokens >= warningThreshold ? 'warning' : 'ok',
      skills: skills.map(s => ({
        id: s.id,
        name: s.name,
        tokens: s.tokenEstimate
      }))
    };

    console.log('💰 Token Budget Analysis:');
    console.log(`  Total Tokens: ${totalTokens} / ${this.tokenBudget} (${result.budgetUtilization}%)`);
    console.log(`  Remaining: ${result.remainingTokens} tokens`);
    console.log(`  Status: ${result.warningLevel.toUpperCase()}`);

    if (!result.isWithinBudget) {
      console.warn(`⚠️ TOKEN BUDGET EXCEEDED by ${totalTokens - this.tokenBudget} tokens!`);
    } else if (result.warningLevel === 'critical') {
      console.warn(`⚠️ Token usage is CRITICAL (${result.budgetUtilization}%)`);
    } else if (result.warningLevel === 'warning') {
      console.warn(`⚠️ Token usage is high (${result.budgetUtilization}%)`);
    } else {
      console.log(`✅ Token budget OK (${result.budgetUtilization}%)`);
    }

    return result;
  }

  /**
   * Optimize skill loading to fit within token budget
   * @param {Array<Object>} skills - Array of skill definitions
   * @returns {Array<Object>} Optimized skills array
   */
  optimizeForBudget(skills) {
    const budgetAnalysis = this.checkTokenBudget(skills);

    if (budgetAnalysis.isWithinBudget) {
      console.log('✅ No optimization needed - within budget');
      return skills;
    }

    console.log('🔧 Optimizing skill loading to fit budget...');

    // Sort by priority (lower number = higher priority) and match score
    const sortedSkills = [...skills].sort((a, b) => {
      // Always keep always-load skills
      if (a.matchReason === 'always-load' && b.matchReason !== 'always-load') return -1;
      if (b.matchReason === 'always-load' && a.matchReason !== 'always-load') return 1;

      // Then by priority
      if (a.priority !== b.priority) return a.priority - b.priority;

      // Then by match score
      return b.matchScore - a.matchScore;
    });

    const optimizedSkills = [];
    let currentTokens = 0;

    for (const skill of sortedSkills) {
      if (currentTokens + skill.tokenEstimate <= this.tokenBudget) {
        optimizedSkills.push(skill);
        currentTokens += skill.tokenEstimate;
        console.log(`✅ Included: ${skill.name} (${skill.tokenEstimate} tokens)`);
      } else {
        console.log(`❌ Excluded: ${skill.name} (would exceed budget by ${currentTokens + skill.tokenEstimate - this.tokenBudget} tokens)`);
      }
    }

    console.log(`🔧 Optimized: ${optimizedSkills.length}/${skills.length} skills (${currentTokens} tokens)`);
    return optimizedSkills;
  }

  /**
   * Build system prompt with loaded skills
   * @param {string} userMessage - The user's input message
   * @param {Object} options - Build options
   * @param {boolean} options.enforceTokenBudget - Enforce token budget (default: true)
   * @param {string} options.basePrompt - Base system prompt to prepend (optional)
   * @returns {Promise<Object>} System prompt and metadata
   */
  async buildSystemPrompt(userMessage, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const enforceTokenBudget = options.enforceTokenBudget !== false;
    const basePrompt = options.basePrompt || '';

    console.log('🏗️ Building system prompt...');

    try {
      // Step 1: Detect relevant skills
      let detectedSkills = await this.detectSkills(userMessage);

      if (detectedSkills.length === 0) {
        console.log('⚠️ No skills detected, using base prompt only');
        return {
          systemPrompt: basePrompt,
          skills: [],
          tokenEstimate: 0,
          budgetAnalysis: this.checkTokenBudget([])
        };
      }

      // Step 2: Resolve dependencies
      detectedSkills = await this.resolveDependencies(detectedSkills);

      // Step 3: Optimize for token budget
      if (enforceTokenBudget) {
        detectedSkills = this.optimizeForBudget(detectedSkills);
      }

      // Step 4: Load skill content
      console.log('📖 Loading skill content...');
      const skillContents = await Promise.all(
        detectedSkills.map(skill => this.loadSkillContent(skill))
      );

      // Step 5: Build final system prompt
      const promptParts = [];

      if (basePrompt) {
        promptParts.push(basePrompt);
        promptParts.push('\n---\n');
      }

      promptParts.push('# LOADED SKILLS\n\n');
      promptParts.push(`The following ${detectedSkills.length} skills have been loaded to assist with this request:\n\n`);

      for (let i = 0; i < detectedSkills.length; i++) {
        const skill = detectedSkills[i];
        const content = skillContents[i];

        promptParts.push(`## SKILL ${i + 1}: ${skill.name}\n\n`);
        promptParts.push(`**Category:** ${skill.category}\n`);
        promptParts.push(`**Match Reason:** ${skill.matchReason}\n`);
        if (skill.matchScore !== undefined) {
          promptParts.push(`**Match Score:** ${skill.matchScore}%\n`);
        }
        promptParts.push('\n');
        promptParts.push(content);
        promptParts.push('\n\n---\n\n');
      }

      const systemPrompt = promptParts.join('');
      const budgetAnalysis = this.checkTokenBudget(detectedSkills);

      console.log('✅ System prompt built successfully');
      console.log(`📝 Total prompt length: ${systemPrompt.length} characters`);

      return {
        systemPrompt,
        skills: detectedSkills.map(s => ({
          id: s.id,
          name: s.name,
          category: s.category,
          matchScore: s.matchScore,
          matchReason: s.matchReason,
          tokenEstimate: s.tokenEstimate
        })),
        tokenEstimate: budgetAnalysis.totalTokens,
        budgetAnalysis
      };

    } catch (error) {
      console.error('❌ Failed to build system prompt:', error.message);
      console.error('Stack:', error.stack);
      throw new Error(`Failed to build system prompt: ${error.message}`);
    }
  }

  /**
   * Get skill statistics
   * @returns {Object} Statistics about loaded skills
   */
  getStatistics() {
    if (!this.initialized) {
      return {
        initialized: false,
        error: 'SkillLoader not initialized'
      };
    }

    return {
      initialized: true,
      manifestVersion: this.manifest.version,
      totalSkills: this.manifest.skills.length,
      enabledSkills: this.manifest.skills.filter(s => s.enabled).length,
      cachedSkills: this.skillCache.size,
      tokenBudget: this.tokenBudget,
      categories: [...new Set(this.manifest.skills.map(s => s.category))],
      alwaysLoadSkills: this.manifest.loadingStrategy?.alwaysLoad || []
    };
  }

  /**
   * Clear skill cache
   */
  clearCache() {
    const cacheSize = this.skillCache.size;
    this.skillCache.clear();
    this.cacheTimestamps.clear();
    console.log(`🗑️ Cleared skill cache (${cacheSize} items)`);
  }

  /**
   * Reload manifest from disk
   * @returns {Promise<void>}
   */
  async reloadManifest() {
    console.log('🔄 Reloading manifest...');
    this.initialized = false;
    this.clearCache();
    await this.initialize();
    console.log('✅ Manifest reloaded');
  }
}

/**
 * Export singleton instance factory
 */
let skillLoaderInstance = null;

/**
 * Get or create SkillLoader singleton instance
 * @param {Object} options - Configuration options (only used on first call)
 * @returns {SkillLoader} SkillLoader instance
 */
export function getSkillLoader(options = {}) {
  if (!skillLoaderInstance) {
    skillLoaderInstance = new SkillLoader(options);
  }
  return skillLoaderInstance;
}

export default SkillLoader;
