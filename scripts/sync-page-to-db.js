#!/usr/bin/env node
/**
 * Manually sync a page JSON file to the database
 */
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the JSON file
const jsonPath = path.join(__dirname, '../data/agent-pages/personal-todos-agent-comprehensive-dashboard.json');
const pageData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Open database
const dbPath = path.join(__dirname, '../data/agent-pages.db');
const db = new Database(dbPath);

// Prepare data
const contentValue = typeof pageData.specification === 'string'
  ? pageData.specification
  : JSON.stringify(pageData.specification);

const now = new Date().toISOString();

console.log(`📄 Syncing page: ${pageData.id}`);
console.log(`   Content length: ${contentValue.length} characters`);

// Update or insert the page
const stmt = db.prepare(`
  INSERT OR REPLACE INTO agent_pages (
    id, agent_id, title, content_type, content_value, content_metadata,
    status, version, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

stmt.run(
  pageData.id,
  pageData.agent_id,
  pageData.title,
  'json',
  contentValue,
  null,
  pageData.status || 'published',
  pageData.version || 1,
  pageData.created_at || now,
  now
);

console.log(`✅ Page synced to database`);

// Verify
const verify = db.prepare('SELECT id, length(content_value) as len, updated_at FROM agent_pages WHERE id = ?').get(pageData.id);
console.log(`✅ Verification:`);
console.log(`   ID: ${verify.id}`);
console.log(`   Content length: ${verify.len}`);
console.log(`   Updated at: ${verify.updated_at}`);

db.close();
