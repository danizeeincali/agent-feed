#!/bin/bash

# Production Claude Instance - Development Mode Initialization
echo "🚀 Initializing Production Claude in DEVELOPMENT MODE..."
echo ""

# Set the DEV_MODE flag
export DEV_MODE=true

# Update the mode configuration file
cat > /workspaces/agent-feed/prod/config/mode.json << EOF
{
  "mode": "DEVELOPMENT",
  "devMode": true,
  "devModeSettings": {
    "enableChat": true,
    "enhancedLogging": true,
    "debugInfo": true,
    "testExecution": true
  },
  "description": "Production instance in development mode",
  "lastUpdated": "$(date -Iseconds)",
  "note": "Development mode active - chat enabled, all boundaries still enforced"
}
EOF

echo "✅ DEV_MODE flag set to true"
echo "✅ Chat interaction enabled"
echo "✅ Enhanced logging activated"
echo "⚠️  All security boundaries remain in effect"
echo ""
echo "📁 Production Root: /workspaces/agent-feed/prod"
echo "📁 Agent Workspace: /workspaces/agent-feed/prod/agent_workspace/"
echo ""
echo "🎯 Development Mode Instructions:"
echo "  1. Initialize and chat only"
echo "  2. Do not modify system_instructions"
echo "  3. Work only in agent_workspace"
echo "  4. All production boundaries apply"
echo ""
echo "To start Claude in dev mode:"
echo "  cd /workspaces/agent-feed/prod"
echo "  claude --dangerously-skip-permissions"
echo ""
echo "The production instance will read the DEV_MODE flag from:"
echo "  - Environment variable: DEV_MODE=true"
echo "  - Config file: /prod/config/mode.json"