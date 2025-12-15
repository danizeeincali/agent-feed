# Agent Feed Backup System - Quick Reference

## Essential Commands

```bash
# Create immediate backup
npm run backup:now

# List all backups
npm run backup:list

# Restore backup (interactive)
npm run backup:restore

# Verify backup integrity
npm run backup:verify

# Clean up old backups
npm run backup:cleanup
```

## File Locations

| Item | Path |
|------|------|
| Backup Script | `/workspaces/agent-feed/scripts/backup-system.sh` |
| Restore Script | `/workspaces/agent-feed/scripts/restore-backup.sh` |
| Cron Setup | `/workspaces/agent-feed/scripts/setup-backup-cron.sh` |
| Configuration | `/workspaces/agent-feed/config/backup-config.json` |
| Backups | `/workspaces/agent-feed/backups/YYYYMMDD_HHMMSS/` |
| Logs | `/workspaces/agent-feed/backups/logs/` |

## What Gets Backed Up

- **PostgreSQL**: `avidm_dev` database (custom + SQL format)
- **SQLite**: database.db, agent-pages.db, token-analytics.db, agent-feed.db
- **User Data**: .claude/config, .claude/memory, agents/

## Backup Structure

```
backups/YYYYMMDD_HHMMSS/
├── postgresql/          # PostgreSQL backups
├── sqlite/              # SQLite backups
├── userdata/            # User data archives
├── metadata/            # Backup metadata
└── MANIFEST.txt         # File listing
```

## Configuration

Edit `.env`:
```bash
BACKUP_RETENTION_DAYS=7        # How long to keep backups
BACKUP_ROOT=/path/to/backups   # Backup location
USE_POSTGRES=true              # Enable PostgreSQL backup
```

## Automated Backups

### Setup Cron
```bash
./scripts/setup-backup-cron.sh
```

### Manual Cron
```bash
# Daily at 2 AM
0 2 * * * /workspaces/agent-feed/scripts/backup-system.sh >> /workspaces/agent-feed/backups/logs/cron.log 2>&1
```

## Restore Options

```bash
# Interactive restore (recommended)
npm run backup:restore

# Dry run (show what would be restored)
./scripts/restore-backup.sh --dry-run

# Verify backup only
./scripts/restore-backup.sh --verify /path/to/backup

# List available backups
./scripts/restore-backup.sh --list
```

## Emergency Recovery

### Database Corruption
```bash
# 1. Stop application
docker-compose down

# 2. Restore latest backup
npm run backup:restore

# 3. Verify
npm run health-check

# 4. Start application
docker-compose up -d
```

### Accidental Deletion
```bash
# Restore specific component only
npm run backup:restore
# Select backup, choose only affected component
```

## Monitoring

```bash
# View latest backup log
tail -f /workspaces/agent-feed/backups/logs/backup_*.log

# Check for errors
grep ERROR /workspaces/agent-feed/backups/logs/*.log

# List recent backups
ls -lht /workspaces/agent-feed/backups/ | head -10
```

## Verification

```bash
# Verify PostgreSQL backup
pg_restore --list /path/to/backup.backup

# Verify SQLite backup
gunzip -c backup.db.gz | sqlite3 :memory: "PRAGMA integrity_check;"

# Verify checksums
find /workspaces/agent-feed/backups -name "*.sha256" -exec sha256sum -c {} \;
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backup fails | Check PostgreSQL is running: `systemctl status postgresql` |
| No space | Clean old backups: `npm run backup:cleanup` |
| Restore fails | Check backup integrity: `npm run backup:verify` |
| Permission denied | Fix permissions: `chmod +x scripts/*.sh` |

## Production Checklist

- [ ] Test backup: `npm run backup:now`
- [ ] Test restore: `npm run backup:restore --dry-run`
- [ ] Set up cron: `./scripts/setup-backup-cron.sh`
- [ ] Configure S3 sync (if needed)
- [ ] Set up monitoring/alerts
- [ ] Document recovery procedures
- [ ] Test quarterly

## Performance

- Backup duration: ~10 seconds
- Compressed size: ~3.5 MB (typical)
- Retention: 7 days (configurable)

## Security

```bash
# Restrict backup directory
chmod 700 /workspaces/agent-feed/backups

# Encrypt for remote storage
gpg --encrypt backup.tar.gz

# Use environment variables for passwords (not in scripts)
```

## More Information

📖 Full documentation: [BACKUP-RECOVERY-GUIDE.md](BACKUP-RECOVERY-GUIDE.md)

---

**Last Updated:** 2025-01-10
**Version:** 1.0.0
