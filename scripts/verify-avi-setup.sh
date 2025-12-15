#!/bin/bash
# AVI Setup Verification Script
# Verifies working directory, environment variables, agent registration, and PostgreSQL connection

set -euo pipefail

# Colors for output
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Configuration
readonly PROJECT_ROOT="/workspaces/agent-feed"
readonly EXPECTED_AGENT_COUNT=9  # Minimum expected agents (23 when all migrated)

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

# Logging functions
log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Test 1: Working Directory
test_working_directory() {
    log_section "Test 1: Working Directory"

    if [ "$(pwd)" != "$PROJECT_ROOT" ]; then
        log_warn "Current directory is not project root"
        log_info "Current: $(pwd)"
        log_info "Expected: $PROJECT_ROOT"
        log_info "Changing to project root..."
        cd "$PROJECT_ROOT" || {
            log_fail "Cannot change to project root: $PROJECT_ROOT"
            return 1
        }
    fi

    if [ ! -d "$PROJECT_ROOT" ]; then
        log_fail "Project root does not exist: $PROJECT_ROOT"
        return 1
    fi

    if [ ! -d "$PROJECT_ROOT/src" ]; then
        log_fail "Source directory not found: $PROJECT_ROOT/src"
        return 1
    fi

    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        log_fail "package.json not found: $PROJECT_ROOT/package.json"
        return 1
    fi

    log_pass "Working directory is correct: $(pwd)"
    log_info "Project structure verified"
}

# Test 2: Environment Variables
test_environment_variables() {
    log_section "Test 2: Environment Variables"

    # Load .env file if present
    if [ -f "$PROJECT_ROOT/.env" ]; then
        log_info "Loading environment from .env file"
        set -a
        source "$PROJECT_ROOT/.env"
        set +a
    else
        log_warn ".env file not found"
    fi

    local required_vars=(
        "WORKSPACE_ROOT"
        "PROJECT_ROOT"
        "AGENT_TEMPLATES_DIR"
        "DATABASE_URL"
        "POSTGRES_DB"
    )

    local missing_vars=0

    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            log_fail "Required environment variable not set: $var"
            ((missing_vars++))
        else
            log_info "$var = ${!var}"
        fi
    done

    if [ $missing_vars -eq 0 ]; then
        log_pass "All required environment variables are set"
    else
        log_fail "$missing_vars required environment variable(s) missing"
        return 1
    fi

    # Verify paths exist
    if [ -n "${WORKSPACE_ROOT:-}" ] && [ ! -d "${WORKSPACE_ROOT}" ]; then
        log_warn "WORKSPACE_ROOT directory does not exist: ${WORKSPACE_ROOT}"
    fi

    if [ -n "${AGENT_TEMPLATES_DIR:-}" ] && [ ! -d "${AGENT_TEMPLATES_DIR}" ]; then
        log_warn "AGENT_TEMPLATES_DIR directory does not exist: ${AGENT_TEMPLATES_DIR}"
    fi
}

# Test 3: Agent Registration
test_agent_registration() {
    log_section "Test 3: Agent Registration"

    local agent_dir="${AGENT_TEMPLATES_DIR:-$PROJECT_ROOT/config/system/agent-templates}"

    if [ ! -d "$agent_dir" ]; then
        log_fail "Agent templates directory not found: $agent_dir"
        return 1
    fi

    # Count JSON files
    local agent_count=$(find "$agent_dir" -name "*.json" -type f 2>/dev/null | wc -l)

    log_info "Agent templates directory: $agent_dir"
    log_info "Agent templates found: $agent_count"

    if [ "$agent_count" -lt "$EXPECTED_AGENT_COUNT" ]; then
        log_warn "Agent count ($agent_count) is below expected minimum ($EXPECTED_AGENT_COUNT)"
        log_info "This may indicate incomplete agent migration"
    fi

    if [ "$agent_count" -eq 0 ]; then
        log_fail "No agent templates found"
        return 1
    fi

    # List agents
    log_info "Agent templates:"
    find "$agent_dir" -name "*.json" -type f -exec basename {} .json \; 2>/dev/null | sort | while read agent; do
        echo "  - $agent"
    done

    log_pass "Agent registration verified: $agent_count agent(s)"
}

# Test 4: PostgreSQL Connection
test_postgresql_connection() {
    log_section "Test 4: PostgreSQL Connection"

    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        log_warn "psql command not found - skipping database connection test"
        log_info "PostgreSQL client tools may not be installed"
        return 0
    fi

    # Parse DATABASE_URL or use individual components
    local db_name="${POSTGRES_DB:-avidm_dev}"
    local db_user="${POSTGRES_USER:-postgres}"
    local db_host="${DB_HOST:-localhost}"
    local db_port="${DB_PORT:-5432}"

    log_info "Database: $db_name"
    log_info "User: $db_user"
    log_info "Host: $db_host"
    log_info "Port: $db_port"

    # Test connection (with timeout)
    if timeout 5 psql -U "$db_user" -h "$db_host" -p "$db_port" -d "$db_name" -c "SELECT 1;" &> /dev/null; then
        log_pass "PostgreSQL connection successful"

        # Check agent count in database
        local db_agent_count=$(psql -U "$db_user" -h "$db_host" -p "$db_port" -d "$db_name" -t -c "SELECT COUNT(*) FROM system_agent_templates;" 2>/dev/null | xargs)

        if [ -n "$db_agent_count" ] && [ "$db_agent_count" -gt 0 ]; then
            log_info "Agents in database: $db_agent_count"

            if [ "$db_agent_count" -lt "$EXPECTED_AGENT_COUNT" ]; then
                log_warn "Database has fewer agents ($db_agent_count) than expected ($EXPECTED_AGENT_COUNT)"
                log_info "You may need to run: npm run db:seed"
            else
                log_pass "Database agent count verified: $db_agent_count agent(s)"
            fi
        else
            log_warn "system_agent_templates table may be empty"
            log_info "You may need to run: npm run db:seed"
        fi
    else
        log_fail "PostgreSQL connection failed"
        log_info "Possible causes:"
        log_info "  - PostgreSQL is not running"
        log_info "  - Incorrect connection credentials"
        log_info "  - Database does not exist"
        log_info "  - Network/firewall issues"
        return 1
    fi
}

# Test 5: Wrapper Scripts
test_wrapper_scripts() {
    log_section "Test 5: Wrapper Scripts"

    local scripts=(
        "$PROJECT_ROOT/scripts/run-avi.sh"
        "$PROJECT_ROOT/scripts/run-avi-cli.sh"
    )

    for script in "${scripts[@]}"; do
        if [ ! -f "$script" ]; then
            log_fail "Script not found: $script"
            continue
        fi

        if [ ! -x "$script" ]; then
            log_warn "Script not executable: $script"
            log_info "Fix with: chmod +x $script"
        else
            log_pass "Script exists and is executable: $(basename $script)"
        fi
    done
}

# Test 6: Required Dependencies
test_dependencies() {
    log_section "Test 6: Required Dependencies"

    # Check for tsx
    if command -v tsx &> /dev/null; then
        log_pass "tsx is installed: $(tsx --version 2>&1 | head -1)"
    else
        log_fail "tsx is not installed"
        log_info "Install with: npm install -g tsx"
    fi

    # Check for node
    if command -v node &> /dev/null; then
        log_pass "Node.js is installed: $(node --version)"
    else
        log_fail "Node.js is not installed"
    fi

    # Check for npm
    if command -v npm &> /dev/null; then
        log_pass "npm is installed: $(npm --version)"
    else
        log_fail "npm is not installed"
    fi

    # Check node_modules
    if [ -d "$PROJECT_ROOT/node_modules" ]; then
        log_pass "node_modules directory exists"
    else
        log_warn "node_modules directory not found"
        log_info "Install with: npm install"
    fi
}

# Main execution
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   AVI Setup Verification Script       ║${NC}"
    echo -e "${BLUE}║   Comprehensive System Health Check   ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Project Root:${NC} $PROJECT_ROOT"
    echo -e "${BLUE}Timestamp:${NC} $(date)"
    echo ""

    # Change to project root
    cd "$PROJECT_ROOT" 2>/dev/null || {
        echo -e "${RED}CRITICAL: Cannot access project root: $PROJECT_ROOT${NC}"
        exit 1
    }

    # Run all tests
    test_working_directory || true
    test_environment_variables || true
    test_agent_registration || true
    test_postgresql_connection || true
    test_wrapper_scripts || true
    test_dependencies || true

    # Print summary
    log_section "Test Summary"

    echo ""
    echo -e "Tests Passed:  ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed:  ${RED}$TESTS_FAILED${NC}"
    echo -e "Warnings:      ${YELLOW}$WARNINGS${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║     ALL CHECKS PASSED ✓                ║${NC}"
        echo -e "${GREEN}║     System is ready for operation     ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
        echo ""

        if [ $WARNINGS -gt 0 ]; then
            echo -e "${YELLOW}Note: $WARNINGS warning(s) detected. Review output above.${NC}"
            echo ""
        fi

        exit 0
    else
        echo -e "${RED}╔════════════════════════════════════════╗${NC}"
        echo -e "${RED}║     CHECKS FAILED ✗                    ║${NC}"
        echo -e "${RED}║     Please review failures above       ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}Troubleshooting:${NC}"
        echo -e "  1. Review the AVI-WORKING-DIRECTORY-FIX.md documentation"
        echo -e "  2. Check the troubleshooting section for specific errors"
        echo -e "  3. Ensure all environment variables are set in .env"
        echo -e "  4. Verify PostgreSQL is running and accessible"
        echo ""
        exit 1
    fi
}

# Trap errors
trap 'echo -e "${RED}Script failed on line $LINENO${NC}" >&2' ERR

# Run main function
main "$@"
