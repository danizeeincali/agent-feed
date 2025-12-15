#!/bin/bash
# Comprehensive Network Diagnostics Runner
# Executes all diagnostic tools and generates consolidated report

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default ports
DEFAULT_PORTS=(3000 5173)
PORTS=("${@:-${DEFAULT_PORTS[@]}}")

echo -e "${BLUE}🔬 COMPREHENSIVE NETWORK DIAGNOSTICS SUITE${NC}"
echo "==========================================="
echo -e "📅 $(date)"
echo -e "🔍 Testing ports: ${PORTS[*]}"
echo -e "🌍 Environment: ${CODESPACES:+GitHub Codespaces}${CODESPACES:-Local}"
echo

# 1. Quick connectivity test
echo -e "${BLUE}1️⃣ QUICK CONNECTIVITY TEST${NC}"
echo "Running shell-based connectivity checks..."
./scripts/test-connectivity.sh "${PORTS[@]}"
echo

# 2. Comprehensive network diagnostics
echo -e "${BLUE}2️⃣ COMPREHENSIVE NETWORK ANALYSIS${NC}"
echo "Running detailed network diagnostics..."
node scripts/network-diagnostics.js "${PORTS[@]}"
echo

# 3. Browser-based testing (if Playwright is available)
echo -e "${BLUE}3️⃣ BROWSER CONNECTIVITY TESTS${NC}"
if npm list playwright > /dev/null 2>&1; then
    echo "Running Playwright browser connectivity tests..."
    node scripts/playwright-connectivity-tests.js
else
    echo -e "${YELLOW}⚠️  Playwright not installed - skipping browser tests${NC}"
    echo "   Install with: npm install -D playwright"
fi
echo

# 4. Generate consolidated report
echo -e "${BLUE}4️⃣ CONSOLIDATED REPORT${NC}"
timestamp=$(date -u +"%Y%m%d-%H%M%S")
report_dir="diagnostic-reports-$timestamp"
mkdir -p "$report_dir"

# Copy all generated reports
echo "Collecting diagnostic reports..."
for report in *-report.json connectivity-screenshots/; do
    if [[ -e "$report" ]]; then
        cp -r "$report" "$report_dir/" 2>/dev/null || true
    fi
done

# Generate summary
cat > "$report_dir/diagnostic-summary.txt" << EOF
COMPREHENSIVE NETWORK DIAGNOSTICS SUMMARY
==========================================
Timestamp: $(date)
Environment: ${CODESPACES:+GitHub Codespaces}${CODESPACES:-Local}
Tested Ports: ${PORTS[*]}

DIAGNOSTIC TOOLS RUN:
✅ Quick Connectivity Test (Shell)
✅ Network Interface Analysis (Node.js)
$(npm list playwright > /dev/null 2>&1 && echo "✅ Browser Compatibility Tests (Playwright)" || echo "⚠️  Browser Tests Skipped (Playwright not installed)")

REPORTS GENERATED:
$(ls -la "$report_dir"/*.json 2>/dev/null | wc -l) JSON reports
$(ls -la "$report_dir"/connectivity-screenshots/*.png 2>/dev/null | wc -l) Screenshots

RECOMMENDATIONS:
- Review individual JSON reports for detailed findings
- Check connectivity-screenshots/ for failure debugging
- Follow troubleshooting guide in docs/codespaces-connectivity-guide.md

For immediate issues, run:
  ./scripts/test-connectivity.sh
  
For detailed analysis, run:
  node scripts/network-diagnostics.js
EOF

echo -e "📄 All reports consolidated in: ${GREEN}$report_dir${NC}"
echo -e "📋 Summary available at: ${GREEN}$report_dir/diagnostic-summary.txt${NC}"

# Display final status
if [[ -f "network-diagnostics-report.json" ]]; then
    issues=$(grep -c "❌\|⚠️" "$report_dir/diagnostic-summary.txt" 2>/dev/null || echo "0")
    if [[ "$issues" -eq 0 ]]; then
        echo -e "\n🎉 ${GREEN}All diagnostics completed successfully!${NC}"
        exit 0
    else
        echo -e "\n⚠️  ${YELLOW}$issues issues found - review reports for details${NC}"
        exit 1
    fi
else
    echo -e "\n❌ ${RED}Diagnostic suite incomplete - check for errors${NC}"
    exit 1
fi