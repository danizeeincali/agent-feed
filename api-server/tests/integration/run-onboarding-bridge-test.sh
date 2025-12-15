#!/bin/bash

##
# Quick Test Runner: Onboarding Bridge Permanent Fix
# Runs comprehensive integration tests with real database validation
##

set -e  # Exit on error

echo "🧪 Onboarding Bridge Permanent Fix - Integration Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if server is running
echo "📡 Checking if API server is running..."
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "❌ API server is not running on port 3001"
  echo ""
  echo "Start the server with:"
  echo "  cd /workspaces/agent-feed/api-server"
  echo "  npm start"
  echo ""
  exit 1
fi

echo "✅ API server is running"
echo ""

# Check database exists
echo "📊 Checking database..."
if [ ! -f "/workspaces/agent-feed/database.db" ]; then
  echo "❌ Database not found at /workspaces/agent-feed/database.db"
  exit 1
fi

echo "✅ Database found"
echo ""

# Run the test
echo "🚀 Running integration tests..."
echo ""

cd /workspaces/agent-feed/api-server/tests/integration

# Use Jest with the integration config
NODE_OPTIONS="--experimental-vm-modules" npx jest \
  --config=jest.config.integration.cjs \
  --testMatch="**/onboarding-bridge-permanent-fix.test.js" \
  --verbose \
  --runInBand \
  --forceExit

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test suite completed!"
echo ""
