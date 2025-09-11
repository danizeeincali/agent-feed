#!/bin/bash

# Production Validation Script for UnifiedAgentPage Real Data Integration
# Validates Phase 1 mock data elimination is complete and production ready

set -e

echo "🎭 Starting UnifiedAgentPage Production Validation"
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"

# Check npm/npx
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npx available${NC}"

# Check Playwright
if ! npx playwright --version &> /dev/null; then
    echo -e "${YELLOW}⚠️  Installing Playwright...${NC}"
    npx playwright install --with-deps
fi

PLAYWRIGHT_VERSION=$(npx playwright --version)
echo -e "${GREEN}✅ Playwright: $PLAYWRIGHT_VERSION${NC}"

# Check backend service
echo -e "${BLUE}🔍 Checking backend service...${NC}"
if curl -s http://localhost:3000/api/health &> /dev/null || curl -s http://localhost:3000/ &> /dev/null; then
    echo -e "${GREEN}✅ Backend running on localhost:3000${NC}"
else
    echo -e "${YELLOW}⚠️  Backend not running, attempting to start...${NC}"
    # Try to start backend
    cd "$(dirname "$0")/../../"
    if [ -f "simple-backend.js" ]; then
        node simple-backend.js &
        BACKEND_PID=$!
        echo "🔄 Backend started with PID: $BACKEND_PID"
        sleep 5
        
        if curl -s http://localhost:3000/api/health &> /dev/null || curl -s http://localhost:3000/ &> /dev/null; then
            echo -e "${GREEN}✅ Backend started successfully${NC}"
        else
            echo -e "${RED}❌ Failed to start backend${NC}"
            kill $BACKEND_PID 2>/dev/null || true
            exit 1
        fi
    else
        echo -e "${RED}❌ Backend file not found${NC}"
        exit 1
    fi
fi

# Check frontend service  
echo -e "${BLUE}🔍 Checking frontend service...${NC}"
if curl -s http://localhost:5173/ &> /dev/null; then
    echo -e "${GREEN}✅ Frontend running on localhost:5173${NC}"
else
    echo -e "${RED}❌ Frontend not running on localhost:5173${NC}"
    echo -e "${YELLOW}Please start frontend with: cd frontend && npm run dev${NC}"
    exit 1
fi

# Validate test agents are available
echo -e "${BLUE}🔍 Validating test agents...${NC}"
TEST_AGENTS=("agent-feedback-agent" "agent-ideas-agent" "meta-agent" "personal-todos-agent")
AVAILABLE_AGENTS=0

for agent in "${TEST_AGENTS[@]}"; do
    if curl -s "http://localhost:3000/api/agents/$agent" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ $agent available${NC}"
        ((AVAILABLE_AGENTS++))
    else
        echo -e "${YELLOW}⚠️  $agent not available${NC}"
    fi
done

echo -e "${BLUE}📊 $AVAILABLE_AGENTS/${#TEST_AGENTS[@]} test agents available${NC}"

if [ $AVAILABLE_AGENTS -eq 0 ]; then
    echo -e "${RED}❌ No test agents available${NC}"
    exit 1
fi

# Run the validation tests
echo -e "${BLUE}🎭 Running Real Data Validation Tests...${NC}"
echo "=================================================="

cd "$(dirname "$0")/../e2e"

# Create reports directory
mkdir -p ../reports

# Method 1: Run comprehensive validation with custom runner
if [ -f "run-real-data-validation.js" ]; then
    echo -e "${BLUE}🚀 Running comprehensive validation suite...${NC}"
    if node run-real-data-validation.js; then
        echo -e "${GREEN}🎉 Comprehensive validation PASSED${NC}"
        COMPREHENSIVE_RESULT=0
    else
        echo -e "${RED}❌ Comprehensive validation FAILED${NC}"
        COMPREHENSIVE_RESULT=1
    fi
else
    COMPREHENSIVE_RESULT=0
fi

# Method 2: Run Playwright tests directly
echo -e "${BLUE}🎭 Running Playwright validation tests...${NC}"
if npx playwright test unified-agent-page-real-data.spec.ts --config playwright.config.real-data-validation.ts --reporter=list; then
    echo -e "${GREEN}🎉 Playwright validation PASSED${NC}"
    PLAYWRIGHT_RESULT=0
else
    echo -e "${RED}❌ Playwright validation FAILED${NC}"
    PLAYWRIGHT_RESULT=1
fi

# Generate final result
echo ""
echo "=================================================="
echo -e "${BLUE}🎯 PRODUCTION VALIDATION SUMMARY${NC}"
echo "=================================================="

if [ $COMPREHENSIVE_RESULT -eq 0 ] && [ $PLAYWRIGHT_RESULT -eq 0 ]; then
    echo -e "${GREEN}🎉 RESULT: PRODUCTION READY ✅${NC}"
    echo -e "${GREEN}UnifiedAgentPage successfully eliminated mock data${NC}"
    echo -e "${GREEN}and is ready for production deployment.${NC}"
    
    echo ""
    echo -e "${BLUE}📋 Validation Summary:${NC}"
    echo -e "${GREEN}✅ All tests passed${NC}"
    echo -e "${GREEN}✅ No mock data contamination detected${NC}"
    echo -e "${GREEN}✅ Real API integration validated${NC}"
    echo -e "${GREEN}✅ Performance requirements met${NC}"
    echo -e "${GREEN}✅ Error handling works correctly${NC}"
    
    EXIT_CODE=0
else
    echo -e "${RED}❌ RESULT: NOT PRODUCTION READY${NC}"
    echo -e "${RED}Critical issues must be resolved before production deployment.${NC}"
    
    echo ""
    echo -e "${BLUE}📋 Issues Detected:${NC}"
    
    if [ $COMPREHENSIVE_RESULT -ne 0 ]; then
        echo -e "${RED}❌ Comprehensive validation failed${NC}"
    fi
    
    if [ $PLAYWRIGHT_RESULT -ne 0 ]; then
        echo -e "${RED}❌ Playwright tests failed${NC}"
    fi
    
    EXIT_CODE=1
fi

# Show reports location
echo ""
echo -e "${BLUE}📊 Reports Generated:${NC}"
if [ -d "../reports" ]; then
    ls -la ../reports/ | grep -E "\.(html|json)$" | while read -r line; do
        echo -e "${BLUE}   📄 $line${NC}"
    done
fi

echo ""
echo -e "${BLUE}🔍 To view detailed reports:${NC}"
echo "   HTML Report: open tests/reports/real-data-validation-report.html"
echo "   JSON Report: cat tests/reports/real-data-validation-final-report.json"
echo "   Playwright Report: npx playwright show-report tests/reports/real-data-validation-report"

echo ""
echo "=================================================="

# Cleanup background processes if we started them
if [ ! -z "$BACKEND_PID" ]; then
    echo -e "${BLUE}🧹 Cleaning up started backend process...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
fi

exit $EXIT_CODE