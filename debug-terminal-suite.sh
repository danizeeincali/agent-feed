#!/bin/bash

# Terminal Input Debug Suite
# Comprehensive debugging script for terminal input issues

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/debug-terminal.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        error "Run this script from the project root directory"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log "Installing backend dependencies..."
    
    # Check if socket.io is installed
    if ! npm list socket.io &> /dev/null; then
        log "Installing socket.io..."
        npm install socket.io
    fi
    
    success "Backend dependencies ready"
}

# Start backend debug server
start_backend_server() {
    log "Starting debug backend server..."
    
    if [ -f "$SCRIPT_DIR/debug-terminal-backend.js" ]; then
        # Kill any existing server on port 3001
        if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null; then
            warning "Port 3001 is in use, attempting to free it..."
            kill -9 $(lsof -Pi :3001 -sTCP:LISTEN -t) 2>/dev/null || true
            sleep 2
        fi
        
        log "Starting debug server on port 3001..."
        node "$SCRIPT_DIR/debug-terminal-backend.js" &
        BACKEND_PID=$!
        
        # Wait for server to start
        sleep 3
        
        if kill -0 $BACKEND_PID 2>/dev/null; then
            success "Debug backend server started (PID: $BACKEND_PID)"
        else
            error "Failed to start debug backend server"
            exit 1
        fi
    else
        error "Debug backend server script not found"
        exit 1
    fi
}

# Start frontend development server
start_frontend_server() {
    log "Starting frontend development server..."
    
    cd frontend
    
    # Install frontend dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "Installing frontend dependencies..."
        npm install
    fi
    
    # Start frontend server
    log "Starting frontend server..."
    npm start &
    FRONTEND_PID=$!
    
    cd ..
    
    # Wait for frontend to start
    sleep 10
    
    success "Frontend server started (PID: $FRONTEND_PID)"
}

# Open browser windows
open_browsers() {
    log "Opening debug pages in browser..."
    
    # XTerm isolation test
    if [ -f "$SCRIPT_DIR/debug-xterm-test.html" ]; then
        log "Opening XTerm isolation test..."
        if command -v open &> /dev/null; then
            open "$SCRIPT_DIR/debug-xterm-test.html"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "$SCRIPT_DIR/debug-xterm-test.html"
        else
            warning "Could not auto-open XTerm test. Open manually: $SCRIPT_DIR/debug-xterm-test.html"
        fi
    fi
    
    # Frontend debug page
    sleep 5
    log "Opening React debug page..."
    if command -v open &> /dev/null; then
        open "http://localhost:3000/terminal-debug"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:3000/terminal-debug"
    else
        warning "Could not auto-open React debug page. Open manually: http://localhost:3000/terminal-debug"
    fi
}

# Monitor processes
monitor_processes() {
    log "Monitoring debug processes..."
    log "Backend PID: ${BACKEND_PID:-'Not started'}"
    log "Frontend PID: ${FRONTEND_PID:-'Not started'}"
    
    # Show process status
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        success "Backend server is running"
    else
        error "Backend server is not running"
    fi
    
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        success "Frontend server is running"
    else
        error "Frontend server is not running"
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up processes..."
    
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        log "Stopping backend server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
    fi
    
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        log "Stopping frontend server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
    fi
    
    # Kill any remaining processes on our ports
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null; then
        warning "Cleaning up remaining processes on port 3001..."
        kill -9 $(lsof -Pi :3001 -sTCP:LISTEN -t) 2>/dev/null || true
    fi
    
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null; then
        warning "Cleaning up remaining processes on port 3000..."
        kill -9 $(lsof -Pi :3000 -sTCP:LISTEN -t) 2>/dev/null || true
    fi
    
    success "Cleanup completed"
}

# Print instructions
print_instructions() {
    cat << EOF

${GREEN}🐛 Terminal Debug Suite Started Successfully!${NC}

${BLUE}Debug Tools Available:${NC}

1. ${YELLOW}XTerm.js Isolation Test${NC}
   - Tests: Pure xterm.js functionality
   - Location: $SCRIPT_DIR/debug-xterm-test.html
   - Should open automatically in your browser

2. ${YELLOW}React Component Debug${NC}
   - Tests: React integration and WebSocket
   - URL: http://localhost:3000/terminal-debug
   - Should open automatically in your browser

3. ${YELLOW}Backend WebSocket Server${NC}
   - Tests: Server-side terminal handling
   - Console logs: Check this terminal for server logs
   - Port: 3001

${BLUE}Debug Process:${NC}

1. First, test XTerm isolation to verify basic keyboard capture
2. Then test React component integration and state management
3. Finally, verify WebSocket communication with backend server
4. Check browser dev tools (F12) for detailed console logs

${BLUE}Useful Commands:${NC}

- View server logs: tail -f $LOG_FILE
- Kill all processes: $0 --cleanup
- Restart suite: $0 --restart

${RED}Press Ctrl+C to stop all debug servers${NC}

EOF
}

# Handle command line arguments
case "${1:-}" in
    --cleanup)
        cleanup
        exit 0
        ;;
    --restart)
        cleanup
        sleep 2
        exec "$0"
        ;;
    --help|-h)
        echo "Terminal Debug Suite"
        echo "Usage: $0 [--cleanup|--restart|--help]"
        echo ""
        echo "Commands:"
        echo "  (no args)  Start debug suite"
        echo "  --cleanup  Stop all processes and cleanup"
        echo "  --restart  Restart the debug suite"
        echo "  --help     Show this help message"
        exit 0
        ;;
esac

# Set up signal handlers
trap cleanup EXIT
trap cleanup SIGINT
trap cleanup SIGTERM

# Main execution
main() {
    log "Starting Terminal Input Debug Suite"
    log "Log file: $LOG_FILE"
    
    check_prerequisites
    install_dependencies
    start_backend_server
    start_frontend_server
    sleep 5
    open_browsers
    monitor_processes
    print_instructions
    
    # Keep script running
    log "Debug suite is running. Press Ctrl+C to stop."
    
    while true; do
        sleep 10
        # Check if processes are still running
        if [ ! -z "$BACKEND_PID" ] && ! kill -0 $BACKEND_PID 2>/dev/null; then
            error "Backend server died unexpectedly"
            break
        fi
        if [ ! -z "$FRONTEND_PID" ] && ! kill -0 $FRONTEND_PID 2>/dev/null; then
            error "Frontend server died unexpectedly"
            break
        fi
    done
}

# Run main function
main

EOF