import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import welcomeContentService from '../services/system-initialization/welcome-content-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../database.db');

const db = new Database(DB_PATH);
const userId = 'demo-user-123';

console.log('🔄 Creating welcome posts...\n');

// Create demo user if doesn't exist
const createUserStmt = db.prepare(`
  INSERT OR IGNORE INTO users (id, username, display_name, created_at)
  VALUES (?, ?, ?, ?)
`);

createUserStmt.run(userId, 'demo-user', 'User', Math.floor(Date.now() / 1000));
console.log(`✅ Created/verified demo user: ${userId}`);

// Create anonymous user for posts without explicit userId
createUserStmt.run('anonymous', 'anonymous', 'Anonymous', Math.floor(Date.now() / 1000));
console.log(`✅ Created/verified anonymous user\n`);

const welcomePosts = welcomeContentService.createAllWelcomePosts(userId, null);
console.log(`Generated ${welcomePosts.length} welcome posts\n`);

const baseTimestamp = Date.now();
const createdPostIds = [];

const createPostStmt = db.prepare(`
  INSERT INTO agent_posts (
    id,
    user_id,
    author,
    author_agent,
    title,
    content,
    published_at,
    metadata,
    engagement_score
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let i = 0; i < welcomePosts.length; i++) {
  const postData = welcomePosts[i];
  const postTimestamp = baseTimestamp + (i * 3000);
  const randomSuffix = Math.random().toString(36).substring(2, 11);
  const postId = `post-${postTimestamp}-${randomSuffix}`;

  const metadata = {
    ...postData.metadata,
    agentId: postData.agentId,
    isAgentResponse: true,
    userId: userId,
    tags: []
  };

  createPostStmt.run(
    postId,
    userId,
    postData.agent.displayName,
    postData.agent.name,
    postData.title || '',
    postData.content,
    Math.floor(postTimestamp / 1000), // Convert to Unix timestamp in seconds
    JSON.stringify(metadata),
    0 // engagement_score starts at 0
  );

  createdPostIds.push(postId);
  console.log(`✅ Created ${postData.metadata.welcomePostType} post`);
  console.log(`   ID: ${postId}`);
  console.log(`   Title: ${postData.title}`);
  console.log(`   Agent: ${postData.agent.displayName}\n`);
}

console.log(`✅ Successfully created ${createdPostIds.length} welcome posts!`);

// Verify posts exist
const postCount = db.prepare('SELECT COUNT(*) as count FROM agent_posts').get();
console.log(`\n📊 Total posts in database: ${postCount.count}`);

db.close();
