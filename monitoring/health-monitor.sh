#!/bin/bash

# Health Monitoring Script for Claude Code + AgentLink Production
# Monitors system health and sends alerts for issues

set -e

# Configuration
HEALTH_CHECK_INTERVAL=60  # seconds
API_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:3000"
ALERT_WEBHOOK="${ALERT_WEBHOOK_URL}"
LOG_FILE="/var/log/agent-feed-health.log"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Send alert function
send_alert() {
    local severity="$1"
    local message="$2"
    
    log "ALERT [$severity]: $message"
    
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"🚨 Agent Feed Alert [$severity]: $message\"}" \
            &> /dev/null || true
    fi
}

# Check API health
check_api_health() {
    local response
    local status_code
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_URL/health" 2>/dev/null || echo "HTTPSTATUS:000")
    status_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    
    if [ "$status_code" != "200" ]; then
        send_alert "CRITICAL" "API health check failed (status: $status_code)"
        return 1
    fi
    
    # Check response content
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    if ! echo "$body" | jq -e '.status == "healthy"' &> /dev/null; then
        send_alert "WARNING" "API reports unhealthy status"
        return 1
    fi
    
    return 0
}

# Check frontend health
check_frontend_health() {
    local status_code
    
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
    
    if [ "$status_code" != "200" ]; then
        send_alert "CRITICAL" "Frontend health check failed (status: $status_code)"
        return 1
    fi
    
    return 0
}

# Check container health
check_container_health() {
    local containers=("agent-feed-api-prod" "agent-feed-postgres-prod" "agent-feed-redis-prod" "agent-feed-frontend-prod")
    local unhealthy_containers=()
    
    for container in "${containers[@]}"; do
        if ! docker ps | grep -q "$container.*Up"; then
            unhealthy_containers+=("$container")
        fi
    done
    
    if [ ${#unhealthy_containers[@]} -gt 0 ]; then
        send_alert "CRITICAL" "Containers not running: ${unhealthy_containers[*]}"
        return 1
    fi
    
    return 0
}

# Check database connectivity
check_database_health() {
    if ! docker exec agent-feed-postgres-prod pg_isready -U agent_user -d agent_feed_prod &> /dev/null; then
        send_alert "CRITICAL" "Database connectivity check failed"
        return 1
    fi
    
    return 0
}

# Check Redis connectivity
check_redis_health() {
    if ! docker exec agent-feed-redis-prod redis-cli ping | grep -q "PONG"; then
        send_alert "CRITICAL" "Redis connectivity check failed"
        return 1
    fi
    
    return 0
}

# Check system resources
check_system_resources() {
    # Check disk usage
    local disk_usage
    disk_usage=$(df /var/lib/docker | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt 85 ]; then
        send_alert "WARNING" "High disk usage: ${disk_usage}%"
    fi
    
    # Check memory usage
    local memory_usage
    memory_usage=$(free | awk 'NR==2 {printf "%.0f", $3*100/$2}')
    
    if [ "$memory_usage" -gt 90 ]; then
        send_alert "WARNING" "High memory usage: ${memory_usage}%"
    fi
    
    # Check container memory usage
    local container_memory
    container_memory=$(docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}" | grep agent-feed | awk '{print $2}' | grep -o '[0-9.]*G' | head -1 | sed 's/G//')
    
    if [ -n "$container_memory" ] && (( $(echo "$container_memory > 1.8" | bc -l) )); then
        send_alert "WARNING" "High container memory usage: ${container_memory}GB"
    fi
}

# Check Claude Flow health
check_claude_flow_health() {
    local swarm_status
    swarm_status=$(curl -s "$API_URL/api/claude-flow/swarm/status" 2>/dev/null || echo "{}")
    
    if ! echo "$swarm_status" | jq -e 'has("swarmId")' &> /dev/null; then
        send_alert "INFO" "Claude Flow swarm not initialized (normal if not in use)"
        return 0
    fi
    
    # Check for failed agents
    local failed_agents
    failed_agents=$(echo "$swarm_status" | jq -r '.failedAgents // 0')
    
    if [ "$failed_agents" -gt 0 ]; then
        send_alert "WARNING" "Claude Flow has $failed_agents failed agents"
    fi
    
    return 0
}

# Main health check function
run_health_checks() {
    local failed_checks=0
    
    log "Starting health checks..."
    
    if ! check_container_health; then
        ((failed_checks++))
    fi
    
    if ! check_api_health; then
        ((failed_checks++))
    fi
    
    if ! check_frontend_health; then
        ((failed_checks++))
    fi
    
    if ! check_database_health; then
        ((failed_checks++))
    fi
    
    if ! check_redis_health; then
        ((failed_checks++))
    fi
    
    check_system_resources
    check_claude_flow_health
    
    if [ $failed_checks -eq 0 ]; then
        log "All health checks passed"
    else
        log "Health checks completed with $failed_checks failures"
    fi
    
    return $failed_checks
}

# Main loop
main() {
    log "Starting Agent Feed health monitoring service"
    
    while true; do
        run_health_checks
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Handle signals
trap 'log "Health monitoring service stopped"; exit 0' SIGTERM SIGINT

# Run main function
main