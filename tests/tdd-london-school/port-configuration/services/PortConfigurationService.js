/**
 * Port Configuration Service - London School Implementation
 * 
 * This service coordinates with network and process management services
 * to ensure proper port allocation and separation between frontend/backend
 */

class PortConfigurationService {
  constructor(netService, processManager) {
    this.netService = netService;
    this.processManager = processManager;
  }

  async allocatePorts(portConfig) {
    const { frontend, backend } = portConfig;
    
    // Check availability of both ports
    const frontendAvailable = await this.netService.checkPortAvailability(frontend);
    const backendAvailable = await this.netService.checkPortAvailability(backend);
    
    if (!frontendAvailable || !backendAvailable) {
      throw new Error('Required ports not available');
    }
    
    // Reserve ports for each service
    const frontendReservation = await this.netService.reservePort(frontend, 'frontend');
    const backendReservation = await this.netService.reservePort(backend, 'backend');
    
    return {
      frontend: frontendReservation,
      backend: backendReservation
    };
  }

  async resolvePortCollision(portConfig) {
    const collision = await this.connectionValidator?.detectPortCollision?.(portConfig);
    
    if (collision?.collision) {
      const availablePort = await this.netService.getAvailablePort(portConfig.backend + 1);
      
      return {
        frontend: { port: portConfig.frontend },
        backend: { port: availablePort },
        resolved: true
      };
    }
    
    return portConfig;
  }
}

module.exports = { PortConfigurationService };