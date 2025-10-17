/**
 * Security Error Classes for Protected Agent Configuration System
 *
 * Defines custom error types for security-related failures:
 * - SecurityError: Base security error
 * - IntegrityError: Checksum mismatch
 * - PermissionError: Insufficient privileges
 * - TamperingError: Tampering detected
 *
 * @module security-errors
 */

/**
 * Base error class for protected configuration system
 */
export class ProtectedConfigError extends Error {
  constructor(message: string, public context?: Record<string, any>) {
    super(message);
    this.name = 'ProtectedConfigError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Base security error - used for general security violations
 */
export class SecurityError extends ProtectedConfigError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
    this.name = 'SecurityError';
  }
}

/**
 * Integrity error - thrown when checksum validation fails
 */
export class IntegrityError extends SecurityError {
  constructor(
    message: string,
    public expectedChecksum: string,
    public actualChecksum: string,
    public filePath?: string
  ) {
    super(message, {
      expectedChecksum,
      actualChecksum,
      filePath,
    });
    this.name = 'IntegrityError';
  }
}

/**
 * Permission error - thrown when user lacks required privileges
 */
export class PermissionError extends SecurityError {
  constructor(
    message: string,
    public requiredPrivilege?: string,
    public userId?: string
  ) {
    super(message, {
      requiredPrivilege,
      userId,
    });
    this.name = 'PermissionError';
  }
}

/**
 * Tampering error - thrown when unauthorized modification detected
 */
export class TamperingError extends SecurityError {
  constructor(
    message: string,
    public filePath: string,
    public detectedAt: Date = new Date()
  ) {
    super(message, {
      filePath,
      detectedAt: detectedAt.toISOString(),
    });
    this.name = 'TamperingError';
  }
}

/**
 * Validation error - thrown when schema validation fails
 */
export class ValidationError extends ProtectedConfigError {
  constructor(message: string, public errors?: any[]) {
    super(message, { errors });
    this.name = 'ValidationError';
  }
}

/**
 * Agent not found error
 */
export class AgentNotFoundError extends ProtectedConfigError {
  constructor(public agentName: string) {
    super(`Agent not found: ${agentName}`, { agentName });
    this.name = 'AgentNotFoundError';
  }
}

/**
 * Unauthorized error - thrown when authentication fails
 */
export class UnauthorizedError extends SecurityError {
  constructor(message: string, public action?: string) {
    super(message, { action });
    this.name = 'UnauthorizedError';
  }
}

/**
 * Type guard to check if error is a security error
 */
export function isSecurityError(error: any): error is SecurityError {
  return error instanceof SecurityError;
}

/**
 * Type guard to check if error is an integrity error
 */
export function isIntegrityError(error: any): error is IntegrityError {
  return error instanceof IntegrityError;
}

/**
 * Type guard to check if error is a tampering error
 */
export function isTamperingError(error: any): error is TamperingError {
  return error instanceof TamperingError;
}

/**
 * Format error for logging
 */
export function formatSecurityError(error: SecurityError): Record<string, any> {
  return {
    name: error.name,
    message: error.message,
    context: error.context,
    timestamp: new Date().toISOString(),
    stack: error.stack,
  };
}
