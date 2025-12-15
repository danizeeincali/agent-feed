-- Simple Test Data Creation with UUID generation
-- Creates basic test data for AgentLink UAT

-- Create test users with generated UUIDs
INSERT INTO users (email, name, avatar_url, preferences) VALUES
('alice@example.com', 'Alice Johnson', 'https://api.dicebear.com/7.x/personas/svg?seed=alice', '{"theme": "light", "notifications": {"email": true, "push": true}}'),
('bob@example.com', 'Bob Smith', 'https://api.dicebear.com/7.x/personas/svg?seed=bob', '{"theme": "dark", "notifications": {"email": true, "push": false}}'),
('carol@example.com', 'Carol Davis', 'https://api.dicebear.com/7.x/personas/svg?seed=carol', '{"theme": "auto", "notifications": {"email": false, "push": true}}')
ON CONFLICT (email) DO NOTHING;

-- Get user IDs for posts
DO $$
DECLARE
    alice_id UUID;
    bob_id UUID;
    carol_id UUID;
BEGIN
    SELECT id INTO alice_id FROM users WHERE email = 'alice@example.com';
    SELECT id INTO bob_id FROM users WHERE email = 'bob@example.com';  
    SELECT id INTO carol_id FROM users WHERE email = 'carol@example.com';

    -- Create structured posts
    INSERT INTO posts (title, hook, content_body, author_id, mentioned_agents, link_previews, created_at) VALUES
    ('Welcome to AgentLink!', 'Exploring AI-human collaboration', 
     'This is our first structured post using the new AgentLink format! Features:
     
• Structured content with titles and hooks
• Agent mentions like @content-curator 
• Link previews and metadata
• Real-time engagement tracking
• Threading and replies

What do you think about this new format?', 
     alice_id, 
     ARRAY['content-curator', 'conversation-starter'], 
     '{"https://github.com/anthropics/claude": {"title": "Claude AI", "description": "Constitutional AI assistant"}}',
     NOW() - INTERVAL '2 hours'),

    ('Technical Deep Dive', 'AgentLink platform architecture',
     'Analysis of our new database schema and features:

🔧 **Database Features:**
• 25+ tables with advanced relationships
• Full-text search with GIN indexes
• Materialized views for analytics
• Agent processing pipeline

🤖 **Agent System:**
• 5 specialized AI agents
• Chief of Staff coordination
• Real-time processing

@trend-analyzer what patterns do you see in AI platforms?',
     bob_id,
     ARRAY['trend-analyzer', 'content-curator'],
     '{"https://docs.agentlink.dev": {"title": "AgentLink Docs", "description": "Platform documentation"}}',
     NOW() - INTERVAL '1 hour'),

    ('Community Guidelines', 'Building positive AI interactions',
     'Community guidelines for our platform:

✅ **Do:**
- Be respectful to humans and AI agents
- Provide constructive feedback  
- Report bugs and improvements
- Engage meaningfully

❌ **Don''t:**
- Create spam or low-quality content
- Manipulate AI agents
- Share personal information

@chief-of-staff please review these guidelines.',
     carol_id,
     ARRAY['chief-of-staff'],
     '{}',
     NOW() - INTERVAL '45 minutes');

END $$;

-- Verification
SELECT 'Simple Test Data Created Successfully' as status;
SELECT COUNT(*) as user_count FROM users WHERE email LIKE '%@example.com';
SELECT COUNT(*) as post_count FROM posts;
SELECT title, hook FROM posts ORDER BY created_at DESC LIMIT 3;