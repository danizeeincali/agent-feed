#!/usr/bin/env node

/**
 * Adaptive Communication Strategy - Intelligent method selection for Claude API calls
 * Prevents stdin blocking by using argument-based and file-based communication
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AdaptiveCommunicationStrategy {
  constructor(options = {}) {
    this.options = {
      debug: options.debug || false,
      maxArgLength: options.maxArgLength || 8000, // Max command line argument length
      tempDir: options.tempDir || '/tmp',
      workingDirectory: options.workingDirectory || process.env.WORKSPACE_ROOT || process.cwd(),
      ...options
    };
    
    this.statistics = {
      argumentBased: { attempts: 0, successes: 0, failures: 0 },
      fileBased: { attempts: 0, successes: 0, failures: 0 },
      improvedStdin: { attempts: 0, successes: 0, failures: 0 },
      fallbacks: 0
    };
    
    if (this.options.debug) {
      console.log('🔧 AdaptiveCommunicationStrategy initialized');
    }
  }
  
  /**
   * Select the best communication method for a given prompt
   * @param {string} prompt - The prompt to analyze
   * @param {object} context - Request context
   * @returns {string} - Selected method name
   */
  selectStrategy(prompt, context = {}) {
    // Force a specific method if requested
    if (context.method) {
      return context.method;
    }
    
    // For very long prompts, use file-based approach
    if (prompt.length > this.options.maxArgLength) {
      return 'file';
    }
    
    // Check for special characters that might cause shell escaping issues
    if (this.hasProblematicCharacters(prompt)) {
      return 'file';
    }
    
    // Default to argument-based (most reliable)
    return 'argument';
  }
  
  /**
   * Execute prompt with fallback strategies
   * @param {string} prompt - Prompt to execute
   * @param {object} config - Configuration options
   * @returns {Promise<object>} - Execution result
   */
  async executeWithFallback(prompt, config = {}) {
    const strategies = ['argument', 'file', 'improved-stdin'];
    const forceFail = config.forceFail || [];
    let lastError = null;
    let attemptCount = 0;
    
    for (const strategy of strategies) {
      // Skip strategies forced to fail (for testing)
      if (forceFail.includes(strategy)) {
        continue;
      }
      
      attemptCount++;
      
      try {
        if (this.options.debug && attemptCount > 1) {
          console.log(`🔄 Trying fallback strategy: ${strategy}`);
        }
        
        const result = await this.executeStrategy(strategy, prompt, config);
        
        if (result.success) {
          this.statistics[this.getStatKey(strategy)].successes++;
          
          return {
            ...result,
            method_used: strategy,
            retry_count: attemptCount - 1
          };
        }
        
      } catch (error) {
        lastError = error;
        this.statistics[this.getStatKey(strategy)].failures++;
        
        if (this.options.debug) {
          console.log(`⚠️ Strategy ${strategy} failed: ${error.message}`);
        }
      }
    }
    
    // All strategies failed
    this.statistics.fallbacks++;
    
    return {
      success: false,
      error: `All communication strategies failed. Last error: ${lastError?.message}`,
      method_used: 'none',
      retry_count: attemptCount
    };
  }
  
  /**
   * Execute a specific communication strategy
   * @param {string} strategy - Strategy to use
   * @param {string} prompt - Prompt to execute
   * @param {object} config - Configuration
   * @returns {Promise<object>} - Execution result
   */
  async executeStrategy(strategy, prompt, config) {
    this.statistics[this.getStatKey(strategy)].attempts++;
    
    switch (strategy) {
      case 'argument':
        return this.executeArgumentBased(prompt, config);
      case 'file':
        return this.executeFileBased(prompt, config);
      case 'improved-stdin':
        return this.executeImprovedStdin(prompt, config);
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }
  
  /**
   * Execute using command line arguments (most reliable)
   * @param {string} prompt - Prompt to execute
   * @param {object} config - Configuration
   * @returns {Promise<object>} - Execution result
   */
  async executeArgumentBased(prompt, config) {
    if (this.options.debug) {
      console.log('🎯 Using argument-based communication');
    }
    
    // Escape the prompt for shell safety
    const escapedPrompt = this.escapeShellArgument(prompt);
    
    const args = [
      '--print',
      '--output-format', 'json',
      '--dangerously-skip-permissions',
      escapedPrompt
    ];
    
    return this.spawnClaudeProcess(args, config, { stdio: ['ignore', 'pipe', 'pipe'] });
  }
  
  /**
   * Execute using temporary file (handles large prompts)
   * @param {string} prompt - Prompt to execute
   * @param {object} config - Configuration
   * @returns {Promise<object>} - Execution result
   */
  async executeFileBased(prompt, config) {
    if (this.options.debug) {
      console.log('📄 Using file-based communication');
    }
    
    const tempFileName = `claude-prompt-${crypto.randomUUID()}.txt`;
    const tempFilePath = path.join(this.options.tempDir, tempFileName);
    
    try {
      // Write prompt to temporary file
      await fs.writeFile(tempFilePath, prompt, 'utf8');
      
      const args = [
        '--print',
        '--output-format', 'json',
        '--dangerously-skip-permissions',
        `Read and respond to the prompt in this file: ${tempFilePath}`
      ];
      
      const result = await this.spawnClaudeProcess(args, config, { stdio: ['ignore', 'pipe', 'pipe'] });
      
      return result;
      
    } finally {
      // Always cleanup temp file
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        if (this.options.debug) {
          console.log(`⚠️ Could not delete temp file ${tempFilePath}:`, unlinkError.message);
        }
      }
    }
  }
  
  /**
   * Execute using improved stdin handling (last resort)
   * @param {string} prompt - Prompt to execute
   * @param {object} config - Configuration
   * @returns {Promise<object>} - Execution result
   */
  async executeImprovedStdin(prompt, config) {
    if (this.options.debug) {
      console.log('📝 Using improved stdin communication');
    }
    
    const args = [
      '--print',
      '--output-format', 'json',
      '--dangerously-skip-permissions'
    ];
    
    const spawnOptions = {
      stdio: ['pipe', 'pipe', 'pipe'],
      stdin: prompt + '\n\n' // Double newline for proper termination
    };
    
    return this.spawnClaudeProcess(args, config, spawnOptions);
  }
  
  /**
   * Spawn Claude process with consistent error handling
   * @param {string[]} args - Command arguments
   * @param {object} config - Configuration
   * @param {object} spawnOptions - Spawn options
   * @returns {Promise<object>} - Process result
   */
  async spawnClaudeProcess(args, config, spawnOptions) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const claudeProcess = spawn('claude', args, {
        cwd: config.workingDirectory || this.options.workingDirectory,
        ...spawnOptions
      });
      
      let stdout = '';
      let stderr = '';
      let processCompleted = false;
      
      // Set up data collection
      if (claudeProcess.stdout) {
        claudeProcess.stdout.on('data', (data) => {
          stdout += data.toString();
          if (config.onProgress) {
            config.onProgress({ type: 'stdout', data: data.toString() });
          }
        });
      }
      
      if (claudeProcess.stderr) {
        claudeProcess.stderr.on('data', (data) => {
          stderr += data.toString();
          if (config.onProgress) {
            config.onProgress({ type: 'stderr', data: data.toString() });
          }
        });
      }
      
      // Handle process completion
      claudeProcess.on('close', (code, signal) => {
        processCompleted = true;
        clearTimeout(timeoutHandle);
        
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          try {
            // Try to parse JSON response
            const jsonResponse = JSON.parse(stdout.trim() || '{}');
            
            resolve({
              success: true,
              result: jsonResponse.result || stdout.trim(),
              raw_output: stdout,
              duration_ms: duration,
              exit_code: code
            });
          } catch (parseError) {
            // If not JSON, return raw output
            resolve({
              success: true,
              result: stdout.trim(),
              raw_output: stdout,
              duration_ms: duration,
              exit_code: code,
              parse_warning: 'Response was not valid JSON'
            });
          }
        } else {
          reject(new Error(`Claude process exited with code ${code}: ${stderr}`));
        }
      });
      
      // Handle process errors
      claudeProcess.on('error', (error) => {
        processCompleted = true;
        clearTimeout(timeoutHandle);
        reject(new Error(`Claude process spawn failed: ${error.message}`));
      });
      
      // Handle stdin if provided
      if (spawnOptions.stdin && claudeProcess.stdin) {
        try {
          claudeProcess.stdin.write(spawnOptions.stdin);
          claudeProcess.stdin.end();
        } catch (stdinError) {
          reject(new Error(`Failed to write to stdin: ${stdinError.message}`));
          return;
        }
      }
      
      // Set up timeout
      const timeout = config.timeout || 60000;
      const timeoutHandle = setTimeout(() => {
        if (!processCompleted) {
          claudeProcess.kill('SIGTERM');
          
          // Force kill after 2 seconds
          setTimeout(() => {
            if (!claudeProcess.killed) {
              claudeProcess.kill('SIGKILL');
            }
          }, 2000);
          
          reject(new Error(`Claude process timed out after ${timeout}ms`));
        }
      }, timeout);
    });
  }
  
  /**
   * Check if prompt contains characters that might cause shell escaping issues
   * @param {string} prompt - Prompt to check
   * @returns {boolean} - True if problematic characters found
   */
  hasProblematicCharacters(prompt) {
    // Check for characters that are difficult to escape in shell
    const problematicChars = /[`$\\";|&<>()[\]{}*?~!]/;
    const hasNewlines = prompt.includes('\n');
    const hasQuotes = prompt.includes('"') || prompt.includes("'");
    
    return problematicChars.test(prompt) || hasNewlines || hasQuotes;
  }
  
  /**
   * Safely escape shell argument
   * @param {string} arg - Argument to escape
   * @returns {string} - Escaped argument
   */
  escapeShellArgument(arg) {
    // Simple but effective shell escaping
    return `'${arg.replace(/'/g, "'\"'\"'")}'`;
  }
  
  /**
   * Get statistics key for a strategy
   * @param {string} strategy - Strategy name
   * @returns {string} - Statistics key
   */
  getStatKey(strategy) {
    const keyMap = {
      'argument': 'argumentBased',
      'file': 'fileBased', 
      'improved-stdin': 'improvedStdin'
    };
    
    return keyMap[strategy] || strategy;
  }
  
  /**
   * Get communication statistics
   * @returns {object} - Statistics
   */
  getStatistics() {
    return { ...this.statistics };
  }
  
  /**
   * Reset statistics
   */
  resetStatistics() {
    Object.keys(this.statistics).forEach(key => {
      if (typeof this.statistics[key] === 'object') {
        this.statistics[key] = { attempts: 0, successes: 0, failures: 0 };
      } else {
        this.statistics[key] = 0;
      }
    });
  }
}

module.exports = { AdaptiveCommunicationStrategy };

// Test if run directly
if (require.main === module) {
  (async () => {
    console.log('🧪 Testing AdaptiveCommunicationStrategy...');
    
    const strategy = new AdaptiveCommunicationStrategy({ debug: true });
    
    try {
      // Test strategy selection
      console.log('\n1️⃣ Testing strategy selection...');
      const shortPrompt = 'What is 2+2?';
      const longPrompt = 'Explain quantum computing in detail. '.repeat(100);
      
      console.log('Short prompt strategy:', strategy.selectStrategy(shortPrompt));
      console.log('Long prompt strategy:', strategy.selectStrategy(longPrompt));
      
      // Test execution
      console.log('\n2️⃣ Testing execution...');
      const result = await strategy.executeWithFallback('What is the capital of France?', { timeout: 30000 });
      console.log('Result:', result.success ? 'SUCCESS' : 'FAILED');
      console.log('Method used:', result.method_used);
      console.log('Response:', result.result?.substring(0, 100) + '...');
      
      // Test statistics
      console.log('\n3️⃣ Testing statistics...');
      const stats = strategy.getStatistics();
      console.log('Statistics:', stats);
      
      console.log('\n✅ All tests completed!');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      process.exit(1);
    }
  })();
}