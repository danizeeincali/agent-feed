#!/usr/bin/env node
import { chromium } from '@playwright/test';

async function inspect() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Find first post article
  const firstPost = page.locator('article').first();

  // Get the entire HTML of first post
  const html = await firstPost.innerHTML();

  console.log('\n=== FIRST POST HTML ===\n');
  console.log(html.substring(0, 2000));
  console.log('\n...\n');

  // Look for timestamp elements
  const timeElements = await firstPost.locator('span:has-text("ago"), span:has-text("min"), span:has-text("hour")').all();

  console.log(`\nFound ${timeElements.length} potential time elements\n`);

  for (let i = 0; i < timeElements.length; i++) {
    const text = await timeElements[i].textContent();
    const classes = await timeElements[i].getAttribute('class');
    const title = await timeElements[i].getAttribute('title');

    console.log(`Element ${i + 1}:`);
    console.log(`  Text: "${text}"`);
    console.log(`  Classes: ${classes}`);
    console.log(`  Title: ${title}`);
    console.log('');
  }

  // Check for cursor-help class
  const cursorHelp = await firstPost.locator('.cursor-help').all();
  console.log(`\nElements with cursor-help class: ${cursorHelp.length}`);

  for (const el of cursorHelp) {
    const text = await el.textContent();
    const title = await el.getAttribute('title');
    console.log(`  Text: "${text}" | Title: "${title}"`);
  }

  await page.waitForTimeout(5000);
  await browser.close();
}

inspect().catch(console.error);
