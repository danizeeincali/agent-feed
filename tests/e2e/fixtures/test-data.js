// Test data and fixtures for Playwright tests

export const testUsers = {
  admin: {
    username: 'admin@test.com',
    password: 'admin123',
    role: 'admin'
  },
  user: {
    username: 'user@test.com',
    password: 'user123',
    role: 'user'
  }
};

export const testAgents = {
  coder: {
    name: 'Test Coder Agent',
    type: 'coder',
    description: 'A test coding agent for e2e testing'
  },
  researcher: {
    name: 'Test Research Agent',
    type: 'researcher',
    description: 'A test research agent for e2e testing'
  }
};

export const testFeedItems = [
  {
    id: '1',
    title: 'Test Feed Item 1',
    content: 'This is a test feed item for e2e testing',
    timestamp: new Date().toISOString(),
    agent: 'coder'
  },
  {
    id: '2',
    title: 'Test Feed Item 2',
    content: 'Another test feed item for e2e testing',
    timestamp: new Date().toISOString(),
    agent: 'researcher'
  }
];

export const mockApiResponses = {
  agents: {
    success: {
      status: 200,
      data: testAgents
    },
    error: {
      status: 500,
      message: 'Internal server error'
    }
  },
  feed: {
    success: {
      status: 200,
      data: testFeedItems
    },
    empty: {
      status: 200,
      data: []
    }
  }
};