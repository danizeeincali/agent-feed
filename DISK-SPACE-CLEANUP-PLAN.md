# Disk Space Cleanup Plan

**Date**: 2025-10-20
**Current Usage**: 96% (29GB/32GB) - Only 1.3GB free
**Status**: 🔴 CRITICAL - Immediate action required

---

## Current Disk Usage Analysis

### Top Space Consumers

| Directory | Size | Cleanup Potential |
|-----------|------|-------------------|
| `/prod/` | 1021M | 🟢 HIGH - Duplicate node_modules |
| `/node_modules/` | 732M | 🟡 MEDIUM - Required for app |
| `/frontend/` | 634M | 🟡 MEDIUM - Has build artifacts |
| `.git/` | ~500M | 🟢 HIGH - Large pack files |
| `/api-server/` | 80M | 🟢 LOW - Keep |
| `/tests/` | 43M | 🟢 MEDIUM - Old test artifacts |
| `database.db` | 11M | 🟡 LOW - Production data |
| `/docs/` | 9M | 🟢 LOW - Keep documentation |

### Large Files Identified (10MB+)

1. **ONNX Runtime binaries** (multiple platforms) - ~200MB total
   - `/prod/node_modules/onnxruntime-node/`
   - Includes Windows, macOS, ARM64 binaries (we only need Linux x64)

2. **Git pack file** - ~50MB
   - `.git/objects/pack/pack-*.pack`

3. **Database files** - ~11MB + ~10MB backup
   - `database.db` (11M)
   - `database.db-wal` (324K)

---

## Cleanup Strategy (Estimated Recovery: 500-800MB)

### Phase 1: Safe Immediate Cleanup (🟢 Low Risk)

**Estimated Recovery: 200-300MB**

#### 1.1 Delete Duplicate node_modules in /prod/ (Est. 500MB)
```bash
# prod/ directory has its own node_modules that duplicates root
rm -rf /workspaces/agent-feed/prod/node_modules
```
**Risk**: 🟢 LOW - prod directory shouldn't need separate dependencies
**Recovery**: ~500MB

#### 1.2 Clean npm cache (Est. 50-100MB)
```bash
npm cache clean --force
```
**Risk**: 🟢 NONE - Just cache
**Recovery**: ~50-100MB

#### 1.3 Remove test artifacts and old reports (Est. 30MB)
```bash
# Old Playwright reports
rm -rf /workspaces/agent-feed/playwright-report
rm -rf /workspaces/agent-feed/test-results
rm -rf /workspaces/agent-feed/tests/e2e/test-results
rm -rf /workspaces/agent-feed/tests/e2e/playwright-report

# Old screenshots from previous fixes
rm -rf /workspaces/agent-feed/phase2-screenshots
rm -rf /workspaces/agent-feed/screenshots/meta-removal*
rm -rf /workspaces/agent-feed/screenshots/svg-icons
```
**Risk**: 🟢 LOW - Old test artifacts
**Recovery**: ~30MB

#### 1.4 Clean frontend build artifacts (Est. 100-200MB)
```bash
cd /workspaces/agent-feed/frontend
rm -rf dist/
rm -rf node_modules/.vite/
rm -rf node_modules/.cache/
```
**Risk**: 🟢 NONE - Will rebuild automatically
**Recovery**: ~100-200MB

#### 1.5 Remove old logs (Est. 10MB)
```bash
# Keep only last 7 days of logs
find /workspaces/agent-feed/logs -name "*.log" -mtime +7 -delete
# Truncate large logs
truncate -s 0 /workspaces/agent-feed/logs/combined.log
```
**Risk**: 🟢 LOW - Old logs
**Recovery**: ~10MB

---

### Phase 2: Git Repository Cleanup (🟡 Medium Risk)

**Estimated Recovery: 100-200MB**

#### 2.1 Prune git history
```bash
git gc --aggressive --prune=now
git repack -a -d --depth=250 --window=250
```
**Risk**: 🟡 MEDIUM - Requires git knowledge
**Recovery**: ~50-100MB

#### 2.2 Remove untracked files
```bash
# Show what will be removed (dry run)
git clean -xdn

# Actually remove (CAREFUL!)
git clean -xdf
```
**Risk**: 🟡 MEDIUM - Removes all untracked files
**Recovery**: ~50-100MB

---

### Phase 3: Platform-Specific Binary Cleanup (🟡 Medium Risk)

**Estimated Recovery: 100-150MB**

#### 3.1 Remove unused ONNX binaries
```bash
# Keep only Linux x64, remove Windows/macOS/ARM variants
find /workspaces/agent-feed -path "*/onnxruntime-node/bin/napi-*/win32" -type d -exec rm -rf {} + 2>/dev/null
find /workspaces/agent-feed -path "*/onnxruntime-node/bin/napi-*/darwin" -type d -exec rm -rf {} + 2>/dev/null
find /workspaces/agent-feed -path "*/onnxruntime-node/bin/napi-*/linux/arm64" -type d -exec rm -rf {} + 2>/dev/null
```
**Risk**: 🟡 MEDIUM - May affect some packages
**Recovery**: ~100-150MB

---

### Phase 4: Database Optimization (🟢 Low Risk)

**Estimated Recovery: 5-10MB**

#### 4.1 Vacuum SQLite database
```bash
sqlite3 /workspaces/agent-feed/database.db "VACUUM;"
sqlite3 /workspaces/agent-feed/database.db "ANALYZE;"
```
**Risk**: 🟢 LOW - Standard DB maintenance
**Recovery**: ~5-10MB

#### 4.2 Remove old database backups
```bash
# Keep only last 3 backups
cd /workspaces/agent-feed/backups
ls -t database*.db | tail -n +4 | xargs rm -f
```
**Risk**: 🟢 LOW - Old backups
**Recovery**: ~5MB

---

## Recommended Execution Order

### Step 1: Quick Wins (Execute Now)
```bash
# 1. Remove duplicate node_modules in prod/
rm -rf /workspaces/agent-feed/prod/node_modules

# 2. Clean npm cache
npm cache clean --force

# 3. Remove old test artifacts
rm -rf /workspaces/agent-feed/playwright-report
rm -rf /workspaces/agent-feed/test-results
rm -rf /workspaces/agent-feed/phase2-screenshots

# 4. Clean frontend build artifacts
rm -rf /workspaces/agent-feed/frontend/dist
rm -rf /workspaces/agent-feed/frontend/node_modules/.vite
rm -rf /workspaces/agent-feed/frontend/node_modules/.cache

# 5. Truncate large logs
truncate -s 0 /workspaces/agent-feed/logs/combined.log
```

**Expected Recovery**: ~600-700MB
**Time**: 2 minutes
**Risk**: 🟢 VERY LOW

### Step 2: Git Cleanup (After Step 1)
```bash
git gc --aggressive --prune=now
```

**Expected Recovery**: ~50-100MB
**Time**: 5-10 minutes
**Risk**: 🟡 LOW-MEDIUM

### Step 3: Remove unused binaries (Optional)
Only if still low on space after Steps 1-2.

---

## What NOT to Delete

❌ **DO NOT DELETE**:
- `/node_modules/` (root) - Required for backend
- `/frontend/src/` - Source code
- `/api-server/` - Backend source
- `/docs/` - Documentation we just created
- `database.db` - Production data
- `.git/` - Version control (except cleanup)
- Active log files from today

---

## Safety Checklist

Before executing cleanup:
- [ ] Commit current work to git
- [ ] Backup database.db
- [ ] Note current disk usage
- [ ] Services are stopped (or note they're running)

After cleanup:
- [ ] Verify disk space recovered
- [ ] Test app still runs
- [ ] Verify git repository integrity
- [ ] Check npm install still works

---

## Monitoring Commands

```bash
# Check disk space
df -h /workspaces/agent-feed

# Find largest directories
du -sh /workspaces/agent-feed/* | sort -hr | head -10

# Find large files
find /workspaces/agent-feed -type f -size +10M

# Check git repo size
du -sh /workspaces/agent-feed/.git
```

---

## Expected Results

**Before Cleanup**:
- Used: 29GB / 32GB (96%)
- Available: 1.3GB

**After Phase 1 (Quick Wins)**:
- Expected Recovery: 600-700MB
- Available: ~2GB (93% usage)

**After Phase 2 (Git Cleanup)**:
- Expected Recovery: Additional 50-100MB
- Available: ~2.1-2.2GB (92% usage)

**After Phase 3 (Binary Cleanup)**:
- Expected Recovery: Additional 100-150MB
- Available: ~2.3-2.4GB (90% usage)

---

## Emergency Cleanup (If Critical)

If disk is completely full and services won't start:

```bash
# Nuclear option: Remove ALL test artifacts
rm -rf /workspaces/agent-feed/tests/e2e/test-results
rm -rf /workspaces/agent-feed/tests/e2e/videos
rm -rf /workspaces/agent-feed/tests/e2e/screenshots
rm -rf /workspaces/agent-feed/playwright-report
rm -rf /workspaces/agent-feed/test-results
rm -rf /workspaces/agent-feed/screenshots

# Remove all logs
rm -rf /workspaces/agent-feed/logs/*.log

# Clean all build artifacts
rm -rf /workspaces/agent-feed/frontend/dist
rm -rf /workspaces/agent-feed/*/node_modules/.cache
rm -rf /workspaces/agent-feed/*/node_modules/.vite

# This should recover ~500MB immediately
```

---

## Automation Script

Created automated cleanup script at:
`/workspaces/agent-feed/scripts/cleanup-disk-space.sh`

Run with:
```bash
chmod +x /workspaces/agent-feed/scripts/cleanup-disk-space.sh
./scripts/cleanup-disk-space.sh --safe  # Phase 1 only
./scripts/cleanup-disk-space.sh --full  # All phases
./scripts/cleanup-disk-space.sh --emergency  # Nuclear option
```

---

**Status**: Plan created and ready to execute
**Recommendation**: Start with Phase 1 (Quick Wins) immediately
