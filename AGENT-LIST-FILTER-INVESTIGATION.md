# Agent List Filtering Investigation - Production Agents Only

**Date**: October 18, 2025
**Issue**: UI at http://127.0.0.1:5173/agents shows all agents, not just production agents
**Goal**: Only show agents from `/workspaces/agent-feed/prod/.claude/agents` in the UI

---

## Current Situation

### Production Agents Directory
**Location**: `/workspaces/agent-feed/prod/.claude/agents/`
**Count**: 13 agents

**Production Agents**:
1. agent-feedback-agent
2. agent-ideas-agent
3. dynamic-page-testing-agent
4. follow-ups-agent
5. get-to-know-you-agent
6. link-logger-agent
7. meeting-next-steps-agent
8. meeting-prep-agent
9. meta-agent
10. meta-update-agent
11. page-builder-agent
12. page-verification-agent
13. personal-todos-agent

### API Currently Returns
**Endpoint**: `GET /api/agents`
**Count**: 22 agents

**All Agents Returned**:
1. APIIntegrator ❌ (system template, not in prod)
2. BackendDeveloper ❌ (system template, not in prod)
3. DatabaseManager ❌ (system template, not in prod)
4. PerformanceTuner ❌ (system template, not in prod)
5. ProductionValidator ❌ (system template, not in prod)
6. SecurityAnalyzer ❌ (system template, not in prod)
7. agent-feedback-agent ✅ (in prod)
8. agent-ideas-agent ✅ (in prod)
9. creative-writer ❌ (system template, not in prod)
10. data-analyst ❌ (system template, not in prod)
11. dynamic-page-testing-agent ✅ (in prod)
12. follow-ups-agent ✅ (in prod)
13. get-to-know-you-agent ✅ (in prod)
14. link-logger-agent ✅ (in prod)
15. meeting-next-steps-agent ✅ (in prod)
16. meeting-prep-agent ✅ (in prod)
17. meta-agent ✅ (in prod)
18. meta-update-agent ✅ (in prod)
19. page-builder-agent ✅ (in prod)
20. page-verification-agent ✅ (in prod)
21. personal-todos-agent ✅ (in prod)
22. tech-guru ❌ (system template, not in prod)

**Problem**: API returns 22 agents (13 production + 9 system templates)
**Expected**: API should only return 13 production agents

---

## Root Cause Analysis

### Current Architecture

#### 1. Database Mode
**Environment Variable**: `USE_POSTGRES=true` (in `.env` line 91)
**Current Mode**: PostgreSQL

#### 2. Data Flow
```
HTTP Request: GET /api/agents
    ↓
server.js:688 - app.get('/api/agents')
    ↓
dbSelector.getAllAgents(userId)
    ↓
config/database-selector.js:53 - getAllAgents()
    ↓
if (USE_POSTGRES) → agentRepo.getAllAgents(userId)
    ↓
repositories/postgres/agent.repository.js:15 - getAllAgents()
    ↓
PostgreSQL Query: SELECT FROM system_agent_templates
    ↓
Returns 22 agents (all system templates)
```

#### 3. The Problem
**File**: `/workspaces/agent-feed/api-server/repositories/postgres/agent.repository.js`
**Method**: `getAllAgents(userId)`
**Lines**: 15-58

**Current Query**:
```sql
SELECT
  COALESCE(uac.id::text, sat.name::text) as id,
  sat.name,
  sat.slug,
  COALESCE(uac.custom_name, sat.name) as display_name,
  ...
FROM system_agent_templates sat
LEFT JOIN user_agent_customizations uac
  ON sat.name = uac.agent_template AND uac.user_id = $1
ORDER BY sat.name ASC
```

**Issue**: This query returns ALL agents from `system_agent_templates` table, which includes:
- Production agents (from `/prod/.claude/agents/`)
- System templates (APIIntegrator, BackendDeveloper, etc.)
- Development agents (not in prod)

#### 4. Two Separate Agent Sources

**Source 1: PostgreSQL Database** (`system_agent_templates` table)
- Contains 22 agents (system templates)
- Used when `USE_POSTGRES=true`
- Populated by migrations or seed scripts

**Source 2: Filesystem** (`/prod/.claude/agents/`)
- Contains 13 production agents
- Markdown files with YAML frontmatter
- This is where production agents are defined

**Conflict**: The PostgreSQL database contains more agents than the production filesystem directory.

---

## Investigation Findings

### Finding 1: Dual Agent Sources
There are TWO places agents are defined:

1. **PostgreSQL Database** - `system_agent_templates` table
   - 22 agents total
   - Includes system templates for development/testing
   - Currently being used (USE_POSTGRES=true)

2. **Filesystem** - `/prod/.claude/agents/*.md`
   - 13 production agents only
   - Agent definitions with YAML frontmatter
   - NOT currently being used by `/api/agents` endpoint

### Finding 2: Agent Repository Reads from PostgreSQL
**File**: `/workspaces/agent-feed/api-server/repositories/agent.repository.js`
**Line 12**: `const AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';`

This repository is designed to read from the filesystem, but it's NOT being used by the main API endpoint because `USE_POSTGRES=true`.

### Finding 3: Tools Loading from Wrong Location
**File**: `/workspaces/agent-feed/api-server/server.js`
**Line 714**: `const agentFilePath = join(__dirname, '../agents/${agentName}.md');`

This loads tools from `/workspaces/agent-feed/agents/` (dev directory), not from `/workspaces/agent-feed/prod/.claude/agents/` (production directory).

**Mismatch**: Tools are loaded from dev directory, but agents should come from prod directory.

---

## Options for Resolution

### Option 1: Switch to Filesystem-Based Agent Repository ✅ RECOMMENDED
**Approach**: Disable PostgreSQL for agents, use filesystem instead

**Changes Required**:
1. Set `USE_POSTGRES=false` in `.env` (or create separate flag for agents)
2. Update `database-selector.js` to read from `/prod/.claude/agents/` when in filesystem mode
3. Update `loadAgentTools()` in `server.js` to read from `/prod/.claude/agents/`
4. Keep PostgreSQL for posts, comments, and other data

**Pros**:
- ✅ Single source of truth (filesystem)
- ✅ Agents defined in one place
- ✅ Easy to add/remove agents (just add/remove markdown files)
- ✅ Version control friendly (git tracks markdown files)
- ✅ Matches user's paradigm: "agents from /prod/.claude/agents only"

**Cons**:
- ⚠️ Need to handle PostgreSQL gracefully for other features
- ⚠️ Requires testing to ensure posts/comments still work

**Complexity**: LOW-MEDIUM
**Risk**: LOW

---

### Option 2: Filter PostgreSQL Query to Production Agents Only
**Approach**: Modify PostgreSQL query to only return production agents

**Changes Required**:
1. Add a `is_production` or `environment` column to `system_agent_templates` table
2. Mark 13 agents as production
3. Update query: `WHERE is_production = true`
4. Update `loadAgentTools()` to read from `/prod/.claude/agents/`

**Pros**:
- ✅ Keeps PostgreSQL as primary data source
- ✅ Can easily toggle agents between prod/dev

**Cons**:
- ⚠️ Requires database migration
- ⚠️ Dual source of truth (database + filesystem)
- ⚠️ Must keep database in sync with filesystem
- ⚠️ More complex maintenance

**Complexity**: MEDIUM
**Risk**: MEDIUM

---

### Option 3: Sync Filesystem to PostgreSQL (One-Way)
**Approach**: Read agents from filesystem, populate PostgreSQL

**Changes Required**:
1. Create sync script that reads `/prod/.claude/agents/*.md`
2. Populate `system_agent_templates` table with only those 13 agents
3. Delete non-production agents from database
4. Run sync on server startup
5. Update `loadAgentTools()` to read from `/prod/.claude/agents/`

**Pros**:
- ✅ Filesystem is source of truth
- ✅ PostgreSQL stays as interface
- ✅ Can use existing repository code

**Cons**:
- ⚠️ Need to keep in sync
- ⚠️ More complex startup process
- ⚠️ Risk of sync failures

**Complexity**: MEDIUM-HIGH
**Risk**: MEDIUM

---

### Option 4: Hybrid Approach - Filesystem for Agents, PostgreSQL for Data ✅ RECOMMENDED
**Approach**: Use filesystem repository for agents only, keep PostgreSQL for everything else

**Changes Required**:
1. Create new environment variable: `AGENTS_SOURCE=filesystem` (or `USE_POSTGRES_AGENTS=false`)
2. Update `database-selector.js`:
   ```javascript
   async getAllAgents(userId) {
     if (this.usePostgresAgents) {
       return await agentRepo.getAllAgents(userId);  // PostgreSQL
     } else {
       return await fsAgentRepo.getAllAgents(userId);  // Filesystem
     }
   }
   ```
3. Use existing `/repositories/agent.repository.js` (filesystem-based)
4. Update `loadAgentTools()` in `server.js` to use same source
5. Keep `USE_POSTGRES=true` for posts, comments, analytics

**Pros**:
- ✅ Clean separation of concerns
- ✅ Filesystem for agent definitions (source of truth)
- ✅ PostgreSQL for runtime data (posts, comments, etc.)
- ✅ Easy to switch sources with env variable
- ✅ No database migrations needed
- ✅ Matches existing code structure

**Cons**:
- ⚠️ Slightly more complex configuration

**Complexity**: LOW
**Risk**: LOW

---

## Recommended Solution

### ✅ **Option 4: Hybrid Approach**

**Rationale**:
1. Agents are configuration/templates → should live in filesystem (version controlled)
2. Runtime data (posts, comments) → should live in PostgreSQL (scalable, queryable)
3. Clear separation of concerns
4. Minimal changes to existing code
5. Easy to maintain and understand

---

## Implementation Plan

### Phase 1: Investigation ✅ COMPLETE
- [x] Identify current agent sources (PostgreSQL + filesystem)
- [x] Count production agents (13 in `/prod/.claude/agents/`)
- [x] Count API returned agents (22 from PostgreSQL)
- [x] Analyze data flow
- [x] Identify root cause
- [x] Create implementation plan

### Phase 2: Configuration Changes
- [ ] Add environment variable: `AGENTS_SOURCE=filesystem` (or `USE_POSTGRES_AGENTS=false`)
- [ ] Update `.env` file
- [ ] Document configuration option

### Phase 3: Code Changes

#### 3.1 Update Database Selector
**File**: `/workspaces/agent-feed/api-server/config/database-selector.js`

**Changes**:
1. Add configuration option for agent source
2. Import filesystem agent repository
3. Update `getAllAgents()` to use filesystem when configured
4. Update `getAgentByName()` to use filesystem
5. Update `getAgentBySlug()` to use filesystem

#### 3.2 Update Tools Loading
**File**: `/workspaces/agent-feed/api-server/server.js`

**Changes**:
1. Update `loadAgentTools()` function (line 712-743)
2. Change path from `../agents/` to `/workspaces/agent-feed/prod/.claude/agents/`
3. Ensure it uses same source as agent repository

#### 3.3 Ensure Filesystem Repository is Ready
**File**: `/workspaces/agent-feed/api-server/repositories/agent.repository.js`

**Current Status**: ✅ Already points to `/prod/.claude/agents/` (line 12)
**Action**: Verify it works correctly, test edge cases

### Phase 4: Testing
- [ ] Test `GET /api/agents` returns exactly 13 agents
- [ ] Test each agent slug works: `GET /api/agents/:slug`
- [ ] Test tools are loaded correctly from `/prod/.claude/agents/`
- [ ] Test UI at http://127.0.0.1:5173/agents shows only 13 agents
- [ ] Test agent profile pages load correctly
- [ ] Test PostgreSQL still works for posts/comments
- [ ] Test adding new agent (add markdown file, verify it appears)
- [ ] Test removing agent (remove markdown file, verify it disappears)

### Phase 5: Validation
- [ ] Verify exactly 13 agents in UI
- [ ] Verify all 13 agents have correct data
- [ ] Verify tools display correctly
- [ ] Verify no console errors
- [ ] Verify no broken links
- [ ] Verify Dynamic Pages still work
- [ ] Capture screenshots

### Phase 6: Documentation
- [ ] Update README with agent source configuration
- [ ] Document how to add new production agents
- [ ] Document filesystem structure
- [ ] Update deployment guide

---

## Files to Modify

### Configuration
1. **`.env`** - Add `AGENTS_SOURCE=filesystem`

### Backend
2. **`/workspaces/agent-feed/api-server/config/database-selector.js`**
   - Add agent source configuration
   - Import filesystem repository
   - Update `getAllAgents()`, `getAgentByName()`, `getAgentBySlug()`

3. **`/workspaces/agent-feed/api-server/server.js`**
   - Update `loadAgentTools()` function (line 714)
   - Change from `../agents/` to `/workspaces/agent-feed/prod/.claude/agents/`

### Repository (Verify)
4. **`/workspaces/agent-feed/api-server/repositories/agent.repository.js`**
   - ✅ Already configured for `/prod/.claude/agents/`
   - Verify `getAllAgents()`, `getAgentBySlug()`, `readAgentFile()` work

---

## Expected Results

### Before
- **API returns**: 22 agents
- **Production agents**: 13
- **System templates**: 9
- **UI shows**: All 22 agents

### After
- **API returns**: 13 agents ✅
- **Production agents**: 13 ✅
- **System templates**: 0 (not accessible via UI) ✅
- **UI shows**: Only 13 production agents ✅

---

## Risk Assessment

| Risk | Level | Impact | Mitigation |
|------|-------|--------|------------|
| Breaking posts/comments | 🟡 MEDIUM | High | Keep PostgreSQL for non-agent data |
| Filesystem read errors | 🟢 LOW | Medium | Error handling in repository |
| Missing agent files | 🟢 LOW | Medium | Validation on startup |
| Performance degradation | 🟢 LOW | Low | Filesystem reads are fast |
| Configuration complexity | 🟢 LOW | Low | Single env variable |

**Overall Risk**: 🟢 **LOW**

---

## Verification Steps

### 1. API Test
```bash
curl http://localhost:3001/api/agents | jq '.data | length'
# Expected: 13

curl http://localhost:3001/api/agents | jq '.data[].name'
# Expected: Only production agent names
```

### 2. UI Test
Navigate to: http://127.0.0.1:5173/agents

**Expected**:
- See exactly 13 agents
- No APIIntegrator, BackendDeveloper, etc.
- All agent names match `/prod/.claude/agents/*.md` files

### 3. Agent Profile Test
Navigate to: http://127.0.0.1:5173/agents/meta-agent

**Expected**:
- Agent loads correctly
- Tools section shows tools from `/prod/.claude/agents/meta-agent.md`
- Dynamic Pages tab still works

### 4. Database Test (Posts/Comments)
Navigate to: http://127.0.0.1:5173/

**Expected**:
- Feed loads correctly
- Posts displayed from PostgreSQL
- Comments work
- No regressions

---

## Timeline Estimate

- **Investigation**: ✅ Complete (30 minutes)
- **Configuration**: 5 minutes
- **Code Changes**: 15 minutes
- **Testing**: 20 minutes
- **Validation**: 10 minutes
- **Documentation**: 10 minutes

**Total**: ~60 minutes (excluding investigation)

---

## Questions for User Confirmation

1. ✅ **Confirmed**: Only agents in `/prod/.claude/agents/` should be visible in UI
2. ❓ **Question**: Should PostgreSQL still be used for posts, comments, and other data?
   - **Assumption**: YES - only agents come from filesystem
3. ❓ **Question**: What should happen to system templates (APIIntegrator, etc.)?
   - **Option A**: Keep in database but hide from UI
   - **Option B**: Delete from database entirely
   - **Recommendation**: Option A (keep for potential admin/dev use)

---

## Recommendation

**Implement Option 4: Hybrid Approach**

**Summary**:
- Use filesystem (`/prod/.claude/agents/`) for agent definitions
- Use PostgreSQL for runtime data (posts, comments, analytics)
- Add single environment variable for configuration
- Minimal code changes (3 files)
- Low risk, high clarity

**Next Step**: Awaiting user confirmation to proceed with implementation.

---

**Investigation Status**: ✅ **COMPLETE**
**Plan Status**: 📋 **READY FOR APPROVAL**
**Recommendation**: Hybrid approach (filesystem for agents, PostgreSQL for data)
