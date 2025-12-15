/**
 * CRITICAL FIX: Robust Claude CLI Detection Utility
 * Handles multiple installation paths and execution contexts
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class ClaudeCLIDetector {
  constructor() {
    this.knownPaths = [
      '/home/codespace/nvm/current/bin/claude',
      '/home/codespace/.local/bin/claude', 
      '/usr/local/bin/claude',
      '/usr/bin/claude',
      path.join(os.homedir(), '.local/bin/claude'),
      path.join(os.homedir(), 'nvm/current/bin/claude'),
      path.join(os.homedir(), '.nvm/current/bin/claude')
    ];
    
    this.cache = {
      path: null,
      version: null,
      lastCheck: 0,
      ttl: 60000 // 1 minute cache
    };
  }

  /**
   * Find Claude CLI with comprehensive path checking
   */
  async detectClaudeCLI() {
    // Check cache first
    if (this.cache.path && (Date.now() - this.cache.lastCheck) < this.cache.ttl) {
      return {
        path: this.cache.path,
        version: this.cache.version,
        available: true,
        source: 'cache'
      };
    }

    console.log('🔍 Starting comprehensive Claude CLI detection...');
    
    // Method 1: Try 'which' command
    try {
      const whichResult = execSync('which claude', { encoding: 'utf8', timeout: 5000 }).trim();
      if (whichResult && fs.existsSync(whichResult)) {
        const version = await this.getVersion(whichResult);
        this.updateCache(whichResult, version);
        console.log(`✅ Found Claude CLI via 'which': ${whichResult}`);
        return {
          path: whichResult,
          version,
          available: true,
          source: 'which'
        };
      }
    } catch (error) {
      console.log('❌ "which claude" failed:', error.message);
    }

    // Method 2: Check known paths
    for (const testPath of this.knownPaths) {
      try {
        if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
          // Check if executable
          fs.accessSync(testPath, fs.constants.X_OK);
          const version = await this.getVersion(testPath);
          this.updateCache(testPath, version);
          console.log(`✅ Found Claude CLI at known path: ${testPath}`);
          return {
            path: testPath,
            version,
            available: true,
            source: 'known-path'
          };
        }
      } catch (error) {
        console.log(`❌ Path ${testPath} not accessible:`, error.message);
      }
    }

    // Method 3: Search PATH manually
    const pathEnv = process.env.PATH || '';
    const pathDirs = pathEnv.split(path.delimiter).filter(Boolean);
    
    for (const dir of pathDirs) {
      const claudePath = path.join(dir, 'claude');
      try {
        if (fs.existsSync(claudePath) && fs.statSync(claudePath).isFile()) {
          fs.accessSync(claudePath, fs.constants.X_OK);
          const version = await this.getVersion(claudePath);
          this.updateCache(claudePath, version);
          console.log(`✅ Found Claude CLI in PATH: ${claudePath}`);
          return {
            path: claudePath,
            version,
            available: true,
            source: 'path-search'
          };
        }
      } catch (error) {
        // Silent fail for PATH search
      }
    }

    console.log('❌ Claude CLI not found in any location');
    return {
      path: null,
      version: null,
      available: false,
      source: 'none',
      error: 'Claude CLI not found in system'
    };
  }

  /**
   * Get Claude CLI version
   */
  async getVersion(claudePath) {
    try {
      const result = execSync(`"${claudePath}" --version`, { 
        encoding: 'utf8', 
        timeout: 5000,
        stdio: 'pipe'
      }).trim();
      return result;
    } catch (error) {
      console.warn(`Failed to get version for ${claudePath}:`, error.message);
      return 'unknown';
    }
  }

  /**
   * Update detection cache
   */
  updateCache(path, version) {
    this.cache = {
      path,
      version,
      lastCheck: Date.now(),
      ttl: 60000
    };
  }

  /**
   * Clear cache to force re-detection
   */
  clearCache() {
    this.cache = {
      path: null,
      version: null,
      lastCheck: 0,
      ttl: 60000
    };
  }

  /**
   * Spawn Claude CLI process with proper path resolution
   */
  async spawnClaude(args = [], options = {}) {
    const detection = await this.detectClaudeCLI();
    
    if (!detection.available) {
      throw new Error(`Claude CLI not available: ${detection.error}`);
    }

    console.log(`🚀 Spawning Claude CLI: ${detection.path} with args:`, args);
    
    return spawn(detection.path, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Ensure PATH includes Claude CLI directory
        PATH: `${path.dirname(detection.path)}:${process.env.PATH}`
      },
      ...options
    });
  }

  /**
   * Test Claude CLI functionality
   */
  async testCLI() {
    const detection = await this.detectClaudeCLI();
    
    if (!detection.available) {
      return {
        success: false,
        error: detection.error,
        detection
      };
    }

    try {
      const claudeProcess = await this.spawnClaude(['--version']);
      
      return new Promise((resolve) => {
        let output = '';
        let errorOutput = '';
        
        claudeProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        claudeProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        claudeProcess.on('close', (code) => {
          resolve({
            success: code === 0,
            output: output.trim(),
            error: errorOutput.trim(),
            exitCode: code,
            detection
          });
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
          claudeProcess.kill('SIGTERM');
          resolve({
            success: false,
            error: 'Test timeout',
            detection
          });
        }, 10000);
      });
    } catch (error) {
      return {
        success: false,
        error: error.message,
        detection
      };
    }
  }
}

// Export singleton instance
const claudeCLIDetector = new ClaudeCLIDetector();
module.exports = claudeCLIDetector;
