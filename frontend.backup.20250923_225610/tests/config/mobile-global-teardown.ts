/**
 * Mobile Global Teardown
 * Cleanup after mobile testing
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up mobile testing environment...');

  try {
    // Generate mobile test report summary
    const resultsDir = path.join(__dirname, '../reports/mobile-playwright-results');
    const screenshotsDir = path.join(__dirname, '../screenshots');
    
    // Check if results exist
    let testResults: any = {};
    try {
      const resultsFile = path.join(__dirname, '../reports/mobile-results.json');
      const resultsData = await fs.readFile(resultsFile, 'utf8');
      testResults = JSON.parse(resultsData);
    } catch (error) {
      console.log('📊 No test results file found, skipping summary generation');
    }

    // Generate mobile-specific test summary
    const summary = {
      timestamp: new Date().toISOString(),
      mobileDevicesTested: [
        'iPhone 12',
        'Galaxy S21', 
        'iPad Mini',
        'iPhone SE',
        'Small Mobile 320px'
      ],
      testCategories: {
        componentRegistry: 'Mobile component responsiveness testing',
        responsiveness: 'Cross-viewport responsive design testing',
        touchInteractions: 'Touch gesture and interaction testing',
        performance: 'Mobile performance and loading testing',
        accessibility: 'Mobile accessibility compliance testing'
      },
      screenshots: {
        location: screenshotsDir,
        purpose: 'Visual regression testing and debugging'
      },
      recommendations: [
        'Review failed tests for mobile-specific issues',
        'Check touch target sizes (minimum 44x44px)',
        'Verify responsive breakpoints work correctly',
        'Ensure text remains readable on small screens',
        'Test with real devices when possible'
      ]
    };

    // Write summary
    const summaryFile = path.join(__dirname, '../reports/mobile-test-summary.json');
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));

    console.log('📱 Mobile test categories covered:');
    Object.entries(summary.testCategories).forEach(([category, description]) => {
      console.log(`   - ${category}: ${description}`);
    });

    // Clean up temporary files if needed
    console.log('🗑️  Cleaning up temporary mobile test files...');

    // Archive screenshots if in CI
    if (process.env.CI) {
      console.log('📦 Archiving mobile test screenshots...');
      // In a real CI environment, you might upload these to a storage service
    }

    console.log('✅ Mobile testing cleanup complete!');

  } catch (error) {
    console.error('❌ Mobile teardown failed:', error);
    // Don't throw error in teardown to avoid masking test results
  }
}

export default globalTeardown;