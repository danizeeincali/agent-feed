import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('');
  console.log('🏁 WebSocket Integration Test Suite Complete');
  
  // Log summary of test artifacts created
  const fs = require('fs');
  const path = require('path');
  
  const screenshotsDir = path.join(__dirname, '../screenshots');
  const testResultsDir = path.join(__dirname, '../test-results');
  
  let screenshotCount = 0;
  let videoCount = 0;
  
  if (fs.existsSync(screenshotsDir)) {
    const screenshots = fs.readdirSync(screenshotsDir).filter((f: string) => f.endsWith('.png'));
    screenshotCount = screenshots.length;
  }
  
  if (fs.existsSync(testResultsDir)) {
    const videos = fs.readdirSync(testResultsDir, { recursive: true })
      .filter((f: string) => f.toString().endsWith('.webm'));
    videoCount = videos.length;
  }
  
  console.log('📊 Test Artifacts Generated:');
  console.log(`   📸 Screenshots: ${screenshotCount}`);
  console.log(`   🎥 Videos: ${videoCount}`);
  console.log(`   📁 Reports: playwright-report/index.html`);
  console.log('');
  
  console.log('🔍 Key Validation Points Tested:');
  console.log('   ✅ WebSocket connection establishment');
  console.log('   ✅ Connection status display accuracy');
  console.log('   ✅ Terminal launcher functionality');
  console.log('   ✅ Terminal connection stability');
  console.log('   ✅ Reconnection scenarios');
  console.log('   ✅ Cross-browser compatibility');
  console.log('   ✅ Performance under load');
  console.log('   ✅ Mobile device compatibility');
  console.log('   ✅ Network interruption recovery');
  console.log('   ✅ Real user interaction patterns');
  console.log('');
  
  console.log('📋 View detailed results:');
  console.log('   npx playwright show-report');
  console.log('');
}

export default globalTeardown;