#!/bin/bash
set -e

echo "================================"
echo "Agent Migration Test Verification"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check files exist
echo "Checking files..."
FILES=(
  "src/database/migrate-agent-markdown.ts"
  "tests/phase1/agent-migration.test.ts"
  "tests/phase1/fixtures/valid-agent.md"
  "tests/phase1/fixtures/invalid-agent-missing-name.md"
  "tests/phase1/fixtures/invalid-agent-missing-description.md"
  "tests/phase1/fixtures/duplicate-agent.md"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file (MISSING)"
    exit 1
  fi
done
echo ""

# Count agent files
echo "Counting production agent files..."
AGENT_COUNT=$(ls -1 agents/*.md 2>/dev/null | wc -l)
echo -e "${GREEN}✓${NC} Found $AGENT_COUNT agent markdown files"
echo ""

# Check dependencies
echo "Checking dependencies..."
DEPS=("gray-matter" "pg" "jest" "@jest/globals")
for dep in "${DEPS[@]}"; do
  if grep -q "\"$dep\"" package.json; then
    echo -e "${GREEN}✓${NC} $dep installed"
  else
    echo -e "${RED}✗${NC} $dep missing from package.json"
  fi
done
echo ""

# Check database configuration
echo "Checking database configuration..."
if [ -f ".env.test" ]; then
  echo -e "${GREEN}✓${NC} .env.test exists"
else
  echo -e "${YELLOW}⚠${NC} .env.test not found (using defaults)"
fi
echo ""

# Display test command
echo "================================"
echo "Ready to run tests!"
echo "================================"
echo ""
echo "Run migration tests with:"
echo "  npm test -- tests/phase1/agent-migration.test.ts"
echo ""
echo "Run with verbose output:"
echo "  npm test -- tests/phase1/agent-migration.test.ts --verbose"
echo ""
echo "Run dry-run migration:"
echo "  npx tsx src/database/migrate-agent-markdown.ts --dry-run"
echo ""

exit 0
