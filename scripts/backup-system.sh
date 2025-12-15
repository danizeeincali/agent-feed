#!/bin/bash

##############################################################################
# Agent Feed Backup System
# Description: Automated backup for PostgreSQL, SQLite, and user data
# Author: Agent Feed Team
# Version: 1.0.0
##############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.env"
fi

# Configuration
BACKUP_ROOT="${BACKUP_ROOT:-$PROJECT_ROOT/backups}"
CONFIG_FILE="${CONFIG_FILE:-$PROJECT_ROOT/config/backup-config.json}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
LOG_DIR="$BACKUP_ROOT/logs"
LOG_FILE="$LOG_DIR/backup_$TIMESTAMP.log"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-avidm_dev}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
USE_POSTGRES="${USE_POSTGRES:-true}"

# Backup status
BACKUP_SUCCESS=true
BACKUP_ERRORS=()

##############################################################################
# Logging Functions
##############################################################################

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Color based on level
    local color=$NC
    case $level in
        INFO)  color=$BLUE ;;
        SUCCESS) color=$GREEN ;;
        WARN)  color=$YELLOW ;;
        ERROR) color=$RED ;;
    esac

    # Output to console and log file
    echo -e "${color}[$timestamp] [$level] $message${NC}" | tee -a "$LOG_FILE"
}

info() {
    log INFO "$@"
}

success() {
    log SUCCESS "$@"
}

warn() {
    log WARN "$@"
}

error() {
    log ERROR "$@"
    BACKUP_SUCCESS=false
    BACKUP_ERRORS+=("$*")
}

##############################################################################
# Utility Functions
##############################################################################

check_dependencies() {
    info "Checking dependencies..."

    local missing_deps=()

    # Check required commands
    for cmd in gzip tar sha256sum jq; do
        if ! command -v $cmd &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done

    # Check PostgreSQL tools if enabled
    if [ "$USE_POSTGRES" = "true" ]; then
        for cmd in pg_dump psql; do
            if ! command -v $cmd &> /dev/null; then
                missing_deps+=("$cmd")
            fi
        done
    fi

    # Check SQLite tools
    if ! command -v sqlite3 &> /dev/null; then
        missing_deps+=("sqlite3")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        error "Missing dependencies: ${missing_deps[*]}"
        error "Please install missing packages: apt-get install ${missing_deps[*]}"
        exit 1
    fi

    success "All dependencies are available"
}

create_backup_directories() {
    info "Creating backup directories..."

    mkdir -p "$BACKUP_DIR"/{postgresql,sqlite,userdata,metadata}
    mkdir -p "$LOG_DIR"

    success "Backup directories created: $BACKUP_DIR"
}

##############################################################################
# PostgreSQL Backup Functions
##############################################################################

backup_postgresql() {
    if [ "$USE_POSTGRES" != "true" ]; then
        info "PostgreSQL backup skipped (USE_POSTGRES=false)"
        return 0
    fi

    info "Starting PostgreSQL backup..."

    local pg_backup_dir="$BACKUP_DIR/postgresql"
    local backup_file="$pg_backup_dir/${POSTGRES_DB}_${TIMESTAMP}.backup"
    local backup_sql="$pg_backup_dir/${POSTGRES_DB}_${TIMESTAMP}.sql"

    # Set password environment variable
    export PGPASSWORD="$POSTGRES_PASSWORD"

    # Test connection
    info "Testing PostgreSQL connection..."
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" &> /dev/null; then
        error "Cannot connect to PostgreSQL database"
        unset PGPASSWORD
        return 1
    fi

    # Create custom format backup (compressed, restorable)
    info "Creating custom format backup (for pg_restore)..."
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" \
               -d "$POSTGRES_DB" \
               -F custom \
               -Z 9 \
               -f "$backup_file" \
               --verbose 2>> "$LOG_FILE"; then
        success "Custom format backup created: $backup_file"

        # Create checksum
        sha256sum "$backup_file" > "$backup_file.sha256"

        # Get backup size
        local size
        size=$(du -h "$backup_file" | cut -f1)
        info "Backup size: $size"
    else
        error "Failed to create custom format backup"
        unset PGPASSWORD
        return 1
    fi

    # Create SQL format backup (human-readable)
    info "Creating SQL format backup (human-readable)..."
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" \
               -d "$POSTGRES_DB" \
               -F plain \
               -f "$backup_sql" \
               --verbose 2>> "$LOG_FILE"; then

        # Compress SQL backup
        gzip -9 "$backup_sql"
        success "SQL format backup created: ${backup_sql}.gz"

        # Create checksum
        sha256sum "${backup_sql}.gz" > "${backup_sql}.gz.sha256"
    else
        error "Failed to create SQL format backup"
    fi

    # Create schema-only backup
    info "Creating schema-only backup..."
    local schema_file="$pg_backup_dir/${POSTGRES_DB}_schema_${TIMESTAMP}.sql"
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" \
               -d "$POSTGRES_DB" \
               --schema-only \
               -f "$schema_file" 2>> "$LOG_FILE"; then
        gzip -9 "$schema_file"
        success "Schema backup created: ${schema_file}.gz"
    else
        warn "Failed to create schema backup"
    fi

    # Get database statistics
    info "Gathering database statistics..."
    local stats_file="$pg_backup_dir/database_stats_${TIMESTAMP}.txt"
    {
        echo "=== Database Statistics ==="
        echo "Timestamp: $(date)"
        echo "Database: $POSTGRES_DB"
        echo ""

        echo "=== Table Row Counts ==="
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
             -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;" 2>> "$LOG_FILE"

        echo ""
        echo "=== Database Size ==="
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
             -c "SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'));" 2>> "$LOG_FILE"

        echo ""
        echo "=== Table Sizes ==="
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
             -c "SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;" 2>> "$LOG_FILE"
    } > "$stats_file" 2>&1

    unset PGPASSWORD

    success "PostgreSQL backup completed"
    return 0
}

##############################################################################
# SQLite Backup Functions
##############################################################################

backup_sqlite() {
    info "Starting SQLite backup..."

    local sqlite_backup_dir="$BACKUP_DIR/sqlite"
    local backed_up_count=0

    # SQLite databases to backup
    local sqlite_dbs=(
        "$PROJECT_ROOT/database.db"
        "$PROJECT_ROOT/data/agent-pages.db"
        "$PROJECT_ROOT/data/token-analytics.db"
        "$PROJECT_ROOT/data/agent-feed.db"
    )

    for db_path in "${sqlite_dbs[@]}"; do
        if [ -f "$db_path" ]; then
            local db_name
            db_name=$(basename "$db_path")
            local backup_file="$sqlite_backup_dir/${db_name%.db}_${TIMESTAMP}.db"

            info "Backing up SQLite database: $db_name"

            # Use SQLite backup command for proper online backup
            if sqlite3 "$db_path" ".backup '$backup_file'" 2>> "$LOG_FILE"; then
                # Verify backup
                if sqlite3 "$backup_file" "PRAGMA integrity_check;" > /dev/null 2>&1; then
                    success "SQLite backup verified: $db_name"

                    # Create checksum
                    sha256sum "$backup_file" > "$backup_file.sha256"

                    # Compress backup
                    gzip -9 "$backup_file"

                    # Get backup size
                    local size
                    size=$(du -h "$backup_file.gz" | cut -f1)
                    info "Compressed size: $size"

                    ((backed_up_count++))
                else
                    error "SQLite backup verification failed: $db_name"
                    rm -f "$backup_file"
                fi
            else
                error "Failed to backup SQLite database: $db_name"
            fi
        else
            warn "SQLite database not found: $db_path"
        fi
    done

    if [ $backed_up_count -gt 0 ]; then
        success "SQLite backup completed: $backed_up_count databases"
        return 0
    else
        warn "No SQLite databases were backed up"
        return 1
    fi
}

##############################################################################
# User Data Backup Functions
##############################################################################

backup_userdata() {
    info "Starting user data backup..."

    local userdata_backup_dir="$BACKUP_DIR/userdata"
    local backed_up_count=0

    # User data paths to backup
    local userdata_paths=(
        "$PROJECT_ROOT/.claude/config"
        "$PROJECT_ROOT/.claude/memory"
        "$PROJECT_ROOT/agents"
        "$PROJECT_ROOT/config/agents.json"
    )

    for path in "${userdata_paths[@]}"; do
        if [ -e "$path" ]; then
            local path_name
            path_name=$(basename "$path")
            local parent_name
            parent_name=$(basename "$(dirname "$path")")
            local backup_name="${parent_name}_${path_name}"

            info "Backing up: $path"

            if [ -d "$path" ]; then
                # Directory - create tar archive
                local backup_file="$userdata_backup_dir/${backup_name}_${TIMESTAMP}.tar.gz"
                if tar -czf "$backup_file" -C "$(dirname "$path")" "$path_name" 2>> "$LOG_FILE"; then
                    success "Directory backed up: $path_name"
                    sha256sum "$backup_file" > "$backup_file.sha256"
                    ((backed_up_count++))
                else
                    error "Failed to backup directory: $path"
                fi
            elif [ -f "$path" ]; then
                # File - copy and compress
                local backup_file="$userdata_backup_dir/${backup_name}_${TIMESTAMP}"
                if cp "$path" "$backup_file" 2>> "$LOG_FILE"; then
                    gzip -9 "$backup_file"
                    success "File backed up: $path_name"
                    sha256sum "$backup_file.gz" > "$backup_file.gz.sha256"
                    ((backed_up_count++))
                else
                    error "Failed to backup file: $path"
                fi
            fi
        else
            warn "User data path not found: $path"
        fi
    done

    if [ $backed_up_count -gt 0 ]; then
        success "User data backup completed: $backed_up_count items"
        return 0
    else
        warn "No user data was backed up"
        return 1
    fi
}

##############################################################################
# Backup Metadata Functions
##############################################################################

create_backup_metadata() {
    info "Creating backup metadata..."

    local metadata_file="$BACKUP_DIR/metadata/backup_metadata.json"

    # Create metadata JSON
    cat > "$metadata_file" << EOF
{
  "backup": {
    "timestamp": "$TIMESTAMP",
    "date": "$(date -Iseconds)",
    "version": "1.0.0",
    "hostname": "$(hostname)",
    "user": "$(whoami)",
    "success": $BACKUP_SUCCESS,
    "errors": $(printf '%s\n' "${BACKUP_ERRORS[@]}" | jq -R . | jq -s .),
    "components": {
      "postgresql": {
        "enabled": $USE_POSTGRES,
        "database": "$POSTGRES_DB",
        "host": "$DB_HOST",
        "port": $DB_PORT
      },
      "sqlite": {
        "enabled": true
      },
      "userdata": {
        "enabled": true
      }
    },
    "backup_dir": "$BACKUP_DIR",
    "retention_days": $RETENTION_DAYS
  }
}
EOF

    success "Backup metadata created"
}

create_backup_manifest() {
    info "Creating backup manifest..."

    local manifest_file="$BACKUP_DIR/MANIFEST.txt"

    {
        echo "=== Agent Feed Backup Manifest ==="
        echo "Timestamp: $(date)"
        echo "Backup Directory: $BACKUP_DIR"
        echo ""
        echo "=== Backup Contents ==="
        find "$BACKUP_DIR" -type f -exec ls -lh {} \; | awk '{print $9, "("$5")"}'
        echo ""
        echo "=== Total Backup Size ==="
        du -sh "$BACKUP_DIR"
        echo ""
        echo "=== Checksums ==="
        find "$BACKUP_DIR" -name "*.sha256" -exec cat {} \;
    } > "$manifest_file"

    success "Backup manifest created"
}

##############################################################################
# Verification Functions
##############################################################################

verify_backup() {
    info "Verifying backup integrity..."

    local verification_failed=false

    # Verify checksums
    while IFS= read -r -d '' checksum_file; do
        local target_file="${checksum_file%.sha256}"

        if [ -f "$target_file" ]; then
            info "Verifying: $(basename "$target_file")"
            if sha256sum -c "$checksum_file" &> /dev/null; then
                success "Checksum verified: $(basename "$target_file")"
            else
                error "Checksum verification failed: $(basename "$target_file")"
                verification_failed=true
            fi
        fi
    done < <(find "$BACKUP_DIR" -name "*.sha256" -print0)

    # Verify PostgreSQL backup can be read
    if [ "$USE_POSTGRES" = "true" ]; then
        local pg_backup_file
        pg_backup_file=$(find "$BACKUP_DIR/postgresql" -name "*.backup" -type f | head -n 1)

        if [ -n "$pg_backup_file" ]; then
            info "Verifying PostgreSQL backup file..."
            export PGPASSWORD="$POSTGRES_PASSWORD"
            if pg_restore --list "$pg_backup_file" > /dev/null 2>&1; then
                success "PostgreSQL backup file is valid"
            else
                error "PostgreSQL backup file verification failed"
                verification_failed=true
            fi
            unset PGPASSWORD
        fi
    fi

    # Verify SQLite backups
    while IFS= read -r -d '' sqlite_backup; do
        info "Verifying SQLite backup: $(basename "$sqlite_backup")"

        # Decompress temporarily
        local temp_db="${sqlite_backup%.gz}"
        gunzip -c "$sqlite_backup" > "$temp_db"

        if sqlite3 "$temp_db" "PRAGMA integrity_check;" > /dev/null 2>&1; then
            success "SQLite backup verified: $(basename "$sqlite_backup")"
        else
            error "SQLite backup verification failed: $(basename "$sqlite_backup")"
            verification_failed=true
        fi

        rm -f "$temp_db"
    done < <(find "$BACKUP_DIR/sqlite" -name "*.db.gz" -print0)

    if [ "$verification_failed" = true ]; then
        error "Backup verification failed"
        return 1
    else
        success "All backup verifications passed"
        return 0
    fi
}

##############################################################################
# Cleanup Functions
##############################################################################

cleanup_old_backups() {
    info "Cleaning up backups older than $RETENTION_DAYS days..."

    local deleted_count=0

    # Find and delete old backup directories
    while IFS= read -r -d '' old_backup; do
        info "Deleting old backup: $(basename "$old_backup")"
        rm -rf "$old_backup"
        ((deleted_count++))
    done < <(find "$BACKUP_ROOT" -maxdepth 1 -type d -name "20*" -mtime +"$RETENTION_DAYS" -print0)

    # Clean up old log files
    find "$LOG_DIR" -name "backup_*.log" -mtime +"$RETENTION_DAYS" -delete

    if [ $deleted_count -gt 0 ]; then
        success "Cleaned up $deleted_count old backups"
    else
        info "No old backups to clean up"
    fi
}

##############################################################################
# Notification Functions
##############################################################################

send_notification() {
    local status=$1

    info "Sending backup notification (status: $status)..."

    # Email notification (if configured)
    # This is a placeholder - implement based on your email setup

    # Webhook notification (if configured)
    # This is a placeholder - implement based on your webhook setup

    # For now, just log
    if [ "$status" = "success" ]; then
        success "Backup completed successfully"
    else
        error "Backup completed with errors"
    fi
}

##############################################################################
# Main Backup Function
##############################################################################

run_backup() {
    info "=== Starting Agent Feed Backup System ==="
    info "Timestamp: $(date)"
    info "Backup Directory: $BACKUP_DIR"
    info "Retention Policy: $RETENTION_DAYS days"

    # Check dependencies
    check_dependencies

    # Create backup directories
    create_backup_directories

    # Perform backups
    backup_postgresql || warn "PostgreSQL backup encountered issues"
    backup_sqlite || warn "SQLite backup encountered issues"
    backup_userdata || warn "User data backup encountered issues"

    # Create metadata
    create_backup_metadata
    create_backup_manifest

    # Verify backups
    verify_backup || error "Backup verification encountered issues"

    # Cleanup old backups
    cleanup_old_backups

    # Send notification
    if [ "$BACKUP_SUCCESS" = true ] && [ ${#BACKUP_ERRORS[@]} -eq 0 ]; then
        send_notification "success"
        success "=== Backup Completed Successfully ==="
        exit 0
    else
        send_notification "failure"
        error "=== Backup Completed with Errors ==="
        error "Errors encountered:"
        for err in "${BACKUP_ERRORS[@]}"; do
            error "  - $err"
        done
        exit 1
    fi
}

##############################################################################
# Script Entry Point
##############################################################################

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --verify-only       Only verify existing backup"
        echo "  --cleanup-only      Only cleanup old backups"
        echo ""
        echo "Environment Variables:"
        echo "  BACKUP_ROOT              Backup directory (default: $PROJECT_ROOT/backups)"
        echo "  BACKUP_RETENTION_DAYS    Days to keep backups (default: 7)"
        echo "  DB_HOST                  PostgreSQL host (default: localhost)"
        echo "  DB_PORT                  PostgreSQL port (default: 5432)"
        echo "  POSTGRES_DB              Database name"
        echo "  POSTGRES_USER            Database user"
        echo "  POSTGRES_PASSWORD        Database password"
        echo "  USE_POSTGRES             Enable PostgreSQL backup (default: true)"
        exit 0
        ;;
    --verify-only)
        BACKUP_DIR="$2"
        verify_backup
        exit $?
        ;;
    --cleanup-only)
        cleanup_old_backups
        exit $?
        ;;
    *)
        run_backup
        ;;
esac
