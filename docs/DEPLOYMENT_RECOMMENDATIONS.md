# Claude Instance Manager - Deployment Recommendations

## 🚀 Deployment Strategy

### Recommended Deployment Approach: Blue-Green with Canary

**Phase 1: Staging Validation** (1-2 hours)
```bash
# Deploy to staging environment
npm run build
npm run test
npm run e2e:staging

# Validate all systems
curl http://staging.yourapp.com/health
curl http://staging.yourapp.com/api/v1/dual-instance/health
```

**Phase 2: Production Deployment** (30 minutes)
```bash
# Build production assets
cd frontend && npm run build
cd .. && npm run build

# Deploy with zero downtime
pm2 start ecosystem.config.js --env production
pm2 save
```

**Phase 3: Traffic Migration** (gradual over 2 hours)
- 10% traffic → monitor for 30 minutes
- 50% traffic → monitor for 30 minutes  
- 100% traffic → full cutover

### Infrastructure Requirements

**Minimum Server Specifications:**
- **CPU**: 4 cores
- **RAM**: 8GB (4GB for app, 2GB for Redis, 2GB for OS)
- **Storage**: 50GB SSD
- **Network**: 1Gbps connection

**Recommended Production Setup:**
- **CPU**: 8 cores
- **RAM**: 16GB 
- **Storage**: 100GB SSD
- **Network**: 10Gbps connection
- **Load Balancer**: Nginx or AWS ALB

### Required Environment Configuration

**Production .env file:**
```env
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:password@host:5432/agent_feed_prod
REDIS_URL=redis://redis-host:6379

# WebSocket Configuration
WEBSOCKET_ENABLED=true
WEBSOCKET_HUB_ENABLED=true
WEBSOCKET_HUB_PORT=3002

# Claude Instance Management
CLAUDE_INSTANCE_MANAGER_ENABLED=true
PROD_CLAUDE_ENABLED=true
CLAUDE_HUB_URL=http://localhost:3002

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
CORS_ORIGIN=https://yourapp.com

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true

# Auto-restart Configuration
DEFAULT_AUTO_RESTART_HOURS=6
MAX_AUTO_RESTART_HOURS=24
```

### Database Setup

**PostgreSQL Configuration:**
```sql
-- Create production database
CREATE DATABASE agent_feed_prod;
CREATE USER agent_feed_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE agent_feed_prod TO agent_feed_user;

-- Run migrations
npm run migrate:prod
```

**Redis Configuration:**
```redis
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## 🔧 Service Configuration

### PM2 Process Manager

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'claude-instance-manager',
    script: 'dist/api/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
};
```

### Nginx Configuration

**nginx.conf:**
```nginx
upstream claude_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001 backup;
}

server {
    listen 80;
    server_name yourapp.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourapp.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://claude_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://claude_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location / {
        try_files $uri $uri/ /index.html;
        root /app/frontend/dist;
        add_header Cache-Control "public, max-age=31536000";
    }
}
```

## 📊 Monitoring & Alerting

### Health Check Endpoints

**System Health Monitoring:**
```bash
# Primary health check
curl https://yourapp.com/health

# Instance manager specific
curl https://yourapp.com/api/v1/dual-instance/health

# WebSocket hub status
curl https://yourapp.com/api/v1/websocket-hub/status
```

### Prometheus Metrics

**Key Metrics to Monitor:**
```prometheus
# WebSocket connections
claude_websocket_connections_total
claude_websocket_disconnections_total
claude_websocket_errors_total

# Instance management
claude_instances_running_count
claude_instances_restarts_total
claude_instances_launch_duration_seconds

# System resources
nodejs_heap_size_used_bytes
nodejs_heap_size_total_bytes
process_cpu_user_seconds_total
```

### Alert Thresholds

**Critical Alerts:**
- WebSocket connection failure rate > 5%
- Instance restart frequency > 2/hour
- Memory usage > 90%
- CPU usage > 85% for 5+ minutes
- Disk usage > 80%

**Warning Alerts:**
- WebSocket latency > 500ms
- Instance launch time > 10 seconds
- Memory usage > 75%
- Error rate > 1%

## 🔒 Security Hardening

### Application Security

**Headers Configuration:**
```javascript
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
    },
  },
}));
```

**Rate Limiting:**
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use('/api/', limiter);
```

### Network Security

**Firewall Rules:**
```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (change default port)
sudo ufw allow 2222/tcp

# Allow WebSocket hub port (internal only)
sudo ufw allow from 10.0.0.0/8 to any port 3002

# Deny all other traffic
sudo ufw default deny incoming
sudo ufw --force enable
```

### SSL/TLS Configuration

**Let's Encrypt Setup:**
```bash
sudo certbot --nginx -d yourapp.com
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Redis server configured and running
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Monitoring tools configured
- [ ] Backup procedures tested

### During Deployment

- [ ] Application builds successfully
- [ ] All tests pass
- [ ] Health checks return 200 OK
- [ ] WebSocket connections establish
- [ ] Instance launch functionality works
- [ ] Terminal sessions connect properly
- [ ] Auto-restart configuration applied

### Post-Deployment

- [ ] All services running and healthy
- [ ] Monitoring dashboards showing green status
- [ ] Log files being written correctly
- [ ] WebSocket connections stable
- [ ] Instance management working
- [ ] Terminal synchronization functioning
- [ ] Auto-restart triggers correctly

## 🔄 Backup & Recovery

### Automated Backup Strategy

**Database Backups:**
```bash
# Daily backup script
#!/bin/bash
pg_dump agent_feed_prod > /backups/db_$(date +%Y%m%d).sql
aws s3 cp /backups/db_$(date +%Y%m%d).sql s3://your-backup-bucket/
find /backups -name "db_*.sql" -mtime +7 -delete
```

**Configuration Backups:**
```bash
# Weekly configuration backup
tar -czf /backups/config_$(date +%Y%m%d).tar.gz \
  /app/.env \
  /etc/nginx/sites-available/ \
  /app/ecosystem.config.js
```

### Recovery Procedures

**Database Recovery:**
```bash
# Stop application
pm2 stop claude-instance-manager

# Restore database
dropdb agent_feed_prod
createdb agent_feed_prod
psql agent_feed_prod < /backups/db_20250122.sql

# Start application
pm2 start claude-instance-manager
```

**Full System Recovery:**
```bash
# 1. Restore code from git
git clone https://github.com/yourorg/agent-feed.git
cd agent-feed

# 2. Install dependencies
npm install
cd frontend && npm install && cd ..

# 3. Restore configuration
tar -xzf /backups/config_latest.tar.gz

# 4. Restore database
psql agent_feed_prod < /backups/db_latest.sql

# 5. Build and start
npm run build
cd frontend && npm run build && cd ..
pm2 start ecosystem.config.js
```

## 🚀 Performance Optimization

### Application Performance

**Node.js Optimization:**
```javascript
// Enable production optimizations
process.env.NODE_ENV = 'production';

// Cluster mode for CPU utilization
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  require('./server');
}
```

**WebSocket Optimization:**
```javascript
// Connection pooling
const io = new SocketIOServer(server, {
  transports: ['websocket'],
  pingTimeout: 30000,
  pingInterval: 5000,
  maxHttpBufferSize: 1e6,
  allowEIO3: true
});
```

### Database Performance

**PostgreSQL Tuning:**
```sql
-- postgresql.conf optimizations
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
```

**Redis Optimization:**
```redis
# redis.conf performance tuning
tcp-keepalive 60
tcp-backlog 511
maxclients 10000
```

## 🎯 Final Deployment Command

**One-Command Production Deployment:**
```bash
#!/bin/bash
set -e

echo "🚀 Starting production deployment..."

# Build application
npm run build
cd frontend && npm run build && cd ..

# Run tests
npm test

# Deploy with PM2
pm2 delete claude-instance-manager 2>/dev/null || true
pm2 start ecosystem.config.js --env production

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# Health check
sleep 10
curl -f http://localhost:3000/health || exit 1

echo "✅ Deployment completed successfully!"
echo "🌐 Application available at: https://yourapp.com"
echo "📊 Monitor at: https://yourapp.com/dual-instance"
```

---

**Deployment Guide Version**: 1.0  
**Last Updated**: 2025-01-22  
**Validated For**: Claude Instance Manager v1.0
**Status**: PRODUCTION READY ✅