// Test setup for SSE Status streaming tests
// London School TDD setup with swarm coordination

const { SwarmTestCoordinator } = require('./swarm-coordinator');
const { MockFactory } = require('../mocks/mock-factory');

// Global test coordinator
global.swarmCoordinator = new SwarmTestCoordinator();
global.mockFactory = new MockFactory();

// Setup before each test
beforeEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Initialize swarm test session
  await global.swarmCoordinator.initializeTestSession();
  
  // Reset mock factory
  global.mockFactory.reset();
});

// Cleanup after each test
afterEach(async () => {
  // Verify all mock interactions
  global.mockFactory.verifyAllInteractions();
  
  // Report test results to swarm
  await global.swarmCoordinator.reportTestResults();
});

// Global test utilities
global.createMockSSEConnection = () => global.mockFactory.createSSEConnectionMock();
global.createMockStatusHandler = () => global.mockFactory.createStatusHandlerMock();
global.createMockBroadcaster = () => global.mockFactory.createBroadcasterMock();

// Custom matchers for London School TDD
expect.extend({
  toHaveBeenCalledBefore(mockFn, otherMockFn) {
    const mockCalls = mockFn.mock.invocationCallOrder;
    const otherCalls = otherMockFn.mock.invocationCallOrder;
    
    const lastMockCall = Math.max(...mockCalls);
    const firstOtherCall = Math.min(...otherCalls);
    
    const pass = lastMockCall < firstOtherCall;
    
    return {
      pass,
      message: () => pass 
        ? `Expected ${mockFn.getMockName()} not to be called before ${otherMockFn.getMockName()}`
        : `Expected ${mockFn.getMockName()} to be called before ${otherMockFn.getMockName()}`
    };
  },

  toSatisfyContract(contract) {
    const mockObject = this;
    const contractKeys = Object.keys(contract);
    const mockKeys = Object.keys(mockObject);
    
    const hasAllRequiredMethods = contractKeys.every(key => mockKeys.includes(key));
    
    return {
      pass: hasAllRequiredMethods,
      message: () => hasAllRequiredMethods
        ? 'Mock satisfies contract'
        : `Mock missing required methods: ${contractKeys.filter(key => !mockKeys.includes(key))}`
    };
  }
});