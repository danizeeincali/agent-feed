#!/bin/bash

###############################################################################
# AviDM Fix Screenshot Validation - Quick Start Script
#
# This script automates the entire screenshot validation process:
# 1. Checks prerequisites
# 2. Starts required services
# 3. Runs screenshot capture
# 4. Opens results in browser
#
# Usage:
#   ./scripts/run-screenshot-validation.sh
#
# Or with options:
#   ./scripts/run-screenshot-validation.sh --headless
#   ./scripts/run-screenshot-validation.sh --no-open
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/workspaces/agent-feed"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
SCREENSHOTS_DIR="$PROJECT_ROOT/screenshots/avidm-fix"
SCRIPT_PATH="$PROJECT_ROOT/scripts/capture-avidm-fix-screenshots.ts"
HTML_OUTPUT="$SCREENSHOTS_DIR/comparison.html"

API_PORT=3001
FRONTEND_PORT=5173
API_URL="http://localhost:$API_PORT"
FRONTEND_URL="http://localhost:$FRONTEND_PORT"

HEADLESS=false
OPEN_BROWSER=true

# Parse arguments
for arg in "$@"; do
  case $arg in
    --headless)
      HEADLESS=true
      shift
      ;;
    --no-open)
      OPEN_BROWSER=false
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --headless    Run browser in headless mode (no UI)"
      echo "  --no-open     Don't open results in browser"
      echo "  --help        Show this help message"
      exit 0
      ;;
  esac
done

###############################################################################
# Helper Functions
###############################################################################

print_header() {
  echo -e "\n${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${PURPLE}  $1${NC}"
  echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_step() {
  echo -e "${CYAN}▶${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

check_command() {
  if command -v "$1" &> /dev/null; then
    print_success "$1 is installed"
    return 0
  else
    print_error "$1 is not installed"
    return 1
  fi
}

check_port() {
  local port=$1
  local name=$2

  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_success "$name is running on port $port"
    return 0
  else
    print_error "$name is not running on port $port"
    return 1
  fi
}

wait_for_service() {
  local url=$1
  local name=$2
  local max_attempts=30
  local attempt=1

  print_step "Waiting for $name to be ready..."

  while [ $attempt -le $max_attempts ]; do
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|404\|302"; then
      print_success "$name is ready!"
      return 0
    fi

    echo -n "."
    sleep 1
    attempt=$((attempt + 1))
  done

  print_error "$name failed to start after $max_attempts seconds"
  return 1
}

###############################################################################
# Main Script
###############################################################################

print_header "🎯 AviDM Fix Screenshot Validation"

# Step 1: Check Prerequisites
print_header "1️⃣  Checking Prerequisites"

PREREQS_OK=true

check_command "node" || PREREQS_OK=false
check_command "npm" || PREREQS_OK=false
check_command "npx" || PREREQS_OK=false
check_command "curl" || PREREQS_OK=false

if [ "$PREREQS_OK" = false ]; then
  print_error "Missing required commands. Please install them and try again."
  exit 1
fi

# Check if script exists
if [ ! -f "$SCRIPT_PATH" ]; then
  print_error "Screenshot script not found at: $SCRIPT_PATH"
  exit 1
fi
print_success "Screenshot script found"

# Step 2: Check Services
print_header "2️⃣  Checking Services"

API_RUNNING=false
FRONTEND_RUNNING=false

check_port $API_PORT "API Server" && API_RUNNING=true
check_port $FRONTEND_PORT "Frontend" && FRONTEND_RUNNING=true

# Start services if needed
if [ "$API_RUNNING" = false ] || [ "$FRONTEND_RUNNING" = false ]; then
  print_warning "Some services are not running. Starting them now..."

  if [ "$API_RUNNING" = false ]; then
    print_step "Starting API server on port $API_PORT..."
    cd "$PROJECT_ROOT"
    npm run dev:api > /dev/null 2>&1 &
    API_PID=$!
    print_success "API server started (PID: $API_PID)"

    wait_for_service "$API_URL/api/agents" "API Server" || {
      print_error "API server failed to start"
      kill $API_PID 2>/dev/null || true
      exit 1
    }
  fi

  if [ "$FRONTEND_RUNNING" = false ]; then
    print_step "Starting frontend on port $FRONTEND_PORT..."
    cd "$FRONTEND_DIR"
    npm run dev > /dev/null 2>&1 &
    FRONTEND_PID=$!
    print_success "Frontend started (PID: $FRONTEND_PID)"

    wait_for_service "$FRONTEND_URL" "Frontend" || {
      print_error "Frontend failed to start"
      kill $FRONTEND_PID 2>/dev/null || true
      [ -n "$API_PID" ] && kill $API_PID 2>/dev/null || true
      exit 1
    }
  fi
fi

# Step 3: Check Environment
print_header "3️⃣  Checking Environment"

if [ -f "$PROJECT_ROOT/.env" ]; then
  if grep -q "ANTHROPIC_API_KEY" "$PROJECT_ROOT/.env"; then
    print_success "Anthropic API key configured"
  else
    print_warning "Anthropic API key not found in .env (Claude responses may fail)"
  fi
else
  print_warning ".env file not found (Claude responses may fail)"
fi

# Step 4: Clean Previous Results
print_header "4️⃣  Preparing Output Directory"

if [ -d "$SCREENSHOTS_DIR" ]; then
  print_step "Removing previous screenshots..."
  rm -rf "$SCREENSHOTS_DIR"
  print_success "Previous screenshots removed"
fi

mkdir -p "$SCREENSHOTS_DIR"
print_success "Output directory ready: $SCREENSHOTS_DIR"

# Step 5: Install Playwright if needed
print_header "5️⃣  Checking Playwright"

if ! npx playwright --version &> /dev/null; then
  print_step "Installing Playwright browsers..."
  npx playwright install chromium
  print_success "Playwright installed"
else
  print_success "Playwright is ready"
fi

# Step 6: Run Screenshot Capture
print_header "6️⃣  Capturing Screenshots"

print_step "Running screenshot validation script..."
echo ""

cd "$PROJECT_ROOT"

if [ "$HEADLESS" = true ]; then
  print_warning "Running in headless mode (no browser UI)"
  # Modify script to run headless
  npx tsx "$SCRIPT_PATH" --headless
else
  npx tsx "$SCRIPT_PATH"
fi

echo ""

# Step 7: Verify Results
print_header "7️⃣  Verifying Results"

SCREENSHOT_COUNT=$(find "$SCREENSHOTS_DIR" -name "*.png" 2>/dev/null | wc -l)
print_success "Captured $SCREENSHOT_COUNT screenshots"

if [ -f "$HTML_OUTPUT" ]; then
  print_success "Comparison HTML generated"
else
  print_error "Comparison HTML not found"
  exit 1
fi

if [ -f "$SCREENSHOTS_DIR/metadata.json" ]; then
  print_success "Metadata JSON generated"

  # Check for successful API calls
  SUCCESS_COUNT=$(jq -r '.summary.successfulRequests // 0' "$SCREENSHOTS_DIR/metadata.json")
  FAILED_COUNT=$(jq -r '.summary.failedRequests // 0' "$SCREENSHOTS_DIR/metadata.json")
  ERROR_COUNT=$(jq -r '.summary.totalErrors // 0' "$SCREENSHOTS_DIR/metadata.json")

  echo ""
  print_step "Validation Summary:"
  echo -e "  ${GREEN}✓${NC} Successful API requests: $SUCCESS_COUNT"
  echo -e "  ${RED}✗${NC} Failed API requests: $FAILED_COUNT"
  echo -e "  ${RED}⚠${NC} Console errors: $ERROR_COUNT"
  echo ""

  if [ "$SUCCESS_COUNT" -gt 0 ] && [ "$FAILED_COUNT" -eq 0 ]; then
    print_success "All API requests successful! (200 OK)"
  else
    print_warning "Some API requests failed. Check comparison.html for details."
  fi
else
  print_warning "Metadata JSON not found"
fi

# Step 8: Display Results
print_header "8️⃣  Results"

echo -e "${GREEN}✨ Screenshot validation complete! ✨${NC}\n"

echo "📁 Output Location:"
echo "   $SCREENSHOTS_DIR"
echo ""

echo "📸 Screenshots:"
ls -lh "$SCREENSHOTS_DIR"/*.png 2>/dev/null | awk '{print "   " $9}' || echo "   No screenshots found"
echo ""

echo "📄 Files:"
echo "   - comparison.html  (Visual comparison page)"
echo "   - metadata.json    (Technical details)"
echo "   - *.png           (Individual screenshots)"
echo ""

# Step 9: Open Browser
if [ "$OPEN_BROWSER" = true ] && [ -f "$HTML_OUTPUT" ]; then
  print_header "9️⃣  Opening Results"

  print_step "Opening comparison.html in browser..."

  # Try different browser open commands
  if command -v xdg-open &> /dev/null; then
    xdg-open "$HTML_OUTPUT" &
  elif command -v open &> /dev/null; then
    open "$HTML_OUTPUT" &
  elif command -v start &> /dev/null; then
    start "$HTML_OUTPUT" &
  else
    print_warning "Could not automatically open browser"
    echo "Please open manually: $HTML_OUTPUT"
  fi

  print_success "Browser opened (or use manual link above)"
fi

# Step 10: Cleanup Instructions
print_header "✅ Complete"

echo -e "${GREEN}Screenshot validation completed successfully!${NC}\n"

echo "Next steps:"
echo "  1. Review comparison.html in browser"
echo "  2. Check that all screenshots show expected states"
echo "  3. Verify network tab shows 200 OK responses"
echo "  4. Confirm no console errors"
echo ""

echo "To view results again:"
echo "  open $HTML_OUTPUT"
echo ""

echo "To run validation again:"
echo "  $0"
echo ""

# Cleanup PIDs if we started services
if [ -n "$API_PID" ] || [ -n "$FRONTEND_PID" ]; then
  echo -e "${YELLOW}Note: Services were started by this script${NC}"
  echo "To stop them:"
  [ -n "$API_PID" ] && echo "  kill $API_PID  # API Server"
  [ -n "$FRONTEND_PID" ] && echo "  kill $FRONTEND_PID  # Frontend"
  echo ""
fi

print_success "All done! 🎉"

exit 0
