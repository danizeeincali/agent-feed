#!/bin/bash

# AgentLink Status Script
# Check the current status of the AgentLink system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 AgentLink System Status${NC}"
echo "=================================================="

# Function to check if port is in use
check_port() {
    local port=$1
    local name=$2
    local url=$3
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $name (port $port): Running and responding${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  $name (port $port): Port occupied but not responding${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ $name (port $port): Not running${NC}"
        return 1
    fi
}

# Function to check process by PID
check_pid() {
    local pid=$1
    local name=$2
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo -e "${GREEN}✅ $name (PID $pid): Running${NC}"
        return 0
    else
        echo -e "${RED}❌ $name (PID $pid): Not running${NC}"
        return 1
    fi
}

# Check servers by port
BACKEND_RUNNING=false
FRONTEND_RUNNING=false

if check_port 3000 "Backend Server" "http://localhost:3000/health"; then
    BACKEND_RUNNING=true
fi

if check_port 3001 "Frontend Server" "http://localhost:3001"; then
    FRONTEND_RUNNING=true
fi

echo ""

# Check PID file
if [ -f ~/.agentlink/pids ]; then
    echo -e "${BLUE}📄 Process Information:${NC}"
    PIDS=$(cat ~/.agentlink/pids)
    BACKEND_PID=$(echo "$PIDS" | cut -d',' -f1)
    FRONTEND_PID=$(echo "$PIDS" | cut -d',' -f2)
    
    check_pid "$BACKEND_PID" "Backend Process"
    check_pid "$FRONTEND_PID" "Frontend Process"
    echo ""
fi

# Check status file
if [ -f ~/.agentlink/status ]; then
    echo -e "${BLUE}📋 Last Known Status:${NC}"
    cat ~/.agentlink/status | jq . 2>/dev/null || cat ~/.agentlink/status
    echo ""
fi

# Check Claude Code integration
if [ "$BACKEND_RUNNING" = true ]; then
    echo -e "${BLUE}🤖 Claude Code Integration:${NC}"
    
    # Check agents
    AGENT_COUNT=$(curl -s http://localhost:3000/api/v1/claude-live/prod/agents 2>/dev/null | jq '.agents | length' 2>/dev/null || echo "0")
    if [ "$AGENT_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Production Agents: $AGENT_COUNT active${NC}"
        
        # Get agent status
        AGENT_STATUS=$(curl -s http://localhost:3000/api/v1/claude-live/prod/agents 2>/dev/null | jq -r '.agents[0].status' 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✅ Agent Status: $AGENT_STATUS${NC}"
    else
        echo -e "${RED}❌ No production agents found${NC}"
    fi
    
    # Check activities
    ACTIVITY_COUNT=$(curl -s http://localhost:3000/api/v1/claude-live/prod/activities 2>/dev/null | jq '.activities | length' 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ Recent Activities: $ACTIVITY_COUNT logged${NC}"
    
    # Check session info
    SESSION_INFO=$(curl -s http://localhost:3000/api/v1/claude-live/session 2>/dev/null || echo "{}")
    if echo "$SESSION_INFO" | jq . >/dev/null 2>&1; then
        UPTIME=$(echo "$SESSION_INFO" | jq -r '.uptime // 0')
        UPTIME_MIN=$((UPTIME / 60000))
        echo -e "${GREEN}✅ Session Uptime: ${UPTIME_MIN} minutes${NC}"
    fi
    echo ""
fi

# Overall status
echo -e "${BLUE}🔍 Overall Status:${NC}"
if [ "$BACKEND_RUNNING" = true ] && [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "${GREEN}✅ System Status: Fully Operational${NC}"
    echo ""
    echo -e "${BLUE}🌐 Access URLs:${NC}"
    echo "• Production Feed:  http://localhost:3001/"
    echo "• Dual Instance:    http://localhost:3001/dual-instance"
    echo "• API Health:       http://localhost:3000/health"
    echo ""
    echo -e "${BLUE}📊 Live Metrics:${NC}"
    echo "• Backend API:      http://localhost:3000/api/v1/claude-live/session"
    echo "• Agent Status:     http://localhost:3000/api/v1/claude-live/prod/agents"
    echo "• Recent Activity:  http://localhost:3000/api/v1/claude-live/prod/activities"
elif [ "$BACKEND_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  System Status: Backend Only${NC}"
    echo -e "${YELLOW}   Frontend not running. Start with: cd frontend && npm run dev${NC}"
elif [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  System Status: Frontend Only${NC}"
    echo -e "${YELLOW}   Backend not running. Start with: npm run dev${NC}"
else
    echo -e "${RED}❌ System Status: Not Running${NC}"
    echo -e "${BLUE}💡 Start with: ./scripts/start-agentlink.sh${NC}"
fi

echo ""
echo -e "${BLUE}🛠️  Management Commands:${NC}"
echo "• Start:     ./scripts/start-agentlink.sh"
echo "• Stop:      ./scripts/stop-agentlink.sh"
echo "• Logs:      tail -f logs/backend.log logs/frontend.log"
echo ""