import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Claude Code SDK interface
interface ClaudeCodeSDK {
  initialize(config: InitConfig): Promise<void>;
  setWorkingDirectory(path: string): Promise<void>;
  setPermissionBypass(enabled: boolean): void;
  executeQuery(query: string, options?: QueryOptions): Promise<QueryResult>;
  getTools(): string[];
}

interface InitConfig {
  apiKey?: string;
  tools?: string[];
  workingDir?: string;
  permissionBypass?: boolean;
}

interface QueryOptions {
  timeout?: number;
  streaming?: boolean;
}

interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Mock implementation for testing
class MockClaudeCodeSDK implements ClaudeCodeSDK {
  private initialized = false;
  private workingDir = '/default';
  private permissionBypass = false;
  private availableTools = ['read', 'write', 'bash', 'edit'];

  async initialize(config: InitConfig): Promise<void> {
    if (!config.apiKey) throw new Error('API key required');
    this.initialized = true;
    if (config.workingDir) this.workingDir = config.workingDir;
    if (config.permissionBypass) this.permissionBypass = config.permissionBypass;
  }

  async setWorkingDirectory(path: string): Promise<void> {
    if (!this.initialized) throw new Error('SDK not initialized');
    this.workingDir = path;
  }

  setPermissionBypass(enabled: boolean): void {
    this.permissionBypass = enabled;
  }

  async executeQuery(query: string, options?: QueryOptions): Promise<QueryResult> {
    if (!this.initialized) throw new Error('SDK not initialized');
    if (!query.trim()) throw new Error('Query cannot be empty');

    return {
      success: true,
      data: { result: 'mock response', workingDir: this.workingDir }
    };
  }

  getTools(): string[] {
    return this.availableTools;
  }
}

describe('Claude Code SDK', () => {
  let sdk: ClaudeCodeSDK;

  beforeEach(() => {
    sdk = new MockClaudeCodeSDK();
  });

  describe('SDK Initialization', () => {
    it('should initialize with valid API key', async () => {
      const config = { apiKey: 'test-key' };

      await expect(sdk.initialize(config)).resolves.not.toThrow();
    });

    it('should fail initialization without API key', async () => {
      const config = {};

      await expect(sdk.initialize(config)).rejects.toThrow('API key required');
    });

    it('should initialize with custom configuration', async () => {
      const config = {
        apiKey: 'test-key',
        workingDir: '/custom/path',
        permissionBypass: true
      };

      await expect(sdk.initialize(config)).resolves.not.toThrow();
    });
  });

  describe('Tool Access Configuration', () => {
    beforeEach(async () => {
      await sdk.initialize({ apiKey: 'test-key' });
    });

    it('should return available tools', () => {
      const tools = sdk.getTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools).toContain('read');
      expect(tools).toContain('write');
    });

    it('should include core tools by default', () => {
      const tools = sdk.getTools();

      expect(tools).toEqual(expect.arrayContaining(['read', 'write', 'bash', 'edit']));
    });
  });

  describe('Working Directory Setting', () => {
    beforeEach(async () => {
      await sdk.initialize({ apiKey: 'test-key' });
    });

    it('should set working directory', async () => {
      const newPath = '/workspace/project';

      await expect(sdk.setWorkingDirectory(newPath)).resolves.not.toThrow();
    });

    it('should fail if SDK not initialized', async () => {
      const uninitializedSdk = new MockClaudeCodeSDK();

      await expect(uninitializedSdk.setWorkingDirectory('/path'))
        .rejects.toThrow('SDK not initialized');
    });

    it('should accept absolute paths', async () => {
      const absolutePath = '/home/user/workspace';

      await expect(sdk.setWorkingDirectory(absolutePath)).resolves.not.toThrow();
    });
  });

  describe('Permission Bypass Mode', () => {
    beforeEach(async () => {
      await sdk.initialize({ apiKey: 'test-key' });
    });

    it('should enable permission bypass', () => {
      expect(() => sdk.setPermissionBypass(true)).not.toThrow();
    });

    it('should disable permission bypass', () => {
      expect(() => sdk.setPermissionBypass(false)).not.toThrow();
    });

    it('should work without initialization', () => {
      const uninitializedSdk = new MockClaudeCodeSDK();

      expect(() => uninitializedSdk.setPermissionBypass(true)).not.toThrow();
    });
  });

  describe('Query Execution', () => {
    beforeEach(async () => {
      await sdk.initialize({ apiKey: 'test-key' });
    });

    it('should execute valid query', async () => {
      const query = 'List files in current directory';

      const result = await sdk.executeQuery(query);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should fail with empty query', async () => {
      const emptyQuery = '';

      await expect(sdk.executeQuery(emptyQuery))
        .rejects.toThrow('Query cannot be empty');
    });

    it('should fail if SDK not initialized', async () => {
      const uninitializedSdk = new MockClaudeCodeSDK();

      await expect(uninitializedSdk.executeQuery('test query'))
        .rejects.toThrow('SDK not initialized');
    });

    it('should accept query options', async () => {
      const query = 'Test query';
      const options = { timeout: 5000, streaming: true };

      const result = await sdk.executeQuery(query, options);

      expect(result.success).toBe(true);
    });

    it('should return result with working directory context', async () => {
      await sdk.setWorkingDirectory('/test/path');
      const query = 'Get current context';

      const result = await sdk.executeQuery(query);

      expect(result.success).toBe(true);
      expect(result.data?.workingDir).toBe('/test/path');
    });
  });
});