/**
 * Quick CSS Compilation Validation
 * Simpler, faster tests to verify basic CSS setup
 */

const fs = require('fs');
const path = require('path');

describe('Quick CSS Validation', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const postcssConfigPath = path.join(projectRoot, 'postcss.config.cjs');
  const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.cjs');
  const globalsCssPath = path.join(projectRoot, 'src/styles/globals.css');

  test('PostCSS config loads correctly', () => {
    expect(fs.existsSync(postcssConfigPath)).toBe(true);
    const config = require(postcssConfigPath);
    expect(config).toHaveProperty('plugins');
    expect(config.plugins).toHaveProperty('@tailwindcss/postcss');
  });

  test('Tailwind config loads correctly', () => {
    expect(fs.existsSync(tailwindConfigPath)).toBe(true);
    const config = require(tailwindConfigPath);
    expect(config).toHaveProperty('content');
    expect(config).toHaveProperty('theme');
  });

  test('Globals CSS file exists and has Tailwind directives', () => {
    expect(fs.existsSync(globalsCssPath)).toBe(true);
    const css = fs.readFileSync(globalsCssPath, 'utf8');
    expect(css).toContain('@tailwind base');
    expect(css).toContain('@tailwind components');
    expect(css).toContain('@tailwind utilities');
  });

  test('Globals CSS has custom CSS variables', () => {
    const css = fs.readFileSync(globalsCssPath, 'utf8');
    expect(css).toContain('--background');
    expect(css).toContain('--foreground');
    expect(css).toContain('--primary');
    expect(css).toContain(':root');
  });

  test('Can load required packages', () => {
    expect(() => require('postcss')).not.toThrow();
    expect(() => require('@tailwindcss/postcss')).not.toThrow();
    expect(() => require('autoprefixer')).not.toThrow();
  });

  test('Tailwind config has custom theme extensions', () => {
    const config = require(tailwindConfigPath);
    expect(config.theme.extend).toBeDefined();
    expect(config.theme.extend.colors).toBeDefined();
    expect(config.theme.extend.colors.primary).toBeDefined();
    expect(config.theme.extend.animation).toBeDefined();
  });
});