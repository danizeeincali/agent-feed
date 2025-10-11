# Environment Variables Setup Guide

This guide explains how to configure environment variables for the Agent Feed system.

## Quick Start

1. **Copy the template**:
   ```bash
   cp .env.template .env
   ```

2. **Edit `.env`** with your actual values:
   ```bash
   nano .env  # or your preferred editor
   ```

3. **Validate your configuration**:
   ```bash
   npm run validate-env
   ```

4. **Create missing directories** (if needed):
   ```bash
   npm run validate-env -- --create-dirs
   ```

## Required Environment Variables

### Directory Structure (12 variables)

These variables define the core directory structure for the agent system:

| Variable | Description | Example |
|----------|-------------|---------|
| `WORKSPACE_ROOT` | Root workspace directory | `/workspaces/agent-feed` |
| `PROJECT_ROOT` | Project root directory | `/workspaces/agent-feed` |
| `CLAUDE_PROD_DIR` | Claude production directory | `/workspaces/agent-feed/.claude` |
| `CLAUDE_CONFIG_DIR` | Claude configuration directory | `/workspaces/agent-feed/.claude/config` |
| `CLAUDE_MEMORY_DIR` | Claude memory directory | `/workspaces/agent-feed/.claude/memory` |
| `CLAUDE_LOGS_DIR` | Claude logs directory | `/workspaces/agent-feed/.claude/logs` |
| `AGENTS_DIR` | Agents directory | `/workspaces/agent-feed/agents` |
| `AGENT_WORKSPACE_DIR` | Agent workspace directory | `/workspaces/agent-feed/agents/workspace` |
| `AGENT_TEMPLATES_DIR` | Agent templates directory | `/workspaces/agent-feed/agents/templates` |
| `DATABASE_DIR` | Database directory | `/workspaces/agent-feed/data` |
| `TOKEN_ANALYTICS_DB_PATH` | Token analytics DB path | `/workspaces/agent-feed/data/token-analytics.db` |
| `AGENTS_CONFIG_PATH` | Agents config file path | `/workspaces/agent-feed/config/agents.json` |

### Database Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `POSTGRES_DB` | Database name | `avidm_dev` |
| `POSTGRES_USER` | Database user | `postgres` |
| `POSTGRES_PASSWORD` | Database password | `your_password` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |

### API Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-...` |
| `AGENT_MODEL` | Agent model version | `claude-sonnet-4-5-20250929` |
| `AVI_MODEL` | AVI model version | `claude-sonnet-4-5-20250929` |

### Application Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `development` |
| `LOG_LEVEL` | Logging level | `info` |
| `USE_POSTGRES` | Use PostgreSQL vs SQLite | `true` |

## Environment Validator

The environment validator ensures all required variables are set and paths are valid.

### Usage in Code

```typescript
import { validateEnvironmentOrThrow } from './src/utils/env-validator';

// Validate and throw on error
try {
  validateEnvironmentOrThrow({ createMissingDirs: true });
  console.log('Environment is valid!');
} catch (error) {
  console.error('Environment validation failed:', error.message);
  process.exit(1);
}
```

### Validation Features

1. **Missing Variables Detection**: Identifies all missing required variables
2. **Placeholder Detection**: Warns about placeholder values like `your_api_key_here`
3. **Path Validation**: Verifies that directories exist or can be created
4. **Clear Error Messages**: Provides actionable error messages

### Validation Options

```typescript
interface ValidationOptions {
  createMissingDirs?: boolean;     // Create missing directories
  skipPathValidation?: boolean;    // Skip path existence checks
  requiredVars?: string[];         // Validate specific variables only
}
```

### Helper Functions

```typescript
import {
  getRequiredEnvVar,
  getEnvVar,
  getBooleanEnvVar,
  getNumberEnvVar,
} from './src/utils/env-validator';

// Get required variable (throws if missing)
const apiKey = getRequiredEnvVar('ANTHROPIC_API_KEY');

// Get with default value
const logLevel = getEnvVar('LOG_LEVEL', 'info');

// Get boolean
const usePostgres = getBooleanEnvVar('USE_POSTGRES', true);

// Get number
const maxWorkers = getNumberEnvVar('MAX_AGENT_WORKERS', 10);
```

## NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "validate-env": "ts-node scripts/validate-env.ts",
    "validate-env:create": "ts-node scripts/validate-env.ts --create-dirs",
    "validate-env:throw": "ts-node scripts/validate-env.ts --throw"
  }
}
```

## Directory Structure

After running with `--create-dirs`, you should have:

```
/workspaces/agent-feed/
├── .claude/
│   ├── config/
│   ├── memory/
│   └── logs/
├── agents/
│   ├── workspace/
│   └── templates/
├── config/
│   └── agents.json
└── data/
    └── token-analytics.db
```

## Security Best Practices

1. **Never commit `.env`** to version control
2. **Use `.env.template`** as documentation
3. **Rotate API keys** regularly
4. **Use strong passwords** for production databases
5. **Use Docker secrets** in production instead of env vars for sensitive data

## Troubleshooting

### Validation Fails

Run the validator to see detailed error messages:

```bash
npm run validate-env
```

### Missing Directories

Create them automatically:

```bash
npm run validate-env -- --create-dirs
```

### Path Permissions

Ensure you have write permissions:

```bash
ls -la /workspaces/agent-feed
```

### Database Connection Issues

Test the connection:

```bash
psql $DATABASE_URL
```

## Example `.env` File

```bash
# Directory structure
WORKSPACE_ROOT=/workspaces/agent-feed
PROJECT_ROOT=/workspaces/agent-feed
CLAUDE_PROD_DIR=/workspaces/agent-feed/.claude
CLAUDE_CONFIG_DIR=/workspaces/agent-feed/.claude/config
CLAUDE_MEMORY_DIR=/workspaces/agent-feed/.claude/memory
CLAUDE_LOGS_DIR=/workspaces/agent-feed/.claude/logs
AGENTS_DIR=/workspaces/agent-feed/agents
AGENT_WORKSPACE_DIR=/workspaces/agent-feed/agents/workspace
AGENT_TEMPLATES_DIR=/workspaces/agent-feed/agents/templates
DATABASE_DIR=/workspaces/agent-feed/data
TOKEN_ANALYTICS_DB_PATH=/workspaces/agent-feed/data/token-analytics.db
AGENTS_CONFIG_PATH=/workspaces/agent-feed/config/agents.json

# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/avidm_dev
POSTGRES_DB=avidm_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# API
ANTHROPIC_API_KEY=sk-ant-your-key-here
AGENT_MODEL=claude-sonnet-4-5-20250929
AVI_MODEL=claude-sonnet-4-5-20250929

# Application
NODE_ENV=development
LOG_LEVEL=info
USE_POSTGRES=true
```

## Integration with Application

Initialize validation at application startup:

```typescript
// src/index.ts
import { validateEnvironmentOrThrow } from './utils/env-validator';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate environment before starting
validateEnvironmentOrThrow({
  createMissingDirs: true,
});

// Start application...
```

## CI/CD Integration

Add validation to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Validate Environment
  run: npm run validate-env
  env:
    NODE_ENV: test
    # ... other required vars
```

## Related Documentation

- [Phase 1 Setup Guide](./PHASE1-QUICK-START.md)
- [Database Setup](./PHASE1-POSTGRES-BEST-PRACTICES.md)
- [Architecture Overview](./AVI-ARCHITECTURE-INDEX.md)
