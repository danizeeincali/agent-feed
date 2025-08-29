"use strict";
/**
 * Working Directory Anti-Patterns Database
 * Comprehensive database of working directory configuration failures
 * and TDD prevention strategies
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkingDirectoryAntiPatternsDatabase = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class WorkingDirectoryAntiPatternsDatabase {
    antiPatterns = [];
    dbPath;
    constructor(dbPath = '/workspaces/agent-feed/src/nld/patterns/working-directory-anti-patterns.json') {
        this.dbPath = dbPath;
        this.initializeAntiPatterns();
    }
    /**
     * Initialize comprehensive anti-patterns database
     */
    async initializeAntiPatterns() {
        this.antiPatterns = [
            {
                id: 'WD_HARDCODED_PARENT_DIR',
                name: 'Hardcoded Parent Directory Pattern',
                category: 'DIRECTORY_CONFIGURATION',
                description: 'Working directory hardcoded to parent directory when user expects subdirectory based on button type',
                symptoms: [
                    'prod/claude button spawns in /workspaces/agent-feed instead of /workspaces/agent-feed/prod',
                    'All instance types spawn in same directory regardless of button type',
                    'User confusion about where processes actually run',
                    'Directory context mismatch between UI expectation and reality'
                ],
                antiPatternCode: `function createRealClaudeInstance(instanceType, instanceId) {
  const workingDir = '/workspaces/agent-feed'; // ❌ ANTI-PATTERN: Hardcoded parent
  const claudeProcess = spawn(command, args, {
    cwd: workingDir,
    // ...
  });
}`,
                correctPatternCode: `function createRealClaudeInstance(instanceType, instanceId) {
  const workingDir = getWorkingDirectoryByType(instanceType); // ✅ Dynamic mapping
  const claudeProcess = spawn(command, args, {
    cwd: workingDir,
    // ...
  });
}

function getWorkingDirectoryByType(instanceType) {
  const DIRECTORY_MAP = {
    'prod': '/workspaces/agent-feed/prod',
    'dev': '/workspaces/agent-feed/dev',
    'test': '/workspaces/agent-feed/test',
    'skip-permissions': '/workspaces/agent-feed'
  };
  return DIRECTORY_MAP[instanceType] || '/workspaces/agent-feed';
}`,
                preventionStrategy: 'Always map UI button types to their corresponding working directories. Create explicit mapping between user interface elements and backend directory contexts.',
                tddStrategy: `describe('Working Directory Selection', () => {
  test('prod button maps to prod directory', () => {
    const workingDir = getWorkingDirectoryByType('prod');
    expect(workingDir).toBe('/workspaces/agent-feed/prod');
  });
  
  test('dev button maps to dev directory', () => {
    const workingDir = getWorkingDirectoryByType('dev');
    expect(workingDir).toBe('/workspaces/agent-feed/dev');
  });
  
  test('unknown type defaults to root', () => {
    const workingDir = getWorkingDirectoryByType('unknown');
    expect(workingDir).toBe('/workspaces/agent-feed');
  });
});`,
                realWorldExample: {
                    context: 'User clicks prod/claude button expecting Claude to spawn in production directory context',
                    userExpectation: 'Process should run in /workspaces/agent-feed/prod directory',
                    actualBehavior: 'Process spawns in /workspaces/agent-feed parent directory due to hardcoded workingDir',
                    impact: 'User confusion, wrong context for production operations, potential file access issues'
                },
                detectionRules: [
                    'const workingDir = \'/workspaces/agent-feed\';',
                    'hardcoded directory path in createRealClaudeInstance',
                    'no dynamic directory mapping for instance types',
                    'single working directory for all button types'
                ],
                severity: 'high',
                frequency: 0,
                lastDetected: ''
            },
            {
                id: 'WD_MISSING_BUTTON_MAPPING',
                name: 'Missing Button Type to Directory Mapping',
                category: 'CONFIGURATION_MISSING',
                description: 'No explicit mapping between UI button types and their expected working directories',
                symptoms: [
                    'All buttons result in same working directory',
                    'Button type information ignored in directory selection',
                    'No way to customize directory per instance type',
                    'User expectation mismatch with actual behavior'
                ],
                antiPatternCode: `// ❌ ANTI-PATTERN: Button type ignored
function createRealClaudeInstance(instanceType, instanceId) {
  const workingDir = '/workspaces/agent-feed'; // instanceType unused
  // Directory selection ignores button context
}`,
                correctPatternCode: `// ✅ CORRECT: Button type drives directory selection
const BUTTON_DIRECTORY_MAP = {
  'prod': '/workspaces/agent-feed/prod',
  'dev': '/workspaces/agent-feed/dev',
  'staging': '/workspaces/agent-feed/staging',
  'skip-permissions': '/workspaces/agent-feed',
  'skip-permissions-c': '/workspaces/agent-feed',
  'skip-permissions-resume': '/workspaces/agent-feed'
};

function createRealClaudeInstance(instanceType, instanceId) {
  const workingDir = BUTTON_DIRECTORY_MAP[instanceType] || '/workspaces/agent-feed';
  console.log(\`🚀 Spawning \${instanceType} in \${workingDir}\`);
  // Use workingDir based on button type
}`,
                preventionStrategy: 'Create explicit configuration mapping UI elements to their working directory contexts. Document the mapping and validate it in tests.',
                tddStrategy: `describe('Button Directory Mapping', () => {
  test('all button types have directory mappings', () => {
    const buttonTypes = ['prod', 'dev', 'staging', 'skip-permissions'];
    buttonTypes.forEach(type => {
      expect(BUTTON_DIRECTORY_MAP[type]).toBeDefined();
      expect(BUTTON_DIRECTORY_MAP[type]).toMatch(/^\/workspaces\/agent-feed/);
    });
  });
  
  test('directory mapping is applied in process creation', () => {
    const mockSpawn = jest.fn();
    createRealClaudeInstance('prod', 'test-id');
    expect(mockSpawn).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        cwd: '/workspaces/agent-feed/prod'
      })
    );
  });
});`,
                realWorldExample: {
                    context: 'Frontend has multiple button types (prod, dev, staging) but backend treats them identically',
                    userExpectation: 'Different buttons should spawn processes in different contextual directories',
                    actualBehavior: 'All buttons spawn in the same hardcoded directory',
                    impact: 'Loss of context separation, confusion about which environment is active'
                },
                detectionRules: [
                    'instanceType parameter not used in working directory selection',
                    'no BUTTON_DIRECTORY_MAP or similar configuration',
                    'hardcoded single directory regardless of button type',
                    'missing contextual directory logic'
                ],
                severity: 'high',
                frequency: 0,
                lastDetected: ''
            },
            {
                id: 'WD_NO_VALIDATION',
                name: 'No Working Directory Validation',
                category: 'VALIDATION_MISSING',
                description: 'Working directories not validated for existence or accessibility before use',
                symptoms: [
                    'Process fails silently when directory does not exist',
                    'No error handling for invalid working directories',
                    'Spawn failures without clear error messages',
                    'Directory permission issues not detected'
                ],
                antiPatternCode: `// ❌ ANTI-PATTERN: No validation
function createRealClaudeInstance(instanceType, instanceId) {
  const workingDir = getWorkingDirectory(instanceType);
  const claudeProcess = spawn(command, args, {
    cwd: workingDir // No validation if directory exists
  });
}`,
                correctPatternCode: `// ✅ CORRECT: Validate and create directories
function createRealClaudeInstance(instanceType, instanceId) {
  const workingDir = getWorkingDirectory(instanceType);
  
  // Validate working directory
  if (!fs.existsSync(workingDir)) {
    console.log(\`📁 Creating working directory: \${workingDir}\`);
    fs.mkdirSync(workingDir, { recursive: true });
  }
  
  // Validate accessibility
  try {
    fs.accessSync(workingDir, fs.constants.R_OK | fs.constants.W_OK);
  } catch (error) {
    throw new Error(\`Working directory not accessible: \${workingDir}\`);
  }
  
  const claudeProcess = spawn(command, args, {
    cwd: workingDir
  });
}`,
                preventionStrategy: 'Always validate working directory existence and accessibility before process creation. Auto-create directories when needed with proper error handling.',
                tddStrategy: `describe('Working Directory Validation', () => {
  test('creates missing directories automatically', async () => {
    const testDir = '/tmp/test-working-dir';
    await createRealClaudeInstance('test', 'test-id');
    expect(fs.existsSync(testDir)).toBe(true);
  });
  
  test('throws error for inaccessible directories', () => {
    const restrictedDir = '/root/restricted';
    expect(() => {
      createRealClaudeInstance('restricted', 'test-id');
    }).toThrow('Working directory not accessible');
  });
});`,
                realWorldExample: {
                    context: 'User clicks button for environment that does not have corresponding directory created',
                    userExpectation: 'System should handle missing directories gracefully',
                    actualBehavior: 'Process spawn fails with unclear error message',
                    impact: 'Poor user experience, difficult debugging, system appears broken'
                },
                detectionRules: [
                    'no fs.existsSync check before spawn',
                    'no directory creation logic',
                    'no access permission validation',
                    'spawn called without working directory validation'
                ],
                severity: 'medium',
                frequency: 0,
                lastDetected: ''
            }
        ];
        await this.loadExistingData();
    }
    /**
     * Record detection of an anti-pattern
     */
    async recordDetection(antiPatternId, context) {
        const pattern = this.antiPatterns.find(p => p.id === antiPatternId);
        if (pattern) {
            pattern.frequency += 1;
            pattern.lastDetected = new Date().toISOString();
            await this.saveData();
        }
    }
    /**
     * Get anti-patterns by category
     */
    getPatternsByCategory(category) {
        return this.antiPatterns.filter(p => p.category === category);
    }
    /**
     * Get anti-patterns by severity
     */
    getPatternsBySeverity(severity) {
        return this.antiPatterns.filter(p => p.severity === severity);
    }
    /**
     * Get most frequently detected patterns
     */
    getMostFrequentPatterns(limit = 10) {
        return this.antiPatterns
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, limit);
    }
    /**
     * Generate TDD prevention strategies for all patterns
     */
    getTDDPreventionStrategies() {
        return this.antiPatterns.map(pattern => ({
            patternName: pattern.name,
            testStrategy: pattern.tddStrategy,
            preventionCode: pattern.correctPatternCode
        }));
    }
    /**
     * Export anti-patterns for external analysis
     */
    async exportForAnalysis() {
        const categoryCounts = {};
        const severityCounts = {};
        this.antiPatterns.forEach(pattern => {
            categoryCounts[pattern.category] = (categoryCounts[pattern.category] || 0) + 1;
            severityCounts[pattern.severity] = (severityCounts[pattern.severity] || 0) + 1;
        });
        const exportData = {
            patterns: this.antiPatterns,
            summary: {
                totalPatterns: this.antiPatterns.length,
                categoryCounts,
                severityCounts,
                topDetected: this.getMostFrequentPatterns(5).map(p => ({
                    name: p.name,
                    frequency: p.frequency
                }))
            },
            exportPath: ''
        };
        const exportPath = '/workspaces/agent-feed/neural-exports/working-directory-anti-patterns-analysis.json';
        // Ensure directory exists
        await fs.promises.mkdir(path.dirname(exportPath), { recursive: true });
        await fs.promises.writeFile(exportPath, JSON.stringify(exportData, null, 2));
        exportData.exportPath = exportPath;
        return exportData;
    }
    /**
     * Load existing data from database
     */
    async loadExistingData() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const data = await fs.promises.readFile(this.dbPath, 'utf-8');
                const savedPatterns = JSON.parse(data);
                // Merge with existing patterns, updating frequency data
                savedPatterns.forEach((saved) => {
                    const existing = this.antiPatterns.find(p => p.id === saved.id);
                    if (existing) {
                        existing.frequency = saved.frequency;
                        existing.lastDetected = saved.lastDetected;
                    }
                });
            }
        }
        catch (error) {
            console.error('Error loading existing anti-patterns data:', error);
        }
    }
    /**
     * Save data to database
     */
    async saveData() {
        try {
            await fs.promises.mkdir(path.dirname(this.dbPath), { recursive: true });
            await fs.promises.writeFile(this.dbPath, JSON.stringify(this.antiPatterns, null, 2));
        }
        catch (error) {
            console.error('Error saving anti-patterns data:', error);
        }
    }
    /**
     * Get all anti-patterns
     */
    getAllPatterns() {
        return [...this.antiPatterns];
    }
}
exports.WorkingDirectoryAntiPatternsDatabase = WorkingDirectoryAntiPatternsDatabase;
//# sourceMappingURL=working-directory-anti-patterns-database.js.map