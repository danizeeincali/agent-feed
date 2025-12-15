# Pre-Deployment Checklist

## Overview

The pre-deployment checklist is a comprehensive production readiness validation script that verifies your application is ready for deployment by running automated checks across critical system areas.

**Location**: `/workspaces/agent-feed/scripts/pre-deployment-checklist.ts`

## Quick Start

```bash
# Run the full checklist
npm run pre-deploy

# Or use the shell wrapper
./scripts/pre-deployment-check.sh
```

## Exit Codes

- **0**: All critical checks passed, ready for deployment
- **1**: Critical failures detected, deployment blocked

## Deployment Readiness Status

The script provides three deployment readiness levels:

### 🟢 GREEN - Ready for Deployment
- All critical checks passed
- No important failures or max 1 important warning
- Safe to deploy

### 🟡 YELLOW - Deploy with Caution
- All critical checks passed
- 1-2 important checks failed
- Review warnings before deploying

### 🔴 RED - Not Ready for Deployment
- Critical checks failed or 3+ important checks failed
- Deployment blocked
- Must resolve issues before deploying

## Checklist Items

### 1. All Tests Passing (CRITICAL)
**What it checks:**
- Runs Jest unit tests
- Runs Playwright E2E tests
- Verifies 100% pass rate

**Why it matters:**
Failing tests indicate broken functionality that could cause production issues.

**How to fix:**
```bash
npm test              # Run unit tests
npm run test:e2e      # Run E2E tests
```

### 2. No Uncommitted Changes (CRITICAL)
**What it checks:**
- Git working directory is clean
- No staged or unstaged changes

**Why it matters:**
Ensures deployment matches exact source code state and version control.

**How to fix:**
```bash
git status            # Check what's uncommitted
git add .
git commit -m "Your message"
```

### 3. Production Environment Variables (CRITICAL)
**What it checks:**
- Required variables configured:
  - `NODE_ENV`
  - `DATABASE_URL`
  - `ANTHROPIC_API_KEY`
  - `DB_HOST`
  - `DB_PORT`
  - `POSTGRES_DB`
  - `POSTGRES_USER`
- Warns if using development values

**Why it matters:**
Missing or incorrect environment variables cause runtime failures.

**How to fix:**
```bash
# Copy and configure your environment file
cp .env.example .env

# Ensure NODE_ENV=production
export NODE_ENV=production

# Set production database credentials
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export ANTHROPIC_API_KEY="sk-ant-your-key"
```

### 4. Database Migrations (CRITICAL)
**What it checks:**
- Migration files exist
- Database connection string is valid
- Migration directories accessible

**Why it matters:**
Missing migrations can cause schema mismatches and data corruption.

**How to fix:**
```bash
# Check migration files
ls -la prod/database/migrations/

# Run migrations (if migration runner exists)
npm run migrate
```

### 5. Security Vulnerabilities (CRITICAL)
**What it checks:**
- Runs `npm audit`
- Checks for high/critical vulnerabilities
- Reports vulnerability counts

**Why it matters:**
Known security vulnerabilities expose the system to attacks.

**How to fix:**
```bash
# View audit report
npm audit

# Attempt automatic fixes
npm audit fix

# Force fixes (may cause breaking changes)
npm audit fix --force

# Manual updates
npm update <package-name>
```

### 6. API Endpoints Responding (IMPORTANT)
**What it checks:**
- API server is running
- Key endpoints respond:
  - `/api/components`
  - `/api/agent-pages`

**Why it matters:**
Non-responsive endpoints indicate server configuration issues.

**How to fix:**
```bash
# Start the API server
npm run dev

# Check server logs
cd api-server && npm run dev

# Verify endpoints manually
curl http://localhost:3001/api/components
```

### 7. No Hardcoded Secrets (CRITICAL)
**What it checks:**
- Scans source files for patterns:
  - API keys
  - Passwords
  - Tokens
  - Connection strings with credentials
- Excludes node_modules, .git, dist, build

**Why it matters:**
Hardcoded secrets in source code create security vulnerabilities.

**How to fix:**
```bash
# Move secrets to environment variables
# Before:
const apiKey = "sk-ant-abc123...";

# After:
const apiKey = process.env.ANTHROPIC_API_KEY;

# Update .env file instead
echo "ANTHROPIC_API_KEY=sk-ant-abc123..." >> .env

# Ensure .env is in .gitignore
echo ".env" >> .gitignore
```

### 8. Backup Procedures (IMPORTANT)
**What it checks:**
- Backup scripts exist
- Backup directories present
- Environment backup configuration

**Why it matters:**
Without backups, data loss is unrecoverable.

**How to fix:**
```bash
# Verify backup script
ls -la scripts/backup-user-data.sh

# Configure backup schedule
export BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
export BACKUP_RETENTION_DAYS=7

# Test backup manually
./scripts/backup-user-data.sh
```

### 9. Monitoring and Logging (IMPORTANT)
**What it checks:**
- LOG_LEVEL configured
- Monitoring scripts present
- Health check configuration
- Logs directory exists

**Why it matters:**
Without monitoring, production issues go undetected until user reports.

**How to fix:**
```bash
# Configure logging
export LOG_LEVEL=info
export HEALTH_CHECK_INTERVAL=30000

# Create logs directory
mkdir -p .claude/logs

# Verify monitoring scripts
ls -la scripts/health-monitor.js
ls -la scripts/process-monitor.js
```

### 10. Production Build (CRITICAL)
**What it checks:**
- Frontend build completes successfully
- Build artifacts generated
- No build errors

**Why it matters:**
Build failures prevent deployment of latest code changes.

**How to fix:**
```bash
# Run build locally
npm run build

# Check for errors in output
cd frontend && npm run build

# Clear cache if needed
rm -rf frontend/dist
npm run build
```

### 11. TypeScript Type Checking (IMPORTANT)
**What it checks:**
- Runs `tsc --noEmit`
- Verifies all type errors resolved
- Reports compilation errors

**Why it matters:**
Type errors can cause runtime bugs that TypeScript is designed to prevent.

**How to fix:**
```bash
# Check types
npm run typecheck

# Fix type errors in reported files
# See TypeScript error messages for specific issues
```

### 12. Package Dependencies (NICE-TO-HAVE)
**What it checks:**
- node_modules exists
- Checks for outdated packages

**Why it matters:**
Missing or outdated dependencies can cause runtime issues.

**How to fix:**
```bash
# Install dependencies
npm install

# Check for updates
npm outdated

# Update packages
npm update

# Update specific package
npm update <package-name>
```

## Usage Examples

### Basic Usage
```bash
# Run full checklist
npm run pre-deploy
```

### CI/CD Integration
```yaml
# .github/workflows/deploy.yml
jobs:
  pre-deploy-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm install
      - name: Run pre-deployment checklist
        run: npm run pre-deploy
      - name: Deploy if checks pass
        if: success()
        run: ./scripts/deploy.sh
```

### Docker Integration
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Run pre-deployment checks
RUN npm run pre-deploy || exit 1

CMD ["npm", "start"]
```

### Local Development Workflow
```bash
# Before committing
git add .
npm run pre-deploy

# If checks pass
git commit -m "Feature: Add new functionality"
git push

# If checks fail, fix issues and retry
```

## Interpreting Results

### Sample Output - All Passed
```
╔════════════════════════════════════════════════════════════════╗
║          PRE-DEPLOYMENT CHECKLIST - PRODUCTION READY          ║
╚════════════════════════════════════════════════════════════════╝

[1/12] All tests passing (100% pass rate)
    Category: CRITICAL
    ✓ All test suites passed
      ✓ Jest Unit Tests: PASSED
      ✓ Playwright E2E Tests: PASSED

[2/12] No uncommitted changes in Git
    Category: CRITICAL
    ✓ Working directory clean

...

╔════════════════════════════════════════════════════════════════╗
║                      DEPLOYMENT SUMMARY                        ║
╚════════════════════════════════════════════════════════════════╝

Total Checks: 12
Passed:       12
Failed:       0
Duration:     45.23s

Failures by Category:
  Critical:     0
  Important:    0
  Nice-to-have: 0

═══════════════════════════════════════════════════════════════
🟢 GREEN - READY FOR DEPLOYMENT
═══════════════════════════════════════════════════════════════

✓ All critical checks passed. System is ready for deployment!
```

### Sample Output - Critical Failure
```
[1/12] All tests passing (100% pass rate)
    Category: CRITICAL
    ✗ Some test suites failed
      ✗ Jest Unit Tests: FAILED
      ✓ Playwright E2E Tests: PASSED

...

╔════════════════════════════════════════════════════════════════╗
║                      DEPLOYMENT SUMMARY                        ║
╚════════════════════════════════════════════════════════════════╝

Total Checks: 12
Passed:       10
Failed:       2
Duration:     52.18s

Failures by Category:
  Critical:     1
  Important:    1
  Nice-to-have: 0

═══════════════════════════════════════════════════════════════
🔴 RED - NOT READY FOR DEPLOYMENT
═══════════════════════════════════════════════════════════════

ACTION REQUIRED:

✗ All tests passing (100% pass rate)
   Some test suites failed
   ✗ Jest Unit Tests: FAILED

✗ No hardcoded secrets
   Found 3 potential hardcoded secrets
   ✗ src/config/api.ts: ANTHROPIC_API_KEY = "sk-ant-...

Exiting with code 1 due to critical failures.
```

## Customization

### Adding New Checks

Edit `/workspaces/agent-feed/scripts/pre-deployment-checklist.ts`:

```typescript
// Add to checklist array
{
  name: 'Your custom check',
  category: 'critical', // or 'important' or 'nice-to-have'
  check: async (): Promise<CheckResult> => {
    // Your validation logic
    const isValid = await yourValidation();

    return {
      pass: isValid,
      message: isValid ? 'Check passed' : 'Check failed',
      details: ['Additional info line 1', 'Additional info line 2'],
    };
  },
}
```

### Modifying Severity Levels

Change the `category` field for any check:
- `critical`: Blocks deployment (exit code 1)
- `important`: Warning but allows deployment
- `nice-to-have`: Informational only

### Skipping Specific Checks

For temporary bypasses (not recommended for production):

```typescript
// Comment out or remove the check from the checklist array
// const checklist: ChecklistItem[] = [
//   {
//     name: 'Check to skip',
//     category: 'important',
//     check: async () => { ... }
//   },
// ];
```

## Troubleshooting

### Script Won't Execute
```bash
# Ensure tsx is installed
npm install

# Verify tsx works
npx tsx --version

# Make script executable
chmod +x scripts/pre-deployment-checklist.ts
chmod +x scripts/pre-deployment-check.sh
```

### Tests Hang Indefinitely
```bash
# Set timeout in test config
# jest.config.js
module.exports = {
  testTimeout: 30000, // 30 seconds
};

# Or skip test check temporarily for diagnosis
```

### API Endpoint Checks Fail
```bash
# Ensure server is running
npm run dev

# Check correct port
echo $PORT  # Should be 3001 or your configured port

# Test endpoint manually
curl http://localhost:3001/api/components
```

### False Positives on Secrets Scan
The script scans for common patterns. If you have test fixtures with mock secrets:

1. Move test fixtures to excluded directories (`node_modules`, `dist`, etc.)
2. Use environment variable references instead: `process.env.TEST_API_KEY`
3. Store test secrets in `.env.test` (ensure it's gitignored)

## Best Practices

1. **Run Before Every Deployment**: Make it part of your deployment workflow
2. **Fix Critical Issues First**: Don't deploy with critical failures
3. **Address Important Issues**: Plan to fix important warnings in next sprint
4. **Keep Environment Updated**: Regularly update `.env` with production values
5. **Monitor Trends**: Track which checks fail most often and address root causes
6. **Automate in CI/CD**: Run automatically on pull requests and deployments
7. **Update Regularly**: Add new checks as your system evolves

## Support

For issues or questions:
- Check script logs in console output
- Review individual check documentation above
- Examine `/workspaces/agent-feed/scripts/pre-deployment-checklist.ts` source code
- Run individual checks manually to debug specific failures

## Version History

- **v1.0.0** (2025-10-10): Initial release with 12 core deployment checks
