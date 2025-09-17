#!/usr/bin/env node

/**
 * Install dependencies for NLD monitoring
 */

const { spawn } = require('child_process');
const path = require('path');

async function installDependencies() {
  console.log('🔧 Installing NLD Monitoring Dependencies...');

  const cwd = path.join(__dirname);

  return new Promise((resolve, reject) => {
    const npm = spawn('npm', ['install'], {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    npm.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Dependencies installed successfully');
        resolve();
      } else {
        console.error('❌ Failed to install dependencies');
        reject(new Error(`npm install failed with code ${code}`));
      }
    });

    npm.on('error', (error) => {
      console.error('❌ Error running npm install:', error);
      reject(error);
    });
  });
}

if (require.main === module) {
  installDependencies().catch(console.error);
}

module.exports = installDependencies;