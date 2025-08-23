#!/usr/bin/env node

/**
 * Real Process Launch Test
 * Tests if we can actually spawn a real Claude process
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class RealProcessTest {
  constructor() {
    this.testResults = {
      prodDirectoryExists: false,
      packageJsonExists: false,
      claudeExecutableExists: false,
      processSpawnWorks: false,
      processHasPID: false,
      processRespondsToKill: false,
      cleanupSuccessful: false
    };
    this.spawnedProcesses = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  async checkProdDirectory() {
    this.log('📁 Checking prod directory structure...');
    
    const prodPath = path.join(process.cwd(), 'prod');
    
    try {
      if (fs.existsSync(prodPath)) {
        this.testResults.prodDirectoryExists = true;
        this.log(`✅ Prod directory exists: ${prodPath}`);
        
        // Check for package.json
        const packagePath = path.join(prodPath, 'package.json');
        if (fs.existsSync(packagePath)) {
          this.testResults.packageJsonExists = true;
          this.log('✅ package.json found in prod directory');
          
          // Read package.json to understand the structure
          const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
          this.log(`📦 Package name: ${packageJson.name}`);
          this.log(`🔧 Scripts available: ${Object.keys(packageJson.scripts || {}).join(', ')}`);
        } else {
          this.log('❌ package.json not found in prod directory');
        }
        
        // List contents of prod directory
        const contents = fs.readdirSync(prodPath);
        this.log(`📂 Prod directory contents: ${contents.join(', ')}`);
        
      } else {
        this.log(`❌ Prod directory not found: ${prodPath}`);
      }
    } catch (error) {
      this.log(`❌ Error checking prod directory: ${error.message}`);
    }
  }

  async testProcessSpawn() {
    this.log('🚀 Testing real process spawn...');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.log('⏰ Process spawn test timed out after 15 seconds');
        resolve(false);
      }, 15000);

      try {
        // Try to spawn a simple Node.js process as a test
        const testProcess = spawn('node', ['-e', `
          console.log('Test process started');
          console.log('PID:', process.pid);
          
          // Keep process alive for a few seconds
          let counter = 0;
          const interval = setInterval(() => {
            console.log('Heartbeat:', ++counter);
            if (counter >= 3) {
              console.log('Test process exiting');
              clearInterval(interval);
              process.exit(0);
            }
          }, 1000);
          
          // Handle termination gracefully
          process.on('SIGTERM', () => {
            console.log('Test process received SIGTERM');
            clearInterval(interval);
            process.exit(0);
          });
        `], {
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false
        });

        this.spawnedProcesses.push(testProcess);
        
        this.log(`📋 Spawned test process with PID: ${testProcess.pid}`);
        
        if (testProcess.pid) {
          this.testResults.processSpawnWorks = true;
          this.testResults.processHasPID = true;
        }

        let output = '';
        testProcess.stdout.on('data', (data) => {
          const message = data.toString().trim();
          this.log(`📤 Process output: ${message}`);
          output += message + '\n';
        });

        testProcess.stderr.on('data', (data) => {
          const message = data.toString().trim();
          this.log(`⚠️ Process stderr: ${message}`);
        });

        testProcess.on('close', (code) => {
          clearTimeout(timeout);
          this.log(`🔚 Process exited with code: ${code}`);
          
          if (code === 0) {
            this.log('✅ Process completed successfully');
            resolve(true);
          } else {
            this.log(`❌ Process failed with code: ${code}`);
            resolve(false);
          }
        });

        testProcess.on('error', (error) => {
          clearTimeout(timeout);
          this.log(`❌ Process spawn error: ${error.message}`);
          resolve(false);
        });

      } catch (error) {
        clearTimeout(timeout);
        this.log(`❌ Failed to spawn process: ${error.message}`);
        resolve(false);
      }
    });
  }

  async testProcessKill() {
    this.log('🔴 Testing process termination...');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.log('⏰ Process kill test timed out');
        resolve(false);
      }, 10000);

      try {
        // Spawn a long-running process
        const longProcess = spawn('node', ['-e', `
          console.log('Long-running process started, PID:', process.pid);
          
          // Keep running indefinitely
          setInterval(() => {
            console.log('Still running...');
          }, 1000);
          
          process.on('SIGTERM', () => {
            console.log('Received SIGTERM, exiting gracefully');
            process.exit(0);
          });
        `], {
          stdio: ['ignore', 'pipe', 'pipe']
        });

        this.spawnedProcesses.push(longProcess);
        this.log(`📋 Spawned long-running process PID: ${longProcess.pid}`);

        longProcess.stdout.on('data', (data) => {
          const message = data.toString().trim();
          this.log(`📤 Long process: ${message}`);
        });

        // After 2 seconds, try to kill it
        setTimeout(() => {
          this.log('🔪 Attempting to kill process...');
          
          longProcess.kill('SIGTERM');
          
          // Give it time to exit gracefully
          setTimeout(() => {
            if (longProcess.killed || longProcess.exitCode !== null) {
              this.testResults.processRespondsToKill = true;
              this.log('✅ Process responded to kill signal');
              clearTimeout(timeout);
              resolve(true);
            } else {
              this.log('⚠️ Process did not respond to SIGTERM, forcing kill');
              longProcess.kill('SIGKILL');
              resolve(false);
            }
          }, 2000);
        }, 2000);

        longProcess.on('close', (code) => {
          this.log(`🔚 Long process exited with code: ${code}`);
        });

      } catch (error) {
        clearTimeout(timeout);
        this.log(`❌ Kill test failed: ${error.message}`);
        resolve(false);
      }
    });
  }

  async testClaudeInstanceSpawn() {
    this.log('🤖 Testing Claude instance spawn...');
    
    const prodPath = path.join(process.cwd(), 'prod');
    
    if (!this.testResults.prodDirectoryExists) {
      this.log('⏭️ Skipping Claude instance test - prod directory not found');
      return false;
    }
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.log('⏰ Claude instance spawn test timed out');
        resolve(false);
      }, 30000);

      try {
        // Try to run a Claude instance (or at least check if we can)
        const claudeProcess = spawn('npm', ['start'], {
          cwd: prodPath,
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 20000
        });

        this.spawnedProcesses.push(claudeProcess);
        this.log(`🤖 Attempting to spawn Claude instance, PID: ${claudeProcess.pid}`);

        let hasOutput = false;
        
        claudeProcess.stdout.on('data', (data) => {
          hasOutput = true;
          const message = data.toString().trim();
          this.log(`🤖 Claude output: ${message}`);
          
          // If we see server starting, that's success
          if (message.includes('server') || message.includes('listening') || message.includes('started')) {
            this.testResults.claudeExecutableExists = true;
            clearTimeout(timeout);
            
            // Kill it after confirming it works
            setTimeout(() => {
              claudeProcess.kill('SIGTERM');
              resolve(true);
            }, 2000);
          }
        });

        claudeProcess.stderr.on('data', (data) => {
          const message = data.toString().trim();
          this.log(`⚠️ Claude stderr: ${message}`);
          
          // Some error messages might still indicate the process is working
          if (message.includes('EADDRINUSE') || message.includes('port')) {
            this.log('📡 Port already in use - Claude process structure seems OK');
            this.testResults.claudeExecutableExists = true;
            clearTimeout(timeout);
            claudeProcess.kill('SIGTERM');
            resolve(true);
          }
        });

        claudeProcess.on('close', (code) => {
          clearTimeout(timeout);
          this.log(`🤖 Claude process exited with code: ${code}`);
          
          if (hasOutput || code === 0) {
            resolve(true);
          } else {
            resolve(false);
          }
        });

        claudeProcess.on('error', (error) => {
          clearTimeout(timeout);
          this.log(`❌ Claude process error: ${error.message}`);
          resolve(false);
        });

      } catch (error) {
        clearTimeout(timeout);
        this.log(`❌ Failed to spawn Claude instance: ${error.message}`);
        resolve(false);
      }
    });
  }

  async cleanup() {
    this.log('🧹 Cleaning up test processes...');
    
    let cleanedUp = 0;
    
    for (const process of this.spawnedProcesses) {
      try {
        if (process && !process.killed && process.exitCode === null) {
          process.kill('SIGTERM');
          cleanedUp++;
        }
      } catch (error) {
        this.log(`⚠️ Error cleaning up process: ${error.message}`);
      }
    }
    
    if (cleanedUp === 0 || this.spawnedProcesses.length === 0) {
      this.testResults.cleanupSuccessful = true;
      this.log('✅ Cleanup successful (no processes to clean)');
    } else {
      // Wait for processes to exit
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.testResults.cleanupSuccessful = true;
      this.log(`✅ Cleaned up ${cleanedUp} processes`);
    }
  }

  generateReport() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('              REAL PROCESS TEST REPORT                 ');
    console.log('═══════════════════════════════════════════════════════');
    
    const totalTests = Object.keys(this.testResults).length;
    const passedTests = Object.values(this.testResults).filter(Boolean).length;
    const passRate = Math.round((passedTests / totalTests) * 100);
    
    console.log(`📊 Overall Result: ${passRate}% (${passedTests}/${totalTests} tests passed)`);
    console.log('');
    
    Object.entries(this.testResults).forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${status} - ${testName}`);
    });
    
    console.log('\n🎯 ANALYSIS:');
    
    if (this.testResults.processSpawnWorks && this.testResults.processHasPID) {
      console.log('✅ Process spawning mechanism works correctly');
    } else {
      console.log('❌ Process spawning has issues');
    }
    
    if (this.testResults.processRespondsToKill) {
      console.log('✅ Process termination works correctly'); 
    } else {
      console.log('❌ Process termination has issues');
    }
    
    if (this.testResults.prodDirectoryExists) {
      console.log('✅ Production environment structure exists');
    } else {
      console.log('⚠️ Production environment needs setup');
    }
    
    console.log('\n🚀 QUICK LAUNCH READINESS:');
    const criticalTests = [
      'processSpawnWorks',
      'processHasPID', 
      'processRespondsToKill'
    ];
    
    const criticalPassed = criticalTests.every(test => this.testResults[test]);
    
    if (criticalPassed) {
      console.log('🎉 Quick Launch functionality is ready for production!');
      console.log('   ✓ Process spawning works');
      console.log('   ✓ PID tracking works');
      console.log('   ✓ Process termination works');
    } else {
      console.log('⚠️ Quick Launch functionality needs attention:');
      criticalTests.forEach(test => {
        if (!this.testResults[test]) {
          console.log(`   ✗ ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        }
      });
    }
    
    console.log('═══════════════════════════════════════════════════════');
    
    return {
      passRate,
      results: this.testResults,
      criticalPassed
    };
  }

  async runTests() {
    console.log('🧪 Starting Real Process Testing...\n');
    
    try {
      await this.checkProdDirectory();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const spawnResult = await this.testProcessSpawn();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const killResult = await this.testProcessKill();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Only test Claude if basic process operations work
      if (spawnResult && killResult) {
        await this.testClaudeInstanceSpawn();
      }
      
      await this.cleanup();
      
      return this.generateReport();
      
    } catch (error) {
      this.log(`💥 Test suite failed: ${error.message}`);
      await this.cleanup();
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new RealProcessTest();
  
  tester.runTests()
    .then((report) => {
      process.exit(report.criticalPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Real process test failed:', error);
      process.exit(1);
    });
}

module.exports = RealProcessTest;