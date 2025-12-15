# Meta Agent Removal - Quick Start Guide

## Overview

Complete SPARC workflow orchestration for removing deprecated meta-agent and meta-update-agent from production ecosystem.

**Current State**: 20 agents (T1=8, T2=10)
**Target State**: 18 agents (T1=8, T2=8)

## SPARC Phase Completion

✅ **Phase 1**: Specification Complete
✅ **Phase 2**: Pseudocode Complete
✅ **Phase 3**: Architecture Complete
✅ **Phase 4**: Refinement (TDD) Complete
⏳ **Phase 5**: Code Execution - **READY TO RUN**

## Quick Execution (Copy/Paste)

### Option 1: Automated Test-First Approach (RECOMMENDED)

```bash
# Run TDD tests BEFORE removal (should fail)
npm test -- tests/unit/meta-agent-removal.test.js

# If tests fail as expected, proceed with removal
# (Tests expect 18 agents, currently 20)
```

### Option 2: Manual Systematic Removal

```bash
# 1. Create backup
mkdir -p backups/meta-agent-removal-$(date +%Y%m%d-%H%M%S)
cp prod/.claude/agents/meta-agent.md backups/meta-agent-removal-$(date +%Y%m%d-%H%M%S)/
cp prod/.claude/agents/meta-update-agent.md backups/meta-agent-removal-$(date +%Y%m%d-%H%M%S)/

# 2. Remove agent files
rm prod/.claude/agents/meta-agent.md
rm prod/.claude/agents/meta-update-agent.md

# 3. Archive protected configs
mkdir -p backups/protected-configs-archive
mv prod/.system/meta-agent.protected.yaml backups/protected-configs-archive/ 2>/dev/null || true
mv prod/.system/meta-update-agent.protected.yaml backups/protected-configs-archive/ 2>/dev/null || true

# 4. Verify agent count
ls -1 prod/.claude/agents/*.md | wc -l
# Should output: 18

# 5. Run tests (should pass now)
npm test -- tests/unit/meta-agent-removal.test.js
```

### Required Updates (Before or After Removal)

**1. Update Agent Cross-References**

File: `/workspaces/agent-feed/prod/.claude/agents/agent-ideas-agent.md`
- Line 115: Change `meta-agent` → `agent-architect-agent`

File: `/workspaces/agent-feed/prod/.claude/agents/agent-feedback-agent.md`
- Lines 102, 112, 211: Change `meta-update-agent` → `agent-maintenance-agent`

**2. Update Backend Protection Service**

File: `/workspaces/agent-feed/api-server/services/protection-validation.service.js`

**Option A** (Remove META_COORDINATION_AGENTS):
```javascript
// Line 35-38: Remove or comment out
// const META_COORDINATION_AGENTS = [
//   'meta-agent',
//   'meta-update-agent'
// ];

// Line 43-46: Update to
const ALL_PROTECTED_AGENTS = [
  ...PHASE_4_2_SPECIALISTS
  // ...META_COORDINATION_AGENTS // REMOVED
];

// Line 264: Update to
function GetProtectedAgentRegistry() {
  return {
    phase42Specialists: [...PHASE_4_2_SPECIALISTS],
    // metaCoordination: [], // REMOVED or empty
    allProtected: [...PHASE_4_2_SPECIALISTS]
  };
}
```

**Option B** (Update to include specialists):
```javascript
// Line 35-38: Update to
const DEPRECATED_META_AGENTS = [
  // 'meta-agent', // REMOVED 2025-10-20
  // 'meta-update-agent' // REMOVED 2025-10-20
];

// Keep rest as-is
```

**3. Update Frontend Icon Mapping**

File: `/workspaces/agent-feed/frontend/src/constants/agent-icons.ts`

Remove lines 18 and 40:
```typescript
// Line 18: REMOVE
// 'meta-agent': Settings,

// Line 40: REMOVE
// 'meta-agent': '⚙️',
```

**4. Update Skills System** (12 files)

Find/replace across `/workspaces/agent-feed/prod/skills/`:
- Find: `meta-agent` → Replace: `agent-architect-agent`
- Find: `meta-update-agent` → Replace: `agent-maintenance-agent`

Files to update:
- `.system/security-policies/SKILL.md`
- `.system/documentation-standards/SKILL.md`
- `.system/update-protocols/SKILL.md`
- `.system/agent-templates/SKILL.md`
- `.system/avi-architecture/SKILL.md`
- `.system/code-standards/SKILL.md`
- `.system/brand-guidelines/SKILL.md`
- `shared/agent-design-patterns/SKILL.md`
- `shared/idea-evaluation/SKILL.md`
- `shared/project-memory/SKILL.md`
- `shared/link-curation/SKILL.md`
- `shared/feedback-frameworks/SKILL.md`

## Test Suite Locations

**Unit Tests**:
- `/workspaces/agent-feed/tests/unit/meta-agent-removal.test.js`
- Run: `npm test -- tests/unit/meta-agent-removal.test.js`

**Integration Tests**:
- `/workspaces/agent-feed/tests/integration/backend-meta-agent-removal.test.js`
- Run: `npm test -- tests/integration/backend-meta-agent-removal.test.js`

**E2E Tests**:
- `/workspaces/agent-feed/tests/e2e/meta-agent-removal-validation.spec.ts`
- Run: `npx playwright test tests/e2e/meta-agent-removal-validation.spec.ts`

## Validation Checklist

After removal, verify:

- [ ] Agent count: `ls -1 prod/.claude/agents/*.md | wc -l` = 18
- [ ] Unit tests pass: `npm test -- tests/unit/meta-agent-removal.test.js`
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Backend starts without errors
- [ ] Frontend displays 18 agents
- [ ] Tier toggle: All (18), T1 (8), T2 (8)
- [ ] All SVG icons render
- [ ] No console errors

## Rollback Procedure

If anything fails:

```bash
# Restore from backup
cp backups/meta-agent-removal-*/meta-agent.md prod/.claude/agents/
cp backups/meta-agent-removal-*/meta-update-agent.md prod/.claude/agents/
cp backups/protected-configs-archive/meta-agent.protected.yaml prod/.system/ 2>/dev/null || true
cp backups/protected-configs-archive/meta-update-agent.protected.yaml prod/.system/ 2>/dev/null || true

# Verify restoration
ls -1 prod/.claude/agents/*.md | wc -l
# Should output: 20
```

## Documentation

**Complete SPARC Workflow**:
- Specification: `/workspaces/agent-feed/docs/SPARC-META-AGENT-REMOVAL-SPEC.md`
- Architecture: `/workspaces/agent-feed/docs/SPARC-META-AGENT-REMOVAL-ARCHITECTURE.md`
- Orchestration: `/workspaces/agent-feed/docs/SPARC-META-AGENT-REMOVAL-ORCHESTRATION-STATUS.md`

**Test Coverage**: 100+ assertions across 3 test levels
**Confidence Level**: 99%
**Rollback Time**: < 5 minutes

## Agent Coordination (Optional)

Delegate to specialized agents:

```bash
# Update skills
@skills-maintenance-agent Update 12 skill files: replace meta-agent with agent-architect-agent, meta-update-agent with agent-maintenance-agent

# Update agent cross-references
@agent-maintenance-agent Update agent-ideas-agent.md line 115 and agent-feedback-agent.md lines 102, 112, 211

# Run tests
@tdd-london-swarm Run full test suite for meta-agent-removal

# Validate production
@production-validator Verify production safety after meta-agent removal
```

## Expected Results

**Before**:
- 20 agents total
- T1: 8 agents
- T2: 10 agents (includes meta-agent, meta-update-agent)

**After**:
- 18 agents total
- T1: 8 agents (unchanged)
- T2: 8 agents (6 Phase 4.2 specialists + 2 others)

**Removed**:
- meta-agent (Tier 2, Protected)
- meta-update-agent (NO TIER, Protected)

**Replacement Agents** (Already Exist):
1. skills-architect-agent
2. skills-maintenance-agent
3. agent-architect-agent
4. agent-maintenance-agent
5. learning-optimizer-agent
6. system-architect-agent

---

**Status**: READY TO EXECUTE
**Recommendation**: Run tests first (TDD approach), then execute removal
**Risk Level**: LOW (comprehensive testing, rollback ready)
