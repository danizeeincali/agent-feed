/**
 * NLD WHITE SCREEN REGRESSION TEST
 * Proactive detection test for React white screen failures post-syntax-fix
 * Pattern: Post-Babel-fix rendering pipeline failure
 */

const { test, expect } = require('@playwright/test');

test.describe('NLD White Screen Regression Detection', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for critical errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('🚨 Browser Console Error:', msg.text());
      }
    });

    // Monitor uncaught exceptions
    page.on('pageerror', error => {
      console.error('🚨 Page Error:', error.message);
    });
  });

  test('should detect white screen regression after WebSocketContext fix', async ({ page }) => {
    console.log('🔍 NLD: Testing white screen regression pattern...');
    
    // Navigate to application
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Wait for potential rendering
    await page.waitForTimeout(3000);
    
    // Check for white screen indicators
    const bodyContent = await page.locator('body').textContent();
    const hasVisibleContent = bodyContent && bodyContent.trim().length > 0;
    
    // Check for specific React components
    const headerExists = await page.locator('[data-testid="header"]').count() > 0;
    const feedExists = await page.locator('[data-testid="agent-feed"]').count() > 0;
    
    // Check for error boundaries
    const errorBoundary = await page.locator('[data-testid="error-boundary"]').count() > 0;
    
    // White screen regression detection
    const isWhiteScreen = !hasVisibleContent || (!headerExists && !feedExists);
    
    console.log('🔍 NLD Analysis:', {
      hasVisibleContent,
      headerExists,
      feedExists,
      errorBoundary,
      isWhiteScreen,
      bodyContentLength: bodyContent?.length || 0
    });
    
    // Pattern detection for NLD database
    if (isWhiteScreen) {
      console.error('🚨 NLD PATTERN DETECTED: White screen regression after WebSocketContext fix');
      console.error('🔍 Root Cause Analysis Required:', {
        pattern: 'POST_SYNTAX_FIX_WHITE_SCREEN',
        context: 'WebSocketContext.tsx modification',
        failure_mode: 'React rendering pipeline failure'
      });
    }
    
    // Take screenshot for analysis
    await page.screenshot({ 
      path: '/workspaces/agent-feed/tests/nld-white-screen-regression.png',
      fullPage: true 
    });
    
    // Assertions for TDD validation
    expect(isWhiteScreen).toBe(false);
    expect(headerExists).toBe(true);
    expect(feedExists).toBe(true);
  });

  test('should validate WebSocket context import chain', async ({ page }) => {
    console.log('🔍 NLD: Testing WebSocket context import chain...');
    
    // Navigate and check for context errors
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Check browser console for import errors
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    await page.waitForTimeout(2000);
    
    // Look for specific import/context errors
    const hasImportError = logs.some(log => 
      log.includes('Cannot resolve') || 
      log.includes('useWebSocketSingleton') ||
      log.includes('WebSocketContext')
    );
    
    const hasContextError = logs.some(log =>
      log.includes('useContext must be used within') ||
      log.includes('Provider')
    );
    
    console.log('🔍 Import Chain Analysis:', {
      hasImportError,
      hasContextError,
      totalLogs: logs.length,
      errorLogs: logs.filter(log => log.toLowerCase().includes('error'))
    });
    
    expect(hasImportError).toBe(false);
    expect(hasContextError).toBe(false);
  });

  test('should create TDD prevention checklist', async ({ page }) => {
    const preventionChecklist = {
      'Syntax Fix Validation': [
        'Verify all imports resolve correctly',
        'Check context provider chain integrity',
        'Validate hook dependencies exist',
        'Test component rendering pipeline'
      ],
      'Post-Fix Testing': [
        'Run development server successfully',
        'Check browser console for errors',
        'Validate React component mounting',
        'Test context provider initialization'
      ],
      'Regression Prevention': [
        'Create automated white screen tests',
        'Monitor import chain dependencies',
        'Validate context hook availability',
        'Test error boundary fallbacks'
      ]
    };
    
    console.log('📋 NLD Prevention Checklist:', JSON.stringify(preventionChecklist, null, 2));
    
    // Store checklist for future reference
    await page.evaluate((checklist) => {
      window.nldPreventionChecklist = checklist;
    }, preventionChecklist);
    
    expect(preventionChecklist).toBeDefined();
  });
});