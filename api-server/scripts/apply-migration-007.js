import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';

const db = new Database('/workspaces/agent-feed/database.db');

async function migrate() {
  console.log('🔧 Applying migration 007: Add author_agent column...');

  try {
    const migrationPath = path.join(
      '/workspaces/agent-feed/api-server/db/migrations',
      '007-rename-author-column.sql'
    );

    const sql = await fs.readFile(migrationPath, 'utf-8');

    // Execute migration
    db.exec(sql);

    // Verify
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM comments
      WHERE author_agent IS NULL
    `).get();

    if (result.count === 0) {
      console.log('✅ Migration successful - all comments have author_agent');
    } else {
      console.error(`❌ Migration incomplete - ${result.count} comments missing author_agent`);
      process.exit(1);
    }

    // Show sample data
    const samples = db.prepare(`
      SELECT id, author, author_agent
      FROM comments
      LIMIT 5
    `).all();

    console.log('\n📊 Sample data after migration:');
    console.table(samples);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();
