#!/bin/bash

# Launch both Claude Code instances
PROJECT_ROOT="/workspaces/agent-feed"
cd "$PROJECT_ROOT"

echo "🚀 Launching Dual Claude Code Instances..."

# Start development instance
echo "Starting development instance on port 8080..."
source .env.dev
claude code --config-file .claude-dev --port 8080 &
DEV_PID=$!
echo "Development instance PID: $DEV_PID"

# Start production instance  
echo "Starting production instance on port 8090..."
source .env.prod
claude code --config-file .claude-prod --port 8090 &
PROD_PID=$!
echo "Production instance PID: $PROD_PID"

# Save PIDs for management
echo "$DEV_PID" > "$PROJECT_ROOT/logs/claude-dev.pid"
echo "$PROD_PID" > "$PROJECT_ROOT/logs/claude-prod.pid"

echo "✅ Both instances launched successfully"
echo "Development: http://localhost:8080"
echo "Production: http://localhost:8090"
echo "AgentLink: http://localhost:3001"
