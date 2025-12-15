/**
 * Production Validation: Avi Typing Animation UX Redesign
 *
 * Tests the complete UX redesign requirements:
 * 1. Single gray color (#6B7280) - NO ROYGBIV
 * 2. No "is typing..." text - just animated "Avi"
 * 3. Appears IN chat history as a message bubble
 * 4. Pushes older messages up naturally
 * 5. White background with gray border (matches Avi messages)
 * 6. Smooth replacement with real response
 */

import { test, expect, Page } from '@playwright/test';
import { chromium } from 'playwright';

test.describe('Avi Typing Animation UX Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');

    // Wait for app to be ready
    await page.waitForLoadState('networkidle');

    // Open Avi DM tab
    await page.click('button:has-text("Avi DM")');
    await page.waitForTimeout(500);
  });

  test('1. Visual Integration Test - Typing indicator appears as chat message', async ({ page }) => {
    console.log('📸 TEST 1: Visual Integration');

    // Take screenshot #1: Empty chat state
    await page.screenshot({
      path: '/workspaces/agent-feed/validation-screenshots/avi-typing-1-empty-chat.png',
      fullPage: true
    });
    console.log('✅ Screenshot 1: Empty chat state saved');

    // Type message and click send
    const messageInput = page.locator('input[placeholder*="Type your message"]');
    await messageInput.fill('hello');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    // Wait for typing indicator to appear (should be within 100ms)
    const startTime = Date.now();
    const typingIndicator = page.locator('.avi-wave-text-inline');
    await typingIndicator.waitFor({ state: 'visible', timeout: 200 });
    const appearTime = Date.now() - startTime;

    console.log(`⏱️  Typing indicator appeared in ${appearTime}ms`);
    expect(appearTime).toBeLessThan(100);

    // Wait a moment for animation to be visible
    await page.waitForTimeout(300);

    // Take screenshot #2: Typing indicator in chat
    await page.screenshot({
      path: '/workspaces/agent-feed/validation-screenshots/avi-typing-2-typing-indicator.png',
      fullPage: true
    });
    console.log('✅ Screenshot 2: Typing indicator visible');

    // VERIFY: Typing indicator appears AS a chat message (not floating)
    const typingMessage = page.locator('div.p-3.rounded-lg:has(.avi-wave-text-inline)');
    await expect(typingMessage).toBeVisible();
    console.log('✅ Typing indicator appears as chat message bubble');

    // VERIFY: Has white background with gray border (matches Avi style)
    const styles = await typingMessage.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor,
        borderWidth: computed.borderWidth,
      };
    });

    // Convert rgb to check it's white
    console.log('📊 Typing message styles:', styles);
    expect(styles.backgroundColor).toMatch(/rgb\(255,\s*255,\s*255\)/);
    expect(styles.borderWidth).not.toBe('0px');
    console.log('✅ Has white background with border');

    // VERIFY: Shows only "Avi" text (wave animation) - NO "is typing..." text
    const typingText = await typingIndicator.textContent();
    console.log('📝 Typing indicator text:', typingText);

    // Should match animation frames (A v i, Λ v i, etc) but NOT contain "is typing"
    expect(typingText?.toLowerCase()).not.toContain('is typing');
    expect(typingText?.toLowerCase()).not.toContain('typing');

    // Should be one of the animation frames
    const validFrames = ['A v i', 'Λ v i', 'Λ V i', 'Λ V !', 'A v !', 'A V !', 'A V i'];
    const matchesFrame = validFrames.some(frame => typingText === frame);
    expect(matchesFrame).toBe(true);
    console.log('✅ Shows only animated "Avi" text, no "is typing..." text');

    // VERIFY: Single gray color (NOT ROYGBIV)
    const color = await typingIndicator.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    console.log('🎨 Typing indicator color:', color);
    // Convert #6B7280 to RGB: rgb(107, 114, 128)
    expect(color).toMatch(/rgb\(107,\s*114,\s*128\)/);
    console.log('✅ Single gray color (#6B7280) - NOT ROYGBIV');

    // VERIFY: Left-aligned (Avi side)
    const alignment = await typingMessage.evaluate((el) => {
      const parent = el.parentElement;
      if (!parent) return 'unknown';

      const computed = window.getComputedStyle(el);
      const marginLeft = computed.marginLeft;
      const marginRight = computed.marginRight;

      // Check if it has ml-auto (margin-left: auto) which means right-aligned
      return marginLeft === 'auto' ? 'right' : 'left';
    });

    expect(alignment).toBe('left');
    console.log('✅ Left-aligned (Avi side)');
  });

  test('2. Message Push Test - Typing indicator pushes messages up', async ({ page }) => {
    console.log('📸 TEST 2: Message Push');

    // Send first message
    const messageInput = page.locator('input[placeholder*="Type your message"]');
    await messageInput.fill('test message 1');
    await page.locator('button:has-text("Send")').click();

    // Wait for response to complete
    await page.waitForTimeout(5000);

    // Send second message and track positions
    const chatContainer = page.locator('div.h-64.border.border-gray-200.rounded-lg');

    // Get initial position of first message
    const firstMessage = chatContainer.locator('div.p-3.rounded-lg').first();
    const initialBox = await firstMessage.boundingBox();

    console.log('📍 Initial position of first message:', initialBox?.y);

    // Send new message
    await messageInput.fill('test message 2');
    await page.locator('button:has-text("Send")').click();

    // Wait for typing indicator to appear
    await page.locator('.avi-wave-text-inline').waitFor({ state: 'visible', timeout: 200 });

    // Get new position of first message
    const newBox = await firstMessage.boundingBox();
    console.log('📍 New position of first message:', newBox?.y);

    // VERIFY: Existing messages moved UP in chat (y position decreased or stayed same)
    if (initialBox && newBox) {
      expect(newBox.y).toBeLessThanOrEqual(initialBox.y);
      console.log('✅ Existing messages moved up (or stayed in place)');
    }

    // VERIFY: Typing indicator at bottom of chat
    const typingIndicator = page.locator('div.p-3.rounded-lg:has(.avi-wave-text-inline)');
    const allMessages = chatContainer.locator('div.p-3.rounded-lg');
    const messageCount = await allMessages.count();
    const lastMessage = allMessages.nth(messageCount - 1);

    const typingBox = await typingIndicator.boundingBox();
    const lastBox = await lastMessage.boundingBox();

    // Typing indicator should be the last message
    expect(typingBox?.y).toBe(lastBox?.y);
    console.log('✅ Typing indicator at bottom of chat');

    // VERIFY: Smooth scroll to bottom
    const scrollTop = await chatContainer.evaluate((el) => el.scrollTop);
    const scrollHeight = await chatContainer.evaluate((el) => el.scrollHeight);
    const clientHeight = await chatContainer.evaluate((el) => el.clientHeight);

    console.log('📊 Scroll metrics:', { scrollTop, scrollHeight, clientHeight });
    // Should be scrolled to bottom (within 10px tolerance)
    expect(scrollTop).toBeGreaterThan(scrollHeight - clientHeight - 10);
    console.log('✅ Smooth scroll to bottom');
  });

  test('3. Wave Animation Test - Validates animation frames and color', async ({ page }) => {
    console.log('📸 TEST 3: Wave Animation');

    // Send message to trigger typing indicator
    const messageInput = page.locator('input[placeholder*="Type your message"]');
    await messageInput.fill('test animation');
    await page.locator('button:has-text("Send")').click();

    // Wait for typing indicator
    const typingIndicator = page.locator('.avi-wave-text-inline');
    await typingIndicator.waitFor({ state: 'visible', timeout: 200 });

    // Valid animation frames
    const validFrames = ['A v i', 'Λ v i', 'Λ V i', 'Λ V !', 'A v !', 'A V !', 'A V i'];

    // Collect frames over 2 seconds (one full loop)
    const observedFrames = new Set<string>();
    const frameColors = new Set<string>();

    for (let i = 0; i < 10; i++) {
      const text = await typingIndicator.textContent();
      const color = await typingIndicator.evaluate((el) =>
        window.getComputedStyle(el).color
      );

      if (text) observedFrames.add(text);
      frameColors.add(color);

      console.log(`Frame ${i}: "${text}" - Color: ${color}`);

      await page.waitForTimeout(200); // Frame duration is 200ms
    }

    console.log('📊 Observed frames:', Array.from(observedFrames));
    console.log('📊 Observed colors:', Array.from(frameColors));

    // VERIFY: All observed frames are valid
    observedFrames.forEach(frame => {
      expect(validFrames).toContain(frame);
    });
    console.log('✅ All animation frames are valid');

    // VERIFY: All frames same gray color (#6B7280)
    expect(frameColors.size).toBe(1);
    const singleColor = Array.from(frameColors)[0];
    expect(singleColor).toMatch(/rgb\(107,\s*114,\s*128\)/);
    console.log('✅ All frames use single gray color (#6B7280)');

    // VERIFY: Observed at least 3 different frames (animation is cycling)
    expect(observedFrames.size).toBeGreaterThanOrEqual(3);
    console.log('✅ Animation cycles through multiple frames');
  });

  test('4. Replacement Test - Typing indicator replaced by response', async ({ page }) => {
    console.log('📸 TEST 4: Response Replacement');

    // Send message
    const messageInput = page.locator('input[placeholder*="Type your message"]');
    await messageInput.fill('quick test');
    await page.locator('button:has-text("Send")').click();

    // Wait for typing indicator
    const typingIndicator = page.locator('.avi-wave-text-inline');
    await typingIndicator.waitFor({ state: 'visible', timeout: 200 });
    console.log('✅ Typing indicator appeared');

    // Count messages before response
    const chatContainer = page.locator('div.h-64.border.border-gray-200.rounded-lg');
    const messagesBeforeCount = await chatContainer.locator('div.p-3.rounded-lg').count();
    console.log(`📊 Messages before response: ${messagesBeforeCount}`);

    // Wait for Avi response (up to 90 seconds with timeout handling)
    await page.waitForTimeout(5000); // Give at least 5 seconds for response

    // Check if typing indicator is gone
    const typingStillVisible = await typingIndicator.isVisible().catch(() => false);

    if (typingStillVisible) {
      console.log('⏳ Typing indicator still visible, waiting for response...');
      // Wait for typing indicator to disappear
      await typingIndicator.waitFor({ state: 'hidden', timeout: 85000 });
    }

    console.log('✅ Typing indicator disappeared');

    // Wait a moment for response to render
    await page.waitForTimeout(500);

    // Take screenshot #3: After response
    await page.screenshot({
      path: '/workspaces/agent-feed/validation-screenshots/avi-typing-3-after-response.png',
      fullPage: true
    });
    console.log('✅ Screenshot 3: After response saved');

    // VERIFY: Typing indicator DISAPPEARS
    await expect(typingIndicator).not.toBeVisible();
    console.log('✅ Typing indicator disappeared after response');

    // VERIFY: Real Avi message appears
    const aviMessages = chatContainer.locator('div.p-3.rounded-lg.bg-white');
    const aviMessageCount = await aviMessages.count();
    expect(aviMessageCount).toBeGreaterThan(0);
    console.log('✅ Real Avi message appeared');

    // VERIFY: No duplicate messages
    const messagesAfterCount = await chatContainer.locator('div.p-3.rounded-lg').count();
    console.log(`📊 Messages after response: ${messagesAfterCount}`);

    // Should have: user message + avi response (typing indicator replaced)
    // messagesAfterCount should be messagesBeforeCount (which had typing) with typing replaced by response
    expect(messagesAfterCount).toBe(messagesBeforeCount);
    console.log('✅ No duplicate messages (typing indicator replaced atomically)');

    // VERIFY: Chat history clean (no typing artifact)
    const hasTypingIndicator = await typingIndicator.isVisible().catch(() => false);
    expect(hasTypingIndicator).toBe(false);
    console.log('✅ Chat history clean (no typing artifact)');
  });

  test('5. Multiple Message Test - Sequential messages handled correctly', async ({ page }) => {
    console.log('📸 TEST 5: Multiple Messages');

    const messageInput = page.locator('input[placeholder*="Type your message"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send first message
    await messageInput.fill('message 1');
    await sendButton.click();

    // VERIFY: Only ONE typing indicator
    await page.waitForTimeout(100);
    let typingIndicators = await page.locator('.avi-wave-text-inline').count();
    expect(typingIndicators).toBe(1);
    console.log('✅ Only one typing indicator for first message');

    // Wait for response
    await page.waitForTimeout(5000);

    // Send second message
    await messageInput.fill('message 2');
    await sendButton.click();

    // VERIFY: Only ONE typing indicator again
    await page.waitForTimeout(100);
    typingIndicators = await page.locator('.avi-wave-text-inline').count();
    expect(typingIndicators).toBe(1);
    console.log('✅ Only one typing indicator for second message');

    // Wait for response
    await page.waitForTimeout(5000);

    // Send third message
    await messageInput.fill('message 3');
    await sendButton.click();

    // VERIFY: Only ONE typing indicator again
    await page.waitForTimeout(100);
    typingIndicators = await page.locator('.avi-wave-text-inline').count();
    expect(typingIndicators).toBe(1);
    console.log('✅ Only one typing indicator for third message');

    // VERIFY: Chat scrolls naturally
    const chatContainer = page.locator('div.h-64.border.border-gray-200.rounded-lg');
    const scrollTop = await chatContainer.evaluate((el) => el.scrollTop);
    const scrollHeight = await chatContainer.evaluate((el) => el.scrollHeight);
    const clientHeight = await chatContainer.evaluate((el) => el.clientHeight);

    // Should be scrolled to bottom
    expect(scrollTop).toBeGreaterThan(scrollHeight - clientHeight - 10);
    console.log('✅ Chat scrolls naturally to bottom');
  });

  test('6. Integration Feel Test - Overall UX validation', async ({ page }) => {
    console.log('📸 TEST 6: Integration Feel');

    // Send a message
    const messageInput = page.locator('input[placeholder*="Type your message"]');
    await messageInput.fill('test integration');
    await page.locator('button:has-text("Send")').click();

    // Wait for typing indicator
    const typingIndicator = page.locator('.avi-wave-text-inline');
    await typingIndicator.waitFor({ state: 'visible', timeout: 200 });

    const typingMessage = page.locator('div.p-3.rounded-lg:has(.avi-wave-text-inline)');

    // VERIFY: Feels like part of chat (not external)
    // - Should be inside chat container
    // - Should have same styling as other messages
    const chatContainer = page.locator('div.h-64.border.border-gray-200.rounded-lg');
    const isInside = await typingMessage.evaluate((el, container) => {
      return container.contains(el);
    }, await chatContainer.elementHandle());

    expect(isInside).toBe(true);
    console.log('✅ Feels like part of chat (inside chat container)');

    // VERIFY: Natural message flow
    // - Should be in the message list
    const allMessages = chatContainer.locator('div.p-3.rounded-lg');
    const messageCount = await allMessages.count();
    expect(messageCount).toBeGreaterThan(0);
    console.log('✅ Natural message flow (appears in message list)');

    // VERIFY: No visual jarring
    // - Smooth appearance (check transition)
    const opacity = await typingMessage.evaluate((el) =>
      window.getComputedStyle(el).opacity
    );
    expect(parseFloat(opacity)).toBeGreaterThan(0.9);
    console.log('✅ No visual jarring (smooth appearance)');

    // VERIFY: Animation subtle and pleasant
    // - Should have reasonable font size
    const fontSize = await typingIndicator.evaluate((el) =>
      window.getComputedStyle(el).fontSize
    );
    const fontSizeNum = parseFloat(fontSize);
    expect(fontSizeNum).toBeGreaterThan(10);
    expect(fontSizeNum).toBeLessThan(20);
    console.log(`✅ Animation subtle and pleasant (font size: ${fontSize})`);
  });

  test('7. Console Error Check - No errors during typing animation', async ({ page }) => {
    console.log('📸 TEST 7: Console Errors');

    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    // Send message
    const messageInput = page.locator('input[placeholder*="Type your message"]');
    await messageInput.fill('test errors');
    await page.locator('button:has-text("Send")').click();

    // Wait for typing indicator
    await page.locator('.avi-wave-text-inline').waitFor({ state: 'visible', timeout: 200 });

    // Wait for full animation cycle
    await page.waitForTimeout(2000);

    // VERIFY: Zero console errors
    console.log('📊 Console errors:', consoleErrors);
    expect(consoleErrors.length).toBe(0);
    console.log('✅ Zero console errors during animation');
  });

  test('8. Color Validation - DevTools hex code verification', async ({ page }) => {
    console.log('📸 TEST 8: Color Validation (DevTools)');

    // Send message
    const messageInput = page.locator('input[placeholder*="Type your message"]');
    await messageInput.fill('test color');
    await page.locator('button:has-text("Send")').click();

    // Wait for typing indicator
    const typingIndicator = page.locator('.avi-wave-text-inline');
    await typingIndicator.waitFor({ state: 'visible', timeout: 200 });

    // Get computed color and convert to hex
    const colorInfo = await typingIndicator.evaluate((el) => {
      const color = window.getComputedStyle(el).color;

      // Convert rgb to hex
      const rgb = color.match(/\d+/g);
      if (rgb) {
        const hex = '#' + rgb.map(x => {
          const hex = parseInt(x).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        }).join('');

        return {
          rgb: color,
          hex: hex.toUpperCase(),
          expected: '#6B7280'
        };
      }

      return { rgb: color, hex: 'unknown', expected: '#6B7280' };
    });

    console.log('🎨 Color validation:', colorInfo);

    // VERIFY: Hex code matches #6B7280
    expect(colorInfo.hex).toBe('#6B7280');
    console.log('✅ DevTools verification: Color = #6B7280 (gray)');

    // Take screenshot showing the color
    await page.screenshot({
      path: '/workspaces/agent-feed/validation-screenshots/avi-typing-color-validation.png',
      fullPage: true
    });
    console.log('✅ Color validation screenshot saved');
  });
});
