# Phase 1 Quick Start

**1-minute deployment guide for Phase 1 PostgreSQL database.**

---

## TL;DR

```bash
# Start database
docker-compose -f docker-compose.phase1.yml up -d

# Verify deployment
./scripts/validate-phase1-deployment.sh

# Backup user data
./scripts/backup-user-data.sh
```

---

## Essential Commands

### Start/Stop

```bash
# Start
docker-compose -f docker-compose.phase1.yml up -d

# Stop
docker-compose -f docker-compose.phase1.yml down

# Restart
docker-compose -f docker-compose.phase1.yml restart

# Reset (DELETES ALL DATA!)
docker-compose -f docker-compose.phase1.yml down --volumes
```

### Monitoring

```bash
# View logs
docker-compose -f docker-compose.phase1.yml logs -f postgres

# Check health
docker-compose -f docker-compose.phase1.yml ps

# Container shell
docker exec -it agent-feed-postgres-phase1 bash
```

### Database Access

```bash
# Connect as postgres
docker exec -it agent-feed-postgres-phase1 psql -U postgres -d avidm_dev

# Connect as app user
docker exec -it agent-feed-postgres-phase1 psql -U agentfeed_app -d avidm_dev

# Run single query
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "SELECT version();"
```

### Backup/Restore

```bash
# Backup
./scripts/backup-user-data.sh

# Restore (latest full backup)
LATEST=$(ls -t backups/avidm_dev_full_*.dump | head -1)
docker exec -i agent-feed-postgres-phase1 pg_restore -U postgres -d avidm_dev -c --if-exists < $LATEST
```

---

## Schema Overview

### 6 Tables (3-Tier Model)

**TIER 1: System Configuration (Immutable)**
- `system_agent_templates` - Platform agent definitions

**TIER 2: User Customizations**
- `user_agent_customizations` - User's personalized agents

**TIER 3: User Data (Persistent)**
- `agent_memories` - Conversation history
- `agent_workspaces` - Agent-generated files

**System Tables**
- `avi_state` - Orchestrator state (single row)
- `error_log` - Error tracking

### Key Indexes

- GIN indexes on JSONB columns (jsonb_path_ops)
- Composite indexes for user + agent queries
- Partial indexes for optional fields

---

## Connection Strings

### Postgres Superuser

```
postgresql://postgres:PASSWORD@localhost:5432/avidm_dev
```

### Application User

```
postgresql://agentfeed_app:PASSWORD@localhost:5432/avidm_dev
```

### With PgBouncer (if enabled)

```
postgresql://postgres:PASSWORD@localhost:6432/avidm_dev
```

---

## Useful SQL Queries

```sql
-- List all tables
\dt

-- List all indexes
\di

-- Table sizes
SELECT
  schemaname || '.' || tablename AS table,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT
  schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Row counts
SELECT 'system_agent_templates' as table, COUNT(*) FROM system_agent_templates
UNION ALL SELECT 'user_agent_customizations', COUNT(*) FROM user_agent_customizations
UNION ALL SELECT 'agent_memories', COUNT(*) FROM agent_memories
UNION ALL SELECT 'agent_workspaces', COUNT(*) FROM agent_workspaces
UNION ALL SELECT 'avi_state', COUNT(*) FROM avi_state
UNION ALL SELECT 'error_log', COUNT(*) FROM error_log;

-- Query performance (top 10 slowest)
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

---

## Environment Variables

### Required

```bash
POSTGRES_DB=avidm_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<your-password>
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/avidm_dev
```

### Optional

```bash
DB_PORT=5432
APP_USER_PASSWORD=<app-password>
BACKUP_RETENTION_DAYS=7
ANTHROPIC_API_KEY=<your-key>
AGENT_MODEL=claude-sonnet-4-5-20250929
AVI_MODEL=claude-sonnet-4-5-20250929
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose -f docker-compose.phase1.yml logs postgres

# Check port conflict
sudo lsof -i :5432

# Reset and restart
docker-compose -f docker-compose.phase1.yml down --volumes
docker-compose -f docker-compose.phase1.yml up -d
```

### Can't connect to database

```bash
# Test connection
docker exec agent-feed-postgres-phase1 pg_isready -U postgres -d avidm_dev

# Check environment variables
docker exec agent-feed-postgres-phase1 env | grep POSTGRES
```

### Init scripts didn't run

Init scripts only run when data directory is empty.

```bash
# Reset database (WARNING: Deletes data!)
docker-compose -f docker-compose.phase1.yml down --volumes
docker-compose -f docker-compose.phase1.yml up -d
```

---

## File Locations

```
/workspaces/agent-feed/
├── docker-compose.phase1.yml    # Main configuration
├── .env.phase1                   # Environment template
├── .env.phase1.local            # Your local config (git-ignored)
├── src/database/schema/
│   ├── 001_initial_schema.sql   # Table definitions
│   ├── indexes.sql              # Index definitions
│   └── seed.sql                 # Initial data
├── scripts/
│   ├── init-db.sh               # Extensions & users
│   ├── backup-user-data.sh      # Backup script
│   └── validate-phase1-deployment.sh  # Validation
├── config/system/               # System templates (read-only)
└── backups/                     # Backup storage
```

---

## Next Steps

1. **Validate**: `./scripts/validate-phase1-deployment.sh`
2. **Seed templates**: Load system agent templates
3. **Connect app**: Use DATABASE_URL from .env.phase1.local
4. **Setup backups**: Configure automated backups
5. **Monitor**: Use pg_stat_statements for performance

---

## Full Documentation

- Deployment Guide: `PHASE1-DEPLOYMENT-GUIDE.md`
- Best Practices: `PHASE1-POSTGRES-BEST-PRACTICES.md`
- Architecture: `PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md`

---

**Version:** Phase 1
**Last Updated:** October 10, 2025
