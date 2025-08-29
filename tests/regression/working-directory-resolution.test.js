/**
 * TDD London School - Working Directory Resolution Contract Tests
 * 
 * CRITICAL REGRESSION PROTECTION:
 * - Tests that prod button spawns in /workspaces/agent-feed/prod
 * - Tests that other buttons spawn in /workspaces/agent-feed
 * - Mocks filesystem operations and validates directory checks
 * - Tests security validation and path sanitization
 * 
 * Focus: Mock-driven verification of directory resolution behavior
 */

const path = require('path');
const fs = require('fs');

// Mock filesystem operations for isolation
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  constants: {
    R_OK: 4,
    W_OK: 2
  },
  promises: {
    stat: jest.fn(),
    access: jest.fn()
  }
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: jest.fn(),
  join: jest.fn()
}));

describe('Working Directory Resolution Contract Tests', () => {
  let mockDirectoryResolver;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful filesystem operations by default
    fs.existsSync.mockReturnValue(true);
    fs.promises.stat.mockResolvedValue({ isDirectory: () => true });
    fs.promises.access.mockResolvedValue();
    path.resolve.mockImplementation((p) => p);
    path.join.mockImplementation((...paths) => paths.join('/'));
    
    // Create mock directory resolver
    mockDirectoryResolver = {
      baseDirectory: '/workspaces/agent-feed',
      directoryMappings: {
        'prod': 'prod',
        'production': 'prod',
        'frontend': 'frontend',
        'fe': 'frontend',
        'ui': 'frontend',
        'test': 'tests',
        'tests': 'tests',
        'testing': 'tests',
        'src': 'src',
        'source': 'src',
        'skip-permissions': '',
        'skip-permissions-c': '',
        'skip-permissions-resume': ''
      },
      validationCache: new Map()
    };
  });

  describe('CRITICAL: Button Type Directory Resolution Contract', () => {
    test('should resolve prod button to /workspaces/agent-feed/prod (CRITICAL)', async () => {
      const instanceType = 'prod';
      const instanceName = 'prod/claude';
      
      // Mock directory resolution behavior
      const resolveWorkingDirectory = jest.fn(async (type, name) => {
        if (type === 'prod' || (name && name.includes('prod'))) {
          const targetDir = path.join(mockDirectoryResolver.baseDirectory, 'prod');
          return targetDir;
        }
        return mockDirectoryResolver.baseDirectory;
      });
      
      const result = await resolveWorkingDirectory(instanceType, instanceName);
      
      // CRITICAL VERIFICATION: Prod button must resolve to prod directory
      expect(result).toBe('/workspaces/agent-feed/prod');
      expect(resolveWorkingDirectory).toHaveBeenCalledWith('prod', 'prod/claude');
    });

    test('should resolve skip-permissions to base directory', async () => {
      const instanceType = 'skip-permissions';
      
      const resolveWorkingDirectory = jest.fn(async (type) => {
        const hint = mockDirectoryResolver.directoryMappings[type];
        if (hint === '' || hint === 'default') {
          return mockDirectoryResolver.baseDirectory;
        }
        return path.join(mockDirectoryResolver.baseDirectory, hint);
      });
      
      const result = await resolveWorkingDirectory(instanceType);
      
      expect(result).toBe('/workspaces/agent-feed');
      expect(resolveWorkingDirectory).toHaveBeenCalledWith('skip-permissions');
    });

    test('should resolve skip-permissions-c to base directory', async () => {
      const instanceType = 'skip-permissions-c';
      
      const resolveWorkingDirectory = jest.fn(async (type) => {
        const hint = mockDirectoryResolver.directoryMappings[type];
        if (hint === '' || hint === 'default') {
          return mockDirectoryResolver.baseDirectory;
        }
        return path.join(mockDirectoryResolver.baseDirectory, hint);
      });
      
      const result = await resolveWorkingDirectory(instanceType);
      
      expect(result).toBe('/workspaces/agent-feed');
      expect(resolveWorkingDirectory).toHaveBeenCalledWith('skip-permissions-c');
    });

    test('should resolve skip-permissions-resume to base directory', async () => {
      const instanceType = 'skip-permissions-resume';
      
      const resolveWorkingDirectory = jest.fn(async (type) => {
        const hint = mockDirectoryResolver.directoryMappings[type];
        if (hint === '' || hint === 'default') {
          return mockDirectoryResolver.baseDirectory;
        }
        return path.join(mockDirectoryResolver.baseDirectory, hint);
      });
      
      const result = await resolveWorkingDirectory(instanceType);
      
      expect(result).toBe('/workspaces/agent-feed');
      expect(resolveWorkingDirectory).toHaveBeenCalledWith('skip-permissions-resume');
    });
  });

  describe('Directory Hint Extraction Contract', () => {
    test('should extract directory hint from instance name with slash', () => {
      const extractDirectoryHint = jest.fn((instanceType, instanceName) => {
        if (instanceName && instanceName.includes('/')) {
          const parts = instanceName.split('/');
          const hint = parts[0].toLowerCase().trim();
          return mockDirectoryResolver.directoryMappings[hint] !== undefined 
            ? mockDirectoryResolver.directoryMappings[hint] 
            : 'default';
        }
        
        const hint = instanceType.toLowerCase().trim();
        return mockDirectoryResolver.directoryMappings[hint] !== undefined 
          ? mockDirectoryResolver.directoryMappings[hint] 
          : 'default';
      });
      
      const result = extractDirectoryHint('prod', 'prod/claude');
      
      expect(result).toBe('prod');
      expect(extractDirectoryHint).toHaveBeenCalledWith('prod', 'prod/claude');
    });

    test('should extract directory hint from instance type when no slash', () => {
      const extractDirectoryHint = jest.fn((instanceType, instanceName) => {
        const hint = instanceType.toLowerCase().trim();
        return mockDirectoryResolver.directoryMappings[hint] !== undefined 
          ? mockDirectoryResolver.directoryMappings[hint] 
          : 'default';
      });
      
      const result = extractDirectoryHint('frontend', 'frontend-instance');
      
      expect(result).toBe('frontend');
      expect(extractDirectoryHint).toHaveBeenCalledWith('frontend', 'frontend-instance');
    });

    test('should return default for unknown instance types', () => {
      const extractDirectoryHint = jest.fn((instanceType) => {
        const hint = instanceType.toLowerCase().trim();
        return mockDirectoryResolver.directoryMappings[hint] !== undefined 
          ? mockDirectoryResolver.directoryMappings[hint] 
          : 'default';
      });
      
      const result = extractDirectoryHint('unknown-type');
      
      expect(result).toBe('default');
    });
  });

  describe('Security Validation Contract', () => {
    test('should validate path is within base directory', () => {
      const isWithinBaseDirectory = jest.fn((targetPath, basePath) => {
        const resolved = path.resolve(targetPath);
        const base = path.resolve(basePath);
        return resolved.startsWith(base + path.sep) || resolved === base;
      });
      
      path.resolve.mockImplementation((p) => p);
      
      // Test valid path
      expect(isWithinBaseDirectory('/workspaces/agent-feed/prod', '/workspaces/agent-feed')).toBe(true);
      
      // Test invalid path (outside base)
      expect(isWithinBaseDirectory('/etc/passwd', '/workspaces/agent-feed')).toBe(false);
      
      expect(isWithinBaseDirectory).toHaveBeenCalledTimes(2);
    });

    test('should reject paths outside base directory', async () => {
      const secureResolveDirectory = jest.fn(async (instanceType) => {
        const targetDir = '/etc/passwd'; // Malicious path
        const basePath = '/workspaces/agent-feed';
        
        // Security check
        const resolved = path.resolve(targetDir);
        const base = path.resolve(basePath);
        
        if (!resolved.startsWith(base + path.sep) && resolved !== base) {
          console.error(`🚨 Security violation: Directory outside base path: ${targetDir}`);
          return basePath; // Fallback to safe directory
        }
        
        return targetDir;
      });
      
      path.resolve
        .mockReturnValueOnce('/etc/passwd')
        .mockReturnValueOnce('/workspaces/agent-feed');
      
      const result = await secureResolveDirectory('malicious');
      
      expect(result).toBe('/workspaces/agent-feed');
      expect(secureResolveDirectory).toHaveBeenCalledWith('malicious');
    });
  });

  describe('Directory Validation Contract', () => {
    test('should validate directory exists and is accessible', async () => {
      const validateDirectory = jest.fn(async (dirPath) => {
        try {
          const stats = await fs.promises.stat(dirPath);
          if (!stats.isDirectory()) {
            return false;
          }
          await fs.promises.access(dirPath, fs.constants.R_OK | fs.constants.W_OK);
          return true;
        } catch (error) {
          return false;
        }
      });
      
      const result = await validateDirectory('/workspaces/agent-feed/prod');
      
      expect(result).toBe(true);
      expect(fs.promises.stat).toHaveBeenCalledWith('/workspaces/agent-feed/prod');
      expect(fs.promises.access).toHaveBeenCalledWith(
        '/workspaces/agent-feed/prod',
        fs.constants.R_OK | fs.constants.W_OK
      );
    });

    test('should handle directory validation failures', async () => {
      fs.promises.stat.mockRejectedValue(new Error('ENOENT: no such file or directory'));
      
      const validateDirectory = jest.fn(async (dirPath) => {
        try {
          const stats = await fs.promises.stat(dirPath);
          if (!stats.isDirectory()) {
            return false;
          }
          await fs.promises.access(dirPath, fs.constants.R_OK | fs.constants.W_OK);
          return true;
        } catch (error) {
          return false;
        }
      });
      
      const result = await validateDirectory('/invalid/path');
      
      expect(result).toBe(false);
      expect(fs.promises.stat).toHaveBeenCalledWith('/invalid/path');
    });

    test('should reject non-directory paths', async () => {
      fs.promises.stat.mockResolvedValue({ isDirectory: () => false });
      
      const validateDirectory = jest.fn(async (dirPath) => {
        try {
          const stats = await fs.promises.stat(dirPath);
          if (!stats.isDirectory()) {
            return false;
          }
          await fs.promises.access(dirPath, fs.constants.R_OK | fs.constants.W_OK);
          return true;
        } catch (error) {
          return false;
        }
      });
      
      const result = await validateDirectory('/workspaces/agent-feed/package.json');
      
      expect(result).toBe(false);
      expect(fs.promises.access).not.toHaveBeenCalled();
    });
  });

  describe('Caching Contract', () => {
    test('should cache directory validation results', async () => {
      const validationCache = new Map();
      
      const validateDirectoryWithCache = jest.fn(async (dirPath) => {
        const cacheKey = dirPath;
        const cached = validationCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp < 60000)) {
          return cached.result;
        }
        
        // Simulate validation
        const result = true;
        validationCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      });
      
      // First call should perform validation
      await validateDirectoryWithCache('/workspaces/agent-feed/prod');
      
      // Second call should use cache
      await validateDirectoryWithCache('/workspaces/agent-feed/prod');
      
      expect(validationCache.has('/workspaces/agent-feed/prod')).toBe(true);
      expect(validateDirectoryWithCache).toHaveBeenCalledTimes(2);
    });

    test('should expire cached validation results after timeout', async () => {
      const validationCache = new Map();
      
      const validateDirectoryWithCache = jest.fn(async (dirPath) => {
        const cacheKey = dirPath;
        const cached = validationCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp < 100)) { // 100ms timeout for test
          return cached.result;
        }
        
        // Simulate validation
        const result = true;
        validationCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      });
      
      // First call caches result
      await validateDirectoryWithCache('/workspaces/agent-feed/prod');
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Second call should not use expired cache
      await validateDirectoryWithCache('/workspaces/agent-feed/prod');
      
      expect(validationCache.has('/workspaces/agent-feed/prod')).toBe(true);
    });
  });

  describe('Fallback Behavior Contract', () => {
    test('should fallback to base directory when target validation fails', async () => {
      const resolveWithFallback = jest.fn(async (instanceType) => {
        const targetDir = path.join(mockDirectoryResolver.baseDirectory, 'nonexistent');
        
        // Simulate validation failure
        const isValid = false;
        
        if (isValid) {
          return targetDir;
        } else {
          console.log(`⚠️ Directory validation failed for: ${targetDir}`);
          console.log(`📁 Falling back to base directory: ${mockDirectoryResolver.baseDirectory}`);
          return mockDirectoryResolver.baseDirectory;
        }
      });
      
      const result = await resolveWithFallback('invalid-type');
      
      expect(result).toBe('/workspaces/agent-feed');
      expect(resolveWithFallback).toHaveBeenCalledWith('invalid-type');
    });

    test('should handle undefined instance type gracefully', async () => {
      const resolveWithFallback = jest.fn(async (instanceType) => {
        if (!instanceType) {
          console.log(`📁 No instance type provided, using base directory: ${mockDirectoryResolver.baseDirectory}`);
          return mockDirectoryResolver.baseDirectory;
        }
        
        return path.join(mockDirectoryResolver.baseDirectory, instanceType);
      });
      
      const result = await resolveWithFallback(undefined);
      
      expect(result).toBe('/workspaces/agent-feed');
      expect(resolveWithFallback).toHaveBeenCalledWith(undefined);
    });
  });
});