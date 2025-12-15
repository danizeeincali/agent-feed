# SPARC Architecture: Protected Agent Fields System

**Version**: 1.0.0
**Status**: Architecture Complete
**Date**: 2025-10-17
**Architect**: SPARC Architecture Agent
**Implementation Approach**: Option 3 - Hybrid Markdown + Protected Sidecar

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Component Design](#component-design)
4. [Data Architecture](#data-architecture)
5. [Security Architecture](#security-architecture)
6. [Integration Points](#integration-points)
7. [Error Handling Strategy](#error-handling-strategy)
8. [Logging Strategy](#logging-strategy)
9. [Performance Optimization](#performance-optimization)
10. [Deployment Architecture](#deployment-architecture)
11. [Appendices](#appendices)

---

## Executive Summary

### Purpose

This architecture defines a **production-ready protected agent configuration system** that:
- Prevents unauthorized modification of critical agent permissions (API access, resource limits, security policies)
- Maintains backward compatibility with existing `.md` agent files
- Enables incremental migration without breaking changes
- Provides OS-level file protection and runtime integrity verification
- Supports administrative updates with audit logging and rollback

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Hybrid Approach** | Preserves `.md` format compatibility while adding `.protected.yaml` sidecars for OS-level protection |
| **Incremental Migration** | Non-breaking: agents without sidecars continue working; add protection agent-by-agent |
| **SHA-256 Integrity** | Runtime verification detects tampering; fast computation; industry-standard |
| **File System Protection** | OS-level permissions (444/555) prevent unauthorized edits; simple and effective |
| **Cache-First Loading** | In-memory cache with file watchers for performance; hot-reload on changes |

### Success Metrics

- **Security**: Zero unauthorized modifications to protected fields
- **Performance**: Agent load time < 50ms (cached), < 200ms (cold)
- **Reliability**: 99.9% uptime for config loading; automatic rollback on failures
- **Compatibility**: 100% backward compatibility with existing agents

---

## System Architecture Overview

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Agent Feed Application                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  WorkerSpawnerAdapter                            │
│  (spawns workers, manages lifecycle)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────┴────────────────┐
        │                                  │
        ▼                                  ▼
┌──────────────────┐            ┌──────────────────┐
│ ClaudeCodeWorker │            │UnifiedAgentWorker│
└────────┬─────────┘            └────────┬─────────┘
         │                               │
         └───────────┬───────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ProtectedAgentLoader   │◄──────────┐
         │ (loads & validates)   │            │
         └───────┬───────────────┘            │
                 │                             │
                 ├─────────────────┐           │
                 │                 │           │
                 ▼                 ▼           │
       ┌──────────────────┐ ┌──────────────┐  │
       │AgentConfigValidator│ │IntegrityChecker│  │
       │(merges configs)   │ │(SHA-256 verify)│  │
       └──────────────────┘ └──────────────┘  │
                 │                             │
                 ▼                             │
       ┌─────────────────────┐                │
       │  Markdown Parser    │                │
       │  (YAML frontmatter) │                │
       └──────┬──────────────┘                │
              │                                │
              ▼                                │
    ┌─────────────────────┐                   │
    │   File System       │                   │
    │                     │                   │
    │  .claude/agents/    │                   │
    │  ├── agent.md       │◄──────────────────┘
    │  └── .system/       │
    │      └── agent.protected.yaml           │
    └─────────────────────┘
```

### Data Flow: Agent Loading

```
1. Worker Initialization
   │
   ├─→ WorkerSpawnerAdapter.spawnWorker(ticket)
   │
   └─→ ClaudeCodeWorker.executeTicket(ticket)
       │
       ├─→ ProtectedAgentLoader.loadAgent(agentName)
       │   │
       │   ├─→ Check Cache
       │   │   │
       │   │   ├─→ CACHE HIT: Return cached config
       │   │   │
       │   │   └─→ CACHE MISS: Continue loading
       │   │
       │   ├─→ Load agent.md file
       │   │   │
       │   │   └─→ MarkdownParser.parse(content)
       │   │       └─→ Extract YAML frontmatter + body
       │   │
       │   ├─→ Check for _protected_config_source
       │   │   │
       │   │   ├─→ NOT FOUND: Return plain config (backward compatible)
       │   │   │
       │   │   └─→ FOUND: Load protected sidecar
       │   │       │
       │   │       ├─→ Load .system/agent.protected.yaml
       │   │       │
       │   │       ├─→ IntegrityChecker.verify(config)
       │   │       │   │
       │   │       │   ├─→ Compute SHA-256 hash
       │   │       │   │
       │   │       │   ├─→ Compare with stored checksum
       │   │       │   │
       │   │       │   ├─→ MATCH: Continue
       │   │       │   │
       │   │       │   └─→ MISMATCH: Throw SecurityError
       │   │       │
       │   │       └─→ AgentConfigValidator.merge(agent, protected)
       │   │           │
       │   │           └─→ Protected fields take precedence
       │   │
       │   ├─→ Cache merged config
       │   │
       │   └─→ Return validated config
       │
       └─→ Execute work ticket with agent config
```

### Sequence Diagram: Protected Config Update

```
Admin                ProtectedConfigManager    FileSystem         TamperingDetector
  │                          │                     │                      │
  │─updateProtectedConfig()─►│                     │                      │
  │                          │                     │                      │
  │                          │─hasSystemPrivileges()                      │
  │                          │                     │                      │
  │                          │─loadCurrent()──────►│                      │
  │                          │◄─current.yaml───────│                      │
  │                          │                     │                      │
  │                          │─backup()───────────►│                      │
  │                          │◄─backup.yaml────────│                      │
  │                          │                     │                      │
  │                          │─applyUpdates()      │                      │
  │                          │                     │                      │
  │                          │─computeHash()       │                      │
  │                          │                     │                      │
  │                          │─write()────────────►│                      │
  │                          │◄─success────────────│                      │
  │                          │                     │                      │
  │                          │─reloadAgent()       │                      │
  │                          │                     │                      │
  │◄─success─────────────────│                     │                      │
  │                          │                     │                      │
  │                          │                     │─fileChange()────────►│
  │                          │                     │                      │
  │                          │                     │                 detectTampering()
  │                          │                     │                      │
  │                          │                     │                 verify()
  │                          │                     │                      │
  │                          │                     │◄──restore────────────│
```

---

## Component Design

### 1. ProtectedAgentLoader

**Responsibility**: Load and cache agent configurations with protected sidecar support

**Interface**:
```typescript
interface IProtectedAgentLoader {
  /**
   * Load agent configuration with protection support
   * @param agentName - Agent identifier (e.g., "strategic-planner")
   * @returns Promise resolving to validated agent configuration
   * @throws AgentNotFoundError if agent file doesn't exist
   * @throws SecurityError if integrity check fails
   */
  loadAgent(agentName: string): Promise<AgentConfig>;

  /**
   * Reload agent configuration (clears cache)
   * @param agentName - Agent identifier
   */
  reloadAgent(agentName: string): Promise<void>;

  /**
   * Watch for file changes and auto-reload
   */
  watchForChanges(): void;

  /**
   * Clear all cached configurations
   */
  clearCache(): void;
}
```

**Implementation**:
```typescript
/**
 * ProtectedAgentLoader - Loads agents with sidecar protection support
 * Location: /workspaces/agent-feed/src/config/loaders/protected-agent-loader.ts
 */
export class ProtectedAgentLoader implements IProtectedAgentLoader {
  private validator: AgentConfigValidator;
  private configCache: Map<string, CachedConfig>;
  private watcher?: FSWatcher;
  private agentDirectory: string;

  constructor(options: LoaderOptions) {
    this.validator = new AgentConfigValidator();
    this.configCache = new Map();
    this.agentDirectory = options.agentDirectory || '/workspaces/agent-feed/.claude/agents';
  }

  async loadAgent(agentName: string): Promise<AgentConfig> {
    // Check cache first
    const cached = this.configCache.get(agentName);
    if (cached && !this.isCacheExpired(cached)) {
      logger.debug(`Cache hit for agent: ${agentName}`);
      return cached.config;
    }

    // Load from file system
    const config = await this.validator.validateAgentConfig(agentName);

    // Cache result
    this.configCache.set(agentName, {
      config,
      timestamp: Date.now(),
      ttl: 60000, // 1 minute cache TTL
    });

    logger.info(`Loaded agent: ${agentName}`, {
      hasProtection: !!config._protected,
      cacheSize: this.configCache.size,
    });

    return config;
  }

  async reloadAgent(agentName: string): Promise<void> {
    this.configCache.delete(agentName);
    await this.loadAgent(agentName);
    logger.info(`Reloaded agent: ${agentName}`);
  }

  watchForChanges(): void {
    this.watcher = fs.watch(this.agentDirectory, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      // Reload on .md agent file changes
      if (filename.endsWith('-agent.md')) {
        const agentName = this.extractAgentName(filename);
        this.reloadAgent(agentName).catch((error) => {
          logger.error(`Failed to reload agent: ${agentName}`, error);
        });
      }

      // Alert on protected config changes
      if (filename.includes('.system/') && filename.endsWith('.protected.yaml')) {
        logger.warn(`Protected config modified: ${filename}`, {
          eventType,
          timestamp: new Date().toISOString(),
        });
        // Trigger tampering detection
        this.handleProtectedConfigChange(filename);
      }
    });

    logger.info('File watcher started', {
      directory: this.agentDirectory,
    });
  }

  clearCache(): void {
    const size = this.configCache.size;
    this.configCache.clear();
    logger.info(`Cleared agent config cache (${size} entries)`);
  }

  private isCacheExpired(cached: CachedConfig): boolean {
    return Date.now() - cached.timestamp > cached.ttl;
  }

  private extractAgentName(filename: string): string {
    return path.basename(filename, '-agent.md');
  }

  private async handleProtectedConfigChange(filename: string): Promise<void> {
    // Delegate to TamperingDetector
    const detector = new TamperingDetector();
    await detector.handleUnauthorizedChange(filename);
  }
}
```

**Design Patterns**:
- **Singleton Pattern**: Single loader instance per application
- **Cache-Aside Pattern**: Cache-first with TTL-based expiration
- **Observer Pattern**: File watcher for change detection

**Performance Characteristics**:
- **Cache Hit**: O(1) - 1-5ms
- **Cache Miss (no sidecar)**: O(1) - 50-100ms (file I/O)
- **Cache Miss (with sidecar)**: O(1) - 100-200ms (two files + integrity check)

---

### 2. AgentConfigValidator

**Responsibility**: Validate and merge agent configs with protected sidecars

**Interface**:
```typescript
interface IAgentConfigValidator {
  /**
   * Validate agent configuration and merge with protected sidecar
   * @param agentName - Agent identifier
   * @returns Promise resolving to merged configuration
   * @throws ValidationError if schema validation fails
   * @throws SecurityError if integrity check fails
   */
  validateAgentConfig(agentName: string): Promise<AgentConfig>;

  /**
   * Validate configuration against schema
   * @param config - Configuration object
   * @param schema - Zod schema
   */
  validateSchema<T>(config: unknown, schema: z.ZodSchema<T>): T;
}
```

**Implementation**:
```typescript
/**
 * AgentConfigValidator - Validates and merges agent configs
 * Location: /workspaces/agent-feed/src/config/validators/agent-config-validator.ts
 */
export class AgentConfigValidator implements IAgentConfigValidator {
  private parser: MarkdownParser;
  private integrityChecker: IntegrityChecker;
  private agentDirectory: string;

  constructor(options?: ValidatorOptions) {
    this.parser = new MarkdownParser();
    this.integrityChecker = new IntegrityChecker();
    this.agentDirectory = options?.agentDirectory || '/workspaces/agent-feed/.claude/agents';
  }

  async validateAgentConfig(agentName: string): Promise<AgentConfig> {
    // 1. Load main agent .md file
    const agentPath = path.join(this.agentDirectory, `${agentName}-agent.md`);
    const agentContent = await fs.promises.readFile(agentPath, 'utf-8');

    // 2. Parse frontmatter and body
    const { data: frontmatter, content: body } = this.parser.parse(agentContent);

    // 3. Validate user-editable fields
    const userConfig = this.validateSchema(frontmatter, AgentConfigSchema);

    // 4. Check for protected sidecar reference
    const protectedSource = frontmatter._protected_config_source;

    if (!protectedSource) {
      // No protection - return plain config (backward compatible)
      logger.debug(`Agent ${agentName} has no protected sidecar`);
      return {
        ...userConfig,
        _body: body,
        _protected: null,
      };
    }

    // 5. Load protected sidecar
    const protectedPath = path.join(this.agentDirectory, protectedSource);
    const protectedContent = await fs.promises.readFile(protectedPath, 'utf-8');
    const protectedConfig = yaml.parse(protectedContent);

    // 6. Verify integrity
    const isValid = await this.integrityChecker.verify(protectedConfig, protectedPath);
    if (!isValid) {
      throw new SecurityError(
        `Protected config integrity check failed for ${agentName}`,
        { agentName, protectedPath }
      );
    }

    // 7. Validate protected config schema
    const validatedProtected = this.validateSchema(protectedConfig, ProtectedConfigSchema);

    // 8. Merge configs (protected takes precedence)
    const merged = this.mergeConfigs(userConfig, validatedProtected);

    logger.info(`Validated agent config: ${agentName}`, {
      hasProtection: true,
      protectedVersion: validatedProtected.version,
    });

    return {
      ...merged,
      _body: body,
      _protected: validatedProtected,
    };
  }

  validateSchema<T>(config: unknown, schema: z.ZodSchema<T>): T {
    const result = schema.safeParse(config);

    if (!result.success) {
      throw new ValidationError('Schema validation failed', {
        errors: result.error.errors,
      });
    }

    return result.data;
  }

  private mergeConfigs(
    userConfig: AgentConfig,
    protectedConfig: ProtectedConfig
  ): AgentConfig {
    // Protected fields override user fields
    return {
      ...userConfig,
      // Protected permissions (cannot be overridden)
      _permissions: protectedConfig.permissions,
      _resource_limits: protectedConfig.permissions?.resource_limits,
      _workspace: protectedConfig.permissions?.workspace,
      _api_access: protectedConfig.permissions?.api_access,
      _tool_permissions: protectedConfig.permissions?.tool_permissions,
    };
  }
}
```

**Validation Strategy**:
- **Schema Validation**: Zod schemas for type safety and runtime validation
- **Integrity Verification**: SHA-256 checksum validation for protected configs
- **Merge Strategy**: Protected fields always take precedence over user fields

---

### 3. IntegrityChecker

**Responsibility**: Verify protected config integrity using SHA-256 checksums

**Interface**:
```typescript
interface IIntegrityChecker {
  /**
   * Verify protected config integrity
   * @param config - Protected configuration object
   * @param filePath - Path to protected config file
   * @returns Promise resolving to true if valid, false otherwise
   */
  verify(config: ProtectedConfig, filePath: string): Promise<boolean>;

  /**
   * Compute SHA-256 hash of configuration
   * @param config - Configuration object
   * @returns Hex-encoded SHA-256 hash
   */
  computeHash(config: ProtectedConfig): string;

  /**
   * Update checksum in protected config
   * @param config - Configuration object
   * @returns Updated configuration with new checksum
   */
  updateChecksum(config: ProtectedConfig): ProtectedConfig;
}
```

**Implementation**:
```typescript
/**
 * IntegrityChecker - SHA-256 integrity verification
 * Location: /workspaces/agent-feed/src/config/validators/integrity-checker.ts
 */
export class IntegrityChecker implements IIntegrityChecker {
  async verify(config: ProtectedConfig, filePath: string): Promise<boolean> {
    try {
      // Extract stored checksum
      const storedChecksum = config.checksum?.replace('sha256:', '');

      if (!storedChecksum) {
        logger.warn(`No checksum found in protected config: ${filePath}`);
        return false;
      }

      // Compute current checksum (exclude checksum field itself)
      const configWithoutChecksum = { ...config };
      delete configWithoutChecksum.checksum;

      const computedChecksum = this.computeHash(configWithoutChecksum);

      // Compare
      const isValid = storedChecksum === computedChecksum;

      if (!isValid) {
        logger.error('Integrity check failed', {
          filePath,
          stored: storedChecksum.substring(0, 16) + '...',
          computed: computedChecksum.substring(0, 16) + '...',
        });
      }

      return isValid;

    } catch (error) {
      logger.error('Integrity check error', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  computeHash(config: ProtectedConfig | any): string {
    // Normalize config to stable JSON (sorted keys)
    const normalized = this.normalizeConfig(config);

    // Compute SHA-256
    const hash = crypto.createHash('sha256');
    hash.update(normalized);

    return hash.digest('hex');
  }

  updateChecksum(config: ProtectedConfig): ProtectedConfig {
    const configWithoutChecksum = { ...config };
    delete configWithoutChecksum.checksum;

    const checksum = this.computeHash(configWithoutChecksum);

    return {
      ...config,
      checksum: `sha256:${checksum}`,
    };
  }

  private normalizeConfig(config: any): string {
    // Sort keys recursively for deterministic hashing
    const sortedConfig = this.sortObjectKeys(config);
    return JSON.stringify(sortedConfig);
  }

  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }

    const sorted: any = {};
    Object.keys(obj)
      .sort()
      .forEach(key => {
        sorted[key] = this.sortObjectKeys(obj[key]);
      });

    return sorted;
  }
}
```

**Security Considerations**:
- **SHA-256**: Industry-standard cryptographic hash (collision-resistant)
- **Deterministic Hashing**: Sorted keys ensure consistent hash values
- **Checksum Exclusion**: Checksum field excluded from hash computation
- **Performance**: Fast computation (~1ms for typical configs)

---

### 4. ProtectedConfigManager

**Responsibility**: Manage protected config updates (admin only)

**Interface**:
```typescript
interface IProtectedConfigManager {
  /**
   * Update protected configuration (admin only)
   * @param agentName - Agent identifier
   * @param updates - Partial updates to apply
   * @returns Promise resolving to updated configuration
   * @throws SecurityError if caller lacks privileges
   */
  updateProtectedConfig(
    agentName: string,
    updates: Partial<ProtectedConfig>
  ): Promise<ProtectedConfig>;

  /**
   * Rollback to previous version
   * @param agentName - Agent identifier
   * @param version - Version to restore (default: latest backup)
   */
  rollbackProtectedConfig(agentName: string, version?: string): Promise<void>;

  /**
   * Get update history
   * @param agentName - Agent identifier
   * @returns Array of historical versions
   */
  getUpdateHistory(agentName: string): Promise<ConfigVersion[]>;
}
```

**Implementation**:
```typescript
/**
 * ProtectedConfigManager - Manages protected config updates
 * Location: /workspaces/agent-feed/src/config/managers/protected-config-manager.ts
 */
export class ProtectedConfigManager implements IProtectedConfigManager {
  private integrityChecker: IntegrityChecker;
  private agentLoader: ProtectedAgentLoader;
  private backupDirectory: string;

  constructor(options?: ManagerOptions) {
    this.integrityChecker = new IntegrityChecker();
    this.agentLoader = new ProtectedAgentLoader();
    this.backupDirectory = options?.backupDirectory || '/workspaces/agent-feed/prod/backups/protected-configs';
  }

  async updateProtectedConfig(
    agentName: string,
    updates: Partial<ProtectedConfig>
  ): Promise<ProtectedConfig> {
    // 1. Verify system privileges
    if (!this.hasSystemPrivileges()) {
      throw new SecurityError('Unauthorized: System privileges required');
    }

    // 2. Load current protected config
    const currentPath = this.getProtectedConfigPath(agentName);
    const currentContent = await fs.promises.readFile(currentPath, 'utf-8');
    const current = yaml.parse(currentContent) as ProtectedConfig;

    // 3. Backup before modification
    await this.backupProtectedConfig(agentName, current);

    // 4. Apply updates
    const updated: ProtectedConfig = {
      ...current,
      ...updates,
      version: this.incrementVersion(current.version),
      _metadata: {
        updated_at: new Date().toISOString(),
        updated_by: 'system',
        previous_version: current.version,
      },
    };

    // 5. Compute new integrity checksum
    const withChecksum = this.integrityChecker.updateChecksum(updated);

    // 6. Write atomically (temp file + rename)
    await this.writeProtectedConfig(agentName, withChecksum);

    // 7. Reload agent config
    await this.agentLoader.reloadAgent(agentName);

    logger.info(`Updated protected config: ${agentName}`, {
      version: withChecksum.version,
      previousVersion: current.version,
    });

    return withChecksum;
  }

  async rollbackProtectedConfig(agentName: string, version?: string): Promise<void> {
    // 1. Find backup to restore
    const backup = version
      ? await this.findBackupByVersion(agentName, version)
      : await this.getLatestBackup(agentName);

    if (!backup) {
      throw new Error(`No backup found for ${agentName}${version ? ` version ${version}` : ''}`);
    }

    // 2. Restore from backup
    const backupContent = await fs.promises.readFile(backup.path, 'utf-8');
    const config = yaml.parse(backupContent) as ProtectedConfig;

    // 3. Write restored config
    await this.writeProtectedConfig(agentName, config);

    // 4. Reload agent
    await this.agentLoader.reloadAgent(agentName);

    logger.info(`Rolled back protected config: ${agentName}`, {
      version: config.version,
      backupPath: backup.path,
    });
  }

  async getUpdateHistory(agentName: string): Promise<ConfigVersion[]> {
    const backupDir = path.join(this.backupDirectory, agentName);

    const files = await fs.promises.readdir(backupDir);
    const versions: ConfigVersion[] = [];

    for (const file of files) {
      if (!file.endsWith('.protected.yaml')) continue;

      const filePath = path.join(backupDir, file);
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const config = yaml.parse(content) as ProtectedConfig;

      versions.push({
        version: config.version,
        timestamp: config._metadata?.updated_at || '',
        path: filePath,
      });
    }

    return versions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  private hasSystemPrivileges(): boolean {
    // TODO: Implement actual privilege check
    // For now, check environment variable or admin token
    return process.env.SYSTEM_ADMIN === 'true' || !!process.env.ADMIN_TOKEN;
  }

  private async backupProtectedConfig(
    agentName: string,
    config: ProtectedConfig
  ): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      this.backupDirectory,
      agentName,
      `${timestamp}_v${config.version}.protected.yaml`
    );

    await fs.promises.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.promises.writeFile(backupPath, yaml.stringify(config));

    logger.info(`Backed up protected config: ${agentName}`, {
      version: config.version,
      backupPath,
    });
  }

  private async writeProtectedConfig(
    agentName: string,
    config: ProtectedConfig
  ): Promise<void> {
    const configPath = this.getProtectedConfigPath(agentName);
    const tempPath = `${configPath}.tmp`;

    // Write to temp file
    await fs.promises.writeFile(tempPath, yaml.stringify(config));

    // Atomic rename
    await fs.promises.rename(tempPath, configPath);

    // Set read-only permissions
    await fs.promises.chmod(configPath, 0o444);

    logger.debug(`Wrote protected config: ${configPath}`, {
      version: config.version,
    });
  }

  private getProtectedConfigPath(agentName: string): string {
    return `/workspaces/agent-feed/.claude/agents/.system/${agentName}.protected.yaml`;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0', 10) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private async getLatestBackup(agentName: string): Promise<{ path: string; version: string } | null> {
    const history = await this.getUpdateHistory(agentName);
    return history.length > 0 ? { path: history[0].path, version: history[0].version } : null;
  }

  private async findBackupByVersion(
    agentName: string,
    version: string
  ): Promise<{ path: string; version: string } | null> {
    const history = await this.getUpdateHistory(agentName);
    const backup = history.find(h => h.version === version);
    return backup ? { path: backup.path, version: backup.version } : null;
  }
}
```

**Admin Operations**:
- **Update**: Backup → Apply → Checksum → Write → Reload
- **Rollback**: Find Backup → Restore → Reload
- **History**: List all backups with versions

---

### 5. TamperingDetector

**Responsibility**: Detect and respond to unauthorized config modifications

**Interface**:
```typescript
interface ITamperingDetector {
  /**
   * Start monitoring for tampering
   */
  startMonitoring(): void;

  /**
   * Stop monitoring
   */
  stopMonitoring(): void;

  /**
   * Handle unauthorized change event
   * @param filePath - Path to modified file
   */
  handleUnauthorizedChange(filePath: string): Promise<void>;
}
```

**Implementation**:
```typescript
/**
 * TamperingDetector - Detects unauthorized config modifications
 * Location: /workspaces/agent-feed/src/config/managers/tampering-detector.ts
 */
export class TamperingDetector implements ITamperingDetector {
  private watcher?: FSWatcher;
  private integrityChecker: IntegrityChecker;
  private configManager: ProtectedConfigManager;
  private systemDirectory: string;

  constructor(options?: DetectorOptions) {
    this.integrityChecker = new IntegrityChecker();
    this.configManager = new ProtectedConfigManager();
    this.systemDirectory = options?.systemDirectory || '/workspaces/agent-feed/.claude/agents/.system';
  }

  startMonitoring(): void {
    this.watcher = fs.watch(this.systemDirectory, { recursive: false }, (eventType, filename) => {
      if (!filename || !filename.endsWith('.protected.yaml')) return;

      logger.warn('Protected config change detected', {
        eventType,
        filename,
        timestamp: new Date().toISOString(),
      });

      // Handle potentially unauthorized change
      const filePath = path.join(this.systemDirectory, filename);
      this.handleUnauthorizedChange(filePath).catch((error) => {
        logger.error('Failed to handle tampering event', {
          filename,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    });

    logger.info('Tampering detection started', {
      directory: this.systemDirectory,
    });
  }

  stopMonitoring(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
      logger.info('Tampering detection stopped');
    }
  }

  async handleUnauthorizedChange(filePath: string): Promise<void> {
    try {
      // 1. Load modified config
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const config = yaml.parse(content) as ProtectedConfig;

      // 2. Verify integrity
      const isValid = await this.integrityChecker.verify(config, filePath);

      if (isValid) {
        logger.info('Protected config change authorized (integrity valid)', {
          filePath,
          version: config.version,
        });
        return;
      }

      // 3. TAMPERING DETECTED
      logger.error('SECURITY ALERT: Protected config tampering detected', {
        filePath,
        timestamp: new Date().toISOString(),
      });

      // 4. Alert system admin
      await this.alertAdmin({
        type: 'TAMPERING_DETECTED',
        filePath,
        timestamp: new Date().toISOString(),
      });

      // 5. Restore from backup
      const agentName = this.extractAgentName(filePath);
      await this.configManager.rollbackProtectedConfig(agentName);

      logger.info('Protected config restored from backup', {
        agentName,
        filePath,
      });

    } catch (error) {
      logger.error('Failed to handle unauthorized change', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async alertAdmin(alert: SecurityAlert): Promise<void> {
    // TODO: Implement admin notification (email, Slack, PagerDuty, etc.)
    logger.error('🚨 SECURITY ALERT', alert);

    // Write to security log
    const logPath = '/workspaces/agent-feed/logs/security.log';
    await fs.promises.appendFile(
      logPath,
      JSON.stringify({
        ...alert,
        timestamp: new Date().toISOString(),
      }) + '\n'
    );
  }

  private extractAgentName(filePath: string): string {
    const filename = path.basename(filePath, '.protected.yaml');
    return filename;
  }
}
```

**Tampering Response**:
1. **Detect**: File watcher triggers on protected config changes
2. **Verify**: Check integrity with SHA-256
3. **Alert**: Log security alert, notify admin
4. **Restore**: Rollback to last known good backup
5. **Continue**: Resume normal operations

---

### 6. AgentConfigMigrator

**Responsibility**: Migrate agents to protected model

**Interface**:
```typescript
interface IAgentConfigMigrator {
  /**
   * Add protection to specific agent (incremental)
   * @param agentName - Agent identifier
   * @param protectedConfig - Protected configuration to add
   */
  addProtectionToAgent(
    agentName: string,
    protectedConfig: ProtectedConfig
  ): Promise<void>;

  /**
   * Migrate all agents (bulk operation)
   */
  migrateAllAgents(): Promise<MigrationResult>;

  /**
   * Generate protected config from agent frontmatter
   * @param agentName - Agent identifier
   * @returns Extracted protected configuration
   */
  generateProtectedConfig(agentName: string): Promise<ProtectedConfig>;
}
```

**Implementation**:
```typescript
/**
 * AgentConfigMigrator - Migrates agents to protected model
 * Location: /workspaces/agent-feed/src/config/migrators/agent-config-migrator.ts
 */
export class AgentConfigMigrator implements IAgentConfigMigrator {
  private integrityChecker: IntegrityChecker;
  private agentDirectory: string;

  constructor(options?: MigratorOptions) {
    this.integrityChecker = new IntegrityChecker();
    this.agentDirectory = options?.agentDirectory || '/workspaces/agent-feed/.claude/agents';
  }

  async addProtectionToAgent(
    agentName: string,
    protectedConfig: ProtectedConfig
  ): Promise<void> {
    logger.info(`Adding protection to agent: ${agentName}`);

    // 1. Backup existing agent file
    await this.backupAgentFile(agentName);

    // 2. Create .system directory if needed
    const systemDir = path.join(this.agentDirectory, '.system');
    await fs.promises.mkdir(systemDir, { recursive: true });
    await fs.promises.chmod(systemDir, 0o555); // Read-only

    // 3. Compute integrity checksum
    const withChecksum = this.integrityChecker.updateChecksum(protectedConfig);

    // 4. Write protected sidecar
    const sidecarPath = path.join(systemDir, `${agentName}.protected.yaml`);
    await fs.promises.writeFile(sidecarPath, yaml.stringify(withChecksum));
    await fs.promises.chmod(sidecarPath, 0o444); // Read-only

    // 5. Update agent .md file to reference sidecar
    await this.addSidecarReference(agentName);

    logger.info(`Protection added to agent: ${agentName}`, {
      sidecarPath,
      version: withChecksum.version,
    });
  }

  async migrateAllAgents(): Promise<MigrationResult> {
    const result: MigrationResult = {
      total: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    // Discover all agents
    const agents = await this.discoverAgents();
    result.total = agents.length;

    for (const agentFile of agents) {
      const agentName = this.extractAgentName(agentFile);

      try {
        // Load agent frontmatter
        const frontmatter = await this.loadAgentFrontmatter(agentFile);

        // Check if agent already has protection
        if (frontmatter._protected_config_source) {
          logger.info(`Agent already protected: ${agentName}`);
          result.skipped++;
          continue;
        }

        // Generate protected config
        const protectedConfig = await this.generateProtectedConfig(agentName);

        // Check if agent has protected fields
        if (Object.keys(protectedConfig.permissions || {}).length === 0) {
          logger.info(`Agent has no protected fields: ${agentName}`);
          result.skipped++;
          continue;
        }

        // Add protection
        await this.addProtectionToAgent(agentName, protectedConfig);
        result.migrated++;

      } catch (error) {
        result.failed++;
        result.errors.push({
          agentName,
          error: error instanceof Error ? error.message : String(error),
        });
        logger.error(`Migration failed for agent: ${agentName}`, error);
      }
    }

    logger.info('Migration complete', result);
    return result;
  }

  async generateProtectedConfig(agentName: string): Promise<ProtectedConfig> {
    const agentPath = path.join(this.agentDirectory, `${agentName}-agent.md`);
    const content = await fs.promises.readFile(agentPath, 'utf-8');
    const { data: frontmatter } = matter(content);

    // Extract protected fields
    const protectedFieldNames = [
      'api_endpoints', 'api_methods', 'api_rate_limits',
      'system_boundaries', 'security_policies', 'tool_permissions',
      'resource_limits', 'posting_rules', 'workspace_path',
      'forbidden_operations'
    ];

    const permissions: any = {};

    for (const fieldName of protectedFieldNames) {
      if (frontmatter[fieldName]) {
        permissions[fieldName] = frontmatter[fieldName];
      }
    }

    // Build protected config
    const protectedConfig: ProtectedConfig = {
      version: '1.0.0',
      agent_id: agentName,
      checksum: '', // Will be computed by IntegrityChecker
      permissions,
    };

    return protectedConfig;
  }

  private async backupAgentFile(agentName: string): Promise<void> {
    const agentPath = path.join(this.agentDirectory, `${agentName}-agent.md`);
    const backupDir = '/workspaces/agent-feed/prod/backups/pre-protection';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${agentName}-agent_${timestamp}.md`);

    await fs.promises.mkdir(backupDir, { recursive: true });
    await fs.promises.copyFile(agentPath, backupPath);

    logger.info(`Backed up agent file: ${agentName}`, { backupPath });
  }

  private async addSidecarReference(agentName: string): Promise<void> {
    const agentPath = path.join(this.agentDirectory, `${agentName}-agent.md`);
    const content = await fs.promises.readFile(agentPath, 'utf-8');
    const { data, content: body } = matter(content);

    // Add sidecar reference
    data._protected_config_source = `.system/${agentName}.protected.yaml`;

    // Write updated agent file
    const updated = matter.stringify(body, data);
    await fs.promises.writeFile(agentPath, updated);

    logger.debug(`Added sidecar reference to agent: ${agentName}`);
  }

  private async discoverAgents(): Promise<string[]> {
    const files = await fs.promises.readdir(this.agentDirectory);
    return files.filter(f => f.endsWith('-agent.md'));
  }

  private async loadAgentFrontmatter(agentFile: string): Promise<any> {
    const agentPath = path.join(this.agentDirectory, agentFile);
    const content = await fs.promises.readFile(agentPath, 'utf-8');
    const { data } = matter(content);
    return data;
  }

  private extractAgentName(agentFile: string): string {
    return path.basename(agentFile, '-agent.md');
  }
}
```

**Migration Strategies**:
- **Incremental**: Add protection to one agent at a time (recommended)
- **Bulk**: Migrate all agents in batch (use with caution)
- **Rollback**: Backups enable safe rollback

---

## Data Architecture

### Schema Definitions

#### AgentConfig Schema

```typescript
/**
 * Agent configuration schema (user-editable fields)
 * Location: /workspaces/agent-feed/src/config/schemas/agent-config.schema.ts
 */
import { z } from 'zod';

export const AgentConfigSchema = z.object({
  // Required fields
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  tools: z.array(z.string()),
  model: z.enum(['sonnet', 'opus', 'haiku']),

  // Optional user-editable fields
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  proactive: z.boolean().optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),

  // Personality customization
  personality: z.object({
    tone: z.string().optional(),
    style: z.string().optional(),
    emoji_usage: z.enum(['none', 'minimal', 'moderate', 'frequent']).optional(),
  }).optional(),

  // Specialization
  specialization: z.array(z.string()).optional(),

  // Custom instructions
  custom_instructions: z.string().optional(),

  // Autonomous mode
  autonomous_mode: z.enum(['supervised', 'collaborative', 'autonomous']).optional(),

  // Priority preferences
  priority_preferences: z.object({
    focus: z.string().optional(),
    timeframe: z.string().optional(),
  }).optional(),

  // Internal fields (system-managed)
  _protected_config_source: z.string().optional(),
  _body: z.string().optional(),
  _protected: z.any().optional(),
  _permissions: z.any().optional(),
  _resource_limits: z.any().optional(),
  _workspace: z.any().optional(),
  _api_access: z.any().optional(),
  _tool_permissions: z.any().optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
```

#### ProtectedConfig Schema

```typescript
/**
 * Protected configuration schema (system-controlled)
 * Location: /workspaces/agent-feed/src/config/schemas/protected-config.schema.ts
 */
import { z } from 'zod';

export const ProtectedConfigSchema = z.object({
  // Version control
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  agent_id: z.string(),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),

  // Metadata
  _metadata: z.object({
    updated_at: z.string().optional(),
    updated_by: z.string().optional(),
    previous_version: z.string().optional(),
  }).optional(),

  // Protected permissions
  permissions: z.object({
    // API access rules
    api_access: z.object({
      base_url: z.string().url().optional(),
      endpoints: z.array(z.object({
        path: z.string(),
        methods: z.array(z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])),
        rate_limit: z.string().optional(),
      })).optional(),
      authentication: z.object({
        type: z.enum(['none', 'internal', 'bearer', 'oauth']),
        required: z.boolean(),
      }).optional(),
    }).optional(),

    // Tool permissions
    tool_permissions: z.object({
      allowed: z.array(z.string()),
      forbidden: z.array(z.string()).optional(),
    }).optional(),

    // Workspace restrictions
    workspace: z.object({
      root: z.string(),
      subdirectory: z.string().optional(),
      max_storage: z.string().optional(),
      allowed_paths: z.array(z.string()).optional(),
      forbidden_paths: z.array(z.string()).optional(),
    }).optional(),

    // Resource limits
    resource_limits: z.object({
      max_memory: z.string().optional(),
      max_cpu_percent: z.number().min(0).max(100).optional(),
      max_execution_time: z.string().optional(),
      max_concurrent_tasks: z.number().min(1).max(100).optional(),
    }).optional(),

    // Posting rules
    posting_rules: z.object({
      auto_post_outcomes: z.boolean().optional(),
      post_threshold: z.enum(['never', 'completed_task', 'significant_outcome', 'always']).optional(),
      default_post_type: z.enum(['reply', 'new_post', 'auto']).optional(),
    }).optional(),

    // Security policies
    security: z.object({
      sandbox_enabled: z.boolean().optional(),
      network_access: z.enum(['none', 'api_only', 'restricted', 'full']).optional(),
      file_operations: z.enum(['none', 'workspace_only', 'restricted', 'full']).optional(),
    }).optional(),
  }),
});

export type ProtectedConfig = z.infer<typeof ProtectedConfigSchema>;
```

### File Structure

```
/workspaces/agent-feed/
├── .claude/
│   └── agents/
│       ├── strategic-planner-agent.md     # Main agent (standard format)
│       ├── meta-agent.md                  # Main agent (standard format)
│       └── .system/                       # Protected configs directory
│           ├── strategic-planner.protected.yaml
│           └── meta-agent.protected.yaml
│
├── src/
│   └── config/
│       ├── schemas/
│       │   ├── agent-config.schema.ts
│       │   └── protected-config.schema.ts
│       │
│       ├── validators/
│       │   ├── agent-config-validator.ts
│       │   └── integrity-checker.ts
│       │
│       ├── loaders/
│       │   ├── protected-agent-loader.ts
│       │   └── markdown-parser.ts
│       │
│       ├── managers/
│       │   ├── protected-config-manager.ts
│       │   └── tampering-detector.ts
│       │
│       └── migrators/
│           └── agent-config-migrator.ts
│
└── prod/
    └── backups/
        ├── pre-protection/              # Pre-migration agent backups
        │   └── strategic-planner-agent_2025-10-17.md
        │
        └── protected-configs/           # Protected config history
            └── strategic-planner/
                ├── 2025-10-17_v1.0.0.protected.yaml
                └── 2025-10-17_v1.0.1.protected.yaml
```

### Database Schema (Audit Logging)

```sql
-- Protected config audit log
CREATE TABLE protected_config_audit_log (
  id BIGSERIAL PRIMARY KEY,
  agent_name VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'UPDATE', 'ROLLBACK', 'VERIFY_FAILED', 'RESTORED'
  version VARCHAR(20) NOT NULL,
  previous_version VARCHAR(20),
  updated_by VARCHAR(100),
  changes JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_agent_name (agent_name),
  INDEX idx_timestamp (timestamp),
  INDEX idx_action (action)
);

-- Tampering detection log
CREATE TABLE tampering_detection_log (
  id BIGSERIAL PRIMARY KEY,
  file_path VARCHAR(500) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'TAMPERING_DETECTED', 'INTEGRITY_FAILED', 'RESTORED'
  expected_checksum VARCHAR(100),
  actual_checksum VARCHAR(100),
  restored BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_file_path (file_path),
  INDEX idx_timestamp (timestamp),
  INDEX idx_event_type (event_type)
);
```

---

## Security Architecture

### Defense-in-Depth Strategy

```
Layer 1: File System Permissions
├─→ .system/ directory: 555 (read-only, executable)
├─→ *.protected.yaml files: 444 (read-only)
└─→ Owner: root or system user

Layer 2: Runtime Integrity Verification
├─→ SHA-256 checksum validation on every load
├─→ Fail-fast on integrity check failures
└─→ Security exception thrown (not silent failure)

Layer 3: Tampering Detection
├─→ File watcher on .system/ directory
├─→ Real-time detection of unauthorized changes
├─→ Automatic restoration from backup
└─→ Admin alerts via logging/notification

Layer 4: Access Control
├─→ Admin-only API for protected config updates
├─→ System privilege verification
└─→ Audit logging for all changes

Layer 5: Backup & Rollback
├─→ Automatic backups before updates
├─→ Version history tracking
└─→ One-command rollback capability
```

### Threat Model

| Threat | Mitigation | Residual Risk |
|--------|------------|---------------|
| **User modifies protected config** | File permissions (444) prevent writes | LOW - User could escalate privileges |
| **Agent code modifies protected config** | Worker runs as non-root user, file permissions block writes | LOW - Privilege escalation required |
| **Checksum tampering** | Checksum stored in same file; file is read-only | LOW - Would require root access |
| **Backup corruption** | Multiple backup versions; timestamp-based | MEDIUM - All backups could be corrupted |
| **File watcher bypass** | Integrity check on load catches tampering | LOW - Detection on next load |
| **Admin credential compromise** | Audit logging tracks all changes; requires SYSTEM_ADMIN env var | MEDIUM - Depends on credential security |

### Security Best Practices

1. **Principle of Least Privilege**: Workers run as non-root users
2. **Immutability**: Protected configs are read-only (444)
3. **Verification**: Integrity check on every load (fail-fast)
4. **Audit Trail**: All changes logged with timestamp and user
5. **Defense-in-Depth**: Multiple layers of protection
6. **Fail-Safe**: System prefers safe failure over insecure operation

---

## Integration Points

### WorkerSpawnerAdapter Integration

```typescript
/**
 * WorkerSpawnerAdapter integration with ProtectedAgentLoader
 * Location: /workspaces/agent-feed/src/adapters/worker-spawner.adapter.ts
 */
export class WorkerSpawnerAdapter implements IWorkerSpawner {
  private agentLoader: ProtectedAgentLoader;

  constructor(db: DatabaseManager) {
    this.db = db;
    this.agentLoader = new ProtectedAgentLoader();

    // Start file watchers
    this.agentLoader.watchForChanges();
  }

  async spawnWorker(ticket: PendingTicket, workerId?: string): Promise<WorkerInfo> {
    // Load agent config with protection
    const agentConfig = await this.agentLoader.loadAgent(ticket.agentName);

    // Create worker with protected config
    const worker = this.claudeCodeEnabled
      ? new ClaudeCodeWorker(this.db, agentConfig)
      : new UnifiedAgentWorker(this.db, agentConfig);

    // Execute ticket with enforced permissions
    const result = await worker.executeTicket(ticket);

    return workerInfo;
  }
}
```

### ClaudeCodeWorker Integration

```typescript
/**
 * ClaudeCodeWorker integration with protected agent config
 * Location: /workspaces/agent-feed/src/worker/claude-code-worker.ts
 */
export class ClaudeCodeWorker {
  private agentConfig: AgentConfig;

  constructor(db: DatabaseManager, agentConfig: AgentConfig) {
    this.db = db;
    this.agentConfig = agentConfig;

    // Enforce protected permissions
    this.enforcePermissions();
  }

  async executeTicket(ticket: WorkTicket): Promise<WorkerResult> {
    // Extract protected permissions
    const permissions = this.agentConfig._permissions;

    // Build prompt with workspace restrictions
    const prompt = this.buildPrompt(ticket, {
      workspace: permissions?.workspace?.root,
      allowedTools: permissions?.tool_permissions?.allowed,
      forbiddenTools: permissions?.tool_permissions?.forbidden,
    });

    // Call Claude Code SDK with restrictions
    const response = await this.callClaudeCodeSDK(prompt, ticket, permissions);

    return result;
  }

  private enforcePermissions(): void {
    const permissions = this.agentConfig._permissions;

    if (!permissions) {
      logger.warn('No protected permissions found for agent', {
        agentName: this.agentConfig.name,
      });
      return;
    }

    // Log enforced permissions
    logger.info('Enforcing protected permissions', {
      agentName: this.agentConfig.name,
      workspace: permissions.workspace?.root,
      allowedTools: permissions.tool_permissions?.allowed,
      apiAccess: permissions.api_access?.base_url,
    });
  }
}
```

### API Endpoints

```typescript
/**
 * Protected config management API
 * Location: /workspaces/agent-feed/api-server/routes/protected-config.routes.ts
 */
import express from 'express';
import { ProtectedConfigManager } from '../../../src/config/managers/protected-config-manager';

const router = express.Router();
const configManager = new ProtectedConfigManager();

// Middleware: Verify system admin privileges
const requireSystemAdmin = (req, res, next) => {
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Forbidden: System admin privileges required' });
  }
  next();
};

// Update protected config
router.post('/api/system/agents/:agentName/protected-config', requireSystemAdmin, async (req, res) => {
  try {
    const { agentName } = req.params;
    const updates = req.body;

    const updated = await configManager.updateProtectedConfig(agentName, updates);

    res.json({
      success: true,
      version: updated.version,
      timestamp: updated._metadata?.updated_at,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Rollback protected config
router.post('/api/system/agents/:agentName/rollback', requireSystemAdmin, async (req, res) => {
  try {
    const { agentName } = req.params;
    const { version } = req.body;

    await configManager.rollbackProtectedConfig(agentName, version);

    res.json({
      success: true,
      message: `Rolled back ${agentName} to version ${version || 'latest'}`,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get update history
router.get('/api/system/agents/:agentName/history', requireSystemAdmin, async (req, res) => {
  try {
    const { agentName } = req.params;

    const history = await configManager.getUpdateHistory(agentName);

    res.json({
      success: true,
      history,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
```

---

## Error Handling Strategy

### Error Hierarchy

```typescript
/**
 * Error hierarchy for protected agent config system
 * Location: /workspaces/agent-feed/src/config/errors.ts
 */

export class ProtectedConfigError extends Error {
  constructor(message: string, public context?: any) {
    super(message);
    this.name = 'ProtectedConfigError';
  }
}

export class SecurityError extends ProtectedConfigError {
  constructor(message: string, context?: any) {
    super(message, context);
    this.name = 'SecurityError';
  }
}

export class ValidationError extends ProtectedConfigError {
  constructor(message: string, public errors?: any[]) {
    super(message, { errors });
    this.name = 'ValidationError';
  }
}

export class IntegrityError extends SecurityError {
  constructor(
    message: string,
    public expectedChecksum: string,
    public actualChecksum: string
  ) {
    super(message, { expectedChecksum, actualChecksum });
    this.name = 'IntegrityError';
  }
}

export class AgentNotFoundError extends ProtectedConfigError {
  constructor(agentName: string) {
    super(`Agent not found: ${agentName}`, { agentName });
    this.name = 'AgentNotFoundError';
  }
}

export class UnauthorizedError extends SecurityError {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
```

### Error Handling Patterns

#### 1. Fail-Fast on Security Errors

```typescript
// CORRECT: Fail immediately on integrity check failure
async loadAgent(agentName: string): Promise<AgentConfig> {
  const config = await this.validator.validateAgentConfig(agentName);

  if (!this.integrityChecker.verify(config._protected)) {
    throw new IntegrityError(
      `Integrity check failed for ${agentName}`,
      config._protected.checksum,
      this.integrityChecker.computeHash(config._protected)
    );
  }

  return config;
}

// INCORRECT: Silent failure on integrity check
async loadAgent(agentName: string): Promise<AgentConfig> {
  try {
    const config = await this.validator.validateAgentConfig(agentName);
    if (!this.integrityChecker.verify(config._protected)) {
      logger.warn('Integrity check failed'); // ❌ Don't ignore!
    }
    return config;
  } catch (error) {
    return null; // ❌ Don't swallow errors!
  }
}
```

#### 2. Graceful Degradation for Non-Critical Errors

```typescript
// Cache failures: Log and continue (cache is optimization, not critical)
async loadAgent(agentName: string): Promise<AgentConfig> {
  try {
    const cached = this.configCache.get(agentName);
    if (cached) return cached.config;
  } catch (cacheError) {
    logger.warn('Cache read failed, loading from file', { agentName, cacheError });
  }

  const config = await this.validator.validateAgentConfig(agentName);

  try {
    this.configCache.set(agentName, { config, timestamp: Date.now() });
  } catch (cacheError) {
    logger.warn('Cache write failed, continuing', { agentName, cacheError });
  }

  return config;
}
```

#### 3. Retry with Exponential Backoff

```typescript
// File I/O failures: Retry with backoff
async loadProtectedConfig(path: string, retries = 3): Promise<ProtectedConfig> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const content = await fs.promises.readFile(path, 'utf-8');
      return yaml.parse(content);
    } catch (error) {
      lastError = error as Error;

      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 100; // 100ms, 200ms, 400ms
        logger.warn(`File read failed, retrying in ${delay}ms`, { path, attempt });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new ProtectedConfigError(
    `Failed to load protected config after ${retries} attempts: ${path}`,
    { lastError }
  );
}
```

### Error Response Formats

```typescript
// API error responses
interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}

// Example error responses
{
  "error": "Protected config integrity check failed",
  "code": "INTEGRITY_ERROR",
  "details": {
    "agentName": "strategic-planner",
    "expectedChecksum": "abc123...",
    "actualChecksum": "def456..."
  },
  "timestamp": "2025-10-17T10:30:00.000Z"
}

{
  "error": "Unauthorized: System privileges required",
  "code": "UNAUTHORIZED",
  "timestamp": "2025-10-17T10:30:00.000Z"
}
```

---

## Logging Strategy

### Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| **ERROR** | System failures, security violations | Integrity check failed, tampering detected, unauthorized access |
| **WARN** | Potential issues, degraded performance | Cache miss, backup old, missing checksum |
| **INFO** | Normal operations, state changes | Agent loaded, config updated, migration complete |
| **DEBUG** | Detailed diagnostics | Cache hit, file read, merge operation |

### Structured Logging Format

```typescript
/**
 * Structured logging with Winston
 * Location: /workspaces/agent-feed/src/utils/logger.ts
 */
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'protected-agent-config',
  },
  transports: [
    // Console output (development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // File output (production)
    new winston.transports.File({
      filename: 'logs/protected-config-error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/protected-config.log',
    }),

    // Security audit log
    new winston.transports.File({
      filename: 'logs/security.log',
      level: 'warn',
    }),
  ],
});

export default logger;
```

### Log Examples

```typescript
// Agent loading
logger.info('Loaded agent configuration', {
  agentName: 'strategic-planner',
  hasProtection: true,
  protectedVersion: '1.0.0',
  cacheHit: false,
  loadTime: 150,
});

// Protected config update
logger.info('Updated protected configuration', {
  agentName: 'strategic-planner',
  version: '1.0.1',
  previousVersion: '1.0.0',
  updatedBy: 'admin',
  timestamp: '2025-10-17T10:30:00.000Z',
  changes: {
    'permissions.api_access.endpoints': 'added /api/analytics',
  },
});

// Integrity check failure (SECURITY)
logger.error('Protected config integrity check failed', {
  agentName: 'strategic-planner',
  filePath: '.system/strategic-planner.protected.yaml',
  expectedChecksum: 'abc123...',
  actualChecksum: 'def456...',
  action: 'FAILED_LOAD',
  timestamp: '2025-10-17T10:30:00.000Z',
});

// Tampering detection (SECURITY)
logger.error('SECURITY ALERT: Tampering detected', {
  eventType: 'TAMPERING_DETECTED',
  filePath: '.system/strategic-planner.protected.yaml',
  action: 'RESTORED_FROM_BACKUP',
  backupVersion: '1.0.0',
  timestamp: '2025-10-17T10:30:00.000Z',
});

// Migration
logger.info('Agent migration completed', {
  total: 15,
  migrated: 8,
  skipped: 5,
  failed: 2,
  duration: 3200,
  errors: [
    { agentName: 'broken-agent', error: 'Invalid frontmatter' },
    { agentName: 'old-agent', error: 'File not found' },
  ],
});
```

### Audit Logging

```typescript
/**
 * Audit logger for protected config changes
 * Location: /workspaces/agent-feed/src/config/audit-logger.ts
 */
export class ProtectedConfigAuditLogger {
  private db: DatabaseManager;

  async logUpdate(
    agentName: string,
    version: string,
    previousVersion: string,
    updatedBy: string,
    changes: any
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO protected_config_audit_log
       (agent_name, action, version, previous_version, updated_by, changes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [agentName, 'UPDATE', version, previousVersion, updatedBy, JSON.stringify(changes)]
    );

    logger.info('Logged protected config update to audit trail', {
      agentName,
      version,
      previousVersion,
    });
  }

  async logTamperingDetection(
    filePath: string,
    expectedChecksum: string,
    actualChecksum: string,
    restored: boolean
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO tampering_detection_log
       (file_path, event_type, expected_checksum, actual_checksum, restored)
       VALUES ($1, $2, $3, $4, $5)`,
      [filePath, 'TAMPERING_DETECTED', expectedChecksum, actualChecksum, restored]
    );

    logger.error('Logged tampering detection to audit trail', {
      filePath,
      restored,
    });
  }
}
```

---

## Performance Optimization

### Caching Strategy

```typescript
/**
 * Multi-tier caching for agent configs
 */
interface CachedConfig {
  config: AgentConfig;
  timestamp: number;
  ttl: number;
  hits: number;
}

export class ProtectedAgentLoader {
  private configCache: Map<string, CachedConfig>; // In-memory cache
  private cacheStats: CacheStats;

  constructor() {
    this.configCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };

    // Cache eviction on memory pressure
    this.startCacheEvictionPolicy();
  }

  async loadAgent(agentName: string): Promise<AgentConfig> {
    // L1 Cache: In-memory
    const cached = this.configCache.get(agentName);
    if (cached && !this.isCacheExpired(cached)) {
      cached.hits++;
      this.cacheStats.hits++;
      return cached.config;
    }

    // L2: File system (cold load)
    this.cacheStats.misses++;
    const config = await this.validator.validateAgentConfig(agentName);

    // Store in cache
    this.configCache.set(agentName, {
      config,
      timestamp: Date.now(),
      ttl: 60000, // 1 minute
      hits: 0,
    });

    return config;
  }

  private startCacheEvictionPolicy(): void {
    // LRU eviction: Remove least-recently-used entries when cache size exceeds limit
    setInterval(() => {
      const maxSize = 100; // Max 100 agents cached

      if (this.configCache.size > maxSize) {
        const entries = Array.from(this.configCache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp);

        const toEvict = entries.slice(0, entries.length - maxSize);
        toEvict.forEach(([key]) => {
          this.configCache.delete(key);
          this.cacheStats.evictions++;
        });

        logger.info('Evicted least-recently-used cache entries', {
          evicted: toEvict.length,
          remaining: this.configCache.size,
        });
      }
    }, 60000); // Every minute
  }

  getCacheStats(): CacheStats {
    return {
      ...this.cacheStats,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses),
      size: this.configCache.size,
    };
  }
}
```

### Performance Benchmarks

| Operation | Cold Load | Warm Load (Cached) | Target |
|-----------|-----------|-------------------|--------|
| Load agent (no sidecar) | 50-100ms | 1-5ms | < 200ms |
| Load agent (with sidecar) | 100-200ms | 1-5ms | < 300ms |
| Integrity check | 1-3ms | N/A | < 5ms |
| Config merge | < 1ms | N/A | < 2ms |
| Protected config update | 50-150ms | N/A | < 500ms |
| Migration (per agent) | 100-300ms | N/A | < 1s |

### Optimization Techniques

#### 1. Lazy Loading

```typescript
// Load protected config only when referenced
async loadAgent(agentName: string): Promise<AgentConfig> {
  const agentConfig = await this.loadAgentMarkdown(agentName);

  // Skip loading protected config if not referenced
  if (!agentConfig._protected_config_source) {
    return agentConfig;
  }

  // Load protected config on-demand
  const protectedConfig = await this.loadProtectedSidecar(
    agentConfig._protected_config_source
  );

  return this.mergeConfigs(agentConfig, protectedConfig);
}
```

#### 2. Parallel Loading

```typescript
// Load multiple agents in parallel
async loadAgents(agentNames: string[]): Promise<AgentConfig[]> {
  return Promise.all(
    agentNames.map(name => this.loadAgent(name))
  );
}
```

#### 3. Checksum Caching

```typescript
// Cache checksums to avoid recomputation
private checksumCache: Map<string, string>;

async verify(config: ProtectedConfig, filePath: string): Promise<boolean> {
  const cacheKey = `${filePath}:${config.version}`;

  const cachedChecksum = this.checksumCache.get(cacheKey);
  if (cachedChecksum) {
    return cachedChecksum === config.checksum;
  }

  const computed = this.computeHash(config);
  this.checksumCache.set(cacheKey, computed);

  return computed === config.checksum;
}
```

#### 4. File System Optimization

```typescript
// Use file stats to detect changes without reading file
private fileModifiedCache: Map<string, number>;

async isFileModified(filePath: string): Promise<boolean> {
  const stats = await fs.promises.stat(filePath);
  const lastModified = stats.mtimeMs;

  const cachedModified = this.fileModifiedCache.get(filePath);
  this.fileModifiedCache.set(filePath, lastModified);

  return !cachedModified || cachedModified !== lastModified;
}
```

---

## Deployment Architecture

### Environment Configuration

```bash
# .env.production
# Protected Agent Config System

# Agent directory
AGENT_DIRECTORY=/workspaces/agent-feed/.claude/agents

# Backup directory
BACKUP_DIRECTORY=/workspaces/agent-feed/prod/backups

# Security
SYSTEM_ADMIN=true
ADMIN_TOKEN=<secure-token>

# Caching
AGENT_CONFIG_CACHE_TTL=60000  # 1 minute
AGENT_CONFIG_CACHE_MAX_SIZE=100

# Logging
LOG_LEVEL=info
SECURITY_LOG_PATH=/workspaces/agent-feed/logs/security.log

# Tampering detection
ENABLE_TAMPERING_DETECTION=true
TAMPERING_AUTO_RESTORE=true

# Performance
ENABLE_AGENT_CONFIG_CACHE=true
ENABLE_CHECKSUM_CACHE=true
```

### Initialization Sequence

```typescript
/**
 * System initialization for protected agent config
 * Location: /workspaces/agent-feed/src/config/init.ts
 */
export async function initializeProtectedAgentSystem(): Promise<void> {
  logger.info('Initializing protected agent config system');

  // 1. Create .system directory if needed
  const systemDir = path.join(process.env.AGENT_DIRECTORY!, '.system');
  await fs.promises.mkdir(systemDir, { recursive: true });
  await fs.promises.chmod(systemDir, 0o555);
  logger.info('System directory ready', { systemDir });

  // 2. Initialize loader
  const loader = new ProtectedAgentLoader({
    agentDirectory: process.env.AGENT_DIRECTORY,
  });

  // 3. Start file watchers
  loader.watchForChanges();
  logger.info('File watchers started');

  // 4. Start tampering detection
  if (process.env.ENABLE_TAMPERING_DETECTION === 'true') {
    const detector = new TamperingDetector();
    detector.startMonitoring();
    logger.info('Tampering detection started');
  }

  // 5. Preload critical agents
  const criticalAgents = ['meta-agent', 'avi', 'strategic-planner'];
  await Promise.all(
    criticalAgents.map(name => loader.loadAgent(name))
  );
  logger.info('Critical agents preloaded', { agents: criticalAgents });

  logger.info('Protected agent config system initialized successfully');
}
```

### Health Checks

```typescript
/**
 * Health check endpoint for protected agent config system
 */
router.get('/api/system/health/protected-config', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    // Check 1: System directory exists and is readable
    const systemDir = path.join(process.env.AGENT_DIRECTORY!, '.system');
    await fs.promises.access(systemDir, fs.constants.R_OK);
    health.checks.systemDirectory = { status: 'ok', path: systemDir };
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.systemDirectory = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  try {
    // Check 2: Agent loader cache stats
    const loader = new ProtectedAgentLoader();
    const stats = loader.getCacheStats();
    health.checks.cache = {
      status: 'ok',
      hitRate: stats.hitRate,
      size: stats.size,
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.cache = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  try {
    // Check 3: Tampering detector status
    const detector = new TamperingDetector();
    health.checks.tamperingDetection = {
      status: 'ok',
      enabled: process.env.ENABLE_TAMPERING_DETECTION === 'true',
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.tamperingDetection = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

### Monitoring Metrics

```typescript
/**
 * Prometheus metrics for protected agent config system
 */
import { Counter, Gauge, Histogram } from 'prom-client';

// Agent loading
const agentLoadCounter = new Counter({
  name: 'protected_agent_load_total',
  help: 'Total agent loads',
  labelNames: ['agent_name', 'cache_hit'],
});

const agentLoadDuration = new Histogram({
  name: 'protected_agent_load_duration_seconds',
  help: 'Agent load duration',
  labelNames: ['agent_name', 'has_protection'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1],
});

// Cache
const cacheHitRate = new Gauge({
  name: 'protected_agent_cache_hit_rate',
  help: 'Agent config cache hit rate',
});

const cacheSize = new Gauge({
  name: 'protected_agent_cache_size',
  help: 'Number of cached agent configs',
});

// Integrity checks
const integrityCheckCounter = new Counter({
  name: 'protected_config_integrity_check_total',
  help: 'Total integrity checks',
  labelNames: ['agent_name', 'result'],
});

// Tampering detection
const tamperingDetectedCounter = new Counter({
  name: 'protected_config_tampering_detected_total',
  help: 'Total tampering events detected',
  labelNames: ['file_path', 'restored'],
});

// Protected config updates
const protectedConfigUpdateCounter = new Counter({
  name: 'protected_config_update_total',
  help: 'Total protected config updates',
  labelNames: ['agent_name', 'result'],
});
```

---

## Appendices

### Appendix A: Complete File Structure

```
/workspaces/agent-feed/
├── .claude/
│   └── agents/
│       ├── README.md
│       ├── strategic-planner-agent.md
│       ├── meta-agent.md
│       ├── avi-agent.md
│       └── .system/                           # Protected configs (555)
│           ├── .gitkeep
│           ├── strategic-planner.protected.yaml    # (444)
│           ├── meta-agent.protected.yaml          # (444)
│           └── avi.protected.yaml                 # (444)
│
├── src/
│   └── config/
│       ├── schemas/
│       │   ├── agent-config.schema.ts
│       │   └── protected-config.schema.ts
│       │
│       ├── validators/
│       │   ├── agent-config-validator.ts
│       │   └── integrity-checker.ts
│       │
│       ├── loaders/
│       │   ├── protected-agent-loader.ts
│       │   └── markdown-parser.ts
│       │
│       ├── managers/
│       │   ├── protected-config-manager.ts
│       │   └── tampering-detector.ts
│       │
│       ├── migrators/
│       │   └── agent-config-migrator.ts
│       │
│       ├── errors.ts
│       ├── audit-logger.ts
│       └── init.ts
│
├── api-server/
│   └── routes/
│       └── protected-config.routes.ts
│
├── docs/
│   ├── SPARC-PROTECTED-AGENT-FIELDS-ARCHITECTURE.md    # This document
│   └── PROTECTED-FIELDS.md                             # Field documentation
│
├── prod/
│   └── backups/
│       ├── pre-protection/                    # Agent backups before migration
│       │   ├── strategic-planner-agent_2025-10-17.md
│       │   └── meta-agent_2025-10-17.md
│       │
│       └── protected-configs/                 # Protected config history
│           ├── strategic-planner/
│           │   ├── 2025-10-17_v1.0.0.protected.yaml
│           │   └── 2025-10-17_v1.0.1.protected.yaml
│           │
│           └── meta-agent/
│               └── 2025-10-17_v1.0.0.protected.yaml
│
├── logs/
│   ├── protected-config.log
│   ├── protected-config-error.log
│   └── security.log
│
└── tests/
    └── config/
        ├── protected-agent-loader.test.ts
        ├── agent-config-validator.test.ts
        ├── integrity-checker.test.ts
        ├── protected-config-manager.test.ts
        ├── tampering-detector.test.ts
        └── agent-config-migrator.test.ts
```

### Appendix B: Protected Config Example

```yaml
# Example protected configuration
# File: .claude/agents/.system/strategic-planner.protected.yaml

version: "1.0.0"
agent_id: "strategic-planner"
checksum: "sha256:a7b3c8d9e2f1234567890abcdef1234567890abcdef1234567890abcdef12345"

_metadata:
  updated_at: "2025-10-17T10:30:00.000Z"
  updated_by: "system"
  previous_version: null

permissions:
  # API access rules
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

  # Tool permissions
  tool_permissions:
    allowed:
      - "Read"
      - "Write"
      - "Edit"
      - "Bash"
      - "Grep"
      - "Glob"

    forbidden:
      - "KillShell"
      - "NotebookEdit"

  # Workspace restrictions
  workspace:
    root: "/workspaces/agent-feed/prod/agent_workspace/agents/strategic-planner"
    max_storage: "1GB"

    allowed_paths:
      - "/workspaces/agent-feed/prod/agent_workspace/agents/strategic-planner/**"
      - "/workspaces/agent-feed/prod/agent_workspace/shared/**"

    forbidden_paths:
      - "/workspaces/agent-feed/src/**"
      - "/workspaces/agent-feed/api-server/**"
      - "/workspaces/agent-feed/.claude/**"

  # Resource limits
  resource_limits:
    max_memory: "512MB"
    max_cpu_percent: 50
    max_execution_time: "300s"
    max_concurrent_tasks: 3

  # Posting rules
  posting_rules:
    auto_post_outcomes: true
    post_threshold: "completed_task"
    default_post_type: "reply"

  # Security policies
  security:
    sandbox_enabled: true
    network_access: "api_only"
    file_operations: "workspace_only"
```

### Appendix C: Migration Script

```typescript
/**
 * Migration script: Add protection to all agents
 * Usage: npm run migrate:protected-agents
 */
import { AgentConfigMigrator } from '../src/config/migrators/agent-config-migrator';
import logger from '../src/utils/logger';

async function main() {
  const migrator = new AgentConfigMigrator();

  logger.info('Starting agent migration to protected model');

  const result = await migrator.migrateAllAgents();

  logger.info('Migration complete', result);

  console.log('\n=== Migration Summary ===');
  console.log(`Total agents: ${result.total}`);
  console.log(`Migrated: ${result.migrated}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(({ agentName, error }) => {
      console.log(`  - ${agentName}: ${error}`);
    });
  }

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  logger.error('Migration failed', error);
  console.error('Migration failed:', error);
  process.exit(1);
});
```

### Appendix D: Testing Strategy

```typescript
/**
 * Test suite for ProtectedAgentLoader
 */
describe('ProtectedAgentLoader', () => {
  let loader: ProtectedAgentLoader;

  beforeEach(() => {
    loader = new ProtectedAgentLoader();
  });

  describe('loadAgent', () => {
    it('should load agent without protected sidecar', async () => {
      const config = await loader.loadAgent('simple-agent');

      expect(config.name).toBe('simple-agent');
      expect(config._protected).toBeNull();
    });

    it('should load agent with protected sidecar', async () => {
      const config = await loader.loadAgent('strategic-planner');

      expect(config.name).toBe('strategic-planner');
      expect(config._protected).toBeDefined();
      expect(config._protected.version).toBe('1.0.0');
    });

    it('should throw SecurityError on integrity check failure', async () => {
      // Tamper with protected config
      await fs.promises.writeFile(
        '.claude/agents/.system/test.protected.yaml',
        'version: "1.0.0"\nchecksum: "sha256:invalid"'
      );

      await expect(loader.loadAgent('test')).rejects.toThrow(SecurityError);
    });

    it('should use cache on subsequent loads', async () => {
      const config1 = await loader.loadAgent('strategic-planner');
      const config2 = await loader.loadAgent('strategic-planner');

      expect(config1).toBe(config2); // Same object reference

      const stats = loader.getCacheStats();
      expect(stats.hits).toBe(1);
    });
  });
});

/**
 * Test suite for IntegrityChecker
 */
describe('IntegrityChecker', () => {
  let checker: IntegrityChecker;

  beforeEach(() => {
    checker = new IntegrityChecker();
  });

  describe('computeHash', () => {
    it('should compute deterministic hash', () => {
      const config = { version: '1.0.0', permissions: {} };

      const hash1 = checker.computeHash(config);
      const hash2 = checker.computeHash(config);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different configs', () => {
      const config1 = { version: '1.0.0' };
      const config2 = { version: '1.0.1' };

      const hash1 = checker.computeHash(config1);
      const hash2 = checker.computeHash(config2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should verify valid checksum', async () => {
      const config = { version: '1.0.0', permissions: {} };
      const checksum = checker.computeHash(config);

      const configWithChecksum = { ...config, checksum: `sha256:${checksum}` };

      const isValid = await checker.verify(configWithChecksum, 'test.yaml');
      expect(isValid).toBe(true);
    });

    it('should reject invalid checksum', async () => {
      const config = {
        version: '1.0.0',
        permissions: {},
        checksum: 'sha256:invalid',
      };

      const isValid = await checker.verify(config, 'test.yaml');
      expect(isValid).toBe(false);
    });
  });
});
```

---

## Summary

This architecture provides a **production-ready protected agent configuration system** with:

### ✅ Security
- OS-level file protection (444/555 permissions)
- SHA-256 integrity verification
- Real-time tampering detection
- Automatic restoration from backups
- Audit logging for all changes

### ✅ Performance
- In-memory caching with LRU eviction
- Cache hit rate > 95% expected
- Agent load time < 50ms (cached), < 200ms (cold)
- Lazy loading of protected configs

### ✅ Reliability
- Fail-fast on security errors
- Graceful degradation on non-critical errors
- Automatic rollback on failures
- Multiple backup versions

### ✅ Compatibility
- 100% backward compatible with existing `.md` agents
- Non-breaking incremental migration
- Agents without sidecars work normally
- Standard Claude Code format preserved

### ✅ Maintainability
- Clean separation of concerns
- Well-defined interfaces
- Comprehensive error handling
- Structured logging
- Full test coverage

**Next Steps**: Proceed to implementation (TDD phase) following this architecture specification.

---

**Architecture Approval**: Ready for implementation ✅
**Reviewed By**: SPARC Architecture Agent
**Date**: 2025-10-17
