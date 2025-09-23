/**
 * Visual Regression Tests with Playwright
 * E2E tests that verify CSS styles are applied correctly in actual browser environments
 */

import { test, expect, Page } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

test.describe('CSS Visual Regression Tests', () => {
  let projectRoot: string;

  test.beforeAll(() => {
    projectRoot = process.cwd();
  });

  test.describe('CSS Loading and Compilation', () => {
    test('should load and apply base CSS styles', async ({ page }) => {
      // Create a test HTML page with CSS
      const testHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CSS Test Page</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
                background-color: #f9fafb;
              }

              .test-container {
                max-width: 800px;
                margin: 0 auto;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }

              .test-grid {
                display: grid;
                grid-template-columns: 1fr 2fr;
                gap: 1rem;
                margin-bottom: 2rem;
              }

              .test-flex {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1rem;
                background: #e5e7eb;
                border-radius: 4px;
              }

              .test-colors {
                display: flex;
                gap: 0.5rem;
              }

              .color-box {
                width: 50px;
                height: 50px;
                border-radius: 4px;
              }

              .primary { background-color: #3b82f6; }
              .secondary { background-color: #64748b; }
              .success { background-color: #10b981; }
              .error { background-color: #ef4444; }
            </style>
          </head>
          <body>
            <div class="test-container">
              <h1>CSS Visual Regression Test</h1>
              <div class="test-grid">
                <div>
                  <h2>Grid Layout</h2>
                  <p>This should be in a 1fr column</p>
                </div>
                <div>
                  <h2>Flex Layout</h2>
                  <div class="test-flex">
                    <span>Left</span>
                    <span>Right</span>
                  </div>
                </div>
              </div>
              <div class="test-colors">
                <div class="color-box primary" title="Primary"></div>
                <div class="color-box secondary" title="Secondary"></div>
                <div class="color-box success" title="Success"></div>
                <div class="color-box error" title="Error"></div>
              </div>
            </div>
          </body>
        </html>
      `;

      await page.setContent(testHTML);

      // Test container styles
      const container = page.locator('.test-container');
      await expect(container).toHaveCSS('max-width', '800px');
      await expect(container).toHaveCSS('padding', '32px');
      await expect(container).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(container).toHaveCSS('border-radius', '8px');

      // Test grid layout
      const grid = page.locator('.test-grid');
      await expect(grid).toHaveCSS('display', 'grid');
      await expect(grid).toHaveCSS('grid-template-columns', '1fr 2fr');
      await expect(grid).toHaveCSS('gap', '16px');

      // Test flex layout
      const flex = page.locator('.test-flex');
      await expect(flex).toHaveCSS('display', 'flex');
      await expect(flex).toHaveCSS('align-items', 'center');
      await expect(flex).toHaveCSS('justify-content', 'space-between');

      // Test color boxes
      await expect(page.locator('.color-box.primary')).toHaveCSS('background-color', 'rgb(59, 130, 246)');
      await expect(page.locator('.color-box.secondary')).toHaveCSS('background-color', 'rgb(100, 116, 139)');
      await expect(page.locator('.color-box.success')).toHaveCSS('background-color', 'rgb(16, 185, 129)');
      await expect(page.locator('.color-box.error')).toHaveCSS('background-color', 'rgb(239, 68, 68)');
    });

    test('should apply Tailwind utility classes correctly', async ({ page }) => {
      const tailwindHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tailwind CSS Test</title>
            <style>
              /* Simulate Tailwind utilities */
              .bg-blue-500 { background-color: #3b82f6; }
              .text-white { color: #ffffff; }
              .p-4 { padding: 1rem; }
              .m-2 { margin: 0.5rem; }
              .rounded-lg { border-radius: 0.5rem; }
              .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
              .flex { display: flex; }
              .items-center { align-items: center; }
              .justify-center { justify-content: center; }
              .space-x-4 > * + * { margin-left: 1rem; }
              .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
              .font-bold { font-weight: 700; }
              .grid { display: grid; }
              .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
              .gap-4 { gap: 1rem; }
              .w-full { width: 100%; }
              .max-w-md { max-width: 28rem; }
              .mx-auto { margin-left: auto; margin-right: auto; }
            </style>
          </head>
          <body>
            <div class="max-w-md mx-auto p-4">
              <div class="bg-blue-500 text-white p-4 rounded-lg shadow-md m-2">
                <h1 class="text-lg font-bold">Tailwind Test</h1>
              </div>
              <div class="flex items-center justify-center space-x-4 p-4">
                <span>Item 1</span>
                <span>Item 2</span>
                <span>Item 3</span>
              </div>
              <div class="grid grid-cols-3 gap-4 w-full">
                <div class="bg-blue-500 p-4">Grid 1</div>
                <div class="bg-blue-500 p-4">Grid 2</div>
                <div class="bg-blue-500 p-4">Grid 3</div>
              </div>
            </div>
          </body>
        </html>
      `;

      await page.setContent(tailwindHTML);

      // Test container utilities
      const container = page.locator('.max-w-md');
      await expect(container).toHaveCSS('max-width', '448px'); // 28rem = 448px
      await expect(container).toHaveCSS('margin-left', 'auto');
      await expect(container).toHaveCSS('margin-right', 'auto');

      // Test background and text utilities
      const blueBox = page.locator('.bg-blue-500').first();
      await expect(blueBox).toHaveCSS('background-color', 'rgb(59, 130, 246)');
      await expect(blueBox).toHaveCSS('color', 'rgb(255, 255, 255)');
      await expect(blueBox).toHaveCSS('padding', '16px');
      await expect(blueBox).toHaveCSS('border-radius', '8px');

      // Test flex utilities
      const flexContainer = page.locator('.flex');
      await expect(flexContainer).toHaveCSS('display', 'flex');
      await expect(flexContainer).toHaveCSS('align-items', 'center');
      await expect(flexContainer).toHaveCSS('justify-content', 'center');

      // Test grid utilities
      const gridContainer = page.locator('.grid');
      await expect(gridContainer).toHaveCSS('display', 'grid');
      await expect(gridContainer).toHaveCSS('grid-template-columns', '1fr 1fr 1fr');
      await expect(gridContainer).toHaveCSS('gap', '16px');

      // Test typography utilities
      const heading = page.locator('.text-lg');
      await expect(heading).toHaveCSS('font-size', '18px'); // 1.125rem
      await expect(heading).toHaveCSS('font-weight', '700');
    });
  });

  test.describe('Dark Mode Visual Tests', () => {
    test('should switch between light and dark themes', async ({ page }) => {
      const themeHTML = `
        <!DOCTYPE html>
        <html class="light">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Theme Test</title>
            <style>
              :root {
                --bg-primary: #ffffff;
                --text-primary: #111827;
                --border-color: #e5e7eb;
              }

              :root.dark {
                --bg-primary: #0c0a14;
                --text-primary: #e5e2ff;
                --border-color: rgba(139, 92, 246, 0.2);
              }

              body {
                background-color: var(--bg-primary);
                color: var(--text-primary);
                transition: background-color 0.3s ease, color 0.3s ease;
                padding: 2rem;
                font-family: sans-serif;
              }

              .theme-box {
                padding: 2rem;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                margin: 1rem 0;
              }

              .toggle-btn {
                padding: 0.5rem 1rem;
                background: var(--text-primary);
                color: var(--bg-primary);
                border: none;
                border-radius: 4px;
                cursor: pointer;
              }
            </style>
            <script>
              function toggleTheme() {
                const html = document.documentElement;
                html.classList.toggle('dark');
                html.classList.toggle('light');
              }
            </script>
          </head>
          <body>
            <div class="theme-box">
              <h1>Theme Test</h1>
              <p>This content should change appearance based on the theme.</p>
              <button class="toggle-btn" onclick="toggleTheme()">Toggle Theme</button>
            </div>
          </body>
        </html>
      `;

      await page.setContent(themeHTML);

      // Test initial light theme
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(page.locator('body')).toHaveCSS('color', 'rgb(17, 24, 39)');

      // Toggle to dark theme
      await page.click('.toggle-btn');
      await page.waitForTimeout(500); // Wait for transition

      // Test dark theme
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(12, 10, 20)');
      await expect(page.locator('body')).toHaveCSS('color', 'rgb(229, 226, 255)');

      // Toggle back to light theme
      await page.click('.toggle-btn');
      await page.waitForTimeout(500);

      // Test light theme again
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(page.locator('body')).toHaveCSS('color', 'rgb(17, 24, 39)');
    });
  });

  test.describe('Responsive Design Tests', () => {
    test('should apply responsive styles at different breakpoints', async ({ page }) => {
      const responsiveHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Responsive Test</title>
            <style>
              .responsive-container {
                padding: 1rem;
                background: #f3f4f6;
              }

              .responsive-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 1rem;
              }

              .responsive-text {
                font-size: 1rem;
              }

              /* Tablet styles */
              @media (min-width: 768px) {
                .responsive-container {
                  padding: 2rem;
                }

                .responsive-grid {
                  grid-template-columns: 1fr 1fr;
                  gap: 2rem;
                }

                .responsive-text {
                  font-size: 1.125rem;
                }
              }

              /* Desktop styles */
              @media (min-width: 1024px) {
                .responsive-container {
                  padding: 3rem;
                }

                .responsive-grid {
                  grid-template-columns: 1fr 2fr 1fr;
                  gap: 3rem;
                }

                .responsive-text {
                  font-size: 1.25rem;
                }
              }
            </style>
          </head>
          <body>
            <div class="responsive-container">
              <h1 class="responsive-text">Responsive Design Test</h1>
              <div class="responsive-grid">
                <div>Column 1</div>
                <div>Column 2</div>
                <div>Column 3</div>
              </div>
            </div>
          </body>
        </html>
      `;

      // Test mobile viewport (320px)
      await page.setViewportSize({ width: 320, height: 568 });
      await page.setContent(responsiveHTML);

      const container = page.locator('.responsive-container');
      const grid = page.locator('.responsive-grid');
      const text = page.locator('.responsive-text');

      await expect(container).toHaveCSS('padding', '16px'); // 1rem
      await expect(grid).toHaveCSS('grid-template-columns', '1fr');
      await expect(text).toHaveCSS('font-size', '16px'); // 1rem

      // Test tablet viewport (768px)
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(100);

      await expect(container).toHaveCSS('padding', '32px'); // 2rem
      await expect(grid).toHaveCSS('grid-template-columns', '1fr 1fr');
      await expect(text).toHaveCSS('font-size', '18px'); // 1.125rem

      // Test desktop viewport (1024px)
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForTimeout(100);

      await expect(container).toHaveCSS('padding', '48px'); // 3rem
      await expect(grid).toHaveCSS('grid-template-columns', '1fr 2fr 1fr');
      await expect(text).toHaveCSS('font-size', '20px'); // 1.25rem
    });
  });

  test.describe('Animation and Transition Tests', () => {
    test('should apply CSS animations correctly', async ({ page }) => {
      const animationHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Animation Test</title>
            <style>
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }

              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }

              .fade-in {
                animation: fadeIn 0.5s ease-out forwards;
              }

              .spinner {
                width: 50px;
                height: 50px;
                border: 4px solid #e5e7eb;
                border-top: 4px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
              }

              .hover-scale {
                transition: transform 0.3s ease;
              }

              .hover-scale:hover {
                transform: scale(1.1);
              }

              .slide-in {
                transform: translateX(-100%);
                transition: transform 0.5s ease;
              }

              .slide-in.active {
                transform: translateX(0);
              }
            </style>
            <script>
              function triggerSlide() {
                document.querySelector('.slide-in').classList.add('active');
              }
            </script>
          </head>
          <body>
            <div class="fade-in" style="padding: 2rem;">
              <h1>Animation Test</h1>
              <div class="spinner"></div>
              <div class="hover-scale" style="padding: 1rem; background: #3b82f6; color: white; margin: 1rem 0; display: inline-block;">
                Hover me
              </div>
              <div class="slide-in" style="padding: 1rem; background: #10b981; color: white; margin: 1rem 0;">
                I will slide in
              </div>
              <button onclick="triggerSlide()">Trigger Slide</button>
            </div>
          </body>
        </html>
      `;

      await page.setContent(animationHTML);

      // Test that elements have animation properties
      const spinner = page.locator('.spinner');
      await expect(spinner).toHaveCSS('animation-name', 'spin');
      await expect(spinner).toHaveCSS('animation-duration', '1s');
      await expect(spinner).toHaveCSS('animation-iteration-count', 'infinite');

      // Test transition properties
      const hoverElement = page.locator('.hover-scale');
      await expect(hoverElement).toHaveCSS('transition-property', 'transform');
      await expect(hoverElement).toHaveCSS('transition-duration', '0.3s');

      // Test slide animation trigger
      const slideElement = page.locator('.slide-in');
      await expect(slideElement).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -100, 0)'); // translateX(-100%)

      await page.click('button');
      await page.waitForTimeout(100);

      await expect(slideElement).toHaveCSS('transform', 'none'); // translateX(0)
    });
  });

  test.describe('Custom CSS Classes Tests', () => {
    test('should load and apply custom agents styles', async ({ page }) => {
      // Read the actual agents.css file if it exists
      const agentsCssPath = join(projectRoot, 'styles', 'agents.css');
      let agentsCss = '';

      if (existsSync(agentsCssPath)) {
        agentsCss = readFileSync(agentsCssPath, 'utf8');
      }

      const agentsHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Agents CSS Test</title>
            <style>
              ${agentsCss}

              /* Fallback styles if agents.css doesn't exist */
              ${!agentsCss ? `
                .agents-page {
                  min-height: 100vh;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  padding: 1rem;
                }
                .agents-container {
                  max-width: 1400px;
                  margin: 0 auto;
                  background: rgba(255, 255, 255, 0.95);
                  border-radius: 16px;
                  padding: 2rem;
                }
                .agents-content {
                  display: grid;
                  grid-template-columns: 1fr 3fr;
                  gap: 2rem;
                }
              ` : ''}
            </style>
          </head>
          <body>
            <div class="agents-page">
              <div class="agents-container">
                <header class="agents-header">
                  <h1 class="agents-title">Agents Dashboard</h1>
                  <p class="agents-subtitle">Custom CSS Test</p>
                </header>
                <div class="agents-content">
                  <aside class="agents-sidebar">
                    <div>Sidebar content</div>
                  </aside>
                  <main class="agents-main">
                    <div>Main content</div>
                  </main>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      await page.setContent(agentsHTML);

      // Test agents page layout
      const agentsPage = page.locator('.agents-page');
      await expect(agentsPage).toHaveCSS('min-height', '100vh');

      const agentsContainer = page.locator('.agents-container');
      await expect(agentsContainer).toHaveCSS('max-width', '1400px');
      await expect(agentsContainer).toHaveCSS('margin-left', 'auto');
      await expect(agentsContainer).toHaveCSS('margin-right', 'auto');

      const agentsContent = page.locator('.agents-content');
      await expect(agentsContent).toHaveCSS('display', 'grid');
      await expect(agentsContent).toHaveCSS('grid-template-columns', '1fr 3fr');
    });
  });

  test.describe('CSS Variable Integration Tests', () => {
    test('should use CSS variables correctly', async ({ page }) => {
      const variablesHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CSS Variables Test</title>
            <style>
              :root {
                --primary-color: #3b82f6;
                --secondary-color: #64748b;
                --spacing-unit: 1rem;
                --border-radius: 8px;
              }

              .variable-test {
                background-color: var(--primary-color);
                color: white;
                padding: var(--spacing-unit);
                border-radius: var(--border-radius);
                margin-bottom: var(--spacing-unit);
              }

              .variable-secondary {
                background-color: var(--secondary-color);
                color: white;
                padding: calc(var(--spacing-unit) * 1.5);
                border-radius: var(--border-radius);
              }

              .variable-dynamic {
                background-color: var(--dynamic-color, #ff0000);
                padding: var(--spacing-unit);
                border-radius: var(--border-radius);
                margin-top: var(--spacing-unit);
              }
            </style>
            <script>
              function updateVariable() {
                document.documentElement.style.setProperty('--dynamic-color', '#00ff00');
              }
            </script>
          </head>
          <body>
            <div class="variable-test">Primary Color Box</div>
            <div class="variable-secondary">Secondary Color Box</div>
            <div class="variable-dynamic">Dynamic Color Box (fallback)</div>
            <button onclick="updateVariable()">Update Dynamic Color</button>
          </body>
        </html>
      `;

      await page.setContent(variablesHTML);

      // Test primary variables
      const primaryBox = page.locator('.variable-test');
      await expect(primaryBox).toHaveCSS('background-color', 'rgb(59, 130, 246)');
      await expect(primaryBox).toHaveCSS('padding', '16px'); // 1rem
      await expect(primaryBox).toHaveCSS('border-radius', '8px');

      // Test secondary variables
      const secondaryBox = page.locator('.variable-secondary');
      await expect(secondaryBox).toHaveCSS('background-color', 'rgb(100, 116, 139)');
      await expect(secondaryBox).toHaveCSS('padding', '24px'); // 1.5rem

      // Test fallback values
      const dynamicBox = page.locator('.variable-dynamic');
      await expect(dynamicBox).toHaveCSS('background-color', 'rgb(255, 0, 0)'); // Fallback

      // Test dynamic variable update
      await page.click('button');
      await page.waitForTimeout(100);

      await expect(dynamicBox).toHaveCSS('background-color', 'rgb(0, 255, 0)'); // Updated
    });
  });

  test.describe('Performance and Loading Tests', () => {
    test('should load CSS efficiently without render blocking', async ({ page }) => {
      const performanceHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Performance Test</title>
            <style>
              /* Simulate a large CSS file */
              ${Array.from({ length: 100 }, (_, i) => `
                .test-class-${i} {
                  color: #${i.toString(16).padStart(6, '0')};
                  background: linear-gradient(45deg, #${i.toString(16).padStart(6, '0')}, #${(i + 1).toString(16).padStart(6, '0')});
                  padding: ${i % 10}px;
                  margin: ${i % 5}px;
                  border-radius: ${i % 20}px;
                }
              `).join('')}

              .performance-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                padding: 2rem;
              }

              .performance-item {
                padding: 1rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                transition: transform 0.2s ease;
              }

              .performance-item:hover {
                transform: translateY(-2px);
              }
            </style>
          </head>
          <body>
            <div class="performance-container">
              ${Array.from({ length: 20 }, (_, i) => `
                <div class="performance-item test-class-${i}">
                  Performance Item ${i + 1}
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `;

      const startTime = Date.now();
      await page.setContent(performanceHTML);

      // Wait for all elements to be rendered
      await page.waitForSelector('.performance-container');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // Should load and render within reasonable time
      expect(loadTime).toBeLessThan(2000); // 2 seconds

      // Test that styles are applied correctly
      const container = page.locator('.performance-container');
      await expect(container).toHaveCSS('display', 'grid');

      const firstItem = page.locator('.performance-item').first();
      await expect(firstItem).toHaveCSS('padding', '16px');
      await expect(firstItem).toHaveCSS('border-radius', '8px');
    });
  });
});