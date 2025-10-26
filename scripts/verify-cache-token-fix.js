import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verifying Cache Token Fix');
console.log('='.repeat(60));

const dbPath = join(__dirname, '..', 'database.db');
const db = new Database(dbPath, { readonly: true });

try {
  // Test 1: Verify columns exist
  console.log('\n📋 Test 1: Verify Columns Exist');
  const tableInfo = db.prepare('PRAGMA table_info(token_analytics)').all();
  const columnNames = tableInfo.map(col => col.name);

  const hasCacheRead = columnNames.includes('cacheReadTokens');
  const hasCacheCreation = columnNames.includes('cacheCreationTokens');

  console.log('  cacheReadTokens column:', hasCacheRead ? '✅ EXISTS' : '❌ MISSING');
  console.log('  cacheCreationTokens column:', hasCacheCreation ? '✅ EXISTS' : '❌ MISSING');

  if (!hasCacheRead || !hasCacheCreation) {
    throw new Error('Migration incomplete - columns missing');
  }

  // Test 2: Verify existing records have defaults
  console.log('\n📋 Test 2: Verify Existing Records');
  const nullRecords = db.prepare(`
    SELECT COUNT(*) as count
    FROM token_analytics
    WHERE cacheReadTokens IS NULL OR cacheCreationTokens IS NULL
  `).get();

  console.log('  Records with NULL cache tokens:', nullRecords.count);
  console.log('  Status:', nullRecords.count === 0 ? '✅ PASS' : '❌ FAIL');

  // Test 3: Check for records with cache tokens
  console.log('\n📋 Test 3: Check Recent Records');
  const recentWithCache = db.prepare(`
    SELECT COUNT(*) as count
    FROM token_analytics
    WHERE timestamp > datetime('now', '-1 hour')
    AND (cacheReadTokens > 0 OR cacheCreationTokens > 0)
  `).get();

  console.log('  Recent records with cache tokens:', recentWithCache.count);

  // Test 4: Sample records
  console.log('\n📋 Test 4: Sample Recent Records');
  const samples = db.prepare(`
    SELECT timestamp, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, estimatedCost
    FROM token_analytics
    ORDER BY timestamp DESC
    LIMIT 5
  `).all();

  samples.forEach((record, i) => {
    console.log(`\n  Record ${i + 1}:`);
    console.log(`    Timestamp: ${record.timestamp}`);
    console.log(`    Input tokens: ${record.inputTokens}`);
    console.log(`    Output tokens: ${record.outputTokens}`);
    console.log(`    Cache read tokens: ${record.cacheReadTokens || 0}`);
    console.log(`    Cache creation tokens: ${record.cacheCreationTokens || 0}`);
    console.log(`    Estimated cost: $${record.estimatedCost?.toFixed(6) || '0.000000'}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ Verification complete!');

} catch (error) {
  console.error('\n❌ Verification failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
