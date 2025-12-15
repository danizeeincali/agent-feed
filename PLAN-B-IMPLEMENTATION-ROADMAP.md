# Plan B: Protected Agent Fields - Implementation Roadmap

**Architecture**: Hybrid Markdown + Protected Sidecar
**Status**: 🔴 NOT STARTED
**Total Estimated Effort**: 28-52 hours
**Priority**: HIGH (Security Critical)

---

## Quick Start: Minimum Viable Implementation

To get a working protected agent system that can be validated:

**Phase 1-3 Only** (14-28 hours):
1. Define schemas (4-8h)
2. Create directory structure (2-4h)
3. Implement hybrid loader (8-16h)

**Result**: Functional protection layer ready for production validation

---

## Phase 1: Schema Definition ⏸️ NOT STARTED

**Effort**: 4-8 hours
**Depends On**: None
**Blocks**: All other phases

### Files to Create

#### 1. `/workspaces/agent-feed/src/config/schemas/protected-config.schema.ts`

```typescript
import { z } from 'zod';

/**
 * API Endpoint Configuration Schema
 */
export const ApiEndpointSchema = z.object({
  path: z.string().startsWith('/'),
  methods: z.array(z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])),
  rate_limit: z.string().regex(/^\d+\/(second|minute|hour|day)$/),
  required_auth: z.boolean().default(true),
});

/**
 * Workspace Configuration Schema
 */
export const WorkspaceConfigSchema = z.object({
  root: z.string().startsWith('/'),
  max_storage: z.string().regex(/^\d+[KMGT]?B$/),
  allowed_paths: z.array(z.string()).optional(),
  forbidden_paths: z.array(z.string()).optional(),
});

/**
 * Tool Permissions Schema
 */
export const ToolPermissionsSchema = z.object({
  allowed: z.array(z.string()),
  forbidden: z.array(z.string()).optional(),
});

/**
 * Resource Limits Schema
 */
export const ResourceLimitsSchema = z.object({
  max_memory: z.string().regex(/^\d+[KMGT]?B$/),
  max_cpu_percent: z.number().min(0).max(100),
  max_execution_time: z.string().regex(/^\d+[smh]$/),
  max_concurrent_tasks: z.number().min(1).max(10),
});

/**
 * Posting Rules Schema
 */
export const PostingRulesSchema = z.object({
  auto_post_outcomes: z.boolean(),
  post_threshold: z.enum(['never', 'completed_task', 'significant_outcome', 'always']),
  default_post_type: z.enum(['reply', 'new_post', 'auto']),
});

/**
 * Protected Config Schema
 */
export const ProtectedConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  agent_id: z.string(),
  permissions: z.object({
    api_endpoints: z.array(ApiEndpointSchema).optional(),
    workspace: WorkspaceConfigSchema.optional(),
    tool_permissions: ToolPermissionsSchema.optional(),
    resource_limits: ResourceLimitsSchema.optional(),
    posting_rules: PostingRulesSchema.optional(),
  }),
  _metadata: z.object({
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    updated_by: z.string(),
  }).optional(),
});

/**
 * TypeScript Types
 */
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>;
export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;
export type ToolPermissions = z.infer<typeof ToolPermissionsSchema>;
export type ResourceLimits = z.infer<typeof ResourceLimitsSchema>;
export type PostingRules = z.infer<typeof PostingRulesSchema>;
export type ProtectedConfig = z.infer<typeof ProtectedConfigSchema>;
```

#### 2. `/workspaces/agent-feed/src/config/schemas/user-config.schema.ts`

```typescript
import { z } from 'zod';

/**
 * User-Editable Agent Config Schema
 */
export const UserConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  personality: z.object({
    tone: z.string().optional(),
    style: z.string().optional(),
    emoji_usage: z.enum(['none', 'minimal', 'moderate', 'expressive']).optional(),
  }).optional(),
  specialization: z.array(z.string()).optional(),
  custom_instructions: z.string().optional(),
  autonomous_mode: z.enum(['supervised', 'collaborative', 'autonomous']).default('collaborative'),
  priority_preferences: z.object({
    focus: z.string().optional(),
    timeframe: z.enum(['immediate', 'short_term', 'long_term']).optional(),
  }).optional(),
  notification_preferences: z.object({
    on_start: z.boolean().default(false),
    on_complete: z.boolean().default(true),
    on_error: z.boolean().default(true),
  }).optional(),
});

export type UserConfig = z.infer<typeof UserConfigSchema>;
```

#### 3. `/workspaces/agent-feed/src/config/validators/config-validator.ts`

```typescript
import { ProtectedConfigSchema, ProtectedConfig } from '../schemas/protected-config.schema.js';
import { UserConfigSchema, UserConfig } from '../schemas/user-config.schema.js';

export class ConfigValidator {
  /**
   * Validate protected config against schema
   */
  static validateProtectedConfig(data: unknown): ProtectedConfig {
    try {
      return ProtectedConfigSchema.parse(data);
    } catch (error) {
      throw new Error(`Protected config validation failed: ${error.message}`);
    }
  }

  /**
   * Validate user config against schema
   */
  static validateUserConfig(data: unknown): UserConfig {
    try {
      return UserConfigSchema.parse(data);
    } catch (error) {
      throw new Error(`User config validation failed: ${error.message}`);
    }
  }

  /**
   * Check if a field is protected
   */
  static isProtectedField(fieldName: string): boolean {
    const protectedFields = [
      'api_endpoints',
      'api_methods',
      'api_rate_limits',
      'workspace',
      'workspace_path',
      'tool_permissions',
      'resource_limits',
      'posting_rules',
      'security_policies',
      'system_boundaries',
      'forbidden_operations',
    ];
    return protectedFields.includes(fieldName);
  }
}
```

#### 4. `/workspaces/agent-feed/docs/PROTECTED-FIELDS.md`

```markdown
# Protected Agent Fields Documentation

## Overview

Protected fields are system-controlled configuration values that ensure agent security, resource limits, and API boundaries. These fields CANNOT be edited by users.

## Protected Fields Reference

### 1. API Endpoints

**Field**: `api_endpoints`
**Type**: `Array<ApiEndpoint>`
**Protected**: ✅ YES

Controls which API endpoints the agent can access.

**Example**:
```yaml
api_endpoints:
  - path: "/api/posts"
    methods: ["GET", "POST"]
    rate_limit: "10/minute"
    required_auth: true
```

**Why Protected**: Prevents agents from accessing unauthorized APIs or bypassing rate limits.

### 2. Workspace Path

**Field**: `workspace`
**Type**: `WorkspaceConfig`
**Protected**: ✅ YES

Defines where the agent can read/write files.

**Example**:
```yaml
workspace:
  root: "/workspaces/agent-feed/prod/agent_workspace/agents/my-agent"
  max_storage: "1GB"
  allowed_paths:
    - "/workspaces/agent-feed/prod/agent_workspace/agents/my-agent/**"
  forbidden_paths:
    - "/workspaces/agent-feed/src/**"
```

**Why Protected**: Prevents agents from accessing system files or other agents' workspaces.

### 3. Tool Permissions

**Field**: `tool_permissions`
**Type**: `ToolPermissions`
**Protected**: ✅ YES

Controls which tools the agent can use.

**Example**:
```yaml
tool_permissions:
  allowed: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
  forbidden: ["KillShell"]
```

**Why Protected**: Prevents privilege escalation and unauthorized system operations.

### 4. Resource Limits

**Field**: `resource_limits`
**Type**: `ResourceLimits`
**Protected**: ✅ YES

Limits compute resources the agent can consume.

**Example**:
```yaml
resource_limits:
  max_memory: "512MB"
  max_cpu_percent: 50
  max_execution_time: "300s"
  max_concurrent_tasks: 3
```

**Why Protected**: Prevents resource exhaustion and ensures fair resource allocation.

### 5. Posting Rules

**Field**: `posting_rules`
**Type**: `PostingRules`
**Protected**: ✅ YES

Controls when and how agents post outcomes.

**Example**:
```yaml
posting_rules:
  auto_post_outcomes: true
  post_threshold: "completed_task"
  default_post_type: "reply"
```

**Why Protected**: Ensures consistent posting behavior and prevents spam.

## User-Editable Fields

The following fields CAN be edited by users:

- `name` - Agent display name
- `description` - Agent purpose
- `personality` - Communication style
- `specialization` - Domain expertise
- `custom_instructions` - Task guidance
- `autonomous_mode` - Level of autonomy
- `priority_preferences` - Work prioritization
- `notification_preferences` - Alert settings

## Updating Protected Fields

Protected fields can only be updated by:
1. System administrators
2. Via `ProtectedConfigManager` API
3. With proper authentication

**Example**:
```typescript
await protectedConfigManager.updateProtectedConfig('my-agent', {
  permissions: {
    resource_limits: {
      max_memory: "1GB", // Increased from 512MB
      max_cpu_percent: 75,
      max_execution_time: "600s",
      max_concurrent_tasks: 5
    }
  }
});
```

## Security Implications

**Tampering with protected configs can lead to**:
- Unauthorized API access
- Resource exhaustion attacks
- Privilege escalation
- Data breaches
- System instability

**Protection mechanisms**:
- File permissions (555 for `.system/`, 444 for `.protected.yaml`)
- SHA-256 integrity checking
- Tampering detection with auto-restoration
- Audit logging of all changes
```

### Acceptance Criteria

- [  ] TypeScript interfaces compile without errors
- [  ] Zod schemas validate example configs successfully
- [  ] Documentation covers all protected fields
- [  ] Example protected configs provided
- [  ] Validation tests pass

### Installation

```bash
npm install zod gray-matter js-yaml
```

---

## Phase 2: Hybrid Architecture Setup ⏸️ NOT STARTED

**Effort**: 2-4 hours
**Depends On**: Phase 1
**Blocks**: Phase 3

### Tasks

#### Task 1: Create `.system/` Directory

```bash
cd /workspaces/agent-feed/prod/.claude/agents
mkdir -p .system
chmod 555 .system
echo "Protected agent configuration sidecars" > .system/README.md
```

#### Task 2: Create `AgentConfigMigrator`

**File**: `/workspaces/agent-feed/src/config/agent-config-migrator.ts`

```typescript
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import yaml from 'js-yaml';
import matter from 'gray-matter';
import { ProtectedConfig } from './schemas/protected-config.schema.js';

export class AgentConfigMigrator {
  private agentsDir = '/workspaces/agent-feed/prod/.claude/agents';
  private systemDir = path.join(this.agentsDir, '.system');

  /**
   * Add protection to a specific agent
   */
  async addProtectionToAgent(
    agentSlug: string,
    protectedConfig: ProtectedConfig
  ): Promise<void> {
    // 1. Backup existing agent file
    await this.backupAgentFile(agentSlug);

    // 2. Ensure .system directory exists
    await fs.mkdir(this.systemDir, { recursive: true, mode: 0o555 });

    // 3. Compute checksum
    const configCopy = { ...protectedConfig };
    delete configCopy.checksum; // Remove checksum for computation
    const checksum = this.computeChecksum(configCopy);
    protectedConfig.checksum = `sha256:${checksum}`;

    // 4. Write protected sidecar
    const sidecarPath = path.join(this.systemDir, `${agentSlug}.protected.yaml`);
    await fs.writeFile(sidecarPath, yaml.dump(protectedConfig));
    await fs.chmod(sidecarPath, 0o444); // Read-only

    // 5. Update agent .md file to reference sidecar
    await this.addSidecarReference(agentSlug);

    console.log(`✅ Added protection to ${agentSlug}`);
  }

  /**
   * Backup agent file
   */
  private async backupAgentFile(agentSlug: string): Promise<void> {
    const agentPath = path.join(this.agentsDir, `${agentSlug}.md`);
    const backupDir = '/workspaces/agent-feed/prod/backups/pre-protection';
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${agentSlug}-${timestamp}.md`);

    await fs.copyFile(agentPath, backupPath);
    console.log(`📦 Backed up ${agentSlug} to ${backupPath}`);
  }

  /**
   * Add sidecar reference to agent frontmatter
   */
  private async addSidecarReference(agentSlug: string): Promise<void> {
    const agentPath = path.join(this.agentsDir, `${agentSlug}.md`);
    const content = await fs.readFile(agentPath, 'utf-8');
    const { data, content: body } = matter(content);

    // Add reference to protected sidecar
    data._protected_config_source = `.system/${agentSlug}.protected.yaml`;

    // Write updated agent file
    const updated = matter.stringify(body, data);
    await fs.writeFile(agentPath, updated);
  }

  /**
   * Compute SHA-256 checksum
   */
  private computeChecksum(config: any): string {
    const content = JSON.stringify(config, null, 2);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
```

#### Task 3: Create Test Protected Configs

**File**: `/workspaces/agent-feed/prod/.claude/agents/.system/meta-agent.protected.yaml`

```yaml
version: "1.0.0"
checksum: "sha256:placeholder" # Will be computed
agent_id: "meta-agent"
permissions:
  api_endpoints:
    - path: "/api/posts"
      methods: ["POST"]
      rate_limit: "5/minute"
      required_auth: true
  workspace:
    root: "/workspaces/agent-feed/prod/agent_workspace/agents/meta-agent"
    max_storage: "100MB"
    allowed_paths:
      - "/workspaces/agent-feed/prod/agent_workspace/agents/meta-agent/**"
    forbidden_paths:
      - "/workspaces/agent-feed/src/**"
      - "/workspaces/agent-feed/api-server/**"
  tool_permissions:
    allowed: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
    forbidden: ["KillShell"]
  resource_limits:
    max_memory: "256MB"
    max_cpu_percent: 30
    max_execution_time: "180s"
    max_concurrent_tasks: 2
  posting_rules:
    auto_post_outcomes: true
    post_threshold: "completed_task"
    default_post_type: "reply"
_metadata:
  created_at: "2025-10-17T00:00:00Z"
  updated_at: "2025-10-17T00:00:00Z"
  updated_by: "system"
```

#### Task 4: Migration Script

**File**: `/workspaces/agent-feed/scripts/migrate-to-protected.ts`

```typescript
import { AgentConfigMigrator } from '../src/config/agent-config-migrator.js';
import { ProtectedConfig } from '../src/config/schemas/protected-config.schema.js';

async function main() {
  const migrator = new AgentConfigMigrator();

  // Define protected configs for critical agents
  const protectedConfigs: Record<string, Partial<ProtectedConfig>> = {
    'meta-agent': {
      version: '1.0.0',
      agent_id: 'meta-agent',
      permissions: {
        api_endpoints: [
          { path: '/api/posts', methods: ['POST'], rate_limit: '5/minute' }
        ],
        workspace: {
          root: '/workspaces/agent-feed/prod/agent_workspace/agents/meta-agent',
          max_storage: '100MB'
        },
        tool_permissions: {
          allowed: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
          forbidden: ['KillShell']
        },
        resource_limits: {
          max_memory: '256MB',
          max_cpu_percent: 30,
          max_execution_time: '180s',
          max_concurrent_tasks: 2
        }
      }
    },
    'page-builder-agent': {
      version: '1.0.0',
      agent_id: 'page-builder-agent',
      permissions: {
        workspace: {
          root: '/workspaces/agent-feed/prod/agent_workspace/agents/page-builder-agent',
          max_storage: '500MB'
        },
        tool_permissions: {
          allowed: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
          forbidden: ['KillShell']
        },
        resource_limits: {
          max_memory: '512MB',
          max_cpu_percent: 50,
          max_execution_time: '300s',
          max_concurrent_tasks: 3
        }
      }
    }
  };

  // Migrate each agent
  for (const [agentSlug, config] of Object.entries(protectedConfigs)) {
    try {
      await migrator.addProtectionToAgent(agentSlug, config as ProtectedConfig);
      console.log(`✅ Migrated ${agentSlug}`);
    } catch (error) {
      console.error(`❌ Failed to migrate ${agentSlug}:`, error.message);
    }
  }

  console.log('\n✅ Migration complete');
}

main();
```

### Acceptance Criteria

- [  ] `.system/` directory created with 555 permissions
- [  ] 3+ protected sidecars created for test agents
- [  ] All sidecar files have 444 permissions
- [  ] Agent backups created successfully
- [  ] Sidecar references added to agent frontmatter

---

## Phase 3: Runtime Protection ⏸️ NOT STARTED

**Effort**: 8-16 hours
**Depends On**: Phase 1, Phase 2
**Blocks**: Production validation

### Task 1: Implement `AgentConfigValidator`

**File**: `/workspaces/agent-feed/src/config/agent-config-validator.ts`

```typescript
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { ProtectedConfig, ProtectedConfigSchema } from './schemas/protected-config.schema.js';
import { ConfigValidator } from './validators/config-validator.js';

interface AgentConfig {
  [key: string]: any;
  _protected?: ProtectedConfig;
  _protected_config_source?: string;
}

interface ValidationResult {
  valid: boolean;
  config: AgentConfig;
  errors?: string[];
}

export class AgentConfigValidator {
  private agentsDir = '/workspaces/agent-feed/prod/.claude/agents';

  /**
   * Validate agent config and merge with protected sidecar if exists
   */
  async validateAgentConfig(agentSlug: string): Promise<ValidationResult> {
    try {
      // Load main .md agent file
      const agentConfig = await this.loadAgentMarkdown(agentSlug);

      // Check if agent has protected sidecar
      const protectedConfigPath = agentConfig._protected_config_source;
      if (!protectedConfigPath) {
        // Agent has no protection - return as-is
        return { valid: true, config: agentConfig };
      }

      // Load protected sidecar
      const protectedConfig = await this.loadProtectedSidecar(protectedConfigPath);

      // Verify protected config integrity
      if (!this.verifyProtectedConfigIntegrity(protectedConfig)) {
        throw new Error('Protected config integrity check failed');
      }

      // Merge configs (protected takes precedence)
      const mergedConfig = this.mergeConfigs(agentConfig, protectedConfig);

      return { valid: true, config: mergedConfig };
    } catch (error) {
      return {
        valid: false,
        config: {},
        errors: [error.message]
      };
    }
  }

  /**
   * Load agent markdown file
   */
  private async loadAgentMarkdown(agentSlug: string): Promise<AgentConfig> {
    const filePath = path.join(this.agentsDir, `${agentSlug}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);

    return {
      ...frontmatter,
      _body: body,
      _slug: agentSlug,
      _filePath: filePath
    };
  }

  /**
   * Load protected sidecar YAML
   */
  private async loadProtectedSidecar(relativePath: string): Promise<ProtectedConfig> {
    const fullPath = path.join(this.agentsDir, relativePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const data = yaml.load(content);

    // Validate against schema
    return ConfigValidator.validateProtectedConfig(data);
  }

  /**
   * Verify protected config integrity using checksum
   */
  private verifyProtectedConfigIntegrity(config: ProtectedConfig): boolean {
    const storedChecksum = config.checksum?.replace('sha256:', '');
    if (!storedChecksum) {
      console.warn('⚠️ Protected config missing checksum');
      return false;
    }

    // Compute checksum (exclude checksum field)
    const configCopy = { ...config };
    delete configCopy.checksum;
    const computedChecksum = this.computeChecksum(configCopy);

    if (computedChecksum !== storedChecksum) {
      console.error('❌ Protected config checksum mismatch');
      console.error('Expected:', storedChecksum);
      console.error('Got:', computedChecksum);
      return false;
    }

    return true;
  }

  /**
   * Merge agent config with protected config
   */
  private mergeConfigs(agent: AgentConfig, protected: ProtectedConfig): AgentConfig {
    return {
      ...agent,
      _protected: protected,
      _permissions: protected.permissions,
      // Protected fields override agent config
      api_endpoints: protected.permissions?.api_endpoints,
      workspace: protected.permissions?.workspace,
      tool_permissions: protected.permissions?.tool_permissions,
      resource_limits: protected.permissions?.resource_limits,
      posting_rules: protected.permissions?.posting_rules
    };
  }

  /**
   * Compute SHA-256 checksum
   */
  private computeChecksum(config: any): string {
    const content = JSON.stringify(config, null, 2);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
```

### Task 2: Implement `ProtectedAgentLoader`

**File**: `/workspaces/agent-feed/src/config/protected-agent-loader.ts`

```typescript
import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { AgentConfigValidator } from './agent-config-validator.js';

export class ProtectedAgentLoader {
  private validator: AgentConfigValidator;
  private configCache: Map<string, any>;
  private agentsDir = '/workspaces/agent-feed/prod/.claude/agents';
  private systemDir = path.join(this.agentsDir, '.system');
  private watcher: any;

  constructor() {
    this.validator = new AgentConfigValidator();
    this.configCache = new Map();
  }

  /**
   * Load agent with protection support
   */
  async loadAgent(agentSlug: string): Promise<any> {
    // Check cache
    if (this.configCache.has(agentSlug)) {
      console.log(`✅ Agent loaded from cache: ${agentSlug}`);
      return this.configCache.get(agentSlug);
    }

    // Load and validate
    const result = await this.validator.validateAgentConfig(agentSlug);

    if (!result.valid) {
      throw new Error(`Agent validation failed: ${result.errors?.join(', ')}`);
    }

    // Cache validated config
    this.configCache.set(agentSlug, result.config);

    console.log(`📦 Agent loaded: ${agentSlug}`);
    return result.config;
  }

  /**
   * Reload agent (bypass cache)
   */
  async reloadAgent(agentSlug: string): Promise<void> {
    this.configCache.delete(agentSlug);
    await this.loadAgent(agentSlug);
    console.log(`🔄 Agent reloaded: ${agentSlug}`);
  }

  /**
   * Watch for file changes
   */
  watchForChanges(): void {
    this.watcher = chokidar.watch([
      `${this.agentsDir}/*.md`,
      `${this.systemDir}/*.protected.yaml`
    ], {
      persistent: true,
      ignoreInitial: true
    });

    this.watcher
      .on('change', async (filePath: string) => {
        if (filePath.includes('.system/') && filePath.endsWith('.protected.yaml')) {
          console.error(`⚠️ SECURITY ALERT: Protected config modified: ${filePath}`);
          await this.restoreProtectedConfig(filePath);
        } else if (filePath.endsWith('.md')) {
          const agentSlug = path.basename(filePath, '.md');
          await this.reloadAgent(agentSlug);
        }
      });

    console.log('👀 File watcher initialized for protected agents');
  }

  /**
   * Restore protected config from backup
   */
  private async restoreProtectedConfig(filePath: string): Promise<void> {
    console.error('🔴 TAMPERING DETECTED - Restoring protected config from backup');
    // TODO: Implement restoration from backup
    // For now, just alert
    console.error('Manual intervention required');
  }

  /**
   * Stop watcher
   */
  async stopWatcher(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      console.log('👋 File watcher stopped');
    }
  }
}
```

### Task 3: Integrate with Existing Loader

**File**: `/workspaces/agent-feed/api-server/services/agent-loader.service.js`

Add protected loader support:

```javascript
import { ProtectedAgentLoader } from '../../src/config/protected-agent-loader.js';

// Add protected loader instance
const protectedLoader = new ProtectedAgentLoader();
protectedLoader.watchForChanges();

// Update loadAgent function
export async function loadAgent(slug) {
  try {
    // Try protected loader first
    try {
      const protectedAgent = await protectedLoader.loadAgent(slug);
      if (protectedAgent) {
        return protectedAgent;
      }
    } catch (error) {
      console.warn(`Protected load failed for ${slug}, falling back to basic loader`);
    }

    // Fall back to basic loader
    // ... existing code ...
  } catch (error) {
    console.error(`❌ Error loading agent ${slug}:`, error);
    throw error;
  }
}
```

### Acceptance Criteria

- [  ] Agents with sidecars load correctly
- [  ] Agents without sidecars load normally (backward compatible)
- [  ] Protected fields override agent frontmatter
- [  ] Integrity checking detects modifications
- [  ] File watcher detects tampering
- [  ] Cache performance acceptable (<100ms load time)

---

## Phase 4: Update Mechanisms ⏸️ NOT STARTED

**Effort**: 6-12 hours
**Depends On**: Phase 3
**Blocks**: System administration

### Tasks

See Phase 4 section in PLAN-B-PROTECTED-AGENT-FIELDS.md for detailed implementation.

**Summary**:
- Implement `ProtectedConfigManager`
- Create system update API endpoint
- Add version control
- Implement rollback mechanism

---

## Phase 5: UI Integration ⏸️ NOT STARTED

**Effort**: 8-12 hours
**Depends On**: Phase 4
**Blocks**: User-facing features

### Tasks

See Phase 5 section in PLAN-B-PROTECTED-AGENT-FIELDS.md for detailed implementation.

**Summary**:
- Update agent config editor UI
- Add protected field indicators (🔒)
- Show read-only protected fields
- Prevent protected field edits

---

## Testing Strategy

### Unit Tests

```typescript
// /workspaces/agent-feed/tests/unit/protected-agent-loader.test.ts

describe('ProtectedAgentLoader', () => {
  it('should load agent without sidecar (backward compatible)', async () => {
    const loader = new ProtectedAgentLoader();
    const agent = await loader.loadAgent('personal-todos-agent');
    expect(agent).toBeDefined();
    expect(agent._protected).toBeUndefined();
  });

  it('should load agent with sidecar and merge configs', async () => {
    const loader = new ProtectedAgentLoader();
    const agent = await loader.loadAgent('meta-agent');
    expect(agent._protected).toBeDefined();
    expect(agent._permissions).toBeDefined();
  });

  it('should detect integrity violations', async () => {
    // Modify protected config
    // Attempt to load
    // Should fail with integrity error
  });

  it('should cache agents for performance', async () => {
    const loader = new ProtectedAgentLoader();
    const t1 = Date.now();
    await loader.loadAgent('meta-agent');
    const t2 = Date.now();
    await loader.loadAgent('meta-agent'); // From cache
    const t3 = Date.now();

    expect(t3 - t2).toBeLessThan(t2 - t1); // Cache should be faster
  });
});
```

### Integration Tests

```typescript
// /workspaces/agent-feed/tests/integration/protected-agent-flow.test.ts

describe('Protected Agent Flow', () => {
  it('should create, load, and validate protected agent', async () => {
    const migrator = new AgentConfigMigrator();
    const loader = new ProtectedAgentLoader();

    // Create protected config
    await migrator.addProtectionToAgent('test-agent', { /* config */ });

    // Load protected agent
    const agent = await loader.loadAgent('test-agent');

    // Verify protection
    expect(agent._protected).toBeDefined();
    expect(agent.workspace).toEqual('/path/to/workspace');
  });
});
```

### E2E Tests (Playwright)

```typescript
// /workspaces/agent-feed/tests/e2e/protected-agents.spec.ts

test('should show protected field indicators in UI', async ({ page }) => {
  await page.goto('/agents/meta-agent');

  // Check for lock icons
  const lockIcons = await page.locator('[data-testid="protected-field-lock"]').count();
  expect(lockIcons).toBeGreaterThan(0);

  // Take screenshot
  await page.screenshot({ path: 'tests/e2e/screenshots/protected-fields.png' });
});

test('should prevent editing protected fields', async ({ page }) => {
  await page.goto('/agents/meta-agent');

  // Try to edit workspace path
  const workspaceInput = page.locator('[data-testid="workspace-path"]');
  expect(await workspaceInput.isDisabled()).toBe(true);
});
```

---

## Rollout Plan

### Stage 1: Development (Phases 1-3)
- Implement core functionality
- Unit tests pass
- Integration tests pass

### Stage 2: Staging (Phase 4)
- Deploy to staging environment
- Migrate 2-3 test agents
- Run E2E tests
- Performance validation

### Stage 3: Production Rollout
- Migrate critical agents (meta-agent, page-builder-agent)
- Monitor for 24 hours
- Gradually migrate remaining agents
- Full rollout over 1 week

---

## Success Metrics

### Functional
- ✅ 100% backward compatibility (agents without sidecars work)
- ✅ 0 agent load failures
- ✅ 100% integrity check success rate

### Performance
- ✅ Agent load time <100ms (cold)
- ✅ Agent load time <5ms (cached)
- ✅ Memory overhead <500KB

### Security
- ✅ 0 unauthorized protected config modifications
- ✅ 100% tampering detection rate
- ✅ <1s restoration time on tampering

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing agents | Backward compatibility + extensive testing |
| Performance degradation | Aggressive caching + benchmarking |
| Security bypass | Multiple layers (file permissions + runtime validation) |
| Data loss | Automatic backups before migration |
| Tampering undetected | SHA-256 checksums + file watching |

---

## Post-Implementation

### Monitoring
- Track agent load times
- Monitor integrity check failures
- Alert on tampering attempts
- Log all protected config changes

### Maintenance
- Regular backups of protected configs
- Periodic security audits
- Update documentation as needed
- Respond to security incidents

### Future Enhancements
- Role-based access control
- Config inheritance for shared settings
- Automated migration tools
- UI for admin config management
- Audit log viewer

---

## Quick Reference

**Minimum implementation for validation**: Phases 1-3 (14-28 hours)

**Commands**:
```bash
# Run migration
npm run migrate:protected

# Run tests
npm run test:protected

# Start with protection
npm run start:protected
```

**Files**:
- Schemas: `/src/config/schemas/`
- Validators: `/src/config/validators/`
- Loaders: `/src/config/`
- Protected configs: `/prod/.claude/agents/.system/`
- Backups: `/prod/backups/`

**Next Steps**:
1. Review this roadmap
2. Approve Phases 1-3 for implementation
3. Schedule 2-3 days for development
4. Run production validation
5. Deploy to staging
6. Gradual production rollout
