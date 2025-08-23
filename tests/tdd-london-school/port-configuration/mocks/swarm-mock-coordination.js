/**
 * Swarm Mock Coordination - London School TDD
 * 
 * Coordinates mock definitions across swarm agents
 * Ensures consistent mock contracts for distributed testing
 */

class SwarmMockCoordinator {
  constructor() {
    this.sharedMocks = new Map();
    this.mockContracts = new Map();
    this.testResults = new Map();
  }

  // Register mock contracts for swarm sharing
  registerMockContract(serviceName, contract) {
    this.mockContracts.set(serviceName, {
      ...contract,
      timestamp: Date.now(),
      version: '1.0'
    });
  }

  // Create swarm-coordinated mock
  createSwarmMock(serviceName, mockDefinition) {
    const mock = {
      ...mockDefinition,
      _swarmId: `${serviceName}_${Date.now()}`,
      _serviceName: serviceName,
      _callHistory: []
    };

    // Wrap all mock functions to track calls
    Object.keys(mockDefinition).forEach(method => {
      if (typeof mockDefinition[method] === 'function') {
        const originalMock = mockDefinition[method];
        mock[method] = jest.fn((...args) => {
          mock._callHistory.push({
            method,
            args,
            timestamp: Date.now()
          });
          return originalMock(...args);
        });
      }
    });

    this.sharedMocks.set(serviceName, mock);
    return mock;
  }

  // Get shared mock for swarm coordination
  getSharedMock(serviceName) {
    return this.sharedMocks.get(serviceName);
  }

  // Notify swarm of test start
  async notifyTestStart(testSuite) {
    console.log(`Swarm Test Coordinator: Starting ${testSuite}`);
    // In real implementation, would notify other swarm agents
    return Promise.resolve({ notified: true, testSuite });
  }

  // Share test results with swarm
  async shareResults(results) {
    this.testResults.set(Date.now(), {
      ...results,
      timestamp: Date.now()
    });
    console.log('Swarm Test Coordinator: Results shared');
    return Promise.resolve({ shared: true });
  }

  // Verify interactions across swarm
  verifySwarmInteractions(serviceName) {
    const mock = this.sharedMocks.get(serviceName);
    if (!mock) return { verified: false, error: 'Mock not found' };

    const contract = this.mockContracts.get(serviceName);
    if (!contract) return { verified: false, error: 'Contract not found' };

    // Verify mock calls match contract expectations
    const violations = [];
    contract.expectedMethods?.forEach(method => {
      const calls = mock._callHistory.filter(call => call.method === method);
      if (calls.length === 0) {
        violations.push(`Expected method ${method} was not called`);
      }
    });

    return {
      verified: violations.length === 0,
      violations,
      callHistory: mock._callHistory
    };
  }

  // Generate interaction report for swarm
  generateInteractionReport() {
    const report = {
      timestamp: Date.now(),
      mocks: {},
      contracts: {},
      violations: []
    };

    // Collect all mock interactions
    for (const [serviceName, mock] of this.sharedMocks) {
      report.mocks[serviceName] = {
        callCount: mock._callHistory.length,
        methods: [...new Set(mock._callHistory.map(call => call.method))],
        lastCall: mock._callHistory[mock._callHistory.length - 1]
      };
    }

    // Verify all contracts
    for (const [serviceName] of this.mockContracts) {
      const verification = this.verifySwarmInteractions(serviceName);
      if (!verification.verified) {
        report.violations.push(...verification.violations);
      }
    }

    return report;
  }
}

// Port Configuration Mock Contracts for Swarm Coordination
const portConfigurationContracts = {
  PortConfigurationService: {
    expectedMethods: ['allocatePorts', 'resolvePortCollision'],
    collaborators: ['NetService', 'ProcessManager'],
    input: {
      allocatePorts: { frontend: 'number', backend: 'number' }
    },
    output: {
      allocatePorts: { frontend: 'object', backend: 'object' }
    }
  },

  LauncherService: {
    expectedMethods: ['startServices', 'startServicesWithTimeout'],
    collaborators: ['PortConfigurationService', 'ProcessManager', 'ConnectionValidator'],
    input: {
      startServices: { frontend: 'object', backend: 'object' }
    },
    output: {
      startServices: { frontend: 'object', backend: 'object', validated: 'boolean' }
    }
  },

  WebSocketConnectionService: {
    expectedMethods: ['establishConnection', 'closeConnection'],
    collaborators: ['WebSocketServer', 'ConnectionValidator'],
    input: {
      establishConnection: { backendPort: 'number', frontendPort: 'number' }
    },
    output: {
      establishConnection: { connected: 'boolean', backendPort: 'number', frontendPort: 'number' }
    }
  }
};

// Swarm-coordinated mock factory
function createSwarmMockFactory(coordinator) {
  return {
    createPortServiceMocks: (scenario = 'success') => {
      const netServiceMock = coordinator.createSwarmMock('NetService', {
        checkPortAvailability: jest.fn().mockResolvedValue(scenario === 'success'),
        reservePort: jest.fn().mockResolvedValue(
          scenario === 'success' ? { reserved: true } : null
        ),
        releasePort: jest.fn().mockResolvedValue(true),
        getAvailablePort: jest.fn().mockResolvedValue(3002)
      });

      const processManagerMock = coordinator.createSwarmMock('ProcessManager', {
        startFrontendServer: jest.fn().mockResolvedValue({ pid: 1234 }),
        startBackendServer: jest.fn().mockResolvedValue({ pid: 5678 }),
        killProcess: jest.fn().mockResolvedValue(true),
        isProcessRunning: jest.fn().mockResolvedValue(scenario === 'success'),
        getProcessByPort: jest.fn().mockResolvedValue(null)
      });

      const connectionValidatorMock = coordinator.createSwarmMock('ConnectionValidator', {
        validatePortSeparation: jest.fn().mockResolvedValue(scenario === 'success'),
        testConnectivity: jest.fn().mockResolvedValue(scenario === 'success'),
        detectPortCollision: jest.fn().mockResolvedValue({ collision: scenario === 'collision' })
      });

      return {
        netService: netServiceMock,
        processManager: processManagerMock,
        connectionValidator: connectionValidatorMock
      };
    }
  };
}

module.exports = {
  SwarmMockCoordinator,
  portConfigurationContracts,
  createSwarmMockFactory
};