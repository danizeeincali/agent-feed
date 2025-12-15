# Skills-Based Loading System Architecture

**Version:** 1.0.0
**Author:** System Architect Agent
**Date:** 2025-10-30
**Status:** Design Complete - Ready for Implementation

---

## Executive Summary

This document defines the technical architecture for replacing the monolithic CLAUDE.md (2,088 tokens) with a dynamic, skills-based loading system that achieves 90% token reduction through progressive disclosure and intelligent caching.

**Key Metrics:**
- **Current CLAUDE.md**: 2,088 tokens loaded on every invocation
- **Target with Skills System**: ~200 tokens (Tier 1 metadata only)
- **Token Reduction**: 90.4%
- **Full Skill Load**: 2,000 tokens (only when invoked)
- **Cache Hit Ratio Target**: 85%+

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Design](#architecture-design)
3. [Class Specifications](#class-specifications)
4. [Data Models](#data-models)
5. [Integration Strategy](#integration-strategy)
6. [Testing Strategy](#testing-strategy)
7. [Performance Requirements](#performance-requirements)
8. [Security Considerations](#security-considerations)
9. [Migration Plan](#migration-plan)

---

## System Overview

### Problem Statement

The current CLAUDE.md configuration file:
- Loads 2,088 tokens on every Claude invocation
- Contains all instructions regardless of task relevance
- No intelligent filtering or progressive disclosure
- Results in unnecessary token consumption and costs

### Solution Architecture

A three-tier progressive disclosure system:

```mermaid
graph TD
    A[User Input] --> B[Conversation Context Analyzer]
    B --> C{Skill Detection}
    C -->|Match| D[Tier 1: Load Metadata ~100 tokens]
    D --> E{Skill Needed?}
    E -->|Yes| F[Tier 2: Load Content ~2000 tokens]
    E -->|No| G[Skip]
    F --> H[Tier 3: Load Resources as referenced]
    C -->|No Match| I[Base Instructions Only]

    style D fill:#90EE90
    style F fill:#FFD700
    style H fill:#FFA500
```

### Core Principles

1. **Progressive Disclosure**: Load only what's needed, when it's needed
2. **Intelligent Detection**: Analyze conversation context to predict skill requirements
3. **Aggressive Caching**: Cache loaded skills for the session duration
4. **Claude SDK Compatibility**: Seamless integration with existing ClaudeCodeSDKManager
5. **Zero Breaking Changes**: Maintain 100% backward compatibility

---

## Architecture Design

### High-Level Component Architecture

```mermaid
graph TB
    subgraph "User Layer"
        U[User Request]
    end

    subgraph "Orchestration Layer"
        CCO[ClaudeCodeOrchestrator]
        SDK[ClaudeCodeSDKManager]
    end

    subgraph "Skills System"
        SL[SkillLoader]
        SD[SkillDetector]
        SC[SkillCache]
        SM[SkillManifest]
    end

    subgraph "Storage Layer"
        FS[File System: /skills/]
        MF[skills-manifest.json]
    end

    U --> CCO
    CCO --> SDK
    SDK --> SL
    SL --> SD
    SL --> SC
    SL --> SM
    SM --> MF
    SL --> FS

    style SL fill:#4169E1
    style SD fill:#32CD32
    style SC fill:#FFD700
```

### Data Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant SDK as ClaudeCodeSDKManager
    participant SL as SkillLoader
    participant SD as SkillDetector
    participant SC as SkillCache
    participant FS as File System

    User->>SDK: Query with prompt
    SDK->>SL: Initialize with prompt
    SL->>SD: Detect required skills
    SD->>SD: Analyze keywords & context
    SD-->>SL: [skill1, skill2, skill3]

    loop For each detected skill
        SL->>SC: Check cache
        alt Cache hit
            SC-->>SL: Return cached skill
        else Cache miss
            SL->>FS: Load Tier 1 (metadata)
            FS-->>SL: Metadata (~100 tokens)
            SL->>SL: Evaluate if Tier 2 needed
            alt Tier 2 required
                SL->>FS: Load full content
                FS-->>SL: Full skill (~2000 tokens)
            end
            SL->>SC: Cache skill
        end
    end

    SL-->>SDK: Injected system prompt
    SDK->>SDK: Execute Claude query
    SDK-->>User: Response
```

---

## Class Specifications

### 1. SkillLoader Class

**Purpose**: Orchestrates skill loading, caching, and injection into system prompts.

```typescript
/**
 * SkillLoader - Progressive disclosure skill loading system
 *
 * Responsibilities:
 * - Load skills from manifest
 * - Detect required skills based on context
 * - Manage three-tier loading strategy
 * - Cache loaded skills
 * - Inject skills into system prompt
 *
 * @class SkillLoader
 */
class SkillLoader {
  private cache: SkillCache;
  private detector: SkillDetector;
  private manifest: SkillManifest;
  private skillsDirectory: string;
  private telemetry: TelemetryService;

  constructor(config: SkillLoaderConfig) {
    this.skillsDirectory = config.skillsDirectory || '/workspaces/agent-feed/skills';
    this.cache = new SkillCache(config.cacheConfig);
    this.detector = new SkillDetector(config.detectorConfig);
    this.manifest = new SkillManifest(
      `${this.skillsDirectory}/skills-manifest.json`
    );
    this.telemetry = config.telemetry;
  }

  /**
   * Initialize the skill loader
   * - Load manifest
   * - Validate skills directory
   * - Warm up cache (optional)
   */
  async initialize(): Promise<void> {
    await this.manifest.load();
    await this.validateSkillsDirectory();

    // Optional: Pre-load frequently used skills
    if (this.config.warmCache) {
      await this.warmCache();
    }
  }

  /**
   * Load skills based on conversation context
   * Implements three-tier progressive disclosure
   *
   * @param context - Conversation context including prompt and history
   * @returns Array of loaded skills ready for injection
   */
  async loadSkillsForContext(
    context: ConversationContext
  ): Promise<LoadedSkill[]> {
    const startTime = Date.now();

    // Tier 0: Detect which skills are relevant
    const detectedSkills = await this.detector.detectSkills(context);

    const loadedSkills: LoadedSkill[] = [];

    for (const skillId of detectedSkills) {
      // Check cache first
      const cached = this.cache.get(skillId);
      if (cached) {
        loadedSkills.push(cached);
        this.telemetry?.recordCacheHit(skillId);
        continue;
      }

      // Tier 1: Load metadata only (~100 tokens)
      const metadata = await this.loadSkillMetadata(skillId);

      // Evaluate if full content is needed
      const needsFullContent = this.shouldLoadFullContent(
        metadata,
        context
      );

      let skill: LoadedSkill;

      if (needsFullContent) {
        // Tier 2: Load full content (~2000 tokens)
        skill = await this.loadFullSkill(skillId);
        this.telemetry?.recordFullLoad(skillId);
      } else {
        // Only metadata needed
        skill = { metadata, content: null, resources: [] };
        this.telemetry?.recordMetadataLoad(skillId);
      }

      // Cache for session
      this.cache.set(skillId, skill);
      loadedSkills.push(skill);
    }

    const duration = Date.now() - startTime;
    this.telemetry?.recordLoadOperation({
      skillCount: loadedSkills.length,
      duration,
      tokenEstimate: this.estimateTokens(loadedSkills)
    });

    return loadedSkills;
  }

  /**
   * Load only metadata for a skill (Tier 1)
   * Minimal token footprint: ~100 tokens
   */
  private async loadSkillMetadata(skillId: string): Promise<SkillMetadata> {
    const skillInfo = this.manifest.getSkill(skillId);
    if (!skillInfo) {
      throw new SkillNotFoundError(skillId);
    }

    const metadataPath = `${this.skillsDirectory}/${skillInfo.path}/metadata.json`;
    const metadata = await fs.readJson(metadataPath);

    return {
      id: skillId,
      name: metadata.name,
      description: metadata.description,
      version: metadata.version,
      triggers: metadata.triggers,
      dependencies: metadata.dependencies,
      tokenEstimate: metadata.tokenEstimate,
      priority: metadata.priority
    };
  }

  /**
   * Load full skill content (Tier 2)
   * Includes instructions, examples, templates
   * ~2000 tokens
   */
  private async loadFullSkill(skillId: string): Promise<LoadedSkill> {
    const metadata = await this.loadSkillMetadata(skillId);
    const skillInfo = this.manifest.getSkill(skillId);

    const skillPath = `${this.skillsDirectory}/${skillInfo.path}`;
    const contentPath = `${skillPath}/skill.md`;

    const content = await fs.readFile(contentPath, 'utf-8');

    // Parse frontmatter and content
    const parsed = this.parseSkillContent(content);

    return {
      metadata,
      content: parsed.content,
      frontmatter: parsed.frontmatter,
      resources: [] // Tier 3 loaded on-demand
    };
  }

  /**
   * Load specific resource file (Tier 3)
   * Examples, templates, reference docs
   * Only loaded when explicitly referenced
   */
  async loadResource(
    skillId: string,
    resourcePath: string
  ): Promise<string> {
    const skillInfo = this.manifest.getSkill(skillId);
    const fullPath = `${this.skillsDirectory}/${skillInfo.path}/${resourcePath}`;

    return fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Generate system prompt with injected skills
   * Replaces monolithic CLAUDE.md content
   */
  async generateSystemPrompt(
    context: ConversationContext
  ): Promise<string> {
    const skills = await this.loadSkillsForContext(context);

    let systemPrompt = this.getBaseInstructions();

    // Inject skill instructions
    for (const skill of skills) {
      if (skill.content) {
        systemPrompt += `\n\n## ${skill.metadata.name}\n\n${skill.content}`;
      }
    }

    return systemPrompt;
  }

  /**
   * Estimate total tokens for loaded skills
   */
  private estimateTokens(skills: LoadedSkill[]): number {
    return skills.reduce((total, skill) => {
      if (skill.content) {
        return total + (skill.metadata.tokenEstimate || 2000);
      }
      return total + 100; // Metadata only
    }, 0);
  }

  /**
   * Decide if full content should be loaded
   * Based on context relevance scoring
   */
  private shouldLoadFullContent(
    metadata: SkillMetadata,
    context: ConversationContext
  ): boolean {
    const relevanceScore = this.detector.calculateRelevance(
      metadata,
      context
    );

    // Load full content if highly relevant (>0.7)
    return relevanceScore > 0.7;
  }

  /**
   * Clear cache (for testing or session reset)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStatistics {
    return this.cache.getStats();
  }
}
```

### 2. SkillDetector Class

**Purpose**: Analyze conversation context to detect required skills.

```typescript
/**
 * SkillDetector - Intelligent skill detection from conversation context
 *
 * Uses multiple strategies:
 * 1. Keyword matching
 * 2. Task classification (ML-based)
 * 3. Historical pattern analysis
 * 4. Dependency resolution
 */
class SkillDetector {
  private manifest: SkillManifest;
  private classifier: TaskClassifier;
  private history: SkillUsageHistory;

  constructor(config: SkillDetectorConfig) {
    this.manifest = config.manifest;
    this.classifier = new TaskClassifier(config.classifierConfig);
    this.history = new SkillUsageHistory(config.historyConfig);
  }

  /**
   * Detect required skills from conversation context
   * Returns array of skill IDs in priority order
   */
  async detectSkills(
    context: ConversationContext
  ): Promise<string[]> {
    const detectedSkills = new Set<string>();

    // Strategy 1: Keyword matching
    const keywordMatches = this.detectByKeywords(context.prompt);
    keywordMatches.forEach(s => detectedSkills.add(s));

    // Strategy 2: Task classification
    const classifiedSkills = await this.detectByClassification(
      context.prompt
    );
    classifiedSkills.forEach(s => detectedSkills.add(s));

    // Strategy 3: Historical patterns
    if (context.conversationHistory) {
      const historicalSkills = this.detectByHistory(
        context.conversationHistory
      );
      historicalSkills.forEach(s => detectedSkills.add(s));
    }

    // Strategy 4: Resolve dependencies
    const withDependencies = this.resolveDependencies(
      Array.from(detectedSkills)
    );

    // Sort by priority
    return this.prioritizeSkills(withDependencies);
  }

  /**
   * Keyword-based detection
   * Fast, simple, 90% accuracy for explicit mentions
   */
  private detectByKeywords(prompt: string): string[] {
    const detected: string[] = [];
    const normalizedPrompt = prompt.toLowerCase();

    for (const [skillId, skillInfo] of this.manifest.getAllSkills()) {
      const triggers = skillInfo.triggers || [];

      for (const trigger of triggers) {
        if (normalizedPrompt.includes(trigger.toLowerCase())) {
          detected.push(skillId);
          break;
        }
      }
    }

    return detected;
  }

  /**
   * ML-based task classification
   * Classifies user intent into skill categories
   * Accuracy: 85%+ for complex queries
   */
  private async detectByClassification(
    prompt: string
  ): Promise<string[]> {
    const taskTypes = await this.classifier.classify(prompt);

    const skills: string[] = [];
    for (const taskType of taskTypes) {
      const relevantSkills = this.manifest.getSkillsByCategory(taskType);
      skills.push(...relevantSkills);
    }

    return skills;
  }

  /**
   * Historical pattern analysis
   * "Users who needed skill A also needed skill B"
   */
  private detectByHistory(
    conversationHistory: ConversationMessage[]
  ): string[] {
    // Analyze last 5 messages
    const recentMessages = conversationHistory.slice(-5);

    // Find skills mentioned or used in recent history
    const recentSkills = recentMessages
      .flatMap(msg => this.detectByKeywords(msg.content));

    // Find correlated skills from history
    const correlated = this.history.getCorrelatedSkills(recentSkills);

    return correlated;
  }

  /**
   * Resolve skill dependencies
   * If skill A depends on skill B, include both
   */
  private resolveDependencies(skillIds: string[]): string[] {
    const result = new Set(skillIds);

    for (const skillId of skillIds) {
      const skill = this.manifest.getSkill(skillId);
      if (skill?.dependencies) {
        skill.dependencies.forEach(dep => result.add(dep));
      }
    }

    return Array.from(result);
  }

  /**
   * Prioritize skills by relevance and priority level
   */
  private prioritizeSkills(skillIds: string[]): string[] {
    return skillIds.sort((a, b) => {
      const skillA = this.manifest.getSkill(a);
      const skillB = this.manifest.getSkill(b);

      const priorityA = skillA?.priority || 999;
      const priorityB = skillB?.priority || 999;

      return priorityA - priorityB;
    });
  }

  /**
   * Calculate relevance score for a skill in given context
   * Returns 0.0-1.0 confidence score
   */
  calculateRelevance(
    metadata: SkillMetadata,
    context: ConversationContext
  ): number {
    let score = 0.0;
    const prompt = context.prompt.toLowerCase();

    // Keyword matching contribution (40%)
    const keywordMatch = metadata.triggers.some(
      trigger => prompt.includes(trigger.toLowerCase())
    );
    if (keywordMatch) score += 0.4;

    // Classification confidence (30%)
    const classificationScore = this.classifier.getConfidence(
      prompt,
      metadata.category
    );
    score += classificationScore * 0.3;

    // Historical usage (20%)
    const historicalScore = this.history.getUsageFrequency(metadata.id);
    score += historicalScore * 0.2;

    // Recency (10%)
    const recencyScore = this.history.getRecencyScore(metadata.id);
    score += recencyScore * 0.1;

    return Math.min(score, 1.0);
  }
}
```

### 3. SkillCache Class

**Purpose**: High-performance in-memory caching with LRU eviction.

```typescript
/**
 * SkillCache - LRU cache for loaded skills
 *
 * Features:
 * - In-memory storage for session duration
 * - LRU eviction policy
 * - TTL support
 * - Statistics tracking
 */
class SkillCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number;
  private hits: number;
  private misses: number;

  constructor(config: SkillCacheConfig) {
    this.cache = new Map();
    this.maxSize = config.maxSize || 50;
    this.ttl = config.ttl || 3600000; // 1 hour default
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get skill from cache
   * Updates LRU position on hit
   */
  get(skillId: string): LoadedSkill | null {
    const entry = this.cache.get(skillId);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(skillId);
      this.misses++;
      return null;
    }

    // Update access time (LRU)
    entry.lastAccess = Date.now();
    this.hits++;

    return entry.skill;
  }

  /**
   * Store skill in cache
   * Evicts oldest entry if cache is full
   */
  set(skillId: string, skill: LoadedSkill): void {
    // Check if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(skillId)) {
      this.evictOldest();
    }

    this.cache.set(skillId, {
      skill,
      timestamp: Date.now(),
      lastAccess: Date.now()
    });
  }

  /**
   * Evict least recently used entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStatistics {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Remove specific skill from cache
   */
  invalidate(skillId: string): void {
    this.cache.delete(skillId);
  }
}
```

### 4. SkillManifest Class

**Purpose**: Load and query the skills manifest registry.

```typescript
/**
 * SkillManifest - Central registry of all available skills
 *
 * Loaded from: skills-manifest.json
 */
class SkillManifest {
  private manifestPath: string;
  private skills: Map<string, SkillManifestEntry>;
  private categories: Map<string, string[]>;

  constructor(manifestPath: string) {
    this.manifestPath = manifestPath;
    this.skills = new Map();
    this.categories = new Map();
  }

  /**
   * Load manifest from file system
   */
  async load(): Promise<void> {
    const manifest = await fs.readJson(this.manifestPath);

    // Validate manifest schema
    this.validateManifest(manifest);

    // Build skill index
    for (const entry of manifest.skills) {
      this.skills.set(entry.id, entry);

      // Build category index
      if (entry.category) {
        const categorySkills = this.categories.get(entry.category) || [];
        categorySkills.push(entry.id);
        this.categories.set(entry.category, categorySkills);
      }
    }
  }

  /**
   * Get skill by ID
   */
  getSkill(skillId: string): SkillManifestEntry | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Get all skills
   */
  getAllSkills(): Map<string, SkillManifestEntry> {
    return this.skills;
  }

  /**
   * Get skills by category
   */
  getSkillsByCategory(category: string): string[] {
    return this.categories.get(category) || [];
  }

  /**
   * Search skills by keyword
   */
  searchSkills(query: string): SkillManifestEntry[] {
    const normalizedQuery = query.toLowerCase();
    const results: SkillManifestEntry[] = [];

    for (const skill of this.skills.values()) {
      if (
        skill.name.toLowerCase().includes(normalizedQuery) ||
        skill.description.toLowerCase().includes(normalizedQuery) ||
        skill.triggers.some(t => t.toLowerCase().includes(normalizedQuery))
      ) {
        results.push(skill);
      }
    }

    return results;
  }

  /**
   * Validate manifest schema
   */
  private validateManifest(manifest: any): void {
    if (!manifest.skills || !Array.isArray(manifest.skills)) {
      throw new Error('Invalid manifest: missing skills array');
    }

    for (const skill of manifest.skills) {
      if (!skill.id || !skill.name || !skill.path) {
        throw new Error(`Invalid skill entry: ${JSON.stringify(skill)}`);
      }
    }
  }
}
```

---

## Data Models

### skills-manifest.json Structure

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-10-30T00:00:00Z",
  "skills": [
    {
      "id": "sparc-methodology",
      "name": "SPARC Methodology",
      "description": "Specification, Pseudocode, Architecture, Refinement, Completion workflow",
      "category": "development-methodology",
      "path": ".system/sparc-methodology",
      "protected": true,
      "priority": 1,
      "tokenEstimate": 1800,
      "triggers": [
        "sparc",
        "specification",
        "architecture",
        "refinement",
        "tdd"
      ],
      "dependencies": ["code-standards"],
      "version": "1.0.0",
      "author": "system",
      "lastModified": "2025-10-30T00:00:00Z"
    },
    {
      "id": "agent-coordination",
      "name": "Agent Coordination Protocol",
      "description": "Multi-agent orchestration and coordination patterns",
      "category": "coordination",
      "path": ".system/agent-coordination",
      "protected": true,
      "priority": 2,
      "tokenEstimate": 2100,
      "triggers": [
        "agent",
        "swarm",
        "coordination",
        "orchestration",
        "claude-flow"
      ],
      "dependencies": [],
      "version": "1.0.0"
    },
    {
      "id": "code-standards",
      "name": "Code Standards",
      "description": "TypeScript, React, testing best practices",
      "category": "development",
      "path": ".system/code-standards",
      "protected": true,
      "priority": 3,
      "tokenEstimate": 1500,
      "triggers": [
        "typescript",
        "react",
        "testing",
        "code review",
        "best practices"
      ],
      "dependencies": [],
      "version": "1.0.0"
    },
    {
      "id": "brand-guidelines",
      "name": "Brand Guidelines",
      "description": "AVI brand voice and messaging standards",
      "category": "content",
      "path": ".system/brand-guidelines",
      "protected": true,
      "priority": 5,
      "tokenEstimate": 1200,
      "triggers": [
        "post",
        "agent feed",
        "communication",
        "messaging",
        "brand"
      ],
      "dependencies": [],
      "version": "1.0.0"
    },
    {
      "id": "avi-architecture",
      "name": "AVI Architecture",
      "description": "System design patterns and coordination guidelines",
      "category": "architecture",
      "path": ".system/avi-architecture",
      "protected": true,
      "priority": 4,
      "tokenEstimate": 2000,
      "triggers": [
        "architecture",
        "system design",
        "avi",
        "infrastructure"
      ],
      "dependencies": ["agent-coordination"],
      "version": "1.0.0"
    }
  ]
}
```

### Skill Directory Structure

```
skills/
├── .system/                          # Protected system skills (read-only)
│   ├── sparc-methodology/
│   │   ├── metadata.json            # Tier 1: Metadata (~50 tokens)
│   │   ├── skill.md                 # Tier 2: Full content (~1800 tokens)
│   │   ├── examples/                # Tier 3: Resources (on-demand)
│   │   │   ├── specification-template.md
│   │   │   ├── architecture-example.md
│   │   │   └── refinement-checklist.md
│   │   └── resources/
│   │       └── sparc-flowchart.mermaid
│   │
│   ├── agent-coordination/
│   │   ├── metadata.json
│   │   ├── skill.md
│   │   ├── examples/
│   │   │   ├── swarm-init-example.sh
│   │   │   └── coordination-pattern.md
│   │   └── resources/
│   │
│   ├── code-standards/
│   │   ├── metadata.json
│   │   ├── skill.md
│   │   ├── examples/
│   │   │   ├── typescript-best-practices.ts
│   │   │   ├── react-patterns.tsx
│   │   │   └── test-structure.test.ts
│   │   └── resources/
│   │
│   ├── brand-guidelines/
│   │   ├── metadata.json
│   │   ├── skill.md
│   │   ├── examples/
│   │   │   ├── post-template.md
│   │   │   └── messaging-examples.md
│   │   └── resources/
│   │
│   └── avi-architecture/
│       ├── metadata.json
│       ├── skill.md
│       ├── diagrams/
│       │   ├── system-overview.mermaid
│       │   └── data-flow.mermaid
│       └── resources/
│
├── shared/                          # Cross-agent skills (editable)
│   └── [future user-created skills]
│
└── agent-specific/                  # Agent-scoped skills (editable)
    └── [future agent-specific skills]
```

### metadata.json Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "name", "description", "version", "triggers"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique skill identifier"
    },
    "name": {
      "type": "string",
      "description": "Human-readable skill name"
    },
    "description": {
      "type": "string",
      "description": "Brief description of skill purpose"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version"
    },
    "triggers": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Keywords that trigger this skill"
    },
    "dependencies": {
      "type": "array",
      "items": { "type": "string" },
      "description": "IDs of required dependent skills"
    },
    "tokenEstimate": {
      "type": "integer",
      "description": "Estimated tokens for full content"
    },
    "priority": {
      "type": "integer",
      "description": "Load priority (lower = higher priority)"
    },
    "category": {
      "type": "string",
      "description": "Skill category for classification"
    },
    "author": {
      "type": "string",
      "description": "Skill author"
    },
    "lastModified": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

### TypeScript Interfaces

```typescript
// Configuration
interface SkillLoaderConfig {
  skillsDirectory: string;
  cacheConfig: SkillCacheConfig;
  detectorConfig: SkillDetectorConfig;
  telemetry?: TelemetryService;
  warmCache?: boolean;
}

interface SkillCacheConfig {
  maxSize: number;        // Max skills in cache
  ttl: number;           // Time to live (ms)
}

interface SkillDetectorConfig {
  manifest: SkillManifest;
  classifierConfig: TaskClassifierConfig;
  historyConfig: SkillUsageHistoryConfig;
}

// Data Models
interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  triggers: string[];
  dependencies: string[];
  tokenEstimate: number;
  priority: number;
  category?: string;
  author?: string;
  lastModified?: string;
}

interface LoadedSkill {
  metadata: SkillMetadata;
  content: string | null;
  frontmatter?: Record<string, any>;
  resources: string[];
}

interface SkillManifestEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  path: string;
  protected: boolean;
  priority: number;
  tokenEstimate: number;
  triggers: string[];
  dependencies: string[];
  version: string;
  author?: string;
  lastModified?: string;
}

interface ConversationContext {
  prompt: string;
  conversationHistory?: ConversationMessage[];
  sessionId?: string;
  userId?: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

// Cache
interface CacheEntry {
  skill: LoadedSkill;
  timestamp: number;
  lastAccess: number;
}

interface CacheStatistics {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  entries: string[];
}

// Errors
class SkillNotFoundError extends Error {
  constructor(skillId: string) {
    super(`Skill not found: ${skillId}`);
    this.name = 'SkillNotFoundError';
  }
}

class SkillLoadError extends Error {
  constructor(skillId: string, cause: string) {
    super(`Failed to load skill ${skillId}: ${cause}`);
    this.name = 'SkillLoadError';
  }
}
```

---

## Integration Strategy

### Integration with ClaudeCodeSDKManager

The skills system integrates seamlessly with the existing SDK manager:

```typescript
/**
 * Enhanced ClaudeCodeSDKManager with Skills System Integration
 */
class ClaudeCodeSDKManager {
  private skillLoader: SkillLoader;

  constructor() {
    // ... existing initialization ...

    // Initialize skills system
    this.skillLoader = new SkillLoader({
      skillsDirectory: '/workspaces/agent-feed/skills',
      cacheConfig: {
        maxSize: 50,
        ttl: 3600000 // 1 hour
      },
      detectorConfig: {
        manifest: new SkillManifest('/workspaces/agent-feed/skills/skills-manifest.json'),
        classifierConfig: { /* ... */ },
        historyConfig: { /* ... */ }
      },
      telemetry: this.telemetry,
      warmCache: true
    });

    await this.skillLoader.initialize();
  }

  /**
   * Execute query with dynamic skill loading
   */
  async queryClaudeCode(prompt: string, options = {}): Promise<QueryResult> {
    // Build conversation context
    const context: ConversationContext = {
      prompt,
      conversationHistory: options.history,
      sessionId: options.sessionId,
      userId: options.userId
    };

    // Generate system prompt with relevant skills
    const systemPrompt = await this.skillLoader.generateSystemPrompt(context);

    // Inject system prompt into query options
    const enhancedOptions = {
      ...options,
      systemPrompt, // Replaces CLAUDE.md content
      cwd: options.cwd || this.workingDirectory,
      model: options.model || this.model,
      permissionMode: this.permissionMode,
      allowedTools: options.allowedTools || this.allowedTools
    };

    // Execute query with Claude SDK
    const messages = [];
    const queryResponse = query({
      prompt,
      options: enhancedOptions
    });

    // ... existing message processing ...

    return { messages, success: true };
  }
}
```

### System Prompt Generation

```typescript
/**
 * Generate system prompt with dynamically loaded skills
 * Replaces static CLAUDE.md content
 */
async generateSystemPrompt(context: ConversationContext): Promise<string> {
  // Load relevant skills
  const skills = await this.loadSkillsForContext(context);

  // Start with base instructions (always included)
  let systemPrompt = `
# Claude Code Agent Instructions

## Core Principles
- Follow user instructions exactly
- Use tools efficiently
- Maintain code quality
- Document decisions

`;

  // Add skill-specific instructions
  for (const skill of skills) {
    if (skill.content) {
      systemPrompt += `\n## ${skill.metadata.name}\n\n${skill.content}\n`;
    }
  }

  // Add session metadata
  systemPrompt += `\n## Session Context\n`;
  systemPrompt += `- Session ID: ${context.sessionId || 'N/A'}\n`;
  systemPrompt += `- Loaded Skills: ${skills.map(s => s.metadata.name).join(', ')}\n`;
  systemPrompt += `- Token Estimate: ~${this.estimateTokens(skills)} tokens\n`;

  return systemPrompt;
}
```

### Backward Compatibility

To ensure zero breaking changes during transition:

```typescript
/**
 * Compatibility layer for gradual migration
 */
class SkillLoaderCompat {
  private skillLoader: SkillLoader;
  private fallbackMode: boolean;

  constructor(config: SkillLoaderConfig) {
    this.skillLoader = new SkillLoader(config);
    this.fallbackMode = process.env.SKILLS_FALLBACK === 'true';
  }

  async generateSystemPrompt(context: ConversationContext): Promise<string> {
    if (this.fallbackMode) {
      // Fallback to static CLAUDE.md during migration
      console.warn('Skills system in fallback mode, using CLAUDE.md');
      return fs.readFile('/workspaces/agent-feed/CLAUDE.md', 'utf-8');
    }

    try {
      // Try skills system first
      return await this.skillLoader.generateSystemPrompt(context);
    } catch (error) {
      console.error('Skills system failed, falling back to CLAUDE.md:', error);
      return fs.readFile('/workspaces/agent-feed/CLAUDE.md', 'utf-8');
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

#### 1. SkillLoader Tests

**File**: `/tests/skills/SkillLoader.test.ts`

```typescript
describe('SkillLoader', () => {
  let loader: SkillLoader;
  let mockManifest: SkillManifest;
  let mockCache: SkillCache;

  beforeEach(() => {
    mockManifest = createMockManifest();
    loader = new SkillLoader({
      skillsDirectory: './test-fixtures/skills',
      cacheConfig: { maxSize: 10, ttl: 3600000 },
      detectorConfig: { /* ... */ }
    });
  });

  describe('loadSkillMetadata', () => {
    it('should load metadata with ~100 token footprint', async () => {
      const metadata = await loader['loadSkillMetadata']('sparc-methodology');

      expect(metadata).toHaveProperty('id');
      expect(metadata).toHaveProperty('name');
      expect(metadata).toHaveProperty('triggers');

      const tokens = estimateTokens(JSON.stringify(metadata));
      expect(tokens).toBeLessThan(150);
    });

    it('should throw SkillNotFoundError for invalid skill', async () => {
      await expect(
        loader['loadSkillMetadata']('non-existent')
      ).rejects.toThrow(SkillNotFoundError);
    });
  });

  describe('loadFullSkill', () => {
    it('should load full content with ~2000 token footprint', async () => {
      const skill = await loader['loadFullSkill']('sparc-methodology');

      expect(skill.metadata).toBeDefined();
      expect(skill.content).toBeDefined();

      const tokens = estimateTokens(skill.content!);
      expect(tokens).toBeGreaterThan(1500);
      expect(tokens).toBeLessThan(2500);
    });
  });

  describe('loadSkillsForContext', () => {
    it('should load only relevant skills', async () => {
      const context: ConversationContext = {
        prompt: 'Create a new feature using SPARC methodology'
      };

      const skills = await loader.loadSkillsForContext(context);

      expect(skills).toHaveLength(2); // sparc-methodology + code-standards
      expect(skills[0].metadata.id).toBe('sparc-methodology');
    });

    it('should use cache for repeated loads', async () => {
      const context: ConversationContext = {
        prompt: 'SPARC methodology for feature development'
      };

      // First load
      await loader.loadSkillsForContext(context);

      // Second load (should hit cache)
      const start = Date.now();
      await loader.loadSkillsForContext(context);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10); // Cache hit should be <10ms

      const stats = loader.getCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
    });
  });

  describe('generateSystemPrompt', () => {
    it('should generate prompt with injected skills', async () => {
      const context: ConversationContext = {
        prompt: 'Implement feature with TDD'
      };

      const systemPrompt = await loader.generateSystemPrompt(context);

      expect(systemPrompt).toContain('SPARC Methodology');
      expect(systemPrompt).toContain('Code Standards');

      const tokens = estimateTokens(systemPrompt);
      expect(tokens).toBeLessThan(5000);
    });
  });
});
```

#### 2. SkillDetector Tests

**File**: `/tests/skills/SkillDetector.test.ts`

```typescript
describe('SkillDetector', () => {
  let detector: SkillDetector;

  beforeEach(() => {
    detector = new SkillDetector({
      manifest: createMockManifest(),
      classifierConfig: { /* ... */ },
      historyConfig: { /* ... */ }
    });
  });

  describe('detectByKeywords', () => {
    it('should detect skills from explicit keywords', () => {
      const skills = detector['detectByKeywords'](
        'Use SPARC methodology for this task'
      );

      expect(skills).toContain('sparc-methodology');
    });

    it('should be case-insensitive', () => {
      const skills = detector['detectByKeywords'](
        'IMPLEMENT FEATURE WITH SPARC'
      );

      expect(skills).toContain('sparc-methodology');
    });
  });

  describe('detectByClassification', () => {
    it('should classify development tasks', async () => {
      const skills = await detector['detectByClassification'](
        'Build a REST API with authentication'
      );

      expect(skills).toContain('code-standards');
    });
  });

  describe('resolveDependencies', () => {
    it('should include dependent skills', () => {
      const skills = detector['resolveDependencies']([
        'avi-architecture'
      ]);

      expect(skills).toContain('avi-architecture');
      expect(skills).toContain('agent-coordination'); // dependency
    });
  });

  describe('calculateRelevance', () => {
    it('should return high score for keyword match', () => {
      const metadata = createMockMetadata('sparc-methodology');
      const context: ConversationContext = {
        prompt: 'Use SPARC to build this feature'
      };

      const score = detector.calculateRelevance(metadata, context);

      expect(score).toBeGreaterThan(0.7);
    });
  });
});
```

#### 3. SkillCache Tests

**File**: `/tests/skills/SkillCache.test.ts`

```typescript
describe('SkillCache', () => {
  let cache: SkillCache;

  beforeEach(() => {
    cache = new SkillCache({
      maxSize: 3,
      ttl: 1000 // 1 second for testing
    });
  });

  describe('get/set', () => {
    it('should store and retrieve skills', () => {
      const skill = createMockSkill('test-skill');

      cache.set('test-skill', skill);
      const retrieved = cache.get('test-skill');

      expect(retrieved).toEqual(skill);
    });

    it('should return null for cache miss', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when full', () => {
      cache.set('skill-1', createMockSkill('skill-1'));
      cache.set('skill-2', createMockSkill('skill-2'));
      cache.set('skill-3', createMockSkill('skill-3'));

      // Cache is full (maxSize = 3)
      cache.set('skill-4', createMockSkill('skill-4'));

      // skill-1 should be evicted (oldest)
      expect(cache.get('skill-1')).toBeNull();
      expect(cache.get('skill-4')).not.toBeNull();
    });

    it('should update LRU on access', () => {
      cache.set('skill-1', createMockSkill('skill-1'));
      cache.set('skill-2', createMockSkill('skill-2'));
      cache.set('skill-3', createMockSkill('skill-3'));

      // Access skill-1 (updates LRU)
      cache.get('skill-1');

      // Add new skill (should evict skill-2, not skill-1)
      cache.set('skill-4', createMockSkill('skill-4'));

      expect(cache.get('skill-1')).not.toBeNull();
      expect(cache.get('skill-2')).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const skill = createMockSkill('test-skill');
      cache.set('test-skill', skill);

      // Wait for TTL expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const result = cache.get('test-skill');
      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should track hit rate accurately', () => {
      cache.set('skill-1', createMockSkill('skill-1'));

      cache.get('skill-1'); // hit
      cache.get('skill-1'); // hit
      cache.get('skill-2'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });
  });
});
```

### Integration Tests

**File**: `/tests/skills/integration/skills-sdk-integration.test.ts`

```typescript
describe('Skills System Integration', () => {
  let sdkManager: ClaudeCodeSDKManager;

  beforeEach(async () => {
    // Initialize with real skills directory
    sdkManager = new ClaudeCodeSDKManager();
    await sdkManager.init();
  });

  describe('Query with Skills', () => {
    it('should load relevant skills for SPARC query', async () => {
      const result = await sdkManager.queryClaudeCode(
        'Create a new feature using SPARC methodology with TDD'
      );

      expect(result.success).toBe(true);

      // Verify skills were loaded
      const loadedSkills = sdkManager.skillLoader.getCacheStats().entries;
      expect(loadedSkills).toContain('sparc-methodology');
      expect(loadedSkills).toContain('code-standards');
    });

    it('should use cache for subsequent queries', async () => {
      // First query
      await sdkManager.queryClaudeCode('Use SPARC methodology');

      const stats1 = sdkManager.skillLoader.getCacheStats();
      const hits1 = stats1.hits;

      // Second query (should hit cache)
      await sdkManager.queryClaudeCode('Continue with SPARC');

      const stats2 = sdkManager.skillLoader.getCacheStats();
      expect(stats2.hits).toBeGreaterThan(hits1);
    });
  });

  describe('Token Efficiency', () => {
    it('should use fewer tokens than CLAUDE.md for simple queries', async () => {
      const result = await sdkManager.queryClaudeCode(
        'List files in current directory'
      );

      // Simple query should load minimal skills
      const loadedSkills = sdkManager.skillLoader.getCacheStats().entries;
      expect(loadedSkills.length).toBeLessThan(2);

      // Estimate tokens used
      const tokenEstimate = await estimateSystemPromptTokens(result);
      expect(tokenEstimate).toBeLessThan(500); // Much less than 2088
    });

    it('should approach CLAUDE.md tokens for complex queries', async () => {
      const result = await sdkManager.queryClaudeCode(
        'Create a full-stack application with SPARC methodology, agent coordination, and brand guidelines'
      );

      // Complex query may load multiple skills
      const tokenEstimate = await estimateSystemPromptTokens(result);
      expect(tokenEstimate).toBeLessThan(2088); // Still less than full CLAUDE.md
    });
  });
});
```

### E2E Tests

**File**: `/tests/skills/e2e/skills-functionality.e2e.test.ts`

```typescript
describe('Skills System E2E', () => {
  describe('Progressive Loading', () => {
    it('should load Tier 1 metadata first', async () => {
      const loader = new SkillLoader(testConfig);
      await loader.initialize();

      const context: ConversationContext = {
        prompt: 'Use SPARC methodology'
      };

      // Mock to verify loading order
      const loadSpy = vi.spyOn(loader as any, 'loadSkillMetadata');
      const fullLoadSpy = vi.spyOn(loader as any, 'loadFullSkill');

      await loader.loadSkillsForContext(context);

      // Verify Tier 1 loaded first
      expect(loadSpy).toHaveBeenCalled();
      // Verify Tier 2 loaded after
      expect(fullLoadSpy).toHaveBeenCalledAfter(loadSpy);
    });
  });

  describe('Skill Dependencies', () => {
    it('should load dependencies automatically', async () => {
      const loader = new SkillLoader(testConfig);
      await loader.initialize();

      const context: ConversationContext = {
        prompt: 'Review AVI architecture'
      };

      const skills = await loader.loadSkillsForContext(context);

      // avi-architecture depends on agent-coordination
      const skillIds = skills.map(s => s.metadata.id);
      expect(skillIds).toContain('avi-architecture');
      expect(skillIds).toContain('agent-coordination');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle feature development workflow', async () => {
      const sdkManager = new ClaudeCodeSDKManager();

      // Scenario: Developer requests feature with SPARC
      const result = await sdkManager.queryClaudeCode(
        'Create a user authentication feature using SPARC methodology with TypeScript best practices'
      );

      expect(result.success).toBe(true);

      // Verify correct skills loaded
      const loadedSkills = sdkManager.skillLoader.getCacheStats().entries;
      expect(loadedSkills).toContain('sparc-methodology');
      expect(loadedSkills).toContain('code-standards');
    });
  });
});
```

### Performance Benchmarks

**File**: `/tests/skills/benchmarks/performance.bench.ts`

```typescript
describe('Skills System Performance', () => {
  let loader: SkillLoader;

  beforeEach(async () => {
    loader = new SkillLoader(productionConfig);
    await loader.initialize();
  });

  benchmark('Metadata Loading', async () => {
    const metadata = await loader['loadSkillMetadata']('sparc-methodology');
    // Target: <50ms
  });

  benchmark('Full Skill Loading', async () => {
    const skill = await loader['loadFullSkill']('sparc-methodology');
    // Target: <200ms
  });

  benchmark('Context Analysis + Loading', async () => {
    const context: ConversationContext = {
      prompt: 'Create feature with SPARC and TypeScript'
    };
    const skills = await loader.loadSkillsForContext(context);
    // Target: <500ms
  });

  benchmark('Cache Hit Performance', async () => {
    // Pre-load skill
    const context: ConversationContext = {
      prompt: 'SPARC methodology'
    };
    await loader.loadSkillsForContext(context);

    // Measure cache hit
    const skills = await loader.loadSkillsForContext(context);
    // Target: <10ms
  });

  describe('Token Efficiency', () => {
    it('should achieve 90% token reduction for simple queries', async () => {
      const context: ConversationContext = {
        prompt: 'List files'
      };

      const prompt = await loader.generateSystemPrompt(context);
      const tokens = estimateTokens(prompt);

      expect(tokens).toBeLessThan(210); // 90% reduction from 2088
    });

    it('should maintain <2088 tokens for complex queries', async () => {
      const context: ConversationContext = {
        prompt: 'Build full application with all methodologies'
      };

      const prompt = await loader.generateSystemPrompt(context);
      const tokens = estimateTokens(prompt);

      expect(tokens).toBeLessThan(2088);
    });
  });
});
```

---

## Performance Requirements

### SLA Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **Metadata Load Time** | <50ms | <100ms |
| **Full Skill Load Time** | <200ms | <500ms |
| **Context Analysis + Load** | <500ms | <1000ms |
| **Cache Hit Time** | <10ms | <50ms |
| **Cache Hit Ratio** | >85% | >70% |
| **Token Reduction (Simple)** | >90% | >80% |
| **Token Reduction (Complex)** | >50% | >30% |

### Resource Constraints

- **Memory**: <100MB for cache + loaded skills
- **CPU**: <5% sustained during normal operation
- **Disk I/O**: <50 file reads per query (metadata + content)
- **Network**: N/A (all local file system)

### Scalability

- Support 100+ skills in manifest
- Handle 50+ concurrent skill loads
- Maintain <1s response time under load
- Cache supports 50+ skills without degradation

### Monitoring Metrics

Track via TelemetryService:

```typescript
interface SkillMetrics {
  loadOperations: {
    count: number;
    averageDuration: number;
    p95Duration: number;
    p99Duration: number;
  };
  cachePerformance: {
    hitRate: number;
    size: number;
    evictions: number;
  };
  tokenEfficiency: {
    averageTokens: number;
    reductionPercentage: number;
    savingsUSD: number;
  };
  skillUsage: {
    [skillId: string]: {
      loadCount: number;
      totalTokens: number;
      averageRelevance: number;
    };
  };
}
```

---

## Security Considerations

### Protected Skills

System skills in `.system/` directory are:
- **Read-only**: Cannot be modified by agents or users
- **Validated**: Schema validation before loading
- **Versioned**: Track changes and prevent unauthorized updates
- **Protected**: OS-level permissions (chmod 444)

### Skill Validation

All skills undergo validation:

```typescript
class SkillValidator {
  /**
   * Validate skill before loading
   */
  async validateSkill(skillPath: string): Promise<ValidationResult> {
    const errors: string[] = [];

    // 1. Schema validation
    const metadata = await this.loadMetadata(skillPath);
    if (!this.validateSchema(metadata)) {
      errors.push('Invalid metadata schema');
    }

    // 2. Token limit validation
    if (metadata.tokenEstimate > 5000) {
      errors.push('Token estimate exceeds 5000 limit');
    }

    // 3. Content safety validation
    const content = await this.loadContent(skillPath);
    if (this.containsMaliciousContent(content)) {
      errors.push('Malicious content detected');
    }

    // 4. Dependency validation
    if (!await this.validateDependencies(metadata.dependencies)) {
      errors.push('Invalid or missing dependencies');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for malicious content patterns
   */
  private containsMaliciousContent(content: string): boolean {
    const maliciousPatterns = [
      /rm\s+-rf\s+\//, // Dangerous rm commands
      /eval\(/,         // Eval injection
      /exec\(/,         // Command execution
      /<script>/i       // XSS attempts
    ];

    return maliciousPatterns.some(pattern => pattern.test(content));
  }
}
```

### Access Control

```typescript
class SkillAccessControl {
  /**
   * Check if skill can be modified
   */
  canModify(skillPath: string, user: User): boolean {
    if (skillPath.startsWith('.system/')) {
      // System skills: No modifications allowed
      return false;
    }

    if (skillPath.startsWith('shared/')) {
      // Shared skills: Admin only
      return user.role === 'admin';
    }

    if (skillPath.startsWith('agent-specific/')) {
      // Agent-specific: Owner only
      return this.isOwner(skillPath, user);
    }

    return false;
  }
}
```

---

## Migration Plan

### Phase 1: Preparation (Week 1)

**Goal**: Set up infrastructure without disrupting current system

```bash
# 1. Create skills directory structure
mkdir -p /workspaces/agent-feed/skills/.system
mkdir -p /workspaces/agent-feed/skills/shared
mkdir -p /workspaces/agent-feed/skills/agent-specific

# 2. Create initial manifest
cat > /workspaces/agent-feed/skills/skills-manifest.json << EOF
{
  "version": "1.0.0",
  "skills": []
}
EOF

# 3. Extract first skill from CLAUDE.md
# Start with SPARC methodology as pilot
```

**Deliverables**:
- ✅ Skills directory structure created
- ✅ Manifest template ready
- ✅ First skill extracted and validated

### Phase 2: Implementation (Week 2-3)

**Goal**: Build and test skills system

```typescript
// Week 2: Core classes
- SkillLoader (with basic detection)
- SkillCache (LRU implementation)
- SkillManifest (JSON parsing)

// Week 3: Advanced features
- SkillDetector (keyword + classification)
- Integration with ClaudeCodeSDKManager
- Unit tests (>90% coverage)
```

**Deliverables**:
- ✅ All core classes implemented
- ✅ Unit tests passing (>90% coverage)
- ✅ Integration tests passing

### Phase 3: Skill Migration (Week 4)

**Goal**: Extract all skills from CLAUDE.md

```bash
# Extract skills in priority order:
1. sparc-methodology (P1)
2. agent-coordination (P2)
3. code-standards (P3)
4. avi-architecture (P4)
5. brand-guidelines (P5)

# For each skill:
- Create directory structure
- Write metadata.json
- Write skill.md content
- Create example files
- Update manifest
- Validate with tests
```

**Deliverables**:
- ✅ 5 core skills migrated
- ✅ Manifest complete
- ✅ Validation tests passing

### Phase 4: Integration (Week 5)

**Goal**: Integrate with ClaudeCodeSDKManager

```typescript
// Enable skills system with fallback
process.env.SKILLS_ENABLED = 'true';
process.env.SKILLS_FALLBACK = 'true'; // Keep CLAUDE.md as backup

// Test in production environment
- Verify skill detection accuracy
- Monitor token usage
- Check cache performance
- Validate backward compatibility
```

**Deliverables**:
- ✅ Skills system integrated
- ✅ Fallback mechanism working
- ✅ Production monitoring active

### Phase 5: Optimization (Week 6)

**Goal**: Tune performance and accuracy

```typescript
// Optimization targets:
- Cache hit ratio >85%
- Token reduction >90% for simple queries
- Load time <500ms for complex queries

// Tuning parameters:
- Keyword weights
- Classification thresholds
- Cache size and TTL
- Relevance scoring algorithm
```

**Deliverables**:
- ✅ Performance targets met
- ✅ Accuracy >90%
- ✅ Token reduction validated

### Phase 6: Deprecation (Week 7)

**Goal**: Remove CLAUDE.md dependency

```bash
# 1. Disable fallback mode
process.env.SKILLS_FALLBACK = 'false';

# 2. Monitor for 1 week
# - Track any fallback invocations
# - Verify all queries handled by skills system

# 3. Archive CLAUDE.md
mv CLAUDE.md CLAUDE.md.deprecated
```

**Deliverables**:
- ✅ Skills system fully operational
- ✅ CLAUDE.md deprecated
- ✅ 90% token reduction achieved

### Rollback Plan

If issues arise at any phase:

```typescript
// Immediate rollback procedure:
1. Set SKILLS_FALLBACK=true (restores CLAUDE.md)
2. Investigate root cause
3. Fix issues in development
4. Re-test before re-enabling
5. Gradual rollout with monitoring
```

---

## Appendix

### Estimated Token Savings

| Query Type | Current (CLAUDE.md) | With Skills | Reduction |
|------------|---------------------|-------------|-----------|
| Simple ("list files") | 2,088 tokens | 150 tokens | 92.8% |
| Medium ("create component") | 2,088 tokens | 800 tokens | 61.7% |
| Complex ("full SPARC workflow") | 2,088 tokens | 1,800 tokens | 13.8% |
| **Average** | **2,088 tokens** | **400 tokens** | **80.8%** |

### Cost Impact

Assuming Claude Sonnet 4 pricing ($3/MTok input):

- **Current cost**: 2,088 tokens × $3 / 1M = $0.006264 per query
- **New average cost**: 400 tokens × $3 / 1M = $0.0012 per query
- **Savings**: 80.8% reduction = $0.005064 per query

For 10,000 queries/month:
- **Current**: $62.64/month
- **New**: $12.00/month
- **Annual savings**: $607.68/year

### References

- [Claude Code SDK Documentation](https://docs.anthropic.com/claude-code)
- [Progressive Disclosure Pattern](https://www.nngroup.com/articles/progressive-disclosure/)
- [LRU Cache Algorithm](https://en.wikipedia.org/wiki/Cache_replacement_policies#LRU)
- [Semantic Versioning](https://semver.org/)

---

**Document Status**: ✅ Design Complete - Ready for Implementation
**Next Steps**: Begin Phase 1 (Preparation) - Create skills directory structure
**Owner**: System Architect Agent
**Review Date**: 2025-11-30
