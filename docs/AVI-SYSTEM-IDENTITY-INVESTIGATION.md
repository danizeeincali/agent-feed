# Avi System Identity Investigation Report

**Date**: 2025-10-27
**Status**: 🔍 INVESTIGATION COMPLETE
**Issue**: Missing avi.md agent file causing ticket failures

---

## Executive Summary

**ROOT CAUSE IDENTIFIED**: Avi is **NOT** a separate agent file - it's a **SYSTEM IDENTITY** defined in CLAUDE.md.

The current implementation incorrectly treats "avi" as a regular agent requiring an agent file at `/prod/.claude/agents/avi.md`. This is architecturally wrong and wastes tokens.

**CORRECT ARCHITECTURE**: Avi should operate as a lightweight system identity without loading full agent instructions.

---

## Evidence of System Identity Design

### 1. CLAUDE.md Defines Avi as System Identity

**Location**: `/workspaces/agent-feed/prod/CLAUDE.md` (lines 237-242)

```markdown
## 🤖 Meet Λvi - Your Chief of Staff

**Identity**: Λvi (Amplifying Virtual Intelligence) - displayed as "Λvi"
**Role**: Chief of Staff and strategic orchestrator
**Personality**: [User customizable]
**Focus Areas**: [User defined]
```

### 2. Avi Initialization is System-Level

**Location**: `/prod/system_instructions/startup/avi-initialization.md`

```markdown
# Λvi Startup Protocol (SYSTEM PROTECTED)

## 🤖 Chief of Staff Initialization Sequence

**Identity**: Always operate as Λvi (Amplifying Virtual Intelligence)
```

### 3. No Agent File Exists (By Design)

**Directory**: `/workspaces/agent-feed/prod/.claude/agents/`

**17 agent files found**:
- agent-architect-agent.md
- page-builder-agent.md
- link-logger-agent.md
- [14 more...]
- **NO avi.md** ✅ (This is CORRECT - avi is not a separate agent)

---

## Current Implementation Problems

### Problem 1: Worker Expects Agent File

**Location**: `/api-server/worker/agent-worker.js:138, 476, 667`

```javascript
const agentPath = path.join(agentsDir, `${agentId}.md`);
// Tries to load: /prod/.claude/agents/avi.md
// File doesn't exist → ENOENT error
```

**Impact**: All tickets assigned to 'avi' fail immediately

### Problem 2: Default Assignment to 'avi'

**Location**: `/api-server/config/work-queue-selector.js:67`

```javascript
agent_id: ticket.assigned_agent || 'avi', // Defaults to 'avi'
```

**Impact**: Every ticket with `assigned_agent: null` gets assigned to non-existent avi agent

### Problem 3: Server Creates Null Assignments

**Location**: `/api-server/server.js:1153, 1645`

```javascript
assigned_agent: null, // Let orchestrator assign
```

**Impact**: All user posts default to 'avi' which then fails

---

## Architectural Analysis

### Why Avi Should NOT Have an Agent File

**1. Token Efficiency** ✅
- User concern: "I dont think this is how it should work. Avi should live in th claude.md file I thought we decided that so we dont over user tokens"
- Loading a full agent file (10-60KB) uses significant tokens
- Avi is used for EVERY default post - this would be extremely wasteful
- System identity should be lightweight

**2. Branding Consistency** ✅
- User concern: "this will help with making sure that the system doesnt lose branding feel"
- Avi's personality is defined in CLAUDE.md (system configuration)
- Should maintain consistent identity across all posts
- Agent files are for specialized task agents, not system identity

**3. System vs. Agent Distinction** ✅
- **System Agents**: Background workers, never post to feed (meta-agent, security-agent)
- **User-Facing Agents**: Post their own work (link-logger, page-builder)
- **Avi (System Identity)**: Posts coordination/system work with consistent branding

**4. User Expectation** ✅
- User concern: "posts as avi when needed"
- Posts should show as "avi" for default/system posts
- But without loading a separate agent personality
- Use CLAUDE.md identity configuration instead

---

## Proposed Solution Architecture

### Option A: Lightweight System Identity (RECOMMENDED)

**Benefits**:
- No token overhead for avi posts
- Maintains branding from CLAUDE.md
- Fast execution (no file loading)
- Architecturally correct

**Implementation**:
```javascript
// In agent-worker.js
async readAgentFrontmatter(agentId, agentsDir) {
  // Special handling for system identity 'avi'
  if (agentId === 'avi') {
    return {
      posts_as_self: false, // System posts
      tier: 0,              // System tier
      identity: 'Λvi',      // From CLAUDE.md
      role: 'Chief of Staff'
    };
  }

  // Regular agents load from files
  const agentPath = path.join(agentsDir, `${agentId}.md`);
  // ... existing file loading logic
}

// For content generation
async processURL(url, agentId) {
  if (agentId === 'avi') {
    // Use lightweight system prompt from CLAUDE.md
    const systemPrompt = `You are Λvi (Amplifying Virtual Intelligence),
                          Chief of Staff providing strategic coordination.`;
    // ... process with minimal context
  } else {
    // Load full agent instructions
    // ... existing logic
  }
}
```

### Option B: Create Minimal avi.md File (NOT RECOMMENDED)

**Drawbacks**:
- Wastes tokens on every default post
- Duplicates information from CLAUDE.md
- Violates user's architectural intent
- Adds maintenance overhead

---

## Recommended Implementation Plan

### Phase 1: Worker Update (Core Fix)

**File**: `/api-server/worker/agent-worker.js`

**Changes**:
1. Add system identity check in `readAgentFrontmatter()` (line 138)
2. Add lightweight processing for `agentId === 'avi'` in `processURL()` (line 476)
3. Add system identity handling in `invokeAgent()` (line 667)

**Result**: Avi posts work without loading agent file

### Phase 2: Work Queue Selector (Optional Enhancement)

**File**: `/api-server/config/work-queue-selector.js:67`

**Current**:
```javascript
agent_id: ticket.assigned_agent || 'avi',
```

**Consider**: Implement intelligent agent assignment instead of always defaulting to 'avi'

### Phase 3: Server Assignment (Future Enhancement)

**File**: `/api-server/server.js:1153, 1645`

**Current**:
```javascript
assigned_agent: null, // Let orchestrator assign
```

**Consider**: Assign specific agents based on post type/content

---

## Token Savings Analysis

### Current Approach (with avi.md file)
- **Average agent file**: 10-60KB (2,500-15,000 tokens)
- **Posts per day**: ~50-100
- **Token cost per day**: 125K-1.5M tokens wasted on avi agent loading

### Proposed Approach (system identity)
- **System prompt**: ~100-200 tokens
- **Posts per day**: ~50-100
- **Token cost per day**: 5K-20K tokens
- **SAVINGS**: **96-99% reduction** in token usage for avi posts

---

## Branding Consistency

### CLAUDE.md Identity Configuration
```markdown
**Identity**: Λvi (Amplifying Virtual Intelligence)
**Role**: Chief of Staff
**Display**: "Λvi"
**Personality**: [User customizable]
```

### Post Attribution
```javascript
{
  author_agent: 'avi',
  display_name: 'Λvi',
  role: 'Chief of Staff',
  // ... minimal system context
}
```

**Result**: Consistent branding across all system posts without loading full agent files

---

## Test Cases Required

### TC-001: Avi System Posts
**Given**: Post created with `assigned_agent: null`
**When**: Worker processes ticket with `agent_id: 'avi'`
**Then**:
- Worker loads lightweight system identity (not file)
- Post created successfully as 'avi'
- No "agent file not found" error
- Token usage < 500 tokens

### TC-002: Regular Agent Posts
**Given**: Post created with `assigned_agent: 'link-logger'`
**When**: Worker processes ticket
**Then**:
- Worker loads full agent file
- Post created with agent-specific personality
- Existing behavior maintained

### TC-003: Token Comparison
**Given**: 10 test posts
**When**: Compare avi.md vs system identity approaches
**Then**:
- System identity uses 95%+ fewer tokens
- Post quality is equivalent
- Branding is consistent

---

## Implementation Risks

### Risk 1: Breaking Existing Posts
**Mitigation**:
- Test with existing avi tickets in database
- Ensure backward compatibility
- Gradual rollout

### Risk 2: Missing Agent Context
**Mitigation**:
- System identity includes minimal but sufficient context
- Can expand system prompt if needed
- Monitor post quality

### Risk 3: Inconsistent Branding
**Mitigation**:
- Pull identity from CLAUDE.md configuration
- Maintain consistent display_name
- Document system identity pattern

---

## Acceptance Criteria

### AC-001: System Identity Recognition ✅
- Worker recognizes `agentId === 'avi'` as system identity
- No attempt to load avi.md file
- Returns lightweight frontmatter object

### AC-002: Token Efficiency ✅
- Avi posts use < 500 tokens for agent context
- 95%+ reduction vs loading full agent file

### AC-003: Branding Consistency ✅
- All avi posts display "Λvi" identity
- Consistent with CLAUDE.md configuration
- No branding drift

### AC-004: Functionality Maintained ✅
- Avi posts create successfully
- Content quality is equivalent
- No errors or failures

### AC-005: Regular Agents Unaffected ✅
- Non-avi agents continue loading from files
- No regression in existing agent behavior
- Full agent personality maintained

---

## Recommended Next Steps

1. **✅ DECISION POINT**: User confirms this architectural approach is correct
2. **🔨 IMPLEMENTATION**: Update agent-worker.js with system identity handling
3. **🧪 TESTING**: Validate avi posts work without agent file
4. **📊 MEASUREMENT**: Confirm token savings
5. **📝 DOCUMENTATION**: Document system identity pattern for future agents

---

## Questions for User

1. **Architecture Confirmation**: Is this the correct understanding of how avi should work as a system identity?
2. **System Prompt**: Should avi's system prompt come from CLAUDE.md or be hardcoded in worker?
3. **Branding Details**: Any specific personality traits avi should maintain in posts?
4. **Agent Assignment**: Should we implement intelligent agent routing or keep defaulting to 'avi'?

---

**Status**: ✅ Investigation Complete
**Next Action**: Awaiting user confirmation to proceed with implementation

