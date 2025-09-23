/**
 * TDD Test Suite: Tailwind Plugin Execution
 * Purpose: Test if Tailwind CSS plugin can execute and generate CSS correctly
 */

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');

describe('Tailwind Plugin Execution Tests', () => {
  let projectRoot;
  let tailwindConfigPath;
  let cssFilePath;

  beforeAll(() => {
    projectRoot = path.resolve(__dirname, '../..');
    tailwindConfigPath = path.join(projectRoot, 'tailwind.config.cjs');
    cssFilePath = path.join(projectRoot, 'src/styles/globals.css');
  });

  test('Tailwind config file exists and is readable', () => {
    expect(fs.existsSync(tailwindConfigPath)).toBe(true);

    const configContent = fs.readFileSync(tailwindConfigPath, 'utf8');
    expect(configContent).toBeTruthy();
    expect(configContent).toContain('module.exports');
  });

  test('Tailwind config can be loaded without errors', () => {
    expect(() => {
      delete require.cache[tailwindConfigPath];
      const config = require(tailwindConfigPath);
      expect(config).toBeDefined();
      expect(config.content).toBeDefined();
      expect(config.theme).toBeDefined();
    }).not.toThrow();
  });

  test('Tailwind content paths are valid', () => {
    delete require.cache[tailwindConfigPath];
    const config = require(tailwindConfigPath);

    expect(Array.isArray(config.content)).toBe(true);
    expect(config.content.length).toBeGreaterThan(0);

    // Check if content paths make sense
    config.content.forEach(contentPath => {
      expect(typeof contentPath).toBe('string');
      expect(contentPath).toBeTruthy();
    });
  });

  test('CSS source file exists and contains Tailwind directives', () => {
    expect(fs.existsSync(cssFilePath)).toBe(true);

    const cssContent = fs.readFileSync(cssFilePath, 'utf8');
    expect(cssContent).toContain('@tailwind base');
    expect(cssContent).toContain('@tailwind components');
    expect(cssContent).toContain('@tailwind utilities');
  });

  test('Tailwind plugin can process basic CSS directives', async () => {
    const basicCss = `
      @tailwind base;
      @tailwind components;
      @tailwind utilities;
    `;

    const processor = postcss([
      tailwindcss(tailwindConfigPath)
    ]);

    const result = await processor.process(basicCss, { from: undefined });

    expect(result.css).toBeTruthy();
    expect(result.css.length).toBeGreaterThan(basicCss.length);

    // Should contain CSS reset and base styles
    expect(result.css).toContain('*');
    expect(result.css).toContain('html');
    expect(result.css).toContain('body');
  });

  test('FAILING TEST: Tailwind processes @apply directives', async () => {
    const cssWithApply = `
      @tailwind utilities;

      .test-button {
        @apply bg-blue-500 text-white px-4 py-2 rounded;
      }
    `;

    const processor = postcss([
      tailwindcss(tailwindConfigPath)
    ]);

    try {
      const result = await processor.process(cssWithApply, { from: undefined });

      expect(result.css).toBeTruthy();
      expect(result.css).toContain('.test-button');

      // Should have expanded the @apply directive
      expect(result.css).toContain('background-color');
      expect(result.css).toContain('color');
      expect(result.css).toContain('padding');
    } catch (error) {
      console.error('Tailwind @apply processing failed:', error.message);
      throw error;
    }
  });

  test('Tailwind generates utility classes for configured content', async () => {
    // Create a test HTML content that uses Tailwind classes
    const testContent = `
      <div class="bg-blue-500 text-white p-4 rounded-lg shadow-md">
        <h1 class="text-2xl font-bold">Test Header</h1>
        <p class="text-sm opacity-75">Test paragraph</p>
      </div>
    `;

    // Write test content to a temporary file
    const testHtmlPath = path.join(projectRoot, 'test-content.html');
    fs.writeFileSync(testHtmlPath, testContent);

    try {
      // Create config that includes our test file
      const testConfig = {
        ...require(tailwindConfigPath),
        content: [testHtmlPath]
      };

      const css = `
        @tailwind utilities;
      `;

      const processor = postcss([
        tailwindcss(testConfig)
      ]);

      const result = await processor.process(css, { from: undefined });

      expect(result.css).toBeTruthy();

      // Should contain utility classes that are actually used
      expect(result.css).toContain('.bg-blue-500');
      expect(result.css).toContain('.text-white');
      expect(result.css).toContain('.p-4');
      expect(result.css).toContain('.rounded-lg');

    } finally {
      // Clean up test file
      if (fs.existsSync(testHtmlPath)) {
        fs.unlinkSync(testHtmlPath);
      }
    }
  });

  test('Custom theme configuration is applied', async () => {
    delete require.cache[tailwindConfigPath];
    const config = require(tailwindConfigPath);

    expect(config.theme).toBeDefined();
    expect(config.theme.extend).toBeDefined();

    const css = `
      @tailwind utilities;

      .test-primary {
        @apply text-primary-500;
      }
    `;

    const processor = postcss([
      tailwindcss(config)
    ]);

    const result = await processor.process(css, { from: undefined });

    expect(result.css).toBeTruthy();

    // Should include custom primary colors from theme
    if (config.theme.extend.colors && config.theme.extend.colors.primary) {
      expect(result.css).toContain('3b82f6'); // primary-500 color value
    }
  });

  test('Tailwind plugins are loaded and executed', async () => {
    delete require.cache[tailwindConfigPath];
    const config = require(tailwindConfigPath);

    if (config.plugins && config.plugins.length > 0) {
      const css = `
        @tailwind utilities;

        .test-text-shadow {
          @apply text-shadow-md;
        }
      `;

      const processor = postcss([
        tailwindcss(config)
      ]);

      const result = await processor.process(css, { from: undefined });

      expect(result.css).toBeTruthy();

      // Should contain custom plugin utilities (like text-shadow)
      expect(result.css).toContain('text-shadow');
    } else {
      console.log('No custom plugins defined in Tailwind config');
    }
  });

  test('FAILING TEST: Full globals.css file processing', async () => {
    const globalsCssContent = fs.readFileSync(cssFilePath, 'utf8');

    const processor = postcss([
      tailwindcss(tailwindConfigPath),
      require('autoprefixer')
    ]);

    try {
      const result = await processor.process(globalsCssContent, {
        from: cssFilePath,
        to: path.join(projectRoot, '.next/static/css/globals.css')
      });

      expect(result.css).toBeTruthy();
      expect(result.css.length).toBeGreaterThan(globalsCssContent.length);

      // Should contain Tailwind base styles
      expect(result.css).toContain('*');
      expect(result.css).toContain('html');

      // Should preserve custom CSS
      expect(result.css).toContain('line-clamp-2');
      expect(result.css).toContain('::-webkit-scrollbar');

      // Should process CSS custom properties
      expect(result.css).toContain('--background');

    } catch (error) {
      console.error('Full CSS processing failed:', error.message);
      console.error('Error details:', error);
      throw error;
    }
  });

  test('Tailwind version and compatibility check', () => {
    const tailwindPackage = require('tailwindcss/package.json');
    console.log('TailwindCSS version:', tailwindPackage.version);

    const majorVersion = parseInt(tailwindPackage.version.split('.')[0]);

    if (majorVersion >= 4) {
      console.log('WARNING: TailwindCSS v4+ has different configuration requirements');
      console.log('Check: https://tailwindcss.com/docs/upgrade-guide');

      // Test if current config is compatible with v4
      const configPath = tailwindConfigPath;
      const configContent = fs.readFileSync(configPath, 'utf8');

      if (configContent.includes('module.exports') && majorVersion >= 4) {
        console.log('ISSUE: TailwindCSS v4+ may prefer ESM exports');
      }
    }
  });

  test('Performance: Tailwind CSS generation speed', async () => {
    const css = `
      @tailwind base;
      @tailwind components;
      @tailwind utilities;
    `;

    const startTime = Date.now();

    const processor = postcss([
      tailwindcss(tailwindConfigPath)
    ]);

    const result = await processor.process(css, { from: undefined });

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log(`Tailwind CSS processing time: ${processingTime}ms`);

    expect(result.css).toBeTruthy();
    expect(processingTime).toBeLessThan(10000); // Should take less than 10 seconds

    if (processingTime > 5000) {
      console.log('WARNING: Tailwind CSS processing is slow (>5s)');
    }
  });
});