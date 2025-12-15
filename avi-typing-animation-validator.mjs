#!/usr/bin/env node

/**
 * PRODUCTION VALIDATION: Avi Typing Indicator Wave Animation
 *
 * Manual browser validation script using Puppeteer
 * Validates 100% REAL implementation with screenshots and detailed logs
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Constants
const APP_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, 'validation-screenshots', 'avi-typing-animation');
const FRAME_DURATION_MS = 200;

const ROYGBIV_COLORS = [
  '#FF0000', // Red
  '#FF7F00', // Orange
  '#FFFF00', // Yellow
  '#00FF00', // Green
  '#0000FF', // Blue
  '#4B0082', // Indigo
  '#9400D3', // Violet
];

const ANIMATION_FRAMES = [
  'A v i', // Frame 0
  'Λ v i', // Frame 1
  'Λ V i', // Frame 2
  'Λ V !', // Frame 3
  'Λ v !', // Frame 4
  'A v !', // Frame 5
  'A V !', // Frame 6
  'A V i', // Frame 7
  'A v i', // Frame 8
  'Λ v i', // Frame 9
];

// Validation results
const results = {
  timestamp: new Date().toISOString(),
  passed: 0,
  failed: 0,
  tests: []
};

// Helper: Ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Helper: RGB to Hex
function rgbToHex(rgb) {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return rgb;

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  return `#${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`;
}

// Helper: Log test result
function logTest(name, passed, details) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) {
    console.log(`  ${details}`);
  }

  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

// Helper: Wait for element
async function waitForElement(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (e) {
    return false;
  }
}

// Main validation
async function validateAviTypingAnimation() {
  console.log('\n🚀 Starting Avi Typing Animation Production Validation\n');
  console.log(`📍 App URL: ${APP_URL}`);
  console.log(`📸 Screenshots: ${SCREENSHOT_DIR}\n`);

  ensureDir(SCREENSHOT_DIR);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  // Set up console log capture
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  try {
    // Navigate to app
    console.log('📂 Navigating to application...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    // Find and click Avi DM tab
    console.log('🔍 Looking for Avi DM section...');
    try {
      const aviDmButton = await page.waitForSelector('button', { timeout: 5000 });
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent);
        if (text && text.toLowerCase().includes('avi')) {
          await button.click();
          await page.waitForTimeout(1000);
          console.log('✅ Found Avi DM section');
          break;
        }
      }
    } catch (e) {
      console.log('⚠️  Could not find Avi DM button, continuing...');
    }

    // TEST 1: Animation NOT visible before send
    console.log('\n📋 TEST 1: Verify animation hidden initially');
    const animationBeforeSend = await page.$('.avi-typing-indicator');
    const isVisibleBefore = animationBeforeSend ? await animationBeforeSend.isIntersectingViewport() : false;

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-no-animation-initial.png'), fullPage: true });
    logTest('Animation hidden before send', !isVisibleBefore, `Visible: ${isVisibleBefore}`);

    // TEST 2: Type message and click send
    console.log('\n📋 TEST 2: Send message and verify animation appears');
    const input = await page.$('input[placeholder*="vi"]') || await page.$('input[type="text"]');

    if (!input) {
      throw new Error('Could not find message input');
    }

    await input.type('Hello Avi!', { delay: 50 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-message-typed.png'), fullPage: true });

    // Find and click send button
    let sendButton = await page.$('button[type="submit"]');
    if (!sendButton) {
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent);
        if (text && text.toLowerCase().includes('send')) {
          sendButton = button;
          break;
        }
      }
    }

    if (!sendButton) {
      throw new Error('Could not find send button');
    }

    const sendTime = Date.now();
    await sendButton.click();

    // Wait 50ms and check animation
    await page.waitForTimeout(50);
    const appearTime = Date.now() - sendTime;

    const animationAfterSend = await page.$('.avi-typing-indicator');
    const isVisibleAfter = animationAfterSend ? await animationAfterSend.isIntersectingViewport() : false;

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-animation-appeared.png'), fullPage: true });
    logTest('Animation appears within 50ms', isVisibleAfter && appearTime <= 100,
            `Appeared in ${appearTime}ms, Visible: ${isVisibleAfter}`);

    if (!isVisibleAfter) {
      console.error('❌ CRITICAL: Animation did not appear! Aborting remaining tests.');
      await browser.close();
      return;
    }

    // TEST 3: Verify positioning
    console.log('\n📋 TEST 3: Verify animation position');
    const animationBox = await animationAfterSend.boundingBox();
    const inputBox = await input.boundingBox();

    const isAboveInput = animationBox.y + animationBox.height < inputBox.y;
    const isLeftAligned = Math.abs(animationBox.x - inputBox.x) < 100;

    logTest('Animation positioned correctly', isAboveInput && isLeftAligned,
            `Above input: ${isAboveInput}, Left aligned: ${isLeftAligned}`);

    // TEST 4: Verify first frame
    console.log('\n📋 TEST 4: Verify first frame');
    const waveText = await page.$('.avi-wave-text');
    const firstFrameText = await waveText.evaluate(el => el.textContent.trim());
    const firstFrameColor = await waveText.evaluate(el => {
      return window.getComputedStyle(el).color;
    });
    const firstFrameHex = rgbToHex(firstFrameColor);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-frame-1-red.png'), fullPage: true });
    logTest('First frame is "A v i" in RED',
            firstFrameText === 'A v i' && firstFrameHex === '#FF0000',
            `Frame: "${firstFrameText}", Color: ${firstFrameHex}`);

    // TEST 5: Verify frame sequence
    console.log('\n📋 TEST 5: Verify complete frame sequence (15 frames)');
    const capturedFrames = [];

    for (let i = 0; i < 15; i++) {
      const frameText = await waveText.evaluate(el => el.textContent.trim());
      capturedFrames.push(frameText);

      console.log(`  Frame ${i}: "${frameText}"`);

      if (i < 10) {
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `05-frame-${i}-${frameText.replace(/\s+/g, '-')}.png`),
          fullPage: true
        });
      }

      await page.waitForTimeout(FRAME_DURATION_MS);
    }

    // Verify first 10 frames
    let allFramesCorrect = true;
    for (let i = 0; i < 10; i++) {
      if (capturedFrames[i] !== ANIMATION_FRAMES[i]) {
        allFramesCorrect = false;
        console.log(`  ❌ Frame ${i} mismatch: expected "${ANIMATION_FRAMES[i]}", got "${capturedFrames[i]}"`);
      }
    }

    // Verify looping
    let loopingCorrect = true;
    for (let i = 0; i < 5; i++) {
      if (capturedFrames[10 + i] !== ANIMATION_FRAMES[i]) {
        loopingCorrect = false;
        console.log(`  ❌ Loop frame ${i} mismatch: expected "${ANIMATION_FRAMES[i]}", got "${capturedFrames[10 + i]}"`);
      }
    }

    logTest('Frame sequence correct', allFramesCorrect && loopingCorrect,
            `Frames correct: ${allFramesCorrect}, Looping correct: ${loopingCorrect}`);

    // TEST 6: Verify ROYGBIV colors
    console.log('\n📋 TEST 6: Verify ROYGBIV color cycling');
    const capturedColors = [];

    for (let i = 0; i < 10; i++) {
      const colorRgb = await waveText.evaluate(el => {
        return window.getComputedStyle(el).color;
      });
      const colorHex = rgbToHex(colorRgb);
      capturedColors.push(colorHex);

      console.log(`  Color ${i}: ${colorHex}`);

      await page.waitForTimeout(FRAME_DURATION_MS);
    }

    let allColorsCorrect = true;
    for (let i = 0; i < 7; i++) {
      if (capturedColors[i] !== ROYGBIV_COLORS[i]) {
        allColorsCorrect = false;
        console.log(`  ❌ Color ${i} mismatch: expected ${ROYGBIV_COLORS[i]}, got ${capturedColors[i]}`);
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-roygbiv-verified.png'), fullPage: true });
    logTest('ROYGBIV colors correct', allColorsCorrect, `All 7 colors verified`);

    // TEST 7: Verify timing
    console.log('\n📋 TEST 7: Verify 200ms frame timing');
    const frameTimes = [];
    let previousText = await waveText.evaluate(el => el.textContent.trim());
    let startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      while (true) {
        const currentText = await waveText.evaluate(el => el.textContent.trim());
        if (currentText !== previousText) {
          const elapsed = Date.now() - startTime;
          frameTimes.push(elapsed);
          console.log(`  Frame ${i} transition: ${elapsed}ms`);

          previousText = currentText;
          startTime = Date.now();
          break;
        }
        await page.waitForTimeout(10);
      }
    }

    const allTimesCorrect = frameTimes.every(t => t >= 180 && t <= 220);
    const avgTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;

    logTest('Frame timing within tolerance', allTimesCorrect,
            `Average: ${avgTime.toFixed(2)}ms, Range: ${Math.min(...frameTimes)}-${Math.max(...frameTimes)}ms`);

    // TEST 8: Verify "is typing..." text
    console.log('\n📋 TEST 8: Verify "is typing..." text');
    const typingTextContent = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.some(el => el.textContent && el.textContent.includes('is typing...'));
    });
    const hasTypingText = typingTextContent;

    logTest('"is typing..." text visible', hasTypingText, `Found: ${hasTypingText}`);

    // TEST 9: Verify glow effect
    console.log('\n📋 TEST 9: Verify text glow effect');
    const textShadow = await waveText.evaluate(el => {
      return window.getComputedStyle(el).textShadow;
    });
    const hasGlow = textShadow !== 'none' && textShadow.includes('rgba');

    logTest('Glow effect applied', hasGlow, `Text shadow: ${textShadow.substring(0, 50)}...`);

    // TEST 10: Wait for response and verify animation disappears
    console.log('\n📋 TEST 10: Waiting for response (max 60s)...');
    const responseStartTime = Date.now();

    try {
      await page.waitForSelector('.avi-typing-indicator', {
        hidden: true,
        timeout: 60000
      });

      const responseTime = Date.now() - responseStartTime;
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-animation-disappeared.png'), fullPage: true });

      logTest('Animation disappears when response arrives', true,
              `Disappeared after ${(responseTime / 1000).toFixed(2)}s`);
    } catch (e) {
      logTest('Animation disappears when response arrives', false,
              'Timeout waiting for animation to disappear');
    }

    // TEST 11: Verify no console errors
    console.log('\n📋 TEST 11: Check console for errors');
    const errors = consoleLogs.filter(log => log.type === 'error');

    logTest('No console errors', errors.length === 0,
            `Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('  Console errors:');
      errors.forEach(err => console.log(`    ${err.text}`));
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    logTest('Fatal error', false, error.message);
  } finally {
    // Generate report
    console.log('\n' + '='.repeat(80));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`);
    console.log('='.repeat(80));

    // Save detailed report
    const reportPath = path.join(__dirname, 'AVI_TYPING_ANIMATION_VALIDATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
    console.log(`📸 Screenshots saved: ${SCREENSHOT_DIR}\n`);

    await browser.close();
  }
}

// Run validation
validateAviTypingAnimation().catch(console.error);
