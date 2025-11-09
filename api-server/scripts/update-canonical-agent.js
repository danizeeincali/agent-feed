#!/usr/bin/env node

/**
 * Update Canonical Agent Template
 *
 * Copies an agent from production location to canonical templates.
 * Use this when you've made intentional improvements to an agent
 * that should become the new "source of truth".
 *
 * This updates the template that will be used for future initializations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prodAgentsDir = path.join(__dirname, '../../prod/.claude/agents');
const templatesDir = path.join(__dirname, '../templates/agents');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function showDiff(agentName) {
  const activePath = path.join(prodAgentsDir, agentName);
  const canonicalPath = path.join(templatesDir, agentName);

  try {
    const { stdout } = await execAsync(`diff -u "${canonicalPath}" "${activePath}" || true`);
    return stdout;
  } catch (error) {
    return error.stdout || '';
  }
}

async function main() {
  console.log('💾 Update Canonical Agent Template');
  console.log('');

  try {
    const agentName = process.argv[2];

    if (!agentName) {
      console.error('❌ Usage: npm run agents:save <agent-name.md>');
      console.error('');
      console.error('Example:');
      console.error('  npm run agents:save get-to-know-you-agent.md');
      console.error('');
      process.exit(1);
    }

    // Ensure .md extension
    const agentFile = agentName.endsWith('.md') ? agentName : `${agentName}.md`;

    const activePath = path.join(prodAgentsDir, agentFile);
    const canonicalPath = path.join(templatesDir, agentFile);

    // Verify active agent exists
    if (!fs.existsSync(activePath)) {
      throw new Error(`Agent not found in active location: ${activePath}`);
    }

    // Check if canonical exists
    const isNewAgent = !fs.existsSync(canonicalPath);

    if (isNewAgent) {
      console.log(`📝 Creating NEW canonical template: ${agentFile}`);
      console.log('   This agent will be added to the source of truth');
    } else {
      console.log(`📝 Updating canonical template: ${agentFile}`);
      console.log('');
      console.log('📊 Changes:');
      console.log('');

      const diff = await showDiff(agentFile);
      if (diff) {
        console.log(diff);
      } else {
        console.log('   No changes detected');
        console.log('');
        const answer = await question('Save anyway? (yes/no): ');
        if (answer.toLowerCase() !== 'yes') {
          console.log('❌ Update cancelled');
          rl.close();
          process.exit(0);
        }
      }
    }

    console.log('');
    console.log('⚠️  This will update the SOURCE OF TRUTH for this agent');
    console.log(`   Active: ${activePath}`);
    console.log(`   Canonical: ${canonicalPath}`);
    console.log('');

    const confirm = await question('Continue? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes') {
      console.log('');
      console.log('❌ Update cancelled');
      rl.close();
      process.exit(0);
    }

    console.log('');
    console.log('💾 Copying to canonical templates...');

    // Copy active to canonical
    fs.copyFileSync(activePath, canonicalPath);

    console.log(`   ✅ ${agentFile} updated`);
    console.log('');
    console.log('✅ Canonical template updated!');
    console.log('');
    console.log('📌 Next steps:');
    console.log('   1. Review the change:');
    console.log(`      git diff api-server/templates/agents/${agentFile}`);
    console.log('');
    console.log('   2. Commit to git:');
    console.log(`      git add api-server/templates/agents/${agentFile}`);
    console.log(`      git commit -m "Update ${agentFile.replace('.md', '')} agent"`);
    console.log('');
    console.log('💡 This change will be used for all future agent initializations');

    rl.close();
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ Update failed:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();
