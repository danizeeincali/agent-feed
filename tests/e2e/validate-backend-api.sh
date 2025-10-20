#!/bin/bash

##############################################################################
# Backend API Validation Script
# Tests /api/agents/:slug endpoint for tools field presence and structure
##############################################################################

set -e

API_BASE_URL="http://localhost:3001"
OUTPUT_DIR="/workspaces/agent-feed/tests/e2e/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${OUTPUT_DIR}/backend-api-validation-${TIMESTAMP}.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test agents
AGENTS=(
  "meta-agent"
  "tech-guru"
  "code-reviewer"
  "security-expert"
  "devops-specialist"
  "data-analyst"
  "product-manager"
  "ui-ux-designer"
  "qa-tester"
  "business-analyst"
)

echo "========================================"
echo "Backend API Validation"
echo "========================================"
echo ""
echo "Testing: ${#AGENTS[@]} agents"
echo "API Base URL: $API_BASE_URL"
echo "Report: $REPORT_FILE"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Initialize report
echo "{" > "$REPORT_FILE"
echo "  \"timestamp\": \"$(date -Iseconds)\"," >> "$REPORT_FILE"
echo "  \"api_base_url\": \"$API_BASE_URL\"," >> "$REPORT_FILE"
echo "  \"total_agents_tested\": ${#AGENTS[@]}," >> "$REPORT_FILE"
echo "  \"results\": [" >> "$REPORT_FILE"

PASSED=0
FAILED=0
FIRST=true

for agent in "${AGENTS[@]}"; do
  echo "Testing agent: $agent"

  # Add comma separator for JSON array (except first item)
  if [ "$FIRST" = false ]; then
    echo "," >> "$REPORT_FILE"
  fi
  FIRST=false

  # Make API request
  response=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/agents/${agent}" || echo "000")

  # Extract body and status code
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  echo "  {" >> "$REPORT_FILE"
  echo "    \"agent\": \"$agent\"," >> "$REPORT_FILE"
  echo "    \"http_status\": $http_code," >> "$REPORT_FILE"

  if [ "$http_code" = "200" ]; then
    # Parse JSON response
    success=$(echo "$body" | jq -r '.success // false')
    has_tools=$(echo "$body" | jq 'has("data") and .data | has("tools")')
    tools_is_array=$(echo "$body" | jq '.data.tools | type == "array"')
    tools_count=$(echo "$body" | jq '.data.tools | length // 0')

    echo "    \"response_success\": $success," >> "$REPORT_FILE"
    echo "    \"has_tools_field\": $has_tools," >> "$REPORT_FILE"
    echo "    \"tools_is_array\": $tools_is_array," >> "$REPORT_FILE"
    echo "    \"tools_count\": $tools_count," >> "$REPORT_FILE"

    # Validate tools structure (if has tools)
    if [ "$tools_count" -gt 0 ]; then
      first_tool=$(echo "$body" | jq '.data.tools[0]')
      has_name=$(echo "$first_tool" | jq 'has("name")')
      has_description=$(echo "$first_tool" | jq 'has("description")')

      echo "    \"first_tool_has_name\": $has_name," >> "$REPORT_FILE"
      echo "    \"first_tool_has_description\": $has_description," >> "$REPORT_FILE"
      echo "    \"first_tool\": $first_tool," >> "$REPORT_FILE"
    else
      echo "    \"first_tool\": null," >> "$REPORT_FILE"
    fi

    # Determine pass/fail
    if [ "$has_tools" = "true" ] && [ "$tools_is_array" = "true" ]; then
      echo "    \"validation_status\": \"PASS\"" >> "$REPORT_FILE"
      echo -e "  ${GREEN}✓ PASS${NC} - $agent (${tools_count} tools)"
      ((PASSED++))
    else
      echo "    \"validation_status\": \"FAIL\"" >> "$REPORT_FILE"
      echo -e "  ${RED}✗ FAIL${NC} - $agent (missing tools field)"
      ((FAILED++))
    fi

  else
    echo "    \"validation_status\": \"ERROR\"" >> "$REPORT_FILE"
    echo -e "  ${RED}✗ ERROR${NC} - $agent (HTTP $http_code)"
    ((FAILED++))
  fi

  echo "  }" >> "$REPORT_FILE"
done

# Close JSON
echo "  ]," >> "$REPORT_FILE"
echo "  \"summary\": {" >> "$REPORT_FILE"
echo "    \"total\": ${#AGENTS[@]}," >> "$REPORT_FILE"
echo "    \"passed\": $PASSED," >> "$REPORT_FILE"
echo "    \"failed\": $FAILED," >> "$REPORT_FILE"
echo "    \"pass_rate\": \"$(awk "BEGIN {printf \"%.2f\", ($PASSED/${#AGENTS[@]})*100}")%\"" >> "$REPORT_FILE"
echo "  }" >> "$REPORT_FILE"
echo "}" >> "$REPORT_FILE"

echo ""
echo "========================================"
echo "Summary"
echo "========================================"
echo "Total Tested: ${#AGENTS[@]}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Pass Rate: $(awk "BEGIN {printf \"%.2f\", ($PASSED/${#AGENTS[@]})*100}")%"
echo ""
echo "Report saved to: $REPORT_FILE"
echo ""

# Exit with error if any tests failed
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Validation FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Validation PASSED${NC}"
  exit 0
fi
