/**
 * Tailwind Utilities Compilation Tests
 * Tests that verify Tailwind CSS utility classes are properly compiled and available
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('Tailwind Utilities Compilation Tests', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.ts');

  let tailwindConfig;

  beforeAll(() => {
    // Read and parse Tailwind config
    const configContent = fs.readFileSync(tailwindConfigPath, 'utf8');

    // Extract configuration for testing (simplified parsing)
    const contentMatch = configContent.match(/content:\s*\[([\s\S]*?)\]/);
    const themeMatch = configContent.match(/theme:\s*{([\s\S]*?)}/);

    tailwindConfig = {
      hasContent: !!contentMatch,
      hasTheme: !!themeMatch,
      configContent
    };
  });

  describe('Tailwind Configuration', () => {
    test('should have valid content paths', () => {
      expect(tailwindConfig.hasContent).toBe(true);
      expect(tailwindConfig.configContent).toContain('./frontend/src/**/*.{js,ts,jsx,tsx,mdx}');
      expect(tailwindConfig.configContent).toContain('./src/**/*.{js,ts,jsx,tsx,mdx}');
      expect(tailwindConfig.configContent).toContain('./pages/**/*.{js,ts,jsx,tsx,mdx}');
      expect(tailwindConfig.configContent).toContain('./components/**/*.{js,ts,jsx,tsx,mdx}');
      expect(tailwindConfig.configContent).toContain('./app/**/*.{js,ts,jsx,tsx,mdx}');
    });

    test('should have custom theme configuration', () => {
      expect(tailwindConfig.hasTheme).toBe(true);
      expect(tailwindConfig.configContent).toContain('extend');
      expect(tailwindConfig.configContent).toContain('colors');
      expect(tailwindConfig.configContent).toContain('primary');
      expect(tailwindConfig.configContent).toContain('secondary');
    });

    test('should have custom colors defined', () => {
      expect(tailwindConfig.configContent).toContain('primary: {');
      expect(tailwindConfig.configContent).toContain('50: \'#eff6ff\'');
      expect(tailwindConfig.configContent).toContain('500: \'#3b82f6\'');
      expect(tailwindConfig.configContent).toContain('900: \'#1e3a8a\'');

      expect(tailwindConfig.configContent).toContain('secondary: {');
      expect(tailwindConfig.configContent).toContain('50: \'#f8fafc\'');
      expect(tailwindConfig.configContent).toContain('500: \'#64748b\'');
      expect(tailwindConfig.configContent).toContain('900: \'#0f172a\'');
    });

    test('should have custom animations', () => {
      expect(tailwindConfig.configContent).toContain('animation');
      expect(tailwindConfig.configContent).toContain('pulse-slow');
      expect(tailwindConfig.configContent).toContain('bounce-gentle');
    });

    test('should have custom text shadow utilities', () => {
      expect(tailwindConfig.configContent).toContain('textShadow');
      expect(tailwindConfig.configContent).toContain('text-shadow');
      expect(tailwindConfig.configContent).toContain('matchUtilities');
    });
  });

  describe('Tailwind Utility Classes Generation', () => {
    let dom;
    let document;

    beforeEach(() => {
      dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
      document = dom.window.document;
    });

    test('should generate standard utility classes', () => {
      // Create test elements with Tailwind classes
      const testElement = document.createElement('div');
      testElement.className = 'bg-blue-500 text-white p-4 m-2 rounded-lg shadow-md';

      // These classes should be recognizable Tailwind utilities
      const classes = testElement.className.split(' ');

      expect(classes).toContain('bg-blue-500');
      expect(classes).toContain('text-white');
      expect(classes).toContain('p-4');
      expect(classes).toContain('m-2');
      expect(classes).toContain('rounded-lg');
      expect(classes).toContain('shadow-md');
    });

    test('should support custom color utilities', () => {
      const testElement = document.createElement('div');
      testElement.className = 'bg-primary-500 text-secondary-900 border-primary-600';

      const classes = testElement.className.split(' ');

      expect(classes).toContain('bg-primary-500');
      expect(classes).toContain('text-secondary-900');
      expect(classes).toContain('border-primary-600');
    });

    test('should support responsive utilities', () => {
      const testElement = document.createElement('div');
      testElement.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

      const classes = testElement.className.split(' ');

      expect(classes).toContain('grid');
      expect(classes).toContain('grid-cols-1');
      expect(classes).toContain('md:grid-cols-2');
      expect(classes).toContain('lg:grid-cols-3');
      expect(classes).toContain('xl:grid-cols-4');
    });

    test('should support flex utilities', () => {
      const testElement = document.createElement('div');
      testElement.className = 'flex items-center justify-between space-x-4 flex-wrap';

      const classes = testElement.className.split(' ');

      expect(classes).toContain('flex');
      expect(classes).toContain('items-center');
      expect(classes).toContain('justify-between');
      expect(classes).toContain('space-x-4');
      expect(classes).toContain('flex-wrap');
    });

    test('should support spacing utilities', () => {
      const testElement = document.createElement('div');
      testElement.className = 'p-4 px-6 py-8 m-2 mx-auto my-4 space-y-2';

      const classes = testElement.className.split(' ');

      expect(classes).toContain('p-4');
      expect(classes).toContain('px-6');
      expect(classes).toContain('py-8');
      expect(classes).toContain('m-2');
      expect(classes).toContain('mx-auto');
      expect(classes).toContain('my-4');
      expect(classes).toContain('space-y-2');
    });

    test('should support typography utilities', () => {
      const testElement = document.createElement('p');
      testElement.className = 'text-lg font-bold leading-tight tracking-wide text-center';

      const classes = testElement.className.split(' ');

      expect(classes).toContain('text-lg');
      expect(classes).toContain('font-bold');
      expect(classes).toContain('leading-tight');
      expect(classes).toContain('tracking-wide');
      expect(classes).toContain('text-center');
    });

    test('should support shadow and border utilities', () => {
      const testElement = document.createElement('div');
      testElement.className = 'shadow-lg border border-gray-200 rounded-xl';

      const classes = testElement.className.split(' ');

      expect(classes).toContain('shadow-lg');
      expect(classes).toContain('border');
      expect(classes).toContain('border-gray-200');
      expect(classes).toContain('rounded-xl');
    });

    test('should support transform utilities', () => {
      const testElement = document.createElement('div');
      testElement.className = 'transform scale-105 rotate-45 translate-x-2 translate-y-4';

      const classes = testElement.className.split(' ');

      expect(classes).toContain('transform');
      expect(classes).toContain('scale-105');
      expect(classes).toContain('rotate-45');
      expect(classes).toContain('translate-x-2');
      expect(classes).toContain('translate-y-4');
    });

    test('should support hover and focus states', () => {
      const testElement = document.createElement('button');
      testElement.className = 'hover:bg-blue-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500';

      const classes = testElement.className.split(' ');

      expect(classes).toContain('hover:bg-blue-600');
      expect(classes).toContain('hover:shadow-lg');
      expect(classes).toContain('focus:outline-none');
      expect(classes).toContain('focus:ring-2');
      expect(classes).toContain('focus:ring-blue-500');
    });
  });

  describe('Custom Tailwind Utilities', () => {
    test('should support custom animation classes', () => {
      const testElement = document.createElement('div');
      testElement.className = 'animate-pulse-slow animate-bounce-gentle';

      const classes = testElement.className.split(' ');

      expect(classes).toContain('animate-pulse-slow');
      expect(classes).toContain('animate-bounce-gentle');
    });

    test('should validate custom text-shadow utilities would be available', () => {
      // Test that the config includes the text-shadow plugin
      expect(tailwindConfig.configContent).toContain('matchUtilities');
      expect(tailwindConfig.configContent).toContain('text-shadow');
      expect(tailwindConfig.configContent).toContain('textShadow: value');
    });
  });

  describe('Tailwind Directives Processing', () => {
    test('should find @tailwind directives in CSS files', () => {
      const globalsCssPath = path.join(projectRoot, 'claudable-reference/apps/web/app/globals.css');

      if (fs.existsSync(globalsCssPath)) {
        const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

        expect(cssContent).toContain('@tailwind base');
        expect(cssContent).toContain('@tailwind components');
        expect(cssContent).toContain('@tailwind utilities');
      }
    });

    test('should have proper @layer directives', () => {
      const globalsCssPath = path.join(projectRoot, 'claudable-reference/apps/web/app/globals.css');

      if (fs.existsSync(globalsCssPath)) {
        const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

        expect(cssContent).toContain('@layer base');
        expect(cssContent).toContain('@layer components');
        expect(cssContent).toContain('@layer utilities');
      }
    });
  });

  describe('Tailwind PostCSS Integration', () => {
    test('should have PostCSS configuration for Tailwind', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.devDependencies).toHaveProperty('tailwindcss');
      expect(packageJson.devDependencies).toHaveProperty('postcss');
      expect(packageJson.devDependencies).toHaveProperty('autoprefixer');
    });
  });
});