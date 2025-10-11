# Production Deployment Guide

**AgentLink Feed System - Production Deployment**

Version: 1.0.0
Last Updated: 2025-10-10
Node.js Version: 18.x LTS
PostgreSQL Version: 15.x

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Requirements](#infrastructure-requirements)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Security Hardening](#security-hardening)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Troubleshooting](#troubleshooting)
7. [Rollback Procedures](#rollback-procedures)
8. [High Availability Setup](#high-availability-setup)

---

## Pre-Deployment Checklist

### Automated Pre-Deployment Validation

Run the comprehensive pre-deployment checklist script:

```bash
npm run pre-deploy
```

This script validates:
- ✅ All tests passing (100% pass rate)
- ✅ No uncommitted changes in git
- ✅ Environment variables configured
- ✅ Database migrations ready
- ✅ No security vulnerabilities
- ✅ API endpoints responding
- ✅ No hardcoded secrets
- ✅ Backup procedures exist
- ✅ Monitoring/logging configured

**Script Location:** [`scripts/pre-deployment-checklist.ts`](./scripts/pre-deployment-checklist.ts)

**Quick Check (Lightweight):**
```bash
npm run pre-deploy:quick
```

### Manual Pre-Deployment Checklist

- [ ] **Code Quality**
  - [ ] All unit tests passing
  - [ ] All integration tests passing
  - [ ] All E2E tests passing
  - [ ] Code coverage meets threshold (>80%)
  - [ ] No TypeScript errors
  - [ ] ESLint checks passing

- [ ] **Security**
  - [ ] Security audit completed (`npm audit`)
  - [ ] Secrets removed from codebase
  - [ ] Environment variables documented
  - [ ] SSL/TLS certificates ready
  - [ ] Database credentials secured

- [ ] **Infrastructure**
  - [ ] Server provisioned and accessible
  - [ ] PostgreSQL 15+ installed
  - [ ] Node.js 18+ LTS installed
  - [ ] Docker installed (if using containers)
  - [ ] Firewall configured
  - [ ] Domain/DNS configured

- [ ] **Backup & Recovery**
  - [ ] Backup strategy documented
  - [ ] Backup scripts tested
  - [ ] Recovery procedures tested
  - [ ] Rollback plan prepared

---

## Infrastructure Requirements

### Server Specifications

#### Minimum Requirements (Development/Small Production)

- **CPU:** 2 cores
- **RAM:** 4 GB
- **Disk:** 20 GB SSD
- **Network:** 100 Mbps
- **OS:** Ubuntu 22.04 LTS or Debian 12

#### Recommended Requirements (Production)

- **CPU:** 4 cores (8 vCPUs)
- **RAM:** 8 GB (16 GB for high load)
- **Disk:** 100 GB SSD (NVMe preferred)
- **Network:** 1 Gbps
- **OS:** Ubuntu 22.04 LTS
- **Swap:** 4 GB minimum

#### High-Load Production

- **CPU:** 8+ cores
- **RAM:** 16-32 GB
- **Disk:** 200 GB+ NVMe SSD
- **Network:** 10 Gbps
- **Load Balancer:** Required
- **Database:** Separate dedicated server

### Software Requirements

| Component | Version | Notes |
|-----------|---------|-------|
| **Node.js** | 18.x LTS | Required (v18.0.0+) |
| **PostgreSQL** | 15.x | Minimum 15.0 |
| **npm** | 9.x+ | Comes with Node.js |
| **Docker** | 24.x+ | Optional (recommended) |
| **Docker Compose** | 2.x+ | Optional (for containers) |
| **Redis** | 7.x | Optional (caching) |
| **Nginx** | 1.24+ | Recommended (reverse proxy) |

### Network Ports

| Port | Service | Protocol | Access |
|------|---------|----------|--------|
| **3001** | API Server | HTTP | Internal |
| **3002** | Application | HTTP | Internal |
| **5173** | Frontend Dev | HTTP | Development Only |
| **5432** | PostgreSQL | TCP | Internal Only |
| **6379** | Redis | TCP | Internal Only (optional) |
| **80** | HTTP | HTTP | Public (redirects to 443) |
| **443** | HTTPS | HTTPS | Public |
| **8000** | Orchestrator | HTTP | Internal (optional) |
| **9090** | Prometheus | HTTP | Internal (monitoring) |

**Firewall Rules:**
```bash
# Allow only necessary ports
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw deny 5432/tcp     # PostgreSQL (internal only)
ufw enable
```

### PostgreSQL Configuration

**Recommended postgresql.conf settings:**

```conf
# Connection Settings
max_connections = 100
shared_buffers = 2GB                # 25% of RAM
effective_cache_size = 6GB          # 75% of RAM
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Query Tuning
work_mem = 20MB
random_page_cost = 1.1              # For SSD
effective_io_concurrency = 200      # For SSD

# Write Performance
wal_level = replica
max_wal_size = 4GB
min_wal_size = 1GB
wal_compression = on

# Logging
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_line_prefix = '%m [%p] %q%u@%d '
log_timezone = 'UTC'

# Performance Monitoring
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
```

**Apply configuration:**
```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

### SSL/TLS Certificates

**Option 1: Let's Encrypt (Recommended)**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Option 2: Self-Signed (Development/Testing)**
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/nginx-selfsigned.key \
  -out /etc/ssl/certs/nginx-selfsigned.crt
```

---

## Step-by-Step Deployment

### 1. Initial Server Setup

#### 1.1 Update System Packages

```bash
# Connect to server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git build-essential ufw fail2ban
```

#### 1.2 Create Application User

```bash
# Create non-root user for application
useradd -m -s /bin/bash agentlink
usermod -aG sudo agentlink

# Switch to application user
su - agentlink
```

#### 1.3 Install Node.js

```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show v9.x.x
```

#### 1.4 Install Docker (Optional but Recommended)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker agentlink

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 2. PostgreSQL Database Setup

#### 2.1 Install PostgreSQL 15

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Install PostgreSQL
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib-15

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 2.2 Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE agentlink;
CREATE USER agentlink WITH ENCRYPTED PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE agentlink TO agentlink;

-- Connect to database
\c agentlink

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO agentlink;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Exit
\q
```

#### 2.3 Secure PostgreSQL

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

**Add/modify these lines:**
```conf
# Local connections
local   all             postgres                                peer
local   all             agentlink                               md5

# IPv4 local connections
host    all             agentlink       127.0.0.1/32            md5
host    all             agentlink       ::1/128                 md5

# Deny all other connections
host    all             all             0.0.0.0/0               reject
```

**Restart PostgreSQL:**
```bash
sudo systemctl restart postgresql
```

#### 2.4 Test Database Connection

```bash
# Test connection
psql -h localhost -U agentlink -d agentlink -c "SELECT version();"
```

### 3. Environment Variable Configuration

#### 3.1 Clone Repository

```bash
# Clone application
cd /opt
sudo mkdir agent-feed
sudo chown agentlink:agentlink agent-feed
cd agent-feed

git clone https://github.com/your-org/agent-feed.git .
git checkout main  # or your production branch
```

#### 3.2 Create Production Environment File

```bash
# Create .env.production
nano .env.production
```

**Production environment template:**
```bash
# ==============================================================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ==============================================================================
# WARNING: This file contains sensitive information. Never commit to git!
# ==============================================================================

# ==============================================================================
# Application Environment
# ==============================================================================
NODE_ENV=production
LOG_LEVEL=info
PORT=3001

# ==============================================================================
# Database Configuration (PostgreSQL)
# ==============================================================================
USE_POSTGRES=true
DATABASE_URL=postgresql://agentlink:your_secure_password_here@localhost:5432/agentlink

# Connection Pool Settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agentlink
DB_USER=agentlink
DB_PASSWORD=your_secure_password_here
DB_POOL_MIN=4
DB_POOL_MAX=20
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=5000
DB_STATEMENT_TIMEOUT_MS=30000

# ==============================================================================
# Anthropic Claude API
# ==============================================================================
ANTHROPIC_API_KEY=your_anthropic_api_key_here
AGENT_MODEL=claude-sonnet-4-5-20250929
AVI_MODEL=claude-sonnet-4-5-20250929

# ==============================================================================
# Security
# ==============================================================================
JWT_SECRET=generate_a_secure_random_string_here_64_chars_minimum
SESSION_SECRET=another_secure_random_string_here
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# ==============================================================================
# Directory Paths
# ==============================================================================
WORKSPACE_ROOT=/opt/agent-feed
PROJECT_ROOT=/opt/agent-feed
AGENTS_DIR=/opt/agent-feed/agents
DATABASE_DIR=/opt/agent-feed/data
CLAUDE_PROD_DIR=/opt/agent-feed/.claude
CLAUDE_LOGS_DIR=/opt/agent-feed/.claude/logs

# ==============================================================================
# Performance & Limits
# ==============================================================================
MAX_AGENT_WORKERS=10
RETRY_MAX_ATTEMPTS=3
HEALTH_CHECK_INTERVAL=30000
AVI_CONTEXT_LIMIT=50000

# ==============================================================================
# Rate Limiting
# ==============================================================================
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# ==============================================================================
# Monitoring
# ==============================================================================
ENABLE_METRICS=true
METRICS_PORT=9100

# ==============================================================================
# Backup Configuration
# ==============================================================================
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
BACKUP_DIR=/opt/agent-feed/backups

# ==============================================================================
# Optional: Redis Cache (for high-load scenarios)
# ==============================================================================
# REDIS_URL=redis://:your_redis_password@localhost:6379
# REDIS_ENABLED=true
```

#### 3.3 Secure Environment File

```bash
# Restrict permissions
chmod 600 .env.production
chown agentlink:agentlink .env.production

# Verify
ls -la .env.production
# Should show: -rw------- 1 agentlink agentlink
```

#### 3.4 Generate Secure Secrets

```bash
# Generate JWT secret (64 characters)
openssl rand -base64 48

# Generate session secret (64 characters)
openssl rand -base64 48

# Update .env.production with generated secrets
```

### 4. Application Installation

#### 4.1 Install Dependencies

```bash
cd /opt/agent-feed

# Install root dependencies
npm ci --only=production

# Install API server dependencies
cd api-server
npm ci --only=production

# Install frontend dependencies
cd ../frontend
npm ci --only=production

cd ..
```

#### 4.2 Build Frontend

```bash
cd frontend
npm run build

# Verify build
ls -la dist/
```

#### 4.3 Create Required Directories

```bash
cd /opt/agent-feed

# Create directory structure
mkdir -p data
mkdir -p logs
mkdir -p backups
mkdir -p .claude/logs
mkdir -p agents/workspace
mkdir -p memory/agents
mkdir -p memory/sessions

# Set permissions
chown -R agentlink:agentlink .
chmod -R 755 data logs backups .claude agents memory
```

### 5. Database Migration

#### 5.1 Review Migration Files

```bash
# List available migrations
ls -la src/database/migrations/

# Review migration content
cat src/database/migrations/001_initial_schema.sql
```

#### 5.2 Initialize Database

```bash
# Run initialization script
./scripts/init-db.sh

# Or manually apply migrations
psql -h localhost -U agentlink -d agentlink -f src/database/migrations/001_initial_schema.sql
psql -h localhost -U agentlink -d agentlink -f src/database/migrations/002_extended_features.sql
```

#### 5.3 Verify Database Schema

```bash
# Connect to database
psql -h localhost -U agentlink -d agentlink

-- List all tables
\dt

-- Check table structure
\d system_agent_templates
\d user_agent_customizations
\d agent_memories

-- Verify data
SELECT COUNT(*) FROM system_agent_templates;

-- Exit
\q
```

### 6. Service Startup

#### 6.1 Using Systemd (Recommended for Production)

**Create systemd service file:**
```bash
sudo nano /etc/systemd/system/agentlink-api.service
```

**Service configuration:**
```ini
[Unit]
Description=AgentLink API Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=agentlink
Group=agentlink
WorkingDirectory=/opt/agent-feed/api-server
Environment=NODE_ENV=production
EnvironmentFile=/opt/agent-feed/.env.production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:/opt/agent-feed/logs/api-server.log
StandardError=append:/opt/agent-feed/logs/api-server-error.log

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/agent-feed/data /opt/agent-feed/logs /opt/agent-feed/backups

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
```

**Enable and start service:**
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable agentlink-api

# Start service
sudo systemctl start agentlink-api

# Check status
sudo systemctl status agentlink-api
```

#### 6.2 Using Docker Compose (Alternative)

```bash
# Copy production compose file
cp docker-compose.production.yml docker-compose.yml

# Update environment variables
nano docker-compose.yml

# Start services
docker compose up -d

# Check status
docker compose ps
docker compose logs -f
```

#### 6.3 Using PM2 (Alternative - Node Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application
cd /opt/agent-feed
pm2 start api-server/server.js --name agentlink-api --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd -u agentlink --hp /home/agentlink

# Check status
pm2 status
pm2 logs agentlink-api
```

### 7. Verification Steps

#### 7.1 Health Check

```bash
# Check application health endpoint
curl http://localhost:3001/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-10T12:00:00.000Z",
#   "uptime": 123.456,
#   "database": "connected",
#   "memory": {
#     "heapUsed": 50000000,
#     "heapTotal": 100000000
#   }
# }
```

#### 7.2 Database Connectivity

```bash
# Test database connection
npm run health-check

# Or manually
psql -h localhost -U agentlink -d agentlink -c "SELECT NOW();"
```

#### 7.3 API Endpoints

```bash
# Test API endpoints
curl http://localhost:3001/api/agents
curl http://localhost:3001/api/claude-code/status
```

#### 7.4 Log Verification

```bash
# Check application logs
tail -f /opt/agent-feed/logs/api-server.log

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Check systemd service logs
sudo journalctl -u agentlink-api -f
```

#### 7.5 Performance Check

```bash
# Check memory usage
free -h

# Check disk usage
df -h /opt/agent-feed

# Check process status
ps aux | grep node

# Check database connections
psql -h localhost -U agentlink -d agentlink -c "SELECT count(*) FROM pg_stat_activity WHERE datname='agentlink';"
```

---

## Security Hardening

### 1. Firewall Configuration

#### UFW (Uncomplicated Firewall)

```bash
# Install UFW
sudo apt install ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change 22 if using custom port)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny direct database access
sudo ufw deny 5432/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

#### Advanced Firewall Rules

```bash
# Rate limit SSH connections (prevent brute force)
sudo ufw limit ssh

# Allow specific IP ranges only (if applicable)
sudo ufw allow from 192.168.1.0/24 to any port 22

# Log dropped packets
sudo ufw logging on

# Check logs
sudo tail -f /var/log/ufw.log
```

### 2. Database User Permissions

#### Create Restricted Application User

```sql
-- Connect as postgres superuser
sudo -u postgres psql agentlink

-- Create application user with limited privileges
CREATE USER app_user WITH ENCRYPTED PASSWORD 'secure_app_password';

-- Grant only necessary privileges
GRANT CONNECT ON DATABASE agentlink TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;

-- Grant table-level permissions (read/write only, no DDL)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- Revoke dangerous privileges
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON DATABASE agentlink FROM PUBLIC;

-- Verify permissions
\du app_user
```

**Update .env.production:**
```bash
DB_USER=app_user
DB_PASSWORD=secure_app_password
```

### 3. File Permissions

```bash
cd /opt/agent-feed

# Set owner
sudo chown -R agentlink:agentlink .

# Application files (read-only for user)
sudo chmod -R 755 .

# Environment file (read-only for owner only)
sudo chmod 600 .env.production

# Logs directory (writable)
sudo chmod 755 logs
sudo chmod 644 logs/*.log

# Data directory (writable)
sudo chmod 755 data
sudo chmod 644 data/*.db

# Executable scripts
sudo chmod +x scripts/*.sh

# Remove write permissions from production code
sudo chmod -R a-w src/ api-server/

# Verify permissions
ls -la
```

### 4. Rate Limiting

#### Application-Level Rate Limiting (Express)

The application already includes rate limiting via `express-rate-limit`. Configuration in `.env.production`:

```bash
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100      # 100 requests per window
```

#### Nginx Rate Limiting (Reverse Proxy)

```nginx
# /etc/nginx/nginx.conf

http {
    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    # Connection limiting
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    server {
        listen 80;
        server_name yourdomain.com;

        # General rate limit
        limit_req zone=general burst=20 nodelay;
        limit_conn addr 10;

        # API endpoints
        location /api/ {
            limit_req zone=api burst=50 nodelay;
            proxy_pass http://localhost:3001;
        }

        # Auth endpoints (stricter limits)
        location /api/auth/ {
            limit_req zone=auth burst=5 nodelay;
            proxy_pass http://localhost:3001;
        }
    }
}
```

### 5. Security Headers

#### Nginx Security Headers

```nginx
# /etc/nginx/sites-available/agentlink

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Hide Nginx version
    server_tokens off;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/agentlink /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Additional Security Measures

#### Fail2Ban (SSH Brute Force Protection)

```bash
# Install fail2ban
sudo apt install fail2ban

# Create local configuration
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
```

```bash
# Start fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status
```

#### Automatic Security Updates

```bash
# Install unattended-upgrades
sudo apt install unattended-upgrades

# Configure
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Enable
sudo systemctl enable unattended-upgrades
sudo systemctl start unattended-upgrades
```

#### Regular Security Audits

```bash
# Create weekly audit script
sudo nano /opt/agent-feed/scripts/security-audit.sh
```

```bash
#!/bin/bash
# Weekly security audit script

echo "=== Security Audit $(date) ===" >> /opt/agent-feed/logs/security-audit.log

# Check for failed login attempts
echo "Failed SSH attempts:" >> /opt/agent-feed/logs/security-audit.log
grep "Failed password" /var/log/auth.log | tail -20 >> /opt/agent-feed/logs/security-audit.log

# Check listening ports
echo "Open ports:" >> /opt/agent-feed/logs/security-audit.log
sudo ss -tulpn >> /opt/agent-feed/logs/security-audit.log

# Check file permissions on sensitive files
echo "Sensitive file permissions:" >> /opt/agent-feed/logs/security-audit.log
ls -la /opt/agent-feed/.env.production >> /opt/agent-feed/logs/security-audit.log

# NPM audit
cd /opt/agent-feed
npm audit >> /opt/agent-feed/logs/security-audit.log 2>&1

echo "=== Audit Complete ===" >> /opt/agent-feed/logs/security-audit.log
```

```bash
# Make executable
sudo chmod +x /opt/agent-feed/scripts/security-audit.sh

# Add to crontab (weekly, Sundays at 2 AM)
sudo crontab -e
# Add: 0 2 * * 0 /opt/agent-feed/scripts/security-audit.sh
```

---

## Monitoring & Maintenance

### 1. Health Check Endpoints

#### Application Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-10T12:00:00.000Z",
  "uptime": 86400.5,
  "database": "connected",
  "memory": {
    "heapUsed": 52428800,
    "heapTotal": 104857600,
    "rss": 157286400,
    "external": 1048576
  }
}
```

**Automated Health Check:**
```bash
npm run health-check
# Or continuous monitoring
npm run health-check:continuous
```

#### Agent Health Check

**Endpoint:** `GET /api/agents/health`

```bash
curl http://localhost:3001/api/agents/health
```

#### Database Health Check

```bash
# Quick connection test
psql -h localhost -U agentlink -d agentlink -c "SELECT 1;"

# Check database size
psql -h localhost -U agentlink -d agentlink -c "
SELECT
  pg_size_pretty(pg_database_size('agentlink')) as database_size,
  (SELECT count(*) FROM pg_stat_activity WHERE datname='agentlink') as active_connections;
"
```

### 2. Log Locations

| Log Type | Location | Description |
|----------|----------|-------------|
| **Application Logs** | `/opt/agent-feed/logs/api-server.log` | Main application output |
| **Error Logs** | `/opt/agent-feed/logs/api-server-error.log` | Application errors |
| **PostgreSQL Logs** | `/var/log/postgresql/postgresql-15-main.log` | Database logs |
| **Nginx Logs** | `/var/log/nginx/access.log` | HTTP access logs |
| **Nginx Error Logs** | `/var/log/nginx/error.log` | Nginx errors |
| **System Logs** | `/var/log/syslog` | System messages |
| **Auth Logs** | `/var/log/auth.log` | Authentication attempts |
| **Claude Logs** | `/opt/agent-feed/.claude/logs/` | Claude agent logs |
| **Systemd Logs** | `journalctl -u agentlink-api` | Service logs |

#### Log Monitoring Commands

```bash
# Real-time application logs
tail -f /opt/agent-feed/logs/api-server.log

# View last 100 lines
tail -n 100 /opt/agent-feed/logs/api-server.log

# Search for errors
grep -i "error" /opt/agent-feed/logs/api-server.log

# Watch systemd service logs
sudo journalctl -u agentlink-api -f

# Filter logs by time
sudo journalctl -u agentlink-api --since "1 hour ago"

# Export logs
sudo journalctl -u agentlink-api --since today > /tmp/agentlink-logs.txt
```

### 3. Backup Procedures

#### 3.1 Automated Backup Script

**Script Location:** `scripts/backup-user-data.sh`

**Run backup manually:**
```bash
cd /opt/agent-feed
./scripts/backup-user-data.sh
```

**Backup includes:**
- User agent customizations (TIER 2)
- Agent memories (TIER 3)
- Agent workspaces (TIER 3)
- Full database (disaster recovery)

#### 3.2 Automated Daily Backups

**Create backup cron job:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/agent-feed/scripts/backup-user-data.sh >> /opt/agent-feed/logs/backup.log 2>&1
```

#### 3.3 Backup to Remote Storage

**S3 Backup Example:**
```bash
#!/bin/bash
# /opt/agent-feed/scripts/backup-to-s3.sh

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/opt/agent-feed/backups/agentlink_full_${BACKUP_DATE}.dump"
S3_BUCKET="s3://your-backup-bucket/agentlink-backups/"

# Create backup
docker exec agent-feed-postgres-phase1 pg_dump \
  -U agentlink \
  -d agentlink \
  -F c \
  -f "/backups/agentlink_full_${BACKUP_DATE}.dump"

# Upload to S3
aws s3 cp "$BACKUP_FILE" "$S3_BUCKET"

# Encrypt backup (optional)
gpg --encrypt --recipient backup@yourdomain.com "$BACKUP_FILE"
aws s3 cp "${BACKUP_FILE}.gpg" "$S3_BUCKET"

# Clean up local backup older than 7 days
find /opt/agent-feed/backups/ -name "*.dump" -mtime +7 -delete

echo "Backup uploaded: agentlink_full_${BACKUP_DATE}.dump"
```

**Make executable and schedule:**
```bash
chmod +x /opt/agent-feed/scripts/backup-to-s3.sh

# Daily at 3 AM
crontab -e
# Add: 0 3 * * * /opt/agent-feed/scripts/backup-to-s3.sh >> /opt/agent-feed/logs/s3-backup.log 2>&1
```

#### 3.4 Verify Backups

```bash
# List backups
ls -lh /opt/agent-feed/backups/

# Check backup size
du -h /opt/agent-feed/backups/

# List tables in backup
docker exec agent-feed-postgres-phase1 pg_restore \
  -l /backups/agentlink_full_20251010_020000.dump

# Test restore to temporary database
createdb agentlink_test
pg_restore -U agentlink -d agentlink_test -c /opt/agent-feed/backups/agentlink_full_20251010_020000.dump
dropdb agentlink_test
```

### 4. Update Procedures

#### 4.1 Application Updates

**Zero-downtime update procedure:**

```bash
# 1. Create backup before update
cd /opt/agent-feed
./scripts/backup-user-data.sh

# 2. Clone new version to staging directory
cd /opt
git clone https://github.com/your-org/agent-feed.git agent-feed-new
cd agent-feed-new
git checkout v1.2.0  # Update to desired version

# 3. Install dependencies
npm ci --only=production
cd frontend && npm ci && npm run build && cd ..

# 4. Run pre-deployment checks
npm run pre-deploy

# 5. Test with new environment
cp /opt/agent-feed/.env.production /opt/agent-feed-new/.env.production

# 6. Run database migrations (if any)
psql -h localhost -U agentlink -d agentlink -f src/database/migrations/new-migration.sql

# 7. Stop old application
sudo systemctl stop agentlink-api

# 8. Swap directories
sudo mv /opt/agent-feed /opt/agent-feed-old
sudo mv /opt/agent-feed-new /opt/agent-feed

# 9. Start new application
sudo systemctl start agentlink-api

# 10. Verify health
sleep 10
curl http://localhost:3001/health

# 11. If successful, remove old version
# (Wait 24 hours to ensure stability)
sudo rm -rf /opt/agent-feed-old

# 12. If failed, rollback (see Rollback Procedures section)
```

#### 4.2 Database Updates

```bash
# 1. Backup database
./scripts/backup-user-data.sh

# 2. Test migration on copy
createdb agentlink_test
pg_dump -U agentlink agentlink | psql -U agentlink agentlink_test
psql -h localhost -U agentlink -d agentlink_test -f src/database/migrations/012_new_feature.sql

# 3. If successful, apply to production
psql -h localhost -U agentlink -d agentlink -f src/database/migrations/012_new_feature.sql

# 4. Verify
psql -h localhost -U agentlink -d agentlink -c "\dt"

# 5. Clean up test database
dropdb agentlink_test
```

#### 4.3 Security Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js security patches
npm audit fix --only=prod

# Update PostgreSQL
sudo apt update
sudo apt install postgresql-15

# Restart services
sudo systemctl restart postgresql
sudo systemctl restart agentlink-api
```

### 5. Performance Monitoring

#### 5.1 System Metrics

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs sysstat

# CPU and memory
htop

# Disk I/O
sudo iotop

# Network usage
sudo nethogs

# System activity report
sar -u 1 10  # CPU usage, 10 samples
sar -r 1 10  # Memory usage
sar -d 1 10  # Disk usage
```

#### 5.2 Application Metrics

```bash
# Node.js process metrics
pm2 monit  # If using PM2

# Check process memory
ps aux | grep node

# Check open files
lsof -p $(pgrep -f "node server.js")

# Network connections
netstat -tunlp | grep node
```

#### 5.3 Database Metrics

```sql
-- Connect to database
psql -h localhost -U agentlink -d agentlink

-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE datname='agentlink';

-- Long-running queries
SELECT pid, usename, state, query_start, query
FROM pg_stat_activity
WHERE state != 'idle' AND query_start < now() - interval '5 minutes';

-- Database size
SELECT pg_size_pretty(pg_database_size('agentlink'));

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Cache hit ratio (should be >99%)
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_ratio
FROM pg_statio_user_tables;

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

#### 5.4 Prometheus & Grafana (Optional - Advanced Monitoring)

**Start monitoring stack:**
```bash
# Using docker-compose
docker compose --profile monitoring up -d

# Access Grafana
http://your-server-ip:3001
# Default login: admin / agentlink_grafana_2025

# Access Prometheus
http://your-server-ip:9090
```

---

## Troubleshooting

### 1. Common Issues and Solutions

#### Issue: Application Won't Start

**Symptoms:**
- Service fails to start
- Immediate crash after startup

**Diagnosis:**
```bash
# Check service status
sudo systemctl status agentlink-api

# View recent logs
sudo journalctl -u agentlink-api -n 100 --no-pager

# Check application logs
tail -n 100 /opt/agent-feed/logs/api-server-error.log
```

**Solutions:**

**A. Port Already in Use**
```bash
# Find process using port 3001
sudo lsof -i :3001

# Kill conflicting process
sudo kill -9 $(sudo lsof -t -i:3001)

# Or change port in .env.production
PORT=3002
```

**B. Database Connection Failed**
```bash
# Test database connectivity
psql -h localhost -U agentlink -d agentlink -c "SELECT 1;"

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check pg_hba.conf authentication
sudo cat /etc/postgresql/15/main/pg_hba.conf | grep agentlink
```

**C. Missing Environment Variables**
```bash
# Verify .env.production exists
ls -la /opt/agent-feed/.env.production

# Check required variables
grep -E "DATABASE_URL|ANTHROPIC_API_KEY|NODE_ENV" /opt/agent-feed/.env.production

# Reload environment
sudo systemctl restart agentlink-api
```

**D. Permission Issues**
```bash
# Check file ownership
ls -la /opt/agent-feed/

# Fix permissions
sudo chown -R agentlink:agentlink /opt/agent-feed
sudo chmod 755 /opt/agent-feed
sudo chmod 600 /opt/agent-feed/.env.production
```

#### Issue: High Memory Usage

**Symptoms:**
- Application using >2GB RAM
- Out of memory errors
- System becomes unresponsive

**Diagnosis:**
```bash
# Check memory usage
free -h

# Check Node.js process
ps aux | grep node

# Memory by process
top -o %MEM

# Check for memory leaks
npm run test:performance:memory
```

**Solutions:**

**A. Increase Node.js Memory Limit**
```bash
# Edit systemd service
sudo nano /etc/systemd/system/agentlink-api.service

# Add to [Service] section:
Environment="NODE_OPTIONS=--max-old-space-size=2048"

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart agentlink-api
```

**B. Optimize Database Connection Pool**
```bash
# Edit .env.production
DB_POOL_MAX=10  # Reduce from 20
DB_IDLE_TIMEOUT_MS=10000  # Reduce from 30000

# Restart application
sudo systemctl restart agentlink-api
```

**C. Add Swap Space**
```bash
# Create 4GB swap file
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### Issue: Database Connection Pool Exhausted

**Symptoms:**
- "Connection pool exhausted" errors
- Slow API responses
- Timeouts

**Diagnosis:**
```sql
-- Check active connections
SELECT count(*), state FROM pg_stat_activity
WHERE datname='agentlink'
GROUP BY state;

-- Check long-running queries
SELECT pid, usename, query_start, state, query
FROM pg_stat_activity
WHERE datname='agentlink' AND state != 'idle'
ORDER BY query_start;
```

**Solutions:**

**A. Increase Connection Pool**
```bash
# Edit .env.production
DB_POOL_MAX=30  # Increase from 20

# Restart application
sudo systemctl restart agentlink-api
```

**B. Kill Idle Connections**
```sql
-- Kill idle connections older than 30 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname='agentlink'
  AND state='idle'
  AND state_change < now() - interval '30 minutes';
```

**C. Set Connection Timeout**
```sql
-- Edit postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf

-- Add:
idle_in_transaction_session_timeout = 300000  # 5 minutes

-- Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Issue: SSL/TLS Certificate Errors

**Symptoms:**
- Browser shows "Not Secure" warning
- Certificate expired errors

**Solutions:**

**A. Renew Let's Encrypt Certificate**
```bash
# Check certificate expiration
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test renewal (dry run)
sudo certbot renew --dry-run

# Restart Nginx
sudo systemctl reload nginx
```

**B. Auto-renewal Setup**
```bash
# Check certbot timer
sudo systemctl status certbot.timer

# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

#### Issue: API Requests Timing Out

**Symptoms:**
- 504 Gateway Timeout errors
- Requests take >30 seconds
- Claude API slow

**Diagnosis:**
```bash
# Test API response time
time curl http://localhost:3001/api/agents

# Check database query performance
psql -h localhost -U agentlink -d agentlink -c "
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;"
```

**Solutions:**

**A. Increase Nginx Timeouts**
```nginx
# Edit /etc/nginx/sites-available/agentlink
location /api/ {
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    # ... other settings
}

# Reload Nginx
sudo systemctl reload nginx
```

**B. Optimize Database Queries**
```sql
-- Add indexes for slow queries
CREATE INDEX idx_agent_memories_agent_id ON agent_memories(agent_id);
CREATE INDEX idx_agent_workspaces_updated_at ON agent_workspaces(updated_at);

-- Analyze tables
ANALYZE system_agent_templates;
ANALYZE user_agent_customizations;
ANALYZE agent_memories;
```

**C. Increase Claude API Timeout**
```bash
# Edit .env.production
CLAUDE_TIMEOUT=120000  # 2 minutes

# Restart application
sudo systemctl restart agentlink-api
```

### 2. Log Analysis

#### Analyzing Application Errors

```bash
# Count error types
grep -i "error" /opt/agent-feed/logs/api-server.log | awk '{print $NF}' | sort | uniq -c | sort -nr

# Find stack traces
grep -A 20 "Error:" /opt/agent-feed/logs/api-server.log

# Extract errors from last hour
grep "$(date -d '1 hour ago' '+%Y-%m-%d %H')" /opt/agent-feed/logs/api-server.log | grep -i error
```

#### Analyzing Database Logs

```bash
# Check for connection errors
sudo grep "connection" /var/log/postgresql/postgresql-15-main.log

# Find slow queries
sudo grep "duration" /var/log/postgresql/postgresql-15-main.log | awk '$9 > 1000'

# Check for deadlocks
sudo grep "deadlock" /var/log/postgresql/postgresql-15-main.log
```

#### Analyzing Nginx Logs

```bash
# Top 10 IPs
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10

# Top 10 requested URLs
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10

# HTTP status codes
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -nr

# 5xx errors
grep " 5[0-9][0-9] " /var/log/nginx/access.log
```

### 3. Recovery Procedures

#### Recover from Database Corruption

```bash
# 1. Stop application
sudo systemctl stop agentlink-api

# 2. Check database integrity
psql -h localhost -U agentlink -d agentlink -c "
SELECT datname, pg_database_size(datname)
FROM pg_database
WHERE datname='agentlink';"

# 3. Reindex all tables
psql -h localhost -U agentlink -d agentlink -c "REINDEX DATABASE agentlink;"

# 4. Vacuum database
psql -h localhost -U agentlink -d agentlink -c "VACUUM FULL ANALYZE;"

# 5. If corruption persists, restore from backup (see Rollback section)

# 6. Restart application
sudo systemctl start agentlink-api
```

#### Recover from Disk Full

```bash
# 1. Check disk usage
df -h

# 2. Find large files
du -sh /opt/agent-feed/* | sort -hr | head -10

# 3. Clean old logs
sudo find /opt/agent-feed/logs -name "*.log" -mtime +7 -delete
sudo find /var/log/nginx -name "*.log" -mtime +7 -delete

# 4. Clean old backups
find /opt/agent-feed/backups -name "*.dump" -mtime +30 -delete

# 5. Vacuum PostgreSQL
sudo -u postgres vacuumdb --all --full

# 6. Clean Docker (if using containers)
docker system prune -a --volumes -f

# 7. Verify space
df -h
```

#### Emergency System Restart

```bash
# 1. Create emergency backup
pg_dump -h localhost -U agentlink agentlink > /tmp/emergency-backup.sql

# 2. Stop all services gracefully
sudo systemctl stop agentlink-api
sudo systemctl stop nginx
sudo systemctl stop postgresql

# 3. Restart system
sudo reboot

# 4. After reboot, verify services
sudo systemctl status postgresql
sudo systemctl status agentlink-api
sudo systemctl status nginx

# 5. Test health
curl http://localhost:3001/health
```

---

## Rollback Procedures

### 1. Application Rollback

#### Rollback to Previous Version

**Scenario:** New deployment has critical bugs

```bash
# 1. Verify backup exists
ls -la /opt/agent-feed-old/

# 2. Stop current version
sudo systemctl stop agentlink-api

# 3. Swap back to old version
sudo mv /opt/agent-feed /opt/agent-feed-failed
sudo mv /opt/agent-feed-old /opt/agent-feed

# 4. Restart application
sudo systemctl start agentlink-api

# 5. Verify health
sleep 10
curl http://localhost:3001/health

# 6. Check logs
sudo journalctl -u agentlink-api -n 50

# 7. Monitor for 5 minutes
watch -n 10 'curl -s http://localhost:3001/health'
```

#### Rollback Using Git

```bash
# 1. Identify previous working version
cd /opt/agent-feed
git log --oneline -10

# 2. Stop application
sudo systemctl stop agentlink-api

# 3. Checkout previous version
git checkout <previous-commit-hash>

# 4. Reinstall dependencies
npm ci --only=production
cd frontend && npm ci && npm run build && cd ..

# 5. Restart application
sudo systemctl start agentlink-api

# 6. Verify
curl http://localhost:3001/health
```

### 2. Database Migration Rollback

#### Simple Migration Rollback

**Scenario:** Migration broke database schema

```bash
# 1. Stop application
sudo systemctl stop agentlink-api

# 2. Connect to database
psql -h localhost -U agentlink -d agentlink

# 3. Check migration history (if tracked)
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;

# 4. Run rollback migration
\i src/database/migrations/rollback/rollback-010-agent-posts-enhancement.sql

# 5. Verify schema
\dt
\d system_agent_templates

# 6. Exit
\q

# 7. Restart application
sudo systemctl start agentlink-api
```

#### Complete Database Rollback

**Scenario:** Need to restore entire database from backup

```bash
# 1. Stop application
sudo systemctl stop agentlink-api

# 2. Create safety backup of current state
pg_dump -h localhost -U agentlink agentlink > /tmp/pre-rollback-backup.sql

# 3. Drop and recreate database
psql -h localhost -U postgres <<EOF
DROP DATABASE agentlink;
CREATE DATABASE agentlink;
GRANT ALL PRIVILEGES ON DATABASE agentlink TO agentlink;
EOF

# 4. Restore from backup
psql -h localhost -U agentlink -d agentlink < /opt/agent-feed/backups/agentlink_full_20251010_020000.sql

# Or using pg_restore for compressed backups:
pg_restore -h localhost -U agentlink -d agentlink -c --if-exists \
  /opt/agent-feed/backups/agentlink_full_20251010_020000.dump

# 5. Verify restoration
psql -h localhost -U agentlink -d agentlink -c "
SELECT
  'system_agent_templates' as table, COUNT(*) FROM system_agent_templates
UNION ALL
SELECT 'user_agent_customizations', COUNT(*) FROM user_agent_customizations
UNION ALL
SELECT 'agent_memories', COUNT(*) FROM agent_memories;
"

# 6. Restart application
sudo systemctl start agentlink-api

# 7. Test functionality
curl http://localhost:3001/api/agents
curl http://localhost:3001/health
```

#### Point-in-Time Recovery (PostgreSQL PITR)

**Requirements:** WAL archiving enabled

```bash
# 1. Stop PostgreSQL
sudo systemctl stop postgresql

# 2. Backup current data directory
sudo cp -r /var/lib/postgresql/15/main /var/lib/postgresql/15/main.backup

# 3. Create recovery.conf
sudo nano /var/lib/postgresql/15/main/recovery.conf
```

```conf
restore_command = 'cp /var/lib/postgresql/15/wal_archive/%f %p'
recovery_target_time = '2025-10-10 14:30:00'
recovery_target_action = 'promote'
```

```bash
# 4. Start PostgreSQL
sudo systemctl start postgresql

# 5. Monitor recovery
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# 6. Verify after recovery
psql -h localhost -U agentlink -d agentlink -c "SELECT NOW();"
```

### 3. Rollback Verification Checklist

After any rollback, verify:

- [ ] **Health Endpoint**
  ```bash
  curl http://localhost:3001/health
  # Should return: { "status": "healthy", ... }
  ```

- [ ] **Database Connectivity**
  ```bash
  psql -h localhost -U agentlink -d agentlink -c "SELECT count(*) FROM system_agent_templates;"
  ```

- [ ] **API Endpoints**
  ```bash
  curl http://localhost:3001/api/agents
  curl http://localhost:3001/api/claude-code/status
  ```

- [ ] **Logs Clean**
  ```bash
  sudo journalctl -u agentlink-api -n 100 | grep -i error
  # Should show no critical errors
  ```

- [ ] **Memory Usage Normal**
  ```bash
  free -h
  ps aux | grep node
  ```

- [ ] **Response Times**
  ```bash
  time curl http://localhost:3001/api/agents
  # Should complete in <1 second
  ```

---

## High Availability Setup

### Optional: Multi-Server Deployment

For production environments requiring high availability:

#### Architecture Overview

```
┌─────────────────┐
│  Load Balancer  │ (HAProxy/Nginx)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ App 1 │ │ App 2 │ (Application Servers)
└───┬───┘ └──┬────┘
    │        │
    └────┬───┘
         │
┌────────▼─────────┐
│   PostgreSQL     │ (Primary + Replica)
└──────────────────┘
```

#### Load Balancer (HAProxy)

```haproxy
# /etc/haproxy/haproxy.cfg

global
    maxconn 4096
    log /dev/log local0

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend http_front
    bind *:80
    default_backend app_servers

backend app_servers
    balance roundrobin
    option httpchk GET /health
    server app1 10.0.1.10:3001 check
    server app2 10.0.1.11:3001 check
```

#### PostgreSQL Replication

**Primary Server:**
```sql
-- Edit postgresql.conf
wal_level = replica
max_wal_senders = 3
wal_keep_size = 64

-- Create replication user
CREATE ROLE replicator WITH REPLICATION LOGIN ENCRYPTED PASSWORD 'repl_password';
```

**Replica Server:**
```conf
# standby.signal (create empty file)
touch /var/lib/postgresql/15/main/standby.signal

# postgresql.conf
primary_conninfo = 'host=primary-server port=5432 user=replicator password=repl_password'
```

---

## Summary

This deployment guide provides comprehensive instructions for deploying the AgentLink Feed System to production. Key points:

✅ **Pre-deployment validation** via automated checklist
✅ **Secure configuration** with hardened settings
✅ **Comprehensive monitoring** with health checks and logging
✅ **Automated backups** with retention policies
✅ **Clear rollback procedures** for rapid recovery
✅ **Troubleshooting guides** for common issues

### Quick Reference Commands

```bash
# Deploy
npm run pre-deploy                          # Validate before deploy
./scripts/deploy-production.sh              # Full deployment

# Monitor
curl http://localhost:3001/health           # Health check
sudo systemctl status agentlink-api         # Service status
tail -f logs/api-server.log                 # Application logs

# Backup
./scripts/backup-user-data.sh               # Create backup
ls -lh backups/                             # List backups

# Rollback
sudo systemctl stop agentlink-api           # Stop service
# ... restore backup ...
sudo systemctl start agentlink-api          # Start service
```

### Support & Resources

- **Pre-deployment Checklist:** `scripts/pre-deployment-checklist.ts`
- **Backup Script:** `scripts/backup-user-data.sh`
- **Deployment Script:** `scripts/deploy-production.sh`
- **Health Check:** `scripts/health-check.ts`

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-10
**Maintained By:** DevOps Team

For questions or issues, consult the troubleshooting section or check application logs.
