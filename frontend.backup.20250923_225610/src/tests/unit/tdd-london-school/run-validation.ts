#!/usr/bin/env ts-node

/**
 * TDD London School Validation Execution Script
 * 
 * This script executes comprehensive validation following London School TDD principles
 */

import { ValidationRunner } from './validation-runner';
import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

async function main() {
  console.log('🚀 TDD London School Comprehensive Validation');
  console.log('════════════════════════════════════════════');
  
  try {
    // Check if Playwright is installed
    console.log('🔧 Checking Playwright installation...');
    await ensurePlaywrightInstalled();
    
    console.log('✅ Prerequisites satisfied');
    console.log('🎬 Starting validation in 3 seconds...');
    
    await sleep(3000);
    
    // Run the validation
    const runner = new ValidationRunner();
    await runner.run();
    
    console.log('🎉 Validation completed successfully!');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

async function ensurePlaywrightInstalled(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['playwright', '--version'], { stdio: 'pipe' });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.log('📦 Installing Playwright browsers...');
        const install = spawn('npx', ['playwright', 'install', '--with-deps'], { stdio: 'inherit' });
        
        install.on('close', (installCode) => {
          if (installCode === 0) {
            resolve();
          } else {
            reject(new Error('Failed to install Playwright'));
          }
        });
      }
    });
  });
}

if (require.main === module) {
  main();
}