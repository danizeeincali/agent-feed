/**
 * Global setup for SPARC Tailwind validation tests
 */

const fs = require('fs');
const path = require('path');

async function globalSetup() {
  console.log('🚀 Starting SPARC Tailwind CSS validation test suite...');

  // Ensure all necessary directories exist
  const directories = [
    'tests/sparc-tailwind-validation/screenshots',
    'tests/sparc-tailwind-validation/playwright-report',
    'tests/sparc-tailwind-validation/test-results',
    'tests/sparc-tailwind-validation/coverage'
  ];

  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });

  // Create test metadata
  const metadata = {
    testSuite: 'SPARC Tailwind CSS Validation',
    startTime: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch
    },
    configuration: {
      tailwindVersion: '4.1.13',
      nextVersion: '14.0.0',
      postCSSVersion: '8.5.6'
    }
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'tests/sparc-tailwind-validation/test-metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  console.log('✅ Global setup completed');
}

module.exports = globalSetup;