/**
 * TDD London School - Port Configuration and Separation Tests
 * 
 * Focus: Outside-in development with mock-driven design
 * Approach: Test interactions and collaborations between services
 * Issue: Frontend competing with backend for same port causing failures
 */

const { PortConfigurationService } = require('./services/PortConfigurationService');
const { LauncherService } = require('./services/LauncherService');
const { WebSocketConnectionService } = require('./services/WebSocketConnectionService');

describe('Port Configuration and Separation - London School TDD', () => {
  let mockNetService;
  let mockProcessManager;
  let mockWebSocketServer;
  let mockConnectionValidator;
  let portConfigurationService;
  let launcherService;
  let wsConnectionService;

  beforeEach(() => {
    // London School: Mock all collaborators first
    mockNetService = {
      checkPortAvailability: jest.fn(),
      reservePort: jest.fn(),
      releasePort: jest.fn(),
      getAvailablePort: jest.fn()
    };

    mockProcessManager = {
      startFrontendServer: jest.fn(),
      startBackendServer: jest.fn(),
      killProcess: jest.fn(),
      isProcessRunning: jest.fn(),
      getProcessByPort: jest.fn()
    };

    mockWebSocketServer = {
      create: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
      isConnected: jest.fn(),
      onConnectionError: jest.fn()
    };

    mockConnectionValidator = {
      validatePortSeparation: jest.fn(),
      testConnectivity: jest.fn(),
      detectPortCollision: jest.fn()
    };

    // Initialize services with mocked dependencies
    portConfigurationService = new PortConfigurationService(
      mockNetService,
      mockProcessManager
    );
    
    launcherService = new LauncherService(
      portConfigurationService,
      mockProcessManager,
      mockConnectionValidator
    );
    
    wsConnectionService = new WebSocketConnectionService(
      mockWebSocketServer,
      mockConnectionValidator
    );
  });

  describe('Port Allocation Contract Definition', () => {
    it('should define clear port allocation contracts through mock expectations', async () => {
      // London School: Use mocks to define the contract
      mockNetService.checkPortAvailability
        .mockResolvedValueOnce(true)  // Port 3000 available
        .mockResolvedValueOnce(true); // Port 3001 available

      mockNetService.reservePort
        .mockResolvedValueOnce({ port: 3000, reserved: true })
        .mockResolvedValueOnce({ port: 3001, reserved: true });

      const config = await portConfigurationService.allocatePorts({
        frontend: 3000,
        backend: 3001
      });

      // Verify the conversation between objects
      expect(mockNetService.checkPortAvailability).toHaveBeenCalledTimes(2);
      expect(mockNetService.checkPortAvailability).toHaveBeenNthCalledWith(1, 3000);
      expect(mockNetService.checkPortAvailability).toHaveBeenNthCalledWith(2, 3001);
      
      expect(mockNetService.reservePort).toHaveBeenCalledTimes(2);
      expect(mockNetService.reservePort).toHaveBeenNthCalledWith(1, 3000, 'frontend');
      expect(mockNetService.reservePort).toHaveBeenNthCalledWith(2, 3001, 'backend');

      expect(config).toEqual({
        frontend: { port: 3000, reserved: true },
        backend: { port: 3001, reserved: true }
      });
    });

    it('should establish service startup coordination contract', async () => {
      mockProcessManager.startFrontendServer.mockResolvedValue({ pid: 1234, port: 3000 });
      mockProcessManager.startBackendServer.mockResolvedValue({ pid: 5678, port: 3001 });
      mockConnectionValidator.validatePortSeparation.mockResolvedValue(true);

      await launcherService.startServices({
        frontend: { port: 3000 },
        backend: { port: 3001 }
      });

      // Verify coordination sequence
      expect(mockProcessManager.startBackendServer).toHaveBeenCalledBefore(
        mockProcessManager.startFrontendServer
      );
      expect(mockProcessManager.startFrontendServer).toHaveBeenCalledBefore(
        mockConnectionValidator.validatePortSeparation
      );
    });
  });

  describe('Port Collision Detection - Behavior Verification', () => {
    it('should detect and handle port collision between frontend and backend', async () => {
      // Mock port collision scenario
      mockNetService.checkPortAvailability
        .mockResolvedValueOnce(true)   // Port 3000 initially available
        .mockResolvedValueOnce(false); // Port 3000 becomes unavailable

      mockNetService.getAvailablePort.mockResolvedValue(3002);
      mockConnectionValidator.detectPortCollision.mockResolvedValue({
        collision: true,
        conflictingServices: ['frontend', 'backend'],
        port: 3000
      });

      const result = await portConfigurationService.resolvePortCollision({
        frontend: 3000,
        backend: 3000  // Same port - collision
      });

      // Verify collision detection behavior
      expect(mockConnectionValidator.detectPortCollision).toHaveBeenCalledWith({
        frontend: 3000,
        backend: 3000
      });

      expect(mockNetService.getAvailablePort).toHaveBeenCalledWith(3001);
      expect(result).toMatchObject({
        frontend: { port: 3000 },
        backend: { port: 3002 }, // Auto-resolved to available port
        resolved: true
      });
    });

    it('should handle launcher hanging due to port conflicts', async () => {
      mockProcessManager.startFrontendServer.mockImplementation(() => {
        return new Promise(() => {}); // Simulate hanging
      });

      mockProcessManager.getProcessByPort.mockResolvedValue({
        pid: 9999,
        service: 'backend',
        port: 3000
      });

      const launchPromise = launcherService.startServicesWithTimeout({
        frontend: { port: 3000 },
        backend: { port: 3000 }
      }, 5000);

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(5000);

      await expect(launchPromise).rejects.toThrow('Launch timeout: Port conflict detected');

      // Verify cleanup behavior
      expect(mockProcessManager.killProcess).toHaveBeenCalledWith(9999);
      expect(mockNetService.releasePort).toHaveBeenCalledWith(3000);
    });
  });

  describe('WebSocket Connectivity with Port Separation', () => {
    it('should establish WebSocket connection with proper port allocation', async () => {
      mockWebSocketServer.create.mockResolvedValue({ 
        server: 'ws-server-instance',
        port: 3001 
      });
      mockWebSocketServer.connect.mockResolvedValue({ 
        connected: true,
        url: 'ws://localhost:3001'
      });
      mockConnectionValidator.testConnectivity.mockResolvedValue(true);

      const connection = await wsConnectionService.establishConnection({
        backendPort: 3001,
        frontendPort: 3000
      });

      // Verify WebSocket setup sequence
      expect(mockWebSocketServer.create).toHaveBeenCalledWith({ port: 3001 });
      expect(mockWebSocketServer.connect).toHaveBeenCalledWith('ws://localhost:3001');
      expect(mockConnectionValidator.testConnectivity).toHaveBeenCalledWith({
        backend: 3001,
        frontend: 3000
      });

      expect(connection).toMatchObject({
        connected: true,
        backendPort: 3001,
        frontendPort: 3000
      });
    });

    it('should fail WebSocket connection when ports conflict', async () => {
      mockWebSocketServer.create.mockRejectedValue(new Error('Port already in use'));
      mockConnectionValidator.detectPortCollision.mockResolvedValue({
        collision: true,
        port: 3000
      });

      await expect(
        wsConnectionService.establishConnection({
          backendPort: 3000,
          frontendPort: 3000  // Same port conflict
        })
      ).rejects.toThrow('WebSocket connection failed: Port collision');

      // Verify error handling behavior
      expect(mockWebSocketServer.create).toHaveBeenCalledWith({ port: 3000 });
      expect(mockConnectionValidator.detectPortCollision).toHaveBeenCalled();
    });
  });

  describe('Service Interaction Patterns - Outside-In Testing', () => {
    it('should coordinate full service startup workflow', async () => {
      // Mock the complete outside-in workflow
      const workflowMocks = {
        portAllocation: mockNetService,
        processManagement: mockProcessManager,
        connectionValidation: mockConnectionValidator,
        websocketSetup: mockWebSocketServer
      };

      // Set up expected interactions
      mockNetService.checkPortAvailability.mockResolvedValue(true);
      mockNetService.reservePort.mockResolvedValue({ reserved: true });
      mockProcessManager.startBackendServer.mockResolvedValue({ pid: 1001 });
      mockProcessManager.startFrontendServer.mockResolvedValue({ pid: 1002 });
      mockWebSocketServer.create.mockResolvedValue({ server: 'instance' });
      mockConnectionValidator.validatePortSeparation.mockResolvedValue(true);

      const orchestrator = new ServiceOrchestrator(
        portConfigurationService,
        launcherService,
        wsConnectionService
      );

      await orchestrator.startCompleteStack();

      // Verify the entire conversation flow
      const mockCalls = jest.getAllMockCalls();
      
      // Ensure proper sequence: ports → backend → frontend → websocket → validation
      expect(mockCalls).toMatchSnapshot();
      expect(mockNetService.checkPortAvailability).toHaveBeenCalledBefore(
        mockProcessManager.startBackendServer
      );
      expect(mockProcessManager.startBackendServer).toHaveBeenCalledBefore(
        mockProcessManager.startFrontendServer
      );
      expect(mockProcessManager.startFrontendServer).toHaveBeenCalledBefore(
        mockWebSocketServer.create
      );
    });

    it('should handle cascading failures in service coordination', async () => {
      mockNetService.reservePort
        .mockResolvedValueOnce({ reserved: true })  // Backend port OK
        .mockRejectedValueOnce(new Error('Port unavailable')); // Frontend port fails

      mockProcessManager.startBackendServer.mockResolvedValue({ pid: 1001 });
      mockProcessManager.killProcess.mockResolvedValue(true);

      await expect(
        launcherService.startServices({
          frontend: { port: 3000 },
          backend: { port: 3001 }
        })
      ).rejects.toThrow('Service startup failed');

      // Verify cleanup coordination
      expect(mockProcessManager.killProcess).toHaveBeenCalledWith(1001);
      expect(mockNetService.releasePort).toHaveBeenCalledWith(3001);
    });
  });

  describe('Contract Evolution and Adaptation', () => {
    it('should adapt to new port allocation requirements', async () => {
      const enhancedMockNetService = {
        ...mockNetService,
        checkPortRange: jest.fn().mockResolvedValue([3000, 3001, 3002]),
        reservePortRange: jest.fn().mockResolvedValue({
          frontend: 3000,
          backend: 3001,
          websocket: 3002
        })
      };

      const enhancedPortService = new PortConfigurationService(
        enhancedMockNetService,
        mockProcessManager
      );

      await enhancedPortService.allocateEnhancedPorts({
        services: ['frontend', 'backend', 'websocket']
      });

      expect(enhancedMockNetService.checkPortRange).toHaveBeenCalled();
      expect(enhancedMockNetService.reservePortRange).toHaveBeenCalledWith({
        services: ['frontend', 'backend', 'websocket']
      });
    });
  });
});

// Mock service implementations for behavior verification
class ServiceOrchestrator {
  constructor(portService, launcherService, wsService) {
    this.portService = portService;
    this.launcherService = launcherService;
    this.wsService = wsService;
  }

  async startCompleteStack() {
    const ports = await this.portService.allocatePorts({
      frontend: 3000,
      backend: 3001
    });
    
    await this.launcherService.startServices(ports);
    await this.wsService.establishConnection(ports);
    
    return { status: 'complete', ports };
  }
}