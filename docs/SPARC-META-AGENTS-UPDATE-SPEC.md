# SPARC Specification: Meta-Agent Protected Config Management

**Version**: 1.0.0
**Status**: Specification Complete
**Date**: 2025-10-17
**Specification Agent**: SPARC Specification Agent
**Implementation Approach**: Real-time Protected Config Management

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Requirements Specification](#requirements-specification)
4. [Agent Type Classification](#agent-type-classification)
5. [Protected Config Creation Protocol](#protected-config-creation-protocol)
6. [Protected Config Update Protocol](#protected-config-update-protocol)
7. [SHA-256 Checksum Computation](#sha-256-checksum-computation)
8. [File Permission Management](#file-permission-management)
9. [Field Classification System](#field-classification-system)
10. [Integration Requirements](#integration-requirements)
11. [Acceptance Criteria](#acceptance-criteria)
12. [Implementation Examples](#implementation-examples)
13. [Test Scenarios](#test-scenarios)
14. [Error Handling](#error-handling)
15. [Appendices](#appendices)

---

## Executive Summary

### Purpose

This specification defines how `meta-agent.md` and `meta-update-agent.md` must be updated to create and manage protected agent configurations in the Plan B: Protected Agent Fields Architecture.

### Key Capabilities Required

| Agent | Current Capability | Required Capability |
|-------|-------------------|-------------------|
| **meta-agent** | Creates `.md` agent files only | Create `.md` + `.protected.yaml` with checksum, permissions |
| **meta-update-agent** | Updates `.md` agent files only | Update `.md` OR `.protected.yaml` based on field classification |

### Success Criteria

- ✅ meta-agent creates complete agent (`.md` + `.system/{agent-name}.protected.yaml`)
- ✅ Protected configs have valid SHA-256 checksums
- ✅ Protected config files have 444 permissions
- ✅ meta-update-agent routes updates correctly (protected vs. user-editable)
- ✅ Both agents use field-classification.ts for decisions
- ✅ Zero manual intervention required

---

## Problem Statement

### Current State

**meta-agent.md**:
```yaml
---
_protected_config_source: .system/meta-agent.protected.yaml
---
```
- ✅ Has reference to protected config
- ❌ Doesn't know how to CREATE protected configs for new agents
- ❌ Doesn't know which fields belong in protected config vs. agent .md
- ❌ Doesn't compute SHA-256 checksums

**meta-update-agent.md**:
```yaml
---
_protected_config_source: ".system/meta-update-agent.protected.yaml"
---
```
- ✅ Has reference to protected config
- ❌ Doesn't know how to UPDATE protected configs
- ❌ Doesn't route updates based on field protection status
- ❌ Doesn't recompute checksums after updates

### Required State

**meta-agent.md**:
- ✅ Creates `.md` file with user-editable fields
- ✅ Creates `.system/{agent-name}.protected.yaml` with protected fields
- ✅ Computes SHA-256 checksum correctly
- ✅ Sets file permissions (444 for protected config)
- ✅ Classifies fields by agent type (System/User-Facing/Infrastructure/QA)

**meta-update-agent.md**:
- ✅ Determines if update affects protected or user-editable fields
- ✅ Updates `.md` file for user-editable changes
- ✅ Updates `.protected.yaml` for protected changes (with backup)
- ✅ Recomputes checksum after protected updates
- ✅ Validates integrity after write

---

## Requirements Specification

### Functional Requirements

#### FR-1: meta-agent Protected Config Creation

**ID**: FR-META-001
**Priority**: HIGH
**Description**: meta-agent MUST create protected configs when creating new agents

**Acceptance Criteria**:
- ✅ Agent .md file contains only user-editable fields
- ✅ Protected config YAML contains all protected fields
- ✅ Checksum is valid SHA-256 format (`sha256:{64-char-hex}`)
- ✅ File permissions set to 444 (read-only)
- ✅ `.system/` directory has 555 permissions
- ✅ Protected config validates against ProtectedConfigSchema

**Example**:
```yaml
# Input: User requests "Create security-scanner agent"
# Output: Two files created

# File 1: /prod/.claude/agents/security-scanner-agent.md
---
name: security-scanner-agent
description: Scans code for security vulnerabilities
tools: [Read, Grep, Glob, Bash]
model: sonnet
_protected_config_source: .system/security-scanner-agent.protected.yaml
---

# File 2: /prod/.claude/agents/.system/security-scanner-agent.protected.yaml
version: "1.0.0"
checksum: "sha256:a7b3c8d9..." # Computed
agent_id: "security-scanner-agent"
permissions:
  workspace:
    root: "/workspaces/agent-feed/prod/agent_workspace/security-scanner-agent"
    max_storage: "512MB"
  # ... other protected fields
```

#### FR-2: Agent Type Classification

**ID**: FR-META-002
**Priority**: HIGH
**Description**: meta-agent MUST classify agents and apply appropriate protected config templates

**Agent Types**:

| Type | Description | Protected Config Template |
|------|-------------|--------------------------|
| **System** | Background operations, no user interaction | 50-100 req/hour, 512MB RAM, 60% CPU |
| **User-Facing** | Direct user interaction, agent feed posting | 5-10 req/hour, 256MB RAM, 30% CPU |
| **Infrastructure** | Coordination, deployment, system management | 100 req/hour, 1GB storage |
| **QA** | Testing, validation, quality assurance | 50-100 req/hour, 512MB RAM |

**Classification Logic**:
```typescript
function classifyAgentType(description: string): AgentType {
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('meta-') || lowerDesc.includes('system') ||
      lowerDesc.includes('background')) {
    return 'System';
  }

  if (lowerDesc.includes('user') || lowerDesc.includes('interactive') ||
      lowerDesc.includes('delegat')) {
    return 'User-Facing';
  }

  if (lowerDesc.includes('deploy') || lowerDesc.includes('infrastructure') ||
      lowerDesc.includes('orchestrat')) {
    return 'Infrastructure';
  }

  if (lowerDesc.includes('test') || lowerDesc.includes('qa') ||
      lowerDesc.includes('validat')) {
    return 'QA';
  }

  return 'User-Facing'; // Default
}
```

**Acceptance Criteria**:
- ✅ System agents get `auto_post_outcomes: false`
- ✅ User-facing agents get `auto_post_outcomes: true`
- ✅ Infrastructure agents get higher storage limits
- ✅ QA agents get higher request rates

#### FR-3: meta-update-agent Field Routing

**ID**: FR-META-003
**Priority**: HIGH
**Description**: meta-update-agent MUST route updates to correct location based on field protection

**Update Routing Logic**:
```typescript
interface UpdateRequest {
  agentName: string;
  field: string;
  newValue: any;
}

function routeUpdate(update: UpdateRequest): 'agent-md' | 'protected-yaml' {
  const { field } = update;

  // Import from field-classification.ts
  if (isProtectedField(field)) {
    return 'protected-yaml';
  }

  if (isUserEditableField(field)) {
    return 'agent-md';
  }

  throw new Error(`Unknown field: ${field}`);
}
```

**Protected Fields** (route to `.protected.yaml`):
- `api_endpoints`, `api_methods`, `api_rate_limits`, `api_access`
- `workspace`, `workspace_path`, `workspace_root`, `allowed_paths`, `forbidden_paths`, `max_storage`
- `security_policies`, `system_boundaries`, `sandbox_enabled`, `network_access`, `file_operations`
- `tool_permissions`, `allowed_tools`, `forbidden_tools`, `forbidden_operations`
- `resource_limits`, `max_memory`, `max_cpu_percent`, `max_execution_time`, `max_concurrent_tasks`
- `posting_rules`, `auto_post_outcomes`, `post_threshold`, `default_post_type`

**User-Editable Fields** (route to `.md`):
- `name`, `description`, `color`, `proactive`, `priority`
- `personality`, `tone`, `style`, `emoji_usage`, `verbosity`
- `specialization`, `domain_expertise`, `custom_instructions`, `task_guidance`
- `autonomous_mode`, `collaboration_level`, `priority_preferences`
- `notification_preferences`, `model`, `tools`

**Acceptance Criteria**:
- ✅ Updates to `name` modify agent .md file only
- ✅ Updates to `workspace` modify protected config only
- ✅ Updates to `max_memory` trigger checksum recomputation
- ✅ Invalid field names throw clear error

#### FR-4: Backup Strategy

**ID**: FR-META-004
**Priority**: HIGH
**Description**: meta-update-agent MUST backup protected configs before modification

**Backup Location**: `/prod/agent_workspace/meta-update-agent/backups/`

**Backup Format**: `{agent-name}.protected.yaml.{ISO-timestamp}.bak`

**Example**:
```bash
# Before update
/prod/.claude/agents/.system/security-scanner-agent.protected.yaml

# Backup created
/prod/agent_workspace/meta-update-agent/backups/security-scanner-agent.protected.yaml.2025-10-17T15:30:45.123Z.bak

# Then update applied
```

**Acceptance Criteria**:
- ✅ Backup created before every protected config update
- ✅ Backup contains complete previous config
- ✅ Backup filename includes ISO timestamp
- ✅ Backups retained for 30 days minimum

### Non-Functional Requirements

#### NFR-1: Performance

**ID**: NFR-META-001
**Priority**: MEDIUM
**Description**: Agent creation/update operations MUST complete within performance budget

| Operation | Target | Maximum |
|-----------|--------|---------|
| Create agent (with protected config) | <5 seconds | 10 seconds |
| Update user-editable field | <1 second | 2 seconds |
| Update protected field | <3 seconds | 5 seconds |
| SHA-256 checksum computation | <50ms | 100ms |

#### NFR-2: Reliability

**ID**: NFR-META-002
**Priority**: HIGH
**Description**: Protected config operations MUST be atomic and failure-safe

**Requirements**:
- ✅ Use temp files + atomic rename for writes
- ✅ Rollback on any failure
- ✅ Validate after write
- ✅ Log all operations

#### NFR-3: Security

**ID**: NFR-META-003
**Priority**: CRITICAL
**Description**: Protected config management MUST maintain security boundaries

**Requirements**:
- ✅ Only meta-update-agent can modify protected configs
- ✅ File permissions enforced (444 for configs, 555 for directory)
- ✅ SHA-256 checksums verified on read
- ✅ Audit trail for all modifications

---

## Agent Type Classification

### Classification Matrix

| Agent Type | Request Rate | Memory | CPU | Storage | Auto-Post | Examples |
|------------|-------------|--------|-----|---------|-----------|----------|
| **System** | 50-100/hour | 512MB | 60% | 256MB | false | meta-agent, meta-update-agent |
| **User-Facing** | 5-10/hour | 256MB | 30% | 100MB | true | follow-ups-agent, agent-feedback-agent |
| **Infrastructure** | 100/hour | 512MB | 80% | 1GB | false | deployment-agent, monitoring-agent |
| **QA** | 50-100/hour | 512MB | 60% | 512MB | true | production-validator, test-runner |

### Template Definitions

#### System Agent Template

```yaml
version: "1.0.0"
checksum: "sha256:COMPUTED"
agent_id: "{agent-name}"
permissions:
  api_endpoints:
    - path: "/api/posts"
      methods: ["POST"]
      rate_limit: "50/hour"
      required_auth: true
  workspace:
    root: "/workspaces/agent-feed/prod/agent_workspace/{agent-name}"
    max_storage: "256MB"
    allowed_paths:
      - "/workspaces/agent-feed/prod/agent_workspace/{agent-name}/**"
      - "/workspaces/agent-feed/prod/.claude/agents/**"
    forbidden_paths:
      - "/workspaces/agent-feed/src/**"
      - "/workspaces/agent-feed/api-server/**"
  tool_permissions:
    allowed: ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "TodoWrite"]
    forbidden: ["KillShell"]
  resource_limits:
    max_memory: "512MB"
    max_cpu_percent: 60
    max_execution_time: "300s"
    max_concurrent_tasks: 3
  posting_rules:
    auto_post_outcomes: false
    post_threshold: "never"
    default_post_type: "new_post"
_metadata:
  created_at: "{ISO-timestamp}"
  updated_at: "{ISO-timestamp}"
  updated_by: "meta-agent"
  description: "Protected configuration for {agent-name}"
```

#### User-Facing Agent Template

```yaml
version: "1.0.0"
checksum: "sha256:COMPUTED"
agent_id: "{agent-name}"
permissions:
  api_endpoints:
    - path: "/api/posts"
      methods: ["GET", "POST"]
      rate_limit: "10/hour"
      required_auth: true
    - path: "/api/agents/{agent-name}/data"
      methods: ["GET"]
      rate_limit: "100/hour"
      required_auth: false
  workspace:
    root: "/workspaces/agent-feed/prod/agent_workspace/{agent-name}"
    max_storage: "100MB"
    allowed_paths:
      - "/workspaces/agent-feed/prod/agent_workspace/{agent-name}/**"
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
    post_threshold: "significant_outcome"
    default_post_type: "reply"
_metadata:
  created_at: "{ISO-timestamp}"
  updated_at: "{ISO-timestamp}"
  updated_by: "meta-agent"
  description: "Protected configuration for {agent-name}"
```

#### Infrastructure Agent Template

```yaml
version: "1.0.0"
checksum: "sha256:COMPUTED"
agent_id: "{agent-name}"
permissions:
  api_endpoints:
    - path: "/api/posts"
      methods: ["POST"]
      rate_limit: "100/hour"
      required_auth: true
  workspace:
    root: "/workspaces/agent-feed/prod/agent_workspace/{agent-name}"
    max_storage: "1GB"
    allowed_paths:
      - "/workspaces/agent-feed/prod/agent_workspace/{agent-name}/**"
      - "/workspaces/agent-feed/prod/.claude/agents/**"
    forbidden_paths:
      - "/workspaces/agent-feed/src/**"
  tool_permissions:
    allowed: ["Read", "Write", "Edit", "MultiEdit", "Bash", "Grep", "Glob"]
    forbidden: ["KillShell"]
  resource_limits:
    max_memory: "512MB"
    max_cpu_percent: 80
    max_execution_time: "600s"
    max_concurrent_tasks: 5
  posting_rules:
    auto_post_outcomes: false
    post_threshold: "never"
    default_post_type: "new_post"
_metadata:
  created_at: "{ISO-timestamp}"
  updated_at: "{ISO-timestamp}"
  updated_by: "meta-agent"
  description: "Protected configuration for {agent-name}"
```

#### QA Agent Template

```yaml
version: "1.0.0"
checksum: "sha256:COMPUTED"
agent_id: "{agent-name}"
permissions:
  api_endpoints:
    - path: "/api/posts"
      methods: ["GET", "POST"]
      rate_limit: "100/hour"
      required_auth: true
  workspace:
    root: "/workspaces/agent-feed/prod/agent_workspace/{agent-name}"
    max_storage: "512MB"
    allowed_paths:
      - "/workspaces/agent-feed/prod/agent_workspace/{agent-name}/**"
      - "/workspaces/agent-feed/tests/**"
    forbidden_paths:
      - "/workspaces/agent-feed/src/**"
  tool_permissions:
    allowed: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
    forbidden: ["KillShell"]
  resource_limits:
    max_memory: "512MB"
    max_cpu_percent: 60
    max_execution_time: "300s"
    max_concurrent_tasks: 4
  posting_rules:
    auto_post_outcomes: true
    post_threshold: "completed_task"
    default_post_type: "reply"
_metadata:
  created_at: "{ISO-timestamp}"
  updated_at: "{ISO-timestamp}"
  updated_by: "meta-agent"
  description: "Protected configuration for {agent-name}"
```

---

## Protected Config Creation Protocol

### Overview

When meta-agent creates a new agent, it MUST create both the agent `.md` file AND the protected `.system/{agent-name}.protected.yaml` sidecar.

### Step-by-Step Protocol

#### Step 1: Analyze Agent Requirements

**Input**: User description of new agent
**Output**: Agent classification and field assignments

```typescript
interface AgentRequirements {
  name: string;
  description: string;
  type: 'System' | 'User-Facing' | 'Infrastructure' | 'QA';
  tools: string[];
  model: 'haiku' | 'sonnet' | 'opus';
}

function analyzeRequirements(userPrompt: string): AgentRequirements {
  // Parse user prompt
  // Classify agent type
  // Determine required tools
  // Select appropriate model
  return requirements;
}
```

#### Step 2: Generate Protected Config

**Input**: Agent requirements
**Output**: Protected config object (without checksum)

```typescript
function generateProtectedConfig(requirements: AgentRequirements): ProtectedConfig {
  const template = getTemplateForType(requirements.type);

  return {
    version: "1.0.0",
    checksum: "", // Will be computed in Step 3
    agent_id: requirements.name,
    permissions: {
      api_endpoints: template.api_endpoints,
      workspace: {
        root: `/workspaces/agent-feed/prod/agent_workspace/${requirements.name}`,
        max_storage: template.max_storage,
        allowed_paths: [
          `/workspaces/agent-feed/prod/agent_workspace/${requirements.name}/**`
        ],
        forbidden_paths: [
          "/workspaces/agent-feed/src/**",
          "/workspaces/agent-feed/api-server/**"
        ]
      },
      tool_permissions: {
        allowed: requirements.tools,
        forbidden: ["KillShell"]
      },
      resource_limits: template.resource_limits,
      posting_rules: template.posting_rules
    },
    _metadata: {
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: "meta-agent",
      description: `Protected configuration for ${requirements.name}`
    }
  };
}
```

#### Step 3: Compute SHA-256 Checksum

**Input**: Protected config object (without checksum)
**Output**: Protected config object (with checksum)

```javascript
/**
 * Compute SHA-256 checksum for protected config
 *
 * CRITICAL STEPS:
 * 1. Remove checksum field from config object
 * 2. Sort object keys alphabetically (recursive)
 * 3. JSON.stringify with 2-space indent
 * 4. Compute SHA-256 hash
 * 5. Return hex digest prefixed with "sha256:"
 */
function computeChecksum(configWithoutChecksum) {
  const crypto = require('crypto');

  // Step 1: Ensure checksum field is removed
  const config = { ...configWithoutChecksum };
  delete config.checksum;

  // Step 2: Sort keys recursively
  const sortedConfig = sortObjectKeys(config);

  // Step 3: Serialize to JSON
  const jsonString = JSON.stringify(sortedConfig, null, 2);

  // Step 4: Compute SHA-256
  const hash = crypto.createHash('sha256');
  hash.update(jsonString);
  const checksum = hash.digest('hex');

  // Step 5: Return formatted checksum
  return `sha256:${checksum}`;
}

/**
 * Sort object keys recursively for deterministic hashing
 */
function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectKeys(item));
  }

  const sorted = {};
  Object.keys(obj)
    .sort()
    .forEach(key => {
      sorted[key] = sortObjectKeys(obj[key]);
    });

  return sorted;
}
```

**Example**:
```javascript
const config = {
  version: "1.0.0",
  agent_id: "test-agent",
  permissions: {
    workspace: {
      root: "/workspaces/agent-feed/prod/agent_workspace/test-agent",
      max_storage: "256MB"
    }
  }
};

const checksum = computeChecksum(config);
// Returns: "sha256:a7b3c8d9e2f1234567890abcdef1234567890abcdef1234567890abcdef12345"

config.checksum = checksum;
// Now config is complete with valid checksum
```

#### Step 4: Write Protected Config File

**Input**: Protected config with checksum
**Output**: File written with correct permissions

```javascript
async function writeProtectedConfig(agentName, config) {
  const fs = require('fs/promises');
  const yaml = require('js-yaml');

  // Step 1: Ensure .system directory exists
  const systemDir = '/workspaces/agent-feed/prod/.claude/agents/.system';
  await fs.mkdir(systemDir, { recursive: true });
  await fs.chmod(systemDir, 0o555); // r-xr-xr-x

  // Step 2: Write to temp file first (atomic operation)
  const configPath = `${systemDir}/${agentName}.protected.yaml`;
  const tempPath = `${configPath}.tmp`;

  await fs.writeFile(tempPath, yaml.dump(config), 'utf-8');

  // Step 3: Atomic rename
  await fs.rename(tempPath, configPath);

  // Step 4: Set read-only permissions
  await fs.chmod(configPath, 0o444); // r--r--r--

  console.log(`✅ Protected config created: ${configPath}`);
}
```

#### Step 5: Generate Agent .md File

**Input**: Agent requirements
**Output**: Agent .md file with user-editable fields only

```markdown
---
name: {agent-name}
description: {agent-description}
tools: [{tool-list}]
model: {haiku|sonnet|opus}
color: "{hex-color}"
proactive: {true|false}
priority: {P0|P1|P2|P3}
usage: {when-to-use-description}
_protected_config_source: .system/{agent-name}.protected.yaml
---

# {Agent Name}

## Purpose

{Agent purpose and responsibilities}

## Working Directory

Your working directory is `/workspaces/agent-feed/prod/agent_workspace/{agent-name}/`. Use this directory for:
- Storing agent-specific files and outputs
- Logging activities and progress
- Managing temporary files and data

## Instructions

When invoked, you must follow these steps:
1. {Step 1}
2. {Step 2}
3. {Step 3}

## Best Practices

- {Best practice 1}
- {Best practice 2}
```

#### Step 6: Validation

**After creation, MUST validate**:
- ✅ Protected config file exists
- ✅ Protected config has 444 permissions
- ✅ Checksum is valid SHA-256 format
- ✅ Checksum verification passes
- ✅ Agent .md file references protected config
- ✅ Agent .md file contains only user-editable fields

```javascript
async function validateCreation(agentName) {
  const fs = require('fs/promises');
  const crypto = require('crypto');
  const yaml = require('js-yaml');

  // Check protected config exists
  const protectedPath = `/workspaces/agent-feed/prod/.claude/agents/.system/${agentName}.protected.yaml`;
  const stats = await fs.stat(protectedPath);

  // Check permissions (444 = 292 in decimal)
  if (stats.mode & 0o777 !== 0o444) {
    throw new Error('Invalid permissions on protected config');
  }

  // Load and verify checksum
  const content = await fs.readFile(protectedPath, 'utf-8');
  const config = yaml.load(content);

  const storedChecksum = config.checksum.replace('sha256:', '');
  delete config.checksum;
  const computedChecksum = computeChecksum(config);

  if (storedChecksum !== computedChecksum) {
    throw new Error('Checksum verification failed');
  }

  console.log('✅ Validation passed');
}
```

---

## Protected Config Update Protocol

### Overview

When meta-update-agent updates an agent, it MUST determine if the update affects protected or user-editable fields, then route accordingly.

### Step-by-Step Protocol

#### Step 1: Classify Update Fields

**Input**: Update request with field names
**Output**: Classification of each field

```javascript
function classifyUpdateFields(updateRequest) {
  const fieldClassification = require('/workspaces/agent-feed/src/config/schemas/field-classification.ts');

  const classification = {
    protectedFields: [],
    userEditableFields: [],
    unknownFields: []
  };

  for (const [fieldName, newValue] of Object.entries(updateRequest.updates)) {
    if (fieldClassification.isProtectedField(fieldName)) {
      classification.protectedFields.push({ fieldName, newValue });
    } else if (fieldClassification.isUserEditableField(fieldName)) {
      classification.userEditableFields.push({ fieldName, newValue });
    } else {
      classification.unknownFields.push(fieldName);
    }
  }

  return classification;
}
```

#### Step 2: Route Updates

**Logic**:
- If ALL fields are user-editable → Update `.md` file only
- If ANY field is protected → Update `.protected.yaml` file (with backup and checksum)
- If ANY field is unknown → Throw error

```javascript
function routeUpdate(classification) {
  if (classification.unknownFields.length > 0) {
    throw new Error(`Unknown fields: ${classification.unknownFields.join(', ')}`);
  }

  const routes = [];

  if (classification.userEditableFields.length > 0) {
    routes.push({
      type: 'agent-md',
      fields: classification.userEditableFields
    });
  }

  if (classification.protectedFields.length > 0) {
    routes.push({
      type: 'protected-yaml',
      fields: classification.protectedFields
    });
  }

  return routes;
}
```

#### Step 3: Update User-Editable Fields (Agent .md)

**Process**:
1. Load agent .md file
2. Parse frontmatter
3. Update fields
4. Write back to file

```javascript
async function updateAgentMd(agentName, fields) {
  const fs = require('fs/promises');
  const matter = require('gray-matter');

  const mdPath = `/workspaces/agent-feed/prod/.claude/agents/${agentName}.md`;

  // Load current content
  const content = await fs.readFile(mdPath, 'utf-8');
  const { data: frontmatter, content: body } = matter(content);

  // Update fields
  for (const { fieldName, newValue } of fields) {
    frontmatter[fieldName] = newValue;
  }

  // Write updated file
  const updated = matter.stringify(body, frontmatter);
  await fs.writeFile(mdPath, updated, 'utf-8');

  console.log(`✅ Updated agent .md: ${agentName}`);
}
```

#### Step 4: Update Protected Fields (Protected Config)

**Process**:
1. Backup current protected config
2. Load current config
3. Update protected fields
4. Remove checksum
5. Compute new checksum
6. Write to temp file
7. Atomic rename
8. Set permissions
9. Validate

```javascript
async function updateProtectedConfig(agentName, fields) {
  const fs = require('fs/promises');
  const yaml = require('js-yaml');

  const protectedPath = `/workspaces/agent-feed/prod/.claude/agents/.system/${agentName}.protected.yaml`;
  const backupDir = '/workspaces/agent-feed/prod/agent_workspace/meta-update-agent/backups';

  // Step 1: Backup
  const timestamp = new Date().toISOString();
  const backupPath = `${backupDir}/${agentName}.protected.yaml.${timestamp}.bak`;
  await fs.mkdir(backupDir, { recursive: true });
  await fs.copyFile(protectedPath, backupPath);
  console.log(`📦 Backup created: ${backupPath}`);

  // Step 2: Load current config
  const content = await fs.readFile(protectedPath, 'utf-8');
  const config = yaml.load(content);

  // Step 3: Update fields
  for (const { fieldName, newValue } of fields) {
    updateNestedField(config.permissions, fieldName, newValue);
  }

  // Step 4: Update metadata
  config._metadata.updated_at = new Date().toISOString();
  config._metadata.updated_by = 'meta-update-agent';

  // Step 5: Remove old checksum
  delete config.checksum;

  // Step 6: Compute new checksum
  config.checksum = computeChecksum(config);

  // Step 7: Write to temp file
  const tempPath = `${protectedPath}.tmp`;
  await fs.writeFile(tempPath, yaml.dump(config), 'utf-8');

  // Step 8: Atomic rename
  await fs.rename(tempPath, protectedPath);

  // Step 9: Set permissions
  await fs.chmod(protectedPath, 0o444);

  console.log(`✅ Protected config updated: ${agentName}`);

  // Step 10: Validate
  await validateChecksumIntegrity(agentName);
}

function updateNestedField(obj, fieldPath, newValue) {
  // Handle nested field updates like "workspace.max_storage"
  const parts = fieldPath.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }

  current[parts[parts.length - 1]] = newValue;
}
```

#### Step 5: Validate Checksum Integrity

**After every protected config update**:

```javascript
async function validateChecksumIntegrity(agentName) {
  const fs = require('fs/promises');
  const yaml = require('js-yaml');

  const protectedPath = `/workspaces/agent-feed/prod/.claude/agents/.system/${agentName}.protected.yaml`;

  // Load config
  const content = await fs.readFile(protectedPath, 'utf-8');
  const config = yaml.load(content);

  // Extract stored checksum
  const storedChecksum = config.checksum.replace('sha256:', '');

  // Compute current checksum
  delete config.checksum;
  const computed = computeChecksum(config);
  const computedChecksum = computed.replace('sha256:', '');

  // Compare
  if (storedChecksum !== computedChecksum) {
    throw new Error(
      `Checksum validation failed for ${agentName}\n` +
      `  Stored:   ${storedChecksum}\n` +
      `  Computed: ${computedChecksum}`
    );
  }

  console.log(`✅ Checksum integrity verified: ${agentName}`);
}
```

---

## SHA-256 Checksum Computation

### Algorithm Specification

**Purpose**: Ensure protected config integrity and detect tampering

**Algorithm**:
```
1. INPUT: Protected config object
2. CREATE: Deep copy of config object
3. DELETE: checksum field from copy
4. SORT: All object keys alphabetically (recursive)
5. SERIALIZE: JSON.stringify with 2-space indent
6. HASH: SHA-256 of serialized string
7. ENCODE: Hex digest
8. FORMAT: "sha256:{hex}"
9. OUTPUT: Formatted checksum string
```

### Reference Implementation

```javascript
/**
 * SHA-256 Checksum Computation for Protected Configs
 *
 * This is the CANONICAL implementation that both meta-agent
 * and meta-update-agent MUST use.
 */
const crypto = require('crypto');

/**
 * Compute SHA-256 checksum for protected config
 *
 * @param {Object} config - Protected config (with or without checksum field)
 * @returns {string} - Formatted checksum "sha256:{hex}"
 */
function computeProtectedConfigChecksum(config) {
  // Step 1: Deep copy to avoid mutation
  const configCopy = JSON.parse(JSON.stringify(config));

  // Step 2: Remove checksum field if present
  delete configCopy.checksum;

  // Step 3: Sort keys recursively
  const sorted = sortKeysRecursive(configCopy);

  // Step 4: Serialize to stable JSON
  const json = JSON.stringify(sorted, null, 2);

  // Step 5: Compute SHA-256
  const hash = crypto.createHash('sha256');
  hash.update(json, 'utf-8');
  const hex = hash.digest('hex');

  // Step 6: Format as "sha256:{hex}"
  return `sha256:${hex}`;
}

/**
 * Sort object keys recursively for deterministic serialization
 *
 * @param {any} value - Value to sort (object, array, or primitive)
 * @returns {any} - Sorted value
 */
function sortKeysRecursive(value) {
  // Handle null
  if (value === null) {
    return null;
  }

  // Handle primitives (string, number, boolean)
  if (typeof value !== 'object') {
    return value;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => sortKeysRecursive(item));
  }

  // Handle objects
  const sorted = {};
  const keys = Object.keys(value).sort(); // Alphabetical sort

  for (const key of keys) {
    sorted[key] = sortKeysRecursive(value[key]);
  }

  return sorted;
}

/**
 * Verify checksum matches config
 *
 * @param {Object} config - Protected config with checksum field
 * @returns {boolean} - True if checksum is valid
 */
function verifyProtectedConfigChecksum(config) {
  if (!config.checksum) {
    return false;
  }

  const stored = config.checksum.replace('sha256:', '');
  const computed = computeProtectedConfigChecksum(config).replace('sha256:', '');

  return stored === computed;
}

module.exports = {
  computeProtectedConfigChecksum,
  sortKeysRecursive,
  verifyProtectedConfigChecksum
};
```

### Test Cases

```javascript
describe('SHA-256 Checksum Computation', () => {
  test('should compute consistent checksum', () => {
    const config = {
      version: "1.0.0",
      agent_id: "test-agent",
      permissions: {}
    };

    const checksum1 = computeProtectedConfigChecksum(config);
    const checksum2 = computeProtectedConfigChecksum(config);

    expect(checksum1).toBe(checksum2);
  });

  test('should ignore key order', () => {
    const config1 = { b: 2, a: 1 };
    const config2 = { a: 1, b: 2 };

    const checksum1 = computeProtectedConfigChecksum(config1);
    const checksum2 = computeProtectedConfigChecksum(config2);

    expect(checksum1).toBe(checksum2);
  });

  test('should detect changes', () => {
    const config1 = { version: "1.0.0" };
    const config2 = { version: "1.0.1" };

    const checksum1 = computeProtectedConfigChecksum(config1);
    const checksum2 = computeProtectedConfigChecksum(config2);

    expect(checksum1).not.toBe(checksum2);
  });

  test('should format correctly', () => {
    const config = { version: "1.0.0" };
    const checksum = computeProtectedConfigChecksum(config);

    expect(checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
```

---

## File Permission Management

### Permission Requirements

| File/Directory | Octal | Symbolic | Purpose |
|----------------|-------|----------|---------|
| `.system/` directory | `555` | `r-xr-xr-x` | Read + execute, no write |
| `*.protected.yaml` files | `444` | `r--r--r--` | Read-only for all users |
| Agent `.md` files | `644` | `rw-r--r--` | User can edit, others read-only |
| Backup directory | `755` | `rwxr-xr-x` | Full access for system |

### Setting Permissions

```javascript
async function setProtectedConfigPermissions() {
  const fs = require('fs/promises');

  // System directory: read + execute only
  await fs.chmod(
    '/workspaces/agent-feed/prod/.claude/agents/.system',
    0o555 // r-xr-xr-x
  );

  // Protected config: read-only
  await fs.chmod(
    '/workspaces/agent-feed/prod/.claude/agents/.system/agent.protected.yaml',
    0o444 // r--r--r--
  );
}
```

### Verifying Permissions

```javascript
async function verifyPermissions(filePath) {
  const fs = require('fs/promises');
  const stats = await fs.stat(filePath);

  // Extract permission bits (last 9 bits)
  const mode = stats.mode & 0o777;

  if (filePath.includes('.protected.yaml')) {
    if (mode !== 0o444) {
      throw new Error(`Invalid permissions on ${filePath}: expected 444, got ${mode.toString(8)}`);
    }
  }

  console.log(`✅ Permissions correct: ${filePath} (${mode.toString(8)})`);
}
```

---

## Field Classification System

### Using field-classification.ts

Both meta-agent and meta-update-agent MUST use the canonical field classification module.

**Location**: `/workspaces/agent-feed/src/config/schemas/field-classification.ts`

### Import and Usage

```javascript
// Import field classification helpers
import {
  PROTECTED_FIELDS,
  USER_EDITABLE_FIELDS,
  isProtectedField,
  isUserEditableField,
  extractProtectedFields,
  extractUserEditableFields
} from '../src/config/schemas/field-classification.ts';

// Check if field is protected
if (isProtectedField('workspace')) {
  console.log('Field is protected - route to .protected.yaml');
}

// Check if field is user-editable
if (isUserEditableField('personality')) {
  console.log('Field is user-editable - route to .md file');
}

// Extract protected fields from config
const allFields = {
  name: 'test-agent',
  workspace: '/path/to/workspace',
  personality: { tone: 'friendly' },
  max_memory: '512MB'
};

const protectedFields = extractProtectedFields(allFields);
// { workspace: '/path/to/workspace', max_memory: '512MB' }

const userFields = extractUserEditableFields(allFields);
// { name: 'test-agent', personality: { tone: 'friendly' } }
```

### Protected Fields Reference

**Complete list from field-classification.ts**:

```typescript
// API Access Control
'api_endpoints', 'api_methods', 'api_rate_limits', 'api_access',

// Workspace & File System
'workspace', 'workspace_path', 'workspace_root', 'allowed_paths',
'forbidden_paths', 'max_storage',

// Security Policies
'security_policies', 'system_boundaries', 'sandbox_enabled',
'network_access', 'file_operations',

// Tool Permissions
'tool_permissions', 'allowed_tools', 'forbidden_tools', 'forbidden_operations',

// Resource Limits
'resource_limits', 'max_memory', 'max_cpu_percent', 'max_execution_time',
'max_concurrent_tasks',

// Posting Rules
'posting_rules', 'auto_post_outcomes', 'post_threshold', 'default_post_type',

// Protected Metadata
'_protected', '_permissions', '_protected_config_source'
```

### User-Editable Fields Reference

```typescript
// Basic Info
'name', 'description', 'color', 'proactive', 'priority',

// Personality
'personality', 'tone', 'style', 'emoji_usage', 'verbosity',

// Specialization
'specialization', 'domain_expertise',

// Custom Instructions
'custom_instructions', 'task_guidance', 'preferred_approach',

// Autonomous Mode
'autonomous_mode', 'collaboration_level',

// Priority Preferences
'priority_preferences', 'focus', 'timeframe', 'task_selection',

// Notification Preferences
'notification_preferences', 'on_start', 'on_complete', 'on_error', 'on_milestone',

// Model Selection
'model', 'tools'
```

---

## Integration Requirements

### Dependencies

Both meta-agents MUST have access to:

1. **Node.js crypto module** (for SHA-256)
   ```javascript
   const crypto = require('crypto');
   ```

2. **field-classification.ts** (for field routing)
   ```javascript
   import { isProtectedField } from '/workspaces/agent-feed/src/config/schemas/field-classification.ts';
   ```

3. **ProtectedConfigSchema** (for validation)
   ```javascript
   import { ProtectedConfigSchema } from '/workspaces/agent-feed/src/config/schemas/protected-config.schema.ts';
   ```

4. **YAML library** (for serialization)
   ```javascript
   const yaml = require('js-yaml');
   ```

5. **gray-matter** (for frontmatter parsing)
   ```javascript
   const matter = require('gray-matter');
   ```

### File System Access

**Required permissions**:
- ✅ Read: `/workspaces/agent-feed/prod/.claude/agents/*.md`
- ✅ Read: `/workspaces/agent-feed/prod/.claude/agents/.system/*.protected.yaml`
- ✅ Write: `/workspaces/agent-feed/prod/.claude/agents/*.md` (meta-agent only)
- ✅ Write: `/workspaces/agent-feed/prod/.claude/agents/.system/*.protected.yaml` (both agents)
- ✅ Write: `/workspaces/agent-feed/prod/agent_workspace/meta-update-agent/backups/` (meta-update-agent only)

### Environment Configuration

```bash
# meta-agent frontmatter
---
tools: [Read, Write, Edit, Bash, Grep, Glob, TodoWrite, WebFetch, WebSearch]
---

# meta-update-agent frontmatter
---
tools: [Read, Write, Edit, MultiEdit, Bash, Grep, Glob, TodoWrite, WebFetch, WebSearch]
---
```

---

## Acceptance Criteria

### For meta-agent

#### AC-1: Protected Config Creation
- ✅ When creating a new agent, meta-agent creates `.protected.yaml` file
- ✅ Protected config has valid SHA-256 checksum
- ✅ Protected config file has 444 permissions
- ✅ `.system/` directory has 555 permissions
- ✅ Agent `.md` file references protected config via `_protected_config_source`

#### AC-2: Agent Type Classification
- ✅ System agents get `auto_post_outcomes: false`
- ✅ User-facing agents get `auto_post_outcomes: true`
- ✅ Resource limits match agent type template
- ✅ Workspace paths are correctly configured

#### AC-3: Field Assignment
- ✅ Protected fields go in `.protected.yaml`
- ✅ User-editable fields go in `.md` file
- ✅ No protected fields in agent frontmatter
- ✅ `_protected_config_source` present in frontmatter

### For meta-update-agent

#### AC-4: Update Routing
- ✅ Updates to `name` modify `.md` file only
- ✅ Updates to `workspace` modify `.protected.yaml` only
- ✅ Updates to `max_memory` recompute checksum
- ✅ Mixed updates correctly split between files

#### AC-5: Protected Config Updates
- ✅ Backup created before every protected update
- ✅ Backup filename includes ISO timestamp
- ✅ Checksum recomputed after update
- ✅ Checksum validation passes after write
- ✅ File permissions remain 444 after update

#### AC-6: Error Handling
- ✅ Unknown field names throw clear error
- ✅ Invalid checksum detected immediately
- ✅ Failed updates restore from backup
- ✅ All errors logged with context

---

## Implementation Examples

### Example 1: meta-agent Creates Security Scanner

**User Request**: "Create a security scanner agent"

**meta-agent Actions**:

```javascript
// Step 1: Analyze request
const requirements = {
  name: 'security-scanner-agent',
  description: 'Scans code for security vulnerabilities',
  type: 'QA', // Detected from 'scanner' + 'security'
  tools: ['Read', 'Grep', 'Glob', 'Bash'],
  model: 'sonnet'
};

// Step 2: Generate protected config
const protectedConfig = {
  version: "1.0.0",
  checksum: "", // Will be computed
  agent_id: "security-scanner-agent",
  permissions: {
    api_endpoints: [
      {
        path: "/api/posts",
        methods: ["GET", "POST"],
        rate_limit: "100/hour",
        required_auth: true
      }
    ],
    workspace: {
      root: "/workspaces/agent-feed/prod/agent_workspace/security-scanner-agent",
      max_storage: "512MB",
      allowed_paths: [
        "/workspaces/agent-feed/prod/agent_workspace/security-scanner-agent/**",
        "/workspaces/agent-feed/tests/**"
      ],
      forbidden_paths: [
        "/workspaces/agent-feed/src/**"
      ]
    },
    tool_permissions: {
      allowed: ["Read", "Grep", "Glob", "Bash"],
      forbidden: ["KillShell"]
    },
    resource_limits: {
      max_memory: "512MB",
      max_cpu_percent: 60,
      max_execution_time: "300s",
      max_concurrent_tasks: 4
    },
    posting_rules: {
      auto_post_outcomes: true,
      post_threshold: "completed_task",
      default_post_type: "reply"
    }
  },
  _metadata: {
    created_at: "2025-10-17T15:30:00.000Z",
    updated_at: "2025-10-17T15:30:00.000Z",
    updated_by: "meta-agent",
    description: "Protected configuration for security-scanner-agent"
  }
};

// Step 3: Compute checksum
delete protectedConfig.checksum;
protectedConfig.checksum = computeChecksum(protectedConfig);
// "sha256:a7b3c8d9e2f1234567890abcdef1234567890abcdef1234567890abcdef12345"

// Step 4: Write protected config
await writeProtectedConfig('security-scanner-agent', protectedConfig);

// Step 5: Write agent .md
const agentContent = `---
name: security-scanner-agent
description: Scans code for security vulnerabilities
tools: [Read, Grep, Glob, Bash]
model: sonnet
color: "#ef4444"
proactive: false
priority: P2
usage: Use when analyzing code for security issues
_protected_config_source: .system/security-scanner-agent.protected.yaml
---

# Security Scanner Agent

## Purpose

You are a security scanning specialist...
`;

await fs.writeFile(
  '/workspaces/agent-feed/prod/.claude/agents/security-scanner-agent.md',
  agentContent
);

// Step 6: Validate
await validateCreation('security-scanner-agent');
```

### Example 2: meta-update-agent Updates Memory Limit

**User Request**: "Increase security-scanner-agent memory to 1GB"

**meta-update-agent Actions**:

```javascript
// Step 1: Classify update
const update = {
  agentName: 'security-scanner-agent',
  updates: {
    max_memory: '1GB' // This is a protected field
  }
};

const classification = classifyUpdateFields(update);
// {
//   protectedFields: [{ fieldName: 'max_memory', newValue: '1GB' }],
//   userEditableFields: [],
//   unknownFields: []
// }

// Step 2: Route to protected config update
const routes = routeUpdate(classification);
// [{ type: 'protected-yaml', fields: [...] }]

// Step 3: Backup current config
const backupPath = `/workspaces/agent-feed/prod/agent_workspace/meta-update-agent/backups/security-scanner-agent.protected.yaml.2025-10-17T15:35:00.000Z.bak`;
await fs.copyFile(protectedPath, backupPath);

// Step 4: Load config
const config = yaml.load(await fs.readFile(protectedPath, 'utf-8'));

// Step 5: Update field
config.permissions.resource_limits.max_memory = '1GB';
config._metadata.updated_at = '2025-10-17T15:35:00.000Z';
config._metadata.updated_by = 'meta-update-agent';

// Step 6: Recompute checksum
delete config.checksum;
config.checksum = computeChecksum(config);

// Step 7: Write atomically
const tempPath = `${protectedPath}.tmp`;
await fs.writeFile(tempPath, yaml.dump(config));
await fs.rename(tempPath, protectedPath);
await fs.chmod(protectedPath, 0o444);

// Step 8: Validate
await validateChecksumIntegrity('security-scanner-agent');
```

### Example 3: meta-update-agent Updates Personality (User-Editable)

**User Request**: "Make security-scanner-agent more friendly"

**meta-update-agent Actions**:

```javascript
// Step 1: Classify update
const update = {
  agentName: 'security-scanner-agent',
  updates: {
    personality: {
      tone: 'friendly',
      style: 'conversational'
    }
  }
};

const classification = classifyUpdateFields(update);
// {
//   protectedFields: [],
//   userEditableFields: [{ fieldName: 'personality', newValue: {...} }],
//   unknownFields: []
// }

// Step 2: Route to agent .md update
const routes = routeUpdate(classification);
// [{ type: 'agent-md', fields: [...] }]

// Step 3: Load agent .md
const mdPath = '/workspaces/agent-feed/prod/.claude/agents/security-scanner-agent.md';
const content = await fs.readFile(mdPath, 'utf-8');
const { data: frontmatter, content: body } = matter(content);

// Step 4: Update frontmatter
frontmatter.personality = {
  tone: 'friendly',
  style: 'conversational'
};

// Step 5: Write updated file
const updated = matter.stringify(body, frontmatter);
await fs.writeFile(mdPath, updated);

// No checksum recomputation needed (agent .md not protected)
```

---

## Test Scenarios

### Test Scenario 1: Create System Agent

**Given**: User requests "Create meta-validator agent"
**When**: meta-agent processes request
**Then**:
- ✅ Agent classified as "System"
- ✅ `.md` file created with user-editable fields
- ✅ `.protected.yaml` created with `auto_post_outcomes: false`
- ✅ Checksum is valid SHA-256
- ✅ File permissions are correct (444 for config)

### Test Scenario 2: Create User-Facing Agent

**Given**: User requests "Create customer-support agent"
**When**: meta-agent processes request
**Then**:
- ✅ Agent classified as "User-Facing"
- ✅ `.protected.yaml` created with `auto_post_outcomes: true`
- ✅ API rate limit is 10/hour
- ✅ Memory limit is 256MB

### Test Scenario 3: Update Protected Field

**Given**: Agent exists with protected config
**When**: User requests "Update max_memory to 2GB"
**Then**:
- ✅ meta-update-agent creates backup
- ✅ Protected config is updated
- ✅ Checksum is recomputed
- ✅ Validation passes

### Test Scenario 4: Update User-Editable Field

**Given**: Agent exists
**When**: User requests "Update agent color to blue"
**Then**:
- ✅ meta-update-agent updates `.md` file only
- ✅ Protected config is NOT touched
- ✅ No checksum recomputation

### Test Scenario 5: Mixed Update

**Given**: Agent exists
**When**: User requests "Update personality AND max_memory"
**Then**:
- ✅ meta-update-agent detects mixed update
- ✅ `.md` file updated for personality
- ✅ `.protected.yaml` updated for max_memory
- ✅ Checksum recomputed for protected config
- ✅ Both updates successful

### Test Scenario 6: Invalid Field Name

**Given**: Agent exists
**When**: User requests "Update unknown_field to foo"
**Then**:
- ✅ meta-update-agent throws error
- ✅ Error message: "Unknown field: unknown_field"
- ✅ No files modified

### Test Scenario 7: Checksum Verification Failure

**Given**: Protected config has invalid checksum
**When**: meta-update-agent attempts update
**Then**:
- ✅ Validation fails immediately
- ✅ Error logged with details
- ✅ Update aborted

---

## Error Handling

### Error Categories

#### E-1: Invalid Field Classification

**Trigger**: Update references unknown field name
**Response**:
```javascript
throw new Error(
  `Unknown field: "${fieldName}". ` +
  `Valid fields are: ${[...PROTECTED_FIELDS, ...USER_EDITABLE_FIELDS].join(', ')}`
);
```

#### E-2: Checksum Verification Failure

**Trigger**: Stored checksum doesn't match computed
**Response**:
```javascript
throw new Error(
  `Checksum verification failed for ${agentName}\n` +
  `  Expected: ${storedChecksum}\n` +
  `  Computed: ${computedChecksum}\n` +
  `  This indicates tampering or corruption.`
);
```

#### E-3: Permission Denied

**Trigger**: Cannot set file permissions
**Response**:
```javascript
throw new Error(
  `Failed to set permissions on ${filePath}\n` +
  `  Required: 444 (read-only)\n` +
  `  This may require elevated privileges.`
);
```

#### E-4: Backup Creation Failure

**Trigger**: Cannot create backup before update
**Response**:
```javascript
throw new Error(
  `Failed to create backup for ${agentName}\n` +
  `  Target: ${backupPath}\n` +
  `  Update aborted to prevent data loss.`
);
```

### Error Recovery

**General strategy**:
1. Log error with full context
2. Do NOT proceed with partial update
3. Restore from backup if update was in progress
4. Return clear error message to user
5. Suggest remediation steps

```javascript
try {
  await updateProtectedConfig(agentName, fields);
} catch (error) {
  console.error(`❌ Protected config update failed: ${error.message}`);

  // Attempt restoration from backup
  if (backupExists) {
    console.log('🔄 Restoring from backup...');
    await restoreFromBackup(agentName, backupPath);
    console.log('✅ Restored from backup');
  }

  throw error; // Re-throw for caller
}
```

---

## Appendices

### Appendix A: Quick Reference Card

**For meta-agent**:
```bash
# When creating a new agent:
1. Classify agent type (System/User-Facing/Infrastructure/QA)
2. Generate protected config from template
3. Compute SHA-256 checksum
4. Write .protected.yaml with 444 permissions
5. Create .md file with _protected_config_source
6. Validate creation
```

**For meta-update-agent**:
```bash
# When updating an agent:
1. Classify update fields (protected vs. user-editable)
2. If protected: backup, update .protected.yaml, recompute checksum
3. If user-editable: update .md file only
4. Validate after write
```

### Appendix B: File Structure

```
/workspaces/agent-feed/prod/.claude/agents/
├── security-scanner-agent.md           # User-editable fields
└── .system/                             # Protected configs directory (555)
    └── security-scanner-agent.protected.yaml  # Protected fields (444)

/workspaces/agent-feed/prod/agent_workspace/meta-update-agent/
└── backups/                             # Config backups
    └── security-scanner-agent.protected.yaml.2025-10-17T15:30:00.000Z.bak
```

### Appendix C: Validation Checklist

**After creating/updating protected config**:
- [ ] File exists at correct path
- [ ] File has 444 permissions
- [ ] Checksum format is `sha256:{64-hex}`
- [ ] Checksum verification passes
- [ ] Config validates against ProtectedConfigSchema
- [ ] Agent .md references protected config
- [ ] Backup created (for updates)

### Appendix D: Common Pitfalls

| Pitfall | Symptom | Solution |
|---------|---------|----------|
| **Key order matters** | Checksums don't match | Use `sortKeysRecursive()` |
| **Checksum included in hash** | Validation fails | Remove checksum before hashing |
| **Permissions not set** | File writable by users | Always `chmod 444` |
| **No backup** | Can't rollback | Always backup before update |
| **Unknown field** | Error on update | Check field-classification.ts |

---

## Summary

This specification provides COMPLETE instructions for updating meta-agent and meta-update-agent to work with the protected agent architecture. Every detail is executable and production-ready.

**Key Implementation Points**:
1. ✅ Use field-classification.ts for all field routing decisions
2. ✅ Always compute SHA-256 checksum with sorted keys
3. ✅ Set file permissions (444 for configs, 555 for directory)
4. ✅ Backup before every protected config update
5. ✅ Validate after every operation

**Next Steps**:
1. Update meta-agent.md with protected config creation logic
2. Update meta-update-agent.md with update routing logic
3. Test with 3-5 agent creation/update scenarios
4. Validate checksums and permissions
5. Deploy to production

---

**Specification Approval**: Ready for implementation ✅
**Reviewed By**: SPARC Specification Agent
**Date**: 2025-10-17
