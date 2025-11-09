#!/usr/bin/env node

/**
 * Backup Agent Feed Agents
 *
 * Creates timestamped backup of all agents in /prod/.claude/agents/
 * Useful before testing sessions to preserve current state.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prodAgentsDir = path.join(__dirname, '../../prod/.claude/agents');
const backupsBaseDir = path.join(__dirname, '../../prod/backups');

console.log('💾 Backing up Agent Feed agents...');
console.log('');

async function getGitCommitHash() {
  try {
    const { stdout } = await execAsync('git rev-parse --short HEAD');
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}

async function main() {
  try {
    // Verify agents directory exists
    if (!fs.existsSync(prodAgentsDir)) {
      throw new Error(`Agents directory not found: ${prodAgentsDir}`);
    }

    // Get list of agent files
    const agentFiles = fs.readdirSync(prodAgentsDir)
      .filter(f => f.endsWith('.md'));

    if (agentFiles.length === 0) {
      throw new Error('No agent files found to backup');
    }

    console.log(`📋 Found ${agentFiles.length} agents to backup`);

    // Create backup directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const backupDir = path.join(backupsBaseDir, `agents-${timestamp}`);

    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📁 Created backup directory: ${backupDir}`);
    console.log('');

    // Copy all agent files
    let copiedCount = 0;
    for (const file of agentFiles) {
      const sourcePath = path.join(prodAgentsDir, file);
      const targetPath = path.join(backupDir, file);

      try {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`   ✅ ${file}`);
        copiedCount++;
      } catch (error) {
        console.error(`   ❌ Failed to backup ${file}:`, error.message);
      }
    }

    // Copy .system directory if it exists
    const systemDir = path.join(prodAgentsDir, '.system');
    if (fs.existsSync(systemDir)) {
      const targetSystemDir = path.join(backupDir, '.system');
      fs.cpSync(systemDir, targetSystemDir, { recursive: true });
      console.log(`   ✅ .system/ (protected configs)`);
    }

    // Get git commit hash
    const gitHash = await getGitCommitHash();

    // Create metadata file
    const metadata = {
      timestamp: new Date().toISOString(),
      agentCount: copiedCount,
      gitCommit: gitHash,
      backupPath: backupDir,
      agentFiles: agentFiles
    };

    fs.writeFileSync(
      path.join(backupDir, 'backup-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('');
    console.log('✅ Backup complete!');
    console.log('');
    console.log('📊 Backup Summary:');
    console.log(`   Agents backed up: ${copiedCount}`);
    console.log(`   Git commit: ${gitHash}`);
    console.log(`   Backup location: ${backupDir}`);
    console.log('');
    console.log('💡 To restore this backup:');
    console.log(`   npm run agents:restore-backup`);
    console.log(`   # Select: ${path.basename(backupDir)}`);

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ Backup failed:', error.message);
    console.error('');
    process.exit(1);
  }
}

main();
