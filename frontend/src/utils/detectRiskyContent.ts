/**
 * Risk Detection Utility - Inverted Allow-List Model
 *
 * Detects potentially risky content in user posts before submission.
 * Works in conjunction with backend middleware for defense-in-depth.
 *
 * Detection Priority:
 * 1. Check safe zone first (agent_workspace) → NO WARNING
 * 2. Check blocked sibling directories → WARNING (blocked_directory)
 * 3. Check protected files in /prod/ → WARNING (protected_file)
 * 4. Check shell commands → WARNING (shell_command)
 * 5. Check destructive keywords → WARNING (destructive_operation)
 */

export interface RiskDetectionResult {
  isRisky: boolean;
  reason: 'blocked_directory' | 'protected_file' | 'shell_command' | 'destructive_operation' | null;
  pattern: string | null;
  description: string | null;
  category?: 'directory' | 'file' | 'command' | 'keyword' | 'safe_zone';
  safeZone?: string;
}

/**
 * Safe zone - no warnings for these paths
 */
const SAFE_ZONE_PATTERNS = [
  '/workspaces/agent-feed/prod/agent_workspace/',
  '/prod/agent_workspace/',
  'prod/agent_workspace/'
];

/**
 * Blocked sibling directories (read-only)
 */
const BLOCKED_DIRECTORIES = [
  {
    pattern: '/workspaces/agent-feed/frontend/',
    shortPattern: '/frontend/',
    description: 'Frontend source code (read-only)',
    name: 'Frontend'
  },
  {
    pattern: '/workspaces/agent-feed/api-server/',
    shortPattern: '/api-server/',
    description: 'Backend API code (read-only)',
    name: 'Backend'
  },
  {
    pattern: '/workspaces/agent-feed/src/',
    shortPattern: '/src/',
    description: 'Source code (read-only)',
    name: 'Source'
  },
  {
    pattern: '/workspaces/agent-feed/backend/',
    shortPattern: '/backend/',
    description: 'Backend code (read-only)',
    name: 'Backend'
  },
  {
    pattern: '/workspaces/agent-feed/node_modules/',
    shortPattern: '/node_modules/',
    description: 'Dependencies (read-only)',
    name: 'Dependencies'
  },
  {
    pattern: '/workspaces/agent-feed/.git/',
    shortPattern: '/.git/',
    description: 'Version control (read-only)',
    name: 'Git'
  },
  {
    pattern: '/workspaces/agent-feed/data/',
    shortPattern: '/data/',
    description: 'Database files (read-only)',
    name: 'Data'
  },
  {
    pattern: '/workspaces/agent-feed/database/',
    shortPattern: '/database/',
    description: 'Database (read-only)',
    name: 'Database'
  },
  {
    pattern: '/workspaces/agent-feed/config/',
    shortPattern: '/config/',
    description: 'Configuration (read-only)',
    name: 'Config'
  },
  {
    pattern: '/workspaces/agent-feed/tests/',
    shortPattern: '/tests/',
    description: 'Test files (read-only)',
    name: 'Tests'
  },
  {
    pattern: '/workspaces/agent-feed/.github/',
    shortPattern: '/.github/',
    description: 'GitHub workflows (read-only)',
    name: 'GitHub'
  }
];

/**
 * Protected files within /prod/ directory
 */
const PROTECTED_FILES_IN_PROD = [
  {
    pattern: '/workspaces/agent-feed/prod/package.json',
    shortPattern: 'prod/package.json',
    description: 'Package manifest (protected)',
    name: 'package.json'
  },
  {
    pattern: '/workspaces/agent-feed/prod/package-lock.json',
    shortPattern: 'prod/package-lock.json',
    description: 'Lock file (protected)',
    name: 'package-lock.json'
  },
  {
    pattern: '/workspaces/agent-feed/prod/.env',
    shortPattern: 'prod/.env',
    description: 'Environment secrets (protected)',
    name: '.env'
  },
  {
    pattern: '/workspaces/agent-feed/prod/.git/',
    shortPattern: 'prod/.git',
    description: 'Version control in prod (protected)',
    name: '.git'
  },
  {
    pattern: '/workspaces/agent-feed/prod/node_modules/',
    shortPattern: 'prod/node_modules',
    description: 'Dependencies in prod (protected)',
    name: 'node_modules'
  },
  {
    pattern: '/workspaces/agent-feed/prod/.gitignore',
    shortPattern: 'prod/.gitignore',
    description: 'Git ignore file (protected)',
    name: '.gitignore'
  },
  {
    pattern: '/workspaces/agent-feed/prod/tsconfig.json',
    shortPattern: 'prod/tsconfig.json',
    description: 'TypeScript config (protected)',
    name: 'tsconfig.json'
  },
  {
    pattern: '/workspaces/agent-feed/prod/vite.config',
    shortPattern: 'prod/vite.config',
    description: 'Vite config (protected)',
    name: 'vite.config'
  },
  {
    pattern: '/workspaces/agent-feed/prod/playwright.config',
    shortPattern: 'prod/playwright.config',
    description: 'Playwright config (protected)',
    name: 'playwright.config'
  },
  {
    pattern: '/workspaces/agent-feed/prod/vitest.config',
    shortPattern: 'prod/vitest.config',
    description: 'Vitest config (protected)',
    name: 'vitest.config'
  }
];

/**
 * Shell commands that may be destructive
 */
const SHELL_COMMANDS = [
  { pattern: 'rm ', description: 'Remove/delete command' },
  { pattern: 'rm -', description: 'Remove with flags command' },
  { pattern: 'mv ', description: 'Move/rename command' },
  { pattern: 'cp ', description: 'Copy command' },
  { pattern: 'sudo ', description: 'Superuser command' },
  { pattern: 'chmod ', description: 'Change permissions command' },
  { pattern: 'chown ', description: 'Change ownership command' },
  { pattern: 'kill ', description: 'Process termination command' },
  { pattern: 'pkill ', description: 'Process kill command' },
  { pattern: 'systemctl ', description: 'System control command' },
  { pattern: 'service ', description: 'Service management command' }
];

/**
 * Destructive keywords
 */
const DESTRUCTIVE_KEYWORDS = [
  { pattern: 'delete file', description: 'File deletion operation' },
  { pattern: 'remove file', description: 'File removal operation' },
  { pattern: 'destroy ', description: 'Destructive operation' },
  { pattern: 'drop table', description: 'Database table deletion' },
  { pattern: 'drop database', description: 'Database deletion' }
];

/**
 * Check if text contains a path pattern with proper boundaries
 * Prevents false positives like "frontend" in normal text
 */
function containsPathPattern(text: string, pattern: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerPattern = pattern.toLowerCase();
  const index = lowerText.indexOf(lowerPattern);

  if (index === -1) {
    return false;
  }

  // Check character before pattern
  if (index > 0) {
    const charBefore = lowerText[index - 1];
    // Must be space, quote, or path separator
    if (!/[\s"'\/\\]/.test(charBefore)) {
      return false; // Part of a word, not a path
    }
  }

  // Check character after pattern
  const endIndex = index + lowerPattern.length;
  if (endIndex < lowerText.length) {
    const charAfter = lowerText[endIndex];
    // Must be space, quote, path separator, or punctuation
    if (!/[\s"'\/\\,\.!?\])}]/.test(charAfter)) {
      return false; // Part of a word, not a path
    }
  }

  return true;
}

/**
 * Check if text contains safe zone path
 */
function containsSafeZonePath(textToCheck: string): boolean {
  for (const pattern of SAFE_ZONE_PATTERNS) {
    if (textToCheck.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Check if text contains blocked directory path
 */
function checkBlockedDirectories(textToCheck: string): RiskDetectionResult | null {
  for (const directory of BLOCKED_DIRECTORIES) {
    // Check full pattern first
    if (textToCheck.includes(directory.pattern.toLowerCase())) {
      return {
        isRisky: true,
        reason: 'blocked_directory',
        pattern: directory.pattern,
        description: directory.description,
        category: 'directory',
        safeZone: '/workspaces/agent-feed/prod/agent_workspace/'
      };
    }

    // Check short pattern with boundary checks to avoid false positives
    if (containsPathPattern(textToCheck, directory.shortPattern)) {
      return {
        isRisky: true,
        reason: 'blocked_directory',
        pattern: directory.shortPattern,
        description: directory.description,
        category: 'directory',
        safeZone: '/workspaces/agent-feed/prod/agent_workspace/'
      };
    }
  }

  return null;
}

/**
 * Check if text contains protected file in /prod/
 */
function checkProtectedFilesInProd(textToCheck: string): RiskDetectionResult | null {
  for (const file of PROTECTED_FILES_IN_PROD) {
    // Check full pattern
    if (textToCheck.includes(file.pattern.toLowerCase())) {
      return {
        isRisky: true,
        reason: 'protected_file',
        pattern: file.pattern,
        description: file.description,
        category: 'file',
        safeZone: '/workspaces/agent-feed/prod/agent_workspace/'
      };
    }

    // Check short pattern with boundary checks
    if (containsPathPattern(textToCheck, file.shortPattern)) {
      return {
        isRisky: true,
        reason: 'protected_file',
        pattern: file.shortPattern,
        description: file.description,
        category: 'file',
        safeZone: '/workspaces/agent-feed/prod/agent_workspace/'
      };
    }
  }

  return null;
}

/**
 * Check if text contains shell commands
 */
function checkShellCommands(textToCheck: string): RiskDetectionResult | null {
  for (const command of SHELL_COMMANDS) {
    if (textToCheck.includes(command.pattern.toLowerCase())) {
      return {
        isRisky: true,
        reason: 'shell_command',
        pattern: command.pattern,
        description: command.description,
        category: 'command',
        safeZone: '/workspaces/agent-feed/prod/agent_workspace/'
      };
    }
  }

  return null;
}

/**
 * Check if text contains destructive keywords
 */
function checkDestructiveKeywords(textToCheck: string): RiskDetectionResult | null {
  for (const keyword of DESTRUCTIVE_KEYWORDS) {
    if (textToCheck.includes(keyword.pattern.toLowerCase())) {
      return {
        isRisky: true,
        reason: 'destructive_operation',
        pattern: keyword.pattern,
        description: keyword.description,
        category: 'keyword',
        safeZone: '/workspaces/agent-feed/prod/agent_workspace/'
      };
    }
  }

  return null;
}

/**
 * Detect risky content in post text using inverted allow-list model
 *
 * Priority order:
 * 1. Safe zone check (highest priority - skip warnings)
 * 2. Blocked directories
 * 3. Protected files
 * 4. Shell commands
 * 5. Destructive keywords
 *
 * @param content - Post content
 * @param title - Post title
 * @returns Risk detection result
 */
export function detectRiskyContent(
  content: string,
  title: string
): RiskDetectionResult {
  try {
    const textToCheck = `${title} ${content}`.toLowerCase();

    // --- PRIORITY 1: Check Safe Zone First ---
    // If in safe zone, no warning needed
    if (containsSafeZonePath(textToCheck)) {
      return {
        isRisky: false,
        reason: null,
        pattern: null,
        description: null,
        category: 'safe_zone'
      };
    }

    // --- PRIORITY 2: Check Blocked Directories ---
    const blockedDirCheck = checkBlockedDirectories(textToCheck);
    if (blockedDirCheck) {
      return blockedDirCheck;
    }

    // --- PRIORITY 3: Check Protected Files in /prod/ ---
    const protectedFileCheck = checkProtectedFilesInProd(textToCheck);
    if (protectedFileCheck) {
      return protectedFileCheck;
    }

    // --- PRIORITY 4: Check Shell Commands ---
    const shellCommandCheck = checkShellCommands(textToCheck);
    if (shellCommandCheck) {
      return shellCommandCheck;
    }

    // --- PRIORITY 5: Check Destructive Keywords ---
    const destructiveCheck = checkDestructiveKeywords(textToCheck);
    if (destructiveCheck) {
      return destructiveCheck;
    }

    // No risky patterns found
    return {
      isRisky: false,
      reason: null,
      pattern: null,
      description: null
    };

  } catch (error) {
    // Fail open - don't block posts on detection errors
    console.error('Error detecting risky content:', error);
    return {
      isRisky: false,
      reason: null,
      pattern: null,
      description: null
    };
  }
}
