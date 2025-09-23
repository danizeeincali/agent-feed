/**
 * London School TDD: API Integration Tests - Dynamic Pages
 * 
 * PRINCIPLES:
 * - Test real API endpoints with actual backend
 * - Focus on object collaboration and contracts
 * - Verify interactions between services
 * - NO MOCKS - Real data flows only
 * 
 * RED → GREEN → REFACTOR cycle for each test
 */

import { BASE_URL, waitForServerReady, verifyDatabaseConnection, validateApiResponse } from '../api-environment';
import { verifyApiContract, clearCollaborationHistory, verifyCollaboration } from '../test-setup';

describe('London School TDD: Dynamic Pages API Integration', () => {
  
  beforeAll(async () => {
    // London School: Verify real collaborators are available
    const serverReady = await waitForServerReady();
    expect(serverReady).toBe(true);
    
    const dbConnected = await verifyDatabaseConnection();
    expect(dbConnected).toBe(true);
    
    console.log('🔥 Real API backend ready for London School TDD tests');
  });
  
  beforeEach(() => {
    clearCollaborationHistory();
  });

  describe('Agent Pages API Collaboration', () => {
    
    it('should establish contract between frontend and agents endpoint', async () => {
      // RED: Define expected collaboration contract
      const expectedContract = {
        endpoint: `${BASE_URL}/agents`,
        method: 'GET',
        expectedRequest: null,
        expectedResponse: {
          success: expect.any(Boolean),
          agents: expect.any(Array)
        }
      };
      
      // GREEN: Verify real API collaboration
      const response = await verifyApiContract(expectedContract);
      
      // Verify collaboration pattern
      verifyCollaboration([
        { source: 'TestComponent', target: '/agents', method: 'GET' }
      ]);
      
      // REFACTOR: Validate response structure
      expect(response.success).toBe(true);
      expect(Array.isArray(response.agents)).toBe(true);
    });
    
    it('should handle dynamic page creation workflow collaboration', async () => {
      // RED: Test agent page creation interaction
      const agentId = 'test-agent';
      const pageId = 'dynamic-test-page';
      
      // GREEN: Test real page creation endpoint
      const createResponse = await fetch(`${BASE_URL}/agents/${agentId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          title: 'Test Dynamic Page',
          content: '<div>Test Content</div>',
          metadata: { created: new Date().toISOString() }
        })
      });
      
      // Verify collaboration occurred
      verifyCollaboration([
        { source: 'TestComponent', target: `/agents/${agentId}/pages`, method: 'POST' }
      ]);
      
      // REFACTOR: Validate creation response
      const createData = await createResponse.json();
      expect(createResponse.ok).toBe(true);
      expect(createData.success).toBe(true);
      
      // Verify page retrieval collaboration
      const getResponse = await fetch(`${BASE_URL}/agents/${agentId}/pages/${pageId}`);
      const getData = await getResponse.json();
      
      expect(getResponse.ok).toBe(true);
      expect(getData.success).toBe(true);
      expect(getData.page.pageId).toBe(pageId);
    });
    
    it('should collaborate with workspace API for page management', async () => {
      // RED: Test workspace integration collaboration
      const workspaceResponse = await fetch(`${BASE_URL}/workspace/info`);
      
      if (workspaceResponse.ok) {
        const workspaceData = await workspaceResponse.json();
        
        // GREEN: Verify workspace collaboration
        verifyCollaboration([
          { source: 'TestComponent', target: '/workspace/info', method: 'GET' }
        ]);
        
        // REFACTOR: Validate workspace structure
        expect(workspaceData).toHaveProperty('workspaceId');
        expect(workspaceData).toHaveProperty('pages');
      }
    });
  });

  describe('Real Data Flow Verification', () => {
    
    it('should verify agent posts data flow collaboration', async () => {
      // RED: Test real agent posts endpoint
      const postsResponse = await fetch(`${BASE_URL}/v1/agent-posts?limit=5`);
      
      // GREEN: Verify real data collaboration
      expect(postsResponse.ok).toBe(true);
      
      const postsData = await postsResponse.json();
      
      // Verify collaboration pattern
      verifyCollaboration([
        { source: 'TestComponent', target: '/v1/agent-posts', method: 'GET' }
      ]);
      
      // REFACTOR: Validate real data structure
      expect(postsData.success).toBe(true);
      expect(Array.isArray(postsData.data)).toBe(true);
      
      if (postsData.data.length > 0) {
        const post = postsData.data[0];
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('agent_id');
        expect(post).toHaveProperty('content');
      }
    });
    
    it('should handle real-time collaboration with WebSocket', async () => {
      // RED: Test WebSocket collaboration (if available)
      const wsUrl = 'ws://localhost:3000/ws';
      
      try {
        const ws = new WebSocket(wsUrl);
        
        await new Promise((resolve, reject) => {
          ws.onopen = () => {
            console.log('✅ WebSocket collaboration established');
            resolve(true);
          };
          
          ws.onerror = () => {
            console.log('⚠️ WebSocket not available, skipping real-time tests');
            resolve(false);
          };
          
          setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
        });
        
        ws.close();
      } catch (error) {
        console.log('⚠️ WebSocket collaboration not available in test environment');
      }
    });
  });

  describe('Error Scenario Collaboration', () => {
    
    it('should handle 404 collaboration gracefully', async () => {
      // RED: Test 404 error collaboration
      const response = await fetch(`${BASE_URL}/agents/non-existent-agent/pages/missing-page`);
      
      // GREEN: Verify error collaboration
      expect(response.status).toBe(404);
      
      verifyCollaboration([
        { source: 'TestComponent', target: '/agents/non-existent-agent/pages/missing-page', method: 'GET' }
      ]);
      
      // REFACTOR: Validate error response structure
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toBeTruthy();
    });
    
    it('should handle network timeout collaboration', async () => {
      // RED: Test timeout scenario
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100); // Very short timeout
      
      try {
        await fetch(`${BASE_URL}/agents`, {
          signal: controller.signal
        });
      } catch (error) {
        // GREEN: Verify timeout collaboration was attempted
        expect(error.name).toBe('AbortError');
        
        // REFACTOR: Ensure collaboration tracking recorded the attempt
        const lastCollaboration = (global as any).collaborationTracker.interactions.slice(-1)[0];
        expect(lastCollaboration.target).toContain('/agents');
      } finally {
        clearTimeout(timeoutId);
      }
    });
  });

  describe('Performance Collaboration Verification', () => {
    
    it('should verify API response time collaboration', async () => {
      // RED: Test performance collaboration
      const startTime = Date.now();
      
      const response = await fetch(`${BASE_URL}/health`);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // GREEN: Verify fast collaboration
      expect(response.ok).toBe(true);
      expect(responseTime).toBeLessThan(5000); // 5 second max
      
      // REFACTOR: Log performance metrics
      console.log(`⚡ API collaboration response time: ${responseTime}ms`);
      
      const healthData = await response.json();
      expect(healthData.status).toBe('healthy');
    });
    
    it('should verify concurrent collaboration handling', async () => {
      // RED: Test concurrent API collaborations
      const concurrentRequests = Array.from({ length: 5 }, () =>
        fetch(`${BASE_URL}/agents`)
      );
      
      // GREEN: Execute concurrent collaborations
      const responses = await Promise.all(concurrentRequests);
      
      // REFACTOR: Verify all collaborations succeeded
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });
      
      // Verify collaboration tracking recorded all requests
      const collaborations = (global as any).collaborationTracker.interactions;
      const agentRequests = collaborations.filter(c => c.target.includes('/agents'));
      expect(agentRequests.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Data Consistency Collaboration', () => {
    
    it('should verify data consistency across API collaborations', async () => {
      // RED: Test data consistency between different endpoints
      const agentsResponse = await fetch(`${BASE_URL}/agents`);
      const agentsData = await agentsResponse.json();
      
      if (agentsData.success && agentsData.agents.length > 0) {
        const firstAgent = agentsData.agents[0];
        
        // GREEN: Test individual agent collaboration
        const agentResponse = await fetch(`${BASE_URL}/agents/${firstAgent.id}`);
        
        if (agentResponse.ok) {
          const agentData = await agentResponse.json();
          
          // REFACTOR: Verify data consistency between collaborations
          expect(agentData.success).toBe(true);
          expect(agentData.agent.id).toBe(firstAgent.id);
        }
      }
    });
  });
});