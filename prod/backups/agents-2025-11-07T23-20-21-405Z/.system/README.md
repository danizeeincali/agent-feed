# Protected Agent Configuration Sidecars

This directory contains protected configuration files for production agents. These files define security boundaries, resource limits, and operational constraints that cannot be modified by users.

## File Permissions

- **Directory**: 555 (read + execute only, no write)
- **Files**: 444 (read-only, immutable)

## Protected Configuration Format

Each `.protected.yaml` file contains:
- API endpoints and rate limits
- Workspace paths and storage quotas
- Tool permissions and forbidden operations
- Resource limits (memory, CPU, execution time)
- Posting rules and automation policies
- SHA-256 integrity checksum

## Security Features

1. **Integrity Checking**: SHA-256 checksums detect tampering
2. **Immutable Files**: Read-only permissions prevent modifications
3. **Runtime Validation**: Configs validated on every agent load
4. **Tampering Detection**: File watching alerts on unauthorized changes
5. **Automatic Restoration**: Backups enable quick recovery

## Migration Process

Agents are migrated to protected model via:
1. Create protected config sidecar in `.system/`
2. Add `_protected_config_source` reference to agent frontmatter
3. Compute and embed SHA-256 checksum
4. Set file permissions to 444 (immutable)
5. Validate agent loads correctly with protected config

## Migrated Agents

- `meta-agent.protected.yaml` - Agent creation system
- `page-builder-agent.protected.yaml` - Page building infrastructure
- `personal-todos-agent.protected.yaml` - Task management
- `follow-ups-agent.protected.yaml` - Delegation tracking
- `dynamic-page-testing-agent.protected.yaml` - QA testing

## Documentation

See `/workspaces/agent-feed/docs/PROTECTED-FIELDS.md` for complete protected fields reference.
