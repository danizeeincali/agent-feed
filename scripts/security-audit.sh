#!/bin/bash

################################################################################
# Security Audit Script - REAL Security Assessment
# This script performs comprehensive security checks including:
# - Exposed secrets detection (.env files, API keys, tokens)
# - Vulnerable dependencies scanning (npm audit)
# - File permissions validation
# - SSL/TLS configuration checks
# - Security headers validation
# - Port scanning and service detection
# - Code vulnerability scanning
# - Security report generation
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
CRITICAL_ISSUES=0
HIGH_ISSUES=0
MEDIUM_ISSUES=0
LOW_ISSUES=0
INFO_ITEMS=0

# Output file
REPORT_FILE="/workspaces/agent-feed/security-audit-report-$(date +%Y%m%d-%H%M%S).txt"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}${1}${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
    echo "✓ ${1}" >> "$REPORT_FILE"
}

print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
    echo "ℹ ${1}" >> "$REPORT_FILE"
    ((INFO_ITEMS++))
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
    echo "⚠ WARNING: ${1}" >> "$REPORT_FILE"

    if [[ $2 == "CRITICAL" ]]; then
        ((CRITICAL_ISSUES++))
    elif [[ $2 == "HIGH" ]]; then
        ((HIGH_ISSUES++))
    elif [[ $2 == "MEDIUM" ]]; then
        ((MEDIUM_ISSUES++))
    else
        ((LOW_ISSUES++))
    fi
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
    echo "✗ ERROR: ${1}" >> "$REPORT_FILE"
    ((CRITICAL_ISSUES++))
}

################################################################################
# Security Checks
################################################################################

check_exposed_secrets() {
    print_header "1. CHECKING FOR EXPOSED SECRETS"

    # Check for .env files in git
    print_info "Checking for .env files tracked in git..."
    if git ls-files | grep -q '\.env$'; then
        print_error ".env file is tracked in git! This is a critical security risk!" "CRITICAL"
        git ls-files | grep '\.env$' | while read -r file; do
            echo "  - $file" | tee -a "$REPORT_FILE"
        done
    else
        print_success ".env files are not tracked in git"
    fi

    # Check for exposed .env files
    print_info "Checking for .env files with wrong permissions..."
    find /workspaces/agent-feed -name ".env" -type f 2>/dev/null | while read -r file; do
        perms=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%A" "$file" 2>/dev/null)
        if [[ "$perms" != "600" ]] && [[ "$perms" != "400" ]]; then
            print_warning ".env file has insecure permissions: $file ($perms)" "HIGH"
        else
            print_success ".env file has secure permissions: $file ($perms)"
        fi
    done

    # Check for API keys in code
    print_info "Scanning for hardcoded API keys and secrets..."

    patterns=(
        "api[_-]?key.*=.*['\"][a-zA-Z0-9]{20,}['\"]"
        "secret.*=.*['\"][a-zA-Z0-9]{20,}['\"]"
        "password.*=.*['\"][^'\"]{8,}['\"]"
        "token.*=.*['\"][a-zA-Z0-9]{20,}['\"]"
        "aws[_-]?access[_-]?key"
        "AKIA[0-9A-Z]{16}"
        "sk_live_[0-9a-zA-Z]{24,}"
        "pk_live_[0-9a-zA-Z]{24,}"
        "Bearer [a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+"
    )

    found_secrets=0
    for pattern in "${patterns[@]}"; do
        results=$(grep -r -i -E "$pattern" /workspaces/agent-feed \
            --exclude-dir=node_modules \
            --exclude-dir=.git \
            --exclude-dir=dist \
            --exclude-dir=build \
            --exclude="*.log" \
            --exclude="security-audit.sh" \
            2>/dev/null || true)

        if [[ -n "$results" ]]; then
            print_warning "Potential hardcoded secrets found (pattern: $pattern)" "CRITICAL"
            echo "$results" | head -5 | while read -r line; do
                echo "  $line" | tee -a "$REPORT_FILE"
            done
            ((found_secrets++))
        fi
    done

    if [[ $found_secrets -eq 0 ]]; then
        print_success "No obvious hardcoded secrets found in code"
    fi

    # Check for private keys
    print_info "Checking for exposed private keys..."
    if find /workspaces/agent-feed -type f \( -name "*.pem" -o -name "*.key" -o -name "id_rsa" \) 2>/dev/null | grep -q .; then
        print_warning "Private key files found - ensure these are not in version control!" "HIGH"
        find /workspaces/agent-feed -type f \( -name "*.pem" -o -name "*.key" -o -name "id_rsa" \) 2>/dev/null | while read -r file; do
            echo "  - $file" | tee -a "$REPORT_FILE"
        done
    else
        print_success "No private key files found"
    fi
}

check_dependencies() {
    print_header "2. CHECKING FOR VULNERABLE DEPENDENCIES"

    # Run npm audit in api-server
    if [[ -d "/workspaces/agent-feed/api-server" ]]; then
        print_info "Running npm audit on api-server..."
        cd /workspaces/agent-feed/api-server

        audit_output=$(npm audit --json 2>/dev/null || true)

        if [[ -n "$audit_output" ]]; then
            critical=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
            high=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")
            moderate=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.moderate // 0' 2>/dev/null || echo "0")
            low=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.low // 0' 2>/dev/null || echo "0")

            echo "npm audit results:" | tee -a "$REPORT_FILE"
            echo "  Critical: $critical" | tee -a "$REPORT_FILE"
            echo "  High: $high" | tee -a "$REPORT_FILE"
            echo "  Moderate: $moderate" | tee -a "$REPORT_FILE"
            echo "  Low: $low" | tee -a "$REPORT_FILE"

            if [[ "$critical" -gt 0 ]]; then
                print_error "Found $critical critical vulnerabilities in dependencies!" "CRITICAL"
                ((CRITICAL_ISSUES+=critical))
            fi

            if [[ "$high" -gt 0 ]]; then
                print_warning "Found $high high severity vulnerabilities in dependencies" "HIGH"
                ((HIGH_ISSUES+=high))
            fi

            if [[ "$moderate" -gt 0 ]]; then
                print_warning "Found $moderate moderate severity vulnerabilities in dependencies" "MEDIUM"
                ((MEDIUM_ISSUES+=moderate))
            fi

            if [[ "$critical" -eq 0 ]] && [[ "$high" -eq 0 ]]; then
                print_success "No critical or high severity vulnerabilities found"
            fi

            # Show fixable issues
            npm audit fix --dry-run >> "$REPORT_FILE" 2>&1 || true
        fi
    fi

    # Check for outdated packages
    print_info "Checking for outdated packages..."
    cd /workspaces/agent-feed/api-server
    outdated=$(npm outdated --json 2>/dev/null || echo "{}")
    if [[ "$outdated" != "{}" ]] && [[ -n "$outdated" ]]; then
        print_warning "Some packages are outdated" "LOW"
        echo "$outdated" | jq -r 'to_entries[] | "  \(.key): \(.value.current) → \(.value.latest)"' 2>/dev/null | tee -a "$REPORT_FILE" || true
    else
        print_success "All packages are up to date"
    fi
}

check_file_permissions() {
    print_header "3. CHECKING FILE PERMISSIONS"

    # Check for world-writable files
    print_info "Checking for world-writable files..."
    world_writable=$(find /workspaces/agent-feed -type f -perm -002 2>/dev/null | grep -v node_modules | head -10 || true)

    if [[ -n "$world_writable" ]]; then
        print_warning "World-writable files found (security risk):" "MEDIUM"
        echo "$world_writable" | while read -r file; do
            echo "  - $file" | tee -a "$REPORT_FILE"
        done
    else
        print_success "No world-writable files found"
    fi

    # Check database file permissions
    print_info "Checking database file permissions..."
    db_files=$(find /workspaces/agent-feed -name "*.db" -type f 2>/dev/null || true)

    if [[ -n "$db_files" ]]; then
        echo "$db_files" | while read -r file; do
            perms=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%A" "$file" 2>/dev/null)
            if [[ "$perms" =~ ^6[0-7][0-7]$ ]] || [[ "$perms" =~ ^4[0-7][0-7]$ ]]; then
                print_success "Database file has appropriate permissions: $file ($perms)"
            else
                print_warning "Database file has potentially insecure permissions: $file ($perms)" "MEDIUM"
            fi
        done
    fi

    # Check script permissions
    print_info "Checking for executable scripts..."
    scripts=$(find /workspaces/agent-feed -name "*.sh" -type f 2>/dev/null | grep -v node_modules || true)

    if [[ -n "$scripts" ]]; then
        echo "$scripts" | while read -r file; do
            if [[ -x "$file" ]]; then
                print_info "Executable script: $file"
            else
                print_warning "Script not executable: $file" "LOW"
            fi
        done
    fi
}

check_ssl_tls() {
    print_header "4. CHECKING SSL/TLS CONFIGURATION"

    # Check if server is running
    print_info "Checking if API server is running..."

    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
        print_info "API server is running on port 3001"

        # Check if HTTPS is configured
        if curl -k -s https://localhost:3001 >/dev/null 2>&1; then
            print_success "HTTPS is configured"

            # Check TLS version (if openssl is available)
            if command -v openssl &> /dev/null; then
                print_info "Checking TLS version..."
                tls_version=$(echo | openssl s_client -connect localhost:3001 2>/dev/null | grep "Protocol" || true)
                echo "  $tls_version" | tee -a "$REPORT_FILE"
            fi
        else
            print_warning "HTTPS is not configured - using HTTP only" "HIGH"
            print_info "Consider implementing HTTPS for production use"
        fi
    else
        print_info "API server is not running (cannot check SSL/TLS)"
    fi

    # Check for SSL certificate files
    print_info "Checking for SSL certificate files..."
    certs=$(find /workspaces/agent-feed -type f \( -name "*.crt" -o -name "*.cert" -o -name "*.pem" \) 2>/dev/null | grep -v node_modules || true)

    if [[ -n "$certs" ]]; then
        print_info "SSL certificate files found:"
        echo "$certs" | while read -r file; do
            echo "  - $file" | tee -a "$REPORT_FILE"

            # Check certificate expiry if openssl is available
            if command -v openssl &> /dev/null && [[ -f "$file" ]]; then
                expiry=$(openssl x509 -in "$file" -noout -enddate 2>/dev/null || true)
                if [[ -n "$expiry" ]]; then
                    echo "    Expiry: $expiry" | tee -a "$REPORT_FILE"
                fi
            fi
        done
    else
        print_info "No SSL certificate files found"
    fi
}

check_security_headers() {
    print_header "5. CHECKING SECURITY HEADERS"

    print_info "Checking HTTP security headers..."

    if ! curl -s http://localhost:3001 >/dev/null 2>&1; then
        print_info "API server not running - cannot check headers"
        print_info "Start the server with: cd /workspaces/agent-feed/api-server && npm start"
        return
    fi

    # Get headers
    headers=$(curl -s -D - http://localhost:3001 -o /dev/null 2>/dev/null || true)

    # Check for security headers
    required_headers=(
        "Strict-Transport-Security"
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Content-Security-Policy"
        "Referrer-Policy"
    )

    for header in "${required_headers[@]}"; do
        if echo "$headers" | grep -qi "^${header}:"; then
            value=$(echo "$headers" | grep -i "^${header}:" | head -1)
            print_success "Header present: $value"
        else
            print_warning "Missing security header: $header" "MEDIUM"
        fi
    done

    # Check for headers that should NOT be present
    if echo "$headers" | grep -qi "^X-Powered-By:"; then
        print_warning "X-Powered-By header is exposed (information disclosure)" "LOW"
    else
        print_success "X-Powered-By header is hidden"
    fi

    if echo "$headers" | grep -qi "^Server:"; then
        server_header=$(echo "$headers" | grep -i "^Server:" | head -1)
        print_info "Server header: $server_header"
        print_info "Consider hiding or genericizing the Server header"
    fi
}

check_open_ports() {
    print_header "6. CHECKING OPEN PORTS AND SERVICES"

    print_info "Scanning for open ports..."

    # Check common ports
    ports=(3000 3001 5173 5432 3306 27017 6379 8080 8000)

    for port in "${ports[@]}"; do
        if nc -z localhost "$port" 2>/dev/null; then
            print_info "Port $port is open"

            # Try to identify service
            if [[ "$port" == "3000" ]] || [[ "$port" == "3001" ]] || [[ "$port" == "5173" ]] || [[ "$port" == "8080" ]] || [[ "$port" == "8000" ]]; then
                print_info "  → Likely HTTP/API service"
            elif [[ "$port" == "5432" ]]; then
                print_warning "  → PostgreSQL database port is exposed" "MEDIUM"
            elif [[ "$port" == "3306" ]]; then
                print_warning "  → MySQL database port is exposed" "MEDIUM"
            elif [[ "$port" == "27017" ]]; then
                print_warning "  → MongoDB database port is exposed" "MEDIUM"
            elif [[ "$port" == "6379" ]]; then
                print_warning "  → Redis port is exposed" "MEDIUM"
            fi
        fi
    done
}

check_code_vulnerabilities() {
    print_header "7. CHECKING FOR CODE VULNERABILITIES"

    # Check for eval usage
    print_info "Checking for dangerous eval() usage..."
    eval_usage=$(grep -r "eval(" /workspaces/agent-feed \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=dist \
        --include="*.js" \
        --include="*.ts" \
        2>/dev/null || true)

    if [[ -n "$eval_usage" ]]; then
        print_warning "Found eval() usage - potential security risk!" "HIGH"
        echo "$eval_usage" | head -5 | while read -r line; do
            echo "  $line" | tee -a "$REPORT_FILE"
        done
    else
        print_success "No eval() usage found"
    fi

    # Check for SQL query concatenation
    print_info "Checking for SQL injection vulnerabilities..."
    sql_concat=$(grep -r -E "query.*\+|execute.*\+|sql.*\+" /workspaces/agent-feed \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=dist \
        --include="*.js" \
        --include="*.ts" \
        2>/dev/null | grep -v "// " | grep -v "/\*" || true)

    if [[ -n "$sql_concat" ]]; then
        print_warning "Potential SQL injection vulnerability (query concatenation)" "HIGH"
        echo "$sql_concat" | head -5 | while read -r line; do
            echo "  $line" | tee -a "$REPORT_FILE"
        done
    else
        print_success "No obvious SQL concatenation vulnerabilities found"
    fi

    # Check for unsafe innerHTML usage
    print_info "Checking for XSS vulnerabilities (innerHTML)..."
    innerhtml_usage=$(grep -r "innerHTML" /workspaces/agent-feed \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=dist \
        --include="*.js" \
        --include="*.ts" \
        --include="*.jsx" \
        --include="*.tsx" \
        2>/dev/null || true)

    if [[ -n "$innerhtml_usage" ]]; then
        print_warning "Found innerHTML usage - potential XSS risk!" "MEDIUM"
        count=$(echo "$innerhtml_usage" | wc -l)
        echo "  Found $count occurrences" | tee -a "$REPORT_FILE"
    else
        print_success "No innerHTML usage found"
    fi

    # Check for console.log in production code
    print_info "Checking for console.log statements..."
    console_logs=$(grep -r "console\.log\|console\.error\|console\.warn" /workspaces/agent-feed \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=dist \
        --include="*.js" \
        --include="*.ts" \
        2>/dev/null | wc -l || echo "0")

    if [[ "$console_logs" -gt 50 ]]; then
        print_warning "Found $console_logs console statements - may leak sensitive info" "LOW"
    else
        print_info "Found $console_logs console statements"
    fi
}

generate_recommendations() {
    print_header "8. SECURITY RECOMMENDATIONS"

    echo -e "\n${CYAN}Security Hardening Recommendations:${NC}\n" | tee -a "$REPORT_FILE"

    recommendations=(
        "1. Enable HTTPS/TLS for all production traffic"
        "2. Implement proper secrets management (e.g., AWS Secrets Manager, HashiCorp Vault)"
        "3. Use environment variables for all sensitive configuration"
        "4. Regularly update dependencies (run 'npm audit fix')"
        "5. Implement proper logging and monitoring"
        "6. Use parameterized queries for all database operations"
        "7. Implement Content Security Policy (CSP) headers"
        "8. Enable HTTP Strict Transport Security (HSTS)"
        "9. Implement rate limiting on all API endpoints"
        "10. Use secure session management with httpOnly cookies"
        "11. Implement proper CORS policies"
        "12. Regular security audits and penetration testing"
        "13. Implement Web Application Firewall (WAF)"
        "14. Enable database encryption at rest"
        "15. Implement proper backup and disaster recovery"
        "16. Use least privilege principle for all accounts"
        "17. Enable multi-factor authentication (MFA)"
        "18. Implement security headers (X-Frame-Options, X-Content-Type-Options, etc.)"
        "19. Regular security training for development team"
        "20. Implement automated security scanning in CI/CD pipeline"
    )

    for rec in "${recommendations[@]}"; do
        echo "  $rec" | tee -a "$REPORT_FILE"
    done
}

generate_summary() {
    print_header "SECURITY AUDIT SUMMARY"

    echo -e "\n${CYAN}Issues Found:${NC}" | tee -a "$REPORT_FILE"
    echo -e "  ${RED}Critical: $CRITICAL_ISSUES${NC}" | tee -a "$REPORT_FILE"
    echo -e "  ${RED}High: $HIGH_ISSUES${NC}" | tee -a "$REPORT_FILE"
    echo -e "  ${YELLOW}Medium: $MEDIUM_ISSUES${NC}" | tee -a "$REPORT_FILE"
    echo -e "  ${YELLOW}Low: $LOW_ISSUES${NC}" | tee -a "$REPORT_FILE"
    echo -e "  ${BLUE}Info: $INFO_ITEMS${NC}\n" | tee -a "$REPORT_FILE"

    total_issues=$((CRITICAL_ISSUES + HIGH_ISSUES + MEDIUM_ISSUES + LOW_ISSUES))

    if [[ $CRITICAL_ISSUES -gt 0 ]]; then
        echo -e "${RED}⚠️  CRITICAL ISSUES FOUND! Immediate action required!${NC}" | tee -a "$REPORT_FILE"
    elif [[ $HIGH_ISSUES -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  High severity issues found. Please address soon.${NC}" | tee -a "$REPORT_FILE"
    elif [[ $total_issues -eq 0 ]]; then
        echo -e "${GREEN}✓ No major security issues found!${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "${BLUE}ℹ Some minor issues found. Review recommended.${NC}" | tee -a "$REPORT_FILE"
    fi

    echo -e "\n${CYAN}Full report saved to: $REPORT_FILE${NC}\n"
}

################################################################################
# Main Execution
################################################################################

main() {
    clear
    echo -e "${MAGENTA}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║           SECURITY AUDIT SCRIPT - REAL ASSESSMENT         ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"

    echo "Security Audit Report - $(date)" > "$REPORT_FILE"
    echo "======================================" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"

    check_exposed_secrets
    check_dependencies
    check_file_permissions
    check_ssl_tls
    check_security_headers
    check_open_ports
    check_code_vulnerabilities
    generate_recommendations
    generate_summary
}

# Run the audit
main "$@"
