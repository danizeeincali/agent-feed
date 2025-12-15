# Plan B: Protected Agent Definition Fields Architecture

## 🔍 Current State Analysis

### Existing Agent Format: Markdown with YAML Frontmatter ✅

**Current Reality**:
- All agents use `.md` files (NOT `.yaml` files)
- Located in: `/prod/.claude/agents/*.md` and `/workspaces/agent-feed/.claude/agents/`
- Standard Claude Code format: YAML frontmatter + Markdown body

**Example Current Agent** (`meta-agent.md`):
```markdown
---
name: meta-agent
description: Generates new agent configurations
tools: [Bash, Glob, Grep, Read, Edit, Write]
model: sonnet
color: "#374151"
proactive: true
priority: P2
---

# Meta Agent - Production Agent Generator

Your sole purpose is to act as an expert agent architect...
```

**Why This Document Originally Proposed YAML**:
- YAML was suggested for **future** protection architecture
- Not because the system currently uses YAML
- Proposed for structured validation and clear separation

---

## Overview
Establish a protection mechanism for critical agent definition fields (particularly API usage rules and system boundaries) while maintaining user customizability for personality and behavior.

**Key Design Decision**: Maintain `.md` agent format compatibility while adding protection layer.

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

## 2. Architecture Options: Three Approaches

### Option 1: Extended Markdown Frontmatter ⚡ FASTEST

**Structure**: Single `.md` file with protected section in frontmatter
```
/prod/.claude/agents/
├── strategic-planner-agent.md  # Contains both user + protected config
```

**Example**:
```markdown
---
name: strategic-planner
description: Strategic planning specialist
tools: [Read, Write, Bash]
model: sonnet
color: "#374151"

# NEW: Protected configuration section
_protected:
  version: "1.0.0"
  checksum: "sha256:abc123..."
  permissions:
    api_endpoints:
      - path: "/api/posts"
        methods: ["GET", "POST"]
        rate_limit: "10/minute"
    workspace: "/prod/agent_workspace/agents/strategic-planner"
    tool_permissions:
      allowed: ["Read", "Write", "Bash"]
      forbidden: ["KillShell"]
---

# Strategic Planner Agent
Your role is to...
```

**Pros**:
- ✅ No file structure changes
- ✅ Compatible with existing Claude Code
- ✅ Single file per agent (simpler)
- ✅ YAML frontmatter already validated
- ✅ Easy to implement protection checks
- ✅ Fastest to implement

**Cons**:
- ⚠️ User could still edit frontmatter in file
- ⚠️ Requires runtime validation to enforce

**Implementation Path**: Extend agent loader to validate `_protected` section

---

### Option 2: Split YAML Files (Original Proposal)

**Structure**: Separate user and system configuration files
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

**Pros**:
- ✅ Physical file protection (OS-level permissions)
- ✅ Clear separation of concerns
- ✅ Harder for users to accidentally modify protected fields
- ✅ Explicit system vs user configuration

**Cons**:
- ❌ Breaking change (all agents need migration)
- ❌ Not standard Claude Code format
- ❌ More complex directory structure
- ❌ Claude Code may not recognize split format
- ❌ Requires custom loader implementation

**Implementation Path**: Full migration of all agents + custom loader

---

### Option 3: Hybrid - Markdown + Protected Sidecar ✅ RECOMMENDED

**Structure**: Keep `.md` agents, add `.protected.yaml` sidecars
```
/prod/.claude/agents/
├── strategic-planner-agent.md           # Main agent (standard format)
└── .system/
    └── strategic-planner.protected.yaml # Protected config (read-only)
```

**Main Agent File** (`strategic-planner-agent.md`):
```markdown
---
name: strategic-planner
description: Strategic planning specialist
tools: [Read, Write, Bash]
model: sonnet
color: "#374151"
_protected_config_source: ".system/strategic-planner.protected.yaml"
---

# Strategic Planner Agent
Your role is to provide strategic planning...
```

**Protected Sidecar** (`.system/strategic-planner.protected.yaml`):
```yaml
version: "1.0.0"
checksum: "sha256:abc123..."
agent_id: "strategic-planner"
permissions:
  api_endpoints:
    - path: "/api/posts"
      methods: ["GET", "POST"]
      rate_limit: "10/minute"
  workspace:
    root: "/prod/agent_workspace/agents/strategic-planner"
    max_storage: "1GB"
  tool_permissions:
    allowed: ["Read", "Write", "Bash", "Grep", "Glob"]
    forbidden: ["KillShell"]
  resource_limits:
    max_memory: "512MB"
    max_cpu_percent: 50
```

**Pros**:
- ✅ Standard `.md` format preserved (Claude Code compatible)
- ✅ OS-level file protection for sensitive config
- ✅ Backward compatible (agents without sidecars still work)
- ✅ Easy migration path (add sidecars incrementally)
- ✅ Protected files in single `.system/` directory
- ✅ Clear separation without breaking changes
- ✅ Best of both worlds

**Cons**:
- ⚠️ Two files per protected agent (slightly more complex)
- ⚠️ Requires loader to merge configs at runtime

**Implementation Path**:
1. Create `.system/` directory
2. Add protected config sidecars for agents that need protection
3. Update agent loader to merge configs
4. Non-breaking (agents without sidecars work as-is)

## 3. Protection Enforcement Mechanisms

---

## 3. Recommendation Summary

### Primary Recommendation: **Option 3 (Hybrid Markdown + Protected Sidecar)** ✅

**Why This Approach Wins**:

1. **Claude Code Compatibility** ✅
   - Maintains standard `.md` agent format
   - No breaking changes to existing agents
   - Claude Code continues to work normally

2. **OS-Level Protection** ✅
   - Protected configs in `.system/` directory
   - File permissions prevent tampering
   - Physical separation of concerns

3. **Incremental Migration** ✅
   - Add protection to agents as needed
   - No "big bang" migration required
   - Agents without sidecars work fine

4. **Clear Mental Model** ✅
   - Main agent = personality + behavior
   - Sidecar = system rules + boundaries
   - Easy to understand and maintain

**Implementation Phases**:
```
Phase 1: Create .system/ directory with protected configs
Phase 2: Update agent loader to merge configs at runtime
Phase 3: Add validation and integrity checking
Phase 4: Migrate agents incrementally (non-breaking)
Phase 5: Enforce protection with file permissions
```

---

## 4. Protection Enforcement Mechanisms

### File System Protection (Option 3 - Hybrid)
```bash
# Make .system directory read-only for user processes
chmod 555 /prod/.claude/agents/.system/
chmod 444 /prod/.claude/agents/.system/*.protected.yaml

# Ownership: root or system user
chown root:agents /prod/.claude/agents/.system/*.protected.yaml
```

### Runtime Validation (Hybrid Approach)
```typescript
class AgentConfigValidator {
  private protectedSchema: ProtectedConfigSchema;

  async validateAgentConfig(agentName: string): Promise<ValidationResult> {
    // Load main .md agent file
    const agentConfig = await this.loadAgentMarkdown(agentName);

    // Check if agent has protected sidecar
    const protectedConfigPath = agentConfig._protected_config_source;
    if (!protectedConfigPath) {
      // Agent has no protection - return as-is
      return { valid: true, config: agentConfig };
    }

    // Load protected sidecar
    const protectedConfig = await this.loadProtectedSidecar(protectedConfigPath);

    // Verify protected config hasn't been tampered with
    if (!this.verifyProtectedConfigIntegrity(protectedConfig)) {
      throw new SecurityError('Protected config has been modified');
    }

    // Merge configs (protected takes precedence)
    const mergedConfig = this.mergeConfigs(agentConfig, protectedConfig);

    return { valid: true, config: mergedConfig };
  }

  private async loadAgentMarkdown(agentName: string): Promise<AgentConfig> {
    const filePath = `/prod/.claude/agents/${agentName}-agent.md`;
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);
    return { ...frontmatter, _body: body };
  }

  private async loadProtectedSidecar(relativePath: string): Promise<ProtectedConfig> {
    const fullPath = path.join('/prod/.claude/agents', relativePath);
    const content = await fs.promises.readFile(fullPath, 'utf-8');
    return yaml.parse(content);
  }

  private verifyProtectedConfigIntegrity(config: ProtectedConfig): boolean {
    // Verify checksum or signature
    const computedHash = this.computeHash(config);
    const storedHash = config.checksum?.replace('sha256:', '');
    return computedHash === storedHash;
  }

  private mergeConfigs(agent: AgentConfig, protected: ProtectedConfig): AgentConfig {
    // Protected config takes precedence for system fields
    return {
      ...agent,
      _protected: protected,
      // Protected fields cannot be overridden by agent config
      _permissions: protected.permissions,
      _resource_limits: protected.permissions?.resource_limits,
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
    // Watch agent directory for changes
    const watcher = fs.watch('/prod/.claude/agents', { recursive: true });

    watcher.on('change', (eventType, filename) => {
      // Reload on .md agent file changes
      if (filename.endsWith('-agent.md')) {
        const agentName = this.extractAgentName(filename);
        this.reloadAgent(agentName);
      }

      // Alert on protected config changes (should never happen)
      if (filename.includes('.system/') && filename.endsWith('.protected.yaml')) {
        logger.error(`⚠️ Protected config modified: ${filename}`);
        // Restore from backup
        this.restoreProtectedConfig(filename);
      }
    });
  }

  private extractAgentName(filename: string): string {
    // Extract agent name from "agent-name-agent.md" -> "agent-name"
    return path.basename(filename, '-agent.md');
  }
}
```

---

## 5. System Update Mechanism

### Updating Protected Configs (Hybrid Approach)
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
    const backupPath = `/prod/backups/agent-configs/${agentName}/${Date.now()}.protected.yaml`;
    await fs.promises.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.promises.writeFile(backupPath, yaml.stringify(config));
  }

  private async writeProtectedConfig(
    agentName: string,
    config: ProtectedConfig
  ): Promise<void> {
    const configPath = `/prod/.claude/agents/.system/${agentName}.protected.yaml`;
    // Write atomically (temp file + rename)
    const tempPath = `${configPath}.tmp`;
    await fs.promises.writeFile(tempPath, yaml.stringify(config));
    await fs.promises.rename(tempPath, configPath);
    // Set read-only permissions
    await fs.promises.chmod(configPath, 0o444);
  }
}
```

### Migration Strategy (Hybrid Approach - Incremental)
```typescript
class AgentConfigMigrator {
  /**
   * Add protection to a specific agent (non-breaking, incremental)
   */
  async addProtectionToAgent(agentName: string, protectedConfig: ProtectedConfig): Promise<void> {
    // 1. Backup existing agent file
    await this.backupAgentFile(agentName);

    // 2. Create .system directory if it doesn't exist
    const systemDir = '/prod/.claude/agents/.system';
    await fs.promises.mkdir(systemDir, { recursive: true, mode: 0o555 });

    // 3. Write protected sidecar
    const sidecarPath = `${systemDir}/${agentName}.protected.yaml`;
    await fs.promises.writeFile(sidecarPath, yaml.stringify(protectedConfig));
    await fs.promises.chmod(sidecarPath, 0o444);

    // 4. Update agent .md file to reference sidecar
    await this.addSidecarReference(agentName);

    logger.info(`✅ Added protection to ${agentName}`);
  }

  /**
   * Migrate all agents at once (optional - use with caution)
   */
  async migrateAllAgents(): Promise<void> {
    const agents = await this.discoverAgents();

    for (const agentFile of agents) {
      const agentName = this.extractAgentName(agentFile);

      // Read existing agent frontmatter
      const frontmatter = await this.loadAgentFrontmatter(agentFile);

      // Check if agent has protected fields that should be extracted
      const protectedConfig = this.extractProtectedFields(frontmatter);

      if (Object.keys(protectedConfig.permissions || {}).length > 0) {
        // Agent has protected fields - migrate them
        await this.addProtectionToAgent(agentName, protectedConfig);
      } else {
        logger.info(`⏭️ Skipped ${agentName} - no protected fields`);
      }
    }
  }

  private extractProtectedFields(frontmatter: any): ProtectedConfig {
    const protectedFieldNames = [
      'api_endpoints', 'api_methods', 'api_rate_limits',
      'system_boundaries', 'security_policies', 'tool_permissions',
      'resource_limits', 'posting_rules', 'workspace_path',
      'forbidden_operations'
    ];

    const protectedConfig: ProtectedConfig = {
      version: '1.0.0',
      agent_id: frontmatter.name || 'unknown',
      checksum: '', // Will be computed
      permissions: {}
    };

    for (const fieldName of protectedFieldNames) {
      if (frontmatter[fieldName]) {
        protectedConfig.permissions[fieldName] = frontmatter[fieldName];
      }
    }

    return protectedConfig;
  }

  private async addSidecarReference(agentName: string): Promise<void> {
    const agentPath = `/prod/.claude/agents/${agentName}-agent.md`;
    const content = await fs.promises.readFile(agentPath, 'utf-8');
    const { data, content: body } = matter(content);

    // Add reference to protected sidecar
    data._protected_config_source = `.system/${agentName}.protected.yaml`;

    // Write updated agent file
    const updated = matter.stringify(body, data);
    await fs.promises.writeFile(agentPath, updated);
  }

  private extractAgentName(filename: string): string {
    return path.basename(filename, '-agent.md');
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

### Phase 2: Hybrid Architecture Setup (Non-Breaking)
**Status**: ⏸️ NOT STARTED
**Depends On**: Phase 1

**Tasks**:
1. Create central `.system/` directory
   - Create `/prod/.claude/agents/.system/` directory
   - Set directory permissions to 555 (read-only, executable)
   - Add `.gitkeep` to track in version control

2. Implement `AgentConfigMigrator` class
   - Add `addProtectionToAgent()` method for incremental migration
   - Add `migrateAllAgents()` method for bulk migration (optional)
   - Extract protected fields from agent frontmatter
   - Generate protected config sidecars

3. Create protected config sidecars for critical agents
   - Identify agents that need protection (e.g., meta-agent, system agents)
   - Generate `.protected.yaml` sidecars with API rules, resource limits
   - Add `_protected_config_source` reference to agent frontmatter
   - Validate sidecar format and integrity

4. Set file permissions on protected configs
   - Set `.system/` directory to 555 (read-only, executable)
   - Set `*.protected.yaml` files to 444 (read-only)
   - Verify permissions prevent unauthorized modification

5. Create backup mechanism
   - Backup all agent `.md` files to `/prod/backups/pre-protection/`
   - Include timestamp in backup directory name
   - Verify backups are readable

**Acceptance Criteria**:
- [ ] Central `.system/` directory created with correct permissions
- [ ] Protected sidecars created for critical agents
- [ ] File permissions correctly set and verified
- [ ] Backups created and verified
- [ ] Agents without sidecars continue working normally (backward compatible)

---

### Phase 3: Runtime Protection (Hybrid Loader)
**Status**: ⏸️ NOT STARTED
**Depends On**: Phase 2

**Tasks**:
1. Implement `AgentConfigValidator` in `/workspaces/agent-feed/src/config/agent-config-validator.ts`
   - Load and parse agent `.md` file (frontmatter + body)
   - Check for `_protected_config_source` field in frontmatter
   - If present, load protected sidecar (`.system/*.protected.yaml`)
   - Validate both against schemas
   - Merge configs with protected taking precedence
   - Return merged config or plain config (if no sidecar)

2. Implement `ProtectedAgentLoader` in `/workspaces/agent-feed/src/config/protected-agent-loader.ts`
   - Add config cache (Map) for performance
   - Implement `loadAgent()` method with sidecar support
   - Implement `reloadAgent()` method for hot-reloading
   - Add logging for load/reload/merge events
   - Handle agents without sidecars gracefully

3. Add integrity checking for protected configs
   - Compute SHA-256 hash of protected sidecar content
   - Store hash in `checksum` field of sidecar
   - Verify hash on each load
   - Throw SecurityError if hash mismatch detected
   - Log all integrity check results

4. Add tampering detection with file watcher
   - Use `fs.watch()` to monitor `.system/` directory
   - Detect unauthorized modifications to `.protected.yaml` files
   - Log security alert immediately
   - Restore from backup if tampering detected
   - Send notification to system admin
   - Continue watching after restoration

**Acceptance Criteria**:
- [ ] Agents with sidecars load and merge correctly
- [ ] Agents without sidecars load normally (backward compatible)
- [ ] Protected fields cannot be overridden by agent frontmatter
- [ ] Integrity checking detects sidecar modifications
- [ ] File watcher detects tampering attempts
- [ ] Security alerts logged with full context
- [ ] Performance acceptable with caching

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

---

## Summary: YAML vs Markdown Question Answered

### The Confusion

**Original Question**: "Why is it using yml? Claude code sub agents use .md files in the agents folder."

**Answer**: The project **already uses `.md` files** for all agents. YAML was proposed in this document as a **future architecture option**, not the current implementation.

### Current Reality ✅

```
/prod/.claude/agents/
├── meta-agent.md
├── page-builder-agent.md
├── strategic-planner-agent.md  (example)
└── ... (all .md files)
```

**Format**: Markdown with YAML frontmatter (standard Claude Code format)

### Proposed Future State (Option 3 - Hybrid) ✅

```
/prod/.claude/agents/
├── strategic-planner-agent.md           # Main agent (unchanged)
└── .system/
    └── strategic-planner.protected.yaml # Protected sidecar (NEW)
```

**Why Hybrid Approach**:
1. **Preserves existing .md format** (no breaking changes)
2. **Adds YAML sidecars only for protected configs** (OS-level protection)
3. **Incremental migration** (add protection agent-by-agent)
4. **Claude Code compatible** (continues working normally)

### Key Takeaway

- ✅ **Current agents**: `.md` files (Markdown + YAML frontmatter)
- ✅ **Future protection**: Add `.protected.yaml` sidecars (optional)
- ✅ **No migration required**: Agents without sidecars work as-is
- ✅ **Best of both worlds**: Standard format + OS-level protection
