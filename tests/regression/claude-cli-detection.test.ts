/**
 * CRITICAL REGRESSION TEST: Claude CLI Detection
 * Prevents Claude CLI "not found" failures
 */

const fs = require('fs');
const path = require('path');

// Import the CLI detector
const claudeDetector = require('../../src/utils/claude-cli-detector');

describe('Claude CLI Detection Regression Tests', () => {
  beforeEach(() => {
    // Clear detector cache before each test
    claudeDetector.clearCache();
  });

  afterEach(() => {
    claudeDetector.clearCache();
  });

  it('should detect Claude CLI using which command', async () => {
    const detection = await claudeDetector.detectClaudeCLI();
    
    expect(detection).toBeDefined();
    expect(detection.available).toBe(true);
    expect(detection.path).toBeTruthy();
    expect(detection.source).toBeDefined();
    
    console.log('✅ Claude CLI Detection Result:', detection);
  });

  it('should find Claude CLI at known nvm path', async () => {
    const expectedPath = '/home/codespace/nvm/current/bin/claude';
    
    if (fs.existsSync(expectedPath)) {
      const detection = await claudeDetector.detectClaudeCLI();
      expect(detection.path).toBe(expectedPath);
    }
  });

  it('should cache CLI detection results', async () => {
    // First detection
    const detection1 = await claudeDetector.detectClaudeCLI();
    expect(detection1.source).not.toBe('cache');
    
    // Second detection should use cache
    const detection2 = await claudeDetector.detectClaudeCLI();
    expect(detection2.source).toBe('cache');
    expect(detection2.path).toBe(detection1.path);
  });

  it('should successfully spawn Claude CLI process', async () => {
    try {
      const testResult = await claudeDetector.testCLI();
      
      expect(testResult.success).toBe(true);
      expect(testResult.detection.available).toBe(true);
      expect(testResult.output).toContain('Claude Code');
      
      console.log('✅ Claude CLI Test Result:', testResult);
    } catch (error) {
      console.error('❌ Claude CLI Test Failed:', error);
      throw error;
    }
  });

  it('should handle CLI path not found gracefully', async () => {
    // Temporarily modify PATH to simulate missing CLI
    const originalPath = process.env.PATH;
    process.env.PATH = '/usr/bin:/bin'; // Remove paths with Claude CLI
    
    // Clear cache to force re-detection
    claudeDetector.clearCache();
    
    try {
      const detection = await claudeDetector.detectClaudeCLI();
      
      if (!detection.available) {
        expect(detection.error).toBeTruthy();
        expect(detection.path).toBeNull();
      }
    } finally {
      // Restore original PATH
      process.env.PATH = originalPath;
    }
  });

  it('should detect CLI version correctly', async () => {
    const detection = await claudeDetector.detectClaudeCLI();
    
    if (detection.available) {
      expect(detection.version).toBeTruthy();
      expect(detection.version).toMatch(/\d+\.\d+\.\d+/); // Version pattern
    }
  });

  it('should find Claude CLI in environment PATH', async () => {
    // Test that PATH searching works
    const pathDirs = (process.env.PATH || '').split(path.delimiter);
    let foundInPath = false;
    
    for (const dir of pathDirs) {
      const claudePath = path.join(dir, 'claude');
      if (fs.existsSync(claudePath)) {
        foundInPath = true;
        break;
      }
    }
    
    const detection = await claudeDetector.detectClaudeCLI();
    
    if (foundInPath) {
      expect(detection.available).toBe(true);
    }
  });

  it('should handle concurrent detection requests', async () => {
    // Test concurrent requests don't interfere
    const promises = Array(5).fill(0).map(() => claudeDetector.detectClaudeCLI());
    const results = await Promise.all(promises);
    
    // All results should be consistent
    const paths = results.map(r => r.path).filter(Boolean);
    if (paths.length > 0) {
      expect(new Set(paths).size).toBe(1); // All paths should be the same
    }
  });

  it('should validate executable permissions', async () => {
    const detection = await claudeDetector.detectClaudeCLI();
    
    if (detection.available && detection.path) {
      // Check file exists and is executable
      expect(fs.existsSync(detection.path)).toBe(true);
      
      try {
        fs.accessSync(detection.path, fs.constants.X_OK);
      } catch (error) {
        throw new Error(`Claude CLI not executable: ${detection.path}`);
      }
    }
  });

  it('should work from different working directories', async () => {
    const originalCwd = process.cwd();
    const tempDir = '/tmp';
    
    try {
      process.chdir(tempDir);
      const detection = await claudeDetector.detectClaudeCLI();
      
      // Should still find Claude CLI regardless of working directory
      if (fs.existsSync('/home/codespace/nvm/current/bin/claude')) {
        expect(detection.available).toBe(true);
      }
    } finally {
      process.chdir(originalCwd);
    }
  });
});

describe('CLI Detection Integration with Backend Servers', () => {
  it('should integrate with quick-server', async () => {
    // Test that our detector works with the server
    const detection = await claudeDetector.detectClaudeCLI();
    
    if (detection.available) {
      // Should be able to spawn process
      const process = await claudeDetector.spawnClaude(['--version']);
      expect(process).toBeDefined();
      expect(process.pid).toBeTruthy();
      
      // Clean up
      process.kill('SIGTERM');
    }
  });

  it('should maintain detection after cascade fixes', async () => {
    // Ensure cascade prevention doesn't break CLI detection
    const detection = await claudeDetector.detectClaudeCLI();
    
    // Detection should work regardless of UI cascade fixes
    expect(detection).toBeDefined();
    
    if (detection.available) {
      expect(detection.path).toBeTruthy();
      expect(fs.existsSync(detection.path)).toBe(true);
    }
  });
});