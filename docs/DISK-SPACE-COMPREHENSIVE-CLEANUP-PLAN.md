# Disk Space Comprehensive Cleanup Plan

**Date**: 2025-10-28
**Current Status**: **96% FULL** (29GB / 32GB used, 1.2GB free)
**Last Cleanup**: Got to 94% (only 1% below threshold)
**Problem**: Disk fills up again within hours after cleanup

---

## 🚨 ROOT CAUSE ANALYSIS

### Why Disk Keeps Filling Up

**The Problem**: Previous cleanups focused on project files, NOT the actual space hogs.

**The Real Culprits** (Total: **16.8GB** of 29GB used):

1. **~/.cache/ms-playwright** = **6.1GB** (5 Chromium + 3 Firefox + 2 WebKit versions)
2. **~/.cache/puppeteer** = **3.6GB** (2 Chrome versions)
3. **~/.npm** = **2.8GB** (npm package cache)
4. **~/.local/lib/python3.12** = **1.5GB** (Python packages)
5. **~/.cache/node-gyp** = **56MB**
6. **/workspaces/agent-feed/node_modules** = **1.38GB** (root + frontend + api-server)
7. **/workspaces/agent-feed/.git** = **757MB** (bloated pack file)
8. **Root .md files** = **12.4MB** (710 documentation files)

**Key Insight**: Browser automation tools (Playwright/Puppeteer) store MULTIPLE versions of browsers, each 250-600MB. This is the #1 space hog.

---

## 📊 CLEANUP PLAN WITH EFFECTIVENESS RATINGS

### TIER 1: Critical High-Impact Actions (Total: **9.7GB+**)

#### Action 1.1: Clean Old Playwright Browsers ⭐⭐⭐⭐⭐
**Impact**: **~3GB** (keep latest only)
**Effectiveness**: 98% (oldest 4 versions removable)
**Risk**: LOW (only need latest version)
**Regrowth Rate**: Medium (updates every 2-3 weeks)

```bash
# Current: 5 Chromium versions (590-597MB each)
# Keep: chromium-1194 (latest)
# Remove: chromium-1181, 1187, 1191, 1193 = ~2.4GB

# Current: 3 Firefox versions (256-267MB each)
# Keep: firefox-1492 (latest)
# Remove: firefox-1489, 1490 = ~521MB

# Current: 2 WebKit versions (272MB each)
# Keep: webkit-2203 (latest)
# Remove: webkit-2191 = ~272MB

# TOTAL SAVINGS: ~3.2GB
```

**Command**:
```bash
cd ~/.cache/ms-playwright
rm -rf chromium-1181 chromium-1187 chromium-1191 chromium-1193
rm -rf chromium_headless_shell-1181 chromium_headless_shell-1187 chromium_headless_shell-1191 chromium_headless_shell-1193
rm -rf firefox-1489 firefox-1490
rm -rf webkit-2191
```

---

#### Action 1.2: Clean Puppeteer Duplicate Browsers ⭐⭐⭐⭐⭐
**Impact**: **~1.5GB** (remove headless-shell duplicate)
**Effectiveness**: 95% (chrome-headless-shell redundant)
**Risk**: LOW (chrome includes headless mode)
**Regrowth Rate**: Low (stable version)

```bash
# Current: chrome (2.1GB) + chrome-headless-shell (1.5GB)
# Keep: chrome (includes headless mode)
# Remove: chrome-headless-shell = ~1.5GB

# TOTAL SAVINGS: ~1.5GB
```

**Command**:
```bash
rm -rf ~/.cache/puppeteer/chrome-headless-shell
```

---

#### Action 1.3: Clean NPM Cache ⭐⭐⭐⭐⭐
**Impact**: **~2.5GB** (npm cache is fully rebuildable)
**Effectiveness**: 100% (npm rebuilds on demand)
**Risk**: ZERO (npm auto-rebuilds when needed)
**Regrowth Rate**: High (rebuilds during npm install)

```bash
# Current: 2.8GB npm cache
# Remove: All (npm rebuilds automatically)
# TOTAL SAVINGS: ~2.5GB
```

**Command**:
```bash
npm cache clean --force
```

---

#### Action 1.4: Clean Python Packages (Selective) ⭐⭐⭐⭐
**Impact**: **~500MB-1GB** (remove unused packages)
**Effectiveness**: 65% (keep core packages)
**Risk**: MEDIUM (may need reinstall)
**Regrowth Rate**: Low (rarely changes)

```bash
# Current: 1.5GB Python packages
# Strategy: Remove dev/unused packages
# Keep: Core Python runtime
# TOTAL SAVINGS: ~500MB-1GB
```

**Command**:
```bash
# List installed packages first
pip list --user

# Remove large unused packages (example)
pip uninstall -y pytest pylint black flake8 mypy
```

---

#### Action 1.5: Clean Node.js Build Caches ⭐⭐⭐⭐
**Impact**: **~104MB**
**Effectiveness**: 100% (fully rebuildable)
**Risk**: ZERO (rebuilds on next compile)
**Regrowth Rate**: High (rebuilds during development)

```bash
# Vite cache: 48MB
# node-gyp cache: 56MB
# TOTAL SAVINGS: ~104MB
```

**Command**:
```bash
rm -rf ~/.cache/node-gyp
rm -rf /workspaces/agent-feed/frontend/node_modules/.vite
rm -rf /workspaces/agent-feed/api-server/node_modules/.vite
```

---

### TIER 2: Medium-Impact Actions (Total: **757MB**)

#### Action 2.1: Git Repository Cleanup ⭐⭐⭐⭐
**Impact**: **~200-400MB** (compress pack file)
**Effectiveness**: 50-60% (pack file bloat)
**Risk**: LOW (Git operation)
**Regrowth Rate**: Low (gradual growth)

```bash
# Current: .git = 757MB (695MB pack file)
# Strategy: Aggressive garbage collection
# Expected: Reduce to 350-550MB
# TOTAL SAVINGS: ~200-400MB
```

**Commands**:
```bash
cd /workspaces/agent-feed
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git repack -a -d --depth=250 --window=250
```

**WARNING**: This command takes 2+ minutes. Run during downtime.

---

### TIER 3: Low-Impact Actions (Total: **12.4MB**)

#### Action 3.1: Archive Root Documentation Files ⭐⭐
**Impact**: **~10-12MB** (compress old docs)
**Effectiveness**: 95% (tar.gz compression)
**Risk**: ZERO (archival only)
**Regrowth Rate**: High (new reports generated)

```bash
# Current: 710 .md files in root = 12.4MB
# Strategy: Move to docs/, compress old reports
# TOTAL SAVINGS: ~10-12MB
```

**Commands**:
```bash
# Move all root .md files to docs/ (except key files)
mkdir -p /workspaces/agent-feed/docs/archive-2025-10
mv /workspaces/agent-feed/*-REPORT.md /workspaces/agent-feed/docs/archive-2025-10/
mv /workspaces/agent-feed/*-INVESTIGATION.md /workspaces/agent-feed/docs/archive-2025-10/
mv /workspaces/agent-feed/*-VALIDATION.md /workspaces/agent-feed/docs/archive-2025-10/

# Compress archive
tar -czf /workspaces/agent-feed/docs/reports-archive-2025-10.tar.gz /workspaces/agent-feed/docs/archive-2025-10/
rm -rf /workspaces/agent-feed/docs/archive-2025-10/
```

---

## 📈 TOTAL IMPACT SUMMARY

### Immediate Cleanup (Run Once)

| Action | Impact | Risk | Effectiveness | Regrowth Rate |
|--------|--------|------|---------------|---------------|
| **Playwright Browsers** | 3.2GB | LOW | 98% | Medium |
| **Puppeteer Browsers** | 1.5GB | LOW | 95% | Low |
| **NPM Cache** | 2.5GB | ZERO | 100% | High |
| **Python Packages** | 0.5-1GB | MEDIUM | 65% | Low |
| **Build Caches** | 104MB | ZERO | 100% | High |
| **Git Cleanup** | 200-400MB | LOW | 50-60% | Low |
| **Docs Archive** | 10-12MB | ZERO | 95% | High |
| **TOTAL** | **8-9GB** | - | - | - |

### Expected Result
- **Current**: 96% full (29GB used)
- **After Cleanup**: **~70-75% full** (22-24GB used)
- **Free Space**: **8-10GB** (26-31% free)

---

## 🔄 REGROWTH PREVENTION STRATEGIES

### Problem: Why Space Fills Up Again

**High Regrowth Items**:
1. **NPM Cache** (~2.5GB) - Rebuilds during `npm install`
2. **Build Caches** (~100MB) - Rebuilds during development
3. **Documentation** (~10MB/week) - New reports generated

**Medium Regrowth Items**:
1. **Playwright** (~600MB every 2-3 weeks) - Browser updates

### Strategy 1: Automated Cache Cleanup ⭐⭐⭐⭐⭐
**Create weekly cleanup cron job**

```bash
# Add to .bashrc or create cron job
# Run every Sunday at 2 AM
0 2 * * 0 npm cache clean --force && rm -rf ~/.cache/node-gyp
```

### Strategy 2: Limit Playwright Browser Versions ⭐⭐⭐⭐
**Configure Playwright to keep only latest version**

```bash
# In package.json or .env
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
```

**Manually manage browsers**:
```bash
# Only install Chromium (not Firefox/WebKit if unused)
npx playwright install chromium
```

### Strategy 3: Git Maintenance Schedule ⭐⭐⭐
**Run git gc monthly**

```bash
# Add to monthly maintenance script
git gc --prune=now --aggressive
```

### Strategy 4: Documentation Archival ⭐⭐⭐⭐
**Monthly archive of old reports**

```bash
# Create archive directory structure
mkdir -p docs/archives/$(date +%Y-%m)

# Move reports older than 30 days
find . -maxdepth 1 -name "*-REPORT.md" -mtime +30 -exec mv {} docs/archives/$(date +%Y-%m)/ \;

# Compress quarterly
tar -czf docs/archives/$(date +%Y-Q%q).tar.gz docs/archives/$(date +%Y-%m)/
```

### Strategy 5: Monitor Disk Usage ⭐⭐⭐⭐⭐
**Add disk usage alerts**

```bash
# Add to .bashrc
alias disk-check='df -h /workspaces | tail -1 | awk "{print \"Disk Usage: \" \$5}"'

# Create alert script
cat > ~/.local/bin/disk-alert.sh << 'EOF'
#!/bin/bash
USAGE=$(df /workspaces | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $USAGE -gt 90 ]; then
  echo "⚠️  WARNING: Disk usage at ${USAGE}%"
  echo "Top space consumers:"
  du -sh ~/.cache/* 2>/dev/null | sort -hr | head -5
fi
EOF
chmod +x ~/.local/bin/disk-alert.sh
```

---

## 🎯 RECOMMENDED EXECUTION PLAN

### Phase 1: Immediate Relief (Get to 70-75%)
**Duration**: 5 minutes
**Impact**: 8-9GB freed

```bash
# 1. Clean Playwright old browsers (3.2GB)
cd ~/.cache/ms-playwright
rm -rf chromium-{1181,1187,1191,1193} chromium_headless_shell-{1181,1187,1191,1193}
rm -rf firefox-{1489,1490} webkit-2191

# 2. Clean Puppeteer duplicate (1.5GB)
rm -rf ~/.cache/puppeteer/chrome-headless-shell

# 3. Clean NPM cache (2.5GB)
npm cache clean --force

# 4. Clean build caches (104MB)
rm -rf ~/.cache/node-gyp
rm -rf /workspaces/agent-feed/frontend/node_modules/.vite
rm -rf /workspaces/agent-feed/api-server/node_modules/.vite

# 5. Verify results
df -h /workspaces
```

---

### Phase 2: Git Optimization (During Downtime)
**Duration**: 2-5 minutes
**Impact**: 200-400MB

```bash
cd /workspaces/agent-feed
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git repack -a -d --depth=250 --window=250
```

---

### Phase 3: Documentation Cleanup
**Duration**: 1 minute
**Impact**: 10-12MB

```bash
mkdir -p /workspaces/agent-feed/docs/archive-2025-10
mv /workspaces/agent-feed/*-{REPORT,INVESTIGATION,VALIDATION}.md /workspaces/agent-feed/docs/archive-2025-10/ 2>/dev/null
tar -czf /workspaces/agent-feed/docs/reports-archive-2025-10.tar.gz /workspaces/agent-feed/docs/archive-2025-10/
rm -rf /workspaces/agent-feed/docs/archive-2025-10/
```

---

### Phase 4: Prevention Setup
**Duration**: 5 minutes
**Impact**: Prevents future buildup

```bash
# Add disk monitoring
cat >> ~/.bashrc << 'EOF'

# Disk usage monitoring
alias disk-check='df -h /workspaces | tail -1 | awk "{print \"Disk: \" \$3 \"/\" \$2 \" (\" \$5 \")\"}"'
alias disk-top='du -sh ~/.cache/* /workspaces/agent-feed/{node_modules,.git} 2>/dev/null | sort -hr | head -10'

EOF

# Weekly cache cleanup (if cron available)
# crontab -e
# Add: 0 2 * * 0 npm cache clean --force && rm -rf ~/.cache/node-gyp
```

---

## 🔍 MONITORING & ALERTS

### Daily Check
```bash
disk-check
```

### Weekly Deep Dive
```bash
disk-top
du -sh ~/.cache/ms-playwright/chromium-* | tail -3
du -sh ~/.cache/puppeteer/*
```

### When to Run Full Cleanup Again
- **Alert Level**: 90%+ disk usage
- **Frequency**: Every 2-3 weeks (or when Playwright updates)
- **Quick Win**: `npm cache clean --force` (2.5GB instant)

---

## 💡 KEY INSIGHTS

### Why Last Cleanup Failed (Only Got to 94%)

1. **Missed the Real Culprits**: Focused on project files, not browser caches
2. **Playwright/Puppeteer**: 9.7GB was untouched
3. **NPM Cache**: 2.8GB was untouched
4. **High Regrowth Items**: NPM cache rebuilds during every install

### Why Space Fills Up in Hours

1. **NPM Install**: Rebuilds 2.8GB cache
2. **Playwright Updates**: Downloads new 600MB browser versions
3. **Development**: Creates 100MB build caches
4. **Documentation**: Generates 10-50MB reports

**Solution**: This plan targets ROOT CAUSES, not symptoms.

---

## ✅ SUCCESS CRITERIA

**Before**:
- 96% full (29GB / 32GB)
- 1.2GB free
- At risk of running out of space

**After Phase 1**:
- 70-75% full (22-24GB / 32GB)
- 8-10GB free
- Comfortable operating space

**After All Phases + Prevention**:
- 70-75% steady state
- Automated cleanup prevents buildup
- Monitoring alerts before critical

---

## 🚀 READY TO EXECUTE?

**Review this plan, then I'll execute with your approval.**

**Questions to consider**:
1. Can we run git gc during downtime? (takes 2-5 minutes)
2. Do we need all 3 browser types (Chromium, Firefox, WebKit) or just Chromium?
3. Should we archive docs to external storage instead of compressing locally?

**Status**: 🟡 Plan Ready - Awaiting Approval
