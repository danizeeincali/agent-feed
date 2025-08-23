/**
 * Port Collision Scenarios - London School TDD
 * 
 * Comprehensive test scenarios for port collision detection and resolution
 * Focus on behavior verification through mock interactions
 */

const { PortConfigurationService } = require('../services/PortConfigurationService');
const { LauncherService } = require('../services/LauncherService');
const portFixtures = require('../fixtures/port-test-fixtures');

describe('Port Collision Scenarios - Behavior Verification', () => {
  let portService;
  let launcherService;
  let mockNetService;
  let mockProcessManager;
  let mockConnectionValidator;

  beforeEach(() => {
    // Reset all mocks between tests
    jest.clearAllMocks();
  });

  describe('Frontend-Backend Port Collision Detection', () => {
    it('should detect when frontend and backend attempt to use same port', async () => {
      // London School: Mock the collaboration
      mockNetService = portFixtures.createMockNetService('available');
      mockProcessManager = portFixtures.createMockProcessManager('success');
      mockConnectionValidator = portFixtures.createMockConnectionValidator('collision');

      portService = new PortConfigurationService(mockNetService, mockProcessManager);
      launcherService = new LauncherService(portService, mockProcessManager, mockConnectionValidator);

      // Mock port collision detection
      mockConnectionValidator.detectPortCollision.mockResolvedValue({
        collision: true,
        conflictingServices: ['frontend', 'backend'],
        port: 3000,
        details: 'Both services attempting to bind to port 3000'
      });

      const collisionConfig = portFixtures.collisionScenarios.samePort;
      
      // Test the behavior - not the implementation
      await expect(
        launcherService.startServices({
          frontend: { port: collisionConfig.frontend },
          backend: { port: collisionConfig.backend }
        })
      ).rejects.toThrow();

      // Verify the conversation between collaborators
      expect(mockConnectionValidator.detectPortCollision).toHaveBeenCalledWith({
        frontend: 3000,
        backend: 3000
      });
    });

    it('should coordinate collision resolution through available port discovery', async () => {
      mockNetService = portFixtures.createMockNetService('available');
      mockProcessManager = portFixtures.createMockProcessManager('success');
      mockConnectionValidator = portFixtures.createMockConnectionValidator('collision');

      // Mock collision detection and resolution
      mockConnectionValidator.detectPortCollision.mockResolvedValue({
        collision: true,
        port: 3000
      });
      mockNetService.getAvailablePort.mockResolvedValue(3002);

      portService = new PortConfigurationService(mockNetService, mockProcessManager);
      
      const resolvedConfig = await portService.resolvePortCollision({
        frontend: 3000,
        backend: 3000
      });

      // Verify resolution behavior
      expect(mockConnectionValidator.detectPortCollision).toHaveBeenCalled();
      expect(mockNetService.getAvailablePort).toHaveBeenCalledWith(3001);
      expect(resolvedConfig).toMatchObject({
        frontend: { port: 3000 },
        backend: { port: 3002 },
        resolved: true
      });
    });
  });

  describe('Launcher Hanging Scenarios', () => {
    it('should detect and handle launcher hanging due to port conflicts', async () => {
      mockNetService = portFixtures.createMockNetService('available');
      mockProcessManager = portFixtures.createMockProcessManager('conflict');
      mockConnectionValidator = portFixtures.createMockConnectionValidator('valid');

      // Mock hanging scenario - frontend server hangs on startup
      mockProcessManager.startFrontendServer.mockImplementation(() => {
        return new Promise((resolve) => {
          // Simulate hanging - never resolves
          setTimeout(() => resolve({ pid: 1234, port: 3000 }), 10000);
        });
      });

      // Mock process detection for cleanup
      mockProcessManager.getProcessByPort.mockResolvedValue({
        pid: 9999,
        service: 'backend',
        port: 3000
      });

      launcherService = new LauncherService(portService, mockProcessManager, mockConnectionValidator);

      // Use fake timers to control timeout
      jest.useFakeTimers();

      const launchPromise = launcherService.startServicesWithTimeout({
        frontend: { port: 3000 },
        backend: { port: 3001 }
      }, 5000);

      // Fast forward past timeout
      jest.advanceTimersByTime(5000);

      await expect(launchPromise).rejects.toThrow('Launch timeout: Port conflict detected');

      // Verify cleanup behavior was triggered
      expect(mockProcessManager.getProcessByPort).toHaveBeenCalledWith(3000);
      expect(mockProcessManager.killProcess).toHaveBeenCalledWith(9999);

      jest.useRealTimers();
    });

    it('should coordinate cascading cleanup when services fail to start', async () => {
      mockNetService = portFixtures.createMockNetService('available');
      mockProcessManager = portFixtures.createMockProcessManager('success');
      mockConnectionValidator = portFixtures.createMockConnectionValidator('valid');

      // Mock backend starts successfully, frontend fails
      mockProcessManager.startBackendServer.mockResolvedValue({ pid: 1001, port: 3001 });
      mockProcessManager.startFrontendServer.mockRejectedValue(new Error('Port in use'));

      launcherService = new LauncherService(portService, mockProcessManager, mockConnectionValidator);

      await expect(
        launcherService.startServices({
          frontend: { port: 3000 },
          backend: { port: 3001 }
        })
      ).rejects.toThrow('Service startup failed');

      // Verify cleanup coordination
      expect(mockProcessManager.startBackendServer).toHaveBeenCalledBefore(
        mockProcessManager.startFrontendServer
      );
      expect(mockProcessManager.killProcess).toHaveBeenCalledWith(1001);
    });
  });

  describe('System Port Conflicts', () => {
    it('should detect conflicts with system reserved ports', async () => {
      mockNetService = portFixtures.createMockNetService('unavailable');
      mockProcessManager = portFixtures.createMockProcessManager('success');
      mockConnectionValidator = portFixtures.createMockConnectionValidator('collision');

      // Mock system port conflict
      mockNetService.checkPortAvailability.mockImplementation((port) => {
        return Promise.resolve(port !== 80); // Port 80 is reserved
      });

      mockConnectionValidator.detectPortCollision.mockResolvedValue({
        collision: true,
        port: 80,
        type: 'system-reserved',
        details: 'Port 80 is reserved for HTTP service'
      });

      portService = new PortConfigurationService(mockNetService, mockProcessManager);

      await expect(
        portService.allocatePorts(portFixtures.collisionScenarios.systemPort)
      ).rejects.toThrow('Required ports not available');

      // Verify system port detection
      expect(mockNetService.checkPortAvailability).toHaveBeenCalledWith(80);
    });
  });

  describe('Network Service Interaction Patterns', () => {
    it('should coordinate proper port reservation sequence', async () => {
      mockNetService = portFixtures.createMockNetService('available');
      mockProcessManager = portFixtures.createMockProcessManager('success');

      portService = new PortConfigurationService(mockNetService, mockProcessManager);

      await portService.allocatePorts(portFixtures.validPortConfigs.standard);

      // Verify the conversation follows expected pattern
      const mockCalls = mockNetService.checkPortAvailability.mock.calls;
      const reservationCalls = mockNetService.reservePort.mock.calls;

      // Check sequence: availability check before reservation
      expect(mockNetService.checkPortAvailability).toHaveBeenCalledTimes(2);
      expect(mockNetService.reservePort).toHaveBeenCalledTimes(2);
      
      // Verify port checks happened before reservations
      expect(mockNetService.checkPortAvailability).toHaveBeenCalledBefore(mockNetService.reservePort);
    });

    it('should handle partial reservation failures gracefully', async () => {
      mockNetService = portFixtures.createMockNetService('available');
      mockProcessManager = portFixtures.createMockProcessManager('success');

      // Mock successful frontend reservation, failed backend
      mockNetService.reservePort
        .mockResolvedValueOnce({ port: 3000, reserved: true })
        .mockRejectedValueOnce(new Error('Backend port reservation failed'));

      portService = new PortConfigurationService(mockNetService, mockProcessManager);

      await expect(
        portService.allocatePorts(portFixtures.validPortConfigs.standard)
      ).rejects.toThrow();

      // Verify both reservation attempts were made
      expect(mockNetService.reservePort).toHaveBeenCalledTimes(2);
      expect(mockNetService.reservePort).toHaveBeenNthCalledWith(1, 3000, 'frontend');
      expect(mockNetService.reservePort).toHaveBeenNthCalledWith(2, 3001, 'backend');
    });
  });
});