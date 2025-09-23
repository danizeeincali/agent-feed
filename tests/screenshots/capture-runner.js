#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const SCREENSHOTS_DIR = '/workspaces/agent-feed/tests/screenshots/baseline';
const BASE_URL = 'http://localhost:5173';

async function ensureDirectories() {
  const dirs = [
    path.join(SCREENSHOTS_DIR, 'desktop/pages'),
    path.join(SCREENSHOTS_DIR, 'desktop/components'),
    path.join(SCREENSHOTS_DIR, 'mobile/pages'),
    path.join(SCREENSHOTS_DIR, 'mobile/components'),
    path.join(SCREENSHOTS_DIR, 'tablet/pages'),
    path.join(SCREENSHOTS_DIR, 'tablet/components'),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function checkServerRunning() {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const curl = spawn('curl', ['-f', '-s', BASE_URL]);

    curl.on('close', (code) => {
      resolve(code === 0);
    });

    curl.on('error', () => {
      resolve(false);
    });
  });
}

async function runScreenshotCapture() {
  console.log('🔄 Starting screenshot capture for regression analysis...');

  try {
    // Ensure directories exist
    await ensureDirectories();
    console.log('✅ Created screenshot directories');

    // Check if server is running
    const serverRunning = await checkServerRunning();
    if (!serverRunning) {
      console.log('⚠️  Server not detected at localhost:5173');
      console.log('🚀 Please start the development server with: npm run dev');
      process.exit(1);
    }
    console.log('✅ Server is running at localhost:5173');

    // Run Playwright tests
    console.log('📸 Capturing screenshots...');

    const playwrightArgs = [
      'test',
      '/workspaces/agent-feed/tests/screenshots/regression-capture.spec.ts',
      '--config=/workspaces/agent-feed/tests/screenshots/screenshot-config.ts',
      '--reporter=list,json',
      '--timeout=60000'
    ];

    const playwright = spawn('npx', ['playwright', ...playwrightArgs], {
      stdio: 'inherit',
      cwd: '/workspaces/agent-feed'
    });

    playwright.on('close', async (code) => {
      if (code === 0) {
        console.log('✅ Screenshot capture completed successfully!');
        await generateSummaryReport();
      } else {
        console.log(`❌ Screenshot capture failed with exit code ${code}`);
        process.exit(code);
      }
    });

    playwright.on('error', (error) => {
      console.error('❌ Failed to start Playwright:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
    process.exit(1);
  }
}

async function generateSummaryReport() {
  try {
    const screenshotFiles = [];

    // Scan for all screenshot files
    async function scanDirectory(dir) {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });

        for (const item of items) {
          const fullPath = path.join(dir, item.name);

          if (item.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (item.name.endsWith('.png')) {
            const stats = await fs.stat(fullPath);
            screenshotFiles.push({
              path: fullPath,
              name: item.name,
              size: stats.size,
              created: stats.mtime
            });
          }
        }
      } catch (error) {
        console.log(`Warning: Could not scan directory ${dir}:`, error.message);
      }
    }

    await scanDirectory(SCREENSHOTS_DIR);

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      totalScreenshots: screenshotFiles.length,
      baseUrl: BASE_URL,
      screenshotsDirectory: SCREENSHOTS_DIR,
      screenshots: screenshotFiles.map(file => ({
        name: file.name,
        path: file.path.replace('/workspaces/agent-feed/', ''),
        sizeKB: Math.round(file.size / 1024),
        created: file.created
      })),
      summary: {
        desktopScreenshots: screenshotFiles.filter(f => f.path.includes('/desktop/')).length,
        mobileScreenshots: screenshotFiles.filter(f => f.path.includes('/mobile/')).length,
        tabletScreenshots: screenshotFiles.filter(f => f.path.includes('/tablet/')).length,
        pageScreenshots: screenshotFiles.filter(f => f.path.includes('/pages/')).length,
        componentScreenshots: screenshotFiles.filter(f => f.path.includes('/components/')).length
      }
    };

    const reportPath = path.join(SCREENSHOTS_DIR, 'capture-summary.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 Screenshot Capture Summary:');
    console.log(`   Total screenshots: ${report.totalScreenshots}`);
    console.log(`   Desktop: ${report.summary.desktopScreenshots}`);
    console.log(`   Mobile: ${report.summary.mobileScreenshots}`);
    console.log(`   Tablet: ${report.summary.tabletScreenshots}`);
    console.log(`   Pages: ${report.summary.pageScreenshots}`);
    console.log(`   Components: ${report.summary.componentScreenshots}`);
    console.log(`\n📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log(`📋 Report saved to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Error generating summary report:', error);
  }
}

// Run the capture
runScreenshotCapture();