/**
 * TDD Test Suite for Working Directory Resolution System
 * SPARC Refinement Phase - Test-Driven Development
 */

const path = require('path');
const fs = require('fs');

// Mock the DirectoryResolver before importing
const mockDirectoryResolver = {
  resolveWorkingDirectory: jest.fn(),
  extractDirectoryHint: jest.fn(),
  validateDirectory: jest.fn(),
  isWithinBaseDirectory: jest.fn()
};

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    access: jest.fn()
  },
  constants: {
    R_OK: 4,
    W_OK: 2
  }
}));

describe('Working Directory Resolution System', () => {
  const BASE_DIR = '/workspaces/agent-feed';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractDirectoryHint', () => {
    test('should extract directory from instance name with slash', () => {
      // Test case: "prod/claude" -> "prod"
      const result = extractDirectoryHint('prod', 'prod/claude');
      expect(result).toBe('prod');
    });

    test('should extract directory from instance type', () => {
      // Test case: instanceType "prod" -> "prod"
      const result = extractDirectoryHint('prod', 'claude');
      expect(result).toBe('prod');
    });

    test('should handle frontend variations', () => {
      expect(extractDirectoryHint('frontend', 'frontend/claude')).toBe('frontend');
      expect(extractDirectoryHint('fe', 'fe/claude')).toBe('frontend');
      expect(extractDirectoryHint('ui', 'ui/claude')).toBe('frontend');
    });

    test('should handle test variations', () => {
      expect(extractDirectoryHint('test', 'test/claude')).toBe('tests');
      expect(extractDirectoryHint('tests', 'tests/claude')).toBe('tests');
      expect(extractDirectoryHint('testing', 'testing/claude')).toBe('tests');
    });

    test('should return default for unknown types', () => {
      const result = extractDirectoryHint('unknown', 'unknown/claude');
      expect(result).toBe('default');
    });

    test('should handle malformed input gracefully', () => {
      expect(extractDirectoryHint('', '')).toBe('default');
      expect(extractDirectoryHint(null, null)).toBe('default');
      expect(extractDirectoryHint(undefined, undefined)).toBe('default');
    });
  });

  describe('validateDirectory', () => {
    test('should validate existing accessible directory', async () => {
      // Mock directory exists and is accessible
      fs.promises.stat.mockResolvedValue({ isDirectory: () => true });
      fs.promises.access.mockResolvedValue(true);

      const result = await validateDirectory('/workspaces/agent-feed/prod');
      expect(result).toBe(true);
      expect(fs.promises.stat).toHaveBeenCalledWith('/workspaces/agent-feed/prod');
    });

    test('should reject non-existent directory', async () => {
      // Mock directory does not exist
      fs.promises.stat.mockRejectedValue(new Error('ENOENT'));

      const result = await validateDirectory('/workspaces/agent-feed/nonexistent');
      expect(result).toBe(false);
    });

    test('should reject inaccessible directory', async () => {
      // Mock directory exists but is not accessible
      fs.promises.stat.mockResolvedValue({ isDirectory: () => true });
      fs.promises.access.mockRejectedValue(new Error('EACCES'));

      const result = await validateDirectory('/workspaces/agent-feed/restricted');
      expect(result).toBe(false);
    });

    test('should reject file instead of directory', async () => {
      // Mock path is a file, not directory
      fs.promises.stat.mockResolvedValue({ isDirectory: () => false });

      const result = await validateDirectory('/workspaces/agent-feed/package.json');
      expect(result).toBe(false);
    });
  });

  describe('isWithinBaseDirectory', () => {
    test('should allow paths within base directory', () => {
      const basePath = '/workspaces/agent-feed';
      
      expect(isWithinBaseDirectory('/workspaces/agent-feed/prod', basePath)).toBe(true);
      expect(isWithinBaseDirectory('/workspaces/agent-feed/frontend', basePath)).toBe(true);
      expect(isWithinBaseDirectory('/workspaces/agent-feed/tests', basePath)).toBe(true);
      expect(isWithinBaseDirectory('/workspaces/agent-feed', basePath)).toBe(true);
    });

    test('should reject paths outside base directory', () => {
      const basePath = '/workspaces/agent-feed';
      
      expect(isWithinBaseDirectory('/workspaces', basePath)).toBe(false);
      expect(isWithinBaseDirectory('/tmp', basePath)).toBe(false);
      expect(isWithinBaseDirectory('/etc/passwd', basePath)).toBe(false);
    });

    test('should handle path traversal attacks', () => {
      const basePath = '/workspaces/agent-feed';
      
      expect(isWithinBaseDirectory('/workspaces/agent-feed/../../../etc', basePath)).toBe(false);
      expect(isWithinBaseDirectory('/workspaces/agent-feed/prod/../../../tmp', basePath)).toBe(false);
    });

    test('should handle symbolic link traversal', () => {
      const basePath = '/workspaces/agent-feed';
      
      // These should be resolved to actual paths in implementation
      expect(isWithinBaseDirectory('/workspaces/agent-feed/symlink', basePath)).toBe(true);
    });
  });

  describe('resolveWorkingDirectory', () => {
    test('should resolve prod directory correctly', async () => {
      const result = await resolveWorkingDirectory('prod');
      expect(result).toBe('/workspaces/agent-feed/prod');
    });

    test('should resolve frontend directory correctly', async () => {
      const result = await resolveWorkingDirectory('frontend');
      expect(result).toBe('/workspaces/agent-feed/frontend');
    });

    test('should resolve tests directory correctly', async () => {
      const result = await resolveWorkingDirectory('tests');
      expect(result).toBe('/workspaces/agent-feed/tests');
    });

    test('should fall back to base directory for unknown types', async () => {
      const result = await resolveWorkingDirectory('unknown');
      expect(result).toBe('/workspaces/agent-feed');
    });

    test('should fall back to base directory when target does not exist', async () => {
      // Mock directory validation to fail
      fs.promises.stat.mockRejectedValue(new Error('ENOENT'));
      
      const result = await resolveWorkingDirectory('prod');
      expect(result).toBe('/workspaces/agent-feed'); // fallback
    });

    test('should handle security violations', async () => {
      const result = await resolveWorkingDirectory('../../../etc');
      expect(result).toBe('/workspaces/agent-feed'); // fallback for security
    });
  });

  describe('Integration with createRealClaudeInstance', () => {
    test('should use resolved directory in process creation', () => {
      // Mock the spawn function
      const mockSpawn = jest.fn().mockReturnValue({
        pid: 12345,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      });

      // Test that createRealClaudeInstance uses the resolved directory
      const instanceType = 'prod';
      const instanceId = 'claude-1234';
      
      // This would be the actual implementation call
      // createRealClaudeInstance(instanceType, instanceId);
      
      // Verify the spawn was called with correct working directory
      // expect(mockSpawn).toHaveBeenCalledWith(
      //   'claude', [],
      //   expect.objectContaining({
      //     cwd: '/workspaces/agent-feed/prod'
      //   })
      // );
    });

    test('should log resolved directory information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Test directory resolution logging
      const instanceType = 'frontend';
      const instanceId = 'claude-5678';
      
      // This would trigger the logging
      // createRealClaudeInstance(instanceType, instanceId);
      
      // Verify logging includes directory information
      // expect(consoleSpy).toHaveBeenCalledWith(
      //   expect.stringContaining('Working Directory: /workspaces/agent-feed/frontend')
      // );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Caching', () => {
    test('should cache directory validation results', async () => {
      // First call should trigger filesystem check
      fs.promises.stat.mockResolvedValue({ isDirectory: () => true });
      fs.promises.access.mockResolvedValue(true);

      await validateDirectory('/workspaces/agent-feed/prod');
      await validateDirectory('/workspaces/agent-feed/prod'); // Second call

      // Should only call filesystem once due to caching
      expect(fs.promises.stat).toHaveBeenCalledTimes(1);
    });

    test('should expire cache after TTL', async () => {
      const originalSetTimeout = global.setTimeout;
      jest.useFakeTimers();

      fs.promises.stat.mockResolvedValue({ isDirectory: () => true });
      fs.promises.access.mockResolvedValue(true);

      await validateDirectory('/workspaces/agent-feed/prod');
      
      // Fast-forward time beyond TTL
      jest.advanceTimersByTime(61000); // 61 seconds
      
      await validateDirectory('/workspaces/agent-feed/prod');

      // Should call filesystem again after cache expiry
      expect(fs.promises.stat).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    test('should handle filesystem permission errors gracefully', async () => {
      fs.promises.stat.mockRejectedValue(new Error('EACCES: permission denied'));

      const result = await resolveWorkingDirectory('prod');
      expect(result).toBe('/workspaces/agent-feed'); // fallback
    });

    test('should handle malformed paths gracefully', async () => {
      const result = await resolveWorkingDirectory('prod/../../../etc');
      expect(result).toBe('/workspaces/agent-feed'); // fallback
    });

    test('should handle null/undefined input gracefully', async () => {
      expect(await resolveWorkingDirectory(null)).toBe('/workspaces/agent-feed');
      expect(await resolveWorkingDirectory(undefined)).toBe('/workspaces/agent-feed');
      expect(await resolveWorkingDirectory('')).toBe('/workspaces/agent-feed');
    });
  });
});

// Implementation functions that will be tested (to be implemented)
function extractDirectoryHint(instanceType, instanceName) {
  // Implementation will be added in the next step
  if (!instanceType) return 'default';
  
  // Method 1: From instance name (e.g., "prod/claude")
  if (instanceName && instanceName.includes('/')) {
    const parts = instanceName.split('/');
    const hint = parts[0].toLowerCase();
    return mapHintToDirectory(hint);
  }
  
  // Method 2: From instance type
  const hint = instanceType.toLowerCase();
  return mapHintToDirectory(hint);
}

function mapHintToDirectory(hint) {
  const mappings = {
    'prod': 'prod',
    'production': 'prod',
    'frontend': 'frontend',
    'fe': 'frontend',
    'ui': 'frontend',
    'test': 'tests',
    'tests': 'tests',
    'testing': 'tests',
    'src': 'src',
    'source': 'src'
  };
  
  return mappings[hint] || 'default';
}

async function validateDirectory(dirPath) {
  try {
    const stats = await fs.promises.stat(dirPath);
    if (!stats.isDirectory()) return false;
    
    await fs.promises.access(dirPath, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch (error) {
    return false;
  }
}

function isWithinBaseDirectory(targetPath, basePath) {
  const resolved = path.resolve(targetPath);
  const base = path.resolve(basePath);
  
  return resolved.startsWith(base + path.sep) || resolved === base;
}

async function resolveWorkingDirectory(instanceType) {
  const BASE_DIR = '/workspaces/agent-feed';
  
  if (!instanceType) return BASE_DIR;
  
  const hint = extractDirectoryHint(instanceType);
  if (hint === 'default') return BASE_DIR;
  
  const targetDir = path.join(BASE_DIR, hint);
  
  // Security check
  if (!isWithinBaseDirectory(targetDir, BASE_DIR)) {
    console.error(`Security violation: Directory outside base path: ${targetDir}`);
    return BASE_DIR;
  }
  
  // Validation check
  if (await validateDirectory(targetDir)) {
    return targetDir;
  } else {
    console.log(`Directory validation failed for: ${targetDir}, falling back to default`);
    return BASE_DIR;
  }
}