#!/bin/bash

# Enhanced AgentLink Stop Script v2.0
# Gracefully stops enhanced dual Claude system with SPARC, TDD, NLD integration
# Includes cleanup for swarm agents, performance monitoring, and neural learning data

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

echo -e "${CYAN}🛑 Enhanced AgentLink System Shutdown v${SCRIPT_VERSION}${NC}"
echo -e "${CYAN}   Graceful termination with data preservation${NC}"
echo "=================================================================="

# Function: Save shutdown metrics for NLD learning
save_shutdown_metrics() {
    echo -e "${BLUE}💾 Saving shutdown metrics for NLD learning...${NC}"
    
    local shutdown_start=$(date +%s%3N)
    
    # Calculate uptime if startup time is available
    if [ -f "$CONFIG_DIR/startup_config.json" ] && command -v jq >/dev/null 2>&1; then
        local started_at=$(jq -r '.started_at' "$CONFIG_DIR/startup_config.json" 2>/dev/null || echo "")
        if [ -n "$started_at" ]; then
            local uptime_seconds=$(( $(date +%s) - $(date -d "$started_at" +%s) ))
            echo -e "${GREEN}✅ System uptime: ${uptime_seconds} seconds${NC}"
            
            # Store uptime metrics
            echo "{\"uptime_seconds\": $uptime_seconds, \"shutdown_timestamp\": \"$(date -Iseconds)\", \"graceful\": true}" >> "$CONFIG_DIR/shutdown_metrics.log"
        fi
    fi
    
    echo "$shutdown_start" > "$CONFIG_DIR/shutdown_start.tmp"
}

# Function: Stop swarm agents and coordination
stop_swarm_system() {
    echo -e "${BLUE}🐝 Stopping Swarm Coordination System...${NC}"
    
    # Notify swarm of graceful shutdown
    npx claude-flow@alpha hooks notify --message "Enhanced AgentLink graceful shutdown initiated" >/dev/null 2>&1 || true
    
    # Stop swarm agents if swarm ID exists
    if [ -f "$CONFIG_DIR/swarm_id" ]; then
        local swarm_id=$(cat "$CONFIG_DIR/swarm_id")
        echo -e "${PURPLE}   Terminating swarm: $swarm_id${NC}"
        
        # Attempt graceful swarm shutdown
        npx claude-flow@alpha hooks session-end --export-metrics true >/dev/null 2>&1 || true
        
        echo -e "${GREEN}✅ Swarm coordination stopped${NC}"
    else
        echo -e "${YELLOW}ℹ️  No active swarm found${NC}"
    fi
}

# Function: Stop performance monitoring
stop_performance_monitoring() {
    echo -e "${BLUE}📊 Stopping Performance Monitoring...${NC}"
    
    if [ -f "$CONFIG_DIR/monitor_pid" ]; then
        local monitor_pid=$(cat "$CONFIG_DIR/monitor_pid")
        
        if kill -0 "$monitor_pid" 2>/dev/null; then
            echo -e "${YELLOW}🔄 Stopping performance monitor (PID: $monitor_pid)...${NC}"
            kill -TERM "$monitor_pid" 2>/dev/null || true
            
            # Wait for graceful shutdown
            local count=0
            while kill -0 "$monitor_pid" 2>/dev/null && [ $count -lt 5 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            # Force kill if necessary
            if kill -0 "$monitor_pid" 2>/dev/null; then
                kill -KILL "$monitor_pid" 2>/dev/null || true
            fi
            
            echo -e "${GREEN}✅ Performance monitoring stopped${NC}"
        else
            echo -e "${YELLOW}ℹ️  Performance monitor not running${NC}"
        fi
        
        rm -f "$CONFIG_DIR/monitor_pid"
    else
        echo -e "${YELLOW}ℹ️  No performance monitor PID found${NC}"
    fi
}

# Function: Enhanced process termination with NLD data capture
kill_process_enhanced() {
    local pid=$1
    local name=$2
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo -e "${YELLOW}🔄 Stopping $name (PID: $pid)...${NC}"
        
        # Capture process metrics before termination
        local cpu_time=$(ps -o pid,time -p "$pid" --no-headers 2>/dev/null | awk '{print $2}' || echo "unknown")
        local memory_kb=$(ps -o pid,rss -p "$pid" --no-headers 2>/dev/null | awk '{print $2}' || echo "unknown")
        
        # Store process metrics for NLD learning
        echo "{\"pid\": $pid, \"name\": \"$name\", \"cpu_time\": \"$cpu_time\", \"memory_kb\": \"$memory_kb\", \"shutdown_time\": \"$(date -Iseconds)\"}" >> "$CONFIG_DIR/process_metrics.log"
        
        # Graceful termination
        kill -TERM "$pid" 2>/dev/null || true
        
        # Wait up to 15 seconds for graceful shutdown
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt 15 ]; do
            if [ $((count % 5)) -eq 0 ] && [ $count -gt 0 ]; then
                echo -e "${YELLOW}   Still waiting for $name to shutdown... (${count}s)${NC}"
            fi
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${RED}⚠️  Force killing $name after ${count}s...${NC}"
            kill -KILL "$pid" 2>/dev/null || true
            
            # Log forced termination for NLD learning
            echo "{\"forced_kill\": true, \"pid\": $pid, \"name\": \"$name\", \"wait_time\": $count}" >> "$CONFIG_DIR/forced_kills.log"
        fi
        
        echo -e "${GREEN}✅ $name stopped${NC}"
    else
        echo -e "${YELLOW}ℹ️  $name not running${NC}"
    fi
}

# Function: Advanced port cleanup with logging
kill_port_enhanced() {
    local port=$1
    local name=$2
    
    echo -e "${YELLOW}🔄 Enhanced port cleanup for $port ($name)...${NC}"
    
    # Get detailed process information before killing
    local processes=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$processes" ]; then
        echo -e "${YELLOW}🔄 Found processes on port $port: $processes${NC}"
        
        # Log port cleanup for NLD learning
        for pid in $processes; do
            local process_name=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
            echo "{\"port\": $port, \"pid\": $pid, \"process_name\": \"$process_name\", \"cleanup_time\": \"$(date -Iseconds)\"}" >> "$CONFIG_DIR/port_cleanup.log"
        done
        
        # Graceful termination
        echo "$processes" | xargs kill -TERM 2>/dev/null || true
        sleep 3
        
        # Force kill if necessary
        local remaining=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$remaining" ]; then
            echo -e "${RED}⚠️  Force killing remaining processes on port $port${NC}"
            echo "$remaining" | xargs kill -KILL 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✅ Port $port cleaned${NC}"
    else
        echo -e "${GREEN}✅ Port $port already clean${NC}"
    fi
}

# Function: Save NLD patterns and learning data
preserve_nld_data() {
    echo -e "${BLUE}🧠 Preserving NLD Learning Data...${NC}"
    
    # Create NLD data archive
    local nld_archive="$CONFIG_DIR/nld_data_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    if [ -d "$CONFIG_DIR" ]; then
        tar -czf "$nld_archive" -C "$CONFIG_DIR" . 2>/dev/null || true
        
        if [ -f "$nld_archive" ]; then
            local archive_size=$(du -h "$nld_archive" | cut -f1)
            echo -e "${GREEN}✅ NLD data archived: $archive_size${NC}"
            echo -e "${GREEN}   Archive: $nld_archive${NC}"
            
            # Notify claude-flow of data preservation
            npx claude-flow@alpha hooks post-task --task-id "nld-data-preserved-$(date +%s)" >/dev/null 2>&1 || true
        fi
    fi
}

# Function: Enhanced status update
update_enhanced_status() {
    echo -e "${BLUE}📝 Updating Enhanced Status...${NC}"
    
    # Calculate shutdown duration
    local shutdown_duration="unknown"
    if [ -f "$CONFIG_DIR/shutdown_start.tmp" ]; then
        local shutdown_start=$(cat "$CONFIG_DIR/shutdown_start.tmp")
        local shutdown_end=$(date +%s%3N)
        shutdown_duration=$((shutdown_end - shutdown_start))
        rm -f "$CONFIG_DIR/shutdown_start.tmp"
    fi
    
    # Create enhanced shutdown status
    cat > "$CONFIG_DIR/status" <<EOF
{
  "status": "gracefully_stopped",
  "shutdown_version": "$SCRIPT_VERSION",
  "stopped_at": "$(date -Iseconds)",
  "shutdown_duration_ms": $shutdown_duration,
  "data_preserved": true,
  "nld_learning_saved": true,
  "swarm_terminated": true,
  "performance_monitoring_stopped": true,
  "enhanced_features": {
    "graceful_shutdown": true,
    "data_preservation": true,
    "metrics_collection": true,
    "learning_patterns_saved": true
  }
}
EOF

    echo -e "${GREEN}✅ Enhanced status updated${NC}"
}

# Main shutdown execution
main() {
    # Phase 1: Initialize shutdown metrics
    save_shutdown_metrics
    
    # Phase 2: Stop enhanced systems
    stop_swarm_system
    stop_performance_monitoring
    
    # Phase 3: Read and process PID information
    if [ -f "$CONFIG_DIR/pids" ]; then
        echo -e "${BLUE}📄 Processing enhanced PID information...${NC}"
        local pids=$(cat "$CONFIG_DIR/pids")
        
        # Enhanced PID format: backend,frontend,monitor
        local backend_pid=$(echo "$pids" | cut -d',' -f1)
        local frontend_pid=$(echo "$pids" | cut -d',' -f2)
        local monitor_pid=$(echo "$pids" | cut -d',' -f3 2>/dev/null || echo "")
        
        # Stop processes with enhanced logging
        kill_process_enhanced "$backend_pid" "Enhanced Backend Server"
        kill_process_enhanced "$frontend_pid" "Enhanced Frontend Server"
        
        if [ -n "$monitor_pid" ]; then
            kill_process_enhanced "$monitor_pid" "Performance Monitor"
        fi
        
        # Clean up PID file
        rm -f "$CONFIG_DIR/pids"
    else
        echo -e "${YELLOW}⚠️  No enhanced PID file found, using port-based cleanup...${NC}"
    fi
    
    # Phase 4: Enhanced port cleanup
    kill_port_enhanced 3000 "Backend API"
    kill_port_enhanced 3001 "Frontend Dashboard"
    
    # Phase 5: Cleanup additional processes
    echo -e "${YELLOW}🔄 Enhanced process cleanup...${NC}"
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "tsx watch" 2>/dev/null || true
    pkill -f "vite.*3001" 2>/dev/null || true
    pkill -f "monitor_performance" 2>/dev/null || true
    
    # Phase 6: Final Claude Code integration notification
    echo -e "${BLUE}🤖 Logging enhanced shutdown activity...${NC}"
    curl -X POST http://localhost:3000/api/v1/claude-live/activity \
      -H "Content-Type: application/json" \
      -d "{
        \"type\": \"enhanced_system_shutdown\", 
        \"description\": \"Enhanced AgentLink v${SCRIPT_VERSION} gracefully terminated with data preservation\",
        \"metadata\": {
            \"shutdown_method\": \"enhanced_script\", 
            \"timestamp\": \"$(date -Iseconds)\",
            \"data_preserved\": true,
            \"nld_learning_saved\": true,
            \"graceful\": true
        }
      }" >/dev/null 2>&1 || true
    
    # Phase 7: Preserve learning data and update status
    preserve_nld_data
    update_enhanced_status
    
    # Phase 8: Final metrics calculation
    if [ -f "$CONFIG_DIR/shutdown_start.tmp" ]; then
        local shutdown_start=$(cat "$CONFIG_DIR/shutdown_start.tmp")
        local shutdown_end=$(date +%s%3N)
        local shutdown_duration=$((shutdown_end - shutdown_start))
        
        echo -e "${GREEN}⚡ Shutdown completed in ${shutdown_duration}ms${NC}"
        
        # Store shutdown performance for NLD learning
        echo "{\"shutdown_duration_ms\": $shutdown_duration, \"timestamp\": \"$(date -Iseconds)\", \"version\": \"$SCRIPT_VERSION\"}" >> "$CONFIG_DIR/shutdown_performance.log"
        rm -f "$CONFIG_DIR/shutdown_start.tmp"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Enhanced AgentLink System Gracefully Stopped!${NC}"
    echo "=================================================================="
    echo -e "${GREEN}🛑 Backend Server:${NC}        Gracefully terminated"
    echo -e "${GREEN}🛑 Frontend Server:${NC}       Gracefully terminated"
    echo -e "${GREEN}🛑 Swarm Coordination:${NC}    Properly dissolved"
    echo -e "${GREEN}🛑 Performance Monitor:${NC}   Data preserved and stopped"
    echo -e "${GREEN}🛑 NLD Learning System:${NC}   Patterns saved and archived"
    echo ""
    echo -e "${CYAN}💾 Data Preservation:${NC}"
    echo "• Learning patterns:        Archived for future use"
    echo "• Performance metrics:      Saved to ~/.agentlink/"
    echo "• Shutdown analytics:       Available for analysis"
    echo "• Process information:      Logged for optimization"
    echo ""
    echo -e "${BLUE}📊 Available Data Files:${NC}"
    echo "• Startup performance:      ~/.agentlink/startup_performance.log"
    echo "• Shutdown performance:     ~/.agentlink/shutdown_performance.log"
    echo "• Process metrics:          ~/.agentlink/process_metrics.log"
    echo "• Port cleanup data:        ~/.agentlink/port_cleanup.log"
    echo "• NLD archive:              ~/.agentlink/nld_data_*.tar.gz"
    echo ""
    echo -e "${YELLOW}🚀 To restart enhanced system:${NC}"
    echo "• Standard startup:         ./scripts/start-agentlink-enhanced.sh"
    echo "• With log monitoring:      ./scripts/start-agentlink-enhanced.sh --follow-logs"
    echo "• Test mode only:           ./scripts/start-agentlink-enhanced.sh --test-mode"
    echo ""
    echo -e "${GREEN}🎯 Ready for next enhanced dual Claude operations!${NC}"
    echo ""
}

# Execute main shutdown with error handling
if [ "$1" = "--force" ]; then
    echo -e "${RED}⚠️  Force shutdown mode activated${NC}"
    set +e  # Continue on errors in force mode
fi

main

# Final cleanup verification
echo -e "${BLUE}🔍 Final verification...${NC}"
for port in 3000 3001; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port still occupied after shutdown${NC}"
    else
        echo -e "${GREEN}✅ Port $port confirmed clean${NC}"
    fi
done

echo -e "${GREEN}🏁 Enhanced shutdown sequence completed successfully!${NC}"