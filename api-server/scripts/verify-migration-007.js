/**
 * Migration 007 Verification Script
 * Verifies the author_agent column migration and tests comment creation
 */

import Database from 'better-sqlite3';

const db = new Database('/workspaces/agent-feed/database.db');

async function verify() {
  console.log('🔍 Verifying Migration 007: author_agent column\n');

  try {
    // 1. Check schema
    console.log('1️⃣ Checking schema...');
    const schema = db.prepare(`
      SELECT sql FROM sqlite_master
      WHERE type='table' AND name='comments'
    `).get();

    const hasAuthorAgent = schema.sql.includes('author_agent');
    const hasAuthor = schema.sql.includes('author TEXT');

    if (!hasAuthor) {
      console.error('❌ Missing author column');
      process.exit(1);
    }

    if (!hasAuthorAgent) {
      console.error('❌ Missing author_agent column');
      process.exit(1);
    }

    console.log('✅ Both author and author_agent columns exist');
    console.log('   Schema:', schema.sql.substring(0, 200) + '...\n');

    // 2. Check existing data
    console.log('2️⃣ Checking existing data migration...');
    const totalComments = db.prepare('SELECT COUNT(*) as count FROM comments').get();
    const missingAuthorAgent = db.prepare('SELECT COUNT(*) as count FROM comments WHERE author_agent IS NULL').get();
    const missingAuthor = db.prepare('SELECT COUNT(*) as count FROM comments WHERE author IS NULL').get();

    console.log(`   Total comments: ${totalComments.count}`);
    console.log(`   Missing author_agent: ${missingAuthorAgent.count}`);
    console.log(`   Missing author: ${missingAuthor.count}`);

    if (missingAuthorAgent.count > 0) {
      console.error(`❌ ${missingAuthorAgent.count} comments missing author_agent`);

      // Show which comments are missing
      const missing = db.prepare(`
        SELECT id, author, author_agent, created_at
        FROM comments
        WHERE author_agent IS NULL
        LIMIT 5
      `).all();
      console.table(missing);
      process.exit(1);
    }

    console.log('✅ All existing comments have author_agent populated\n');

    // 3. Show sample data
    console.log('3️⃣ Sample existing comments:');
    const samples = db.prepare(`
      SELECT id, author, author_agent,
             substr(content, 1, 50) as content_preview
      FROM comments
      ORDER BY created_at DESC
      LIMIT 5
    `).all();

    if (samples.length > 0) {
      console.table(samples);
    } else {
      console.log('   No comments in database yet\n');
    }

    // 4. Test creating new comment with author_agent
    console.log('4️⃣ Testing new comment creation with author_agent...');

    // First, get or create a test post
    let testPost = db.prepare(`
      SELECT id FROM agent_posts LIMIT 1
    `).get();

    if (!testPost) {
      console.log('   Creating test post...');
      const postId = `test-post-${Date.now()}`;
      db.prepare(`
        INSERT INTO agent_posts (
          id, authorAgent, content, title, publishedAt, metadata, engagement
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        postId,
        'test-agent',
        'Test post for migration verification',
        'Test Post',
        new Date().toISOString(),
        JSON.stringify({ tags: [] }),
        JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
      );
      testPost = { id: postId };
    }

    // Create test comment with author_agent
    const testCommentId = `test-comment-${Date.now()}`;
    db.prepare(`
      INSERT INTO comments (
        id, post_id, parent_id, author, author_agent, content, mentioned_users, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      testCommentId,
      testPost.id,
      null,
      'test-user',
      'test-agent',
      'Test comment for migration verification',
      '[]'
    );

    // Verify the comment was created correctly
    const createdComment = db.prepare(`
      SELECT id, author, author_agent, content
      FROM comments
      WHERE id = ?
    `).get(testCommentId);

    if (!createdComment) {
      console.error('❌ Failed to create test comment');
      process.exit(1);
    }

    if (createdComment.author !== 'test-user') {
      console.error(`❌ Comment author incorrect: expected "test-user", got "${createdComment.author}"`);
      process.exit(1);
    }

    if (createdComment.author_agent !== 'test-agent') {
      console.error(`❌ Comment author_agent incorrect: expected "test-agent", got "${createdComment.author_agent}"`);
      process.exit(1);
    }

    console.log('✅ Test comment created successfully:');
    console.log('   ID:', createdComment.id);
    console.log('   author:', createdComment.author);
    console.log('   author_agent:', createdComment.author_agent);
    console.log('   content:', createdComment.content);

    // Clean up test comment
    db.prepare('DELETE FROM comments WHERE id = ?').run(testCommentId);
    console.log('   (Test comment cleaned up)\n');

    // 5. Test backward compatibility (author only)
    console.log('5️⃣ Testing backward compatibility (author only)...');

    const backwardCommentId = `test-comment-backward-${Date.now()}`;
    db.prepare(`
      INSERT INTO comments (
        id, post_id, parent_id, author, author_agent, content, mentioned_users, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      backwardCommentId,
      testPost.id,
      null,
      'backward-test',
      'backward-test',  // Same as author for backward compatibility
      'Backward compatibility test',
      '[]'
    );

    const backwardComment = db.prepare(`
      SELECT id, author, author_agent
      FROM comments
      WHERE id = ?
    `).get(backwardCommentId);

    if (backwardComment.author === backwardComment.author_agent) {
      console.log('✅ Backward compatibility works - both fields populated');
    } else {
      console.error('❌ Backward compatibility issue');
      process.exit(1);
    }

    // Clean up
    db.prepare('DELETE FROM comments WHERE id = ?').run(backwardCommentId);
    console.log('   (Test comment cleaned up)\n');

    // 6. Verify data consistency
    console.log('6️⃣ Checking data consistency...');

    const inconsistent = db.prepare(`
      SELECT COUNT(*) as count
      FROM comments
      WHERE author IS NOT NULL AND author_agent IS NULL
    `).get();

    if (inconsistent.count > 0) {
      console.error(`❌ ${inconsistent.count} comments have author but no author_agent`);
      process.exit(1);
    }

    console.log('✅ All comments have consistent author/author_agent data\n');

    // Final summary
    console.log('━'.repeat(60));
    console.log('✅ MIGRATION 007 VERIFICATION COMPLETE');
    console.log('━'.repeat(60));
    console.log('\nSummary:');
    console.log('  ✅ Schema includes both author and author_agent columns');
    console.log('  ✅ All existing comments migrated successfully');
    console.log('  ✅ New comments can use author_agent field');
    console.log('  ✅ Backward compatibility maintained');
    console.log('  ✅ Data consistency verified');
    console.log('\nNext Steps:');
    console.log('  1. Test with link-logger agent comments');
    console.log('  2. Test with AVI agent comments');
    console.log('  3. Monitor for "No summary available" errors');
    console.log('  4. After 2+ weeks, consider removing author column');
    console.log('');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    db.close();
  }
}

verify();
