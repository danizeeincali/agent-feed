#!/bin/bash

# IMMEDIATE DEBUG ACTIONS FOR YOUR SPECIFIC SETUP
# Based on your current Vite config (port 5173) and React 18 setup

echo "🚨 IMMEDIATE WHITE SCREEN DEBUG - Agent Feed Frontend"
echo "====================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "vite.config.ts" ]; then
    echo "❌ Please run this from /workspaces/agent-feed/frontend directory"
    exit 1
fi

echo "✅ Running from correct directory"
echo ""

echo "📋 STEP 1: Environment Check"
echo "-----------------------------"

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Check if dev server is running on 5173
echo ""
echo "📡 STEP 2: Port Status Check"
echo "----------------------------"

if command -v lsof >/dev/null; then
    port_5173=$(lsof -ti:5173)
    if [ -n "$port_5173" ]; then
        echo "⚠️  Port 5173 is in use by process: $port_5173"
        echo "   Killing existing process..."
        kill -9 $port_5173
        sleep 2
    fi
    echo "✅ Port 5173 is now available"
else
    echo "ℹ️  Cannot check port status (lsof not available)"
fi

echo ""
echo "🧹 STEP 3: Cache Cleanup"
echo "------------------------"

# Clear Vite cache
if [ -d "node_modules/.vite" ]; then
    echo "Clearing Vite cache..."
    rm -rf node_modules/.vite
    echo "✅ Vite cache cleared"
fi

# Clear build directory
if [ -d "dist" ]; then
    echo "Clearing build directory..."
    rm -rf dist
    echo "✅ Build directory cleared"
fi

echo ""
echo "🔧 STEP 4: Dependency Check"
echo "---------------------------"

# Quick dependency reinstall if node_modules is suspect
if [ ! -d "node_modules/react" ] || [ ! -d "node_modules/@vitejs/plugin-react" ]; then
    echo "❌ Critical dependencies missing - reinstalling..."
    npm install
fi

echo "✅ Dependencies verified"

echo ""
echo "🚀 STEP 5: Starting Development Server with Debug"
echo "------------------------------------------------"

echo "Starting Vite dev server on port 5173..."
echo "Your app should be at: http://localhost:5173"
echo ""
echo "🔍 Watch for these specific issues in console:"
echo "   - 'Root element not found' (main.tsx line 13)"
echo "   - 'Failed to render application' (main.tsx line 40)"
echo "   - Any network errors from proxy to port 3000"
echo "   - React StrictMode warnings"
echo ""

# Start dev server with environment variables for better debugging
NODE_ENV=development npm run dev

echo ""
echo "🔚 Debug server stopped."
echo ""
echo "📝 NEXT STEPS if white screen persists:"
echo "--------------------------------------"
echo "1. Open http://localhost:5173 in browser"
echo "2. Press F12 to open DevTools BEFORE loading page"
echo "3. Check Console tab for AgentLink messages"
echo "4. Check Network tab for failed requests"
echo "5. Run: npx playwright test debug-scripts/playwright-console-capture.js"
echo ""
echo "🆘 EMERGENCY RECOVERY:"
echo "   npm run build && npm run preview"
echo "   (Tests production build at http://localhost:4173)"