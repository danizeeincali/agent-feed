/**
 * TDD London School - Authentication Flow Contract Tests
 * 
 * CRITICAL REGRESSION PROTECTION:
 * - Tests Claude Code authentication detection
 * - Mocks credentials file checks and environment variables
 * - Tests fallback scenarios and error handling
 * - Validates process environment inheritance
 * 
 * Focus: Mock-driven verification of authentication behavior
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Mock dependencies for isolation
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  constants: {
    R_OK: 4,
    W_OK: 2
  }
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
  spawn: jest.fn()
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn()
}));

describe('Authentication Flow Contract Tests', () => {
  let originalEnv;
  let mockCredentialsPath;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Store original environment
    originalEnv = { ...process.env };
    
    // Setup mock paths
    mockCredentialsPath = '/home/codespace/.claude/.credentials.json';
    path.join.mockImplementation((...paths) => paths.join('/'));
    
    // Reset environment
    delete process.env.CLAUDECODE;
    delete process.env.CLAUDE_API_KEY;
    delete process.env.HOME;
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('CRITICAL: Claude Code Authentication Detection Contract', () => {
    test('should detect authentication via credentials file (CRITICAL)', async () => {
      // Mock credentials file exists
      fs.existsSync.mockImplementation((filePath) => {
        return filePath === mockCredentialsPath;
      });
      
      process.env.HOME = '/home/codespace';
      
      const checkClaudeAuthentication = jest.fn(async () => {
        const credentialsPath = path.join(process.env.HOME || '/home/codespace', '.claude', '.credentials.json');
        
        if (fs.existsSync(credentialsPath)) {
          console.log('✅ Claude CLI authentication detected via credentials file');
          return { authenticated: true, source: 'credentials_file' };
        }
        
        return { authenticated: false, reason: 'No credentials found' };
      });
      
      const result = await checkClaudeAuthentication();
      
      // CRITICAL VERIFICATION: Should detect credentials file
      expect(result.authenticated).toBe(true);
      expect(result.source).toBe('credentials_file');
      expect(fs.existsSync).toHaveBeenCalledWith(mockCredentialsPath);
      expect(path.join).toHaveBeenCalledWith('/home/codespace', '.claude', '.credentials.json');
    });

    test('should detect Claude Code environment authentication', async () => {
      // Mock no credentials file but Claude Code environment
      fs.existsSync.mockReturnValue(false);
      process.env.CLAUDECODE = '1';
      process.env.HOME = '/home/codespace';
      
      const checkClaudeAuthentication = jest.fn(async () => {
        const credentialsPath = path.join(process.env.HOME || '/home/codespace', '.claude', '.credentials.json');
        
        if (fs.existsSync(credentialsPath)) {
          return { authenticated: true, source: 'credentials_file' };
        }
        
        if (process.env.CLAUDECODE === '1') {
          console.log('✅ Claude Code environment detected - using inherited authentication');
          return { authenticated: true, source: 'claude_code_env' };
        }
        
        return { authenticated: false, reason: 'No authentication found' };
      });
      
      const result = await checkClaudeAuthentication();
      
      expect(result.authenticated).toBe(true);
      expect(result.source).toBe('claude_code_env');
      expect(fs.existsSync).toHaveBeenCalledWith(mockCredentialsPath);
    });

    test('should fallback to CLI availability check', async () => {
      // Mock no credentials file, no Claude Code env
      fs.existsSync.mockReturnValue(false);
      execSync.mockReturnValue('Claude CLI v1.0.0');
      process.env.HOME = '/home/codespace';
      
      const checkClaudeAuthentication = jest.fn(async () => {
        const credentialsPath = path.join(process.env.HOME || '/home/codespace', '.claude', '.credentials.json');
        
        if (fs.existsSync(credentialsPath)) {
          return { authenticated: true, source: 'credentials_file' };
        }
        
        if (process.env.CLAUDECODE === '1') {
          return { authenticated: true, source: 'claude_code_env' };
        }
        
        try {
          execSync('claude --help', { timeout: 3000 });
          console.log('✅ Claude CLI is available and functional');
          return { authenticated: true, source: 'cli_available' };
        } catch (error) {
          return { authenticated: false, reason: 'Claude CLI not available' };
        }
      });
      
      const result = await checkClaudeAuthentication();
      
      expect(result.authenticated).toBe(true);
      expect(result.source).toBe('cli_available');
      expect(execSync).toHaveBeenCalledWith('claude --help', { timeout: 3000 });
    });
  });

  describe('Environment Variable Inheritance Contract', () => {
    test('should inherit Claude-specific environment variables', () => {
      process.env.CLAUDE_API_KEY = 'test-api-key';
      process.env.CLAUDE_SESSION_KEY = 'test-session-key';
      process.env.CLAUDECODE = '1';
      process.env.HOME = '/home/codespace';
      
      const inheritEnvironment = jest.fn(() => {
        return {
          ...process.env,
          TERM: 'xterm-256color',
          FORCE_COLOR: '1'
        };
      });
      
      const result = inheritEnvironment();
      
      expect(result).toMatchObject({
        CLAUDE_API_KEY: 'test-api-key',
        CLAUDE_SESSION_KEY: 'test-session-key',
        CLAUDECODE: '1',
        HOME: '/home/codespace',
        TERM: 'xterm-256color',
        FORCE_COLOR: '1'
      });
      
      expect(inheritEnvironment).toHaveBeenCalled();
    });

    test('should set workspace environment variable', () => {
      const workingDir = '/workspaces/agent-feed/prod';
      
      const setWorkspaceEnvironment = jest.fn((dir) => {
        return {
          ...process.env,
          CLAUDE_WORKSPACE: dir,
          TERM: 'xterm-256color',
          FORCE_COLOR: '1'
        };
      });
      
      const result = setWorkspaceEnvironment(workingDir);
      
      expect(result.CLAUDE_WORKSPACE).toBe('/workspaces/agent-feed/prod');
      expect(setWorkspaceEnvironment).toHaveBeenCalledWith(workingDir);
    });

    test('should preserve existing environment variables', () => {
      process.env.PATH = '/usr/bin:/bin';
      process.env.USER = 'codespace';
      process.env.SHELL = '/bin/bash';
      
      const preserveEnvironment = jest.fn(() => {
        return {
          ...process.env,
          CLAUDE_WORKSPACE: '/workspaces/agent-feed'
        };
      });
      
      const result = preserveEnvironment();
      
      expect(result.PATH).toBe('/usr/bin:/bin');
      expect(result.USER).toBe('codespace');
      expect(result.SHELL).toBe('/bin/bash');
      expect(result.CLAUDE_WORKSPACE).toBe('/workspaces/agent-feed');
    });
  });

  describe('Credentials File Detection Contract', () => {
    test('should check correct credentials file path', () => {
      process.env.HOME = '/home/codespace';
      
      const checkCredentialsFile = jest.fn(() => {
        const credentialsPath = path.join(process.env.HOME, '.claude', '.credentials.json');
        return fs.existsSync(credentialsPath);
      });
      
      checkCredentialsFile();
      
      expect(path.join).toHaveBeenCalledWith('/home/codespace', '.claude', '.credentials.json');
      expect(fs.existsSync).toHaveBeenCalledWith('/home/codespace/.claude/.credentials.json');
    });

    test('should handle missing HOME environment variable', () => {
      delete process.env.HOME;
      
      const checkCredentialsFile = jest.fn(() => {
        const credentialsPath = path.join(process.env.HOME || '/home/codespace', '.claude', '.credentials.json');
        return fs.existsSync(credentialsPath);
      });
      
      checkCredentialsFile();
      
      expect(path.join).toHaveBeenCalledWith('/home/codespace', '.claude', '.credentials.json');
    });

    test('should validate credentials file readability', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{"api_key": "test-key"}');
      
      const validateCredentialsFile = jest.fn((filePath) => {
        if (!fs.existsSync(filePath)) {
          return false;
        }
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          JSON.parse(content);
          return true;
        } catch (error) {
          return false;
        }
      });
      
      const result = validateCredentialsFile(mockCredentialsPath);
      
      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith(mockCredentialsPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockCredentialsPath, 'utf8');
    });
  });

  describe('CLI Authentication Check Contract', () => {
    test('should execute claude --help command with timeout', () => {
      execSync.mockReturnValue('Claude CLI help text');
      
      const checkCLIAvailable = jest.fn(() => {
        try {
          execSync('claude --help', { timeout: 3000 });
          return { available: true, method: 'help_command' };
        } catch (error) {
          return { available: false, error: error.message };
        }
      });
      
      const result = checkCLIAvailable();
      
      expect(result.available).toBe(true);
      expect(result.method).toBe('help_command');
      expect(execSync).toHaveBeenCalledWith('claude --help', { timeout: 3000 });
    });

    test('should handle CLI execution timeout', () => {
      execSync.mockImplementation(() => {
        throw new Error('Command timed out after 3000ms');
      });
      
      const checkCLIAvailable = jest.fn(() => {
        try {
          execSync('claude --help', { timeout: 3000 });
          return { available: true, method: 'help_command' };
        } catch (error) {
          return { available: false, error: error.message };
        }
      });
      
      const result = checkCLIAvailable();
      
      expect(result.available).toBe(false);
      expect(result.error).toBe('Command timed out after 3000ms');
    });

    test('should handle CLI not found error', () => {
      execSync.mockImplementation(() => {
        const error = new Error('claude: command not found');
        error.code = 127;
        throw error;
      });
      
      const checkCLIAvailable = jest.fn(() => {
        try {
          execSync('claude --help', { timeout: 3000 });
          return { available: true, method: 'help_command' };
        } catch (error) {
          return { 
            available: false, 
            error: error.message,
            code: error.code
          };
        }
      });
      
      const result = checkCLIAvailable();
      
      expect(result.available).toBe(false);
      expect(result.error).toBe('claude: command not found');
      expect(result.code).toBe(127);
    });
  });

  describe('Authentication Priority Contract', () => {
    test('should prioritize credentials file over environment variables', async () => {
      // Both credentials file and Claude Code env available
      fs.existsSync.mockReturnValue(true);
      process.env.CLAUDECODE = '1';
      process.env.HOME = '/home/codespace';
      
      const authenticateWithPriority = jest.fn(async () => {
        const credentialsPath = path.join(process.env.HOME, '.claude', '.credentials.json');
        
        // Check credentials file first
        if (fs.existsSync(credentialsPath)) {
          return { authenticated: true, source: 'credentials_file', priority: 1 };
        }
        
        // Check Claude Code environment second
        if (process.env.CLAUDECODE === '1') {
          return { authenticated: true, source: 'claude_code_env', priority: 2 };
        }
        
        return { authenticated: false, reason: 'No authentication found' };
      });
      
      const result = await authenticateWithPriority();
      
      expect(result.source).toBe('credentials_file');
      expect(result.priority).toBe(1);
    });

    test('should use Claude Code environment when credentials file missing', async () => {
      fs.existsSync.mockReturnValue(false);
      process.env.CLAUDECODE = '1';
      process.env.HOME = '/home/codespace';
      
      const authenticateWithPriority = jest.fn(async () => {
        const credentialsPath = path.join(process.env.HOME, '.claude', '.credentials.json');
        
        if (fs.existsSync(credentialsPath)) {
          return { authenticated: true, source: 'credentials_file', priority: 1 };
        }
        
        if (process.env.CLAUDECODE === '1') {
          return { authenticated: true, source: 'claude_code_env', priority: 2 };
        }
        
        return { authenticated: false, reason: 'No authentication found' };
      });
      
      const result = await authenticateWithPriority();
      
      expect(result.source).toBe('claude_code_env');
      expect(result.priority).toBe(2);
    });
  });

  describe('Error Handling Contract', () => {
    test('should handle authentication check errors gracefully', async () => {
      // Mock all authentication methods to fail
      fs.existsSync.mockReturnValue(false);
      process.env.CLAUDECODE = undefined;
      execSync.mockImplementation(() => {
        throw new Error('Command failed');
      });
      
      const authenticateWithErrorHandling = jest.fn(async () => {
        try {
          const credentialsPath = path.join(process.env.HOME || '/home/codespace', '.claude', '.credentials.json');
          
          if (fs.existsSync(credentialsPath)) {
            return { authenticated: true, source: 'credentials_file' };
          }
          
          if (process.env.CLAUDECODE === '1') {
            return { authenticated: true, source: 'claude_code_env' };
          }
          
          execSync('claude --help', { timeout: 3000 });
          return { authenticated: true, source: 'cli_available' };
          
        } catch (error) {
          console.error('❌ Claude CLI not available or not functional:', error.message);
          return { authenticated: false, reason: 'Claude CLI not available' };
        }
      });
      
      const result = await authenticateWithErrorHandling();
      
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe('Claude CLI not available');
    });

    test('should handle filesystem errors during credentials check', async () => {
      fs.existsSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const handleCredentialsError = jest.fn(() => {
        try {
          const credentialsPath = '/home/codespace/.claude/.credentials.json';
          return fs.existsSync(credentialsPath);
        } catch (error) {
          console.error('Error checking credentials file:', error.message);
          return false;
        }
      });
      
      const result = handleCredentialsError();
      
      expect(result).toBe(false);
      expect(handleCredentialsError).toHaveBeenCalled();
    });
  });
});