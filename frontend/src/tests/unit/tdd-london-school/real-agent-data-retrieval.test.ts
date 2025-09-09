import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { useAgentStatus, AgentStatus, AgentMetrics } from '../../src/hooks/useAgentStatus';
import { apiService } from '../../src/services/api';
import { DatabaseService } from '../../src/services/DatabaseService';

// Mock collaborators
const mockApiService = {
  getAgents: jest.fn(),
  getAgentMetrics: jest.fn(),
  subscribeToAgentUpdates: jest.fn(),
  checkDatabaseConnection: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

const mockDatabaseService = {
  getAgents: jest.fn(),
  getAgentMetrics: jest.fn(),
  subscribeToAgentChanges: jest.fn(),
  isConnected: jest.fn()
};

const mockWebSocketManager = {
  isConnected: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  emit: jest.fn()
};

// Mock network layer
const mockNetworkLayer = {
  fetch: jest.fn(),
  websocket: jest.fn(),
  sse: jest.fn()
};

describe('TDD London School: Real Agent Data Retrieval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Real Database Agent Retrieval', () => {
    it('should fetch agents from production database instead of mock data', async () => {
      // Contract Expectation: Real database call
      const expectedAgents: AgentStatus[] = [
        {
          id: 'real-agent-1',
          name: 'Production Agent 1',
          status: 'active',
          lastActive: new Date().toISOString(),
          workload: { activeTasks: 2, queuedTasks: 3, completedToday: 10 },
          performance: { successRate: 95.5, averageResponseTime: 1.2, tasksCompleted: 150 },
          capabilities: ['Real Capability 1', 'Real Capability 2'],
          health: { cpuUsage: 25.0, memoryUsage: 300.0, uptime: 99.9 }
        }
      ];

      // Mock database to return real data
      mockDatabaseService.getAgents.mockResolvedValue({
        success: true,
        data: expectedAgents,
        source: 'database'
      });
      mockDatabaseService.isConnected.mockReturnValue(true);

      // Mock API service to use database service
      mockApiService.getAgents.mockImplementation(() => 
        mockDatabaseService.getAgents()
      );
      mockApiService.checkDatabaseConnection.mockResolvedValue({
        connected: true,
        fallback: false
      });

      const { result } = renderHook(() => useAgentStatus({ includeMetrics: false }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify real database interaction
      expect(mockDatabaseService.getAgents).toHaveBeenCalledWith();
      expect(mockApiService.getAgents).toHaveBeenCalled();
      expect(mockApiService.checkDatabaseConnection).toHaveBeenCalled();
      
      // Verify no mock data is used
      expect(result.current.agents).not.toContainEqual(
        expect.objectContaining({ id: 'chief-of-staff' }) // Mock ID
      );
      
      // Verify real data is present
      expect(result.current.agents).toEqual(expectedAgents);
      expect(result.current.error).toBeNull();
    });

    it('should handle database connection failures without fallback to mock data', async () => {
      // Contract: Database service fails, no fallback to mocks
      mockDatabaseService.isConnected.mockReturnValue(false);
      mockDatabaseService.getAgents.mockRejectedValue(new Error('Database connection failed'));
      mockApiService.checkDatabaseConnection.mockResolvedValue({
        connected: false,
        fallback: false,
        error: 'Database connection failed'
      });

      const { result } = renderHook(() => useAgentStatus());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify database connection was attempted
      expect(mockApiService.checkDatabaseConnection).toHaveBeenCalled();
      expect(mockDatabaseService.isConnected).toHaveBeenCalled();
      
      // Verify error state instead of fallback
      expect(result.current.error).toBe('Database connection failed');
      expect(result.current.agents).toEqual([]);
      
      // Verify no mock data fallback
      expect(result.current.agents).not.toContainEqual(
        expect.objectContaining({ name: 'Chief of Staff Agent' })
      );
    });

    it('should verify agent data contract with database schema', async () => {
      // Contract: Agent data must match database schema exactly
      const databaseSchemaAgent = {
        id: 'db-agent-schema-test',
        name: 'Database Schema Agent',
        status: 'active' as const,
        lastActive: '2023-12-01T10:00:00.000Z',
        currentTask: 'Schema validation task',
        workload: {
          activeTasks: 1,
          queuedTasks: 2,
          completedToday: 5
        },
        performance: {
          successRate: 98.0,
          averageResponseTime: 0.8,
          tasksCompleted: 75
        },
        capabilities: ['Database Operations', 'Schema Validation'],
        health: {
          cpuUsage: 15.0,
          memoryUsage: 200.0,
          uptime: 99.95
        }
      };

      mockDatabaseService.getAgents.mockResolvedValue({
        success: true,
        data: [databaseSchemaAgent],
        source: 'database',
        schema: 'agents_v1'
      });
      mockApiService.getAgents.mockImplementation(() => mockDatabaseService.getAgents());

      const { result } = renderHook(() => useAgentStatus());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const agent = result.current.agents[0];
      
      // Verify database schema contract
      expect(agent).toMatchObject(databaseSchemaAgent);
      expect(typeof agent.id).toBe('string');
      expect(['active', 'idle', 'busy', 'offline']).toContain(agent.status);
      expect(agent.workload).toHaveProperty('activeTasks');
      expect(agent.performance).toHaveProperty('successRate');
      expect(agent.health).toHaveProperty('cpuUsage');
    });
  });

  describe('Real-time Agent Status Updates', () => {
    it('should receive real-time updates via database change streams', async () => {
      // Contract: Database change streams provide real-time updates
      const initialAgents: AgentStatus[] = [{
        id: 'realtime-agent',
        name: 'Realtime Test Agent',
        status: 'idle',
        lastActive: new Date().toISOString(),
        workload: { activeTasks: 0, queuedTasks: 1, completedToday: 5 },
        performance: { successRate: 95.0, averageResponseTime: 1.0, tasksCompleted: 100 },
        capabilities: ['Realtime Updates'],
        health: { cpuUsage: 10.0, memoryUsage: 150.0, uptime: 99.8 }
      }];

      mockDatabaseService.getAgents.mockResolvedValue({
        success: true,
        data: initialAgents
      });

      // Mock database change stream subscription
      let changeStreamCallback: ((change: any) => void) | null = null;
      mockDatabaseService.subscribeToAgentChanges.mockImplementation((callback) => {
        changeStreamCallback = callback;
        return () => {}; // unsubscribe function
      });

      const { result } = renderHook(() => useAgentStatus());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.agents[0].status).toBe('idle');

      // Simulate database change stream update
      const statusUpdate = {
        operationType: 'update',
        fullDocument: {
          ...initialAgents[0],
          status: 'active',
          lastActive: new Date().toISOString()
        }
      };

      if (changeStreamCallback) {
        changeStreamCallback(statusUpdate);
      }

      await waitFor(() => {
        expect(result.current.agents[0].status).toBe('active');
      });

      // Verify database change stream was subscribed to
      expect(mockDatabaseService.subscribeToAgentChanges).toHaveBeenCalled();
    });
  });

  describe('Agent Metrics from Production Database', () => {
    it('should calculate metrics from real database aggregation queries', async () => {
      // Contract: Metrics calculated via database aggregation, not client-side
      const realDatabaseMetrics: AgentMetrics = {
        totalAgents: 5,
        activeAgents: 3,
        busyAgents: 1,
        idleAgents: 1,
        offlineAgents: 0,
        totalTasks: 25,
        completedTasks: 150,
        averageResponseTime: 1.85,
        systemLoad: 72.5
      };

      mockDatabaseService.getAgentMetrics.mockResolvedValue({
        success: true,
        data: realDatabaseMetrics,
        source: 'database_aggregation',
        query: 'SELECT COUNT(*), AVG(response_time), SUM(tasks_completed) FROM agents'
      });

      mockApiService.getAgents.mockResolvedValue({ success: true, data: [] });
      
      const { result } = renderHook(() => useAgentStatus({ includeMetrics: true }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify database aggregation was used
      expect(mockDatabaseService.getAgentMetrics).toHaveBeenCalled();
      expect(result.current.metrics).toEqual(realDatabaseMetrics);
      
      // Verify metrics are not calculated client-side from mock data
      expect(result.current.metrics?.systemLoad).not.toBe(67.3); // Mock value
      expect(result.current.metrics?.systemLoad).toBe(72.5); // Real database value
    });
  });
});
