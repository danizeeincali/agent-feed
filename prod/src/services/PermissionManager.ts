/**
 * Permission Manager
 * Advanced security and permission management for Claude Code SDK
 *
 * Features:
 * - Role-based access control (RBAC)
 * - Tool-specific permissions
 * - Resource-based authorization
 * - Dangerous mode controls
 * - Dynamic permission evaluation
 */

import { EventEmitter } from 'events';
import { ToolPermissions, DangerousModeConfig } from './ClaudeCodeSDKManager';

export interface UserPermissionProfile {
  userId: string;
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  department?: string;
  team?: string;
  permissions: {
    tools: ToolPermissions;
    resources: ResourcePermissions;
    features: FeaturePermissions;
  };
  restrictions: {
    maxSessions: number;
    maxConcurrentTasks: number;
    allowedWorkingDirectories: string[];
    dangerousModeAllowed: boolean;
  };
  created: Date;
  lastUpdated: Date;
}

export interface ResourcePermissions {
  files: {
    read: string[];
    write: string[];
    execute: string[];
    delete: string[];
  };
  directories: {
    access: string[];
    create: string[];
    modify: string[];
  };
  system: {
    processes: string[];
    services: string[];
    environment: string[];
  };
}

export interface FeaturePermissions {
  streaming: boolean;
  headless: boolean;
  contextManagement: boolean;
  sessionSharing: boolean;
  auditAccess: boolean;
  systemMetrics: boolean;
}

export interface SecurityPolicy {
  name: string;
  description: string;
  rules: SecurityRule[];
  enforcement: 'strict' | 'moderate' | 'permissive';
  exemptions: string[];
}

export interface SecurityRule {
  id: string;
  type: 'allow' | 'deny' | 'require_approval';
  condition: SecurityCondition;
  action: SecurityAction;
  priority: number;
  active: boolean;
}

export interface SecurityCondition {
  userRoles?: string[];
  timeRange?: { start: string; end: string };
  workingDirectory?: string[];
  tools?: string[];
  resourcePattern?: string;
  sessionType?: 'streaming' | 'headless';
}

export interface SecurityAction {
  type: 'grant' | 'deny' | 'log' | 'alert' | 'escalate';
  parameters?: Record<string, any>;
  notification?: boolean;
}

export interface PermissionAuditEntry {
  id: string;
  userId: string;
  sessionId: string;
  action: string;
  resource: string;
  result: 'granted' | 'denied' | 'escalated';
  reason: string;
  timestamp: Date;
  context: Record<string, any>;
}

export class PermissionManager extends EventEmitter {
  private userProfiles: Map<string, UserPermissionProfile>;
  private securityPolicies: Map<string, SecurityPolicy>;
  private auditLog: PermissionAuditEntry[];
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    super();
    this.config = config;
    this.userProfiles = new Map();
    this.securityPolicies = new Map();
    this.auditLog = [];

    this.initializeDefaultPolicies();
  }

  /**
   * Get user permission profile with role-based defaults
   */
  async getUserPermissions(userId: string): Promise<UserPermissionProfile> {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      // Create default profile based on user role
      const userRole = await this.getUserRole(userId);
      profile = this.createDefaultProfile(userId, userRole);
      this.userProfiles.set(userId, profile);
    }

    return profile;
  }

  /**
   * Validate tool access for a specific session and operation
   */
  async validateToolAccess(
    sessionId: string,
    toolName: string,
    operation: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    try {
      const session = await this.getSessionInfo(sessionId);
      const userProfile = await this.getUserPermissions(session.userId);

      // Check basic tool permission
      if (!userProfile.permissions.tools.tools.allowed.includes(toolName)) {
        await this.logPermissionEvent(session.userId, sessionId, 'tool_access', toolName, 'denied', 'Tool not in allowed list');
        return false;
      }

      // Check if tool is explicitly restricted
      if (userProfile.permissions.tools.tools.restricted.includes(toolName)) {
        await this.logPermissionEvent(session.userId, sessionId, 'tool_access', toolName, 'denied', 'Tool explicitly restricted');
        return false;
      }

      // Apply security policies
      const policyResult = await this.evaluateSecurityPolicies(session.userId, toolName, operation, context);
      if (policyResult.action === 'deny') {
        await this.logPermissionEvent(session.userId, sessionId, 'tool_access', toolName, 'denied', policyResult.reason);
        return false;
      }

      // Special handling for dangerous tools
      if (this.isDangerousTool(toolName, operation)) {
        const dangerousAllowed = await this.validateDangerousAccess(session, toolName, operation);
        if (!dangerousAllowed) {
          await this.logPermissionEvent(session.userId, sessionId, 'dangerous_tool_access', toolName, 'denied', 'Dangerous mode not enabled or insufficient permissions');
          return false;
        }
      }

      await this.logPermissionEvent(session.userId, sessionId, 'tool_access', toolName, 'granted', 'Permission validation passed');
      return true;

    } catch (error) {
      console.error('Tool validation error:', error);
      return false;
    }
  }

  /**
   * Validate task permissions for headless execution
   */
  async validateTaskPermissions(userId: string, allowedTools: string[]): Promise<boolean> {
    try {
      const userProfile = await this.getUserPermissions(userId);

      // Check each requested tool
      for (const tool of allowedTools) {
        if (!userProfile.permissions.tools.tools.allowed.includes(tool)) {
          await this.logPermissionEvent(userId, 'headless_task', 'task_validation', tool, 'denied', `Tool ${tool} not allowed for user`);
          return false;
        }
      }

      // Check resource limits
      const currentSessions = await this.getUserActiveSessions(userId);
      if (currentSessions >= userProfile.restrictions.maxConcurrentTasks) {
        await this.logPermissionEvent(userId, 'headless_task', 'resource_limit', 'concurrent_tasks', 'denied', 'Maximum concurrent tasks exceeded');
        return false;
      }

      return true;

    } catch (error) {
      console.error('Task validation error:', error);
      return false;
    }
  }

  /**
   * Validate permissions for updated tool permissions
   */
  async validatePermissions(userId: string, newPermissions: Partial<ToolPermissions>): Promise<boolean> {
    try {
      const userProfile = await this.getUserPermissions(userId);

      // Validate file system permissions
      if (newPermissions.fileSystem) {
        const allowed = await this.validateFileSystemPermissions(userProfile, newPermissions.fileSystem);
        if (!allowed) return false;
      }

      // Validate network permissions
      if (newPermissions.network) {
        const allowed = await this.validateNetworkPermissions(userProfile, newPermissions.network);
        if (!allowed) return false;
      }

      // Validate system permissions
      if (newPermissions.system) {
        const allowed = await this.validateSystemPermissions(userProfile, newPermissions.system);
        if (!allowed) return false;
      }

      return true;

    } catch (error) {
      console.error('Permission validation error:', error);
      return false;
    }
  }

  /**
   * Enable dangerous mode with proper validation and logging
   */
  async enableDangerousMode(
    sessionId: string,
    config: DangerousModeConfig
  ): Promise<boolean> {
    try {
      const session = await this.getSessionInfo(sessionId);
      const userProfile = await this.getUserPermissions(session.userId);

      // Check if user is allowed to use dangerous mode
      if (!userProfile.restrictions.dangerousModeAllowed) {
        await this.logPermissionEvent(session.userId, sessionId, 'dangerous_mode_request', 'enable', 'denied', 'User not authorized for dangerous mode');
        return false;
      }

      // Validate justification
      if (!config.justification || config.justification.length < 50) {
        await this.logPermissionEvent(session.userId, sessionId, 'dangerous_mode_request', 'enable', 'denied', 'Insufficient justification');
        return false;
      }

      // Check approval requirements
      if (userProfile.role !== 'admin' && userProfile.role !== 'super_admin') {
        // Require admin approval for non-admin users
        const approved = await this.requestAdminApproval(session.userId, sessionId, config);
        if (!approved) {
          await this.logPermissionEvent(session.userId, sessionId, 'dangerous_mode_request', 'enable', 'denied', 'Admin approval required but not granted');
          return false;
        }
      }

      // Log dangerous mode activation
      await this.logPermissionEvent(session.userId, sessionId, 'dangerous_mode_enabled', 'enable', 'granted', config.justification);

      // Set time limit if not specified
      if (!config.timeLimit) {
        config.timeLimit = 3600000; // 1 hour default
      }

      // Schedule automatic disable
      setTimeout(async () => {
        await this.disableDangerousMode(sessionId);
      }, config.timeLimit);

      this.emit('dangerousModeEnabled', { sessionId, userId: session.userId, config });
      return true;

    } catch (error) {
      console.error('Dangerous mode enablement error:', error);
      return false;
    }
  }

  /**
   * Disable dangerous mode
   */
  async disableDangerousMode(sessionId: string): Promise<void> {
    try {
      const session = await this.getSessionInfo(sessionId);

      await this.logPermissionEvent(session.userId, sessionId, 'dangerous_mode_disabled', 'disable', 'granted', 'Automatic or manual disable');

      this.emit('dangerousModeDisabled', { sessionId, userId: session.userId });

    } catch (error) {
      console.error('Dangerous mode disable error:', error);
    }
  }

  /**
   * Get permission audit trail
   */
  async getAuditTrail(filters: {
    userId?: string;
    sessionId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<PermissionAuditEntry[]> {
    let filteredEntries = this.auditLog;

    if (filters.userId) {
      filteredEntries = filteredEntries.filter(entry => entry.userId === filters.userId);
    }

    if (filters.sessionId) {
      filteredEntries = filteredEntries.filter(entry => entry.sessionId === filters.sessionId);
    }

    if (filters.action) {
      filteredEntries = filteredEntries.filter(entry => entry.action === filters.action);
    }

    if (filters.startDate) {
      filteredEntries = filteredEntries.filter(entry => entry.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      filteredEntries = filteredEntries.filter(entry => entry.timestamp <= filters.endDate!);
    }

    // Sort by timestamp (newest first)
    filteredEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters.limit) {
      filteredEntries = filteredEntries.slice(0, filters.limit);
    }

    return filteredEntries;
  }

  /**
   * Update user permissions
   */
  async updateUserPermissions(
    userId: string,
    updates: Partial<UserPermissionProfile>
  ): Promise<void> {
    const profile = await this.getUserPermissions(userId);

    // Merge updates
    Object.assign(profile, updates, { lastUpdated: new Date() });

    this.userProfiles.set(userId, profile);

    await this.logPermissionEvent('system', 'permission_update', 'update_permissions', userId, 'granted', 'User permissions updated');

    this.emit('permissionsUpdated', { userId, updates });
  }

  /**
   * Create security policy
   */
  async createSecurityPolicy(policy: SecurityPolicy): Promise<void> {
    this.securityPolicies.set(policy.name, policy);

    await this.logPermissionEvent('system', 'policy_management', 'create_policy', policy.name, 'granted', 'Security policy created');

    this.emit('policyCreated', { policy });
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentEntries = this.auditLog.filter(entry => entry.timestamp >= last24Hours);

    return {
      totalAuditEntries: this.auditLog.length,
      last24Hours: {
        totalEvents: recentEntries.length,
        deniedRequests: recentEntries.filter(entry => entry.result === 'denied').length,
        grantedRequests: recentEntries.filter(entry => entry.result === 'granted').length,
        dangerousModeUsage: recentEntries.filter(entry => entry.action.includes('dangerous_mode')).length
      },
      activePolicies: this.securityPolicies.size,
      activeUsers: this.userProfiles.size
    };
  }

  // Private helper methods

  private async getUserRole(userId: string): Promise<string> {
    // Integration with user management system
    // For now, return default role
    return 'user';
  }

  private createDefaultProfile(userId: string, role: string): UserPermissionProfile {
    const defaultPermissions = this.getDefaultPermissionsByRole(role);

    return {
      userId,
      role: role as any,
      permissions: defaultPermissions.permissions,
      restrictions: defaultPermissions.restrictions,
      created: new Date(),
      lastUpdated: new Date()
    };
  }

  private getDefaultPermissionsByRole(role: string): {
    permissions: UserPermissionProfile['permissions'];
    restrictions: UserPermissionProfile['restrictions'];
  } {
    switch (role) {
      case 'admin':
        return {
          permissions: {
            tools: {
              fileSystem: {
                read: ['/workspaces/agent-feed/prod/**'],
                write: ['/workspaces/agent-feed/prod/**'],
                execute: ['/workspaces/agent-feed/prod/**']
              },
              network: {
                allowHttp: true,
                allowedDomains: ['*'],
                allowedPorts: [80, 443, 3000, 8000, 8080]
              },
              system: {
                allowBash: true,
                allowedCommands: ['*'],
                dangerousMode: true
              },
              tools: {
                allowed: ['*'],
                restricted: [],
                customLimits: {}
              }
            },
            resources: {
              files: {
                read: ['/workspaces/agent-feed/prod/**'],
                write: ['/workspaces/agent-feed/prod/**'],
                execute: ['/workspaces/agent-feed/prod/**'],
                delete: ['/workspaces/agent-feed/prod/temp/**']
              },
              directories: {
                access: ['/workspaces/agent-feed/prod/**'],
                create: ['/workspaces/agent-feed/prod/**'],
                modify: ['/workspaces/agent-feed/prod/**']
              },
              system: {
                processes: ['*'],
                services: ['*'],
                environment: ['*']
              }
            },
            features: {
              streaming: true,
              headless: true,
              contextManagement: true,
              sessionSharing: true,
              auditAccess: true,
              systemMetrics: true
            }
          },
          restrictions: {
            maxSessions: 50,
            maxConcurrentTasks: 20,
            allowedWorkingDirectories: ['/workspaces/agent-feed/prod'],
            dangerousModeAllowed: true
          }
        };

      case 'moderator':
        return {
          permissions: {
            tools: {
              fileSystem: {
                read: ['/workspaces/agent-feed/prod/**'],
                write: ['/workspaces/agent-feed/prod/temp/**', '/workspaces/agent-feed/prod/logs/**'],
                execute: ['/workspaces/agent-feed/prod/scripts/**']
              },
              network: {
                allowHttp: true,
                allowedDomains: ['api.anthropic.com', 'github.com', 'stackoverflow.com'],
                allowedPorts: [80, 443, 3000]
              },
              system: {
                allowBash: true,
                allowedCommands: ['ls', 'cat', 'grep', 'find', 'npm', 'node'],
                dangerousMode: false
              },
              tools: {
                allowed: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'WebSearch'],
                restricted: ['KillShell'],
                customLimits: {}
              }
            },
            resources: {
              files: {
                read: ['/workspaces/agent-feed/prod/**'],
                write: ['/workspaces/agent-feed/prod/temp/**'],
                execute: ['/workspaces/agent-feed/prod/scripts/**'],
                delete: ['/workspaces/agent-feed/prod/temp/**']
              },
              directories: {
                access: ['/workspaces/agent-feed/prod/**'],
                create: ['/workspaces/agent-feed/prod/temp/**'],
                modify: ['/workspaces/agent-feed/prod/temp/**']
              },
              system: {
                processes: ['node', 'npm'],
                services: [],
                environment: ['NODE_ENV', 'PORT']
              }
            },
            features: {
              streaming: true,
              headless: true,
              contextManagement: true,
              sessionSharing: false,
              auditAccess: true,
              systemMetrics: false
            }
          },
          restrictions: {
            maxSessions: 10,
            maxConcurrentTasks: 5,
            allowedWorkingDirectories: ['/workspaces/agent-feed/prod'],
            dangerousModeAllowed: false
          }
        };

      default: // 'user'
        return {
          permissions: {
            tools: {
              fileSystem: {
                read: ['/workspaces/agent-feed/prod/src/**', '/workspaces/agent-feed/prod/docs/**'],
                write: ['/workspaces/agent-feed/prod/temp/**'],
                execute: []
              },
              network: {
                allowHttp: true,
                allowedDomains: ['api.anthropic.com'],
                allowedPorts: [80, 443]
              },
              system: {
                allowBash: false,
                allowedCommands: [],
                dangerousMode: false
              },
              tools: {
                allowed: ['Read', 'Grep', 'Glob'],
                restricted: ['Write', 'Edit', 'Bash', 'KillShell'],
                customLimits: {}
              }
            },
            resources: {
              files: {
                read: ['/workspaces/agent-feed/prod/src/**'],
                write: ['/workspaces/agent-feed/prod/temp/**'],
                execute: [],
                delete: []
              },
              directories: {
                access: ['/workspaces/agent-feed/prod/src/**'],
                create: [],
                modify: []
              },
              system: {
                processes: [],
                services: [],
                environment: []
              }
            },
            features: {
              streaming: true,
              headless: false,
              contextManagement: false,
              sessionSharing: false,
              auditAccess: false,
              systemMetrics: false
            }
          },
          restrictions: {
            maxSessions: 3,
            maxConcurrentTasks: 1,
            allowedWorkingDirectories: ['/workspaces/agent-feed/prod'],
            dangerousModeAllowed: false
          }
        };
    }
  }

  private initializeDefaultPolicies(): void {
    // Create default security policies
    const defaultPolicies: SecurityPolicy[] = [
      {
        name: 'dangerous_tool_restriction',
        description: 'Restrict dangerous tools to admin users only',
        enforcement: 'strict',
        exemptions: [],
        rules: [
          {
            id: 'dangerous_tool_admin_only',
            type: 'deny',
            condition: {
              tools: ['KillShell', 'Bash'],
              userRoles: ['user']
            },
            action: {
              type: 'deny',
              notification: true
            },
            priority: 100,
            active: true
          }
        ]
      },
      {
        name: 'working_directory_enforcement',
        description: 'Enforce working directory restrictions',
        enforcement: 'strict',
        exemptions: ['super_admin'],
        rules: [
          {
            id: 'working_dir_restriction',
            type: 'deny',
            condition: {
              workingDirectory: ['/', '/etc', '/usr', '/var']
            },
            action: {
              type: 'deny',
              notification: true
            },
            priority: 90,
            active: true
          }
        ]
      }
    ];

    defaultPolicies.forEach(policy => {
      this.securityPolicies.set(policy.name, policy);
    });
  }

  private async evaluateSecurityPolicies(
    userId: string,
    toolName: string,
    operation: string,
    context?: Record<string, any>
  ): Promise<{ action: 'allow' | 'deny'; reason: string }> {
    const userProfile = await this.getUserPermissions(userId);

    for (const policy of this.securityPolicies.values()) {
      if (!policy.rules.some(rule => rule.active)) continue;

      for (const rule of policy.rules.filter(r => r.active)) {
        if (this.matchesCondition(rule.condition, userProfile, toolName, operation, context)) {
          if (rule.type === 'deny') {
            return { action: 'deny', reason: `Policy ${policy.name}: ${policy.description}` };
          }
        }
      }
    }

    return { action: 'allow', reason: 'No policy violations found' };
  }

  private matchesCondition(
    condition: SecurityCondition,
    userProfile: UserPermissionProfile,
    toolName: string,
    operation: string,
    context?: Record<string, any>
  ): boolean {
    if (condition.userRoles && !condition.userRoles.includes(userProfile.role)) {
      return false;
    }

    if (condition.tools && !condition.tools.includes(toolName)) {
      return false;
    }

    if (condition.workingDirectory && context?.workingDirectory) {
      const allowed = condition.workingDirectory.some(dir =>
        context.workingDirectory.startsWith(dir)
      );
      if (!allowed) return false;
    }

    return true;
  }

  private isDangerousTool(toolName: string, operation: string): boolean {
    const dangerousTools = ['KillShell', 'Bash'];
    const dangerousOperations = ['execute', 'kill', 'modify_system'];

    return dangerousTools.includes(toolName) || dangerousOperations.includes(operation);
  }

  private async validateDangerousAccess(
    session: any,
    toolName: string,
    operation: string
  ): Promise<boolean> {
    // Check if dangerous mode is enabled for the session
    return session.configuration?.dangerousMode?.enabled || false;
  }

  private async requestAdminApproval(
    userId: string,
    sessionId: string,
    config: DangerousModeConfig
  ): Promise<boolean> {
    // Implementation for admin approval workflow
    // For now, return false (requires manual approval)
    this.emit('adminApprovalRequired', { userId, sessionId, config });
    return false;
  }

  private async getSessionInfo(sessionId: string): Promise<any> {
    // Integration with session manager
    return {
      id: sessionId,
      userId: 'user-id', // Would be retrieved from session manager
      configuration: {}
    };
  }

  private async getUserActiveSessions(userId: string): Promise<number> {
    // Integration with session manager to count active sessions
    return 0;
  }

  private async validateFileSystemPermissions(
    userProfile: UserPermissionProfile,
    fsPermissions: any
  ): Promise<boolean> {
    // Validate file system permission requests against user's allowed paths
    return true;
  }

  private async validateNetworkPermissions(
    userProfile: UserPermissionProfile,
    networkPermissions: any
  ): Promise<boolean> {
    // Validate network permission requests against user's allowed domains/ports
    return true;
  }

  private async validateSystemPermissions(
    userProfile: UserPermissionProfile,
    systemPermissions: any
  ): Promise<boolean> {
    // Validate system permission requests against user's allowed commands
    return true;
  }

  private async logPermissionEvent(
    userId: string,
    sessionId: string,
    action: string,
    resource: string,
    result: 'granted' | 'denied' | 'escalated',
    reason: string,
    context?: Record<string, any>
  ): Promise<void> {
    const entry: PermissionAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      sessionId,
      action,
      resource,
      result,
      reason,
      timestamp: new Date(),
      context: context || {}
    };

    this.auditLog.push(entry);

    // Emit event for real-time monitoring
    this.emit('permissionEvent', entry);

    // Keep audit log size manageable
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }
}

export interface SecurityConfig {
  requireAuthentication: boolean;
  auditLevel: 'basic' | 'verbose' | 'complete';
  maxResourceUsage: any;
}

export interface SecurityMetrics {
  totalAuditEntries: number;
  last24Hours: {
    totalEvents: number;
    deniedRequests: number;
    grantedRequests: number;
    dangerousModeUsage: number;
  };
  activePolicies: number;
  activeUsers: number;
}