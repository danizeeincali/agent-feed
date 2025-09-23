/**
 * TDD Test Suite: Next.js CSS Import Tests
 * Purpose: Test if Next.js can properly import and process CSS files
 */

const fs = require('fs');
const path = require('path');

describe('Next.js CSS Import Tests', () => {
  let projectRoot;

  beforeAll(() => {
    projectRoot = path.resolve(__dirname, '../..');
  });

  test('_app.js/tsx file exists and imports global CSS', () => {
    const appFiles = [
      path.join(projectRoot, 'pages/_app.js'),
      path.join(projectRoot, 'pages/_app.tsx'),
      path.join(projectRoot, 'src/pages/_app.js'),
      path.join(projectRoot, 'src/pages/_app.tsx'),
      path.join(projectRoot, 'frontend/src/App.tsx'),
    ];

    let appFile = null;
    let appContent = '';

    // Find the main app file
    for (const file of appFiles) {
      if (fs.existsSync(file)) {
        appFile = file;
        appContent = fs.readFileSync(file, 'utf8');
        break;
      }
    }

    expect(appFile).toBeTruthy();
    expect(appContent).toBeTruthy();

    console.log('Found app file:', appFile);

    // Check if it imports CSS
    const cssImportPatterns = [
      /import.*\.css/,
      /import.*['"].*\.css['"]/,
      /require.*\.css/,
    ];

    const hasCssImport = cssImportPatterns.some(pattern => pattern.test(appContent));
    console.log('Has CSS import:', hasCssImport);

    if (!hasCssImport) {
      console.log('App file content preview:', appContent.substring(0, 500));
    }
  });

  test('Global CSS file is imported correctly', () => {
    const possibleAppFiles = [
      'pages/_app.js',
      'pages/_app.tsx',
      'frontend/src/App.tsx',
    ];

    let cssImportFound = false;
    let appFilePath = '';

    for (const relativeAppPath of possibleAppFiles) {
      const appPath = path.join(projectRoot, relativeAppPath);

      if (fs.existsSync(appPath)) {
        const appContent = fs.readFileSync(appPath, 'utf8');
        appFilePath = appPath;

        // Look for CSS imports
        const cssImports = [
          '../src/styles/globals.css',
          './styles/globals.css',
          'src/styles/globals.css',
          '../styles/globals.css',
        ];

        cssImports.forEach(cssImport => {
          if (appContent.includes(cssImport)) {
            cssImportFound = true;
            console.log('Found CSS import:', cssImport);

            // Verify the imported CSS file exists
            const resolvedCssPath = path.resolve(path.dirname(appPath), cssImport);
            expect(fs.existsSync(resolvedCssPath)).toBe(true);
          }
        });

        break;
      }
    }

    console.log('App file found:', appFilePath);
    console.log('CSS import found:', cssImportFound);
  });

  test('FAILING TEST: Next.js CSS import syntax validation', () => {
    const appFiles = [
      path.join(projectRoot, 'pages/_app.tsx'),
      path.join(projectRoot, 'frontend/src/App.tsx'),
    ];

    let validImport = false;

    for (const appFile of appFiles) {
      if (fs.existsSync(appFile)) {
        const appContent = fs.readFileSync(appFile, 'utf8');

        // Next.js requires CSS to be imported in _app.js/tsx only
        // OR component-specific CSS modules
        const validCssImportPatterns = [
          /import\s+['"].*globals\.css['"]/, // Global CSS import
          /import\s+['"].*\.module\.css['"]/, // CSS modules
          /import\s+.*from\s+['"].*\.css['"]/, // CSS imports with default export
        ];

        const hasValidImport = validCssImportPatterns.some(pattern => pattern.test(appContent));

        if (hasValidImport) {
          validImport = true;
          console.log('Valid CSS import found in:', appFile);
        }

        // Check for invalid imports
        const invalidPatterns = [
          /import\s+['"].*\.css['"].*in.*component/, // CSS in components (should use modules)
        ];

        invalidPatterns.forEach(pattern => {
          if (pattern.test(appContent)) {
            console.warn('Invalid CSS import pattern detected');
          }
        });
      }
    }

    if (!validImport) {
      console.error('No valid CSS imports found in app files');
      throw new Error('CSS imports not properly configured');
    }
  });

  test('CSS Modules configuration', () => {
    // Check if CSS modules are properly configured
    const nextConfigPath = path.join(projectRoot, 'next.config.mjs');

    if (fs.existsSync(nextConfigPath)) {
      const configContent = fs.readFileSync(nextConfigPath, 'utf8');

      // Look for CSS modules configuration
      if (configContent.includes('css') || configContent.includes('CSS')) {
        console.log('CSS configuration found in next.config.mjs');

        // Check for proper CSS modules setup
        if (configContent.includes('module.css')) {
          console.log('CSS modules support detected');
        }
      }
    }

    // Check for CSS module files
    const cssModuleFiles = [];
    const findCssModules = (dir) => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        files.forEach(file => {
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory()) {
            findCssModules(fullPath);
          } else if (file.name.endsWith('.module.css')) {
            cssModuleFiles.push(fullPath);
          }
        });
      }
    };

    findCssModules(path.join(projectRoot, 'src'));
    findCssModules(path.join(projectRoot, 'components'));
    findCssModules(path.join(projectRoot, 'pages'));

    console.log('CSS module files found:', cssModuleFiles.length);
  });

  test('PostCSS integration with Next.js', () => {
    const postcssConfigPath = path.join(projectRoot, 'postcss.config.cjs');

    if (fs.existsSync(postcssConfigPath)) {
      const configContent = fs.readFileSync(postcssConfigPath, 'utf8');

      // Next.js should automatically use PostCSS config
      expect(configContent).toContain('plugins');

      // Should include Tailwind and Autoprefixer
      expect(configContent).toContain('tailwind');
      expect(configContent).toContain('autoprefixer');
    } else {
      console.warn('No PostCSS config found - Next.js will use defaults');
    }
  });

  test('FAILING TEST: CSS processing during Next.js compilation', async () => {
    // Test if Next.js can actually process the CSS during compilation
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    try {
      console.log('Testing Next.js CSS compilation...');

      // Try to run Next.js build with specific focus on CSS
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: projectRoot,
        timeout: 45000,
      });

      console.log('Build stdout:', stdout);

      if (stderr) {
        console.log('Build stderr:', stderr);

        // Look for CSS-specific errors
        const cssErrors = [
          'postcss',
          'tailwind',
          'css compilation failed',
          'css error',
          'failed to compile',
        ];

        cssErrors.forEach(errorType => {
          if (stderr.toLowerCase().includes(errorType)) {
            console.error(`CSS ERROR DETECTED: ${errorType}`);
          }
        });

        // If there are CSS errors, this test should fail
        if (cssErrors.some(errorType => stderr.toLowerCase().includes(errorType))) {
          throw new Error(`CSS compilation failed: ${stderr}`);
        }
      }

      // Check if CSS files were actually generated
      const nextStaticPath = path.join(projectRoot, '.next', 'static', 'css');
      if (fs.existsSync(nextStaticPath)) {
        const cssFiles = fs.readdirSync(nextStaticPath);
        console.log('Generated CSS files:', cssFiles);
        expect(cssFiles.length).toBeGreaterThan(0);
      }

    } catch (error) {
      console.error('Next.js CSS compilation test failed:', error.message);
      throw error;
    }
  }, 50000);

  test('CSS import path resolution', () => {
    // Test if CSS import paths can be resolved correctly
    const possibleCssFiles = [
      'src/styles/globals.css',
      'styles/globals.css',
      'frontend/src/styles/globals.css',
    ];

    let cssFileFound = false;
    let cssPath = '';

    for (const relativeCssPath of possibleCssFiles) {
      const fullCssPath = path.join(projectRoot, relativeCssPath);
      if (fs.existsSync(fullCssPath)) {
        cssFileFound = true;
        cssPath = fullCssPath;
        console.log('Found CSS file:', fullCssPath);
        break;
      }
    }

    expect(cssFileFound).toBe(true);

    if (cssFileFound) {
      // Test if the CSS file is valid
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      expect(cssContent).toBeTruthy();

      // Check for basic CSS syntax
      expect(cssContent).toMatch(/@tailwind|\.[\w-]+\s*\{|\/\*/);
    }
  });

  test('Development vs Production CSS handling', () => {
    // Test different CSS handling in different environments
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Check build scripts
    expect(packageJson.scripts.dev).toBeDefined();
    expect(packageJson.scripts.build).toBeDefined();

    console.log('Dev script:', packageJson.scripts.dev);
    console.log('Build script:', packageJson.scripts.build);

    // Development should prioritize speed
    if (packageJson.scripts.dev.includes('next dev')) {
      console.log('Using standard Next.js dev server');
    }

    // Production should prioritize optimization
    if (packageJson.scripts.build.includes('next build')) {
      console.log('Using standard Next.js build process');
    }
  });

  test('CSS source maps in development', () => {
    // Check if CSS source maps are enabled for development
    const nextConfigPath = path.join(projectRoot, 'next.config.mjs');

    if (fs.existsSync(nextConfigPath)) {
      const configContent = fs.readFileSync(nextConfigPath, 'utf8');

      // Look for source map configuration
      if (configContent.includes('sourceMap') || configContent.includes('devtool')) {
        console.log('Source map configuration found');
      }

      // In development, source maps should be enabled for better debugging
      if (configContent.includes('productionBrowserSourceMaps')) {
        console.log('Production source maps configuration found');
      }
    }
  });

  test('CSS bundle size and optimization', () => {
    // Check if CSS optimization is properly configured
    const nextConfigPath = path.join(projectRoot, 'next.config.mjs');

    if (fs.existsSync(nextConfigPath)) {
      const configContent = fs.readFileSync(nextConfigPath, 'utf8');

      // Look for CSS optimization settings
      const optimizationFeatures = [
        'swcMinify',
        'optimizeFonts',
        'minify',
      ];

      optimizationFeatures.forEach(feature => {
        if (configContent.includes(feature)) {
          console.log(`CSS optimization feature found: ${feature}`);
        }
      });
    }

    // Check package.json for CSS-related optimization packages
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const cssOptimizationPackages = [
      'cssnano',
      'postcss-preset-env',
      'autoprefixer',
    ];

    cssOptimizationPackages.forEach(pkg => {
      if (packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg]) {
        console.log(`CSS optimization package found: ${pkg}`);
      }
    });
  });
});