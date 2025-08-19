#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/workspaces/agent-feed"
LOGS_DIR="$PROJECT_ROOT/logs"

# Ensure logs directory exists
mkdir -p "$LOGS_DIR"

# Function to print colored output
print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# Function to check if instance is running
is_running() {
    local port=$1
    local pid_file="$2"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            if netstat -tlnp 2>/dev/null | grep -q ":$port.*$pid/"; then
                return 0
            fi
        fi
        rm -f "$pid_file"
    fi
    return 1
}

# Function to start an instance
start_instance() {
    local instance=$1
    local port=$2
    local config_file=$3
    local env_file=$4
    
    local pid_file="$LOGS_DIR/claude-$instance.pid"
    local log_file="$LOGS_DIR/claude-$instance.log"
    
    if is_running "$port" "$pid_file"; then
        print_warning "$instance instance already running on port $port"
        return 0
    fi
    
    print_info "Starting $instance instance on port $port..."
    
    # Source environment
    if [ -f "$env_file" ]; then
        source "$env_file"
    fi
    
    # Start Claude Code instance
    cd "$PROJECT_ROOT"
    nohup claude code --config-file "$config_file" --port "$port" > "$log_file" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid" > "$pid_file"
    
    # Wait a moment and verify it started
    sleep 3
    if is_running "$port" "$pid_file"; then
        print_status "$instance instance started successfully (PID: $pid)"
        return 0
    else
        print_error "Failed to start $instance instance"
        return 1
    fi
}

# Function to stop an instance
stop_instance() {
    local instance=$1
    local pid_file="$LOGS_DIR/claude-$instance.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            print_info "Stopping $instance instance (PID: $pid)..."
            kill -TERM "$pid"
            
            # Wait for graceful shutdown
            local count=0
            while kill -0 "$pid" 2>/dev/null && [ $count -lt 30 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                print_warning "Force killing $instance instance..."
                kill -KILL "$pid"
            fi
            
            rm -f "$pid_file"
            print_status "$instance instance stopped"
        else
            print_warning "$instance instance was not running"
            rm -f "$pid_file"
        fi
    else
        print_warning "$instance instance PID file not found"
    fi
}

# Function to get instance status
get_status() {
    local instance=$1
    local port=$2
    local pid_file="$LOGS_DIR/claude-$instance.pid"
    
    if is_running "$port" "$pid_file"; then
        local pid=$(cat "$pid_file")
        local memory=$(ps -o rss= -p "$pid" 2>/dev/null | awk '{print int($1/1024)"MB"}')
        echo -e "${GREEN}●${NC} $instance: Running on port $port (PID: $pid, Memory: $memory)"
        
        # Check agent count if possible
        local agent_count=$(curl -s "http://localhost:$port/agents/count" 2>/dev/null | jq -r '.count // "N/A"')
        echo "  Agents: $agent_count"
    else
        echo -e "${RED}●${NC} $instance: Stopped"
    fi
}

# Function to show logs
show_logs() {
    local instance=$1
    local lines=${2:-50}
    local log_file="$LOGS_DIR/claude-$instance.log"
    
    if [ -f "$log_file" ]; then
        echo -e "${BLUE}Last $lines lines from $instance instance:${NC}"
        tail -n "$lines" "$log_file"
    else
        print_warning "No log file found for $instance instance"
    fi
}

# Function to monitor instances
monitor_instances() {
    local interval=${1:-10}
    
    echo -e "${BLUE}Monitoring Claude Code instances (refresh every ${interval}s)...${NC}"
    echo "Press Ctrl+C to stop monitoring"
    
    while true; do
        clear
        echo "=== Claude Code Dual Instance Monitor ==="
        echo "$(date)"
        echo ""
        
        get_status "development" "8080"
        echo ""
        get_status "production" "8090"
        echo ""
        
        # Show AgentLink status
        if curl -s http://localhost:3001 > /dev/null 2>&1; then
            echo -e "${GREEN}●${NC} AgentLink: Running on port 3001"
        else
            echo -e "${RED}●${NC} AgentLink: Not responding"
        fi
        
        # Show backend API status
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            echo -e "${GREEN}●${NC} Backend API: Running on port 3000"
        else
            echo -e "${RED}●${NC} Backend API: Not responding"
        fi
        
        sleep "$interval"
    done
}

# Function to check health
health_check() {
    echo -e "${BLUE}=== Claude Code Instance Health Check ===${NC}"
    
    # Development instance
    print_info "Checking development instance (port 8080)..."
    if is_running "8080" "$LOGS_DIR/claude-dev.pid"; then
        if curl -s http://localhost:8080/health > /dev/null 2>&1; then
            print_status "Development instance healthy"
        else
            print_warning "Development instance running but not responding to health checks"
        fi
    else
        print_error "Development instance not running"
    fi
    
    # Production instance
    print_info "Checking production instance (port 8090)..."
    if is_running "8090" "$LOGS_DIR/claude-prod.pid"; then
        if curl -s http://localhost:8090/health > /dev/null 2>&1; then
            print_status "Production instance healthy"
        else
            print_warning "Production instance running but not responding to health checks"
        fi
    else
        print_error "Production instance not running"
    fi
    
    # AgentLink frontend
    print_info "Checking AgentLink frontend (port 3001)..."
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        print_status "AgentLink frontend responding"
    else
        print_error "AgentLink frontend not responding"
    fi
    
    # Backend API
    print_info "Checking backend API (port 3000)..."
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        print_status "Backend API responding"
    else
        print_error "Backend API not responding"
    fi
}

# Function to list agents
list_agents() {
    local instance=${1:-"all"}
    
    if [ "$instance" = "all" ] || [ "$instance" = "dev" ]; then
        echo -e "${BLUE}=== Development Instance Agents ===${NC}"
        if is_running "8080" "$LOGS_DIR/claude-dev.pid"; then
            curl -s http://localhost:8080/agents 2>/dev/null | jq -r '.agents[]? | "• \(.name) (\(.status))"' || echo "No agent data available"
        else
            print_error "Development instance not running"
        fi
        echo ""
    fi
    
    if [ "$instance" = "all" ] || [ "$instance" = "prod" ]; then
        echo -e "${BLUE}=== Production Instance Agents ===${NC}"
        if is_running "8090" "$LOGS_DIR/claude-prod.pid"; then
            curl -s http://localhost:8090/agents 2>/dev/null | jq -r '.agents[]? | "• \(.name) (\(.status))"' || echo "No agent data available"
        else
            print_error "Production instance not running"
        fi
    fi
}

# Main command handling
case "${1:-help}" in
    "start")
        case "${2:-all}" in
            "dev"|"development")
                start_instance "development" "8080" ".claude-dev" ".env.dev"
                ;;
            "prod"|"production")
                start_instance "production" "8090" ".claude-prod" ".env.prod"
                ;;
            "all")
                start_instance "development" "8080" ".claude-dev" ".env.dev"
                start_instance "production" "8090" ".claude-prod" ".env.prod"
                ;;
            *)
                print_error "Invalid instance: $2. Use 'dev', 'prod', or 'all'"
                exit 1
                ;;
        esac
        ;;
        
    "stop")
        case "${2:-all}" in
            "dev"|"development")
                stop_instance "development"
                ;;
            "prod"|"production")
                stop_instance "production"
                ;;
            "all")
                stop_instance "development"
                stop_instance "production"
                ;;
            *)
                print_error "Invalid instance: $2. Use 'dev', 'prod', or 'all'"
                exit 1
                ;;
        esac
        ;;
        
    "restart")
        instance=${2:-all}
        $0 stop "$instance"
        sleep 2
        $0 start "$instance"
        ;;
        
    "status")
        echo -e "${BLUE}=== Claude Code Instance Status ===${NC}"
        get_status "development" "8080"
        echo ""
        get_status "production" "8090"
        ;;
        
    "logs")
        instance=${2:-all}
        lines=${3:-50}
        
        if [ "$instance" = "all" ]; then
            show_logs "development" "$lines"
            echo ""
            show_logs "production" "$lines"
        else
            show_logs "$instance" "$lines"
        fi
        ;;
        
    "monitor")
        monitor_instances "${2:-10}"
        ;;
        
    "health")
        health_check
        ;;
        
    "agents")
        list_agents "${2:-all}"
        ;;
        
    "help"|*)
        echo -e "${BLUE}Claude Code Dual Instance Manager${NC}"
        echo "=================================="
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  start [dev|prod|all]     Start instance(s)"
        echo "  stop [dev|prod|all]      Stop instance(s)"
        echo "  restart [dev|prod|all]   Restart instance(s)"
        echo "  status                   Show instance status"
        echo "  logs [dev|prod|all] [lines] Show logs (default: 50 lines)"
        echo "  monitor [interval]       Monitor instances (default: 10s)"
        echo "  health                   Run health checks"
        echo "  agents [dev|prod|all]    List active agents"
        echo "  help                     Show this help"
        echo ""
        echo "Examples:"
        echo "  $0 start all             Start both instances"
        echo "  $0 stop dev              Stop development instance"
        echo "  $0 logs prod 100         Show last 100 lines from production logs"
        echo "  $0 monitor 5             Monitor with 5-second refresh"
        ;;
esac