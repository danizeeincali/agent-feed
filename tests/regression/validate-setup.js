#!/usr/bin/env node

/**
 * Regression Test Suite Setup Validator
 *
 * Validates that all regression test components are properly configured
 */

const fs = require('fs');
const path = require('path');

const REGRESSION_DIR = '/workspaces/agent-feed/tests/regression';
const PROJECT_ROOT = '/workspaces/agent-feed';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const checkFile = (filePath, description) => {
  try {
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      log(`✅ ${description}`, colors.green);
      return true;
    } else {
      log(`❌ ${description} (not a file)`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ ${description} (missing)`, colors.red);
    return false;
  }
};

const checkDirectory = (dirPath, description) => {
  try {
    const stats = fs.statSync(dirPath);
    if (stats.isDirectory()) {
      log(`✅ ${description}`, colors.green);
      return true;
    } else {
      log(`❌ ${description} (not a directory)`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ ${description} (missing)`, colors.red);
    return false;
  }
};

const validateTestFiles = () => {
  log('\n📋 Validating Test Files:', colors.bright + colors.blue);

  const testFiles = [
    ['css-variable-loading.test.js', 'CSS Variable Loading Tests'],
    ['tailwind-class-application.test.js', 'Tailwind Class Application Tests'],
    ['component-rendering.test.js', 'Component Rendering Tests'],
    ['react-hook-integration.test.js', 'React Hook Integration Tests'],
    ['multi-viewport-responsive.test.js', 'Multi-viewport Responsive Tests'],
    ['build-process-validation.test.js', 'Build Process Validation Tests'],
    ['server-integration.test.js', 'Server Integration Tests']
  ];

  let allValid = true;
  for (const [filename, description] of testFiles) {
    const filePath = path.join(REGRESSION_DIR, filename);
    if (!checkFile(filePath, description)) {
      allValid = false;
    }
  }

  return allValid;
};

const validateConfigFiles = () => {
  log('\n⚙️ Validating Configuration Files:', colors.bright + colors.blue);

  const configFiles = [
    ['jest.config.regression.js', 'Jest Configuration'],
    ['jest.setup.regression.js', 'Jest Setup File'],
    ['jest.env.js', 'Jest Environment Variables'],
    ['jest.sequencer.js', 'Jest Test Sequencer'],
    ['playwright.config.regression.js', 'Playwright Configuration'],
    ['playwright.global-setup.js', 'Playwright Global Setup'],
    ['playwright.global-teardown.js', 'Playwright Global Teardown']
  ];

  let allValid = true;
  for (const [filename, description] of configFiles) {
    const filePath = path.join(REGRESSION_DIR, filename);
    if (!checkFile(filePath, description)) {
      allValid = false;
    }
  }

  return allValid;
};

const validateRunnerFiles = () => {
  log('\n🚀 Validating Runner Files:', colors.bright + colors.blue);

  const runnerFiles = [
    ['run-regression-suite.js', 'Main Test Suite Runner'],
    ['validate-setup.js', 'Setup Validator (this file)'],
    ['README.md', 'Documentation']
  ];

  let allValid = true;
  for (const [filename, description] of runnerFiles) {
    const filePath = path.join(REGRESSION_DIR, filename);
    if (!checkFile(filePath, description)) {
      allValid = false;
    }
  }

  return allValid;
};

const validateDirectories = () => {
  log('\n📁 Validating Directory Structure:', colors.bright + colors.blue);

  // Create directories if they don't exist
  const dirs = [
    [path.join(REGRESSION_DIR, 'reports'), 'Reports Directory'],
    [path.join(REGRESSION_DIR, 'screenshots'), 'Screenshots Directory']
  ];

  let allValid = true;
  for (const [dirPath, description] of dirs) {
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        log(`✅ ${description} (created)`, colors.green);
      } catch (error) {
        log(`❌ ${description} (failed to create)`, colors.red);
        allValid = false;
      }
    } else {
      checkDirectory(dirPath, description);
    }
  }

  return allValid;
};

const validatePackageJson = () => {
  log('\n📦 Validating Package.json Scripts:', colors.bright + colors.blue);

  try {
    const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const requiredScripts = [
      ['test:regression', 'Main Regression Test Script'],
      ['test:regression:jest', 'Jest Regression Tests'],
      ['test:regression:playwright', 'Playwright Regression Tests']
    ];

    let allValid = true;
    for (const [scriptName, description] of requiredScripts) {
      if (packageJson.scripts && packageJson.scripts[scriptName]) {
        log(`✅ ${description}`, colors.green);
      } else {
        log(`❌ ${description} (missing script)`, colors.red);
        allValid = false;
      }
    }

    return allValid;
  } catch (error) {
    log(`❌ Failed to validate package.json: ${error.message}`, colors.red);
    return false;
  }
};

const validateDependencies = () => {
  log('\n📚 Validating Dependencies:', colors.bright + colors.blue);

  try {
    const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const requiredDeps = {
      dependencies: [
        ['react', '18.2.0', 'React'],
        ['react-dom', '18.2.0', 'React DOM'],
        ['next', '14.0.0', 'Next.js']
      ],
      devDependencies: [
        ['@playwright/test', 'Playwright Testing Framework'],
        ['jest', 'Jest Testing Framework'],
        ['jest-environment-jsdom', 'Jest JSDOM Environment'],
        ['tailwindcss', 'Tailwind CSS'],
        ['postcss', 'PostCSS'],
        ['autoprefixer', 'Autoprefixer']
      ]
    };

    let allValid = true;

    // Check dependencies
    for (const [dep, version, description] of requiredDeps.dependencies) {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        if (version && packageJson.dependencies[dep] === version) {
          log(`✅ ${description} (${version})`, colors.green);
        } else if (version) {
          log(`⚠️ ${description} (${packageJson.dependencies[dep]}, expected ${version})`, colors.yellow);
        } else {
          log(`✅ ${description}`, colors.green);
        }
      } else {
        log(`❌ ${description} (missing)`, colors.red);
        allValid = false;
      }
    }

    // Check dev dependencies
    for (const [dep, description] of requiredDeps.devDependencies) {
      if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        log(`✅ ${description}`, colors.green);
      } else {
        log(`❌ ${description} (missing)`, colors.red);
        allValid = false;
      }
    }

    return allValid;
  } catch (error) {
    log(`❌ Failed to validate dependencies: ${error.message}`, colors.red);
    return false;
  }
};

const validateProjectFiles = () => {
  log('\n🏗️ Validating Project Files:', colors.bright + colors.blue);

  const projectFiles = [
    [path.join(PROJECT_ROOT, 'tailwind.config.ts'), 'Tailwind Configuration'],
    [path.join(PROJECT_ROOT, 'frontend/postcss.config.cjs'), 'PostCSS Configuration'],
    [path.join(PROJECT_ROOT, 'styles/globals.css'), 'Global CSS File'],
    [path.join(PROJECT_ROOT, 'package.json'), 'Package.json'],
    [path.join(PROJECT_ROOT, 'tsconfig.json'), 'TypeScript Configuration']
  ];

  let allValid = true;
  for (const [filePath, description] of projectFiles) {
    if (!checkFile(filePath, description)) {
      allValid = false;
    }
  }

  return allValid;
};

const generateReport = (results) => {
  log('\n📊 Validation Summary:', colors.bright + colors.cyan);

  const allPassed = Object.values(results).every(result => result);

  if (allPassed) {
    log('🎉 ALL VALIDATIONS PASSED!', colors.bright + colors.green);
    log('The regression test suite is properly configured and ready to use.', colors.green);
  } else {
    log('❌ SOME VALIDATIONS FAILED', colors.bright + colors.red);
    log('Please fix the issues above before running the regression tests.', colors.red);
  }

  log('\nValidation Results:', colors.bright);
  Object.entries(results).forEach(([category, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? colors.green : colors.red;
    log(`  ${status} ${category}`, color);
  });

  log('\nNext Steps:', colors.bright + colors.blue);
  if (allPassed) {
    log('1. Run the regression test suite:', colors.cyan);
    log('   npm run test:regression', colors.cyan);
    log('2. Or run individual test types:', colors.cyan);
    log('   npm run test:regression:jest', colors.cyan);
    log('   npm run test:regression:playwright', colors.cyan);
  } else {
    log('1. Fix the validation failures above', colors.yellow);
    log('2. Re-run this validator: node tests/regression/validate-setup.js', colors.yellow);
    log('3. Once all validations pass, run the regression tests', colors.yellow);
  }

  return allPassed;
};

const main = () => {
  log('🔍 CSS Architecture Regression Test Suite Validator', colors.bright + colors.magenta);
  log(`Validating setup in: ${REGRESSION_DIR}`, colors.cyan);

  const results = {
    'Test Files': validateTestFiles(),
    'Configuration Files': validateConfigFiles(),
    'Runner Files': validateRunnerFiles(),
    'Directory Structure': validateDirectories(),
    'Package.json Scripts': validatePackageJson(),
    'Dependencies': validateDependencies(),
    'Project Files': validateProjectFiles()
  };

  const success = generateReport(results);
  process.exit(success ? 0 : 1);
};

if (require.main === module) {
  main();
}

module.exports = { main };