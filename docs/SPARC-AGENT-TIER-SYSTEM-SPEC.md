# SPARC Specification: Agent Tier Classification System

**Date**: October 19, 2025
**Methodology**: SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)
**Phase**: SPECIFICATION ONLY
**Version**: 1.0.0
**Status**: Ready for Review

---

## Executive Summary

This specification defines a **two-tier agent classification system** that segregates user-facing agents (T1) from system agents (T2), providing clear UI/UX differentiation, API filtering, and visual hierarchy. The system enables users to focus on relevant agents while protecting system-critical agents from accidental modification.

**Key Objectives**:
1. **User Experience**: Default view shows only T1 (user-facing) agents for reduced cognitive load
2. **System Protection**: T2 (system) agents are read-only in UI, preventing accidental modification
3. **Visual Differentiation**: SVG icons with emoji fallbacks, tier badges, and color coding
4. **API Flexibility**: Query parameters enable filtering by tier (`?tier=1`, `?tier=2`, `?tier=all`)
5. **Immutable Classification**: Tier assignment is permanent and defined in agent frontmatter

**Business Impact**:
- **UX Improvement**: 8 relevant agents vs. 19 total (58% noise reduction)
- **Error Prevention**: Read-only system agents prevent configuration mistakes
- **Developer Experience**: Clear separation of concerns for agent management
- **Scalability**: Foundation for future role-based access control (RBAC)

---

## Table of Contents

1. [Functional Requirements](#1-functional-requirements)
2. [Technical Specifications](#2-technical-specifications)
3. [Data Model & Schema](#3-data-model--schema)
4. [API Contracts](#4-api-contracts)
5. [Frontend Specifications](#5-frontend-specifications)
6. [Icon System](#6-icon-system)
7. [Test Criteria](#7-test-criteria)
8. [Migration Strategy](#8-migration-strategy)
9. [Success Metrics](#9-success-metrics)
10. [Edge Cases & Constraints](#10-edge-cases--constraints)

---

## 1. Functional Requirements

### 1.1 Agent Classification

#### 1.1.1 Tier 1 (User-Facing Agents)
**Definition**: Agents that directly interact with users, accumulate user-specific data, and post to the agent feed.

**T1 Agent Roster** (8 agents):
- `personal-todos-agent` - Task management with Fibonacci priorities
- `meeting-prep-agent` - Pre-meeting preparation and briefings
- `meeting-next-steps-agent` - Post-meeting action items
- `follow-ups-agent` - Stakeholder coordination and tracking
- `get-to-know-you-agent` - User profile and preference learning
- `link-logger-agent` - URL tracking and organization
- `agent-ideas-agent` - Agent capability suggestions
- `agent-feedback-agent` - User feedback collection

**Characteristics**:
- Post to agent feed as themselves
- Accumulate user data over time
- Have dedicated workspaces (`/prod/agent_workspace/{agent-name}/`)
- User-editable configurations
- Visible by default in UI

#### 1.1.2 Tier 2 (System Agents)
**Definition**: Background agents that perform system operations, infrastructure management, or internal coordination without direct user interaction.

**T2 Agent Categories**:

**Meta & Coordination**:
- `meta-agent` - Creates new agents from user descriptions
- `meta-update-agent` - Updates existing agent configurations

**Specialized Architecture** (Phase 4.2):
- `skills-architect-agent` - Creates new skills
- `skills-maintenance-agent` - Updates existing skills
- `agent-architect-agent` - Creates new agents (specialized)
- `agent-maintenance-agent` - Updates existing agents (specialized)
- `learning-optimizer-agent` - Autonomous learning management
- `system-architect-agent` - System-wide architecture

**Page Management**:
- `page-builder-agent` - Dynamic page creation service
- `page-verification-agent` - Page QA and validation
- `dynamic-page-testing-agent` - E2E page testing

**Characteristics**:
- Do NOT post to agent feed (Avi posts their outcomes)
- Perform system-level operations
- Protected from user modification in UI
- Hidden by default in UI (toggle to show)
- Read-only when displayed

#### 1.1.3 Avi (Special Case)
**Classification**: T1 (User-Facing)
**Rationale**: Avi is the chief of staff and primary user interface
**Special Attributes**:
- Always visible and featured prominently
- Coordinates all other agents
- Posts strategic outcomes to agent feed

#### 1.1.4 Hybrid Agents (Future)
**Rule**: Default to T1 unless explicitly system-only
**Example**: An agent that both interacts with users AND performs background tasks → T1

### 1.2 Default View Behavior

**Initial Load**:
- Display only T1 agents (8 agents)
- Hide all T2 agents (11+ agents)
- Show tier toggle UI control
- Persist user preference (localStorage)

**Toggle Interaction**:
```
User clicks "Show System Agents" →
  Display T2 agents with visual differentiation →
  Store preference in localStorage

User clicks "Hide System Agents" →
  Hide T2 agents →
  Store preference in localStorage
```

### 1.3 Visual Differentiation

#### 1.3.1 Tier Badges
**T1 Badge**:
- Text: "User-Facing"
- Color: Blue (`#3B82F6`)
- Icon: User icon or person emoji

**T2 Badge**:
- Text: "System"
- Color: Gray (`#6B7280`)
- Icon: Gear icon or wrench emoji

#### 1.3.2 Agent Icons
**Primary**: SVG icons (custom vector graphics)
**Fallback**: Emoji (Unicode emoji for compatibility)
**Default**: Generated initials in colored circle

**Icon Priority**:
1. SVG file (`/icons/agents/{agent-name}.svg`)
2. Emoji from frontmatter (`icon_emoji: "📋"`)
3. Generated initials (first letter of name)

#### 1.3.3 UI Styling
**T1 Agents**:
- Full color and opacity
- Interactive (clickable, editable)
- Prominent placement

**T2 Agents** (when visible):
- Reduced opacity (70%)
- Grayed out appearance
- Read-only indicator
- "Protected" label

### 1.4 Protection Mechanisms

#### 1.4.1 UI Protection
**T2 Agents**:
- Edit buttons disabled or hidden
- Configuration forms read-only
- Delete operations blocked
- Warning message on click: "System agents are protected from modification"

**Exceptions**:
- Admin users (future RBAC)
- Development mode (with explicit confirmation)

#### 1.4.2 API Protection
**Endpoint Validation**:
```javascript
// PATCH /api/agents/:slug
if (agent.tier === 2 && !req.user.isAdmin) {
  return res.status(403).json({
    error: 'System agents cannot be modified by users'
  });
}
```

### 1.5 Immutability

**Tier Assignment**:
- Defined in agent frontmatter YAML
- Cannot be changed via UI
- Cannot be changed via API (unless admin)
- Requires file system edit + deployment

**Rationale**: Prevents accidental tier changes that could break system operations

---

## 2. Technical Specifications

### 2.1 Frontmatter Schema

#### 2.1.1 New Fields
```yaml
tier: 1|2                          # REQUIRED: Agent tier classification
visibility: public|protected        # REQUIRED: UI visibility status
icon: "/icons/agents/agent-name.svg"  # OPTIONAL: Path to SVG icon
icon_type: svg|emoji               # OPTIONAL: Icon format (default: auto-detect)
icon_emoji: "📋"                   # OPTIONAL: Emoji fallback
posts_as_self: true|false          # REQUIRED: Whether agent posts to feed
show_in_default_feed: true|false   # REQUIRED: Show in default view
```

#### 2.1.2 Complete Example (T1 Agent)
```yaml
---
name: personal-todos-agent
description: Task management with Fibonacci priority system
tier: 1
visibility: public
icon: "/icons/agents/personal-todos-agent.svg"
icon_type: svg
icon_emoji: "📋"
posts_as_self: true
show_in_default_feed: true
tools: [Read, Write, Edit, Glob, Grep, TodoWrite]
color: "#059669"
model: sonnet
proactive: true
priority: P0
---
```

#### 2.1.3 Complete Example (T2 Agent)
```yaml
---
name: meta-agent
description: Generates new agent configurations from user descriptions
tier: 2
visibility: protected
icon: "/icons/agents/meta-agent.svg"
icon_type: svg
icon_emoji: "⚙️"
posts_as_self: false
show_in_default_feed: false
tools: [Bash, Glob, Grep, Read, Edit, Write]
color: "#374151"
model: sonnet
proactive: true
priority: P2
---
```

#### 2.1.4 Validation Rules
```typescript
interface AgentTierSchema {
  tier: 1 | 2;                    // REQUIRED: Must be 1 or 2
  visibility: 'public' | 'protected';  // REQUIRED: Must be public or protected
  icon?: string;                   // OPTIONAL: Must be valid path or empty
  icon_type?: 'svg' | 'emoji';    // OPTIONAL: Auto-detected if not specified
  icon_emoji?: string;             // OPTIONAL: Single emoji character
  posts_as_self: boolean;          // REQUIRED: Must be boolean
  show_in_default_feed: boolean;   // REQUIRED: Must be boolean
}

// Validation constraints
const validation = {
  tier: {
    required: true,
    type: 'number',
    enum: [1, 2],
    errorMessage: 'Tier must be 1 (user-facing) or 2 (system)'
  },
  visibility: {
    required: true,
    type: 'string',
    enum: ['public', 'protected'],
    errorMessage: 'Visibility must be public or protected'
  },
  posts_as_self: {
    required: true,
    type: 'boolean',
    errorMessage: 'posts_as_self must be true or false'
  },
  show_in_default_feed: {
    required: true,
    type: 'boolean',
    errorMessage: 'show_in_default_feed must be true or false'
  }
};
```

### 2.2 Backend Repository Changes

#### 2.2.1 Agent Repository Extensions
**File**: `/api-server/repositories/agent.repository.js`

**New Functions**:
```javascript
/**
 * Get agents by tier
 * @param {number} tier - Tier number (1 or 2)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Filtered agents
 */
export async function getAgentsByTier(tier, userId = 'anonymous') {
  const agents = await getAllAgents(userId);
  return agents.filter(agent => agent.tier === tier);
}

/**
 * Get user-facing agents (tier 1)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - T1 agents
 */
export async function getUserFacingAgents(userId = 'anonymous') {
  return getAgentsByTier(1, userId);
}

/**
 * Get system agents (tier 2)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - T2 agents
 */
export async function getSystemAgents(userId = 'anonymous') {
  return getAgentsByTier(2, userId);
}

/**
 * Validate agent tier modification
 * @param {Object} agent - Agent object
 * @param {Object} user - User object
 * @returns {boolean} - Whether modification is allowed
 */
export function canModifyAgent(agent, user) {
  // T1 agents: Always editable by users
  if (agent.tier === 1) return true;

  // T2 agents: Only editable by admins
  if (agent.tier === 2) {
    return user && user.isAdmin === true;
  }

  return false;
}
```

#### 2.2.2 Frontmatter Parsing Extensions
**Function**: `readAgentFile(filePath)`

**Add Tier Fields**:
```javascript
const agent = {
  // ... existing fields
  tier: frontmatter.tier || 1,  // Default to T1 for backwards compatibility
  visibility: frontmatter.visibility || 'public',
  icon: frontmatter.icon || null,
  icon_type: frontmatter.icon_type || detectIconType(frontmatter.icon),
  icon_emoji: frontmatter.icon_emoji || generateDefaultEmoji(frontmatter.name),
  posts_as_self: frontmatter.posts_as_self !== false,  // Default true
  show_in_default_feed: frontmatter.show_in_default_feed !== false  // Default true
};
```

**Helper Functions**:
```javascript
/**
 * Detect icon type from path
 */
function detectIconType(iconPath) {
  if (!iconPath) return 'emoji';
  if (iconPath.endsWith('.svg')) return 'svg';
  return 'emoji';
}

/**
 * Generate default emoji based on agent name
 */
function generateDefaultEmoji(agentName) {
  const emojiMap = {
    'personal-todos': '📋',
    'meeting-prep': '📅',
    'meeting-next-steps': '✅',
    'follow-ups': '🔔',
    'get-to-know-you': '👋',
    'link-logger': '🔗',
    'agent-ideas': '💡',
    'agent-feedback': '💬',
    'meta': '⚙️',
    'page-builder': '🏗️',
    'skills-architect': '🎨',
    'learning-optimizer': '🧠'
  };

  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (agentName.includes(key)) return emoji;
  }

  return '🤖';  // Default robot emoji
}
```

### 2.3 Database Schema

**Note**: Current system uses filesystem-based agents (markdown files). Database storage is optional for future PostgreSQL migration.

#### 2.3.1 PostgreSQL Schema (Future)
```sql
-- Add tier classification columns to agents table
ALTER TABLE agents
ADD COLUMN tier INTEGER NOT NULL DEFAULT 1 CHECK (tier IN (1, 2)),
ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'protected')),
ADD COLUMN icon TEXT,
ADD COLUMN icon_type VARCHAR(10) CHECK (icon_type IN ('svg', 'emoji')),
ADD COLUMN icon_emoji VARCHAR(10),
ADD COLUMN posts_as_self BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN show_in_default_feed BOOLEAN NOT NULL DEFAULT TRUE;

-- Create index for tier filtering
CREATE INDEX idx_agents_tier ON agents(tier);

-- Create index for visibility filtering
CREATE INDEX idx_agents_visibility ON agents(visibility);

-- Create composite index for tier + visibility
CREATE INDEX idx_agents_tier_visibility ON agents(tier, visibility);
```

#### 2.3.2 Migration Script
```sql
-- Migrate existing agents to T1 (user-facing) by default
UPDATE agents
SET tier = 1,
    visibility = 'public',
    posts_as_self = TRUE,
    show_in_default_feed = TRUE
WHERE tier IS NULL;

-- Update known system agents to T2
UPDATE agents
SET tier = 2,
    visibility = 'protected',
    posts_as_self = FALSE,
    show_in_default_feed = FALSE
WHERE name IN (
  'meta-agent',
  'meta-update-agent',
  'page-builder-agent',
  'page-verification-agent',
  'dynamic-page-testing-agent',
  'skills-architect-agent',
  'skills-maintenance-agent',
  'agent-architect-agent',
  'agent-maintenance-agent',
  'learning-optimizer-agent',
  'system-architect-agent'
);
```

---

## 3. Data Model & Schema

### 3.1 TypeScript Interface

```typescript
/**
 * Agent Tier Classification
 */
export enum AgentTier {
  USER_FACING = 1,
  SYSTEM = 2
}

/**
 * Agent Visibility Status
 */
export enum AgentVisibility {
  PUBLIC = 'public',
  PROTECTED = 'protected'
}

/**
 * Agent Icon Type
 */
export enum IconType {
  SVG = 'svg',
  EMOJI = 'emoji'
}

/**
 * Complete Agent Interface with Tier System
 */
export interface Agent {
  // Core fields (existing)
  id: string;
  slug: string;
  name: string;
  description: string;
  tools: string[];
  color: string;
  avatar_url?: string;
  status: 'active' | 'inactive' | 'error';
  model: 'haiku' | 'sonnet' | 'opus';
  proactive: boolean;
  priority: string;  // P0-P7
  usage: string;
  content: string;
  hash: string;
  filePath: string;
  lastModified: string;

  // Tier system fields (new)
  tier: AgentTier;                    // 1 or 2
  visibility: AgentVisibility;         // public or protected
  icon?: string;                       // Path to SVG or null
  icon_type?: IconType;                // svg or emoji
  icon_emoji?: string;                 // Single emoji character
  posts_as_self: boolean;              // Whether agent posts to feed
  show_in_default_feed: boolean;       // Show in default view
}

/**
 * Agent Filter Options
 */
export interface AgentFilterOptions {
  tier?: AgentTier | 'all';           // Filter by tier (1, 2, or 'all')
  visibility?: AgentVisibility;        // Filter by visibility
  show_system?: boolean;               // Include system agents
  search?: string;                     // Search query
}

/**
 * Agent Statistics
 */
export interface AgentStats {
  total: number;
  tier1: number;  // User-facing count
  tier2: number;  // System count
  active: number;
  inactive: number;
  protected: number;
}
```

### 3.2 API Response Types

```typescript
/**
 * Agent List Response
 */
export interface AgentListResponse {
  success: boolean;
  data: Agent[];
  stats: AgentStats;
  filter: {
    tier?: number | 'all';
    visibility?: string;
    show_system?: boolean;
  };
  timestamp: string;
}

/**
 * Agent Detail Response
 */
export interface AgentDetailResponse {
  success: boolean;
  data: Agent;
  editable: boolean;  // Whether user can edit this agent
  timestamp: string;
}

/**
 * Tier Toggle Response
 */
export interface TierToggleResponse {
  success: boolean;
  showing_system: boolean;
  agent_count: number;
  timestamp: string;
}
```

---

## 4. API Contracts

### 4.1 GET /api/agents

#### 4.1.1 Query Parameters
```
GET /api/agents?tier={1|2|all}&show_system={true|false}
```

**Parameters**:
- `tier` (optional): Filter by tier
  - `1` - Only T1 (user-facing) agents
  - `2` - Only T2 (system) agents
  - `all` - All agents (default)
- `show_system` (optional): Legacy parameter for backwards compatibility
  - `true` - Include T2 agents
  - `false` - Exclude T2 agents (default)

**Examples**:
```bash
# Get only user-facing agents (default)
GET /api/agents?tier=1

# Get only system agents
GET /api/agents?tier=2

# Get all agents
GET /api/agents?tier=all

# Legacy: Hide system agents
GET /api/agents?show_system=false
```

#### 4.1.2 Response Schema
```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "slug": "personal-todos-agent",
      "name": "personal-todos-agent",
      "description": "Task management with Fibonacci priorities",
      "tier": 1,
      "visibility": "public",
      "icon": "/icons/agents/personal-todos-agent.svg",
      "icon_type": "svg",
      "icon_emoji": "📋",
      "posts_as_self": true,
      "show_in_default_feed": true,
      "color": "#059669",
      "status": "active",
      "model": "sonnet",
      "tools": ["Read", "Write", "TodoWrite"],
      "lastModified": "2025-10-19T10:00:00Z"
    }
  ],
  "stats": {
    "total": 19,
    "tier1": 8,
    "tier2": 11,
    "active": 19,
    "inactive": 0,
    "protected": 11
  },
  "filter": {
    "tier": 1,
    "show_system": false
  },
  "timestamp": "2025-10-19T10:30:00Z"
}
```

#### 4.1.3 Implementation
```javascript
// /api-server/server.js or routes/agents.js

app.get('/api/agents', async (req, res) => {
  try {
    const { tier = 'all', show_system = 'false' } = req.query;
    const userId = req.user?.id || 'anonymous';

    // Get all agents
    let agents = await getAllAgents(userId);

    // Apply tier filter
    if (tier === '1') {
      agents = agents.filter(agent => agent.tier === 1);
    } else if (tier === '2') {
      agents = agents.filter(agent => agent.tier === 2);
    }
    // tier === 'all' - no filtering

    // Legacy show_system parameter
    if (show_system === 'false' && tier === 'all') {
      agents = agents.filter(agent => agent.tier === 1);
    }

    // Calculate statistics
    const allAgents = await getAllAgents(userId);
    const stats = {
      total: allAgents.length,
      tier1: allAgents.filter(a => a.tier === 1).length,
      tier2: allAgents.filter(a => a.tier === 2).length,
      active: allAgents.filter(a => a.status === 'active').length,
      inactive: allAgents.filter(a => a.status === 'inactive').length,
      protected: allAgents.filter(a => a.visibility === 'protected').length
    };

    res.json({
      success: true,
      data: agents,
      stats,
      filter: { tier, show_system: show_system === 'true' },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

### 4.2 GET /api/agents/:slug

#### 4.2.1 Request
```
GET /api/agents/personal-todos-agent
```

#### 4.2.2 Response Schema
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "slug": "personal-todos-agent",
    "name": "personal-todos-agent",
    "tier": 1,
    "visibility": "public",
    "icon": "/icons/agents/personal-todos-agent.svg",
    "icon_emoji": "📋",
    "editable": true,
    "...": "...other fields..."
  },
  "editable": true,
  "timestamp": "2025-10-19T10:30:00Z"
}
```

**editable field logic**:
```javascript
const editable = agent.tier === 1 || (user && user.isAdmin);
```

### 4.3 PATCH /api/agents/:slug

#### 4.3.1 Protection Logic
```javascript
app.patch('/api/agents/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const agent = await getAgentBySlug(slug);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Protection check
    const user = req.user || { isAdmin: false };
    if (!canModifyAgent(agent, user)) {
      return res.status(403).json({
        success: false,
        error: 'System agents (tier 2) cannot be modified by users',
        tier: agent.tier,
        visibility: agent.visibility
      });
    }

    // Tier immutability check
    if (req.body.tier && req.body.tier !== agent.tier) {
      if (!user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Agent tier classification is immutable'
        });
      }
    }

    // Proceed with update
    // ... update logic
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### 4.4 GET /api/agents/stats

#### 4.4.1 New Endpoint
```
GET /api/agents/stats
```

#### 4.4.2 Response
```json
{
  "success": true,
  "stats": {
    "total": 19,
    "tier1": 8,
    "tier2": 11,
    "active": 19,
    "inactive": 0,
    "protected": 11,
    "by_tier": {
      "1": {
        "count": 8,
        "active": 8,
        "inactive": 0
      },
      "2": {
        "count": 11,
        "active": 11,
        "inactive": 0
      }
    }
  },
  "timestamp": "2025-10-19T10:30:00Z"
}
```

---

## 5. Frontend Specifications

### 5.1 Component Structure

```
/frontend/src/components/
├── agents/
│   ├── AgentCard.tsx              # Individual agent card with tier badge
│   ├── AgentList.tsx              # Agent grid/list with tier filtering
│   ├── AgentTierBadge.tsx         # Tier badge component (new)
│   ├── AgentTierToggle.tsx        # Show/hide system agents toggle (new)
│   ├── AgentIcon.tsx              # SVG/emoji icon renderer (new)
│   └── ProtectedAgentIndicator.tsx # Read-only indicator (new)
└── RealAgentManager.tsx            # Main agent manager (existing)
```

### 5.2 AgentTierBadge Component

```typescript
// /frontend/src/components/agents/AgentTierBadge.tsx

import React from 'react';
import { User, Settings } from 'lucide-react';

interface AgentTierBadgeProps {
  tier: 1 | 2;
  className?: string;
}

export const AgentTierBadge: React.FC<AgentTierBadgeProps> = ({ tier, className = '' }) => {
  if (tier === 1) {
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 ${className}`}>
        <User className="w-3 h-3 mr-1" />
        User-Facing
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 ${className}`}>
      <Settings className="w-3 h-3 mr-1" />
      System
    </span>
  );
};
```

### 5.3 AgentTierToggle Component

```typescript
// /frontend/src/components/agents/AgentTierToggle.tsx

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AgentTierToggleProps {
  showSystemAgents: boolean;
  onToggle: (show: boolean) => void;
  systemAgentCount: number;
}

export const AgentTierToggle: React.FC<AgentTierToggleProps> = ({
  showSystemAgents,
  onToggle,
  systemAgentCount
}) => {
  return (
    <button
      onClick={() => onToggle(!showSystemAgents)}
      className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      {showSystemAgents ? (
        <>
          <EyeOff className="w-4 h-4 mr-2" />
          Hide System Agents ({systemAgentCount})
        </>
      ) : (
        <>
          <Eye className="w-4 h-4 mr-2" />
          Show System Agents ({systemAgentCount})
        </>
      )}
    </button>
  );
};
```

### 5.4 AgentIcon Component

```typescript
// /frontend/src/components/agents/AgentIcon.tsx

import React from 'react';

interface AgentIconProps {
  agent: {
    name: string;
    icon?: string;
    icon_type?: 'svg' | 'emoji';
    icon_emoji?: string;
    color?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AgentIcon: React.FC<AgentIconProps> = ({
  agent,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl'
  };

  // SVG icon (priority 1)
  if (agent.icon && agent.icon_type === 'svg') {
    return (
      <img
        src={agent.icon}
        alt={`${agent.name} icon`}
        className={`${sizeClasses[size]} rounded-full ${className}`}
        onError={(e) => {
          // Fallback to emoji if SVG fails to load
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  // Emoji icon (priority 2)
  if (agent.icon_emoji) {
    return (
      <div
        className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-gray-100 ${className}`}
      >
        <span className="text-2xl">{agent.icon_emoji}</span>
      </div>
    );
  }

  // Generated initials (fallback)
  const initials = agent.name.charAt(0).toUpperCase();
  const bgColor = agent.color || '#6366f1';

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full text-white font-semibold ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
};
```

### 5.5 ProtectedAgentIndicator Component

```typescript
// /frontend/src/components/agents/ProtectedAgentIndicator.tsx

import React from 'react';
import { Lock } from 'lucide-react';

interface ProtectedAgentIndicatorProps {
  visibility: 'public' | 'protected';
  className?: string;
}

export const ProtectedAgentIndicator: React.FC<ProtectedAgentIndicatorProps> = ({
  visibility,
  className = ''
}) => {
  if (visibility !== 'protected') return null;

  return (
    <div className={`flex items-center text-xs text-gray-600 ${className}`}>
      <Lock className="w-3 h-3 mr-1" />
      <span>Protected (Read-Only)</span>
    </div>
  );
};
```

### 5.6 RealAgentManager Updates

```typescript
// /frontend/src/components/RealAgentManager.tsx

import React, { useState, useEffect } from 'react';
import { AgentTierBadge } from './agents/AgentTierBadge';
import { AgentTierToggle } from './agents/AgentTierToggle';
import { AgentIcon } from './agents/AgentIcon';
import { ProtectedAgentIndicator } from './agents/ProtectedAgentIndicator';

const RealAgentManager: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showSystemAgents, setShowSystemAgents] = useState(false);
  const [stats, setStats] = useState<AgentStats | null>(null);

  // Load preference from localStorage
  useEffect(() => {
    const savedPreference = localStorage.getItem('showSystemAgents');
    if (savedPreference !== null) {
      setShowSystemAgents(savedPreference === 'true');
    }
  }, []);

  // Fetch agents with tier filtering
  const fetchAgents = async () => {
    const tier = showSystemAgents ? 'all' : '1';
    const response = await apiService.getAgents({ tier });
    setAgents(response.data);
    setStats(response.stats);
  };

  // Handle tier toggle
  const handleTierToggle = (show: boolean) => {
    setShowSystemAgents(show);
    localStorage.setItem('showSystemAgents', String(show));
  };

  useEffect(() => {
    fetchAgents();
  }, [showSystemAgents]);

  return (
    <div className="p-6">
      {/* Header with Tier Toggle */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Agent Manager</h2>
          <p className="text-gray-600">
            Showing {agents.length} of {stats?.total || 0} agents
          </p>
        </div>

        <AgentTierToggle
          showSystemAgents={showSystemAgents}
          onToggle={handleTierToggle}
          systemAgentCount={stats?.tier2 || 0}
        />
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <div
            key={agent.id}
            className={`p-4 border rounded-lg ${
              agent.tier === 2 ? 'opacity-70 bg-gray-50' : 'bg-white'
            }`}
          >
            {/* Icon + Name */}
            <div className="flex items-center mb-3">
              <AgentIcon agent={agent} size="md" />
              <div className="ml-3 flex-1">
                <h3 className="font-semibold">{agent.name}</h3>
                <p className="text-sm text-gray-600">{agent.description}</p>
              </div>
            </div>

            {/* Tier Badge + Protection Indicator */}
            <div className="flex items-center justify-between">
              <AgentTierBadge tier={agent.tier} />
              <ProtectedAgentIndicator visibility={agent.visibility} />
            </div>

            {/* Edit Button (disabled for T2) */}
            <button
              disabled={agent.tier === 2}
              className={`mt-3 w-full px-4 py-2 rounded-lg ${
                agent.tier === 2
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {agent.tier === 2 ? 'Protected' : 'Edit'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 5.7 State Management

#### 5.7.1 localStorage Keys
```typescript
// Persist user preferences
const STORAGE_KEYS = {
  SHOW_SYSTEM_AGENTS: 'showSystemAgents',  // true | false
  AGENT_VIEW_MODE: 'agentViewMode',        // grid | list
  AGENT_SORT_BY: 'agentSortBy'             // name | tier | status
};
```

#### 5.7.2 Initial State
```typescript
const [showSystemAgents, setShowSystemAgents] = useState(() => {
  const saved = localStorage.getItem(STORAGE_KEYS.SHOW_SYSTEM_AGENTS);
  return saved === 'true';  // Default: false (hide system agents)
});
```

---

## 6. Icon System

### 6.1 Directory Structure

```
/frontend/public/icons/agents/
├── personal-todos-agent.svg
├── meeting-prep-agent.svg
├── meeting-next-steps-agent.svg
├── follow-ups-agent.svg
├── get-to-know-you-agent.svg
├── link-logger-agent.svg
├── agent-ideas-agent.svg
├── agent-feedback-agent.svg
├── meta-agent.svg
├── skills-architect-agent.svg
├── page-builder-agent.svg
└── ... (other agents)
```

### 6.2 SVG Icon Requirements

**Specifications**:
- **Format**: SVG (Scalable Vector Graphics)
- **Size**: 64x64px viewBox
- **Colors**: Single color or gradient
- **Stroke**: 2px stroke width (if applicable)
- **Background**: Transparent
- **File Size**: < 10KB recommended

**Example SVG**:
```svg
<!-- /frontend/public/icons/agents/personal-todos-agent.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="12" fill="#059669"/>
  <path d="M20 24L28 32L44 16" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="16" y="36" width="32" height="4" rx="2" fill="white"/>
  <rect x="16" y="44" width="24" height="4" rx="2" fill="white"/>
</svg>
```

### 6.3 Emoji Fallbacks

**T1 Agent Emojis**:
```typescript
const T1_AGENT_EMOJIS = {
  'personal-todos-agent': '📋',
  'meeting-prep-agent': '📅',
  'meeting-next-steps-agent': '✅',
  'follow-ups-agent': '🔔',
  'get-to-know-you-agent': '👋',
  'link-logger-agent': '🔗',
  'agent-ideas-agent': '💡',
  'agent-feedback-agent': '💬'
};
```

**T2 Agent Emojis**:
```typescript
const T2_AGENT_EMOJIS = {
  'meta-agent': '⚙️',
  'meta-update-agent': '🔄',
  'skills-architect-agent': '🎨',
  'skills-maintenance-agent': '🔧',
  'agent-architect-agent': '🏗️',
  'agent-maintenance-agent': '🛠️',
  'learning-optimizer-agent': '🧠',
  'system-architect-agent': '🏛️',
  'page-builder-agent': '📄',
  'page-verification-agent': '✓',
  'dynamic-page-testing-agent': '🧪'
};
```

### 6.4 Icon Loading Strategy

**Priority Order**:
1. Load SVG from `/icons/agents/{agent-name}.svg`
2. If SVG fails or missing, use `icon_emoji` from frontmatter
3. If no emoji, generate initials with colored background

**Implementation**:
```typescript
const loadIcon = (agent: Agent): React.ReactNode => {
  // Priority 1: SVG
  if (agent.icon && agent.icon_type === 'svg') {
    return (
      <img
        src={agent.icon}
        alt={agent.name}
        onError={(e) => loadFallback(agent, e.currentTarget)}
      />
    );
  }

  // Priority 2: Emoji
  if (agent.icon_emoji) {
    return <span className="text-2xl">{agent.icon_emoji}</span>;
  }

  // Priority 3: Initials
  return <div style={{ backgroundColor: agent.color }}>{agent.name[0]}</div>;
};
```

---

## 7. Test Criteria

### 7.1 Unit Tests

#### 7.1.1 Backend Tests
**File**: `/tests/unit/agent-tier-system.test.js`

```javascript
describe('Agent Tier System', () => {
  describe('getAgentsByTier', () => {
    it('should return only T1 agents when tier=1', async () => {
      const agents = await getAgentsByTier(1);
      expect(agents).toHaveLength(8);
      expect(agents.every(a => a.tier === 1)).toBe(true);
    });

    it('should return only T2 agents when tier=2', async () => {
      const agents = await getAgentsByTier(2);
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.every(a => a.tier === 2)).toBe(true);
    });
  });

  describe('canModifyAgent', () => {
    it('should allow users to modify T1 agents', () => {
      const agent = { tier: 1 };
      const user = { isAdmin: false };
      expect(canModifyAgent(agent, user)).toBe(true);
    });

    it('should prevent users from modifying T2 agents', () => {
      const agent = { tier: 2 };
      const user = { isAdmin: false };
      expect(canModifyAgent(agent, user)).toBe(false);
    });

    it('should allow admins to modify T2 agents', () => {
      const agent = { tier: 2 };
      const user = { isAdmin: true };
      expect(canModifyAgent(agent, user)).toBe(true);
    });
  });

  describe('Frontmatter Parsing', () => {
    it('should parse tier field correctly', async () => {
      const agent = await readAgentFile('/path/to/agent.md');
      expect(agent.tier).toBe(1);
    });

    it('should default to tier 1 if not specified', async () => {
      // Test with agent missing tier field
      const agent = await readAgentFile('/path/to/legacy-agent.md');
      expect(agent.tier).toBe(1);
    });

    it('should parse icon fields correctly', async () => {
      const agent = await readAgentFile('/path/to/agent.md');
      expect(agent.icon).toBe('/icons/agents/agent-name.svg');
      expect(agent.icon_emoji).toBe('📋');
    });
  });
});
```

#### 7.1.2 Frontend Tests
**File**: `/frontend/src/tests/unit/agent-tier-system.test.tsx`

```typescript
describe('Agent Tier Components', () => {
  describe('AgentTierBadge', () => {
    it('should render T1 badge correctly', () => {
      const { getByText } = render(<AgentTierBadge tier={1} />);
      expect(getByText('User-Facing')).toBeInTheDocument();
    });

    it('should render T2 badge correctly', () => {
      const { getByText } = render(<AgentTierBadge tier={2} />);
      expect(getByText('System')).toBeInTheDocument();
    });
  });

  describe('AgentTierToggle', () => {
    it('should show correct button text when system agents hidden', () => {
      const { getByText } = render(
        <AgentTierToggle showSystemAgents={false} onToggle={() => {}} systemAgentCount={11} />
      );
      expect(getByText(/Show System Agents/)).toBeInTheDocument();
    });

    it('should call onToggle when clicked', () => {
      const onToggle = jest.fn();
      const { getByRole } = render(
        <AgentTierToggle showSystemAgents={false} onToggle={onToggle} systemAgentCount={11} />
      );
      fireEvent.click(getByRole('button'));
      expect(onToggle).toHaveBeenCalledWith(true);
    });
  });

  describe('AgentIcon', () => {
    it('should render SVG icon when available', () => {
      const agent = {
        name: 'test',
        icon: '/icons/test.svg',
        icon_type: 'svg' as const
      };
      const { getByRole } = render(<AgentIcon agent={agent} />);
      expect(getByRole('img')).toHaveAttribute('src', '/icons/test.svg');
    });

    it('should render emoji when SVG not available', () => {
      const agent = {
        name: 'test',
        icon_emoji: '📋'
      };
      const { getByText } = render(<AgentIcon agent={agent} />);
      expect(getByText('📋')).toBeInTheDocument();
    });
  });
});
```

### 7.2 Integration Tests

**File**: `/tests/integration/agent-tier-api.test.js`

```javascript
describe('Agent Tier API Integration', () => {
  describe('GET /api/agents', () => {
    it('should return only T1 agents by default', async () => {
      const response = await request(app).get('/api/agents');
      expect(response.status).toBe(200);
      expect(response.body.data.every(a => a.tier === 1)).toBe(true);
    });

    it('should filter by tier=1', async () => {
      const response = await request(app).get('/api/agents?tier=1');
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(8);
    });

    it('should filter by tier=2', async () => {
      const response = await request(app).get('/api/agents?tier=2');
      expect(response.status).toBe(200);
      expect(response.body.data.every(a => a.tier === 2)).toBe(true);
    });

    it('should return all agents when tier=all', async () => {
      const response = await request(app).get('/api/agents?tier=all');
      expect(response.status).toBe(200);
      expect(response.body.stats.total).toBeGreaterThan(8);
    });
  });

  describe('PATCH /api/agents/:slug', () => {
    it('should allow editing T1 agents', async () => {
      const response = await request(app)
        .patch('/api/agents/personal-todos-agent')
        .send({ description: 'Updated description' });
      expect(response.status).toBe(200);
    });

    it('should prevent editing T2 agents without admin', async () => {
      const response = await request(app)
        .patch('/api/agents/meta-agent')
        .send({ description: 'Updated description' });
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('System agents');
    });

    it('should prevent tier changes', async () => {
      const response = await request(app)
        .patch('/api/agents/personal-todos-agent')
        .send({ tier: 2 });
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('immutable');
    });
  });
});
```

### 7.3 E2E Tests

**File**: `/tests/e2e/agent-tier-system.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Agent Tier System E2E', () => {
  test('should show only T1 agents by default', async ({ page }) => {
    await page.goto('/agents');

    const agentCards = page.locator('[data-testid="agent-card"]');
    const count = await agentCards.count();

    expect(count).toBe(8);  // Only T1 agents
  });

  test('should toggle system agents visibility', async ({ page }) => {
    await page.goto('/agents');

    // Initially hidden
    let agentCards = page.locator('[data-testid="agent-card"]');
    expect(await agentCards.count()).toBe(8);

    // Click toggle
    await page.click('button:has-text("Show System Agents")');

    // Now visible
    agentCards = page.locator('[data-testid="agent-card"]');
    expect(await agentCards.count()).toBeGreaterThan(8);
  });

  test('should persist toggle preference', async ({ page, context }) => {
    await page.goto('/agents');

    // Toggle on
    await page.click('button:has-text("Show System Agents")');

    // Reload page
    await page.reload();

    // Should still be showing system agents
    const agentCards = page.locator('[data-testid="agent-card"]');
    expect(await agentCards.count()).toBeGreaterThan(8);
  });

  test('should disable edit button for T2 agents', async ({ page }) => {
    await page.goto('/agents');
    await page.click('button:has-text("Show System Agents")');

    // Find a T2 agent card
    const systemAgentCard = page.locator('[data-testid="agent-card"]').filter({
      has: page.locator('text=System')
    }).first();

    // Edit button should be disabled
    const editButton = systemAgentCard.locator('button:has-text("Edit")');
    await expect(editButton).toBeDisabled();
  });

  test('should show tier badges correctly', async ({ page }) => {
    await page.goto('/agents');
    await page.click('button:has-text("Show System Agents")');

    // T1 badge
    const t1Badge = page.locator('text=User-Facing').first();
    await expect(t1Badge).toBeVisible();

    // T2 badge
    const t2Badge = page.locator('text=System').first();
    await expect(t2Badge).toBeVisible();
  });
});
```

### 7.4 Test Coverage Goals

**Target Coverage**:
- **Unit Tests**: 90%+ coverage
- **Integration Tests**: 85%+ coverage
- **E2E Tests**: Critical user flows only

**Critical Paths**:
1. Default view shows only T1 agents
2. Toggle reveals T2 agents
3. T2 agents are read-only
4. API filtering works correctly
5. Tier badges display correctly
6. Icons load with fallbacks

---

## 8. Migration Strategy

### 8.1 Backward Compatibility

**Principle**: All changes must be backward compatible. Existing functionality must not break.

**Compatibility Checks**:
- [ ] Agents without `tier` field default to T1
- [ ] API without `?tier` parameter defaults to T1 only
- [ ] Frontend without localStorage defaults to hiding T2
- [ ] Existing API clients continue to work

### 8.2 Migration Steps

#### Phase 1: Backend Foundation (Week 1)
**Tasks**:
1. Add tier fields to agent repository parser
2. Update `readAgentFile()` to extract tier fields
3. Implement `getAgentsByTier()` functions
4. Add default values for backward compatibility
5. Unit test backend changes

**Validation**:
- [ ] All existing agents load correctly
- [ ] Default tier = 1 for agents without field
- [ ] API returns correct data

#### Phase 2: Agent Frontmatter Updates (Week 1)
**Tasks**:
1. Update T1 agent markdown files (8 agents)
2. Update T2 agent markdown files (11+ agents)
3. Add icon paths and emojis
4. Validate YAML syntax

**Script**:
```bash
#!/bin/bash
# /scripts/update-agent-frontmatter.sh

T1_AGENTS=("personal-todos-agent" "meeting-prep-agent" "meeting-next-steps-agent" "follow-ups-agent" "get-to-know-you-agent" "link-logger-agent" "agent-ideas-agent" "agent-feedback-agent")

for agent in "${T1_AGENTS[@]}"; do
  echo "Updating $agent to T1..."
  # Add tier fields to frontmatter
done

T2_AGENTS=("meta-agent" "meta-update-agent" "page-builder-agent" "skills-architect-agent" "agent-architect-agent" "learning-optimizer-agent" "system-architect-agent")

for agent in "${T2_AGENTS[@]}"; do
  echo "Updating $agent to T2..."
  # Add tier fields to frontmatter
done
```

#### Phase 3: API Implementation (Week 2)
**Tasks**:
1. Add `?tier` query parameter to GET /api/agents
2. Implement protection logic in PATCH /api/agents/:slug
3. Add GET /api/agents/stats endpoint
4. Integration tests for API

**Validation**:
- [ ] API returns filtered agents correctly
- [ ] Protection prevents T2 modifications
- [ ] Stats endpoint works

#### Phase 4: Frontend Components (Week 2)
**Tasks**:
1. Create AgentTierBadge component
2. Create AgentTierToggle component
3. Create AgentIcon component
4. Create ProtectedAgentIndicator component
5. Unit tests for components

**Validation**:
- [ ] Components render correctly
- [ ] Props validation works
- [ ] Accessibility standards met

#### Phase 5: Frontend Integration (Week 3)
**Tasks**:
1. Update RealAgentManager with tier filtering
2. Add localStorage persistence
3. Update agent cards with tier badges
4. Implement icon loading with fallbacks
5. E2E tests

**Validation**:
- [ ] Default view shows only T1
- [ ] Toggle works correctly
- [ ] Preference persists
- [ ] Icons load correctly

#### Phase 6: Icon Assets (Week 3)
**Tasks**:
1. Create SVG icons for all agents (19+ icons)
2. Add icons to `/frontend/public/icons/agents/`
3. Update frontmatter with icon paths
4. Test icon loading and fallbacks

**Tools**:
- Figma/Sketch for design
- SVGO for optimization
- Manual testing in browsers

#### Phase 7: Testing & QA (Week 4)
**Tasks**:
1. Run complete test suite (unit + integration + E2E)
2. Manual QA testing
3. Performance testing
4. Accessibility audit
5. Cross-browser testing

**Browsers**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

#### Phase 8: Deployment (Week 4)
**Tasks**:
1. Deploy to staging environment
2. Smoke testing on staging
3. Production deployment
4. Monitor for errors
5. Rollback plan ready

### 8.3 Rollback Plan

**If issues occur**:
1. **Backend**: Revert API changes, agents continue working with defaults
2. **Frontend**: Revert UI changes, show all agents (legacy behavior)
3. **Database**: No schema changes required (filesystem-based)

**Rollback Commands**:
```bash
# Revert backend
git revert <commit-hash> --no-commit
npm run build
pm2 restart api-server

# Revert frontend
git revert <commit-hash> --no-commit
npm run build
pm2 restart frontend
```

---

## 9. Success Metrics

### 9.1 User Experience Metrics

**UX Goals**:
- **Reduced Cognitive Load**: 8 agents vs. 19 agents in default view (58% reduction)
- **Faster Agent Discovery**: Users find relevant agents in <5 seconds
- **Error Prevention**: Zero accidental T2 agent modifications

**Measurements**:
```typescript
interface UXMetrics {
  defaultAgentCount: number;        // Should be 8 (T1 only)
  systemAgentViewRate: number;      // % of users who toggle T2 view
  avgTimeToFindAgent: number;       // Seconds (target: <5)
  t2ModificationAttempts: number;   // Should be 0 (blocked)
}
```

### 9.2 Technical Metrics

**Performance**:
- API response time: <100ms (no regression)
- Frontend render time: <50ms for agent list
- Icon load time: <200ms per icon

**Reliability**:
- 99.9% uptime (no impact)
- Zero breaking changes for existing clients
- 100% backward compatibility

**Code Quality**:
- 90%+ test coverage
- Zero new TypeScript errors
- Zero new linting errors

### 9.3 Business Metrics

**User Adoption**:
- 80%+ of users use default view (T1 only)
- <20% of users toggle T2 view
- Zero user complaints about missing agents

**Developer Productivity**:
- Clear separation reduces confusion
- Faster onboarding for new developers
- Fewer support tickets about agent modifications

### 9.4 Monitoring & Observability

**Logs to Capture**:
```javascript
// Agent view events
logger.info('Agent list viewed', {
  tier: requestedTier,
  showSystem: showSystemAgents,
  userAgent: req.headers['user-agent']
});

// Toggle events
logger.info('System agents toggle', {
  action: show ? 'show' : 'hide',
  userId: userId
});

// Protection events
logger.warn('Protected agent modification attempt', {
  agentSlug: agent.slug,
  tier: agent.tier,
  userId: userId,
  timestamp: new Date()
});
```

**Dashboards**:
1. **Agent Usage Dashboard**
   - T1 vs T2 view rates
   - Most viewed agents
   - Toggle frequency

2. **Protection Dashboard**
   - T2 modification attempts (should be 0)
   - Admin override usage
   - Protection alerts

3. **Performance Dashboard**
   - API response times by tier
   - Icon load success rates
   - Frontend render performance

---

## 10. Edge Cases & Constraints

### 10.1 Edge Cases

#### 10.1.1 Agent Without Tier Field
**Scenario**: Legacy agent file missing `tier` field
**Behavior**: Default to `tier: 1` (user-facing)
**Rationale**: Safe default, no breaking changes

#### 10.1.2 Invalid Tier Value
**Scenario**: Agent has `tier: 3` or `tier: "invalid"`
**Behavior**: Validation error, refuse to load agent
**Error Message**: "Invalid tier value. Must be 1 or 2."

#### 10.1.3 Conflicting Fields
**Scenario**: Agent has `tier: 2` but `posts_as_self: true`
**Behavior**: Warning logged, tier takes precedence
**Correction**: Set `posts_as_self: false` automatically

#### 10.1.4 Missing Icon File
**Scenario**: SVG path specified but file doesn't exist
**Behavior**: Fall back to emoji, then initials
**No Error**: Silent fallback for better UX

#### 10.1.5 All Agents Are T2
**Scenario**: User toggles off T2 view, but all agents are T2
**Behavior**: Show empty state with message
**Message**: "No user-facing agents available. Show system agents to see all."

#### 10.1.6 Concurrent API Requests
**Scenario**: Multiple requests with different tier filters
**Behavior**: Each request independent, no race conditions
**Cache**: Use ETag/Last-Modified for efficient caching

### 10.2 Constraints

#### 10.2.1 Filesystem Dependency
**Constraint**: Tier classification stored in markdown frontmatter
**Impact**: Changes require file system writes + redeployment
**Mitigation**: Clear documentation, future database migration

#### 10.2.2 No Dynamic Tier Changes
**Constraint**: Tier cannot be changed at runtime
**Impact**: Agent classification is permanent (unless admin edit)
**Rationale**: Prevents accidental system destabilization

#### 10.2.3 Icon File Size
**Constraint**: SVG icons must be <10KB each
**Impact**: Complex icons may need simplification
**Mitigation**: Automated SVGO optimization in build pipeline

#### 10.2.4 Browser Compatibility
**Constraint**: SVG rendering varies across browsers
**Impact**: Emoji fallback ensures universal support
**Testing**: Cross-browser testing required

#### 10.2.5 localStorage Limits
**Constraint**: localStorage has 5-10MB limit per domain
**Impact**: Minimal (only storing boolean preference)
**Mitigation**: Periodic cleanup of old preferences

#### 10.2.6 Admin Role Not Yet Implemented
**Constraint**: Current system has no user authentication
**Impact**: All users treated as non-admin (T2 always read-only)
**Future**: RBAC implementation will enable admin overrides

### 10.3 Security Considerations

#### 10.3.1 XSS via SVG Icons
**Risk**: Malicious SVG could execute JavaScript
**Mitigation**: Sanitize SVG content, use `<img>` tag (not inline)
**Validation**: CSP headers block inline scripts

#### 10.3.2 Tier Tampering
**Risk**: Client-side tier manipulation in localStorage
**Mitigation**: Server-side validation, tier from backend only
**Rule**: Client preferences are UI-only, no security impact

#### 10.3.3 Path Traversal in Icon Paths
**Risk**: Malicious icon path like `../../../../etc/passwd`
**Mitigation**: Validate paths, restrict to `/icons/agents/` directory
**Regex**: `^/icons/agents/[a-z0-9-]+\.svg$`

### 10.4 Performance Considerations

#### 10.4.1 Icon Loading Performance
**Challenge**: Loading 19+ icons simultaneously
**Solution**: Lazy loading, progressive enhancement
**Optimization**: Use WebP/AVIF for raster fallbacks

#### 10.4.2 API Response Size
**Challenge**: Returning all agents with tier data
**Solution**: Pagination, field filtering
**Example**: `GET /api/agents?tier=1&fields=id,name,tier,icon`

#### 10.4.3 localStorage Access
**Challenge**: Synchronous localStorage blocks rendering
**Solution**: Read once on mount, cache in state
**Pattern**: `useState(() => localStorage.getItem(...))`

---

## Appendix A: Complete Agent Roster

### T1 Agents (User-Facing)

| Agent Name | Icon | Emoji | Description |
|------------|------|-------|-------------|
| personal-todos-agent | ✅ | 📋 | Task management with Fibonacci priorities |
| meeting-prep-agent | ✅ | 📅 | Pre-meeting preparation and briefings |
| meeting-next-steps-agent | ✅ | ✅ | Post-meeting action items |
| follow-ups-agent | ✅ | 🔔 | Stakeholder coordination and tracking |
| get-to-know-you-agent | ✅ | 👋 | User profile and preference learning |
| link-logger-agent | ✅ | 🔗 | URL tracking and organization |
| agent-ideas-agent | ✅ | 💡 | Agent capability suggestions |
| agent-feedback-agent | ✅ | 💬 | User feedback collection |

### T2 Agents (System)

| Agent Name | Icon | Emoji | Description |
|------------|------|-------|-------------|
| meta-agent | ✅ | ⚙️ | Creates new agents from descriptions |
| meta-update-agent | ✅ | 🔄 | Updates existing agent configurations |
| skills-architect-agent | ✅ | 🎨 | Creates new skills |
| skills-maintenance-agent | ✅ | 🔧 | Updates existing skills |
| agent-architect-agent | ✅ | 🏗️ | Creates new agents (specialized) |
| agent-maintenance-agent | ✅ | 🛠️ | Updates agents (specialized) |
| learning-optimizer-agent | ✅ | 🧠 | Autonomous learning management |
| system-architect-agent | ✅ | 🏛️ | System-wide architecture |
| page-builder-agent | ✅ | 📄 | Dynamic page creation |
| page-verification-agent | ✅ | ✓ | Page QA and validation |
| dynamic-page-testing-agent | ✅ | 🧪 | E2E page testing |

---

## Appendix B: API Examples

### Example 1: Get User-Facing Agents Only
```bash
curl -X GET "http://localhost:5000/api/agents?tier=1"

# Response
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "slug": "personal-todos-agent",
      "name": "personal-todos-agent",
      "tier": 1,
      "visibility": "public",
      "icon": "/icons/agents/personal-todos-agent.svg",
      "icon_emoji": "📋",
      ...
    }
  ],
  "stats": {
    "total": 19,
    "tier1": 8,
    "tier2": 11,
    ...
  }
}
```

### Example 2: Get System Agents Only
```bash
curl -X GET "http://localhost:5000/api/agents?tier=2"

# Response
{
  "success": true,
  "data": [
    {
      "id": "xyz789",
      "slug": "meta-agent",
      "name": "meta-agent",
      "tier": 2,
      "visibility": "protected",
      ...
    }
  ]
}
```

### Example 3: Attempt to Modify T2 Agent (Blocked)
```bash
curl -X PATCH "http://localhost:5000/api/agents/meta-agent" \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated description"}'

# Response (403 Forbidden)
{
  "success": false,
  "error": "System agents (tier 2) cannot be modified by users",
  "tier": 2,
  "visibility": "protected"
}
```

---

## Appendix C: Frontmatter Templates

### T1 Agent Template
```yaml
---
name: {agent-name}
description: {agent description}
tier: 1
visibility: public
icon: "/icons/agents/{agent-name}.svg"
icon_type: svg
icon_emoji: "{emoji}"
posts_as_self: true
show_in_default_feed: true
tools: [Read, Write, Edit, Grep, Glob, TodoWrite]
color: "{hex-color}"
model: sonnet
proactive: true
priority: P0
---
```

### T2 Agent Template
```yaml
---
name: {agent-name}
description: {agent description}
tier: 2
visibility: protected
icon: "/icons/agents/{agent-name}.svg"
icon_type: svg
icon_emoji: "{emoji}"
posts_as_self: false
show_in_default_feed: false
tools: [Bash, Glob, Grep, Read, Edit, Write]
color: "{hex-color}"
model: sonnet
proactive: true
priority: P2
---
```

---

## Document Control

**Version History**:
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-19 | SPARC Orchestrator | Initial specification |

**Approvals Required**:
- [ ] Technical Lead
- [ ] Product Owner
- [ ] Security Review
- [ ] UX Review

**Next Phase**: Pseudocode & Algorithm Design

---

**END OF SPECIFICATION DOCUMENT**
