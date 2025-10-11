# Agent Feed Backups Directory

This directory contains automated backups of the Agent Feed system.

## Directory Structure

```
backups/
├── YYYYMMDD_HHMMSS/         # Timestamped backup directories
│   ├── postgresql/          # PostgreSQL database backups
│   ├── sqlite/              # SQLite database backups
│   ├── userdata/            # User data and configurations
│   ├── metadata/            # Backup metadata and manifests
│   └── MANIFEST.txt         # Backup contents listing
├── logs/                    # Backup operation logs
│   ├── backup_*.log         # Backup execution logs
│   ├── restore_*.log        # Restore execution logs
│   └── cron.log             # Cron job logs
└── rollback_*/              # Rollback backups (created before restore)
```

## Quick Commands

```bash
# Create backup
npm run backup:now

# List backups
npm run backup:list

# Restore backup (interactive)
npm run backup:restore

# Verify backup integrity
npm run backup:verify

# Clean up old backups
npm run backup:cleanup
```

## Backup Contents

Each backup includes:

- **PostgreSQL Database**: Full database dump (custom + SQL format)
- **SQLite Databases**: All SQLite databases (compressed)
- **User Data**: Agent configurations, workspaces, memory
- **Checksums**: SHA256 checksums for integrity verification
- **Metadata**: Backup information and statistics

## Backup Types

### PostgreSQL Backups
- **Custom format** (`.backup`): Binary, compressed, optimal for `pg_restore`
- **SQL format** (`.sql.gz`): Human-readable, compressed SQL dump
- **Schema-only** (`.sql.gz`): Database structure without data
- **Statistics**: Table counts, sizes, and metadata

### SQLite Backups
- `database.db` - Main application database
- `data/agent-pages.db` - Agent pages data
- `data/token-analytics.db` - Token usage analytics
- `data/agent-feed.db` - Feed data

### User Data Backups
- `.claude/config` - Claude configurations
- `.claude/memory` - Agent memory and state
- `agents/` - Agent definitions and workspaces

## Retention Policy

Default retention: **7 days**

Configure retention in `.env`:
```bash
BACKUP_RETENTION_DAYS=7
```

## Automated Backups

Set up automated backups with cron:

```bash
./scripts/setup-backup-cron.sh
```

Or manually add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * /workspaces/agent-feed/scripts/backup-system.sh >> /workspaces/agent-feed/backups/logs/cron.log 2>&1

# Weekly backup with longer retention (28 days)
0 3 * * 0 BACKUP_RETENTION_DAYS=28 /workspaces/agent-feed/scripts/backup-system.sh >> /workspaces/agent-feed/backups/logs/cron-weekly.log 2>&1

# Monthly backup with 1 year retention
0 4 1 * * BACKUP_RETENTION_DAYS=365 /workspaces/agent-feed/scripts/backup-system.sh >> /workspaces/agent-feed/backups/logs/cron-monthly.log 2>&1
```

## Restore Instructions

### Interactive Restore

```bash
npm run backup:restore
```

The interactive wizard will:
1. List all available backups
2. Let you select a backup
3. Verify backup integrity
4. Let you choose components to restore
5. Create rollback backup before restore
6. Restore selected components
7. Verify restored data

### Manual Restore

#### PostgreSQL
```bash
# Custom format backup
pg_restore -h localhost -U postgres -d avidm_dev -v /path/to/backup.backup

# SQL format backup
gunzip -c backup.sql.gz | psql -h localhost -U postgres -d avidm_dev
```

#### SQLite
```bash
# Decompress and replace
gunzip -c database_20250110_120000.db.gz > database.db

# Verify integrity
sqlite3 database.db "PRAGMA integrity_check;"
```

#### User Data
```bash
# Extract tar archives
tar -xzf claude_config_20250110_120000.tar.gz -C /workspaces/agent-feed/
```

## Backup Verification

Every backup is automatically verified:
- SHA256 checksums for all files
- PostgreSQL backup validity check
- SQLite integrity check (`PRAGMA integrity_check`)
- Metadata generation

Verify a backup manually:
```bash
./scripts/restore-backup.sh --verify /path/to/backup
```

## Security

- Backups contain sensitive data
- Restrict directory permissions: `chmod 700 backups/`
- Do not commit backups to version control
- Use encryption for remote storage
- Store backups in secure location separate from production

## Remote Backup (S3)

Configure S3 sync in `config/backup-config.json` and run:

```bash
# Sync to S3 after backup
aws s3 sync /workspaces/agent-feed/backups/ s3://your-bucket/agent-feed-backups/ \
    --storage-class STANDARD_IA \
    --exclude "logs/*" \
    --exclude "rollback_*"
```

## Monitoring

View backup logs:
```bash
# Latest backup log
tail -f backups/logs/backup_*.log

# Cron job logs
tail -f backups/logs/cron.log

# Search for errors
grep ERROR backups/logs/*.log
```

## Important Notes

1. **Test restores regularly** - Verify backups can be restored in staging
2. **Monitor backup logs** - Check for errors and warnings
3. **Keep multiple backup copies** - Local + remote storage
4. **Document your recovery process** - Update disaster recovery procedures
5. **Encrypt sensitive backups** - Use GPG or cloud provider encryption

## More Information

See [BACKUP-RECOVERY-GUIDE.md](../BACKUP-RECOVERY-GUIDE.md) for:
- Complete backup system documentation
- Disaster recovery procedures
- S3 integration guide
- Troubleshooting
- Production best practices

---

**Important**: Keep backups in a secure location separate from the production system for disaster recovery.
