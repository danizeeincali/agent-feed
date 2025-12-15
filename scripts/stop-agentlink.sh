#!/bin/bash

# AgentLink Stop Script
# Gracefully stops both backend and frontend servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping AgentLink System...${NC}"
echo "=================================================="

# Function to kill process gracefully
kill_process() {
    local pid=$1
    local name=$2
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo -e "${YELLOW}🔄 Stopping $name (PID: $pid)...${NC}"
        kill -TERM "$pid" 2>/dev/null || true
        
        # Wait up to 10 seconds for graceful shutdown
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${RED}⚠️  Force killing $name...${NC}"
            kill -KILL "$pid" 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✅ $name stopped${NC}"
    else
        echo -e "${YELLOW}ℹ️  $name not running${NC}"
    fi
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local name=$2
    
    echo -e "${YELLOW}🔄 Checking for processes on port $port ($name)...${NC}"
    
    # Kill processes using the port
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}🔄 Killing processes on port $port: $pids${NC}"
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
        echo "$pids" | xargs kill -KILL 2>/dev/null || true
    fi
}

# Read PID file if it exists
if [ -f ~/.agentlink/pids ]; then
    echo -e "${BLUE}📄 Reading process IDs from ~/.agentlink/pids${NC}"
    PIDS=$(cat ~/.agentlink/pids)
    BACKEND_PID=$(echo "$PIDS" | cut -d',' -f1)
    FRONTEND_PID=$(echo "$PIDS" | cut -d',' -f2)
    
    # Kill processes by PID
    kill_process "$BACKEND_PID" "Backend Server"
    kill_process "$FRONTEND_PID" "Frontend Server"
    
    # Clean up PID file
    rm -f ~/.agentlink/pids
else
    echo -e "${YELLOW}⚠️  No PID file found, killing by port...${NC}"
fi

# Kill by port as backup
kill_port 3000 "Backend"
kill_port 3001 "Frontend"

# Kill any npm/node processes related to the project
echo -e "${YELLOW}🔄 Cleaning up any remaining npm/node processes...${NC}"
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "tsx watch" 2>/dev/null || true
pkill -f "vite.*3001" 2>/dev/null || true

# Add final Claude Code activity if backend is responsive
echo -e "${BLUE}🤖 Logging shutdown activity...${NC}"
curl -X POST http://localhost:3000/api/v1/claude-live/activity \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"system_shutdown\", 
    \"description\": \"AgentLink system gracefully stopped via stop script\",
    \"metadata\": {\"shutdown_method\": \"automated_script\", \"timestamp\": \"$(date -Iseconds)\"}
  }" >/dev/null 2>&1 || true

# Update status file
if [ -f ~/.agentlink/status ]; then
    cat > ~/.agentlink/status <<EOF
{
  "status": "stopped",
  "stopped_at": "$(date -Iseconds)"
}
EOF
fi

echo ""
echo -e "${GREEN}✅ AgentLink System Stopped Successfully!${NC}"
echo "=================================================="
echo -e "${GREEN}🛑 Backend Server:${NC} Stopped"
echo -e "${GREEN}🛑 Frontend Server:${NC} Stopped"
echo ""
echo -e "${BLUE}💡 To start again: ./scripts/start-agentlink.sh${NC}"
echo ""