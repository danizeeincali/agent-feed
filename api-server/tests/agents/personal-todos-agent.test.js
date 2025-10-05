import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import personalTodosAgentRoutes from '../../routes/agents/personal-todos-agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Setup test paths
const AGENT_WORKSPACE = path.join(__dirname, '../../../prod/agent_workspace');
const TEST_TASKS_DIR = path.join(AGENT_WORKSPACE, 'personal-todos-agent');
const TEST_TASKS_PATH = path.join(TEST_TASKS_DIR, 'tasks.json');
const BACKUP_PATH = TEST_TASKS_PATH + '.backup';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/agents/personal-todos-agent', personalTodosAgentRoutes);
  return app;
}

describe('Personal Todos Agent API', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();

    // Backup existing tasks.json if it exists
    if (fs.existsSync(TEST_TASKS_PATH)) {
      fs.copyFileSync(TEST_TASKS_PATH, BACKUP_PATH);
    }
  });

  afterEach(() => {
    // Restore backup if it exists
    if (fs.existsSync(BACKUP_PATH)) {
      fs.copyFileSync(BACKUP_PATH, TEST_TASKS_PATH);
      fs.unlinkSync(BACKUP_PATH);
    }
  });

  describe('GET /api/agents/personal-todos-agent/data', () => {
    it('should return success response with valid data structure', async () => {
      const response = await request(app)
        .get('/api/agents/personal-todos-agent/data')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('timestamp');
      expect(response.body.metadata).toHaveProperty('agentId', 'personal-todos-agent');
      expect(response.body.metadata).toHaveProperty('version', '1.0.0');
    });

    it('should return correct data structure with all required fields', async () => {
      const response = await request(app)
        .get('/api/agents/personal-todos-agent/data')
        .expect(200);

      const { data } = response.body;

      expect(data).toHaveProperty('totalTasks');
      expect(data).toHaveProperty('completedTasks');
      expect(data).toHaveProperty('activeTasks');
      expect(data).toHaveProperty('recentTasks');
      expect(data).toHaveProperty('priorityDistribution');
      expect(data).toHaveProperty('completionRate');
      expect(data).toHaveProperty('averageImpactScore');
      expect(data).toHaveProperty('statusDistribution');

      expect(typeof data.totalTasks).toBe('number');
      expect(typeof data.completedTasks).toBe('number');
      expect(typeof data.activeTasks).toBe('number');
      expect(Array.isArray(data.recentTasks)).toBe(true);
      expect(typeof data.priorityDistribution).toBe('object');
      expect(typeof data.completionRate).toBe('number');
      expect(typeof data.averageImpactScore).toBe('number');
      expect(typeof data.statusDistribution).toBe('object');
    });

    it('should return accurate task counts from real data', async () => {
      const response = await request(app)
        .get('/api/agents/personal-todos-agent/data')
        .expect(200);

      const { data } = response.body;

      expect(data.totalTasks).toBe(15);
      expect(data.completedTasks).toBe(5);
      expect(data.activeTasks).toBe(10);
      expect(data.totalTasks).toBe(data.completedTasks + data.activeTasks);
    });

    it('should return correct priority distribution', async () => {
      const response = await request(app)
        .get('/api/agents/personal-todos-agent/data')
        .expect(200);

      const { data } = response.body;

      expect(data.priorityDistribution).toHaveProperty('P0');
      expect(data.priorityDistribution).toHaveProperty('P1');
      expect(data.priorityDistribution).toHaveProperty('P2');
      expect(data.priorityDistribution).toHaveProperty('P3');
      expect(data.priorityDistribution).toHaveProperty('P5');
      expect(data.priorityDistribution).toHaveProperty('P8');

      // Verify counts match expected values from sample data
      expect(data.priorityDistribution.P0).toBe(3);
      expect(data.priorityDistribution.P1).toBe(4);
      expect(data.priorityDistribution.P2).toBe(3);
      expect(data.priorityDistribution.P3).toBe(2);
      expect(data.priorityDistribution.P5).toBe(2);
      expect(data.priorityDistribution.P8).toBe(1);
    });

    it('should return correct status distribution', async () => {
      const response = await request(app)
        .get('/api/agents/personal-todos-agent/data')
        .expect(200);

      const { data } = response.body;

      expect(data.statusDistribution).toHaveProperty('pending');
      expect(data.statusDistribution).toHaveProperty('in_progress');
      expect(data.statusDistribution).toHaveProperty('completed');

      expect(typeof data.statusDistribution.pending).toBe('number');
      expect(typeof data.statusDistribution.in_progress).toBe('number');
      expect(typeof data.statusDistribution.completed).toBe('number');

      // Verify total matches
      const totalStatus = data.statusDistribution.pending +
                         data.statusDistribution.in_progress +
                         data.statusDistribution.completed;
      expect(totalStatus).toBe(data.totalTasks);
    });

    it('should calculate completion rate correctly', async () => {
      const response = await request(app)
        .get('/api/agents/personal-todos-agent/data')
        .expect(200);

      const { data } = response.body;

      // Completion rate should be (completed / total) * 100
      const expectedRate = (data.completedTasks / data.totalTasks) * 100;
      expect(data.completionRate).toBeCloseTo(expectedRate, 1);
      expect(data.completionRate).toBeGreaterThanOrEqual(0);
      expect(data.completionRate).toBeLessThanOrEqual(100);
    });

    it('should calculate average impact score correctly', async () => {
      const response = await request(app)
        .get('/api/agents/personal-todos-agent/data')
        .expect(200);

      const { data } = response.body;

      expect(data.averageImpactScore).toBeGreaterThan(0);
      expect(data.averageImpactScore).toBeLessThanOrEqual(10);
      expect(typeof data.averageImpactScore).toBe('number');
    });

    it('should return recent tasks with correct structure', async () => {
      const response = await request(app)
        .get('/api/agents/personal-todos-agent/data')
        .expect(200);

      const { data } = response.body;

      expect(Array.isArray(data.recentTasks)).toBe(true);
      expect(data.recentTasks.length).toBeLessThanOrEqual(5);

      if (data.recentTasks.length > 0) {
        const task = data.recentTasks[0];
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('priority');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('impact_score');
        expect(task).toHaveProperty('completion_percentage');
        expect(task).toHaveProperty('updated_at');
      }
    });

    it('should handle missing tasks.json file gracefully', async () => {
      // Remove tasks.json temporarily
      if (fs.existsSync(TEST_TASKS_PATH)) {
        fs.unlinkSync(TEST_TASKS_PATH);
      }

      const response = await request(app)
        .get('/api/agents/personal-todos-agent/data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalTasks).toBe(0);
      expect(response.body.data.completedTasks).toBe(0);
      expect(response.body.data.activeTasks).toBe(0);
      expect(response.body.data.recentTasks).toEqual([]);
      expect(response.body.data.completionRate).toBe(0);
      expect(response.body.data.averageImpactScore).toBe(0);
      expect(response.body.metadata.note).toContain('No tasks file found');
    });

    it('should handle invalid JSON in tasks.json file', async () => {
      // Write invalid JSON to tasks.json
      fs.writeFileSync(TEST_TASKS_PATH, '{ invalid json }', 'utf-8');

      const response = await request(app)
        .get('/api/agents/personal-todos-agent/data')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid Data Format');
      expect(response.body.message).toContain('Failed to parse');
    });

    it('should handle empty tasks arrays gracefully', async () => {
      // Write empty tasks structure
      const emptyData = {
        version: '1.0.0',
        agent_id: 'personal-todos-agent',
        active_tasks: [],
        completed_tasks: []
      };
      fs.writeFileSync(TEST_TASKS_PATH, JSON.stringify(emptyData), 'utf-8');

      const response = await request(app)
        .get('/api/agents/personal-todos-agent/data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalTasks).toBe(0);
      expect(response.body.data.completedTasks).toBe(0);
      expect(response.body.data.activeTasks).toBe(0);
      expect(response.body.data.recentTasks).toEqual([]);
      expect(response.body.data.completionRate).toBe(0);
      expect(response.body.data.averageImpactScore).toBe(0);
    });

    it('should handle missing task properties gracefully', async () => {
      // Write tasks with missing properties
      const minimalData = {
        active_tasks: [
          { id: 'task-1', title: 'Task 1' }
        ],
        completed_tasks: []
      };
      fs.writeFileSync(TEST_TASKS_PATH, JSON.stringify(minimalData), 'utf-8');

      const response = await request(app)
        .get('/api/agents/personal-todos-agent/data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalTasks).toBe(1);
      expect(response.body.data.activeTasks).toBe(1);
    });

    it('should sort recent tasks by update date (newest first)', async () => {
      const response = await request(app)
        .get('/api/agents/personal-todos-agent/data')
        .expect(200);

      const { data } = response.body;

      if (data.recentTasks.length > 1) {
        for (let i = 0; i < data.recentTasks.length - 1; i++) {
          const current = new Date(data.recentTasks[i].updated_at);
          const next = new Date(data.recentTasks[i + 1].updated_at);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it('should include metadata timestamp in ISO format', async () => {
      const response = await request(app)
        .get('/api/agents/personal-todos-agent/data')
        .expect(200);

      const timestamp = response.body.metadata.timestamp;
      expect(timestamp).toBeTruthy();

      // Verify it's a valid ISO date string
      const date = new Date(timestamp);
      expect(date.toISOString()).toBe(timestamp);
    });
  });
});
