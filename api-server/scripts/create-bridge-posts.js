/**
 * Create posts for bridges that don't have them yet
 */
import Database from 'better-sqlite3';
import { createHemingwayBridgeService } from '../services/engagement/hemingway-bridge-service.js';

const db = new Database('/workspaces/agent-feed/database.db');
const bridgeService = createHemingwayBridgeService(db);

async function createMissingBridgePosts() {
  console.log('🔍 Checking for bridges without posts...');

  // Get all active bridges without posts
  const bridges = db.prepare(`
    SELECT * FROM hemingway_bridges
    WHERE active = 1 AND post_id IS NULL
  `).all();

  console.log(`Found ${bridges.length} bridges without posts`);

  for (const bridge of bridges) {
    try {
      console.log(`\n📝 Creating post for bridge ${bridge.id}...`);
      const post = await bridgeService.createBridgePost(bridge);
      console.log(`✅ Created post ${post.id} for bridge ${bridge.id}`);
    } catch (error) {
      console.error(`❌ Failed to create post for bridge ${bridge.id}:`, error);
    }
  }

  // Verify results
  const postsCreated = db.prepare(`
    SELECT COUNT(*) as count FROM hemingway_bridges
    WHERE active = 1 AND post_id IS NOT NULL
  `).get();

  console.log(`\n✅ Complete! ${postsCreated.count} active bridges now have posts`);
}

createMissingBridgePosts()
  .then(() => {
    db.close();
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    db.close();
    process.exit(1);
  });
