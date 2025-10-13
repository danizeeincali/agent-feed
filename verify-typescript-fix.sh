#!/bin/bash
set -e

echo "🧪 Verifying TypeScript Build Pipeline Fix"
echo "=========================================="
echo ""

# Test 1: Check tsx is installed
echo "1. Checking tsx installation..."
cd /workspaces/agent-feed/api-server
if npm list tsx >/dev/null 2>&1; then
    echo "   ✅ tsx is installed in api-server/package.json"
else
    echo "   ❌ tsx not found"
    exit 1
fi

# Test 2: Check start script uses tsx
echo ""
echo "2. Checking start script..."
if grep -q "tsx server.js" package.json; then
    echo "   ✅ Start script uses tsx runtime"
else
    echo "   ❌ Start script doesn't use tsx"
    exit 1
fi

# Test 3: Test TypeScript import
echo ""
echo "3. Testing TypeScript orchestrator import..."
cd /workspaces/agent-feed
if npx tsx -e "import { startOrchestrator } from './src/avi/orchestrator-factory.ts'; console.log('OK')" 2>&1 | grep -q "OK"; then
    echo "   ✅ TypeScript orchestrator can be imported"
else
    echo "   ❌ TypeScript import failed"
    exit 1
fi

# Test 4: Verify server.js has dynamic import
echo ""
echo "4. Checking server.js dynamic import..."
cd /workspaces/agent-feed/api-server
if grep -q "loadNewOrchestrator" server.js && grep -q "await import('../src/avi/orchestrator-factory.ts')" server.js; then
    echo "   ✅ Dynamic import configured in server.js"
else
    echo "   ❌ Dynamic import not found"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ All checks passed!"
echo ""
echo "Summary:"
echo "  • tsx installed as dependency"
echo "  • Start scripts updated to use tsx"
echo "  • TypeScript imports working"
echo "  • Dynamic imports configured"
echo ""
echo "🚀 TypeScript build pipeline is ready for production!"
