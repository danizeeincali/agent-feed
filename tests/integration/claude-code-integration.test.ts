import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { exec } from 'child_process';
import { promisify } from 'util';

/**
 * Claude Code Integration Tests
 * Tests the complete integration between Claude Code, AgentLink, and the containerized system
 */

const execAsync = promisify(exec);

describe('Claude Code Integration', () => {
  let apiBaseUrl: string;
  let frontendBaseUrl: string;
  let containerId: string;

  beforeAll(async () => {
    // Setup test environment
    apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8080';
    frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    
    // Start the containerized system
    console.log('🚀 Starting containerized Claude Code + AgentLink system...');
    
    try {
      const { stdout } = await execAsync('docker-compose up -d --build', {
        timeout: 180000 // 3 minutes timeout
      });
      
      console.log('Container startup output:', stdout);
      
      // Wait for services to be ready
      await waitForServices();
      
    } catch (error) {
      console.error('Failed to start containers:', error);
      throw error;
    }
  }, 300000); // 5 minutes timeout

  afterAll(async () => {
    console.log('🧹 Cleaning up containers...');
    try {
      await execAsync('docker-compose down -v');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });

  beforeEach(async () => {
    // Reset system state between tests
    await resetSystemState();
  });

  describe('Container Health and Startup', () => {
    it('should start all services within 60 seconds', async () => {
      const startTime = Date.now();
      
      // Check if all services are running
      const services = await checkServiceHealth();
      const totalTime = Date.now() - startTime;
      
      expect(services.postgres).toBe('healthy');
      expect(services.api).toBe('healthy');
      expect(services.frontend).toBe('healthy');
      expect(totalTime).toBeLessThan(60000);
    });

    it('should have proper internal networking', async () => {
      // Test internal communication between services
      const { stdout } = await execAsync(
        'docker exec agent-feed-api curl -f http://postgres:5432'
      );
      
      expect(stdout).toBeDefined();
    });

    it('should mount volumes correctly', async () => {
      const { stdout } = await execAsync(
        'docker exec agent-feed-api ls -la /app/src'
      );
      
      expect(stdout).toContain('api');
      expect(stdout).toContain('database');
    });

    it('should expose correct ports', async () => {
      const apiResponse = await fetch(`${apiBaseUrl}/health`);
      const frontendResponse = await fetch(frontendBaseUrl);
      
      expect(apiResponse.status).toBe(200);
      expect(frontendResponse.status).toBe(200);
    });
  });

  describe('Claude Code Agent Coordination', () => {
    it('should initialize Claude Flow swarm successfully', async () => {
      const response = await request(apiBaseUrl)
        .post('/api/claude-flow/swarm/init')
        .send({
          topology: 'hierarchical',
          maxAgents: 8,
          strategy: 'balanced'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('swarmId');
      expect(response.body.status).toBe('initialized');
    });

    it('should spawn all 17+ agent types', async () => {
      // First initialize swarm
      await request(apiBaseUrl)
        .post('/api/claude-flow/swarm/init')
        .send({ topology: 'hierarchical', maxAgents: 20 });

      const agentTypes = [
        'chief-of-staff', 'researcher', 'coder', 'tester', 'reviewer',
        'planner', 'architect', 'performance-analyzer', 'security-specialist',
        'documentation-writer', 'project-manager', 'quality-assurance',
        'backend-developer', 'frontend-developer', 'devops-engineer',
        'data-analyst', 'ml-engineer'
      ];

      const spawnPromises = agentTypes.map(type =>
        request(apiBaseUrl)
          .post('/api/claude-flow/agents/spawn')
          .send({ type, capabilities: [`${type}-capability`] })
      );

      const responses = await Promise.all(spawnPromises);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.type).toBe(agentTypes[index]);
        expect(response.body.status).toBe('active');
      });
    });

    it('should coordinate agents through Chief of Staff', async () => {
      // Initialize and spawn Chief of Staff
      await request(apiBaseUrl)
        .post('/api/claude-flow/swarm/init')
        .send({ topology: 'hierarchical', maxAgents: 10 });

      const chiefResponse = await request(apiBaseUrl)
        .post('/api/claude-flow/agents/spawn')
        .send({ type: 'chief-of-staff' });

      const coderResponse = await request(apiBaseUrl)
        .post('/api/claude-flow/agents/spawn')
        .send({ type: 'coder' });

      // Test task delegation
      const taskResponse = await request(apiBaseUrl)
        .post('/api/claude-flow/tasks/orchestrate')
        .send({
          task: 'Implement user authentication system',
          priority: 'high',
          strategy: 'adaptive'
        });

      expect(taskResponse.status).toBe(200);
      expect(taskResponse.body).toHaveProperty('taskId');
      expect(taskResponse.body.assignedAgents).toContain(coderResponse.body.agentId);
    });

    it('should execute SPARC methodology workflow', async () => {
      await request(apiBaseUrl)
        .post('/api/claude-flow/swarm/init')
        .send({ topology: 'hierarchical', maxAgents: 8 });

      // Spawn required agents for SPARC
      await Promise.all([
        request(apiBaseUrl).post('/api/claude-flow/agents/spawn').send({ type: 'planner' }),
        request(apiBaseUrl).post('/api/claude-flow/agents/spawn').send({ type: 'architect' }),
        request(apiBaseUrl).post('/api/claude-flow/agents/spawn').send({ type: 'coder' }),
        request(apiBaseUrl).post('/api/claude-flow/agents/spawn').send({ type: 'tester' })
      ]);

      const sparcResponse = await request(apiBaseUrl)
        .post('/api/claude-flow/workflows/sparc')
        .send({
          project: 'E2E Testing Framework',
          phases: ['specification', 'pseudocode', 'architecture', 'refinement', 'completion']
        });

      expect(sparcResponse.status).toBe(200);
      expect(sparcResponse.body).toHaveProperty('workflowId');
      expect(sparcResponse.body.phases).toHaveLength(5);
    });
  });

  // Helper functions
  async function waitForServices(): Promise<void> {
    const maxRetries = 60; // 1 minute with 1-second intervals
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const apiHealth = await fetch(`${apiBaseUrl}/health`);
        const frontendHealth = await fetch(frontendBaseUrl);

        if (apiHealth.status === 200 && frontendHealth.status === 200) {
          console.log('✅ All services are ready');
          return;
        }
      } catch (error) {
        // Services not ready yet
      }

      retries++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Services failed to start within timeout period');
  }

  async function checkServiceHealth(): Promise<any> {
    try {
      const { stdout } = await execAsync(
        'docker-compose ps --format json'
      );

      const services = JSON.parse(stdout);
      const health: any = {};

      services.forEach((service: any) => {
        health[service.Service] = service.State === 'running' ? 'healthy' : 'unhealthy';
      });

      return health;
    } catch (error) {
      return {};
    }
  }

  async function resetSystemState(): Promise<void> {
    try {
      // Clear test data from database
      await request(apiBaseUrl)
        .delete('/api/admin/test-data');

      // Reset Claude Flow state
      await request(apiBaseUrl)
        .post('/api/claude-flow/reset');

    } catch (error) {
      console.warn('Warning: Could not reset system state:', error);
    }
  }
});