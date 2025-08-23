/**
 * WebSocket Connection Service - London School Implementation
 * 
 * Manages WebSocket connections ensuring proper port separation
 * between frontend and backend services
 */

class WebSocketConnectionService {
  constructor(webSocketServer, connectionValidator) {
    this.wsServer = webSocketServer;
    this.connectionValidator = connectionValidator;
  }

  async establishConnection(config) {
    const { backendPort, frontendPort } = config;
    
    try {
      // Check for port collision before creating WebSocket server
      const collision = await this.connectionValidator.detectPortCollision({
        backend: backendPort,
        frontend: frontendPort
      });
      
      if (collision?.collision) {
        throw new Error('WebSocket connection failed: Port collision');
      }
      
      // Create WebSocket server on backend port
      const wsServer = await this.wsServer.create({ port: backendPort });
      
      // Establish connection from frontend
      const connection = await this.wsServer.connect(`ws://localhost:${backendPort}`);
      
      // Test connectivity between services
      const connectivityTest = await this.connectionValidator.testConnectivity({
        backend: backendPort,
        frontend: frontendPort
      });
      
      if (!connectivityTest) {
        throw new Error('WebSocket connectivity test failed');
      }
      
      return {
        connected: true,
        backendPort,
        frontendPort,
        server: wsServer,
        connection
      };
    } catch (error) {
      throw new Error(`WebSocket connection failed: ${error.message}`);
    }
  }

  async closeConnection() {
    await this.wsServer.close();
  }
}

module.exports = { WebSocketConnectionService };