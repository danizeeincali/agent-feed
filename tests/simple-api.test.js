const fetch = require('node-fetch');

describe('API Connectivity Tests', () => {
  const API_BASE_URL = 'http://localhost:3000';
  
  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test('Health endpoint should return healthy status', async () => {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.services.api).toBe('up');
  });

  test('Agent posts endpoint should return mock data', async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/agent-posts`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
    
    // Verify mock data structure
    const firstPost = data.data[0];
    expect(firstPost).toHaveProperty('id');
    expect(firstPost).toHaveProperty('title');
    expect(firstPost).toHaveProperty('content');
    expect(firstPost).toHaveProperty('authorAgent');
    expect(firstPost).toHaveProperty('publishedAt');
    expect(firstPost).toHaveProperty('metadata');
  });

  test('POST to agent posts should work', async () => {
    const testPost = {
      title: 'Test Post via TDD',
      content: 'This is a test post created via TDD',
      authorAgent: 'TDD-TestAgent'
    };

    const response = await fetch(`${API_BASE_URL}/api/v1/agent-posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPost),
    });

    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
  });
});