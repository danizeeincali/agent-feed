#!/bin/bash
# AVI CLI Startup Script
# Production-grade wrapper with strict validation and error handling

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Script configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="/workspaces/agent-feed"
readonly CLI_ENTRY="src/index.ts"
readonly LOG_DIR="${PROJECT_ROOT}/logs"

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Enforce working directory
enforce_working_directory() {
    log_info "Enforcing working directory: ${PROJECT_ROOT}"

    if [ ! -d "${PROJECT_ROOT}" ]; then
        log_error "Project root directory does not exist: ${PROJECT_ROOT}"
        exit 1
    fi

    cd "${PROJECT_ROOT}" || {
        log_error "Failed to change directory to: ${PROJECT_ROOT}"
        exit 1
    }

    log_info "Current directory: $(pwd)"
}

# Validate project structure
validate_project_structure() {
    log_info "Validating project structure..."

    local required_dirs=("src" "node_modules")
    local required_files=("package.json" "${CLI_ENTRY}")

    for dir in "${required_dirs[@]}"; do
        if [ ! -d "${dir}" ]; then
            log_error "Required directory not found: ${dir}"
            log_error "Please ensure you are in the correct project directory"
            exit 1
        fi
    done

    for file in "${required_files[@]}"; do
        if [ ! -f "${file}" ]; then
            log_error "Required file not found: ${file}"
            exit 1
        fi
    done

    log_info "Project structure validated successfully"
}

# Validate environment
validate_environment() {
    log_info "Validating environment..."

    # Check for .env file
    if [ ! -f ".env" ]; then
        log_warn ".env file not found"
        log_warn "CLI may fail if required environment variables are missing"
    else
        log_info ".env file found"
    fi

    # Check for tsx command
    if ! command -v tsx &> /dev/null; then
        log_error "tsx command not found"
        log_error "Please install tsx: npm install -g tsx"
        exit 1
    fi

    log_info "Environment validated successfully"
}

# Setup logging
setup_logging() {
    if [ ! -d "${LOG_DIR}" ]; then
        log_info "Creating log directory: ${LOG_DIR}"
        mkdir -p "${LOG_DIR}" || {
            log_warn "Failed to create log directory, continuing without file logging"
            return
        }
    fi

    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local log_file="${LOG_DIR}/avi-cli-${timestamp}.log"

    log_info "Log file: ${log_file}"
    echo "AVI CLI started at $(date)" > "${log_file}"
    echo "Working directory: $(pwd)" >> "${log_file}"
    echo "Arguments: $*" >> "${log_file}"
    echo "---" >> "${log_file}"
}

# Main execution
main() {
    log_info "Starting AVI CLI..."
    log_info "Timestamp: $(date)"

    # Run validation steps
    enforce_working_directory
    validate_project_structure
    validate_environment
    setup_logging

    log_info "All validations passed"
    log_info "Executing: tsx ${CLI_ENTRY} $*"
    log_info "---"

    # Execute CLI with exec to replace shell process
    # Pass all arguments to the CLI
    exec tsx "${CLI_ENTRY}" "$@"
}

# Trap errors
trap 'log_error "Script failed on line $LINENO"' ERR

# Run main function
main "$@"
