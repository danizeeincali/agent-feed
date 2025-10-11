# Environment Validation Coverage Report

## Summary

The `validate-environment.ts` script validates **all 12 core environment variables** from `.env.template` plus 17 additional configuration variables, totaling **29 environment variables** validated.

## Validated Environment Variables

### Core Directory Paths (12 Variables)

1. ✅ **WORKSPACE_ROOT** - Root workspace directory
   - Required: Yes
   - Validates: Existence, directory type, permissions

2. ✅ **PROJECT_ROOT** - Project root directory
   - Required: Yes
   - Validates: Existence, directory type, permissions

3. ✅ **CLAUDE_PROD_DIR** - Claude production directory
   - Required: Yes
   - Validates: Existence, directory type, read/write permissions

4. ✅ **CLAUDE_CONFIG_DIR** - Claude configuration directory
   - Required: Yes
   - Validates: Existence, directory type, read/write permissions

5. ✅ **CLAUDE_MEMORY_DIR** - Claude memory directory
   - Required: Yes
   - Validates: Existence, directory type, read/write permissions

6. ✅ **CLAUDE_LOGS_DIR** - Claude logs directory
   - Required: Yes
   - Validates: Existence, directory type, read/write permissions

7. ✅ **AGENTS_DIR** - Agents directory
   - Required: Yes
   - Validates: Existence, directory type, permissions

8. ✅ **AGENT_WORKSPACE_DIR** - Agent workspace directory
   - Required: Yes
   - Validates: Existence, directory type, read/write permissions

9. ✅ **AGENT_TEMPLATES_DIR** - Agent templates directory
   - Required: Yes
   - Validates: Existence, directory type, permissions

10. ✅ **DATABASE_DIR** - Database directory
    - Required: Yes
    - Validates: Existence, directory type, read/write permissions

11. ✅ **TOKEN_ANALYTICS_DB_PATH** - Token analytics database path
    - Required: Yes
    - Validates: Parent directory existence, permissions

12. ✅ **AGENTS_CONFIG_PATH** - Agents configuration file path
    - Required: Yes
    - Validates: Parent directory existence, permissions

### PostgreSQL Configuration (6 Variables)

13. ✅ **POSTGRES_DB** - PostgreSQL database name
    - Required: Yes
    - Validates: Non-empty value

14. ✅ **POSTGRES_USER** - PostgreSQL username
    - Required: Yes
    - Validates: Non-empty value

15. ✅ **POSTGRES_PASSWORD** - PostgreSQL password
    - Required: Yes
    - Validates: Non-empty value (redacted in reports)

16. ✅ **DB_HOST** - Database host
    - Required: Yes
    - Validates: Non-empty value

17. ✅ **DB_PORT** - Database port
    - Required: Yes
    - Validates: Non-empty value

18. ✅ **DATABASE_URL** - Full PostgreSQL connection string
    - Required: Yes
    - Validates: Non-empty value, actual connection test

### API Configuration (3 Variables)

19. ✅ **ANTHROPIC_API_KEY** - Anthropic API key
    - Required: Yes
    - Validates: Non-empty value, not placeholder, minimum length
    - Security: Redacted in reports

20. ✅ **AGENT_MODEL** - Claude model for agents
    - Required: Yes
    - Validates: Non-empty value

21. ✅ **AVI_MODEL** - Claude model for AVI
    - Required: Yes
    - Validates: Non-empty value

### Application Environment (3 Variables)

22. ✅ **NODE_ENV** - Application environment
    - Required: Yes
    - Validates: Non-empty value

23. ✅ **LOG_LEVEL** - Logging level
    - Required: No (optional)
    - Validates: Warns if not set

24. ✅ **USE_POSTGRES** - PostgreSQL enable flag
    - Required: Yes
    - Validates: Non-empty value

### Connection Pool Settings (5 Variables)

25. ✅ **DB_POOL_MIN** - Minimum pool connections
    - Required: No (optional)
    - Validates: Checks if set

26. ✅ **DB_POOL_MAX** - Maximum pool connections
    - Required: No (optional)
    - Validates: Checks if set

27. ✅ **DB_IDLE_TIMEOUT_MS** - Idle timeout
    - Required: No (optional)
    - Validates: Checks if set

28. ✅ **DB_CONNECTION_TIMEOUT_MS** - Connection timeout
    - Required: No (optional)
    - Validates: Checks if set

29. ✅ **DB_STATEMENT_TIMEOUT_MS** - Statement timeout
    - Required: No (optional)
    - Validates: Checks if set

## Additional Validations

### Path Validations
- All directory paths are checked for existence
- All directories are verified to be directories (not files)
- Parent directories for file paths are validated

### Permission Validations
- Read/write permissions on writable directories
- Execute permissions on shell scripts:
  - `run-avi.sh`
  - `run-avi-cli.sh`

### Database Connectivity
- **PostgreSQL**: 
  - Connection test
  - Version check
  - Schema validation (table count)
- **SQLite**:
  - Database access test
  - Version check
  - Schema validation (table count)

### System Requirements
- **Node.js**: Version >= 18.0.0
- **NPM**: Package integrity check
- **Git**: Repository state validation
- **Disk Space**: Minimum 2GB available (warns at 4GB)

## Validation Categories

| Category | Checks | Pass Criteria |
|----------|--------|---------------|
| Environment Variables | 29 variables | All required vars set and non-empty |
| Path Validation | 12 paths | All exist and are accessible |
| File Permissions | 6 directories + 2 scripts | Read/write/execute as needed |
| PostgreSQL | 2 checks | Connection + schema |
| SQLite | 2 checks | Connection + schema |
| Node.js | 1 check | Version >= 18.0.0 |
| NPM | 2 checks | node_modules + dependencies |
| Git | 3 checks | Repository + branch + status |
| Disk Space | 1 check | >= 2GB available |

## Actionable Error Messages

All validation failures include:
- Clear error description
- Expected vs actual values
- Actionable suggestions for fixing

### Example Error Messages

```bash
❌ [Path Validation] CLAUDE_CONFIG_DIR
   Path does not exist: /workspaces/agent-feed/.claude/config
   Details: {
     "path": "/workspaces/agent-feed/.claude/config",
     "suggestion": "Create directory: mkdir -p /workspaces/agent-feed/.claude/config"
   }
```

```bash
❌ [PostgreSQL] Connection
   Failed to connect to PostgreSQL database
   Details: {
     "error": "ECONNREFUSED",
     "connectionString": "postgresql://postgres:***@localhost:5432/avidm_dev",
     "suggestion": "Check if PostgreSQL is running and credentials are correct"
   }
```

```bash
❌ [Disk Space] Available Space
   Insufficient disk space: 1.30 GB available
   Details: {
     "available": "1.30 GB",
     "required": ">= 2 GB",
     "suggestion": "Free up disk space before continuing"
   }
```

## Total Coverage

- **Environment Variables**: 29/29 (100%)
- **Path Validations**: 12/12 (100%)
- **Permission Checks**: 8 items
- **Database Tests**: 4 checks (2 per database)
- **System Checks**: 7 checks
- **Total Validation Checks**: 57+

## Exit Codes

- **0**: All validations passed (warnings allowed)
- **1**: One or more critical validations failed

## Report Generation

JSON report generated at: `/workspaces/agent-feed/logs/env-validation-report.json`

Report includes:
- Timestamp
- Environment info (Node version, platform, arch, hostname)
- Summary statistics (total, passed, failed, warnings)
- Detailed results for every check
- Actionable error messages and suggestions
