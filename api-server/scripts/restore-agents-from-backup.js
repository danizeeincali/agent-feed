#!/usr/bin/env node

/**
 * Restore Agents from Backup
 *
 * Lists available backups and restores agents from selected backup.
 * Useful for recovering from mistakes or reverting to previous state.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupsBaseDir = path.join(__dirname, '../../prod/backups');
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
  console.log('🔄 Restore Agents from Backup');
  console.log('');

  try {
    // Check if backups directory exists
    if (!fs.existsSync(backupsBaseDir)) {
      throw new Error('No backups directory found. Create a backup first with: npm run agents:backup');
    }

    // Get list of backup directories
    const backups = fs.readdirSync(backupsBaseDir)
      .filter(f => {
        const fullPath = path.join(backupsBaseDir, f);
        return fs.statSync(fullPath).isDirectory() && f.startsWith('agents-');
      })
      .sort()
      .reverse(); // Most recent first

    if (backups.length === 0) {
      throw new Error('No agent backups found. Create a backup first with: npm run agents:backup');
    }

    console.log(`📋 Available backups (${backups.length}):\n`);

    // Display backups with metadata
    backups.forEach((backup, index) => {
      const backupPath = path.join(backupsBaseDir, backup);
      const metadataPath = path.join(backupPath, 'backup-metadata.json');

      console.log(`${index + 1}. ${backup}`);

      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        console.log(`   Agents: ${metadata.agentCount} | Git: ${metadata.gitCommit} | Date: ${metadata.timestamp}`);
      }
      console.log('');
    });

    // Prompt for selection
    const selection = await question('Select backup number to restore (or 0 to cancel): ');
    const selectedIndex = parseInt(selection) - 1;

    if (selectedIndex < 0 || isNaN(selectedIndex)) {
      console.log('');
      console.log('❌ Restore cancelled');
      rl.close();
      process.exit(0);
    }

    if (selectedIndex >= backups.length) {
      throw new Error('Invalid selection');
    }

    const selectedBackup = backups[selectedIndex];
    const backupPath = path.join(backupsBaseDir, selectedBackup);

    console.log('');
    console.log(`⚠️  WARNING: This will DELETE current agents and restore from backup`);
    console.log(`   Backup: ${selectedBackup}`);
    console.log('');

    const confirm = await question('Continue? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes') {
      console.log('');
      console.log('❌ Restore cancelled');
      rl.close();
      process.exit(0);
    }

    console.log('');
    console.log('🗑️  Deleting current agents...');

    // Delete current agent files
    const currentAgents = fs.readdirSync(prodAgentsDir)
      .filter(f => f.endsWith('.md'));

    for (const file of currentAgents) {
      const filePath = path.join(prodAgentsDir, file);
      fs.unlinkSync(filePath);
      console.log(`   ✅ Deleted ${file}`);
    }

    console.log('');
    console.log('📥 Restoring from backup...');

    // Copy files from backup
    const backupFiles = fs.readdirSync(backupPath)
      .filter(f => f.endsWith('.md'));

    let restoredCount = 0;
    for (const file of backupFiles) {
      const sourcePath = path.join(backupPath, file);
      const targetPath = path.join(prodAgentsDir, file);

      fs.copyFileSync(sourcePath, targetPath);
      console.log(`   ✅ ${file}`);
      restoredCount++;
    }

    // Restore .system directory if present
    const backupSystemDir = path.join(backupPath, '.system');
    if (fs.existsSync(backupSystemDir)) {
      const targetSystemDir = path.join(prodAgentsDir, '.system');
      fs.cpSync(backupSystemDir, targetSystemDir, { recursive: true });
      console.log(`   ✅ .system/ (protected configs)`);
    }

    console.log('');
    console.log('✅ Restore complete!');
    console.log(`   Restored ${restoredCount} agents from ${selectedBackup}`);

    rl.close();
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ Restore failed:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();
