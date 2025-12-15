/**
 * SPARC Process Singleton Guard
 * Prevents multiple backend instances from running simultaneously
 * Part of SPARC Phase 4: Refinement - Race Condition Prevention
 */

import fs from 'fs';
import path from 'path';

class ProcessSingletonGuard {
  constructor(processName = 'agent-feed-backend') {
    this.processName = processName;
    this.lockFile = path.join(process.env.WORKSPACE_ROOT || process.cwd(), `.${processName}.lock`);
    this.pid = process.pid;
  }

  async acquireLock() {
    try {
      // Check if lock file exists
      if (fs.existsSync(this.lockFile)) {
        const existingPid = fs.readFileSync(this.lockFile, 'utf8').trim();
        
        // Check if process with that PID is still running
        if (await this.isProcessRunning(existingPid)) {
          console.error(`❌ SPARC PROCESS GUARD: Another backend instance is already running (PID: ${existingPid})`);
          console.error(`   Lock file: ${this.lockFile}`);
          console.error(`   To force restart, delete the lock file and try again.`);
          process.exit(1);
        } else {
          console.log(`🔧 SPARC: Removing stale lock file for PID ${existingPid}`);
          fs.unlinkSync(this.lockFile);
        }
      }

      // Acquire lock for current process
      fs.writeFileSync(this.lockFile, this.pid.toString());
      console.log(`🔒 SPARC PROCESS GUARD: Lock acquired for PID ${this.pid}`);
      
      // Setup cleanup on process exit
      this.setupCleanupHandlers();
      
      return true;
    } catch (error) {
      console.error('❌ SPARC PROCESS GUARD: Failed to acquire lock:', error.message);
      process.exit(1);
    }
  }

  async isProcessRunning(pid) {
    try {
      // Send signal 0 to check if process exists
      process.kill(parseInt(pid), 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  setupCleanupHandlers() {
    const cleanup = () => {
      try {
        if (fs.existsSync(this.lockFile)) {
          const lockPid = fs.readFileSync(this.lockFile, 'utf8').trim();
          if (lockPid === this.pid.toString()) {
            fs.unlinkSync(this.lockFile);
            console.log(`🔓 SPARC PROCESS GUARD: Lock released for PID ${this.pid}`);
          }
        }
      } catch (error) {
        console.error('❌ SPARC: Error during cleanup:', error.message);
      }
    };

    // Handle various exit conditions
    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      console.log('\n🛑 SPARC: Received SIGINT, cleaning up...');
      cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      console.log('\n🛑 SPARC: Received SIGTERM, cleaning up...');
      cleanup();
      process.exit(0);
    });
    process.on('uncaughtException', (error) => {
      console.error('❌ SPARC: Uncaught exception:', error);
      cleanup();
      process.exit(1);
    });
  }

  static async initialize() {
    const guard = new ProcessSingletonGuard();
    await guard.acquireLock();
    return guard;
  }
}

export { ProcessSingletonGuard };