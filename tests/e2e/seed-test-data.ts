/**
 * Seed test data for comment counter validation
 * Creates realistic agent posts with comment counts
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../database.db');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// Sample posts with different comment counts
const testPosts = [
  {
    id: 'test-post-1',
    title: 'Production Validation Test - High Activity',
    content: 'This post has many comments for testing the counter display',
    authorAgent: 'ValidationAgent',
    publishedAt: new Date().toISOString(),
    metadata: JSON.stringify({ tags: ['testing', 'validation'], type: 'status' }),
    engagement: JSON.stringify({ comments: 42, likes: 15, shares: 3, views: 127 })
  },
  {
    id: 'test-post-2',
    title: 'Comment Counter Test - Medium Activity',
    content: 'Testing comment counter with moderate engagement',
    authorAgent: 'TestAgent',
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    metadata: JSON.stringify({ tags: ['testing'], type: 'update' }),
    engagement: JSON.stringify({ comments: 8, likes: 5, shares: 1, views: 45 })
  },
  {
    id: 'test-post-3',
    title: 'Zero Comments Test',
    content: 'This post has no comments yet',
    authorAgent: 'AnnouncementAgent',
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    metadata: JSON.stringify({ tags: ['announcement'], type: 'announcement' }),
    engagement: JSON.stringify({ comments: 0, likes: 2, shares: 0, views: 10 })
  },
  {
    id: 'test-post-4',
    title: 'Single Comment Test',
    content: 'Testing counter display with exactly one comment',
    authorAgent: 'AnalysisAgent',
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
    metadata: JSON.stringify({ tags: ['analysis'], type: 'analysis' }),
    engagement: JSON.stringify({ comments: 1, likes: 3, shares: 0, views: 22 })
  },
  {
    id: 'test-post-5',
    title: 'Large Number Test',
    content: 'Testing counter with a large number of comments',
    authorAgent: 'ReportAgent',
    publishedAt: new Date(Date.now() - 14400000).toISOString(),
    metadata: JSON.stringify({ tags: ['report', 'important'], type: 'report' }),
    engagement: JSON.stringify({ comments: 999, likes: 50, shares: 12, views: 543 })
  }
];

// Clear existing test posts
console.log('🗑️  Clearing existing test data...');
const deleteResult = db.prepare(`DELETE FROM agent_posts WHERE id LIKE 'test-post-%'`).run();
console.log(`   Deleted ${deleteResult.changes} existing test posts`);

// Insert test posts
console.log('\n📝 Inserting test posts...');
const insertStmt = db.prepare(`
  INSERT INTO agent_posts (
    id, title, content, authorAgent,
    publishedAt, metadata, engagement
  ) VALUES (
    @id, @title, @content, @authorAgent,
    @publishedAt, @metadata, @engagement
  )
`);

for (const post of testPosts) {
  try {
    insertStmt.run(post);
    const engagementData = JSON.parse(post.engagement);
    console.log(`   ✓ Created post: ${post.id} (${engagementData.comments} comments)`);
  } catch (error) {
    console.error(`   ✗ Failed to create ${post.id}:`, error);
  }
}

// Verify insertion
const count = db.prepare(`SELECT COUNT(*) as count FROM agent_posts WHERE id LIKE 'test-post-%'`).get();
console.log(`\n✅ Total test posts in database: ${count.count}`);

// Show sample data structure
console.log('\n📊 Sample post structure:');
const samplePost = db.prepare(`SELECT id, title, engagement, authorAgent FROM agent_posts WHERE id = 'test-post-1'`).get();
console.log(JSON.stringify(samplePost, null, 2));

db.close();

console.log('\n✅ Test data seeding complete!');
console.log('   Run validation tests with: npm run test:e2e -- --config=playwright.config.comment-counter.ts');
