/**
 * AgentConfigValidator - Validates and merges agent configs with protected sidecars
 *
 * Phase 3: Core Components Implementation
 *
 * Responsibility:
 * - Load and parse agent .md files (with gray-matter)
 * - Load and parse .protected.yaml sidecars
 * - Verify protected config integrity via IntegrityChecker
 * - Merge configurations (protected takes precedence)
 * - Return unified config for worker consumption
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import * as YAML from 'yaml';
import { IntegrityChecker } from './integrity-checker';
import logger from '../../utils/logger';

/**
 * Agent configuration (user-editable fields)
 */
export interface AgentConfig {
  // Required fields
  name: string;
  description: string;
  tools: string[];
  model: string;

  // Optional user-editable fields
  color?: string;
  proactive?: boolean;
  priority?: string;
  personality?: {
    tone?: string;
    style?: string;
    emoji_usage?: string;
  };
  specialization?: string[];
  custom_instructions?: string;
  autonomous_mode?: string;
  priority_preferences?: {
    focus?: string;
    timeframe?: string;
  };

  // Internal fields (system-managed)
  _protected_config_source?: string;
  _body?: string;
  _protected?: ProtectedConfig | null;
  _permissions?: any;
  _resource_limits?: any;
  _workspace?: any;
  _api_access?: any;
  _tool_permissions?: any;

  // Allow additional fields
  [key: string]: any;
}

/**
 * Protected configuration (system-controlled)
 */
export interface ProtectedConfig {
  version: string;
  agent_id: string;
  checksum: string;
  _metadata?: {
    updated_at?: string;
    updated_by?: string;
    previous_version?: string;
  };
  permissions?: {
    api_access?: any;
    tool_permissions?: any;
    workspace?: any;
    resource_limits?: any;
    posting_rules?: any;
    security?: any;
  };
}

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message: string, public context?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Security error class
 */
export class SecurityError extends Error {
  constructor(message: string, public context?: any) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Validator options
 */
interface ValidatorOptions {
  agentDirectory?: string;
}

/**
 * AgentConfigValidator class
 * Main validation and merging logic
 */
export class AgentConfigValidator {
  private integrityChecker: IntegrityChecker;
  private agentDirectory: string;

  constructor(options?: ValidatorOptions) {
    this.integrityChecker = new IntegrityChecker();
    this.agentDirectory = options?.agentDirectory || '/workspaces/agent-feed/.claude/agents';
  }

  /**
   * Validate agent configuration and merge with protected sidecar
   * Main entry point for validation
   *
   * @param agentName - Agent identifier (e.g., "strategic-planner")
   * @returns Promise resolving to merged configuration
   * @throws ValidationError if schema validation fails
   * @throws SecurityError if integrity check fails
   */
  async validateAgentConfig(agentName: string): Promise<AgentConfig> {
    try {
      logger.debug('Validating agent config', { agentName });

      // 1. Load main agent .md file
      const agentMarkdown = await this.loadAgentMarkdown(agentName);

      // 2. Check for protected sidecar reference
      const protectedSource = agentMarkdown._protected_config_source;

      if (!protectedSource) {
        // No protection - return plain config (backward compatible)
        logger.debug('Agent has no protected sidecar', { agentName });
        return {
          ...agentMarkdown,
          _protected: null,
        };
      }

      // 3. Load protected sidecar
      const protectedPath = path.join(this.agentDirectory, protectedSource);
      const protectedConfig = await this.loadProtectedSidecar(protectedPath);

      // 4. Verify integrity
      const isValid = await this.verifyProtectedConfigIntegrity(protectedConfig, protectedPath);
      if (!isValid) {
        throw new SecurityError(
          `Protected config integrity check failed for ${agentName}`,
          { agentName, protectedPath }
        );
      }

      // 5. Merge configs (protected takes precedence)
      const merged = this.mergeConfigs(agentMarkdown, protectedConfig);

      logger.info('Validated agent config', {
        agentName,
        hasProtection: true,
        protectedVersion: protectedConfig.version,
      });

      return merged;

    } catch (error) {
      logger.error('Agent config validation failed', {
        agentName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Load agent markdown file and parse frontmatter
   * @param agentName - Agent identifier
   * @returns Parsed agent configuration
   */
  async loadAgentMarkdown(agentName: string): Promise<AgentConfig> {
    const agentPath = path.join(this.agentDirectory, `${agentName}-agent.md`);

    // Check if file exists
    if (!fs.existsSync(agentPath)) {
      throw new ValidationError(`Agent file not found: ${agentPath}`, { agentName });
    }

    // Read file content
    const agentContent = await fs.promises.readFile(agentPath, 'utf-8');

    // Parse frontmatter and body using gray-matter
    const { data: frontmatter, content: body } = matter(agentContent);

    // Basic validation
    if (!frontmatter.name) {
      throw new ValidationError(`Agent config missing required field: name`, { agentName });
    }

    logger.debug('Loaded agent markdown', {
      agentName,
      fields: Object.keys(frontmatter),
      bodyLength: body.length,
    });

    return {
      ...frontmatter,
      _body: body,
    } as AgentConfig;
  }

  /**
   * Load protected sidecar YAML file
   * @param protectedPath - Path to .protected.yaml file
   * @returns Parsed protected configuration
   */
  async loadProtectedSidecar(protectedPath: string): Promise<ProtectedConfig> {
    // Check if file exists
    if (!fs.existsSync(protectedPath)) {
      throw new ValidationError(`Protected config file not found: ${protectedPath}`);
    }

    // Read file content
    const protectedContent = await fs.promises.readFile(protectedPath, 'utf-8');

    // Parse YAML
    const protectedConfig = YAML.parse(protectedContent) as ProtectedConfig;

    // Basic validation
    if (!protectedConfig.version) {
      throw new ValidationError('Protected config missing required field: version', {
        protectedPath,
      });
    }

    if (!protectedConfig.checksum) {
      throw new ValidationError('Protected config missing required field: checksum', {
        protectedPath,
      });
    }

    logger.debug('Loaded protected sidecar', {
      protectedPath,
      version: protectedConfig.version,
      agentId: protectedConfig.agent_id,
    });

    return protectedConfig;
  }

  /**
   * Verify protected config integrity using IntegrityChecker
   * @param config - Protected configuration
   * @param filePath - File path (for logging)
   * @returns Promise resolving to true if valid
   */
  async verifyProtectedConfigIntegrity(
    config: ProtectedConfig,
    filePath: string
  ): Promise<boolean> {
    return this.integrityChecker.verify(config, filePath);
  }

  /**
   * Merge agent config with protected config
   * Protected fields take precedence over user fields
   *
   * @param agentConfig - User-editable agent configuration
   * @param protectedConfig - System-controlled protected configuration
   * @returns Merged configuration
   */
  mergeConfigs(
    agentConfig: AgentConfig,
    protectedConfig: ProtectedConfig
  ): AgentConfig {
    // Protected fields override user fields
    const merged: AgentConfig = {
      ...agentConfig,
      // Store protected config reference
      _protected: protectedConfig,
      // Extract protected permissions for easy access
      _permissions: protectedConfig.permissions,
      _resource_limits: protectedConfig.permissions?.resource_limits,
      _workspace: protectedConfig.permissions?.workspace,
      _api_access: protectedConfig.permissions?.api_access,
      _tool_permissions: protectedConfig.permissions?.tool_permissions,
    };

    logger.debug('Merged agent config with protected config', {
      agentName: agentConfig.name,
      protectedVersion: protectedConfig.version,
      hasPermissions: !!protectedConfig.permissions,
    });

    return merged;
  }
}

/**
 * Export singleton instance for convenience
 */
export const agentConfigValidator = new AgentConfigValidator();
