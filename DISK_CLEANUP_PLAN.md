# 🧹 Disk Space Cleanup Plan

## Current Status
- **Total Disk:** 32GB
- **Used:** 29GB (95%)
- **Available:** 1.7GB
- **Status:** 🔴 CRITICAL - Need immediate action

---

## 📊 Space Usage Analysis

### Top Space Consumers

| Directory | Size | % of Total | Safe to Delete? |
|-----------|------|------------|-----------------|
| `/node_modules` | 751MB | 2.5% | ⚠️ Partial (unused test dirs) |
| `/tests` | 654MB | 2.2% | ✅ Yes (old validation tests) |
| `/frontend/node_modules` | 350MB | 1.2% | ❌ No (active) |
| `/prod` | 189MB | 0.6% | ❌ No (production) |
| `/api-server/node_modules` | 52MB | 0.2% | ❌ No (active) |
| `/coverage` | 19MB | 0.1% | ✅ Yes (test coverage reports) |
| `/dist` | 3.5MB | <0.1% | ✅ Yes (build artifacts) |

### Duplicate node_modules (Major Issue!)

**Found 140+ node_modules directories consuming ~2.2GB total!**

Many test directories have their own complete node_modules installations:
- 23 test subdirectories with node_modules (50-90MB each)
- 6 nested node_modules in prod/ directory
- Multiple duplicate installations of same packages

---

## 🎯 Cleanup Plan - 3 Tiers

### Tier 1: Safe & High Impact (Recommended) - ~1.5GB Recovery

**Impact:** Recover **~1.5GB** (50% of needed space)
**Risk:** 🟢 ZERO RISK - These are old/unused files
**Time:** 5 minutes

#### Actions:

1. **Delete Old Test Directories** (~654MB)
   ```bash
   rm -rf /workspaces/agent-feed/tests/*
   ```
   - These are old validation test directories
   - No longer actively used
   - Can be regenerated if needed

   **Directories to delete:**
   - `link-preview/` (91MB)
   - `agents-context-validation/` (77MB)
   - `production-validation/` (52MB)
   - `comprehensive-e2e-validation/` (51MB)
   - `frontend-api/` (50MB)
   - `claude-api-validation/` (45MB)
   - `comprehensive-sparc-validation/` (35MB)
   - `production-e2e-validation/` (34MB)
   - `playwright-claude-code/` (32MB)
   - `nld-monitoring/` (32MB)
   - `websocket-stability/` (31MB)
   - `comprehensive-fake-data-elimination/` (31MB)
   - `ssr-compatibility/` (30MB)
   - `playwright-mcp-validation/` (25MB)

2. **Delete Test Coverage Reports** (~19MB)
   ```bash
   rm -rf /workspaces/agent-feed/coverage
   ```
   - Can be regenerated with `npm run test:coverage`

3. **Delete Build Artifacts** (~3.5MB)
   ```bash
   rm -rf /workspaces/agent-feed/dist
   ```
   - Can be regenerated with `npm run build`

4. **Delete Old Screenshot Validation** (~6MB)
   ```bash
   rm -rf /workspaces/agent-feed/validation-screenshots
   rm -rf /workspaces/agent-feed/final-validation-screenshots
   rm -rf /workspaces/agent-feed/avi-validation-report
   rm -rf /workspaces/agent-feed/playwright-report
   rm /workspaces/agent-feed/agents-page-screenshot.png
   ```

5. **Clean prod/tests node_modules** (~87MB)
   ```bash
   rm -rf /workspaces/agent-feed/prod/tests/node_modules
   ```
   - Old test environment, not actively used

**Total Tier 1 Recovery: ~1.5GB**

---

### Tier 2: Moderate Impact, Low Risk - ~500MB Recovery

**Impact:** Additional **~500MB** recovery
**Risk:** 🟡 LOW RISK - Can be reinstalled easily
**Time:** 10 minutes (requires npm install afterward)

#### Actions:

1. **Clean and Reinstall Root node_modules** (~751MB → ~400MB)
   ```bash
   # Backup package files
   cp package.json package.json.backup
   cp package-lock.json package-lock.json.backup

   # Remove and reinstall
   rm -rf /workspaces/agent-feed/node_modules
   npm ci --legacy-peer-deps
   ```
   - Removes nested duplicates
   - Fresh install is cleaner
   - Recovery: ~350MB

2. **Remove Unused Scripts node_modules** (~55MB)
   ```bash
   rm -rf /workspaces/agent-feed/scripts/code-analysis/node_modules
   ```
   - Code analysis scripts rarely used

3. **Clean playwright-mcp node_modules** (~38MB)
   ```bash
   rm -rf /workspaces/agent-feed/playwright-mcp/node_modules
   ```
   - Can reinstall if needed: `cd playwright-mcp && npm install`

4. **Remove monitoring test node_modules** (~1MB)
   ```bash
   rm -rf /workspaces/agent-feed/monitoring/performance-tests/node_modules
   ```

**Total Tier 2 Recovery: ~500MB**

---

### Tier 3: Nuclear Option - ~1GB+ Recovery

**Impact:** Recover **1GB+** by removing ALL non-essential node_modules
**Risk:** 🔴 MEDIUM RISK - Requires reinstallation
**Time:** 20-30 minutes (reinstall time)

#### Actions:

1. **Remove ALL test node_modules except active frontend tests**
   ```bash
   find /workspaces/agent-feed -name "node_modules" -path "*/tests/*" -type d -exec rm -rf {} \; 2>/dev/null
   ```

2. **Remove prod/ node_modules and reinstall minimal**
   ```bash
   rm -rf /workspaces/agent-feed/prod/node_modules
   cd /workspaces/agent-feed/prod && npm ci --production
   ```
   - Only production dependencies

3. **Clean npm cache**
   ```bash
   npm cache clean --force
   ```
   - Removes cached packages

4. **Remove old database files**
   ```bash
   rm -f /workspaces/agent-feed/agent-feed.db
   rm -f /workspaces/agent-feed/agent_database.db
   ```
   - Empty/unused database files

**Total Tier 3 Recovery: ~1GB+**

---

## 📋 Recommended Execution Order

### Option A: Quick Fix (Tier 1 Only)
**Best for:** Immediate relief, zero risk
**Time:** 5 minutes
**Recovery:** ~1.5GB (brings usage to 85%)

```bash
# Execute Tier 1 cleanup
rm -rf /workspaces/agent-feed/tests/*
rm -rf /workspaces/agent-feed/coverage
rm -rf /workspaces/agent-feed/dist
rm -rf /workspaces/agent-feed/validation-screenshots
rm -rf /workspaces/agent-feed/final-validation-screenshots
rm -rf /workspaces/agent-feed/avi-validation-report
rm -rf /workspaces/agent-feed/playwright-report
rm -rf /workspaces/agent-feed/prod/tests/node_modules
rm -f /workspaces/agent-feed/agents-page-screenshot.png

# Verify space recovered
df -h /workspaces/agent-feed
```

### Option B: Thorough Cleanup (Tier 1 + Tier 2)
**Best for:** Maximum recovery with minimal risk
**Time:** 15 minutes
**Recovery:** ~2GB (brings usage to 75%)

```bash
# Execute Tier 1 (as above)
# ... then Tier 2:

# Backup package files
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup

# Clean root node_modules
rm -rf /workspaces/agent-feed/node_modules
npm ci --legacy-peer-deps

# Clean other directories
rm -rf /workspaces/agent-feed/scripts/code-analysis/node_modules
rm -rf /workspaces/agent-feed/playwright-mcp/node_modules
rm -rf /workspaces/agent-feed/monitoring/performance-tests/node_modules

# Verify
df -h /workspaces/agent-feed
```

### Option C: Nuclear Cleanup (All Tiers)
**Best for:** Maximum space recovery
**Time:** 30 minutes
**Recovery:** ~3GB+ (brings usage to <70%)

```bash
# Execute Tier 1 + Tier 2 (as above)
# ... then Tier 3:

# Remove all test node_modules
find /workspaces/agent-feed -name "node_modules" -path "*/tests/*" -type d -exec rm -rf {} \; 2>/dev/null

# Clean prod and reinstall production only
rm -rf /workspaces/agent-feed/prod/node_modules
cd /workspaces/agent-feed/prod && npm ci --production

# Clean npm cache
npm cache clean --force

# Remove old databases
rm -f /workspaces/agent-feed/agent-feed.db
rm -f /workspaces/agent-feed/agent_database.db

# Verify
df -h /workspaces/agent-feed
```

---

## ⚠️ Impact Assessment

### What Will Break?

**Tier 1 (Safe):**
- ❌ Nothing breaks
- ✅ Can regenerate all deleted items on demand

**Tier 2 (Low Risk):**
- ⚠️ Need to run `npm install` after cleanup (~5 min)
- ✅ All production code continues working during reinstall
- ✅ Active servers (frontend/backend) keep running

**Tier 3 (Medium Risk):**
- ⚠️ Test suites won't run until node_modules restored
- ⚠️ Prod directory needs reinstall (`cd prod && npm ci --production`)
- ✅ Main application continues working
- ⚠️ Requires ~20-30 minutes for full reinstall

### What Won't Break?

**All Tiers:**
- ✅ Running application (frontend/backend servers)
- ✅ Database (database.db preserved)
- ✅ Source code (all .js/.ts files)
- ✅ Configuration files (.env, package.json)
- ✅ Active frontend node_modules (kept intact)
- ✅ Active api-server node_modules (kept intact)
- ✅ Production workspace (/prod/agent_workspace/)

---

## 🔍 Prevention Recommendations

1. **Consolidate node_modules**
   - Use workspace feature (npm workspaces) to share dependencies
   - Avoid creating separate node_modules in test directories

2. **Regular Cleanup Schedule**
   - Weekly: Delete coverage reports, dist, old screenshots
   - Monthly: Review and remove unused test directories
   - Quarterly: Full node_modules cleanup and reinstall

3. **Gitignore Additions**
   - Already ignoring node_modules, coverage, dist
   - Add: validation-screenshots, playwright-report, *.png (screenshots)

4. **Docker Volume Pruning** (if using Docker)
   ```bash
   docker system prune -a --volumes
   ```

5. **Monitor Disk Usage**
   - Add script to check disk usage before tests
   - Alert when usage > 90%

---

## 📊 Expected Results

### Before Cleanup:
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/loop7       32G   29G  1.7G  95% /workspaces
```

### After Tier 1:
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/loop7       32G   27G  3.2G  85% /workspaces
```

### After Tier 1 + 2:
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/loop7       32G   25G  5.2G  75% /workspaces
```

### After All Tiers:
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/loop7       32G   22G  8G    65% /workspaces
```

---

## 🚦 My Recommendation

**Execute Tier 1 IMMEDIATELY** - This is zero-risk and gives you breathing room.

**Then consider Tier 2** once you have time - the npm reinstall takes ~10 minutes but cleans up a lot of cruft.

**Tier 3 only if desperate** - You don't need this unless you're adding large files or doing heavy development.

**Priority: Start with Tier 1 right now.**

---

*Generated: October 1, 2025*
*Current Usage: 95% (29GB/32GB)*
*Target After Cleanup: 75-85% (24-27GB/32GB)*
