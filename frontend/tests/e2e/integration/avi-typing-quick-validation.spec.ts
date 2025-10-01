/**
 * Quick Production Validation: Avi Typing Animation UX
 *
 * Fast validation of critical visual requirements without waiting for full responses
 */

import { test, expect } from '@playwright/test';

test.describe('Avi Typing Animation - Quick Validation', () => {
  test('Complete UX validation - All requirements in one test', async ({ page }) => {
    console.log('🚀 Starting Avi Typing Animation UX Validation');

    // Navigate to app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Open Avi DM tab
    await page.click('button:has-text("Avi DM")');
    await page.waitForTimeout(500);

    console.log('✅ Avi DM tab opened');

    // Take screenshot #1: Empty chat state
    await page.screenshot({
      path: '/workspaces/agent-feed/validation-screenshots/final-avi-typing-1-empty.png',
      fullPage: true
    });
    console.log('📸 Screenshot 1: Empty chat state');

    // Type message and send
    const messageInput = page.locator('input[placeholder*="Type your message"]');
    await messageInput.fill('test typing animation');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    // Wait for typing indicator to appear (should be fast - under 200ms)
    const typingIndicator = page.locator('.avi-wave-text-inline');
    const startTime = Date.now();
    await typingIndicator.waitFor({ state: 'visible', timeout: 500 });
    const appearTime = Date.now() - startTime;

    console.log(`⏱️  Typing indicator appeared in ${appearTime}ms`);
    expect(appearTime).toBeLessThan(200);

    // Wait for animation to be clearly visible
    await page.waitForTimeout(400);

    // Take screenshot #2: Typing indicator visible
    await page.screenshot({
      path: '/workspaces/agent-feed/validation-screenshots/final-avi-typing-2-indicator.png',
      fullPage: true
    });
    console.log('📸 Screenshot 2: Typing indicator visible in chat');

    // ========== VALIDATION 1: Visual Integration ==========
    console.log('\n🔍 VALIDATION 1: Visual Integration');

    const typingMessage = page.locator('div.p-3.rounded-lg:has(.avi-wave-text-inline)');
    await expect(typingMessage).toBeVisible();

    // Check styles
    const styles = await typingMessage.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor,
        borderWidth: computed.borderWidth,
        position: computed.position,
      };
    });

    console.log('📊 Typing message styles:', styles);

    // White background
    expect(styles.backgroundColor).toMatch(/rgb\(255,\s*255,\s*255\)/);
    console.log('✅ White background (matches Avi messages)');

    // Has border
    expect(styles.borderWidth).not.toBe('0px');
    console.log('✅ Has border (matches Avi style)');

    // Not absolutely positioned
    expect(styles.position).not.toBe('absolute');
    console.log('✅ Not absolutely positioned (integrated in chat)');

    // ========== VALIDATION 2: Text Content ==========
    console.log('\n🔍 VALIDATION 2: Text Content');

    const typingText = await typingIndicator.textContent();
    console.log(`📝 Typing indicator text: "${typingText}"`);

    // NO "is typing..." text
    expect(typingText?.toLowerCase()).not.toContain('typing');
    expect(typingText?.toLowerCase()).not.toContain('is typing');
    console.log('✅ No "is typing..." text');

    // Valid animation frame
    const validFrames = ['A v i', 'Λ v i', 'Λ V i', 'Λ V !', 'A v !', 'A V !', 'A V i'];
    const isValidFrame = validFrames.some(frame => typingText === frame);
    expect(isValidFrame).toBe(true);
    console.log(`✅ Shows valid animation frame: "${typingText}"`);

    // ========== VALIDATION 3: Single Gray Color ==========
    console.log('\n🔍 VALIDATION 3: Color Validation');

    const colorInfo = await typingIndicator.evaluate((el) => {
      const color = window.getComputedStyle(el).color;

      // Convert rgb to hex
      const rgb = color.match(/\d+/g);
      let hex = 'unknown';

      if (rgb && rgb.length >= 3) {
        hex = '#' + [rgb[0], rgb[1], rgb[2]].map(x => {
          const h = parseInt(x).toString(16);
          return h.length === 1 ? '0' + h : h;
        }).join('').toUpperCase();
      }

      return {
        rgb: color,
        hex,
        expected: '#6B7280'
      };
    });

    console.log('🎨 Color:', colorInfo);

    // Verify gray color
    expect(colorInfo.hex).toBe('#6B7280');
    console.log('✅ Single gray color #6B7280 (NOT ROYGBIV)');

    // ========== VALIDATION 4: Animation Frames ==========
    console.log('\n🔍 VALIDATION 4: Animation Cycling');

    const observedFrames = new Set<string>();
    const observedColors = new Set<string>();

    // Sample 5 frames
    for (let i = 0; i < 5; i++) {
      const text = await typingIndicator.textContent();
      const color = await typingIndicator.evaluate((el) =>
        window.getComputedStyle(el).color
      );

      if (text) observedFrames.add(text);
      observedColors.add(color);

      console.log(`  Frame ${i + 1}: "${text}" - ${color}`);

      await page.waitForTimeout(200);
    }

    // All frames are valid
    observedFrames.forEach(frame => {
      expect(validFrames).toContain(frame);
    });
    console.log('✅ All observed frames are valid');

    // All frames same color
    expect(observedColors.size).toBe(1);
    console.log('✅ All frames use same gray color');

    // Multiple frames observed (animation working)
    expect(observedFrames.size).toBeGreaterThanOrEqual(2);
    console.log(`✅ Animation cycling (${observedFrames.size} different frames)`);

    // Take screenshot during animation
    await page.screenshot({
      path: '/workspaces/agent-feed/validation-screenshots/final-avi-typing-3-animated.png',
      fullPage: true
    });
    console.log('📸 Screenshot 3: Animation in progress');

    // ========== VALIDATION 5: Chat Integration ==========
    console.log('\n🔍 VALIDATION 5: Chat Integration');

    const chatContainer = page.locator('div.h-64.border.border-gray-200.rounded-lg');

    // Inside chat container
    const isInside = await typingMessage.evaluate((el, containerEl) => {
      return containerEl?.contains(el) || false;
    }, await chatContainer.elementHandle());

    expect(isInside).toBe(true);
    console.log('✅ Typing indicator inside chat container');

    // In message list
    const allMessages = chatContainer.locator('div.p-3.rounded-lg');
    const messageCount = await allMessages.count();
    expect(messageCount).toBeGreaterThan(0);
    console.log(`✅ Appears in message list (${messageCount} messages)`);

    // At bottom of chat
    const lastMessage = allMessages.last();
    const typingBox = await typingMessage.boundingBox();
    const lastBox = await lastMessage.boundingBox();

    expect(typingBox?.y).toBe(lastBox?.y);
    console.log('✅ Positioned at bottom of chat');

    // Left-aligned (Avi side)
    const alignment = await typingMessage.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.marginLeft === 'auto' ? 'right' : 'left';
    });

    expect(alignment).toBe('left');
    console.log('✅ Left-aligned (Avi side, not user side)');

    // ========== VALIDATION 6: Console Errors ==========
    console.log('\n🔍 VALIDATION 6: Console Errors');

    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    // Wait a bit more to catch any errors
    await page.waitForTimeout(1000);

    if (consoleErrors.length > 0) {
      console.log('❌ Console errors found:', consoleErrors);
    }

    expect(consoleErrors.length).toBe(0);
    console.log('✅ Zero console errors');

    // ========== FINAL SUMMARY ==========
    console.log('\n' + '='.repeat(60));
    console.log('✅ VALIDATION COMPLETE - ALL TESTS PASSED');
    console.log('='.repeat(60));
    console.log('\nKey Results:');
    console.log(`  ✅ Appears as chat message (not floating)`);
    console.log(`  ✅ White background with border (matches Avi style)`);
    console.log(`  ✅ Shows only animated "Avi" (no "is typing" text)`);
    console.log(`  ✅ Single gray color #6B7280 (NOT ROYGBIV)`);
    console.log(`  ✅ Animation cycles through multiple frames`);
    console.log(`  ✅ Integrated in chat container (left-aligned)`);
    console.log(`  ✅ Zero console errors`);
    console.log(`  ⏱️  Appeared in ${appearTime}ms (< 200ms requirement)`);
    console.log('\nScreenshots saved:');
    console.log('  📸 final-avi-typing-1-empty.png');
    console.log('  📸 final-avi-typing-2-indicator.png');
    console.log('  📸 final-avi-typing-3-animated.png');
  });
});
