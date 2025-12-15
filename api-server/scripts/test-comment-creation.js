/**
 * Integration Test: Comment Creation with author_agent
 * Tests the complete flow from API to database
 */

import Database from 'better-sqlite3';

const API_BASE = 'http://localhost:3001/api';
const db = new Database('/workspaces/agent-feed/database.db');

async function test() {
  console.log('🧪 Testing Comment Creation with author_agent field\n');

  try {
    // 1. Get an existing post or create one
    console.log('1️⃣ Getting test post...');

    let testPost = db.prepare('SELECT id FROM agent_posts LIMIT 1').get();

    if (!testPost) {
      console.log('   No posts found, creating test post via API...');

      const createPostResponse = await fetch(`${API_BASE}/v1/agent-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Test post for comment creation verification',
          author_agent: 'test-agent',
          skipTicket: true
        })
      });

      if (!createPostResponse.ok) {
        const error = await createPostResponse.text();
        console.error('❌ Failed to create test post:', error);
        process.exit(1);
      }

      const postResult = await createPostResponse.json();
      testPost = { id: postResult.data.id };
      console.log(`   ✅ Created test post: ${testPost.id}`);
    } else {
      console.log(`   ✅ Using existing post: ${testPost.id}`);
    }

    // 2. Test creating comment with author_agent field
    console.log('\n2️⃣ Creating comment with author_agent field...');

    const commentData = {
      content: 'Integration test comment with author_agent field',
      author: 'test-user',
      author_agent: 'link-logger-agent',
      skipTicket: true
    };

    const createCommentResponse = await fetch(
      `${API_BASE}/agent-posts/${testPost.id}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentData)
      }
    );

    if (!createCommentResponse.ok) {
      const error = await createCommentResponse.text();
      console.error('❌ Failed to create comment:', error);
      process.exit(1);
    }

    const commentResult = await createCommentResponse.json();
    const createdComment = commentResult.data;

    console.log('   ✅ Comment created via API:');
    console.log('      ID:', createdComment.id);
    console.log('      author:', createdComment.author);
    console.log('      author_agent:', createdComment.author_agent);

    // 3. Verify in database
    console.log('\n3️⃣ Verifying comment in database...');

    const dbComment = db.prepare(`
      SELECT id, author, author_agent, content
      FROM comments
      WHERE id = ?
    `).get(createdComment.id);

    if (!dbComment) {
      console.error('❌ Comment not found in database');
      process.exit(1);
    }

    console.log('   ✅ Comment found in database:');
    console.log('      author:', dbComment.author);
    console.log('      author_agent:', dbComment.author_agent);

    // Verify fields match
    if (dbComment.author !== commentData.author) {
      console.error(`   ❌ author mismatch: expected "${commentData.author}", got "${dbComment.author}"`);
      process.exit(1);
    }

    if (dbComment.author_agent !== commentData.author_agent) {
      console.error(`   ❌ author_agent mismatch: expected "${commentData.author_agent}", got "${dbComment.author_agent}"`);
      process.exit(1);
    }

    console.log('   ✅ All fields match expected values');

    // 4. Test backward compatibility (only author field provided)
    console.log('\n4️⃣ Testing backward compatibility (author only)...');

    const backwardCommentData = {
      content: 'Test comment with only author field',
      author: 'backward-compat-user',
      skipTicket: true
    };

    const backwardResponse = await fetch(
      `${API_BASE}/agent-posts/${testPost.id}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backwardCommentData)
      }
    );

    if (!backwardResponse.ok) {
      const error = await backwardResponse.text();
      console.error('❌ Failed to create backward compat comment:', error);
      process.exit(1);
    }

    const backwardResult = await backwardResponse.json();
    const backwardComment = backwardResult.data;

    console.log('   ✅ Comment created with only author field');
    console.log('      author:', backwardComment.author);
    console.log('      author_agent:', backwardComment.author_agent);

    // Verify author_agent was auto-populated from author
    if (!backwardComment.author_agent) {
      console.error('   ❌ author_agent not auto-populated');
      process.exit(1);
    }

    if (backwardComment.author_agent !== backwardComment.author) {
      console.error('   ❌ author_agent should equal author when not provided');
      process.exit(1);
    }

    console.log('   ✅ author_agent auto-populated from author');

    // 5. Clean up test comments
    console.log('\n5️⃣ Cleaning up test comments...');

    db.prepare('DELETE FROM comments WHERE id IN (?, ?)').run(
      createdComment.id,
      backwardComment.id
    );

    console.log('   ✅ Test comments cleaned up');

    // 6. Final verification
    console.log('\n━'.repeat(60));
    console.log('✅ INTEGRATION TEST PASSED');
    console.log('━'.repeat(60));
    console.log('\nVerified:');
    console.log('  ✅ API accepts author_agent field');
    console.log('  ✅ database-selector.js handles author_agent correctly');
    console.log('  ✅ Database stores both author and author_agent');
    console.log('  ✅ Backward compatibility maintained (author only)');
    console.log('  ✅ author_agent auto-populated when not provided');
    console.log('\nReady for:');
    console.log('  → link-logger agent comment creation');
    console.log('  → AVI agent comment creation');
    console.log('  → Production use');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    db.close();
  }
}

test();
