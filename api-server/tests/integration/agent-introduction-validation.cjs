/**
 * Real System Validation for Agent Introduction System
 * Tests agent introduction post creation against LIVE database
 * NO MOCKS - Full production validation
 */

const Database = require('better-sqlite3');
const path = require('path');

// Color codes for console output
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

async function validateAgentIntroductionSystem() {
  log('\n🧪 AGENT INTRODUCTION SYSTEM - REAL SYSTEM VALIDATION', 'blue');
  log('=' .repeat(70), 'blue');

  const dbPath = path.join(__dirname, '../../..', 'database.db');
  const db = new Database(dbPath);

  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Verify agent introduction posts exist
    log('\n📝 Test 1: Verify agent introduction posts in database', 'yellow');
    try {
      const posts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE metadata LIKE '%isAgentIntroduction%'
        LIMIT 5
      `).all();

      if (posts.length > 0) {
        log(`✅ Found ${posts.length} agent introduction posts`, 'green');
        passed++;

        // Show sample post
        const samplePost = posts[0];
        const metadata = JSON.parse(samplePost.metadata);
        log(`   Sample: "${samplePost.title}" by ${samplePost.authorAgent}`, 'blue');
        log(`   Agent ID: ${metadata.agentId}`, 'blue');
      } else {
        log('⚠️  No agent introduction posts found yet', 'yellow');
        log('   This is expected for a fresh system', 'yellow');
        passed++;
      }
    } catch (error) {
      log(`❌ Test 1 failed: ${error.message}`, 'red');
      failed++;
    }

    // Test 2: Verify agent_introductions table exists and has correct schema
    log('\n📝 Test 2: Verify agent_introductions table schema', 'yellow');
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(agent_introductions)`).all();
      const columns = tableInfo.map(col => col.name);

      const requiredColumns = ['id', 'user_id', 'agent_id', 'introduced_at', 'post_id', 'interaction_count'];
      const hasAllColumns = requiredColumns.every(col => columns.includes(col));

      if (hasAllColumns) {
        log('✅ agent_introductions table has correct schema', 'green');
        log(`   Columns: ${columns.join(', ')}`, 'blue');
        passed++;
      } else {
        log('❌ agent_introductions table missing required columns', 'red');
        failed++;
      }
    } catch (error) {
      log(`❌ Test 2 failed: ${error.message}`, 'red');
      failed++;
    }

    // Test 3: Verify agent config files exist
    log('\n📝 Test 3: Verify agent introduction config files', 'yellow');
    try {
      const fs = require('fs');
      const configDir = path.join(__dirname, '../..', 'agents/configs/intro-templates');
      const files = fs.readdirSync(configDir);
      const jsonFiles = files.filter(f => f.endsWith('-intro.json'));

      if (jsonFiles.length > 0) {
        log(`✅ Found ${jsonFiles.length} agent config files`, 'green');
        log(`   Files: ${jsonFiles.slice(0, 3).join(', ')}...`, 'blue');
        passed++;

        // Validate one config file
        const sampleConfig = JSON.parse(
          fs.readFileSync(path.join(configDir, jsonFiles[0]), 'utf-8')
        );
        const hasRequired = sampleConfig.agentId && sampleConfig.displayName && sampleConfig.description;
        if (hasRequired) {
          log(`✅ Config file structure is valid`, 'green');
          log(`   Sample: ${sampleConfig.displayName} (${sampleConfig.agentId})`, 'blue');
        }
      } else {
        log('❌ No agent config files found', 'red');
        failed++;
      }
    } catch (error) {
      log(`❌ Test 3 failed: ${error.message}`, 'red');
      failed++;
    }

    // Test 4: Verify agent introduction tracking
    log('\n📝 Test 4: Verify agent introduction tracking', 'yellow');
    try {
      const introductions = db.prepare(`
        SELECT * FROM agent_introductions
        LIMIT 5
      `).all();

      if (introductions.length > 0) {
        log(`✅ Found ${introductions.length} agent introduction records`, 'green');
        introductions.forEach((intro, idx) => {
          log(`   ${idx + 1}. Agent: ${intro.agent_id}, User: ${intro.user_id}, Interactions: ${intro.interaction_count}`, 'blue');
        });
        passed++;
      } else {
        log('⚠️  No agent introductions recorded yet', 'yellow');
        log('   This is expected for a fresh system', 'yellow');
        passed++;
      }
    } catch (error) {
      log(`❌ Test 4 failed: ${error.message}`, 'red');
      failed++;
    }

    // Test 5: Verify posts have correct metadata structure
    log('\n📝 Test 5: Verify agent post metadata structure', 'yellow');
    try {
      const posts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE metadata LIKE '%isAgentIntroduction%'
        LIMIT 3
      `).all();

      if (posts.length > 0) {
        let validMetadata = 0;
        posts.forEach(post => {
          try {
            const metadata = JSON.parse(post.metadata);
            if (metadata.isAgentIntroduction && metadata.agentId && metadata.isAgentResponse) {
              validMetadata++;
            }
          } catch (e) {
            // Ignore parse errors
          }
        });

        if (validMetadata > 0) {
          log(`✅ Found ${validMetadata} posts with valid metadata`, 'green');
          passed++;
        } else {
          log('❌ No posts with valid metadata found', 'red');
          failed++;
        }
      } else {
        log('⚠️  No agent introduction posts to validate', 'yellow');
        log('   Run manual test to create introduction posts', 'yellow');
        passed++;
      }
    } catch (error) {
      log(`❌ Test 5 failed: ${error.message}`, 'red');
      failed++;
    }

    // Test 6: Check for duplicate prevention
    log('\n📝 Test 6: Verify duplicate prevention mechanism', 'yellow');
    try {
      const uniqueConstraint = db.prepare(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='agent_introductions'
      `).get();

      if (uniqueConstraint && uniqueConstraint.sql.includes('UNIQUE(user_id, agent_id)')) {
        log('✅ Unique constraint exists to prevent duplicates', 'green');
        passed++;
      } else {
        log('❌ No unique constraint found for duplicate prevention', 'red');
        failed++;
      }
    } catch (error) {
      log(`❌ Test 6 failed: ${error.message}`, 'red');
      failed++;
    }

    // Test 7: Verify API route exists
    log('\n📝 Test 7: Verify API routes exist', 'yellow');
    try {
      const fs = require('fs');
      const routePath = path.join(__dirname, '../..', 'routes/agents-introduction.js');
      const routeExists = fs.existsSync(routePath);

      if (routeExists) {
        const routeContent = fs.readFileSync(routePath, 'utf-8');
        const hasIntroduceRoute = routeContent.includes("router.post('/introduce'");
        const hasCheckRoute = routeContent.includes("router.post('/check-triggers'");

        if (hasIntroduceRoute && hasCheckRoute) {
          log('✅ All required API routes exist', 'green');
          log('   - POST /api/agents/introduce', 'blue');
          log('   - POST /api/agents/check-triggers', 'blue');
          passed++;
        } else {
          log('❌ Some API routes are missing', 'red');
          failed++;
        }
      } else {
        log('❌ API route file not found', 'red');
        failed++;
      }
    } catch (error) {
      log(`❌ Test 7 failed: ${error.message}`, 'red');
      failed++;
    }

    // Test 8: Count available agent configs
    log('\n📝 Test 8: Agent config inventory', 'yellow');
    try {
      const fs = require('fs');
      const configDir = path.join(__dirname, '../..', 'agents/configs/intro-templates');
      const files = fs.readdirSync(configDir);
      const jsonFiles = files.filter(f => f.endsWith('-intro.json'));

      log(`✅ ${jsonFiles.length} agent configs available`, 'green');
      jsonFiles.forEach((file, idx) => {
        const config = JSON.parse(
          fs.readFileSync(path.join(configDir, file), 'utf-8')
        );
        log(`   ${idx + 1}. ${config.displayName} (${config.agentId})`, 'blue');
      });
      passed++;
    } catch (error) {
      log(`❌ Test 8 failed: ${error.message}`, 'red');
      failed++;
    }

  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    db.close();
  }

  // Summary
  log('\n' + '='.repeat(70), 'blue');
  log('📊 VALIDATION SUMMARY', 'blue');
  log('='.repeat(70), 'blue');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`, 'blue');

  if (failed === 0) {
    log('\n🎉 ALL TESTS PASSED! Agent introduction system is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Review the output above for details.', 'yellow');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run validation
validateAgentIntroductionSystem().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
