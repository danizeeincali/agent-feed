import { Request, Response, NextFunction } from 'express';
import { logger, securityLogger } from '@/utils/logger';
import { AppError } from '@/types';

/**
 * Admin Authentication Middleware
 *
 * Verifies that the authenticated user has administrator privileges
 * for protected configuration operations.
 *
 * Requirements:
 * - User must be authenticated (use authenticateToken middleware first)
 * - User email must contain 'admin' (temp solution - replace with role-based system)
 * - System privilege verification
 *
 * Returns 403 Forbidden for non-admin requests
 */
export const requireAdminAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      securityLogger.authFailure(
        'unknown',
        'admin-check',
        req.ip,
        'no_authenticated_user'
      );
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Check admin privileges
    // TODO: Replace with proper role-based access control (RBAC)
    if (!req.user.email.includes('admin') && !hasSystemPrivileges(req.user)) {
      securityLogger.authFailure(
        req.user.email,
        'admin-check',
        req.ip,
        'insufficient_privileges'
      );

      logger.warn('Admin access denied', {
        userId: req.user.id,
        email: req.user.email,
        ip: req.ip,
        path: req.path
      });

      res.status(403).json({
        success: false,
        error: 'Administrator privileges required',
        message: 'Only system administrators can access protected configurations'
      });
      return;
    }

    // Log successful admin access
    logger.info('Admin access granted', {
      userId: req.user.id,
      email: req.user.email,
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    logger.error('Admin authentication error', { error });
    res.status(500).json({
      success: false,
      error: 'Authentication verification failed'
    });
  }
};

/**
 * Verify System Privileges
 *
 * Additional privilege checks beyond email pattern matching.
 * Placeholder for future privilege verification system.
 */
function hasSystemPrivileges(user: Express.User): boolean {
  // TODO: Implement proper privilege system
  // For now, check additional admin indicators

  // Check if user has admin role (when role system is implemented)
  // if (user.role === 'admin' || user.role === 'superadmin') return true;

  // Check if user is in admin list (environment variable)
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  if (adminEmails.includes(user.email)) {
    return true;
  }

  return false;
}

/**
 * Require Super Admin
 *
 * Even stricter access control for critical operations
 * like rollbacks and config deletion.
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Check super admin privileges
    const superAdmins = process.env.SUPER_ADMIN_EMAILS?.split(',') || [];
    if (!superAdmins.includes(req.user.email)) {
      securityLogger.authFailure(
        req.user.email,
        'superadmin-check',
        req.ip,
        'insufficient_privileges'
      );

      logger.warn('Super admin access denied', {
        userId: req.user.id,
        email: req.user.email,
        ip: req.ip,
        path: req.path
      });

      res.status(403).json({
        success: false,
        error: 'Super administrator privileges required'
      });
      return;
    }

    logger.info('Super admin access granted', {
      userId: req.user.id,
      email: req.user.email,
      path: req.path
    });

    next();
  } catch (error) {
    logger.error('Super admin authentication error', { error });
    res.status(500).json({
      success: false,
      error: 'Authentication verification failed'
    });
  }
};

/**
 * Log Admin Action
 *
 * Middleware to log all admin actions for audit trail
 */
export const logAdminAction = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user) {
    logger.info('Admin action', {
      userId: req.user.id,
      email: req.user.email,
      action: `${req.method} ${req.path}`,
      ip: req.ip,
      body: req.body,
      timestamp: new Date().toISOString()
    });
  }
  next();
};
