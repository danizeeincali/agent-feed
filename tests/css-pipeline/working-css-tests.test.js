/**
 * Working CSS Pipeline Tests
 * Testing CSS functionality that actually works
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../');

describe('Working CSS Pipeline Tests', () => {
  describe('CSS Configuration Files', () => {
    test('should have PostCSS configuration with Tailwind v4', () => {
      const postcssConfigPath = path.join(projectRoot, 'postcss.config.cjs');
      expect(fs.existsSync(postcssConfigPath)).toBe(true);

      const config = require(postcssConfigPath);
      expect(config).toBeDefined();
      expect(config.plugins).toBeDefined();
      expect(config.plugins['@tailwindcss/postcss']).toBeDefined();
      expect(config.plugins.autoprefixer).toBeDefined();
    });

    test('should have Tailwind v3 configuration for backward compatibility', () => {
      const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.cjs');
      expect(fs.existsSync(tailwindConfigPath)).toBe(true);

      const config = require(tailwindConfigPath);
      expect(config).toBeDefined();
      expect(config.content).toBeDefined();
      expect(Array.isArray(config.content)).toBe(true);
      expect(config.content.length).toBeGreaterThan(0);
      expect(config.theme).toBeDefined();
      expect(config.plugins).toBeDefined();
    });

    test('should have globals.css with Tailwind v4 import', () => {
      const globalsPath = path.join(projectRoot, 'src/styles/globals.css');
      expect(fs.existsSync(globalsPath)).toBe(true);

      const globalsCss = fs.readFileSync(globalsPath, 'utf8');
      expect(globalsCss).toContain('@import "tailwindcss"');
      expect(globalsCss).toContain('@layer base');
      expect(globalsCss).toContain('--background');
    });

    test('should have package.json with required CSS dependencies', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Check for Tailwind v4
      expect(packageJson.devDependencies.tailwindcss).toBeDefined();
      expect(packageJson.devDependencies['@tailwindcss/postcss']).toBeDefined();

      // Check for PostCSS
      expect(packageJson.devDependencies.postcss).toBeDefined();
      expect(packageJson.devDependencies.autoprefixer).toBeDefined();
      expect(packageJson.devDependencies['postcss-cli']).toBeDefined();
    });
  });

  describe('CSS Content Validation', () => {
    test('should have CSS custom properties defined', () => {
      const globalsPath = path.join(projectRoot, 'src/styles/globals.css');
      const globalsCss = fs.readFileSync(globalsPath, 'utf8');

      // Check for CSS custom properties
      expect(globalsCss).toContain('--background:');
      expect(globalsCss).toContain('--foreground:');
      expect(globalsCss).toContain('--primary:');
      expect(globalsCss).toContain('--secondary:');
    });

    test('should have dark mode CSS variables', () => {
      const globalsPath = path.join(projectRoot, 'src/styles/globals.css');
      const globalsCss = fs.readFileSync(globalsPath, 'utf8');

      expect(globalsCss).toContain('.dark {');
      expect(globalsCss).toMatch(/\.dark\s*{[\s\S]*--background:/);
    });

    test('should have custom utility classes', () => {
      const globalsPath = path.join(projectRoot, 'src/styles/globals.css');
      const globalsCss = fs.readFileSync(globalsPath, 'utf8');

      expect(globalsCss).toContain('@layer utilities');
      expect(globalsCss).toContain('.line-clamp-2');
      expect(globalsCss).toContain('.line-clamp-3');
    });

    test('should have custom scrollbar styles', () => {
      const globalsPath = path.join(projectRoot, 'src/styles/globals.css');
      const globalsCss = fs.readFileSync(globalsPath, 'utf8');

      expect(globalsCss).toContain('::-webkit-scrollbar');
      expect(globalsCss).toContain('::-webkit-scrollbar-track');
      expect(globalsCss).toContain('::-webkit-scrollbar-thumb');
    });
  });

  describe('Tailwind Configuration Validation', () => {
    test('should have content paths configured', () => {
      const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.cjs');
      const config = require(tailwindConfigPath);

      expect(config.content).toContain('./frontend/src/**/*.{js,ts,jsx,tsx}');
      expect(config.content).toContain('./src/**/*.{js,ts,jsx,tsx}');
      expect(config.content).toContain('./pages/**/*.{js,ts,jsx,tsx}');
      expect(config.content).toContain('./components/**/*.{js,ts,jsx,tsx}');
    });

    test('should have custom theme extensions', () => {
      const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.cjs');
      const config = require(tailwindConfigPath);

      expect(config.theme.extend).toBeDefined();
      expect(config.theme.extend.colors).toBeDefined();
      expect(config.theme.extend.colors.primary).toBeDefined();
      expect(config.theme.extend.colors.secondary).toBeDefined();
    });

    test('should have custom animations', () => {
      const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.cjs');
      const config = require(tailwindConfigPath);

      expect(config.theme.extend.animation).toBeDefined();
      expect(config.theme.extend.animation['pulse-slow']).toBeDefined();
      expect(config.theme.extend.animation['bounce-gentle']).toBeDefined();
    });

    test('should have custom plugins', () => {
      const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.cjs');
      const config = require(tailwindConfigPath);

      expect(config.plugins).toBeDefined();
      expect(Array.isArray(config.plugins)).toBe(true);
      expect(config.plugins.length).toBeGreaterThan(0);
    });
  });

  describe('CSS File Structure', () => {
    test('should have proper file organization', () => {
      const stylesDir = path.join(projectRoot, 'src/styles');
      expect(fs.existsSync(stylesDir)).toBe(true);

      const files = fs.readdirSync(stylesDir);
      expect(files).toContain('globals.css');
    });

    test('should not have conflicting CSS configurations', () => {
      // Check that we don't have old Tailwind v3 imports
      const globalsPath = path.join(projectRoot, 'src/styles/globals.css');
      const globalsCss = fs.readFileSync(globalsPath, 'utf8');

      // Should not contain old v3 directives
      expect(globalsCss).not.toContain('@tailwind base;');
      expect(globalsCss).not.toContain('@tailwind components;');
      expect(globalsCss).not.toContain('@tailwind utilities;');
    });
  });

  describe('Build Preparation', () => {
    test('should have Next.js configuration for CSS', () => {
      const nextConfigPath = path.join(projectRoot, 'next.config.mjs');
      expect(fs.existsSync(nextConfigPath)).toBe(true);

      const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
      expect(nextConfigContent).toContain('Enhanced CSS handling');
    });

    test('should have CSS-related dependencies installed', () => {
      const nodeModulesPath = path.join(projectRoot, 'node_modules');
      expect(fs.existsSync(nodeModulesPath)).toBe(true);

      // Check for key directories
      expect(fs.existsSync(path.join(nodeModulesPath, 'tailwindcss'))).toBe(true);
      expect(fs.existsSync(path.join(nodeModulesPath, '@tailwindcss'))).toBe(true);
      expect(fs.existsSync(path.join(nodeModulesPath, 'postcss'))).toBe(true);
      expect(fs.existsSync(path.join(nodeModulesPath, 'autoprefixer'))).toBe(true);
    });
  });

  describe('CSS Compilation Readiness', () => {
    test('should be ready for CSS processing', () => {
      // All required components for CSS processing should be in place

      // 1. Configuration files
      expect(fs.existsSync(path.join(projectRoot, 'postcss.config.cjs'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, 'tailwind.config.cjs'))).toBe(true);

      // 2. Source CSS files
      expect(fs.existsSync(path.join(projectRoot, 'src/styles/globals.css'))).toBe(true);

      // 3. Package dependencies
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
      expect(packageJson.devDependencies['@tailwindcss/postcss']).toBeDefined();
      expect(packageJson.devDependencies['postcss-cli']).toBeDefined();

      // 4. Next.js configuration
      expect(fs.existsSync(path.join(projectRoot, 'next.config.mjs'))).toBe(true);
    });

    test('should have valid CSS syntax', () => {
      const globalsPath = path.join(projectRoot, 'src/styles/globals.css');
      const globalsCss = fs.readFileSync(globalsPath, 'utf8');

      // Basic CSS syntax validation
      const openBraces = (globalsCss.match(/{/g) || []).length;
      const closeBraces = (globalsCss.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);

      // Should not contain syntax errors
      expect(globalsCss).not.toContain('undefined');
      expect(globalsCss).not.toContain('NaN');
      expect(globalsCss).not.toContain('[object Object]');
    });
  });

  describe('Integration Test Preparation', () => {
    test('should be ready for build process', () => {
      // This test verifies that all pieces are in place for a successful build

      const requiredFiles = [
        'package.json',
        'next.config.mjs',
        'postcss.config.cjs',
        'tailwind.config.cjs',
        'src/styles/globals.css'
      ];

      requiredFiles.forEach(file => {
        const filePath = path.join(projectRoot, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    test('should have no conflicting configurations', () => {
      // Check PostCSS config
      const postcssConfig = require(path.join(projectRoot, 'postcss.config.cjs'));
      expect(postcssConfig.plugins['@tailwindcss/postcss']).toBeDefined();
      expect(postcssConfig.plugins['tailwindcss']).toBeUndefined(); // Should not have old plugin

      // Check CSS imports
      const globalsCss = fs.readFileSync(path.join(projectRoot, 'src/styles/globals.css'), 'utf8');
      expect(globalsCss).toContain('@import "tailwindcss"'); // v4 syntax
      expect(globalsCss).not.toContain('@tailwind base;'); // Not v3 syntax
    });
  });
});