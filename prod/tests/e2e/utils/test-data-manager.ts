import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test Data Manager
 * Handles creation, management, and cleanup of test data
 */
export class TestDataManager {
  private testDataPath: string;
  private mockDataPath: string;
  private tempDataPath: string;

  constructor() {
    this.testDataPath = path.join(__dirname, '..', 'fixtures', 'test-data.json');
    this.mockDataPath = path.join(__dirname, '..', 'fixtures', 'mock-responses.json');
    this.tempDataPath = path.join(__dirname, '..', 'fixtures', 'temp');
  }

  // Agent data management
  async createTestAgent(agentConfig?: Partial<TestAgent>): Promise<TestAgent> {
    const defaultAgent: TestAgent = {
      id: `test-agent-${uuidv4()}`,
      name: `Test Agent ${Date.now()}`,
      type: 'content-creator',
      status: 'active',
      capabilities: ['content-generation', 'quality-assessment'],
      createdAt: new Date().toISOString(),
      metrics: {
        tasksCompleted: 0,
        successRate: 100,
        avgResponseTime: 150
      }
    };

    const agent = { ...defaultAgent, ...agentConfig };
    await this.saveAgent(agent);
    return agent;
  }

  async createMultipleTestAgents(count: number, baseConfig?: Partial<TestAgent>): Promise<TestAgent[]> {
    const agents: TestAgent[] = [];
    
    for (let i = 0; i < count; i++) {
      const agent = await this.createTestAgent({
        ...baseConfig,
        name: `${baseConfig?.name || 'Test Agent'} ${i + 1}`
      });
      agents.push(agent);
    }
    
    return agents;
  }

  async saveAgent(agent: TestAgent): Promise<void> {
    const testData = await this.getTestData();
    testData.agents.push(agent);
    await this.saveTestData(testData);
  }

  async getAgent(agentId: string): Promise<TestAgent | null> {
    const testData = await this.getTestData();
    return testData.agents.find(agent => agent.id === agentId) || null;
  }

  async updateAgent(agentId: string, updates: Partial<TestAgent>): Promise<void> {
    const testData = await this.getTestData();
    const agentIndex = testData.agents.findIndex(agent => agent.id === agentId);
    
    if (agentIndex !== -1) {
      testData.agents[agentIndex] = { ...testData.agents[agentIndex], ...updates };
      await this.saveTestData(testData);
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    const testData = await this.getTestData();
    testData.agents = testData.agents.filter(agent => agent.id !== agentId);
    await this.saveTestData(testData);
  }

  // Feed post data management
  async createTestPost(postConfig?: Partial<TestPost>): Promise<TestPost> {
    const defaultPost: TestPost = {
      id: `test-post-${uuidv4()}`,
      title: `Test Post ${Date.now()}`,
      content: 'This is a test post for E2E testing purposes.',
      authorId: 'test-agent-1',
      authorName: 'Test Agent',
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      quality: {
        score: 0.85,
        factors: {
          readability: 0.9,
          relevance: 0.8,
          engagement: 0.85,
          accuracy: 0.9
        }
      },
      metrics: {
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0
      },
      tags: ['test', 'e2e', 'automation']
    };

    const post = { ...defaultPost, ...postConfig };
    await this.savePost(post);
    return post;
  }

  async createMultipleTestPosts(count: number, baseConfig?: Partial<TestPost>): Promise<TestPost[]> {
    const posts: TestPost[] = [];
    
    for (let i = 0; i < count; i++) {
      const post = await this.createTestPost({
        ...baseConfig,
        title: `${baseConfig?.title || 'Test Post'} ${i + 1}`,
        content: `${baseConfig?.content || 'Test content'} - Post ${i + 1}`
      });
      posts.push(post);
    }
    
    return posts;
  }

  async savePost(post: TestPost): Promise<void> {
    const testData = await this.getTestData();
    testData.feedPosts.push(post);
    await this.saveTestData(testData);
  }

  async getPost(postId: string): Promise<TestPost | null> {
    const testData = await this.getTestData();
    return testData.feedPosts.find(post => post.id === postId) || null;
  }

  async updatePost(postId: string, updates: Partial<TestPost>): Promise<void> {
    const testData = await this.getTestData();
    const postIndex = testData.feedPosts.findIndex(post => post.id === postId);
    
    if (postIndex !== -1) {
      testData.feedPosts[postIndex] = { 
        ...testData.feedPosts[postIndex], 
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await this.saveTestData(testData);
    }
  }

  async deletePost(postId: string): Promise<void> {
    const testData = await this.getTestData();
    testData.feedPosts = testData.feedPosts.filter(post => post.id !== postId);
    await this.saveTestData(testData);
  }

  // Task data management
  async createTestTask(taskConfig?: Partial<TestTask>): Promise<TestTask> {
    const defaultTask: TestTask = {
      id: `test-task-${uuidv4()}`,
      agentId: 'test-agent-1',
      type: 'content-generation',
      status: 'pending',
      priority: 'medium',
      description: 'Test task for E2E testing',
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      result: null
    };

    const task = { ...defaultTask, ...taskConfig };
    await this.saveTask(task);
    return task;
  }

  async saveTask(task: TestTask): Promise<void> {
    const testData = await this.getTestData();
    if (!testData.tasks) {
      testData.tasks = [];
    }
    testData.tasks.push(task);
    await this.saveTestData(testData);
  }

  async updateTask(taskId: string, updates: Partial<TestTask>): Promise<void> {
    const testData = await this.getTestData();
    if (!testData.tasks) return;
    
    const taskIndex = testData.tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      testData.tasks[taskIndex] = { ...testData.tasks[taskIndex], ...updates };
      await this.saveTestData(testData);
    }
  }

  // Data persistence methods
  async getTestData(): Promise<TestDataStructure> {
    try {
      const data = await fs.readFile(this.testDataPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Return default structure if file doesn't exist
      return {
        agents: [],
        feedPosts: [],
        analytics: {
          totalPosts: 0,
          qualityScore: 0,
          engagementRate: 0
        },
        tasks: []
      };
    }
  }

  async saveTestData(data: TestDataStructure): Promise<void> {
    await fs.writeFile(this.testDataPath, JSON.stringify(data, null, 2));
  }

  // Cleanup methods
  async cleanupTestData(): Promise<void> {
    const emptyData: TestDataStructure = {
      agents: [],
      feedPosts: [],
      analytics: {
        totalPosts: 0,
        qualityScore: 0,
        engagementRate: 0
      },
      tasks: []
    };
    
    await this.saveTestData(emptyData);
  }

  async cleanupTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDataPath);
      for (const file of files) {
        await fs.unlink(path.join(this.tempDataPath, file));
      }
    } catch (error) {
      // Directory might not exist, that's fine
    }
  }

  // Performance data generation
  async generatePerformanceTestData(agentCount: number, postCount: number): Promise<{
    agents: TestAgent[];
    posts: TestPost[];
  }> {
    const agents = await this.createMultipleTestAgents(agentCount, {
      status: 'active',
      capabilities: ['content-generation', 'quality-assessment', 'analytics']
    });

    const posts: TestPost[] = [];
    for (let i = 0; i < postCount; i++) {
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      const post = await this.createTestPost({
        authorId: randomAgent.id,
        authorName: randomAgent.name,
        quality: {
          score: Math.random() * 0.4 + 0.6, // Random score between 0.6-1.0
          factors: {
            readability: Math.random() * 0.3 + 0.7,
            relevance: Math.random() * 0.3 + 0.7,
            engagement: Math.random() * 0.3 + 0.7,
            accuracy: Math.random() * 0.3 + 0.7
          }
        },
        metrics: {
          views: Math.floor(Math.random() * 1000),
          likes: Math.floor(Math.random() * 100),
          shares: Math.floor(Math.random() * 50),
          comments: Math.floor(Math.random() * 20)
        }
      });
      posts.push(post);
    }

    return { agents, posts };
  }

  // Mock API responses
  async createMockAPIResponse(endpoint: string, response: any): Promise<void> {
    const mockData = await this.getMockData();
    mockData[endpoint] = response;
    await fs.writeFile(this.mockDataPath, JSON.stringify(mockData, null, 2));
  }

  async getMockData(): Promise<{ [key: string]: any }> {
    try {
      const data = await fs.readFile(this.mockDataPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  // File upload simulation
  async createTempFile(filename: string, content: string): Promise<string> {
    const filePath = path.join(this.tempDataPath, filename);
    await fs.mkdir(this.tempDataPath, { recursive: true });
    await fs.writeFile(filePath, content);
    return filePath;
  }
}

// Type definitions
export interface TestAgent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  capabilities: string[];
  createdAt: string;
  metrics: {
    tasksCompleted: number;
    successRate: number;
    avgResponseTime: number;
  };
}

export interface TestPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  quality: {
    score: number;
    factors: {
      readability: number;
      relevance: number;
      engagement: number;
      accuracy: number;
    };
  };
  metrics: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
  tags: string[];
}

export interface TestTask {
  id: string;
  agentId: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  description: string;
  createdAt: string;
  deadline?: string;
  result?: any;
}

export interface TestDataStructure {
  agents: TestAgent[];
  feedPosts: TestPost[];
  analytics: {
    totalPosts: number;
    qualityScore: number;
    engagementRate: number;
  };
  tasks?: TestTask[];
}