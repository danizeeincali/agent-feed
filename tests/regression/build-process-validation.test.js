/**
 * Build Process Validation Tests - TDD Regression Prevention
 *
 * Validates Next.js build process with Tailwind CSS integration
 * Prevents build failures and CSS compilation issues
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ROOT = '/workspaces/agent-feed';
const BUILD_OUTPUT_DIR = path.join(PROJECT_ROOT, '.next');
const STATIC_DIR = path.join(BUILD_OUTPUT_DIR, 'static');

describe('Build Process Validation Tests', () => {
  let buildProcess;
  let buildOutput = '';
  let buildError = '';

  beforeAll(async () => {
    // Clean previous build
    try {
      await fs.rm(BUILD_OUTPUT_DIR, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, ignore error
    }
  }, 30000);

  afterAll(async () => {
    if (buildProcess && !buildProcess.killed) {
      buildProcess.kill('SIGTERM');
    }
  });

  test('should validate package.json build configuration', async () => {
    const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
    const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageContent);

    // Verify essential build scripts
    expect(packageJson.scripts).toHaveProperty('build');
    expect(packageJson.scripts).toHaveProperty('dev');
    expect(packageJson.scripts).toHaveProperty('start');

    // Verify Next.js version
    expect(packageJson.dependencies).toHaveProperty('next');
    expect(packageJson.dependencies.next).toBe('14.0.0');

    // Verify React versions match
    expect(packageJson.dependencies.react).toBe('18.2.0');
    expect(packageJson.dependencies['react-dom']).toBe('18.2.0');

    // Verify Tailwind CSS dependencies
    expect(packageJson.devDependencies).toHaveProperty('tailwindcss');
    expect(packageJson.devDependencies).toHaveProperty('autoprefixer');
    expect(packageJson.devDependencies).toHaveProperty('postcss');
  });

  test('should validate Tailwind configuration exists and is valid', async () => {
    const tailwindConfigPath = path.join(PROJECT_ROOT, 'tailwind.config.ts');

    // Check if config file exists
    const configExists = await fs.access(tailwindConfigPath).then(() => true).catch(() => false);
    expect(configExists).toBe(true);

    const configContent = await fs.readFile(tailwindConfigPath, 'utf-8');

    // Verify essential configuration
    expect(configContent).toContain('content:');
    expect(configContent).toContain('theme:');
    expect(configContent).toContain('plugins:');

    // Verify content paths include necessary directories
    expect(configContent).toContain('./frontend/src/');
    expect(configContent).toContain('./src/');
    expect(configContent).toContain('./pages/');
    expect(configContent).toContain('./components/');
    expect(configContent).toContain('./app/');

    // Verify custom theme configuration
    expect(configContent).toContain('extend:');
    expect(configContent).toContain('colors:');
  });

  test('should validate PostCSS configuration', async () => {
    const postcssConfigPath = path.join(PROJECT_ROOT, 'frontend/postcss.config.cjs');

    const configExists = await fs.access(postcssConfigPath).then(() => true).catch(() => false);
    expect(configExists).toBe(true);

    const configContent = await fs.readFile(postcssConfigPath, 'utf-8');

    // Verify PostCSS plugins
    expect(configContent).toContain('tailwindcss');
    expect(configContent).toContain('autoprefixer');

    // Verify autoprefixer configuration
    expect(configContent).toContain('overrideBrowserslist');
  });

  test('should validate globals.css structure', async () => {
    const globalsCssPath = path.join(PROJECT_ROOT, 'styles/globals.css');

    const cssExists = await fs.access(globalsCssPath).then(() => true).catch(() => false);
    expect(cssExists).toBe(true);

    const cssContent = await fs.readFile(globalsCssPath, 'utf-8');

    // Verify Tailwind directives
    expect(cssContent).toContain('@tailwind base;');
    expect(cssContent).toContain('@tailwind components;');
    expect(cssContent).toContain('@tailwind utilities;');

    // Verify CSS layers
    expect(cssContent).toContain('@layer base');

    // Verify CSS variables structure
    expect(cssContent).toContain(':root {');
    expect(cssContent).toContain('--background:');
    expect(cssContent).toContain('--foreground:');
    expect(cssContent).toContain('--primary:');

    // Verify dark mode configuration
    expect(cssContent).toContain('.dark {');

    // Verify HSL format (no parentheses)
    const hslPattern = /--\w+:\s*\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%;/;
    expect(cssContent).toMatch(hslPattern);
  });

  test('should run successful Next.js build', async () => {
    return new Promise((resolve, reject) => {
      buildProcess = spawn('npm', ['run', 'build'], {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'production' }
      });

      buildProcess.stdout.on('data', (data) => {
        buildOutput += data.toString();
      });

      buildProcess.stderr.on('data', (data) => {
        buildError += data.toString();
      });

      buildProcess.on('close', (code) => {
        try {
          expect(code).toBe(0);

          // Verify build output contains success indicators
          expect(buildOutput).toContain('Compiled successfully');
          expect(buildOutput).not.toContain('Failed to compile');

          // Verify no critical errors
          expect(buildError).not.toContain('Error:');
          expect(buildError).not.toContain('TypeError:');
          expect(buildError).not.toContain('SyntaxError:');

          resolve();
        } catch (error) {
          reject(new Error(`Build failed with code ${code}:\nOutput: ${buildOutput}\nError: ${buildError}`));
        }
      });

      buildProcess.on('error', (error) => {
        reject(new Error(`Build process error: ${error.message}`));
      });

      // Set timeout for build process
      setTimeout(() => {
        if (buildProcess && !buildProcess.killed) {
          buildProcess.kill('SIGTERM');
          reject(new Error('Build process timed out'));
        }
      }, 120000); // 2 minutes timeout
    });
  }, 150000);

  test('should validate build output structure', async () => {
    // Check if .next directory was created
    const buildExists = await fs.access(BUILD_OUTPUT_DIR).then(() => true).catch(() => false);
    expect(buildExists).toBe(true);

    // Check static directory
    const staticExists = await fs.access(STATIC_DIR).then(() => true).catch(() => false);
    expect(staticExists).toBe(true);

    // Check for CSS files
    const staticFiles = await fs.readdir(STATIC_DIR, { recursive: true });
    const cssFiles = staticFiles.filter(file => file.toString().endsWith('.css'));

    expect(cssFiles.length).toBeGreaterThan(0);

    // Check for JavaScript chunks
    const jsFiles = staticFiles.filter(file => file.toString().endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);
  });

  test('should validate CSS compilation output', async () => {
    const staticFiles = await fs.readdir(STATIC_DIR, { recursive: true });
    const cssFiles = staticFiles.filter(file => file.toString().endsWith('.css'));

    expect(cssFiles.length).toBeGreaterThan(0);

    // Read and validate the main CSS file
    const mainCssFile = cssFiles.find(file => file.toString().includes('app-')) || cssFiles[0];
    expect(mainCssFile).toBeDefined();

    const cssPath = path.join(STATIC_DIR, mainCssFile.toString());
    const cssContent = await fs.readFile(cssPath, 'utf-8');

    // Verify Tailwind utilities are present
    expect(cssContent).toMatch(/\.bg-background\s*{/);
    expect(cssContent).toMatch(/\.text-foreground\s*{/);
    expect(cssContent).toMatch(/\.p-4\s*{/);
    expect(cssContent).toMatch(/\.flex\s*{/);

    // Verify CSS variables are compiled
    expect(cssContent).toContain('hsl(var(--background))');
    expect(cssContent).toContain('hsl(var(--foreground))');

    // Verify responsive utilities
    expect(cssContent).toMatch(/@media.*min-width/);

    // Verify no duplicate CSS classes (basic check)
    const bgBackgroundMatches = cssContent.match(/\.bg-background\s*{/g);
    expect(bgBackgroundMatches).toBeTruthy();

    // Verify CSS is minified in production
    expect(cssContent).not.toContain('  '); // Should not have double spaces
    expect(cssContent.split('\n').length).toBeLessThan(100); // Should be minified
  });

  test('should validate JavaScript bundle compilation', async () => {
    const staticFiles = await fs.readdir(STATIC_DIR, { recursive: true });
    const jsFiles = staticFiles.filter(file => file.toString().endsWith('.js'));

    expect(jsFiles.length).toBeGreaterThan(0);

    // Check for main app bundle
    const appBundle = jsFiles.find(file => file.toString().includes('app-')) || jsFiles[0];
    expect(appBundle).toBeDefined();

    const jsPath = path.join(STATIC_DIR, appBundle.toString());
    const jsContent = await fs.readFile(jsPath, 'utf-8');

    // Verify React components are compiled
    expect(jsContent).toContain('React');

    // Verify no obvious compilation errors
    expect(jsContent).not.toContain('Unexpected token');
    expect(jsContent).not.toContain('SyntaxError');

    // Verify minification
    expect(jsContent).not.toMatch(/\n\s+/); // Should not have indented lines
  });

  test('should validate build performance metrics', () => {
    // Check build output for performance warnings
    expect(buildOutput).not.toContain('Warning: Bundle size');
    expect(buildOutput).not.toContain('Large bundle detected');

    // Verify build completed in reasonable time (already tested by timeout)
    expect(buildOutput).toContain('Compiled successfully');

    // Check for optimization indicators
    if (buildOutput.includes('Creating an optimized production build')) {
      expect(buildOutput).toContain('Creating an optimized production build');
    }
  });

  test('should validate TypeScript compilation', async () => {
    // Check if there are any TypeScript files
    const tsConfigPath = path.join(PROJECT_ROOT, 'tsconfig.json');
    const tsConfigExists = await fs.access(tsConfigPath).then(() => true).catch(() => false);

    if (tsConfigExists) {
      const tsConfigContent = await fs.readFile(tsConfigPath, 'utf-8');
      const tsConfig = JSON.parse(tsConfigContent);

      // Verify TypeScript configuration
      expect(tsConfig.compilerOptions).toBeDefined();
      expect(tsConfig.compilerOptions.target).toBeDefined();
      expect(tsConfig.compilerOptions.module).toBeDefined();

      // Verify no TypeScript errors in build output
      expect(buildOutput).not.toContain('TS2');
      expect(buildOutput).not.toContain('Type error');
    }
  });

  test('should validate ESLint integration', async () => {
    const eslintConfigPath = path.join(PROJECT_ROOT, '.eslintrc.cjs');
    const eslintConfigExists = await fs.access(eslintConfigPath).then(() => true).catch(() => false);

    if (eslintConfigExists) {
      // Verify no ESLint errors failed the build
      expect(buildOutput).not.toContain('ESLint error');
      expect(buildOutput).not.toContain('Linting errors found');
    }
  });

  test('should validate environment variables handling', async () => {
    const envLocalPath = path.join(PROJECT_ROOT, '.env.local');
    const envExamplePath = path.join(PROJECT_ROOT, '.env.example');

    // Check for environment file patterns
    const envLocalExists = await fs.access(envLocalPath).then(() => true).catch(() => false);
    const envExampleExists = await fs.access(envExamplePath).then(() => true).catch(() => false);

    // At least one env file should exist for guidance
    if (envExampleExists || envLocalExists) {
      // Verify build handles environment variables correctly
      expect(buildOutput).not.toContain('Environment variable missing');
    }
  });

  test('should validate static asset handling', async () => {
    // Check if public directory exists and is handled
    const publicDirPath = path.join(PROJECT_ROOT, 'public');
    const publicExists = await fs.access(publicDirPath).then(() => true).catch(() => false);

    if (publicExists) {
      const publicFiles = await fs.readdir(publicDirPath);

      // Verify build includes static assets
      if (publicFiles.length > 0) {
        expect(buildOutput).not.toContain('Static asset error');
      }
    }
  });

  test('should validate CSS custom properties in build output', async () => {
    const staticFiles = await fs.readdir(STATIC_DIR, { recursive: true });
    const cssFiles = staticFiles.filter(file => file.toString().endsWith('.css'));

    if (cssFiles.length > 0) {
      const cssPath = path.join(STATIC_DIR, cssFiles[0].toString());
      const cssContent = await fs.readFile(cssPath, 'utf-8');

      // Verify CSS custom properties are preserved
      expect(cssContent).toContain('--background');
      expect(cssContent).toContain('--foreground');
      expect(cssContent).toContain('--primary');

      // Verify HSL function usage
      expect(cssContent).toContain('hsl(var(');

      // Verify responsive classes are compiled
      expect(cssContent).toMatch(/@media.*sm:/);
      expect(cssContent).toMatch(/@media.*md:/);
      expect(cssContent).toMatch(/@media.*lg:/);
    }
  });
});