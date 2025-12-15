/**
 * Protected Agent Configuration System - Main Exports
 *
 * Provides a complete solution for protecting critical agent configurations
 * with file-level security, runtime integrity checking, and tampering detection.
 *
 * @module config
 */

// Error types
export {
  ProtectedConfigError,
  SecurityError,
  IntegrityError,
  PermissionError,
  TamperingError,
  ValidationError,
  AgentNotFoundError,
  UnauthorizedError,
  isSecurityError,
  isIntegrityError,
  isTamperingError,
  formatSecurityError,
} from './errors/security-errors.js';

// Privilege checking
export {
  PrivilegeChecker,
  PrivilegeLevel,
  RequireSystemAdmin,
  type PrivilegeCheckResult,
} from './utils/privilege-checker.js';

// Protected config management
export {
  ProtectedConfigManager,
  type ProtectedConfig,
  type ConfigVersion,
  type ManagerOptions,
} from './managers/protected-config-manager.js';

// Tampering detection
export {
  TamperingDetector,
  createTamperingDetector,
  type SecurityAlert,
  type DetectorOptions,
} from './managers/tampering-detector.js';
