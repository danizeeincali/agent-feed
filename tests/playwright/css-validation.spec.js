const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// CSS validation test suite
test.describe('CSS Functionality Validation', () => {
  let validationResults = {
    timestamp: new Date().toISOString(),
    pages: {},
    networkRequests: [],
    computedStyles: {},
    responsiveTests: {},
    missingVsExpected: {
      missing: [],
      expected: [],
      actual: []
    }
  };

  const pages = [
    { name: 'main', url: '/' },
    { name: 'agents', url: '/agents' }
  ];

  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 }
  ];

  const expectedTailwindClasses = [
    'bg-gradient-to-br',
    'from-purple-900',
    'via-blue-900',
    'to-indigo-900',
    'text-white',
    'min-h-screen',
    'flex',
    'flex-col',
    'items-center',
    'justify-center',
    'p-8',
    'space-y-8'
  ];

  test.beforeAll(async () => {
    // Ensure screenshots directory exists
    const screenshotsDir = '/workspaces/agent-feed/tests/screenshots';
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('1. Take before/after screenshots of all pages', async ({ browser }) => {
    for (const pageConfig of pages) {
      for (const viewport of viewports) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height }
        });

        const page = await context.newPage();

        try {
          console.log(`Testing ${pageConfig.name} page at ${viewport.name} viewport...`);

          // Navigate to page
          await page.goto(`http://localhost:3000${pageConfig.url}`, {
            waitUntil: 'networkidle',
            timeout: 30000
          });

          // Wait for page to stabilize
          await page.waitForTimeout(2000);

          // Take screenshot
          const screenshotPath = `/workspaces/agent-feed/tests/screenshots/${pageConfig.name}-${viewport.name}-validation.png`;
          await page.screenshot({
            path: screenshotPath,
            fullPage: true
          });

          // Store results
          if (!validationResults.pages[pageConfig.name]) {
            validationResults.pages[pageConfig.name] = {};
          }
          validationResults.pages[pageConfig.name][viewport.name] = {
            screenshot: screenshotPath,
            url: pageConfig.url,
            viewport: viewport,
            timestamp: new Date().toISOString()
          };

          console.log(`✓ Screenshot saved: ${screenshotPath}`);

        } catch (error) {
          console.error(`✗ Error testing ${pageConfig.name} at ${viewport.name}:`, error.message);
          validationResults.pages[pageConfig.name] = validationResults.pages[pageConfig.name] || {};
          validationResults.pages[pageConfig.name][viewport.name] = {
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }

        await context.close();
      }
    }
  });

  test('2. Check computed styles for Tailwind classes', async ({ page }) => {
    for (const pageConfig of pages) {
      try {
        console.log(`Checking computed styles for ${pageConfig.name} page...`);

        await page.goto(`http://localhost:3000${pageConfig.url}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        // Wait for styles to load
        await page.waitForTimeout(2000);

        // Check if main elements have expected styles
        const bodyStyles = await page.evaluate(() => {
          const body = document.body;
          const computedStyle = window.getComputedStyle(body);
          return {
            background: computedStyle.background,
            backgroundColor: computedStyle.backgroundColor,
            backgroundImage: computedStyle.backgroundImage,
            color: computedStyle.color,
            minHeight: computedStyle.minHeight,
            display: computedStyle.display,
            flexDirection: computedStyle.flexDirection,
            alignItems: computedStyle.alignItems,
            justifyContent: computedStyle.justifyContent,
            padding: computedStyle.padding
          };
        });

        // Check main container styles
        const mainContainerStyles = await page.evaluate(() => {
          const mainContainer = document.querySelector('main, .main-container, [class*="container"]');
          if (mainContainer) {
            const computedStyle = window.getComputedStyle(mainContainer);
            return {
              element: mainContainer.className,
              background: computedStyle.background,
              backgroundColor: computedStyle.backgroundColor,
              backgroundImage: computedStyle.backgroundImage,
              color: computedStyle.color,
              display: computedStyle.display,
              flexDirection: computedStyle.flexDirection,
              alignItems: computedStyle.alignItems,
              justifyContent: computedStyle.justifyContent,
              padding: computedStyle.padding,
              gap: computedStyle.gap
            };
          }
          return null;
        });

        // Check for Tailwind classes in HTML
        const tailwindClassesFound = await page.evaluate((expectedClasses) => {
          const allElements = document.querySelectorAll('*');
          const foundClasses = [];

          expectedClasses.forEach(expectedClass => {
            let found = false;
            allElements.forEach(element => {
              if (element.className && element.className.includes(expectedClass)) {
                found = true;
                foundClasses.push({
                  class: expectedClass,
                  element: element.tagName,
                  fullClassName: element.className
                });
              }
            });
            if (!found) {
              foundClasses.push({
                class: expectedClass,
                found: false
              });
            }
          });

          return foundClasses;
        }, expectedTailwindClasses);

        validationResults.computedStyles[pageConfig.name] = {
          bodyStyles,
          mainContainerStyles,
          tailwindClassesFound,
          timestamp: new Date().toISOString()
        };

        console.log(`✓ Computed styles checked for ${pageConfig.name}`);

      } catch (error) {
        console.error(`✗ Error checking styles for ${pageConfig.name}:`, error.message);
        validationResults.computedStyles[pageConfig.name] = {
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
  });

  test('3. Verify CSS network requests and loading', async ({ page }) => {
    // Track network requests
    const cssRequests = [];

    page.on('response', response => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';

      if (contentType.includes('text/css') || url.includes('.css') || url.includes('tailwind')) {
        cssRequests.push({
          url,
          status: response.status(),
          contentType,
          size: response.headers()['content-length'],
          timestamp: new Date().toISOString()
        });
      }
    });

    for (const pageConfig of pages) {
      try {
        console.log(`Checking CSS network requests for ${pageConfig.name}...`);

        await page.goto(`http://localhost:3000${pageConfig.url}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        // Check for CSS files in document head
        const cssLinks = await page.evaluate(() => {
          const links = document.querySelectorAll('link[rel="stylesheet"], style');
          return Array.from(links).map(link => ({
            tag: link.tagName,
            href: link.href,
            rel: link.rel,
            media: link.media,
            content: link.tagName === 'STYLE' ? link.textContent.substring(0, 200) + '...' : null
          }));
        });

        validationResults.networkRequests.push({
          page: pageConfig.name,
          cssRequests: [...cssRequests],
          cssLinks,
          timestamp: new Date().toISOString()
        });

        console.log(`✓ Network requests checked for ${pageConfig.name}`);
        console.log(`  - Found ${cssRequests.length} CSS requests`);
        console.log(`  - Found ${cssLinks.length} CSS links in document`);

      } catch (error) {
        console.error(`✗ Error checking network requests for ${pageConfig.name}:`, error.message);
      }
    }
  });

  test('4. Test different pages for styling consistency', async ({ page }) => {
    for (const pageConfig of pages) {
      try {
        console.log(`Testing styling consistency for ${pageConfig.name}...`);

        await page.goto(`http://localhost:3000${pageConfig.url}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        await page.waitForTimeout(2000);

        // Check page structure and styling
        const pageAnalysis = await page.evaluate(() => {
          const analysis = {
            hasGradientBackground: false,
            hasTailwindClasses: false,
            hasExpectedColors: false,
            hasFlexLayout: false,
            elementCount: 0,
            cssClassCount: 0,
            errors: []
          };

          try {
            // Check for gradient background
            const body = document.body;
            const bodyStyle = window.getComputedStyle(body);
            analysis.hasGradientBackground = bodyStyle.backgroundImage.includes('gradient');

            // Check for flex layout
            analysis.hasFlexLayout = bodyStyle.display === 'flex' ||
              document.querySelector('[style*="display: flex"], [class*="flex"]') !== null;

            // Count elements and classes
            const allElements = document.querySelectorAll('*');
            analysis.elementCount = allElements.length;

            let classCount = 0;
            allElements.forEach(el => {
              if (el.className) {
                classCount += el.className.split(' ').filter(c => c.trim()).length;
              }
            });
            analysis.cssClassCount = classCount;

            // Check for Tailwind classes
            analysis.hasTailwindClasses = document.querySelector('[class*="bg-"], [class*="text-"], [class*="p-"], [class*="m-"], [class*="flex"]') !== null;

            // Check for expected colors (purple/blue theme)
            const hasExpectedColors = bodyStyle.color.includes('rgb(255, 255, 255)') || // white text
              bodyStyle.backgroundImage.includes('purple') ||
              bodyStyle.backgroundImage.includes('blue') ||
              document.querySelector('[class*="purple"], [class*="blue"], [class*="indigo"]') !== null;
            analysis.hasExpectedColors = hasExpectedColors;

          } catch (error) {
            analysis.errors.push(error.message);
          }

          return analysis;
        });

        validationResults.pages[pageConfig.name] = validationResults.pages[pageConfig.name] || {};
        validationResults.pages[pageConfig.name].styleAnalysis = pageAnalysis;

        console.log(`✓ Style consistency checked for ${pageConfig.name}`);
        console.log(`  - Gradient background: ${pageAnalysis.hasGradientBackground}`);
        console.log(`  - Tailwind classes: ${pageAnalysis.hasTailwindClasses}`);
        console.log(`  - Expected colors: ${pageAnalysis.hasExpectedColors}`);
        console.log(`  - Flex layout: ${pageAnalysis.hasFlexLayout}`);

      } catch (error) {
        console.error(`✗ Error testing consistency for ${pageConfig.name}:`, error.message);
      }
    }
  });

  test('5. Validate responsive behavior across viewports', async ({ browser }) => {
    for (const pageConfig of pages) {
      for (const viewport of viewports) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height }
        });

        const page = await context.newPage();

        try {
          console.log(`Testing responsive behavior for ${pageConfig.name} at ${viewport.name}...`);

          await page.goto(`http://localhost:3000${pageConfig.url}`, {
            waitUntil: 'networkidle',
            timeout: 30000
          });

          await page.waitForTimeout(2000);

          // Check responsive styles
          const responsiveAnalysis = await page.evaluate((viewportName) => {
            const analysis = {
              viewport: viewportName,
              width: window.innerWidth,
              height: window.innerHeight,
              hasResponsiveClasses: false,
              layoutBreaks: false,
              scrollWidth: document.documentElement.scrollWidth,
              scrollHeight: document.documentElement.scrollHeight,
              overflowX: false,
              overflowY: false
            };

            // Check for responsive classes
            const responsiveClasses = ['sm:', 'md:', 'lg:', 'xl:', '2xl:'];
            const allElements = document.querySelectorAll('*');

            allElements.forEach(el => {
              if (el.className) {
                responsiveClasses.forEach(prefix => {
                  if (el.className.includes(prefix)) {
                    analysis.hasResponsiveClasses = true;
                  }
                });
              }
            });

            // Check for layout breaks (horizontal overflow)
            analysis.overflowX = analysis.scrollWidth > analysis.width;
            analysis.overflowY = analysis.scrollHeight > analysis.height;
            analysis.layoutBreaks = analysis.overflowX;

            return analysis;
          }, viewport.name);

          // Take responsive screenshot
          const responsiveScreenshot = `/workspaces/agent-feed/tests/screenshots/${pageConfig.name}-${viewport.name}-responsive.png`;
          await page.screenshot({
            path: responsiveScreenshot,
            fullPage: true
          });

          if (!validationResults.responsiveTests[pageConfig.name]) {
            validationResults.responsiveTests[pageConfig.name] = {};
          }

          validationResults.responsiveTests[pageConfig.name][viewport.name] = {
            ...responsiveAnalysis,
            screenshot: responsiveScreenshot,
            timestamp: new Date().toISOString()
          };

          console.log(`✓ Responsive test completed for ${pageConfig.name} at ${viewport.name}`);
          console.log(`  - Has responsive classes: ${responsiveAnalysis.hasResponsiveClasses}`);
          console.log(`  - Layout breaks: ${responsiveAnalysis.layoutBreaks}`);

        } catch (error) {
          console.error(`✗ Error testing responsive for ${pageConfig.name} at ${viewport.name}:`, error.message);
        }

        await context.close();
      }
    }
  });

  test('6. Document missing vs expected CSS functionality', async ({ page }) => {
    console.log('Analyzing missing vs expected CSS functionality...');

    // Define expected functionality
    const expectedFeatures = {
      gradientBackground: 'Purple to blue gradient background',
      whiteText: 'White text color',
      centeredLayout: 'Centered flex layout',
      responsiveDesign: 'Responsive design with breakpoints',
      tailwindClasses: 'Tailwind CSS classes applied',
      modernTypography: 'Modern typography and spacing',
      cardComponents: 'Styled card components',
      hoverEffects: 'Interactive hover effects',
      properSpacing: 'Consistent spacing using Tailwind',
      accessibleColors: 'Accessible color contrast'
    };

    // Analyze each page for expected features
    for (const pageConfig of pages) {
      try {
        await page.goto(`http://localhost:3000${pageConfig.url}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        await page.waitForTimeout(2000);

        const featureAnalysis = await page.evaluate((expected) => {
          const results = {
            found: [],
            missing: [],
            partial: []
          };

          // Check gradient background
          const body = document.body;
          const bodyStyle = window.getComputedStyle(body);
          if (bodyStyle.backgroundImage.includes('gradient')) {
            results.found.push('gradientBackground');
          } else {
            results.missing.push('gradientBackground');
          }

          // Check white text
          if (bodyStyle.color.includes('rgb(255, 255, 255)')) {
            results.found.push('whiteText');
          } else {
            results.missing.push('whiteText');
          }

          // Check centered layout
          if (bodyStyle.display === 'flex' &&
              (bodyStyle.alignItems === 'center' || bodyStyle.justifyContent === 'center')) {
            results.found.push('centeredLayout');
          } else {
            results.missing.push('centeredLayout');
          }

          // Check for responsive classes
          const hasResponsive = document.querySelector('[class*="sm:"], [class*="md:"], [class*="lg:"]');
          if (hasResponsive) {
            results.found.push('responsiveDesign');
          } else {
            results.missing.push('responsiveDesign');
          }

          // Check for Tailwind classes
          const hasTailwind = document.querySelector('[class*="bg-"], [class*="text-"], [class*="p-"], [class*="m-"]');
          if (hasTailwind) {
            results.found.push('tailwindClasses');
          } else {
            results.missing.push('tailwindClasses');
          }

          // Check for card components
          const hasCards = document.querySelector('.card, [class*="card"], [class*="bg-white"], [class*="shadow"]');
          if (hasCards) {
            results.found.push('cardComponents');
          } else {
            results.missing.push('cardComponents');
          }

          return results;
        }, expectedFeatures);

        validationResults.missingVsExpected[pageConfig.name] = {
          expected: Object.keys(expectedFeatures),
          found: featureAnalysis.found,
          missing: featureAnalysis.missing,
          partial: featureAnalysis.partial,
          expectedDescriptions: expectedFeatures,
          timestamp: new Date().toISOString()
        };

        console.log(`✓ Feature analysis completed for ${pageConfig.name}`);
        console.log(`  - Found: ${featureAnalysis.found.length} features`);
        console.log(`  - Missing: ${featureAnalysis.missing.length} features`);

      } catch (error) {
        console.error(`✗ Error analyzing features for ${pageConfig.name}:`, error.message);
      }
    }
  });

  test.afterAll(async () => {
    // Generate comprehensive report
    const reportPath = '/workspaces/agent-feed/tests/screenshots/css-validation-report.json';

    // Add summary statistics
    validationResults.summary = {
      totalPages: pages.length,
      totalViewports: viewports.length,
      totalScreenshots: Object.keys(validationResults.pages).length * viewports.length,
      cssRequestsTotal: validationResults.networkRequests.reduce((sum, page) =>
        sum + (page.cssRequests ? page.cssRequests.length : 0), 0),
      responsiveTestsCompleted: Object.keys(validationResults.responsiveTests).length * viewports.length,
      completedAt: new Date().toISOString()
    };

    // Write comprehensive report
    fs.writeFileSync(reportPath, JSON.stringify(validationResults, null, 2));
    console.log(`\n✓ Comprehensive CSS validation report saved to: ${reportPath}`);

    // Generate human-readable summary
    const summaryPath = '/workspaces/agent-feed/tests/screenshots/css-validation-summary.md';
    let summary = `# CSS Validation Report\n\n`;
    summary += `**Generated:** ${validationResults.timestamp}\n\n`;
    summary += `## Summary Statistics\n\n`;
    summary += `- **Pages Tested:** ${validationResults.summary.totalPages}\n`;
    summary += `- **Viewports Tested:** ${validationResults.summary.totalViewports}\n`;
    summary += `- **Screenshots Taken:** ${validationResults.summary.totalScreenshots}\n`;
    summary += `- **CSS Requests Found:** ${validationResults.summary.cssRequestsTotal}\n\n`;

    summary += `## Pages Analyzed\n\n`;
    Object.keys(validationResults.pages).forEach(pageName => {
      summary += `### ${pageName.toUpperCase()} Page\n\n`;
      const pageData = validationResults.pages[pageName];

      if (pageData.styleAnalysis) {
        summary += `**Style Analysis:**\n`;
        summary += `- Gradient Background: ${pageData.styleAnalysis.hasGradientBackground ? '✓' : '✗'}\n`;
        summary += `- Tailwind Classes: ${pageData.styleAnalysis.hasTailwindClasses ? '✓' : '✗'}\n`;
        summary += `- Expected Colors: ${pageData.styleAnalysis.hasExpectedColors ? '✓' : '✗'}\n`;
        summary += `- Flex Layout: ${pageData.styleAnalysis.hasFlexLayout ? '✓' : '✗'}\n`;
        summary += `- Element Count: ${pageData.styleAnalysis.elementCount}\n`;
        summary += `- CSS Class Count: ${pageData.styleAnalysis.cssClassCount}\n\n`;
      }
    });

    summary += `## Missing vs Expected Features\n\n`;
    Object.keys(validationResults.missingVsExpected).forEach(pageName => {
      if (pageName !== 'missing' && pageName !== 'expected' && pageName !== 'actual') {
        const features = validationResults.missingVsExpected[pageName];
        if (features) {
          summary += `### ${pageName.toUpperCase()} Page Features\n\n`;
          summary += `**Found (${features.found.length}):** ${features.found.join(', ')}\n\n`;
          summary += `**Missing (${features.missing.length}):** ${features.missing.join(', ')}\n\n`;
        }
      }
    });

    summary += `## Responsive Test Results\n\n`;
    Object.keys(validationResults.responsiveTests).forEach(pageName => {
      summary += `### ${pageName.toUpperCase()} Page\n\n`;
      const responsiveData = validationResults.responsiveTests[pageName];
      Object.keys(responsiveData).forEach(viewport => {
        const test = responsiveData[viewport];
        summary += `**${viewport}:** ${test.layoutBreaks ? '✗ Layout breaks' : '✓ Layout OK'} `;
        summary += `(${test.width}x${test.height})\n`;
      });
      summary += `\n`;
    });

    fs.writeFileSync(summaryPath, summary);
    console.log(`✓ Human-readable summary saved to: ${summaryPath}`);
  });
});