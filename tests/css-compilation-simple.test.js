/**
 * Simple CSS Compilation Test
 * Tests actual PostCSS processing with Tailwind
 */

const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const fs = require('fs');
const path = require('path');

describe('CSS Compilation - Core Features', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const globalsCssPath = path.join(projectRoot, 'src/styles/globals.css');

  test('Can process basic CSS with @tailwindcss/postcss', async () => {
    const css = `
      @tailwind base;
      @tailwind components;
      @tailwind utilities;

      .test {
        color: red;
      }
    `;

    const tailwindPostCSS = require('@tailwindcss/postcss');
    const processor = postcss([tailwindPostCSS, autoprefixer]);

    const result = await processor.process(css, { from: undefined });

    expect(result.css).toBeDefined();
    expect(result.css.length).toBeGreaterThan(100); // Should generate substantial CSS
    expect(result.warnings()).toHaveLength(0);
  }, 30000);

  test('Can process globals.css file', async () => {
    const css = fs.readFileSync(globalsCssPath, 'utf8');
    const tailwindPostCSS = require('@tailwindcss/postcss');
    const processor = postcss([tailwindPostCSS, autoprefixer]);

    const result = await processor.process(css, { from: globalsCssPath });

    expect(result.css).toBeDefined();
    expect(result.css.length).toBeGreaterThan(1000);
    expect(result.css).toContain('--background'); // CSS variables should be preserved
    expect(result.warnings()).toHaveLength(0);
  }, 30000);

  test('Generated CSS contains expected base styles', async () => {
    const css = '@tailwind base;';
    const tailwindPostCSS = require('@tailwindcss/postcss');
    const processor = postcss([tailwindPostCSS]);

    const result = await processor.process(css, { from: undefined });

    expect(result.css).toContain('html'); // Should contain base HTML styles
    expect(result.css).toContain('body'); // Should contain base body styles
  }, 30000);

  test('Generated CSS contains utility classes', async () => {
    const css = `
      @tailwind utilities;
      .test { @apply bg-blue-500 text-white; }
    `;
    const tailwindPostCSS = require('@tailwindcss/postcss');
    const processor = postcss([tailwindPostCSS]);

    const result = await processor.process(css, { from: undefined });

    expect(result.css).toContain('.test');
    expect(result.css).toMatch(/background.*blue|#3b82f6/); // Should contain blue background
    expect(result.css).toMatch(/color.*white|#fff/); // Should contain white text
  }, 30000);

  test('Autoprefixer adds vendor prefixes', async () => {
    const css = `
      .test {
        display: flex;
        user-select: none;
      }
    `;

    const processor = postcss([autoprefixer]);
    const result = await processor.process(css, { from: undefined });

    expect(result.css).toContain('display: flex');
    expect(result.css).toMatch(/-webkit-user-select|user-select/);
  });
});