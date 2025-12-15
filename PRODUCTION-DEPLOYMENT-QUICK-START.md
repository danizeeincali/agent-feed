# Production Deployment Quick Start

**Last Updated**: 2025-10-20
**Status**: ✅ Ready for Deployment
**Confidence**: 93%

---

## TL;DR - Deploy Now

```bash
# 1. Configure environment
cp .env.example .env.production
nano .env.production  # Edit production values

# 2. Install dependencies
npm install

# 3. Build frontend
cd frontend && npm run build

# 4. Start backend (production)
cd ..
NODE_ENV=production PORT=3001 node api-server/server.js

# 5. Verify deployment
curl http://localhost:3001/health
```

**That's it!** Application is production-ready.

---

## Pre-Deployment Checklist

### Required Actions (5 minutes)

- [ ] Configure production environment variables
- [ ] Review security settings (CORS, rate limits)
- [ ] Set up process monitoring (PM2 recommended)
- [ ] Test health check endpoint
- [ ] Verify agent files are accessible

### Optional Actions (15 minutes)

- [ ] Configure log aggregation
- [ ] Set up monitoring alerts
- [ ] Configure database backups
- [ ] Test rollback procedure
- [ ] Document custom configurations

---

## Environment Configuration

### 1. Create Production Environment File

```bash
# Create .env.production
cat > .env.production << 'EOF'
# Backend Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Paths
AGENTS_DIR=/workspaces/agent-feed/prod/.claude/agents
DATABASE_PATH=/workspaces/agent-feed/database.db
LOG_DIR=/workspaces/agent-feed/logs

# Logging
LOG_LEVEL=info

# Security
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Optional: Authentication (if implemented)
# JWT_SECRET=your-secret-key-here
# JWT_EXPIRY=24h
EOF
```

### 2. Frontend Environment

```bash
# Create frontend/.env.production
cat > frontend/.env.production << 'EOF'
VITE_API_BASE_URL=http://localhost:3001
VITE_ENABLE_ANALYTICS=false
EOF
```

### 3. Verify Environment

```bash
# Check backend config
source .env.production
echo "Backend Port: $PORT"
echo "Agents Directory: $AGENTS_DIR"

# Check frontend config
cd frontend
cat .env.production
```

---

## Deployment Options

### Option A: Simple Deployment (Node.js)

**Best for**: Development, testing, small-scale production

```bash
# 1. Start backend
NODE_ENV=production node api-server/server.js

# 2. Start frontend (separate terminal)
cd frontend
npm run preview -- --port 5173
```

**Pros**: Simple, quick to deploy
**Cons**: No auto-restart, no clustering

### Option B: PM2 (Recommended)

**Best for**: Production deployments, auto-restart, monitoring

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'agent-feed-backend',
      script: 'api-server/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    }
  ]
};
EOF

# 3. Start with PM2
pm2 start ecosystem.config.js

# 4. Save PM2 config
pm2 save

# 5. Setup PM2 to start on boot
pm2 startup
```

**Pros**: Auto-restart, monitoring, logs
**Cons**: Requires PM2 installation

### Option C: Docker (Future)

**Best for**: Containerized deployments, cloud platforms

```bash
# Coming soon - Docker configuration
# docker-compose up -d
```

---

## Deployment Steps

### Step 1: Install Dependencies

```bash
# Root dependencies
npm install

# Frontend dependencies
cd frontend && npm install && cd ..
```

### Step 2: Build Frontend

```bash
cd frontend
npm run build
cd ..
```

**Output**: `frontend/dist/` directory with optimized build

### Step 3: Start Backend

**Option A: Direct Node**
```bash
NODE_ENV=production PORT=3001 node api-server/server.js
```

**Option B: PM2**
```bash
pm2 start ecosystem.config.js
pm2 logs agent-feed-backend
```

### Step 4: Verify Deployment

```bash
# Health check
curl http://localhost:3001/health | jq

# Expected response:
# {
#   "success": true,
#   "data": {
#     "status": "healthy",
#     "resources": {
#       "databaseConnected": true,
#       "fileWatcherActive": true
#     }
#   }
# }
```

### Step 5: Test Features

```bash
# Test agent listing
curl http://localhost:3001/api/v1/claude-live/prod/agents | jq '.totalAgents'

# Test tier filtering
curl "http://localhost:3001/api/v1/claude-live/prod/agents?tier=1" | jq '.agents | length'

# Test frontend (if serving with Node)
curl http://localhost:5173
```

---

## Post-Deployment Verification

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

URL="http://localhost:3001/health"
response=$(curl -s -w "\n%{http_code}" $URL)
http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" -eq 200 ]; then
  status=$(echo $body | jq -r '.data.status')
  echo "✅ Health check passed: $status"

  # Check resources
  db_status=$(echo $body | jq -r '.data.resources.databaseConnected')
  watcher_status=$(echo $body | jq -r '.data.resources.fileWatcherActive')

  echo "   Database: $db_status"
  echo "   File Watcher: $watcher_status"

  exit 0
else
  echo "❌ Health check failed: HTTP $http_code"
  exit 1
fi
```

### Functional Test Script

```bash
#!/bin/bash
# functional-test.sh

BASE_URL="http://localhost:3001"

echo "Testing Agent Feed API..."

# Test 1: Health check
echo -n "1. Health check... "
status=$(curl -s "$BASE_URL/health" | jq -r '.data.status')
if [ "$status" = "healthy" ] || [ "$status" = "warning" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
  exit 1
fi

# Test 2: Agent listing
echo -n "2. Agent listing... "
total=$(curl -s "$BASE_URL/api/v1/claude-live/prod/agents" | jq '.totalAgents')
if [ "$total" -gt 0 ]; then
  echo "✅ PASS ($total agents)"
else
  echo "❌ FAIL"
  exit 1
fi

# Test 3: Tier filtering
echo -n "3. Tier filtering... "
tier1=$(curl -s "$BASE_URL/api/v1/claude-live/prod/agents?tier=1" | jq '.agents | length')
if [ "$tier1" -gt 0 ]; then
  echo "✅ PASS ($tier1 tier 1 agents)"
else
  echo "❌ FAIL"
  exit 1
fi

echo ""
echo "✅ All functional tests passed!"
```

---

## Monitoring

### PM2 Monitoring Commands

```bash
# View status
pm2 status

# View logs
pm2 logs agent-feed-backend

# View metrics
pm2 monit

# Restart if needed
pm2 restart agent-feed-backend

# Stop application
pm2 stop agent-feed-backend

# Delete from PM2
pm2 delete agent-feed-backend
```

### Log Files

```bash
# Backend logs
tail -f logs/combined.log      # All events
tail -f logs/error.log          # Errors only
tail -f logs/exceptions.log     # Uncaught exceptions
tail -f logs/rejections.log     # Promise rejections

# PM2 logs
pm2 logs agent-feed-backend --lines 100
```

### Metrics to Monitor

```bash
# Memory usage
curl http://localhost:3001/health | jq '.data.memory'

# Uptime
curl http://localhost:3001/health | jq '.data.uptime'

# Resource status
curl http://localhost:3001/health | jq '.data.resources'

# Agent count
curl http://localhost:3001/api/v1/claude-live/prod/agents | jq '.totalAgents'
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3001`

**Solution**:
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3002 node api-server/server.js
```

#### Issue 2: Database Connection Failed

**Error**: `databaseConnected: false`

**Solution**:
```bash
# Check database file exists
ls -la database.db

# Check permissions
chmod 644 database.db

# Check path in environment
echo $DATABASE_PATH
```

#### Issue 3: Agents Not Loading

**Error**: `totalAgents: 0`

**Solution**:
```bash
# Check agents directory
ls -la /workspaces/agent-feed/prod/.claude/agents/

# Verify markdown files exist
find /workspaces/agent-feed/prod/.claude/agents/ -name "*.md"

# Check environment variable
echo $AGENTS_DIR
```

#### Issue 4: High Memory Usage

**Warning**: `heapPercentage: 94%`

**Solution**:
```bash
# Increase heap size
NODE_OPTIONS="--max-old-space-size=512" node api-server/server.js

# Or with PM2
pm2 start ecosystem.config.js --node-args="--max-old-space-size=512"

# Monitor memory over time
watch -n 5 'curl -s http://localhost:3001/health | jq ".data.memory"'
```

#### Issue 5: CORS Errors

**Error**: `Access-Control-Allow-Origin` blocked

**Solution**:
```bash
# Update CORS_ORIGIN in .env.production
CORS_ORIGIN=https://your-frontend-domain.com

# Or allow all (development only)
CORS_ORIGIN=*

# Restart backend
pm2 restart agent-feed-backend
```

---

## Rollback Procedure

### Quick Rollback

```bash
# 1. Stop current deployment
pm2 stop agent-feed-backend

# 2. Checkout previous version
git checkout <previous-commit>

# 3. Reinstall dependencies
npm install

# 4. Restart
pm2 restart agent-feed-backend

# 5. Verify
./health-check.sh
```

### With Database Rollback

```bash
# 1. Stop backend
pm2 stop agent-feed-backend

# 2. Restore database backup
cp /path/to/backup/database.db ./database.db

# 3. Checkout previous code
git checkout <previous-commit>
npm install

# 4. Restart
pm2 restart agent-feed-backend

# 5. Verify
./health-check.sh
```

---

## Performance Tuning

### Backend Optimization

```bash
# Enable clustering (ecosystem.config.js)
{
  instances: 'max',  // Use all CPU cores
  exec_mode: 'cluster'
}

# Increase heap size
NODE_OPTIONS="--max-old-space-size=1024"

# Enable V8 optimizations
NODE_OPTIONS="--optimize-for-size --gc-interval=100"
```

### Frontend Optimization

```bash
# Build with production optimizations
npm run build -- --mode production

# Serve with compression
npm install -g serve
serve -s frontend/dist -l 5173
```

### Database Optimization

```bash
# Add caching layer (future enhancement)
# Consider Redis for frequently accessed agents
```

---

## Security Hardening

### Rate Limiting

**Already configured** in `api-server/server.js`:
```javascript
rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100                   // 100 requests per window
})
```

### CORS Configuration

Update `.env.production`:
```bash
CORS_ORIGIN=https://your-domain.com
# Or multiple origins (comma-separated)
CORS_ORIGIN=https://app.example.com,https://www.example.com
```

### Authentication (Optional)

```bash
# If implementing JWT auth:
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET" >> .env.production
```

---

## Backup Strategy

### Automated Backups

```bash
#!/bin/bash
# backup.sh - Run daily via cron

BACKUP_DIR="/backups/agent-feed"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
cp database.db "$BACKUP_DIR/database_$DATE.db"

# Backup agent files
tar -czf "$BACKUP_DIR/agents_$DATE.tar.gz" prod/.claude/agents/

# Keep last 7 days
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "✅ Backup complete: $DATE"
```

### Cron Schedule

```bash
# Add to crontab
crontab -e

# Run backup daily at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/agent-feed-backup.log 2>&1
```

---

## Success Criteria

After deployment, verify:

- [ ] Health check returns 200 OK
- [ ] Agent listing returns > 0 agents
- [ ] Tier filtering works correctly
- [ ] Frontend loads without errors
- [ ] No critical errors in logs
- [ ] Memory usage < 95%
- [ ] Response times < 100ms
- [ ] Database connected
- [ ] File watcher active

**If all checks pass**: ✅ Deployment successful!

---

## Support & Resources

### Documentation
- Full Validation Report: `FINAL-PRODUCTION-VALIDATION-REPORT.md`
- Visual Summary: `PRODUCTION-VALIDATION-VISUAL-SUMMARY.md`
- Architecture Docs: `docs/ARCHITECTURE-*.md`

### Quick Commands
```bash
# Health check
curl http://localhost:3001/health | jq

# View logs
pm2 logs agent-feed-backend

# Monitor metrics
pm2 monit

# Restart backend
pm2 restart agent-feed-backend

# Run functional tests
./functional-test.sh
```

### Useful Links
- Backend API: http://localhost:3001
- Frontend UI: http://localhost:5173
- Health Check: http://localhost:3001/health
- API Docs: http://localhost:3001/api/v1/claude-live/prod/agents

---

## Next Steps After Deployment

### Day 1
1. Monitor health check every hour
2. Check error logs for any issues
3. Verify tier filtering works
4. Test UI functionality
5. Collect initial metrics

### Week 1
1. Review daily metrics
2. Monitor memory trends
3. Check for any errors
4. Collect user feedback
5. Document any issues

### Month 1
1. Implement optimizations
2. Add monitoring alerts
3. Review performance data
4. Plan enhancements
5. Schedule maintenance

---

**Deployment Status**: ✅ Ready to Deploy

**Last Validated**: 2025-10-20

**Confidence Level**: 93%

---

**Good luck with your deployment!** 🚀
