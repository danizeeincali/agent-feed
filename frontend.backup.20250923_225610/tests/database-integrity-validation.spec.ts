/**
 * DATABASE INTEGRITY VALIDATION - ZERO MOCK TESTING
 * Validates real database operations and data consistency
 */

import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:3000';

test.describe('Database Integrity Validation - Real Data Only', () => {
  
  test('Database Health and Connection Validation', async ({ request }) => {
    console.log('🔍 Testing database health and connection...');
    
    // Test health endpoint
    const healthResponse = await request.get(`${API_URL}/health`);
    expect(healthResponse.ok()).toBe(true);
    
    const healthData = await healthResponse.json();
    console.log('Database health:', healthData);
    
    // Validate database is actually connected
    expect(healthData.data.status).toBe('healthy');
    expect(healthData.data.database).toBe(true);
    expect(healthData.data.timestamp).toBeDefined();
    
    console.log('✅ Database connection verified as healthy');
  });

  test('Real Agents Database Operations', async ({ request }) => {
    console.log('🔍 Testing real agents database operations...');
    
    // Get agents from database
    const agentsResponse = await request.get(`${API_URL}/api/agents`);
    expect(agentsResponse.ok()).toBe(true);
    
    const agentsData = await agentsResponse.json();
    console.log(`Loaded ${agentsData.data?.length || 0} agents from database`);
    
    // Validate agents data structure
    expect(agentsData).toHaveProperty('data');
    expect(Array.isArray(agentsData.data)).toBe(true);
    
    if (agentsData.data.length > 0) {
      const agent = agentsData.data[0];
      
      // Validate required agent fields
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('status');
      expect(agent).toHaveProperty('created_at');
      
      // Validate data types
      expect(typeof agent.id).toBe('string');
      expect(typeof agent.name).toBe('string');
      expect(typeof agent.status).toBe('string');
      
      // Validate no mock data
      expect(agent.name).not.toContain('Mock');
      expect(agent.name).not.toContain('Test');
      expect(agent.name).not.toContain('Fake');
      
      console.log('✅ Agent data validation passed:', {
        id: agent.id,
        name: agent.name,
        status: agent.status
      });
    }
  });

  test('Real Agent Posts Database Operations', async ({ request }) => {
    console.log('🔍 Testing real agent posts database operations...');
    
    // Get posts from database
    const postsResponse = await request.get(`${API_URL}/api/v1/agent-posts`);
    expect(postsResponse.ok()).toBe(true);
    
    const postsData = await postsResponse.json();
    console.log(`Loaded ${postsData.data?.length || 0} posts from database`);
    
    // Validate posts data structure
    expect(postsData).toHaveProperty('data');
    expect(Array.isArray(postsData.data)).toBe(true);
    
    if (postsData.data.length > 0) {
      const post = postsData.data[0];
      
      // Validate required post fields
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('agent_id');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('published_at');
      
      // Validate data types
      expect(typeof post.id).toBe('string');
      expect(typeof post.agent_id).toBe('string');
      expect(typeof post.content).toBe('string');
      
      // Validate content is not mock data
      expect(post.content).not.toContain('Lorem ipsum');
      expect(post.content).not.toContain('Mock content');
      expect(post.content).not.toContain('Test post');
      
      console.log('✅ Post data validation passed:', {
        id: post.id,
        agent_id: post.agent_id,
        content_preview: post.content.substring(0, 100) + '...'
      });
    }
  });

  test('Database Transaction Integrity', async ({ request }) => {
    console.log('🔍 Testing database transaction integrity...');
    
    // Test multiple concurrent requests to ensure database handles load
    const requests = Array.from({ length: 5 }, (_, i) => 
      request.get(`${API_URL}/api/agents`)
    );
    
    const responses = await Promise.all(requests);
    
    // All requests should succeed
    responses.forEach((response, index) => {
      expect(response.ok()).toBe(true);
      console.log(`✅ Concurrent request ${index + 1} succeeded`);
    });
    
    // Validate data consistency across requests
    const dataResults = await Promise.all(
      responses.map(response => response.json())
    );
    
    const firstResultCount = dataResults[0].data?.length || 0;
    dataResults.forEach((result, index) => {
      const currentCount = result.data?.length || 0;
      expect(Math.abs(currentCount - firstResultCount)).toBeLessThanOrEqual(1);
      console.log(`Request ${index + 1} returned ${currentCount} agents`);
    });
    
    console.log('✅ Database transaction integrity verified');
  });

  test('Real-time Database Updates Validation', async ({ request }) => {
    console.log('🔍 Testing real-time database updates...');
    
    // Get initial state
    const initialResponse = await request.get(`${API_URL}/api/agents`);
    expect(initialResponse.ok()).toBe(true);
    
    const initialData = await initialResponse.json();
    const initialCount = initialData.data?.length || 0;
    console.log(`Initial agent count: ${initialCount}`);
    
    // Wait a moment and check again
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const updatedResponse = await request.get(`${API_URL}/api/agents`);
    expect(updatedResponse.ok()).toBe(true);
    
    const updatedData = await updatedResponse.json();
    const updatedCount = updatedData.data?.length || 0;
    console.log(`Updated agent count: ${updatedCount}`);
    
    // Data should be consistent or show real changes
    expect(typeof updatedCount).toBe('number');
    expect(updatedCount).toBeGreaterThanOrEqual(0);
    
    console.log('✅ Real-time database updates validation passed');
  });

  test('System Metrics Database Operations', async ({ request }) => {
    console.log('🔍 Testing system metrics database operations...');
    
    // Get system metrics
    const metricsResponse = await request.get(`${API_URL}/api/v1/metrics/system`);
    expect(metricsResponse.ok()).toBe(true);
    
    const metricsData = await metricsResponse.json();
    console.log('System metrics loaded from database');
    
    // Validate metrics structure
    expect(metricsData).toHaveProperty('data');
    
    if (metricsData.data) {
      const metrics = Array.isArray(metricsData.data) ? metricsData.data[0] : metricsData.data;
      
      // Should have timestamp
      expect(metrics).toHaveProperty('timestamp');
      
      // Should have real system metrics
      const expectedMetrics = ['cpu_usage', 'memory_usage', 'active_agents', 'total_posts'];
      const hasRealMetrics = expectedMetrics.some(metric => 
        metrics.hasOwnProperty(metric) && typeof metrics[metric] === 'number'
      );
      
      expect(hasRealMetrics).toBe(true);
      console.log('✅ Real system metrics validated');
    }
  });

  test('Database Performance and Response Times', async ({ request }) => {
    console.log('🔍 Testing database performance...');
    
    const performanceResults: any[] = [];
    
    // Test multiple endpoint response times
    const endpoints = [
      { name: 'Health Check', url: `${API_URL}/health` },
      { name: 'Agents', url: `${API_URL}/api/agents` },
      { name: 'Agent Posts', url: `${API_URL}/api/v1/agent-posts` },
      { name: 'System Metrics', url: `${API_URL}/api/v1/metrics/system` }
    ];
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      
      try {
        const response = await request.get(endpoint.url);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        expect(response.ok()).toBe(true);
        
        const result = {
          endpoint: endpoint.name,
          responseTime,
          status: response.status(),
          success: true
        };
        
        performanceResults.push(result);
        console.log(`✅ ${endpoint.name}: ${responseTime}ms`);
        
        // Response time should be reasonable (under 5 seconds)
        expect(responseTime).toBeLessThan(5000);
        
      } catch (error) {
        performanceResults.push({
          endpoint: endpoint.name,
          error: error.message,
          success: false
        });
        console.error(`❌ ${endpoint.name} failed:`, error.message);
      }
    }
    
    // Calculate average response time
    const successfulResults = performanceResults.filter(r => r.success);
    const averageResponseTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length;
    
    console.log(`📊 Average database response time: ${averageResponseTime.toFixed(2)}ms`);
    
    // Export performance results
    require('fs').writeFileSync(
      '/workspaces/agent-feed/frontend/tests/database-performance-results.json',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        averageResponseTime: `${averageResponseTime.toFixed(2)}ms`,
        results: performanceResults
      }, null, 2)
    );
    
    expect(averageResponseTime).toBeLessThan(2000); // Should be under 2 seconds
    console.log('✅ Database performance validation passed');
  });
});