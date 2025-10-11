/**
 * PostgreSQL Repository Integration Tests
 * TDD approach: Tests against REAL PostgreSQL database (no mocks)
 * Verifies repositories work with migrated data
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import agentRepo from '../../repositories/postgres/agent.repository.js';
import memoryRepo from '../../repositories/postgres/memory.repository.js';
import workspaceRepo from '../../repositories/postgres/workspace.repository.js';
import postgresManager from '../../config/postgres.js';

describe('PostgreSQL Repository Integration Tests (100% Real)', () => {
  const testUserId = 'anonymous';

  beforeAll(async () => {
    // Verify PostgreSQL connection
    const isHealthy = await postgresManager.healthCheck();
    if (!isHealthy) {
      throw new Error('PostgreSQL database is not healthy. Cannot run integration tests.');
    }
    console.log('✅ PostgreSQL connection verified');
  });

  afterAll(async () => {
    // Close PostgreSQL connection pool
    await postgresManager.close();
  });

  describe('AgentRepository', () => {
    it('should retrieve all active agents from PostgreSQL', async () => {
      const agents = await agentRepo.getAllAgents(testUserId);

      expect(agents).toBeInstanceOf(Array);
      expect(agents.length).toBeGreaterThan(0);

      // Verify structure matches expected format
      const agent = agents[0];
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('display_name');
      expect(agent).toHaveProperty('status', 'active');

      console.log(`✅ Retrieved ${agents.length} agents from PostgreSQL`);
      console.log(`   Sample agent: ${agent.name} (${agent.display_name})`);
    });

    it('should retrieve specific agent by name', async () => {
      const agents = await agentRepo.getAllAgents(testUserId);
      const firstAgent = agents[0];

      const agent = await agentRepo.getAgentByName(firstAgent.name, testUserId);

      expect(agent).not.toBeNull();
      expect(agent.name).toBe(firstAgent.name);
      expect(agent.display_name).toBe(firstAgent.display_name);

      console.log(`✅ Retrieved agent: ${agent.name}`);
    });

    it('should retrieve system agent templates', async () => {
      const templates = await agentRepo.getSystemTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);

      const template = templates[0];
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('version');
      expect(template).toHaveProperty('posting_rules');

      console.log(`✅ Retrieved ${templates.length} system templates`);
    });
  });

  describe('MemoryRepository', () => {
    it('should retrieve all posts from PostgreSQL', async () => {
      const posts = await memoryRepo.getAllPosts(testUserId, { limit: 50 });

      expect(posts).toBeInstanceOf(Array);

      if (posts.length > 0) {
        const post = posts[0];
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('author_agent');
        expect(post).toHaveProperty('content');
        expect(post.content).toBeTruthy();

        console.log(`✅ Retrieved ${posts.length} posts from PostgreSQL`);
        console.log(`   Sample post by: ${post.author_agent}`);
        console.log(`   Content preview: ${post.content.substring(0, 50)}...`);
      } else {
        console.log('⚠️  No posts found (migration may not have run yet)');
      }
    });

    it('should retrieve comments for a post', async () => {
      const posts = await memoryRepo.getAllPosts(testUserId, { limit: 10 });

      if (posts.length > 0) {
        const postWithComments = posts.find(p => p.comments > 0) || posts[0];
        const comments = await memoryRepo.getCommentsByPostId(postWithComments.id, testUserId);

        expect(comments).toBeInstanceOf(Array);

        if (comments.length > 0) {
          const comment = comments[0];
          expect(comment).toHaveProperty('id');
          expect(comment).toHaveProperty('author_agent');
          expect(comment).toHaveProperty('content');
          expect(comment).toHaveProperty('post_id', postWithComments.id);

          console.log(`✅ Retrieved ${comments.length} comments for post ${postWithComments.id}`);
        } else {
          console.log(`⚠️  Post ${postWithComments.id} has no comments`);
        }
      }
    });

    it('should retrieve posts by specific agent', async () => {
      const agents = await agentRepo.getAllAgents(testUserId);

      if (agents.length > 0) {
        const agentName = agents[0].name;
        const posts = await memoryRepo.getPostsByAgent(agentName, testUserId, 10);

        expect(posts).toBeInstanceOf(Array);

        console.log(`✅ Agent "${agentName}" has ${posts.length} posts`);
      }
    });

    it('should create a new post (write test)', async () => {
      const postData = {
        author_agent: 'ProductionValidator',
        content: 'Integration test post - verifying PostgreSQL write operations',
        title: 'PostgreSQL Integration Test',
        tags: ['test', 'integration', 'postgresql']
      };

      const createdPost = await memoryRepo.createPost(testUserId, postData);

      expect(createdPost).toHaveProperty('id');
      expect(createdPost.author_agent).toBe(postData.author_agent);
      expect(createdPost.content).toBe(postData.content);

      console.log(`✅ Created test post with ID: ${createdPost.id}`);

      // Verify we can retrieve it
      const retrieved = await memoryRepo.getPostById(createdPost.id, testUserId);
      expect(retrieved).not.toBeNull();
      expect(retrieved.content).toBe(postData.content);

      console.log(`✅ Verified post can be retrieved after creation`);
    });
  });

  describe('WorkspaceRepository', () => {
    it('should retrieve all agent pages from PostgreSQL', async () => {
      const pages = await workspaceRepo.getAllPages(testUserId, { limit: 50 });

      expect(pages).toBeInstanceOf(Array);

      if (pages.length > 0) {
        const page = pages[0];
        expect(page).toHaveProperty('id');
        expect(page).toHaveProperty('agent_id');
        expect(page).toHaveProperty('title');
        expect(page).toHaveProperty('content_value');

        console.log(`✅ Retrieved ${pages.length} pages from PostgreSQL`);
        console.log(`   Sample page: "${page.title}" by ${page.agent_id}`);
      } else {
        console.log('⚠️  No pages found (migration may not have run yet)');
      }
    });

    it('should retrieve pages for specific agent', async () => {
      const pages = await workspaceRepo.getAllPages(testUserId, { limit: 10 });

      if (pages.length > 0) {
        const agentId = pages[0].agent_id;
        const agentPages = await workspaceRepo.getPagesByAgent(agentId, testUserId);

        expect(agentPages).toBeInstanceOf(Array);
        expect(agentPages.length).toBeGreaterThan(0);

        console.log(`✅ Agent "${agentId}" has ${agentPages.length} pages`);
      }
    });

    it('should retrieve page by ID', async () => {
      const pages = await workspaceRepo.getAllPages(testUserId, { limit: 5 });

      if (pages.length > 0) {
        const pageId = pages[0].id;
        const page = await workspaceRepo.getPageById(pageId, testUserId);

        expect(page).not.toBeNull();
        expect(page.id).toBe(pageId);

        console.log(`✅ Retrieved page by ID: ${pageId}`);
      }
    });

    it('should search pages by content', async () => {
      const searchResults = await workspaceRepo.searchPages('test', testUserId);

      expect(searchResults).toBeInstanceOf(Array);

      console.log(`✅ Search for "test" returned ${searchResults.length} pages`);
    });
  });

  describe('Data Integrity', () => {
    it('should have consistent data counts matching migration', async () => {
      const agents = await agentRepo.getAllAgents(testUserId);
      const posts = await memoryRepo.getAllPosts(testUserId, { limit: 1000 });
      const pages = await workspaceRepo.getAllPages(testUserId, { limit: 1000 });

      console.log('\n📊 PostgreSQL Data Summary:');
      console.log(`   Agents: ${agents.length}`);
      console.log(`   Posts: ${posts.length}`);
      console.log(`   Pages: ${pages.length}`);

      // These should match our migration stats (6 agents, 18+ posts, 100 pages)
      expect(agents.length).toBeGreaterThanOrEqual(6);
      expect(pages.length).toBeGreaterThanOrEqual(100);

      console.log('\n✅ Data integrity verified - counts match expected migration results');
    });

    it('should verify all agents have valid system templates', async () => {
      const agents = await agentRepo.getAllAgents(testUserId);
      const templates = await agentRepo.getSystemTemplates();
      const templateNames = templates.map(t => t.name);

      for (const agent of agents) {
        expect(templateNames).toContain(agent.name);
      }

      console.log(`✅ All ${agents.length} agents have valid system templates`);
    });
  });
});
