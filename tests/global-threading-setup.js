/**
 * GLOBAL THREADING TEST SETUP
 * 
 * Setup script for threading validation tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function globalSetup(config) {
  console.log('🚀 Starting Global Threading Test Setup...');
  
  // Ensure required directories exist
  const dirs = [
    'tests/screenshots',
    'tests/reports',
    'tests/videos',
    'tests/test-results'
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
  
  // Clean up old test artifacts
  console.log('🧹 Cleaning up old test artifacts...');
  try {
    if (fs.existsSync('tests/screenshots')) {
      const screenshots = fs.readdirSync('tests/screenshots')
        .filter(file => file.endsWith('.png'));
      
      if (screenshots.length > 50) {
        // Keep only the most recent 20 screenshots
        const sorted = screenshots
          .map(file => ({
            file,
            time: fs.statSync(path.join('tests/screenshots', file)).mtime
          }))
          .sort((a, b) => b.time - a.time)
          .slice(20);
        
        sorted.forEach(({ file }) => {
          fs.unlinkSync(path.join('tests/screenshots', file));
        });
        
        console.log(`🧹 Cleaned up ${sorted.length} old screenshots`);
      }
    }
  } catch (error) {
    console.log('⚠️ Cleanup warning:', error.message);
  }
  
  // Verify server health
  console.log('🔍 Checking server health...');
  
  try {
    // Check frontend
    const frontendHealth = execSync(
      'curl -s -o /dev/null -w "%{http_code}" http://localhost:5173', 
      { encoding: 'utf8', timeout: 5000 }
    ).trim();
    
    if (frontendHealth === '200') {
      console.log('✅ Frontend server is healthy');
    } else {
      console.log(`⚠️ Frontend server returned: ${frontendHealth}`);
    }
    
    // Check backend
    const backendHealth = execSync(
      'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health', 
      { encoding: 'utf8', timeout: 5000 }
    ).trim();
    
    if (backendHealth === '200') {
      console.log('✅ Backend server is healthy');
    } else {
      console.log(`⚠️ Backend server returned: ${backendHealth}`);
    }
    
  } catch (error) {
    console.log('⚠️ Server health check warning:', error.message);
    console.log('Continuing with tests...');
  }
  
  // Initialize test metadata
  const metadata = {
    setupTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'test',
    testType: 'threading-validation',
    version: '1.0.0'
  };
  
  fs.writeFileSync(
    'tests/test-results/setup-metadata.json', 
    JSON.stringify(metadata, null, 2)
  );
  
  console.log('✅ Global threading test setup completed');
  
  return metadata;
}

module.exports = globalSetup;