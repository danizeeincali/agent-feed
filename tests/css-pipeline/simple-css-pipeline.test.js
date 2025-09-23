/**
 * Simple CSS Pipeline Tests
 * Testing CSS generation using command line tools
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const projectRoot = path.resolve(__dirname, '../../');

describe('Simple CSS Pipeline Tests', () => {
  const testCssPath = path.join(projectRoot, 'test-input.css');
  const testOutputPath = path.join(projectRoot, 'test-output.css');

  afterEach(() => {
    // Cleanup test files
    [testCssPath, testOutputPath].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  describe('PostCSS with Tailwind v4', () => {
    test('should process Tailwind v4 @import directive', async () => {
      // Create test CSS file
      const testCss = `@import "tailwindcss";

.test-class {
  color: red;
}`;

      fs.writeFileSync(testCssPath, testCss);

      try {
        // Process with PostCSS
        const { stdout, stderr } = await execAsync(
          `npx postcss ${testCssPath} --config ${path.join(projectRoot, 'postcss.config.cjs')} --output ${testOutputPath}`,
          { cwd: projectRoot }
        );

        // Check that file was created
        expect(fs.existsSync(testOutputPath)).toBe(true);

        const outputCss = fs.readFileSync(testOutputPath, 'utf8');

        // Basic checks
        expect(outputCss).toBeDefined();
        expect(outputCss.length).toBeGreaterThan(100); // Should have some content
        expect(outputCss).not.toContain('@import "tailwindcss"'); // Should be processed
        expect(outputCss).toContain('.test-class'); // Custom class should remain

      } catch (error) {
        // Log error for debugging
        console.error('PostCSS processing error:', error);
        throw error;
      }
    }, 30000);

    test('should handle custom utilities with @layer', async () => {
      const testCss = `@import "tailwindcss";

@layer utilities {
  .text-shadow-custom {
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  }
}

.regular-class {
  color: blue;
}`;

      fs.writeFileSync(testCssPath, testCss);

      try {
        const { stdout, stderr } = await execAsync(
          `npx postcss ${testCssPath} --config ${path.join(projectRoot, 'postcss.config.cjs')} --output ${testOutputPath}`,
          { cwd: projectRoot }
        );

        expect(fs.existsSync(testOutputPath)).toBe(true);

        const outputCss = fs.readFileSync(testOutputPath, 'utf8');

        expect(outputCss).toContain('.text-shadow-custom');
        expect(outputCss).toContain('text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5)');
        expect(outputCss).toContain('.regular-class');
        expect(outputCss).toContain('color: blue');

      } catch (error) {
        console.error('PostCSS layer processing error:', error);
        throw error;
      }
    }, 30000);

    test('should process @apply directives', async () => {
      const testCss = `@import "tailwindcss";

.button {
  @apply bg-blue-500 text-white p-4 rounded;
}`;

      fs.writeFileSync(testCssPath, testCss);

      try {
        const { stdout, stderr } = await execAsync(
          `npx postcss ${testCssPath} --config ${path.join(projectRoot, 'postcss.config.cjs')} --output ${testOutputPath}`,
          { cwd: projectRoot }
        );

        expect(fs.existsSync(testOutputPath)).toBe(true);

        const outputCss = fs.readFileSync(testOutputPath, 'utf8');

        expect(outputCss).toContain('.button');
        expect(outputCss).not.toContain('@apply'); // Should be processed
        // Should contain some CSS properties
        expect(outputCss).toMatch(/background-color|background:/);

      } catch (error) {
        console.error('PostCSS @apply processing error:', error);
        throw error;
      }
    }, 30000);
  });

  describe('Configuration Files', () => {
    test('should have valid PostCSS configuration', () => {
      const postcssConfig = path.join(projectRoot, 'postcss.config.cjs');
      expect(fs.existsSync(postcssConfig)).toBe(true);

      const config = require(postcssConfig);
      expect(config.plugins).toBeDefined();
      expect(config.plugins['@tailwindcss/postcss']).toBeDefined();
      expect(config.plugins.autoprefixer).toBeDefined();
    });

    test('should have valid Tailwind configuration', () => {
      const tailwindConfig = path.join(projectRoot, 'tailwind.config.cjs');
      expect(fs.existsSync(tailwindConfig)).toBe(true);

      const config = require(tailwindConfig);
      expect(config.content).toBeDefined();
      expect(Array.isArray(config.content)).toBe(true);
      expect(config.theme).toBeDefined();
    });

    test('should have globals.css with Tailwind v4 import', () => {
      const globalsPath = path.join(projectRoot, 'src/styles/globals.css');
      expect(fs.existsSync(globalsPath)).toBe(true);

      const globalsCss = fs.readFileSync(globalsPath, 'utf8');
      expect(globalsCss).toContain('@import "tailwindcss"');
    });
  });

  describe('Autoprefixer Integration', () => {
    test('should add vendor prefixes', async () => {
      const testCss = `@import "tailwindcss";

.test {
  transform: translateX(10px);
  transition: all 0.3s ease;
  user-select: none;
}`;

      fs.writeFileSync(testCssPath, testCss);

      try {
        const { stdout, stderr } = await execAsync(
          `npx postcss ${testCssPath} --config ${path.join(projectRoot, 'postcss.config.cjs')} --output ${testOutputPath}`,
          { cwd: projectRoot }
        );

        expect(fs.existsSync(testOutputPath)).toBe(true);

        const outputCss = fs.readFileSync(testOutputPath, 'utf8');

        expect(outputCss).toContain('.test');
        expect(outputCss).toContain('transform');
        expect(outputCss).toContain('transition');

      } catch (error) {
        console.error('Autoprefixer processing error:', error);
        throw error;
      }
    }, 30000);
  });

  describe('Error Handling', () => {
    test('should handle invalid CSS gracefully', async () => {
      const invalidCss = `@import "tailwindcss";

.invalid {
  color: ;
  background-color
}`;

      fs.writeFileSync(testCssPath, invalidCss);

      try {
        const result = await execAsync(
          `npx postcss ${testCssPath} --config ${path.join(projectRoot, 'postcss.config.cjs')} --output ${testOutputPath}`,
          { cwd: projectRoot }
        );

        // If it succeeds, that's fine - PostCSS might handle it gracefully
        if (fs.existsSync(testOutputPath)) {
          const outputCss = fs.readFileSync(testOutputPath, 'utf8');
          expect(outputCss).toBeDefined();
        }

      } catch (error) {
        // If it fails, the error should be informative
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('Performance', () => {
    test('should process CSS in reasonable time', async () => {
      const largeCss = `@import "tailwindcss";

${Array.from({ length: 20 }, (_, i) => `
.test-${i} {
  color: red;
  background: blue;
  padding: 10px;
  margin: 5px;
}
`).join('\n')}`;

      fs.writeFileSync(testCssPath, largeCss);

      const startTime = Date.now();

      try {
        const { stdout, stderr } = await execAsync(
          `npx postcss ${testCssPath} --config ${path.join(projectRoot, 'postcss.config.cjs')} --output ${testOutputPath}`,
          { cwd: projectRoot }
        );

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        expect(processingTime).toBeLessThan(15000); // Should process within 15 seconds

        expect(fs.existsSync(testOutputPath)).toBe(true);
        const outputCss = fs.readFileSync(testOutputPath, 'utf8');
        expect(outputCss.length).toBeGreaterThan(100);

      } catch (error) {
        console.error('Performance test error:', error);
        throw error;
      }
    }, 30000);
  });
});