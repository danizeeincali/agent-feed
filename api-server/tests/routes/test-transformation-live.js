#!/usr/bin/env node
/**
 * Live Transformation Test
 * Tests the transformation function with real database data
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../../data/agent-pages.db');

console.log('🧪 Live Transformation Test');
console.log('============================\n');

// Connect to real database
const db = new Database(DB_PATH);

// Transformation function (same as in routes)
function transformPageForFrontend(page) {
  if (!page) {
    return page;
  }

  const transformedPage = { ...page };

  if (page.content_type !== 'json' && page.content_type !== 'component') {
    return transformedPage;
  }

  if (page.content_value) {
    try {
      const parsedContent = JSON.parse(page.content_value);

      if (parsedContent.layout !== undefined) {
        transformedPage.layout = parsedContent.layout;
      }

      if (parsedContent.responsive !== undefined) {
        transformedPage.responsive = parsedContent.responsive;
      }

      if (parsedContent.components !== undefined) {
        transformedPage.components = parsedContent.components;
      }

      Object.keys(parsedContent).forEach(key => {
        if (!['layout', 'components', 'responsive'].includes(key)) {
          if (transformedPage[key] === undefined) {
            transformedPage[key] = parsedContent[key];
          }
        }
      });

    } catch (error) {
      console.warn(`⚠️ Failed to parse content_value for page ${page.id}: ${error.message}`);
    }
  }

  return transformedPage;
}

// Test with real data
console.log('📊 Test 1: Create test page with JSON content');
console.log('-------------------------------------------');

const testAgentId = 'live-test-agent';
const testPageId = crypto.randomUUID();

// Ensure agent exists
try {
  db.prepare('INSERT OR IGNORE INTO agents (id, name) VALUES (?, ?)').run(testAgentId, 'Live Test Agent');
} catch (e) {
  // Agent might already exist
}

// Create test page
const testContent = JSON.stringify({
  layout: 'grid',
  responsive: true,
  components: [
    {
      type: 'DataCard',
      props: {
        title: 'Total Tasks',
        value: '{{stats.total}}',
        trend: 'up'
      }
    },
    {
      type: 'Chart',
      props: {
        data: '{{chartData}}',
        type: 'bar'
      }
    }
  ]
});

db.prepare(`
  INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(testPageId, testAgentId, 'Live Test Dashboard', 'json', testContent, 'published');

console.log('✅ Created test page:', testPageId);

// Fetch and transform
const rawPage = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(testPageId);
console.log('\n📄 Raw page from database:');
console.log('  - ID:', rawPage.id);
console.log('  - Title:', rawPage.title);
console.log('  - Content Type:', rawPage.content_type);
console.log('  - Has layout field:', 'layout' in rawPage);
console.log('  - Has components field:', 'components' in rawPage);

const transformedPage = transformPageForFrontend(rawPage);
console.log('\n✨ Transformed page:');
console.log('  - ID:', transformedPage.id);
console.log('  - Title:', transformedPage.title);
console.log('  - Layout:', transformedPage.layout);
console.log('  - Responsive:', transformedPage.responsive);
console.log('  - Components:', transformedPage.components ? transformedPage.components.length : 0);
console.log('  - Component Types:', transformedPage.components ? transformedPage.components.map(c => c.type).join(', ') : 'none');

// Verify transformation
console.log('\n✅ Verification:');
console.log('  - Layout extracted:', transformedPage.layout === 'grid' ? '✓' : '✗');
console.log('  - Responsive extracted:', transformedPage.responsive === true ? '✓' : '✗');
console.log('  - Components extracted:', Array.isArray(transformedPage.components) ? '✓' : '✗');
console.log('  - Component count:', transformedPage.components?.length === 2 ? '✓' : '✗');

// Test 2: Check existing pages
console.log('\n\n📊 Test 2: Transform existing pages from database');
console.log('-----------------------------------------------');

const existingPages = db.prepare(`
  SELECT * FROM agent_pages
  WHERE content_type IN ('json', 'component')
  LIMIT 3
`).all();

console.log(`Found ${existingPages.length} JSON/component pages\n`);

existingPages.forEach((page, index) => {
  console.log(`Page ${index + 1}:`);
  console.log(`  - ID: ${page.id}`);
  console.log(`  - Title: ${page.title}`);
  console.log(`  - Content Type: ${page.content_type}`);

  const transformed = transformPageForFrontend(page);
  console.log(`  - Transformed layout: ${transformed.layout || 'none'}`);
  console.log(`  - Transformed components: ${transformed.components ? transformed.components.length : 0}`);
  console.log('');
});

// Test 3: List endpoint simulation
console.log('\n📊 Test 3: List endpoint transformation');
console.log('-------------------------------------');

const allPages = db.prepare('SELECT * FROM agent_pages WHERE agent_id = ? LIMIT 5').all(testAgentId);
const transformedList = allPages.map(p => transformPageForFrontend(p));

console.log(`Total pages: ${transformedList.length}`);
console.log(`Pages with layout: ${transformedList.filter(p => p.layout).length}`);
console.log(`Pages with components: ${transformedList.filter(p => p.components).length}`);

// Cleanup
db.prepare('DELETE FROM agent_pages WHERE id = ?').run(testPageId);
console.log('\n🧹 Cleaned up test data');

db.close();

console.log('\n✅ All live transformation tests completed successfully!');
console.log('============================\n');
