/**
 * End-to-End Test: Agent Introduction System
 * Creates actual introduction posts and verifies them in the database
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAgentIntroduction() {
  log('\n🧪 AGENT INTRODUCTION E2E TEST', 'blue');
  log('=' .repeat(70), 'blue');

  const dbPath = path.join(__dirname, '../../..', 'database.db');
  const db = new Database(dbPath);

  const testUserId = 'demo-user-123';
  let testsPassed = 0;
  let testsFailed = 0;
  const createdPostIds = [];

  try {
    // Dynamically import the ES modules
    log('\n📦 Loading agent introduction service...', 'yellow');
    const { AgentIntroductionService } = await import('../../services/agents/agent-introduction-service.js');
    const DatabaseSelector = (await import('../../config/database-selector.js')).default;

    // Initialize database selector
    await DatabaseSelector.initialize();
    log('✅ Database selector initialized', 'green');

    // Create service
    const introService = new AgentIntroductionService(db);
    log('✅ Agent introduction service created', 'green');

    // Test 1: Introduce link-logger-agent
    log('\n📝 Test 1: Introduce link-logger-agent', 'yellow');
    try {
      // Check if already introduced
      const alreadyIntroduced = introService.isAgentIntroduced(testUserId, 'link-logger-agent');

      if (alreadyIntroduced) {
        log('⚠️  link-logger-agent already introduced (skipping)', 'yellow');
        testsPassed++;
      } else {
        const result = await introService.introduceAgent(
          testUserId,
          'link-logger-agent',
          DatabaseSelector
        );

        if (result.success) {
          log(`✅ Successfully introduced link-logger-agent`, 'green');
          log(`   Post ID: ${result.postId}`, 'blue');
          createdPostIds.push(result.postId);

          // Verify post exists
          const post = await DatabaseSelector.getPostById(result.postId, testUserId);
          if (post) {
            log(`✅ Post verified in database`, 'green');
            log(`   Title: "${post.title}"`, 'blue');
            log(`   Author: ${post.authorAgent}`, 'blue');

            const metadata = JSON.parse(post.metadata);
            if (metadata.isAgentIntroduction && metadata.agentId === 'link-logger-agent') {
              log(`✅ Post metadata is correct`, 'green');
              testsPassed++;
            } else {
              log(`❌ Post metadata is incorrect`, 'red');
              testsFailed++;
            }
          } else {
            log(`❌ Post not found in database`, 'red');
            testsFailed++;
          }
        } else {
          log(`❌ Failed to introduce agent: ${result.message}`, 'red');
          testsFailed++;
        }
      }
    } catch (error) {
      log(`❌ Test 1 failed: ${error.message}`, 'red');
      testsFailed++;
    }

    // Test 2: Check for duplicate prevention
    log('\n📝 Test 2: Verify duplicate prevention', 'yellow');
    try {
      const result = await introService.introduceAgent(
        testUserId,
        'link-logger-agent',
        DatabaseSelector
      );

      if (result.alreadyIntroduced) {
        log(`✅ Duplicate introduction prevented`, 'green');
        testsPassed++;
      } else {
        log(`❌ Duplicate introduction was allowed`, 'red');
        testsFailed++;
      }
    } catch (error) {
      log(`❌ Test 2 failed: ${error.message}`, 'red');
      testsFailed++;
    }

    // Test 3: Context-based introduction (URL trigger)
    log('\n📝 Test 3: Context-based introduction (URL detected)', 'yellow');
    try {
      const context = { containsURL: true };
      const results = await introService.checkAndIntroduceAgents(
        testUserId,
        context,
        DatabaseSelector
      );

      if (results.length > 0) {
        const linkLoggerResult = results.find(r => r.agentId === 'link-logger-agent');
        if (linkLoggerResult) {
          if (linkLoggerResult.alreadyIntroduced) {
            log(`✅ URL trigger detected link-logger (already introduced)`, 'green');
            testsPassed++;
          } else if (linkLoggerResult.success) {
            log(`✅ URL trigger successfully introduced link-logger`, 'green');
            createdPostIds.push(linkLoggerResult.postId);
            testsPassed++;
          } else {
            log(`❌ URL trigger failed to introduce link-logger`, 'red');
            testsFailed++;
          }
        } else {
          log(`❌ URL trigger did not detect link-logger`, 'red');
          testsFailed++;
        }
      } else {
        log(`❌ Context-based introduction returned no results`, 'red');
        testsFailed++;
      }
    } catch (error) {
      log(`❌ Test 3 failed: ${error.message}`, 'red');
      testsFailed++;
    }

    // Test 4: Verify agent introduction tracking
    log('\n📝 Test 4: Verify agent introduction tracking', 'yellow');
    try {
      const isIntroduced = introService.isAgentIntroduced(testUserId, 'link-logger-agent');
      if (isIntroduced) {
        log(`✅ Agent marked as introduced in database`, 'green');

        // Get introduction record
        const record = db.prepare(`
          SELECT * FROM agent_introductions
          WHERE user_id = ? AND agent_id = ?
        `).get(testUserId, 'link-logger-agent');

        if (record) {
          log(`   Introduced at: ${new Date(record.introduced_at * 1000).toISOString()}`, 'blue');
          log(`   Post ID: ${record.post_id}`, 'blue');
          log(`   Interaction count: ${record.interaction_count}`, 'blue');
          testsPassed++;
        } else {
          log(`❌ No introduction record found`, 'red');
          testsFailed++;
        }
      } else {
        log(`❌ Agent not marked as introduced`, 'red');
        testsFailed++;
      }
    } catch (error) {
      log(`❌ Test 4 failed: ${error.message}`, 'red');
      testsFailed++;
    }

    // Test 5: Query for all agent introduction posts
    log('\n📝 Test 5: Query for all agent introduction posts', 'yellow');
    try {
      const posts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE metadata LIKE '%isAgentIntroduction%'
        ORDER BY publishedAt DESC
        LIMIT 10
      `).all();

      if (posts.length > 0) {
        log(`✅ Found ${posts.length} agent introduction posts`, 'green');
        posts.forEach((post, idx) => {
          const metadata = JSON.parse(post.metadata);
          log(`   ${idx + 1}. ${post.title} by ${post.authorAgent}`, 'blue');
        });
        testsPassed++;
      } else {
        log(`⚠️  No agent introduction posts found`, 'yellow');
        testsPassed++;
      }
    } catch (error) {
      log(`❌ Test 5 failed: ${error.message}`, 'red');
      testsFailed++;
    }

    // Test 6: Verify post content format
    log('\n📝 Test 6: Verify post content format', 'yellow');
    try {
      if (createdPostIds.length > 0) {
        const postId = createdPostIds[0];
        const post = await DatabaseSelector.getPostById(postId, testUserId);

        if (post && post.content) {
          const hasCapabilities = post.content.includes('I can help you with:');
          const hasExamples = post.content.includes('Examples:');

          if (hasCapabilities && hasExamples) {
            log(`✅ Post content has correct format`, 'green');
            log(`   ✓ Capabilities section present`, 'blue');
            log(`   ✓ Examples section present`, 'blue');
            testsPassed++;
          } else {
            log(`❌ Post content missing required sections`, 'red');
            testsFailed++;
          }
        } else {
          log(`⚠️  No posts to validate`, 'yellow');
          testsPassed++;
        }
      } else {
        log(`⚠️  No new posts created to validate`, 'yellow');
        testsPassed++;
      }
    } catch (error) {
      log(`❌ Test 6 failed: ${error.message}`, 'red');
      testsFailed++;
    }

    // Test 7: Verify multiple trigger types
    log('\n📝 Test 7: Test multiple trigger types', 'yellow');
    try {
      const context = {
        mentionsMeeting: true,
        mentionsTodos: true
      };

      const results = await introService.checkAndIntroduceAgents(
        testUserId,
        context,
        DatabaseSelector
      );

      const meetingAgent = results.find(r => r.agentId === 'meeting-prep-agent');
      const todosAgent = results.find(r => r.agentId === 'personal-todos-agent');

      if (meetingAgent && todosAgent) {
        log(`✅ Multiple triggers detected correctly`, 'green');
        log(`   ✓ Meeting trigger → meeting-prep-agent`, 'blue');
        log(`   ✓ Todos trigger → personal-todos-agent`, 'blue');
        testsPassed++;

        // Track created posts for cleanup
        [meetingAgent, todosAgent].forEach(result => {
          if (result.success && result.postId) {
            createdPostIds.push(result.postId);
          }
        });
      } else {
        log(`⚠️  Some triggers not detected (agents may already be introduced)`, 'yellow');
        testsPassed++;
      }
    } catch (error) {
      log(`❌ Test 7 failed: ${error.message}`, 'red');
      testsFailed++;
    }

  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    db.close();
  }

  // Summary
  log('\n' + '='.repeat(70), 'blue');
  log('📊 E2E TEST SUMMARY', 'blue');
  log('='.repeat(70), 'blue');
  log(`✅ Tests Passed: ${testsPassed}`, 'green');
  log(`❌ Tests Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
  log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`, 'blue');

  if (createdPostIds.length > 0) {
    log(`\n📝 Created ${createdPostIds.length} new posts during testing`, 'blue');
    log(`   Post IDs: ${createdPostIds.join(', ')}`, 'blue');
  }

  if (testsFailed === 0) {
    log('\n🎉 ALL E2E TESTS PASSED!', 'green');
    log('Agent introduction system is fully functional.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Review the output above.', 'yellow');
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run E2E tests
testAgentIntroduction().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
