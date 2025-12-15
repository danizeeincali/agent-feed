import { test } from '@playwright/test';

test('investigate actual rendered text color', async ({ page }) => {
  await page.goto('http://localhost:5173/agents/page-builder-agent/pages/component-showcase-complete-v3');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Take a screenshot
  await page.screenshot({ path: 'investigate-full-page.png', fullPage: true });

  // Find the specific text the user mentioned
  const tab1Text = page.locator('text=Tab 1: Overview & Introduction').first();

  console.log('=== INVESTIGATION REPORT ===');
  console.log('');

  if (await tab1Text.count() > 0) {
    console.log('✅ Found "Tab 1: Overview & Introduction" text');

    // Get the element
    const heading = tab1Text.locator('xpath=ancestor::*[self::h1 or self::h2 or self::h3 or self::h4 or self::h5 or self::h6]').first();

    if (await heading.count() > 0) {
      // Get ALL computed styles
      const styles = await heading.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          classList: el.className,
          tagName: el.tagName,
          innerHTML: el.innerHTML.substring(0, 100)
        };
      });

      console.log('Heading tag:', styles.tagName);
      console.log('Heading classes:', styles.classList);
      console.log('Heading computed color:', styles.color);
      console.log('Heading innerHTML:', styles.innerHTML);
    }
  } else {
    console.log('❌ Could NOT find "Tab 1: Overview & Introduction" text');
  }

  // Check the markdown container
  const markdownContainer = page.locator('.markdown-renderer').first();

  if (await markdownContainer.count() > 0) {
    const containerClasses = await markdownContainer.getAttribute('class');
    console.log('');
    console.log('Markdown container classes:', containerClasses);
    console.log('Has prose class?', containerClasses?.includes('prose'));
  } else {
    console.log('❌ Could NOT find .markdown-renderer');
  }

  // Check all paragraphs
  const paragraphs = page.locator('.markdown-renderer p');
  const pCount = await paragraphs.count();

  console.log('');
  console.log(`Found ${pCount} paragraphs`);

  if (pCount > 0) {
    const firstP = paragraphs.first();
    const pStyles = await firstP.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        classList: el.className,
        text: el.textContent?.substring(0, 100)
      };
    });

    console.log('First paragraph classes:', pStyles.classList);
    console.log('First paragraph color:', pStyles.color);
    console.log('First paragraph text:', pStyles.text);
  }

  // Check for ANY prose-related CSS
  const hasProseCss = await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    let foundProseRules = [];

    for (const sheet of sheets) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        for (const rule of rules) {
          if (rule instanceof CSSStyleRule && rule.selectorText?.includes('prose')) {
            foundProseRules.push({
              selector: rule.selectorText,
              color: (rule.style as any).color
            });
          }
        }
      } catch (e) {
        // CORS or security - skip
      }
    }

    return foundProseRules;
  });

  console.log('');
  console.log('Prose CSS rules found:', hasProseCss.length);
  if (hasProseCss.length > 0) {
    console.log('Prose rules:', JSON.stringify(hasProseCss, null, 2));
  }

  // Check the actual build file
  console.log('');
  console.log('=== Checking MarkdownRenderer.tsx source ===');

  const sourceCheck = await page.evaluate(() => {
    // Try to find the React component in the page
    const containers = document.querySelectorAll('.markdown-renderer');
    return {
      count: containers.length,
      firstContainerClass: containers[0]?.className || 'none'
    };
  });

  console.log('Markdown containers found:', sourceCheck.count);
  console.log('First container className:', sourceCheck.firstContainerClass);

  console.log('');
  console.log('=== END INVESTIGATION ===');
});
