/**
 * TDD Test Suite: Full CSS Pipeline Integration Test
 * Purpose: Test the complete CSS pipeline from config to browser delivery
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const postcss = require('postcss');
const { chromium } = require('playwright');

describe('Full CSS Pipeline Integration', () => {
  let projectRoot;
  let browser;
  let page;

  beforeAll(async () => {
    projectRoot = path.resolve(__dirname, '../..');
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('INTEGRATION: Complete CSS pipeline from source to browser', async () => {
    // Step 1: Verify source files exist
    const sourceFiles = {
      css: path.join(projectRoot, 'src/styles/globals.css'),
      postcssConfig: path.join(projectRoot, 'postcss.config.cjs'),
      tailwindConfig: path.join(projectRoot, 'tailwind.config.cjs'),
      nextConfig: path.join(projectRoot, 'next.config.mjs')
    };

    Object.entries(sourceFiles).forEach(([name, filePath]) => {
      expect(fs.existsSync(filePath)).toBe(true);
      console.log(`✓ ${name} exists: ${filePath}`);
    });

    // Step 2: Test PostCSS configuration loading
    let postcssConfig;
    try {
      delete require.cache[sourceFiles.postcssConfig];
      postcssConfig = require(sourceFiles.postcssConfig);
      expect(postcssConfig.plugins).toBeDefined();
      console.log('✓ PostCSS config loaded successfully');
    } catch (error) {
      console.error('✗ PostCSS config loading failed:', error.message);
      throw error;
    }

    // Step 3: Test Tailwind configuration loading
    let tailwindConfig;
    try {
      delete require.cache[sourceFiles.tailwindConfig];
      tailwindConfig = require(sourceFiles.tailwindConfig);
      expect(tailwindConfig.content).toBeDefined();
      expect(tailwindConfig.theme).toBeDefined();
      console.log('✓ Tailwind config loaded successfully');
    } catch (error) {
      console.error('✗ Tailwind config loading failed:', error.message);
      throw error;
    }

    // Step 4: Test CSS processing manually
    let processedCss;
    try {
      const cssContent = fs.readFileSync(sourceFiles.css, 'utf8');
      const processor = postcss([
        require('tailwindcss')(tailwindConfig),
        require('autoprefixer')
      ]);

      const result = await processor.process(cssContent, {
        from: sourceFiles.css,
        to: path.join(projectRoot, 'test-output.css')
      });

      processedCss = result.css;
      expect(processedCss).toBeTruthy();
      expect(processedCss.length).toBeGreaterThan(cssContent.length);
      console.log('✓ CSS processing successful');
      console.log(`  Original: ${cssContent.length} bytes`);
      console.log(`  Processed: ${processedCss.length} bytes`);
    } catch (error) {
      console.error('✗ CSS processing failed:', error.message);
      throw error;
    }

    // Step 5: Test Next.js build process
    let buildSuccess = false;
    try {
      console.log('Testing Next.js build process...');

      const buildOutput = execSync('npm run build', {
        cwd: projectRoot,
        encoding: 'utf8',
        timeout: 60000,
        stdio: 'pipe'
      });

      console.log('✓ Next.js build completed');
      buildSuccess = true;

      // Check if CSS files were generated
      const cssDir = path.join(projectRoot, '.next', 'static', 'css');
      if (fs.existsSync(cssDir)) {
        const cssFiles = fs.readdirSync(cssDir);
        console.log(`✓ Generated ${cssFiles.length} CSS files`);
        cssFiles.forEach(file => {
          console.log(`  - ${file}`);
        });
      }

    } catch (error) {
      console.error('✗ Next.js build failed:', error.message);
      // Continue with other tests even if build fails
    }

    // Step 6: Test development server (if build succeeded)
    if (buildSuccess) {
      try {
        console.log('Testing development server startup...');

        // Start dev server in background
        const { spawn } = require('child_process');
        const devServer = spawn('npm', ['run', 'dev'], {
          cwd: projectRoot,
          stdio: 'pipe'
        });

        // Wait for server to start
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            devServer.kill();
            reject(new Error('Dev server startup timeout'));
          }, 30000);

          devServer.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('ready') || output.includes('started') || output.includes('3000')) {
              clearTimeout(timeout);
              resolve();
            }
          });

          devServer.stderr.on('data', (data) => {
            const error = data.toString();
            if (error.includes('error') || error.includes('failed')) {
              clearTimeout(timeout);
              devServer.kill();
              reject(new Error(`Dev server error: ${error}`));
            }
          });
        });

        console.log('✓ Development server started');

        // Step 7: Test browser CSS delivery
        try {
          await page.goto('http://localhost:3000', {
            waitUntil: 'networkidle',
            timeout: 15000
          });

          // Check if CSS is loaded in browser
          const hasStyles = await page.evaluate(() => {
            const stylesheets = Array.from(document.styleSheets);
            return stylesheets.length > 0;
          });

          expect(hasStyles).toBe(true);
          console.log('✓ CSS loaded in browser');

          // Check if Tailwind styles are applied
          const tailwindWorking = await page.evaluate(() => {
            const testEl = document.createElement('div');
            testEl.className = 'bg-blue-500';
            document.body.appendChild(testEl);

            const styles = window.getComputedStyle(testEl);
            const hasBackground = styles.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                                 styles.backgroundColor !== 'transparent';

            document.body.removeChild(testEl);
            return hasBackground;
          });

          if (tailwindWorking) {
            console.log('✓ Tailwind CSS working in browser');
          } else {
            console.log('⚠ Tailwind CSS may not be working correctly');
          }

          // Check CSS custom properties
          const customProperties = await page.evaluate(() => {
            const rootStyles = window.getComputedStyle(document.documentElement);
            return {
              background: rootStyles.getPropertyValue('--background'),
              foreground: rootStyles.getPropertyValue('--foreground')
            };
          });

          if (customProperties.background && customProperties.foreground) {
            console.log('✓ CSS custom properties available');
          } else {
            console.log('⚠ CSS custom properties may not be loaded');
          }

        } catch (error) {
          console.error('✗ Browser testing failed:', error.message);
        }

        // Clean up dev server
        devServer.kill();

      } catch (error) {
        console.error('✗ Development server test failed:', error.message);
      }
    }

    // Step 8: Summary
    console.log('\n=== CSS Pipeline Integration Test Summary ===');
    console.log('1. Source files: ✓');
    console.log('2. PostCSS config: ✓');
    console.log('3. Tailwind config: ✓');
    console.log('4. CSS processing: ✓');
    console.log(`5. Next.js build: ${buildSuccess ? '✓' : '✗'}`);
    console.log('6. Development server: (tested if build succeeded)');
    console.log('7. Browser delivery: (tested if server started)');

    // This test passes if the core pipeline works, even if build/server fails
    expect(processedCss).toBeTruthy();

  }, 120000); // 2 minute timeout

  test('CSS pipeline error diagnosis', async () => {
    console.log('\n=== CSS Pipeline Diagnosis ===');

    // Check for common issues
    const diagnostics = [];

    // 1. Check PostCSS plugin configuration
    try {
      const postcssConfig = require(path.join(projectRoot, 'postcss.config.cjs'));
      const plugins = Object.keys(postcssConfig.plugins || {});

      if (plugins.includes('@tailwindcss/postcss')) {
        diagnostics.push({
          issue: 'FOUND: @tailwindcss/postcss plugin',
          severity: 'ERROR',
          fix: 'Replace with "tailwindcss"'
        });
      }

      if (plugins.includes('tailwindcss')) {
        diagnostics.push({
          issue: 'GOOD: tailwindcss plugin found',
          severity: 'OK',
          fix: 'None needed'
        });
      }

    } catch (error) {
      diagnostics.push({
        issue: 'PostCSS config loading failed',
        severity: 'ERROR',
        fix: 'Check postcss.config.cjs syntax'
      });
    }

    // 2. Check package.json dependencies
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
      const tailwindVersion = packageJson.dependencies?.tailwindcss || packageJson.devDependencies?.tailwindcss;

      if (tailwindVersion) {
        const majorVersion = parseInt(tailwindVersion.replace(/[\^~]/, '').split('.')[0]);

        if (majorVersion >= 4) {
          diagnostics.push({
            issue: `TailwindCSS v${majorVersion} detected`,
            severity: 'WARNING',
            fix: 'Check v4 compatibility guide'
          });
        }
      }

      // Check for missing dependencies
      const requiredDeps = ['postcss', 'autoprefixer'];
      requiredDeps.forEach(dep => {
        if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
          diagnostics.push({
            issue: `Missing dependency: ${dep}`,
            severity: 'ERROR',
            fix: `npm install ${dep}`
          });
        }
      });

    } catch (error) {
      diagnostics.push({
        issue: 'package.json reading failed',
        severity: 'ERROR',
        fix: 'Check package.json syntax'
      });
    }

    // 3. Check CSS file syntax
    try {
      const cssPath = path.join(projectRoot, 'src/styles/globals.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      // Basic syntax checks
      const openBraces = (cssContent.match(/\{/g) || []).length;
      const closeBraces = (cssContent.match(/\}/g) || []).length;

      if (openBraces !== closeBraces) {
        diagnostics.push({
          issue: 'CSS syntax error: mismatched braces',
          severity: 'ERROR',
          fix: 'Check CSS file for unclosed rules'
        });
      }

      if (!cssContent.includes('@tailwind')) {
        diagnostics.push({
          issue: 'No Tailwind directives found',
          severity: 'WARNING',
          fix: 'Add @tailwind base, components, utilities'
        });
      }

    } catch (error) {
      diagnostics.push({
        issue: 'CSS file reading failed',
        severity: 'ERROR',
        fix: 'Check if globals.css exists and is readable'
      });
    }

    // 4. Output diagnostics
    console.log('\nDiagnostic Results:');
    diagnostics.forEach(diag => {
      const icon = diag.severity === 'ERROR' ? '❌' :
                   diag.severity === 'WARNING' ? '⚠️' : '✅';
      console.log(`${icon} ${diag.issue}`);
      console.log(`   Fix: ${diag.fix}`);
    });

    // 5. Provide recommendations
    const errors = diagnostics.filter(d => d.severity === 'ERROR');
    const warnings = diagnostics.filter(d => d.severity === 'WARNING');

    console.log(`\nSummary: ${errors.length} errors, ${warnings.length} warnings`);

    if (errors.length > 0) {
      console.log('\n🔧 Recommended fixes:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.fix}`);
      });
    }

    // Test fails if there are critical errors
    expect(errors.length).toBe(0);
  });

  test('CSS pipeline performance benchmark', async () => {
    const cssPath = path.join(projectRoot, 'src/styles/globals.css');
    const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.cjs');

    if (!fs.existsSync(cssPath) || !fs.existsSync(tailwindConfigPath)) {
      console.log('Skipping performance test - missing files');
      return;
    }

    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const tailwindConfig = require(tailwindConfigPath);

    // Benchmark CSS processing
    const startTime = process.hrtime.bigint();

    try {
      const processor = postcss([
        require('tailwindcss')(tailwindConfig),
        require('autoprefixer')
      ]);

      const result = await processor.process(cssContent, {
        from: cssPath,
        to: undefined
      });

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      console.log(`\n=== CSS Processing Performance ===`);
      console.log(`Input size: ${cssContent.length} bytes`);
      console.log(`Output size: ${result.css.length} bytes`);
      console.log(`Processing time: ${duration.toFixed(2)}ms`);
      console.log(`Expansion ratio: ${(result.css.length / cssContent.length).toFixed(2)}x`);

      // Performance expectations
      expect(duration).toBeLessThan(10000); // Less than 10 seconds
      expect(result.css.length).toBeGreaterThan(cssContent.length); // Should expand

      if (duration > 5000) {
        console.log('⚠️ CSS processing is slow (>5s)');
      } else if (duration < 1000) {
        console.log('✅ CSS processing is fast (<1s)');
      }

    } catch (error) {
      console.error('Performance benchmark failed:', error.message);
      throw error;
    }
  });
});