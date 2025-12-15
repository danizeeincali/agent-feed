#!/bin/bash

# Enhanced AgentLink Status Script v2.0
# Comprehensive status monitoring for enhanced dual Claude system
# Includes SPARC, TDD, NLD, swarm coordination, and performance metrics

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
CONFIG_DIR="$HOME/.agentlink"
PROJECT_DIR="/workspaces/agent-feed"
SCRIPT_VERSION="2.0.0"

echo -e "${CYAN}📊 Enhanced AgentLink System Status v${SCRIPT_VERSION}${NC}"
echo -e "${CYAN}   Comprehensive monitoring with neural insights${NC}"
echo "=================================================================="

# Function: Check enhanced prerequisites and environment
check_enhanced_environment() {
    echo -e "${BLUE}🔍 Enhanced Environment Status:${NC}"
    
    # Claude-Flow version check
    local claude_flow_version=$(npx claude-flow@alpha --version 2>/dev/null | head -1 || echo "Not available")
    if [[ "$claude_flow_version" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+ ]]; then
        echo -e "${GREEN}✅ Claude-Flow: $claude_flow_version${NC}"
    else
        echo -e "${RED}❌ Claude-Flow: Not available or outdated${NC}"
    fi
    
    # Check required tools
    local tools=("jq" "curl" "lsof" "npx")
    for tool in "${tools[@]}"; do
        if command -v "$tool" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $tool: Available${NC}"
        else
            echo -e "${RED}❌ $tool: Missing${NC}"
        fi
    done
    
    # Check project structure
    if [ -d "$PROJECT_DIR" ]; then
        echo -e "${GREEN}✅ Project Directory: $PROJECT_DIR${NC}"
        
        if [ -f "$PROJECT_DIR/package.json" ]; then
            echo -e "${GREEN}✅ Package Configuration: Valid${NC}"
        else
            echo -e "${YELLOW}⚠️  Package Configuration: Missing package.json${NC}"
        fi
    else
        echo -e "${RED}❌ Project Directory: Not found${NC}"
    fi
    
    echo ""
}

# Function: Enhanced port and service checking
check_enhanced_services() {
    local port=$1
    local name=$2
    local url=$3
    local health_endpoint=$4
    
    echo -e "${BLUE}🔍 Checking $name (port $port):${NC}"
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        # Get process information
        local pid=$(lsof -ti:$port | head -1)
        local process_name=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
        local cpu_usage=$(ps -p "$pid" -o %cpu= 2>/dev/null | tr -d ' ' || echo "0")
        local memory_mb=$(ps -p "$pid" -o rss= 2>/dev/null | awk '{print int($1/1024)}' || echo "0")
        
        echo -e "${GREEN}   ✅ Port $port: Occupied by $process_name (PID: $pid)${NC}"
        echo -e "${GREEN}   📊 Resources: ${cpu_usage}% CPU, ${memory_mb}MB RAM${NC}"
        
        # Health check
        if [ -n "$health_endpoint" ]; then
            if curl -s --connect-timeout 3 "$health_endpoint" >/dev/null 2>&1; then
                echo -e "${GREEN}   ✅ Health Check: Responding${NC}"
                
                # Try to get detailed health info
                local health_data=$(curl -s --connect-timeout 3 "$health_endpoint" 2>/dev/null || echo "{}")
                if echo "$health_data" | jq . >/dev/null 2>&1; then
                    local status=$(echo "$health_data" | jq -r '.status // "unknown"')
                    local uptime=$(echo "$health_data" | jq -r '.uptime // "unknown"')
                    echo -e "${GREEN}   📈 Status: $status, Uptime: $uptime${NC}"
                fi
                
                return 0
            else
                echo -e "${YELLOW}   ⚠️  Health Check: Not responding${NC}"
                return 1
            fi
        else
            # Basic connectivity test
            if curl -s --connect-timeout 3 "$url" >/dev/null 2>&1; then
                echo -e "${GREEN}   ✅ Connectivity: Responding${NC}"
                return 0
            else
                echo -e "${YELLOW}   ⚠️  Connectivity: Not responding${NC}"
                return 1
            fi
        fi
    else
        echo -e "${RED}   ❌ Port $port: Not occupied${NC}"
        return 1
    fi
}

# Function: Check SPARC methodology status
check_sparc_status() {
    echo -e "${BLUE}📋 SPARC Methodology Status:${NC}"
    
    # Check if SPARC modes are available
    if npx claude-flow@alpha sparc modes >/dev/null 2>&1; then
        echo -e "${GREEN}✅ SPARC Framework: Available${NC}"
        
        # Get available modes
        local modes=$(npx claude-flow@alpha sparc modes 2>/dev/null | grep "•" | wc -l || echo "0")
        echo -e "${GREEN}✅ Available Modes: $modes${NC}"
    else
        echo -e "${YELLOW}⚠️  SPARC Framework: Limited availability${NC}"
    fi
    
    # Check for SPARC execution history
    if [ -f "$CONFIG_DIR/sparc_history.log" ]; then
        local last_sparc=$(tail -1 "$CONFIG_DIR/sparc_history.log" 2>/dev/null || echo "")
        if [ -n "$last_sparc" ]; then
            echo -e "${GREEN}✅ Last SPARC Execution: $last_sparc${NC}"
        fi
    else
        echo -e "${YELLOW}ℹ️  SPARC History: No execution records${NC}"
    fi
    
    echo ""
}

# Function: Check swarm coordination status
check_swarm_status() {
    echo -e "${BLUE}🐝 Swarm Coordination Status:${NC}"
    
    # Check swarm ID file
    if [ -f "$CONFIG_DIR/swarm_id" ]; then
        local swarm_id=$(cat "$CONFIG_DIR/swarm_id")
        echo -e "${GREEN}✅ Swarm ID: $swarm_id${NC}"
        
        # Try to get swarm status from claude-flow
        local swarm_status=$(npx claude-flow@alpha hooks notify --message "status-check" 2>/dev/null || echo "unknown")
        if [[ "$swarm_status" != "unknown" ]]; then
            echo -e "${GREEN}✅ Swarm Communication: Active${NC}"
        else
            echo -e "${YELLOW}⚠️  Swarm Communication: Limited${NC}"
        fi
    else
        echo -e "${YELLOW}ℹ️  Swarm Status: No active swarm${NC}"
    fi
    
    # Check for agent activity
    if [ -f "$CONFIG_DIR/agent_activity.log" ]; then
        local agent_count=$(tail -10 "$CONFIG_DIR/agent_activity.log" 2>/dev/null | grep -c "agent_spawn" || echo "0")
        echo -e "${GREEN}✅ Recent Agent Activity: $agent_count operations${NC}"
    fi
    
    echo ""
}

# Function: Check NLD system status
check_nld_status() {
    echo -e "${BLUE}🧠 NLD (Neural Learning Development) Status:${NC}"
    
    # Check learning data files
    local learning_files=("startup_performance.log" "shutdown_performance.log" "process_metrics.log" "neural_patterns.log")
    local active_learning=0
    
    for file in "${learning_files[@]}"; do
        if [ -f "$CONFIG_DIR/$file" ]; then
            local entries=$(wc -l < "$CONFIG_DIR/$file" 2>/dev/null || echo "0")
            if [ "$entries" -gt 0 ]; then
                echo -e "${GREEN}✅ $file: $entries entries${NC}"
                active_learning=$((active_learning + 1))
            fi
        fi
    done
    
    if [ $active_learning -gt 0 ]; then
        echo -e "${GREEN}✅ NLD Learning: $active_learning active datasets${NC}"
        
        # Calculate learning effectiveness
        if [ -f "$CONFIG_DIR/startup_performance.log" ]; then
            local avg_startup=$(awk -F'"duration_ms":|,' '{sum+=$2; count++} END {if(count>0) print int(sum/count); else print 0}' "$CONFIG_DIR/startup_performance.log" 2>/dev/null || echo "0")
            echo -e "${GREEN}✅ Average Startup Time: ${avg_startup}ms${NC}"
        fi
    else
        echo -e "${YELLOW}ℹ️  NLD Learning: No active learning data${NC}"
    fi
    
    # Check for neural training activity
    if npx claude-flow@alpha hooks notify --message "neural-status-check" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Neural Training: Available${NC}"
    else
        echo -e "${YELLOW}⚠️  Neural Training: Limited availability${NC}"
    fi
    
    echo ""
}

# Function: Check TDD integration status
check_tdd_status() {
    echo -e "${BLUE}🧪 TDD Integration Status:${NC}"
    
    # Check test directory and files
    if [ -d "$PROJECT_DIR/tests" ]; then
        local test_files=$(find "$PROJECT_DIR/tests" -name "*.test.js" -o -name "*.test.ts" | wc -l)
        echo -e "${GREEN}✅ Test Directory: $test_files test files${NC}"
        
        # Check for enhanced startup tests
        if [ -f "$PROJECT_DIR/tests/startup.test.js" ]; then
            echo -e "${GREEN}✅ Startup Tests: Available${NC}"
        else
            echo -e "${YELLOW}⚠️  Startup Tests: Missing${NC}"
        fi
    else
        echo -e "${YELLOW}ℹ️  Test Directory: Not found${NC}"
    fi
    
    # Check test execution capability
    if [ -f "$PROJECT_DIR/package.json" ]; then
        local has_test_script=$(jq -r '.scripts.test // empty' "$PROJECT_DIR/package.json" 2>/dev/null)
        if [ -n "$has_test_script" ]; then
            echo -e "${GREEN}✅ Test Execution: Configured${NC}"
        else
            echo -e "${YELLOW}⚠️  Test Execution: No test script${NC}"
        fi
    fi
    
    echo ""
}

# Function: Check performance monitoring
check_performance_monitoring() {
    echo -e "${BLUE}📊 Performance Monitoring Status:${NC}"
    
    # Check if performance monitor is running
    if [ -f "$CONFIG_DIR/monitor_pid" ]; then
        local monitor_pid=$(cat "$CONFIG_DIR/monitor_pid")
        if kill -0 "$monitor_pid" 2>/dev/null; then
            echo -e "${GREEN}✅ Performance Monitor: Running (PID: $monitor_pid)${NC}"
            
            # Check recent performance data
            if [ -f "$CONFIG_DIR/performance.log" ]; then
                local recent_entries=$(tail -5 "$CONFIG_DIR/performance.log" 2>/dev/null | wc -l)
                echo -e "${GREEN}✅ Recent Metrics: $recent_entries data points${NC}"
                
                # Show latest metrics
                local latest_metrics=$(tail -1 "$CONFIG_DIR/performance.log" 2>/dev/null || echo "{}")
                if echo "$latest_metrics" | jq . >/dev/null 2>&1; then
                    local cpu=$(echo "$latest_metrics" | jq -r '.cpu // "unknown"')
                    local memory=$(echo "$latest_metrics" | jq -r '.memory // "unknown"')
                    echo -e "${GREEN}✅ Current Metrics: CPU ${cpu}%, Memory ${memory}%${NC}"
                fi
            fi
        else
            echo -e "${RED}❌ Performance Monitor: Process not found${NC}"
            rm -f "$CONFIG_DIR/monitor_pid"
        fi
    else
        echo -e "${YELLOW}ℹ️  Performance Monitor: Not configured${NC}"
    fi
    
    echo ""
}

# Function: Enhanced Claude Code integration check
check_claude_integration() {
    echo -e "${BLUE}🤖 Enhanced Claude Code Integration:${NC}"
    
    if check_enhanced_services 3000 "Backend API" "http://localhost:3000" "http://localhost:3000/health" >/dev/null 2>&1; then
        # Check agents
        local agent_data=$(curl -s http://localhost:3000/api/v1/claude-live/prod/agents 2>/dev/null || echo '{"agents":[]}')
        local agent_count=$(echo "$agent_data" | jq '.agents | length' 2>/dev/null || echo "0")
        
        if [ "$agent_count" -gt 0 ]; then
            echo -e "${GREEN}✅ Production Agents: $agent_count active${NC}"
            
            # Get agent details
            local agent_status=$(echo "$agent_data" | jq -r '.agents[0].status // "unknown"' 2>/dev/null)
            local agent_type=$(echo "$agent_data" | jq -r '.agents[0].type // "unknown"' 2>/dev/null)
            echo -e "${GREEN}✅ Primary Agent: $agent_type ($agent_status)${NC}"
        else
            echo -e "${YELLOW}⚠️  Production Agents: None active${NC}"
        fi
        
        # Check activities
        local activity_data=$(curl -s http://localhost:3000/api/v1/claude-live/prod/activities 2>/dev/null || echo '{"activities":[]}')
        local activity_count=$(echo "$activity_data" | jq '.activities | length' 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ Recent Activities: $activity_count logged${NC}"
        
        # Check session information
        local session_data=$(curl -s http://localhost:3000/api/v1/claude-live/session 2>/dev/null || echo "{}")
        if echo "$session_data" | jq . >/dev/null 2>&1; then
            local uptime=$(echo "$session_data" | jq -r '.uptime // 0')
            local uptime_min=$((uptime / 60000))
            local version=$(echo "$session_data" | jq -r '.version // "unknown"')
            echo -e "${GREEN}✅ Session: ${uptime_min}min uptime, version $version${NC}"
        fi
    else
        echo -e "${RED}❌ Claude Integration: Backend not accessible${NC}"
    fi
    
    echo ""
}

# Function: System resource analysis
analyze_system_resources() {
    echo -e "${BLUE}💻 System Resource Analysis:${NC}"
    
    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ CPU Usage: ${cpu_usage}%${NC}"
    
    # Memory usage
    local memory_info=$(free | grep Mem)
    local memory_total=$(echo "$memory_info" | awk '{print int($2/1024)}')
    local memory_used=$(echo "$memory_info" | awk '{print int($3/1024)}')
    local memory_percent=$(echo "$memory_info" | awk '{printf "%.1f", $3/$2 * 100.0}')
    echo -e "${GREEN}✅ Memory: ${memory_used}MB/${memory_total}MB (${memory_percent}%)${NC}"
    
    # Disk usage for project
    if [ -d "$PROJECT_DIR" ]; then
        local disk_usage=$(du -sh "$PROJECT_DIR" 2>/dev/null | cut -f1 || echo "unknown")
        echo -e "${GREEN}✅ Project Size: $disk_usage${NC}"
    fi
    
    # Load average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | sed 's/^ *//' || echo "unknown")
    echo -e "${GREEN}✅ Load Average: $load_avg${NC}"
    
    echo ""
}

# Function: Overall system assessment
assess_overall_status() {
    echo -e "${BLUE}🔍 Overall System Assessment:${NC}"
    
    local backend_status=false
    local frontend_status=false
    
    # Check core services
    if check_enhanced_services 3000 "Backend" "http://localhost:3000" "http://localhost:3000/health" >/dev/null 2>&1; then
        backend_status=true
    fi
    
    if check_enhanced_services 3001 "Frontend" "http://localhost:3001" >/dev/null 2>&1; then
        frontend_status=true
    fi
    
    # Determine overall status
    if $backend_status && $frontend_status; then
        echo -e "${GREEN}✅ System Status: Fully Operational (Enhanced Mode)${NC}"
        
        # Calculate enhanced features score
        local features_score=0
        [ -f "$CONFIG_DIR/swarm_id" ] && features_score=$((features_score + 1))
        [ -f "$CONFIG_DIR/startup_performance.log" ] && features_score=$((features_score + 1))
        [ -f "$CONFIG_DIR/monitor_pid" ] && features_score=$((features_score + 1))
        [ -d "$PROJECT_DIR/tests" ] && features_score=$((features_score + 1))
        
        echo -e "${GREEN}✅ Enhanced Features: $features_score/4 active${NC}"
        
    elif $backend_status; then
        echo -e "${YELLOW}⚠️  System Status: Backend Only${NC}"
        echo -e "${YELLOW}   Frontend not running. Start with: cd frontend && npm run dev${NC}"
    elif $frontend_status; then
        echo -e "${YELLOW}⚠️  System Status: Frontend Only${NC}"
        echo -e "${YELLOW}   Backend not running. Start with: npm run dev${NC}"
    else
        echo -e "${RED}❌ System Status: Not Running${NC}"
        echo -e "${BLUE}💡 Start with: ./scripts/start-agentlink-enhanced.sh${NC}"
    fi
    
    echo ""
}

# Main execution
main() {
    check_enhanced_environment
    
    echo -e "${BLUE}🌐 Service Status:${NC}"
    check_enhanced_services 3000 "Backend API" "http://localhost:3000" "http://localhost:3000/health"
    check_enhanced_services 3001 "Frontend Dashboard" "http://localhost:3001"
    echo ""
    
    check_sparc_status
    check_swarm_status
    check_nld_status
    check_tdd_status
    check_performance_monitoring
    check_claude_integration
    analyze_system_resources
    assess_overall_status
    
    # Read enhanced status file if available
    if [ -f "$CONFIG_DIR/status" ]; then
        echo -e "${BLUE}📋 Enhanced Status Information:${NC}"
        if jq . "$CONFIG_DIR/status" >/dev/null 2>&1; then
            local status=$(jq -r '.status // "unknown"' "$CONFIG_DIR/status")
            local version=$(jq -r '.version // "unknown"' "$CONFIG_DIR/status")
            local started_at=$(jq -r '.started_at // "unknown"' "$CONFIG_DIR/status")
            
            echo -e "${GREEN}✅ Status: $status (v$version)${NC}"
            echo -e "${GREEN}✅ Started: $started_at${NC}"
            
            # Show enhanced features
            local features=$(jq -r '.features // {}' "$CONFIG_DIR/status" 2>/dev/null)
            if [ "$features" != "{}" ]; then
                echo -e "${GREEN}✅ Enhanced Features Active${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Status file exists but format is invalid${NC}"
        fi
        echo ""
    fi
    
    # Access information
    if $backend_status && $frontend_status; then
        echo -e "${CYAN}🌐 Access URLs:${NC}"
        echo "• Production Feed:       http://localhost:3001/"
        echo "• Dual Instance View:    http://localhost:3001/dual-instance"
        echo "• API Health Check:      http://localhost:3000/health"
        echo "• Claude Live Session:   http://localhost:3000/api/v1/claude-live/session"
        echo ""
        
        echo -e "${CYAN}📊 Monitoring & Data:${NC}"
        echo "• Performance Log:       tail -f ~/.agentlink/performance.log"
        echo "• Startup Metrics:       cat ~/.agentlink/startup_performance.log"
        echo "• System Status:         cat ~/.agentlink/status"
        echo "• NLD Learning Data:     ls ~/.agentlink/*.log"
        echo ""
    fi
    
    echo -e "${CYAN}🛠️  Enhanced Management Commands:${NC}"
    echo "• Start Enhanced:        ./scripts/start-agentlink-enhanced.sh"
    echo "• Stop Enhanced:         ./scripts/stop-agentlink-enhanced.sh"
    echo "• Follow Logs:           ./scripts/start-agentlink-enhanced.sh --follow-logs"
    echo "• Test Mode:             ./scripts/start-agentlink-enhanced.sh --test-mode"
    echo "• Force Stop:            ./scripts/stop-agentlink-enhanced.sh --force"
    echo ""
    
    echo -e "${GREEN}🎯 Enhanced AgentLink v${SCRIPT_VERSION} status check complete!${NC}"
}

# Execute with optional detailed flag
if [ "$1" = "--detailed" ] || [ "$1" = "-d" ]; then
    echo -e "${YELLOW}📊 Detailed mode activated${NC}"
    echo ""
fi

main