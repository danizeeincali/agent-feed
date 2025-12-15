#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

console.log('🔄 Creating system user...\n');

try {
  db.prepare('BEGIN TRANSACTION').run();

  // Create system user in users table
  db.prepare(`
    INSERT OR IGNORE INTO users (id, username, display_name, email, created_at, updated_at)
    VALUES ('system', 'system', 'System User', 'system@internal', ?, ?)
  `).run(Date.now(), Date.now());

  // Create system auth in user_claude_auth table
  db.prepare(`
    INSERT OR IGNORE INTO user_claude_auth (user_id, auth_method, created_at, updated_at)
    VALUES ('system', 'platform_payg', ?, ?)
  `).run(Date.now(), Date.now());

  db.prepare('COMMIT').run();

  console.log('✅ System user created successfully');

  // Verify
  const systemUser = db.prepare('SELECT * FROM users WHERE id = ?').get('system');
  const systemAuth = db.prepare('SELECT * FROM user_claude_auth WHERE user_id = ?').get('system');

  console.log('📊 System user:', systemUser);
  console.log('📊 System auth:', systemAuth);

} catch (error) {
  db.prepare('ROLLBACK').run();
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  db.close();
}
