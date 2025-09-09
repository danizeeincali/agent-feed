// SPARC Phase 3: Architecture - Test Data Factory Implementation

import { AgentPost, Comment, Agent } from '../../../frontend/src/types';

/**
 * Comprehensive test data factory for generating realistic test data
 * Supports various scenarios including edge cases and error conditions
 */
export class TestDataFactory {
  /**
   * Post generation methods
   */
  static createPost(overrides: Partial<AgentPost> = {}): AgentPost {
    const defaultPost: AgentPost = {
      id: this.generateId('post'),
      title: this.generateTitle(),
      content: this.generateContent(),
      authorAgent: this.generateAgentName(),
      publishedAt: new Date().toISOString(),
      metadata: {
        businessImpact: this.generateBusinessImpact(),
        tags: this.generateTags(),
        isAgentResponse: false,
        ...overrides.metadata
      },
      comments: Math.floor(Math.random() * 10),
      shares: Math.floor(Math.random() * 5),
      ...overrides
    };

    return defaultPost;
  }

  static createPosts(count: number, overrides: Partial<AgentPost> = {}): AgentPost[] {
    return Array.from({ length: count }, (_, index) => 
      this.createPost({
        ...overrides,
        publishedAt: new Date(Date.now() - index * 60000).toISOString() // Space posts 1 minute apart
      })
    );
  }

  static createPostWithMentions(mentions: string[], overrides: Partial<AgentPost> = {}): AgentPost {
    const mentionText = mentions.map(mention => `@${mention}`).join(' ');
    const content = `Check this out ${mentionText}! ${this.generateContent()}`;
    
    return this.createPost({
      ...overrides,
      content,
      metadata: {
        ...overrides.metadata,
        agentMentions: mentions
      }
    });
  }

  static createLongPost(contentLength: number = 5000): AgentPost {
    const longContent = this.generateContent(contentLength);
    return this.createPost({
      content: longContent,
      metadata: {
        businessImpact: 8, // Long posts are usually important
        tags: ['detailed', 'analysis', 'comprehensive']
      }
    });
  }

  static createHighImpactPost(): AgentPost {
    return this.createPost({
      title: 'URGENT: Critical System Alert',
      content: 'This is a high-impact post requiring immediate attention from the team.',
      metadata: {
        businessImpact: 10,
        tags: ['urgent', 'critical', 'alert'],
        isAgentResponse: true
      }
    });
  }

  /**
   * Comment generation methods
   */
  static createComment(overrides: Partial<Comment> = {}): Comment {
    const defaultComment: Comment = {
      id: this.generateId('comment'),
      content: this.generateCommentContent(),
      author: this.generateUserName(),
      createdAt: new Date().toISOString(),
      parentId: undefined,
      replies: [],
      repliesCount: 0,
      threadDepth: 0,
      threadPath: '0',
      edited: false,
      isDeleted: false,
      isPinned: false,
      isModerated: false,
      authorType: Math.random() > 0.7 ? 'agent' : 'user',
      ...overrides
    };

    return defaultComment;
  }

  static createCommentThread(depth: number, maxRepliesPerLevel: number = 3): Comment[] {
    const comments: Comment[] = [];
    
    // Create root comment
    const rootComment = this.createComment();
    comments.push(rootComment);
    
    // Create nested replies
    this.createNestedReplies(comments, rootComment.id, depth - 1, maxRepliesPerLevel, 1);
    
    return comments;
  }

  static createCommentWithMentions(mentions: string[], overrides: Partial<Comment> = {}): Comment {
    const mentionText = mentions.map(mention => `@${mention}`).join(' ');
    const content = `Great point ${mentionText}! ${this.generateCommentContent()}`;
    
    return this.createComment({
      ...overrides,
      content,
      mentionedUsers: mentions
    });
  }

  static createDeepCommentThread(maxDepth: number = 10): Comment[] {
    const comments: Comment[] = [];
    let currentParentId: string | undefined = undefined;
    
    for (let depth = 0; depth < maxDepth; depth++) {
      const comment = this.createComment({
        parentId: currentParentId,
        threadDepth: depth,
        threadPath: depth === 0 ? '0' : `${depth}`,
        content: `Comment at depth ${depth}: ${this.generateCommentContent()}`
      });
      
      comments.push(comment);
      currentParentId = comment.id;
    }
    
    return comments;
  }

  /**
   * Agent/User generation methods
   */
  static createAgent(overrides: Partial<Agent> = {}): Agent {
    const agentNames = [
      'chief-of-staff-agent',
      'personal-todos-agent', 
      'meeting-prep-agent',
      'impact-filter-agent',
      'goal-analyst-agent',
      'opportunity-scout-agent'
    ];
    
    const name = agentNames[Math.floor(Math.random() * agentNames.length)];
    
    return {
      id: this.generateId('agent'),
      name,
      displayName: this.formatAgentDisplayName(name),
      description: this.generateAgentDescription(name),
      avatar: undefined,
      ...overrides
    };
  }

  static createAgents(count: number): Agent[] {
    return Array.from({ length: count }, () => this.createAgent());
  }

  static createUser(overrides: any = {}): any {
    return {
      id: this.generateId('user'),
      name: this.generateUserName(),
      displayName: this.generateDisplayName(),
      email: this.generateEmail(),
      avatar: undefined,
      ...overrides
    };
  }

  /**
   * Error scenario generation methods
   */
  static createInvalidPost(): any {
    return {
      // Missing required fields
      title: null,
      content: undefined,
      authorAgent: '',
      publishedAt: 'invalid-date',
      metadata: null
    };
  }

  static createInvalidComment(): any {
    return {
      // Missing required fields
      id: null,
      content: undefined,
      author: '',
      createdAt: 'invalid-date',
      threadDepth: 'not-a-number'
    };
  }

  static createMalformedApiResponse(): any {
    return {
      success: 'not-a-boolean',
      data: 'should-be-array',
      message: 123
    };
  }

  static createCorruptedData(): any {
    return {
      id: '<script>alert("xss")</script>',
      title: 'Normal title',
      content: ''.repeat(10000), // Extremely long content
      authorAgent: null,
      metadata: {
        businessImpact: 999, // Out of range
        tags: ['tag'.repeat(100)] // Very long tag
      }
    };
  }

  /**
   * Performance testing data generation
   */
  static createLargeDataset(size: number): AgentPost[] {
    console.log(`Generating large dataset with ${size} posts...`);
    const posts: AgentPost[] = [];
    
    for (let i = 0; i < size; i++) {
      posts.push(this.createPost({
        id: `post-${i}`,
        title: `Generated Post ${i}`,
        publishedAt: new Date(Date.now() - i * 1000).toISOString()
      }));
    }
    
    return posts;
  }

  static createStressTestComments(postId: string, count: number): Comment[] {
    const comments: Comment[] = [];
    
    for (let i = 0; i < count; i++) {
      comments.push(this.createComment({
        id: `comment-${i}`,
        content: `Stress test comment ${i}`,
        createdAt: new Date(Date.now() - i * 500).toISOString()
      }));
    }
    
    return comments;
  }

  /**
   * Edge case data generation
   */
  static createUnicodeTestData(): AgentPost {
    return this.createPost({
      title: '🌟 Unicode Test: 中文 العربية русский 🚀',
      content: 'Testing unicode support: 📝 Emojis, 中文字符, العربية, русский текст, 日本語',
      metadata: {
        tags: ['unicode', '测试', 'тест', 'اختبار']
      }
    });
  }

  static createMaxLengthData(): AgentPost {
    return this.createPost({
      title: 'A'.repeat(200), // Maximum title length
      content: 'B'.repeat(5000), // Maximum content length
      metadata: {
        tags: Array.from({ length: 20 }, (_, i) => `tag${i}`) // Many tags
      }
    });
  }

  static createMinimalValidData(): AgentPost {
    return this.createPost({
      title: 'T',
      content: 'C',
      metadata: {
        businessImpact: 1,
        tags: []
      }
    });
  }

  /**
   * Private helper methods
   */
  private static generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateTitle(): string {
    const titles = [
      'Weekly Progress Update',
      'Strategic Initiative Analysis',
      'Process Optimization Results',
      'Team Coordination Updates',
      'Business Impact Assessment',
      'Goal Achievement Metrics',
      'Opportunity Analysis Report',
      'Market Research Insights',
      'Performance Optimization',
      'Workflow Enhancement'
    ];
    
    return titles[Math.floor(Math.random() * titles.length)];
  }

  private static generateContent(length: number = 300): string {
    const sentences = [
      'This analysis provides comprehensive insights into our current operational efficiency.',
      'Key performance indicators show significant improvement over the last quarter.',
      'Strategic alignment with business objectives remains our top priority.',
      'Cross-functional collaboration has enhanced our delivery capabilities.',
      'Data-driven decision making continues to drive positive outcomes.',
      'Resource allocation optimization has improved overall productivity.',
      'Stakeholder feedback indicates high satisfaction with recent changes.',
      'Process automation has reduced manual overhead significantly.',
      'Quality metrics demonstrate consistent improvement trends.',
      'Future planning incorporates lessons learned from recent initiatives.'
    ];
    
    let content = '';
    while (content.length < length) {
      const sentence = sentences[Math.floor(Math.random() * sentences.length)];
      content += sentence + ' ';
    }
    
    return content.slice(0, length);
  }

  private static generateCommentContent(): string {
    const comments = [
      'Great insights! This aligns well with our strategic objectives.',
      'Thanks for sharing this analysis. Very helpful context.',
      'I have a different perspective on this approach.',
      'Could you provide more details about the implementation?',
      'This is exactly what we needed to move forward.',
      'Excellent work on gathering this information.',
      'What are the next steps for this initiative?',
      'How does this compare to our previous approaches?',
      'The data supports your recommendations.',
      'I agree with this direction and think we should proceed.'
    ];
    
    return comments[Math.floor(Math.random() * comments.length)];
  }

  private static generateAgentName(): string {
    const agents = [
      'chief-of-staff-agent',
      'personal-todos-agent',
      'meeting-prep-agent', 
      'impact-filter-agent',
      'goal-analyst-agent',
      'opportunity-scout-agent',
      'market-research-analyst-agent',
      'financial-viability-analyzer-agent'
    ];
    
    return agents[Math.floor(Math.random() * agents.length)];
  }

  private static generateUserName(): string {
    const firstNames = ['Alex', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Riley', 'Avery', 'Quinn'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }

  private static generateDisplayName(): string {
    return this.generateUserName();
  }

  private static generateEmail(): string {
    const domains = ['example.com', 'test.org', 'demo.net'];
    const name = this.generateUserName().toLowerCase().replace(' ', '.');
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    return `${name}@${domain}`;
  }

  private static generateBusinessImpact(): number {
    // Weighted random distribution favoring medium impact
    const weights = [0.1, 0.2, 0.3, 0.25, 0.1, 0.05]; // 1-2: 30%, 3-4: 55%, 5-6: 15%
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return Math.floor(i * 1.67) + 1; // Map to 1-10 scale
      }
    }
    
    return 5; // Default fallback
  }

  private static generateTags(): string[] {
    const allTags = [
      'strategy', 'productivity', 'update', 'insight', 'question',
      'urgent', 'meeting', 'planning', 'analysis', 'opportunity',
      'feedback', 'coordination', 'goals', 'weekly', 'monthly',
      'project', 'team', 'performance', 'metrics', 'process'
    ];
    
    const tagCount = Math.floor(Math.random() * 4) + 1; // 1-4 tags
    const shuffled = allTags.sort(() => 0.5 - Math.random());
    
    return shuffled.slice(0, tagCount);
  }

  private static formatAgentDisplayName(agentName: string): string {
    return agentName
      .replace(/-agent$/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private static generateAgentDescription(agentName: string): string {
    const descriptions: Record<string, string> = {
      'chief-of-staff-agent': 'Strategic coordination and planning',
      'personal-todos-agent': 'Task and project management',
      'meeting-prep-agent': 'Meeting preparation and coordination',
      'impact-filter-agent': 'Business impact analysis',
      'goal-analyst-agent': 'Goal tracking and analysis',
      'opportunity-scout-agent': 'Market opportunity identification'
    };
    
    return descriptions[agentName] || 'AI agent for task automation';
  }

  private static createNestedReplies(
    comments: Comment[],
    parentId: string,
    remainingDepth: number,
    maxReplies: number,
    currentDepth: number
  ): void {
    if (remainingDepth <= 0) return;
    
    const replyCount = Math.floor(Math.random() * maxReplies) + 1;
    
    for (let i = 0; i < replyCount; i++) {
      const reply = this.createComment({
        parentId,
        threadDepth: currentDepth,
        threadPath: `${currentDepth}.${i}`,
        content: `Reply at depth ${currentDepth}: ${this.generateCommentContent()}`
      });
      
      comments.push(reply);
      
      // Recursively create nested replies
      if (Math.random() > 0.5) { // 50% chance of having nested replies
        this.createNestedReplies(comments, reply.id, remainingDepth - 1, maxReplies, currentDepth + 1);
      }
    }
  }
}

/**
 * Specialized factories for specific testing scenarios
 */
export class MentionTestDataFactory extends TestDataFactory {
  static createMentionDropdownTestData(): any {
    return {
      agents: this.createAgents(10),
      users: Array.from({ length: 5 }, () => this.createUser()),
      searchQuery: '',
      selectedMentions: []
    };
  }

  static createMentionIntegrationTestData(): any {
    const mentions = ['chief-of-staff-agent', 'personal-todos-agent'];
    return {
      post: this.createPostWithMentions(mentions),
      comments: [
        this.createCommentWithMentions(['meeting-prep-agent']),
        this.createCommentWithMentions(['impact-filter-agent', 'goal-analyst-agent'])
      ]
    };
  }
}

export class PerformanceTestDataFactory extends TestDataFactory {
  static createBenchmarkData(): any {
    return {
      smallDataset: this.createPosts(10),
      mediumDataset: this.createPosts(100),
      largeDataset: this.createLargeDataset(1000),
      stressDataset: this.createLargeDataset(10000)
    };
  }

  static createMemoryLeakTestData(): any {
    return {
      components: Array.from({ length: 100 }, () => ({
        post: this.createPost(),
        comments: this.createStressTestComments('test-post', 10)
      }))
    };
  }
}

export class ErrorTestDataFactory extends TestDataFactory {
  static createErrorScenarios(): any {
    return {
      invalidPosts: [
        this.createInvalidPost(),
        this.createCorruptedData(),
        null,
        undefined
      ],
      invalidComments: [
        this.createInvalidComment(),
        null,
        undefined
      ],
      malformedResponses: [
        this.createMalformedApiResponse(),
        { success: true }, // Missing data field
        { data: [] }, // Missing success field
        'not-an-object'
      ]
    };
  }
}

export class EdgeCaseTestDataFactory extends TestDataFactory {
  static createEdgeCaseData(): any {
    return {
      unicodeData: this.createUnicodeTestData(),
      maxLengthData: this.createMaxLengthData(),
      minimalData: this.createMinimalValidData(),
      deepThread: this.createDeepCommentThread(15),
      emptyData: {
        posts: [],
        comments: [],
        agents: []
      }
    };
  }
}