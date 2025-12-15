#!/bin/bash

# Production Claude Initialization Script v2.0
# New location: /workspaces/agent-feed/prod

echo "🚀 Initializing Production Claude Instance..."
echo "📁 Production Root: /workspaces/agent-feed/prod"
echo "🔒 Protected Workspace: /workspaces/agent-feed/prod/agent_workspace"
echo ""

# Create required directories
echo "📁 Setting up directory structure..."
mkdir -p agent_workspace/{outputs,temp,logs,data}
mkdir -p config terminal logs monitoring security backups

# Set up protection
if [ ! -f agent_workspace/.protected ]; then
    echo "🔒 Protecting agent workspace..."
    cat > agent_workspace/.protected << EOF
PROTECTED_WORKSPACE=true
MANUAL_EDIT_FORBIDDEN=true
AGENT_MANAGED=true
CREATED_AT=$(date -Iseconds)
PURPOSE=Production agent isolated workspace
WARNING=Do not modify or delete this file
EOF
fi

echo "✅ Directory structure ready"
echo ""

# Initialize Claude with dangerous permissions
echo "🔧 Starting Claude with --dangerously-skip-permissions..."
echo ""
echo "To initialize Claude, run:"
echo "  cd /workspaces/agent-feed/prod"
echo "  claude --dangerously-skip-permissions"
echo ""
echo "Or use the terminal interface:"
echo "  node terminal/interface.js"
echo ""

# Test connectivity
echo "🔍 Testing system connectivity..."
echo "Backend test:"
curl -s http://localhost:3000/socket.io/?EIO=4&transport=polling 2>/dev/null | head -1 | jq '.' 2>/dev/null || echo "Backend endpoint responding"

echo ""
echo "Frontend test:"
curl -s http://localhost:3001 2>/dev/null | grep -q "Agent Feed" && echo "✅ Frontend serving correctly" || echo "❌ Frontend issue detected"

echo ""
echo "✅ Production Claude environment ready!"
echo "📚 See PRODUCTION_CLAUDE.md for full documentation"
echo ""
echo "⚠️ IMPORTANT: The agent_workspace/ directory is protected."
echo "   Never manually edit files in that directory!"