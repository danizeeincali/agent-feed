/**
 * Database Test Script
 * Tests database connection, schema, and CRUD operations
 */

import dbManager from './database.js';
import PageService from './services/page-sqlite.service.js';

async function testDatabase() {
  console.log('🧪 Testing Database Implementation\n');

  try {
    // 1. Connect to database
    console.log('1️⃣ Connecting to database...');
    const db = dbManager.connect();
    console.log('✅ Database connected\n');

    // 2. Initialize schema
    console.log('2️⃣ Initializing schema...');
    dbManager.ensureAgentsTable();
    dbManager.initializeSchema();
    console.log('✅ Schema initialized\n');

    // 3. Verify tables exist
    console.log('3️⃣ Verifying schema...');
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all();

    console.log('Tables:', tables.map(t => t.name).join(', '));

    const requiredTables = ['agents', 'agent_pages'];
    for (const table of requiredTables) {
      const exists = tables.some(t => t.name === table);
      if (!exists) {
        throw new Error(`Required table ${table} does not exist`);
      }
    }
    console.log('✅ Schema verified\n');

    // 4. Test CRUD operations
    console.log('4️⃣ Testing CRUD operations...');
    const pageService = new PageService(db);

    // CREATE
    console.log('   Creating test page...');
    const testPage = pageService.createPage({
      id: 'test-page-001',
      agent_id: 'personal-todos-agent',
      title: 'Test Page',
      content_type: 'json',
      content_value: JSON.stringify({ test: true }),
      status: 'draft',
      tags: ['test', 'demo']
    });
    console.log(`   ✅ Created page: ${testPage.id}`);

    // READ
    console.log('   Reading page...');
    const retrievedPage = pageService.getPageById('test-page-001');
    if (!retrievedPage || retrievedPage.title !== 'Test Page') {
      throw new Error('Failed to retrieve page');
    }
    console.log(`   ✅ Retrieved page: ${retrievedPage.title}`);

    // UPDATE
    console.log('   Updating page...');
    const updatedPage = pageService.updatePage('test-page-001', {
      title: 'Updated Test Page',
      status: 'published'
    });
    if (updatedPage.title !== 'Updated Test Page') {
      throw new Error('Failed to update page');
    }
    console.log(`   ✅ Updated page: ${updatedPage.title}`);

    // LIST
    console.log('   Listing pages...');
    const allPages = pageService.getAllPages({ limit: 10, page: 1 });
    console.log(`   ✅ Found ${allPages.data.length} pages`);

    // SEARCH
    console.log('   Searching pages...');
    const searchResults = pageService.searchPages('Test');
    console.log(`   ✅ Found ${searchResults.length} matching pages`);

    // DELETE
    console.log('   Deleting test page...');
    const deleted = pageService.deletePage('test-page-001');
    if (!deleted) {
      throw new Error('Failed to delete page');
    }
    console.log('   ✅ Deleted test page');

    // 5. Display statistics
    console.log('\n5️⃣ Database Statistics:');
    const stats = pageService.getStatistics();
    console.log(`   Total pages: ${stats.total}`);
    console.log(`   Published: ${stats.published}`);
    console.log(`   Draft: ${stats.draft}`);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    dbManager.close();
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabase();
}

export default testDatabase;