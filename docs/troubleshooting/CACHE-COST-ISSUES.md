# Cache Cost Issues - Troubleshooting Guide

**Quick Start**: Jump to your issue:
- [High Costs After Fix](#1-high-costs-after-fix)
- [Cleanup Script Failing](#2-cleanup-script-failing)
- [Dashboard Not Updating](#3-dashboard-not-updating)
- [Cron Job Not Running](#4-cron-job-not-running)
- [Git Status Still Large](#5-git-status-still-large)
- [Cache Hit Ratio Low](#6-cache-hit-ratio-low)

---

## 1. High Costs After Fix

**Symptoms**:
- Dashboard shows > $5/day after optimization
- Expected < $3/day after fix
- Git status shows < 30 files (correct)

### Diagnosis

**Step 1: Check current cost**
```bash
curl http://localhost:3001/api/cost-metrics
```
**Expected**: `daily_cost_usd < 3.00`
**If > 5.00**: Continue to Step 2

**Step 2: Verify .gitignore is working**
```bash
git check-ignore .claude/config/projects/test.jsonl
```
**Expected**: `.claude/config/projects/test.jsonl`
**If empty**: .gitignore pattern not matching → Go to Fix A

**Step 3: Check git status size**
```bash
git status --porcelain | wc -l
```
**Expected**: < 30 files
**If > 100**: Other files causing issue → Go to Fix B

**Step 4: Check cache directory size**
```bash
du -sh .claude/config
```
**Expected**: < 50MB
**If > 100MB**: Cleanup not working → Go to Fix C

### Fix A: .gitignore Pattern Not Matching

**Problem**: Patterns don't exclude files from git status

**Solution 1: Check pattern syntax**
```bash
# View current patterns
cat .gitignore | grep -A 5 "Claude Code"

# Patterns MUST have trailing slash for directories
# ✅ CORRECT:
.claude/config/projects/
.claude/config/shell-snapshots/

# ❌ WRONG:
.claude/config/projects
.claude/config/shell-snapshots
```

**Solution 2: Add leading slash for root-relative**
```bash
# If patterns aren't working, try root-relative paths
cat >> .gitignore << 'EOF'
# Claude Code cache (root-relative)
/.claude/config/projects/
/.claude/config/shell-snapshots/
/.claude/config/todos/
/.claude/config/statsig/
EOF
```

**Solution 3: Test pattern matching**
```bash
# Test each pattern individually
git check-ignore -v .claude/config/projects/test.jsonl
# Output should show which .gitignore line matched
# Example: .gitignore:64:/.claude/config/projects/

# If no output, pattern is NOT working
# Check for typos or incorrect path
```

**Solution 4: Force git to update index**
```bash
# Sometimes git cache needs refresh
git rm -r --cached .claude/config/
git add .gitignore
git commit -m "Fix .gitignore patterns"

# Verify
git status --porcelain | grep ".claude/config"
# Should return nothing
```

### Fix B: Other Files Causing High Costs

**Problem**: Files outside `.claude/config` are large

**Find culprit files**:
```bash
# List largest directories in git status
git status --porcelain | awk '{print $2}' | \
  xargs -I{} dirname {} | \
  sort | uniq -c | sort -rn | head -10

# Example output:
# 234 node_modules/  ← Should be in .gitignore!
#  89 dist/          ← Should be in .gitignore!
#  45 .next/         ← Should be in .gitignore!
#  23 src/           ← Normal
```

**Add missing patterns**:
```bash
# Common patterns that should ALWAYS be ignored
cat >> .gitignore << 'EOF'
# Build outputs
node_modules/
dist/
build/
.next/
out/

# Dependencies
package-lock.json
yarn.lock
pnpm-lock.yaml

# Environment
.env
.env.local
.env.*.local

# OS files
.DS_Store
Thumbs.db
EOF
```

### Fix C: Cleanup Not Working

**Problem**: Files not being deleted by cleanup script

**Check script ran recently**:
```bash
# View cleanup log
tail -20 /tmp/cache-cleanup.log

# Look for:
# ✅ "Cleanup complete" - Script ran successfully
# ❌ "Permission denied" - Permissions issue
# ❌ No recent logs - Cron not running
```

**Manual cleanup**:
```bash
# Force cleanup now
./scripts/cleanup-claude-cache.sh

# If permission denied
chmod +x scripts/cleanup-claude-cache.sh
./scripts/cleanup-claude-cache.sh

# If files still not deleted
find .claude/config -type f -mtime +7 -ls
# This will show files older than 7 days
# If none shown, files are all recent (normal)
```

---

## 2. Cleanup Script Failing

**Symptoms**:
- Script exits with error
- Files not deleted
- Cron log shows errors

### Diagnosis

**Run script manually**:
```bash
./scripts/cleanup-claude-cache.sh --dry-run
```

**Common Errors**:

### Error A: Permission Denied

```
Error: rm: cannot remove '.claude/config/projects/xxx.jsonl': Permission denied
```

**Fix**:
```bash
# Fix directory permissions
chmod -R u+w .claude/config

# Fix script permissions
chmod +x scripts/cleanup-claude-cache.sh

# Verify owner
ls -ld .claude/config
# Should show: drwxr-xr-x username username
```

### Error B: Directory Not Found

```
Error: find: '.claude/config': No such file or directory
```

**Fix**:
```bash
# Create missing directory
mkdir -p .claude/config/{projects,shell-snapshots,todos,statsig}

# Verify structure
ls -la .claude/config
```

### Error C: Date Command Failed

```
Error: date: invalid date '7 days ago'
```

**Fix** (Mac vs Linux difference):
```bash
# The script detects OS automatically
# If detection fails, manually set:

# For Mac (BSD date):
CUTOFF_DATE=$(date -v-7d +%s)

# For Linux (GNU date):
CUTOFF_DATE=$(date -d "7 days ago" +%s)

# Update script to force correct command
```

### Error D: Find Command Syntax

```
Error: find: warning: -mtime +7: no such file or directory
```

**Fix**:
```bash
# Verify find syntax for your OS
find .claude/config -type f -mtime +7 -print

# If fails, use alternative:
find .claude/config -type f -mmin +10080 -print
# 10080 minutes = 7 days
```

### Error E: Disk Full

```
Error: rm: cannot remove file: No space left on device
```

**Fix**:
```bash
# Check disk space
df -h /workspaces/agent-feed

# If full, manually delete oldest files
find .claude/config -type f -mtime +30 -delete

# Clear npm cache
npm cache clean --force

# Clear system temp
sudo rm -rf /tmp/*
```

---

## 3. Dashboard Not Updating

**Symptoms**:
- Metrics frozen or stale
- Chart shows "No data"
- API returns errors

### Diagnosis

**Step 1: Check API server**
```bash
# Verify server running
ps aux | grep "node.*api-server"

# If not running, start it
cd api-server && npm run dev
```

**Step 2: Test API endpoint**
```bash
curl http://localhost:3001/api/cost-metrics

# Expected: JSON response with metrics
# If 404: Endpoint not implemented
# If 500: Check server logs
```

**Step 3: Check database**
```bash
sqlite3 database.db "SELECT COUNT(*) FROM token_analytics;"

# Expected: Number > 0
# If 0: No metrics recorded yet
# If error: Table doesn't exist
```

### Fix A: API Server Not Running

```bash
# Start server
cd /workspaces/agent-feed
npm run dev

# Verify health
curl http://localhost:3001/health
# Expected: {"status": "ok"}
```

### Fix B: Database Missing or Empty

```bash
# Check database exists
ls -lh database.db
# Expected: File size > 100KB

# Run migrations
npm run migrate

# Verify table exists
sqlite3 database.db ".schema token_analytics"
# Should show CREATE TABLE statement
```

### Fix C: CORS Errors

**Browser console shows**:
```
Access to fetch at 'http://localhost:3001/api/cost-metrics' from origin
'http://localhost:5173' has been blocked by CORS policy
```

**Fix in api-server/server.js**:
```javascript
import cors from 'cors';

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

### Fix D: Frontend Build Cache

```bash
# Clear frontend build cache
cd frontend
rm -rf node_modules/.vite
npm run dev

# Or hard refresh browser
# Chrome/Firefox: Ctrl+Shift+R
# Safari: Cmd+Option+R
```

---

## 4. Cron Job Not Running

**Symptoms**:
- Cleanup never runs automatically
- Manual script works fine
- No recent logs in `/tmp/cache-cleanup.log`

### Diagnosis

**Check crontab exists**:
```bash
crontab -l
# Should show: 0 2 * * * cd /workspaces/agent-feed && ...
```

**Check cron service**:
```bash
# Linux
systemctl status cron

# Mac
sudo launchctl list | grep cron
```

### Fix A: Crontab Not Created

```bash
# Create crontab entry
crontab -e

# Add this line:
0 2 * * * cd /workspaces/agent-feed && /workspaces/agent-feed/scripts/cleanup-claude-cache.sh >> /tmp/cache-cleanup.log 2>&1

# Save and verify
crontab -l
```

### Fix B: Cron Service Not Running

**Linux**:
```bash
sudo systemctl start cron
sudo systemctl enable cron
```

**Mac**:
```bash
sudo launchctl load -w /System/Library/LaunchDaemons/com.vix.cron.plist
```

### Fix C: Path Issues in Cron

**Problem**: Script can't find commands or files

```bash
# Cron has limited PATH
# Add full paths to crontab

crontab -e

# Set PATH at top:
PATH=/usr/local/bin:/usr/bin:/bin
SHELL=/bin/bash

# Use absolute paths in command:
0 2 * * * cd /workspaces/agent-feed && /workspaces/agent-feed/scripts/cleanup-claude-cache.sh >> /tmp/cache-cleanup.log 2>&1
```

### Fix D: Test in Cron Environment

```bash
# Simulate cron environment
env -i /workspaces/agent-feed/scripts/cleanup-claude-cache.sh

# This strips all environment variables
# If script fails here, it will fail in cron
```

---

## 5. Git Status Still Large

**Symptoms**:
- `git status` output > 10KB
- .gitignore patterns exist
- Files are excluded but status still slow

### Diagnosis

**Measure git status size**:
```bash
git status 2>&1 | wc -c
# Target: < 5,000 characters
# Warning: > 50,000 characters
```

**Find what's included**:
```bash
git status --porcelain | wc -l
# Count of files

git status --porcelain | head -20
# See first 20 files
```

### Fix A: Untracked Files in Large Directory

**Problem**: Large directory not ignored

```bash
# Find largest untracked directories
git status --porcelain | grep "^?" | awk '{print $2}' | \
  xargs -I{} du -sh {} 2>/dev/null | sort -rh | head -10

# Example output:
# 234M node_modules/
#  89M .next/
#  45M dist/

# Add to .gitignore
```

### Fix B: Modified Files with Large Diffs

**Problem**: Changed files have huge diffs

```bash
# Find files with large changes
git status --porcelain | grep "^ M" | awk '{print $2}' | \
  xargs -I{} git diff {} | wc -l

# If database.db shows huge diff, add to .gitignore
echo "database.db" >> .gitignore
```

### Fix C: Submodules

**Problem**: Git submodules are slow

```bash
# Disable submodule status (if not needed)
git config status.submoduleSummary false
```

---

## 6. Cache Hit Ratio Low

**Symptoms**:
- Dashboard shows < 70% cache hit ratio
- High write costs despite small git status
- Expected > 80% hit ratio

### Diagnosis

**Check current ratio**:
```bash
curl http://localhost:3001/api/cost-metrics | jq '.cache_hit_ratio'
# Target: > 80%
# Warning: < 70%
```

**Analyze token breakdown**:
```bash
curl http://localhost:3001/api/cost-metrics | jq '{writes: .cache_write_tokens, reads: .cache_read_tokens}'
```

### Fix A: Sessions Too Short

**Problem**: Cache expires before reuse

**Solution**: Increase cache TTL
```javascript
// api-server/config/cache.js
export const CACHE_CONFIG = {
  ttl: 3600,  // Increase from 1800 to 3600 seconds
  maxSize: 100 * 1024 * 1024  // 100MB
};
```

### Fix B: Context Changes Too Often

**Problem**: Every session has different context

**Solution**: Standardize session prompts
- Use consistent .claude directory structure
- Avoid large files in project root
- Keep git status minimal

### Fix C: Multiple Users/Projects

**Problem**: Different projects = different cache

**Solution**: Use per-project cache tracking
```javascript
// Track cache hit ratio per project
const projectId = process.env.PROJECT_ID || 'default';
const cacheKey = `${projectId}:${sessionHash}`;
```

---

## Quick Diagnostics Checklist

Run this checklist when issues arise:

```bash
#!/bin/bash
# quick-diagnose.sh - Run all diagnostic checks

echo "🔍 Cache Cost Diagnostics"
echo "========================="

echo ""
echo "1. Git Status Size"
git status --porcelain | wc -l
# Target: < 30

echo ""
echo "2. Cache Directory Size"
du -sh .claude/config
# Target: < 50MB

echo ""
echo "3. Current Daily Cost"
curl -s http://localhost:3001/api/cost-metrics | jq '.daily_cost_usd'
# Target: < $3.00

echo ""
echo "4. .gitignore Working?"
git check-ignore .claude/config/projects/test.jsonl
# Expected: .claude/config/projects/test.jsonl

echo ""
echo "5. Recent Cleanup Logs"
tail -5 /tmp/cache-cleanup.log
# Look for "Cleanup complete"

echo ""
echo "6. Crontab Entry"
crontab -l | grep cache-cleanup
# Should show cron entry

echo ""
echo "7. API Server Status"
ps aux | grep "node.*api-server" | grep -v grep
# Should show running process

echo ""
echo "8. Database Record Count"
sqlite3 database.db "SELECT COUNT(*) FROM token_analytics;"
# Should be > 0

echo ""
echo "✅ Diagnostics Complete"
```

---

## Emergency Cost Reduction

If costs are critically high (> $20/day), take immediate action:

```bash
# 1. IMMEDIATE: Stop git tracking everything
mv .gitignore .gitignore.backup
cat > .gitignore << 'EOF'
# EMERGENCY: Ignore almost everything
*
!.gitignore
!src/
!api-server/
!frontend/
EOF

# 2. Force cleanup now
find .claude/config -type f -mtime +1 -delete

# 3. Restart with fresh cache
rm -rf .claude/config/*

# 4. Monitor for 1 hour
watch -n 60 'curl -s localhost:3001/api/cost-metrics | jq .daily_cost_usd'

# 5. If stable, restore proper .gitignore
mv .gitignore.backup .gitignore
```

---

## Getting Help

**Before asking for help, collect**:
1. `git status --porcelain | wc -l` output
2. `du -sh .claude/config` output
3. `curl localhost:3001/api/cost-metrics` output
4. Last 20 lines of `/tmp/cache-cleanup.log`
5. Screenshot of dashboard

**Contact**:
- GitHub Issues: [project-repo]/issues
- Slack: #cache-optimization
- Email: support@example.com

---

**Last Updated**: 2025-11-06
**Version**: 1.0
