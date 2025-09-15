#!/bin/bash
set -e

# Staging Deployment Script
# This script handles automated deployment to staging environment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="/var/www/agent-feed-staging"
BACKUP_DIR="/var/backups/agent-feed-staging"
SERVICE_NAME="agent-feed-staging"
HEALTH_CHECK_URL="https://staging.agent-feed.com/health"
NGINX_CONFIG="/etc/nginx/sites-available/agent-feed-staging"
SSL_CERT_PATH="/etc/letsencrypt/live/staging.agent-feed.com"

# Deployment configuration
MAX_RETRIES=3
HEALTH_CHECK_TIMEOUT=60
ROLLBACK_ON_FAILURE=true
ZERO_DOWNTIME=true

# Environment variables (should be set in CI/CD)
STAGING_HOST=${STAGING_HOST:-"staging.agent-feed.com"}
STAGING_USER=${STAGING_USER:-"deploy"}
SSH_KEY_PATH=${SSH_KEY_PATH:-"/tmp/staging_key"}
BUILD_DIR=${BUILD_DIR:-"dist"}
NODE_ENV=${NODE_ENV:-"staging"}

echo -e "${BLUE}🚀 Starting staging deployment...${NC}"
echo "Target: $STAGING_HOST"
echo "User: $STAGING_USER"
echo "Build Directory: $BUILD_DIR"
echo "Service: $SERVICE_NAME"
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to execute remote commands
remote_exec() {
    local command="$1"
    local description="$2"

    log "Executing: $description"
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${YELLOW}Command: $command${NC}"
    fi

    ssh -i "$SSH_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o ConnectTimeout=30 \
        "$STAGING_USER@$STAGING_HOST" \
        "$command"
}

# Function to copy files to remote
remote_copy() {
    local local_path="$1"
    local remote_path="$2"
    local description="$3"

    log "Copying: $description"
    scp -i "$SSH_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -r "$local_path" \
        "$STAGING_USER@$STAGING_HOST:$remote_path"
}

# Function to setup SSH key
setup_ssh() {
    log "Setting up SSH key..."

    if [ -n "$STAGING_SSH_KEY" ]; then
        echo "$STAGING_SSH_KEY" | base64 -d > "$SSH_KEY_PATH"
        chmod 600 "$SSH_KEY_PATH"
    elif [ ! -f "$SSH_KEY_PATH" ]; then
        echo -e "${RED}❌ No SSH key found${NC}"
        exit 1
    fi

    # Test SSH connection
    if ssh -i "$SSH_KEY_PATH" \
           -o StrictHostKeyChecking=no \
           -o UserKnownHostsFile=/dev/null \
           -o ConnectTimeout=10 \
           "$STAGING_USER@$STAGING_HOST" \
           "echo 'SSH connection successful'"; then
        log "✅ SSH connection established"
    else
        echo -e "${RED}❌ SSH connection failed${NC}"
        exit 1
    fi
}

# Function to check deployment prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."

    # Check if build directory exists
    if [ ! -d "$BUILD_DIR" ]; then
        echo -e "${RED}❌ Build directory not found: $BUILD_DIR${NC}"
        exit 1
    fi

    # Check if required files exist
    local required_files=("package.json")
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}❌ Required file not found: $file${NC}"
            exit 1
        fi
    done

    # Check remote directory structure
    remote_exec "
        sudo mkdir -p $DEPLOY_DIR $BACKUP_DIR
        sudo chown $STAGING_USER:$STAGING_USER $DEPLOY_DIR $BACKUP_DIR
    " "Creating deployment directories"

    log "✅ Prerequisites check passed"
}

# Function to create backup
create_backup() {
    log "Creating backup of current deployment..."

    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"

    remote_exec "
        if [ -d '$DEPLOY_DIR' ] && [ \"\$(ls -A $DEPLOY_DIR)\" ]; then
            sudo cp -r $DEPLOY_DIR $BACKUP_DIR/$backup_name
            echo 'Backup created: $backup_name'
        else
            echo 'No existing deployment to backup'
        fi
    " "Creating backup"

    # Store backup name for potential rollback
    echo "$backup_name" > /tmp/backup_name
    log "✅ Backup created: $backup_name"
}

# Function to stop services
stop_services() {
    if [ "$ZERO_DOWNTIME" = "true" ]; then
        log "Zero-downtime deployment: keeping services running"
        return 0
    fi

    log "Stopping services..."

    remote_exec "
        # Stop application service
        if sudo systemctl is-active --quiet $SERVICE_NAME; then
            sudo systemctl stop $SERVICE_NAME
            echo 'Service $SERVICE_NAME stopped'
        fi

        # Stop related services if needed
        # sudo systemctl stop nginx || true
    " "Stopping services"

    log "✅ Services stopped"
}

# Function to deploy application
deploy_application() {
    log "Deploying application..."

    # Create temporary deployment directory
    local temp_deploy_dir="/tmp/agent-feed-deploy-$(date +%Y%m%d-%H%M%S)"

    remote_exec "
        mkdir -p $temp_deploy_dir
    " "Creating temporary deployment directory"

    # Copy build files
    remote_copy "$BUILD_DIR/*" "$temp_deploy_dir/" "Application build files"
    remote_copy "package.json" "$temp_deploy_dir/" "Package configuration"
    remote_copy "package-lock.json" "$temp_deploy_dir/" "Package lock file" || true

    # Copy additional files if they exist
    for file in ".env.staging" "ecosystem.config.js" "Dockerfile" "docker-compose.yml"; do
        if [ -f "$file" ]; then
            remote_copy "$file" "$temp_deploy_dir/" "Additional file: $file" || true
        fi
    done

    # Install dependencies and setup
    remote_exec "
        cd $temp_deploy_dir

        # Install production dependencies
        npm ci --only=production --prefer-offline --no-audit

        # Run any build steps if needed
        if [ -f 'package.json' ] && npm run | grep -q 'postdeploy'; then
            npm run postdeploy
        fi

        # Set proper permissions
        find . -type f -exec chmod 644 {} \\;
        find . -type d -exec chmod 755 {} \\;

        # Make scripts executable
        if [ -d 'scripts' ]; then
            find scripts -name '*.sh' -exec chmod +x {} \\;
        fi
    " "Installing dependencies and setting up application"

    # Atomic deployment switch
    if [ "$ZERO_DOWNTIME" = "true" ]; then
        remote_exec "
            # Create new deployment directory
            NEW_DEPLOY_DIR='${DEPLOY_DIR}-new'
            sudo rm -rf \$NEW_DEPLOY_DIR
            sudo mv $temp_deploy_dir \$NEW_DEPLOY_DIR

            # Atomic switch
            if [ -d '$DEPLOY_DIR' ]; then
                sudo mv $DEPLOY_DIR ${DEPLOY_DIR}-old
            fi
            sudo mv \$NEW_DEPLOY_DIR $DEPLOY_DIR

            # Cleanup old deployment after successful switch
            sudo rm -rf ${DEPLOY_DIR}-old || true
        " "Atomic deployment switch"
    else
        remote_exec "
            sudo rm -rf $DEPLOY_DIR
            sudo mv $temp_deploy_dir $DEPLOY_DIR
        " "Moving application to deployment directory"
    fi

    log "✅ Application deployed"
}

# Function to configure environment
configure_environment() {
    log "Configuring environment..."

    remote_exec "
        cd $DEPLOY_DIR

        # Create environment configuration
        cat > .env << EOF
NODE_ENV=$NODE_ENV
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=\${DATABASE_URL}
REDIS_URL=\${REDIS_URL}

# API URLs
NEXT_PUBLIC_API_URL=https://staging-api.agent-feed.com
NEXT_PUBLIC_WS_URL=wss://staging-ws.agent-feed.com

# Authentication
JWT_SECRET=\${JWT_SECRET}
OAUTH_CLIENT_ID=\${OAUTH_CLIENT_ID}
OAUTH_CLIENT_SECRET=\${OAUTH_CLIENT_SECRET}

# External Services
GITHUB_TOKEN=\${GITHUB_TOKEN}
SLACK_WEBHOOK=\${SLACK_WEBHOOK}

# Monitoring
SENTRY_DSN=\${SENTRY_DSN}
NEW_RELIC_LICENSE_KEY=\${NEW_RELIC_LICENSE_KEY}
EOF

        # Set proper permissions for env file
        chmod 600 .env
    " "Creating environment configuration"

    log "✅ Environment configured"
}

# Function to start services
start_services() {
    log "Starting services..."

    remote_exec "
        # Start application service
        sudo systemctl start $SERVICE_NAME
        sudo systemctl enable $SERVICE_NAME

        # Reload nginx if configuration changed
        if [ -f '$NGINX_CONFIG' ]; then
            sudo nginx -t && sudo systemctl reload nginx
        fi

        # Start related services
        # sudo systemctl start redis-server || true
    " "Starting services"

    log "✅ Services started"
}

# Function to run health checks
run_health_checks() {
    log "Running health checks..."

    local retry_count=0
    local max_retries=$HEALTH_CHECK_TIMEOUT

    while [ $retry_count -lt $max_retries ]; do
        if curl -f -s --max-time 10 "$HEALTH_CHECK_URL" > /dev/null; then
            log "✅ Health check passed"

            # Additional health checks
            remote_exec "
                # Check service status
                systemctl is-active --quiet $SERVICE_NAME || exit 1

                # Check application logs for errors
                if journalctl -u $SERVICE_NAME --since '1 minute ago' | grep -i error; then
                    echo 'Warning: Errors found in application logs'
                fi

                # Check resource usage
                echo 'Memory usage:'
                free -h
                echo 'Disk usage:'
                df -h $DEPLOY_DIR
            " "Additional health checks"

            return 0
        fi

        retry_count=$((retry_count + 1))
        log "Health check failed, retrying ($retry_count/$max_retries)..."
        sleep 2
    done

    echo -e "${RED}❌ Health checks failed after $max_retries attempts${NC}"
    return 1
}

# Function to run smoke tests
run_smoke_tests() {
    log "Running smoke tests..."

    # Test main endpoints
    local endpoints=(
        "$HEALTH_CHECK_URL"
        "https://staging.agent-feed.com/"
        "https://staging.agent-feed.com/api/status"
    )

    for endpoint in "${endpoints[@]}"; do
        if curl -f -s --max-time 10 "$endpoint" > /dev/null; then
            log "✅ Smoke test passed: $endpoint"
        else
            log "❌ Smoke test failed: $endpoint"
            return 1
        fi
    done

    # Run application-specific smoke tests
    remote_exec "
        cd $DEPLOY_DIR
        if npm run | grep -q 'test:smoke'; then
            npm run test:smoke
        fi
    " "Application smoke tests" || true

    log "✅ Smoke tests completed"
}

# Function to rollback deployment
rollback_deployment() {
    log "Rolling back deployment..."

    local backup_name=$(cat /tmp/backup_name 2>/dev/null || echo "")

    if [ -n "$backup_name" ] && [ "$backup_name" != "" ]; then
        remote_exec "
            # Stop current services
            sudo systemctl stop $SERVICE_NAME || true

            # Restore from backup
            sudo rm -rf $DEPLOY_DIR
            sudo cp -r $BACKUP_DIR/$backup_name $DEPLOY_DIR

            # Restart services
            sudo systemctl start $SERVICE_NAME

            echo 'Rollback completed using backup: $backup_name'
        " "Rolling back to previous deployment"

        log "✅ Rollback completed"
    else
        log "❌ No backup found for rollback"
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."

    remote_exec "
        # Keep only last 5 backups
        cd $BACKUP_DIR
        ls -t | tail -n +6 | xargs -r rm -rf
        echo 'Old backups cleaned up'
    " "Cleaning up old backups"

    log "✅ Old backups cleaned up"
}

# Function to send notifications
send_notifications() {
    local status="$1"
    local message="$2"

    log "Sending deployment notifications..."

    # Slack notification
    if [ -n "$SLACK_WEBHOOK" ]; then
        local emoji="✅"
        local color="good"

        if [ "$status" = "failed" ]; then
            emoji="❌"
            color="danger"
        fi

        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"text\": \"$emoji Staging Deployment $status\n$message\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"staging\", \"short\": true},
                        {\"title\": \"Host\", \"value\": \"$STAGING_HOST\", \"short\": true},
                        {\"title\": \"Branch\", \"value\": \"${GITHUB_REF_NAME:-unknown}\", \"short\": true},
                        {\"title\": \"Commit\", \"value\": \"${GITHUB_SHA:-unknown}\", \"short\": true}
                    ]
                }]
            }" \
            "$SLACK_WEBHOOK" || true
    fi

    # Email notification (if configured)
    if [ -n "$NOTIFY_EMAIL" ]; then
        echo "$message" | mail -s "Staging Deployment $status" "$NOTIFY_EMAIL" || true
    fi

    log "✅ Notifications sent"
}

# Function to cleanup temporary files
cleanup() {
    log "Cleaning up temporary files..."

    # Remove SSH key
    rm -f "$SSH_KEY_PATH"

    # Remove temporary files
    rm -f /tmp/backup_name

    log "✅ Cleanup completed"
}

# Main deployment function
main() {
    local start_time=$SECONDS

    echo -e "${BLUE}=== Staging Deployment Pipeline ===${NC}"

    # Setup
    setup_ssh
    check_prerequisites

    # Pre-deployment
    create_backup

    # Deployment
    if [ "$ZERO_DOWNTIME" != "true" ]; then
        stop_services
    fi

    deploy_application
    configure_environment
    start_services

    # Post-deployment validation
    if run_health_checks && run_smoke_tests; then
        local duration=$((SECONDS - start_time))
        local message="Deployment completed successfully in ${duration}s"
        echo -e "${GREEN}✅ $message${NC}"
        send_notifications "succeeded" "$message"
        cleanup_old_backups
    else
        if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
            rollback_deployment
            local message="Deployment failed and rollback completed"
            echo -e "${YELLOW}⚠️ $message${NC}"
            send_notifications "failed" "$message"
        else
            local message="Deployment failed (no rollback performed)"
            echo -e "${RED}❌ $message${NC}"
            send_notifications "failed" "$message"
        fi
        exit 1
    fi

    cleanup
}

# Trap cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"