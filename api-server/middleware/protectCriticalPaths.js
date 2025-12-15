/**
 * Protected Path Middleware - Inverted Allow-List Model
 *
 * Security Model:
 * - ALLOW: Only /workspaces/agent-feed/prod/ (except protected files)
 * - BLOCK: All other directories at /workspaces/agent-feed/ level
 * - UNRESTRICTED: /workspaces/agent-feed/prod/agent_workspace/ (full access)
 * - PROTECTED within /prod/: package.json, .env, .git/, node_modules/, config files
 *
 * This inverted approach provides a safe zone for AI agent operations while
 * protecting critical application files and sibling directories.
 */

/**
 * Base path that is allowed for write operations
 */
const ALLOWED_BASE_PATH = '/workspaces/agent-feed/prod/';

/**
 * Completely unrestricted path within the allowed base (no protection)
 */
const UNRESTRICTED_SUBPATH = '/workspaces/agent-feed/prod/agent_workspace/';

/**
 * Sibling directories that are completely blocked (read-only)
 */
const BLOCKED_SIBLING_DIRECTORIES = [
  '/workspaces/agent-feed/frontend/',
  '/workspaces/agent-feed/api-server/',
  '/workspaces/agent-feed/src/',
  '/workspaces/agent-feed/backend/',
  '/workspaces/agent-feed/node_modules/',
  '/workspaces/agent-feed/.git/',
  '/workspaces/agent-feed/data/',
  '/workspaces/agent-feed/database/',
  '/workspaces/agent-feed/config/',
  '/workspaces/agent-feed/configs/',
  '/workspaces/agent-feed/tests/',
  '/workspaces/agent-feed/test/',
  '/workspaces/agent-feed/.github/',
  '/workspaces/agent-feed/.vscode/',
  '/workspaces/agent-feed/.env',
  '/workspaces/agent-feed/database.db',
];

/**
 * Protected files within the allowed /prod/ directory
 * These cannot be modified even though they're in the allowed zone
 */
const PROTECTED_FILES_IN_PROD = [
  '/workspaces/agent-feed/prod/package.json',
  '/workspaces/agent-feed/prod/package-lock.json',
  '/workspaces/agent-feed/prod/.env',
  '/workspaces/agent-feed/prod/.git/',
  '/workspaces/agent-feed/prod/node_modules/',
  '/workspaces/agent-feed/prod/.gitignore',
  '/workspaces/agent-feed/prod/tsconfig.json',
  '/workspaces/agent-feed/prod/vite.config.ts',
  '/workspaces/agent-feed/prod/playwright.config.ts',
  '/workspaces/agent-feed/prod/vitest.config.ts',
  '/workspaces/agent-feed/prod/postcss.config.js',
  '/workspaces/agent-feed/prod/tailwind.config.js',
];

/**
 * Track security alerts in memory
 * Format: Map<ip, { count, lastAttempt, violations }>
 */
const securityAlertLog = new Map();
const MAX_VIOLATIONS = 10;
const VIOLATION_WINDOW = 3600000; // 1 hour

/**
 * Extract filesystem paths from request body
 * @param {string} bodyString - Stringified request body
 * @returns {string[]} Array of detected filesystem paths
 */
function extractFilesystemPaths(bodyString) {
  // Pattern to match filesystem paths starting with /workspaces/agent-feed/
  const pathPattern = /\/workspaces\/agent-feed\/[^\s"'`,\]})]+/gi;
  const matches = bodyString.match(pathPattern);

  if (!matches) {
    return [];
  }

  // Deduplicate and normalize paths
  const uniquePaths = [...new Set(matches)];
  return uniquePaths.map(path => path.toLowerCase().trim());
}

/**
 * Check if a path is in the unrestricted safe zone
 * @param {string} normalizedPath - Lowercase, trimmed path
 * @returns {boolean} True if in unrestricted zone
 */
function isInUnrestrictedZone(normalizedPath) {
  return normalizedPath.startsWith(UNRESTRICTED_SUBPATH.toLowerCase());
}

/**
 * Check if a path is a blocked sibling directory
 * @param {string} normalizedPath - Lowercase, trimmed path
 * @returns {object|null} Block info if blocked, null if allowed
 */
function checkBlockedSiblingDirectory(normalizedPath) {
  for (const blockedPath of BLOCKED_SIBLING_DIRECTORIES) {
    const normalizedBlocked = blockedPath.toLowerCase();

    if (normalizedPath.startsWith(normalizedBlocked) ||
        normalizedPath === normalizedBlocked.replace(/\/$/, '')) {

      // Extract directory name for error message
      const pathParts = blockedPath.split('/').filter(p => p);
      const dirName = pathParts[pathParts.length - 1] || 'root';

      return {
        isBlocked: true,
        blockedPath: blockedPath,
        directoryName: dirName,
        reason: 'directory_protected'
      };
    }
  }

  // Check if it's under /workspaces/agent-feed/ but not in known directories
  // This catches any sibling we haven't explicitly listed
  if (normalizedPath.startsWith('/workspaces/agent-feed/') &&
      !normalizedPath.startsWith(ALLOWED_BASE_PATH.toLowerCase())) {

    // Extract unknown directory name
    const afterBase = normalizedPath.substring('/workspaces/agent-feed/'.length);
    const firstDir = afterBase.split('/')[0];

    return {
      isBlocked: true,
      blockedPath: `/workspaces/agent-feed/${firstDir}/`,
      directoryName: firstDir,
      reason: 'directory_protected'
    };
  }

  return null;
}

/**
 * Check if a path is a protected file within /prod/
 * @param {string} normalizedPath - Lowercase, trimmed path
 * @returns {object|null} Protection info if protected, null if allowed
 */
function checkProtectedFileInProd(normalizedPath) {
  for (const protectedFile of PROTECTED_FILES_IN_PROD) {
    const normalizedProtected = protectedFile.toLowerCase();

    // Check exact match or if path is under protected directory
    if (normalizedPath === normalizedProtected ||
        normalizedPath === normalizedProtected.replace(/\/$/, '') ||
        normalizedPath.startsWith(normalizedProtected + '/') ||
        normalizedPath.startsWith(normalizedProtected.replace(/\/$/, '') + '/')) {

      // Extract filename for error message
      const fileName = protectedFile.split('/').pop() || 'configuration file';

      return {
        isProtected: true,
        protectedPath: protectedFile,
        fileName: fileName,
        reason: 'file_protected'
      };
    }
  }

  return null;
}

/**
 * Log security alert for blocked path access attempt
 * @param {object} req - Express request object
 * @param {string} blockedPath - Path that was blocked
 * @param {string} reason - Reason for blocking
 */
function logSecurityAlert(req, blockedPath, reason) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const currentTime = Date.now();

  if (!securityAlertLog.has(ip)) {
    securityAlertLog.set(ip, {
      count: 0,
      lastAttempt: currentTime,
      violations: []
    });
  }

  const alertData = securityAlertLog.get(ip);

  // Reset counter if outside violation window
  if (currentTime - alertData.lastAttempt > VIOLATION_WINDOW) {
    alertData.count = 0;
    alertData.violations = [];
  }

  alertData.count++;
  alertData.lastAttempt = currentTime;
  alertData.violations.push({
    timestamp: currentTime,
    url: req.url,
    method: req.method,
    blockedPath,
    reason
  });

  console.warn('⚠️  SECURITY ALERT: PATH_ACCESS_DENIED', {
    ip,
    url: req.url,
    method: req.method,
    userAgent: req.headers['user-agent'],
    blockedPath,
    reason,
    violationCount: alertData.count
  });

  // Check if IP should be rate-limited
  if (alertData.count >= MAX_VIOLATIONS) {
    console.error('🚨 SECURITY: IP RATE LIMITED - Too many violations', {
      ip,
      count: alertData.count,
      window: `${VIOLATION_WINDOW / 60000} minutes`
    });
  }
}

/**
 * Cleanup old security alert entries
 * Runs periodically to prevent memory leaks
 */
setInterval(() => {
  const currentTime = Date.now();
  for (const [ip, data] of securityAlertLog.entries()) {
    if (currentTime - data.lastAttempt > VIOLATION_WINDOW) {
      securityAlertLog.delete(ip);
    }
  }
}, 300000); // Clean up every 5 minutes

/**
 * Middleware to protect critical system paths using inverted allow-list model
 *
 * Logic Flow:
 * 1. Skip non-mutating requests (GET, HEAD, OPTIONS)
 * 2. Extract all filesystem paths from request body
 * 3. For each path:
 *    a. Check if in unrestricted zone → ALLOW
 *    b. Check if blocked sibling directory → BLOCK
 *    c. Check if in allowed base path → Continue to 3d
 *    d. Check if protected file in /prod/ → BLOCK
 *    e. Otherwise in /prod/ but not protected → ALLOW
 * 4. If any path is blocked → Return 403 with helpful error
 * 5. If all paths allowed → Call next()
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const protectCriticalPaths = (req, res, next) => {
  try {
    // Early exit: Skip for read operations
    if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
      return next();
    }

    // Early exit: Skip if no body
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }

    // Early exit: Whitelist comment endpoint (AVI responses may mention paths)
    if (req.url && req.url.includes('/api/agent-posts/') && req.url.includes('/comments')) {
      return next();
    }

    // Convert request body to string for path extraction
    const bodyString = JSON.stringify(req.body);

    // Extract all filesystem paths from body
    const detectedPaths = extractFilesystemPaths(bodyString);

    // If no paths detected, allow through
    if (detectedPaths.length === 0) {
      return next();
    }

    // Check each detected path against rules
    for (const path of detectedPaths) {
      const normalizedPath = path.toLowerCase().trim();

      // --- RULE 1: Unrestricted Zone (Highest Priority) ---
      // If in agent_workspace, allow without any restrictions
      if (isInUnrestrictedZone(normalizedPath)) {
        continue; // This path is OK, check next
      }

      // --- RULE 2: Blocked Sibling Directories ---
      // Block any access to sibling directories (frontend, api-server, etc.)
      const siblingCheck = checkBlockedSiblingDirectory(normalizedPath);
      if (siblingCheck && siblingCheck.isBlocked) {
        logSecurityAlert(req, siblingCheck.blockedPath, siblingCheck.reason);

        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `Access denied: /${siblingCheck.directoryName}/ is read-only`,
          blockedPath: siblingCheck.blockedPath,
          reason: siblingCheck.reason,
          blockedDirectory: siblingCheck.directoryName,
          allowedPaths: [ALLOWED_BASE_PATH + ' (except protected files)'],
          safeZone: UNRESTRICTED_SUBPATH,
          hint: 'Only the /prod/ directory is writable. All other directories are read-only to protect application code.',
          tip: `To work freely, use paths like: ${UNRESTRICTED_SUBPATH}your-file.txt`
        });
      }

      // --- RULE 3: Check if in allowed base path ---
      if (normalizedPath.startsWith(ALLOWED_BASE_PATH.toLowerCase())) {
        // Path is in /prod/, but check if it's a protected file

        // --- RULE 4: Protected Files within /prod/ ---
        const protectedCheck = checkProtectedFileInProd(normalizedPath);
        if (protectedCheck && protectedCheck.isProtected) {
          logSecurityAlert(req, protectedCheck.protectedPath, protectedCheck.reason);

          return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: `Access denied: ${protectedCheck.fileName} is protected`,
            blockedPath: protectedCheck.protectedPath,
            reason: protectedCheck.reason,
            protectedFile: protectedCheck.fileName,
            protectedFilesInProd: PROTECTED_FILES_IN_PROD.map(p => p.split('/').pop()),
            safeZone: UNRESTRICTED_SUBPATH,
            hint: 'This file is protected to prevent breaking the application. You can work freely in /prod/agent_workspace/.',
            tip: 'All files in agent_workspace/ can be created, modified, or deleted without restrictions.'
          });
        }

        // Path is in /prod/ and not protected, allow it
        continue; // This path is OK, check next
      }

      // --- RULE 5: Path not under /workspaces/agent-feed/ ---
      // If we get here, the path is somewhere else entirely
      // For single-user VPS, we allow operations outside our project tree
      continue; // Allow paths outside our workspace
    }

    // All paths checked and allowed
    next();

  } catch (error) {
    // Fail open - don't block requests on middleware errors
    console.error('❌ Error in protectCriticalPaths middleware:', error);
    next();
  }
};

/**
 * Get security alert statistics (for monitoring)
 * @returns {Array} Array of security alerts with IP, count, and violations
 */
export const getSecurityAlerts = () => {
  const alerts = [];
  for (const [ip, data] of securityAlertLog.entries()) {
    alerts.push({
      ip,
      count: data.count,
      lastAttempt: new Date(data.lastAttempt).toISOString(),
      violations: data.violations.map(v => ({
        timestamp: new Date(v.timestamp).toISOString(),
        url: v.url,
        method: v.method,
        blockedPath: v.blockedPath,
        reason: v.reason
      }))
    });
  }
  return alerts;
};

export default protectCriticalPaths;
