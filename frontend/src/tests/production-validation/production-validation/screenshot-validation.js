import puppeteer from 'puppeteer';

async function captureEvidence() {
  console.log('📸 Capturing visual evidence...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  
  try {
    // Navigate and wait for content
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000);
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'tests/production-validation/application-functional-evidence.png',
      fullPage: true 
    });
    
    console.log('✅ Screenshot saved: application-functional-evidence.png');
    
    // Get page content for analysis
    const content = await page.evaluate(() => {
      return {
        title: document.title,
        hasContent: document.body.textContent.length > 0,
        visibleElements: document.querySelectorAll('*:not(script):not(style)').length,
        textContent: document.body.textContent.substring(0, 200)
      };
    });
    
    console.log('📋 Page Analysis:', content);
    
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error.message);
  } finally {
    await browser.close();
  }
}

captureEvidence();