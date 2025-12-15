# CI/CD Pipeline Guide

**Version:** 1.0.0
**Last Updated:** 2025-01-20
**Author:** DevOps Team

---

## Table of Contents

1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [Workflows](#workflows)
4. [Configuration](#configuration)
5. [Usage Guide](#usage-guide)
6. [Deployment Procedures](#deployment-procedures)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Overview

The agent-feed project uses a comprehensive CI/CD pipeline built on GitHub Actions to ensure code quality, security, and reliable deployments. The pipeline automates testing, building, and deployment across multiple environments.

### Key Features

- **Multi-stage Pipeline**: Lint → Security → Test → Build → Deploy
- **Matrix Testing**: Tests across multiple Node.js versions (18.x, 20.x, 22.x)
- **Database Support**: PostgreSQL and SQLite testing
- **Browser Testing**: Chromium, Firefox, and WebKit via Playwright
- **Security Scanning**: Automated vulnerability detection and secret scanning
- **Blue-Green Deployments**: Zero-downtime production deployments
- **Automatic Rollback**: Intelligent failure detection and rollback

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CI/CD Pipeline                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Stage 1: Code Quality                                          │
│  ├── Lint (ESLint)                                              │
│  ├── Type Checking (TypeScript)                                 │
│  └── Security Audit (npm audit)                                 │
│                                                                  │
│  Stage 2: Testing                                               │
│  ├── Unit Tests (Jest/Vitest)                                   │
│  ├── Integration Tests (PostgreSQL/SQLite)                      │
│  └── E2E Tests (Playwright - Multi-browser)                     │
│                                                                  │
│  Stage 3: Build                                                 │
│  ├── Frontend Build (Vite)                                      │
│  ├── API Build                                                  │
│  └── Docker Image Build                                         │
│                                                                  │
│  Stage 4: Deployment                                            │
│  ├── Staging Deployment (Automatic)                             │
│  └── Production Deployment (Manual Approval)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflows

### 1. Main CI/CD Workflow (`ci-cd.yml`)

**Trigger:** Push to `main`, `develop`, `v1`, or pull requests
**Purpose:** Complete CI/CD pipeline from code to deployment

**Jobs:**
- `lint`: Code quality and linting
- `security`: Security scanning and audits
- `test-unit`: Unit tests with coverage
- `test-integration`: Database integration tests
- `test-e2e`: End-to-end browser tests
- `build`: Application build and artifact creation
- `build-docker`: Container image build and push
- `deploy-staging`: Automatic staging deployment
- `deploy-production`: Manual production deployment

**Example:**
```bash
# Triggered automatically on push to main
git push origin main

# Triggered on pull request
git checkout -b feature/new-feature
git push origin feature/new-feature
# Create PR on GitHub
```

---

### 2. Testing Workflow (`tests.yml`)

**Trigger:** All branches, scheduled daily, manual
**Purpose:** Comprehensive test execution across multiple environments

**Jobs:**
- `test-matrix`: Tests on Node 18.x, 20.x, 22.x across OS platforms
- `test-database`: PostgreSQL and SQLite testing
- `test-performance`: Performance benchmarking
- `test-e2e-comprehensive`: All browser variants
- `test-regression`: Regression test suite
- `coverage-report`: Code coverage reporting

**Example:**
```bash
# Run manually via GitHub UI
# Actions → Testing Workflow → Run workflow

# Scheduled: Daily at 2 AM UTC
```

---

### 3. Security Workflow (`security.yml`)

**Trigger:** Push to main/develop, scheduled weekly (Mondays 3 AM), manual
**Purpose:** Security scanning and vulnerability detection

**Jobs:**
- `dependency-scan`: npm audit for vulnerabilities
- `secret-scan`: TruffleHog and Gitleaks secret detection
- `code-security`: CodeQL static analysis
- `container-scan`: Trivy container scanning
- `owasp-scan`: OWASP dependency check
- `license-scan`: License compliance checking
- `sast-scan`: Static Application Security Testing
- `docker-scan`: Docker image security scanning

**Example:**
```bash
# Triggered automatically weekly
# Or run manually:
# Actions → Security Scanning → Run workflow
```

---

### 4. Deployment Workflow (`deploy.yml`)

**Trigger:** Manual, or automatic on version tags
**Purpose:** Controlled deployment to staging/production

**Jobs:**
- `pre-deployment-checks`: Validation and testing
- `backup-database`: Database backup creation
- `build-images`: Container image build
- `deploy-staging`: Staging deployment
- `deploy-production`: Production deployment (with approval)
- `rollback`: Emergency rollback capability
- `post-deployment`: Monitoring and validation

**Example:**
```bash
# Manual deployment to staging
# Actions → Deployment Pipeline → Run workflow → Select "staging"

# Production deployment requires approval
# Actions → Deployment Pipeline → Run workflow → Select "production"

# Rollback
# Actions → Deployment Pipeline → Run workflow → Check "rollback"
```

---

## Configuration

### Environment Variables

Configuration is managed through:
1. **GitHub Secrets**: Sensitive data (API keys, passwords)
2. **Environment Variables**: Non-sensitive configuration
3. **Config File**: `config/ci-cd-config.json`

#### Required GitHub Secrets

```yaml
# Database
DATABASE_URL: PostgreSQL connection string

# API Keys
ANTHROPIC_API_KEY: Claude API key
SNYK_TOKEN: Snyk security scanning token

# Notifications
SLACK_WEBHOOK_URL: Slack notifications webhook
SMTP_HOST: Email server host

# Deployment
STAGING_DB_HOST: Staging database host
PRODUCTION_DB_HOST: Production database host
```

#### Setting Secrets

1. Go to repository **Settings**
2. Navigate to **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add secret name and value

---

### CI/CD Configuration File

Location: `/config/ci-cd-config.json`

This file contains:
- Environment configurations
- Pipeline stage settings
- Testing parameters
- Security policies
- Notification settings
- Deployment strategies

**Example:**
```json
{
  "environments": {
    "production": {
      "deployment": {
        "requiresApproval": true,
        "blueGreen": true,
        "canaryReleasePercentage": 10
      }
    }
  }
}
```

---

## Usage Guide

### Running Tests Locally

```bash
# Install dependencies
npm ci
cd frontend && npm ci
cd ../api-server && npm ci

# Run all tests
npm run test

# Run specific test suites
npm run test:unit              # Unit tests
npm run test:phase1:integration # Integration tests
npm run test:e2e               # E2E tests

# With coverage
npm run test:coverage
```

---

### Pre-commit Hooks

Location: `.husky/pre-commit`

**Automatic checks before every commit:**
1. Linting
2. Type checking
3. Fast unit tests
4. Sensitive file detection
5. Secret scanning

**Setup:**
```bash
# Install Husky
npm install --save-dev husky
npx husky install

# Pre-commit hook is already configured
# It runs automatically on git commit
```

**Skip pre-commit checks (not recommended):**
```bash
git commit --no-verify -m "Emergency fix"
```

---

### Running Workflows Manually

1. Navigate to **Actions** tab in GitHub
2. Select workflow from left sidebar
3. Click **Run workflow** button
4. Select branch and options
5. Click **Run workflow**

---

## Deployment Procedures

### Staging Deployment

**Automatic:** Triggered on push to `develop` branch

```bash
git checkout develop
git merge feature/my-feature
git push origin develop
# Automatic deployment to staging
```

**Manual:**
1. Go to **Actions** → **Deployment Pipeline**
2. Click **Run workflow**
3. Select environment: **staging**
4. Click **Run workflow**

---

### Production Deployment

**Requires:** Manual approval
**Best Practice:** Deploy during maintenance windows

**Process:**

1. **Pre-deployment Checklist**
   ```bash
   # Run validation
   npm run validate:production

   # Run pre-deployment checks
   npm run pre-deploy
   ```

2. **Trigger Deployment**
   - Go to **Actions** → **Deployment Pipeline**
   - Click **Run workflow**
   - Select environment: **production**
   - Wait for approval
   - Approve deployment

3. **Monitor Deployment**
   - Watch workflow progress
   - Monitor health checks
   - Review logs for errors

4. **Post-deployment Validation**
   ```bash
   # Run health checks
   npm run health-check

   # Verify deployment
   curl https://agent-feed.example.com/health
   ```

---

### Blue-Green Deployment

Production uses blue-green deployment strategy:

1. **Current (Blue)**: Running production
2. **New (Green)**: New version deployed alongside
3. **Health Checks**: Verify green is healthy
4. **Traffic Switch**: Route traffic to green
5. **Monitor**: Watch for errors
6. **Cleanup**: Remove blue environment

**Rollback:** Switch traffic back to blue if issues detected

---

### Rollback Procedure

**Automatic Rollback:** Triggered on health check failures

**Manual Rollback:**
```bash
# Via workflow
# Actions → Deployment Pipeline → Run workflow
# Check "rollback" option

# Or using kubectl (if applicable)
kubectl rollout undo deployment/agent-feed
```

**Steps:**
1. Identify issue
2. Trigger rollback
3. Restore database backup if needed
4. Verify application health
5. Investigate root cause

---

## Troubleshooting

### Common Issues

#### 1. Tests Failing in CI but Passing Locally

**Cause:** Environment differences
**Solution:**
```bash
# Run tests in CI mode locally
CI=true npm run test

# Check Node version matches CI
node --version  # Should be 18.x or 20.x

# Install exact dependencies
rm -rf node_modules package-lock.json
npm ci
```

---

#### 2. Security Scan Failures

**Cause:** Vulnerable dependencies
**Solution:**
```bash
# Check vulnerabilities
npm audit

# Fix automatically (if possible)
npm audit fix

# Update specific packages
npm update package-name

# For unfixable vulnerabilities, assess risk
# and document exceptions if acceptable
```

---

#### 3. E2E Tests Timing Out

**Cause:** Slow network or resource constraints
**Solution:**
```bash
# Increase timeout in playwright.config.ts
timeout: 60000  // 60 seconds

# Run specific browser only
npm run test:e2e:chromium

# Disable parallelization
workers: 1
```

---

#### 4. Docker Build Failures

**Cause:** Layer size, dependencies, or configuration
**Solution:**
```bash
# Build locally to debug
docker build -t agent-feed:debug .

# Check build context size
du -sh .

# Optimize .dockerignore
echo "node_modules" >> .dockerignore
echo "dist" >> .dockerignore
```

---

#### 5. Deployment Stuck

**Cause:** Health checks failing
**Solution:**
```bash
# Check logs
kubectl logs deployment/agent-feed

# Describe pod for events
kubectl describe pod <pod-name>

# Manual health check
curl https://staging.agent-feed.example.com/health

# Force deployment (use with caution)
# In workflow: Check "force_deploy" option
```

---

### Getting Help

**Log Locations:**
- **GitHub Actions**: Actions tab → Select workflow run
- **Application Logs**: Check deployment environment
- **Test Reports**: Download artifacts from workflow runs

**Support Channels:**
- **Internal**: #devops-support Slack channel
- **Documentation**: This guide and inline comments
- **Code Review**: Create PR and tag @devops-team

---

## Best Practices

### 1. Commit Practices

```bash
# Use conventional commits
git commit -m "feat: add new analytics feature"
git commit -m "fix: resolve database connection issue"
git commit -m "chore: update dependencies"

# Keep commits atomic and focused
# One feature/fix per commit

# Run pre-commit checks
git commit
# Checks run automatically via Husky
```

---

### 2. Pull Request Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/short-description
   ```

2. **Make Changes and Commit**
   ```bash
   git add .
   git commit -m "feat: implement feature"
   ```

3. **Push and Create PR**
   ```bash
   git push origin feature/short-description
   # Create PR on GitHub
   ```

4. **Wait for CI Checks**
   - All checks must pass
   - Review coverage reports
   - Address any security findings

5. **Code Review**
   - Request reviews from team
   - Address feedback
   - Re-run CI if needed

6. **Merge**
   - Use "Squash and merge" for clean history
   - Delete branch after merge

---

### 3. Testing Strategy

```bash
# Test locally before pushing
npm run test
npm run test:e2e

# Write tests for new features
# Follow TDD when possible

# Maintain coverage thresholds
# Lines: 70%, Functions: 70%, Branches: 65%

# Add E2E tests for critical flows
# Test user journeys, not just components
```

---

### 4. Security

```bash
# Never commit secrets
# Use .env files (gitignored)
# Store secrets in GitHub Secrets

# Run security scans before merging
npm audit

# Keep dependencies updated
npm outdated
npm update

# Review security scan results
# Address HIGH and CRITICAL vulnerabilities
```

---

### 5. Deployment Safety

```bash
# Deploy to staging first
git push origin develop
# Verify in staging environment

# Run production validation
npm run validate:production

# Deploy during maintenance windows
# For production: 02:00-04:00 UTC

# Monitor post-deployment
# Check error rates and logs

# Have rollback plan ready
# Know how to quickly revert
```

---

### 6. Documentation

```bash
# Document new features
# Update README.md and relevant docs

# Add inline comments for complex logic
# Keep comments up-to-date

# Update this guide for CI/CD changes
# Notify team of pipeline modifications
```

---

## Workflow Examples

### Example 1: Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/user-authentication

# 2. Implement feature with tests
# ... code changes ...

# 3. Run tests locally
npm run test
npm run test:e2e

# 4. Commit (pre-commit hooks run)
git add .
git commit -m "feat: add user authentication"

# 5. Push to remote
git push origin feature/user-authentication

# 6. Create Pull Request
# - CI/CD runs automatically
# - Review test results
# - Address any failures

# 7. After approval, merge to develop
# - Staging deployment triggers automatically

# 8. Test in staging
# - Verify feature works
# - Run smoke tests

# 9. Merge to main for production
git checkout main
git merge develop
git push origin main
# - Requires manual production deployment approval
```

---

### Example 2: Hotfix Deployment

```bash
# 1. Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-bug-fix

# 2. Implement fix
# ... code changes ...

# 3. Test thoroughly
npm run test
npm run test:e2e

# 4. Commit and push
git commit -m "fix: resolve critical bug in payment processing"
git push origin hotfix/critical-bug-fix

# 5. Create PR and expedite review
# - Tag as urgent
# - Fast-track CI checks

# 6. Merge to main
git checkout main
git merge hotfix/critical-bug-fix
git push origin main

# 7. Manual production deployment
# - Actions → Deployment Pipeline
# - Select "production"
# - Get approval
# - Deploy

# 8. Monitor closely
npm run health-check:continuous

# 9. Merge back to develop
git checkout develop
git merge hotfix/critical-bug-fix
git push origin develop
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- Review security scan results
- Update dependencies with vulnerabilities
- Check test coverage trends

**Monthly:**
- Review and update this documentation
- Analyze CI/CD performance metrics
- Clean up old workflow runs and artifacts

**Quarterly:**
- Audit pipeline efficiency
- Review and optimize test suite
- Update CI/CD configuration as needed

---

## Appendix

### Pipeline Metrics

Monitor these metrics for pipeline health:

- **Build Time**: Target < 15 minutes
- **Test Success Rate**: Target > 95%
- **Deployment Frequency**: Track trends
- **Rollback Rate**: Target < 5%
- **Security Findings**: Address HIGH/CRITICAL within 48 hours

### Useful Commands

```bash
# Validate YAML workflows locally
npm install -g yaml-lint
yamllint .github/workflows/*.yml

# Test Docker build
docker build -t agent-feed:test .

# Check bundle size
npm run analyze:bundle

# Performance testing
npm run test:performance

# Database migrations
npm run migrate:agents

# Health checks
npm run health-check
```

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-20 | Initial CI/CD pipeline setup |

---

## Support

For questions or issues with the CI/CD pipeline:

- **Slack**: #devops-support
- **Email**: devops@example.com
- **Documentation**: This guide
- **Issues**: Create GitHub issue with `ci-cd` label

---

**Remember:** The CI/CD pipeline is designed to catch issues early. If checks fail, investigate and fix rather than bypassing them. Quality gates exist to protect production.
