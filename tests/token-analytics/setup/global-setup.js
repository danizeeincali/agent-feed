/**
 * Global Test Setup for Token Analytics
 * Ensures real API connections and data validation
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🔍 Setting up Token Analytics Test Environment...');

  // Validate environment has real API keys
  const requiredEnvVars = [
    'ANTHROPIC_API_KEY',
    'CLAUDE_API_KEY'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    console.warn(`⚠️  Missing API keys: ${missingEnvVars.join(', ')}`);
    console.warn('Some tests may be skipped without real API access');
  }

  // Create test database for real data tracking
  const testDbPath = path.join(__dirname, '../temp/test-token-data.db');
  const testDbDir = path.dirname(testDbPath);

  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }

  // Initialize test database schema
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database(testDbPath);

  await new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS token_usage (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          provider TEXT NOT NULL,
          model TEXT NOT NULL,
          tokens_used INTEGER NOT NULL,
          estimated_cost REAL NOT NULL,
          request_type TEXT NOT NULL,
          component TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS api_calls (
          id TEXT PRIMARY KEY,
          endpoint TEXT NOT NULL,
          method TEXT NOT NULL,
          response_time INTEGER NOT NULL,
          status_code INTEGER NOT NULL,
          tokens_consumed INTEGER,
          cost REAL,
          timestamp TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Set global test configuration
  global.__TEST_DB_PATH__ = testDbPath;
  global.__TEST_START_TIME__ = Date.now();

  // Validate no fake data files exist in source
  const srcPath = path.join(__dirname, '../../../src');
  const fakeDataFiles = await findFakeDataFiles(srcPath);

  if (fakeDataFiles.length > 0) {
    throw new Error(`Fake data files detected: ${fakeDataFiles.join(', ')}`);
  }

  console.log('✅ Token Analytics Test Environment Ready');
};

async function findFakeDataFiles(dir) {
  const fs = require('fs').promises;
  const fakeFiles = [];

  try {
    const files = await fs.readdir(dir, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(dir, file.name);

      if (file.isDirectory() && !file.name.includes('node_modules')) {
        const subFiles = await findFakeDataFiles(filePath);
        fakeFiles.push(...subFiles);
      } else if (file.isFile() && (file.name.endsWith('.js') || file.name.endsWith('.ts'))) {
        const content = await fs.readFile(filePath, 'utf8');

        // Check for fake data patterns
        const fakePatterns = [
          /const.*cost.*=.*\$?\d+\.\d{2}/i,
          /\$12\.45|\$42\.00|\$99\.99/,
          /mock.*token|fake.*token|dummy.*token/i,
          /hardcoded.*cost|static.*price/i
        ];

        if (fakePatterns.some(pattern => pattern.test(content))) {
          fakeFiles.push(filePath);
        }
      }
    }
  } catch (error) {
    // Ignore permission errors for directories we can't read
    if (error.code !== 'EACCES' && error.code !== 'ENOENT') {
      throw error;
    }
  }

  return fakeFiles;
}