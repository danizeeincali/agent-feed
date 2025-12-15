/**
 * Test Data Generator
 * Generates realistic test data for E2E testing scenarios
 */

import { faker } from '@faker-js/faker';

export class TestDataGenerator {
  constructor() {
    // Set seed for reproducible data in CI
    if (process.env.CI) {
      faker.seed(12345);
    }
    
    this.platforms = ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok'];
    this.contentTypes = ['article', 'video', 'image', 'poll', 'story'];
    this.agentTypes = ['content-creator', 'curator', 'analyst', 'coordinator', 'optimizer'];
    this.specializations = ['tech', 'business', 'lifestyle', 'entertainment', 'education'];
  }

  /**
   * Generate base test data for the application
   */
  async generateBaseData() {
    const data = {
      users: this.generateUsers(10),
      agents: this.generateAgents(5),
      posts: this.generatePosts(50),
      templates: this.generateTemplates(20),
      analytics: this.generateAnalyticsData()
    };

    // Store in global test context
    global.__TEST_DATA__ = data;
    return data;
  }

  /**
   * Generate test users
   * @param {number} count - Number of users to generate
   */
  generateUsers(count) {
    const users = [];
    
    for (let i = 0; i < count; i++) {
      users.push({
        id: faker.string.uuid(),
        email: faker.internet.email(),
        username: faker.internet.userName(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        avatar: faker.image.avatar(),
        role: faker.helpers.arrayElement(['admin', 'user', 'moderator']),
        createdAt: faker.date.past({ years: 2 }),
        isActive: faker.datatype.boolean(0.9),
        preferences: {
          notifications: faker.datatype.boolean(),
          theme: faker.helpers.arrayElement(['light', 'dark', 'auto']),
          language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de'])
        }
      });
    }
    
    return users;
  }

  /**
   * Generate test agents
   * @param {number} count - Number of agents to generate
   */
  generateAgents(count) {
    const agents = [];
    
    for (let i = 0; i < count; i++) {
      const agentType = faker.helpers.arrayElement(this.agentTypes);
      const specialization = faker.helpers.arrayElement(this.specializations);
      
      agents.push({
        id: faker.string.uuid(),
        name: `${faker.company.name()} ${agentType}`,
        type: agentType,
        specialization: specialization,
        description: faker.lorem.sentences(2),
        status: faker.helpers.arrayElement(['active', 'inactive', 'paused', 'error']),
        platforms: faker.helpers.arrayElements(this.platforms, { min: 1, max: 3 }),
        configuration: {
          postingFrequency: faker.number.int({ min: 1, max: 24 }),
          contentStyle: faker.helpers.arrayElement(['formal', 'casual', 'humorous', 'professional']),
          targetAudience: faker.helpers.arrayElement(['general', 'professionals', 'students', 'entrepreneurs']),
          hashtagStrategy: faker.helpers.arrayElement(['trending', 'niche', 'branded', 'mixed'])
        },
        metrics: {
          totalPosts: faker.number.int({ min: 0, max: 1000 }),
          engagementRate: faker.number.float({ min: 0, max: 15, fractionDigits: 2 }),
          reachCount: faker.number.int({ min: 0, max: 100000 }),
          followersGrowth: faker.number.float({ min: -5, max: 25, fractionDigits: 1 })
        },
        createdAt: faker.date.past({ years: 1 }),
        lastActive: faker.date.recent({ days: 7 })
      });
    }
    
    return agents;
  }

  /**
   * Generate test posts
   * @param {number} count - Number of posts to generate
   */
  generatePosts(count) {
    const posts = [];
    
    for (let i = 0; i < count; i++) {
      const platform = faker.helpers.arrayElement(this.platforms);
      const contentType = faker.helpers.arrayElement(this.contentTypes);
      
      posts.push({
        id: faker.string.uuid(),
        title: faker.lorem.sentence({ min: 3, max: 8 }),
        content: faker.lorem.paragraphs({ min: 1, max: 3 }),
        hashtags: faker.helpers.arrayElements([
          '#tech', '#business', '#innovation', '#growth', '#startup',
          '#marketing', '#social', '#trends', '#ai', '#productivity'
        ], { min: 2, max: 5 }),
        platform: platform,
        contentType: contentType,
        status: faker.helpers.arrayElement(['draft', 'scheduled', 'published', 'failed']),
        visibility: faker.helpers.arrayElement(['public', 'private', 'unlisted']),
        scheduledAt: faker.date.future({ days: 30 }),
        publishedAt: faker.helpers.maybe(() => faker.date.past({ days: 30 }), 0.7),
        agentId: faker.string.uuid(),
        userId: faker.string.uuid(),
        media: faker.helpers.maybe(() => this.generateMediaData(), 0.4),
        metrics: {
          views: faker.number.int({ min: 0, max: 50000 }),
          likes: faker.number.int({ min: 0, max: 2000 }),
          shares: faker.number.int({ min: 0, max: 500 }),
          comments: faker.number.int({ min: 0, max: 200 }),
          clicks: faker.number.int({ min: 0, max: 1000 })
        },
        qualityScore: faker.number.float({ min: 60, max: 100, fractionDigits: 1 }),
        engagementPrediction: faker.number.float({ min: 0, max: 10, fractionDigits: 2 })
      });
    }
    
    return posts;
  }

  /**
   * Generate media data for posts
   */
  generateMediaData() {
    const mediaType = faker.helpers.arrayElement(['image', 'video', 'gif']);
    
    return {
      type: mediaType,
      url: mediaType === 'video' ? faker.internet.url() + '/video.mp4' : faker.image.url(),
      thumbnail: mediaType === 'video' ? faker.image.url() : null,
      size: faker.number.int({ min: 100000, max: 10000000 }),
      dimensions: {
        width: faker.number.int({ min: 400, max: 1920 }),
        height: faker.number.int({ min: 300, max: 1080 })
      },
      altText: faker.lorem.sentence()
    };
  }

  /**
   * Generate post templates
   * @param {number} count - Number of templates to generate
   */
  generateTemplates(count) {
    const templates = [];
    
    const templateTypes = [
      'announcement', 'question', 'tip', 'quote', 'behind-scenes',
      'tutorial', 'promotion', 'event', 'poll', 'story'
    ];
    
    for (let i = 0; i < count; i++) {
      const templateType = faker.helpers.arrayElement(templateTypes);
      
      templates.push({
        id: faker.string.uuid(),
        name: `${faker.lorem.words(2)} ${templateType}`,
        type: templateType,
        category: faker.helpers.arrayElement(this.specializations),
        description: faker.lorem.sentence(),
        template: this.generateTemplateContent(templateType),
        platforms: faker.helpers.arrayElements(this.platforms, { min: 1, max: 4 }),
        variables: this.generateTemplateVariables(),
        tags: faker.helpers.arrayElements(['popular', 'new', 'trending', 'featured'], { min: 0, max: 2 }),
        usageCount: faker.number.int({ min: 0, max: 500 }),
        rating: faker.number.float({ min: 3, max: 5, fractionDigits: 1 }),
        createdAt: faker.date.past({ years: 1 }),
        updatedAt: faker.date.recent({ days: 30 })
      });
    }
    
    return templates;
  }

  /**
   * Generate template content based on type
   * @param {string} type - Template type
   */
  generateTemplateContent(type) {
    const templates = {
      announcement: "🚀 Excited to announce {{announcement}}! {{details}} #{{hashtag1}} #{{hashtag2}}",
      question: "What's your take on {{topic}}? 🤔 I'd love to hear your thoughts! {{context}} #{{hashtag1}}",
      tip: "💡 Pro tip: {{tip}} This has helped me {{benefit}}. What tips do you have? #{{hashtag1}} #{{hashtag2}}",
      quote: "\"{{quote}}\" - {{author}} This resonates with me because {{reason}}. #{{hashtag1}} #motivation",
      promotion: "Check out {{product}}! {{description}} {{cta}} #{{hashtag1}} #{{hashtag2}}",
      event: "📅 Join us for {{event}} on {{date}}! {{details}} Register: {{link}} #{{hashtag1}}",
      poll: "Help me decide! {{question}} Vote below 👇 {{option1}} vs {{option2}} #{{hashtag1}}",
      tutorial: "Step-by-step: {{title}} 1️⃣ {{step1}} 2️⃣ {{step2}} 3️⃣ {{step3}} #{{hashtag1}} #tutorial"
    };
    
    return templates[type] || "{{content}} #{{hashtag1}}";
  }

  /**
   * Generate template variables
   */
  generateTemplateVariables() {
    return [
      { name: 'title', type: 'text', required: true, maxLength: 100 },
      { name: 'content', type: 'textarea', required: true, maxLength: 500 },
      { name: 'hashtag1', type: 'hashtag', required: true },
      { name: 'hashtag2', type: 'hashtag', required: false },
      { name: 'link', type: 'url', required: false },
      { name: 'date', type: 'date', required: false }
    ];
  }

  /**
   * Generate analytics data
   */
  generateAnalyticsData() {
    const days = 30;
    const dailyData = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      dailyData.push({
        date: date.toISOString().split('T')[0],
        engagement: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
        reach: faker.number.int({ min: 100, max: 10000 }),
        impressions: faker.number.int({ min: 500, max: 50000 }),
        clicks: faker.number.int({ min: 10, max: 1000 }),
        posts: faker.number.int({ min: 0, max: 20 })
      });
    }
    
    return {
      overview: {
        totalEngagement: faker.number.int({ min: 10000, max: 100000 }),
        totalReach: faker.number.int({ min: 50000, max: 500000 }),
        conversionRate: faker.number.float({ min: 1, max: 8, fractionDigits: 2 }),
        growthRate: faker.number.float({ min: -10, max: 50, fractionDigits: 1 })
      },
      daily: dailyData,
      platforms: this.platforms.map(platform => ({
        name: platform,
        engagement: faker.number.float({ min: 100, max: 5000, fractionDigits: 2 }),
        reach: faker.number.int({ min: 1000, max: 50000 }),
        posts: faker.number.int({ min: 5, max: 100 }),
        followers: faker.number.int({ min: 500, max: 100000 })
      })),
      topContent: Array(10).fill(null).map(() => ({
        title: faker.lorem.sentence({ min: 3, max: 8 }),
        platform: faker.helpers.arrayElement(this.platforms),
        engagement: faker.number.int({ min: 50, max: 2000 }),
        reach: faker.number.int({ min: 500, max: 20000 }),
        publishedAt: faker.date.past({ days: 30 })
      }))
    };
  }

  /**
   * Generate test user for specific scenario
   * @param {string} scenario - Test scenario type
   */
  generateTestUser(scenario) {
    const baseUser = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      username: faker.internet.userName(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      createdAt: faker.date.past({ years: 1 }),
      isActive: true
    };

    switch (scenario) {
      case 'admin':
        return { ...baseUser, role: 'admin', email: 'admin@test.com' };
      case 'new-user':
        return { ...baseUser, createdAt: new Date(), posts: [] };
      case 'power-user':
        return { ...baseUser, role: 'user', agents: this.generateAgents(10) };
      default:
        return baseUser;
    }
  }

  /**
   * Generate test agent for specific scenario
   * @param {string} scenario - Test scenario type
   */
  generateTestAgent(scenario) {
    const baseAgent = {
      id: faker.string.uuid(),
      name: faker.company.name(),
      createdAt: new Date(),
      platforms: ['twitter']
    };

    switch (scenario) {
      case 'high-performance':
        return {
          ...baseAgent,
          status: 'active',
          metrics: {
            totalPosts: 500,
            engagementRate: 12.5,
            reachCount: 50000,
            followersGrowth: 15.2
          }
        };
      case 'new-agent':
        return {
          ...baseAgent,
          status: 'inactive',
          metrics: {
            totalPosts: 0,
            engagementRate: 0,
            reachCount: 0,
            followersGrowth: 0
          }
        };
      case 'error-state':
        return {
          ...baseAgent,
          status: 'error',
          lastError: 'Authentication failed'
        };
      default:
        return baseAgent;
    }
  }

  /**
   * Generate performance test data
   * @param {number} scale - Scale multiplier for data volume
   */
  generatePerformanceTestData(scale = 1) {
    return {
      users: this.generateUsers(100 * scale),
      agents: this.generateAgents(50 * scale),
      posts: this.generatePosts(1000 * scale),
      analytics: this.generateLargeAnalyticsDataset(365 * scale)
    };
  }

  /**
   * Generate large analytics dataset for performance testing
   * @param {number} days - Number of days of data
   */
  generateLargeAnalyticsDataset(days) {
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate hourly data for more realistic load testing
      for (let hour = 0; hour < 24; hour++) {
        data.push({
          timestamp: new Date(date.getTime() + hour * 60 * 60 * 1000),
          engagement: faker.number.float({ min: 0, max: 100 }),
          reach: faker.number.int({ min: 10, max: 1000 }),
          impressions: faker.number.int({ min: 50, max: 5000 }),
          clicks: faker.number.int({ min: 1, max: 100 }),
          platform: faker.helpers.arrayElement(this.platforms)
        });
      }
    }
    
    return data;
  }

  /**
   * Get test data by key
   * @param {string} key - Data key
   */
  getTestData(key) {
    return global.__TEST_DATA__?.[key] || null;
  }

  /**
   * Clear all generated test data
   */
  clearTestData() {
    global.__TEST_DATA__ = null;
  }
}