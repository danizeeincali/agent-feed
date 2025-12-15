# Cache Cleanup Script - Usage Examples

This guide provides practical examples for using the cache cleanup script in different scenarios.

---

## Basic Usage

### Example 1: Standard Daily Cleanup

**Scenario**: Delete files older than 7 days (default)

```bash
cd /workspaces/agent-feed
./scripts/cleanup-claude-cache.sh
```

**Expected Output**:
```
🧹 Claude Cache Cleanup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cache Directory: /workspaces/agent-feed/.claude/config
Retention: 7 days
Dry Run: false

📊 Found 156 files to delete

Current cache size: 48M

🗑️  Deleting old files...
  Deleted: a0944e7d-5eec-4b58-8f65-81890afece78.jsonl
  Deleted: a69c660d-69e3-4a07-9944-77dcadb7a25e.jsonl
  ... (154 more files)

✅ Cleanup complete
Cache size: 48M → 12M
Files deleted: 156
```

---

### Example 2: Preview Before Deleting (Dry Run)

**Scenario**: See what would be deleted without actually deleting

```bash
./scripts/cleanup-claude-cache.sh --dry-run
```

**Expected Output**:
```
🧹 Claude Cache Cleanup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cache Directory: /workspaces/agent-feed/.claude/config
Retention: 7 days
Dry Run: true

📊 Found 156 files to delete

Current cache size: 48M

🔍 DRY RUN - Files that would be deleted:
.claude/config/projects/0229fe97-879c-4ce3-8ef2-32eafd0eace0.jsonl
.claude/config/projects/03130474-d526-4155-b8a6-fa3d5d488dc5.jsonl
.claude/config/shell-snapshots/snapshot-bash-1762404179057-uv7ejv.sh
.claude/config/todos/089f588b-f0c8-4174-bed3-c8f269feddf2-agent.json
... (152 more files)
```

**Use Case**: Run this before the actual cleanup to verify you're comfortable with what will be deleted.

---

### Example 3: Custom Retention Period

**Scenario**: Keep files for 14 days instead of 7

```bash
./scripts/cleanup-claude-cache.sh --days 14
```

**Why Use This**:
- More storage available, want to keep longer history
- Debugging recent issues, need older files
- Lower activity periods, files accumulate slowly

---

### Example 4: Aggressive Cleanup (3 Days)

**Scenario**: Disk space critical, delete files older than 3 days

```bash
./scripts/cleanup-claude-cache.sh --days 3
```

**Output**:
```
📊 Found 412 files to delete
Cache size: 134M → 28M
Files deleted: 412
```

**Use Case**: Emergency disk space recovery.

---

## NPM Script Usage

Add these to `package.json`:

```json
{
  "scripts": {
    "cache:cleanup": "./scripts/cleanup-claude-cache.sh",
    "cache:cleanup:dry-run": "./scripts/cleanup-claude-cache.sh --dry-run",
    "cache:cleanup:aggressive": "./scripts/cleanup-claude-cache.sh --days 3",
    "cache:cleanup:conservative": "./scripts/cleanup-claude-cache.sh --days 14"
  }
}
```

### Example 5: Using NPM Scripts

```bash
# Standard cleanup
npm run cache:cleanup

# Preview before cleanup
npm run cache:cleanup:dry-run

# Aggressive cleanup (3 days)
npm run cache:cleanup:aggressive

# Keep more history (14 days)
npm run cache:cleanup:conservative
```

---

## Automated Scheduling

### Example 6: Daily Cron Job

**Setup** (runs every day at 2:00 AM):
```bash
crontab -e

# Add this line:
0 2 * * * cd /workspaces/agent-feed && ./scripts/cleanup-claude-cache.sh >> /tmp/cache-cleanup.log 2>&1
```

**Verify cron is set**:
```bash
crontab -l | grep cache-cleanup
```

**Check execution log**:
```bash
tail -f /tmp/cache-cleanup.log
```

---

### Example 7: Weekly Cleanup (Sundays at 3 AM)

```bash
crontab -e

# Add this line:
0 3 * * 0 cd /workspaces/agent-feed && ./scripts/cleanup-claude-cache.sh --days 14 >> /tmp/cache-cleanup-weekly.log 2>&1
```

**Cron Schedule Breakdown**:
- `0` = minute (0 = on the hour)
- `3` = hour (3 AM)
- `*` = day of month (every day)
- `*` = month (every month)
- `0` = day of week (0 = Sunday)

---

### Example 8: Multiple Schedules

**Scenario**: Daily quick cleanup + weekly deep cleanup

```bash
crontab -e

# Daily: Delete files > 7 days
0 2 * * * cd /workspaces/agent-feed && ./scripts/cleanup-claude-cache.sh >> /tmp/cache-daily.log 2>&1

# Weekly: Delete files > 30 days (deeper cleanup)
0 3 * * 0 cd /workspaces/agent-feed && ./scripts/cleanup-claude-cache.sh --days 30 >> /tmp/cache-weekly.log 2>&1
```

---

## Integration Examples

### Example 9: Run After Deployment

**In CI/CD pipeline**:
```yaml
# .github/workflows/deploy.yml
- name: Deploy Application
  run: npm run deploy

- name: Cleanup Old Cache Files
  run: ./scripts/cleanup-claude-cache.sh --days 5
```

---

### Example 10: Before Backup

**Backup script**:
```bash
#!/bin/bash
# backup-with-cleanup.sh

echo "Step 1: Cleanup old cache files"
./scripts/cleanup-claude-cache.sh

echo "Step 2: Backup database"
cp database.db backups/database-$(date +%Y%m%d).db

echo "Step 3: Backup code"
tar -czf backups/code-$(date +%Y%m%d).tar.gz \
  --exclude=.claude/config \
  --exclude=node_modules \
  .

echo "✅ Backup complete"
```

---

### Example 11: Monitor Disk Space Before Cleanup

```bash
#!/bin/bash
# smart-cleanup.sh

DISK_USAGE=$(df -h /workspaces/agent-feed | tail -1 | awk '{print $5}' | sed 's/%//')

echo "Current disk usage: ${DISK_USAGE}%"

if [ "$DISK_USAGE" -gt 80 ]; then
  echo "🚨 Disk usage > 80%, running aggressive cleanup"
  ./scripts/cleanup-claude-cache.sh --days 3
elif [ "$DISK_USAGE" -gt 60 ]; then
  echo "⚠️  Disk usage > 60%, running standard cleanup"
  ./scripts/cleanup-claude-cache.sh --days 7
else
  echo "✅ Disk usage OK, running conservative cleanup"
  ./scripts/cleanup-claude-cache.sh --days 14
fi
```

---

### Example 12: Cleanup With Email Notification

```bash
#!/bin/bash
# cleanup-with-alert.sh

RESULT=$(./scripts/cleanup-claude-cache.sh)
FILES_DELETED=$(echo "$RESULT" | grep "Files deleted:" | awk '{print $3}')
SPACE_SAVED=$(echo "$RESULT" | grep "Cache size:" | awk '{print $5}')

if [ "$FILES_DELETED" -gt 100 ]; then
  echo "Cache cleanup completed: $FILES_DELETED files deleted, $SPACE_SAVED saved" | \
    mail -s "Cache Cleanup Alert" admin@example.com
fi

echo "$RESULT"
```

---

## Troubleshooting Examples

### Example 13: Verify Script Works

```bash
# Create test file
mkdir -p .claude/config/test
touch -t 202501010000 .claude/config/test/old-file.txt
# This creates a file dated Jan 1, 2025

# Run cleanup (should delete it)
./scripts/cleanup-claude-cache.sh --dry-run | grep old-file.txt

# If found, cleanup will delete it
./scripts/cleanup-claude-cache.sh

# Verify deleted
ls .claude/config/test/old-file.txt
# Should return: No such file or directory
```

---

### Example 14: Debug Cleanup Issues

```bash
# Run with bash debug mode
bash -x ./scripts/cleanup-claude-cache.sh --dry-run

# This shows every command executed:
# + CACHE_DIR=/workspaces/agent-feed/.claude/config
# + DEFAULT_RETENTION_DAYS=7
# + find /workspaces/agent-feed/.claude/config -type f -mtime +7
# ... (detailed execution trace)
```

---

### Example 15: Test Different Date Calculations

```bash
# Test 7 days ago calculation
DAYS=7

# Linux (GNU date)
date -d "$DAYS days ago" +%Y-%m-%d

# Mac (BSD date)
date -v-${DAYS}d +%Y-%m-%d

# Find files older than that date
find .claude/config -type f -mtime +$DAYS -ls
```

---

## Advanced Use Cases

### Example 16: Cleanup Specific Subdirectory

```bash
# Only cleanup projects directory
find .claude/config/projects -type f -mtime +7 -delete

# Only cleanup shell snapshots
find .claude/config/shell-snapshots -type f -mtime +7 -delete
```

---

### Example 17: Cleanup by File Size

```bash
# Delete files larger than 1MB, regardless of age
find .claude/config -type f -size +1M -delete

# Or combine age + size
find .claude/config -type f -mtime +7 -size +500k -delete
```

---

### Example 18: Keep Newest N Files

```bash
# Keep only the 100 most recent files
cd .claude/config/projects
ls -t | tail -n +101 | xargs rm --

# Explanation:
# ls -t           = list by time (newest first)
# tail -n +101    = start from line 101 (skip first 100)
# xargs rm --     = delete remaining files
```

---

### Example 19: Cleanup With Progress Bar

```bash
#!/bin/bash
# cleanup-with-progress.sh

FILES=$(find .claude/config -type f -mtime +7)
TOTAL=$(echo "$FILES" | wc -l)
COUNT=0

echo "Deleting $TOTAL files..."

echo "$FILES" | while read -r file; do
  rm "$file"
  COUNT=$((COUNT + 1))
  PERCENT=$((COUNT * 100 / TOTAL))
  echo -ne "Progress: $COUNT/$TOTAL ($PERCENT%)\r"
done

echo ""
echo "✅ Complete"
```

---

### Example 20: Cleanup With Backup

```bash
#!/bin/bash
# cleanup-with-backup.sh

BACKUP_DIR="/tmp/cache-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Backing up files to be deleted..."
find .claude/config -type f -mtime +7 -exec cp {} "$BACKUP_DIR/" \;

echo "Deleting old files..."
find .claude/config -type f -mtime +7 -delete

echo "✅ Cleanup complete. Backup at: $BACKUP_DIR"
echo "Restore with: cp $BACKUP_DIR/* .claude/config/"
```

---

## Production Examples

### Example 21: Enterprise Cleanup (Multi-Project)

```bash
#!/bin/bash
# enterprise-cleanup.sh

PROJECTS=(
  "/opt/app1/agent-feed"
  "/opt/app2/agent-feed"
  "/opt/app3/agent-feed"
)

for PROJECT in "${PROJECTS[@]}"; do
  echo "Cleaning $PROJECT..."
  cd "$PROJECT"
  ./scripts/cleanup-claude-cache.sh --days 7
  echo ""
done

echo "✅ All projects cleaned"
```

---

### Example 22: Cleanup With Metrics Logging

```bash
#!/bin/bash
# cleanup-with-metrics.sh

BEFORE_SIZE=$(du -s .claude/config | awk '{print $1}')
BEFORE_COUNT=$(find .claude/config -type f | wc -l)

./scripts/cleanup-claude-cache.sh

AFTER_SIZE=$(du -s .claude/config | awk '{print $1}')
AFTER_COUNT=$(find .claude/config -type f | wc -l)

SPACE_SAVED=$((BEFORE_SIZE - AFTER_SIZE))
FILES_DELETED=$((BEFORE_COUNT - AFTER_COUNT))

# Log to database or monitoring system
curl -X POST http://localhost:3001/api/cleanup-metrics \
  -H "Content-Type: application/json" \
  -d "{
    \"timestamp\": $(date +%s),
    \"space_saved_kb\": $SPACE_SAVED,
    \"files_deleted\": $FILES_DELETED
  }"
```

---

### Example 23: Conditional Cleanup (Only If Needed)

```bash
#!/bin/bash
# conditional-cleanup.sh

CACHE_SIZE=$(du -s .claude/config | awk '{print $1}')
THRESHOLD=50000  # 50MB in KB

if [ "$CACHE_SIZE" -gt "$THRESHOLD" ]; then
  echo "Cache size ${CACHE_SIZE}KB exceeds threshold ${THRESHOLD}KB"
  echo "Running cleanup..."
  ./scripts/cleanup-claude-cache.sh
else
  echo "Cache size ${CACHE_SIZE}KB is below threshold"
  echo "Skipping cleanup"
fi
```

---

## Quick Reference

```bash
# Most common commands
./scripts/cleanup-claude-cache.sh                    # Standard 7-day cleanup
./scripts/cleanup-claude-cache.sh --dry-run          # Preview only
./scripts/cleanup-claude-cache.sh --days 14          # Custom retention

# Via npm
npm run cache:cleanup                                # Standard cleanup
npm run cache:cleanup:dry-run                        # Preview

# Check results
du -sh .claude/config                                # Cache size
find .claude/config -type f | wc -l                  # File count
tail -20 /tmp/cache-cleanup.log                      # Recent logs

# Emergency
find .claude/config -type f -mtime +3 -delete        # Delete files > 3 days
rm -rf .claude/config/*                              # Nuclear option (careful!)
```

---

**Last Updated**: 2025-11-06
**Version**: 1.0
