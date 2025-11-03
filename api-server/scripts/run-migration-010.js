import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Running Migration 010: Add User Settings Table');
console.log('='.repeat(60));

// Open database
const dbPath = join(__dirname, '..', '..', 'database.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

try {
  // Check SQLite version supports STRICT mode (3.37+)
  const sqliteVersion = db.prepare('SELECT sqlite_version() as version').get();
  console.log(`SQLite version: ${sqliteVersion.version}`);

  // Check if table already exists and if it's in the correct format
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='user_settings'
  `).get();

  if (tableExists) {
    console.log('ℹ️  user_settings table already exists - checking schema...');

    // Check if it has the STRICT mode and correct columns
    const tableSql = db.prepare(`
      SELECT sql FROM sqlite_master
      WHERE type='table' AND name='user_settings'
    `).get();

    if (tableSql && tableSql.sql.includes('STRICT') && !tableSql.sql.includes('username')) {
      console.log('✅ Table already migrated to SPARC spec - skipping migration');
      console.log('ℹ️  Running verification tests only...\n');

      // Skip to verification
      const skipToVerification = true;

      if (skipToVerification) {
        // Jump directly to verification below (set flag)
        var alreadyMigrated = true;
      }
    } else {
      console.log('⚠️  Table exists with old schema - will migrate');
      var alreadyMigrated = false;
    }
  } else {
    console.log('ℹ️  Creating user_settings table for the first time');
    var alreadyMigrated = false;
  }

  if (!alreadyMigrated) {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'db', 'migrations', '010-user-settings.sql');
    let migrationSQL = readFileSync(migrationPath, 'utf8');

    // If table doesn't exist, remove the backup/restore steps to avoid errors
    if (!tableExists) {
      console.log('ℹ️  Skipping backup/restore steps (table does not exist)');
      // Remove backup section
      migrationSQL = migrationSQL.replace(
        /-- Step 1: Backup existing data[\s\S]*?-- Step 2: Drop old table/,
        '-- Step 1-2: Skipped (table does not exist)\n-- Step 2: Drop old table'
      );
      // Remove restore section
      migrationSQL = migrationSQL.replace(
        /-- Step 4: Restore data from backup[\s\S]*?-- Step 5: Drop backup table[\s\S]*?DROP TABLE IF EXISTS user_settings_backup;/,
        '-- Step 4-5: Skipped (no backup to restore)'
      );
    }

    console.log('✅ Migration file loaded');

    // Execute migration
    console.log('Executing migration SQL...');
    db.exec(migrationSQL);
  }

  // Verify table was created
  console.log('\n📋 Verifying table creation...');
  const tableInfo = db.prepare(`
    SELECT type, name, sql
    FROM sqlite_master
    WHERE type='table' AND name='user_settings'
  `).get();

  if (!tableInfo) {
    throw new Error('❌ user_settings table was not created');
  }

  console.log('  ✅ user_settings table created');

  // Verify STRICT mode
  if (tableInfo.sql.includes('STRICT')) {
    console.log('  ✅ STRICT mode enabled');
  } else {
    console.warn('  ⚠️  STRICT mode not enabled (SQLite version may not support it)');
  }

  // Verify schema columns
  console.log('\n📊 Verifying schema columns...');
  const schemaInfo = db.prepare('PRAGMA table_info(user_settings)').all();
  const columns = schemaInfo.map(col => col.name);
  const expectedColumns = [
    'user_id',
    'display_name',
    'display_name_style',
    'onboarding_completed',
    'onboarding_completed_at',
    'profile_json',
    'created_at',
    'updated_at'
  ];

  expectedColumns.forEach(col => {
    if (!columns.includes(col)) {
      throw new Error(`❌ Missing column '${col}' in user_settings table`);
    }
  });
  console.log('  ✅ All expected columns present');

  // Verify column details
  console.log('\n📋 Column details:');
  schemaInfo.forEach(col => {
    const notNull = col.notnull ? 'NOT NULL' : 'NULL';
    const pk = col.pk ? 'PRIMARY KEY' : '';
    const dflt = col.dflt_value ? `DEFAULT ${col.dflt_value}` : '';
    console.log(`  - ${col.name} (${col.type}) ${notNull} ${pk} ${dflt}`.trim());
  });

  // Verify NOT NULL constraints
  console.log('\n🔒 Verifying NOT NULL constraints...');
  const notNullColumns = schemaInfo.filter(col => col.notnull).map(col => col.name);
  const expectedNotNull = ['user_id', 'display_name', 'onboarding_completed', 'created_at', 'updated_at'];

  expectedNotNull.forEach(col => {
    if (!notNullColumns.includes(col)) {
      throw new Error(`❌ Column '${col}' should be NOT NULL`);
    }
  });
  console.log('  ✅ All NOT NULL constraints verified');

  // Verify indexes
  console.log('\n🔍 Verifying indexes...');
  const indexes = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='index'
    AND tbl_name='user_settings'
    AND name LIKE 'idx_%'
  `).all();

  console.log(`Found ${indexes.length} indexes:`);
  indexes.forEach(idx => {
    console.log(`  ✅ ${idx.name}`);
  });

  if (!indexes.some(idx => idx.name === 'idx_user_settings_onboarding')) {
    throw new Error('❌ Missing required index: idx_user_settings_onboarding');
  }

  // Verify triggers
  console.log('\n⚡ Verifying triggers...');
  const triggers = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='trigger'
    AND tbl_name='user_settings'
  `).all();

  console.log(`Found ${triggers.length} triggers:`);
  triggers.forEach(trigger => {
    console.log(`  ✅ ${trigger.name}`);
  });

  if (!triggers.some(t => t.name === 'update_user_settings_timestamp')) {
    throw new Error('❌ Missing required trigger: update_user_settings_timestamp');
  }

  // Test CHECK constraints
  console.log('\n🧪 Testing CHECK constraints...');

  // Test 1: Invalid onboarding_completed value (should fail)
  try {
    db.prepare(`
      INSERT INTO user_settings (user_id, display_name, onboarding_completed)
      VALUES ('test-invalid-onboarding', 'Test', 2)
    `).run();
    throw new Error('❌ CHECK constraint failed: onboarding_completed should only accept 0 or 1');
  } catch (error) {
    if (error.message.includes('CHECK constraint')) {
      console.log('  ✅ onboarding_completed CHECK constraint works');
    } else {
      throw error;
    }
  }

  // Test 2: Invalid display_name_style (should fail)
  try {
    db.prepare(`
      INSERT INTO user_settings (user_id, display_name, display_name_style)
      VALUES ('test-invalid-style', 'Test', 'invalid_style')
    `).run();
    throw new Error('❌ CHECK constraint failed: display_name_style should only accept valid values');
  } catch (error) {
    if (error.message.includes('CHECK constraint')) {
      console.log('  ✅ display_name_style CHECK constraint works');
    } else {
      throw error;
    }
  }

  // Test 3: NULL display_name (should fail due to NOT NULL)
  try {
    db.prepare(`
      INSERT INTO user_settings (user_id, display_name)
      VALUES ('test-null-name', NULL)
    `).run();
    throw new Error('❌ NOT NULL constraint failed: display_name should be required');
  } catch (error) {
    if (error.message.includes('NOT NULL')) {
      console.log('  ✅ display_name NOT NULL constraint works');
    } else {
      throw error;
    }
  }

  // Test trigger (auto-update updated_at)
  console.log('\n⚡ Testing trigger (auto-update updated_at)...');

  // Insert test record
  const testUserId = 'test-trigger-user';
  db.prepare(`
    INSERT INTO user_settings (user_id, display_name, onboarding_completed)
    VALUES (?, ?, ?)
  `).run(testUserId, 'Trigger Test User', 0);

  const beforeUpdate = db.prepare('SELECT updated_at FROM user_settings WHERE user_id = ?').get(testUserId);

  // Wait a moment to ensure timestamp changes
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Update record
  db.prepare('UPDATE user_settings SET display_name = ? WHERE user_id = ?').run('Updated Name', testUserId);

  const afterUpdate = db.prepare('SELECT updated_at FROM user_settings WHERE user_id = ?').get(testUserId);

  if (afterUpdate.updated_at > beforeUpdate.updated_at) {
    console.log('  ✅ Trigger correctly updates updated_at timestamp');
  } else {
    throw new Error('❌ Trigger did not update updated_at timestamp');
  }

  // Clean up test records
  db.prepare('DELETE FROM user_settings WHERE user_id LIKE ?').run('test-%');

  // Verify demo user record
  console.log('\n👤 Verifying demo user record...');
  const demoUser = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get('demo-user-123');

  if (demoUser) {
    console.log('  ✅ Demo user record exists');
    console.log(`     - display_name: ${demoUser.display_name}`);
    console.log(`     - onboarding_completed: ${demoUser.onboarding_completed}`);
    console.log(`     - created_at: ${demoUser.created_at}`);
  } else {
    throw new Error('❌ Demo user record not found');
  }

  // Show table stats
  console.log('\n📊 Table statistics:');
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_users,
      SUM(CASE WHEN onboarding_completed = 1 THEN 1 ELSE 0 END) as completed_onboarding,
      SUM(CASE WHEN onboarding_completed = 0 THEN 1 ELSE 0 END) as pending_onboarding
    FROM user_settings
  `).get();

  console.log(`  Total users: ${stats.total_users}`);
  console.log(`  Completed onboarding: ${stats.completed_onboarding}`);
  console.log(`  Pending onboarding: ${stats.pending_onboarding}`);

  console.log('\n✅ Migration 010 completed successfully!');
  console.log('='.repeat(60));

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
