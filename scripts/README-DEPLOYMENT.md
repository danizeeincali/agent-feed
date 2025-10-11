# Deployment Scripts Guide

This directory contains scripts for deployment, validation, and system management.

## Pre-Deployment Checklist

### Quick Reference

```bash
# Run full pre-deployment checklist
npm run pre-deploy

# Run with shell wrapper
./scripts/pre-deployment-check.sh

# Direct execution
npx tsx scripts/pre-deployment-checklist.ts
```

**Full Documentation**: See [PRE-DEPLOYMENT-CHECKLIST.md](./PRE-DEPLOYMENT-CHECKLIST.md)

### What It Checks

The pre-deployment checklist validates:

1. **All tests passing** (Jest + Playwright E2E)
2. **No uncommitted changes** (clean git state)
3. **Environment variables** configured
4. **Database migrations** up to date
5. **No security vulnerabilities** (npm audit)
6. **API endpoints responding** (health checks)
7. **No hardcoded secrets** (code scanning)
8. **Backup procedures** exist
9. **Monitoring/logging** configured
10. **Production build** succeeds
11. **TypeScript compilation** passes
12. **Dependencies** installed and current

### Exit Codes

- **0**: Ready for deployment (GREEN)
- **1**: Deployment blocked (RED/YELLOW)

### Deployment Readiness Levels

- **🟢 GREEN**: All critical checks passed, safe to deploy
- **🟡 YELLOW**: Critical passed but important issues exist, deploy with caution
- **🔴 RED**: Critical failures detected, do not deploy

## Other Deployment Scripts

### Health Checks

```bash
# Run health check once
npm run health-check

# Continuous monitoring
npm run health-check:continuous
```

**What it does:**
- Validates database connections (PostgreSQL/SQLite)
- Checks API server responsiveness
- Verifies required services running
- Tests environment configuration

**Location**: `/workspaces/agent-feed/scripts/health-check.ts`

### Environment Validation

```bash
# Validate environment configuration
npm run validate

# CI mode with logging
npm run validate:ci
```

**What it does:**
- Validates all required environment variables
- Checks for insecure default values
- Verifies directory structure
- Tests database connectivity
- Validates API keys

**Location**: `/workspaces/agent-feed/scripts/validate-environment.ts`

### Database Operations

```bash
# Initialize database
./scripts/init-db.sh

# Setup test database
npm run setup:test-db

# Migrate agents to database
npm run migrate:agents

# Dry run migration
npm run migrate:agents:dry-run

# Migrate SQLite to PostgreSQL
npx tsx scripts/migrate-sqlite-to-postgres.ts
```

### Backup Operations

```bash
# Backup user data
./scripts/backup-user-data.sh

# Restore from backup
./scripts/backup-user-data.sh --restore /path/to/backup
```

**Features:**
- Backs up databases, configs, and user data
- Configurable retention (BACKUP_RETENTION_DAYS)
- Scheduled via BACKUP_SCHEDULE cron expression
- Validates backups after creation

### Monitoring

```bash
# Health monitoring
./scripts/health-monitor.js

# Performance monitoring
./scripts/performance-monitoring.js

# Process monitoring
./scripts/process-monitor.js

# Memory validation
./scripts/validate-memory-fixes.sh
```

### Production Deployment

```bash
# Full production deployment
./scripts/deploy-production.sh

# Validate Phase 1 deployment
./scripts/validate-phase1-deployment.sh

# Verify Phase 1 setup
./scripts/verify-phase1.sh
```

### System Validation

```bash
# Comprehensive system validation
npx tsx scripts/comprehensive-system-validation.ts

# Quick validation
npx tsx scripts/quick-validation.ts

# Production validation
./scripts/production-validation.cjs

# Validate architecture
./scripts/validate-architecture.sh
```

## Typical Deployment Workflow

### 1. Pre-Deployment (Local)

```bash
# 1. Ensure all changes committed
git status

# 2. Run tests
npm test
npm run test:e2e

# 3. Build production assets
npm run build

# 4. Validate environment
npm run validate

# 5. Run pre-deployment checklist
npm run pre-deploy
```

### 2. Deployment (CI/CD or Manual)

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies
npm ci

# 3. Run pre-deployment checklist
npm run pre-deploy

# 4. Run migrations
npm run migrate:agents

# 5. Build production
npm run build

# 6. Start services
npm start

# 7. Run health check
npm run health-check

# 8. Verify deployment
./scripts/validate-phase1-deployment.sh
```

### 3. Post-Deployment

```bash
# 1. Verify services running
npm run health-check:continuous

# 2. Monitor performance
./scripts/performance-monitoring.js

# 3. Check logs
tail -f .claude/logs/*.log

# 4. Create backup
./scripts/backup-user-data.sh
```

## CI/CD Integration Examples

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run pre-deployment checklist
        run: npm run pre-deploy
        env:
          NODE_ENV: production
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Build application
        run: npm run build

      - name: Deploy to server
        run: ./scripts/deploy-production.sh

      - name: Post-deployment validation
        run: npm run health-check
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - build
  - deploy
  - verify

pre-deployment-check:
  stage: validate
  script:
    - npm ci
    - npm run pre-deploy
  only:
    - main

build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - frontend/dist/
  only:
    - main

deploy-production:
  stage: deploy
  script:
    - ./scripts/deploy-production.sh
  only:
    - main
  when: manual

post-deployment-verify:
  stage: verify
  script:
    - npm run health-check
    - ./scripts/validate-phase1-deployment.sh
  only:
    - main
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Run pre-deployment checks
RUN npm run pre-deploy

RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/api-server ./api-server
COPY --from=builder /app/package*.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/components', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 3001 5173

CMD ["npm", "start"]
```

## Environment Variables for Deployment

### Required Variables

```bash
# Application
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DB_HOST=localhost
DB_PORT=5432
POSTGRES_DB=avidm_production
POSTGRES_USER=app_user
POSTGRES_PASSWORD=secure_password

# API Keys
ANTHROPIC_API_KEY=sk-ant-your-production-key

# Paths
WORKSPACE_ROOT=/app
PROJECT_ROOT=/app
DATABASE_DIR=/app/data

# Logging
LOG_LEVEL=info
CLAUDE_LOGS_DIR=/app/.claude/logs

# Monitoring
HEALTH_CHECK_INTERVAL=30000

# Backup
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=7
```

### Security Best Practices

1. **Never commit secrets**: Use `.env` files (gitignored) or secret managers
2. **Use Docker secrets**: For container deployments
3. **Rotate credentials**: Regularly update API keys and passwords
4. **Restrict permissions**: Minimal access for application users
5. **Enable monitoring**: Track failed login attempts and suspicious activity

## Troubleshooting

### Pre-deployment Checklist Fails

**Tests failing:**
```bash
# Run tests individually to identify issue
npm test
npm run test:e2e
```

**Build fails:**
```bash
# Clear cache and rebuild
rm -rf frontend/dist
npm run build
```

**Environment variables missing:**
```bash
# Copy example and configure
cp .env.example .env
# Edit .env with production values
```

**Security vulnerabilities:**
```bash
# Check audit
npm audit

# Fix automatically
npm audit fix

# Manual updates
npm update
```

### Deployment Failures

**Database connection issues:**
```bash
# Test connection
npm run validate

# Check PostgreSQL status
pg_isready -h localhost -p 5432

# Verify credentials
psql -h localhost -U postgres -d avidm_production
```

**API not responding:**
```bash
# Check if server is running
ps aux | grep node

# Check logs
tail -f .claude/logs/*.log

# Restart services
npm start
```

**Migration failures:**
```bash
# Check migration files
ls -la prod/database/migrations/

# Run migrations manually
npm run migrate:agents

# Verify database schema
psql -h localhost -U postgres -d avidm_production -c "\d"
```

## Monitoring and Alerts

### Health Check Monitoring

```bash
# Set up continuous health monitoring
npm run health-check:continuous

# Configure alert thresholds in environment
export HEALTH_CHECK_INTERVAL=30000
export ALERT_THRESHOLD=3  # Alert after 3 consecutive failures
```

### Log Monitoring

```bash
# Monitor all logs
tail -f .claude/logs/*.log

# Monitor specific service
tail -f .claude/logs/api-server.log

# Search for errors
grep -r "ERROR" .claude/logs/
```

### Performance Monitoring

```bash
# Run performance monitoring
./scripts/performance-monitoring.js

# Monitor process health
./scripts/process-monitor.js

# Check memory usage
./scripts/validate-memory-fixes.sh
```

## Additional Resources

- **Pre-Deployment Checklist Documentation**: [PRE-DEPLOYMENT-CHECKLIST.md](./PRE-DEPLOYMENT-CHECKLIST.md)
- **Migration Guide**: [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md)
- **Quick Start**: [MIGRATION-QUICK-START.md](./MIGRATION-QUICK-START.md)
- **AVI Setup**: See `./scripts/verify-avi-setup.sh`
- **Phase 1 Documentation**: See `./scripts/validate-phase1-deployment.sh`

## Support

For issues or questions:
1. Check script logs and error messages
2. Review relevant documentation files
3. Examine script source code for implementation details
4. Test individual components to isolate issues

## Contributing

When adding new deployment scripts:

1. **Add to appropriate category** in this README
2. **Include usage examples** and documentation
3. **Follow naming conventions**: `action-target.sh` or `action-target.ts`
4. **Make executable**: `chmod +x script-name.sh`
5. **Add to package.json**: Create npm script alias
6. **Document exit codes**: 0 for success, 1 for failure
7. **Include error handling**: Proper error messages and cleanup
8. **Test thoroughly**: Verify in multiple environments

---

**Last Updated**: 2025-10-10
**Maintained By**: DevOps Team
