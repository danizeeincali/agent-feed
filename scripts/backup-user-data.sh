#!/bin/bash
# ==============================================================================
# Phase 1: User Data Backup Script
# ==============================================================================
# Backs up TIER 2 & 3 user data only (NOT system templates)
# System configuration (TIER 1) is in version control and doesn't need backup
# ==============================================================================

set -e

# ==============================================================================
# Configuration
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER_NAME="${CONTAINER_NAME:-agent-feed-postgres-phase1}"
DB_NAME="${POSTGRES_DB:-avidm_dev}"
DB_USER="${POSTGRES_USER:-postgres}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ==============================================================================
# Banner
# ==============================================================================

echo "=============================================================================="
echo "Phase 1: User Data Backup"
echo "=============================================================================="
echo "Timestamp: $TIMESTAMP"
echo "Database: $DB_NAME"
echo "Container: $CONTAINER_NAME"
echo "Retention: $RETENTION_DAYS days"
echo ""

# ==============================================================================
# Validation
# ==============================================================================

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}\$"; then
  echo "❌ Error: PostgreSQL container '$CONTAINER_NAME' is not running"
  echo ""
  echo "Start the container with:"
  echo "  docker-compose -f docker-compose.phase1.yml up -d"
  echo ""
  exit 1
fi

# Check if container is healthy
if ! docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
  echo "❌ Error: PostgreSQL is not ready in container '$CONTAINER_NAME'"
  exit 1
fi

echo "✓ Container is running and healthy"
echo ""

# ==============================================================================
# Backup TIER 2 & 3 User Data (Selective Backup)
# ==============================================================================

echo "→ Backing up user data (TIER 2 & 3)..."
echo "  Tables:"
echo "    - user_agent_customizations (TIER 2)"
echo "    - agent_memories (TIER 3)"
echo "    - agent_workspaces (TIER 3)"
echo ""

# Create user data backup with custom format (allows selective restore)
docker exec "$CONTAINER_NAME" pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F c \
  -t user_agent_customizations \
  -t agent_memories \
  -t agent_workspaces \
  -f "/backups/${DB_NAME}_user_data_${TIMESTAMP}.dump"

# Check if backup was successful
if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_DIR/${DB_NAME}_user_data_${TIMESTAMP}.dump" 2>/dev/null | cut -f1)
  echo "✓ User data backup created: ${DB_NAME}_user_data_${TIMESTAMP}.dump"
  echo "  Size: ${BACKUP_SIZE:-Unknown}"
else
  echo "❌ User data backup failed!"
  exit 1
fi

# ==============================================================================
# Full Database Backup (Disaster Recovery)
# ==============================================================================

echo ""
echo "→ Creating full database backup (disaster recovery)..."
echo "  All tables including:"
echo "    - system_agent_templates (TIER 1)"
echo "    - avi_state"
echo "    - error_log"
echo ""

docker exec "$CONTAINER_NAME" pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F c \
  -f "/backups/${DB_NAME}_full_${TIMESTAMP}.dump"

if [ $? -eq 0 ]; then
  FULL_SIZE=$(du -h "$BACKUP_DIR/${DB_NAME}_full_${TIMESTAMP}.dump" 2>/dev/null | cut -f1)
  echo "✓ Full backup created: ${DB_NAME}_full_${TIMESTAMP}.dump"
  echo "  Size: ${FULL_SIZE:-Unknown}"
else
  echo "❌ Full backup failed!"
  exit 1
fi

# ==============================================================================
# Backup Cleanup (Retention Policy)
# ==============================================================================

echo ""
echo "→ Cleaning up old backups (keeping last $RETENTION_DAYS days)..."

# Count backups before cleanup
BEFORE_COUNT=$(ls -1 "$BACKUP_DIR"/${DB_NAME}_*.dump 2>/dev/null | wc -l)

# Delete old backups
find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -type f -mtime +$RETENTION_DAYS -delete

# Count backups after cleanup
AFTER_COUNT=$(ls -1 "$BACKUP_DIR"/${DB_NAME}_*.dump 2>/dev/null | wc -l)
DELETED_COUNT=$((BEFORE_COUNT - AFTER_COUNT))

echo "✓ Cleanup complete"
echo "  Deleted: $DELETED_COUNT old backup(s)"
echo "  Remaining: $AFTER_COUNT backup(s)"

# ==============================================================================
# Create Backup Manifest
# ==============================================================================

cat > "$BACKUP_DIR/LATEST_BACKUP.txt" <<EOF
Phase 1: Latest Backup Information
============================================================================
Timestamp: $TIMESTAMP
Date: $(date '+%Y-%m-%d %H:%M:%S %Z')
Database: $DB_NAME
Container: $CONTAINER_NAME

============================================================================
Backup Files
============================================================================

User Data Backup (TIER 2 & 3):
  File: ${DB_NAME}_user_data_${TIMESTAMP}.dump
  Size: ${BACKUP_SIZE:-Unknown}
  Tables:
    - user_agent_customizations (TIER 2: User's personalized agents)
    - agent_memories (TIER 3: User's conversation history)
    - agent_workspaces (TIER 3: User's agent-generated files)

Full Database Backup (Disaster Recovery):
  File: ${DB_NAME}_full_${TIMESTAMP}.dump
  Size: ${FULL_SIZE:-Unknown}
  Tables: All 6 tables (system_agent_templates, user_agent_customizations,
          agent_memories, agent_workspaces, avi_state, error_log)

============================================================================
Retention Policy
============================================================================
Retention Period: $RETENTION_DAYS days
Total Backups: $AFTER_COUNT

============================================================================
Restore Instructions
============================================================================

OPTION 1: Restore User Data Only (TIER 2 & 3)
-----------------------------------------------
# Stop application
docker-compose -f docker-compose.phase1.yml stop

# Restore user data
docker exec -i $CONTAINER_NAME pg_restore \\
  -U $DB_USER \\
  -d $DB_NAME \\
  -c --if-exists \\
  < ./backups/${DB_NAME}_user_data_${TIMESTAMP}.dump

# Start application
docker-compose -f docker-compose.phase1.yml start

OPTION 2: Restore Full Database (Disaster Recovery)
-----------------------------------------------------
# Stop application
docker-compose -f docker-compose.phase1.yml stop

# Restore full database
docker exec -i $CONTAINER_NAME pg_restore \\
  -U $DB_USER \\
  -d $DB_NAME \\
  -c --if-exists \\
  < ./backups/${DB_NAME}_full_${TIMESTAMP}.dump

# Start application
docker-compose -f docker-compose.phase1.yml start

OPTION 3: Restore Specific Tables
-----------------------------------
# List tables in backup
docker exec $CONTAINER_NAME pg_restore -U $DB_USER -l /backups/${DB_NAME}_full_${TIMESTAMP}.dump

# Restore specific table (example: agent_memories)
docker exec $CONTAINER_NAME pg_restore \\
  -U $DB_USER \\
  -d $DB_NAME \\
  -t agent_memories \\
  -c --if-exists \\
  /backups/${DB_NAME}_full_${TIMESTAMP}.dump

============================================================================
Verification
============================================================================

After restore, verify data:
# Connect to database
docker exec -it $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME

# Check row counts
SELECT 'user_agent_customizations' as table, COUNT(*) FROM user_agent_customizations
UNION ALL
SELECT 'agent_memories', COUNT(*) FROM agent_memories
UNION ALL
SELECT 'agent_workspaces', COUNT(*) FROM agent_workspaces;

# Exit
\\q

============================================================================
EOF

# ==============================================================================
# Summary
# ==============================================================================

echo ""
echo "=============================================================================="
echo "Backup Complete"
echo "=============================================================================="
echo "Backup Location: $BACKUP_DIR"
echo "Manifest: $BACKUP_DIR/LATEST_BACKUP.txt"
echo ""
echo "Files Created:"
echo "  1. ${DB_NAME}_user_data_${TIMESTAMP}.dump ($BACKUP_SIZE)"
echo "  2. ${DB_NAME}_full_${TIMESTAMP}.dump ($FULL_SIZE)"
echo ""
echo "Quick Restore (Full):"
echo "  docker exec -i $CONTAINER_NAME pg_restore -U $DB_USER -d $DB_NAME -c --if-exists < ./backups/${DB_NAME}_full_${TIMESTAMP}.dump"
echo ""
echo "=============================================================================="
echo ""
