# Disk Space Cleanup - Quick Decision Card

**Current Status**: 96% FULL (29GB / 32GB)

---

## 🎯 ONE-PAGE SUMMARY

### Root Cause (Why It Fills Up Again)
Previous cleanups missed **9.7GB of browser caches** (Playwright/Puppeteer)

### Quick Win Actions (8-9GB Freed in 5 Minutes)

| Action | Command | Impact | Risk |
|--------|---------|--------|------|
| 🎭 **Clean Old Playwright Browsers** | `rm -rf ~/.cache/ms-playwright/chromium-{1181,1187,1191,1193}*` | **3.2GB** | LOW |
| 🤖 **Clean Puppeteer Duplicate** | `rm -rf ~/.cache/puppeteer/chrome-headless-shell` | **1.5GB** | LOW |
| 📦 **Clean NPM Cache** | `npm cache clean --force` | **2.5GB** | ZERO |
| 🛠️ **Clean Build Caches** | `rm -rf ~/.cache/node-gyp frontend/node_modules/.vite` | **104MB** | ZERO |

**Expected Result**: **70-75% disk usage** (8-10GB free)

---

## 📊 Effectiveness Comparison

### Why Last Cleanup Failed
```
Last Time (Got to 94%):
✗ Cleaned project files        ~1GB    (symptom)
✗ Missed browser caches         0GB    (root cause)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total Impact:                ~1GB    (only 1% improvement)
```

### This Plan (Get to 70%)
```
This Time:
✓ Browser caches (Playwright)   3.2GB  (root cause #1)
✓ Browser caches (Puppeteer)    1.5GB  (root cause #2)
✓ NPM cache                     2.5GB  (root cause #3)
✓ Build caches                  0.1GB
✓ Git cleanup (optional)        0.4GB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total Impact:                 8-9GB  (26% improvement)
```

---

## 🚦 Risk Assessment

### ✅ ZERO RISK (Safe to Run Anytime)
- NPM cache (`npm cache clean --force`)
- Build caches (node-gyp, .vite)
- Documentation archives

### ✅ LOW RISK (Recommended)
- Old Playwright browsers (keep latest only)
- Puppeteer duplicate (chrome-headless-shell)
- Git garbage collection

### ⚠️ MEDIUM RISK (Evaluate First)
- Python packages (may need reinstall)

---

## 🔄 Why It Fills Up Again (Regrowth Analysis)

| Item | Regrowth Speed | Rebuild Trigger | Prevention |
|------|----------------|-----------------|------------|
| NPM Cache | **HIGH** (2.5GB) | Every `npm install` | Weekly auto-clean |
| Playwright | **MEDIUM** (600MB) | Browser updates (2-3 weeks) | Keep 1 version only |
| Build Caches | **HIGH** (100MB) | Every dev session | Auto-clean daily |
| Docs | **MEDIUM** (10MB/week) | New reports | Monthly archive |

**Key Insight**: NPM cache (2.5GB) rebuilds EVERY TIME you run `npm install` → Need automated cleanup

---

## ⚡ RECOMMENDED EXECUTION

### Option A: Conservative (5-6GB freed)
**Run These 3 Commands**:
```bash
npm cache clean --force                                    # 2.5GB
rm -rf ~/.cache/puppeteer/chrome-headless-shell           # 1.5GB
rm -rf ~/.cache/ms-playwright/chromium-{1181,1187,1191}*  # 2.4GB
```
**Result**: 75-80% disk usage (safe)

### Option B: Aggressive (8-9GB freed) ⭐ RECOMMENDED
**Run All Phase 1 Commands**:
```bash
# Playwright (3.2GB)
cd ~/.cache/ms-playwright
rm -rf chromium-{1181,1187,1191,1193} chromium_headless_shell-{1181,1187,1191,1193}
rm -rf firefox-{1489,1490} webkit-2191

# Puppeteer (1.5GB)
rm -rf ~/.cache/puppeteer/chrome-headless-shell

# NPM (2.5GB)
npm cache clean --force

# Build caches (104MB)
rm -rf ~/.cache/node-gyp
rm -rf /workspaces/agent-feed/frontend/node_modules/.vite
```
**Result**: 70-75% disk usage (recommended)

### Option C: Maximum (9-10GB freed)
**Option B + Git Cleanup + Docs**
```bash
# Run Option B commands, then:
cd /workspaces/agent-feed
git gc --prune=now --aggressive  # Takes 2-5 minutes
# Archive docs (see full plan)
```
**Result**: 68-72% disk usage (best case)

---

## 🎯 YOUR DECISION

### Questions to Answer:

1. **How much free space do you want?**
   - [ ] 5-6GB free (Option A - Conservative)
   - [ ] 8-10GB free (Option B - Aggressive) ⭐ RECOMMENDED
   - [ ] 10GB+ free (Option C - Maximum)

2. **Can git cleanup run during downtime?** (takes 2-5 minutes)
   - [ ] Yes - Include in plan
   - [ ] No - Skip for now

3. **Do you need Firefox/WebKit browsers?** (or just Chromium)
   - [ ] Just Chromium (save extra 1.3GB)
   - [ ] Keep all 3 types

4. **Automate weekly cleanup?**
   - [ ] Yes - Set up cron job
   - [ ] No - Manual cleanup

---

## ⏱️ TIME ESTIMATE

| Phase | Duration | Impact |
|-------|----------|--------|
| Phase 1 (Quick Wins) | **5 min** | 8-9GB |
| Phase 2 (Git) | **2-5 min** | 200-400MB |
| Phase 3 (Docs) | **1 min** | 10-12MB |
| Phase 4 (Prevention) | **5 min** | Future savings |
| **TOTAL** | **13-16 min** | **8-10GB** |

---

## 📋 NEXT STEPS

**Tell me**:
1. Which option (A, B, or C)?
2. Any concerns about the plan?
3. Ready to execute, or want modifications?

**Then I'll**:
1. Execute the approved commands
2. Verify results
3. Set up prevention measures

---

**Full Details**: See `DISK-SPACE-COMPREHENSIVE-CLEANUP-PLAN.md`
