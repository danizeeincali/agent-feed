import { test, expect, Page } from '@playwright/test';

const SERVER_URL = 'http://localhost:5173';

interface DOMAnalysis {
  componentName: string;
  hasContainer: boolean;
  hasMentionInput: boolean;
  hasTextarea: boolean;
  hasDropdownContainer: boolean;
  dropdownVisible: boolean;
  debugMenuVisible: boolean;
  cssClasses: string[];
  eventHandlers: string[];
  domStructure: string;
  screenshots: string[];
  errors: string[];
}

test.describe('🚨 CRITICAL DOM INSPECTION: Working vs Broken Components', () => {
  let analyses: DOMAnalysis[] = [];

  async function captureDetailedDOMAnalysis(
    page: Page, 
    componentName: string, 
    containerSelector: string,
    inputSelector: string
  ): Promise<DOMAnalysis> {
    const analysis: DOMAnalysis = {
      componentName,
      hasContainer: false,
      hasMentionInput: false,
      hasTextarea: false,
      hasDropdownContainer: false,
      dropdownVisible: false,
      debugMenuVisible: false,
      cssClasses: [],
      eventHandlers: [],
      domStructure: '',
      screenshots: [],
      errors: []
    };

    try {
      // Step 1: Check container existence
      const container = page.locator(containerSelector);
      analysis.hasContainer = await container.count() > 0;
      
      if (analysis.hasContainer) {
        analysis.cssClasses = await container.getAttribute('class')?.then(c => c?.split(' ') || []) || [];
        analysis.domStructure = await container.innerHTML();
      }

      // Step 2: Check MentionInput component
      const mentionInput = page.locator(inputSelector);
      analysis.hasMentionInput = await mentionInput.count() > 0;

      // Step 3: Check textarea specifically
      const textarea = page.locator(`${containerSelector} textarea, ${inputSelector} textarea, textarea[placeholder*="mention"]`);
      analysis.hasTextarea = await textarea.count() > 0;

      // Step 4: Take screenshot before interaction
      const beforeScreenshot = `${componentName}-before-typing.png`;
      await page.screenshot({ path: `frontend/test-results/${beforeScreenshot}`, fullPage: true });
      analysis.screenshots.push(beforeScreenshot);

      // Step 5: Try to interact with the input
      if (analysis.hasTextarea) {
        console.log(`🎯 ${componentName}: Found textarea, attempting to type @`);
        
        // Clear and focus
        await textarea.first().clear();
        await textarea.first().click();
        await textarea.first().fill('@');
        await page.waitForTimeout(500); // Give time for dropdown

        // Check for dropdown after typing
        const dropdownSelectors = [
          '[data-testid="mention-dropdown"]',
          '.mention-dropdown',
          '[class*="dropdown"]',
          '[style*="z-index: 99999"]',
          '.absolute',
          '.fixed'
        ];

        for (const selector of dropdownSelectors) {
          const dropdown = page.locator(selector);
          if (await dropdown.count() > 0) {
            analysis.hasDropdownContainer = true;
            analysis.dropdownVisible = await dropdown.isVisible();
            break;
          }
        }

        // Check for debug menu specifically
        const debugMenu = page.locator('[data-testid="debug-menu"], .debug-menu, [class*="debug"]');
        analysis.debugMenuVisible = await debugMenu.count() > 0 && await debugMenu.first().isVisible();

        // Take screenshot after typing
        const afterScreenshot = `${componentName}-after-typing.png`;
        await page.screenshot({ path: `frontend/test-results/${afterScreenshot}`, fullPage: true });
        analysis.screenshots.push(afterScreenshot);
      }

      // Step 6: Capture any console errors
      const consoleMessages = await page.evaluate(() => {
        const errors = [];
        // @ts-ignore
        if (window.__consoleErrors) {
          // @ts-ignore
          errors.push(...window.__consoleErrors);
        }
        return errors;
      });
      analysis.errors = consoleMessages;

    } catch (error) {
      analysis.errors.push(`Analysis error: ${error.message}`);
    }

    return analysis;
  }

  test('Phase 1: Working QuickPost DOM Analysis', async ({ page }) => {
    console.log('🔍 Phase 1: Analyzing WORKING QuickPost component');
    
    // Capture console errors
    await page.addInitScript(() => {
      // @ts-ignore
      window.__consoleErrors = [];
      const originalConsoleError = console.error;
      console.error = (...args) => {
        // @ts-ignore
        window.__consoleErrors.push(args.join(' '));
        originalConsoleError(...args);
      };
    });

    await page.goto(`${SERVER_URL}/posting`);
    await page.waitForLoadState('networkidle');

    const analysis = await captureDetailedDOMAnalysis(
      page,
      'QuickPost',
      '[data-testid="quick-post"], .quick-post, .posting-interface',
      '[data-testid="mention-input"], .mention-input, textarea'
    );

    analyses.push(analysis);

    console.log('✅ QuickPost Analysis:', {
      hasContainer: analysis.hasContainer,
      hasMentionInput: analysis.hasMentionInput,
      hasTextarea: analysis.hasTextarea,
      dropdownVisible: analysis.dropdownVisible,
      debugMenuVisible: analysis.debugMenuVisible,
      errors: analysis.errors.length
    });

    expect(analysis.hasContainer, 'QuickPost should have container').toBe(true);
    expect(analysis.hasTextarea, 'QuickPost should have textarea').toBe(true);
  });

  test('Phase 2: Broken PostCreator DOM Analysis', async ({ page }) => {
    console.log('🔍 Phase 2: Analyzing BROKEN PostCreator component');

    // Capture console errors
    await page.addInitScript(() => {
      // @ts-ignore
      window.__consoleErrors = [];
      const originalConsoleError = console.error;
      console.error = (...args) => {
        // @ts-ignore
        window.__consoleErrors.push(args.join(' '));
        originalConsoleError(...args);
      };
    });

    await page.goto(SERVER_URL);
    await page.waitForLoadState('networkidle');

    // Open PostCreator modal
    const createPostButton = page.locator('button:has-text("Start a post"), .post-creator-trigger, [data-testid="create-post"]');
    await createPostButton.first().click();
    await page.waitForTimeout(1000);

    const analysis = await captureDetailedDOMAnalysis(
      page,
      'PostCreator',
      '[data-testid="post-creator-modal"], .post-creator-modal, .modal',
      '[data-testid="mention-input"], .mention-input, textarea'
    );

    analyses.push(analysis);

    console.log('❌ PostCreator Analysis:', {
      hasContainer: analysis.hasContainer,
      hasMentionInput: analysis.hasMentionInput,
      hasTextarea: analysis.hasTextarea,
      dropdownVisible: analysis.dropdownVisible,
      debugMenuVisible: analysis.debugMenuVisible,
      errors: analysis.errors.length
    });

    expect(analysis.hasContainer, 'PostCreator should have container').toBe(true);
  });

  test('Phase 3: Broken CommentForm DOM Analysis', async ({ page }) => {
    console.log('🔍 Phase 3: Analyzing BROKEN CommentForm component');

    // Capture console errors
    await page.addInitScript(() => {
      // @ts-ignore
      window.__consoleErrors = [];
      const originalConsoleError = console.error;
      console.error = (...args) => {
        // @ts-ignore
        window.__consoleErrors.push(args.join(' '));
        originalConsoleError(...args);
      };
    });

    await page.goto(SERVER_URL);
    await page.waitForLoadState('networkidle');

    // Find a post and open reply
    const replyButton = page.locator('[data-testid="reply-button"], button:has-text("Reply"), .reply-btn').first();
    if (await replyButton.count() > 0) {
      await replyButton.click();
      await page.waitForTimeout(1000);
    }

    const analysis = await captureDetailedDOMAnalysis(
      page,
      'CommentForm',
      '[data-testid="comment-form"], .comment-form, .reply-form',
      '[data-testid="mention-input"], .mention-input, textarea'
    );

    analyses.push(analysis);

    console.log('❌ CommentForm Analysis:', {
      hasContainer: analysis.hasContainer,
      hasMentionInput: analysis.hasMentionInput,
      hasTextarea: analysis.hasTextarea,
      dropdownVisible: analysis.dropdownVisible,
      debugMenuVisible: analysis.debugMenuVisible,
      errors: analysis.errors.length
    });
  });

  test('Phase 4: Generate Comprehensive Comparison Report', async ({ page }) => {
    console.log('📊 Phase 4: Creating comprehensive DOM comparison report');

    const working = analyses.find(a => a.componentName === 'QuickPost');
    const brokenPostCreator = analyses.find(a => a.componentName === 'PostCreator');
    const brokenCommentForm = analyses.find(a => a.componentName === 'CommentForm');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        working: {
          component: 'QuickPost',
          hasDropdown: working?.dropdownVisible || false,
          hasDebugMenu: working?.debugMenuVisible || false,
          hasTextarea: working?.hasTextarea || false,
          errors: working?.errors.length || 0
        },
        broken: [
          {
            component: 'PostCreator',
            hasDropdown: brokenPostCreator?.dropdownVisible || false,
            hasDebugMenu: brokenPostCreator?.debugMenuVisible || false,
            hasTextarea: brokenPostCreator?.hasTextarea || false,
            errors: brokenPostCreator?.errors.length || 0
          },
          {
            component: 'CommentForm',
            hasDropdown: brokenCommentForm?.dropdownVisible || false,
            hasDebugMenu: brokenCommentForm?.debugMenuVisible || false,
            hasTextarea: brokenCommentForm?.hasTextarea || false,
            errors: brokenCommentForm?.errors.length || 0
          }
        ]
      },
      detailedAnalysis: analyses,
      criticalFindings: {
        dropdownRenderingIssue: analyses.filter(a => a.componentName !== 'QuickPost').every(a => !a.dropdownVisible),
        textareaAvailability: analyses.map(a => ({ component: a.componentName, hasTextarea: a.hasTextarea })),
        errorPatterns: analyses.reduce((acc, a) => {
          acc[a.componentName] = a.errors;
          return acc;
        }, {} as Record<string, string[]>)
      },
      recommendations: [
        'Compare working QuickPost DOM structure with broken components',
        'Check for missing MentionInput component instantiation in broken components',
        'Verify event handler attachment in broken components',
        'Ensure dropdown z-index and positioning CSS is consistent',
        'Validate component prop passing in broken implementations'
      ]
    };

    // Save report
    await page.evaluate((reportData) => {
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'emergency-dom-inspection-report.json';
      a.click();
      URL.revokeObjectURL(url);
    }, report);

    console.log('✅ DOM Inspection Report Generated:', {
      totalComponents: analyses.length,
      workingComponents: analyses.filter(a => a.dropdownVisible).length,
      brokenComponents: analyses.filter(a => !a.dropdownVisible && a.componentName !== 'QuickPost').length,
      screenshotsCaptured: analyses.reduce((total, a) => total + a.screenshots.length, 0)
    });

    // Take final comprehensive screenshot
    await page.goto(SERVER_URL);
    await page.screenshot({ path: 'frontend/test-results/final-dom-inspection-overview.png', fullPage: true });

    expect(working?.dropdownVisible, 'QuickPost should have working dropdown').toBeTruthy();
  });
});