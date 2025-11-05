#!/bin/bash

# ============================================================================
# Initialize Fresh System Script
# ============================================================================
# Purpose: Run migrations, create default user, trigger onboarding
# Usage: npm run db:init
# Date: 2025-11-03
# Agent 1: Infrastructure & Database
#
# CRITICAL: Idempotent - safe to run multiple times
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
MIGRATIONS_DIR="$PROJECT_ROOT/api-server/db/migrations"

# Database files
DB_MAIN="$DATA_DIR/agent-feed.db"

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
# Banner
# ============================================================================

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          🚀 INITIALIZING FRESH AGENT FEED SYSTEM 🚀            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================================
# Step 1: Ensure data directory exists
# ============================================================================

log_info "Step 1: Ensuring data directory exists..."
mkdir -p "$DATA_DIR"
log_success "Data directory ready: $DATA_DIR"

# ============================================================================
# Step 2: Create database if it doesn't exist
# ============================================================================

log_info "Step 2: Checking database existence..."
if [ ! -f "$DB_MAIN" ]; then
  log_info "Creating new database: $DB_MAIN"
  touch "$DB_MAIN"
  log_success "Database file created"
else
  log_success "Database already exists: $DB_MAIN"
fi

# ============================================================================
# Step 3: Run migrations in order
# ============================================================================

log_info "Step 3: Running database migrations..."

# List of migrations to run (in order)
MIGRATIONS=(
  "010-user-settings.sql"
  "011-add-onboarding-fields.sql"
  "012-onboarding-tables.sql"
)

for migration in "${MIGRATIONS[@]}"; do
  migration_file="$MIGRATIONS_DIR/$migration"

  if [ -f "$migration_file" ]; then
    log_info "Running migration: $migration"
    sqlite3 "$DB_MAIN" < "$migration_file"
    log_success "✓ Migration applied: $migration"
  else
    log_warning "Migration file not found: $migration (skipping)"
  fi
done

log_success "All migrations completed"

# ============================================================================
# Step 4: Verify table existence
# ============================================================================

log_info "Step 4: Verifying database schema..."

sqlite3 "$DB_MAIN" <<EOF
.mode column
.headers on

-- Check for required tables
SELECT
  name as table_name,
  sql as schema
FROM sqlite_master
WHERE type='table'
AND name IN ('user_settings', 'hemingway_bridges', 'agent_introductions', 'onboarding_state')
ORDER BY name;
EOF

log_success "Schema verification complete"

# ============================================================================
# Step 5: Create default user (idempotent)
# ============================================================================

log_info "Step 5: Creating default user..."

sqlite3 "$DB_MAIN" <<EOF
-- Insert or ignore default user
INSERT OR IGNORE INTO user_settings (user_id, display_name)
VALUES ('demo-user-123', 'User');

-- Insert or ignore onboarding state
INSERT OR IGNORE INTO onboarding_state (user_id, phase, step)
VALUES ('demo-user-123', 1, 'name');

-- Insert or ignore initial Hemingway bridge
INSERT OR IGNORE INTO hemingway_bridges (
  id,
  user_id,
  bridge_type,
  content,
  priority,
  active
) VALUES (
  'initial-bridge-demo-user',
  'demo-user-123',
  'question',
  'Welcome! What brings you to Agent Feed today?',
  4,
  1
);

-- Show results
SELECT 'Default user created: demo-user-123' as status;
EOF

log_success "Default user initialized"

# ============================================================================
# Step 6: Show database statistics
# ============================================================================

log_info "Step 6: Database statistics..."

sqlite3 "$DB_MAIN" <<EOF
.mode column
.headers on

SELECT 'user_settings' as table_name, COUNT(*) as record_count FROM user_settings
UNION ALL
SELECT 'hemingway_bridges', COUNT(*) FROM hemingway_bridges
UNION ALL
SELECT 'agent_introductions', COUNT(*) FROM agent_introductions
UNION ALL
SELECT 'onboarding_state', COUNT(*) FROM onboarding_state;
EOF

# ============================================================================
# Summary
# ============================================================================

echo
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              ✅ SYSTEM INITIALIZATION COMPLETE ✅               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

log_success "Database initialized: $DB_MAIN"
log_success "Default user created: demo-user-123"
log_success "Onboarding state ready"
log_success "Initial Hemingway bridge created"

echo
log_info "Next steps:"
echo "  1. Start the API server: cd api-server && npm start"
echo "  2. Start the frontend: cd frontend && npm run dev"
echo "  3. Open http://localhost:5173 to see the welcome experience"
echo

exit 0
