#!/bin/bash
# Quick Connectivity Test Shell Script
# Rapid validation for immediate connectivity testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default ports
DEFAULT_PORTS=(3000 5173)
PORTS=("${@:-${DEFAULT_PORTS[@]}}")

# Helper functions
print_header() {
    echo -e "${BLUE}🚀 QUICK CONNECTIVITY TEST${NC}"
    echo "==========================================="
    echo -e "📅 $(date)"
    echo -e "🔍 Testing ports: ${PORTS[*]}"
    echo
}

print_section() {
    echo -e "${BLUE}$1${NC}"
    echo
}

test_health() {
    print_section "1️⃣ HEALTH CHECK"
    
    for port in "${PORTS[@]}"; do
        url="http://localhost:$port"
        echo -n "🔍 Testing $url... "
        
        if timeout 5s curl -s -I "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Accessible${NC}"
        else
            echo -e "${RED}❌ Failed${NC}"
            echo -e "   ${YELLOW}💡 Start server on port $port${NC}"
        fi
    done
    echo
}

test_ports() {
    print_section "2️⃣ PORT AVAILABILITY"
    
    # Check if netstat or ss is available
    if command -v netstat > /dev/null; then
        netstat_cmd="netstat -tlnp"
    elif command -v ss > /dev/null; then
        netstat_cmd="ss -tlnp"
    else
        echo -e "${RED}❌ Neither netstat nor ss found${NC}"
        return 1
    fi
    
    for port in "${PORTS[@]}"; do
        echo -n "🔍 Port $port: "
        
        if $netstat_cmd 2>/dev/null | grep -q ":$port .*LISTEN"; then
            # Check binding
            if $netstat_cmd 2>/dev/null | grep ":$port " | grep -q "0.0.0.0:$port\|:::$port"; then
                echo -e "${GREEN}✅ Listening on all interfaces${NC}"
            else
                echo -e "${YELLOW}⚠️ Listening on localhost only${NC}"
                echo -e "   ${YELLOW}💡 Configure server to bind to 0.0.0.0${NC}"
            fi
        else
            echo -e "${RED}❌ Not listening${NC}"
            echo -e "   ${YELLOW}💡 Start server on port $port${NC}"
        fi
    done
    echo
}

test_interfaces() {
    print_section "3️⃣ NETWORK INTERFACES"
    
    # Get first port for interface testing
    test_port=${PORTS[0]}
    
    # Extract IP addresses from network interfaces
    if command -v ifconfig > /dev/null; then
        ips=$(ifconfig 2>/dev/null | grep 'inet ' | awk '{print $2}' | sed 's/addr://')
    elif command -v ip > /dev/null; then
        ips=$(ip addr show 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1)
    else
        echo -e "${RED}❌ No network interface command found${NC}"
        return 1
    fi
    
    for ip in $ips; do
        echo -n "🔍 $ip: "
        
        if timeout 3s curl -s -I "http://$ip:$test_port" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Accessible${NC}"
        else
            echo -e "${RED}❌ Not accessible${NC}"
        fi
    done
    echo
}

test_codespaces() {
    if [[ "$CODESPACES" == "true" ]]; then
        print_section "4️⃣ CODESPACES ACCESS"
        
        domain=${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-"githubpreview.dev"}
        
        for port in "${PORTS[@]}"; do
            url="https://$CODESPACE_NAME-$port.$domain"
            echo -n "🔍 Testing $url... "
            
            response=$(timeout 10s curl -s -I "$url" 2>&1 || echo "failed")
            
            if echo "$response" | grep -q "HTTP.*200\|HTTP.*404"; then
                echo -e "${GREEN}✅ Public access available${NC}"
            elif echo "$response" | grep -q "403"; then
                echo -e "${YELLOW}⚠️ Private port (403)${NC}"
                echo -e "   ${YELLOW}💡 Set port visibility to public in VS Code${NC}"
            else
                echo -e "${RED}❌ Not accessible${NC}"
                echo -e "   ${YELLOW}💡 Check server status and port forwarding${NC}"
            fi
        done
        echo
    fi
}

show_summary() {
    print_section "📊 SUMMARY"
    
    echo -e "Environment: ${CODESPACES:+GitHub Codespaces}${CODESPACES:-Local}"
    echo -e "Node.js: $(node --version 2>/dev/null || echo 'Not found')"
    echo -e "Platform: $(uname -s)"
    
    echo
    echo -e "${BLUE}💡 TROUBLESHOOTING TIPS:${NC}"
    echo -e "   • Ensure servers are running on specified ports"
    echo -e "   • Check server binding (use 0.0.0.0, not 127.0.0.1)"
    echo -e "   • In Codespaces: Set port visibility to public"
    echo -e "   • Check firewall and security settings"
    echo
    echo "==========================================="
}

# Main execution
main() {
    print_header
    test_health
    test_ports
    test_interfaces
    test_codespaces
    show_summary
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi