#!/bin/bash

# AgentLink Startup Script
# Automatically starts both backend and frontend servers for browser access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="/workspaces/agent-feed"

echo -e "${BLUE}🚀 Starting AgentLink System...${NC}"
echo "=================================================="

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    echo -e "${YELLOW}🔄 Killing existing process on port $port...${NC}"
    pkill -f "port.*$port" 2>/dev/null || true
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Function to wait for server to be ready
wait_for_server() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}⏳ Waiting for $name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $name is ready!${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $name failed to start after $max_attempts seconds${NC}"
    return 1
}

# Change to project directory
cd "$PROJECT_DIR" || {
    echo -e "${RED}❌ Failed to change to project directory: $PROJECT_DIR${NC}"
    exit 1
}

# Check and kill existing processes
if check_port 3000; then
    kill_port 3000
fi

if check_port 3001; then
    kill_port 3001
fi

# Start backend server
echo -e "${BLUE}🔧 Starting backend server (port 3000)...${NC}"
npm run dev > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to be ready
if ! wait_for_server "http://localhost:3000/health" "Backend API"; then
    echo -e "${RED}❌ Backend failed to start${NC}"
    exit 1
fi

# Start frontend server
echo -e "${BLUE}🎨 Starting frontend server (port 3001)...${NC}"
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
cd ..

# Wait for frontend to be ready
if ! wait_for_server "http://localhost:3001" "Frontend Dashboard"; then
    echo -e "${RED}❌ Frontend failed to start${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Initialize Claude Code integration
echo -e "${BLUE}🤖 Initializing Claude Code integration...${NC}"
curl -X POST http://localhost:3000/api/v1/claude-live/activity \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"system_startup\", 
    \"description\": \"AgentLink system started via startup script - ready for browser access\",
    \"metadata\": {\"startup_method\": \"automated_script\", \"timestamp\": \"$(date -Iseconds)\", \"status\": \"operational\"}
  }" >/dev/null 2>&1 || echo -e "${YELLOW}⚠️ Claude integration will initialize when Claude Code connects${NC}"

# Create PID file for process management
mkdir -p ~/.agentlink
echo "$BACKEND_PID,$FRONTEND_PID" > ~/.agentlink/pids

# Create status file
cat > ~/.agentlink/status <<EOF
{
  "status": "running",
  "backend_pid": $BACKEND_PID,
  "frontend_pid": $FRONTEND_PID,
  "backend_url": "http://localhost:3000",
  "frontend_url": "http://localhost:3001",
  "started_at": "$(date -Iseconds)",
  "log_files": {
    "backend": "$PROJECT_DIR/logs/backend.log",
    "frontend": "$PROJECT_DIR/logs/frontend.log"
  }
}
EOF

echo ""
echo -e "${GREEN}🎉 AgentLink System Successfully Started!${NC}"
echo "=================================================="
echo -e "${GREEN}✅ Backend API:${NC}      http://localhost:3000"
echo -e "${GREEN}✅ Frontend Dashboard:${NC} http://localhost:3001"
echo ""
echo -e "${BLUE}📱 Quick Access:${NC}"
echo "• Feed (Production Agents): http://localhost:3001/"
echo "• Dual Instance View:       http://localhost:3001/dual-instance"
echo "• API Health Check:         http://localhost:3000/health"
echo ""
echo -e "${YELLOW}📋 Management Commands:${NC}"
echo "• View logs:    tail -f logs/backend.log logs/frontend.log"
echo "• Stop system:  ./scripts/stop-agentlink.sh"
echo "• Check status: ./scripts/status-agentlink.sh"
echo ""
echo -e "${GREEN}🚀 Ready for browser access!${NC}"
echo ""

# Keep script running to show real-time logs (optional)
if [[ "${1:-}" == "--follow-logs" ]] || [[ "${1:-}" == "-f" ]]; then
    echo -e "${BLUE}📜 Following logs (Ctrl+C to stop log viewing, servers will continue)...${NC}"
    echo ""
    trap 'echo -e "\n${YELLOW}⚠️  Log viewing stopped. Servers are still running.${NC}"; exit 0' INT
    tail -f logs/backend.log logs/frontend.log
fi

echo -e "${BLUE}💡 Tip: Run with --follow-logs to watch real-time output${NC}"