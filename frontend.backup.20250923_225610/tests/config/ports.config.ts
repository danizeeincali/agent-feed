// Port Configuration Management for Multi-Server Architecture
// Supports development, test, integration, and Docker environments

export interface PortConfig {
  frontend: number;
  backendApi: number;
  websocketTerminal: number;
  testRunner?: number;
}

export const PORT_ENVIRONMENTS = {
  development: {
    frontend: 5173,
    backendApi: 3001,
    websocketTerminal: 3002,
  } as PortConfig,
  
  test: {
    frontend: 5174,
    backendApi: 3003,
    websocketTerminal: 3004,
    testRunner: 3010,
  } as PortConfig,
  
  integration: {
    frontend: 5175,
    backendApi: 3005,
    websocketTerminal: 3006,
    testRunner: 3011,
  } as PortConfig,
  
  docker: {
    frontend: 5176,
    backendApi: 3007,
    websocketTerminal: 3008,
    testRunner: 3012,
  } as PortConfig,
} as const;

export type PortEnvironment = keyof typeof PORT_ENVIRONMENTS;

export class PortManager {
  private static instance: PortManager;
  private allocatedPorts = new Set<number>();
  
  static getInstance(): PortManager {
    if (!PortManager.instance) {
      PortManager.instance = new PortManager();
    }
    return PortManager.instance;
  }
  
  getConfig(env: PortEnvironment = 'development'): PortConfig {
    return PORT_ENVIRONMENTS[env];
  }
  
  async isPortAvailable(port: number): Promise<boolean> {
    const net = await import('net');
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      server.on('error', () => resolve(false));
    });
  }
  
  async validateEnvironment(env: PortEnvironment): Promise<boolean> {
    const config = this.getConfig(env);
    const ports = [config.frontend, config.backendApi, config.websocketTerminal];
    if (config.testRunner) ports.push(config.testRunner);
    
    const results = await Promise.all(
      ports.map(port => this.isPortAvailable(port))
    );
    
    return results.every(available => available);
  }
  
  async findAvailablePort(startPort: number): Promise<number> {
    for (let port = startPort; port < startPort + 100; port++) {
      if (await this.isPortAvailable(port)) {
        this.allocatedPorts.add(port);
        return port;
      }
    }
    throw new Error(`No available ports found starting from ${startPort}`);
  }
}

export const getPortConfig = (env?: PortEnvironment) => 
  PortManager.getInstance().getConfig(env || (process.env.NODE_ENV as PortEnvironment) || 'development');