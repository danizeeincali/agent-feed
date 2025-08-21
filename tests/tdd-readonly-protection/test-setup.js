/**
 * Test Setup for TDD London School Tests
 * Configures Jest for behavior verification and mock management
 */

// Global test configuration
global.console = {
  ...console,
  // Suppress console logs during tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock file system globally for security
jest.mock('fs', () => ({
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1
  },
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  chmod: jest.fn(),
  stat: jest.fn(),
  readdir: jest.fn(),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    chmod: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn()
  }
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...paths) => paths.join('/')),
  resolve: jest.fn((...paths) => '/' + paths.filter(p => p !== '/').join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/') || '/'),
  basename: jest.fn((path) => path.split('/').pop()),
  extname: jest.fn((path) => {
    const name = path.split('/').pop();
    const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
    return ext;
  }),
  sep: '/',
  delimiter: ':'
}));

// Mock process for environment testing
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    CLAUDE_ENVIRONMENT: 'test'
  };
});

afterEach(() => {
  process.env = originalEnv;
});

// Custom matchers for London School testing
expect.extend({
  toHaveBeenCalledWithSecurityContext(received, expectedContext) {
    const pass = received.mock.calls.some(call => {
      const actualContext = call[1];
      return actualContext && 
             actualContext.environment === expectedContext.environment &&
             actualContext.process === expectedContext.process;
    });

    if (pass) {
      return {
        message: () =>
          `expected ${received} not to have been called with security context ${JSON.stringify(expectedContext)}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to have been called with security context ${JSON.stringify(expectedContext)}`,
        pass: false,
      };
    }
  },

  toHaveBeenCalledBefore(received, otherMock) {
    const receivedCalls = received.mock.invocationCallOrder;
    const otherCalls = otherMock.mock.invocationCallOrder;
    
    if (receivedCalls.length === 0 || otherCalls.length === 0) {
      return {
        message: () => `One of the mocks was never called`,
        pass: false,
      };
    }

    const lastReceivedCall = Math.max(...receivedCalls);
    const firstOtherCall = Math.min(...otherCalls);
    const pass = lastReceivedCall < firstOtherCall;

    if (pass) {
      return {
        message: () =>
          `expected ${received.getMockName()} not to have been called before ${otherMock.getMockName()}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received.getMockName()} to have been called before ${otherMock.getMockName()}`,
        pass: false,
      };
    }
  },

  toSatisfyContract(received, expectedContract) {
    const hasRequiredMethods = expectedContract.collaborators.every(collaborator => {
      return received[collaborator.toLowerCase()] !== undefined;
    });

    if (hasRequiredMethods) {
      return {
        message: () =>
          `expected object not to satisfy contract ${JSON.stringify(expectedContract)}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected object to satisfy contract ${JSON.stringify(expectedContract)}`,
        pass: false,
      };
    }
  }
});

// Global mock helpers
global.createMockWithContract = (contractName, methods) => {
  const mock = {};
  methods.forEach(method => {
    mock[method] = jest.fn();
  });
  mock._contractName = contractName;
  return mock;
};

global.verifyMockInteractions = (mock, expectedInteractions) => {
  expectedInteractions.forEach(interaction => {
    expect(mock[interaction.method])
      .toHaveBeenCalledWith(...interaction.args);
  });
};

// Security test helpers
global.createSystemFile = (path) => ({
  path,
  isSystemFile: path.includes('/prod/') && 
                (path.includes('CLAUDE.md') || path.includes('config/')),
  isReadOnly: true
});

global.createProtectionScenario = (files, violations = []) => ({
  files: files.map(f => createSystemFile(f)),
  violations,
  expectedProtections: files.length,
  shouldSucceed: violations.length === 0
});

// Mock verification helpers
global.getAllMockCalls = () => {
  const allMocks = [];
  
  // Find all Jest mocks in the test context
  Object.keys(global).forEach(key => {
    if (global[key] && typeof global[key] === 'object' && global[key]._isMockFunction) {
      allMocks.push({ name: key, mock: global[key] });
    }
  });

  return allMocks.map(({ name, mock }) => ({
    name,
    calls: mock.mock.calls,
    results: mock.mock.results,
    invocationCallOrder: mock.mock.invocationCallOrder
  }));
};

// TDD cycle helpers
global.describeContract = (contractName, contractDef, tests) => {
  describe(`Contract: ${contractName}`, () => {
    beforeEach(() => {
      // Setup contract validation
      expect.hasAssertions();
    });
    
    tests(contractDef);
  });
};

global.itShouldVerifyBehavior = (description, behaviorTest) => {
  it(`should verify behavior: ${description}`, behaviorTest);
};

// London School specific helpers
global.verifyCollaborationPattern = (systemUnderTest, collaborators, expectedInteractions) => {
  collaborators.forEach(collaborator => {
    expectedInteractions[collaborator].forEach(interaction => {
      expect(collaborator[interaction.method])
        .toHaveBeenCalledWith(...interaction.args);
    });
  });
};

// Test isolation
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Verify no unhandled promises
  jest.runOnlyPendingTimers();
});