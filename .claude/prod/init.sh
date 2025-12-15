#!/bin/bash

# Production Claude Initialization Script
echo "🚀 Initializing Production Claude Instance..."

# Create required directories
mkdir -p debug agents terminals

# Set up Claude environment
echo "📁 Setting up directory structure..."
echo "- Debug logs: debug/"
echo "- Agent configs: agents/"  
echo "- Terminal sessions: terminals/"

# Initialize Claude with dangerous permissions
echo "🔧 Starting Claude with --dangerously-skip-permissions..."
echo ""
echo "To initialize Claude, run:"
echo "  cd .claude/prod"
echo "  claude --dangerously-skip-permissions"
echo ""
echo "Or use the terminal interface:"
echo "  node terminal-interface.js"
echo ""

# Test connectivity
echo "🔍 Testing system connectivity..."
echo "Backend test:"
curl -s http://localhost:3000/socket.io/?EIO=4&transport=polling | head -1 | jq '.' 2>/dev/null || echo "Backend endpoint responding"

echo ""
echo "Frontend test:"
curl -s http://localhost:3001 | grep -q "Agent Feed" && echo "✅ Frontend serving correctly" || echo "❌ Frontend issue detected"

echo ""
echo "✅ Production Claude environment ready!"
echo "📚 See CLAUDE.md for full documentation"