# Phase 1 Deployment Guide

Complete guide for deploying the Phase 1 PostgreSQL database with Docker Compose.

---

## Quick Start

```bash
# 1. Start the database
docker-compose -f docker-compose.phase1.yml up -d

# 2. View initialization logs
docker-compose -f docker-compose.phase1.yml logs -f postgres

# 3. Verify health
docker-compose -f docker-compose.phase1.yml ps

# 4. Connect to database
docker exec -it agent-feed-postgres-phase1 psql -U postgres -d avidm_dev
```

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Configuration](#configuration)
3. [Deployment](#deployment)
4. [Verification](#verification)
5. [Backup and Restore](#backup-and-restore)
6. [Troubleshooting](#troubleshooting)
7. [Volume Management](#volume-management)

---

## Prerequisites

### Required Software

- Docker 20.10+
- Docker Compose 2.0+
- Bash (for backup scripts)

### System Requirements

- Minimum: 1 CPU, 1GB RAM, 10GB disk
- Recommended: 2 CPU, 2GB RAM, 20GB disk

### File Structure

Ensure the following files exist:

```
/workspaces/agent-feed/
├── docker-compose.phase1.yml
├── .env.phase1
├── src/database/schema/
│   ├── 001_initial_schema.sql
│   ├── indexes.sql
│   └── seed.sql
├── scripts/
│   ├── init-db.sh
│   └── backup-user-data.sh
├── config/system/          # System templates (read-only)
└── backups/                # Created automatically
```

---

## Configuration

### 1. Environment Variables

Copy and customize the environment file:

```bash
cp .env.phase1 .env.phase1.local
```

Edit `.env.phase1.local` with your values:

```bash
# Database credentials (CHANGE THESE!)
POSTGRES_DB=avidm_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here

# Full connection string
DATABASE_URL=postgresql://postgres:your_secure_password_here@localhost:5432/avidm_dev

# Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Models
AGENT_MODEL=claude-sonnet-4-5-20250929
AVI_MODEL=claude-sonnet-4-5-20250929

# Application user password
APP_USER_PASSWORD=app_secure_password_here
```

### 2. Docker Compose

The `docker-compose.phase1.yml` configuration includes:

#### Volume Protection

- **Read-only system config**: `./config/system:/app/config/system:ro`
- **Persistent user data**: `postgres_data`, `agent_workspaces` (named volumes)
- **Auto-init scripts**: SQL files mounted to `/docker-entrypoint-initdb.d/`

#### Health Checks

- **Test**: `pg_isready -U postgres -d avidm_dev`
- **Interval**: 10 seconds
- **Retries**: 5
- **Start period**: 10 seconds

#### Resource Limits

- **CPU**: 1-2 cores
- **Memory**: 1-2 GB
- **Optimized for**: SSD storage

---

## Deployment

### Step 1: Start PostgreSQL

```bash
# Load environment variables
export $(cat .env.phase1.local | xargs)

# Start the database
docker-compose -f docker-compose.phase1.yml up -d
```

### Step 2: Monitor Initialization

```bash
# Watch logs (CTRL+C to exit)
docker-compose -f docker-compose.phase1.yml logs -f postgres
```

**Expected output:**

```
PostgreSQL init process complete; ready for start up.
PostgreSQL Database directory appears to contain a database; Skipping initialization
LOG:  database system is ready to accept connections

Phase 1: PostgreSQL Extensions and Application User Setup
→ Waiting for PostgreSQL to be ready...
✓ PostgreSQL is ready

✓ PostgreSQL extensions initialized:
  - uuid-ossp (UUID generation)
  - pg_trgm (Trigram text search)
  - btree_gin (Additional GIN operators)
  - pg_stat_statements (Query monitoring)

✓ Created application user: agentfeed_app
✓ Granted permissions to agentfeed_app

Phase 1: Database Initialization Complete
Database: avidm_dev
Tables: 6
Indexes: 20+
Avi State Initialized: true
```

### Step 3: Verify Deployment

```bash
# Check container status
docker-compose -f docker-compose.phase1.yml ps

# Should show:
# NAME                           STATUS         PORTS
# agent-feed-postgres-phase1     Up (healthy)   0.0.0.0:5432->5432/tcp
```

---

## Verification

### 1. Health Check

```bash
# Quick health check
docker exec agent-feed-postgres-phase1 pg_isready -U postgres -d avidm_dev

# Expected output:
# /var/run/postgresql:5432 - accepting connections
```

### 2. Schema Verification

```bash
# Connect to database
docker exec -it agent-feed-postgres-phase1 psql -U postgres -d avidm_dev
```

```sql
-- List all tables
\dt

-- Expected output:
-- public | agent_memories              | table | postgres
-- public | agent_workspaces            | table | postgres
-- public | avi_state                   | table | postgres
-- public | error_log                   | table | postgres
-- public | system_agent_templates      | table | postgres
-- public | user_agent_customizations   | table | postgres

-- Count tables
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Expected: 6

-- List indexes
\di

-- Count indexes
SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';
-- Expected: 20+

-- Verify avi_state seeded
SELECT * FROM avi_state;
-- Expected: 1 row with id=1

-- Exit
\q
```

### 3. Extensions Verification

```sql
-- List extensions
\dx

-- Expected:
-- btree_gin
-- pg_stat_statements
-- pg_trgm
-- plpgsql
-- uuid-ossp
```

### 4. User Verification

```sql
-- List users
\du

-- Expected:
-- postgres      | Superuser, Create role, Create DB, Replication, Bypass RLS
-- agentfeed_app | (no special roles)
```

---

## Backup and Restore

### Automated Backup

```bash
# Run backup script
./scripts/backup-user-data.sh

# Expected output:
# ✓ User data backup created: avidm_dev_user_data_20251010_120000.dump
# ✓ Full backup created: avidm_dev_full_20251010_120000.dump
# ✓ Cleanup complete. Remaining backups: 14
```

### Backup Files

Two types of backups are created:

1. **User data only** (TIER 2 & 3):
   - `avidm_dev_user_data_TIMESTAMP.dump`
   - Tables: `user_agent_customizations`, `agent_memories`, `agent_workspaces`

2. **Full database** (all tables):
   - `avidm_dev_full_TIMESTAMP.dump`
   - All 6 tables

### Restore User Data

```bash
# Stop application
docker-compose -f docker-compose.phase1.yml stop

# Restore user data
docker exec -i agent-feed-postgres-phase1 pg_restore \
  -U postgres \
  -d avidm_dev \
  -c --if-exists \
  < ./backups/avidm_dev_user_data_20251010_120000.dump

# Start application
docker-compose -f docker-compose.phase1.yml start
```

### Restore Full Database

```bash
# Stop application
docker-compose -f docker-compose.phase1.yml stop

# Restore full database
docker exec -i agent-feed-postgres-phase1 pg_restore \
  -U postgres \
  -d avidm_dev \
  -c --if-exists \
  < ./backups/avidm_dev_full_20251010_120000.dump

# Start application
docker-compose -f docker-compose.phase1.yml start
```

### Automated Backups (Production)

Uncomment the `postgres-backup` service in `docker-compose.phase1.yml`:

```yaml
postgres-backup:
  image: prodrigestivill/postgres-backup-local:16-alpine
  # ... (see docker-compose.phase1.yml for full config)
```

Then restart:

```bash
docker-compose -f docker-compose.phase1.yml up -d
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.phase1.yml logs postgres

# Common issues:
# 1. Port 5432 already in use
# 2. Invalid environment variables
# 3. Volume permission issues
```

**Solution for port conflict:**

```bash
# Check what's using port 5432
sudo lsof -i :5432

# Change port in .env.phase1.local
DB_PORT=5433

# Restart
docker-compose -f docker-compose.phase1.yml down
docker-compose -f docker-compose.phase1.yml up -d
```

### Init Scripts Not Running

Init scripts only run when the data directory is **empty**.

```bash
# Reset database (WARNING: Deletes all data!)
docker-compose -f docker-compose.phase1.yml down --volumes

# Start fresh
docker-compose -f docker-compose.phase1.yml up -d
```

### Health Check Failing

```bash
# Check PostgreSQL logs
docker-compose -f docker-compose.phase1.yml logs postgres

# Manually test connection
docker exec agent-feed-postgres-phase1 pg_isready -U postgres -d avidm_dev
```

### Permission Errors

```bash
# Check file permissions
ls -la ./backups
ls -la ./scripts

# Fix script permissions
chmod +x ./scripts/init-db.sh
chmod +x ./scripts/backup-user-data.sh

# Fix backup directory permissions
sudo chmod 777 ./backups
```

### Cannot Connect from Application

```bash
# Test connection string
docker exec -it agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "SELECT version();"

# If using application user
docker exec -it agent-feed-postgres-phase1 psql -U agentfeed_app -d avidm_dev -c "SELECT current_user;"

# Verify network
docker network inspect agent-feed_phase1-network
```

---

## Volume Management

### List Volumes

```bash
# List all volumes
docker volume ls

# Inspect postgres data volume
docker volume inspect agent-feed_postgres_data

# Inspect workspaces volume
docker volume inspect agent-feed_agent_workspaces
```

### Backup Volumes (Alternative Method)

```bash
# Backup postgres data volume to tar.gz
docker run --rm \
  -v agent-feed_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine \
  tar czvf /backup/postgres_volume_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

### Restore Volumes

```bash
# Stop containers
docker-compose -f docker-compose.phase1.yml down

# Restore volume from tar.gz
docker run --rm \
  -v agent-feed_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine \
  tar xzvf /backup/postgres_volume_20251010_120000.tar.gz -C /data

# Start containers
docker-compose -f docker-compose.phase1.yml up -d
```

### Clean Up Volumes (DANGER!)

```bash
# Remove all volumes (deletes ALL data!)
docker-compose -f docker-compose.phase1.yml down --volumes

# Remove specific volume
docker volume rm agent-feed_postgres_data
```

---

## Production Hardening

### 1. Enable PgBouncer

Uncomment `pgbouncer` service in `docker-compose.phase1.yml` and update connection string:

```bash
# In .env.phase1.local
DB_HOST=localhost
DB_PORT=6432  # PgBouncer port
DATABASE_URL=postgresql://postgres:password@localhost:6432/avidm_dev
```

### 2. Use Docker Secrets

```yaml
# docker-compose.phase1.yml
services:
  postgres:
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### 3. Resource Limits

Adjust in `docker-compose.phase1.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
    reservations:
      cpus: '2'
      memory: 2G
```

### 4. Monitoring

Enable `pg_stat_statements`:

```sql
-- Already enabled in init-db.sh
-- View slow queries
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

---

## Next Steps

1. **Verify schema**: Run the verification steps above
2. **Seed system templates**: Load agent templates from `config/system/`
3. **Start application**: Connect your Avi DM application
4. **Setup backups**: Configure automated backups for production
5. **Monitor performance**: Use `pg_stat_statements` for query analysis

---

## Support

For issues, refer to:
- `/workspaces/agent-feed/PHASE1-POSTGRES-BEST-PRACTICES.md`
- PostgreSQL 16 Documentation: https://www.postgresql.org/docs/16/
- Docker Compose Documentation: https://docs.docker.com/compose/

---

**Last Updated:** October 10, 2025
**Version:** Phase 1 Initial Release
