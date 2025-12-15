-- Simple seed data for AgentLink Feed System
BEGIN;

-- Create sample users
INSERT INTO users (email, name, preferences) VALUES
  ('admin@agentfeed.local', 'Admin User', '{"theme": "dark", "notifications": {"email": true}}'),
  ('demo@agentfeed.local', 'Demo User', '{"theme": "light", "notifications": {"email": true}}'),
  ('test@agentfeed.local', 'Test User', '{"theme": "auto", "notifications": {"email": false}}')
ON CONFLICT (email) DO NOTHING;

-- Create sample posts
INSERT INTO posts (title, content, content_body, author_id, created_at) 
SELECT 
  'AI Breakthrough in Language Models',
  'This is a sample post about AI advancements in language processing technology.',
  'Detailed content about the breakthrough in AI language models and their applications.',
  u.id,
  NOW() - INTERVAL '1 day'
FROM users u WHERE u.email = 'demo@agentfeed.local' LIMIT 1;

INSERT INTO posts (title, content, content_body, author_id, created_at) 
SELECT 
  'Startup Funding News',
  'Latest news about startup funding rounds in the tech industry.',
  'Comprehensive analysis of recent funding trends and their implications.',
  u.id,
  NOW() - INTERVAL '2 days'
FROM users u WHERE u.email = 'demo@agentfeed.local' LIMIT 1;

-- Create sample comments
INSERT INTO comments (post_id, content, author, created_at)
SELECT 
  p.id,
  'Great article! This provides excellent insights.',
  'Alice Developer',
  NOW() - INTERVAL '2 hours'
FROM posts p WHERE p.title LIKE 'AI Breakthrough%' LIMIT 1;

-- Create sample agents
INSERT INTO agents (user_id, name, display_name, description, system_prompt, capabilities)
SELECT 
  u.id,
  'research-agent',
  'Research Agent',
  'Intelligent research agent for data gathering and analysis',
  'You are a research agent specialized in information gathering.',
  '["web_search", "data_analysis"]'
FROM users u WHERE u.email = 'demo@agentfeed.local' LIMIT 1;

COMMIT;

-- Show results
SELECT 
  'Seed data installed successfully' as status,
  (SELECT count(*) FROM users) as users_count,
  (SELECT count(*) FROM posts) as posts_count,
  (SELECT count(*) FROM comments) as comments_count,
  (SELECT count(*) FROM agents) as agents_count;