# Pre-Deployment Checklist - Quick Reference

## Run the Checklist

```bash
npm run pre-deploy
```

## What Gets Checked

| # | Check | Severity | What It Does |
|---|-------|----------|--------------|
| 1 | Tests Passing | CRITICAL | Runs Jest + Playwright tests |
| 2 | Git Clean | CRITICAL | Ensures no uncommitted changes |
| 3 | Environment Vars | CRITICAL | Validates production config |
| 4 | Database Migrations | CRITICAL | Checks migrations are ready |
| 5 | Security Audit | CRITICAL | Scans for vulnerabilities (npm audit) |
| 6 | API Health | IMPORTANT | Tests endpoint responses |
| 7 | No Secrets | CRITICAL | Scans code for hardcoded credentials |
| 8 | Backups | IMPORTANT | Verifies backup procedures exist |
| 9 | Monitoring | IMPORTANT | Checks logging/monitoring config |
| 10 | Production Build | CRITICAL | Runs build process |
| 11 | TypeScript | IMPORTANT | Type checks code |
| 12 | Dependencies | NICE-TO-HAVE | Verifies packages installed |

## Exit Codes

- **0** = Ready to deploy (GREEN)
- **1** = Blocked (RED/YELLOW)

## Status Colors

- **🟢 GREEN** = All critical checks passed → DEPLOY
- **🟡 YELLOW** = Critical passed, some important warnings → REVIEW FIRST
- **🔴 RED** = Critical failures → DO NOT DEPLOY

## Quick Fixes

### Tests Failing
```bash
npm test
npm run test:e2e
```

### Git Uncommitted
```bash
git add .
git commit -m "Your message"
```

### Missing Environment Vars
```bash
cp .env.example .env
# Edit .env with production values
```

### Security Vulnerabilities
```bash
npm audit fix
```

### Build Fails
```bash
rm -rf frontend/dist
npm run build
```

### API Not Responding
```bash
npm run dev  # Start server first
```

## Typical Workflow

```bash
# 1. Before deployment
git add .
git commit -m "Ready for deployment"

# 2. Run checklist
npm run pre-deploy

# 3. If GREEN → Deploy
# If RED/YELLOW → Fix issues and retry

# 4. After deployment
npm run health-check
```

## CI/CD Integration

```yaml
# GitHub Actions
- run: npm run pre-deploy
  env:
    NODE_ENV: production
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## More Information

- **Full Documentation**: [PRE-DEPLOYMENT-CHECKLIST.md](./PRE-DEPLOYMENT-CHECKLIST.md)
- **Deployment Guide**: [README-DEPLOYMENT.md](./README-DEPLOYMENT.md)
- **Implementation**: [DEPLOYMENT-SUMMARY.md](./DEPLOYMENT-SUMMARY.md)

## Support

Run with `--help` flag (if implemented) or check documentation above.

---

**Quick Tip**: Run `npm run pre-deploy` before every production deployment to catch issues early!
