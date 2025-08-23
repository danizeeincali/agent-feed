#!/usr/bin/env ts-node

/**
 * White Screen Fix Validation Runner
 * 
 * Quick validation script to run comprehensive tests for the SimpleLauncher
 * component after fixing duplicate import issues that caused white screen.
 * 
 * Usage:
 *   npm run validate:white-screen
 *   or
 *   npx ts-node scripts/validate-white-screen-fix.ts
 */

import { chromium, Browser, Page } from 'playwright';
import { runComprehensiveValidation, mockApiSetup } from '../tests/utils/white-screen-validation-helpers';

interface ValidationConfig {
  headless: boolean;
  slowMo: number;
  frontendUrl: string;
  backendUrl: string;
  timeout: number;
}

const defaultConfig: ValidationConfig = {
  headless: !process.argv.includes('--headed'),
  slowMo: process.argv.includes('--slow') ? 1000 : 0,
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:3001',
  timeout: 30000
};

class WhiteScreenFixValidator {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async setup(config: ValidationConfig) {
    console.log('🔧 Setting up browser for validation...');
    
    this.browser = await chromium.launch({
      headless: config.headless,
      slowMo: config.slowMo
    });

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 }
    });

    this.page = await context.newPage();

    // Set up API mocking for consistent testing
    await mockApiSetup.setupMocks(this.page);

    console.log('✅ Browser setup complete\n');
  }

  async validateServersRunning(config: ValidationConfig): Promise<boolean> {
    console.log('🔍 Checking if servers are running...');
    
    try {
      // Check frontend server
      const frontendResponse = await fetch(config.frontendUrl);
      if (!frontendResponse.ok) {
        console.log('❌ Frontend server not responding on port 3000');
        return false;
      }
      console.log('✅ Frontend server (port 3000) - OK');

      // Check backend server
      const backendResponse = await fetch(`${config.backendUrl}/api/health`);
      // Backend might not have health endpoint, so we'll allow 404
      console.log('✅ Backend server (port 3001) - OK');

      return true;
    } catch (error) {
      console.log(`❌ Server check failed: ${error.message}`);
      console.log('\n📝 Please ensure both servers are running:');
      console.log('   Frontend: npm run dev (port 3000)');
      console.log('   Backend:  npm run dev (port 3001, from root directory)');
      return false;
    }
  }

  async runValidation(): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser not set up. Call setup() first.');
    }

    console.log('🚀 Starting White Screen Fix Validation...\n');

    try {
      const results = await runComprehensiveValidation(this.page);
      
      console.log('\n' + '='.repeat(60));
      console.log('🎯 WHITE SCREEN FIX VALIDATION RESULTS');
      console.log('='.repeat(60));
      
      if (results.allPassed) {
        console.log('🎉 ALL VALIDATIONS PASSED! 🎉');
        console.log('✅ SimpleLauncher is working correctly after white screen fix');
      } else {
        console.log('⚠️  SOME VALIDATIONS FAILED');
        console.log('❌ Review the failed items and fix any issues');
      }

      console.log(`\n📊 Summary: ${results.passedValidations}/${results.totalValidations} validations passed (${results.successRate}%)`);
      
      return results.allPassed;
    } catch (error) {
      console.error('❌ Validation failed with error:', error.message);
      return false;
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }

  async run(): Promise<boolean> {
    const config = defaultConfig;
    
    try {
      // Check if servers are running
      const serversRunning = await this.validateServersRunning(config);
      if (!serversRunning) {
        return false;
      }

      // Set up browser
      await this.setup(config);
      
      // Run validation
      const validationPassed = await this.runValidation();
      
      // Cleanup
      await this.cleanup();
      
      return validationPassed;
    } catch (error) {
      console.error('💥 Fatal error during validation:', error);
      await this.cleanup();
      return false;
    }
  }
}

// Main execution
async function main() {
  console.log('🔍 WHITE SCREEN FIX VALIDATION TOOL');
  console.log('=====================================\n');
  
  const validator = new WhiteScreenFixValidator();
  const success = await validator.run();
  
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('✅ VALIDATION COMPLETE - ALL TESTS PASSED');
    console.log('🚀 SimpleLauncher is ready for production!');
    process.exit(0);
  } else {
    console.log('❌ VALIDATION FAILED - ISSUES DETECTED');
    console.log('🛠️  Please fix the issues and run validation again');
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Validation script failed:', error);
    process.exit(1);
  });
}

export { WhiteScreenFixValidator };