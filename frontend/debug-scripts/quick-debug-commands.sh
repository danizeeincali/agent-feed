#!/bin/bash

# Quick Debug Commands for React White Screen Issue
# Run with: chmod +x debug-scripts/quick-debug-commands.sh && ./debug-scripts/quick-debug-commands.sh

echo "🔍 REACT WHITE SCREEN DEBUGGING TOOLKIT"
echo "======================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print section headers
print_section() {
    echo ""
    echo "📋 $1"
    echo "$(printf '%.0s-' {1..40})"
}

print_section "ENVIRONMENT CHECK"

echo "Node.js version: $(node --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "npm version: $(npm --version 2>/dev/null || echo 'NOT INSTALLED')"

if [ -f "package.json" ]; then
    echo "✅ package.json found"
    echo "React version: $(grep -o '"react": "[^"]*"' package.json || echo 'Not found')"
    echo "Vite version: $(grep -o '"vite": "[^"]*"' package.json || echo 'Not found')"
else
    echo "❌ package.json NOT found - are you in the project root?"
    exit 1
fi

print_section "CRITICAL FILES CHECK"

files_to_check=(
    "index.html"
    "src/main.tsx"
    "src/main.jsx"
    "src/App.tsx"
    "src/App.jsx"
    "vite.config.ts"
    "vite.config.js"
    "tsconfig.json"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

print_section "DEPENDENCY CHECK"

echo "Checking for node_modules..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules directory exists"
    
    # Check critical packages
    critical_packages=("react" "react-dom" "@vitejs/plugin-react")
    for package in "${critical_packages[@]}"; do
        if [ -d "node_modules/$package" ]; then
            echo "✅ $package installed"
        else
            echo "❌ $package MISSING"
        fi
    done
else
    echo "❌ node_modules missing - run 'npm install'"
fi

print_section "PORT AND PROCESS CHECK"

echo "Checking if port 3000 is in use..."
if command_exists lsof; then
    port_check=$(lsof -ti:3000)
    if [ -n "$port_check" ]; then
        echo "⚠️  Port 3000 is in use by process: $port_check"
        echo "   Kill with: kill -9 $port_check"
    else
        echo "✅ Port 3000 is available"
    fi
elif command_exists netstat; then
    netstat -an | grep :3000 && echo "⚠️  Port 3000 appears to be in use" || echo "✅ Port 3000 appears available"
else
    echo "ℹ️  Cannot check port status (lsof/netstat not available)"
fi

print_section "CACHE CLEANUP"

echo "Clearing various caches..."

# Clear Vite cache
if [ -d "node_modules/.vite" ]; then
    echo "🧹 Clearing Vite cache..."
    rm -rf node_modules/.vite
    echo "   ✅ Vite cache cleared"
else
    echo "   ℹ️  No Vite cache to clear"
fi

# Clear npm cache
if command_exists npm; then
    echo "🧹 Clearing npm cache..."
    npm cache clean --force 2>/dev/null
    echo "   ✅ npm cache cleared"
fi

print_section "BUILD TEST"

echo "Testing build process..."
if npm run build 2>/dev/null; then
    echo "✅ Build successful"
    
    # Check if dist folder was created
    if [ -d "dist" ]; then
        echo "✅ dist folder created"
        echo "   Files in dist: $(ls -1 dist | wc -l)"
        
        # Check for index.html in dist
        if [ -f "dist/index.html" ]; then
            echo "✅ dist/index.html exists"
        else
            echo "❌ dist/index.html missing"
        fi
    else
        echo "❌ dist folder not created"
    fi
else
    echo "❌ Build FAILED - check npm run build output"
fi

print_section "CONTENT VERIFICATION"

echo "Checking critical file contents..."

# Check index.html for root div
if [ -f "index.html" ]; then
    if grep -q 'id="root"' index.html; then
        echo '✅ index.html contains <div id="root">'
    else
        echo '❌ index.html missing <div id="root">'
        echo "   First 10 lines of index.html:"
        head -10 index.html | sed 's/^/   /'
    fi
fi

# Check main entry file
main_file=""
if [ -f "src/main.tsx" ]; then
    main_file="src/main.tsx"
elif [ -f "src/main.jsx" ]; then
    main_file="src/main.jsx"
fi

if [ -n "$main_file" ]; then
    echo "✅ Entry file found: $main_file"
    
    # Check for React 18 createRoot pattern
    if grep -q "createRoot" "$main_file"; then
        echo "✅ Using React 18 createRoot pattern"
    else
        echo "⚠️  May be using old ReactDOM.render pattern"
    fi
    
    # Check for root element reference
    if grep -q "getElementById.*root" "$main_file"; then
        echo "✅ References root element"
    else
        echo "❌ No root element reference found"
    fi
else
    echo "❌ No main entry file found (main.tsx/main.jsx)"
fi

print_section "VITE CONFIG CHECK"

config_file=""
if [ -f "vite.config.ts" ]; then
    config_file="vite.config.ts"
elif [ -f "vite.config.js" ]; then
    config_file="vite.config.js"
fi

if [ -n "$config_file" ]; then
    echo "✅ Vite config found: $config_file"
    
    # Check for React plugin
    if grep -q "@vitejs/plugin-react" "$config_file"; then
        echo "✅ React plugin configured"
    else
        echo "❌ React plugin may not be configured"
    fi
else
    echo "⚠️  No Vite config file found"
fi

print_section "RECOMMENDATIONS"

echo "Based on the analysis above:"
echo ""

# Generate recommendations based on findings
if [ ! -d "node_modules" ]; then
    echo "🔧 RUN: npm install"
fi

if [ ! -f "src/main.tsx" ] && [ ! -f "src/main.jsx" ]; then
    echo "🔧 CHECK: Entry point file is missing"
fi

echo "🔧 TRY: Clear browser cache completely (Ctrl+Shift+Del / Cmd+Shift+Del)"
echo "🔧 TRY: Open browser dev tools BEFORE loading page"
echo "🔧 TRY: npm run dev (then check console for errors)"
echo "🔧 TRY: Access via 127.0.0.1:3000 instead of localhost:3000"

print_section "NEXT STEPS"

echo "1. Run the Playwright debug script:"
echo "   npx playwright test debug-scripts/playwright-console-capture.js"
echo ""
echo "2. Start dev server with debug output:"
echo "   npm run dev -- --debug"
echo ""
echo "3. Check browser console at: http://localhost:3000"
echo ""
echo "4. If still stuck, check debug-scripts/browser-debug-steps.md"

echo ""
echo "🏁 Debug analysis complete!"