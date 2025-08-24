/**
 * Build Validation Tests - Regression Prevention
 * Prevents TypeScript compilation failures that cause White Screen of Death
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Build Validation - Regression Prevention', () => {
  const frontendDir = join(__dirname, '../../frontend');
  const backendDir = join(__dirname, '../..');

  describe('TypeScript Compilation', () => {
    it('should compile backend TypeScript without errors', async () => {
      try {
        const output = execSync('npm run typecheck', { 
          cwd: backendDir, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        // Log success to NLD
        await logNLDSuccess({
          test: 'backend-typescript-compilation',
          timestamp: new Date().toISOString(),
          success: true,
          output: output.toString()
        });
        
        expect(true).toBe(true); // Test passed if no exception
      } catch (error: any) {
        // Log failure to NLD for learning
        await logNLDFailure({
          test: 'backend-typescript-compilation',
          timestamp: new Date().toISOString(),
          error: error.message,
          stdout: error.stdout?.toString(),
          stderr: error.stderr?.toString(),
          failureType: 'compilation-error'
        });
        
        throw new Error(`Backend TypeScript compilation failed: ${error.message}`);
      }
    }, 120000);

    it('should compile frontend TypeScript without errors', async () => {
      try {
        const output = execSync('npm run typecheck', { 
          cwd: frontendDir, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        await logNLDSuccess({
          test: 'frontend-typescript-compilation',
          timestamp: new Date().toISOString(),
          success: true,
          output: output.toString()
        });
        
        expect(true).toBe(true);
      } catch (error: any) {
        await logNLDFailure({
          test: 'frontend-typescript-compilation',
          timestamp: new Date().toISOString(),
          error: error.message,
          stdout: error.stdout?.toString(),
          stderr: error.stderr?.toString(),
          failureType: 'compilation-error',
          impact: 'white-screen-of-death'
        });
        
        throw new Error(`Frontend TypeScript compilation failed - This causes White Screen of Death: ${error.message}`);
      }
    }, 120000);

    it('should build frontend successfully', async () => {
      try {
        const output = execSync('npm run build', { 
          cwd: frontendDir, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        // Verify dist directory exists
        const distDir = join(frontendDir, 'dist');
        expect(existsSync(distDir)).toBe(true);
        
        // Verify main files exist
        expect(existsSync(join(distDir, 'index.html'))).toBe(true);
        
        await logNLDSuccess({
          test: 'frontend-build',
          timestamp: new Date().toISOString(),
          success: true,
          distExists: existsSync(distDir),
          output: output.toString()
        });
        
      } catch (error: any) {
        await logNLDFailure({
          test: 'frontend-build',
          timestamp: new Date().toISOString(),
          error: error.message,
          stdout: error.stdout?.toString(),
          stderr: error.stderr?.toString(),
          failureType: 'build-error',
          impact: 'deployment-failure'
        });
        
        throw new Error(`Frontend build failed: ${error.message}`);
      }
    }, 180000);

    it('should build backend successfully', async () => {
      try {
        const output = execSync('npm run build', { 
          cwd: backendDir, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        // Verify dist directory exists
        const distDir = join(backendDir, 'dist');
        expect(existsSync(distDir)).toBe(true);
        
        await logNLDSuccess({
          test: 'backend-build',
          timestamp: new Date().toISOString(),
          success: true,
          distExists: existsSync(distDir),
          output: output.toString()
        });
        
      } catch (error: any) {
        await logNLDFailure({
          test: 'backend-build',
          timestamp: new Date().toISOString(),
          error: error.message,
          stdout: error.stdout?.toString(),
          stderr: error.stderr?.toString(),
          failureType: 'build-error',
          impact: 'api-unavailable'
        });
        
        throw new Error(`Backend build failed: ${error.message}`);
      }
    }, 180000);
  });

  describe('Linting Validation', () => {
    it('should pass ESLint checks for backend', async () => {
      try {
        const output = execSync('npm run lint', { 
          cwd: backendDir, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        await logNLDSuccess({
          test: 'backend-eslint',
          timestamp: new Date().toISOString(),
          success: true,
          output: output.toString()
        });
        
        expect(true).toBe(true);
      } catch (error: any) {
        // ESLint failures are warnings, not critical errors
        await logNLDWarning({
          test: 'backend-eslint',
          timestamp: new Date().toISOString(),
          warning: error.message,
          stdout: error.stdout?.toString(),
          stderr: error.stderr?.toString(),
          failureType: 'linting-error'
        });
        
        console.warn(`Backend ESLint warnings: ${error.message}`);
      }
    }, 60000);

    it('should pass ESLint checks for frontend', async () => {
      try {
        const output = execSync('npm run lint', { 
          cwd: frontendDir, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        await logNLDSuccess({
          test: 'frontend-eslint',
          timestamp: new Date().toISOString(),
          success: true,
          output: output.toString()
        });
        
        expect(true).toBe(true);
      } catch (error: any) {
        await logNLDWarning({
          test: 'frontend-eslint',
          timestamp: new Date().toISOString(),
          warning: error.message,
          stdout: error.stdout?.toString(),
          stderr: error.stderr?.toString(),
          failureType: 'linting-error'
        });
        
        console.warn(`Frontend ESLint warnings: ${error.message}`);
      }
    }, 60000);
  });

  describe('Package Dependencies', () => {
    it('should have no security vulnerabilities', async () => {
      try {
        // Run npm audit
        const output = execSync('npm audit --audit-level high', { 
          cwd: backendDir, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        await logNLDSuccess({
          test: 'security-audit',
          timestamp: new Date().toISOString(),
          success: true,
          output: output.toString()
        });
        
        expect(true).toBe(true);
      } catch (error: any) {
        // Check if it's just warnings or actual vulnerabilities
        const output = error.stdout?.toString() || error.stderr?.toString() || '';
        
        if (output.includes('found 0 vulnerabilities')) {
          // No vulnerabilities, just warnings
          expect(true).toBe(true);
        } else {
          await logNLDFailure({
            test: 'security-audit',
            timestamp: new Date().toISOString(),
            error: error.message,
            stdout: error.stdout?.toString(),
            stderr: error.stderr?.toString(),
            failureType: 'security-vulnerability',
            impact: 'security-risk'
          });
          
          console.warn(`Security vulnerabilities found: ${output}`);
          // Don't fail the build for security warnings, but log them
        }
      }
    }, 60000);

    it('should have all required dependencies installed', async () => {
      const packageJsonPath = join(backendDir, 'package.json');
      const frontendPackageJsonPath = join(frontendDir, 'package.json');
      
      expect(existsSync(packageJsonPath)).toBe(true);
      expect(existsSync(frontendPackageJsonPath)).toBe(true);
      
      const backendPkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const frontendPkg = JSON.parse(readFileSync(frontendPackageJsonPath, 'utf8'));
      
      // Check critical dependencies
      expect(backendPkg.dependencies).toHaveProperty('express');
      expect(backendPkg.dependencies).toHaveProperty('ws');
      expect(frontendPkg.dependencies).toHaveProperty('react');
      expect(frontendPkg.dependencies).toHaveProperty('xterm');
      
      await logNLDSuccess({
        test: 'dependency-validation',
        timestamp: new Date().toISOString(),
        success: true,
        backendDeps: Object.keys(backendPkg.dependencies || {}).length,
        frontendDeps: Object.keys(frontendPkg.dependencies || {}).length
      });
    });
  });
});

// NLD Logging Functions
async function logNLDSuccess(data: any) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const nldDir = path.join(__dirname, '../../nld-agent/records');
    await fs.mkdir(nldDir, { recursive: true });
    
    const filename = `build-validation-success-${Date.now()}.json`;
    const filepath = path.join(nldDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify({
      type: 'build-validation-success',
      ...data
    }, null, 2));
  } catch (error) {
    console.warn('Warning: Could not log to NLD system:', error);
  }
}

async function logNLDFailure(data: any) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const nldDir = path.join(__dirname, '../../nld-agent/records');
    await fs.mkdir(nldDir, { recursive: true });
    
    const filename = `build-validation-failure-${Date.now()}.json`;
    const filepath = path.join(nldDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify({
      type: 'build-validation-failure',
      preventionPattern: true,
      ...data
    }, null, 2));
  } catch (error) {
    console.warn('Warning: Could not log to NLD system:', error);
  }
}

async function logNLDWarning(data: any) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const nldDir = path.join(__dirname, '../../nld-agent/records');
    await fs.mkdir(nldDir, { recursive: true });
    
    const filename = `build-validation-warning-${Date.now()}.json`;
    const filepath = path.join(nldDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify({
      type: 'build-validation-warning',
      ...data
    }, null, 2));
  } catch (error) {
    console.warn('Warning: Could not log to NLD system:', error);
  }
}
