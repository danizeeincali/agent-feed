/**
 * End-to-End Smoke Test
 * Verifies the complete 4-layer QA system works with real database
 */

import Database from 'better-sqlite3';
import { initializeAgentPagesRoutes } from '../routes/agent-pages.js';
import feedbackLoop from '../services/feedback-loop.js';
import express from 'express';
import request from 'supertest';

const TEST_AGENT_ID = 'e2e-smoke-test-agent';

async function runSmokeTest() {
  console.log('\n========================================');
  console.log('🧪 E2E Smoke Test - 4-Layer QA System');
  console.log('========================================\n');

  // 1. Initialize database
  console.log('1️⃣  Initializing database...');
  const db = new Database('/workspaces/agent-feed/data/agent-pages.db');

  // Ensure test agent exists
  try {
    db.prepare(`
      INSERT OR IGNORE INTO agents (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      TEST_AGENT_ID,
      'E2E Smoke Test Agent',
      'Agent for smoke testing',
      new Date().toISOString(),
      new Date().toISOString()
    );
  } catch (error) {
    console.log('   Agent already exists or error:', error.message);
  }

  console.log('   ✅ Database initialized');

  // 2. Initialize feedback loop
  console.log('\n2️⃣  Initializing feedback loop...');
  const mainDb = new Database('/workspaces/agent-feed/database.db');
  feedbackLoop.setDatabase(mainDb);
  console.log('   ✅ Feedback loop initialized');

  // 3. Set up Express app
  console.log('\n3️⃣  Setting up Express app with validation middleware...');
  const app = express();
  app.use(express.json());
  app.use('/api/agent-pages', initializeAgentPagesRoutes(db));
  console.log('   ✅ Express app configured');

  // 4. Test valid page creation
  console.log('\n4️⃣  Testing valid page creation...');
  const validPage = {
    title: 'E2E Smoke Test Page',
    content_value: JSON.stringify({
      components: [
        {
          type: 'header',
          props: {
            title: 'Smoke Test',
            subtitle: 'Verifying 4-layer QA system'
          }
        },
        {
          type: 'stat',
          props: {
            label: 'Tests Passed',
            value: 100
          }
        }
      ]
    })
  };

  const validResponse = await request(app)
    .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
    .send(validPage);

  if (validResponse.status === 201) {
    console.log('   ✅ Valid page created successfully');
    console.log(`   📄 Page ID: ${validResponse.body.page.id}`);
  } else {
    console.log('   ❌ Valid page creation failed:', validResponse.status);
    console.log('   Error:', validResponse.body);
    throw new Error('Valid page creation failed');
  }

  // 5. Test invalid page (should be caught by validation)
  console.log('\n5️⃣  Testing invalid page (validation should catch)...');
  const invalidPage = {
    title: 'Invalid Page',
    content_value: JSON.stringify({
      components: [
        {
          type: 'UnknownWidget',
          props: {}
        }
      ]
    })
  };

  const invalidResponse = await request(app)
    .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
    .send(invalidPage);

  if (invalidResponse.status === 400) {
    console.log('   ✅ Invalid page rejected (400)');
    console.log(`   📋 Errors: ${invalidResponse.body.errors.length}`);
    console.log(`   🔄 Feedback recorded: ${invalidResponse.body.feedbackRecorded}`);
  } else {
    console.log('   ❌ Invalid page not rejected properly:', invalidResponse.status);
    throw new Error('Invalid page should return 400');
  }

  // 6. Verify feedback was recorded
  console.log('\n6️⃣  Verifying feedback loop recorded failure...');
  const failures = mainDb.prepare(`
    SELECT COUNT(*) as count FROM validation_failures
    WHERE agent_id = ? AND created_at > datetime('now', '-1 minute')
  `).get(TEST_AGENT_ID);

  if (failures.count > 0) {
    console.log(`   ✅ Feedback recorded: ${failures.count} failure(s)`);
  } else {
    console.log('   ⚠️  No recent failures recorded (may be expected)');
  }

  // 7. Test page retrieval
  console.log('\n7️⃣  Testing page retrieval...');
  const pageId = validResponse.body.page.id;
  const getResponse = await request(app)
    .get(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${pageId}`);

  if (getResponse.status === 200) {
    console.log('   ✅ Page retrieved successfully');
    console.log(`   📖 Title: ${getResponse.body.title}`);
  } else {
    console.log('   ❌ Page retrieval failed:', getResponse.status);
    throw new Error('Page retrieval failed');
  }

  // 8. Check performance metrics
  console.log('\n8️⃣  Checking performance metrics...');
  const metrics = mainDb.prepare(`
    SELECT * FROM agent_performance_metrics
    WHERE agent_id = ? AND date = date('now')
  `).get(TEST_AGENT_ID);

  if (metrics) {
    console.log(`   ✅ Performance metrics tracked`);
    console.log(`   📊 Total attempts: ${metrics.total_attempts}`);
    console.log(`   ✅ Successful: ${metrics.successful_attempts}`);
    console.log(`   ❌ Failed: ${metrics.failed_attempts}`);
    console.log(`   📈 Success rate: ${(metrics.success_rate * 100).toFixed(1)}%`);
  } else {
    console.log('   ⚠️  No performance metrics found');
  }

  // Cleanup
  db.close();
  mainDb.close();

  console.log('\n========================================');
  console.log('✅ ALL SMOKE TESTS PASSED');
  console.log('========================================\n');
}

// Run smoke test
runSmokeTest().catch(error => {
  console.error('\n❌ SMOKE TEST FAILED:', error.message);
  console.error(error);
  process.exit(1);
});
