#!/usr/bin/env node

/**
 * Page Verification Test Setup Validator
 *
 * This script validates that the test environment is properly configured
 * and all dependencies are available.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ValidationResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: ValidationResult[] = [];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color: string, symbol: string, message: string) {
  console.log(`${color}${symbol}${colors.reset} ${message}`);
}

function checkFileExists(filePath: string, description: string) {
  const fullPath = path.join(__dirname, filePath);

  if (fs.existsSync(fullPath)) {
    results.push({
      name: description,
      status: 'pass',
      message: `Found: ${filePath}`
    });
    log(colors.green, '✓', `${description}: ${filePath}`);
  } else {
    results.push({
      name: description,
      status: 'fail',
      message: `Missing: ${filePath}`
    });
    log(colors.red, '✗', `${description}: ${filePath} (NOT FOUND)`);
  }
}

function checkDirectoryExists(dirPath: string, description: string) {
  const fullPath = path.join(__dirname, dirPath);

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    results.push({
      name: description,
      status: 'pass',
      message: `Found: ${dirPath}`
    });
    log(colors.green, '✓', `${description}: ${dirPath}`);
  } else {
    results.push({
      name: description,
      status: 'warn',
      message: `Missing: ${dirPath} (will be created)`
    });
    log(colors.yellow, '⚠', `${description}: ${dirPath} (WILL BE CREATED)`);
  }
}

function checkCommand(command: string, description: string) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    results.push({
      name: description,
      status: 'pass',
      message: `${command} is installed`
    });
    log(colors.green, '✓', `${description}: ${command} is installed`);
  } catch (error) {
    results.push({
      name: description,
      status: 'fail',
      message: `${command} is not installed`
    });
    log(colors.red, '✗', `${description}: ${command} is NOT INSTALLED`);
  }
}

function checkPlaywrightBrowsers() {
  try {
    const output = execSync('npx playwright --version', { encoding: 'utf-8' });
    results.push({
      name: 'Playwright',
      status: 'pass',
      message: `Playwright is installed: ${output.trim()}`
    });
    log(colors.green, '✓', `Playwright: ${output.trim()}`);

    // Check if browsers are installed
    try {
      execSync('npx playwright install --dry-run chromium', { stdio: 'ignore' });
      log(colors.green, '✓', 'Chromium browser is installed');
    } catch {
      log(colors.yellow, '⚠', 'Chromium browser may not be installed');
      log(colors.blue, 'ℹ', 'Run: npx playwright install chromium');
    }
  } catch (error) {
    results.push({
      name: 'Playwright',
      status: 'fail',
      message: 'Playwright is not installed'
    });
    log(colors.red, '✗', 'Playwright is NOT INSTALLED');
    log(colors.blue, 'ℹ', 'Run: npm install -D @playwright/test');
  }
}

function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);

  if (major >= 16) {
    results.push({
      name: 'Node.js Version',
      status: 'pass',
      message: `Node.js ${version} (>= 16 required)`
    });
    log(colors.green, '✓', `Node.js: ${version}`);
  } else {
    results.push({
      name: 'Node.js Version',
      status: 'fail',
      message: `Node.js ${version} (>= 16 required)`
    });
    log(colors.red, '✗', `Node.js: ${version} (UPGRADE REQUIRED)`);
    log(colors.blue, 'ℹ', 'Node.js 16 or higher is required');
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warn').length;

  console.log(`${colors.green}✓ Passed:${colors.reset}  ${passed}`);
  console.log(`${colors.red}✗ Failed:${colors.reset}  ${failed}`);
  console.log(`${colors.yellow}⚠ Warnings:${colors.reset} ${warnings}`);
  console.log(`  Total:    ${results.length}\n`);

  if (failed > 0) {
    console.log(`${colors.red}❌ Setup validation FAILED${colors.reset}`);
    console.log('Please fix the errors above before running tests.\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`${colors.yellow}⚠ Setup validation completed with warnings${colors.reset}`);
    console.log('Review warnings above. Tests should still run.\n');
  } else {
    console.log(`${colors.green}✅ Setup validation PASSED${colors.reset}`);
    console.log('All checks passed! Ready to run tests.\n');
  }
}

function printRecommendations() {
  console.log('='.repeat(60));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(60) + '\n');

  console.log('To run tests:');
  console.log(`  ${colors.blue}cd ${path.join(__dirname)}${colors.reset}`);
  console.log(`  ${colors.blue}./run-tests.sh all${colors.reset}\n`);

  console.log('To install missing dependencies:');
  console.log(`  ${colors.blue}npm install -D @playwright/test${colors.reset}`);
  console.log(`  ${colors.blue}npx playwright install chromium${colors.reset}\n`);

  console.log('For more information:');
  console.log(`  ${colors.blue}cat README.md${colors.reset}\n`);
}

// Main validation
async function main() {
  console.log('\n' + colors.blue + '╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║    Page Verification Test Setup Validator                    ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝' + colors.reset + '\n');

  console.log('Checking test environment...\n');

  // Check Node.js version
  checkNodeVersion();

  // Check commands
  checkCommand('npx', 'NPM/NPX');

  // Check Playwright
  checkPlaywrightBrowsers();

  // Check files
  checkFileExists('page-verification.spec.ts', 'Test Spec File');
  checkFileExists('README.md', 'Documentation');
  checkFileExists('run-tests.sh', 'Test Runner Script');

  // Check directories
  checkDirectoryExists('../screenshots/page-verification', 'Screenshot Directory');
  checkDirectoryExists('../page-objects', 'Page Objects Directory');

  // Check Playwright config
  checkFileExists('../playwright.config.ts', 'Playwright Config');

  // Print results
  printSummary();
  printRecommendations();
}

main().catch(error => {
  console.error(`${colors.red}Error during validation:${colors.reset}`, error);
  process.exit(1);
});
