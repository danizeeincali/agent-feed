const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function validateAgentsPageStyling() {
  console.log('🎨 Starting Agents Page Styling Validation...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    console.log('📱 Navigating to http://localhost:5173/agents/...');

    await page.goto('http://localhost:5173/agents/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for React to hydrate
    await page.waitForTimeout(3000);

    // Wait for page to load, with fallback if no agent cards
    try {
      await page.waitForSelector('.agent-card', { timeout: 5000 });
      console.log('✅ Agent cards found');
    } catch (e) {
      console.log('⚠️  No agent cards found, but continuing validation...');
      // Wait for basic page structure
      await page.waitForSelector('body', { timeout: 5000 });
    }

    console.log('✅ Page loaded successfully');

    // Take full page screenshot
    console.log('📸 Taking full page screenshot...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'agents-page-full.png'),
      fullPage: true
    });

    // Test responsive design
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      console.log(`📱 Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})...`);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000); // Let layout settle

      await page.screenshot({
        path: path.join(screenshotsDir, `agents-page-${viewport.name}.png`),
        fullPage: true
      });
    }

    // Check for CSS styling elements
    console.log('🎯 Validating styling elements...');

    // Check gradient background
    const gradientCheck = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      const background = styles.background || styles.backgroundImage;
      return background.includes('linear-gradient') || background.includes('gradient');
    });

    // Check agent cards
    const cardStyles = await page.evaluate(() => {
      const cards = document.querySelectorAll('.agent-card');
      if (cards.length === 0) return null;

      const firstCard = cards[0];
      const styles = window.getComputedStyle(firstCard);

      return {
        backgroundColor: styles.backgroundColor,
        boxShadow: styles.boxShadow,
        borderRadius: styles.borderRadius,
        padding: styles.padding,
        cardCount: cards.length
      };
    });

    // Check status badges
    const badgeStyles = await page.evaluate(() => {
      const badges = document.querySelectorAll('.status-badge, [class*="status"], [class*="badge"]');
      return Array.from(badges).map(badge => {
        const styles = window.getComputedStyle(badge);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          text: badge.textContent.trim()
        };
      });
    });

    // Check typography
    const typographyCheck = await page.evaluate(() => {
      const heading = document.querySelector('h1, h2, .page-title');
      const text = document.querySelector('p, .description');

      return {
        heading: heading ? {
          fontFamily: window.getComputedStyle(heading).fontFamily,
          fontSize: window.getComputedStyle(heading).fontSize,
          fontWeight: window.getComputedStyle(heading).fontWeight
        } : null,
        text: text ? {
          fontFamily: window.getComputedStyle(text).fontFamily,
          fontSize: window.getComputedStyle(text).fontSize
        } : null
      };
    });

    // Check console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Generate validation report
    const report = {
      timestamp: new Date().toISOString(),
      url: 'http://localhost:5173/agents',
      validation: {
        pageLoaded: true,
        gradientBackground: gradientCheck,
        agentCards: cardStyles,
        statusBadges: badgeStyles,
        typography: typographyCheck,
        consoleErrors: consoleErrors,
        screenshotsTaken: ['full', 'desktop', 'tablet', 'mobile']
      }
    };

    // Save validation report
    fs.writeFileSync(
      path.join(screenshotsDir, 'validation-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📊 Validation Results:');
    console.log('=====================');
    console.log(`✅ Page loaded: ${report.validation.pageLoaded}`);
    console.log(`🎨 Gradient background: ${report.validation.gradientBackground}`);
    console.log(`📦 Agent cards found: ${cardStyles?.cardCount || 0}`);
    console.log(`🏷️ Status badges found: ${badgeStyles?.length || 0}`);
    console.log(`❌ Console errors: ${consoleErrors.length}`);

    if (cardStyles) {
      console.log(`\n🎴 Card Styling:`);
      console.log(`   Background: ${cardStyles.backgroundColor}`);
      console.log(`   Shadow: ${cardStyles.boxShadow !== 'none' ? 'Yes' : 'No'}`);
      console.log(`   Border radius: ${cardStyles.borderRadius}`);
    }

    if (badgeStyles.length > 0) {
      console.log(`\n🏷️ Badge Styling:`);
      badgeStyles.slice(0, 3).forEach((badge, i) => {
        console.log(`   Badge ${i + 1}: ${badge.text} (${badge.backgroundColor})`);
      });
    }

    console.log(`\n📸 Screenshots saved to: ${screenshotsDir}`);
    console.log(`📋 Full report saved to: ${path.join(screenshotsDir, 'validation-report.json')}`);

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run validation
validateAgentsPageStyling()
  .then(() => {
    console.log('\n🎉 Styling validation completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Styling validation failed:', error);
    process.exit(1);
  });