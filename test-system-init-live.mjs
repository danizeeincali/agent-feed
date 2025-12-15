/**
 * Test System Initialization - Direct Database Test
 */

import Database from 'better-sqlite3';
import FirstTimeSetupService from './api-server/services/system-initialization/first-time-setup-service.js';

const db = new Database('./database.db');

async function testSystemInitialization() {
  console.log('Testing System Initialization with Post Creation\n');

  // 1. Clean up any existing test posts
  console.log('1. Cleaning up existing system initialization posts...');
  const deletedCount = db.prepare(`
    DELETE FROM agent_posts
    WHERE metadata LIKE '%systemInitialization%'
    AND author_id = 'test-init-user'
  `).run();
  console.log(`   Deleted ${deletedCount.changes} existing posts\n`);

  // 2. Create service and initialize system
  console.log('2. Initializing system with posts...');
  const service = new FirstTimeSetupService(db);

  try {
    const result = await service.initializeSystemWithPosts('test-init-user', 'Test User');

    console.log('   Result:', JSON.stringify(result, null, 2));
    console.log('');

    // 3. Verify posts in database
    console.log('3. Verifying posts in database...');
    const posts = db.prepare(`
      SELECT id, authorAgent, title, metadata
      FROM agent_posts
      WHERE author_id = 'test-init-user'
      ORDER BY created_at ASC
    `).all();

    console.log(`   Found ${posts.length} posts:\n`);
    posts.forEach((post, idx) => {
      const metadata = JSON.parse(post.metadata);
      console.log(`   Post ${idx + 1}:`);
      console.log(`     ID: ${post.id}`);
      console.log(`     Author: ${post.authorAgent}`);
      console.log(`     Title: ${post.title}`);
      console.log(`     Type: ${metadata.welcomePostType}`);
      console.log(`     Is System Init: ${metadata.isSystemInitialization}`);
      console.log('');
    });

    // 4. Verify content validation
    console.log('4. Validating Λvi post content...');
    const aviPost = posts.find(p => p.authorAgent === 'lambda-vi');
    if (aviPost) {
      const fullPost = db.prepare('SELECT content FROM agent_posts WHERE id = ?').get(aviPost.id);
      const content = fullPost.content;
      const hasChiefOfStaff = content.toLowerCase().includes('chief of staff');
      console.log(`   Λvi post does NOT contain "chief of staff": ${!hasChiefOfStaff}`);

      if (hasChiefOfStaff) {
        console.log('   FAILED: Λvi post contains prohibited phrase!');
      } else {
        console.log('   PASSED: Content validation successful');
      }
    }
    console.log('');

    // 5. Test idempotency
    console.log('5. Testing idempotency...');
    const result2 = await service.initializeSystemWithPosts('test-init-user', 'Test User');
    console.log('   Result:', JSON.stringify(result2, null, 2));

    const postsAfterSecondCall = db.prepare(`
      SELECT COUNT(*) as count FROM agent_posts WHERE author_id = 'test-init-user'
    `).get();
    console.log(`   Posts count after second call: ${postsAfterSecondCall.count}`);
    console.log(`   Idempotency check: ${postsAfterSecondCall.count === 3 ? 'PASSED' : 'FAILED'}\n`);

    console.log('All tests completed successfully!');

  } catch (error) {
    console.error('Error during testing:', error);
    throw error;
  } finally {
    db.close();
  }
}

testSystemInitialization().catch(console.error);
