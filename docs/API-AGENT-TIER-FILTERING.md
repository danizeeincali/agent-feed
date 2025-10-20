# API Specification: Agent Tier Filtering

## Overview

This specification defines the enhanced filtering capabilities for the `/api/agents` endpoint, introducing tier-based filtering to support progressive disclosure and token efficiency in the agent ecosystem.

## Version

**API Version**: 2.0.0
**Specification Date**: 2025-10-19
**Status**: Design Phase

---

## Background

### Agent Tier System

Agents are classified into two tiers based on their visibility and access patterns:

**Tier 1: User-Facing Agents**
- Primary agents that users interact with directly
- Visible in the main Agent Feed UI
- Post outcomes and updates to the feed
- Examples: `personal-todos-agent`, `meeting-prep-agent`, `page-builder-agent`
- Location: `/workspaces/agent-feed/prod/.claude/agents/*.md` (excluding `.system/`)

**Tier 2: System Agents**
- Internal infrastructure and coordination agents
- Not exposed in the public feed
- Background operations and system management
- Examples: `meta-agent`, `test-integrity-checker`, `production-validator`
- Location: `/workspaces/agent-feed/prod/.claude/agents/.system/*.md`

### Filtering Goals

1. **Token Efficiency**: Load only relevant agents (70-78% reduction)
2. **Progressive Disclosure**: Default to Tier 1, expand to Tier 2 on demand
3. **Backward Compatibility**: Existing clients continue to work
4. **Performance**: Database-layer filtering for scalability

---

## Endpoint Specification

### Base Endpoint

```
GET /api/agents
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `tier` | `string` | No | `"1"` | Agent tier filter: `"1"`, `"2"`, or `"all"` |
| `include_system` | `boolean` | No | `false` | Legacy parameter: if `true`, equivalent to `tier=all` |
| `userId` | `string` | No | `"anonymous"` | User identifier for future personalization |

### Parameter Details

#### `tier` Parameter

**Values:**
- `"1"` - Returns only Tier 1 (user-facing) agents
- `"2"` - Returns only Tier 2 (system) agents
- `"all"` - Returns all agents regardless of tier

**Validation:**
- Case-insensitive
- Invalid values return HTTP 400 with error message
- Coerces numeric types: `1` → `"1"`, `2` → `"2"`

**Examples:**
```
GET /api/agents?tier=1
GET /api/agents?tier=2
GET /api/agents?tier=all
GET /api/agents (defaults to tier=1)
```

#### `include_system` Parameter (Legacy)

**Values:**
- `true` - Include system agents (equivalent to `tier=all`)
- `false` - Exclude system agents (equivalent to `tier=1`)

**Deprecation Notice:**
- Supported for backward compatibility
- `tier` parameter takes precedence if both are provided
- Will be removed in API v3.0.0

---

## Response Schema

### Success Response (HTTP 200)

```typescript
{
  success: true,
  data: Agent[],
  total: number,
  metadata: {
    tier: "1" | "2" | "all",
    tier_counts: {
      tier1: number,
      tier2: number,
      total: number
    },
    filtered_count: number,
    timestamp: string (ISO 8601),
    source: "PostgreSQL" | "SQLite"
  }
}
```

### Agent Object Schema

```typescript
interface Agent {
  id: string;                    // UUID generated from agent name
  slug: string;                  // Filename without .md extension
  name: string;                  // Display name
  description: string;           // Agent description
  tools: string[];               // Array of tool names
  color: string;                 // Hex color code
  avatar_url: string | null;     // Avatar URL (optional)
  status: "active" | "inactive"; // Agent status
  model: "haiku" | "sonnet" | "opus"; // Claude model
  proactive: boolean;            // Proactive execution flag
  priority: string;              // P0-P7 priority level
  usage: string;                 // Usage guidelines
  content: string;               // Full markdown content
  hash: string;                  // SHA-256 content hash
  filePath: string;              // Absolute file path
  lastModified: string;          // ISO 8601 timestamp
  tier: 1 | 2;                   // Agent tier classification
}
```

### Error Response (HTTP 400)

```json
{
  "success": false,
  "error": "Invalid tier parameter",
  "message": "Tier must be '1', '2', or 'all'. Received: 'invalid'",
  "code": "INVALID_TIER"
}
```

### Error Response (HTTP 500)

```json
{
  "success": false,
  "error": "Failed to load agents",
  "message": "Database connection error",
  "code": "DATABASE_ERROR"
}
```

---

## Request Examples

### Example 1: Default Request (Tier 1 Only)

**Request:**
```http
GET /api/agents
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "slug": "personal-todos-agent",
      "name": "Personal Todos Agent",
      "description": "Manages personal tasks with IMPACT priorities",
      "tools": ["Read", "Write", "TodoWrite"],
      "color": "#6366f1",
      "avatar_url": null,
      "status": "active",
      "model": "sonnet",
      "proactive": true,
      "priority": "P2",
      "usage": "PROACTIVE for task management",
      "content": "...",
      "hash": "abc123...",
      "filePath": "/workspaces/agent-feed/prod/.claude/agents/personal-todos-agent.md",
      "lastModified": "2025-10-19T10:30:00.000Z",
      "tier": 1
    }
  ],
  "total": 1,
  "metadata": {
    "tier": "1",
    "tier_counts": {
      "tier1": 15,
      "tier2": 4,
      "total": 19
    },
    "filtered_count": 15,
    "timestamp": "2025-10-19T12:00:00.000Z",
    "source": "PostgreSQL"
  }
}
```

### Example 2: System Agents Only (Tier 2)

**Request:**
```http
GET /api/agents?tier=2
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "slug": "meta-agent",
      "name": "meta-agent",
      "description": "Generates new agent configuration files",
      "tools": ["Bash", "Read", "Write", "Edit"],
      "color": "#374151",
      "avatar_url": null,
      "status": "active",
      "model": "sonnet",
      "proactive": true,
      "priority": "P2",
      "usage": "PROACTIVE when user wants new agent",
      "content": "...",
      "hash": "def456...",
      "filePath": "/workspaces/agent-feed/prod/.claude/agents/.system/meta-agent.md",
      "lastModified": "2025-10-19T09:15:00.000Z",
      "tier": 2
    }
  ],
  "total": 1,
  "metadata": {
    "tier": "2",
    "tier_counts": {
      "tier1": 15,
      "tier2": 4,
      "total": 19
    },
    "filtered_count": 4,
    "timestamp": "2025-10-19T12:00:00.000Z",
    "source": "PostgreSQL"
  }
}
```

### Example 3: All Agents

**Request:**
```http
GET /api/agents?tier=all
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 19,
  "metadata": {
    "tier": "all",
    "tier_counts": {
      "tier1": 15,
      "tier2": 4,
      "total": 19
    },
    "filtered_count": 19,
    "timestamp": "2025-10-19T12:00:00.000Z",
    "source": "PostgreSQL"
  }
}
```

### Example 4: Legacy Include System Parameter

**Request:**
```http
GET /api/agents?include_system=true
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 19,
  "metadata": {
    "tier": "all",
    "tier_counts": {
      "tier1": 15,
      "tier2": 4,
      "total": 19
    },
    "filtered_count": 19,
    "timestamp": "2025-10-19T12:00:00.000Z",
    "source": "PostgreSQL",
    "warning": "include_system parameter is deprecated. Use tier=all instead."
  }
}
```

### Example 5: Invalid Tier Parameter

**Request:**
```http
GET /api/agents?tier=invalid
```

**Response (HTTP 400):**
```json
{
  "success": false,
  "error": "Invalid tier parameter",
  "message": "Tier must be '1', '2', or 'all'. Received: 'invalid'",
  "code": "INVALID_TIER",
  "validValues": ["1", "2", "all"]
}
```

---

## Implementation Details

### Database Layer Filtering

#### Repository Method Signature

```typescript
/**
 * Get all agents with optional tier filtering
 * @param userId - User identifier
 * @param options - Filter options
 * @returns Promise<Agent[]>
 */
async function getAllAgents(
  userId: string = 'anonymous',
  options?: {
    tier?: '1' | '2' | 'all',
    includeSystem?: boolean  // Legacy support
  }
): Promise<Agent[]>
```

#### Tier Classification Logic

Agents are classified based on their file path:

```javascript
/**
 * Determine agent tier from file path
 * @param {string} filePath - Absolute path to agent file
 * @returns {1|2} - Agent tier
 */
function getAgentTier(filePath) {
  // Tier 2: Files in .system/ subdirectory
  if (filePath.includes('/.system/')) {
    return 2;
  }

  // Tier 1: All other agent files
  return 1;
}
```

#### Filtering Implementation

```javascript
async function getAllAgents(userId = 'anonymous', options = {}) {
  try {
    // Get tier filter with backward compatibility
    let tierFilter = options.tier || '1';

    // Legacy parameter support
    if (options.includeSystem === true && !options.tier) {
      tierFilter = 'all';
    }

    // Load all agent files
    const filePaths = await listAgentFiles();

    // Parse all agents
    const allAgents = await Promise.all(
      filePaths.map(async (filePath) => {
        const agent = await readAgentFile(filePath);
        agent.tier = getAgentTier(filePath);
        return agent;
      })
    );

    // Apply tier filtering
    let filteredAgents;
    switch (tierFilter) {
      case '1':
        filteredAgents = allAgents.filter(a => a.tier === 1);
        break;
      case '2':
        filteredAgents = allAgents.filter(a => a.tier === 2);
        break;
      case 'all':
        filteredAgents = allAgents;
        break;
      default:
        throw new Error(`Invalid tier: ${tierFilter}`);
    }

    // Sort by name
    filteredAgents.sort((a, b) => a.name.localeCompare(b.name));

    return filteredAgents;
  } catch (error) {
    console.error('Failed to get agents:', error);
    throw error;
  }
}
```

### Server Route Handler

```javascript
app.get('/api/agents', async (req, res) => {
  try {
    // Extract and validate tier parameter
    const tierParam = (req.query.tier || '1').toString().toLowerCase();
    const includeSystem = req.query.include_system === 'true';
    const userId = req.query.userId || 'anonymous';

    // Validate tier parameter
    const validTiers = ['1', '2', 'all'];
    if (!validTiers.includes(tierParam)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier parameter',
        message: `Tier must be '1', '2', or 'all'. Received: '${tierParam}'`,
        code: 'INVALID_TIER',
        validValues: validTiers
      });
    }

    // Get agents with filtering
    const agents = await dbSelector.getAllAgents(userId, {
      tier: tierParam,
      includeSystem
    });

    // Calculate tier counts
    const allAgents = await dbSelector.getAllAgents(userId, { tier: 'all' });
    const tier1Count = allAgents.filter(a => a.tier === 1).length;
    const tier2Count = allAgents.filter(a => a.tier === 2).length;

    // Build response with metadata
    const response = {
      success: true,
      data: agents,
      total: agents.length,
      metadata: {
        tier: tierParam,
        tier_counts: {
          tier1: tier1Count,
          tier2: tier2Count,
          total: allAgents.length
        },
        filtered_count: agents.length,
        timestamp: new Date().toISOString(),
        source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
      }
    };

    // Add deprecation warning for legacy parameter
    if (includeSystem && !req.query.tier) {
      response.metadata.warning = 'include_system parameter is deprecated. Use tier=all instead.';
    }

    res.json(response);
  } catch (error) {
    console.error('Error loading agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load agents',
      message: error.message,
      code: 'DATABASE_ERROR'
    });
  }
});
```

---

## Backward Compatibility

### Breaking Changes: None

The API maintains full backward compatibility:

1. **Default Behavior**: Existing clients receive Tier 1 agents only (same as before)
2. **Legacy Parameter**: `include_system` parameter continues to work
3. **Response Structure**: Core response structure unchanged (metadata added as enhancement)
4. **Agent Schema**: Agent objects include new `tier` field (non-breaking addition)

### Migration Path

**Phase 1: Introduction (Current)**
- New `tier` parameter available
- Legacy `include_system` parameter supported
- Both parameters work simultaneously

**Phase 2: Deprecation (v2.1.0)**
- `tier` parameter is recommended
- `include_system` marked deprecated in documentation
- Deprecation warnings added to responses

**Phase 3: Removal (v3.0.0)**
- `include_system` parameter removed
- Only `tier` parameter supported
- Major version bump signals breaking change

---

## Performance Considerations

### Database Query Optimization

**Current Implementation:**
- File system reads: O(n) where n = total agents
- In-memory filtering: O(n) comparison operations
- Suitable for < 1000 agents

**Future PostgreSQL Implementation:**
```sql
-- Tier 1 agents only
SELECT * FROM agents WHERE tier = 1 ORDER BY name;

-- Tier 2 agents only
SELECT * FROM agents WHERE tier = 2 ORDER BY name;

-- All agents
SELECT * FROM agents ORDER BY name;
```

**Index Recommendations:**
```sql
CREATE INDEX idx_agents_tier ON agents(tier);
CREATE INDEX idx_agents_tier_name ON agents(tier, name);
```

### Caching Strategy

**Response Caching:**
- Cache key pattern: `agents:tier:{tier}:userId:{userId}`
- TTL: 300 seconds (5 minutes)
- Invalidation: On agent file modification

**Example:**
```javascript
const cacheKey = `agents:tier:${tier}:userId:${userId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const agents = await dbSelector.getAllAgents(userId, { tier });
await redis.setex(cacheKey, 300, JSON.stringify(agents));

return agents;
```

### Performance Metrics

**Target Performance:**
- Tier 1 query: < 50ms (p95)
- Tier 2 query: < 20ms (p95)
- All query: < 100ms (p95)
- Cache hit rate: > 80%

---

## Security Considerations

### Authorization

**Access Control:**
- Tier 1: Public access (no authentication required)
- Tier 2: Restricted access (requires authentication in future)
- Current: Both tiers accessible without auth

**Future Implementation:**
```javascript
// Middleware for tier 2 protection
function requireAuth(req, res, next) {
  const tier = req.query.tier || '1';

  if (tier === '2' && !req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required for system agents',
      code: 'AUTH_REQUIRED'
    });
  }

  next();
}

app.get('/api/agents', requireAuth, async (req, res) => {
  // Handler implementation
});
```

### Rate Limiting

**Recommended Limits:**
- Tier 1 queries: 60 requests/minute
- Tier 2 queries: 30 requests/minute
- All queries: 20 requests/minute

**Implementation:**
```javascript
const rateLimit = require('express-rate-limit');

const tierLimits = {
  '1': rateLimit({ windowMs: 60000, max: 60 }),
  '2': rateLimit({ windowMs: 60000, max: 30 }),
  'all': rateLimit({ windowMs: 60000, max: 20 })
};

app.get('/api/agents', (req, res, next) => {
  const tier = req.query.tier || '1';
  const limiter = tierLimits[tier] || tierLimits['all'];
  limiter(req, res, next);
}, async (req, res) => {
  // Handler implementation
});
```

---

## Testing Requirements

### Unit Tests

**Test Cases:**
1. Default tier filtering (tier=1)
2. Explicit tier 1 filtering
3. Explicit tier 2 filtering
4. All agents filtering (tier=all)
5. Legacy include_system parameter
6. Invalid tier parameter (400 error)
7. Database error handling (500 error)
8. Tier classification logic
9. Metadata calculation
10. Response schema validation

### Integration Tests

**Test Scenarios:**
1. End-to-end request with tier filtering
2. Database selector integration
3. File system agent loading
4. Cache integration (if implemented)
5. Rate limiting behavior
6. Authentication integration (future)

### Performance Tests

**Benchmarks:**
1. Query latency by tier
2. Cache hit rate measurement
3. Concurrent request handling
4. Memory usage profiling
5. Database query performance

---

## Monitoring and Observability

### Metrics to Track

**Request Metrics:**
- `agents.requests.total` (counter) - Labels: tier, status_code
- `agents.request.duration` (histogram) - Labels: tier
- `agents.cache.hits` (counter) - Labels: tier
- `agents.cache.misses` (counter) - Labels: tier

**Business Metrics:**
- `agents.tier1.count` (gauge)
- `agents.tier2.count` (gauge)
- `agents.filtered.count` (histogram) - Labels: tier

### Logging

**Log Events:**
```javascript
// Request logging
logger.info('Agent list requested', {
  tier: req.query.tier,
  userId: req.query.userId,
  filteredCount: agents.length,
  responseTime: duration
});

// Error logging
logger.error('Agent loading failed', {
  tier: req.query.tier,
  error: error.message,
  stack: error.stack
});
```

---

## OpenAPI 3.0 Specification

```yaml
openapi: 3.0.3
info:
  title: Agent Feed API
  version: 2.0.0
  description: API for managing and retrieving agent configurations with tier-based filtering
  contact:
    name: API Support
    email: api@agent-feed.com

servers:
  - url: https://api.agent-feed.com/v2
    description: Production server
  - url: http://localhost:3001
    description: Development server

paths:
  /api/agents:
    get:
      summary: List all agents
      description: Retrieve agents with optional tier-based filtering
      operationId: listAgents
      tags:
        - Agents
      parameters:
        - name: tier
          in: query
          description: Agent tier filter
          required: false
          schema:
            type: string
            enum: ['1', '2', 'all']
            default: '1'
          examples:
            tier1:
              value: '1'
              summary: Tier 1 agents only
            tier2:
              value: '2'
              summary: Tier 2 agents only
            all:
              value: 'all'
              summary: All agents

        - name: include_system
          in: query
          description: 'DEPRECATED: Use tier parameter instead. Include system agents.'
          required: false
          deprecated: true
          schema:
            type: boolean
            default: false

        - name: userId
          in: query
          description: User identifier for personalization
          required: false
          schema:
            type: string
            default: 'anonymous'

      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AgentListResponse'
              examples:
                tier1:
                  summary: Tier 1 agents response
                  value:
                    success: true
                    data:
                      - id: '550e8400-e29b-41d4-a716-446655440001'
                        slug: 'personal-todos-agent'
                        name: 'Personal Todos Agent'
                        description: 'Manages personal tasks'
                        tier: 1
                    total: 15
                    metadata:
                      tier: '1'
                      tier_counts:
                        tier1: 15
                        tier2: 4
                        total: 19
                      filtered_count: 15

        '400':
          description: Invalid request parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                invalidTier:
                  summary: Invalid tier parameter
                  value:
                    success: false
                    error: 'Invalid tier parameter'
                    message: "Tier must be '1', '2', or 'all'. Received: 'invalid'"
                    code: 'INVALID_TIER'
                    validValues: ['1', '2', 'all']

        '500':
          description: Server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                databaseError:
                  summary: Database connection error
                  value:
                    success: false
                    error: 'Failed to load agents'
                    message: 'Database connection error'
                    code: 'DATABASE_ERROR'

components:
  schemas:
    Agent:
      type: object
      required:
        - id
        - slug
        - name
        - description
        - tools
        - tier
      properties:
        id:
          type: string
          format: uuid
          description: Unique agent identifier
        slug:
          type: string
          description: URL-friendly agent identifier
        name:
          type: string
          description: Display name
        description:
          type: string
          description: Agent description
        tools:
          type: array
          items:
            type: string
          description: Available tools
        color:
          type: string
          pattern: '^#[0-9A-Fa-f]{6}$'
          description: Hex color code
        avatar_url:
          type: string
          nullable: true
          format: uri
          description: Avatar URL
        status:
          type: string
          enum: [active, inactive]
          description: Agent status
        model:
          type: string
          enum: [haiku, sonnet, opus]
          description: Claude model
        proactive:
          type: boolean
          description: Proactive execution flag
        priority:
          type: string
          pattern: '^P[0-7]$'
          description: Priority level
        usage:
          type: string
          description: Usage guidelines
        content:
          type: string
          description: Full markdown content
        hash:
          type: string
          description: SHA-256 content hash
        filePath:
          type: string
          description: Absolute file path
        lastModified:
          type: string
          format: date-time
          description: Last modification timestamp
        tier:
          type: integer
          enum: [1, 2]
          description: Agent tier classification

    AgentListResponse:
      type: object
      required:
        - success
        - data
        - total
        - metadata
      properties:
        success:
          type: boolean
          example: true
        data:
          type: array
          items:
            $ref: '#/components/schemas/Agent'
        total:
          type: integer
          description: Number of agents returned
          example: 15
        metadata:
          type: object
          required:
            - tier
            - tier_counts
            - filtered_count
            - timestamp
            - source
          properties:
            tier:
              type: string
              enum: ['1', '2', 'all']
              description: Applied tier filter
            tier_counts:
              type: object
              required:
                - tier1
                - tier2
                - total
              properties:
                tier1:
                  type: integer
                  description: Total Tier 1 agents
                tier2:
                  type: integer
                  description: Total Tier 2 agents
                total:
                  type: integer
                  description: Total agents
            filtered_count:
              type: integer
              description: Number of agents after filtering
            timestamp:
              type: string
              format: date-time
              description: Response generation timestamp
            source:
              type: string
              enum: [PostgreSQL, SQLite]
              description: Database source
            warning:
              type: string
              description: Deprecation or other warnings

    ErrorResponse:
      type: object
      required:
        - success
        - error
        - message
        - code
      properties:
        success:
          type: boolean
          example: false
        error:
          type: string
          description: Error type
        message:
          type: string
          description: Human-readable error message
        code:
          type: string
          description: Machine-readable error code
        validValues:
          type: array
          items:
            type: string
          description: Valid parameter values (for validation errors)

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      description: JWT authentication (future implementation)

tags:
  - name: Agents
    description: Agent management endpoints
```

---

## Migration Checklist

### Implementation Tasks

**Backend:**
- [ ] Update `agent.repository.js` with tier classification logic
- [ ] Add `getAllAgents()` options parameter for tier filtering
- [ ] Implement `getAgentTier()` helper function
- [ ] Update server route handler in `server.js`
- [ ] Add tier parameter validation
- [ ] Add metadata calculation for tier counts
- [ ] Implement deprecation warning for `include_system`

**Database:**
- [ ] Add `tier` column to agents table (PostgreSQL)
- [ ] Create migration script for tier classification
- [ ] Add indexes for tier filtering
- [ ] Update seed data with tier values

**Testing:**
- [ ] Write unit tests for tier classification
- [ ] Write integration tests for API endpoint
- [ ] Add performance benchmarks
- [ ] Create E2E test scenarios

**Documentation:**
- [ ] Update API documentation
- [ ] Create migration guide for clients
- [ ] Document deprecation timeline
- [ ] Add OpenAPI spec to repository

**Frontend:**
- [ ] Update API client to support tier parameter
- [ ] Add UI controls for tier filtering
- [ ] Update agent list components
- [ ] Add tier badges to agent cards

### Rollout Plan

**Week 1: Implementation**
- Backend tier classification
- API endpoint enhancement
- Unit and integration tests

**Week 2: Testing**
- Performance benchmarking
- E2E testing
- Security review

**Week 3: Documentation**
- API documentation update
- Client migration guide
- Internal training

**Week 4: Deployment**
- Staging deployment
- Production deployment
- Monitoring setup

---

## Appendix

### Glossary

- **Tier 1**: User-facing agents visible in the main feed
- **Tier 2**: System agents for internal operations
- **Progressive Disclosure**: Loading information on-demand to reduce initial payload
- **Backward Compatibility**: Maintaining existing API behavior while adding new features

### References

- Agent Repository: `/workspaces/agent-feed/api-server/repositories/agent.repository.js`
- Server Routes: `/workspaces/agent-feed/api-server/server.js`
- Agent Directory: `/workspaces/agent-feed/prod/.claude/agents/`
- System Agents: `/workspaces/agent-feed/prod/.claude/agents/.system/`

### Change Log

**Version 2.0.0 (2025-10-19)**
- Initial specification for tier-based filtering
- Added `tier` query parameter
- Enhanced response metadata
- Maintained backward compatibility

---

## Contact

For questions or feedback regarding this specification:

- **API Design**: Backend Development Team
- **Implementation**: DevOps Team
- **Documentation**: Technical Writing Team

**Last Updated**: 2025-10-19
