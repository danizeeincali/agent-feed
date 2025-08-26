#!/bin/bash

echo "🚨 EMERGENCY WHITE SCREEN FIX - Starting Now"
echo "============================================="

# Kill any existing process on port 5173
echo "🔪 Killing any process on port 5173..."
lsof -ti:5173 | xargs kill -9 2>/dev/null || echo "   No existing process found"

# Clear all caches
echo "🧹 Clearing caches..."
rm -rf node_modules/.vite dist .tsbuildinfo 2>/dev/null

# Fix the main.tsx componentName prop issue
echo "🔧 Fixing main.tsx componentName prop..."
if grep -q 'componentName="Application"' src/main.tsx; then
    sed -i 's/<SimpleErrorBoundary componentName="Application">/<SimpleErrorBoundary>/g' src/main.tsx
    echo "   ✅ Fixed main.tsx"
else
    echo "   ✅ main.tsx already fixed"
fi

echo ""
echo "🚀 Starting development server..."
echo "   Your app will be at: http://localhost:5173"
echo "   Press Ctrl+C to stop"
echo ""

# Start with no type checking to get immediate results
npm run dev -- --no-type-check 2>/dev/null || \
npx vite --host 0.0.0.0 --port 5173 --open

echo ""
echo "🔚 Server stopped. If still white screen, run:"
echo "   npx playwright test debug-scripts/playwright-console-capture.js"