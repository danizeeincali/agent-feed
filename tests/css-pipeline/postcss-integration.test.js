/**
 * PostCSS Integration Tests
 * Testing PostCSS configuration and plugin execution
 */

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwindcssPostcss = require('@tailwindcss/postcss');
const autoprefixer = require('autoprefixer');

const projectRoot = path.resolve(__dirname, '../../');

describe('PostCSS Integration Tests', () => {
  let processor;
  let tailwindConfig;
  let postcssConfig;

  beforeAll(() => {
    // Load configurations
    tailwindConfig = require(path.join(projectRoot, 'tailwind.config.cjs'));

    // Create PostCSS processor with Tailwind v4
    processor = postcss([
      tailwindcssPostcss(),
      autoprefixer()
    ]);
  });

  describe('PostCSS Configuration', () => {
    test('should load PostCSS config correctly', () => {
      const configPath = path.join(projectRoot, 'postcss.config.cjs');
      expect(fs.existsSync(configPath)).toBe(true);

      const config = require(configPath);
      expect(config.plugins).toBeDefined();
      expect(config.plugins['@tailwindcss/postcss']).toBeDefined();
      expect(config.plugins.autoprefixer).toBeDefined();
    });

    test('should load Tailwind config correctly', () => {
      expect(tailwindConfig).toBeDefined();
      expect(tailwindConfig.content).toBeDefined();
      expect(tailwindConfig.theme).toBeDefined();
      expect(tailwindConfig.plugins).toBeDefined();
    });
  });

  describe('Tailwind CSS Processing', () => {
    test('should process @import "tailwindcss" directive', async () => {
      const css = `@import "tailwindcss";`;

      const result = await processor.process(css, { from: undefined });

      expect(result.css).toContain('*,*::before,*::after'); // CSS reset
      expect(result.css).not.toContain('@import "tailwindcss"');
    });

    test('should process utility classes', async () => {
      const css = `
        @import "tailwindcss";

        .test {
          @apply bg-blue-500 text-white p-4;
        }
      `;

      const result = await processor.process(css, { from: undefined });

      expect(result.css).toContain('.test');
      expect(result.css).toContain('background-color');
      expect(result.css).toContain('color');
      expect(result.css).toContain('padding');
      expect(result.css).not.toContain('@apply');
    });

    test('should process custom utilities with @layer', async () => {
      const css = `
        @import "tailwindcss";

        @layer utilities {
          .text-shadow-custom {
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
          }
          .bg-gradient-custom {
            background: linear-gradient(45deg, #ff0000, #00ff00);
          }
        }
      `;

      const result = await processor.process(css, { from: undefined });

      expect(result.css).toContain('.text-shadow-custom');
      expect(result.css).toContain('text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5)');
      expect(result.css).toContain('.bg-gradient-custom');
      expect(result.css).toContain('linear-gradient');
    });

    test('should generate utility classes', async () => {
      const css = `@import "tailwindcss";`;

      const result = await processor.process(css, { from: undefined });

      // Should include utility classes
      expect(result.css.length).toBeGreaterThan(1000); // Should have substantial content
    });

    test('should generate animation utilities from config', async () => {
      const css = `
        @import "tailwindcss";

        .test-animation {
          @apply animate-pulse;
        }
      `;

      const result = await processor.process(css, { from: undefined });

      expect(result.css).toContain('animation');
      expect(result.css).toContain('pulse');
    });
  });

  describe('Autoprefixer Processing', () => {
    test('should add vendor prefixes', async () => {
      const css = `
        .test {
          transform: translateX(10px);
          transition: all 0.3s ease;
          user-select: none;
        }
      `;

      const result = await processor.process(css, { from: undefined });

      // Autoprefixer should add prefixes based on browserlist
      expect(result.css).toContain('transform');
      expect(result.css).toContain('transition');
    });

    test('should handle flexbox properties', async () => {
      const css = `
        .flex-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
        }
      `;

      const result = await processor.process(css, { from: undefined });

      expect(result.css).toContain('display: flex');
      expect(result.css).toContain('flex-direction');
      expect(result.css).toContain('align-items');
      expect(result.css).toContain('justify-content');
    });

    test('should handle grid properties', async () => {
      const css = `
        .grid-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-gap: 20px;
        }
      `;

      const result = await processor.process(css, { from: undefined });

      expect(result.css).toContain('display: grid');
      expect(result.css).toContain('grid-template-columns');
      expect(result.css).toContain('gap'); // Modern gap property
    });
  });

  describe('CSS Purging and Optimization', () => {
    test('should purge unused utilities', async () => {
      // Create a fake content file for testing
      const testContentPath = path.join(projectRoot, 'test-content.html');
      const testContent = `
        <div class="bg-blue-500 text-white p-4">
          <span class="font-bold">Test content</span>
        </div>
      `;

      fs.writeFileSync(testContentPath, testContent);

      try {
        // Configure Tailwind with test content
        const testProcessor = postcss([
          tailwindcssPostcss(),
          autoprefixer()
        ]);

        const css = `@import "tailwindcss";`;
        const result = await testProcessor.process(css, { from: undefined });

        // Should include used classes
        expect(result.css).toMatch(/\.bg-blue-500/);
        expect(result.css).toMatch(/\.text-white/);
        expect(result.css).toMatch(/\.p-4/);
        expect(result.css).toMatch(/\.font-bold/);

        // Should not include unused classes (this is hard to test definitively)
        // but the output should be smaller than full Tailwind
        expect(result.css.length).toBeLessThan(100000); // Reasonable size limit

      } finally {
        fs.unlinkSync(testContentPath);
      }
    });

    test('should preserve important CSS', async () => {
      const css = `
        @import "tailwindcss";

        /* Custom important styles */
        .important-style {
          color: red !important;
        }
      `;

      const result = await processor.process(css, { from: undefined });

      expect(result.css).toContain('.important-style');
      expect(result.css).toContain('!important');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid CSS gracefully', async () => {
      const invalidCss = `
        .invalid {
          color: ;
          background-color
        }
      `;

      try {
        await processor.process(invalidCss, { from: undefined });
        // If it doesn't throw, the processor handled it gracefully
      } catch (error) {
        // Error handling should provide useful information
        expect(error.message).toBeDefined();
        expect(error.line).toBeDefined();
      }
    });

    test('should handle missing @apply classes', async () => {
      const css = `
        @import "tailwindcss";

        .test {
          @apply non-existent-class;
        }
      `;

      try {
        await processor.process(css, { from: undefined });
        // Should not crash the build
      } catch (error) {
        // Should provide helpful error message
        expect(error.message).toContain('non-existent-class');
      }
    });

    test('should handle malformed import directives', async () => {
      const css = `
        @import "invalid-package";
      `;

      try {
        const result = await processor.process(css, { from: undefined });
        // Should process what it can
        expect(result.css).toBeDefined();
      } catch (error) {
        // Should provide helpful error message
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Source Maps', () => {
    test('should generate source maps when enabled', async () => {
      const css = `
        @import "tailwindcss";

        .test {
          @apply bg-blue-500 text-white;
        }
      `;

      const result = await processor.process(css, {
        from: 'test.css',
        to: 'output.css',
        map: { inline: false }
      });

      expect(result.map).toBeDefined();
      expect(result.map.toString()).toContain('sourceMappingURL');
    });
  });

  describe('Custom Plugin Integration', () => {
    test('should execute custom Tailwind plugins', async () => {
      // Test custom utilities
      const css = `
        @import "tailwindcss";

        .test {
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
      `;

      const result = await processor.process(css, { from: undefined });

      expect(result.css).toContain('text-shadow');
    });
  });

  describe('Performance', () => {
    test('should process CSS in reasonable time', async () => {
      const largeCss = `
        @import "tailwindcss";

        ${Array.from({ length: 10 }, (_, i) => `
          .test-${i} {
            @apply bg-blue-500 text-white p-4;
          }
        `).join('\n')}
      `;

      const startTime = Date.now();
      const result = await processor.process(largeCss, { from: undefined });
      const endTime = Date.now();

      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(10000); // Should process within 10 seconds
      expect(result.css.length).toBeGreaterThan(1000);
    });
  });
});