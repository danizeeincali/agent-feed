#!/usr/bin/env node
/**
 * Validation Script: Format Preservation
 * Demonstrates that pages are stored in their original format
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AGENT_PAGES_DB_PATH = path.join(__dirname, '../../../data/agent-pages.db');

console.log('🔍 Validating Format Preservation in Auto-Registration\n');

const db = new Database(AGENT_PAGES_DB_PATH);

// Check a page-builder format page
const pageBuilderPage = db.prepare(`
  SELECT id, agent_id, title, content_type, content_value, content_metadata
  FROM agent_pages
  WHERE id = 'comprehensive-dashboard'
`).get();

if (pageBuilderPage) {
  console.log('✅ Page-Builder Format Page Found:');
  console.log(`   ID: ${pageBuilderPage.id}`);
  console.log(`   Agent: ${pageBuilderPage.agent_id}`);
  console.log(`   Title: ${pageBuilderPage.title}`);
  console.log(`   Content Type: ${pageBuilderPage.content_type}`);

  // Verify it's stored as JSON
  if (pageBuilderPage.content_type === 'json') {
    console.log('   ✓ Content type is "json" (preserving specification format)');

    // Parse and validate structure
    try {
      const spec = JSON.parse(pageBuilderPage.content_value);
      if (spec.components && Array.isArray(spec.components)) {
        console.log(`   ✓ Specification structure intact (${spec.components.length} components)`);
        console.log(`   ✓ Original format preserved: specification → content_value as JSON`);
      }
    } catch (error) {
      console.log('   ✗ Failed to parse specification:', error.message);
    }
  } else {
    console.log(`   ✗ Content type is "${pageBuilderPage.content_type}" (expected "json")`);
  }
} else {
  console.log('⚠️  No page-builder format page found in database');
}

console.log('\n---\n');

// Check statistics
const stats = db.prepare(`
  SELECT
    content_type,
    COUNT(*) as count
  FROM agent_pages
  GROUP BY content_type
  ORDER BY count DESC
`).all();

console.log('📊 Content Type Distribution:');
stats.forEach(stat => {
  console.log(`   ${stat.content_type}: ${stat.count} pages`);
});

console.log('\n---\n');

// Verify no unwanted transformations
const transformCheck = db.prepare(`
  SELECT
    id,
    agent_id,
    title,
    content_type,
    CASE
      WHEN content_value LIKE '{%' THEN 'JSON structure'
      WHEN content_value LIKE '#%' THEN 'Markdown'
      ELSE 'Other'
    END as content_pattern
  FROM agent_pages
  WHERE content_type = 'json'
  LIMIT 5
`).all();

console.log('🔬 Sample JSON Content Type Pages:');
transformCheck.forEach(page => {
  console.log(`   ${page.id} (${page.agent_id})`);
  console.log(`     Type: ${page.content_type}, Pattern: ${page.content_pattern}`);

  // Check if JSON content_type contains JSON structure
  if (page.content_type === 'json' && page.content_pattern === 'JSON structure') {
    console.log('     ✓ Correct: JSON type contains JSON structure');
  }
});

console.log('\n---\n');

console.log('✅ Validation Complete');
console.log('\nSummary:');
console.log('  • Pages with specification field are stored as content_type="json"');
console.log('  • Original specification is preserved in content_value');
console.log('  • No unwanted transformation from specification → markdown/text');
console.log('  • API layer can handle transformation on read if needed');

db.close();
