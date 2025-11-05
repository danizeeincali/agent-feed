#!/bin/bash

# ============================================================================
# Reset Production Database Script
# ============================================================================
# Purpose: Backup and clear all data from production database
# Usage: npm run db:reset
# Date: 2025-11-03
# Agent 1: Infrastructure & Database
#
# CRITICAL: This script includes backup before clearing data
# Idempotent: Safe to run multiple times
# ============================================================================

set -e  # Exit on error
set -u  # Error on undefined variables

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$PROJECT_ROOT/data"
BACKUP_DIR="$PROJECT_ROOT/.archives/database-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Database files
DB_MAIN="$DATA_DIR/agent-feed.db"
DB_ANALYTICS="$DATA_DIR/token-analytics.db"
DB_PAGES="$DATA_DIR/agent-pages.db"

# ============================================================================
# Functions
# ============================================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================================
# Confirmation Prompt
# ============================================================================

echo -e "${RED}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ⚠️  DANGER ZONE ⚠️                          ║"
echo "║                                                                ║"
echo "║  This script will BACKUP and CLEAR all production data!       ║"
echo "║                                                                ║"
echo "║  What will happen:                                             ║"
echo "║  1. Backup all database files to .archives/                    ║"
echo "║  2. Clear all tables in agent-feed.db                          ║"
echo "║  3. Clear all tables in token-analytics.db                     ║"
echo "║  4. Clear all tables in agent-pages.db                         ║"
echo "║                                                                ║"
echo "║  This action is DESTRUCTIVE (but backed up)                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
echo

if [[ ! $REPLY =~ ^yes$ ]]; then
  log_warning "Database reset cancelled."
  exit 0
fi

# ============================================================================
# Backup Databases
# ============================================================================

log_info "Step 1: Backing up databases..."

# Create backup directory
mkdir -p "$BACKUP_DIR/$TIMESTAMP"

# Backup main database
if [ -f "$DB_MAIN" ]; then
  cp "$DB_MAIN" "$BACKUP_DIR/$TIMESTAMP/agent-feed.db"
  log_success "Backed up agent-feed.db"
else
  log_warning "agent-feed.db not found (may not exist yet)"
fi

# Backup analytics database
if [ -f "$DB_ANALYTICS" ]; then
  cp "$DB_ANALYTICS" "$BACKUP_DIR/$TIMESTAMP/token-analytics.db"
  log_success "Backed up token-analytics.db"
else
  log_warning "token-analytics.db not found"
fi

# Backup pages database
if [ -f "$DB_PAGES" ]; then
  cp "$DB_PAGES" "$BACKUP_DIR/$TIMESTAMP/agent-pages.db"
  log_success "Backed up agent-pages.db"
else
  log_warning "agent-pages.db not found"
fi

log_success "Backup complete: $BACKUP_DIR/$TIMESTAMP"

# ============================================================================
# Clear Database Tables
# ============================================================================

log_info "Step 2: Clearing database tables..."

# Clear main database
if [ -f "$DB_MAIN" ]; then
  sqlite3 "$DB_MAIN" <<EOF
-- Disable foreign keys temporarily
PRAGMA foreign_keys = OFF;

-- Delete all data from tables (preserving schema)
DELETE FROM posts WHERE 1=1;
DELETE FROM comments WHERE 1=1;
DELETE FROM user_settings WHERE 1=1;
DELETE FROM hemingway_bridges WHERE 1=1;
DELETE FROM agent_introductions WHERE 1=1;
DELETE FROM onboarding_state WHERE 1=1;

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;

-- Vacuum to reclaim space
VACUUM;

-- Show results
SELECT 'Cleared agent-feed.db' as status;
EOF
  log_success "Cleared agent-feed.db"
else
  log_warning "agent-feed.db not found, skipping clear"
fi

# Clear analytics database
if [ -f "$DB_ANALYTICS" ]; then
  sqlite3 "$DB_ANALYTICS" <<EOF
DELETE FROM token_usage WHERE 1=1;
DELETE FROM api_calls WHERE 1=1;
VACUUM;
SELECT 'Cleared token-analytics.db' as status;
EOF
  log_success "Cleared token-analytics.db"
else
  log_warning "token-analytics.db not found, skipping clear"
fi

# Clear pages database
if [ -f "$DB_PAGES" ]; then
  sqlite3 "$DB_PAGES" <<EOF
DELETE FROM agent_pages WHERE 1=1;
VACUUM;
SELECT 'Cleared agent-pages.db' as status;
EOF
  log_success "Cleared agent-pages.db"
else
  log_warning "agent-pages.db not found, skipping clear"
fi

# ============================================================================
# Summary
# ============================================================================

echo
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ DATABASE RESET COMPLETE                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

log_success "All databases backed up to: $BACKUP_DIR/$TIMESTAMP"
log_success "All tables cleared (schema preserved)"
log_info "Next step: Run 'npm run db:init' to initialize fresh system"

echo
echo "Backup location:"
echo "  $BACKUP_DIR/$TIMESTAMP"
echo
echo "Backup files:"
ls -lh "$BACKUP_DIR/$TIMESTAMP/" 2>/dev/null || echo "  (no backups created)"
echo

exit 0
