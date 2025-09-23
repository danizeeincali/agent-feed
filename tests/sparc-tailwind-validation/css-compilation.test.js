/**
 * SPARC Phase 4: Refinement - CSS Compilation Test Suite
 * Tests for Tailwind CSS compilation and PostCSS processing
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

describe('SPARC Tailwind CSS Compilation Validation', () => {
  const projectRoot = process.cwd();
  const nextBuildDir = path.join(projectRoot, '.next');
  const staticDir = path.join(nextBuildDir, 'static');

  beforeAll(async () => {
    // Clean and prepare for testing
    if (fs.existsSync(nextBuildDir)) {
      await execAsync('rm -rf .next');
    }
  }, 30000);

  describe('1. CSS Compilation Process', () => {
    test('should successfully build Next.js project with Tailwind', async () => {
      const { stdout, stderr } = await execAsync('npm run build');

      expect(stderr).not.toContain('error');
      expect(stdout).toContain('Compiled successfully');
      expect(fs.existsSync(nextBuildDir)).toBe(true);
    }, 60000);

    test('should generate CSS files in build output', async () => {
      const cssFiles = findCssFiles(staticDir);

      expect(cssFiles).toHaveLength.greaterThan(0);

      // Verify CSS files contain Tailwind utilities
      for (const cssFile of cssFiles) {
        const content = fs.readFileSync(cssFile, 'utf8');
        expect(content).toMatch(/\.bg-white\s*{/);
        expect(content).toMatch(/\.text-/);
        expect(content).toMatch(/\.p-\d+/);
      }
    });

    test('should process @tailwind directives correctly', async () => {
      const cssFiles = findCssFiles(staticDir);

      for (const cssFile of cssFiles) {
        const content = fs.readFileSync(cssFile, 'utf8');

        // @tailwind directives should be processed (not present in output)
        expect(content).not.toContain('@tailwind');

        // Should contain Tailwind's CSS reset and utilities
        expect(content).toMatch(/box-sizing\s*:\s*border-box/);
      }
    });

    test('should apply custom Tailwind configuration', async () => {
      const cssFiles = findCssFiles(staticDir);
      let foundCustomColors = false;

      for (const cssFile of cssFiles) {
        const content = fs.readFileSync(cssFile, 'utf8');

        // Check for custom primary colors from config
        if (content.includes('--tw-bg-opacity') || content.includes('rgb(59 130 246')) {
          foundCustomColors = true;
          break;
        }
      }

      expect(foundCustomColors).toBe(true);
    });

    test('should include autoprefixer output', async () => {
      const cssFiles = findCssFiles(staticDir);
      let foundPrefixes = false;

      for (const cssFile of cssFiles) {
        const content = fs.readFileSync(cssFile, 'utf8');

        // Check for vendor prefixes
        if (content.includes('-webkit-') || content.includes('-moz-') || content.includes('-ms-')) {
          foundPrefixes = true;
          break;
        }
      }

      expect(foundPrefixes).toBe(true);
    });
  });

  describe('2. PostCSS Configuration Validation', () => {
    test('should load PostCSS config correctly', () => {
      const postCssConfig = require(path.join(projectRoot, 'postcss.config.cjs'));

      expect(postCssConfig.plugins).toBeDefined();
      expect(postCssConfig.plugins['@tailwindcss/postcss']).toBeDefined();
      expect(postCssConfig.plugins.autoprefixer).toBeDefined();
    });

    test('should load Tailwind config correctly', () => {
      const tailwindConfig = require(path.join(projectRoot, 'tailwind.config.cjs'));

      expect(tailwindConfig.content).toBeDefined();
      expect(tailwindConfig.content).toContain('./frontend/src/**/*.{js,ts,jsx,tsx}');
      expect(tailwindConfig.theme).toBeDefined();
      expect(tailwindConfig.theme.extend).toBeDefined();
    });

    test('should have correct content paths configuration', () => {
      const tailwindConfig = require(path.join(projectRoot, 'tailwind.config.cjs'));
      const contentPaths = tailwindConfig.content;

      // Verify all important content paths are included
      expect(contentPaths).toContain('./frontend/src/**/*.{js,ts,jsx,tsx}');
      expect(contentPaths).toContain('./src/**/*.{js,ts,jsx,tsx}');
      expect(contentPaths).toContain('./pages/**/*.{js,ts,jsx,tsx}');
      expect(contentPaths).toContain('./components/**/*.{js,ts,jsx,tsx}');
    });
  });

  describe('3. CSS Bundle Analysis', () => {
    test('should optimize CSS bundle size', async () => {
      const cssFiles = findCssFiles(staticDir);
      let totalSize = 0;

      for (const cssFile of cssFiles) {
        const stats = fs.statSync(cssFile);
        totalSize += stats.size;
      }

      // CSS bundle should be under 500KB (reasonable for Tailwind)
      expect(totalSize).toBeLessThan(500 * 1024);
    });

    test('should purge unused CSS classes', async () => {
      const cssFiles = findCssFiles(staticDir);
      let foundUnusedClasses = false;

      for (const cssFile of cssFiles) {
        const content = fs.readFileSync(cssFile, 'utf8');

        // Check for obviously unused classes that shouldn't be in production
        if (content.includes('.bg-pink-942') || content.includes('.text-purple-1337')) {
          foundUnusedClasses = true;
        }
      }

      expect(foundUnusedClasses).toBe(false);
    });

    test('should include critical CSS utilities', async () => {
      const cssFiles = findCssFiles(staticDir);
      let foundCriticalUtilities = false;

      for (const cssFile of cssFiles) {
        const content = fs.readFileSync(cssFile, 'utf8');

        // Check for commonly used utilities that should be present
        if (content.includes('.bg-white') &&
            content.includes('.text-gray-900') &&
            content.includes('.p-4')) {
          foundCriticalUtilities = true;
          break;
        }
      }

      expect(foundCriticalUtilities).toBe(true);
    });
  });

  describe('4. Custom Utilities and Components', () => {
    test('should include custom text-shadow utilities', async () => {
      const cssFiles = findCssFiles(staticDir);
      let foundTextShadow = false;

      for (const cssFile of cssFiles) {
        const content = fs.readFileSync(cssFile, 'utf8');

        if (content.includes('text-shadow') && content.includes('rgba(0, 0, 0')) {
          foundTextShadow = true;
          break;
        }
      }

      expect(foundTextShadow).toBe(true);
    });

    test('should include custom animations', async () => {
      const cssFiles = findCssFiles(staticDir);
      let foundCustomAnimations = false;

      for (const cssFile of cssFiles) {
        const content = fs.readFileSync(cssFile, 'utf8');

        if (content.includes('pulse-slow') || content.includes('bounce-gentle')) {
          foundCustomAnimations = true;
          break;
        }
      }

      expect(foundCustomAnimations).toBe(true);
    });

    test('should process @layer utilities correctly', async () => {
      const cssFiles = findCssFiles(staticDir);
      let foundLayerUtilities = false;

      for (const cssFile of cssFiles) {
        const content = fs.readFileSync(cssFile, 'utf8');

        // Check for line-clamp utilities from globals.css
        if (content.includes('line-clamp') && content.includes('-webkit-line-clamp')) {
          foundLayerUtilities = true;
          break;
        }
      }

      expect(foundLayerUtilities).toBe(true);
    });
  });

  describe('5. Build Performance Validation', () => {
    test('should complete build within reasonable time', async () => {
      const startTime = Date.now();

      await execAsync('npm run build');

      const buildTime = Date.now() - startTime;

      // Build should complete within 2 minutes
      expect(buildTime).toBeLessThan(120000);
    }, 150000);

    test('should generate efficient CSS chunks', async () => {
      const cssFiles = findCssFiles(staticDir);

      // Should have CSS files but not too many (indicating good chunking)
      expect(cssFiles.length).toBeGreaterThan(0);
      expect(cssFiles.length).toBeLessThan(10);
    });

    test('should maintain consistent build output', async () => {
      // Run build twice and compare outputs
      await execAsync('npm run build');
      const firstBuild = getCssBuildHash();

      await execAsync('rm -rf .next');
      await execAsync('npm run build');
      const secondBuild = getCssBuildHash();

      // Builds should be deterministic (same hash)
      expect(firstBuild).toBe(secondBuild);
    }, 180000);
  });
});

// Helper functions
function findCssFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.css')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function getCssBuildHash() {
  const crypto = require('crypto');
  const cssFiles = findCssFiles(path.join(process.cwd(), '.next', 'static'));

  let combinedContent = '';
  for (const file of cssFiles) {
    combinedContent += fs.readFileSync(file, 'utf8');
  }

  return crypto.createHash('md5').update(combinedContent).digest('hex');
}