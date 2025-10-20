# SPARC Phase 3: Architecture - Meta Agent Removal

## System Impact Analysis

### Component Dependency Map

```
Meta Agents (To Remove)
├── meta-agent.md
│   ├── Protected Config: .system/meta-agent.protected.yaml
│   ├── Referenced by: agent-ideas-agent.md (line 115)
│   ├── Listed in: protection-validation.service.js (line 36)
│   ├── Icon mapping: agent-icons.ts (line 18, 40)
│   └── Skills: 12 skill files reference meta-agent
│
└── meta-update-agent.md
    ├── Protected Config: .system/meta-update-agent.protected.yaml (assumed)
    ├── Referenced by: agent-feedback-agent.md (lines 102, 112, 211)
    ├── Listed in: protection-validation.service.js (line 37)
    ├── Icon mapping: agent-icons.ts (NO ENTRY - not found)
    └── Skills: 12 skill files reference meta-update-agent

Replacement Agents (Already Exist)
├── skills-architect-agent.md (Tier 2)
├── skills-maintenance-agent.md (Tier 2)
├── agent-architect-agent.md (Tier 2)
├── agent-maintenance-agent.md (Tier 2)
├── learning-optimizer-agent.md (Tier 2)
└── system-architect-agent.md (Tier 2)
```

### Layer-by-Layer Impact

#### 1. File System Layer

**Locations:**
- `/workspaces/agent-feed/prod/.claude/agents/` - Agent markdown files
- `/workspaces/agent-feed/prod/.system/` - Protected config files

**Changes Required:**
1. Remove `meta-agent.md`
2. Remove `meta-update-agent.md`
3. Archive/Remove `meta-agent.protected.yaml`
4. Archive/Remove `meta-update-agent.protected.yaml`

**Impact**: LOW - Simple file operations
**Rollback**: HIGH - Easy to restore from backup

#### 2. Agent Cross-References Layer

**File: `/workspaces/agent-feed/prod/.claude/agents/agent-ideas-agent.md`**

**Line 115:**
```markdown
- Coordinate with meta-agent for high-priority implementations
```

**Required Change:**
```markdown
- Coordinate with agent-architect-agent for high-priority implementations
```

**File: `/workspaces/agent-feed/prod/.claude/agents/agent-feedback-agent.md`**

**Lines 102, 112, 211:**
```markdown
- Coordinate with meta-update-agent for implementation
- Coordinate with meta-update-agent for improvements
- Coordination requirements with meta-update-agent
```

**Required Change:**
```markdown
- Coordinate with agent-maintenance-agent for implementation
- Coordinate with agent-maintenance-agent for improvements
- Coordination requirements with agent-maintenance-agent
```

**Impact**: MEDIUM - Requires agent file edits
**Rollback**: MEDIUM - Can restore references

#### 3. Backend API Layer

**File: `/workspaces/agent-feed/api-server/services/protection-validation.service.js`**

**Lines 35-38:**
```javascript
const META_COORDINATION_AGENTS = [
  'meta-agent',
  'meta-update-agent'
];
```

**Required Change: Option 1 (Update to new agents)**
```javascript
const META_COORDINATION_AGENTS = [
  'skills-architect-agent',
  'skills-maintenance-agent',
  'agent-architect-agent',
  'agent-maintenance-agent',
  'learning-optimizer-agent',
  'system-architect-agent'
];
```

**Required Change: Option 2 (Remove constant entirely)**
```javascript
// REMOVED: META_COORDINATION_AGENTS - functionality replaced by Phase 4.2 specialists
// Specialists: skills-architect, skills-maintenance, agent-architect,
// agent-maintenance, learning-optimizer, system-architect
```

**Investigation Needed:**
- Where is `META_COORDINATION_AGENTS` used in the codebase?
- What validation logic depends on this constant?
- Can we safely remove or must we update?

**Impact**: MEDIUM-HIGH - Backend service logic change
**Rollback**: MEDIUM - Can restore constant

#### 4. Frontend UI Layer

**File: `/workspaces/agent-feed/frontend/src/constants/agent-icons.ts`**

**Lines 18, 40:**
```typescript
export const AGENT_ICON_MAP: Record<string, LucideIcon> = {
  // ...
  'meta-agent': Settings,
  // ...
};

export const AGENT_ICON_EMOJI_MAP: Record<string, string> = {
  // ...
  'meta-agent': '⚙️',
  // ...
};
```

**Required Change:**
```typescript
// Remove lines 18 and 40
// meta-update-agent is NOT in this file (inconsistency!)
```

**Investigation Needed:**
- Why is meta-update-agent missing from icon maps?
- Will removing meta-agent break icon resolution?
- Are there fallback mechanisms?

**Impact**: LOW - Simple constant removal
**Rollback**: EASY - Can restore lines

#### 5. Skills System Layer

**12 Skill Files Reference Meta Agents:**

**System Skills (.system/):**
1. `security-policies/SKILL.md`
2. `documentation-standards/SKILL.md`
3. `update-protocols/SKILL.md`
4. `agent-templates/SKILL.md`
5. `avi-architecture/SKILL.md`
6. `code-standards/SKILL.md`
7. `brand-guidelines/SKILL.md`

**Shared Skills (shared/):**
8. `agent-design-patterns/SKILL.md`
9. `idea-evaluation/SKILL.md`
10. `project-memory/SKILL.md`
11. `link-curation/SKILL.md`
12. `feedback-frameworks/SKILL.md`

**Required Changes:**
- Find all "meta-agent" → Replace with "agent-architect-agent"
- Find all "meta-update-agent" → Replace with "agent-maintenance-agent"

**Impact**: MEDIUM - Multiple skill file edits
**Rollback**: MEDIUM - Can restore via git

### Data Flow Analysis

#### Current Flow (Before Removal)

```
User Request: "Create new agent"
    ↓
Λvi Coordination Layer
    ↓
Delegates to: meta-agent
    ↓
meta-agent creates agent.md + .protected.yaml
    ↓
Result posted by Λvi
```

#### New Flow (After Removal)

```
User Request: "Create new agent"
    ↓
Λvi Coordination Layer
    ↓
Delegates to: agent-architect-agent (Phase 4.2 specialist)
    ↓
agent-architect-agent creates agent.md + .protected.yaml
    ↓
Result posted by Λvi
```

**Impact**: NONE - Flow unchanged, only agent name different
**Delegation**: Automatic via agent description matching

### Integration Points

#### Point 1: Agent Loading System

**Location**: `/workspaces/agent-feed/api-server/repositories/agent.repository.js`

**Expected Behavior**:
- Dynamic filesystem-based loading
- No hardcoded agent lists
- Should automatically detect 18 agents

**Validation Required**:
- Test with 18 agents
- Verify no errors on missing meta agents
- Check tier classification still works

#### Point 2: Tier Filtering System

**Location**: `/workspaces/agent-feed/frontend/src/hooks/useAgentTierFilter.ts`

**Expected Behavior**:
- Count T1 agents: 8
- Count T2 agents: 8
- Total agents: 18

**Validation Required**:
- Tier toggle shows correct counts
- "All" filter shows 18 agents
- No JavaScript errors

#### Point 3: Protected Config Validation

**Location**: `/workspaces/agent-feed/api-server/services/protection-validation.service.js`

**Current Logic**:
```javascript
const META_COORDINATION_AGENTS = [
  'meta-agent',
  'meta-update-agent'
];
```

**Investigation Needed**:
1. How is this constant used?
2. Does it validate agent existence?
3. What happens if agents missing?

**Options**:
A. Update to include 6 new specialists
B. Remove constant entirely
C. Add deprecation flag

#### Point 4: SVG Icon Resolution

**Location**: `/workspaces/agent-feed/frontend/src/components/agents/AgentIcon.tsx`

**Current Logic**:
- Looks up agent name in `AGENT_ICON_MAP`
- Falls back to emoji if SVG not found
- Falls back to default icon if emoji not found

**Expected Behavior After Removal**:
- meta-agent lookup returns undefined
- Fallback to emoji (but agent doesn't exist)
- Should not render (agent removed)

**Validation Required**:
- No console errors for missing icons
- All 18 remaining agents render icons correctly

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Backend service breaks due to META_COORDINATION_AGENTS | MEDIUM | HIGH | Investigate usage before removal |
| Agent cross-references break functionality | LOW | MEDIUM | Update references to new agents |
| Skills system references cause errors | LOW | LOW | Update skill markdown files |
| Tier counts incorrect | LOW | HIGH | Test tier filtering thoroughly |
| Icon resolution fails | LOW | LOW | Test SVG rendering for all agents |
| Protected configs orphaned | LOW | MEDIUM | Archive before removal |
| Database has agent_pages entries | UNKNOWN | MEDIUM | Check database before removal |

### Testing Strategy

#### Unit Tests Required

**File**: `/workspaces/agent-feed/tests/unit/meta-agent-removal.test.js`

```javascript
describe('Meta Agent Removal', () => {
  test('should have exactly 18 agents', () => {
    const agents = loadAllAgents();
    expect(agents.length).toBe(18);
  });

  test('should not include meta-agent', () => {
    const agents = loadAllAgents();
    const metaAgent = agents.find(a => a.name === 'meta-agent');
    expect(metaAgent).toBeUndefined();
  });

  test('should not include meta-update-agent', () => {
    const agents = loadAllAgents();
    const metaUpdateAgent = agents.find(a => a.name === 'meta-update-agent');
    expect(metaUpdateAgent).toBeUndefined();
  });

  test('should have correct tier distribution', () => {
    const agents = loadAllAgents();
    const tier1Count = agents.filter(a => a.tier === 1).length;
    const tier2Count = agents.filter(a => a.tier === 2).length;

    expect(tier1Count).toBe(8);
    expect(tier2Count).toBe(8);
  });

  test('should have 6 Phase 4.2 specialist agents', () => {
    const agents = loadAllAgents();
    const specialists = agents.filter(a =>
      ['skills-architect-agent', 'skills-maintenance-agent',
       'agent-architect-agent', 'agent-maintenance-agent',
       'learning-optimizer-agent', 'system-architect-agent'].includes(a.name)
    );
    expect(specialists.length).toBe(6);
  });
});
```

#### Integration Tests Required

**File**: `/workspaces/agent-feed/tests/integration/backend-agent-removal.test.js`

```javascript
describe('Backend Agent Loading', () => {
  test('GET /api/agents returns 18 agents', async () => {
    const response = await request(app).get('/api/agents');
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(18);
  });

  test('GET /api/agents does not return meta-agent', async () => {
    const response = await request(app).get('/api/agents');
    const metaAgent = response.body.find(a => a.name === 'meta-agent');
    expect(metaAgent).toBeUndefined();
  });

  test('Protection validation service handles missing meta agents', () => {
    // Test META_COORDINATION_AGENTS usage
  });
});
```

#### E2E Tests Required

**File**: `/workspaces/agent-feed/tests/e2e/agent-removal-validation.spec.ts`

```typescript
test.describe('Meta Agent Removal E2E', () => {
  test('should display 18 agents in sidebar', async ({ page }) => {
    await page.goto('/');
    const agentItems = await page.locator('[data-testid="agent-list-item"]').count();
    expect(agentItems).toBe(18);
  });

  test('should show correct tier counts in toggle', async ({ page }) => {
    await page.goto('/');

    // Click "All" - should show 18
    await page.click('[data-testid="tier-toggle-all"]');
    expect(await page.locator('[data-testid="tier-toggle-all"]').textContent())
      .toContain('18');

    // Click "T1" - should show 8
    await page.click('[data-testid="tier-toggle-t1"]');
    expect(await page.locator('[data-testid="tier-toggle-t1"]').textContent())
      .toContain('8');

    // Click "T2" - should show 8
    await page.click('[data-testid="tier-toggle-t2"]');
    expect(await page.locator('[data-testid="tier-toggle-t2"]').textContent())
      .toContain('8');
  });

  test('should not show meta-agent or meta-update-agent', async ({ page }) => {
    await page.goto('/');
    const metaAgent = await page.locator('text=meta-agent').count();
    const metaUpdateAgent = await page.locator('text=meta-update-agent').count();
    expect(metaAgent).toBe(0);
    expect(metaUpdateAgent).toBe(0);
  });

  test('all agent icons should render without errors', async ({ page }) => {
    await page.goto('/');
    const agents = await page.locator('[data-testid="agent-list-item"]').all();

    for (const agent of agents) {
      const icon = await agent.locator('[data-testid="agent-icon"]');
      expect(await icon.isVisible()).toBe(true);
    }
  });
});
```

### Deployment Strategy

#### Phase 1: Preparation
1. Run full test suite (baseline)
2. Create backup of all files
3. Document current state
4. Verify replacement agents functional

#### Phase 2: Investigation
1. Find all META_COORDINATION_AGENTS usages
2. Check database for agent_pages entries
3. Verify no hidden dependencies
4. Confirm rollback procedure

#### Phase 3: Execution
1. Update agent cross-references (agent-ideas, agent-feedback)
2. Update skills references (12 files)
3. Update backend service (protection-validation.service.js)
4. Update frontend icons (agent-icons.ts)
5. Remove agent files (meta-agent.md, meta-update-agent.md)
6. Archive protected configs

#### Phase 4: Validation
1. Run unit tests
2. Run integration tests
3. Run E2E tests
4. Manual browser testing
5. Verify tier counts
6. Check for console errors

#### Phase 5: Rollback (If Needed)
1. Restore agent files from backup
2. Restore protected configs
3. Restore cross-references
4. Restore skills references
5. Restore backend/frontend code
6. Verify 20 agents restored

### Success Criteria

- [ ] Exactly 18 agent files in `/prod/.claude/agents/`
- [ ] Tier distribution: T1=8, T2=8
- [ ] Backend API returns 18 agents
- [ ] Frontend displays 18 agents
- [ ] Tier toggle shows correct counts
- [ ] All SVG icons render
- [ ] No console errors
- [ ] All tests pass
- [ ] No broken cross-references
- [ ] Skills system updated
- [ ] Protected configs archived
- [ ] Documentation updated

---

**Document Version**: 1.0
**Created**: 2025-10-20
**Status**: Architecture Analysis Complete
**Next Phase**: TDD Test Implementation
**Critical Blocker**: Must investigate META_COORDINATION_AGENTS usage in backend before proceeding
