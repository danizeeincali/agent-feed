#!/bin/bash
# SPARC WebSocket Robust Startup Script
# Automatically starts the robust WebSocket hub with fallback detection

echo "🚀 Starting SPARC Robust WebSocket Hub..."
echo "========================================"

# Function to check if port is available
check_port() {
    nc -z localhost $1 2>/dev/null
    return $?
}

# Function to find available port
find_available_port() {
    local ports=(3003 3002 3004 3005)
    for port in "${ports[@]}"; do
        if ! check_port $port; then
            echo "✅ Port $port is available"
            return $port
        else
            echo "⚠️ Port $port is in use"
        fi
    done
    return 0
}

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if the robust server file exists
ROBUST_SERVER="src/websocket-hub/robust-websocket-server.js"
if [ ! -f "$ROBUST_SERVER" ]; then
    echo "❌ Robust server file not found: $ROBUST_SERVER"
    echo "Please ensure you're running this from the project root directory"
    exit 1
fi

# Check if any existing WebSocket servers are running
echo "🔍 Checking for existing WebSocket servers..."
existing_servers=$(ps aux | grep -E "(websocket|socket\.io)" | grep -v grep | wc -l)
if [ $existing_servers -gt 0 ]; then
    echo "⚠️ Found $existing_servers existing WebSocket server(s)"
    echo "📋 Existing servers:"
    ps aux | grep -E "(websocket|socket\.io)" | grep -v grep
    echo ""
    read -p "🤔 Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Startup cancelled"
        exit 1
    fi
fi

# Find available port
echo "🔍 Searching for available port..."
find_available_port
available_port=$?

if [ $available_port -eq 0 ]; then
    echo "❌ No available ports found in range [3002-3005]"
    echo "💡 Try stopping existing services or using different ports"
    exit 1
fi

# Set environment variable for the server
export PORT=$available_port

echo "🎯 Starting robust WebSocket hub on port $available_port..."
echo ""

# Start the robust server
node "$ROBUST_SERVER" &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Check if server started successfully
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Robust WebSocket Hub started successfully!"
    echo "📊 Process ID: $SERVER_PID"
    echo "🌐 Port: $available_port"
    echo ""
    echo "🔗 Available endpoints:"
    echo "   Health: http://localhost:$available_port/health"
    echo "   Status: http://localhost:$available_port/hub/status" 
    echo "   Debug:  http://localhost:$available_port/debug"
    echo "   Test:   http://localhost:$available_port/test"
    echo ""
    echo "🧪 Testing tools:"
    echo "   Browser Debugger: tests/browser-websocket-debugger.html"
    echo "   Comprehensive Test: node tests/websocket-comprehensive-test.js"
    echo "   Integration Test: node tests/robust-websocket-integration-test.js"
    echo ""
    echo "⚙️ Frontend configuration:"
    echo "   Update your .env file with:"
    echo "   VITE_WEBSOCKET_HUB_URL=http://localhost:$available_port"
    echo ""
    echo "🔴 To stop the server: kill $SERVER_PID"
    echo "📋 To monitor: ps aux | grep $SERVER_PID"
    
    # Save PID for later reference
    echo $SERVER_PID > .websocket-hub.pid
    echo "💾 PID saved to .websocket-hub.pid"
    
    # Wait for server process
    wait $SERVER_PID
else
    echo "❌ Failed to start robust WebSocket hub"
    exit 1
fi