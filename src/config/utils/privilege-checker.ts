/**
 * System Privilege Checker
 *
 * Determines if a user or process has the required privileges
 * to modify protected agent configurations.
 *
 * Security Model:
 * - System admins can update protected configs
 * - Regular users cannot modify protected configs
 * - Service accounts with ADMIN_TOKEN can update
 *
 * @module privilege-checker
 */

import { PermissionError } from '../errors/security-errors.js';

/**
 * Privilege levels
 */
export enum PrivilegeLevel {
  NONE = 0,
  USER = 1,
  ADMIN = 2,
  SYSTEM = 3,
}

/**
 * Privilege check result
 */
export interface PrivilegeCheckResult {
  hasPrivilege: boolean;
  level: PrivilegeLevel;
  reason?: string;
}

/**
 * System privilege checker
 */
export class PrivilegeChecker {
  /**
   * Check if current process has system admin privileges
   *
   * Checks:
   * 1. SYSTEM_ADMIN environment variable
   * 2. ADMIN_TOKEN environment variable
   * 3. Process UID (root = 0)
   */
  static isSystemAdmin(): boolean {
    // Check SYSTEM_ADMIN flag
    if (process.env.SYSTEM_ADMIN === 'true') {
      return true;
    }

    // Check for admin token
    if (process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN.length > 0) {
      return true;
    }

    // Check if running as root (Unix systems only)
    if (process.getuid && process.getuid() === 0) {
      return true;
    }

    return false;
  }

  /**
   * Check if user/token has specific privilege
   */
  static hasPrivilege(privilege: string, token?: string): PrivilegeCheckResult {
    // System admin bypass
    if (this.isSystemAdmin()) {
      return {
        hasPrivilege: true,
        level: PrivilegeLevel.SYSTEM,
        reason: 'System admin access',
      };
    }

    // Check token-based auth
    if (token) {
      const isValid = this.validateAdminToken(token);
      if (isValid) {
        return {
          hasPrivilege: true,
          level: PrivilegeLevel.ADMIN,
          reason: 'Valid admin token',
        };
      }
    }

    // No privileges found
    return {
      hasPrivilege: false,
      level: PrivilegeLevel.NONE,
      reason: 'Insufficient privileges',
    };
  }

  /**
   * Validate admin token
   */
  static validateAdminToken(token: string): boolean {
    const adminToken = process.env.ADMIN_TOKEN;

    if (!adminToken) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    return this.constantTimeCompare(token, adminToken);
  }

  /**
   * Require system admin privileges (throws if not met)
   */
  static requireSystemAdmin(action: string): void {
    if (!this.isSystemAdmin()) {
      throw new PermissionError(
        `Unauthorized: System admin privileges required for: ${action}`,
        'SYSTEM_ADMIN',
        process.env.USER || 'unknown'
      );
    }
  }

  /**
   * Require specific privilege (throws if not met)
   */
  static requirePrivilege(privilege: string, token?: string): void {
    const result = this.hasPrivilege(privilege, token);

    if (!result.hasPrivilege) {
      throw new PermissionError(
        `Unauthorized: ${privilege} privilege required`,
        privilege,
        process.env.USER || 'unknown'
      );
    }
  }

  /**
   * Get current privilege level
   */
  static getCurrentPrivilegeLevel(): PrivilegeLevel {
    if (this.isSystemAdmin()) {
      return PrivilegeLevel.SYSTEM;
    }

    // Check if authenticated user (basic check)
    if (process.env.USER && process.env.USER !== 'unknown') {
      return PrivilegeLevel.USER;
    }

    return PrivilegeLevel.NONE;
  }

  /**
   * Constant-time string comparison
   * Prevents timing attacks on token validation
   */
  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Check if running in development mode
   */
  static isDevelopmentMode(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
  }

  /**
   * Check if running in production mode
   */
  static isProductionMode(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Get environment info for audit logging
   */
  static getEnvironmentInfo(): Record<string, any> {
    return {
      user: process.env.USER || 'unknown',
      nodeEnv: process.env.NODE_ENV || 'unknown',
      hasAdminToken: !!process.env.ADMIN_TOKEN,
      hasSystemAdmin: process.env.SYSTEM_ADMIN === 'true',
      privilegeLevel: PrivilegeLevel[this.getCurrentPrivilegeLevel()],
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Decorator to require system admin privileges
 */
export function RequireSystemAdmin(action?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      PrivilegeChecker.requireSystemAdmin(action || propertyKey);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
