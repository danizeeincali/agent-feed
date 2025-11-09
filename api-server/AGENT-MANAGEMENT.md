# Agent Management - Version Control & Initialization

## 🎯 Overview

This document describes the agent version control system for Agent Feed, enabling you to:
- **Initialize** canonical agent templates to production location
- **Backup** current agents before testing
- **Restore** from canonical templates or specific backup
- **Save** intentional improvements to canonical templates
- **Track** agent evolution through git

## 📁 Directory Structure

```
/api-server/templates/agents/          ← CANONICAL (source of truth)
   ├── get-to-know-you-agent.md
   ├── personal-todos-agent.md
   └── ... (17 agents total)

/prod/.claude/agents/                   ← ACTIVE (runtime, can be modified)
   ├── get-to-know-you-agent.md
   ├── .system/                         ← Protected configs (preserved)
   └── ... (working copies)

/prod/backups/agents-[timestamp]/       ← BACKUPS (snapshots)
   └... (timestamped copies)
```

## 🚀 Quick Reference

### Initialize Agents (Fresh Start)
```bash
npm run agents:init
```
Copies all canonical agents to production location. Use when:
- Setting up fresh development environment
- After breaking changes to agents
- Resetting to clean state

### Backup Current Agents
```bash
npm run agents:backup
```
Creates timestamped backup before testing. Always run before:
- Testing session where agents might change
- Experimenting with agent modifications
- Major refactoring work

### Restore from Canonical (Discard Changes)
```bash
npm run agents:restore
```
**DESTRUCTIVE**: Deletes current agents and restores from canonical templates.
Use after testing to discard all testing changes.

### Restore from Specific Backup
```bash
npm run agents:restore-backup
```
Interactive: Lists available backups and restores selected one.
Use to recover from mistakes or revert to previous state.

### Save Improvements to Canonical
```bash
npm run agents:save <agent-name.md>
```
Updates canonical template with current active version.
Use when you've made intentional improvements that should become the new source of truth.

**Example**:
```bash
npm run agents:save get-to-know-you-agent.md
# Reviews changes, prompts for confirmation
# Updates /api-server/templates/agents/get-to-know-you-agent.md
```

## 📋 Common Workflows

### Workflow 1: Testing Session
```bash
# 1. Backup before testing
npm run agents:backup
# Output: Created backup at /prod/backups/agents-20251107-223000/

# 2. Test and modify agents as needed
# (agents may get modified during testing)

# 3. Restore canonical versions (discard testing changes)
npm run agents:restore
# ✅ All testing changes discarded, back to clean state
```

### Workflow 2: Saving Dev Improvements
```bash
# 1. You intentionally improved get-to-know-you-agent.md

# 2. Update canonical template
npm run agents:save get-to-know-you-agent.md
# Shows diff, prompts for confirmation

# 3. Review the change
git diff api-server/templates/agents/get-to-know-you-agent.md

# 4. Commit to git
git add api-server/templates/agents/get-to-know-you-agent.md
git commit -m "Improve get-to-know-you agent onboarding flow"
git push
```

### Workflow 3: Fresh Development Environment
```bash
# Complete fresh start (database + agents)
cd /workspaces/agent-feed

# 1. Initialize database
rm -f database.db*
node api-server/scripts/init-fresh-db.js
node api-server/scripts/create-welcome-posts.js

# 2. Initialize agents
npm run agents:init

# 3. Start services
cd api-server && npm start &
cd frontend && npm run dev &

# 4. Verify
npm run agents:list
# Should show 17 agents
```

## 🔧 Script Reference

### `/api-server/scripts/init-agents.js`
**Purpose**: Copy canonical templates to production location

**Usage**: `npm run agents:init`

**What it does**:
- Verifies templates directory exists
- Copies all `.md` files from templates to production
- Preserves `.system` directory (protected configs)
- Reports success/failure for each agent

**When to use**:
- Fresh environment setup
- After breaking changes
- Resetting to clean state

---

### `/api-server/scripts/backup-agents.js`
**Purpose**: Create timestamped backup of current agents

**Usage**: `npm run agents:backup`

**What it does**:
- Creates `/prod/backups/agents-[timestamp]/` directory
- Copies all `.md` files and `.system` directory
- Stores metadata (timestamp, count, git commit)
- Returns backup location

**When to use**:
- Before testing sessions
- Before major changes
- Before experimenting

---

### `/api-server/scripts/restore-agents-from-canonical.js`
**Purpose**: Discard changes and restore from canonical templates

**Usage**: `npm run agents:restore`

**What it does**:
- Prompts for confirmation (DESTRUCTIVE operation)
- Deletes current `.md` files (preserves `.system`)
- Calls `init-agents.js` to restore from templates
- Reports what was restored

**When to use**:
- After testing (discard changes)
- Reset to known good state
- Undo unwanted modifications

---

### `/api-server/scripts/restore-agents-from-backup.js`
**Purpose**: Restore from specific backup

**Usage**: `npm run agents:restore-backup`

**What it does**:
- Lists available backups with metadata
- Prompts for selection
- Confirms before restoring
- Restores selected backup

**When to use**:
- Recover from mistakes
- Revert to previous state
- Compare against old version

---

### `/api-server/scripts/update-canonical-agent.js`
**Purpose**: Save improvements to canonical template

**Usage**: `npm run agents:save <agent-name.md>`

**What it does**:
- Shows diff between active and canonical
- Prompts for confirmation
- Copies active → canonical
- Suggests git commit command

**When to use**:
- Intentional improvements made
- Bug fixes to preserve
- New features to make permanent

## 🔍 Verification Commands

### Check Agent Count
```bash
npm run agents:list
# Should show 17 agents
```

### Verify Canonical Templates Exist
```bash
ls -lh /workspaces/agent-feed/api-server/templates/agents/*.md | wc -l
# Expected: 17
```

### Check Active Agents
```bash
ls -lh /workspaces/agent-feed/prod/.claude/agents/*.md | wc -l
# Expected: 17
```

### View Available Backups
```bash
ls -lh /workspaces/agent-feed/prod/backups/
# Lists timestamped backup directories
```

### Compare Active vs Canonical
```bash
diff /workspaces/agent-feed/prod/.claude/agents/get-to-know-you-agent.md \
     /workspaces/agent-feed/api-server/templates/agents/get-to-know-you-agent.md
# Shows differences
```

## ⚠️ Important Notes

### Canonical Templates are Source of Truth
- **DO** commit canonical templates to git
- **DO** review changes before saving to canonical
- **DON'T** manually edit canonical templates without reason

### Active Agents Can Change
- Modified during use/testing
- Not necessarily git-tracked
- Temporary working copies

### Protected Configs Preserved
- `.system/` directory always preserved
- Contains protected agent configurations
- Never deleted during restore operations

### Backups are NOT Git-Tracked
- Stored in `/prod/backups/`
- Add to `.gitignore` (recommended)
- Point-in-time snapshots only

## 🚨 Troubleshooting

### "No agent templates found"
**Problem**: Templates directory doesn't exist or is empty

**Solution**:
```bash
# Check if templates exist
ls /workspaces/agent-feed/api-server/templates/agents/

# If empty, copy from active location
cp /workspaces/agent-feed/prod/.claude/agents/*.md \
   /workspaces/agent-feed/api-server/templates/agents/
```

### "Protected configs not preserved"
**Problem**: `.system` directory deleted after restore

**Check**: Verify `.system` exists
```bash
ls -la /workspaces/agent-feed/prod/.claude/agents/.system/
```

**Fix**: Restore from backup if needed
```bash
npm run agents:restore-backup
# Select backup with .system directory
```

### "Agents mismatch (expected 17, found X)"
**Problem**: Some agents missing

**Diagnostic**:
```bash
# Compare canonical vs active
diff <(ls /workspaces/agent-feed/api-server/templates/agents/) \
     <(ls /workspaces/agent-feed/prod/.claude/agents/ | grep '.md$')
```

**Fix**: Reinitialize
```bash
npm run agents:init
```

## 📊 Integration with Database Initialization

Agents and database should be initialized together for complete fresh start:

```bash
# Full system reset
cd /workspaces/agent-feed

# 1. Database
rm -f database.db*
node api-server/scripts/init-fresh-db.js
node api-server/scripts/create-welcome-posts.js

# 2. Agents
npm run agents:init

# 3. Verify
sqlite3 database.db "SELECT COUNT(*) FROM agent_posts;"  # Should be 3
npm run agents:list                                       # Should be 17
```

## 🎯 Best Practices

1. **Always backup before testing**
   - `npm run agents:backup` before each test session
   - Creates safety net

2. **Distinguish testing vs development**
   - Testing changes → restore from canonical
   - Dev improvements → save to canonical + commit

3. **Review before saving**
   - Check diff before saving to canonical
   - Ensure changes are intentional

4. **Commit canonical changes**
   - Canonical templates should be git-tracked
   - Commit messages should describe agent changes

5. **Use descriptive commit messages**
   ```bash
   git commit -m "Improve get-to-know-you agent Phase 2 questions"
   git commit -m "Fix personal-todos agent priority sorting"
   ```

6. **Backup before major changes**
   - Backup before refactoring multiple agents
   - Enables easy rollback

## 🔗 Related Documentation

- `/api-server/INITIALIZATION.md` - Database initialization
- `/prod/.claude/agents/.system/README.md` - Protected configs
- `/docs/PROTECTED-FIELDS.md` - Agent protection system

---

**Last Updated**: 2025-11-07
**Scripts Location**: `/api-server/scripts/`
**Canonical Templates**: `/api-server/templates/agents/`
**Active Agents**: `/prod/.claude/agents/`
