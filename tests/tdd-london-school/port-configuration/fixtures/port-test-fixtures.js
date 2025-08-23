/**
 * Port Configuration Test Fixtures - London School TDD
 * 
 * Provides consistent test data and mock configurations
 * for port separation testing scenarios
 */

const portFixtures = {
  // Valid port configurations
  validPortConfigs: {
    standard: {
      frontend: 3000,
      backend: 3001
    },
    alternative: {
      frontend: 4000,
      backend: 4001
    },
    development: {
      frontend: 3000,
      backend: 3001,
      websocket: 3002
    }
  },

  // Port collision scenarios
  collisionScenarios: {
    samePort: {
      frontend: 3000,
      backend: 3000  // Collision
    },
    systemPort: {
      frontend: 80,   // System port
      backend: 3001
    },
    unavailablePort: {
      frontend: 3000,
      backend: 22     // SSH port - typically unavailable
    }
  },

  // Mock responses for different scenarios
  mockResponses: {
    portAvailable: {
      checkPortAvailability: true,
      reservePort: { port: 3000, reserved: true, service: 'test' }
    },
    portUnavailable: {
      checkPortAvailability: false,
      reservePort: null,
      error: 'Port already in use'
    },
    portCollision: {
      detectPortCollision: {
        collision: true,
        conflictingServices: ['frontend', 'backend'],
        port: 3000
      }
    }
  },

  // Process management fixtures
  processFixtures: {
    frontendProcess: {
      pid: 1234,
      port: 3000,
      service: 'frontend',
      status: 'running'
    },
    backendProcess: {
      pid: 5678,
      port: 3001,
      service: 'backend',
      status: 'running'
    },
    conflictingProcess: {
      pid: 9999,
      port: 3000,
      service: 'unknown',
      status: 'blocking'
    }
  },

  // WebSocket connection fixtures
  websocketFixtures: {
    successfulConnection: {
      server: 'ws-server-instance',
      port: 3001,
      connected: true,
      url: 'ws://localhost:3001'
    },
    failedConnection: {
      server: null,
      port: 3000,
      connected: false,
      error: 'Connection refused',
      reason: 'Port collision'
    }
  },

  // Mock factory functions
  createMockNetService: (scenario = 'available') => ({
    checkPortAvailability: jest.fn().mockResolvedValue(
      scenario === 'available' ? true : false
    ),
    reservePort: jest.fn().mockResolvedValue(
      scenario === 'available' 
        ? { port: 3000, reserved: true }
        : null
    ),
    releasePort: jest.fn().mockResolvedValue(true),
    getAvailablePort: jest.fn().mockResolvedValue(3002)
  }),

  createMockProcessManager: (scenario = 'success') => ({
    startFrontendServer: jest.fn().mockResolvedValue(
      portFixtures.processFixtures.frontendProcess
    ),
    startBackendServer: jest.fn().mockResolvedValue(
      portFixtures.processFixtures.backendProcess
    ),
    killProcess: jest.fn().mockResolvedValue(true),
    isProcessRunning: jest.fn().mockResolvedValue(scenario === 'success'),
    getProcessByPort: jest.fn().mockResolvedValue(
      scenario === 'conflict' 
        ? portFixtures.processFixtures.conflictingProcess
        : null
    )
  }),

  createMockWebSocketServer: (scenario = 'success') => ({
    create: jest.fn().mockResolvedValue(
      scenario === 'success'
        ? portFixtures.websocketFixtures.successfulConnection
        : Promise.reject(new Error('Port already in use'))
    ),
    connect: jest.fn().mockResolvedValue(
      scenario === 'success'
        ? { connected: true, url: 'ws://localhost:3001' }
        : Promise.reject(new Error('Connection refused'))
    ),
    close: jest.fn().mockResolvedValue(true),
    isConnected: jest.fn().mockReturnValue(scenario === 'success'),
    onConnectionError: jest.fn()
  }),

  createMockConnectionValidator: (scenario = 'valid') => ({
    validatePortSeparation: jest.fn().mockResolvedValue(scenario === 'valid'),
    testConnectivity: jest.fn().mockResolvedValue(scenario === 'valid'),
    detectPortCollision: jest.fn().mockResolvedValue(
      scenario === 'collision' 
        ? portFixtures.mockResponses.portCollision.detectPortCollision
        : { collision: false }
    )
  })
};

module.exports = portFixtures;