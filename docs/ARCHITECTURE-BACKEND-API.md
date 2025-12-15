# Backend API Architecture: Agent Tier Filtering System

**Version**: 1.0.0
**Date**: 2025-10-19
**Status**: Production-Ready Design
**Methodology**: SPARC Architecture Phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [API Layer Architecture](#2-api-layer-architecture)
3. [Route Specifications](#3-route-specifications)
4. [Service Layer Design](#4-service-layer-design)
5. [Repository Pattern](#5-repository-pattern)
6. [Middleware Stack](#6-middleware-stack)
7. [Caching Strategy](#7-caching-strategy)
8. [Error Handling](#8-error-handling)
9. [File Structure](#9-file-structure)
10. [Performance Optimization](#10-performance-optimization)
11. [Security Architecture](#11-security-architecture)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Executive Summary

### 1.1 Architecture Overview

This document defines the production-ready backend API architecture for the Agent Tier Filtering System, implementing a two-tier agent classification with progressive disclosure and token efficiency optimization.

**Key Features**:
- RESTful API with tier-based filtering (`?tier=1`, `?tier=2`, `?tier=all`)
- Multi-layer protection for system agents
- Service-oriented architecture with clear separation of concerns
- Repository pattern for data access abstraction
- Comprehensive caching with 5-minute TTL
- Database-agnostic design (filesystem → PostgreSQL migration path)

**Performance Targets**:
- Response Time: <50ms for tier=1 queries (8 agents)
- Cache Hit Rate: >80% for repeated queries
- Concurrent Requests: 100 req/s sustained
- Token Reduction: 70-78% for default tier=1 queries

### 1.2 Technology Stack

**Current Implementation**:
- Runtime: Node.js 18+
- Framework: Express 4.x
- Language: JavaScript (ESM modules)
- Database: Filesystem (markdown with frontmatter)
- Caching: In-memory LRU cache (node-cache)
- Validation: Custom validators + database constraints

**Future Migration**:
- Database: PostgreSQL 15+ (already partially implemented)
- Caching: Redis (distributed caching)
- Language: TypeScript (gradual migration)

---

## 2. API Layer Architecture

### 2.1 Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         HTTP REQUEST                             │
│                    GET /api/agents?tier=1                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE STACK                              │
├─────────────────────────────────────────────────────────────────┤
│  1. Security Headers (Helmet)                                    │
│  2. CORS Validation                                              │
│  3. Request Size Validation (10MB limit)                         │
│  4. Global Rate Limiter (100 req/min)                            │
│  5. Speed Limiter (slow down excessive requests)                 │
│  6. Protected Path Blocker (/prod/, /.git/)                      │
│  7. Tier Parameter Validator (NEW)                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ROUTE HANDLER                                │
│                  /api/agents (GET)                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Extract query parameters (tier, include_system, userId)      │
│  2. Validate tier parameter                                      │
│  3. Resolve effective tier (backward compatibility)              │
│  4. Call TierFilterService                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                                 │
│                  TierFilterService                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Check cache (CacheService)                                   │
│  2. Load agents from repository (AgentRepository)                │
│  3. Apply tier filter                                            │
│  4. Calculate metadata (counts, stats)                           │
│  5. Store in cache                                               │
│  6. Return filtered results                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   REPOSITORY LAYER                               │
│                  AgentRepository                                 │
├─────────────────────────────────────────────────────────────────┤
│  Current: FileSystemRepository                                   │
│    - Read from /prod/.claude/agents/*.md                         │
│    - Parse frontmatter with gray-matter                          │
│    - Determine tier from file path (.system/ = tier 2)          │
│                                                                  │
│  Future: PostgresRepository                                      │
│    - Query system_agent_templates table                          │
│    - Use composite indexes for performance                       │
│    - Cache invalidation on changes                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESPONSE BUILDER                              │
├─────────────────────────────────────────────────────────────────┤
│  {                                                               │
│    success: true,                                                │
│    data: [/* filtered agents */],                               │
│    metadata: {                                                   │
│      tier: "1",                                                  │
│      tier_counts: { tier1: 8, tier2: 11, total: 19 },          │
│      filtered_count: 8,                                          │
│      timestamp: "2025-10-19T12:00:00Z"                          │
│    }                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Layer Responsibilities

**Middleware Layer**:
- Security enforcement (headers, CORS, rate limiting)
- Request validation (parameters, size limits)
- Path protection (block access to sensitive directories)
- Input sanitization (prevent injection attacks)

**Route Handler Layer**:
- HTTP request/response handling
- Parameter extraction and parsing
- Service orchestration
- Response formatting

**Service Layer**:
- Business logic implementation
- Tier filtering logic
- Metadata calculation
- Cache management

**Repository Layer**:
- Data access abstraction
- File system operations
- Database queries
- Data transformation

---

## 2. API Layer Architecture

### 2.1 Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         HTTP REQUEST                             │
│                    GET /api/agents?tier=1                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE STACK                              │
├─────────────────────────────────────────────────────────────────┤
│  1. Security Headers (Helmet)                                    │
│  2. CORS Validation                                              │
│  3. Request Size Validation (10MB limit)                         │
│  4. Global Rate Limiter (100 req/min)                            │
│  5. Speed Limiter (slow down excessive requests)                 │
│  6. Protected Path Blocker (/prod/, /.git/)                      │
│  7. Tier Parameter Validator (NEW)                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ROUTE HANDLER                                │
│                  /api/agents (GET)                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Extract query parameters (tier, include_system, userId)      │
│  2. Validate tier parameter                                      │
│  3. Resolve effective tier (backward compatibility)              │
│  4. Call TierFilterService                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                                 │
│                  TierFilterService                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Check cache (CacheService)                                   │
│  2. Load agents from repository (AgentRepository)                │
│  3. Apply tier filter                                            │
│  4. Calculate metadata (counts, stats)                           │
│  5. Store in cache                                               │
│  6. Return filtered results                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   REPOSITORY LAYER                               │
│                  AgentRepository                                 │
├─────────────────────────────────────────────────────────────────┤
│  Current: FileSystemRepository                                   │
│    - Read from /prod/.claude/agents/*.md                         │
│    - Parse frontmatter with gray-matter                          │
│    - Determine tier from file path (.system/ = tier 2)          │
│                                                                  │
│  Future: PostgresRepository                                      │
│    - Query system_agent_templates table                          │
│    - Use composite indexes for performance                       │
│    - Cache invalidation on changes                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESPONSE BUILDER                              │
├─────────────────────────────────────────────────────────────────┤
│  {                                                               │
│    success: true,                                                │
│    data: [/* filtered agents */],                               │
│    metadata: {                                                   │
│      tier: "1",                                                  │
│      tier_counts: { tier1: 8, tier2: 11, total: 19 },          │
│      filtered_count: 8,                                          │
│      timestamp: "2025-10-19T12:00:00Z"                          │
│    }                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Layer Responsibilities

**Middleware Layer**:
- Security enforcement (headers, CORS, rate limiting)
- Request validation (parameters, size limits)
- Path protection (block access to sensitive directories)
- Input sanitization (prevent injection attacks)

**Route Handler Layer**:
- HTTP request/response handling
- Parameter extraction and parsing
- Service orchestration
- Response formatting

**Service Layer**:
- Business logic implementation
- Tier filtering logic
- Metadata calculation
- Cache management

**Repository Layer**:
- Data access abstraction
- File system operations
- Database queries
- Data transformation

---

## 3. Route Specifications

### 3.1 GET /api/agents

**Purpose**: Retrieve agents with optional tier filtering

**Query Parameters**:
```typescript
interface GetAgentsQuery {
  tier?: '1' | '2' | 'all';         // Tier filter (default: '1')
  include_system?: 'true' | 'false'; // Legacy parameter
  userId?: string;                    // User ID (default: 'anonymous')
}
```

**Response Schema**:
```typescript
interface GetAgentsResponse {
  success: true;
  data: Agent[];
  metadata: {
    tier: '1' | '2' | 'all';
    tier_counts: {
      tier1: number;
      tier2: number;
      total: number;
    };
    filtered_count: number;
    timestamp: string;
    source: 'PostgreSQL' | 'SQLite' | 'Filesystem';
    warning?: string;  // Deprecation warnings
  };
}
```

**Error Responses**:
```typescript
// 400 Bad Request - Invalid tier parameter
{
  success: false,
  error: 'Invalid tier parameter',
  message: "Tier must be '1', '2', or 'all'. Received: 'invalid'",
  code: 'INVALID_TIER',
  validValues: ['1', '2', 'all']
}

// 500 Internal Server Error - Database/filesystem error
{
  success: false,
  error: 'Failed to load agents',
  message: 'Database connection error',
  code: 'DATABASE_ERROR'
}
```

**Examples**:
```bash
# Get only Tier 1 agents (default)
GET /api/agents
GET /api/agents?tier=1

# Get only Tier 2 agents
GET /api/agents?tier=2

# Get all agents
GET /api/agents?tier=all

# Legacy include_system parameter
GET /api/agents?include_system=true  # Same as tier=all
```

### 3.2 GET /api/agents/:slug

**Purpose**: Retrieve single agent by slug

**Parameters**:
- `slug` (path parameter): Agent slug (e.g., "personal-todos-agent")

**Response Schema**:
```typescript
interface GetAgentResponse {
  success: true;
  data: Agent;
  editable: boolean;  // true for tier 1, false for tier 2
  metadata: {
    timestamp: string;
  };
}
```

**Protection Logic**:
```javascript
// Tier 2 agents are read-only in UI
response.editable = agent.tier === 1 || (user && user.isAdmin);
```

### 3.3 PATCH /api/agents/:slug

**Purpose**: Update agent configuration

**Protection Middleware**:
```javascript
// Applied before route handler
validateProtection(req, res, next) {
  const agent = await getAgentBySlug(req.params.slug);

  if (agent.tier === 2 && !req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Cannot modify protected system agent',
      code: 'AGENT_PROTECTED',
      tier: agent.tier,
      visibility: agent.visibility
    });
  }

  next();
}
```

**Request Body**:
```typescript
interface UpdateAgentRequest {
  description?: string;
  tools?: string[];
  color?: string;
  proactive?: boolean;
  priority?: string;
  // tier is immutable - cannot be changed via API
}
```

**Response**:
```typescript
interface UpdateAgentResponse {
  success: true;
  data: Agent;
  message: string;
}
```

### 3.4 DELETE /api/agents/:slug

**Purpose**: Delete agent (tier 1 only)

**Protection Middleware**:
```javascript
// Same protection as PATCH - tier 2 agents cannot be deleted
validateProtection(req, res, next)
```

**Response**:
```typescript
interface DeleteAgentResponse {
  success: true;
  message: 'Agent deleted successfully';
  deletedSlug: string;
}
```

### 3.5 GET /api/agents/stats

**Purpose**: Get agent statistics without loading full data

**Response Schema**:
```typescript
interface AgentStatsResponse {
  success: true;
  stats: {
    total: number;
    tier1: number;
    tier2: number;
    active: number;
    inactive: number;
    protected: number;
    by_tier: {
      '1': { count: number; active: number; inactive: number; };
      '2': { count: number; active: number; inactive: number; };
    };
  };
  metadata: {
    timestamp: string;
    source: string;
  };
}
```

---

## 4. Service Layer Design

### 4.1 TierFilterService

**File**: `/api-server/services/tier-filter.service.js`

**Responsibilities**:
- Apply tier-based filtering to agent lists
- Calculate filter metadata and statistics
- Validate tier parameters
- Coordinate with cache and repository layers

**Interface**:
```javascript
class TierFilterService {
  /**
   * Get agents filtered by tier
   * @param {string} tier - Tier filter ('1', '2', 'all')
   * @param {string} userId - User ID
   * @returns {Promise<{agents: Array, metadata: Object}>}
   */
  async getAgentsByTier(tier, userId = 'anonymous') {
    // 1. Validate tier parameter
    this.validateTierParameter(tier);

    // 2. Check cache
    const cacheKey = `agents:tier:${tier}:user:${userId}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    // 3. Load all agents from repository
    const allAgents = await AgentRepository.getAllAgents(userId);

    // 4. Apply tier filter
    const filteredAgents = this.applyTierFilter(allAgents, tier);

    // 5. Calculate metadata
    const metadata = this.calculateMetadata(allAgents, filteredAgents, tier);

    // 6. Build response
    const response = {
      agents: filteredAgents,
      metadata
    };

    // 7. Cache result
    await CacheService.set(cacheKey, response, 300); // 5 min TTL

    return response;
  }

  /**
   * Validate tier parameter
   * @param {string} tier - Tier parameter to validate
   * @throws {TierValidationError} - If tier is invalid
   */
  validateTierParameter(tier) {
    const validTiers = ['1', '2', 'all'];
    if (!validTiers.includes(tier)) {
      throw new TierValidationError(
        `Tier must be '1', '2', or 'all'. Received: '${tier}'`,
        validTiers
      );
    }
  }

  /**
   * Apply tier filter to agent list
   * @param {Array} agents - Full agent list
   * @param {string} tier - Tier filter
   * @returns {Array} - Filtered agents
   */
  applyTierFilter(agents, tier) {
    switch (tier) {
      case '1':
        return agents.filter(a => a.tier === 1);
      case '2':
        return agents.filter(a => a.tier === 2);
      case 'all':
        return agents;
      default:
        throw new Error(`Invalid tier: ${tier}`);
    }
  }

  /**
   * Calculate filter metadata
   * @param {Array} allAgents - All agents
   * @param {Array} filteredAgents - Filtered agents
   * @param {string} tier - Applied tier filter
   * @returns {Object} - Metadata object
   */
  calculateMetadata(allAgents, filteredAgents, tier) {
    const tier1Count = allAgents.filter(a => a.tier === 1).length;
    const tier2Count = allAgents.filter(a => a.tier === 2).length;
    const protectedCount = allAgents.filter(a => a.visibility === 'protected').length;

    return {
      tier,
      tier_counts: {
        tier1: tier1Count,
        tier2: tier2Count,
        total: allAgents.length
      },
      filtered_count: filteredAgents.length,
      protected: protectedCount,
      timestamp: new Date().toISOString(),
      source: process.env.USE_POSTGRES === 'true' ? 'PostgreSQL' : 'Filesystem'
    };
  }
}

export default new TierFilterService();
```

### 4.2 ProtectionService

**File**: `/api-server/services/protection.service.js`

**Responsibilities**:
- Validate agent modification permissions
- Check if agent is protected (tier 2)
- Log protection attempts for audit
- Provide protection reasons

**Interface**:
```javascript
class ProtectionService {
  /**
   * Check if agent is protected from modification
   * @param {string} agentId - Agent ID or slug
   * @returns {Promise<boolean>}
   */
  async isProtected(agentId) {
    const agent = await AgentRepository.getAgentBySlug(agentId);
    if (!agent) return false;

    // Tier 2 agents are protected
    return agent.tier === 2;
  }

  /**
   * Get protection reason for agent
   * @param {string} agentId - Agent ID or slug
   * @returns {Promise<string>}
   */
  async getProtectionReason(agentId) {
    const agent = await AgentRepository.getAgentBySlug(agentId);
    if (!agent) return 'Agent not found';

    if (agent.tier === 2) {
      return 'System agents (tier 2) are protected from user modification';
    }

    return 'Agent is not protected';
  }

  /**
   * Validate if user can modify agent
   * @param {string} agentId - Agent ID or slug
   * @param {Object} user - User object
   * @throws {ProtectionError} - If modification is not allowed
   */
  async validateModification(agentId, user = null) {
    const agent = await AgentRepository.getAgentBySlug(agentId);

    if (!agent) {
      throw new NotFoundError(`Agent not found: ${agentId}`);
    }

    // Tier 1 agents are always editable
    if (agent.tier === 1) {
      return true;
    }

    // Tier 2 agents require admin permission
    if (agent.tier === 2) {
      if (!user || !user.isAdmin) {
        await this.logProtectionAttempt(agentId, 'modification', user?.id);
        throw new ProtectionError(
          `Cannot modify protected system agent: ${agent.name}`,
          'AGENT_PROTECTED',
          { tier: agent.tier, visibility: agent.visibility }
        );
      }
    }

    return true;
  }

  /**
   * Log protection attempt for audit
   * @param {string} agentId - Agent ID
   * @param {string} action - Action attempted
   * @param {string} userId - User ID
   */
  async logProtectionAttempt(agentId, action, userId = 'anonymous') {
    const log = {
      timestamp: new Date().toISOString(),
      agentId,
      action,
      userId,
      blocked: true,
      reason: 'Agent is protected (tier 2)'
    };

    console.warn('🔒 Protection attempt logged:', log);

    // TODO: Store in audit log table
    // await AuditLogRepository.create(log);
  }
}

export default new ProtectionService();
```

### 4.3 CacheService

**File**: `/api-server/services/cache.service.js`

**Responsibilities**:
- In-memory LRU caching with TTL
- Cache key generation
- Cache invalidation by pattern
- Cache statistics tracking

**Interface**:
```javascript
import NodeCache from 'node-cache';

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300,           // Default 5 minutes
      checkperiod: 60,       // Check for expired keys every 60s
      useClones: true,       // Clone objects on get/set
      maxKeys: 1000,         // Maximum 1000 cache entries
      deleteOnExpire: true
    });

    // Track cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value or null
   */
  async get(key) {
    const value = this.cache.get(key);

    if (value === undefined) {
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<void>}
   */
  async set(key, value, ttl = 300) {
    this.cache.set(key, value, ttl);
    this.stats.sets++;
  }

  /**
   * Invalidate cache entries matching pattern
   * @param {string} pattern - Glob pattern (e.g., "agents:*")
   * @returns {Promise<number>} - Number of keys deleted
   */
  async invalidate(pattern) {
    const keys = this.cache.keys();
    const matchedKeys = keys.filter(key => {
      // Simple pattern matching (* wildcard)
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(key);
    });

    const deleted = this.cache.del(matchedKeys);
    this.stats.deletes += deleted;

    console.log(`🗑️  Invalidated ${deleted} cache entries matching: ${pattern}`);
    return deleted;
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;

    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2) + '%',
      keys: this.cache.keys().length,
      size: this.cache.getStats()
    };
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.flushAll();
    console.log('🗑️  Cache cleared');
  }
}

export default new CacheService();
```

---

## 5. Repository Pattern

### 5.1 Repository Interface

**File**: `/api-server/repositories/agent.repository.interface.js`

```javascript
/**
 * Agent Repository Interface
 * Defines standard methods for agent data access
 * Implementations: FileSystemRepository, PostgresRepository
 */
export class IAgentRepository {
  /**
   * Get all agents for a user
   * @param {string} userId - User ID
   * @param {Object} options - Filter options
   * @returns {Promise<Array>}
   */
  async getAllAgents(userId, options = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Get agent by slug
   * @param {string} slug - Agent slug
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>}
   */
  async getAgentBySlug(slug, userId) {
    throw new Error('Method not implemented');
  }

  /**
   * Get agents by tier
   * @param {number} tier - Tier number (1 or 2)
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async getAgentsByTier(tier, userId) {
    throw new Error('Method not implemented');
  }

  /**
   * Update agent
   * @param {string} slug - Agent slug
   * @param {Object} data - Update data
   * @returns {Promise<Object>}
   */
  async updateAgent(slug, data) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete agent
   * @param {string} slug - Agent slug
   * @returns {Promise<void>}
   */
  async deleteAgent(slug) {
    throw new Error('Method not implemented');
  }
}
```

### 5.2 FileSystemRepository (Current Implementation)

**File**: `/api-server/repositories/filesystem-agent.repository.js`

**Extends**: Existing `agent.repository.js`

```javascript
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';
import { IAgentRepository } from './agent.repository.interface.js';

const AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';
const SYSTEM_AGENTS_DIR = path.join(AGENTS_DIR, '.system');

class FileSystemAgentRepository extends IAgentRepository {
  /**
   * Determine agent tier from file path
   * @param {string} filePath - Absolute file path
   * @returns {number} - Tier (1 or 2)
   */
  determineAgentTier(filePath) {
    // Tier 2: Files in .system/ subdirectory
    if (filePath.includes('/.system/')) {
      return 2;
    }

    // Tier 1: All other agent files
    return 1;
  }

  /**
   * Parse agent frontmatter with tier system fields
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Object} - Agent object
   */
  parseAgentFile(content, filePath) {
    const parsed = matter(content);
    const { data: frontmatter, content: markdownContent } = parsed;

    const filename = path.basename(filePath, '.md');

    // Determine tier from file path
    const tier = this.determineAgentTier(filePath);

    return {
      // Existing fields
      id: this.generateAgentId(frontmatter.name || filename),
      slug: filename,
      name: frontmatter.name || filename,
      description: frontmatter.description || '',
      tools: this.parseTools(frontmatter.tools || []),
      color: frontmatter.color || '#6366f1',
      avatar_url: frontmatter.avatar_url || null,
      status: frontmatter.status || 'active',
      model: frontmatter.model || 'sonnet',
      proactive: frontmatter.proactive === true || frontmatter.proactive === 'true',
      priority: frontmatter.priority || 'P3',
      usage: frontmatter.usage || '',
      content: markdownContent.trim(),
      hash: this.calculateHash(content),
      filePath,
      lastModified: new Date().toISOString(),

      // Tier system fields
      tier,  // Determined from file path
      visibility: frontmatter.visibility || (tier === 2 ? 'protected' : 'public'),
      icon: frontmatter.icon || null,
      icon_type: frontmatter.icon_type || 'emoji',
      icon_emoji: frontmatter.icon_emoji || this.getDefaultEmoji(filename),
      posts_as_self: frontmatter.posts_as_self !== false,
      show_in_default_feed: frontmatter.show_in_default_feed !== false
    };
  }

  /**
   * Get all agents with optional filtering
   * @param {string} userId - User ID
   * @param {Object} options - Filter options
   * @returns {Promise<Array>}
   */
  async getAllAgents(userId = 'anonymous', options = {}) {
    try {
      // List all agent files (both tier 1 and tier 2)
      const tier1Files = await this.listFilesInDirectory(AGENTS_DIR);
      const tier2Files = await this.listFilesInDirectory(SYSTEM_AGENTS_DIR);

      const allFilePaths = [...tier1Files, ...tier2Files];

      // Parse all agent files
      const agents = await Promise.all(
        allFilePaths.map(async (filePath) => {
          const content = await fs.readFile(filePath, 'utf-8');
          return this.parseAgentFile(content, filePath);
        })
      );

      // Apply tier filter if specified
      let filtered = agents;
      if (options.tier !== undefined) {
        filtered = agents.filter(a => a.tier === Number(options.tier));
      }

      // Sort by name
      filtered.sort((a, b) => a.name.localeCompare(b.name));

      console.log(`📂 Loaded ${filtered.length} agents from filesystem (${agents.length} total)`);
      return filtered;
    } catch (error) {
      console.error('Failed to get all agents:', error);
      throw error;
    }
  }

  /**
   * Get agents by tier
   * @param {number} tier - Tier (1 or 2)
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async getAgentsByTier(tier, userId = 'anonymous') {
    return this.getAllAgents(userId, { tier });
  }

  /**
   * List files in directory
   * @param {string} dir - Directory path
   * @returns {Promise<Array>} - Array of absolute file paths
   */
  async listFilesInDirectory(dir) {
    try {
      const files = await fs.readdir(dir);
      return files
        .filter(file => file.endsWith('.md'))
        .map(file => path.join(dir, file));
    } catch (error) {
      // Directory doesn't exist or is empty
      console.warn(`⚠️  Directory not accessible: ${dir}`);
      return [];
    }
  }

  /**
   * Get default emoji for agent
   * @param {string} slug - Agent slug
   * @returns {string} - Default emoji
   */
  getDefaultEmoji(slug) {
    const emojiMap = {
      'personal-todos-agent': '📋',
      'meeting-prep-agent': '📅',
      'meeting-next-steps-agent': '✅',
      'follow-ups-agent': '🔔',
      'get-to-know-you-agent': '👋',
      'link-logger-agent': '🔗',
      'agent-ideas-agent': '💡',
      'agent-feedback-agent': '💬',
      'meta-agent': '⚙️',
      'meta-update-agent': '🔄',
      'page-builder-agent': '📄',
      'page-verification-agent': '✓',
      'skills-architect-agent': '🎨',
      'agent-architect-agent': '🏗️',
      'learning-optimizer-agent': '🧠',
      'system-architect-agent': '🏛️'
    };

    return emojiMap[slug] || '🤖';
  }

  // Utility methods (existing implementation)
  generateAgentId(name) {
    const hash = crypto.createHash('sha256').update(name).digest('hex');
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  }

  calculateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  parseTools(tools) {
    if (Array.isArray(tools)) return tools.map(t => String(t).trim());
    if (typeof tools === 'string') {
      const match = tools.match(/\[(.*?)\]/);
      if (match) return match[1].split(',').map(t => t.trim());
      return tools.split(',').map(t => t.trim());
    }
    return [];
  }
}

export default new FileSystemAgentRepository();
```

### 5.3 PostgresRepository (Future Implementation)

**File**: `/api-server/repositories/postgres-agent.repository.js`

```javascript
import { IAgentRepository } from './agent.repository.interface.js';
import dbSelector from '../config/database-selector.js';

class PostgresAgentRepository extends IAgentRepository {
  /**
   * Get all agents with filtering
   * @param {string} userId - User ID
   * @param {Object} options - Filter options
   * @returns {Promise<Array>}
   */
  async getAllAgents(userId = 'anonymous', options = {}) {
    const conditions = ['1=1'];
    const params = [userId];

    // Tier filter
    if (options.tier !== undefined) {
      params.push(options.tier);
      conditions.push(`sat.tier = $${params.length}`);
    }

    // Visibility filter (default: only public agents)
    if (options.visibility) {
      params.push(options.visibility);
      conditions.push(`sat.visibility = $${params.length}`);
    } else {
      conditions.push(`sat.visibility = 'public'`);
    }

    const query = `
      SELECT
        sat.name,
        sat.slug,
        sat.tier,
        sat.visibility,
        sat.icon_type,
        sat.icon,
        sat.icon_emoji,
        sat.posts_as_self,
        sat.show_in_default_feed,
        sat.priority,
        sat.tags,
        sat.model,
        sat.version,
        sat.created_at,
        sat.updated_at,
        COALESCE(uac.custom_name, sat.name) as display_name,
        COALESCE(uac.personality, sat.default_personality) as description
      FROM system_agent_templates sat
      LEFT JOIN user_agent_customizations uac
        ON sat.name = uac.agent_template AND uac.user_id = $1
      WHERE ${conditions.join(' AND ')}
      ORDER BY sat.tier ASC, sat.priority ASC, sat.name ASC
    `;

    const result = await dbSelector.postgresManager.query(query, params);
    return result.rows;
  }

  /**
   * Get agents by tier
   * @param {number} tier - Tier (1 or 2)
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async getAgentsByTier(tier, userId = 'anonymous') {
    return this.getAllAgents(userId, { tier });
  }

  /**
   * Get agent by slug
   * @param {string} slug - Agent slug
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>}
   */
  async getAgentBySlug(slug, userId = 'anonymous') {
    const query = `
      SELECT
        sat.*,
        COALESCE(uac.custom_name, sat.name) as display_name,
        COALESCE(uac.personality, sat.default_personality) as description
      FROM system_agent_templates sat
      LEFT JOIN user_agent_customizations uac
        ON sat.name = uac.agent_template AND uac.user_id = $1
      WHERE sat.slug = $2
    `;

    const result = await dbSelector.postgresManager.query(query, [userId, slug]);
    return result.rows[0] || null;
  }
}

export default new PostgresAgentRepository();
```

---

## 6. Middleware Stack

### 6.1 Tier Validation Middleware

**File**: `/api-server/middleware/validate-tier.middleware.js`

```javascript
/**
 * Validate tier query parameter
 * Applied to GET /api/agents route
 */
export function validateTierParameter(req, res, next) {
  const tierParam = req.query.tier;

  // Tier parameter is optional (default to '1')
  if (!tierParam) {
    req.query.tier = '1';  // Set default
    return next();
  }

  // Normalize to lowercase string
  const tier = String(tierParam).toLowerCase();

  // Validate against allowed values
  const validTiers = ['1', '2', 'all'];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid tier parameter',
      message: `Tier must be '1', '2', or 'all'. Received: '${tierParam}'`,
      code: 'INVALID_TIER',
      validValues: validTiers
    });
  }

  // Set normalized tier
  req.query.tier = tier;
  next();
}
```

### 6.2 Protection Validation Middleware

**File**: `/api-server/middleware/validate-protection.middleware.js`

```javascript
import ProtectionService from '../services/protection.service.js';
import AgentRepository from '../repositories/filesystem-agent.repository.js';

/**
 * Validate that agent can be modified (not protected)
 * Applied to PATCH, DELETE /api/agents/:slug routes
 */
export async function validateProtection(req, res, next) {
  try {
    const { slug } = req.params;
    const user = req.user || null;  // From auth middleware

    // Get agent
    const agent = await AgentRepository.getAgentBySlug(slug);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        message: `No agent found with slug: ${slug}`,
        code: 'AGENT_NOT_FOUND'
      });
    }

    // Check if agent is protected
    const isProtected = await ProtectionService.isProtected(slug);

    if (isProtected) {
      // Tier 2 agents require admin permission
      if (!user || !user.isAdmin) {
        await ProtectionService.logProtectionAttempt(slug, req.method, user?.id);

        return res.status(403).json({
          success: false,
          error: 'Cannot modify protected system agent',
          message: await ProtectionService.getProtectionReason(slug),
          code: 'AGENT_PROTECTED',
          agent: {
            slug: agent.slug,
            name: agent.name,
            tier: agent.tier,
            visibility: agent.visibility
          }
        });
      }
    }

    // Attach agent to request for use in route handler
    req.agent = agent;
    next();
  } catch (error) {
    console.error('Protection validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate agent protection',
      message: error.message,
      code: 'VALIDATION_ERROR'
    });
  }
}
```

### 6.3 Backward Compatibility Middleware

**File**: `/api-server/middleware/backward-compatibility.middleware.js`

```javascript
/**
 * Handle legacy include_system parameter
 * Converts include_system to tier parameter for backward compatibility
 */
export function handleLegacyParameters(req, res, next) {
  const { tier, include_system } = req.query;

  // Tier parameter takes precedence
  if (tier) {
    // If both parameters provided, add warning to response
    if (include_system !== undefined) {
      req.deprecationWarning =
        "Both 'tier' and 'include_system' provided. Using 'tier' parameter. " +
        "'include_system' is deprecated.";
    }
    return next();
  }

  // Legacy include_system parameter
  if (include_system !== undefined) {
    const includeSystemValue = String(include_system).toLowerCase();

    if (includeSystemValue === 'true') {
      req.query.tier = 'all';
    } else {
      req.query.tier = '1';
    }

    req.deprecationWarning =
      "Parameter 'include_system' is deprecated. " +
      "Use 'tier=all' instead for future requests.";

    return next();
  }

  // No tier parameter - use default
  req.query.tier = '1';
  next();
}
```

---

## 7. Caching Strategy

### 7.1 Cache Key Design

```javascript
/**
 * Cache Key Patterns
 */
const CACHE_KEYS = {
  // Agent lists by tier
  AGENTS_TIER_1: (userId) => `agents:tier:1:user:${userId}`,
  AGENTS_TIER_2: (userId) => `agents:tier:2:user:${userId}`,
  AGENTS_ALL: (userId) => `agents:tier:all:user:${userId}`,

  // Individual agents
  AGENT_BY_SLUG: (slug, userId) => `agent:slug:${slug}:user:${userId}`,

  // Statistics
  AGENT_STATS: 'agents:stats',

  // Metadata
  TIER_COUNTS: 'agents:tier:counts'
};

/**
 * Cache TTL Configuration (in seconds)
 */
const CACHE_TTL = {
  AGENTS_TIER_1: 300,      // 5 minutes (most common query)
  AGENTS_TIER_2: 300,      // 5 minutes
  AGENTS_ALL: 300,         // 5 minutes
  AGENT_DETAIL: 600,       // 10 minutes (less frequently updated)
  STATS: 180,              // 3 minutes (lightweight query)
  TIER_COUNTS: 180         // 3 minutes
};
```

### 7.2 Cache Invalidation Strategy

```javascript
/**
 * Cache Invalidation Triggers
 */
class CacheInvalidationService {
  /**
   * Invalidate cache when agent is created
   * @param {Object} agent - Created agent
   */
  async onAgentCreated(agent) {
    // Invalidate all agent lists
    await CacheService.invalidate('agents:tier:*');

    // Invalidate stats
    await CacheService.invalidate('agents:stats');
    await CacheService.invalidate('agents:tier:counts');

    console.log(`🗑️  Cache invalidated: agent created (${agent.slug})`);
  }

  /**
   * Invalidate cache when agent is updated
   * @param {Object} agent - Updated agent
   */
  async onAgentUpdated(agent) {
    // Invalidate all agent lists
    await CacheService.invalidate('agents:tier:*');

    // Invalidate specific agent cache
    await CacheService.invalidate(`agent:slug:${agent.slug}:*`);

    // Invalidate stats
    await CacheService.invalidate('agents:stats');

    console.log(`🗑️  Cache invalidated: agent updated (${agent.slug})`);
  }

  /**
   * Invalidate cache when agent is deleted
   * @param {string} slug - Deleted agent slug
   */
  async onAgentDeleted(slug) {
    // Invalidate all agent lists
    await CacheService.invalidate('agents:tier:*');

    // Invalidate specific agent cache
    await CacheService.invalidate(`agent:slug:${slug}:*`);

    // Invalidate stats
    await CacheService.invalidate('agents:stats');
    await CacheService.invalidate('agents:tier:counts');

    console.log(`🗑️  Cache invalidated: agent deleted (${slug})`);
  }

  /**
   * Invalidate cache when filesystem changes detected
   */
  async onFileSystemChange() {
    // Clear all agent-related cache
    await CacheService.invalidate('agents:*');
    await CacheService.invalidate('agent:*');

    console.log('🗑️  Cache invalidated: filesystem change detected');
  }
}

export default new CacheInvalidationService();
```

### 7.3 Cache Warming Strategy

```javascript
/**
 * Cache Warming on Server Startup
 */
export async function warmCache() {
  console.log('🔥 Warming cache...');

  try {
    // Pre-cache tier 1 agents (most common query)
    const tier1Agents = await TierFilterService.getAgentsByTier('1', 'anonymous');
    console.log(`✅ Cached tier 1 agents: ${tier1Agents.agents.length}`);

    // Pre-cache tier 2 agents
    const tier2Agents = await TierFilterService.getAgentsByTier('2', 'anonymous');
    console.log(`✅ Cached tier 2 agents: ${tier2Agents.agents.length}`);

    // Pre-cache all agents
    const allAgents = await TierFilterService.getAgentsByTier('all', 'anonymous');
    console.log(`✅ Cached all agents: ${allAgents.agents.length}`);

    console.log('✅ Cache warming complete');
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
  }
}
```

---

## 8. Error Handling

### 8.1 Custom Error Classes

**File**: `/api-server/errors/agent-errors.js`

```javascript
/**
 * Base error class for agent-related errors
 */
export class AgentError extends Error {
  constructor(message, code, statusCode = 500, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: this.name,
      message: this.message,
      code: this.code,
      ...this.details
    };
  }
}

/**
 * Agent not found error (404)
 */
export class AgentNotFoundError extends AgentError {
  constructor(slug) {
    super(
      `Agent not found: ${slug}`,
      'AGENT_NOT_FOUND',
      404,
      { slug }
    );
  }
}

/**
 * Agent protected error (403)
 */
export class AgentProtectedError extends AgentError {
  constructor(agent) {
    super(
      `Cannot modify protected system agent: ${agent.name}`,
      'AGENT_PROTECTED',
      403,
      {
        slug: agent.slug,
        tier: agent.tier,
        visibility: agent.visibility
      }
    );
  }
}

/**
 * Invalid tier parameter error (400)
 */
export class TierValidationError extends AgentError {
  constructor(message, validValues) {
    super(
      message,
      'INVALID_TIER',
      400,
      { validValues }
    );
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AgentError {
  constructor(message, originalError) {
    super(
      message,
      'DATABASE_ERROR',
      500,
      {
        originalMessage: originalError?.message,
        stack: process.env.NODE_ENV === 'development' ? originalError?.stack : undefined
      }
    );
  }
}

/**
 * Filesystem error (500)
 */
export class FileSystemError extends AgentError {
  constructor(message, filePath, originalError) {
    super(
      message,
      'FILESYSTEM_ERROR',
      500,
      {
        filePath,
        originalMessage: originalError?.message
      }
    );
  }
}
```

### 8.2 Error Handling Middleware

**File**: `/api-server/middleware/error-handler.middleware.js`

```javascript
import {
  AgentError,
  AgentNotFoundError,
  AgentProtectedError,
  TierValidationError,
  DatabaseError,
  FileSystemError
} from '../errors/agent-errors.js';

/**
 * Global error handler middleware
 * Must be registered LAST in middleware stack
 */
export function errorHandler(err, req, res, next) {
  // Log error
  console.error('❌ Error:', {
    name: err.name,
    message: err.message,
    code: err.code,
    url: req.url,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // AgentError instances (custom errors)
  if (err instanceof AgentError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Validation errors (from express-validator)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
      code: 'VALIDATION_ERROR',
      errors: err.errors
    });
  }

  // MongoDB/PostgreSQL errors
  if (err.name === 'MongoError' || err.name === 'PostgresError') {
    return res.status(500).json({
      success: false,
      error: 'Database Error',
      message: 'A database error occurred',
      code: 'DATABASE_ERROR'
    });
  }

  // File system errors
  if (err.code === 'ENOENT' || err.code === 'EACCES') {
    return res.status(500).json({
      success: false,
      error: 'File System Error',
      message: 'Failed to access file',
      code: 'FILESYSTEM_ERROR',
      fsCode: err.code
    });
  }

  // Default error (500 Internal Server Error)
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

---

## 9. File Structure

```
/api-server/
├── server.js                           # Main entry point
├── config/
│   ├── database-selector.js            # Database selection logic
│   └── cache-config.js                 # Cache configuration
├── routes/
│   ├── agents.routes.js                # Agent routes (GET, PATCH, DELETE)
│   └── index.js                        # Route aggregator
├── middleware/
│   ├── security.js                     # Security middleware (existing)
│   ├── auth.js                         # Authentication (existing)
│   ├── validate-tier.middleware.js     # Tier validation (NEW)
│   ├── validate-protection.middleware.js # Protection validation (NEW)
│   ├── backward-compatibility.middleware.js # Legacy param support (NEW)
│   └── error-handler.middleware.js     # Error handler (NEW)
├── services/
│   ├── tier-filter.service.js          # Tier filtering logic (NEW)
│   ├── protection.service.js           # Protection logic (NEW)
│   └── cache.service.js                # Caching service (NEW)
├── repositories/
│   ├── agent.repository.interface.js   # Repository interface (NEW)
│   ├── filesystem-agent.repository.js  # Filesystem implementation (UPDATED)
│   └── postgres-agent.repository.js    # PostgreSQL implementation (NEW)
├── errors/
│   └── agent-errors.js                 # Custom error classes (NEW)
├── types/
│   └── agent-tier.types.js             # TypeScript types (NEW)
└── __tests__/
    ├── unit/
    │   ├── tier-filter.service.test.js
    │   ├── protection.service.test.js
    │   └── cache.service.test.js
    ├── integration/
    │   ├── agents-api.test.js
    │   └── tier-filtering.test.js
    └── e2e/
        └── agent-tier-system.spec.js
```

### 9.1 Route File Example

**File**: `/api-server/routes/agents.routes.js`

```javascript
import express from 'express';
import { asyncHandler } from '../middleware/error-handler.middleware.js';
import { validateTierParameter } from '../middleware/validate-tier.middleware.js';
import { validateProtection } from '../middleware/validate-protection.middleware.js';
import { handleLegacyParameters } from '../middleware/backward-compatibility.middleware.js';
import TierFilterService from '../services/tier-filter.service.js';
import AgentRepository from '../repositories/filesystem-agent.repository.js';
import { AgentNotFoundError } from '../errors/agent-errors.js';

const router = express.Router();

/**
 * GET /api/agents
 * Get agents with tier filtering
 */
router.get(
  '/agents',
  handleLegacyParameters,       // Convert legacy params
  validateTierParameter,         // Validate tier param
  asyncHandler(async (req, res) => {
    const { tier } = req.query;
    const userId = req.query.userId || 'anonymous';

    // Get agents with tier filtering
    const result = await TierFilterService.getAgentsByTier(tier, userId);

    // Build response
    const response = {
      success: true,
      data: result.agents,
      metadata: result.metadata
    };

    // Add deprecation warning if present
    if (req.deprecationWarning) {
      response.metadata.warning = req.deprecationWarning;
    }

    res.json(response);
  })
);

/**
 * GET /api/agents/:slug
 * Get single agent by slug
 */
router.get(
  '/agents/:slug',
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const userId = req.query.userId || 'anonymous';

    const agent = await AgentRepository.getAgentBySlug(slug, userId);

    if (!agent) {
      throw new AgentNotFoundError(slug);
    }

    // Determine if agent is editable
    const editable = agent.tier === 1 || (req.user && req.user.isAdmin);

    res.json({
      success: true,
      data: agent,
      editable,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  })
);

/**
 * PATCH /api/agents/:slug
 * Update agent configuration
 */
router.patch(
  '/agents/:slug',
  validateProtection,  // Check if agent is protected
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const updateData = req.body;

    // Prevent tier modification
    if (updateData.tier !== undefined) {
      return res.status(403).json({
        success: false,
        error: 'Tier classification is immutable',
        message: 'Agent tier cannot be changed via API',
        code: 'IMMUTABLE_FIELD'
      });
    }

    // Update agent (req.agent attached by validateProtection middleware)
    const updatedAgent = await AgentRepository.updateAgent(slug, updateData);

    res.json({
      success: true,
      data: updatedAgent,
      message: 'Agent updated successfully'
    });
  })
);

/**
 * DELETE /api/agents/:slug
 * Delete agent (tier 1 only)
 */
router.delete(
  '/agents/:slug',
  validateProtection,  // Check if agent is protected
  asyncHandler(async (req, res) => {
    const { slug } = req.params;

    await AgentRepository.deleteAgent(slug);

    res.json({
      success: true,
      message: 'Agent deleted successfully',
      deletedSlug: slug
    });
  })
);

/**
 * GET /api/agents/stats
 * Get agent statistics
 */
router.get(
  '/agents/stats',
  asyncHandler(async (req, res) => {
    const allAgents = await AgentRepository.getAllAgents('anonymous');

    const tier1Count = allAgents.filter(a => a.tier === 1).length;
    const tier2Count = allAgents.filter(a => a.tier === 2).length;
    const activeCount = allAgents.filter(a => a.status === 'active').length;
    const inactiveCount = allAgents.filter(a => a.status === 'inactive').length;
    const protectedCount = allAgents.filter(a => a.visibility === 'protected').length;

    res.json({
      success: true,
      stats: {
        total: allAgents.length,
        tier1: tier1Count,
        tier2: tier2Count,
        active: activeCount,
        inactive: inactiveCount,
        protected: protectedCount,
        by_tier: {
          '1': {
            count: tier1Count,
            active: allAgents.filter(a => a.tier === 1 && a.status === 'active').length,
            inactive: allAgents.filter(a => a.tier === 1 && a.status === 'inactive').length
          },
          '2': {
            count: tier2Count,
            active: allAgents.filter(a => a.tier === 2 && a.status === 'active').length,
            inactive: allAgents.filter(a => a.tier === 2 && a.status === 'inactive').length
          }
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        source: process.env.USE_POSTGRES === 'true' ? 'PostgreSQL' : 'Filesystem'
      }
    });
  })
);

export default router;
```

---

## 10. Performance Optimization

### 10.1 Performance Benchmarks

```javascript
/**
 * Performance Testing Suite
 * File: /api-server/__tests__/performance/tier-filtering.perf.test.js
 */

import { performance } from 'perf_hooks';
import TierFilterService from '../../services/tier-filter.service.js';
import CacheService from '../../services/cache.service.js';

describe('Tier Filtering Performance', () => {
  beforeEach(async () => {
    // Clear cache before each test
    await CacheService.clear();
  });

  test('GET /api/agents?tier=1 should respond in <50ms (p95)', async () => {
    const iterations = 100;
    const responseTimes = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await TierFilterService.getAgentsByTier('1', 'anonymous');
      const end = performance.now();

      responseTimes.push(end - start);
    }

    // Calculate p95
    const sorted = responseTimes.sort((a, b) => a - b);
    const p95Index = Math.ceil(sorted.length * 0.95) - 1;
    const p95 = sorted[p95Index];

    console.log(`P95 response time: ${p95.toFixed(2)}ms`);
    expect(p95).toBeLessThan(50);
  });

  test('Cache hit rate should be >80%', async () => {
    const iterations = 100;

    // Warm cache
    await TierFilterService.getAgentsByTier('1', 'anonymous');

    // Make repeated requests
    for (let i = 0; i < iterations; i++) {
      await TierFilterService.getAgentsByTier('1', 'anonymous');
    }

    // Get cache stats
    const stats = CacheService.getStats();
    const hitRate = parseFloat(stats.hitRate);

    console.log(`Cache hit rate: ${hitRate}%`);
    expect(hitRate).toBeGreaterThan(80);
  });

  test('Concurrent requests should maintain performance', async () => {
    const concurrentRequests = 50;
    const start = performance.now();

    // Make concurrent requests
    const promises = Array.from({ length: concurrentRequests }, () =>
      TierFilterService.getAgentsByTier('1', 'anonymous')
    );

    await Promise.all(promises);
    const end = performance.now();

    const avgTime = (end - start) / concurrentRequests;
    console.log(`Average time per concurrent request: ${avgTime.toFixed(2)}ms`);

    expect(avgTime).toBeLessThan(100);
  });
});
```

### 10.2 Database Query Optimization (Future PostgreSQL)

```sql
-- Create indexes for optimal query performance
CREATE INDEX CONCURRENTLY idx_agents_tier
  ON system_agent_templates(tier);

CREATE INDEX CONCURRENTLY idx_agents_visibility
  ON system_agent_templates(visibility);

-- Composite index for tier + visibility queries
CREATE INDEX CONCURRENTLY idx_agents_tier_visibility
  ON system_agent_templates(tier, visibility)
  WHERE visibility = 'public';  -- Partial index for most common case

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM system_agent_templates
WHERE tier = 1 AND visibility = 'public'
ORDER BY priority ASC, name ASC;

-- Expected query plan:
-- Index Scan using idx_agents_tier_visibility
-- Planning Time: ~0.1ms
-- Execution Time: ~0.5ms
```

### 10.3 Caching Performance Metrics

```javascript
/**
 * Cache Performance Monitoring
 */
setInterval(() => {
  const stats = CacheService.getStats();

  console.log('📊 Cache Statistics:', {
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hitRate,
    keys: stats.keys,
    memory: process.memoryUsage().heapUsed / 1024 / 1024 + ' MB'
  });
}, 60000);  // Log every minute
```

---

## 11. Security Architecture

### 11.1 Multi-Layer Protection

```
┌────────────────────────────────────────────────────────────┐
│              SECURITY LAYERS                                │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Network Security                                 │
│    - CORS whitelist                                        │
│    - Rate limiting (100 req/min)                           │
│    - Speed limiting (slow down attacks)                    │
│    - Request size limits (10MB max)                        │
│                                                             │
│  Layer 2: Input Validation                                 │
│    - Tier parameter validation                             │
│    - Path parameter sanitization                           │
│    - Query parameter validation                            │
│    - Request body schema validation                        │
│                                                             │
│  Layer 3: Business Logic Protection                        │
│    - Tier-based access control                             │
│    - Protection service validation                         │
│    - Immutability enforcement (tier field)                 │
│    - Admin permission checks                               │
│                                                             │
│  Layer 4: Database Protection                              │
│    - Parameterized queries (no SQL injection)              │
│    - Database constraints (tier, visibility)               │
│    - Transaction rollback on error                         │
│    - Connection pooling limits                             │
│                                                             │
│  Layer 5: Audit & Monitoring                               │
│    - Protection attempt logging                            │
│    - Error logging and alerting                            │
│    - Performance monitoring                                │
│    - Suspicious activity detection                         │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### 11.2 Protection Rules

```javascript
/**
 * Protection Rules for Agent Tier System
 */
const PROTECTION_RULES = {
  // Tier 1 agents (user-facing)
  tier1: {
    read: 'ALL_USERS',        // Anyone can read
    write: 'ALL_USERS',       // Anyone can modify
    delete: 'ALL_USERS',      // Anyone can delete
    modifyTier: 'ADMIN_ONLY'  // Only admin can change tier
  },

  // Tier 2 agents (system)
  tier2: {
    read: 'ALL_USERS',        // Anyone can read
    write: 'ADMIN_ONLY',      // Only admin can modify
    delete: 'ADMIN_ONLY',     // Only admin can delete
    modifyTier: 'ADMIN_ONLY'  // Only admin can change tier
  },

  // Immutable fields (cannot be changed via API)
  immutableFields: [
    'tier',           // Tier classification is immutable
    'id',             // Agent ID is immutable
    'slug',           // Slug is immutable
    'created_at'      // Creation timestamp is immutable
  ],

  // Protected paths (blocked by middleware)
  protectedPaths: [
    '/prod/',         // Agent source files
    '/.system/',      // System agent directory
    '/.git/',         // Git repository
    '/node_modules/', // Dependencies
    '/config/'        // Configuration files
  ]
};
```

### 11.3 Audit Logging

```javascript
/**
 * Audit Log Service
 * File: /api-server/services/audit-log.service.js
 */
class AuditLogService {
  /**
   * Log agent modification attempt
   * @param {Object} event - Audit event
   */
  async logEvent(event) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      eventType: event.type,
      agentId: event.agentId,
      userId: event.userId || 'anonymous',
      action: event.action,
      result: event.result,  // 'success' | 'blocked' | 'error'
      reason: event.reason,
      metadata: event.metadata || {}
    };

    // Log to console
    console.log('🔍 Audit:', auditEntry);

    // Store in database (future)
    // await AuditLogRepository.create(auditEntry);

    // Send alert if suspicious
    if (event.result === 'blocked') {
      await this.sendSecurityAlert(auditEntry);
    }
  }

  /**
   * Send security alert
   * @param {Object} entry - Audit entry
   */
  async sendSecurityAlert(entry) {
    // TODO: Implement alerting (email, Slack, etc.)
    console.warn('⚠️  Security Alert:', entry);
  }
}

export default new AuditLogService();
```

---

## 12. Implementation Checklist

### 12.1 Phase 1: Core Implementation (Week 1)

**Backend Services**:
- [ ] Create `TierFilterService` with tier filtering logic
- [ ] Create `ProtectionService` with validation logic
- [ ] Create `CacheService` with LRU caching
- [ ] Update `FileSystemAgentRepository` with tier detection
- [ ] Create custom error classes

**Middleware**:
- [ ] Create `validateTierParameter` middleware
- [ ] Create `validateProtection` middleware
- [ ] Create `handleLegacyParameters` middleware
- [ ] Update `errorHandler` middleware

**Routes**:
- [ ] Update `GET /api/agents` with tier filtering
- [ ] Update `GET /api/agents/:slug` with editable flag
- [ ] Update `PATCH /api/agents/:slug` with protection
- [ ] Update `DELETE /api/agents/:slug` with protection
- [ ] Create `GET /api/agents/stats` endpoint

**Testing**:
- [ ] Write unit tests for `TierFilterService`
- [ ] Write unit tests for `ProtectionService`
- [ ] Write unit tests for `CacheService`
- [ ] Write integration tests for API endpoints

### 12.2 Phase 2: Testing & Optimization (Week 2)

**Performance**:
- [ ] Implement cache warming on server startup
- [ ] Add cache invalidation on file changes
- [ ] Optimize database queries (if using PostgreSQL)
- [ ] Run performance benchmarks

**Testing**:
- [ ] Write E2E tests for tier filtering
- [ ] Write E2E tests for protection enforcement
- [ ] Test backward compatibility with legacy params
- [ ] Load testing (100 concurrent requests)

**Documentation**:
- [ ] Update API documentation
- [ ] Create migration guide for frontend
- [ ] Document caching strategy
- [ ] Document error codes

### 12.3 Phase 3: Production Deployment (Week 3)

**Deployment**:
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Monitor cache hit rates
- [ ] Monitor error rates

**Production**:
- [ ] Deploy to production with feature flag
- [ ] Enable feature for subset of users
- [ ] Monitor performance metrics
- [ ] Gradual rollout to all users

**Monitoring**:
- [ ] Set up performance dashboards
- [ ] Set up error alerting
- [ ] Set up cache monitoring
- [ ] Set up audit log monitoring

### 12.4 Success Criteria

**Performance**:
- ✅ Tier 1 queries: <50ms (p95)
- ✅ Cache hit rate: >80%
- ✅ Concurrent requests: 100 req/s
- ✅ No performance regression

**Reliability**:
- ✅ Zero breaking changes for existing clients
- ✅ 100% backward compatibility
- ✅ Error rate <0.1%
- ✅ Uptime >99.9%

**Code Quality**:
- ✅ Test coverage >90%
- ✅ Zero TypeScript errors
- ✅ Zero linting errors
- ✅ All tests passing

---

## Appendix A: API Examples

### Example 1: Get Tier 1 Agents

**Request**:
```bash
curl -X GET "http://localhost:3001/api/agents?tier=1"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "slug": "personal-todos-agent",
      "name": "personal-todos-agent",
      "description": "Manages personal tasks with Fibonacci priorities",
      "tier": 1,
      "visibility": "public",
      "icon_type": "emoji",
      "icon_emoji": "📋",
      "posts_as_self": true,
      "show_in_default_feed": true,
      "tools": ["Read", "Write", "TodoWrite"],
      "color": "#059669",
      "status": "active",
      "model": "sonnet",
      "priority": "P2"
    }
  ],
  "metadata": {
    "tier": "1",
    "tier_counts": {
      "tier1": 8,
      "tier2": 11,
      "total": 19
    },
    "filtered_count": 8,
    "protected": 11,
    "timestamp": "2025-10-19T12:00:00Z",
    "source": "Filesystem"
  }
}
```

### Example 2: Attempt to Modify Tier 2 Agent (Blocked)

**Request**:
```bash
curl -X PATCH "http://localhost:3001/api/agents/meta-agent" \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated description"}'
```

**Response (403 Forbidden)**:
```json
{
  "success": false,
  "error": "Cannot modify protected system agent",
  "message": "System agents (tier 2) are protected from user modification",
  "code": "AGENT_PROTECTED",
  "agent": {
    "slug": "meta-agent",
    "name": "meta-agent",
    "tier": 2,
    "visibility": "protected"
  }
}
```

---

## Appendix B: Migration Path

### Current State (Filesystem)
```
/prod/.claude/agents/
├── personal-todos-agent.md (Tier 1)
├── meeting-prep-agent.md (Tier 1)
├── .system/
│   ├── meta-agent.md (Tier 2)
│   └── page-builder-agent.md (Tier 2)
```

### Future State (PostgreSQL)
```sql
-- system_agent_templates table
SELECT name, tier, visibility FROM system_agent_templates;

-- Result:
-- name                      tier  visibility
-- personal-todos-agent       1    public
-- meeting-prep-agent         1    public
-- meta-agent                 2    protected
-- page-builder-agent         2    protected
```

**Migration Steps**:
1. Extend PostgreSQL schema with tier columns
2. Migrate frontmatter data to database
3. Update repository to use PostgreSQL
4. Enable database caching
5. Monitor performance and errors
6. Remove filesystem fallback

---

**END OF DOCUMENT**

This architecture is production-ready and follows Node.js/Express best practices. Implementation can begin immediately using the provided code examples and file structure.
