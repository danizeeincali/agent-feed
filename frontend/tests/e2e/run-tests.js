#!/usr/bin/env node
/**
 * E2E Test Runner with Environment Verification
 * Ensures all services are running before executing tests
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3001';

async function checkService(url, name) {
  try {
    console.log(`🔍 Checking ${name} at ${url}...`);
    const response = await fetch(url);
    
    if (response.ok) {
      console.log(`✅ ${name} is running`);
      return true;
    } else {
      console.error(`❌ ${name} returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${name} is not accessible:`, error.message);
    return false;
  }
}

async function checkBackendAPI() {
  try {
    console.log(`🔍 Checking backend API...`);
    const response = await fetch(`${BACKEND_URL}/api/claude/check`);
    
    if (response.ok) {
      console.log(`✅ Backend API is responding`);
      return true;
    } else {
      console.error(`❌ Backend API returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Backend API is not accessible:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting E2E Test Suite for Single-Connection Architecture\n');
  
  // Check prerequisites
  const frontendOk = await checkService(FRONTEND_URL, 'Frontend');
  const backendOk = await checkService(BACKEND_URL, 'Backend');
  const apiOk = await checkBackendAPI();
  
  if (!frontendOk || !backendOk || !apiOk) {
    console.error('\n❌ Prerequisites not met. Please ensure:');
    if (!frontendOk) console.error('  - Frontend is running: npm run dev');
    if (!backendOk) console.error('  - Backend is running: node simple-backend.js');
    if (!apiOk) console.error('  - Backend API is accessible');
    console.error('');
    process.exit(1);
  }
  
  console.log('\n✅ All services are running. Starting E2E tests...\n');
  
  // Run Playwright tests
  const testProcess = spawn('npx', ['playwright', 'test', '--config=playwright.config.js'], {
    stdio: 'inherit',
    shell: true
  });
  
  testProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ All E2E tests completed successfully!');
    } else {
      console.error(`\n❌ Tests failed with code ${code}`);
      process.exit(code);
    }
  });
  
  testProcess.on('error', (error) => {
    console.error('\n❌ Error running tests:', error);
    process.exit(1);
  });
}

// Handle script arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
E2E Test Runner for Single-Connection Architecture

Usage:
  node run-tests.js [options]

Options:
  --help, -h        Show this help message
  --headed          Run tests in headed mode (visible browser)
  --debug          Run tests in debug mode
  --specific <file> Run specific test file

Examples:
  node run-tests.js
  node run-tests.js --headed
  node run-tests.js --specific single-connection.spec.ts
  node run-tests.js --debug

Prerequisites:
  - Frontend server running on localhost:3000
  - Backend server running on localhost:3001
  - Claude CLI available (optional but recommended)
  `);
  process.exit(0);
}

if (args.includes('--headed')) {
  process.argv.push('--headed');
}

if (args.includes('--debug')) {
  process.argv.push('--debug');
}

const specificIndex = args.indexOf('--specific');
if (specificIndex !== -1 && args[specificIndex + 1]) {
  process.argv.push(args[specificIndex + 1]);
}

runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});