/**
 * Working Directory TDD Prevention Strategies
 * Comprehensive TDD test patterns to prevent directory spawning failures
 * and hardcoded configuration anti-patterns
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TDDPreventionStrategy {
  strategyId: string;
  name: string;
  category: string;
  description: string;
  targetAntiPattern: string;
  testPattern: string;
  implementationGuidance: string;
  exampleCode: {
    testCode: string;
    implementationCode: string;
  };
  preventionLevel: 'unit' | 'integration' | 'e2e';
  effectiveness: number;
}

export class WorkingDirectoryTDDPreventionStrategies {
  private strategies: TDDPreventionStrategy[] = [];

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Initialize comprehensive TDD prevention strategies
   */
  private initializeStrategies(): void {
    this.strategies = [
      {
        strategyId: 'WD_TDD_001',
        name: 'Button Type Directory Mapping Tests',
        category: 'DIRECTORY_MAPPING',
        description: 'Comprehensive test suite ensuring each UI button type maps to correct working directory',
        targetAntiPattern: 'HARDCODED_WORKING_DIR',
        testPattern: 'RED-GREEN-REFACTOR with button type parameterization',
        implementationGuidance: 'Start with failing test for each button type, implement mapping, refactor for maintainability',
        exampleCode: {
          testCode: `describe('Button Type Directory Mapping', () => {
  const BUTTON_DIRECTORY_TESTS = [
    { buttonType: 'prod', expectedDir: '/workspaces/agent-feed/prod' },
    { buttonType: 'dev', expectedDir: '/workspaces/agent-feed/dev' },
    { buttonType: 'staging', expectedDir: '/workspaces/agent-feed/staging' },
    { buttonType: 'test', expectedDir: '/workspaces/agent-feed/test' },
    { buttonType: 'skip-permissions', expectedDir: '/workspaces/agent-feed' }
  ];

  test.each(BUTTON_DIRECTORY_TESTS)(
    'button type "$buttonType" maps to directory "$expectedDir"',
    ({ buttonType, expectedDir }) => {
      const workingDir = getWorkingDirectoryByButtonType(buttonType);
      expect(workingDir).toBe(expectedDir);
    }
  );

  test('unknown button type defaults to root directory', () => {
    const workingDir = getWorkingDirectoryByButtonType('unknown-type');
    expect(workingDir).toBe('/workspaces/agent-feed');
  });

  test('null or undefined button type defaults to root directory', () => {
    expect(getWorkingDirectoryByButtonType(null)).toBe('/workspaces/agent-feed');
    expect(getWorkingDirectoryByButtonType(undefined)).toBe('/workspaces/agent-feed');
  });
});`,
          implementationCode: `const BUTTON_DIRECTORY_MAP = {
  'prod': '/workspaces/agent-feed/prod',
  'dev': '/workspaces/agent-feed/dev',
  'staging': '/workspaces/agent-feed/staging',
  'test': '/workspaces/agent-feed/test',
  'skip-permissions': '/workspaces/agent-feed',
  'skip-permissions-c': '/workspaces/agent-feed',
  'skip-permissions-resume': '/workspaces/agent-feed'
};

function getWorkingDirectoryByButtonType(buttonType) {
  if (!buttonType || typeof buttonType !== 'string') {
    return '/workspaces/agent-feed';
  }
  
  return BUTTON_DIRECTORY_MAP[buttonType] || '/workspaces/agent-feed';
}`
        },
        preventionLevel: 'unit',
        effectiveness: 0.95
      },
      {
        strategyId: 'WD_TDD_002',
        name: 'Process Creation Directory Context Tests',
        category: 'PROCESS_SPAWNING',
        description: 'Test that Claude process creation uses correct working directory from button type',
        targetAntiPattern: 'MISSING_BUTTON_MAPPING',
        testPattern: 'Mock-based testing with spawn verification',
        implementationGuidance: 'Mock child_process.spawn and verify cwd parameter matches expected directory',
        exampleCode: {
          testCode: `describe('Process Creation Directory Context', () => {
  let mockSpawn;

  beforeEach(() => {
    mockSpawn = jest.fn().mockReturnValue({
      pid: 1234,
      on: jest.fn(),
      stdin: { write: jest.fn(), end: jest.fn() },
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() }
    });
    jest.mock('child_process', () => ({ spawn: mockSpawn }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('prod instance spawns in prod directory', () => {
    createRealClaudeInstance('prod', 'test-instance-id');
    
    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      [],
      expect.objectContaining({
        cwd: '/workspaces/agent-feed/prod'
      })
    );
  });

  test('dev instance spawns in dev directory', () => {
    createRealClaudeInstance('dev', 'test-instance-id');
    
    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      [],
      expect.objectContaining({
        cwd: '/workspaces/agent-feed/dev'
      })
    );
  });

  test('skip-permissions instance spawns in root directory', () => {
    createRealClaudeInstance('skip-permissions', 'test-instance-id');
    
    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      ['--dangerously-skip-permissions'],
      expect.objectContaining({
        cwd: '/workspaces/agent-feed'
      })
    );
  });
});`,
          implementationCode: `function createRealClaudeInstance(instanceType, instanceId) {
  const workingDir = getWorkingDirectoryByButtonType(instanceType);
  const [command, ...args] = CLAUDE_COMMANDS[instanceType] || CLAUDE_COMMANDS['prod'];
  
  const claudeProcess = spawn(command, args, {
    cwd: workingDir, // Use dynamic directory mapping
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
    shell: false
  });
  
  // Rest of implementation...
}`
        },
        preventionLevel: 'integration',
        effectiveness: 0.88
      },
      {
        strategyId: 'WD_TDD_003',
        name: 'Directory Validation and Creation Tests',
        category: 'DIRECTORY_VALIDATION',
        description: 'Ensure working directories are validated and created before process spawning',
        targetAntiPattern: 'NO_VALIDATION',
        testPattern: 'Filesystem interaction testing with temp directories',
        implementationGuidance: 'Use temporary test directories to verify directory creation and validation logic',
        exampleCode: {
          testCode: `describe('Directory Validation and Creation', () => {
  let tempDir;
  let originalMkdirSync;
  let originalExistsSync;
  let originalAccessSync;

  beforeEach(() => {
    tempDir = '/tmp/test-claude-' + Math.random().toString(36).substr(2, 9);
    originalMkdirSync = fs.mkdirSync;
    originalExistsSync = fs.existsSync;
    originalAccessSync = fs.accessSync;
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync = originalMkdirSync;
    fs.existsSync = originalExistsSync;
    fs.accessSync = originalAccessSync;
  });

  test('creates missing directory before spawning process', async () => {
    const mockMkdirSync = jest.fn();
    fs.mkdirSync = mockMkdirSync;
    fs.existsSync = jest.fn().mockReturnValue(false);
    
    await validateAndCreateWorkingDirectory('/tmp/test-missing-dir');
    
    expect(mockMkdirSync).toHaveBeenCalledWith(
      '/tmp/test-missing-dir',
      { recursive: true }
    );
  });

  test('skips directory creation if directory exists', async () => {
    const mockMkdirSync = jest.fn();
    fs.mkdirSync = mockMkdirSync;
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.accessSync = jest.fn(); // No access error
    
    await validateAndCreateWorkingDirectory('/tmp/existing-dir');
    
    expect(mockMkdirSync).not.toHaveBeenCalled();
  });

  test('throws error for inaccessible directory', async () => {
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.accessSync = jest.fn().mockImplementation(() => {
      throw new Error('Permission denied');
    });
    
    await expect(validateAndCreateWorkingDirectory('/root/restricted'))
      .rejects
      .toThrow('Working directory not accessible: /root/restricted');
  });

  test('validates directory permissions with R_OK and W_OK', async () => {
    const mockAccessSync = jest.fn();
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.accessSync = mockAccessSync;
    
    await validateAndCreateWorkingDirectory('/tmp/test-dir');
    
    expect(mockAccessSync).toHaveBeenCalledWith(
      '/tmp/test-dir',
      fs.constants.R_OK | fs.constants.W_OK
    );
  });
});`,
          implementationCode: `async function validateAndCreateWorkingDirectory(workingDir) {
  // Check if directory exists
  if (!fs.existsSync(workingDir)) {
    console.log(\`📁 Creating working directory: \${workingDir}\`);
    try {
      fs.mkdirSync(workingDir, { recursive: true });
    } catch (error) {
      throw new Error(\`Failed to create working directory: \${workingDir} - \${error.message}\`);
    }
  }
  
  // Validate accessibility
  try {
    fs.accessSync(workingDir, fs.constants.R_OK | fs.constants.W_OK);
  } catch (error) {
    throw new Error(\`Working directory not accessible: \${workingDir}\`);
  }
}

function createRealClaudeInstance(instanceType, instanceId) {
  const workingDir = getWorkingDirectoryByButtonType(instanceType);
  
  // Validate and create working directory
  await validateAndCreateWorkingDirectory(workingDir);
  
  const [command, ...args] = CLAUDE_COMMANDS[instanceType] || CLAUDE_COMMANDS['prod'];
  
  const claudeProcess = spawn(command, args, {
    cwd: workingDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
    shell: false
  });
  
  // Rest of implementation...
}`
        },
        preventionLevel: 'integration',
        effectiveness: 0.85
      },
      {
        strategyId: 'WD_TDD_004',
        name: 'End-to-End Button-to-Directory Workflow Tests',
        category: 'E2E_WORKFLOW',
        description: 'Complete workflow testing from button click to process spawning in correct directory',
        targetAntiPattern: 'COMPLETE_WORKFLOW_FAILURES',
        testPattern: 'API testing with directory verification',
        implementationGuidance: 'Test complete workflow from frontend button to backend directory spawning',
        exampleCode: {
          testCode: `describe('End-to-End Button Directory Workflow', () => {
  let server;
  let tempDirs = [];

  beforeAll(async () => {
    // Start test server
    server = require('../simple-backend.js');
    await new Promise(resolve => server.listen(0, resolve));
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    // Clean up temp directories
    tempDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  test('prod button creates instance in prod directory', async () => {
    const response = await request(server)
      .post('/api/claude/instances')
      .send({ 
        command: ['claude'],
        instanceType: 'prod'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const instance = response.body.instance;
    expect(instance).toBeDefined();
    
    // Verify process was created in correct directory
    const processInfo = activeProcesses.get(instance.id);
    expect(processInfo.workingDirectory).toBe('/workspaces/agent-feed/prod');
  });

  test('dev button creates instance in dev directory', async () => {
    const response = await request(server)
      .post('/api/claude/instances')
      .send({ 
        command: ['claude'],
        instanceType: 'dev'
      });

    expect(response.status).toBe(201);
    
    const instance = response.body.instance;
    const processInfo = activeProcesses.get(instance.id);
    expect(processInfo.workingDirectory).toBe('/workspaces/agent-feed/dev');
  });

  test('directory is created if it does not exist', async () => {
    const testDir = '/tmp/test-claude-env-' + Date.now();
    tempDirs.push(testDir);

    // Mock the directory mapping for testing
    const originalMapping = BUTTON_DIRECTORY_MAP.test;
    BUTTON_DIRECTORY_MAP.test = testDir;

    const response = await request(server)
      .post('/api/claude/instances')
      .send({ 
        command: ['claude'],
        instanceType: 'test'
      });

    expect(response.status).toBe(201);
    expect(fs.existsSync(testDir)).toBe(true);

    // Restore original mapping
    BUTTON_DIRECTORY_MAP.test = originalMapping;
  });
});`,
          implementationCode: `// Enhanced createRealClaudeInstance with full TDD prevention
async function createRealClaudeInstance(instanceType, instanceId) {
  // Step 1: Get dynamic working directory based on button type
  const workingDir = getWorkingDirectoryByButtonType(instanceType);
  
  // Step 2: Validate and create directory
  await validateAndCreateWorkingDirectory(workingDir);
  
  // Step 3: Get command configuration
  const [command, ...args] = CLAUDE_COMMANDS[instanceType] || CLAUDE_COMMANDS['prod'];
  
  console.log(\`🚀 Spawning \${instanceType} Claude process: \${command} \${args.join(' ')} in \${workingDir}\`);
  
  try {
    const claudeProcess = spawn(command, args, {
      cwd: workingDir, // Dynamic working directory
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      shell: false
    });
    
    const processInfo = {
      process: claudeProcess,
      pid: claudeProcess.pid,
      status: 'starting',
      startTime: new Date(),
      command: \`\${command} \${args.join(' ')}\`,
      workingDirectory: workingDir, // Track actual working directory
      instanceType
    };
    
    activeProcesses.set(instanceId, processInfo);
    
    return processInfo;
    
  } catch (error) {
    console.error(\`❌ Failed to spawn Claude process:\`, error);
    throw error;
  }
}`
        },
        preventionLevel: 'e2e',
        effectiveness: 0.92
      },
      {
        strategyId: 'WD_TDD_005',
        name: 'Configuration-Driven Directory Management Tests',
        category: 'CONFIGURATION_TESTING',
        description: 'Test configuration flexibility and environment-specific directory mappings',
        targetAntiPattern: 'STATIC_CONFIGURATION',
        testPattern: 'Configuration injection testing',
        implementationGuidance: 'Test different configuration scenarios and environment-specific directory mappings',
        exampleCode: {
          testCode: `describe('Configuration-Driven Directory Management', () => {
  let originalConfig;

  beforeEach(() => {
    originalConfig = { ...BUTTON_DIRECTORY_MAP };
  });

  afterEach(() => {
    // Restore original configuration
    Object.keys(BUTTON_DIRECTORY_MAP).forEach(key => {
      delete BUTTON_DIRECTORY_MAP[key];
    });
    Object.assign(BUTTON_DIRECTORY_MAP, originalConfig);
  });

  test('supports custom directory configuration', () => {
    const customConfig = {
      'prod': '/custom/prod/path',
      'dev': '/custom/dev/path',
      'staging': '/custom/staging/path'
    };

    updateDirectoryConfiguration(customConfig);

    expect(getWorkingDirectoryByButtonType('prod')).toBe('/custom/prod/path');
    expect(getWorkingDirectoryByButtonType('dev')).toBe('/custom/dev/path');
    expect(getWorkingDirectoryByButtonType('staging')).toBe('/custom/staging/path');
  });

  test('merges custom configuration with defaults', () => {
    const partialConfig = {
      'prod': '/override/prod'
    };

    updateDirectoryConfiguration(partialConfig);

    expect(getWorkingDirectoryByButtonType('prod')).toBe('/override/prod');
    expect(getWorkingDirectoryByButtonType('dev')).toBe('/workspaces/agent-feed/dev');
  });

  test('validates configuration on update', () => {
    const invalidConfig = {
      'prod': null,
      'dev': ''
    };

    expect(() => updateDirectoryConfiguration(invalidConfig))
      .toThrow('Invalid directory configuration');
  });

  test('supports environment-specific configurations', () => {
    process.env.NODE_ENV = 'production';
    
    const prodConfig = getEnvironmentDirectoryConfiguration();
    
    expect(prodConfig['prod']).toMatch(/prod/);
    expect(prodConfig['dev']).toBeDefined();
    
    delete process.env.NODE_ENV;
  });
});`,
          implementationCode: `function updateDirectoryConfiguration(customConfig) {
  // Validate configuration
  Object.entries(customConfig).forEach(([key, value]) => {
    if (!value || typeof value !== 'string' || !path.isAbsolute(value)) {
      throw new Error(\`Invalid directory configuration for \${key}: \${value}\`);
    }
  });

  // Merge with existing configuration
  Object.assign(BUTTON_DIRECTORY_MAP, customConfig);
}

function getEnvironmentDirectoryConfiguration() {
  const baseDir = process.env.NODE_ENV === 'production' 
    ? '/opt/claude-workspace'
    : '/workspaces/agent-feed';

  return {
    'prod': path.join(baseDir, 'prod'),
    'dev': path.join(baseDir, 'dev'),
    'staging': path.join(baseDir, 'staging'),
    'test': path.join(baseDir, 'test'),
    'skip-permissions': baseDir
  };
}`
        },
        preventionLevel: 'integration',
        effectiveness: 0.78
      }
    ];
  }

  /**
   * Get prevention strategies by category
   */
  getStrategiesByCategory(category: string): TDDPreventionStrategy[] {
    return this.strategies.filter(s => s.category === category);
  }

  /**
   * Get strategies by prevention level
   */
  getStrategiesByLevel(level: 'unit' | 'integration' | 'e2e'): TDDPreventionStrategy[] {
    return this.strategies.filter(s => s.preventionLevel === level);
  }

  /**
   * Get high-effectiveness strategies
   */
  getHighEffectivenessStrategies(threshold = 0.8): TDDPreventionStrategy[] {
    return this.strategies
      .filter(s => s.effectiveness >= threshold)
      .sort((a, b) => b.effectiveness - a.effectiveness);
  }

  /**
   * Generate complete TDD test suite for working directory prevention
   */
  generateCompleteTDDTestSuite(): {
    testSuiteCode: string;
    implementationCode: string;
    setupInstructions: string[];
  } {
    const unitTests = this.getStrategiesByLevel('unit');
    const integrationTests = this.getStrategiesByLevel('integration');
    const e2eTests = this.getStrategiesByLevel('e2e');

    const testSuiteCode = `
// Working Directory TDD Prevention Test Suite
// Generated by NLD System for comprehensive failure prevention

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const request = require('supertest');

// Unit Tests
${unitTests.map(s => s.exampleCode.testCode).join('\n\n')}

// Integration Tests  
${integrationTests.map(s => s.exampleCode.testCode).join('\n\n')}

// End-to-End Tests
${e2eTests.map(s => s.exampleCode.testCode).join('\n\n')}
`;

    const implementationCode = `
// Working Directory Implementation with TDD Prevention
// Generated by NLD System based on detected anti-patterns

${this.strategies.map(s => s.exampleCode.implementationCode).join('\n\n')}
`;

    const setupInstructions = [
      'Install testing dependencies: npm install --save-dev jest supertest',
      'Create test directory structure matching working directory layout',
      'Configure Jest for filesystem testing with proper cleanup',
      'Set up test database or mocking for process spawning',
      'Add test scripts to package.json for different test levels',
      'Configure CI/CD pipeline to run tests before deployment',
      'Set up test coverage reporting for directory logic',
      'Create test data fixtures for different button types',
      'Configure test environment variables for directory paths',
      'Add integration with existing backend testing framework'
    ];

    return {
      testSuiteCode,
      implementationCode,
      setupInstructions
    };
  }

  /**
   * Export strategies for external analysis
   */
  async exportStrategiesForTraining(): Promise<{
    strategies: TDDPreventionStrategy[];
    summary: {
      totalStrategies: number;
      categoryBreakdown: Record<string, number>;
      levelBreakdown: Record<string, number>;
      averageEffectiveness: number;
    };
    exportPath: string;
  }> {
    const categoryBreakdown: Record<string, number> = {};
    const levelBreakdown: Record<string, number> = {};
    let totalEffectiveness = 0;

    this.strategies.forEach(strategy => {
      categoryBreakdown[strategy.category] = (categoryBreakdown[strategy.category] || 0) + 1;
      levelBreakdown[strategy.preventionLevel] = (levelBreakdown[strategy.preventionLevel] || 0) + 1;
      totalEffectiveness += strategy.effectiveness;
    });

    const exportData = {
      strategies: this.strategies,
      summary: {
        totalStrategies: this.strategies.length,
        categoryBreakdown,
        levelBreakdown,
        averageEffectiveness: totalEffectiveness / this.strategies.length
      },
      exportPath: ''
    };

    const exportPath = '/workspaces/agent-feed/neural-exports/working-directory-tdd-strategies.json';
    
    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(exportPath), { recursive: true });
    
    await fs.promises.writeFile(
      exportPath,
      JSON.stringify(exportData, null, 2)
    );

    exportData.exportPath = exportPath;
    return exportData;
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): TDDPreventionStrategy[] {
    return [...this.strategies];
  }

  /**
   * Get strategy by ID
   */
  getStrategyById(strategyId: string): TDDPreventionStrategy | undefined {
    return this.strategies.find(s => s.strategyId === strategyId);
  }
}