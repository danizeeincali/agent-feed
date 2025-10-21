#!/bin/bash

# Disk Space Cleanup Script
# Safely removes temporary files, caches, and build artifacts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Disk Space Cleanup Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check current disk usage
echo -e "${YELLOW}Current Disk Usage:${NC}"
df -h "$PROJECT_ROOT" | grep -v "Filesystem"
echo ""

BEFORE_USAGE=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $3}')

# Parse arguments
MODE="${1:-safe}"

if [ "$MODE" == "--help" ] || [ "$MODE" == "-h" ]; then
    echo "Usage: $0 [mode]"
    echo ""
    echo "Modes:"
    echo "  --safe      : Safe cleanup (default) - removes caches and build artifacts"
    echo "  --full      : Full cleanup - includes git cleanup and binary removal"
    echo "  --emergency : Emergency cleanup - removes all non-essential files"
    echo "  --help      : Show this help message"
    echo ""
    exit 0
fi

# Phase 1: Safe Immediate Cleanup
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Phase 1: Safe Cleanup (Low Risk)${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Remove duplicate node_modules in prod/
if [ -d "$PROJECT_ROOT/prod/node_modules" ]; then
    echo -e "${YELLOW}▶${NC} Removing duplicate node_modules in prod/..."
    du -sh "$PROJECT_ROOT/prod/node_modules" 2>/dev/null || echo "  (calculating size...)"
    rm -rf "$PROJECT_ROOT/prod/node_modules"
    echo -e "${GREEN}✓${NC} Removed prod/node_modules"
else
    echo -e "${BLUE}ℹ${NC} No prod/node_modules found (already clean)"
fi
echo ""

# 2. Clean npm cache
echo -e "${YELLOW}▶${NC} Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true
echo -e "${GREEN}✓${NC} npm cache cleaned"
echo ""

# 3. Remove test artifacts
echo -e "${YELLOW}▶${NC} Removing old test artifacts..."
rm -rf "$PROJECT_ROOT/playwright-report" 2>/dev/null || true
rm -rf "$PROJECT_ROOT/test-results" 2>/dev/null || true
rm -rf "$PROJECT_ROOT/tests/e2e/test-results" 2>/dev/null || true
rm -rf "$PROJECT_ROOT/tests/e2e/playwright-report" 2>/dev/null || true
rm -rf "$PROJECT_ROOT/phase2-screenshots" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Test artifacts removed"
echo ""

# 4. Clean frontend build artifacts
echo -e "${YELLOW}▶${NC} Cleaning frontend build artifacts..."
rm -rf "$PROJECT_ROOT/frontend/dist" 2>/dev/null || true
rm -rf "$PROJECT_ROOT/frontend/node_modules/.vite" 2>/dev/null || true
rm -rf "$PROJECT_ROOT/frontend/node_modules/.cache" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Frontend build artifacts cleaned"
echo ""

# 5. Truncate large logs (keep last 100 lines)
echo -e "${YELLOW}▶${NC} Truncating large log files..."
if [ -f "$PROJECT_ROOT/logs/combined.log" ]; then
    tail -100 "$PROJECT_ROOT/logs/combined.log" > "$PROJECT_ROOT/logs/combined.log.tmp"
    mv "$PROJECT_ROOT/logs/combined.log.tmp" "$PROJECT_ROOT/logs/combined.log"
    echo -e "${GREEN}✓${NC} Log files truncated"
else
    echo -e "${BLUE}ℹ${NC} No large logs found"
fi
echo ""

# Exit here if safe mode
if [ "$MODE" == "--safe" ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Phase 1 Complete (Safe Mode)${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    AFTER_USAGE=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $3}')
    RECOVERED=$((BEFORE_USAGE - AFTER_USAGE))

    echo -e "${YELLOW}Disk Usage After Cleanup:${NC}"
    df -h "$PROJECT_ROOT" | grep -v "Filesystem"
    echo ""
    echo -e "${GREEN}✓ Recovered: ~${RECOVERED}KB${NC}"
    echo ""
    exit 0
fi

# Phase 2: Git Cleanup
if [ "$MODE" == "--full" ] || [ "$MODE" == "--emergency" ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Phase 2: Git Cleanup${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    echo -e "${YELLOW}▶${NC} Running git garbage collection..."
    cd "$PROJECT_ROOT"
    git gc --aggressive --prune=now 2>/dev/null || echo -e "${RED}✗${NC} Git GC failed (may not be a git repo)"
    echo -e "${GREEN}✓${NC} Git cleanup complete"
    echo ""
fi

# Phase 3: Emergency cleanup
if [ "$MODE" == "--emergency" ]; then
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  Phase 3: Emergency Cleanup (AGGRESSIVE)${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    echo -e "${YELLOW}▶${NC} Removing ALL test artifacts..."
    rm -rf "$PROJECT_ROOT"/screenshots/* 2>/dev/null || true
    rm -rf "$PROJECT_ROOT"/tests/*/test-results 2>/dev/null || true
    rm -rf "$PROJECT_ROOT"/tests/*/videos 2>/dev/null || true
    echo -e "${GREEN}✓${NC} All test artifacts removed"
    echo ""

    echo -e "${YELLOW}▶${NC} Removing ALL logs..."
    rm -rf "$PROJECT_ROOT"/logs/*.log 2>/dev/null || true
    echo -e "${GREEN}✓${NC} All logs removed"
    echo ""

    echo -e "${YELLOW}▶${NC} Removing unused binaries..."
    find "$PROJECT_ROOT" -path "*/onnxruntime-node/bin/napi-*/win32" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$PROJECT_ROOT" -path "*/onnxruntime-node/bin/napi-*/darwin" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$PROJECT_ROOT" -path "*/onnxruntime-node/bin/napi-*/linux/arm64" -type d -exec rm -rf {} + 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Unused binaries removed"
    echo ""
fi

# Final summary
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Cleanup Complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

AFTER_USAGE=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $3}')
RECOVERED=$((BEFORE_USAGE - AFTER_USAGE))

echo -e "${YELLOW}Disk Usage After Cleanup:${NC}"
df -h "$PROJECT_ROOT" | grep -v "Filesystem"
echo ""
echo -e "${GREEN}✓ Space Recovered: ~${RECOVERED}KB (~$((RECOVERED/1024))MB)${NC}"
echo ""

# Recommendations
if [ $RECOVERED -lt 102400 ]; then
    echo -e "${YELLOW}⚠ Warning: Less than 100MB recovered${NC}"
    echo -e "${YELLOW}  Consider running with --full or --emergency mode${NC}"
    echo ""
fi

echo -e "${BLUE}To see what else is using space:${NC}"
echo -e "  du -sh $PROJECT_ROOT/* | sort -hr | head -10"
echo ""
