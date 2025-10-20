# SPARC Specification: Meta Agent Removal

## Phase 1: Specification

### Current State Analysis (2025-10-20)

**Agent Inventory**: 20 total agents in `/workspaces/agent-feed/prod/.claude/agents/`

**Agents to Remove**:
1. `meta-agent.md` - Tier 2, Protected, System agent for creating new agents
2. `meta-update-agent.md` - NO TIER (needs investigation), System agent for updating agents

**Replacement Agents** (Already Exist):
1. `skills-architect-agent.md` - Tier 2
2. `skills-maintenance-agent.md` - Tier 2
3. `agent-architect-agent.md` - Tier 2
4. `agent-maintenance-agent.md` - Tier 2
5. `learning-optimizer-agent.md` - Tier 2
6. `system-architect-agent.md` - Tier 2

**Current Tier Distribution** (18 agents with tiers):
- Tier 1: 8 agents
- Tier 2: 10 agents
- NO TIER: meta-update-agent (1 agent)

**Expected Final State**:
- Total Agents: 18 (down from 20)
- Tier 1: 8 agents (unchanged)
- Tier 2: 8 agents (down from 10)
- NO TIER: 0 agents

### Business Requirements

**Objective**: Remove deprecated meta-agent and meta-update-agent in favor of specialized Phase 4.2 agents that provide:
- 70-78% token efficiency improvement
- Single-responsibility design
- Progressive loading (Tier 1 metadata → Tier 2 full load)
- Clearer separation of concerns

**Success Criteria**:
1. Both meta agents completely removed from production
2. No references to meta agents in codebase
3. Frontend displays exactly 18 agents
4. All tier filtering works correctly (T1=8, T2=8)
5. SVG icons still functional for all remaining agents
6. No broken links or missing agent references
7. Backend agent loading handles 18 agents correctly

### Protected Config Implications

**meta-agent.md**:
- Has protected config: `.system/meta-agent.protected.yaml`
- Referenced in frontmatter: `_protected_config_source: ".system/meta-agent.protected.yaml"`
- Protected config file must also be removed (or archived)

**meta-update-agent.md**:
- Has protected config: `.system/meta-update-agent.protected.yaml`
- Referenced in frontmatter: `_protected_config_source: ".system/meta-update-agent.protected.yaml"`
- Protected config file must also be removed (or archived)

**Action Required**:
- Archive protected configs before deletion
- Update any integrity checker references
- Verify no other agents reference these protected configs

### Functional Requirements

**FR-1**: System must gracefully handle agent count change from 20 → 18
**FR-2**: Tier filtering must correctly identify 8 T1 and 8 T2 agents
**FR-3**: Agent icons (SVG and emoji) must remain functional
**FR-4**: No hardcoded agent count validations should break
**FR-5**: Agent list sidebar must display 18 agents without errors
**FR-6**: Protected system must recognize removal of protected agents

### Edge Cases

**EC-1**: What if other agents reference meta-agent or meta-update-agent?
- Search all agent files for cross-references
- Update or remove references

**EC-2**: What if frontend/backend has hardcoded "19" or "20" agent count?
- Verify dynamic agent loading
- Check for any assertion failures

**EC-3**: What if skills reference these agents?
- Check skills directory for meta-agent references
- Update skills if needed

**EC-4**: What if there are active page configurations for these agents?
- Check agent_pages database
- Remove page entries if exist

### Constraints

**C-1**: Must maintain production stability (no downtime)
**C-2**: Must preserve all 6 replacement specialist agents
**C-3**: Must maintain protected config integrity system
**C-4**: Must follow TDD approach (tests before removal)
**C-5**: Must document all changes for audit trail

### Assumptions

**A-1**: Replacement agents are fully functional and tested
**A-2**: No active users are currently using meta-agent or meta-update-agent
**A-3**: Backend uses dynamic agent loading (not hardcoded lists)
**A-4**: Frontend tier filtering is agent-count agnostic

### Acceptance Criteria

**AC-1**: `npm run test` passes all unit tests
**AC-2**: E2E tests show 18 agents in UI
**AC-3**: Tier toggle shows correct counts (T1=8, T2=8)
**AC-4**: No console errors in browser
**AC-5**: Backend API `/api/agents` returns 18 agents
**AC-6**: Protected config validation passes
**AC-7**: All SVG icons render correctly

## Phase 2: Pseudocode

### Removal Algorithm

```
PROCEDURE RemoveMetaAgents():

  # 1. Pre-Removal Verification
  VERIFY replacement agents exist (6 specialists)
  VERIFY no critical dependencies on meta agents
  COUNT current agents (expect 20)

  # 2. Backup Creation
  CREATE backup directory: /workspaces/agent-feed/backups/meta-agent-removal-{timestamp}/
  COPY meta-agent.md → backup/
  COPY meta-update-agent.md → backup/
  COPY .system/meta-agent.protected.yaml → backup/
  COPY .system/meta-update-agent.protected.yaml → backup/

  # 3. Dependency Analysis
  SEARCH all agent files for "meta-agent" references
  SEARCH all agent files for "meta-update-agent" references
  SEARCH skills directory for meta agent references
  SEARCH database for agent_pages entries
  LOG all dependencies found

  # 4. File Removal (Atomic)
  BEGIN TRANSACTION:
    REMOVE /workspaces/agent-feed/prod/.claude/agents/meta-agent.md
    REMOVE /workspaces/agent-feed/prod/.claude/agents/meta-update-agent.md
    ARCHIVE /workspaces/agent-feed/prod/.system/meta-agent.protected.yaml
    ARCHIVE /workspaces/agent-feed/prod/.system/meta-update-agent.protected.yaml
  COMMIT TRANSACTION

  # 5. Verification
  COUNT agents in directory (expect 18)
  VERIFY tier distribution: T1=8, T2=8
  RUN backend agent loader
  VERIFY 18 agents loaded
  CHECK for any errors in logs

  # 6. Frontend Validation
  START development server
  OPEN browser to /
  COUNT agents in sidebar (expect 18)
  TEST tier toggle: All (18), T1 (8), T2 (8)
  VERIFY all SVG icons render
  CHECK console for errors

  # 7. Rollback Procedure (If Needed)
  IF any validation fails:
    RESTORE meta-agent.md from backup
    RESTORE meta-update-agent.md from backup
    RESTORE protected configs from backup
    VERIFY 20 agents restored
    LOG rollback reason
    ABORT removal
  ENDIF

  # 8. Cleanup
  IF all validations pass:
    MOVE backups to archive directory
    UPDATE documentation
    CREATE removal summary report
    COMMIT changes to git
  ENDIF

END PROCEDURE
```

### Validation Algorithm

```
FUNCTION ValidateAgentRemoval() → Boolean:

  # File System Validation
  agent_count = COUNT_FILES("/workspaces/agent-feed/prod/.claude/agents/*.md")
  IF agent_count != 18:
    RETURN FALSE
  ENDIF

  # Tier Distribution Validation
  tier1_count = COUNT_AGENTS_WITH_TIER(1)
  tier2_count = COUNT_AGENTS_WITH_TIER(2)
  IF tier1_count != 8 OR tier2_count != 8:
    RETURN FALSE
  ENDIF

  # Backend API Validation
  response = HTTP_GET("/api/agents")
  IF response.length != 18:
    RETURN FALSE
  ENDIF

  # Protected Config Validation
  meta_agent_exists = FILE_EXISTS(".system/meta-agent.protected.yaml")
  meta_update_exists = FILE_EXISTS(".system/meta-update-agent.protected.yaml")
  IF meta_agent_exists OR meta_update_exists:
    RETURN FALSE
  ENDIF

  # SVG Icon Validation
  FOR EACH agent IN remaining_agents:
    IF agent.icon_type == "svg":
      icon_renders = VERIFY_SVG_ICON(agent.icon)
      IF NOT icon_renders:
        RETURN FALSE
      ENDIF
    ENDIF
  ENDFOR

  RETURN TRUE

END FUNCTION
```

## Phase 3: Architecture (Next)

*To be completed in next phase*

## Phase 4: Refinement (TDD)

*To be completed in TDD phase*

## Phase 5: Completion

*To be completed in execution phase*

---

**Document Version**: 1.0
**Created**: 2025-10-20
**Status**: Specification Complete, Pseudocode Complete
**Next Phase**: Architecture Review
