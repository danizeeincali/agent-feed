# Environment Validation Script

## Overview

The `validate-environment.ts` script performs comprehensive validation of the Agent Feed development environment, checking all critical configuration, paths, permissions, and system requirements.

## Usage

```bash
# From project root
npx tsx scripts/validate-environment.ts

# Or make it executable and run directly
chmod +x scripts/validate-environment.ts
./scripts/validate-environment.ts
```

## What It Validates

### 1. Environment Variables (12 Core Variables)
- ✅ `WORKSPACE_ROOT` - Project workspace root directory
- ✅ `PROJECT_ROOT` - Project root directory
- ✅ `CLAUDE_PROD_DIR` - Claude production directory
- ✅ `CLAUDE_CONFIG_DIR` - Claude configuration directory
- ✅ `CLAUDE_MEMORY_DIR` - Claude memory directory
- ✅ `CLAUDE_LOGS_DIR` - Claude logs directory
- ✅ `AGENTS_DIR` - Agents directory
- ✅ `AGENT_WORKSPACE_DIR` - Agent workspace directory
- ✅ `AGENT_TEMPLATES_DIR` - Agent templates directory
- ✅ `DATABASE_DIR` - Database directory
- ✅ `TOKEN_ANALYTICS_DB_PATH` - Token analytics database path
- ✅ `AGENTS_CONFIG_PATH` - Agents configuration file path

Plus additional database, API, and configuration variables.

### 2. Path Validation
- Checks if all configured paths exist
- Verifies paths are directories (not files)
- Validates parent directories for database files

### 3. File Permissions
- Read/write permissions on critical directories
- Execute permissions on shell scripts (`run-avi.sh`, `run-avi-cli.sh`)

### 4. Database Connectivity
- **PostgreSQL**: Connection test, version check, schema validation
- **SQLite**: Database access test, table count verification

### 5. Node.js Version
- Validates Node.js >= 18.0.0 (required for ES modules)

### 6. NPM Package Integrity
- Checks `node_modules` exists
- Validates all dependencies are installed

### 7. Git Repository State
- Confirms repository is initialized
- Shows current branch
- Reports uncommitted changes

### 8. Disk Space
- ❌ Fails if < 2 GB available
- ⚠️  Warns if < 4 GB available
- ✅ Passes if >= 4 GB available

## Output

### Console Output
Colorized terminal output with:
- ✅ Green checkmarks for passed checks
- ❌ Red X marks for failed checks
- ⚠️  Yellow warnings for non-critical issues

### JSON Report
Generated at: `/workspaces/agent-feed/logs/env-validation-report.json`

Report includes:
- Timestamp
- Environment details (Node version, platform, arch, hostname)
- Summary (total, passed, failed, warnings)
- Detailed results array with all checks

## Exit Codes

- **0**: All validations passed (may have warnings)
- **1**: One or more validations failed

## Example Output

```
╔════════════════════════════════════════════════════════════════════════════╗
║              Agent Feed - Environment Validation Script                   ║
╚════════════════════════════════════════════════════════════════════════════╝

================================================================================
Environment Variables Validation
================================================================================

✅ [Environment Variables] WORKSPACE_ROOT
   WORKSPACE_ROOT is set
✅ [Environment Variables] PROJECT_ROOT
   PROJECT_ROOT is set
...

================================================================================
VALIDATION SUMMARY
================================================================================

Total Checks:  57
Passed:        50
Failed:        5
Warnings:      2

❌ VALIDATION FAILED
Please fix the errors above before proceeding.
```

## Troubleshooting

### Missing Directories
If validation fails due to missing directories:
```bash
# Create missing Claude directories
mkdir -p /workspaces/agent-feed/.claude/{config,memory,logs}

# Create agent workspace
mkdir -p /workspaces/agent-feed/agents/workspace
```

### Permission Issues
```bash
# Fix permissions on directories
chmod -R u+rw /workspaces/agent-feed/.claude
chmod -R u+rw /workspaces/agent-feed/data

# Make scripts executable
chmod +x /workspaces/agent-feed/scripts/*.sh
```

### Missing Dependencies
```bash
# Reinstall dependencies
npm install
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start PostgreSQL container
docker-compose up -d postgres
```

### Insufficient Disk Space
```bash
# Check disk space
df -h

# Clean up Docker
docker system prune -af

# Clean npm cache
npm cache clean --force

# Remove old node_modules
rm -rf node_modules package-lock.json
npm install
```

## Integration

### CI/CD Pipeline
```yaml
# .github/workflows/validate.yml
- name: Validate Environment
  run: npx tsx scripts/validate-environment.ts
```

### Pre-commit Hook
```bash
# .git/hooks/pre-commit
#!/bin/bash
npx tsx scripts/validate-environment.ts || exit 1
```

### NPM Script
Add to `package.json`:
```json
{
  "scripts": {
    "validate": "tsx scripts/validate-environment.ts",
    "validate:ci": "tsx scripts/validate-environment.ts 2>&1 | tee logs/validation.log"
  }
}
```

## Environment Variable Reference

All environment variables should be defined in `.env` (copied from `.env.template`). See `.env.template` for detailed descriptions and default values.

## Report Format

The JSON report (`logs/env-validation-report.json`) contains:

```json
{
  "timestamp": "2025-10-10T16:35:32.148Z",
  "environment": {
    "nodeVersion": "v22.17.0",
    "platform": "linux",
    "arch": "x64",
    "hostname": "codespaces-005acc"
  },
  "summary": {
    "total": 57,
    "passed": 50,
    "failed": 5,
    "warnings": 2
  },
  "results": [
    {
      "category": "Environment Variables",
      "check": "WORKSPACE_ROOT",
      "status": "pass",
      "message": "WORKSPACE_ROOT is set",
      "details": { "value": "/workspaces/agent-feed" },
      "timestamp": "2025-10-10T16:35:29.442Z"
    }
    // ... more results
  ]
}
```
