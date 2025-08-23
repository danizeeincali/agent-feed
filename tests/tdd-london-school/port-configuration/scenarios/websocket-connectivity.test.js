/**
 * WebSocket Connectivity Tests - London School TDD
 * 
 * Focus on interaction testing between WebSocket services and port management
 * Verify behavior through mock collaborations
 */

const { WebSocketConnectionService } = require('../services/WebSocketConnectionService');
const portFixtures = require('../fixtures/port-test-fixtures');

describe('WebSocket Connectivity with Port Separation - London School', () => {
  let wsConnectionService;
  let mockWebSocketServer;
  let mockConnectionValidator;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WebSocket Server Creation Contract', () => {
    it('should coordinate WebSocket server creation with port validation', async () => {
      // London School: Define the contract through mocks
      mockWebSocketServer = portFixtures.createMockWebSocketServer('success');
      mockConnectionValidator = portFixtures.createMockConnectionValidator('valid');

      wsConnectionService = new WebSocketConnectionService(
        mockWebSocketServer,
        mockConnectionValidator
      );

      const connectionConfig = {
        backendPort: 3001,
        frontendPort: 3000
      };

      const connection = await wsConnectionService.establishConnection(connectionConfig);

      // Verify the conversation sequence
      expect(mockConnectionValidator.detectPortCollision).toHaveBeenCalledWith({
        backend: 3001,
        frontend: 3000
      });
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

    it('should prevent WebSocket creation when port collision detected', async () => {
      mockWebSocketServer = portFixtures.createMockWebSocketServer('success');
      mockConnectionValidator = portFixtures.createMockConnectionValidator('collision');

      // Mock collision detection
      mockConnectionValidator.detectPortCollision.mockResolvedValue({
        collision: true,
        port: 3000,
        services: ['frontend', 'backend']
      });

      wsConnectionService = new WebSocketConnectionService(
        mockWebSocketServer,
        mockConnectionValidator
      );

      await expect(
        wsConnectionService.establishConnection({
          backendPort: 3000,
          frontendPort: 3000  // Same port collision
        })
      ).rejects.toThrow('WebSocket connection failed: Port collision');

      // Verify collision check prevented server creation
      expect(mockConnectionValidator.detectPortCollision).toHaveBeenCalled();
      expect(mockWebSocketServer.create).not.toHaveBeenCalled();
    });
  });

  describe('Connection Establishment Patterns', () => {
    it('should coordinate connection sequence with proper port separation', async () => {
      mockWebSocketServer = portFixtures.createMockWebSocketServer('success');
      mockConnectionValidator = portFixtures.createMockConnectionValidator('valid');

      // Mock successful connection flow
      mockWebSocketServer.create.mockResolvedValue({
        server: 'ws-server-instance',
        port: 3001
      });
      mockWebSocketServer.connect.mockResolvedValue({
        connected: true,
        url: 'ws://localhost:3001'
      });
      mockConnectionValidator.testConnectivity.mockResolvedValue(true);

      wsConnectionService = new WebSocketConnectionService(
        mockWebSocketServer,
        mockConnectionValidator
      );

      const result = await wsConnectionService.establishConnection({
        backendPort: 3001,
        frontendPort: 3000
      });

      // Verify proper sequence: collision check → server creation → connection → connectivity test
      const calls = jest.getAllMockCalls();
      expect(mockConnectionValidator.detectPortCollision).toHaveBeenCalledBefore(
        mockWebSocketServer.create
      );
      expect(mockWebSocketServer.create).toHaveBeenCalledBefore(
        mockWebSocketServer.connect
      );
      expect(mockWebSocketServer.connect).toHaveBeenCalledBefore(
        mockConnectionValidator.testConnectivity
      );

      expect(result.connected).toBe(true);
    });

    it('should handle WebSocket server creation failures', async () => {
      mockWebSocketServer = portFixtures.createMockWebSocketServer('failure');
      mockConnectionValidator = portFixtures.createMockConnectionValidator('valid');

      // Mock server creation failure
      mockWebSocketServer.create.mockRejectedValue(new Error('Port already in use'));
      mockConnectionValidator.detectPortCollision.mockResolvedValue({
        collision: true,
        port: 3000
      });

      wsConnectionService = new WebSocketConnectionService(
        mockWebSocketServer,
        mockConnectionValidator
      );

      await expect(
        wsConnectionService.establishConnection({
          backendPort: 3000,
          frontendPort: 3000
        })
      ).rejects.toThrow('WebSocket connection failed: Port already in use');

      // Verify error handling behavior
      expect(mockWebSocketServer.create).toHaveBeenCalled();
      expect(mockConnectionValidator.detectPortCollision).toHaveBeenCalled();
    });
  });

  describe('Connectivity Validation Interactions', () => {
    it('should verify connectivity between separated ports', async () => {
      mockWebSocketServer = portFixtures.createMockWebSocketServer('success');
      mockConnectionValidator = portFixtures.createMockConnectionValidator('valid');

      // Mock connectivity test success
      mockConnectionValidator.testConnectivity.mockResolvedValue(true);

      wsConnectionService = new WebSocketConnectionService(
        mockWebSocketServer,
        mockConnectionValidator
      );

      const connection = await wsConnectionService.establishConnection({
        backendPort: 3001,
        frontendPort: 3000
      });

      // Verify connectivity validation was called with correct ports
      expect(mockConnectionValidator.testConnectivity).toHaveBeenCalledWith({
        backend: 3001,
        frontend: 3000
      });

      expect(connection.connected).toBe(true);
    });

    it('should fail connection when connectivity test fails', async () => {
      mockWebSocketServer = portFixtures.createMockWebSocketServer('success');
      mockConnectionValidator = portFixtures.createMockConnectionValidator('invalid');

      // Mock connectivity test failure
      mockConnectionValidator.testConnectivity.mockResolvedValue(false);

      wsConnectionService = new WebSocketConnectionService(
        mockWebSocketServer,
        mockConnectionValidator
      );

      await expect(
        wsConnectionService.establishConnection({
          backendPort: 3001,
          frontendPort: 3000
        })
      ).rejects.toThrow('WebSocket connectivity test failed');

      // Verify the full conversation still happened
      expect(mockWebSocketServer.create).toHaveBeenCalled();
      expect(mockWebSocketServer.connect).toHaveBeenCalled();
      expect(mockConnectionValidator.testConnectivity).toHaveBeenCalled();
    });
  });

  describe('Connection Lifecycle Management', () => {
    it('should coordinate connection cleanup properly', async () => {
      mockWebSocketServer = portFixtures.createMockWebSocketServer('success');
      mockConnectionValidator = portFixtures.createMockConnectionValidator('valid');

      wsConnectionService = new WebSocketConnectionService(
        mockWebSocketServer,
        mockConnectionValidator
      );

      // Establish connection first
      await wsConnectionService.establishConnection({
        backendPort: 3001,
        frontendPort: 3000
      });

      // Then close it
      await wsConnectionService.closeConnection();

      // Verify cleanup behavior
      expect(mockWebSocketServer.close).toHaveBeenCalled();
    });

    it('should handle connection errors during establishment', async () => {
      mockWebSocketServer = portFixtures.createMockWebSocketServer('success');
      mockConnectionValidator = portFixtures.createMockConnectionValidator('valid');

      // Mock connection failure after server creation
      mockWebSocketServer.connect.mockRejectedValue(new Error('Connection refused'));

      wsConnectionService = new WebSocketConnectionService(
        mockWebSocketServer,
        mockConnectionValidator
      );

      await expect(
        wsConnectionService.establishConnection({
          backendPort: 3001,
          frontendPort: 3000
        })
      ).rejects.toThrow('WebSocket connection failed: Connection refused');

      // Verify server was created but connection failed
      expect(mockWebSocketServer.create).toHaveBeenCalled();
      expect(mockWebSocketServer.connect).toHaveBeenCalled();
    });
  });

  describe('Port-specific WebSocket Behavior', () => {
    it('should establish different WebSocket behaviors for different port configurations', async () => {
      mockWebSocketServer = portFixtures.createMockWebSocketServer('success');
      mockConnectionValidator = portFixtures.createMockConnectionValidator('valid');

      const testConfigs = [
        { backendPort: 3001, frontendPort: 3000 },
        { backendPort: 4001, frontendPort: 4000 },
        { backendPort: 5001, frontendPort: 5000 }
      ];

      wsConnectionService = new WebSocketConnectionService(
        mockWebSocketServer,
        mockConnectionValidator
      );

      // Test multiple port configurations
      for (const config of testConfigs) {
        await wsConnectionService.establishConnection(config);
        
        // Verify each configuration was handled properly
        expect(mockWebSocketServer.create).toHaveBeenCalledWith({ 
          port: config.backendPort 
        });
        expect(mockWebSocketServer.connect).toHaveBeenCalledWith(
          `ws://localhost:${config.backendPort}`
        );
      }

      // Verify total interactions
      expect(mockWebSocketServer.create).toHaveBeenCalledTimes(3);
      expect(mockWebSocketServer.connect).toHaveBeenCalledTimes(3);
    });
  });
});