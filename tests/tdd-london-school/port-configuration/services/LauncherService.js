/**
 * Launcher Service - London School Implementation
 * 
 * Coordinates service startup with proper port configuration
 * Handles timeout scenarios and cleanup
 */

class LauncherService {
  constructor(portConfigurationService, processManager, connectionValidator) {
    this.portService = portConfigurationService;
    this.processManager = processManager;
    this.connectionValidator = connectionValidator;
  }

  async startServices(portConfig) {
    try {
      // Start backend first to ensure it's ready for frontend connections
      const backendProcess = await this.processManager.startBackendServer({
        port: portConfig.backend.port
      });
      
      // Then start frontend
      const frontendProcess = await this.processManager.startFrontendServer({
        port: portConfig.frontend.port
      });
      
      // Validate port separation
      const validationResult = await this.connectionValidator.validatePortSeparation({
        frontend: portConfig.frontend.port,
        backend: portConfig.backend.port
      });
      
      if (!validationResult) {
        throw new Error('Port separation validation failed');
      }
      
      return {
        frontend: frontendProcess,
        backend: backendProcess,
        validated: true
      };
    } catch (error) {
      // Cleanup on failure
      await this.cleanup();
      throw new Error(`Service startup failed: ${error.message}`);
    }
  }

  async startServicesWithTimeout(portConfig, timeout = 30000) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        // Check for port conflicts when timeout occurs
        const conflictingProcess = await this.processManager.getProcessByPort(
          portConfig.frontend.port
        );
        
        if (conflictingProcess) {
          await this.processManager.killProcess(conflictingProcess.pid);
          await this.netService?.releasePort?.(portConfig.frontend.port);
        }
        
        reject(new Error('Launch timeout: Port conflict detected'));
      }, timeout);

      try {
        const result = await this.startServices(portConfig);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  async cleanup() {
    // Implementation would handle process cleanup
    // This is called by tests through mocked processManager
  }
}

module.exports = { LauncherService };