/**
 * TDD London School Mock Definitions
 * Contract-driven mock implementations for agent pages
 */

// File System Mock Contract
export const createMockFileSystem = () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  // Contract: File system operations should be synchronous
  mockName: 'FileSystemMock'
});

// API Client Mock Contract
export const createMockApiClient = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  // Contract: All API calls return promises
  request: jest.fn(),
  mockName: 'ApiClientMock'
});

// Component Registry Mock Contract
export const createMockComponentRegistry = () => ({
  register: jest.fn(),
  unregister: jest.fn(),
  get: jest.fn(),
  exists: jest.fn(),
  list: jest.fn(),
  clear: jest.fn(),
  // Contract: Registry manages component lifecycle
  mockName: 'ComponentRegistryMock'
});

// Router Mock Contract
export const createMockRouter = () => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  reload: jest.fn(),
  // Contract: Router handles navigation
  mockName: 'RouterMock'
});

// Agent Page Data Mock Contract
export const createMockAgentPageData = (pageId = 'profile') => ({
  id: pageId,
  title: `${pageId.charAt(0).toUpperCase()}${pageId.slice(1)} Page`,
  content: `<div data-testid="${pageId}-content">Mock ${pageId} content</div>`,
  metadata: {
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    version: '1.0.0'
  },
  components: [
    {
      id: `${pageId}-header`,
      type: 'header',
      props: { title: `${pageId} Header` }
    },
    {
      id: `${pageId}-body`,
      type: 'content',
      props: { content: `${pageId} body content` }
    }
  ]
});

// Mock Responses for Different Pages
export const mockPageResponses = {
  profile: createMockAgentPageData('profile'),
  dashboard: createMockAgentPageData('dashboard'),
  'task-manager': createMockAgentPageData('task-manager')
};

// Error Mock Responses
export const createMockErrorResponse = (status = 404, message = 'Not Found') => ({
  status,
  message,
  error: true,
  timestamp: new Date().toISOString()
});

// Mock Hook Implementations
export const createMockHooks = () => ({
  useAgentPage: jest.fn(),
  useAgentPageData: jest.fn(),
  useComponentRegistry: jest.fn(),
  useRouter: jest.fn()
});

// Swarm Mock Contracts for collaboration testing
export const createSwarmMocks = () => ({
  fileSystem: createMockFileSystem(),
  apiClient: createMockApiClient(),
  componentRegistry: createMockComponentRegistry(),
  router: createMockRouter(),
  hooks: createMockHooks()
});

// Mock Factory for consistent test data
export const mockFactory = {
  agentPage: (overrides = {}) => ({
    ...createMockAgentPageData(),
    ...overrides
  }),
  
  apiResponse: (data, status = 200) => ({
    status,
    data,
    headers: { 'content-type': 'application/json' },
    ok: status >= 200 && status < 300
  }),
  
  errorResponse: (status = 500, message = 'Server Error') =>
    createMockErrorResponse(status, message),
  
  componentProps: (type = 'default', overrides = {}) => ({
    id: `component-${Date.now()}`,
    type,
    testId: `${type}-component`,
    ...overrides
  })
};

// Contract Verification Helpers
export const verifyMockContract = (mock, expectedMethods) => {
  expectedMethods.forEach(method => {
    expect(mock[method]).toBeDefined();
    expect(typeof mock[method]).toBe('function');
  });
};

export const verifyInteractionSequence = (mockCalls, expectedSequence) => {
  expectedSequence.forEach((expectedCall, index) => {
    const actualCall = mockCalls[index];
    expect(actualCall).toEqual(expect.arrayContaining([expectedCall.method, expectedCall.args]));
  });
};