# Code Review Automation Deployment Guide

## Overview

This guide walks through deploying the AI-powered code review automation system that protects the Claude AI response system integrity using specialized agents.

## Architecture

The system consists of:

- **Security Agent**: Scans for vulnerabilities, hardcoded credentials, injection risks
- **Performance Agent**: Analyzes complexity, memory usage, bottlenecks  
- **Architecture Agent**: Validates patterns, coupling, error handling
- **Testing Agent**: Checks coverage, missing tests, test quality
- **Review Orchestrator**: Coordinates agents and consolidates results
- **GitHub Integration**: Posts comments, updates labels, creates reviews

## Prerequisites

### 1. GitHub Repository Setup

```bash
# Ensure GitHub CLI is installed and authenticated
gh auth status

# If not authenticated:
gh auth login
```

### 2. Required Permissions

The GitHub token needs these permissions:
- `contents: read` - Access repository files
- `pull-requests: write` - Comment on and review PRs  
- `issues: write` - Update labels and status
- `checks: write` - Set status checks

### 3. Node.js Dependencies

```bash
# Install dependencies for code analysis tools
cd scripts/code-analysis
npm install

# Verify installation
npm test 2>/dev/null || echo "Tests not configured yet"
```

## Deployment Steps

### 1. Enable GitHub Workflow

The workflow is already created at `.github/workflows/automated-code-review.yml`. It will trigger on:

- Pull request opened, synchronized, or reopened
- Changes to critical files:
  - `simple-backend.js` 
  - `frontend/src/**/*.{ts,tsx,js,jsx}`
  - `src/**/*.{js,ts}`
  - `tests/**`

### 2. Configure Review Rules

Edit `config/code-review-rules.json` to customize:

```json
{
  "codeReviewConfig": {
    "agents": {
      "security": {
        "enabled": true,
        "priority": "critical",
        "rules": {
          "hardcodedSecrets": {
            "severity": "critical",
            "autoBlock": true
          }
        }
      }
    }
  }
}
```

### 3. Test the System

Create a test PR to verify the system works:

```bash
# Create test branch
git checkout -b test-code-review

# Make a small change to trigger review
echo "// Test change" >> simple-backend.js
git add simple-backend.js
git commit -m "Test automated code review system"
git push origin test-code-review

# Create PR
gh pr create --title "Test Code Review" --body "Testing automated review system"
```

### 4. Manual Testing

You can also run the tools manually:

```bash
# Test security scanner
node scripts/code-analysis/security-scanner.js \
  --files "simple-backend.js" \
  --output github

# Test performance checker  
node scripts/code-analysis/performance-checker.js \
  --files "simple-backend.js" \
  --output github

# Test full orchestration
node scripts/code-analysis/pr-integration.js review --pr 123
```

## Configuration Options

### Security Agent Configuration

```json
{
  "security": {
    "rules": {
      "hardcodedSecrets": {
        "severity": "critical",
        "autoBlock": true
      },
      "sqlInjection": {
        "severity": "critical", 
        "autoBlock": true
      },
      "commandInjection": {
        "severity": "critical",
        "autoBlock": true
      }
    }
  }
}
```

### Performance Thresholds

```json
{
  "performance": {
    "rules": {
      "complexityThreshold": 15,
      "performanceRegression": {
        "threshold": "5%",
        "severity": "high"
      }
    }
  }
}
```

### Claude-Specific Monitoring

```json
{
  "claudeSpecific": {
    "criticalPaths": [
      {
        "path": "simple-backend.js",
        "functions": [
          "broadcastToConnections",
          "createInstance", 
          "deleteInstance"
        ],
        "requiredTests": [
          "SSE connection handling",
          "PTY process management"
        ]
      }
    ]
  }
}
```

## Risk Assessment & Actions

### Risk Levels

1. **Critical** (Auto-blocks PR)
   - Security vulnerabilities
   - Missing error handling in critical paths
   - Infinite loops or blocking operations

2. **High** (Manual review recommended)
   - Performance issues
   - Missing tests for new code
   - High complexity functions

3. **Medium** (Comment only)
   - Code style issues
   - Minor architecture concerns
   - Low test coverage

4. **Low** (Auto-approve)
   - Documentation changes
   - Minor refactoring
   - Test additions

### Automated Actions

Based on risk level, the system will:

```javascript
// Critical issues
if (riskScore === 'critical') {
  // Block PR
  gh pr review $PR --request-changes
  gh pr edit $PR --add-label "security-review-required"
}

// High issues  
else if (riskScore === 'high') {
  // Add warning labels
  gh pr edit $PR --add-label "high-risk-change"
  gh pr comment $PR --body "⚠️ High-risk changes detected"
}

// Low risk
else if (riskScore === 'low') {
  // Auto-approve
  gh pr review $PR --approve
  gh pr edit $PR --add-label "auto-approved"  
}
```

## Monitoring & Metrics

### Review Metrics

The system tracks:
- Total reviews conducted
- Issues found by severity
- False positive rates
- Review completion times
- Blocked vs approved PRs

Metrics are stored in `.claude-flow/metrics/review-metrics.json`:

```json
{
  "reviews": 150,
  "issues": 45,
  "fixes": 38, 
  "blockedPRs": 3,
  "approvedPRs": 132,
  "lastUpdate": "2024-01-15T10:30:00Z"
}
```

### Dashboard

View real-time metrics:

```bash
# Show current metrics
cat .claude-flow/metrics/review-metrics.json

# Generate report
node scripts/code-analysis/review-orchestrator.js updateMetrics --pr 123
```

## Troubleshooting

### Common Issues

1. **GitHub CLI Authentication**
```bash
# Check auth status
gh auth status

# Re-authenticate if needed
gh auth login --scopes "repo,workflow"
```

2. **Permission Errors**
```bash
# Make scripts executable
find scripts/code-analysis -name "*.js" -exec chmod +x {} \;
```

3. **Missing Dependencies**
```bash
cd scripts/code-analysis
npm install
```

4. **Workflow Not Triggering**
   - Check that PR touches monitored files
   - Verify workflow file is in `.github/workflows/`
   - Check GitHub Actions tab for errors

### Debug Mode

Enable detailed logging:

```bash
# Set debug environment
export DEBUG=1

# Run with detailed output
node scripts/code-analysis/pr-integration.js review --pr 123
```

### Manual Override

For urgent PRs that need to bypass checks:

```bash
# Add override label
gh pr edit 123 --add-label "review-override"

# Or approve manually
gh pr review 123 --approve --body "Manual override - urgent fix"
```

## Security Considerations

### Secrets Management

Never commit:
- GitHub tokens
- API keys
- Database credentials
- Private keys

Use GitHub Secrets or environment variables:

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
```

### Code Execution

The system analyzes code statically and does not execute it. However:

- Limit analysis to trusted repositories
- Review agent code regularly
- Monitor for malicious pattern injection

### Access Control

- Use least-privilege GitHub tokens
- Restrict who can override reviews
- Log all review decisions
- Regular security audits

## Performance Optimization

### Caching

Enable result caching for faster reviews:

```json
{
  "caching": {
    "enabled": true,
    "ttl": 3600,
    "storage": ".cache/review-results"
  }
}
```

### Parallel Execution

Agents run in parallel by default:

```yaml
# GitHub Actions runs agents concurrently
- name: Security Review Agent
  run: node scripts/code-analysis/security-scanner.js &

- name: Performance Review Agent  
  run: node scripts/code-analysis/performance-checker.js &
```

### Resource Limits

Set timeouts and resource limits:

```json
{
  "agents": {
    "security": {
      "timeout": 300,
      "maxMemory": "512MB"
    }
  }
}
```

## Extending the System

### Adding New Agents

1. Create new agent file:
```javascript
// scripts/code-analysis/my-agent.js
class MyAgent {
  async analyze(files, diffData) {
    // Analysis logic
    return results;
  }
}
```

2. Register in orchestrator:
```javascript
// review-orchestrator.js
case 'my-agent':
  const MyAgent = require('./my-agent');
  const agent = new MyAgent();
  results = await agent.analyze(files, diffData);
  break;
```

3. Add to configuration:
```json
{
  "agents": {
    "my-agent": {
      "enabled": true,
      "priority": "medium"
    }
  }
}
```

### Custom Rules

Add domain-specific rules:

```javascript
// Custom security rule
{
  name: 'Claude API Key Exposure',
  pattern: /claude[_-]?api[_-]?key/gi,
  description: 'Potential Claude API key detected',
  fix: 'Use environment variables for API keys'
}
```

### Integration Hooks

Add webhooks for external systems:

```javascript
// Send to Slack
if (riskScore === 'critical') {
  await postToSlack({
    channel: '#security-alerts',
    message: `Critical security issue in PR #${pr}`
  });
}
```

## Maintenance

### Regular Tasks

1. **Update Dependencies** (Monthly)
```bash
cd scripts/code-analysis
npm audit
npm update
```

2. **Review Metrics** (Weekly)
```bash
node scripts/code-analysis/review-orchestrator.js generateReport
```

3. **Tune Thresholds** (Quarterly)
   - Review false positive rates
   - Adjust sensitivity settings
   - Update rule patterns

4. **Security Audit** (Quarterly)
   - Review agent code
   - Check for new vulnerability patterns
   - Update security rules

### Backup & Recovery

```bash
# Backup configuration
cp -r config/ backups/config-$(date +%Y%m%d)

# Backup metrics  
cp -r .claude-flow/metrics/ backups/metrics-$(date +%Y%m%d)
```

## Success Metrics

Track these KPIs:

- **Coverage**: % of PRs reviewed automatically
- **Accuracy**: True positive rate for issues found
- **Speed**: Average review completion time < 2 minutes
- **Safety**: 0% critical security issues in production
- **Developer Experience**: < 5% false positive rate

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review GitHub Actions logs
3. Check agent-specific error messages
4. Contact the development team

The automated code review system is designed to enhance security and code quality while maintaining developer productivity. Regular monitoring and tuning will ensure optimal performance.