/**
 * Database Seeding Functions
 * Phase 1: System template seeding with validation
 */

import { Pool } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import { validateSystemTemplateConfig, SystemTemplateConfig } from '../types/agent-templates';
import { logger } from '../utils/logger';

/**
 * Seed system agent templates from JSON configuration files
 *
 * London School TDD Approach:
 * - Coordinates between filesystem and database
 * - Validates data before persistence
 * - Uses UPSERT pattern for idempotency
 *
 * @param pool - PostgreSQL connection pool
 * @param configDir - Directory containing template JSON files. Defaults to
 *                    $WORKSPACE_ROOT/config/system/agent-templates or
 *                    process.cwd()/config/system/agent-templates
 */
export async function seedSystemTemplates(
  pool: Pool,
  configDir: string = process.env.WORKSPACE_ROOT
    ? path.join(process.env.WORKSPACE_ROOT, 'config/system/agent-templates')
    : path.join(process.cwd(), 'config/system/agent-templates')
): Promise<void> {
  try {
    logger.info('Starting system template seeding...');

    // Read all JSON files from config directory
    const files = await fs.readdir(configDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
      logger.warn(`No JSON template files found in ${configDir}`);
      return;
    }

    logger.info(`Found ${jsonFiles.length} template files`);

    // Process each template file
    for (const file of jsonFiles) {
      const filePath = path.join(configDir, file);

      try {
        // Read and parse JSON file
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const templateData = JSON.parse(fileContent);

        // Validate template schema
        const validationResult = validateSystemTemplateConfig(templateData);

        if (!validationResult.success) {
          throw new Error(
            `Validation failed for ${file}: ${validationResult.errors.message}`
          );
        }

        const template = validationResult.data;

        // Insert or update template (UPSERT for idempotency)
        const query = `
          INSERT INTO system_agent_templates (
            name,
            version,
            model,
            posting_rules,
            api_schema,
            safety_constraints,
            default_personality,
            default_response_style
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (name) DO UPDATE SET
            version = EXCLUDED.version,
            model = EXCLUDED.model,
            posting_rules = EXCLUDED.posting_rules,
            api_schema = EXCLUDED.api_schema,
            safety_constraints = EXCLUDED.safety_constraints,
            default_personality = EXCLUDED.default_personality,
            default_response_style = EXCLUDED.default_response_style,
            updated_at = NOW()
        `;

        const values = [
          template.name,
          template.version,
          template.model,
          JSON.stringify(template.posting_rules),
          JSON.stringify(template.api_schema),
          JSON.stringify(template.safety_constraints),
          template.default_personality,
          template.default_response_style ? JSON.stringify(template.default_response_style) : null
        ];

        await pool.query(query, values);
        logger.info(`Seeded template: ${template.name} (version ${template.version})`);

      } catch (error) {
        logger.error(`Failed to process template file ${file}:`, error);
        throw error; // Re-throw to fail fast on errors
      }
    }

    logger.info('System template seeding completed successfully');

  } catch (error) {
    logger.error('System template seeding failed:', error);
    throw error;
  }
}

// ============================================================================
// OLD SEEDING LOGIC (Preserved for backward compatibility)
// ============================================================================

import { db } from './connection';
import { AuthService } from '@/middleware/auth';

interface SeedUser {
  email: string;
  name: string;
  password: string;
  isAdmin?: boolean;
}

interface SeedFeed {
  name: string;
  description: string;
  url: string;
  feed_type: string;
  automation_config?: any;
}

class DatabaseSeeder {
  private async createSeedUsers(): Promise<void> {
    const seedUsers: SeedUser[] = [
      {
        email: 'admin@agentfeed.local',
        name: 'Admin User',
        password: 'admin123456',
        isAdmin: true
      },
      {
        email: 'demo@agentfeed.local',
        name: 'Demo User',
        password: 'demo123456'
      },
      {
        email: 'test@agentfeed.local',
        name: 'Test User',
        password: 'test123456'
      }
    ];

    for (const userData of seedUsers) {
      try {
        // Check if user already exists
        const existingUser = await AuthService.getUserByEmail(userData.email);
        if (existingUser) {
          logger.info(`User ${userData.email} already exists, skipping...`);
          continue;
        }

        // Create user
        const user = await AuthService.createUser({
          email: userData.email,
          name: userData.name,
          password: userData.password
        });

        logger.info(`Created seed user: ${userData.email} (ID: ${user.id})`);
      } catch (error) {
        logger.error(`Failed to create seed user ${userData.email}:`, error);
      }
    }
  }

  private async createSeedFeeds(): Promise<void> {
    // Get demo user
    const demoUser = await AuthService.getUserByEmail('demo@agentfeed.local');
    if (!demoUser) {
      logger.warn('Demo user not found, skipping feed creation');
      return;
    }

    const seedFeeds: SeedFeed[] = [
      {
        name: 'TechCrunch',
        description: 'Latest technology news and startup updates',
        url: 'https://techcrunch.com/feed/',
        feed_type: 'rss',
        automation_config: {
          enabled: true,
          triggers: [
            {
              id: 'tech-keywords',
              type: 'keyword_match',
              conditions: { keywords: ['AI', 'machine learning', 'startup', 'funding'] },
              enabled: true
            }
          ],
          actions: [
            {
              id: 'claude-analysis',
              type: 'claude_flow_spawn',
              config: { agent_types: ['researcher', 'analyzer'] },
              priority: 1
            }
          ],
          claude_flow_config: {
            swarm_topology: 'mesh',
            max_agents: 5,
            agent_types: ['researcher', 'analyzer'],
            neural_training: true,
            memory_persistence: true
          }
        }
      },
      {
        name: 'Hacker News',
        description: 'Programming and technology discussions',
        url: 'https://feeds.feedburner.com/oreilly/radar',
        feed_type: 'rss',
        automation_config: {
          enabled: false,
          triggers: [],
          actions: [],
          claude_flow_config: {
            swarm_topology: 'hierarchical',
            max_agents: 3,
            agent_types: ['researcher'],
            neural_training: false,
            memory_persistence: false
          }
        }
      },
      {
        name: 'GitHub Engineering Blog',
        description: 'Engineering insights from GitHub',
        url: 'https://github.blog/engineering.atom',
        feed_type: 'atom',
        automation_config: {
          enabled: true,
          triggers: [
            {
              id: 'new-post',
              type: 'new_item',
              conditions: {},
              enabled: true
            }
          ],
          actions: [
            {
              id: 'notification',
              type: 'notification',
              config: { type: 'email', template: 'new_post' },
              priority: 2
            }
          ],
          claude_flow_config: {
            swarm_topology: 'star',
            max_agents: 2,
            agent_types: ['analyzer'],
            neural_training: true,
            memory_persistence: true
          }
        }
      },
      {
        name: 'AWS News Blog',
        description: 'Latest updates from Amazon Web Services',
        url: 'https://aws.amazon.com/blogs/aws/feed/',
        feed_type: 'rss'
      },
      {
        name: 'Claude AI Updates',
        description: 'Mock feed for Claude AI updates',
        url: 'https://example.com/claude-updates.rss',
        feed_type: 'rss',
        automation_config: {
          enabled: true,
          triggers: [
            {
              id: 'claude-updates',
              type: 'new_item',
              conditions: {},
              enabled: true
            }
          ],
          actions: [
            {
              id: 'analyze-and-store',
              type: 'claude_flow_spawn',
              config: {
                agent_types: ['researcher', 'analyzer', 'coordinator'],
                task: 'Analyze Claude AI update and extract key features'
              },
              priority: 1
            }
          ],
          claude_flow_config: {
            swarm_topology: 'mesh',
            max_agents: 8,
            agent_types: ['researcher', 'analyzer', 'coordinator'],
            neural_training: true,
            memory_persistence: true
          }
        }
      }
    ];

    for (const feedData of seedFeeds) {
      try {
        // Check if feed already exists
        const existingFeed = await db.query(
          'SELECT id FROM feeds WHERE user_id = $1 AND url = $2',
          [demoUser.id, feedData.url]
        );

        if (existingFeed.rows.length > 0) {
          logger.info(`Feed ${feedData.name} already exists, skipping...`);
          continue;
        }

        // Create feed
        const result = await db.query(
          `INSERT INTO feeds (user_id, name, description, url, feed_type, automation_config)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            demoUser.id,
            feedData.name,
            feedData.description,
            feedData.url,
            feedData.feed_type,
            JSON.stringify(feedData.automation_config || {
              enabled: false,
              triggers: [],
              actions: [],
              claude_flow_config: {
                swarm_topology: 'mesh',
                max_agents: 5,
                agent_types: ['researcher'],
                neural_training: false,
                memory_persistence: false
              }
            })
          ]
        );

        const feedId = result.rows[0].id;
        logger.info(`Created seed feed: ${feedData.name} (ID: ${feedId})`);

        // Create automation triggers and actions if configured
        if (feedData.automation_config?.triggers) {
          for (const trigger of feedData.automation_config.triggers) {
            await db.query(
              `INSERT INTO automation_triggers (feed_id, name, trigger_type, conditions, enabled)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                feedId,
                trigger.id,
                trigger.type,
                JSON.stringify(trigger.conditions),
                trigger.enabled
              ]
            );
          }
        }

        if (feedData.automation_config?.actions) {
          for (const action of feedData.automation_config.actions) {
            await db.query(
              `INSERT INTO automation_actions (feed_id, name, action_type, config, priority, enabled)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                feedId,
                action.id,
                action.type,
                JSON.stringify(action.config),
                action.priority,
                true
              ]
            );
          }
        }

      } catch (error) {
        logger.error(`Failed to create seed feed ${feedData.name}:`, error);
      }
    }
  }

  private async createSeedFeedItems(): Promise<void> {
    // Get demo user's feeds
    const demoUser = await AuthService.getUserByEmail('demo@agentfeed.local');
    if (!demoUser) {
      return;
    }

    const feedsResult = await db.query(
      'SELECT id, name FROM feeds WHERE user_id = $1 LIMIT 2',
      [demoUser.id]
    );

    const feeds = feedsResult.rows;
    if (feeds.length === 0) {
      logger.warn('No feeds found for demo user, skipping feed items creation');
      return;
    }

    // Sample feed items
    const sampleItems = [
      {
        title: 'AI Breakthrough: New Language Model Achieves Human-Level Performance',
        content: 'Researchers have developed a new language model that demonstrates human-level performance across a wide range of tasks...',
        url: 'https://example.com/ai-breakthrough-1',
        author: 'Dr. Sarah Chen',
        published_at: new Date(Date.now() - 86400000) // 1 day ago
      },
      {
        title: 'Startup Raises $50M Series B for AI-Powered Developer Tools',
        content: 'DevTools Inc. announced a $50M Series B funding round to expand their AI-powered development platform...',
        url: 'https://example.com/startup-funding-1',
        author: 'Tech Reporter',
        published_at: new Date(Date.now() - 172800000) // 2 days ago
      },
      {
        title: 'How Machine Learning is Transforming Software Engineering',
        content: 'Machine learning is revolutionizing how we build and maintain software systems...',
        url: 'https://example.com/ml-software-engineering',
        author: 'Engineering Team',
        published_at: new Date(Date.now() - 259200000) // 3 days ago
      },
      {
        title: 'The Future of Autonomous Agents in Enterprise',
        content: 'Enterprise organizations are beginning to adopt autonomous AI agents for various business processes...',
        url: 'https://example.com/autonomous-agents-enterprise',
        author: 'Business Analyst',
        published_at: new Date(Date.now() - 345600000) // 4 days ago
      }
    ];

    for (const feed of feeds) {
      for (let i = 0; i < 2; i++) {
        const item = sampleItems[i % sampleItems.length];

        try {
          // Create content hash for deduplication
          const contentHash = require('crypto')
            .createHash('sha256')
            .update(item.title + item.url)
            .digest('hex');

          // Check if item already exists
          const existingItem = await db.query(
            'SELECT id FROM feed_items WHERE feed_id = $1 AND content_hash = $2',
            [feed.id, contentHash]
          );

          if (existingItem.rows.length > 0) {
            continue;
          }

          await db.query(
            `INSERT INTO feed_items (feed_id, title, content, url, author, published_at, content_hash, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              feed.id,
              `${item.title} (${feed.name})`,
              item.content,
              `${item.url}?feed=${feed.id}&item=${i}`,
              item.author,
              item.published_at,
              contentHash,
              JSON.stringify({
                feed_name: feed.name,
                sample_data: true,
                keywords: ['AI', 'technology', 'software']
              })
            ]
          );

          logger.info(`Created sample feed item for ${feed.name}: ${item.title}`);

        } catch (error) {
          logger.error(`Failed to create sample feed item:`, error);
        }
      }
    }
  }

  private async createSampleNeuralPatterns(): Promise<void> {
    const demoUser = await AuthService.getUserByEmail('demo@agentfeed.local');
    if (!demoUser) {
      return;
    }

    const feedsResult = await db.query(
      'SELECT id FROM feeds WHERE user_id = $1 LIMIT 1',
      [demoUser.id]
    );

    if (feedsResult.rows.length === 0) {
      return;
    }

    const feedId = feedsResult.rows[0].id;

    const samplePatterns = [
      {
        pattern_type: 'coordination',
        pattern_data: {
          swarm_efficiency: 0.85,
          agent_collaboration: ['researcher', 'analyzer'],
          optimal_topology: 'mesh',
          task_distribution: 'balanced'
        },
        confidence_score: 0.92
      },
      {
        pattern_type: 'optimization',
        pattern_data: {
          performance_metrics: {
            latency: 150,
            throughput: 95,
            accuracy: 0.94
          },
          optimization_targets: ['speed', 'accuracy'],
          learned_patterns: ['keyword_extraction', 'sentiment_analysis']
        },
        confidence_score: 0.88
      },
      {
        pattern_type: 'prediction',
        pattern_data: {
          prediction_accuracy: 0.91,
          features: ['title_keywords', 'content_length', 'author_history'],
          model_type: 'ensemble',
          training_samples: 1000
        },
        confidence_score: 0.87
      }
    ];

    for (const pattern of samplePatterns) {
      try {
        await db.query(
          `INSERT INTO neural_patterns (feed_id, pattern_type, pattern_data, confidence_score, usage_count)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            feedId,
            pattern.pattern_type,
            JSON.stringify(pattern.pattern_data),
            pattern.confidence_score,
            Math.floor(Math.random() * 50) + 10 // Random usage count 10-60
          ]
        );

        logger.info(`Created sample neural pattern: ${pattern.pattern_type}`);
      } catch (error) {
        logger.error(`Failed to create neural pattern:`, error);
      }
    }
  }

  public async seed(): Promise<void> {
    logger.info('Starting database seeding...');

    try {
      await this.createSeedUsers();
      await this.createSeedFeeds();
      await this.createSeedFeedItems();
      await this.createSampleNeuralPatterns();

      logger.info('Database seeding completed successfully');
    } catch (error) {
      logger.error('Database seeding failed:', error);
      throw error;
    }
  }

  public async clean(): Promise<void> {
    logger.info('Cleaning seed data...');

    try {
      // Delete in correct order to respect foreign key constraints
      await db.query('DELETE FROM neural_patterns WHERE feed_id IN (SELECT id FROM feeds WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@agentfeed.local\'))');
      await db.query('DELETE FROM automation_results WHERE feed_item_id IN (SELECT id FROM feed_items WHERE feed_id IN (SELECT id FROM feeds WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@agentfeed.local\')))');
      await db.query('DELETE FROM feed_items WHERE feed_id IN (SELECT id FROM feeds WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@agentfeed.local\'))');
      await db.query('DELETE FROM automation_actions WHERE feed_id IN (SELECT id FROM feeds WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@agentfeed.local\'))');
      await db.query('DELETE FROM automation_triggers WHERE feed_id IN (SELECT id FROM feeds WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@agentfeed.local\'))');
      await db.query('DELETE FROM feed_fetch_logs WHERE feed_id IN (SELECT id FROM feeds WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@agentfeed.local\'))');
      await db.query('DELETE FROM feeds WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@agentfeed.local\')');
      await db.query('DELETE FROM claude_flow_sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@agentfeed.local\')');
      await db.query('DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@agentfeed.local\')');
      await db.query('DELETE FROM users WHERE email LIKE \'%@agentfeed.local\'');

      logger.info('Seed data cleaned successfully');
    } catch (error) {
      logger.error('Failed to clean seed data:', error);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  const command = process.argv[2];

  (async () => {
    try {
      switch (command) {
        case 'seed':
          await seeder.seed();
          break;
        case 'clean':
          await seeder.clean();
          break;
        case 'reset':
          await seeder.clean();
          await seeder.seed();
          break;
        default:
          logger.info('Available commands:');
          logger.info('  seed  - Create seed data');
          logger.info('  clean - Remove seed data');
          logger.info('  reset - Clean and then seed');
      }
    } catch (error) {
      logger.error('Seeder command failed:', error);
      process.exit(1);
    } finally {
      await db.close();
      process.exit(0);
    }
  })();
}

export { DatabaseSeeder };
export default new DatabaseSeeder();
