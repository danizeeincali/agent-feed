/**
 * Regression Tests: Production SDK Backward Compatibility
 * Ensures existing functionality continues to work after OAuth integration
 *
 * Test Coverage:
 * - SDK manager works without database initialization
 * - Existing API methods still function
 * - Health check passes
 * - Session management works
 * - Tool configurations unchanged
 * - Default behaviors maintained
 */

const Database = require('better-sqlite3');

// We need to use dynamic import for ESM modules
let ClaudeCodeSDKManager;

const DB_PATH = '/workspaces/agent-feed/database.db';

describe('Production SDK Backward Compatibility - Regression Tests', () => {
  let sdkManager;
  let db;

  beforeAll(async () => {
    // Import ESM module
    const sdkModule = await import('../../src/services/ClaudeCodeSDKManager.js');
    ClaudeCodeSDKManager = sdkModule.ClaudeCodeSDKManager;

    db = new Database(DB_PATH);

    console.log('✅ Regression test setup complete');
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(() => {
    sdkManager = new ClaudeCodeSDKManager();
  });

  describe('1. SDK Manager Without Database', () => {
    test('should initialize without database', () => {
      expect(sdkManager).toBeDefined();
      expect(sdkManager.initialized).toBe(true);
      expect(sdkManager.authManager).toBeNull();

      console.log('✅ SDK initializes without database');
    });

    test('should have correct default configuration', () => {
      expect(sdkManager.workingDirectory).toBe('/workspaces/agent-feed/prod');
      expect(sdkManager.model).toBe('claude-sonnet-4-20250514');
      expect(sdkManager.permissionMode).toBe('bypassPermissions');
      expect(sdkManager.allowedTools).toContain('Bash');
      expect(sdkManager.allowedTools).toContain('Read');
      expect(sdkManager.allowedTools).toContain('Write');
      expect(sdkManager.allowedTools).toContain('Edit');
      expect(sdkManager.allowedTools).toContain('Grep');
      expect(sdkManager.allowedTools).toContain('Glob');

      console.log('✅ Default configuration correct');
    });

    test('should create sessions without database', () => {
      const session = sdkManager.createSession();

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.created).toBeDefined();
      expect(session.workingDirectory).toBe('/workspaces/agent-feed/prod');
      expect(session.active).toBe(true);
      expect(session.toolsEnabled).toEqual(sdkManager.allowedTools);

      console.log('✅ Session created without database:', {
        sessionId: session.id,
        workingDir: session.workingDirectory
      });
    });

    test('should get status without database', () => {
      const status = sdkManager.getStatus();

      expect(status.initialized).toBe(true);
      expect(status.claudeCodeSDK).toBe('@anthropic-ai/claude-code');
      expect(status.toolAccessEnabled).toBe(true);
      expect(status.workingDirectory).toBe('/workspaces/agent-feed/prod');
      expect(status.model).toBe('claude-sonnet-4-20250514');
      expect(status.allowedTools).toContain('Bash');
      expect(status.permissionMode).toBe('bypassPermissions');

      console.log('✅ Status retrieved without database');
    });
  });

  describe('2. Existing API Methods', () => {
    test('should extract content from assistant messages', () => {
      const assistantMessage = {
        type: 'assistant',
        message: {
          content: 'This is a test response'
        }
      };

      const content = sdkManager.extractContent(assistantMessage);

      expect(content).toBe('This is a test response');
      console.log('✅ extractContent() works');
    });

    test('should extract content from array format', () => {
      const assistantMessage = {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'First part. ' },
            { type: 'text', text: 'Second part.' }
          ]
        }
      };

      const content = sdkManager.extractContent(assistantMessage);

      expect(content).toBe('First part. Second part.');
      console.log('✅ extractContent() handles arrays');
    });

    test('should extract content from result messages', () => {
      const resultMessage = {
        type: 'result',
        result: 'Task completed successfully'
      };

      const content = sdkManager.extractContent(resultMessage);

      expect(content).toBe('Task completed successfully');
      console.log('✅ extractContent() handles results');
    });

    test('should calculate token metrics correctly', () => {
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 500
          }
        },
        {
          type: 'result',
          usage: {
            input_tokens: 200,
            output_tokens: 100
          }
        }
      ];

      const tokens = sdkManager.extractTokenMetrics(messages);

      expect(tokens.input).toBe(1200);
      expect(tokens.output).toBe(600);
      expect(tokens.total).toBe(1800);

      console.log('✅ extractTokenMetrics() works:', tokens);
    });

    test('should calculate costs correctly', () => {
      const tokens = {
        input: 1000000,
        output: 1000000
      };

      const cost = sdkManager.calculateCost(tokens);

      // $3/MTok input + $15/MTok output = $18 for 1M each
      expect(cost).toBe(18.0);

      console.log('✅ calculateCost() works:', cost);
    });

    test('should sanitize prompts correctly', () => {
      const sensitive = 'Use API key sk-ant-1234567890 to access token=secret123 with password=admin';

      const sanitized = sdkManager.sanitizePrompt(sensitive);

      expect(sanitized).not.toContain('sk-ant-1234567890');
      expect(sanitized).not.toContain('secret123');
      expect(sanitized).not.toContain('password=admin');
      expect(sanitized).toContain('***REDACTED***');

      console.log('✅ sanitizePrompt() works');
    });
  });

  describe('3. Session Management', () => {
    test('should create session with custom ID', () => {
      const customId = 'custom-session-123';
      const session = sdkManager.createSession(customId);

      expect(session.id).toBe(customId);
      expect(session.active).toBe(true);

      console.log('✅ Custom session ID works');
    });

    test('should retrieve existing session', () => {
      const session = sdkManager.createSession();
      const retrieved = sdkManager.getSession(session.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(session.id);
      expect(retrieved.created).toBe(session.created);

      console.log('✅ getSession() works');
    });

    test('should close session', () => {
      const session = sdkManager.createSession();
      const closed = sdkManager.closeSession(session.id);

      expect(closed).toBe(true);

      const retrieved = sdkManager.getSession(session.id);
      expect(retrieved).toBeUndefined();

      console.log('✅ closeSession() works');
    });

    test('should handle closing non-existent session', () => {
      const closed = sdkManager.closeSession('non-existent-session');

      expect(closed).toBe(false);

      console.log('✅ Handles non-existent session gracefully');
    });

    test('should track multiple sessions', () => {
      const session1 = sdkManager.createSession();
      const session2 = sdkManager.createSession();
      const session3 = sdkManager.createSession();

      expect(sdkManager.sessions.size).toBe(3);

      sdkManager.closeSession(session1.id);
      expect(sdkManager.sessions.size).toBe(2);

      sdkManager.closeSession(session2.id);
      sdkManager.closeSession(session3.id);
      expect(sdkManager.sessions.size).toBe(0);

      console.log('✅ Multiple sessions tracked correctly');
    });
  });

  describe('4. Tool Configuration', () => {
    test('should have all expected tools enabled', () => {
      const expectedTools = [
        'Bash',
        'Read',
        'Write',
        'Edit',
        'MultiEdit',
        'Grep',
        'Glob',
        'WebFetch',
        'WebSearch'
      ];

      expectedTools.forEach(tool => {
        expect(sdkManager.allowedTools).toContain(tool);
      });

      console.log('✅ All tools enabled:', sdkManager.allowedTools);
    });

    test('should maintain tool configuration in status', () => {
      const status = sdkManager.getStatus();

      expect(status.allowedTools).toEqual(sdkManager.allowedTools);

      console.log('✅ Tool configuration in status matches');
    });

    test('should include tools in session', () => {
      const session = sdkManager.createSession();

      expect(session.toolsEnabled).toEqual(sdkManager.allowedTools);

      console.log('✅ Session includes tool configuration');
    });
  });

  describe('5. Default Behaviors', () => {
    test('should use default permission mode', () => {
      expect(sdkManager.permissionMode).toBe('bypassPermissions');

      const status = sdkManager.getStatus();
      expect(status.permissionMode).toBe('bypassPermissions');

      console.log('✅ Default permission mode is bypassPermissions');
    });

    test('should use correct working directory', () => {
      expect(sdkManager.workingDirectory).toBe('/workspaces/agent-feed/prod');

      const session = sdkManager.createSession();
      expect(session.workingDirectory).toBe('/workspaces/agent-feed/prod');

      console.log('✅ Working directory is /workspaces/agent-feed/prod');
    });

    test('should use correct model', () => {
      expect(sdkManager.model).toBe('claude-sonnet-4-20250514');

      const status = sdkManager.getStatus();
      expect(status.model).toBe('claude-sonnet-4-20250514');

      console.log('✅ Model is claude-sonnet-4-20250514');
    });

    test('should initialize automatically on first use', () => {
      const newManager = new ClaudeCodeSDKManager();

      expect(newManager.initialized).toBe(true);

      console.log('✅ Auto-initialization works');
    });
  });

  describe('6. Database Integration Opt-In', () => {
    test('should work without initializeWithDatabase', () => {
      const manager = new ClaudeCodeSDKManager();

      expect(manager.authManager).toBeNull();
      expect(manager.initialized).toBe(true);
      expect(manager.getStatus().initialized).toBe(true);

      console.log('✅ Works without database initialization');
    });

    test('should accept database initialization later', () => {
      const manager = new ClaudeCodeSDKManager();

      expect(manager.authManager).toBeNull();

      manager.initializeWithDatabase(db);

      expect(manager.authManager).not.toBeNull();

      console.log('✅ Database can be initialized after construction');
    });

    test('should maintain functionality after database initialization', () => {
      const manager = new ClaudeCodeSDKManager();

      // Before database
      const statusBefore = manager.getStatus();
      const sessionBefore = manager.createSession();

      // Initialize database
      manager.initializeWithDatabase(db);

      // After database
      const statusAfter = manager.getStatus();
      const sessionAfter = manager.createSession();

      expect(statusBefore.initialized).toBe(statusAfter.initialized);
      expect(sessionBefore.toolsEnabled).toEqual(sessionAfter.toolsEnabled);

      console.log('✅ Functionality maintained after database initialization');
    });
  });

  describe('7. Error Handling', () => {
    test('should handle extractContent with invalid message', () => {
      const content = sdkManager.extractContent({ type: 'unknown' });

      expect(content).toBe('Response received');

      console.log('✅ Handles invalid message in extractContent');
    });

    test('should handle extractTokenMetrics with no usage data', () => {
      const messages = [
        { type: 'assistant', message: { content: 'test' } },
        { type: 'system', subtype: 'init' }
      ];

      const tokens = sdkManager.extractTokenMetrics(messages);

      expect(tokens.input).toBe(0);
      expect(tokens.output).toBe(0);
      expect(tokens.total).toBe(0);

      console.log('✅ Handles missing usage data');
    });

    test('should handle sanitizePrompt with null/undefined', () => {
      expect(sdkManager.sanitizePrompt(null)).toBeNull();
      expect(sdkManager.sanitizePrompt(undefined)).toBeUndefined();

      console.log('✅ Handles null/undefined in sanitizePrompt');
    });
  });

  describe('8. Performance and State', () => {
    test('should maintain singleton pattern via getClaudeCodeSDKManager', async () => {
      const module = await import('../../src/services/ClaudeCodeSDKManager.js');
      const getManager = module.getClaudeCodeSDKManager;

      const instance1 = getManager();
      const instance2 = getManager();

      expect(instance1).toBe(instance2);

      console.log('✅ Singleton pattern maintained');
    });

    test('should handle multiple concurrent sessions', () => {
      const sessions = [];

      for (let i = 0; i < 10; i++) {
        sessions.push(sdkManager.createSession());
      }

      expect(sdkManager.sessions.size).toBe(10);

      sessions.forEach(session => {
        expect(sdkManager.getSession(session.id)).toBeDefined();
      });

      console.log('✅ Handles multiple concurrent sessions');

      // Cleanup
      sessions.forEach(session => sdkManager.closeSession(session.id));
    });
  });
});
