# Database Backups Archive

This directory contains archived database backups that have been moved out of active project directories to save disk space.

## Archive Structure

```
.archives/database-backups/
├── README.md (this file)
└── YYYY-MM-DD/
    └── *.db files
```

## Archived Backups

### 2025-10-10
- **agent-feed-20251010_050502.db** (464KB) - Main agent feed database backup
- **agent-pages-20251010_050502.db** (348KB) - Agent pages database backup
- **Total Size**: 816KB
- **Archived From**: `/workspaces/agent-feed/backups/`
- **Reason**: Routine disk cleanup to free space
- **Status**: Safe to delete after 30 days if no issues

## Restore Instructions

To restore a backup:

```bash
# Copy backup to original location
cp .archives/database-backups/YYYY-MM-DD/agent-feed-*.db /workspaces/agent-feed/backups/

# Or restore directly to database location
cp .archives/database-backups/YYYY-MM-DD/agent-feed-*.db /workspaces/agent-feed/database.db
```

## Retention Policy

- **Keep**: Last 7 days of backups in active `/backups/` directory
- **Archive**: Backups older than 7 days move here
- **Delete**: Backups older than 30 days can be safely deleted from archives

## Notes

- These backups were created before Phase 2B/2C PostgreSQL migration completion
- Current production system uses PostgreSQL (`avidm_dev` database)
- These SQLite backups are from the transition period
- Verify PostgreSQL backups are being created regularly
