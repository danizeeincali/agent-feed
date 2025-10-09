const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navigating to page...');
  await page.goto('http://localhost:5173/agents/page-builder-agent/pages/component-showcase-complete-v3');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('\n=== INVESTIGATION REPORT ===\n');

  // 1. Check if MarkdownRenderer exists
  const markdownContainer = await page.locator('.markdown-renderer').first();
  const containerCount = await markdownContainer.count();

  if (containerCount > 0) {
    const className = await markdownContainer.getAttribute('class');
    console.log('✅ Found .markdown-renderer');
    console.log('   Classes:', className);
    console.log('   Has "prose"?', className.includes('prose') ? '❌ YES (BAD)' : '✅ NO (GOOD)');
  } else {
    console.log('❌ .markdown-renderer NOT FOUND');
  }

  // 2. Check for the specific text
  console.log('\n--- Checking "Tab 1: Overview & Introduction" ---');
  const tab1 = await page.locator('text=Tab 1: Overview & Introduction').first();
  const tab1Count = await tab1.count();

  if (tab1Count > 0) {
    console.log('✅ Found the text');

    // Get the parent heading element
    const heading = await page.evaluate(() => {
      const text = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .find(h => h.textContent?.includes('Tab 1: Overview & Introduction'));

      if (text) {
        const computed = window.getComputedStyle(text);
        return {
          tagName: text.tagName,
          className: text.className,
          color: computed.color,
          textContent: text.textContent.substring(0, 50)
        };
      }
      return null;
    });

    if (heading) {
      console.log('   Tag:', heading.tagName);
      console.log('   Classes:', heading.className);
      console.log('   Computed color:', heading.color);
      console.log('   Expected: rgb(17, 24, 39) - text-gray-900');
      console.log('   Match?', heading.color.includes('rgb(17, 24, 39)') ? '✅ YES' : '❌ NO (PROBLEM!)');
    }
  } else {
    console.log('❌ Text not found');
  }

  // 3. Check paragraph colors
  console.log('\n--- Checking Paragraph Colors ---');
  const paragraphData = await page.evaluate(() => {
    const paragraphs = document.querySelectorAll('.markdown-renderer p');
    if (paragraphs.length === 0) return null;

    const firstP = paragraphs[0];
    const computed = window.getComputedStyle(firstP);

    return {
      count: paragraphs.length,
      className: firstP.className,
      color: computed.color,
      textContent: firstP.textContent?.substring(0, 80)
    };
  });

  if (paragraphData) {
    console.log(`✅ Found ${paragraphData.count} paragraphs`);
    console.log('   First paragraph classes:', paragraphData.className);
    console.log('   Computed color:', paragraphData.color);
    console.log('   Expected: rgb(17, 24, 39) - text-gray-900');
    console.log('   Match?', paragraphData.color.includes('rgb(17, 24, 39)') ? '✅ YES' : '❌ NO (PROBLEM!)');
    console.log('   Text:', paragraphData.textContent);
  } else {
    console.log('❌ No paragraphs found');
  }

  // 4. Check for prose CSS rules
  console.log('\n--- Checking for Prose CSS Rules ---');
  const proseCssRules = await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    let rules = [];

    for (const sheet of sheets) {
      try {
        const cssRules = Array.from(sheet.cssRules || []);
        for (const rule of cssRules) {
          if (rule instanceof CSSStyleRule && rule.selectorText && rule.selectorText.includes('prose')) {
            if (rule.style.color) {
              rules.push({
                selector: rule.selectorText,
                color: rule.style.color
              });
            }
          }
        }
      } catch (e) {
        // Skip CORS sheets
      }
    }

    return rules;
  });

  if (proseCssRules.length > 0) {
    console.log(`❌ FOUND ${proseCssRules.length} prose CSS rules (THIS IS THE PROBLEM!):`);
    proseCssRules.forEach(rule => {
      console.log(`   ${rule.selector} { color: ${rule.color}; }`);
    });
  } else {
    console.log('✅ No prose CSS rules found');
  }

  // 5. Take screenshot
  console.log('\n--- Taking Screenshot ---');
  await page.screenshot({ path: '/workspaces/agent-feed/investigate-screenshot.png', fullPage: false });
  console.log('✅ Screenshot saved to /workspaces/agent-feed/investigate-screenshot.png');

  // 6. Check module timestamp
  console.log('\n--- Checking Vite HMR ---');
  const viteInfo = await page.evaluate(() => {
    return {
      hasViteClient: typeof window !== 'undefined' && '__vite__' in window,
      timestamp: Date.now()
    };
  });
  console.log('   Vite client active:', viteInfo.hasViteClient);

  console.log('\n=== END INVESTIGATION ===\n');

  await browser.close();
})();
