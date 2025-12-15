#!/bin/bash

echo "🔄 Restarting Frontend Development Server"
echo "========================================"

# Kill existing Vite process
echo "🛑 Stopping existing Vite processes..."
pkill -f "vite"

# Wait a moment
sleep 2

# Start fresh
echo "🚀 Starting Vite dev server..."
cd /workspaces/agent-feed/frontend
npm run dev &

echo "✅ Frontend restart initiated"
echo "   Access at: http://localhost:3000"
echo "   Backend proxy: http://localhost:3001"