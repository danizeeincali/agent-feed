/**
 * TDD Test Suite: PostCSS Configuration Loading
 * Purpose: Test if PostCSS config can be loaded and executed correctly
 */

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

describe('PostCSS Configuration Tests', () => {
  let projectRoot;
  let postcssConfigPath;

  beforeAll(() => {
    projectRoot = path.resolve(__dirname, '../..');
    postcssConfigPath = path.join(projectRoot, 'postcss.config.cjs');
  });

  test('PostCSS config file exists and is readable', () => {
    expect(fs.existsSync(postcssConfigPath)).toBe(true);

    // Test file can be read
    const configContent = fs.readFileSync(postcssConfigPath, 'utf8');
    expect(configContent).toBeTruthy();
    expect(configContent).toContain('module.exports');
  });

  test('PostCSS config can be required without errors', () => {
    expect(() => {
      delete require.cache[postcssConfigPath];
      const config = require(postcssConfigPath);
      expect(config).toBeDefined();
      expect(config.plugins).toBeDefined();
    }).not.toThrow();
  });

  test('PostCSS config plugins are valid', () => {
    delete require.cache[postcssConfigPath];
    const config = require(postcssConfigPath);

    expect(config.plugins).toBeDefined();
    expect(typeof config.plugins).toBe('object');

    // Test each plugin exists
    const pluginNames = Object.keys(config.plugins);
    pluginNames.forEach(pluginName => {
      expect(() => {
        require.resolve(pluginName);
      }).not.toThrow(`Plugin ${pluginName} should be resolvable`);
    });
  });

  test('FAILING TEST: @tailwindcss/postcss plugin does not exist', () => {
    // This test should FAIL - @tailwindcss/postcss doesn't exist
    expect(() => {
      require.resolve('@tailwindcss/postcss');
    }).toThrow(); // This is expected to fail - identifying the problem
  });

  test('Correct Tailwind plugin exists', () => {
    expect(() => {
      require.resolve('tailwindcss');
    }).not.toThrow();
  });

  test('FAILING TEST: PostCSS processor instantiation with current config', async () => {
    // This should fail with current config
    delete require.cache[postcssConfigPath];
    const config = require(postcssConfigPath);

    try {
      const processor = postcss(config.plugins);
      expect(processor).toBeDefined();

      // Try to process a simple CSS
      const css = '@tailwind base; @tailwind components; @tailwind utilities;';
      const result = await processor.process(css, { from: undefined });
      expect(result.css).toBeTruthy();
    } catch (error) {
      // This should fail with current wrong config
      expect(error.message).toContain('@tailwindcss/postcss');
      throw error; // Re-throw to mark test as failed
    }
  });

  test('PostCSS processor works with correct plugins', async () => {
    // Test with correct plugin configuration
    const correctConfig = {
      plugins: {
        'tailwindcss': {},
        'autoprefixer': {}
      }
    };

    const processor = postcss(correctConfig.plugins);
    expect(processor).toBeDefined();

    // This should work
    const css = 'body { margin: 0; }';
    const result = await processor.process(css, { from: undefined });
    expect(result.css).toBeTruthy();
  });

  test('Autoprefixer plugin is available', () => {
    expect(() => {
      require.resolve('autoprefixer');
    }).not.toThrow();
  });

  test('PostCSS version compatibility', () => {
    const postcssPackage = require('postcss/package.json');
    const tailwindPackage = require('tailwindcss/package.json');

    console.log('PostCSS version:', postcssPackage.version);
    console.log('Tailwind version:', tailwindPackage.version);

    // Check if Tailwind v4 is being used (might need different config)
    const tailwindMajorVersion = parseInt(tailwindPackage.version.split('.')[0]);

    if (tailwindMajorVersion >= 4) {
      console.log('WARNING: TailwindCSS v4+ detected - configuration may need updates');
    }
  });

  test('CSS file can be processed through PostCSS with fixed config', async () => {
    const cssContent = `
      @tailwind base;
      @tailwind components;
      @tailwind utilities;

      .test-class {
        @apply text-blue-500;
      }
    `;

    // Use correct plugin configuration
    const correctConfig = {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer')
      ]
    };

    const processor = postcss(correctConfig.plugins);

    try {
      const result = await processor.process(cssContent, {
        from: path.join(projectRoot, 'src/styles/globals.css'),
        to: path.join(projectRoot, '.next/static/css/test.css')
      });

      expect(result.css).toBeTruthy();
      expect(result.css.length).toBeGreaterThan(cssContent.length);

      // Should contain processed Tailwind CSS
      expect(result.css).toContain('*');
      expect(result.css).toContain('body');
    } catch (error) {
      console.error('CSS Processing Error:', error.message);
      throw error;
    }
  });
});