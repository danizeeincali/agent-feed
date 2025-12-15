-- Simple seed data for AgentLink Feed System
-- PostgreSQL seed data script

BEGIN;

-- Create sample users
INSERT INTO users (id, email, name, avatar_url, preferences) VALUES
  (
    uuid_generate_v4(),
    'admin@agentfeed.local',
    'Admin User',
    NULL,
    '{
      "theme": "dark",
      "notifications": {
        "email": true,
        "push": true,
        "feed_updates": true,
        "agent_completion": true,
        "error_alerts": true
      },
      "feed_settings": {
        "auto_refresh": true,
        "items_per_page": 50,
        "default_view": "list",
        "show_preview": true
      },
      "automation_enabled": true
    }'
  ),
  (
    uuid_generate_v4(),
    'demo@agentfeed.local',
    'Demo User',
    NULL,
    '{
      "theme": "light",
      "notifications": {
        "email": true,
        "push": false,
        "feed_updates": true,
        "agent_completion": false,
        "error_alerts": true
      },
      "feed_settings": {
        "auto_refresh": false,
        "items_per_page": 25,
        "default_view": "cards",
        "show_preview": true
      },
      "automation_enabled": false
    }'
  ),
  (
    uuid_generate_v4(),
    'test@agentfeed.local',
    'Test User',
    NULL,
    '{
      "theme": "auto",
      "notifications": {
        "email": false,
        "push": true,
        "feed_updates": true,
        "agent_completion": true,
        "error_alerts": false
      },
      "feed_settings": {
        "auto_refresh": true,
        "items_per_page": 100,
        "default_view": "list",
        "show_preview": false
      },
      "automation_enabled": true
    }'
  )
ON CONFLICT (email) DO NOTHING;

-- Get user IDs for reference
WITH user_data AS (
  SELECT id, email FROM users WHERE email IN ('demo@agentfeed.local', 'admin@agentfeed.local')
)

-- Create sample feeds
INSERT INTO feeds (user_id, name, description, url, feed_type, status, automation_config) 
SELECT 
  ud.id,
  feed_name,
  feed_description,
  feed_url,
  feed_type_val,
  'active',
  automation_config_val::jsonb
FROM user_data ud,
VALUES 
  (
    'TechCrunch RSS',
    'Latest technology news and startup updates from TechCrunch',
    'https://techcrunch.com/feed/',
    'rss',
    '{
      "enabled": true,
      "triggers": [
        {
          "id": "tech-keywords",
          "type": "keyword_match",
          "conditions": {"keywords": ["AI", "machine learning", "startup", "funding"]},
          "enabled": true
        }
      ],
      "actions": [
        {
          "id": "claude-analysis",
          "type": "claude_flow_spawn",
          "config": {"agent_types": ["researcher", "analyzer"]},
          "priority": 1
        }
      ],
      "claude_flow_config": {
        "swarm_topology": "mesh",
        "max_agents": 5,
        "agent_types": ["researcher", "analyzer"],
        "neural_training": true,
        "memory_persistence": true
      }
    }'
  ),
  (
    'GitHub Engineering Blog',
    'Engineering insights and updates from GitHub',
    'https://github.blog/engineering.atom',
    'atom',
    '{
      "enabled": false,
      "triggers": [],
      "actions": [],
      "claude_flow_config": {
        "swarm_topology": "hierarchical",
        "max_agents": 3,
        "agent_types": ["researcher"],
        "neural_training": false,
        "memory_persistence": false
      }
    }'
  ),
  (
    'AWS News Blog',
    'Latest updates and announcements from Amazon Web Services',
    'https://aws.amazon.com/blogs/aws/feed/',
    'rss',
    '{
      "enabled": true,
      "triggers": [
        {
          "id": "new-aws-post",
          "type": "new_item",
          "conditions": {},
          "enabled": true
        }
      ],
      "actions": [
        {
          "id": "notification",
          "type": "notification",
          "config": {"type": "email", "template": "new_post"},
          "priority": 2
        }
      ],
      "claude_flow_config": {
        "swarm_topology": "star",
        "max_agents": 2,
        "agent_types": ["analyzer"],
        "neural_training": true,
        "memory_persistence": true
      }
    }'
  )
) AS feed_data(feed_name, feed_description, feed_url, feed_type_val, automation_config_val)
WHERE ud.email = 'demo@agentfeed.local'
ON CONFLICT (user_id, url) DO NOTHING;

-- Create sample posts using the posts table
WITH demo_user AS (
  SELECT id FROM users WHERE email = 'demo@agentfeed.local' LIMIT 1
)
INSERT INTO posts (title, content, content_body, author_id, created_at, last_interaction_at)
SELECT 
  post_title,
  post_content,
  post_content,
  demo_user.id,
  NOW() - (post_age || ' hours')::INTERVAL,
  NOW() - (post_age || ' hours')::INTERVAL
FROM demo_user,
VALUES 
  (
    'AI Breakthrough: New Language Model Achieves Human-Level Performance',
    'Researchers at the Institute for Advanced AI have developed a revolutionary language model that demonstrates human-level performance across a comprehensive range of cognitive tasks. The model, named "CogniLM", incorporates novel attention mechanisms and multi-modal learning approaches that enable it to understand and generate text with unprecedented accuracy and contextual awareness.',
    4
  ),
  (
    'Startup Raises $50M Series B for AI-Powered Developer Tools',
    'DevTools Inc. announced today that they have successfully closed a $50M Series B funding round led by Sequoia Capital. The startup has developed an AI-powered development platform that automates code review, bug detection, and performance optimization. Since launching their beta last year, they have acquired over 10,000 enterprise customers.',
    8
  ),
  (
    'How Machine Learning is Transforming Software Engineering',
    'The software engineering landscape is experiencing a paradigm shift as machine learning technologies become deeply integrated into development workflows. From automated code generation to intelligent debugging, ML is helping developers write better code faster. This comprehensive analysis explores the current state and future potential of AI in software development.',
    12
  ),
  (
    'The Future of Autonomous Agents in Enterprise',
    'Enterprise organizations worldwide are beginning to adopt autonomous AI agents to streamline business processes, reduce operational costs, and improve decision-making speed. These intelligent agents can handle complex workflows, interact with multiple systems, and adapt to changing business requirements without human intervention.',
    24
  ),
  (
    'Building Scalable Real-time Applications with WebSockets',
    'Real-time communication has become essential for modern web applications. This technical deep-dive explores best practices for implementing WebSocket-based architectures that can handle millions of concurrent connections while maintaining low latency and high reliability.',
    36
  )
) AS post_data(post_title, post_content, post_age);

-- Create sample comments
WITH sample_posts AS (
  SELECT id, title FROM posts ORDER BY created_at DESC LIMIT 3
)
INSERT INTO comments (post_id, content, author, created_at)
SELECT 
  sp.id,
  comment_content,
  comment_author,
  NOW() - (comment_age || ' hours')::INTERVAL
FROM sample_posts sp,
VALUES 
  ('Great article! This really helps explain the complexity of modern AI systems.', 'Alice Developer', 2),
  ('I would love to see more technical details about the attention mechanisms.', 'Bob ML Engineer', 3),
  ('This could revolutionize how we approach software development.', 'Carol CTO', 1),
  ('Interesting perspective on enterprise adoption. We''re seeing similar trends.', 'David Analyst', 5),
  ('The performance metrics are impressive. Looking forward to trying this out.', 'Eve Product Manager', 4)
) AS comment_data(comment_content, comment_author, comment_age);

-- Create sample engagement data
WITH sample_posts AS (
  SELECT id FROM posts LIMIT 3
)
INSERT INTO post_likes (post_id, user_id, created_at)
SELECT 
  sp.id,
  u.id,
  NOW() - (random() * 48 || ' hours')::INTERVAL
FROM sample_posts sp
CROSS JOIN (
  SELECT id FROM users WHERE email IN ('demo@agentfeed.local', 'admin@agentfeed.local')
) u;

-- Create sample agent data
WITH demo_user AS (
  SELECT id FROM users WHERE email = 'demo@agentfeed.local' LIMIT 1
)
INSERT INTO agents (user_id, name, display_name, description, system_prompt, avatar_color, capabilities, status)
SELECT 
  demo_user.id,
  agent_name,
  agent_display_name,
  agent_description,
  agent_system_prompt,
  agent_avatar_color,
  agent_capabilities::jsonb,
  'active'
FROM demo_user,
VALUES 
  (
    'research-agent',
    'Research Agent',
    'An intelligent research agent that can gather, analyze, and synthesize information from various sources.',
    'You are a research agent specialized in gathering and analyzing information. Your role is to search for relevant data, verify facts, and provide comprehensive research summaries.',
    '#3B82F6',
    '["web_search", "data_analysis", "fact_checking", "summarization"]'
  ),
  (
    'content-analyzer',
    'Content Analyzer',
    'Advanced content analysis agent that can process text, extract insights, and generate summaries.',
    'You are a content analysis agent. Your primary function is to analyze text content, extract key insights, identify patterns, and generate meaningful summaries.',
    '#10B981',
    '["text_analysis", "sentiment_analysis", "keyword_extraction", "summarization"]'
  ),
  (
    'automation-coordinator',
    'Automation Coordinator',
    'Coordinator agent that manages workflow automation and agent collaboration.',
    'You are an automation coordinator responsible for managing complex workflows, coordinating between different agents, and ensuring efficient task execution.',
    '#F59E0B',
    '["workflow_management", "agent_coordination", "task_scheduling", "performance_monitoring"]'
  )
) AS agent_data(agent_name, agent_display_name, agent_description, agent_system_prompt, agent_avatar_color, agent_capabilities);

-- Create sample neural patterns
WITH demo_feeds AS (
  SELECT id FROM feeds WHERE user_id = (SELECT id FROM users WHERE email = 'demo@agentfeed.local') LIMIT 2
)
INSERT INTO neural_patterns (feed_id, pattern_type, pattern_data, confidence_score, usage_count)
SELECT 
  df.id,
  pattern_type_val,
  pattern_data_val::jsonb,
  confidence_score_val,
  usage_count_val
FROM demo_feeds df,
VALUES 
  (
    'coordination',
    '{
      "swarm_efficiency": 0.85,
      "agent_collaboration": ["research-agent", "content-analyzer"],
      "optimal_topology": "mesh",
      "task_distribution": "balanced",
      "learned_patterns": ["keyword_extraction", "content_categorization"]
    }',
    0.92,
    27
  ),
  (
    'optimization',
    '{
      "performance_metrics": {
        "latency": 150,
        "throughput": 95,
        "accuracy": 0.94
      },
      "optimization_targets": ["speed", "accuracy"],
      "learned_patterns": ["sentiment_analysis", "entity_recognition"],
      "model_improvements": ["attention_tuning", "context_expansion"]
    }',
    0.88,
    34
  ),
  (
    'prediction',
    '{
      "prediction_accuracy": 0.91,
      "features": ["title_keywords", "content_length", "author_history", "engagement_patterns"],
      "model_type": "ensemble",
      "training_samples": 1000,
      "prediction_targets": ["user_interest", "content_quality", "viral_potential"]
    }',
    0.87,
    19
  )
) AS pattern_data(pattern_type_val, pattern_data_val, confidence_score_val, usage_count_val);

-- Create sample Claude Flow sessions
INSERT INTO claude_flow_sessions (user_id, swarm_id, status, configuration, metrics)
SELECT 
  u.id,
  'swarm-' || floor(random() * 1000)::text,
  session_status,
  session_config::jsonb,
  session_metrics::jsonb
FROM (SELECT id FROM users WHERE email = 'demo@agentfeed.local') u,
VALUES 
  (
    'active',
    '{
      "topology": "mesh",
      "max_agents": 5,
      "agent_types": ["research-agent", "content-analyzer"],
      "neural_training": true,
      "memory_persistence": true,
      "auto_scaling": true
    }',
    '{
      "agents_spawned": 3,
      "tasks_completed": 15,
      "total_tokens_used": 25000,
      "performance_score": 0.89,
      "neural_patterns_learned": 5,
      "session_duration": 1800,
      "average_task_time": 120
    }'
  ),
  (
    'completed',
    '{
      "topology": "hierarchical",
      "max_agents": 3,
      "agent_types": ["automation-coordinator"],
      "neural_training": false,
      "memory_persistence": true,
      "auto_scaling": false
    }',
    '{
      "agents_spawned": 3,
      "tasks_completed": 8,
      "total_tokens_used": 12000,
      "performance_score": 0.92,
      "neural_patterns_learned": 2,
      "session_duration": 900,
      "average_task_time": 110
    }'
  )
) AS session_data(session_status, session_config, session_metrics);

-- Update counts and statistics
UPDATE users SET last_login = NOW() - (random() * 24 || ' hours')::INTERVAL;

COMMIT;

-- Display seeding results
SELECT 
  'Seeding completed successfully' as status,
  (SELECT count(*) FROM users) as users_count,
  (SELECT count(*) FROM feeds) as feeds_count,
  (SELECT count(*) FROM posts) as posts_count,
  (SELECT count(*) FROM comments) as comments_count,
  (SELECT count(*) FROM agents) as agents_count,
  (SELECT count(*) FROM neural_patterns) as neural_patterns_count,
  (SELECT count(*) FROM claude_flow_sessions) as sessions_count;