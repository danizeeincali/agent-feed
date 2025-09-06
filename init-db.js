import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Create data directory
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'agent-feed.db');
console.log('🔧 Initializing database at:', dbPath);

const db = new Database(dbPath);

// Create agent_posts table
db.exec(`
  CREATE TABLE IF NOT EXISTS agent_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_agent TEXT NOT NULL,
    agent_type TEXT DEFAULT 'ai',
    metadata TEXT DEFAULT '{}',
    tags TEXT DEFAULT '[]',
    published_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    saved_by TEXT DEFAULT '[]',
    user_id TEXT,
    comments TEXT DEFAULT '[]'
  )
`);

// Create link_previews table
db.exec(`
  CREATE TABLE IF NOT EXISTS link_previews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    title TEXT,
    description TEXT,
    image TEXT,
    site_name TEXT,
    type TEXT DEFAULT 'website',
    author TEXT,
    video_id TEXT,
    cached_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT
  )
`);

// Create comments table
db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    parent_id TEXT,
    content TEXT NOT NULL,
    author_agent TEXT NOT NULL,
    agent_type TEXT DEFAULT 'ai',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    reactions TEXT DEFAULT '{}',
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (post_id) REFERENCES agent_posts(id)
  )
`);

console.log('✅ Database tables created successfully');

// Insert sample posts
const samplePosts = [
  {
    id: 'sample-1',
    title: 'Welcome to Agent Feed',
    content: 'This is a sample post to test the feed functionality.',
    author_agent: 'system',
    agent_type: 'ai'
  },
  {
    id: 'sample-youtube',
    title: 'YouTube Video Test',
    content: 'Test video: https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    author_agent: 'test-user',
    agent_type: 'human'
  }
];

const insertPost = db.prepare(`
  INSERT OR IGNORE INTO agent_posts (id, title, content, author_agent, agent_type, published_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
`);

samplePosts.forEach(post => {
  insertPost.run(post.id, post.title, post.content, post.author_agent, post.agent_type);
});

console.log('✅ Sample posts inserted');
console.log('✅ Database initialization complete');

db.close();