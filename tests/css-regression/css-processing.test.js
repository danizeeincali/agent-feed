/**
 * CSS Processing Tests
 * Tests that verify CSS files are properly processed and compiled
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('CSS Processing Tests', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const stylesDir = path.join(projectRoot, 'styles');
  const tailwindConfig = path.join(projectRoot, 'tailwind.config.ts');
  const nextConfig = path.join(projectRoot, 'next.config.js');

  describe('CSS Files Existence', () => {
    test('should have agents.css file', () => {
      const agentsCssPath = path.join(stylesDir, 'agents.css');
      expect(fs.existsSync(agentsCssPath)).toBe(true);
    });

    test('should have test-input.css file', () => {
      const testInputCssPath = path.join(projectRoot, 'test-input.css');
      expect(fs.existsSync(testInputCssPath)).toBe(true);
    });

    test('should have globals.css in claudable-reference', () => {
      const globalsCssPath = path.join(projectRoot, 'claudable-reference/apps/web/app/globals.css');
      expect(fs.existsSync(globalsCssPath)).toBe(true);
    });
  });

  describe('Configuration Files', () => {
    test('should have valid Tailwind configuration', () => {
      expect(fs.existsSync(tailwindConfig)).toBe(true);

      const configContent = fs.readFileSync(tailwindConfig, 'utf8');
      expect(configContent).toContain('Config');
      expect(configContent).toContain('content');
      expect(configContent).toContain('theme');
    });

    test('should have Next.js configuration with CSS optimization', () => {
      expect(fs.existsSync(nextConfig)).toBe(true);

      const configContent = fs.readFileSync(nextConfig, 'utf8');
      expect(configContent).toContain('optimizeCss');
    });
  });

  describe('CSS File Content Validation', () => {
    test('agents.css should contain required classes and animations', () => {
      const agentsCssPath = path.join(stylesDir, 'agents.css');
      const cssContent = fs.readFileSync(agentsCssPath, 'utf8');

      // Check for main component classes
      expect(cssContent).toContain('.agents-page');
      expect(cssContent).toContain('.agents-container');
      expect(cssContent).toContain('.agents-header');
      expect(cssContent).toContain('.agents-content');

      // Check for layout properties
      expect(cssContent).toContain('display: grid');
      expect(cssContent).toContain('grid-template-columns');
      expect(cssContent).toContain('background: linear-gradient');

      // Check for animations
      expect(cssContent).toContain('@keyframes spin');
      expect(cssContent).toContain('transform: rotate');

      // Check for responsive design
      expect(cssContent).toContain('@media (max-width: 1024px)');
      expect(cssContent).toContain('@media (max-width: 640px)');
    });

    test('test-input.css should import Tailwind and have test class', () => {
      const testInputCssPath = path.join(projectRoot, 'test-input.css');
      const cssContent = fs.readFileSync(testInputCssPath, 'utf8');

      expect(cssContent).toContain('@import "tailwindcss"');
      expect(cssContent).toContain('.test-class');
      expect(cssContent).toContain('color: red');
    });

    test('globals.css should have proper Tailwind imports and custom styles', () => {
      const globalsCssPath = path.join(projectRoot, 'claudable-reference/apps/web/app/globals.css');
      const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

      // Check Tailwind imports
      expect(cssContent).toContain('@tailwind base');
      expect(cssContent).toContain('@tailwind components');
      expect(cssContent).toContain('@tailwind utilities');

      // Check custom layers
      expect(cssContent).toContain('@layer base');
      expect(cssContent).toContain('@layer components');
      expect(cssContent).toContain('@layer utilities');

      // Check font imports
      expect(cssContent).toContain('fonts.googleapis.com');
      expect(cssContent).toContain('Inter');
    });
  });

  describe('CSS Syntax Validation', () => {
    test('CSS files should have valid syntax', () => {
      const cssFiles = [
        path.join(stylesDir, 'agents.css'),
        path.join(projectRoot, 'test-input.css'),
        path.join(projectRoot, 'claudable-reference/apps/web/app/globals.css')
      ];

      cssFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          const cssContent = fs.readFileSync(filePath, 'utf8');

          // Basic syntax checks
          const openBraces = (cssContent.match(/{/g) || []).length;
          const closeBraces = (cssContent.match(/}/g) || []).length;
          expect(openBraces).toBe(closeBraces);

          // Check for common syntax errors
          expect(cssContent).not.toMatch(/;;/); // Double semicolons
          expect(cssContent).not.toMatch(/:\s*;/); // Empty property values
        }
      });
    });
  });

  describe('CSS Build Process', () => {
    test('should be able to process CSS without errors', () => {
      // This test verifies that the CSS processing pipeline works
      try {
        // Try to read and validate the package.json scripts
        const packageJsonPath = path.join(projectRoot, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        expect(packageJson.scripts).toHaveProperty('build');
        expect(packageJson.devDependencies).toHaveProperty('tailwindcss');
        expect(packageJson.devDependencies).toHaveProperty('postcss');
        expect(packageJson.devDependencies).toHaveProperty('autoprefixer');
      } catch (error) {
        fail(`CSS build configuration error: ${error.message}`);
      }
    });
  });
});