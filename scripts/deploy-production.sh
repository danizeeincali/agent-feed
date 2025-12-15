#!/bin/bash

# Production Deployment Script for Claude Code + AgentLink System
# Deploys the containerized system to production environment with health checks

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOYMENT_LOG="/tmp/deployment-$(date +%Y%m%d_%H%M%S).log"
BACKUP_DIR="/opt/agent-feed/backups"
COMPOSE_FILE="docker-compose.prod.yml"

# Default configuration
DOMAIN="${DOMAIN:-localhost}"
SSL_ENABLED="${SSL_ENABLED:-false}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-true}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    rm -f /tmp/health-check-* || true
}

trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
        exit 1
    fi
    
    # Check required tools
    local tools=("docker" "docker-compose" "curl" "jq")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        exit 1
    fi
    
    # Check available disk space (need at least 5GB)
    local available_space=$(df /opt | awk 'NR==2{print $4}')
    if [ "$available_space" -lt 5242880 ]; then  # 5GB in KB
        error "Insufficient disk space. Need at least 5GB, available: $(($available_space / 1024 / 1024))GB"
        exit 1
    fi
    
    # Check available memory (need at least 4GB)
    local total_memory=$(free -m | awk 'NR==2{print $2}')
    if [ "$total_memory" -lt 4096 ]; then
        warning "Low total memory. Available: ${total_memory}MB, recommended: 4GB+"
    fi
    
    success "Prerequisites check completed"
}

# Load environment configuration
load_environment() {
    log "Loading environment configuration..."
    
    # Create production environment file if it doesn't exist
    local env_file="$PROJECT_ROOT/.env.production"
    if [ ! -f "$env_file" ]; then
        log "Creating production environment file..."
        cat > "$env_file" << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=8080
FRONTEND_PORT=3000

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=agent_feed_prod
DB_USER=agent_user
DB_PASSWORD=\${DB_PASSWORD}
DB_SSL=true
DB_MAX_CONNECTIONS=20

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=\${REDIS_PASSWORD}

# JWT Configuration
JWT_SECRET=\${JWT_SECRET}
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Claude Flow Configuration
CLAUDE_FLOW_ENABLED=true
CLAUDE_FLOW_MAX_AGENTS=20
CLAUDE_FLOW_DEFAULT_TOPOLOGY=hierarchical

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://${DOMAIN}

# SSL Configuration
SSL_ENABLED=${SSL_ENABLED}
SSL_CERT_PATH=/etc/ssl/certs/agent-feed.crt
SSL_KEY_PATH=/etc/ssl/private/agent-feed.key

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/production.log

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30
EOF
        
        # Set secure permissions
        chmod 600 "$env_file"
        success "Production environment file created"
    fi
    
    # Load environment variables
    if [ -f "$env_file" ]; then
        set -a  # automatically export all variables
        source "$env_file"
        set +a
    fi
    
    # Verify required environment variables
    local required_vars=("DB_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    success "Environment configuration loaded"
}

# Create production docker-compose file
create_production_compose() {
    log "Creating production docker-compose configuration..."
    
    cat > "$PROJECT_ROOT/$COMPOSE_FILE" << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: agent-feed-postgres-prod
    environment:
      POSTGRES_DB: \${DB_NAME}
      POSTGRES_USER: \${DB_USER}
      POSTGRES_PASSWORD: \${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
      - ./backups:/backups
    networks:
      - agent-feed-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${DB_USER} -d \${DB_NAME}"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'

  redis:
    image: redis:7-alpine
    container_name: agent-feed-redis-prod
    command: redis-server --appendonly yes --requirepass \${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - agent-feed-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: agent-feed-api-prod
    environment:
      NODE_ENV: production
      PORT: 8080
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: \${DB_NAME}
      DB_USER: \${DB_USER}
      DB_PASSWORD: \${DB_PASSWORD}
      DB_SSL: true
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: \${REDIS_PASSWORD}
      JWT_SECRET: \${JWT_SECRET}
      JWT_EXPIRES_IN: 24h
      BCRYPT_ROUNDS: 12
      CLAUDE_FLOW_ENABLED: true
      CLAUDE_FLOW_MAX_AGENTS: 20
      LOG_LEVEL: info
      RATE_LIMIT_WINDOW_MS: 900000
      RATE_LIMIT_MAX_REQUESTS: 100
      CORS_ORIGIN: https://\${DOMAIN}
    ports:
      - "8080:8080"
    volumes:
      - ./logs:/app/logs
      - app_uploads:/app/uploads
    networks:
      - agent-feed-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
        reservations:
          memory: 1G
          cpus: '1.0'

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
      args:
        API_URL: https://\${DOMAIN}/api
    container_name: agent-feed-frontend-prod
    ports:
      - "3000:80"
    networks:
      - agent-feed-network
    depends_on:
      - api
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  nginx:
    image: nginx:alpine
    container_name: agent-feed-nginx-prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    networks:
      - agent-feed-network
    depends_on:
      - api
      - frontend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: agent-feed-prometheus-prod
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      - agent-feed-network
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  app_uploads:
    driver: local
  nginx_logs:
    driver: local
  prometheus_data:
    driver: local

networks:
  agent-feed-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/16
EOF
    
    success "Production docker-compose configuration created"
}

# Create nginx configuration
create_nginx_config() {
    log "Creating nginx configuration..."
    
    mkdir -p "$PROJECT_ROOT/nginx"
    
    cat > "$PROJECT_ROOT/nginx/nginx.conf" << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=auth:10m rate=5r/s;
    
    # Upstream backends
    upstream api_backend {
        server api:8080;
    }
    
    upstream frontend_backend {
        server frontend:80;
    }
    
    # HTTP server (redirect to HTTPS if SSL enabled)
    server {
        listen 80;
        server_name ${DOMAIN};
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
EOF

    if [ "$SSL_ENABLED" = "true" ]; then
        cat >> "$PROJECT_ROOT/nginx/nginx.conf" << EOF
        # Redirect HTTP to HTTPS
        location / {
            return 301 https://\$server_name\$request_uri;
        }
    }
    
    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name ${DOMAIN};
        
        # SSL configuration
        ssl_certificate /etc/nginx/ssl/agent-feed.crt;
        ssl_certificate_key /etc/nginx/ssl/agent-feed.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
        add_header Referrer-Policy "strict-origin-when-cross-origin";
        
EOF
    else
        cat >> "$PROJECT_ROOT/nginx/nginx.conf" << EOF
        # Security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
        add_header Referrer-Policy "strict-origin-when-cross-origin";
        
EOF
    fi

    cat >> "$PROJECT_ROOT/nginx/nginx.conf" << EOF
        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api_backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # Authentication routes with stricter rate limiting
        location /auth/ {
            limit_req zone=auth burst=10 nodelay;
            proxy_pass http://api_backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        # WebSocket support
        location /socket.io/ {
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        # Frontend application
        location / {
            proxy_pass http://frontend_backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
    }
}
EOF
    
    success "Nginx configuration created"
}

# Backup existing deployment
backup_existing() {
    if [ "$BACKUP_BEFORE_DEPLOY" = "false" ]; then
        log "Skipping backup (disabled)"
        return 0
    fi
    
    log "Creating backup of existing deployment..."
    
    mkdir -p "$BACKUP_DIR"
    local backup_name="agent-feed-backup-$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    # Create backup directory
    mkdir -p "$backup_path"
    
    # Backup database if running
    if docker-compose ps postgres | grep -q "Up"; then
        log "Backing up database..."
        docker-compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$backup_path/database.sql"
        success "Database backed up"
    fi
    
    # Backup volumes
    if docker volume ls | grep -q "agent-feed"; then
        log "Backing up volumes..."
        docker run --rm -v agent-feed_postgres_data:/data -v "$backup_path":/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .
        docker run --rm -v agent-feed_redis_data:/data -v "$backup_path":/backup alpine tar czf /backup/redis_data.tar.gz -C /data .
        success "Volumes backed up"
    fi
    
    # Save current docker-compose file
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        cp "$PROJECT_ROOT/docker-compose.yml" "$backup_path/"
    fi
    
    # Save current environment
    if [ -f "$PROJECT_ROOT/.env" ]; then
        cp "$PROJECT_ROOT/.env" "$backup_path/"
    fi
    
    # Create backup metadata
    cat > "$backup_path/metadata.json" << EOF
{
    "backup_date": "$(date -Iseconds)",
    "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "components": ["database", "volumes", "config"],
    "backup_path": "$backup_path"
}
EOF
    
    echo "$backup_path" > /tmp/latest_backup_path
    success "Backup created: $backup_path"
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    cd "$PROJECT_ROOT"
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Build application images
    log "Building application images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Stop existing services
    log "Stopping existing services..."
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    
    # Start services
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    success "Application deployed"
}

# Health checks
perform_health_checks() {
    log "Performing health checks..."
    
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / 10))
    local attempt=0
    
    # Check database
    log "Checking database health..."
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" &> /dev/null; then
            success "Database is healthy"
            break
        fi
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "Database health check failed"
        return 1
    fi
    
    # Check Redis
    log "Checking Redis health..."
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping &> /dev/null; then
            success "Redis is healthy"
            break
        fi
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "Redis health check failed"
        return 1
    fi
    
    # Check API
    log "Checking API health..."
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "http://localhost:8080/health" &> /dev/null; then
            success "API is healthy"
            break
        fi
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "API health check failed"
        return 1
    fi
    
    # Check frontend
    log "Checking frontend health..."
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "http://localhost:3000" &> /dev/null; then
            success "Frontend is healthy"
            break
        fi
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "Frontend health check failed"
        return 1
    fi
    
    # Comprehensive system test
    log "Running system integration test..."
    if ! curl -sf "http://localhost:8080/api/health" | jq -e '.status == "healthy"' &> /dev/null; then
        error "System integration test failed"
        return 1
    fi
    
    success "All health checks passed"
    return 0
}

# Rollback deployment
rollback_deployment() {
    if [ "$ROLLBACK_ON_FAILURE" = "false" ]; then
        error "Deployment failed but rollback is disabled"
        return 1
    fi
    
    local backup_path
    if [ -f /tmp/latest_backup_path ]; then
        backup_path=$(cat /tmp/latest_backup_path)
    else
        error "No backup path found for rollback"
        return 1
    fi
    
    if [ ! -d "$backup_path" ]; then
        error "Backup directory not found: $backup_path"
        return 1
    fi
    
    warning "Rolling back deployment..."
    
    # Stop current services
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    
    # Restore configuration files
    if [ -f "$backup_path/docker-compose.yml" ]; then
        cp "$backup_path/docker-compose.yml" "$PROJECT_ROOT/"
    fi
    
    if [ -f "$backup_path/.env" ]; then
        cp "$backup_path/.env" "$PROJECT_ROOT/"
    fi
    
    # Restore database
    if [ -f "$backup_path/database.sql" ]; then
        log "Restoring database..."
        docker-compose up -d postgres
        sleep 30
        docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" < "$backup_path/database.sql"
    fi
    
    # Start services with old configuration
    docker-compose up -d
    
    warning "Rollback completed"
    return 0
}

# Post-deployment tasks
post_deployment() {
    log "Running post-deployment tasks..."
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" exec -T api npm run migrate
    
    # Clear application caches
    log "Clearing caches..."
    docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli FLUSHALL
    
    # Restart services to ensure clean state
    log "Restarting services..."
    docker-compose -f "$COMPOSE_FILE" restart api frontend
    
    # Setup log rotation
    log "Setting up log rotation..."
    cat > /etc/logrotate.d/agent-feed << EOF
/opt/agent-feed/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f /opt/agent-feed/$COMPOSE_FILE restart api
    endscript
}
EOF
    
    # Setup monitoring alerts (if configured)
    if command -v systemctl &> /dev/null; then
        log "Setting up system monitoring..."
        cat > /etc/systemd/system/agent-feed-monitor.service << EOF
[Unit]
Description=Agent Feed Health Monitor
After=docker.service

[Service]
Type=simple
ExecStart=/opt/agent-feed/scripts/health-monitor.sh
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
EOF
        
        systemctl enable agent-feed-monitor.service
        systemctl start agent-feed-monitor.service
    fi
    
    success "Post-deployment tasks completed"
}

# Generate deployment report
generate_deployment_report() {
    log "Generating deployment report..."
    
    local report_file="/opt/agent-feed/deployment-report-$(date +%Y%m%d_%H%M%S).html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Agent Feed Deployment Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { border-left: 5px solid #4CAF50; }
        .info { border-left: 5px solid #2196F3; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Agent Feed Production Deployment Report</h1>
        <p><strong>Deployment Time:</strong> $(date)</p>
        <p><strong>Domain:</strong> $DOMAIN</p>
        <p><strong>SSL Enabled:</strong> $SSL_ENABLED</p>
    </div>
    
    <div class="section success">
        <h2>Deployment Status</h2>
        <p>✅ Deployment completed successfully</p>
        <p>✅ All health checks passed</p>
        <p>✅ Services are running and accessible</p>
    </div>
    
    <div class="section info">
        <h2>Service Information</h2>
        <pre>$(docker-compose -f "$COMPOSE_FILE" ps)</pre>
    </div>
    
    <div class="section info">
        <h2>System Resources</h2>
        <pre>$(docker stats --no-stream)</pre>
    </div>
    
    <div class="section info">
        <h2>Access URLs</h2>
        <ul>
            <li>Frontend: $([ "$SSL_ENABLED" = "true" ] && echo "https" || echo "http")://$DOMAIN</li>
            <li>API: $([ "$SSL_ENABLED" = "true" ] && echo "https" || echo "http")://$DOMAIN/api</li>
            <li>Health Check: $([ "$SSL_ENABLED" = "true" ] && echo "https" || echo "http")://$DOMAIN/health</li>
            <li>Monitoring: http://$DOMAIN:9090 (Prometheus)</li>
        </ul>
    </div>
</body>
</html>
EOF
    
    success "Deployment report generated: $report_file"
}

# Main deployment function
main() {
    log "Starting production deployment of Claude Code + AgentLink system"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --domain)
                DOMAIN="$2"
                shift 2
                ;;
            --ssl)
                SSL_ENABLED=true
                shift
                ;;
            --no-backup)
                BACKUP_BEFORE_DEPLOY=false
                shift
                ;;
            --no-rollback)
                ROLLBACK_ON_FAILURE=false
                shift
                ;;
            --timeout)
                HEALTH_CHECK_TIMEOUT="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --domain DOMAIN       Set deployment domain (default: localhost)"
                echo "  --ssl                 Enable SSL/HTTPS"
                echo "  --no-backup          Skip backup before deployment"
                echo "  --no-rollback        Disable automatic rollback on failure"
                echo "  --timeout SECONDS    Health check timeout (default: 300)"
                echo "  --help               Show this help"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    local start_time=$(date +%s)
    
    # Run deployment steps
    check_prerequisites
    load_environment
    create_production_compose
    create_nginx_config
    backup_existing
    
    # Deploy and check health
    if deploy_application; then
        if perform_health_checks; then
            post_deployment
            generate_deployment_report
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            success "Deployment completed successfully in ${duration} seconds! 🚀"
            log "Application is now available at: $([ "$SSL_ENABLED" = "true" ] && echo "https" || echo "http")://$DOMAIN"
            
            exit 0
        else
            error "Health checks failed"
            rollback_deployment
            exit 1
        fi
    else
        error "Deployment failed"
        rollback_deployment
        exit 1
    fi
}

# Run main function
main "$@"