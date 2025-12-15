#!/bin/bash

##############################################################################
# Agent Feed Backup Restoration System
# Description: Interactive restore for PostgreSQL, SQLite, and user data
# Author: Agent Feed Team
# Version: 1.0.0
##############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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
LOG_DIR="$BACKUP_ROOT/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/restore_$TIMESTAMP.log"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-avidm_dev}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
USE_POSTGRES="${USE_POSTGRES:-true}"

# Restore options
SELECTED_BACKUP=""
RESTORE_POSTGRESQL=false
RESTORE_SQLITE=false
RESTORE_USERDATA=false
DRY_RUN=false
CREATE_ROLLBACK=true

##############################################################################
# Logging Functions
##############################################################################

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    mkdir -p "$LOG_DIR"

    local color=$NC
    case $level in
        INFO)  color=$BLUE ;;
        SUCCESS) color=$GREEN ;;
        WARN)  color=$YELLOW ;;
        ERROR) color=$RED ;;
        PROMPT) color=$CYAN ;;
    esac

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
}

prompt() {
    log PROMPT "$@"
}

##############################################################################
# Utility Functions
##############################################################################

check_dependencies() {
    info "Checking dependencies..."

    local missing_deps=()

    for cmd in gzip tar sha256sum jq; do
        if ! command -v $cmd &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done

    if [ "$USE_POSTGRES" = "true" ]; then
        for cmd in pg_restore psql createdb dropdb; do
            if ! command -v $cmd &> /dev/null; then
                missing_deps+=("$cmd")
            fi
        done
    fi

    if ! command -v sqlite3 &> /dev/null; then
        missing_deps+=("sqlite3")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        error "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi

    success "All dependencies are available"
}

##############################################################################
# Backup Discovery Functions
##############################################################################

list_available_backups() {
    info "Scanning for available backups..."

    if [ ! -d "$BACKUP_ROOT" ]; then
        error "Backup directory not found: $BACKUP_ROOT"
        exit 1
    fi

    local backups=()
    while IFS= read -r -d '' backup_dir; do
        backups+=("$backup_dir")
    done < <(find "$BACKUP_ROOT" -maxdepth 1 -type d -name "20*" -print0 | sort -zr)

    if [ ${#backups[@]} -eq 0 ]; then
        error "No backups found in $BACKUP_ROOT"
        exit 1
    fi

    echo ""
    echo -e "${CYAN}=== Available Backups ===${NC}"
    echo ""

    local i=1
    for backup in "${backups[@]}"; do
        local backup_name
        backup_name=$(basename "$backup")
        local backup_date
        backup_date=$(date -d "${backup_name:0:8}" +"%Y-%m-%d" 2>/dev/null || echo "Unknown")
        local backup_time="${backup_name:9:2}:${backup_name:11:2}:${backup_name:13:2}"
        local backup_size
        backup_size=$(du -sh "$backup" 2>/dev/null | cut -f1)

        # Check if metadata exists
        local metadata_file="$backup/metadata/backup_metadata.json"
        local backup_status="Unknown"
        local has_pg="No"
        local has_sqlite="No"
        local has_userdata="No"

        if [ -f "$metadata_file" ]; then
            backup_status=$(jq -r '.backup.success' "$metadata_file" 2>/dev/null || echo "Unknown")
            has_pg=$(jq -r '.backup.components.postgresql.enabled' "$metadata_file" 2>/dev/null || echo "No")
            has_sqlite=$(jq -r '.backup.components.sqlite.enabled' "$metadata_file" 2>/dev/null || echo "No")
            has_userdata=$(jq -r '.backup.components.userdata.enabled' "$metadata_file" 2>/dev/null || echo "No")
        fi

        # Color code status
        local status_color=$GREEN
        if [ "$backup_status" = "false" ]; then
            status_color=$YELLOW
        fi

        echo -e "${CYAN}[$i]${NC} ${GREEN}$backup_date $backup_time${NC} (${YELLOW}$backup_size${NC})"
        echo "    Path: $backup"
        echo -e "    Status: ${status_color}$([ "$backup_status" = "true" ] && echo "Success" || echo "With Warnings")${NC}"
        echo "    Components: PostgreSQL=[$has_pg] SQLite=[$has_sqlite] UserData=[$has_userdata]"
        echo ""

        ((i++))
    done

    # Return backups array for selection
    printf '%s\0' "${backups[@]}"
}

select_backup() {
    # Get available backups
    local backups_array=()
    while IFS= read -r -d '' backup; do
        backups_array+=("$backup")
    done < <(list_available_backups)

    # Prompt for selection
    echo ""
    prompt "Select backup to restore (enter number, 'q' to quit):"
    read -r selection

    if [ "$selection" = "q" ] || [ "$selection" = "Q" ]; then
        info "Restore cancelled by user"
        exit 0
    fi

    # Validate selection
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backups_array[@]} ]; then
        error "Invalid selection: $selection"
        exit 1
    fi

    SELECTED_BACKUP="${backups_array[$((selection-1))]}"
    success "Selected backup: $(basename "$SELECTED_BACKUP")"
}

##############################################################################
# Backup Verification Functions
##############################################################################

verify_backup_integrity() {
    local backup_dir=$1

    info "Verifying backup integrity: $(basename "$backup_dir")"

    local verification_failed=false

    # Verify checksums
    while IFS= read -r -d '' checksum_file; do
        local target_file="${checksum_file%.sha256}"
        local relative_path="${target_file#$backup_dir/}"

        if [ -f "$target_file" ]; then
            info "Verifying: $relative_path"
            if (cd "$backup_dir" && sha256sum -c "$(basename "$checksum_file")" 2>/dev/null | grep -q "$(basename "$target_file"): OK"); then
                success "✓ $(basename "$target_file")"
            else
                error "✗ Checksum failed: $(basename "$target_file")"
                verification_failed=true
            fi
        else
            warn "Missing file for checksum: $relative_path"
        fi
    done < <(find "$backup_dir" -name "*.sha256" -print0)

    if [ "$verification_failed" = true ]; then
        error "Backup integrity verification failed"
        return 1
    else
        success "Backup integrity verified"
        return 0
    fi
}

##############################################################################
# Component Selection Functions
##############################################################################

select_restore_components() {
    local backup_dir=$1

    echo ""
    echo -e "${CYAN}=== Select Components to Restore ===${NC}"
    echo ""

    # Check what's available in the backup
    local has_postgresql=false
    local has_sqlite=false
    local has_userdata=false

    [ -d "$backup_dir/postgresql" ] && [ -n "$(ls -A "$backup_dir/postgresql" 2>/dev/null)" ] && has_postgresql=true
    [ -d "$backup_dir/sqlite" ] && [ -n "$(ls -A "$backup_dir/sqlite" 2>/dev/null)" ] && has_sqlite=true
    [ -d "$backup_dir/userdata" ] && [ -n "$(ls -A "$backup_dir/userdata" 2>/dev/null)" ] && has_userdata=true

    # PostgreSQL
    if [ "$has_postgresql" = true ]; then
        prompt "Restore PostgreSQL database? (y/N):"
        read -r response
        [ "$response" = "y" ] || [ "$response" = "Y" ] && RESTORE_POSTGRESQL=true
    else
        info "PostgreSQL backup not available"
    fi

    # SQLite
    if [ "$has_sqlite" = true ]; then
        prompt "Restore SQLite databases? (y/N):"
        read -r response
        [ "$response" = "y" ] || [ "$response" = "Y" ] && RESTORE_SQLITE=true
    else
        info "SQLite backup not available"
    fi

    # User Data
    if [ "$has_userdata" = true ]; then
        prompt "Restore user data? (y/N):"
        read -r response
        [ "$response" = "y" ] || [ "$response" = "Y" ] && RESTORE_USERDATA=true
    else
        info "User data backup not available"
    fi

    # Check if anything is selected
    if [ "$RESTORE_POSTGRESQL" = false ] && [ "$RESTORE_SQLITE" = false ] && [ "$RESTORE_USERDATA" = false ]; then
        warn "No components selected for restore"
        exit 0
    fi

    # Summary
    echo ""
    echo -e "${CYAN}=== Restore Summary ===${NC}"
    echo "PostgreSQL: $([ "$RESTORE_POSTGRESQL" = true ] && echo "${GREEN}YES${NC}" || echo "${YELLOW}NO${NC}")"
    echo "SQLite:     $([ "$RESTORE_SQLITE" = true ] && echo "${GREEN}YES${NC}" || echo "${YELLOW}NO${NC}")"
    echo "User Data:  $([ "$RESTORE_USERDATA" = true ] && echo "${GREEN}YES${NC}" || echo "${YELLOW}NO${NC}")"
    echo ""

    warn "WARNING: This will overwrite existing data!"
    prompt "Continue with restore? (yes/NO):"
    read -r confirmation

    if [ "$confirmation" != "yes" ]; then
        info "Restore cancelled by user"
        exit 0
    fi
}

##############################################################################
# Rollback Creation Functions
##############################################################################

create_rollback_backup() {
    if [ "$CREATE_ROLLBACK" = false ]; then
        return 0
    fi

    info "Creating rollback backup before restore..."

    local rollback_dir="$BACKUP_ROOT/rollback_$TIMESTAMP"
    mkdir -p "$rollback_dir"

    # Quick backup of current state
    if [ "$RESTORE_POSTGRESQL" = true ] && [ "$USE_POSTGRES" = "true" ]; then
        info "Creating PostgreSQL rollback..."
        export PGPASSWORD="$POSTGRES_PASSWORD"
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
                -F custom -Z 9 -f "$rollback_dir/postgresql_rollback.backup" 2>> "$LOG_FILE" || warn "Failed to create PostgreSQL rollback"
        unset PGPASSWORD
    fi

    if [ "$RESTORE_SQLITE" = true ]; then
        info "Creating SQLite rollback..."
        mkdir -p "$rollback_dir/sqlite"
        local sqlite_dbs=("$PROJECT_ROOT/database.db" "$PROJECT_ROOT/data/"*.db)
        for db in "${sqlite_dbs[@]}"; do
            [ -f "$db" ] && cp "$db" "$rollback_dir/sqlite/" 2>> "$LOG_FILE"
        done
    fi

    if [ "$RESTORE_USERDATA" = true ]; then
        info "Creating user data rollback..."
        mkdir -p "$rollback_dir/userdata"
        [ -d "$PROJECT_ROOT/.claude" ] && tar -czf "$rollback_dir/userdata/claude.tar.gz" -C "$PROJECT_ROOT" .claude 2>> "$LOG_FILE"
        [ -d "$PROJECT_ROOT/agents" ] && tar -czf "$rollback_dir/userdata/agents.tar.gz" -C "$PROJECT_ROOT" agents 2>> "$LOG_FILE"
    fi

    success "Rollback backup created: $rollback_dir"
    info "You can restore from this if needed using: $0 --restore-from $rollback_dir"
}

##############################################################################
# PostgreSQL Restore Functions
##############################################################################

restore_postgresql() {
    local backup_dir=$1

    info "Starting PostgreSQL restore..."

    # Find backup file
    local backup_file
    backup_file=$(find "$backup_dir/postgresql" -name "*.backup" -type f | head -n 1)

    if [ -z "$backup_file" ]; then
        error "No PostgreSQL backup file found"
        return 1
    fi

    info "Using backup file: $(basename "$backup_file")"

    export PGPASSWORD="$POSTGRES_PASSWORD"

    # Test connection
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d postgres -c "SELECT 1;" &> /dev/null; then
        error "Cannot connect to PostgreSQL server"
        unset PGPASSWORD
        return 1
    fi

    # Stop any active connections
    info "Terminating active connections to database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d postgres \
         -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();" &>> "$LOG_FILE"

    if [ "$DRY_RUN" = false ]; then
        # Drop and recreate database
        warn "Dropping existing database: $POSTGRES_DB"
        dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB" 2>> "$LOG_FILE"

        info "Creating fresh database: $POSTGRES_DB"
        createdb -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" "$POSTGRES_DB" 2>> "$LOG_FILE"

        # Restore from backup
        info "Restoring database from backup..."
        if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" \
                     -d "$POSTGRES_DB" \
                     -v \
                     "$backup_file" 2>> "$LOG_FILE"; then
            success "PostgreSQL restore completed"

            # Verify restore
            info "Verifying restored database..."
            local table_count
            table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
                               -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
            info "Restored $table_count tables"
        else
            error "PostgreSQL restore failed"
            unset PGPASSWORD
            return 1
        fi
    else
        info "[DRY RUN] Would restore PostgreSQL database"
    fi

    unset PGPASSWORD
    return 0
}

##############################################################################
# SQLite Restore Functions
##############################################################################

restore_sqlite() {
    local backup_dir=$1

    info "Starting SQLite restore..."

    local restored_count=0

    while IFS= read -r -d '' backup_file; do
        local db_name
        db_name=$(basename "$backup_file" .gz)
        # Remove timestamp from filename
        db_name=$(echo "$db_name" | sed 's/_[0-9]\{8\}_[0-9]\{6\}\.db/.db/')

        info "Restoring SQLite database: $db_name"

        # Determine target location
        local target_path
        case "$db_name" in
            database.db)
                target_path="$PROJECT_ROOT/database.db"
                ;;
            agent-pages.db)
                target_path="$PROJECT_ROOT/data/agent-pages.db"
                ;;
            token-analytics.db)
                target_path="$PROJECT_ROOT/data/token-analytics.db"
                ;;
            agent-feed.db)
                target_path="$PROJECT_ROOT/data/agent-feed.db"
                ;;
            *)
                warn "Unknown database: $db_name, skipping"
                continue
                ;;
        esac

        if [ "$DRY_RUN" = false ]; then
            # Backup existing database
            if [ -f "$target_path" ]; then
                mv "$target_path" "${target_path}.before_restore" 2>> "$LOG_FILE"
            fi

            # Decompress and restore
            mkdir -p "$(dirname "$target_path")"
            gunzip -c "$backup_file" > "$target_path"

            # Verify restored database
            if sqlite3 "$target_path" "PRAGMA integrity_check;" > /dev/null 2>&1; then
                success "SQLite database restored and verified: $db_name"
                # Remove backup
                rm -f "${target_path}.before_restore"
                ((restored_count++))
            else
                error "SQLite database verification failed: $db_name"
                # Restore original
                [ -f "${target_path}.before_restore" ] && mv "${target_path}.before_restore" "$target_path"
            fi
        else
            info "[DRY RUN] Would restore: $target_path"
            ((restored_count++))
        fi
    done < <(find "$backup_dir/sqlite" -name "*.db.gz" -print0)

    if [ $restored_count -gt 0 ]; then
        success "SQLite restore completed: $restored_count databases"
        return 0
    else
        warn "No SQLite databases were restored"
        return 1
    fi
}

##############################################################################
# User Data Restore Functions
##############################################################################

restore_userdata() {
    local backup_dir=$1

    info "Starting user data restore..."

    local restored_count=0

    while IFS= read -r -d '' backup_file; do
        local backup_name
        backup_name=$(basename "$backup_file")

        info "Restoring: $backup_name"

        if [ "$DRY_RUN" = false ]; then
            # Determine target location and restore
            case "$backup_name" in
                *claude_config*)
                    tar -xzf "$backup_file" -C "$PROJECT_ROOT" 2>> "$LOG_FILE" && ((restored_count++))
                    ;;
                *claude_memory*)
                    tar -xzf "$backup_file" -C "$PROJECT_ROOT" 2>> "$LOG_FILE" && ((restored_count++))
                    ;;
                *agents*)
                    tar -xzf "$backup_file" -C "$PROJECT_ROOT" 2>> "$LOG_FILE" && ((restored_count++))
                    ;;
                *agents.json*)
                    gunzip -c "$backup_file" > "$PROJECT_ROOT/config/agents.json" 2>> "$LOG_FILE" && ((restored_count++))
                    ;;
                *)
                    warn "Unknown user data file: $backup_name, skipping"
                    ;;
            esac
        else
            info "[DRY RUN] Would restore: $backup_name"
            ((restored_count++))
        fi
    done < <(find "$backup_dir/userdata" -type f \( -name "*.tar.gz" -o -name "*.gz" \) -print0)

    if [ $restored_count -gt 0 ]; then
        success "User data restore completed: $restored_count items"
        return 0
    else
        warn "No user data was restored"
        return 1
    fi
}

##############################################################################
# Main Restore Function
##############################################################################

run_restore() {
    info "=== Starting Agent Feed Restore System ==="
    info "Timestamp: $(date)"

    # Check dependencies
    check_dependencies

    # Select backup
    select_backup

    # Verify backup integrity
    if ! verify_backup_integrity "$SELECTED_BACKUP"; then
        error "Backup verification failed - cannot proceed with restore"
        exit 1
    fi

    # Select components to restore
    select_restore_components "$SELECTED_BACKUP"

    # Create rollback backup
    create_rollback_backup

    # Perform restore
    local restore_success=true

    if [ "$RESTORE_POSTGRESQL" = true ]; then
        restore_postgresql "$SELECTED_BACKUP" || restore_success=false
    fi

    if [ "$RESTORE_SQLITE" = true ]; then
        restore_sqlite "$SELECTED_BACKUP" || restore_success=false
    fi

    if [ "$RESTORE_USERDATA" = true ]; then
        restore_userdata "$SELECTED_BACKUP" || restore_success=false
    fi

    # Final status
    if [ "$restore_success" = true ]; then
        success "=== Restore Completed Successfully ==="
        info "Log file: $LOG_FILE"
        exit 0
    else
        error "=== Restore Completed with Errors ==="
        error "Check log file for details: $LOG_FILE"
        exit 1
    fi
}

##############################################################################
# Script Entry Point
##############################################################################

case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Interactive restore wizard for Agent Feed backups"
        echo ""
        echo "Options:"
        echo "  --help, -h              Show this help message"
        echo "  --list                  List available backups and exit"
        echo "  --verify BACKUP_DIR     Verify backup integrity only"
        echo "  --dry-run               Show what would be restored without making changes"
        echo "  --no-rollback           Skip creating rollback backup"
        echo "  --restore-from DIR      Restore from specific backup directory (non-interactive)"
        echo ""
        exit 0
        ;;
    --list)
        list_available_backups > /dev/null
        exit 0
        ;;
    --verify)
        verify_backup_integrity "$2"
        exit $?
        ;;
    --dry-run)
        DRY_RUN=true
        run_restore
        ;;
    --no-rollback)
        CREATE_ROLLBACK=false
        run_restore
        ;;
    --restore-from)
        SELECTED_BACKUP="$2"
        if [ ! -d "$SELECTED_BACKUP" ]; then
            error "Backup directory not found: $SELECTED_BACKUP"
            exit 1
        fi
        verify_backup_integrity "$SELECTED_BACKUP"
        select_restore_components "$SELECTED_BACKUP"
        create_rollback_backup
        # Run restore components...
        exit 0
        ;;
    *)
        run_restore
        ;;
esac
