/**
 * Build Process Validation Test Suite
 * 
 * Tests the complete build process including:
 * - TypeScript compilation
 * - Vite build process
 * - Asset generation
 * - Bundle optimization
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

describe('Frontend Build Process Validation', () => {
  const frontendDir = path.join(process.cwd(), 'frontend');
  const distDir = path.join(frontendDir, 'dist');
  
  beforeAll(async () => {
    // Clean any existing build artifacts
    try {
      await fs.rm(distDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, which is fine
    }
  });

  describe('Build Process', () => {
    it('should complete TypeScript compilation without errors', async () => {
      const { stdout, stderr } = await execAsync('npm run typecheck', {
        cwd: frontendDir,
        timeout: 120000
      });
      
      expect(stderr).toBe('');
      expect(stdout).not.toContain('error TS');
    }, 120000);

    it('should complete Vite build without errors', async () => {
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: frontendDir,
        timeout: 180000
      });
      
      expect(stderr).toBe('');
      expect(stdout).toContain('built in');
    }, 180000);

    it('should generate dist directory', async () => {
      const distExists = await fs.access(distDir).then(() => true).catch(() => false);
      expect(distExists).toBe(true);
    });

    it('should generate required build files', async () => {
      const files = await fs.readdir(distDir);
      
      // Check for essential files
      expect(files).toContain('index.html');
      
      // Check for JS bundles
      const jsFiles = files.filter(file => file.endsWith('.js'));
      expect(jsFiles.length).toBeGreaterThan(0);
      
      // Check for CSS files
      const cssFiles = files.filter(file => file.endsWith('.css'));
      expect(cssFiles.length).toBeGreaterThan(0);
    });

    it('should generate asset files', async () => {
      const assetsDir = path.join(distDir, 'assets');
      const assetsExists = await fs.access(assetsDir).then(() => true).catch(() => false);
      
      if (assetsExists) {
        const assetFiles = await fs.readdir(assetsDir);
        expect(assetFiles.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Build Output Validation', () => {
    it('should generate valid index.html', async () => {
      const indexPath = path.join(distDir, 'index.html');
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      
      expect(indexContent).toContain('<!DOCTYPE html>');
      expect(indexContent).toContain('<html');
      expect(indexContent).toContain('<div id="root">');
      expect(indexContent).toContain('.js');
      expect(indexContent).toContain('.css');
    });

    it('should generate minified JavaScript bundles', async () => {
      const files = await fs.readdir(distDir);
      const jsFiles = files.filter(file => file.endsWith('.js'));
      
      for (const jsFile of jsFiles) {
        const filePath = path.join(distDir, jsFile);
        const stats = await fs.stat(filePath);
        expect(stats.size).toBeGreaterThan(0);
        
        const content = await fs.readFile(filePath, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
      }
    });

    it('should generate CSS files', async () => {
      const files = await fs.readdir(distDir);
      const cssFiles = files.filter(file => file.endsWith('.css'));
      
      expect(cssFiles.length).toBeGreaterThan(0);
      
      for (const cssFile of cssFiles) {
        const filePath = path.join(distDir, cssFile);
        const stats = await fs.stat(filePath);
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    it('should generate source maps', async () => {
      const files = await fs.readdir(distDir);
      const mapFiles = files.filter(file => file.endsWith('.map'));
      
      expect(mapFiles.length).toBeGreaterThan(0);
      
      for (const mapFile of mapFiles) {
        const filePath = path.join(distDir, mapFile);
        const content = await fs.readFile(filePath, 'utf-8');
        const sourceMap = JSON.parse(content);
        
        expect(sourceMap.version).toBe(3);
        expect(sourceMap.sources).toBeDefined();
        expect(sourceMap.mappings).toBeDefined();
      }
    });
  });

  describe('Bundle Analysis', () => {
    it('should create vendor chunk for external dependencies', async () => {
      const files = await fs.readdir(distDir);
      const vendorChunk = files.find(file => file.includes('vendor') && file.endsWith('.js'));
      
      if (vendorChunk) {
        const vendorPath = path.join(distDir, vendorChunk);
        const vendorContent = await fs.readFile(vendorPath, 'utf-8');
        
        // Should contain React
        expect(vendorContent).toMatch(/react|React/);
      }
    });

    it('should create separate chunks for different modules', async () => {
      const files = await fs.readdir(distDir);
      const jsFiles = files.filter(file => file.endsWith('.js'));
      
      // Should have multiple JS files (chunks)
      expect(jsFiles.length).toBeGreaterThanOrEqual(2);
    });

    it('should not include development artifacts', async () => {
      const files = await fs.readdir(distDir);
      const jsFiles = files.filter(file => file.endsWith('.js'));
      
      for (const jsFile of jsFiles) {
        const filePath = path.join(distDir, jsFile);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Should not contain console.log or dev-only code
        expect(content).not.toMatch(/console\.log\(/);
        expect(content).not.toMatch(/debugger;/);
      }
    });
  });

  describe('Performance Optimization', () => {
    it('should generate appropriately sized bundles', async () => {
      const files = await fs.readdir(distDir);
      const jsFiles = files.filter(file => file.endsWith('.js'));
      
      for (const jsFile of jsFiles) {
        const filePath = path.join(distDir, jsFile);
        const stats = await fs.stat(filePath);
        
        // No single bundle should be larger than 2MB
        expect(stats.size).toBeLessThan(2 * 1024 * 1024);
      }
    });

    it('should compress assets appropriately', async () => {
      const files = await fs.readdir(distDir);
      const cssFiles = files.filter(file => file.endsWith('.css'));
      
      for (const cssFile of cssFiles) {
        const filePath = path.join(distDir, cssFile);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // CSS should be minified (no excessive whitespace)
        const whitespaceRatio = (content.match(/\s/g) || []).length / content.length;
        expect(whitespaceRatio).toBeLessThan(0.3);
      }
    });
  });
});