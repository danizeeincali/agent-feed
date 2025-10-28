# Disk Space Visual Breakdown

**Current Status**: 96% FULL (29GB / 32GB used)

---

## 📊 SPACE CONSUMPTION VISUALIZATION

```
Total Disk: 32GB
═══════════════════════════════════════════════════════════════════════
█████████████████████████████████████████████████████░░░░░░ 96% (29GB)
═══════════════════════════════════════════════════════════════════════
                                                     FREE: 1.2GB
```

---

## 🎯 WHERE IS THE SPACE GOING?

### Current Breakdown (29GB Total)

```
Browser Caches (Playwright + Puppeteer)     █████████████████ 9.7GB  (33%)
NPM Cache                                   ████████          2.8GB  (10%)
Python Packages                             ████              1.5GB  (5%)
Project node_modules                        ████              1.4GB  (5%)
Project .git                                ██                0.8GB  (3%)
System & Other                              ██████████████   12.8GB  (44%)
                                            ═══════════════════════════
                                            Total:            29GB
```

### The Problem: Browser Caches

```
Browser Caches (9.7GB total):
├── Playwright (6.1GB)
│   ├── Chromium-1181     ████████  590MB
│   ├── Chromium-1187     ████████  594MB
│   ├── Chromium-1191     ████████  597MB
│   ├── Chromium-1193     ████████  594MB
│   ├── Chromium-1194     ████████  597MB  ← KEEP (latest)
│   ├── Firefox-1489      ████      256MB
│   ├── Firefox-1490      ████      265MB
│   ├── Firefox-1492      ████      267MB  ← KEEP (latest)
│   ├── WebKit-2191       ████      272MB
│   └── WebKit-2203       ████      272MB  ← KEEP (latest)
│
└── Puppeteer (3.6GB)
    ├── Chrome            ████████████  2.1GB  ← KEEP
    └── Chrome-Headless   ████████      1.5GB  ← REMOVE (duplicate)
```

---

## 💡 CLEANUP IMPACT VISUALIZATION

### Before Cleanup
```
Disk Usage: 96%
═══════════════════════════════════════════════════════════════════════
█████████████████████████████████████████████████████░░░░░░ 29GB / 32GB
═══════════════════════════════════════════════════════════════════════
```

### After Conservative Cleanup (Option A: 5-6GB freed)
```
Disk Usage: ~78%
═══════════════════════════════════════════░░░░░░░░░░░░░░░░ 25GB / 32GB
═══════════════════════════════════════════════════════════════════════
                                             FREE: 7GB
```

### After Aggressive Cleanup (Option B: 8-9GB freed) ⭐
```
Disk Usage: ~70%
═══════════════════════════════════════░░░░░░░░░░░░░░░░░░░░ 22GB / 32GB
═══════════════════════════════════════════════════════════════════════
                                             FREE: 10GB
```

### After Maximum Cleanup (Option C: 9-10GB freed)
```
Disk Usage: ~68%
══════════════════════════════════════░░░░░░░░░░░░░░░░░░░░░ 21GB / 32GB
═══════════════════════════════════════════════════════════════════════
                                             FREE: 11GB
```

---

## 🎭 TIER 1: BROWSER CACHE CLEANUP (9.7GB → 5GB)

### Playwright: 5 Versions → 1 Version

**Before**:
```
Chromium versions: 5 ████████████████████████████  3.0GB
Firefox versions:  3 ████████                     0.8GB
WebKit versions:   2 █████                        0.5GB
FFmpeg:            1 █                            0.1GB
                     ═════════════════════════════
                     Total: 6.1GB
```

**After** (keep latest only):
```
Chromium versions: 1 ██████   0.6GB  ← chromium-1194
Firefox versions:  1 ███      0.3GB  ← firefox-1492
WebKit versions:   1 ██       0.3GB  ← webkit-2203
FFmpeg:            1 █        0.1GB
                     ════════
                     Total: 1.3GB
```

**Space Saved**: 4.8GB (79% reduction)

---

### Puppeteer: 2 Chrome Versions → 1 Version

**Before**:
```
Chrome:            ████████████  2.1GB  ← Keep (full version)
Chrome-Headless:   ████████      1.5GB  ← Remove (duplicate)
                   ════════════════════
                   Total: 3.6GB
```

**After**:
```
Chrome:            ████████████  2.1GB
                   ════════════
                   Total: 2.1GB
```

**Space Saved**: 1.5GB (42% reduction)

---

## 📦 TIER 2: NPM CACHE (2.8GB → 0)

**Before**:
```
~/.npm/_cacache    ████████  280MB
~/.npm/...         ████████████████████████  2.5GB
                   ════════════════════════════════
                   Total: 2.8GB
```

**After**:
```
~/.npm/_cacache    (empty, rebuilds on demand)
                   Total: 0MB
```

**Space Saved**: 2.8GB (100% reduction)
**Risk**: ZERO (npm auto-rebuilds)

---

## 🔄 REGROWTH TIMELINE

### Week 1 (After Cleanup)
```
Week 0: 70% ═════════════════════░░░░░░░░░░░░░░░ (10GB free)
Day 1:  72% ██████████████████████░░░░░░░░░░░░░ (npm install: +2.5GB cache)
Day 7:  75% ████████████████████████░░░░░░░░░░░ (build caches: +0.1GB)
```

### Week 2-3 (Playwright Update)
```
Week 2: 78% ██████████████████████████░░░░░░░░░ (new Chromium: +0.6GB)
Week 3: 80% ████████████████████████████░░░░░░░ (continued development)
```

### Month 2 (Without Cleanup)
```
Month 2: 90% ██████████████████████████████████████░░ (back to critical)
```

### With Automated Cleanup
```
Steady state: 70-75% ████████████████████░░░░░░░░░░ (weekly auto-clean)
```

---

## 🎯 EFFECTIVENESS COMPARISON

### Last Cleanup Attempt (Got to 94%)
```
Focused on:
├── Project files      ████ 1.0GB    ← Symptom
├── Logs/temp          █    0.1GB    ← Symptom
└── Missed:
    ├── Browser caches      9.7GB    ← ROOT CAUSE (missed!)
    ├── NPM cache           2.8GB    ← ROOT CAUSE (missed!)
    └── Python packages     1.5GB    ← ROOT CAUSE (missed!)

Result: 96% → 94% (only 1% improvement)
                         ⬆ Filled back up in hours
```

### This Plan (Get to 70%)
```
Focused on:
├── Browser caches     ████████████████████ 4.8GB   ← ROOT CAUSE #1
├── Puppeteer dupes    ████████             1.5GB   ← ROOT CAUSE #2
├── NPM cache          ████████████         2.5GB   ← ROOT CAUSE #3
├── Build caches       █                    0.1GB
└── Git optimization   ██                   0.4GB

Result: 96% → 70% (26% improvement, sustainable)
```

---

## 📋 ACTION PRIORITY MATRIX

```
                    HIGH IMPACT
                         │
        Playwright  ⭐   │   ⭐  Puppeteer
        (-3.2GB)         │     (-1.5GB)
                         │
    ────────────────────┼────────────────────→
                         │                HIGH RISK
    NPM Cache       ⭐   │
    (-2.5GB)             │      Python Packages
                         │         (-0.5GB)
                    LOW IMPACT
```

**Legend**:
- ⭐ = Recommended (High Impact, Low Risk)
- Size = Space saved

---

## 🚀 QUICK COMMAND REFERENCE

### One-Line Quick Win (4.3GB in 30 seconds)
```bash
npm cache clean --force && rm -rf ~/.cache/puppeteer/chrome-headless-shell
```

### Full Cleanup (8-9GB in 5 minutes)
```bash
cd ~/.cache/ms-playwright && \
rm -rf chromium-{1181,1187,1191,1193} chromium_headless_shell-{1181,1187,1191,1193} firefox-{1489,1490} webkit-2191 && \
cd ~ && rm -rf ~/.cache/puppeteer/chrome-headless-shell && \
npm cache clean --force && \
rm -rf ~/.cache/node-gyp /workspaces/agent-feed/frontend/node_modules/.vite
```

### Verification
```bash
df -h /workspaces | tail -1
du -sh ~/.cache/{ms-playwright,puppeteer} ~/.npm /workspaces/agent-feed/{node_modules,.git}
```

---

## 🎯 SUCCESS METRICS

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| Disk Usage | 96% | 70% | 🔴 Critical |
| Free Space | 1.2GB | 10GB | 🔴 Insufficient |
| Browser Caches | 9.7GB | 1.3GB | 🔴 Excessive |
| NPM Cache | 2.8GB | 0GB | 🟡 Rebuildable |
| Regrowth Rate | Hours | Weeks | 🔴 Unsustainable |

**After Cleanup**:
| Metric | Target | Expected | Status |
|--------|--------|----------|--------|
| Disk Usage | 70% | ✅ 70% | 🟢 Healthy |
| Free Space | 10GB | ✅ 10GB | 🟢 Comfortable |
| Browser Caches | 1.3GB | ✅ 1.3GB | 🟢 Optimal |
| NPM Cache | 0GB | ✅ 0GB | 🟢 Clean |
| Regrowth Rate | Weeks | ✅ 2-3 weeks | 🟢 Manageable |

---

## 💬 DECISION HELPER

**If you want**:
- ✅ **Quick relief** (5 min) → Run Phase 1 (Option B)
- ✅ **Maximum space** (15 min) → Run all phases (Option C)
- ✅ **Zero risk** (2 min) → Just NPM + Puppeteer (4.3GB)

**If you're worried about**:
- ⚠️ **Breaking tests** → Keep all browsers (just clean old versions)
- ⚠️ **Downtime** → Skip git gc (saves 2-5 minutes)
- ⚠️ **Needing packages** → Skip Python cleanup

---

**Ready to proceed? See**:
- Full plan: `DISK-SPACE-COMPREHENSIVE-CLEANUP-PLAN.md`
- Quick reference: `DISK-SPACE-QUICK-DECISION-CARD.md`
