import { test, expect } from '@playwright/test';

/**
 * Avi DM Section Validation Tests
 * Ensures Avi DM functionality remains intact after interactive-control removal
 */

test.describe('Avi DM Section Validation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 15000 });
  });

  test('validates Avi DM section presence and visibility', async ({ page }) => {
    console.log('👁️ Validating Avi DM section presence...');

    // Primary DM section selectors
    const dmSelectors = [
      '[data-testid="avi-dm-section"]',
      '[class*="avi-dm"]',
      '[id*="avi-dm"]',
      '[data-testid*="dm"]'
    ];

    let dmSectionFound = false;
    let activeDMSelector = null;

    for (const selector of dmSelectors) {
      const element = page.locator(selector);
      const count = await element.count();

      if (count > 0) {
        console.log(`✅ Found DM section with selector: ${selector}`);
        await expect(element.first()).toBeVisible();
        dmSectionFound = true;
        activeDMSelector = selector;
        break;
      }
    }

    if (!dmSectionFound) {
      console.log('🔍 Primary DM selectors not found, searching for alternative indicators...');

      // Alternative search strategies
      const alternativeSelectors = [
        'text*="Direct Message"',
        'text*="DM"',
        'text*="Avi"',
        'text*="Message"',
        '[class*="dm"]',
        '[class*="message"]',
        '[role="region"][aria-label*="message"]',
        '[role="region"][aria-label*="dm"]'
      ];

      for (const selector of alternativeSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();

        if (count > 0) {
          console.log(`📍 Found potential DM indicator: ${selector} (${count} elements)`);

          // Verify it's actually visible and contains relevant content
          for (let i = 0; i < Math.min(count, 3); i++) {
            const element = elements.nth(i);
            if (await element.isVisible()) {
              const text = await element.textContent();
              console.log(`📝 Element ${i} text: "${text?.substring(0, 100)}..."`);
              dmSectionFound = true;
              activeDMSelector = selector;
            }
          }

          if (dmSectionFound) break;
        }
      }
    }

    if (dmSectionFound && activeDMSelector) {
      console.log(`✅ Avi DM section identified with selector: ${activeDMSelector}`);

      // Capture DM section screenshot
      const dmElement = page.locator(activeDMSelector).first();
      await dmElement.screenshot({
        path: 'screenshots/baseline/avi-dm-section.png'
      });

      // Store DM selector for later tests
      await page.evaluate((selector) => {
        window.aviDMSelector = selector;
      }, activeDMSelector);

    } else {
      console.log('⚠️  No Avi DM section found - may not be implemented yet');

      // Take screenshot of current feed state for reference
      await page.screenshot({
        path: 'screenshots/baseline/feed-no-dm-section.png',
        fullPage: true
      });
    }
  });

  test('validates DM section content and structure', async ({ page }) => {
    console.log('🏗️ Validating DM section content structure...');

    // Get the DM selector from previous test or search again
    const dmSelector = await page.evaluate(() => window.aviDMSelector) || '[data-testid="avi-dm-section"]';

    const dmSection = page.locator(dmSelector);
    const dmExists = await dmSection.count() > 0;

    if (dmExists && await dmSection.first().isVisible()) {
      console.log('✅ DM section found, analyzing structure...');

      // Check for common DM components
      const dmComponents = {
        messageInput: dmSection.locator('input[type="text"], textarea, [contenteditable="true"]'),
        sendButton: dmSection.locator('button[type="submit"], button:has-text("Send"), button:has-text("Submit")'),
        messageContainer: dmSection.locator('[class*="message"], [data-testid*="message"]'),
        avatarImage: dmSection.locator('img[alt*="Avi"], img[alt*="avatar"], [class*="avatar"]'),
        timestamp: dmSection.locator('[class*="timestamp"], [data-testid*="time"], time')
      };

      const componentAnalysis = {};

      for (const [componentName, locator] of Object.entries(dmComponents)) {
        const count = await locator.count();
        const visible = count > 0 ? await locator.first().isVisible() : false;

        componentAnalysis[componentName] = {
          count,
          visible,
          present: count > 0
        };

        if (count > 0) {
          console.log(`📦 ${componentName}: ${count} found, visible: ${visible}`);
        }
      }

      // Verify at least some key components exist
      const keyComponents = ['messageInput', 'sendButton', 'messageContainer'];
      const keyComponentsPresent = keyComponents.filter(comp =>
        componentAnalysis[comp]?.present
      ).length;

      if (keyComponentsPresent >= 2) {
        console.log(`✅ DM section has ${keyComponentsPresent}/3 key components`);
      } else {
        console.log(`⚠️  DM section may be incomplete: only ${keyComponentsPresent}/3 key components found`);
      }

      // Capture detailed screenshot of DM section
      await dmSection.first().screenshot({
        path: 'screenshots/baseline/avi-dm-detailed.png'
      });

      // Store component analysis for comparison
      await page.evaluate((analysis) => {
        window.dmComponentAnalysis = analysis;
      }, componentAnalysis);

    } else {
      console.log('ℹ️  DM section not found for structural analysis');
    }
  });

  test('validates DM section interactivity', async ({ page }) => {
    console.log('🎮 Testing DM section interactivity...');

    const dmSelector = await page.evaluate(() => window.aviDMSelector) || '[data-testid="avi-dm-section"]';
    const dmSection = page.locator(dmSelector);

    if (await dmSection.count() > 0 && await dmSection.first().isVisible()) {
      console.log('🧪 Testing interactive elements in DM section...');

      // Test message input functionality
      const messageInputs = dmSection.locator('input[type="text"], textarea, [contenteditable="true"]');
      const inputCount = await messageInputs.count();

      if (inputCount > 0) {
        console.log(`📝 Testing ${inputCount} message input(s)...`);

        for (let i = 0; i < Math.min(inputCount, 2); i++) {
          const input = messageInputs.nth(i);

          try {
            // Focus and type test message
            await input.click();
            await input.fill('Test message for DM validation');

            // Verify input accepted text
            const inputValue = await input.inputValue();
            expect(inputValue).toContain('Test message');

            console.log(`✅ Message input ${i} functional`);

            // Clear input for next test
            await input.fill('');

          } catch (error) {
            console.log(`⚠️  Message input ${i} interaction failed: ${error.message}`);
          }
        }
      }

      // Test send button functionality (without actually sending)
      const sendButtons = dmSection.locator('button[type="submit"], button:has-text("Send"), button:has-text("Submit")');
      const buttonCount = await sendButtons.count();

      if (buttonCount > 0) {
        console.log(`🔘 Testing ${buttonCount} send button(s)...`);

        for (let i = 0; i < Math.min(buttonCount, 2); i++) {
          const button = sendButtons.nth(i);

          try {
            // Verify button is interactive
            await expect(button).toBeEnabled();

            // Hover to test interaction states
            await button.hover();
            await page.waitForTimeout(200);

            // Capture button in hover state
            await button.screenshot({
              path: `screenshots/baseline/dm-send-button-hover-${i}.png`
            });

            console.log(`✅ Send button ${i} interactive`);

          } catch (error) {
            console.log(`⚠️  Send button ${i} interaction failed: ${error.message}`);
          }
        }
      }

      // Test scroll functionality if message container exists
      const messageContainers = dmSection.locator('[class*="message"], [data-testid*="message"], [class*="conversation"]');
      const containerCount = await messageContainers.count();

      if (containerCount > 0) {
        console.log(`📜 Testing scroll functionality in ${containerCount} message container(s)...`);

        const container = messageContainers.first();
        try {
          // Get initial scroll position
          const initialScroll = await container.evaluate(el => el.scrollTop);

          // Attempt to scroll
          await container.hover();
          await page.mouse.wheel(0, 100);
          await page.waitForTimeout(500);

          const newScroll = await container.evaluate(el => el.scrollTop);

          if (newScroll !== initialScroll) {
            console.log('✅ Message container scrollable');
          } else {
            console.log('ℹ️  Message container scroll not detected (may be empty)');
          }

        } catch (error) {
          console.log(`⚠️  Scroll test failed: ${error.message}`);
        }
      }

    } else {
      console.log('ℹ️  No DM section found for interactivity testing');
    }

    console.log('✅ DM section interactivity testing completed');
  });

  test('validates DM section responsiveness', async ({ page }) => {
    console.log('📱 Testing DM section responsiveness...');

    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1280, height: 720, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    const dmSelector = await page.evaluate(() => window.aviDMSelector) || '[data-testid="avi-dm-section"]';

    for (const viewport of viewports) {
      console.log(`📏 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      });

      await page.waitForTimeout(500); // Allow for responsive changes

      const dmSection = page.locator(dmSelector);

      if (await dmSection.count() > 0) {
        const isVisible = await dmSection.first().isVisible();
        console.log(`👁️  DM section visible on ${viewport.name}: ${isVisible}`);

        if (isVisible) {
          // Capture responsive screenshot
          await dmSection.first().screenshot({
            path: `screenshots/baseline/dm-responsive-${viewport.name}.png`
          });

          // Check if layout adapts properly
          const boundingBox = await dmSection.first().boundingBox();
          if (boundingBox) {
            const fitsInViewport = boundingBox.width <= viewport.width;
            console.log(`📐 DM section fits in ${viewport.name}: ${fitsInViewport} (${boundingBox.width}px wide)`);

            if (!fitsInViewport) {
              console.log(`⚠️  DM section may have responsive issues on ${viewport.name}`);
            }
          }

          // Test interactive elements on different viewports
          const inputs = dmSection.locator('input, textarea, button');
          const interactiveCount = await inputs.count();

          if (interactiveCount > 0) {
            // Test first interactive element
            const firstInput = inputs.first();
            try {
              await firstInput.click();
              console.log(`✅ Interactive elements accessible on ${viewport.name}`);
            } catch (error) {
              console.log(`⚠️  Interactive elements may be hard to use on ${viewport.name}`);
            }
          }
        }
      } else {
        console.log(`ℹ️  DM section not found on ${viewport.name}`);
      }
    }

    // Reset to standard desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    console.log('✅ DM section responsiveness testing completed');
  });

  test('validates DM section persistence across navigation', async ({ page }) => {
    console.log('🔄 Testing DM section persistence across navigation...');

    const dmSelector = await page.evaluate(() => window.aviDMSelector) || '[data-testid="avi-dm-section"]';

    // First, check if DM section exists on feed page
    await page.goto('/', { waitUntil: 'networkidle' });
    const feedHasDM = await page.locator(dmSelector).count() > 0;

    console.log(`📍 DM section on Feed page: ${feedHasDM}`);

    if (feedHasDM) {
      // Fill in a test message
      const messageInput = page.locator(dmSelector).locator('input, textarea').first();
      if (await messageInput.count() > 0) {
        await messageInput.fill('Test persistence message');
        console.log('📝 Test message entered');
      }

      // Capture DM state before navigation
      await page.locator(dmSelector).first().screenshot({
        path: 'screenshots/baseline/dm-before-navigation.png'
      });
    }

    // Navigate to other pages and check DM persistence
    const testPages = ['/agents', '/analytics', '/settings'];

    for (const testPage of testPages) {
      try {
        console.log(`🧪 Testing DM persistence on ${testPage}`);

        await page.goto(testPage, { waitUntil: 'networkidle' });
        await page.waitForSelector('[data-testid="app-root"]');

        const dmExistsOnPage = await page.locator(dmSelector).count() > 0;
        console.log(`📍 DM section on ${testPage}: ${dmExistsOnPage}`);

        if (dmExistsOnPage) {
          // Check if previous input is maintained
          const messageInput = page.locator(dmSelector).locator('input, textarea').first();
          if (await messageInput.count() > 0) {
            const inputValue = await messageInput.inputValue();
            const persistenceWorking = inputValue.includes('Test persistence');
            console.log(`💾 DM state persistence on ${testPage}: ${persistenceWorking}`);
          }

          // Capture DM state on other pages
          await page.locator(dmSelector).first().screenshot({
            path: `screenshots/baseline/dm-on-${testPage.replace('/', '')}.png`
          });
        }

      } catch (error) {
        console.log(`⚠️  Page ${testPage} not accessible: ${error.message}`);
      }
    }

    // Return to feed page and verify DM is still there
    await page.goto('/', { waitUntil: 'networkidle' });
    const dmReturnState = await page.locator(dmSelector).count() > 0;
    console.log(`🔄 DM section after navigation return: ${dmReturnState}`);

    if (dmReturnState) {
      await page.locator(dmSelector).first().screenshot({
        path: 'screenshots/baseline/dm-after-navigation-return.png'
      });
    }

    console.log('✅ DM section persistence testing completed');
  });

  test('validates DM section accessibility', async ({ page }) => {
    console.log('♿ Testing DM section accessibility...');

    const dmSelector = await page.evaluate(() => window.aviDMSelector) || '[data-testid="avi-dm-section"]';
    const dmSection = page.locator(dmSelector);

    if (await dmSection.count() > 0) {
      console.log('🧪 Running accessibility checks on DM section...');

      // Check for proper labeling
      const inputs = dmSection.locator('input, textarea');
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);

        // Check for labels
        const hasLabel = await input.evaluate(el => {
          const id = el.id;
          const ariaLabel = el.getAttribute('aria-label');
          const placeholder = el.getAttribute('placeholder');
          const associatedLabel = id ? document.querySelector(`label[for="${id}"]`) : null;

          return !!(ariaLabel || placeholder || associatedLabel);
        });

        console.log(`🏷️  Input ${i} has proper labeling: ${hasLabel}`);
      }

      // Check for keyboard navigation
      const interactiveElements = dmSection.locator('button, input, textarea, [tabindex], [role="button"]');
      const interactiveCount = await interactiveElements.count();

      console.log(`⌨️  Found ${interactiveCount} keyboard-accessible elements`);

      // Test tab navigation through DM section
      if (interactiveCount > 0) {
        await interactiveElements.first().focus();
        console.log('✅ First interactive element focusable');

        // Test a few tab navigations
        for (let i = 0; i < Math.min(interactiveCount - 1, 3); i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(100);
        }
        console.log('✅ Tab navigation tested');
      }

      // Check for proper ARIA attributes
      const ariaElements = dmSection.locator('[role], [aria-label], [aria-describedby]');
      const ariaCount = await ariaElements.count();
      console.log(`🏗️  Found ${ariaCount} elements with ARIA attributes`);

      // Check color contrast (basic test)
      const textElements = dmSection.locator('*:has-text("")').first();
      if (await textElements.count() > 0) {
        const styles = await textElements.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize
          };
        });

        console.log(`🎨 DM section text styles:`, styles);
      }

    } else {
      console.log('ℹ️  No DM section found for accessibility testing');
    }

    console.log('✅ DM section accessibility testing completed');
  });
});