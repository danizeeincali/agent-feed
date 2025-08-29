import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright Claude Regression Tests Setup...');

  // Create necessary directories
  const directories = [
    'test-results',
    'screenshots',
    'screenshots/baseline',
    'screenshots/actual',
    'screenshots/diff'
  ];

  directories.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });

  // Verify server is running
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    console.log('🔍 Checking if server is running...');
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('✅ Server is running and accessible');
    
    await browser.close();
  } catch (error) {
    console.error('❌ Server check failed:', error);
    console.log('🔧 Make sure the development server is running on localhost:3000');
    throw new Error('Server is not accessible. Please start the development server.');
  }

  // Setup test environment
  console.log('⚙️ Setting up test environment...');
  
  // Clear previous test results
  const testResultsDir = path.join(__dirname, '..', 'test-results');
  if (fs.existsSync(testResultsDir)) {
    fs.readdirSync(testResultsDir).forEach(file => {
      const filePath = path.join(testResultsDir, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    });
    console.log('🧹 Cleared previous test results');
  }

  console.log('✅ Global setup completed successfully!');
}

export default globalSetup;