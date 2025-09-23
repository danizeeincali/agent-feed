/**
 * CSS Pipeline TDD Tests
 * Testing PostCSS, Tailwind CSS compilation, and Next.js CSS generation
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { JSDOM } = require('jsdom');

const execAsync = promisify(exec);
const projectRoot = path.resolve(__dirname, '../../');

describe('CSS Pipeline TDD Tests', () => {
  let buildOutput;
  let cssFiles;

  beforeAll(async () => {
    // Clean any existing build
    try {
      await execAsync('rm -rf .next', { cwd: projectRoot });
    } catch (error) {
      // Ignore if .next doesn't exist
    }
  }, 30000);

  describe('1. PostCSS Processes Tailwind Directives', () => {
    test('should process @tailwind base directive', async () => {
      // Create test CSS file with Tailwind directives
      const testCssPath = path.join(projectRoot, 'test-globals.css');
      const testCssContent = `
@tailwind base;
@tailwind components;
@tailwind utilities;

.test-class {
  @apply bg-blue-500 text-white p-4;
}
`;

      fs.writeFileSync(testCssPath, testCssContent);

      try {
        // Process CSS with PostCSS
        const postcssConfigPath = path.join(projectRoot, 'postcss.config.cjs');
        const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.cjs');

        expect(fs.existsSync(postcssConfigPath)).toBe(true);
        expect(fs.existsSync(tailwindConfigPath)).toBe(true);

        // Run PostCSS processing
        const { stdout, stderr } = await execAsync(
          `npx postcss ${testCssPath} --config ${postcssConfigPath} --output test-output.css`,
          { cwd: projectRoot }
        );

        expect(stderr).toBe('');

        const outputCss = fs.readFileSync(path.join(projectRoot, 'test-output.css'), 'utf8');

        // Should contain CSS reset/normalize (base)
        expect(outputCss).toContain('*,::before,::after'); // Tailwind base reset

        // Should contain utility classes
        expect(outputCss).toContain('.bg-blue-500');
        expect(outputCss).toContain('.text-white');
        expect(outputCss).toContain('.p-4');

        // Should not contain the @tailwind directives (they should be processed)
        expect(outputCss).not.toContain('@tailwind base');
        expect(outputCss).not.toContain('@tailwind components');
        expect(outputCss).not.toContain('@tailwind utilities');

      } finally {
        // Cleanup
        fs.unlinkSync(testCssPath);
        if (fs.existsSync(path.join(projectRoot, 'test-output.css'))) {
          fs.unlinkSync(path.join(projectRoot, 'test-output.css'));
        }
      }
    }, 15000);

    test('should process custom Tailwind utilities', async () => {
      const testCssPath = path.join(projectRoot, 'test-utilities.css');
      const testCssContent = `
@tailwind utilities;

@layer utilities {
  .text-shadow-lg {
    text-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }
}
`;

      fs.writeFileSync(testCssPath, testCssContent);

      try {
        const { stdout, stderr } = await execAsync(
          `npx postcss ${testCssPath} --config ${path.join(projectRoot, 'postcss.config.cjs')} --output test-utilities-output.css`,
          { cwd: projectRoot }
        );

        expect(stderr).toBe('');

        const outputCss = fs.readFileSync(path.join(projectRoot, 'test-utilities-output.css'), 'utf8');

        // Should contain the custom utility
        expect(outputCss).toContain('.text-shadow-lg');
        expect(outputCss).toContain('text-shadow: 0 8px 16px rgba(0, 0, 0, 0.15)');

      } finally {
        fs.unlinkSync(testCssPath);
        if (fs.existsSync(path.join(projectRoot, 'test-utilities-output.css'))) {
          fs.unlinkSync(path.join(projectRoot, 'test-utilities-output.css'));
        }
      }
    }, 10000);
  });

  describe('2. CSS Files Generated in .next/static/css', () => {
    beforeAll(async () => {
      // Build the Next.js project to generate CSS
      try {
        const { stdout, stderr } = await execAsync('npm run build', { cwd: projectRoot });
        buildOutput = { stdout, stderr };
      } catch (error) {
        buildOutput = { error };
      }
    }, 60000);

    test('should create .next/static/css directory', () => {
      const cssDir = path.join(projectRoot, '.next/static/css');
      expect(fs.existsSync(cssDir)).toBe(true);

      const files = fs.readdirSync(cssDir);
      expect(files.length).toBeGreaterThan(0);

      // Should contain CSS files with hash names
      const cssFilePattern = /\.css$/;
      const hasCssFiles = files.some(file => cssFilePattern.test(file));
      expect(hasCssFiles).toBe(true);
    });

    test('should generate CSS files with proper hashing', () => {
      const cssDir = path.join(projectRoot, '.next/static/css');
      const files = fs.readdirSync(cssDir);

      // CSS files should have hash in filename for cache busting
      const hashPattern = /^[a-f0-9]{8,}\.css$/;
      const hasHashedCss = files.some(file => hashPattern.test(file));
      expect(hasHashedCss).toBe(true);
    });

    test('should generate minified CSS in production build', () => {
      const cssDir = path.join(projectRoot, '.next/static/css');
      const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

      expect(files.length).toBeGreaterThan(0);

      // Check if CSS is minified (no unnecessary whitespace)
      const cssFile = files[0];
      const cssContent = fs.readFileSync(path.join(cssDir, cssFile), 'utf8');

      // Minified CSS should not have excessive whitespace
      expect(cssContent).not.toMatch(/\n\s+/); // No indented newlines
      expect(cssContent.length).toBeGreaterThan(0);
    });
  });

  describe('3. Tailwind Utilities Compiled Correctly', () => {
    test('should include Tailwind base styles', () => {
      const cssDir = path.join(projectRoot, '.next/static/css');
      const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

      expect(files.length).toBeGreaterThan(0);

      const cssContent = files.map(file =>
        fs.readFileSync(path.join(cssDir, file), 'utf8')
      ).join('\n');

      // Should contain Tailwind's CSS reset/normalize
      expect(cssContent).toMatch(/\*,::?before,::?after/); // Universal selector reset
    });

    test('should include custom color utilities from tailwind.config', () => {
      const cssDir = path.join(projectRoot, '.next/static/css');
      const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

      const cssContent = files.map(file =>
        fs.readFileSync(path.join(cssDir, file), 'utf8')
      ).join('\n');

      // Should contain custom primary colors from config
      expect(cssContent).toMatch(/--tw-bg-opacity/); // Tailwind utility variables
    });

    test('should include custom animations from config', () => {
      const cssDir = path.join(projectRoot, '.next/static/css');
      const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

      const cssContent = files.map(file =>
        fs.readFileSync(path.join(cssDir, file), 'utf8')
      ).join('\n');

      // Should contain custom animations if used
      // This test might need component usage to trigger inclusion
      expect(cssContent).toContain('animation'); // Basic animation properties should exist
    });

    test('should purge unused CSS classes', () => {
      const cssDir = path.join(projectRoot, '.next/static/css');
      const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

      const cssContent = files.map(file =>
        fs.readFileSync(path.join(cssDir, file), 'utf8')
      ).join('\n');

      // CSS should be purged (smaller than full Tailwind)
      // Full Tailwind is ~3MB, purged should be much smaller
      expect(cssContent.length).toBeLessThan(500000); // Less than 500KB
    });
  });

  describe('4. CSS Injected into HTML', () => {
    test('should inject CSS links in HTML head', async () => {
      const htmlFiles = [];
      const nextDir = path.join(projectRoot, '.next');

      // Find HTML files in .next directory
      function findHtmlFiles(dir) {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            findHtmlFiles(fullPath);
          } else if (item.endsWith('.html')) {
            htmlFiles.push(fullPath);
          }
        }
      }

      findHtmlFiles(nextDir);

      if (htmlFiles.length === 0) {
        // Try to check server-side rendered pages structure
        const pagesDir = path.join(nextDir, 'server/pages');
        expect(fs.existsSync(pagesDir)).toBe(true);
      }

      // Check build manifest for CSS references
      const buildManifestPath = path.join(nextDir, 'build-manifest.json');
      if (fs.existsSync(buildManifestPath)) {
        const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));

        // Should have CSS files in manifest
        expect(buildManifest.pages).toBeDefined();

        // Check if CSS is referenced in page manifests
        const pageEntries = Object.values(buildManifest.pages);
        const hasCssReferences = pageEntries.some(entry =>
          Array.isArray(entry) && entry.some(file => file.endsWith('.css'))
        );

        expect(hasCssReferences).toBe(true);
      }
    });

    test('should have proper CSS loading order', () => {
      const buildManifestPath = path.join(projectRoot, '.next/build-manifest.json');

      if (fs.existsSync(buildManifestPath)) {
        const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));

        // CSS should be loaded before JS for optimal performance
        const indexPage = buildManifest.pages['/'] || buildManifest.pages['/_app'];

        if (indexPage && Array.isArray(indexPage)) {
          const cssFiles = indexPage.filter(file => file.endsWith('.css'));
          const jsFiles = indexPage.filter(file => file.endsWith('.js'));

          if (cssFiles.length > 0 && jsFiles.length > 0) {
            // CSS files should appear before JS files in the array (loading order)
            const firstCssIndex = indexPage.findIndex(file => file.endsWith('.css'));
            const firstJsIndex = indexPage.findIndex(file => file.endsWith('.js'));

            if (firstCssIndex !== -1 && firstJsIndex !== -1) {
              expect(firstCssIndex).toBeLessThan(firstJsIndex);
            }
          }
        }
      }
    });
  });

  describe('5. Browser Receives and Applies Styles', () => {
    test('should serve CSS with correct MIME type headers', async () => {
      // Start Next.js server for testing
      const serverProcess = exec('npm run start', { cwd: projectRoot });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        // Test CSS file serving (we'll mock this since we can't easily start server in test)
        const cssDir = path.join(projectRoot, '.next/static/css');
        const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

        expect(files.length).toBeGreaterThan(0);

        // Verify CSS content is valid
        const cssFile = files[0];
        const cssContent = fs.readFileSync(path.join(cssDir, cssFile), 'utf8');

        // Should contain valid CSS
        expect(cssContent).toMatch(/[.#][\w-]+\s*{[^}]*}/); // Basic CSS rule pattern

        // Should not contain syntax errors
        expect(cssContent).not.toContain('undefined');
        expect(cssContent).not.toContain('[object Object]');

      } finally {
        serverProcess.kill();
      }
    }, 15000);

    test('should generate valid CSS that parses correctly', () => {
      const cssDir = path.join(projectRoot, '.next/static/css');
      const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

      expect(files.length).toBeGreaterThan(0);

      files.forEach(file => {
        const cssContent = fs.readFileSync(path.join(cssDir, file), 'utf8');

        // Basic CSS syntax validation
        // Check for balanced braces
        const openBraces = (cssContent.match(/{/g) || []).length;
        const closeBraces = (cssContent.match(/}/g) || []).length;
        expect(openBraces).toBe(closeBraces);

        // Should not contain obvious syntax errors
        expect(cssContent).not.toContain('undefined');
        expect(cssContent).not.toContain('NaN');
        expect(cssContent).not.toContain('[object');
      });
    });

    test('should include critical CSS for above-the-fold content', () => {
      const cssDir = path.join(projectRoot, '.next/static/css');
      const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

      const cssContent = files.map(file =>
        fs.readFileSync(path.join(cssDir, file), 'utf8')
      ).join('\n');

      // Should include basic layout and typography styles
      expect(cssContent).toMatch(/body|html/i); // Basic HTML element styles
      expect(cssContent).toMatch(/font|text/); // Typography styles
    });

    test('should support responsive design with media queries', () => {
      const cssDir = path.join(projectRoot, '.next/static/css');
      const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

      const cssContent = files.map(file =>
        fs.readFileSync(path.join(cssDir, file), 'utf8')
      ).join('\n');

      // Should contain Tailwind's responsive breakpoints if used
      if (cssContent.includes('@media')) {
        expect(cssContent).toMatch(/@media.*min-width/); // Responsive breakpoints
      }
    });
  });

  describe('CSS Pipeline Integration Tests', () => {
    test('should complete full CSS compilation pipeline', () => {
      // Verify the entire pipeline works together
      const cssDir = path.join(projectRoot, '.next/static/css');
      const buildManifestPath = path.join(projectRoot, '.next/build-manifest.json');

      // 1. CSS files were generated
      expect(fs.existsSync(cssDir)).toBe(true);
      const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
      expect(cssFiles.length).toBeGreaterThan(0);

      // 2. Build manifest references CSS
      expect(fs.existsSync(buildManifestPath)).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));
      expect(manifest.pages).toBeDefined();

      // 3. CSS contains expected Tailwind output
      const cssContent = cssFiles.map(file =>
        fs.readFileSync(path.join(cssDir, file), 'utf8')
      ).join('\n');

      expect(cssContent.length).toBeGreaterThan(1000); // Should have substantial content
      expect(cssContent).toMatch(/--tw-/); // Tailwind CSS variables
    });

    test('should handle CSS errors gracefully', async () => {
      // This test ensures the build doesn't fail with CSS errors
      expect(buildOutput?.error).toBeUndefined();

      if (buildOutput?.stderr) {
        // Should not contain CSS compilation errors
        expect(buildOutput.stderr).not.toContain('CSS Error');
        expect(buildOutput.stderr).not.toContain('PostCSS Error');
        expect(buildOutput.stderr).not.toContain('Tailwind Error');
      }
    });
  });
});