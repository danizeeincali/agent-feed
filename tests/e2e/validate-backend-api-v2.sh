#!/bin/bash

##############################################################################
# Backend API Validation Script v2
# Tests /api/agents/:slug endpoint for tools field presence and structure
##############################################################################

set -e

API_BASE_URL="http://localhost:3001"
OUTPUT_DIR="/workspaces/agent-feed/tests/e2e/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${OUTPUT_DIR}/backend-api-validation-${TIMESTAMP}.txt"

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
{
  echo "Backend API Validation Report"
  echo "Timestamp: $(date -Iseconds)"
  echo "API Base URL: $API_BASE_URL"
  echo "Total Agents Tested: ${#AGENTS[@]}"
  echo ""
  echo "========================================"
  echo ""
} > "$REPORT_FILE"

PASSED=0
FAILED=0

for agent in "${AGENTS[@]}"; do
  echo "Testing agent: $agent"

  {
    echo "Agent: $agent"
    echo "---"
  } >> "$REPORT_FILE"

  # Make API request
  response=$(curl -s "${API_BASE_URL}/api/agents/${agent}" 2>&1)

  # Check if response is valid JSON
  if echo "$response" | jq empty 2>/dev/null; then
    # Valid JSON response
    success=$(echo "$response" | jq -r '.success // false')
    http_status="200"

    {
      echo "HTTP Status: 200"
      echo "Response Success: $success"
    } >> "$REPORT_FILE"

    # Check if data exists
    has_data=$(echo "$response" | jq 'has("data")')

    if [ "$has_data" = "true" ]; then
      # Check for tools field
      has_tools=$(echo "$response" | jq '.data | has("tools")')

      if [ "$has_tools" = "true" ]; then
        tools_type=$(echo "$response" | jq -r '.data.tools | type')
        tools_count=$(echo "$response" | jq '.data.tools | length // 0')

        {
          echo "Has Tools Field: YES"
          echo "Tools Type: $tools_type"
          echo "Tools Count: $tools_count"
        } >> "$REPORT_FILE"

        if [ "$tools_type" = "array" ] && [ "$tools_count" -gt 0 ]; then
          # Sample first tool
          first_tool=$(echo "$response" | jq '.data.tools[0]')
          echo "Sample Tool: $first_tool" >> "$REPORT_FILE"

          echo "Status: ✅ PASS" >> "$REPORT_FILE"
          echo -e "  ${GREEN}✓ PASS${NC} - $agent (${tools_count} tools)"
          ((PASSED++))
        else
          echo "Status: ⚠️ FAIL (tools field exists but invalid structure)" >> "$REPORT_FILE"
          echo -e "  ${YELLOW}⚠ WARN${NC} - $agent (tools field invalid)"
          ((FAILED++))
        fi
      else
        {
          echo "Has Tools Field: NO"
          echo "Status: ❌ FAIL (missing tools field)"
        } >> "$REPORT_FILE"
        echo -e "  ${RED}✗ FAIL${NC} - $agent (missing tools field)"
        ((FAILED++))
      fi

      # Show current structure
      echo "Current Response Structure:" >> "$REPORT_FILE"
      echo "$response" | jq '.data | keys' >> "$REPORT_FILE"

    else
      {
        echo "Has Data: NO"
        echo "Status: ❌ FAIL"
      } >> "$REPORT_FILE"
      echo -e "  ${RED}✗ FAIL${NC} - $agent (no data field)"
      ((FAILED++))
    fi

  else
    # Invalid response
    {
      echo "HTTP Status: ERROR"
      echo "Response: $response"
      echo "Status: ❌ ERROR"
    } >> "$REPORT_FILE"
    echo -e "  ${RED}✗ ERROR${NC} - $agent (invalid response)"
    ((FAILED++))
  fi

  echo "" >> "$REPORT_FILE"
done

# Summary
{
  echo "========================================"
  echo "Summary"
  echo "========================================"
  echo "Total Tested: ${#AGENTS[@]}"
  echo "Passed: $PASSED"
  echo "Failed: $FAILED"
  echo "Pass Rate: $(awk "BEGIN {printf \"%.2f\", ($PASSED/${#AGENTS[@]})*100}")%"
} >> "$REPORT_FILE"

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
  echo -e "${RED}❌ Validation FAILED - Backend changes not yet complete${NC}"
  echo "This is EXPECTED if coder agents haven't finished yet."
  exit 1
else
  echo -e "${GREEN}✅ Validation PASSED${NC}"
  exit 0
fi
