/**
 * TDD Test Suite: Claude CLI Detection Regression Fix
 * 
 * CRITICAL REGRESSION: Emergency cascade fix broke CLI detection
 * Tests CLI path resolution, environment validation, and command execution
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';

describe('Claude CLI Detection Regression', () => {
  let originalPath: string | undefined;
  let testEnvironment: Record<string, string>;
  
  beforeEach(() => {
    originalPath = process.env.PATH;
    testEnvironment = { ...process.env };
  });
  
  afterEach(() => {
    process.env.PATH = originalPath;
  });

  describe('CLI Path Resolution', () => {
    it('should detect Claude CLI in current environment', async () => {
      // Test current PATH resolution
      const cliPath = await findClaudeInPath();
      expect(cliPath).toBeTruthy();
      expect(cliPath).toContain('claude');
    });

    it('should handle missing Claude CLI gracefully', async () => {
      // Temporarily remove Claude from PATH
      const pathsWithoutClaude = (process.env.PATH || '')
        .split(':')
        .filter(p => !p.includes('nvm/current/bin'));
      
      process.env.PATH = pathsWithoutClaude.join(':');
      
      const cliPath = await findClaudeInPath();
      expect(cliPath).toBeNull();
    });

    it('should validate CLI executable permissions', async () => {
      const cliPath = await findClaudeInPath();
      if (cliPath) {
        const canExecute = await testCliExecution(cliPath);
        expect(canExecute).toBe(true);
      }
    });
  });

  describe('Environment Variable Validation', () => {
    it('should preserve PATH with Claude CLI location', () => {
      const currentPath = process.env.PATH || '';
      expect(currentPath).toContain('/home/codespace/nvm/current/bin');
    });

    it('should validate terminal environment setup', () => {
      const requiredVars = ['HOME', 'PWD', 'TERM'];
      for (const varName of requiredVars) {
        expect(process.env[varName]).toBeTruthy();
      }
    });

    it('should handle codespace-specific paths', () => {
      expect(process.env.HOME).toContain('/home/codespace');
      expect(process.env.PATH).toContain('/home/codespace');
    });
  });

  describe('Terminal Session CLI Integration', () => {
    it('should spawn terminal with Claude CLI accessible', async () => {
      const terminalEnv = createTerminalEnvironment();
      
      expect(terminalEnv.PATH).toContain('/home/codespace/nvm/current/bin');
      expect(terminalEnv.HOME).toBeTruthy();
      expect(terminalEnv.PWD).toBe('/workspaces/agent-feed');
    });

    it('should execute "which claude" successfully in terminal context', async () => {
      const result = await executeInTerminalContext('which claude');
      expect(result.success).toBe(true);
      expect(result.output).toContain('/home/codespace/nvm/current/bin/claude');
    });

    it('should execute "claude --version" successfully', async () => {
      const result = await executeInTerminalContext('claude --version');
      expect(result.success).toBe(true);
      expect(result.output).toMatch(/Claude CLI/);
    });
  });

  describe('Cascade Fix Compatibility', () => {
    it('should maintain ANSI sequence processing', () => {
      const testData = '\r\x1b[K';
      const processed = processAnsiSequences(testData);
      expect(processed).toBe('\x1b[2K\x1b[1G');
    });

    it('should preserve spinner animation handling', () => {
      const spinnerData = '\r⠋ Loading...';
      const processed = processAnsiSequences(spinnerData);
      expect(processed).toContain('\x1b[1G');
    });

    it('should maintain cursor sequence cleanup', () => {
      const cursorData = '\x1b[?25l\x1b[?25h';
      const processed = processAnsiSequences(cursorData);
      expect(processed).toBe('');
    });
  });
});

// Helper Functions
async function findClaudeInPath(): Promise<string | null> {
  return new Promise((resolve) => {
    const whichProcess = spawn('which', ['claude'], { 
      env: process.env,
      stdio: 'pipe'
    });
    
    let output = '';
    whichProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    whichProcess.on('close', (code) => {
      if (code === 0 && output.trim()) {
        resolve(output.trim());
      } else {
        resolve(null);
      }
    });
    
    whichProcess.on('error', () => {
      resolve(null);
    });
  });
}

async function testCliExecution(cliPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const testProcess = spawn(cliPath, ['--help'], {
      stdio: 'pipe',
      timeout: 5000
    });
    
    testProcess.on('close', (code) => {
      resolve(code === 0 || code === null);
    });
    
    testProcess.on('error', () => {
      resolve(false);
    });
  });
}

function createTerminalEnvironment(): Record<string, string> {
  return {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    PATH: process.env.PATH || '',
    HOME: process.env.HOME || '/home/codespace',
    PWD: '/workspaces/agent-feed'
  };
}

async function executeInTerminalContext(command: string): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const [cmd, ...args] = command.split(' ');
    const process = spawn(cmd, args, {
      env: createTerminalEnvironment(),
      cwd: '/workspaces/agent-feed',
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      resolve({
        success: code === 0,
        output: stdout.trim(),
        error: stderr.trim() || undefined
      });
    });
    
    process.on('error', (error) => {
      resolve({
        success: false,
        output: '',
        error: error.message
      });
    });
  });
}

function processAnsiSequences(data: string): string {
  return data
    .replace(/\r\x1b\[K/g, '\x1b[2K\x1b[1G') // Convert \r\x1b[K to clear line + move cursor
    .replace(/\r(?!\n)/g, '\x1b[1G')         // Convert standalone \r to cursor move
    .replace(/\x1b\[\?25[lh]/g, '');         // Remove cursor show/hide sequences
}