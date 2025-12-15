#!/usr/bin/env node

/**
 * Restore Agents from Canonical Templates
 *
 * Deletes current agents and restores from canonical templates.
 * Use this after testing to discard testing changes.
 *
 * DESTRUCTIVE OPERATION - prompts for confirmation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prodAgentsDir = path.join(__dirname, '../../prod/.claude/agents');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🔄 Restore Agents from Canonical Templates');
  console.log('');
  console.log('⚠️  WARNING: This will DELETE all current agents and restore from templates');
  console.log(`   Target: ${prodAgentsDir}`);
  console.log('');

  try {
    // Verify agents directory exists
    if (!fs.existsSync(prodAgentsDir)) {
      throw new Error(`Agents directory not found: ${prodAgentsDir}`);
    }

    // Get list of current agents
    const currentAgents = fs.readdirSync(prodAgentsDir)
      .filter(f => f.endsWith('.md'));

    console.log(`📋 Current agents (${currentAgents.length}):`);
    currentAgents.forEach(f => console.log(`   - ${f}`));
    console.log('');

    // Prompt for confirmation
    const answer = await question('Continue with restore? (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
      console.log('');
      console.log('❌ Restore cancelled');
      rl.close();
      process.exit(0);
    }

    console.log('');
    console.log('🗑️  Deleting current agents...');

    // Delete current agent files (preserve .system directory)
    let deletedCount = 0;
    for (const file of currentAgents) {
      const filePath = path.join(prodAgentsDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`   ✅ Deleted ${file}`);
        deletedCount++;
      } catch (error) {
        console.error(`   ❌ Failed to delete ${file}:`, error.message);
      }
    }

    console.log('');
    console.log(`✅ Deleted ${deletedCount} agents`);
    console.log('');
    console.log('📥 Restoring from canonical templates...');
    console.log('');

    // Close readline before spawning child process
    rl.close();

    // Call init-agents.js to restore from templates
    const { execSync } = await import('child_process');
    execSync('node ' + path.join(__dirname, 'init-agents.js'), {
      stdio: 'inherit'
    });

    console.log('');
    console.log('✅ Restore complete!');
    console.log('   All agents restored from canonical templates');

  } catch (error) {
    console.error('');
    console.error('❌ Restore failed:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();
