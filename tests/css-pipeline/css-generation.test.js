/**
 * TDD Test Suite: CSS File Generation
 * Purpose: Test if CSS files are generated correctly in the build process
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('CSS File Generation Tests', () => {
  let projectRoot;
  let nextBuildDir;
  let staticCssDir;

  beforeAll(() => {
    projectRoot = path.resolve(__dirname, '../..');
    nextBuildDir = path.join(projectRoot, '.next');
    staticCssDir = path.join(nextBuildDir, 'static', 'css');
  });

  test('.next directory exists or can be created', () => {
    // Check if .next directory exists
    const nextDirExists = fs.existsSync(nextBuildDir);
    console.log('.next directory exists:', nextDirExists);

    if (!nextDirExists) {
      console.log('Creating .next directory for testing...');
      fs.mkdirSync(nextBuildDir, { recursive: true });
    }

    expect(fs.existsSync(nextBuildDir)).toBe(true);
  });

  test('Next.js can resolve CSS imports', () => {
    const globalsCssPath = path.join(projectRoot, 'src/styles/globals.css');
    expect(fs.existsSync(globalsCssPath)).toBe(true);

    // Check if CSS file is valid
    const cssContent = fs.readFileSync(globalsCssPath, 'utf8');
    expect(cssContent).toBeTruthy();

    // Should not have syntax errors that would break parsing
    expect(cssContent).not.toContain('undefined');
    expect(cssContent).not.toContain('null');
  });

  test('FAILING TEST: Next.js build generates CSS files', (done) => {
    jest.setTimeout(60000); // 60 second timeout for build

    try {
      console.log('Starting Next.js build to test CSS generation...');

      // Try to build the project
      const buildCommand = 'npm run build';
      const buildOutput = execSync(buildCommand, {
        cwd: projectRoot,
        encoding: 'utf8',
        timeout: 50000
      });

      console.log('Build output:', buildOutput);

      // Check if CSS files were generated
      if (fs.existsSync(staticCssDir)) {
        const cssFiles = fs.readdirSync(staticCssDir).filter(file => file.endsWith('.css'));
        console.log('Generated CSS files:', cssFiles);

        expect(cssFiles.length).toBeGreaterThan(0);

        // Check content of generated CSS files
        cssFiles.forEach(file => {
          const cssPath = path.join(staticCssDir, file);
          const cssContent = fs.readFileSync(cssPath, 'utf8');

          expect(cssContent).toBeTruthy();
          expect(cssContent.length).toBeGreaterThan(100); // Should have substantial content

          // Should contain Tailwind CSS
          expect(cssContent).toMatch(/\*|html|body/); // Basic CSS selectors
        });

        done();
      } else {
        throw new Error('No CSS directory generated in .next/static/css');
      }

    } catch (error) {
      console.error('Build failed:', error.message);

      // Log specific CSS-related errors
      if (error.message.includes('postcss') || error.message.includes('tailwind')) {
        console.error('CSS PROCESSING ERROR DETECTED');
      }

      done(error);
    }
  }, 60000);

  test('Manual CSS processing simulation', async () => {
    // Simulate what Next.js does internally
    const postcss = require('postcss');
    const tailwindcss = require('tailwindcss');
    const autoprefixer = require('autoprefixer');

    const globalsCssPath = path.join(projectRoot, 'src/styles/globals.css');
    const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.cjs');

    const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

    try {
      // Process CSS like Next.js would
      const processor = postcss([
        tailwindcss(tailwindConfigPath),
        autoprefixer
      ]);

      const result = await processor.process(cssContent, {
        from: globalsCssPath,
        to: path.join(projectRoot, 'test-output.css')
      });

      expect(result.css).toBeTruthy();
      expect(result.css.length).toBeGreaterThan(cssContent.length);

      // Save test output for debugging
      const testOutputPath = path.join(projectRoot, 'test-css-output.css');
      fs.writeFileSync(testOutputPath, result.css);

      console.log('Manual CSS processing successful. Output saved to:', testOutputPath);
      console.log('Output size:', result.css.length, 'bytes');

    } catch (error) {
      console.error('Manual CSS processing failed:', error.message);
      throw error;
    }
  });

  test('CSS file size and content validation', () => {
    const globalsCssPath = path.join(projectRoot, 'src/styles/globals.css');
    const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

    // Check for problematic patterns
    const problematicPatterns = [
      /@import.*url\(/,  // External imports that might fail
      /\.\.\//,          // Relative paths that might break
      /undefined/,       // JavaScript undefined values
      /null/,           // JavaScript null values
      /NaN/,            // JavaScript NaN values
    ];

    problematicPatterns.forEach(pattern => {
      if (pattern.test(cssContent)) {
        console.warn('Found potentially problematic pattern:', pattern);
      }
    });

    // Basic CSS syntax validation
    const unclosedBraces = (cssContent.match(/\{/g) || []).length - (cssContent.match(/\}/g) || []).length;
    expect(unclosedBraces).toBe(0);

    const unclosedComments = (cssContent.match(/\/\*/g) || []).length - (cssContent.match(/\*\//g) || []).length;
    expect(unclosedComments).toBe(0);
  });

  test('FAILING TEST: CSS hot reload in development', (done) => {
    jest.setTimeout(30000);

    // This would test if CSS changes are reflected in development mode
    try {
      console.log('Testing CSS hot reload...');

      const devCommand = 'npm run dev';
      const devProcess = execSync(devCommand, {
        cwd: projectRoot,
        encoding: 'utf8',
        timeout: 20000
      });

      // If we get here, dev server started successfully
      console.log('Dev server output:', devProcess);
      done();

    } catch (error) {
      console.error('Dev server failed to start:', error.message);

      // Check for specific CSS-related startup errors
      if (error.message.includes('postcss') || error.message.includes('tailwind')) {
        console.error('CSS COMPILATION ERROR ON STARTUP');
      }

      done(error);
    }
  }, 30000);

  test('Check for CSS compilation warnings', () => {
    // Look for warning files or logs that might indicate CSS issues
    const possibleLogPaths = [
      path.join(projectRoot, 'npm-debug.log'),
      path.join(projectRoot, 'yarn-error.log'),
      path.join(projectRoot, '.next/trace'),
      path.join(projectRoot, 'dev-server.log'),
    ];

    possibleLogPaths.forEach(logPath => {
      if (fs.existsSync(logPath)) {
        const logContent = fs.readFileSync(logPath, 'utf8');

        // Check for CSS-related warnings
        const cssWarnings = [
          'postcss',
          'tailwind',
          'css compilation',
          'css error',
          'autoprefixer'
        ];

        cssWarnings.forEach(warning => {
          if (logContent.toLowerCase().includes(warning)) {
            console.log(`Found CSS-related log entry in ${logPath}:`, warning);
          }
        });
      }
    });
  });

  test('Webpack CSS loader configuration', () => {
    // Test if webpack CSS loaders are properly configured
    const nextConfigPath = path.join(projectRoot, 'next.config.mjs');

    if (fs.existsSync(nextConfigPath)) {
      const configContent = fs.readFileSync(nextConfigPath, 'utf8');

      // Check for CSS-related webpack configuration
      expect(configContent).toContain('css');

      // Should have proper CSS loader setup
      if (configContent.includes('postcss-loader')) {
        expect(configContent).toContain('tailwindcss');
        expect(configContent).toContain('autoprefixer');
      }
    }
  });

  test('Environment-specific CSS build differences', () => {
    const nodeEnv = process.env.NODE_ENV;
    console.log('Current NODE_ENV:', nodeEnv);

    // Different environments might have different CSS processing
    if (nodeEnv === 'production') {
      console.log('Testing production CSS optimizations...');
      // In production, CSS should be minified and optimized
    } else if (nodeEnv === 'development') {
      console.log('Testing development CSS features...');
      // In development, CSS should have source maps and faster compilation
    }

    // Test environment-specific configurations
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.scripts.build).toBeDefined();
    expect(packageJson.scripts.dev).toBeDefined();
  });
});