# Claude AI CI/CD Pipeline Setup Guide

## 🚀 Overview

This guide provides instructions for setting up branch protection rules and merge requirements to ensure the CI/CD pipeline prevents regressions in the Claude AI response system.

## 📋 Branch Protection Rules Configuration

### Required Status Checks

Navigate to your GitHub repository settings and configure the following branch protection rules for the `main` branch:

#### 1. Required Status Checks
Enable "Require status checks to pass before merging" and require these checks:

```
✅ security-scan
✅ test-matrix (Node.js 18.x, unit)
✅ test-matrix (Node.js 18.x, integration) 
✅ test-matrix (Node.js 18.x, e2e)
✅ test-matrix (Node.js 20.x, unit)
✅ test-matrix (Node.js 20.x, integration)
✅ test-matrix (Node.js 20.x, e2e)
✅ test-matrix (Node.js 22.x, unit)
✅ test-matrix (Node.js 22.x, integration)
✅ test-matrix (Node.js 22.x, e2e)
✅ performance-tests
✅ claude-ai-specific-tests
✅ coverage-report
✅ quality-gates
```

#### 2. Additional Protection Rules

```yaml
Branch Protection Settings:
  Restrict pushes that create files: false
  Require branches to be up to date before merging: true
  Require pull request reviews before merging: true
    - Required approving reviews: 1
    - Dismiss stale reviews when new commits are pushed: true
    - Require review from code owners: true
  Restrict who can dismiss pull request reviews: true
  Allow specified actors to bypass required pull requests: false
  Require status checks to pass before merging: true
  Require branches to be up to date before merging: true
  Include administrators: true
  Allow force pushes: false
  Allow deletions: false
```

### 3. CODEOWNERS Configuration

Create a `.github/CODEOWNERS` file:

```
# Global code owners
* @your-team/claude-ai-maintainers

# CI/CD Pipeline files require additional review
.github/workflows/ @your-team/devops @your-team/claude-ai-maintainers
scripts/ @your-team/devops @your-team/claude-ai-maintainers
jest.ci.config.js @your-team/devops @your-team/claude-ai-maintainers

# Critical Claude AI files
simple-backend.js @your-team/backend-team @your-team/claude-ai-maintainers
frontend/src/managers/ClaudeInstanceManager.ts @your-team/frontend-team @your-team/claude-ai-maintainers
frontend/src/components/claude-manager/ @your-team/frontend-team @your-team/claude-ai-maintainers
```

## 🔒 Merge Protection Strategy

### Quality Gates Enforcement

The CI/CD pipeline implements these quality gates that MUST pass before merging:

1. **Zero Test Failures**: All unit, integration, and E2E tests must pass
2. **Code Coverage**: Minimum 80% coverage for new code
3. **Performance Regression**: No performance degradation > 30%
4. **Security Scan**: No vulnerabilities above medium severity
5. **Claude AI Stability**: SSE connections and response processing must be stable

### Automatic Merge Prevention

The pipeline will automatically prevent merges when:

- Any test fails across any Node.js version (18.x, 20.x, 22.x)
- Code coverage drops below threshold
- Performance regressions are detected
- Security vulnerabilities are found
- Claude AI specific tests fail
- SSE connection stability issues occur

## 📊 Monitoring & Alerts

### GitHub Actions Notifications

Configure the following notification channels:

#### Slack Integration
```yaml
# Add to repository secrets
SLACK_WEBHOOK_URL: "your-slack-webhook"
SLACK_CHANNEL: "#claude-ai-alerts"
```

#### Email Notifications
```yaml
# Add to repository secrets  
NOTIFICATION_EMAIL: "team@yourcompany.com"
```

### Performance Monitoring Dashboard

The pipeline generates performance reports available at:

- **Latest Report**: `performance-reports/latest.json`
- **HTML Dashboard**: `performance-reports/performance-report-[timestamp].html`
- **Trend Analysis**: Updated daily with baseline comparisons

## 🛠️ Local Development Testing

Before pushing changes, developers should run:

```bash
# Run the full CI test suite locally
npm run test:ci

# Run specific test categories
npm run test:integration
npm run test:performance  
npm run test:claude-ai

# Check performance locally
./scripts/test-setup.sh
node simple-backend.js &
npm run test:performance:comprehensive
```

## 🔄 Deployment Pipeline Integration

### Staging Deployment
Only after all CI checks pass:
1. Deploy to staging environment
2. Run additional smoke tests
3. Performance validation against production baseline

### Production Deployment
Requires:
1. All CI/CD checks passing
2. Manual approval from code owners
3. Successful staging deployment
4. Performance regression analysis approval

## 📈 Performance Baseline Management

### Establishing Baselines
```bash
# Create initial performance baseline
./scripts/generate-performance-report.js
cp performance-reports/latest.json performance-baseline.json
git add performance-baseline.json
git commit -m "Update performance baseline"
```

### Updating Baselines
Performance baselines should be updated:
- After major feature releases
- Following performance optimizations
- Quarterly as part of maintenance

## 🚨 Emergency Procedures

### Bypassing CI for Hotfixes
In critical emergencies only:

1. Create hotfix branch from main
2. Request emergency bypass from administrators
3. Apply minimal fix
4. Run abbreviated test suite manually
5. Merge with administrative override
6. Create follow-up PR to ensure full CI compliance

### Rollback Procedure
If a regression is detected in production:

1. Immediate rollback to previous stable version
2. Analyze failure in CI pipeline logs
3. Update regression tests to catch the issue
4. Fix and re-deploy through normal CI/CD process

## 📋 Troubleshooting Common Issues

### Test Timeouts in CI
```bash
# Increase Jest timeout in jest.ci.config.js
module.exports = {
  testTimeout: 45000, // Increase from 30000
  // ... other config
};
```

### Memory Issues in CI
```bash
# Reduce Jest workers in CI environment
maxWorkers: process.env.CI ? 1 : '50%'
```

### Claude AI Mock Issues
```bash
# Verify mock Claude CLI setup
MOCK_CLAUDE_CLI=true node scripts/mock-claude-cli.js health
```

## 🔍 Monitoring CI Health

### Key Metrics to Track
- Test execution time trends
- Flaky test identification
- Resource usage in CI
- Success/failure rates by test category

### Weekly CI Health Check
1. Review failed build trends
2. Analyze performance regression reports
3. Update dependencies if needed
4. Review and update test timeouts
5. Check for outdated browser versions in E2E tests

## 📚 Additional Resources

- **GitHub Actions Documentation**: https://docs.github.com/actions
- **Branch Protection Rules**: https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches
- **Jest CI Configuration**: https://jestjs.io/docs/configuration
- **Playwright CI Setup**: https://playwright.dev/docs/ci

---

**Remember**: The CI/CD pipeline is designed to prevent Claude AI response system regressions. Never bypass these checks unless in a genuine emergency, and always create follow-up work to ensure compliance.