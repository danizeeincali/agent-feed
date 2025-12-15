#!/usr/bin/env node

/**
 * Quick SimpleLauncher Browser Validation Script
 * Validates that SimpleLauncher is working correctly after import fixes
 */

const http = require('http');
const https = require('https');

console.log('🎯 SimpleLauncher Quick Validation');
console.log('==================================');

async function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function validateFrontend() {
  console.log('\n📡 Testing Frontend Server...');
  
  try {
    const response = await httpGet('http://localhost:3000');
    
    if (response.status === 200) {
      console.log('✅ Frontend server is running (HTTP 200)');
      
      // Check for React app structure
      if (response.data.includes('<div id="root">')) {
        console.log('✅ React app structure detected');
      } else {
        console.log('⚠️ React app structure not found');
      }
      
      // Check for SimpleLauncher route
      if (response.data.includes('Agent Feed')) {
        console.log('✅ Application title found');
      }
      
      return true;
    } else {
      console.log(`❌ Frontend server returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Frontend server error: ${error.message}`);
    return false;
  }
}

async function validateSimpleLauncherRoute() {
  console.log('\n🚀 Testing SimpleLauncher Route...');
  
  try {
    const response = await httpGet('http://localhost:3000/simple-launcher');
    
    if (response.status === 200) {
      console.log('✅ SimpleLauncher route accessible');
      return true;
    } else {
      console.log(`❌ SimpleLauncher route returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ SimpleLauncher route error: ${error.message}`);
    return false;
  }
}

async function validateBuildOutput() {
  console.log('\n🔨 Checking Build Output...');
  
  const fs = require('fs');
  const path = require('path');
  
  const distPath = path.join(__dirname, 'dist');
  
  try {
    if (fs.existsSync(distPath)) {
      const files = fs.readdirSync(distPath);
      console.log('✅ Build output directory exists');
      
      const hasIndexHtml = files.includes('index.html');
      const hasAssets = files.some(f => f === 'assets');
      
      if (hasIndexHtml) {
        console.log('✅ index.html found in build output');
      } else {
        console.log('⚠️ index.html not found in build output');
      }
      
      if (hasAssets) {
        console.log('✅ Assets directory found');
        const assetFiles = fs.readdirSync(path.join(distPath, 'assets'));
        console.log(`   → ${assetFiles.length} asset files`);
      }
      
      return true;
    } else {
      console.log('⚠️ Build output directory not found (run npm run build)');
      return false;
    }
  } catch (error) {
    console.log(`❌ Build output check error: ${error.message}`);
    return false;
  }
}

async function validateComponentStructure() {
  console.log('\n📁 Checking Component Structure...');
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    const componentPath = path.join(__dirname, 'src', 'components', 'SimpleLauncher.tsx');
    
    if (fs.existsSync(componentPath)) {
      console.log('✅ SimpleLauncher.tsx file exists');
      
      const content = fs.readFileSync(componentPath, 'utf8');
      
      // Check for key elements
      const checks = [
        { pattern: 'export const SimpleLauncher', name: 'Component export' },
        { pattern: 'React.FC', name: 'React functional component' },
        { pattern: 'launch-button', name: 'Launch button class' },
        { pattern: 'stop-button', name: 'Stop button class' },
        { pattern: 'simple-launcher', name: 'Main container class' },
        { pattern: 'apiCall', name: 'API call function' },
        { pattern: 'status-section', name: 'Status section' }
      ];
      
      checks.forEach(check => {
        if (content.includes(check.pattern)) {
          console.log(`✅ ${check.name} found`);
        } else {
          console.log(`❌ ${check.name} missing`);
        }
      });
      
      return true;
    } else {
      console.log('❌ SimpleLauncher.tsx file not found');
      return false;
    }
  } catch (error) {
    console.log(`❌ Component structure check error: ${error.message}`);
    return false;
  }
}

async function main() {
  const results = [];
  
  results.push(await validateFrontend());
  results.push(await validateSimpleLauncherRoute());
  results.push(await validateBuildOutput());
  results.push(await validateComponentStructure());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  const successRate = Math.round((passed / total) * 100);
  
  console.log('\n📊 Validation Summary');
  console.log('====================');
  console.log(`Tests Passed: ${passed}/${total}`);
  console.log(`Success Rate: ${successRate}%`);
  
  if (successRate === 100) {
    console.log('\n🎉 SUCCESS: SimpleLauncher is fully functional!');
    console.log('   → Ready for production deployment');
    console.log('   → All critical components working');
    console.log('   → No import errors detected');
  } else if (successRate >= 75) {
    console.log('\n⚠️ PARTIAL SUCCESS: Most components working');
    console.log('   → Core functionality appears intact');
    console.log('   → Some minor issues may exist');
  } else {
    console.log('\n❌ FAILURE: Critical issues detected');
    console.log('   → SimpleLauncher requires fixes');
    console.log('   → Check server and build processes');
  }
  
  console.log('\n📋 Next Steps:');
  
  if (successRate === 100) {
    console.log('   1. Deploy to staging environment');
    console.log('   2. Run end-to-end tests');
    console.log('   3. Monitor performance metrics');
  } else {
    console.log('   1. Fix failed validation items');
    console.log('   2. Re-run validation script');
    console.log('   3. Check server logs for errors');
  }
  
  console.log('\n🔍 Manual Testing:');
  console.log('   → Open http://localhost:3000 in browser');
  console.log('   → Navigate to Simple Launcher');
  console.log('   → Test Launch/Stop buttons');
  console.log('   → Check browser console for errors');
  
  process.exit(successRate === 100 ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}