# Plan B: Protected Agent Definition Fields Architecture

## Overview
Establish a protection mechanism for critical agent definition fields (particularly API usage rules and system boundaries) while maintaining user customizability for personality and behavior.

## 1. Field Classification

### Protected Fields (System-Controlled)
**CANNOT be edited by users**:
```yaml
protected_fields:
  - api_endpoints              # Which APIs agent can access
  - api_methods                # HTTP methods allowed
  - api_rate_limits            # Request throttling rules
  - system_boundaries          # Directory access restrictions
  - security_policies          # Authentication/authorization rules
  - tool_permissions           # Which tools agent can use
  - resource_limits            # Memory, CPU, storage caps
  - posting_rules              # When/how to post outcomes
  - workspace_path             # Where agent can write files
  - forbidden_operations       # Blacklisted operations
```

### User-Editable Fields
**CAN be edited by users**:
```yaml
user_editable_fields:
  - name                       # Agent display name
  - description                # Agent purpose description
  - personality                # Tone, style, communication preferences
  - specialization             # Domain expertise
  - custom_instructions        # Task-specific guidance
  - priority_preferences       # How agent prioritizes work
  - notification_preferences   # When to notify user
  - autonomous_mode            # Level of autonomy
```

## 2. Architecture: Split Configuration Files (RECOMMENDED)

**Structure**:
```
/prod/.claude/agents/
├── agent-name/
│   ├── agent.yaml              # User-editable (personality, preferences)
│   └── .system/
│       └── protected.yaml      # System-controlled (read-only, API rules)
```

### agent.yaml (User-editable)
```yaml
name: "Strategic Planner"
description: "Helps with long-term strategic planning and goal setting"
personality:
  tone: "professional and insightful"
  style: "structured and analytical"
  emoji_usage: "moderate"
specialization:
  - strategic_planning
  - goal_analysis
  - roadmap_creation
custom_instructions: |
  Focus on actionable outcomes.
  Always consider long-term implications.
  Provide 3 options when possible.
autonomous_mode: "collaborative"  # supervised | collaborative | autonomous
priority_preferences:
  focus: "strategic_value"
  timeframe: "long_term"
```

### protected.yaml (System-controlled, read-only)
```yaml
version: "1.0.0"
schema_version: "2024.1"
system_controlled: true
permissions:
  api_access:
    base_url: "http://localhost:3001/api"
    endpoints:
      - path: "/posts"
        methods: ["GET", "POST"]
        rate_limit: "10/minute"
      - path: "/posts/:id/comments"
        methods: ["GET", "POST"]
        rate_limit: "20/minute"
      - path: "/work-queue"
        methods: ["GET"]
        rate_limit: "60/minute"
    authentication:
      type: "internal"
      required: true
  tool_permissions:
    allowed:
      - Read
      - Write
      - Edit
      - Bash
      - Grep
      - Glob
    forbidden:
      - KillShell  # Prevent killing system processes
  workspace:
    root: "/workspaces/agent-feed/prod/agent_workspace"
    subdirectory: "agents/strategic-planner"
    max_storage: "1GB"
    allowed_paths:
      - "/workspaces/agent-feed/prod/agent_workspace/agents/strategic-planner/**"
      - "/workspaces/agent-feed/prod/agent_workspace/shared/**"
    forbidden_paths:
      - "/workspaces/agent-feed/prod/system_instructions/**"
      - "/workspaces/agent-feed/src/**"
      - "/workspaces/agent-feed/api-server/**"
  resource_limits:
    max_memory: "512MB"
    max_cpu_percent: 50
    max_execution_time: "300s"
    max_concurrent_tasks: 3
  posting_rules:
    auto_post_outcomes: true
    post_threshold: "completed_task"  # never | completed_task | significant_outcome | always
    default_post_type: "reply"  # reply | new_post | auto
  security:
    sandbox_enabled: true
    network_access: "api_only"  # none | api_only | restricted | full
    file_operations: "workspace_only"  # none | workspace_only | restricted | full
```

**Advantages**:
- Clear separation of concerns
- `.system/` directory signals protection
- User can't accidentally modify system rules
- Easy to version control separately
- System can update protected.yaml without touching user config

## 3. Protection Enforcement Mechanisms

### File System Protection
```bash
# Make .system directory read-only for user processes
chmod 555 /prod/.claude/agents/*/.system/
chmod 444 /prod/.claude/agents/*/.system/protected.yaml

# Ownership: root or system user
chown root:agents /prod/.claude/agents/*/.system/protected.yaml
```

### Runtime Validation
```typescript
class AgentConfigValidator {
  private protectedSchema: ProtectedConfigSchema;

  async validateAgentConfig(agentName: string): Promise<ValidationResult> {
    // Load both configs
    const userConfig = await this.loadUserConfig(agentName);
    const protectedConfig = await this.loadProtectedConfig(agentName);

    // Verify protected config hasn't been tampered with
    if (!this.verifyProtectedConfigIntegrity(protectedConfig)) {
      throw new SecurityError('Protected config has been modified');
    }

    // Merge configs
    return this.mergeConfigs(userConfig, protectedConfig);
  }

  private verifyProtectedConfigIntegrity(config: ProtectedConfig): boolean {
    // Verify checksum or signature
    const computedHash = this.computeHash(config);
    const storedHash = config._metadata?.hash;
    return computedHash === storedHash;
  }

  private mergeConfigs(user: UserConfig, protected: ProtectedConfig): AgentConfig {
    // Protected config takes precedence for system fields
    return {
      ...user,
      _protected: protected,
      // Protected fields cannot be overridden
      api_endpoints: protected.permissions.api_access.endpoints,
      tool_permissions: protected.permissions.tool_permissions,
      workspace_path: protected.permissions.workspace,
      resource_limits: protected.permissions.resource_limits,
    };
  }
}
```

### Agent Loader with Protection
```typescript
class ProtectedAgentLoader {
  private validator: AgentConfigValidator;
  private configCache: Map<string, AgentConfig>;

  async loadAgent(agentName: string): Promise<AgentConfig> {
    // Check cache
    if (this.configCache.has(agentName)) {
      return this.configCache.get(agentName)!;
    }

    // Load and validate
    const config = await this.validator.validateAgentConfig(agentName);

    // Cache validated config
    this.configCache.set(agentName, config);

    return config;
  }

  async reloadAgent(agentName: string): Promise<void> {
    // Clear cache and reload
    this.configCache.delete(agentName);
    await this.loadAgent(agentName);
  }

  watchForChanges(): void {
    // Watch user config files
    const watcher = fs.watch('/prod/.claude/agents', { recursive: true });

    watcher.on('change', (eventType, filename) => {
      // Only reload on user config changes
      if (filename.endsWith('agent.yaml')) {
        const agentName = this.extractAgentName(filename);
        this.reloadAgent(agentName);
      }

      // Alert on protected config changes (should never happen)
      if (filename.includes('.system/protected.yaml')) {
        logger.error(`⚠️ Protected config modified: ${filename}`);
        // Restore from backup
        this.restoreProtectedConfig(filename);
      }
    });
  }
}
```

## 4. System Update Mechanism

### Updating Protected Configs
```typescript
class ProtectedConfigManager {
  // Only system/admin can call this
  async updateProtectedConfig(
    agentName: string,
    updates: Partial<ProtectedConfig>
  ): Promise<void> {
    // Verify caller has system privileges
    if (!this.hasSystemPrivileges()) {
      throw new SecurityError('Unauthorized: System privileges required');
    }

    // Load current protected config
    const current = await this.loadProtectedConfig(agentName);

    // Backup before modification
    await this.backupProtectedConfig(agentName, current);

    // Apply updates
    const updated = { ...current, ...updates };

    // Compute new integrity hash
    updated._metadata = {
      hash: this.computeHash(updated),
      updated_at: new Date().toISOString(),
      version: this.incrementVersion(current._metadata?.version),
    };

    // Write atomically
    await this.writeProtectedConfig(agentName, updated);

    // Trigger agent reload
    await this.agentLoader.reloadAgent(agentName);

    logger.info(`✅ Updated protected config for ${agentName}`);
  }

  private async backupProtectedConfig(
    agentName: string,
    config: ProtectedConfig
  ): Promise<void> {
    const backupPath = `/prod/backups/agent-configs/${agentName}/${Date.now()}.yaml`;
    await fs.promises.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.promises.writeFile(backupPath, yaml.stringify(config));
  }
}
```

### Migration Strategy for Existing Agents
```typescript
class AgentConfigMigrator {
  async migrateToProtectedModel(): Promise<void> {
    const agents = await this.discoverAgents();

    for (const agentPath of agents) {
      const agentName = path.basename(agentPath);

      // Read existing agent config
      const existing = await this.loadExistingConfig(agentPath);

      // Split into user and protected configs
      const { userConfig, protectedConfig } = this.splitConfig(existing);

      // Create .system directory
      const systemDir = path.join(agentPath, '.system');
      await fs.promises.mkdir(systemDir, { recursive: true });

      // Write separated configs
      await this.writeUserConfig(agentPath, userConfig);
      await this.writeProtectedConfig(systemDir, protectedConfig);

      // Set permissions
      await this.setProtections(systemDir);

      logger.info(`✅ Migrated ${agentName} to protected model`);
    }
  }

  private splitConfig(config: any): {
    userConfig: UserConfig;
    protectedConfig: ProtectedConfig;
  } {
    const protectedFieldNames = [
      'api_endpoints', 'api_methods', 'api_rate_limits',
      'system_boundaries', 'security_policies', 'tool_permissions',
      'resource_limits', 'posting_rules', 'workspace_path',
      'forbidden_operations'
    ];

    const userConfig: any = {};
    const protectedConfig: any = { permissions: {} };

    for (const [key, value] of Object.entries(config)) {
      if (protectedFieldNames.includes(key)) {
        protectedConfig.permissions[key] = value;
      } else {
        userConfig[key] = value;
      }
    }

    return { userConfig, protectedConfig };
  }
}
```

## 5. User Interface Considerations

### Visual Indicators
```markdown
# Strategic Planner Configuration

## Basic Settings (Editable)
- **Name**: Strategic Planner
- **Description**: Helps with long-term strategic planning
- **Personality**: Professional and insightful

## System Configuration (Protected) 🔒
- **Workspace**: `/prod/agent_workspace/agents/strategic-planner`
- **API Access**: Limited to agent-feed API
- **Tool Permissions**: Read, Write, Edit, Bash, Grep, Glob
- **Resource Limits**: 512MB RAM, 50% CPU

ℹ️ Protected fields are managed by the system and cannot be edited.
```

---

## IMPLEMENTATION PHASES

### Phase 1: Schema Definition
**Status**: ⏸️ NOT STARTED

**Tasks**:
1. Define protected config schema in `/workspaces/agent-feed/src/config/schemas/protected-config.schema.ts`
   - Create TypeScript interfaces for `ProtectedConfig`
   - Define validation rules using Zod or similar
   - Document all protected field meanings
   - Create example protected config

2. Define user config schema in `/workspaces/agent-feed/src/config/schemas/user-config.schema.ts`
   - Create TypeScript interfaces for `UserConfig`
   - Define validation rules
   - Document all user-editable field meanings
   - Create example user config

3. Create validation rules in `/workspaces/agent-feed/src/config/validators/`
   - Implement protected config validator
   - Implement user config validator
   - Add cross-field validation
   - Add format validation (URLs, paths, etc.)

4. Document all protected fields in `/workspaces/agent-feed/docs/PROTECTED-FIELDS.md`
   - List each protected field
   - Explain why it's protected
   - Provide examples
   - Document security implications

**Acceptance Criteria**:
- [ ] TypeScript interfaces defined for both config types
- [ ] Validation schemas created and tested
- [ ] Example configs validate successfully
- [ ] Documentation complete and clear

---

### Phase 2: File Structure Migration
**Status**: ⏸️ NOT STARTED
**Depends On**: Phase 1

**Tasks**:
1. Create `.system/` directories for all existing agents
   - Scan `/prod/.claude/agents/` for agent directories
   - Create `.system/` subdirectory in each
   - Create `.gitkeep` or README in each .system/

2. Split existing agent configs into user + protected
   - Implement `AgentConfigMigrator` class
   - Read existing agent files
   - Parse and split fields based on classification
   - Validate split configs against schemas

3. Write separated configs to new locations
   - Write `agent.yaml` (user-editable)
   - Write `.system/protected.yaml` (system-controlled)
   - Preserve any custom fields not in schemas

4. Set file permissions on `.system/` directories
   - Set directory to 555 (read-only, executable)
   - Set protected.yaml to 444 (read-only)
   - Set ownership to system user if applicable

5. Create backup mechanism before migration
   - Backup all existing agent configs to `/prod/backups/pre-migration/`
   - Include timestamp in backup directory name
   - Verify backups are readable

**Acceptance Criteria**:
- [ ] All agents have `.system/` directories
- [ ] All configs successfully split
- [ ] File permissions correctly set
- [ ] Backups created and verified
- [ ] No data loss during migration

---

### Phase 3: Runtime Protection
**Status**: ⏸️ NOT STARTED
**Depends On**: Phase 2

**Tasks**:
1. Implement `AgentConfigValidator` in `/workspaces/agent-feed/src/config/agent-config-validator.ts`
   - Load and parse user config (agent.yaml)
   - Load and parse protected config (.system/protected.yaml)
   - Validate both against schemas
   - Merge configs with protected taking precedence

2. Implement `ProtectedAgentLoader` in `/workspaces/agent-feed/src/config/protected-agent-loader.ts`
   - Add config cache (Map)
   - Implement `loadAgent()` method
   - Implement `reloadAgent()` method
   - Add logging for load/reload events

3. Add integrity checking for protected configs
   - Compute SHA-256 hash of protected config content
   - Store hash in `_metadata.hash` field
   - Verify hash on each load
   - Throw error if hash mismatch detected

4. Add tampering detection with file watcher
   - Use `fs.watch()` to monitor `.system/` directories
   - Detect unauthorized modifications
   - Log security alert
   - Restore from backup if tampering detected
   - Notify system admin

**Acceptance Criteria**:
- [ ] Configs load and merge correctly
- [ ] Protected fields cannot be overridden by user config
- [ ] Integrity checking detects modifications
- [ ] File watcher detects tampering attempts
- [ ] Security alerts logged appropriately

---

### Phase 4: Update Mechanisms
**Status**: ⏸️ NOT STARTED
**Depends On**: Phase 3

**Tasks**:
1. Implement `ProtectedConfigManager` in `/workspaces/agent-feed/src/config/protected-config-manager.ts`
   - Add system privilege verification
   - Implement `updateProtectedConfig()` method
   - Add backup before update
   - Compute new integrity hash
   - Write atomically (temp file + rename)

2. Create system update API endpoint
   - POST `/api/system/agents/:agentName/protected-config`
   - Require system authentication token
   - Validate update payload against schema
   - Call `ProtectedConfigManager.updateProtectedConfig()`
   - Return success/failure response

3. Add version control for protected configs
   - Add `version` field to protected config metadata
   - Implement semantic versioning (major.minor.patch)
   - Auto-increment version on updates
   - Store version history in backup directory

4. Test update rollback mechanism
   - Implement `rollbackProtectedConfig()` method
   - Restore from latest backup
   - Recompute integrity hash
   - Reload agent config
   - Test rollback on failed updates

**Acceptance Criteria**:
- [ ] Protected configs can be updated programmatically
- [ ] Only system-privileged calls succeed
- [ ] Backups created before each update
- [ ] Version incremented correctly
- [ ] Rollback mechanism works

---

### Phase 5: UI Integration
**Status**: ⏸️ NOT STARTED
**Depends On**: Phase 4

**Tasks**:
1. Update agent config editor UI in frontend
   - Show user-editable fields with edit controls
   - Show protected fields as read-only
   - Add visual indicator (🔒) for protected fields
   - Group fields by category (editable vs protected)

2. Add protection status indicators
   - Display "System Managed" badge on protected fields
   - Show tooltip explaining why field is protected
   - Add info icon with link to documentation

3. Show readonly protected fields in UI
   - Render protected config in collapsible section
   - Format as read-only form or JSON viewer
   - Add "View Details" button for full protected config

4. Prevent protected field edits in UI
   - Disable edit controls for protected fields
   - Show warning if user tries to edit
   - Validate on client-side before submission
   - Server-side validation rejects protected field changes

5. Add admin UI for protected config updates (optional)
   - Separate admin panel requiring authentication
   - Form for updating protected configs
   - Preview changes before applying
   - Require confirmation for sensitive changes

**Acceptance Criteria**:
- [ ] User-editable fields have working edit controls
- [ ] Protected fields shown as read-only with 🔒 indicator
- [ ] Tooltips explain protection status
- [ ] UI prevents editing protected fields
- [ ] Changes save successfully for user-editable fields
- [ ] Protected fields remain unchanged after user edits

---

## Next Steps After Completion

1. **Monitor for tampering attempts** and review security logs regularly
2. **Document admin procedures** for updating protected configs
3. **Create templates** for common protected config patterns
4. **Add audit logging** for all protected config changes
5. **Consider role-based access** for different protection levels
6. **Implement config inheritance** for shared settings across agents
