#!/usr/bin/env node

/**
 * Initialize Agent Feed Agents
 *
 * Copies canonical agent templates from /api-server/templates/agents/
 * to production location /prod/.claude/agents/
 *
 * Similar to init-fresh-db.js but for agent files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatesDir = path.join(__dirname, '../templates/agents');
const prodAgentsDir = path.join(__dirname, '../../prod/.claude/agents');

console.log('🤖 Initializing Agent Feed agents...');
console.log(`📁 Source: ${templatesDir}`);
console.log(`📁 Target: ${prodAgentsDir}`);
console.log('');

try {
  // Verify templates directory exists
  if (!fs.existsSync(templatesDir)) {
    throw new Error(`Templates directory not found: ${templatesDir}`);
  }

  // Create target directory if it doesn't exist
  if (!fs.existsSync(prodAgentsDir)) {
    fs.mkdirSync(prodAgentsDir, { recursive: true });
    console.log(`   ✅ Created directory: ${prodAgentsDir}`);
  }

  // Get all .md files from templates
  const templateFiles = fs.readdirSync(templatesDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  if (templateFiles.length === 0) {
    throw new Error(`No agent templates found in ${templatesDir}`);
  }

  console.log(`📋 Found ${templateFiles.length} agent templates\n`);

  // Copy each template to production location
  let copiedCount = 0;
  for (const file of templateFiles) {
    const sourcePath = path.join(templatesDir, file);
    const targetPath = path.join(prodAgentsDir, file);

    try {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`   ✅ ${file}`);
      copiedCount++;
    } catch (error) {
      console.error(`   ❌ Failed to copy ${file}:`, error.message);
    }
  }

  console.log('');
  console.log(`✅ Agent initialization complete!`);
  console.log(`   Copied ${copiedCount}/${templateFiles.length} agents`);
  console.log('');
  console.log('🔍 Verification:');
  console.log(`   ls -lh ${prodAgentsDir}/*.md | wc -l`);
  console.log('   Expected:', templateFiles.length);

  // Verify .system directory exists (protected configs)
  const systemDir = path.join(prodAgentsDir, '.system');
  if (fs.existsSync(systemDir)) {
    console.log(`   ✅ Protected configs preserved in .system/`);
  } else {
    console.warn(`   ⚠️  .system directory not found (first-time setup?)`);
  }

  process.exit(0);

} catch (error) {
  console.error('');
  console.error('❌ Agent initialization failed:', error.message);
  console.error('');
  process.exit(1);
}
