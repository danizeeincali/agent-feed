#!/bin/bash

echo "=================================================="
echo "  Phase 4: Protection Mechanisms - Validation"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
failed=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ PASS${NC}: File exists: $1"
        ((passed++))
    else
        echo -e "${RED}❌ FAIL${NC}: File missing: $1"
        ((failed++))
    fi
}

# Function to check line count
check_lines() {
    local file=$1
    local expected=$2
    local actual=$(wc -l < "$file" 2>/dev/null || echo 0)
    
    if [ "$actual" -ge "$expected" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $file has $actual lines (expected ≥$expected)"
        ((passed++))
    else
        echo -e "${RED}❌ FAIL${NC}: $file has $actual lines (expected ≥$expected)"
        ((failed++))
    fi
}

echo "Checking Phase 4 Implementation Files..."
echo ""

# Check security errors
check_file "src/config/errors/security-errors.ts"
check_lines "src/config/errors/security-errors.ts" 140

# Check privilege checker
check_file "src/config/utils/privilege-checker.ts"
check_lines "src/config/utils/privilege-checker.ts" 200

# Check protected config manager
check_file "src/config/managers/protected-config-manager.ts"
check_lines "src/config/managers/protected-config-manager.ts" 350

# Check tampering detector
check_file "src/config/managers/tampering-detector.ts"
check_lines "src/config/managers/tampering-detector.ts" 300

# Check index
check_file "src/config/index.ts"

# Check validation test
check_file "src/config/managers/validation-test.ts"
check_lines "src/config/managers/validation-test.ts" 400

# Check README
check_file "src/config/managers/README.md"

# Check deliverables
check_file "PHASE-4-DELIVERABLES.md"

echo ""
echo "=================================================="
echo "  Validation Summary"
echo "=================================================="
echo -e "${GREEN}Passed: $passed${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✅ ALL VALIDATIONS PASSED${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run validation tests:"
    echo "     npx tsx src/config/managers/validation-test.ts"
    echo ""
    echo "  2. Review deliverables:"
    echo "     cat PHASE-4-DELIVERABLES.md"
    echo ""
    echo "  3. Review README:"
    echo "     cat src/config/managers/README.md"
    exit 0
else
    echo -e "${RED}❌ SOME VALIDATIONS FAILED${NC}"
    exit 1
fi
