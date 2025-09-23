const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function enhancedStylingValidation() {
  console.log('🎨 Enhanced Agents Page Styling Validation...\n');

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

    // Wait for React to hydrate and styles to load
    await page.waitForTimeout(5000);

    console.log('🔍 Examining page structure and CSS...');

    // Get the page content to see what's actually rendered
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        bodyClasses: document.body.className,
        mainContent: document.querySelector('#__next') ?
          document.querySelector('#__next').innerHTML.substring(0, 500) + '...' : 'No React root found',
        stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(link => link.href),
        inlineStyles: Array.from(document.querySelectorAll('style')).length
      };
    });

    console.log('📄 Page Content Analysis:');
    console.log(`   Title: ${pageContent.title}`);
    console.log(`   Body classes: ${pageContent.bodyClasses || 'none'}`);
    console.log(`   Stylesheets: ${pageContent.stylesheets.length}`);
    console.log(`   Inline styles: ${pageContent.inlineStyles}`);

    // Check for CSS modules classes
    const cssModuleCheck = await page.evaluate(() => {
      // Look for CSS module classes (they usually have hash suffixes)
      const allElements = document.querySelectorAll('*');
      const moduleClasses = [];

      allElements.forEach(el => {
        const classes = el.className;
        if (typeof classes === 'string' && classes.includes('_')) {
          moduleClasses.push(classes);
        }
      });

      return {
        foundModuleClasses: moduleClasses.length > 0,
        sampleClasses: moduleClasses.slice(0, 5),
        totalElements: allElements.length
      };
    });

    console.log('🧩 CSS Modules Check:');
    console.log(`   Found module classes: ${cssModuleCheck.foundModuleClasses}`);
    console.log(`   Sample classes: ${cssModuleCheck.sampleClasses.join(', ')}`);

    // Check for specific styling elements more thoroughly
    const detailedStyling = await page.evaluate(() => {
      // Check container background
      const container = document.querySelector('[class*="container"]') ||
                       document.querySelector('.container') ||
                       document.querySelector('#__next > div:first-child');

      let containerStyles = null;
      if (container) {
        const styles = window.getComputedStyle(container);
        containerStyles = {
          background: styles.background,
          backgroundImage: styles.backgroundImage,
          minHeight: styles.minHeight,
          padding: styles.padding
        };
      }

      // Check for agent cards with any possible class name
      const agentCards = document.querySelectorAll('[class*="agent"], [data-testid="agent-card"], .agent-card');
      const cardStyles = [];

      agentCards.forEach((card, index) => {
        if (index < 3) { // Only check first 3 cards
          const styles = window.getComputedStyle(card);
          cardStyles.push({
            background: styles.backgroundColor,
            boxShadow: styles.boxShadow,
            borderRadius: styles.borderRadius,
            padding: styles.padding
          });
        }
      });

      // Check for status badges
      const badges = document.querySelectorAll('[class*="status"], [class*="badge"], .status-badge');
      const badgeStyles = [];

      badges.forEach((badge, index) => {
        if (index < 5) {
          const styles = window.getComputedStyle(badge);
          badgeStyles.push({
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            text: badge.textContent.trim()
          });
        }
      });

      // Check typography
      const heading = document.querySelector('h1, h2, [class*="title"]');
      const headingStyles = heading ? {
        fontFamily: window.getComputedStyle(heading).fontFamily,
        fontSize: window.getComputedStyle(heading).fontSize,
        fontWeight: window.getComputedStyle(heading).fontWeight,
        color: window.getComputedStyle(heading).color,
        textShadow: window.getComputedStyle(heading).textShadow
      } : null;

      return {
        container: containerStyles,
        agentCardCount: agentCards.length,
        agentCards: cardStyles,
        badges: badgeStyles,
        heading: headingStyles
      };
    });

    // Take screenshots
    console.log('📸 Taking enhanced screenshots...');

    await page.screenshot({
      path: path.join(screenshotsDir, 'enhanced-full-page.png'),
      fullPage: true
    });

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, 'enhanced-mobile.png'),
      fullPage: true
    });

    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, 'enhanced-desktop.png'),
      fullPage: true
    });

    // Check console errors
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Generate comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      url: 'http://localhost:5173/agents/',
      pageContent: pageContent,
      cssModules: cssModuleCheck,
      styling: detailedStyling,
      consoleMessages: consoleMessages,
      validation: {
        pageLoaded: true,
        cssModulesWorking: cssModuleCheck.foundModuleClasses,
        gradientBackground: detailedStyling.container ?
          (detailedStyling.container.background.includes('gradient') ||
           detailedStyling.container.backgroundImage.includes('gradient')) : false,
        agentCardsFound: detailedStyling.agentCardCount,
        statusBadgesFound: detailedStyling.badges.length,
        typographyStyled: !!detailedStyling.heading
      }
    };

    // Save enhanced report
    fs.writeFileSync(
      path.join(screenshotsDir, 'enhanced-validation-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📊 Enhanced Validation Results:');
    console.log('=====================================');
    console.log(`✅ Page loaded: ${report.validation.pageLoaded}`);
    console.log(`🧩 CSS Modules working: ${report.validation.cssModulesWorking}`);
    console.log(`🎨 Gradient background: ${report.validation.gradientBackground}`);
    console.log(`📦 Agent cards found: ${report.validation.agentCardsFound}`);
    console.log(`🏷️ Status badges found: ${report.validation.statusBadgesFound}`);
    console.log(`📝 Typography styled: ${report.validation.typographyStyled}`);

    if (detailedStyling.container) {
      console.log(`\n🎭 Container Styling:`);
      console.log(`   Background: ${detailedStyling.container.background.substring(0, 100)}...`);
      console.log(`   Min Height: ${detailedStyling.container.minHeight}`);
      console.log(`   Padding: ${detailedStyling.container.padding}`);
    }

    if (detailedStyling.agentCards.length > 0) {
      console.log(`\n🎴 First Agent Card Styling:`);
      const card = detailedStyling.agentCards[0];
      console.log(`   Background: ${card.background}`);
      console.log(`   Box Shadow: ${card.boxShadow !== 'none' ? 'Yes' : 'No'}`);
      console.log(`   Border Radius: ${card.borderRadius}`);
      console.log(`   Padding: ${card.padding}`);
    }

    if (detailedStyling.heading) {
      console.log(`\n📝 Heading Styling:`);
      console.log(`   Font: ${detailedStyling.heading.fontFamily}`);
      console.log(`   Size: ${detailedStyling.heading.fontSize}`);
      console.log(`   Weight: ${detailedStyling.heading.fontWeight}`);
      console.log(`   Color: ${detailedStyling.heading.color}`);
      console.log(`   Text Shadow: ${detailedStyling.heading.textShadow}`);
    }

    console.log(`\n📸 Enhanced screenshots saved to: ${screenshotsDir}`);
    console.log(`📋 Enhanced report: ${path.join(screenshotsDir, 'enhanced-validation-report.json')}`);

  } catch (error) {
    console.error('❌ Enhanced validation failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run enhanced validation
enhancedStylingValidation()
  .then(() => {
    console.log('\n🎉 Enhanced styling validation completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Enhanced styling validation failed:', error);
    process.exit(1);
  });