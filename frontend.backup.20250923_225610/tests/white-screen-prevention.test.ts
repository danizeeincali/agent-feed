/**
 * TDD Tests for White Screen Prevention
 * These tests ensure the Vite dev server serves content properly
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

describe('White Screen Prevention Tests', () => {
  let viteProcess: ChildProcess;
  const VITE_PORT = 5174; // Use different port for testing
  
  beforeAll(async () => {
    // Start Vite dev server for testing
    viteProcess = spawn('npm', ['run', 'dev', '--', '--port', VITE_PORT.toString()], {
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }, 10000);

  afterAll(() => {
    if (viteProcess) {
      viteProcess.kill();
    }
  });

  it('should serve HTML with root div', async () => {
    const response = await fetch(`http://localhost:${VITE_PORT}/`);
    expect(response.ok).toBe(true);
    
    const html = await response.text();
    expect(html).toContain('id="root"');
    expect(html).toContain('<!doctype html>');
  });

  it('should serve main.tsx without errors', async () => {
    const response = await fetch(`http://localhost:${VITE_PORT}/src/main.tsx`);
    expect(response.ok).toBe(true);
    
    const code = await response.text();
    expect(code).toContain('React');
    expect(code).toContain('ReactDOM');
    expect(code).not.toContain('Error');
  });

  it('should serve App.tsx without compilation errors', async () => {
    const response = await fetch(`http://localhost:${VITE_PORT}/src/App.tsx`);
    expect(response.ok).toBe(true);
    
    const code = await response.text();
    expect(code).toContain('App');
    expect(code.length).toBeGreaterThan(100); // Should have substantial content
  });

  it('should have working SimpleLauncher component', async () => {
    const response = await fetch(`http://localhost:${VITE_PORT}/src/components/SimpleLauncher.tsx`);
    expect(response.ok).toBe(true);
    
    const code = await response.text();
    expect(code).toContain('SimpleLauncher');
    expect(code).toContain('prod/claude'); // Our new buttons
  });

  it('should serve CSS assets without errors', async () => {
    const response = await fetch(`http://localhost:${VITE_PORT}/src/index.css`);
    expect(response.ok).toBe(true);
    
    const css = await response.text();
    expect(css.length).toBeGreaterThan(0);
  });
});

describe('TypeScript Compilation Tests', () => {
  it('should have no critical TypeScript errors in SimpleLauncher', async () => {
    // This test ensures our SimpleLauncher component compiles correctly
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      // Try to compile just the SimpleLauncher component
      const result = await execAsync('npx tsc --noEmit src/components/SimpleLauncher.tsx', {
        cwd: process.cwd()
      });
      
      // Should not have critical errors
      expect(result.stderr).not.toContain('error TS');
    } catch (error: any) {
      // If there are errors, they should not be in SimpleLauncher
      expect(error.stderr).not.toContain('SimpleLauncher.tsx');
    }
  });
});

describe('Module Loading Tests', () => {
  it('should be able to import React components', async () => {
    // Test that basic React imports work
    try {
      const React = await import('react');
      expect(React).toBeDefined();
      expect(React.createElement).toBeInstanceOf(Function);
    } catch (error) {
      fail(`React import failed: ${error}`);
    }
  });

  it('should be able to import terminal components', async () => {
    // Test our terminal components can be imported
    try {
      // These imports should work without throwing
      const terminalModule = await import('../src/components/Terminal');
      const terminalFixedModule = await import('../src/components/TerminalFixed');
      
      expect(terminalModule).toBeDefined();
      expect(terminalFixedModule).toBeDefined();
    } catch (error) {
      fail(`Terminal component imports failed: ${error}`);
    }
  });
});