#!/bin/bash

# CI/CD Runner for Dynamic Agent Pages E2E Tests
# Optimized for continuous integration environments

set -e

# Colors for CI output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# CI Configuration
CONFIG_FILE="tests/e2e/dynamic-agent-pages/playwright.config.ts"
REPORT_DIR="tests/e2e/dynamic-agent-pages/reports"
TIMEOUT="90000"  # Increased timeout for CI
RETRIES="3"      # More retries for CI
WORKERS="2"      # Conservative worker count for CI

# Environment detection
IS_CI="${CI:-false}"
IS_GITHUB_ACTIONS="${GITHUB_ACTIONS:-false}"
IS_DOCKER="${DOCKER:-false}"

print_ci_status() {
    echo -e "${BLUE}[CI-INFO]${NC} $1"
}

print_ci_success() {
    echo -e "${GREEN}[CI-SUCCESS]${NC} $1"
}

print_ci_warning() {
    echo -e "${YELLOW}[CI-WARNING]${NC} $1"
}

print_ci_error() {
    echo -e "${RED}[CI-ERROR]${NC} $1"
}

# Function to setup CI environment
setup_ci_environment() {
    print_ci_status "Setting up CI environment..."
    
    # Set CI-specific environment variables
    export NODE_ENV="test"
    export CI="true"
    export PLAYWRIGHT_BROWSERS_PATH="${HOME}/.cache/ms-playwright"
    
    # Create necessary directories
    mkdir -p "$REPORT_DIR"
    mkdir -p "test-results"
    mkdir -p "screenshots"
    mkdir -p "videos"
    mkdir -p "traces"
    
    # GitHub Actions specific setup
    if [[ "$IS_GITHUB_ACTIONS" == "true" ]]; then
        print_ci_status "Configuring for GitHub Actions..."
        
        # Set GitHub Actions specific variables
        export PLAYWRIGHT_HTML_REPORT="$REPORT_DIR/html"
        export PLAYWRIGHT_JUNIT_REPORT="$REPORT_DIR/junit.xml"
        
        # Add GitHub Actions annotations
        echo "::group::Environment Setup"
        echo "Node Version: $(node --version)"
        echo "NPM Version: $(npm --version)"
        echo "Working Directory: $(pwd)"
        echo "::endgroup::"
    fi
    
    print_ci_success "CI environment configured"
}

# Function to install dependencies
install_dependencies() {
    print_ci_status "Installing dependencies..."
    
    # Install npm dependencies
    if [[ -f "package-lock.json" ]]; then
        npm ci --silent
    else
        npm install --silent
    fi
    
    # Install Playwright browsers
    print_ci_status "Installing Playwright browsers..."
    npx playwright install --with-deps
    
    print_ci_success "Dependencies installed"
}

# Function to wait for services
wait_for_services() {
    print_ci_status "Waiting for services to be ready..."
    
    # Wait for frontend
    local frontend_ready=false
    for i in {1..60}; do  # Wait up to 60 seconds
        if curl -s -f http://localhost:5173 >/dev/null 2>&1; then
            frontend_ready=true
            break
        fi
        print_ci_status "Waiting for frontend... ($i/60)"
        sleep 1
    done
    
    if [[ "$frontend_ready" == "false" ]]; then
        print_ci_error "Frontend service not ready after 60 seconds"
        return 1
    fi
    
    # Wait for backend
    local backend_ready=false
    for i in {1..30}; do  # Wait up to 30 seconds
        if curl -s -f http://localhost:3000/api/health >/dev/null 2>&1; then
            backend_ready=true
            break
        fi
        print_ci_status "Waiting for backend... ($i/30)"
        sleep 1
    done
    
    if [[ "$backend_ready" == "false" ]]; then
        print_ci_warning "Backend service not ready - tests may use fallback data"
    fi
    
    print_ci_success "Services are ready"
}

# Function to run test suite
run_test_suite() {
    print_ci_status "Running Dynamic Agent Pages E2E test suite..."
    
    local test_cmd="npx playwright test"
    test_cmd="$test_cmd --config=$CONFIG_FILE"
    test_cmd="$test_cmd --timeout=$TIMEOUT"
    test_cmd="$test_cmd --retries=$RETRIES"
    test_cmd="$test_cmd --workers=$WORKERS"
    test_cmd="$test_cmd --reporter=html,json,junit"
    
    # GitHub Actions specific reporter
    if [[ "$IS_GITHUB_ACTIONS" == "true" ]]; then
        test_cmd="$test_cmd --reporter=github,html,json,junit"
    fi
    
    print_ci_status "Executing: $test_cmd"
    
    if eval $test_cmd; then
        print_ci_success "All tests passed!"
        return 0
    else
        print_ci_error "Some tests failed"
        return 1
    fi
}

# Function to collect test artifacts
collect_artifacts() {
    print_ci_status "Collecting test artifacts..."
    
    # Create artifacts directory
    mkdir -p "ci-artifacts"
    
    # Copy test results
    if [[ -d "test-results" ]]; then
        cp -r test-results ci-artifacts/
        print_ci_status "Test results collected"
    fi
    
    # Copy reports
    if [[ -d "$REPORT_DIR" ]]; then
        cp -r "$REPORT_DIR" ci-artifacts/
        print_ci_status "Test reports collected"
    fi
    
    # Copy screenshots
    if [[ -d "screenshots" ]]; then
        cp -r screenshots ci-artifacts/
        print_ci_status "Screenshots collected"
    fi
    
    # Copy videos
    if [[ -d "videos" ]]; then
        cp -r videos ci-artifacts/
        print_ci_status "Videos collected"
    fi
    
    # Copy traces
    if [[ -d "traces" ]]; then
        cp -r traces ci-artifacts/
        print_ci_status "Traces collected"
    fi
    
    # Generate summary report
    generate_ci_summary
    
    print_ci_success "Artifacts collected in ci-artifacts/"
}

# Function to generate CI summary
generate_ci_summary() {
    local summary_file="ci-artifacts/CI-SUMMARY.md"
    
    cat > "$summary_file" << EOF
# Dynamic Agent Pages E2E Test Results

**Date:** $(date)
**Environment:** ${CI_ENVIRONMENT:-Unknown}
**Node Version:** $(node --version)
**Playwright Version:** $(npx playwright --version)

## Test Configuration

- **Timeout:** ${TIMEOUT}ms
- **Retries:** ${RETRIES}
- **Workers:** ${WORKERS}
- **Config:** ${CONFIG_FILE}

## Test Results

EOF

    # Add test results if available
    if [[ -f "$REPORT_DIR/results.json" ]]; then
        echo "Results parsed from JSON report:" >> "$summary_file"
        
        # Extract key metrics from JSON report
        node -e "
            const fs = require('fs');
            try {
                const results = JSON.parse(fs.readFileSync('$REPORT_DIR/results.json', 'utf8'));
                const stats = results.stats || {};
                console.log(\`- **Total Tests:** \${stats.expected || 0}\`);
                console.log(\`- **Passed:** \${stats.passed || 0}\`);
                console.log(\`- **Failed:** \${stats.failed || 0}\`);
                console.log(\`- **Skipped:** \${stats.skipped || 0}\`);
                console.log(\`- **Duration:** \${Math.round((stats.duration || 0) / 1000)}s\`);
            } catch (e) {
                console.log('- Results data not available');
            }
        " >> "$summary_file"
    fi
    
    echo "" >> "$summary_file"
    echo "## Artifacts" >> "$summary_file"
    echo "" >> "$summary_file"
    echo "- HTML Report: \`ci-artifacts/reports/html/index.html\`" >> "$summary_file"
    echo "- JUnit Report: \`ci-artifacts/reports/junit.xml\`" >> "$summary_file"
    echo "- JSON Report: \`ci-artifacts/reports/results.json\`" >> "$summary_file"
    echo "- Screenshots: \`ci-artifacts/screenshots/\`" >> "$summary_file"
    echo "- Videos: \`ci-artifacts/videos/\`" >> "$summary_file"
    echo "- Traces: \`ci-artifacts/traces/\`" >> "$summary_file"
    
    print_ci_status "CI summary generated: $summary_file"
}

# Function to handle GitHub Actions annotations
add_github_annotations() {
    if [[ "$IS_GITHUB_ACTIONS" == "true" && -f "$REPORT_DIR/results.json" ]]; then
        print_ci_status "Adding GitHub Actions annotations..."
        
        # Parse test results and add annotations
        node -e "
            const fs = require('fs');
            try {
                const results = JSON.parse(fs.readFileSync('$REPORT_DIR/results.json', 'utf8'));
                
                // Add annotations for failed tests
                if (results.suites) {
                    results.suites.forEach(suite => {
                        if (suite.specs) {
                            suite.specs.forEach(spec => {
                                if (!spec.ok && spec.tests) {
                                    spec.tests.forEach(test => {
                                        if (test.results) {
                                            test.results.forEach(result => {
                                                if (result.status === 'failed' && result.error) {
                                                    console.log(\`::error file=\${suite.file},line=1,title=Test Failed::\${test.title} - \${result.error.message}\`);
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            } catch (e) {
                console.log('::warning::Could not parse test results for annotations');
            }
        "
    fi
}

# Main CI execution function
main() {
    print_ci_status "Starting CI execution for Dynamic Agent Pages E2E tests"
    
    # Setup
    setup_ci_environment
    install_dependencies
    
    # Wait for services (assuming they're started by CI pipeline)
    wait_for_services
    
    # Run tests
    local test_result=0
    if ! run_test_suite; then
        test_result=1
    fi
    
    # Collect artifacts regardless of test outcome
    collect_artifacts
    
    # Add GitHub Actions annotations
    add_github_annotations
    
    # Final status
    if [[ $test_result -eq 0 ]]; then
        print_ci_success "CI execution completed successfully"
    else
        print_ci_error "CI execution completed with failures"
    fi
    
    exit $test_result
}

# Execute main function
main "$@"