import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Running Migration 009: Add Activity Tracking Tables');
console.log('='.repeat(60));

// Open database
const dbPath = join(__dirname, '..', '..', 'database.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

try {
  // Read migration file
  const migrationPath = join(__dirname, '..', 'db', 'migrations', '009-add-activity-tracking.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');

  console.log('✅ Migration file loaded');

  // Execute migration
  console.log('Executing migration SQL...');
  db.exec(migrationSQL);

  // Verify tables were created
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    AND name IN ('activity_events', 'agent_executions', 'tool_executions', 'session_metrics')
    ORDER BY name
  `).all();

  console.log('\n📋 Tables created:');
  tables.forEach(table => {
    console.log(`  ✅ ${table.name}`);
  });

  if (tables.length !== 4) {
    throw new Error(`❌ Expected 4 tables, but found ${tables.length}`);
  }

  // Verify indexes exist
  console.log('\n🔍 Verifying indexes...');
  const indexes = db.prepare(`
    SELECT name, tbl_name FROM sqlite_master
    WHERE type='index'
    AND tbl_name IN ('activity_events', 'agent_executions', 'tool_executions', 'session_metrics')
    AND name LIKE 'idx_%'
    ORDER BY tbl_name, name
  `).all();

  console.log(`Found ${indexes.length} indexes:`);
  const indexesByTable = indexes.reduce((acc, idx) => {
    if (!acc[idx.tbl_name]) acc[idx.tbl_name] = [];
    acc[idx.tbl_name].push(idx.name);
    return acc;
  }, {});

  Object.entries(indexesByTable).forEach(([table, tableIndexes]) => {
    console.log(`  ${table}:`);
    tableIndexes.forEach(idx => console.log(`    - ${idx}`));
  });

  // Verify activity_events schema
  console.log('\n📊 Verifying activity_events schema...');
  const activityEventsSchema = db.prepare('PRAGMA table_info(activity_events)').all();
  const activityEventsColumns = activityEventsSchema.map(col => col.name);
  const expectedActivityColumns = ['id', 'event_type', 'session_id', 'agent_id', 'tool_name', 'action', 'status', 'duration', 'timestamp', 'metadata'];

  expectedActivityColumns.forEach(col => {
    if (!activityEventsColumns.includes(col)) {
      throw new Error(`❌ Missing column '${col}' in activity_events table`);
    }
  });
  console.log('  ✅ All expected columns present');

  // Verify agent_executions schema
  console.log('\n📊 Verifying agent_executions schema...');
  const agentExecutionsSchema = db.prepare('PRAGMA table_info(agent_executions)').all();
  const agentExecutionsColumns = agentExecutionsSchema.map(col => col.name);
  const expectedAgentColumns = ['id', 'session_id', 'agent_type', 'status', 'prompt', 'model', 'start_time', 'end_time', 'duration', 'tokens_used', 'cost', 'error'];

  expectedAgentColumns.forEach(col => {
    if (!agentExecutionsColumns.includes(col)) {
      throw new Error(`❌ Missing column '${col}' in agent_executions table`);
    }
  });
  console.log('  ✅ All expected columns present');

  // Verify tool_executions schema
  console.log('\n📊 Verifying tool_executions schema...');
  const toolExecutionsSchema = db.prepare('PRAGMA table_info(tool_executions)').all();
  const toolExecutionsColumns = toolExecutionsSchema.map(col => col.name);
  const expectedToolColumns = ['id', 'session_id', 'agent_id', 'tool_name', 'action', 'status', 'duration', 'output_size', 'file_path', 'error', 'timestamp'];

  expectedToolColumns.forEach(col => {
    if (!toolExecutionsColumns.includes(col)) {
      throw new Error(`❌ Missing column '${col}' in tool_executions table`);
    }
  });
  console.log('  ✅ All expected columns present');

  // Verify session_metrics schema
  console.log('\n📊 Verifying session_metrics schema...');
  const sessionMetricsSchema = db.prepare('PRAGMA table_info(session_metrics)').all();
  const sessionMetricsColumns = sessionMetricsSchema.map(col => col.name);
  const expectedSessionColumns = ['session_id', 'start_time', 'end_time', 'duration', 'request_count', 'total_tokens', 'total_cost', 'agent_count', 'tool_count', 'error_count', 'status'];

  expectedSessionColumns.forEach(col => {
    if (!sessionMetricsColumns.includes(col)) {
      throw new Error(`❌ Missing column '${col}' in session_metrics table`);
    }
  });
  console.log('  ✅ All expected columns present');

  console.log('\n✅ Migration 009 completed successfully!');
  console.log('='.repeat(60));

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
