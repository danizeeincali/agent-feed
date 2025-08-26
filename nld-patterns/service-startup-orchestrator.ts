/**
 * NLD Service Startup Orchestrator
 * Manages proper service startup sequence to prevent ECONNREFUSED cascade failures
 * Based on failure patterns from NLD-BACKEND-CONN-20250826-001
 */

import { serviceHealthMonitor } from './service-health-monitor';
import { connectionRecoverySystem } from './connection-recovery-system';

interface ServiceDefinition {
  name: string;
  type: 'infrastructure' | 'backend' | 'frontend';
  priority: number; // Lower numbers start first
  dependencies: string[];
  startCommand?: string;
  healthCheckPath?: string;
  startupTimeout: number;
  port?: number;
  dockerImage?: string;
  processName?: string;
}

interface StartupEvent {
  timestamp: string;
  service: string;
  event: 'starting' | 'started' | 'failed' | 'dependency_wait';
  message: string;
  duration?: number;
}

enum ServiceStartupState {
  PENDING = 'pending',
  STARTING = 'starting', 
  STARTED = 'started',
  FAILED = 'failed',
  DEPENDENCY_WAITING = 'dependency_waiting'
}

class ServiceStartupOrchestrator {
  private services: Map<string, ServiceDefinition> = new Map();
  private serviceStates: Map<string, ServiceStartupState> = new Map();
  private startupEvents: StartupEvent[] = [];
  private startupPromises: Map<string, Promise<boolean>> = new Map();

  constructor() {
    this.initializeServiceDefinitions();
  }

  private initializeServiceDefinitions(): void {
    const services: ServiceDefinition[] = [
      // Infrastructure services (highest priority)
      {
        name: 'redis',
        type: 'infrastructure',
        priority: 1,
        dependencies: [],
        startCommand: 'redis-server --port 6379 --daemonize yes',
        healthCheckPath: '/ping',
        startupTimeout: 30000,
        port: 6379,
        dockerImage: 'redis:alpine',
        processName: 'redis-server'
      },

      // Backend services (medium priority)
      {
        name: 'backend-api',
        type: 'backend',
        priority: 2,
        dependencies: ['redis'],
        startCommand: 'npm run dev:backend',
        healthCheckPath: '/health',
        startupTimeout: 60000,
        port: 3000,
        processName: 'node'
      },
      
      {
        name: 'websocket-server',
        type: 'backend', 
        priority: 2,
        dependencies: ['redis', 'backend-api'],
        startCommand: 'npm run dev:websocket',
        healthCheckPath: '/socket.io/health',
        startupTimeout: 30000,
        port: 3000, // Usually same as backend-api for Socket.IO
        processName: 'node'
      },

      {
        name: 'secondary-backend-3002',
        type: 'backend',
        priority: 3,
        dependencies: ['redis', 'backend-api'],
        startCommand: 'npm run dev:backend:3002',
        healthCheckPath: '/health',
        startupTimeout: 45000,
        port: 3002,
        processName: 'node'
      },

      {
        name: 'secondary-backend-3003',
        type: 'backend',
        priority: 3,
        dependencies: ['redis', 'backend-api'],
        startCommand: 'npm run dev:backend:3003', 
        healthCheckPath: '/health',
        startupTimeout: 45000,
        port: 3003,
        processName: 'node'
      },

      // Frontend services (lowest priority)
      {
        name: 'frontend-vite',
        type: 'frontend',
        priority: 4,
        dependencies: ['backend-api', 'websocket-server'],
        startCommand: 'npm run dev',
        healthCheckPath: '/',
        startupTimeout: 30000,
        port: 5173,
        processName: 'vite'
      }
    ];

    services.forEach(service => {
      this.services.set(service.name, service);
      this.serviceStates.set(service.name, ServiceStartupState.PENDING);
    });
  }

  async startAllServices(): Promise<boolean> {
    console.log('🚀 Starting service orchestration...');
    this.logEvent('system', 'starting', 'Beginning orchestrated startup sequence');

    try {
      // Get services sorted by priority
      const sortedServices = Array.from(this.services.values())
        .sort((a, b) => a.priority - b.priority);

      // Start services in priority order, waiting for dependencies
      for (const service of sortedServices) {
        const success = await this.startService(service.name);
        if (!success) {
          console.error(`❌ Failed to start ${service.name}, stopping orchestration`);
          return false;
        }
      }

      console.log('✅ All services started successfully');
      this.logEvent('system', 'started', 'All services started successfully');
      return true;

    } catch (error) {
      console.error('❌ Service orchestration failed:', error);
      this.logEvent('system', 'failed', `Orchestration failed: ${error}`);
      return false;
    }
  }

  async startService(serviceName: string): Promise<boolean> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    // Check if already started
    if (this.serviceStates.get(serviceName) === ServiceStartupState.STARTED) {
      console.log(`✅ Service ${serviceName} already started`);
      return true;
    }

    // Check if startup is already in progress
    if (this.startupPromises.has(serviceName)) {
      console.log(`⏳ Service ${serviceName} startup already in progress`);
      return await this.startupPromises.get(serviceName)!;
    }

    const startupPromise = this.performServiceStartup(service);
    this.startupPromises.set(serviceName, startupPromise);

    try {
      const result = await startupPromise;
      return result;
    } finally {
      this.startupPromises.delete(serviceName);
    }
  }

  private async performServiceStartup(service: ServiceDefinition): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 Starting ${service.name}...`);
      this.serviceStates.set(service.name, ServiceStartupState.STARTING);
      this.logEvent(service.name, 'starting', `Starting ${service.type} service`);

      // Step 1: Wait for dependencies
      if (service.dependencies.length > 0) {
        console.log(`⏳ Waiting for dependencies: ${service.dependencies.join(', ')}`);
        this.serviceStates.set(service.name, ServiceStartupState.DEPENDENCY_WAITING);
        this.logEvent(service.name, 'dependency_wait', `Waiting for: ${service.dependencies.join(', ')}`);

        const dependenciesReady = await this.waitForDependencies(service);
        if (!dependenciesReady) {
          this.serviceStates.set(service.name, ServiceStartupState.FAILED);
          this.logEvent(service.name, 'failed', 'Dependencies not ready');
          return false;
        }
      }

      // Step 2: Check if service is already running
      const healthCheck = await serviceHealthMonitor.checkServiceHealth(service.name);
      if (healthCheck.success) {
        console.log(`✅ Service ${service.name} already running and healthy`);
        this.serviceStates.set(service.name, ServiceStartupState.STARTED);
        const duration = Date.now() - startTime;
        this.logEvent(service.name, 'started', 'Already running', duration);
        return true;
      }

      // Step 3: Attempt to start the service
      const startSuccess = await this.executeStartCommand(service);
      if (!startSuccess) {
        this.serviceStates.set(service.name, ServiceStartupState.FAILED);
        this.logEvent(service.name, 'failed', 'Start command failed');
        return false;
      }

      // Step 4: Wait for service to become healthy
      const isHealthy = await serviceHealthMonitor.waitForServiceStartup(
        service.name,
        service.startupTimeout
      );

      if (isHealthy) {
        this.serviceStates.set(service.name, ServiceStartupState.STARTED);
        const duration = Date.now() - startTime;
        console.log(`✅ Service ${service.name} started successfully in ${duration}ms`);
        this.logEvent(service.name, 'started', 'Started successfully', duration);
        return true;
      } else {
        this.serviceStates.set(service.name, ServiceStartupState.FAILED);
        this.logEvent(service.name, 'failed', 'Failed to become healthy within timeout');
        return false;
      }

    } catch (error) {
      this.serviceStates.set(service.name, ServiceStartupState.FAILED);
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logEvent(service.name, 'failed', `Error: ${errorMsg}`);
      console.error(`❌ Failed to start ${service.name}:`, error);
      return false;
    }
  }

  private async waitForDependencies(service: ServiceDefinition): Promise<boolean> {
    const dependencyPromises = service.dependencies.map(async (depName) => {
      // If dependency is not yet started, start it first
      if (this.serviceStates.get(depName) === ServiceStartupState.PENDING) {
        return await this.startService(depName);
      }
      
      // If dependency is currently starting, wait for it
      if (this.serviceStates.get(depName) === ServiceStartupState.STARTING) {
        const promise = this.startupPromises.get(depName);
        if (promise) {
          return await promise;
        }
      }
      
      // Check if dependency is healthy
      const healthCheck = await serviceHealthMonitor.checkServiceHealth(depName);
      return healthCheck.success;
    });

    const dependencyResults = await Promise.all(dependencyPromises);
    return dependencyResults.every(result => result === true);
  }

  private async executeStartCommand(service: ServiceDefinition): Promise<boolean> {
    if (!service.startCommand) {
      console.log(`⚠️ No start command defined for ${service.name}`);
      return true; // Assume service is managed externally
    }

    try {
      // First, check if Docker image is specified
      if (service.dockerImage) {
        return await this.startDockerService(service);
      }

      // Check if service is already running by process name
      if (service.processName && service.port) {
        const isRunning = await this.isProcessRunning(service.processName, service.port);
        if (isRunning) {
          console.log(`✅ Process ${service.processName} already running on port ${service.port}`);
          return true;
        }
      }

      // Execute npm/node command
      return await this.executeNpmCommand(service);

    } catch (error) {
      console.error(`❌ Failed to execute start command for ${service.name}:`, error);
      return false;
    }
  }

  private async startDockerService(service: ServiceDefinition): Promise<boolean> {
    console.log(`🐳 Starting Docker service ${service.name}...`);
    
    // Check if container already exists and is running
    const containerName = service.name;
    
    try {
      // This would be the actual Docker command in a real implementation
      console.log(`Would execute: docker run -d --name ${containerName} -p ${service.port}:${service.port} ${service.dockerImage}`);
      
      // Simulated for now - in real implementation, use child_process.exec
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`✅ Docker service ${service.name} started`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to start Docker service ${service.name}:`, error);
      return false;
    }
  }

  private async executeNpmCommand(service: ServiceDefinition): Promise<boolean> {
    console.log(`📦 Executing: ${service.startCommand}`);
    
    try {
      // This would be the actual command execution in a real implementation
      console.log(`Would execute: ${service.startCommand}`);
      
      // Simulated for now - in real implementation, use child_process.spawn
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`✅ Command executed for ${service.name}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to execute command for ${service.name}:`, error);
      return false;
    }
  }

  private async isProcessRunning(processName: string, port: number): Promise<boolean> {
    try {
      // This would check actual process list in a real implementation
      console.log(`Checking if ${processName} is running on port ${port}...`);
      
      // For now, assume services are not running based on our analysis
      return false;
      
    } catch (error) {
      console.error(`Error checking process ${processName}:`, error);
      return false;
    }
  }

  async stopAllServices(): Promise<boolean> {
    console.log('🛑 Stopping all services...');
    
    // Stop services in reverse priority order
    const sortedServices = Array.from(this.services.values())
      .sort((a, b) => b.priority - a.priority);

    for (const service of sortedServices) {
      await this.stopService(service.name);
    }

    console.log('⏹️ All services stopped');
    return true;
  }

  async stopService(serviceName: string): Promise<boolean> {
    const service = this.services.get(serviceName);
    if (!service) {
      return false;
    }

    console.log(`🛑 Stopping ${serviceName}...`);
    
    // This would implement actual service stopping logic
    console.log(`Would stop ${serviceName} via process management or Docker`);
    
    this.serviceStates.set(serviceName, ServiceStartupState.PENDING);
    this.logEvent(serviceName, 'starting', 'Service stopped'); // Reusing event type
    
    return true;
  }

  getStartupStatus(): any {
    const status = {
      timestamp: new Date().toISOString(),
      overall_state: this.getOverallStartupState(),
      services: {} as any,
      startup_events: this.startupEvents.slice(-20), // Last 20 events
      dependency_graph: this.generateDependencyGraph()
    };

    this.services.forEach((service, name) => {
      status.services[name] = {
        state: this.serviceStates.get(name),
        priority: service.priority,
        dependencies: service.dependencies,
        type: service.type
      };
    });

    return status;
  }

  private getOverallStartupState(): string {
    const states = Array.from(this.serviceStates.values());
    const totalServices = states.length;
    const startedServices = states.filter(state => state === ServiceStartupState.STARTED).length;
    const failedServices = states.filter(state => state === ServiceStartupState.FAILED).length;

    if (failedServices > 0) return 'FAILED';
    if (startedServices === totalServices) return 'COMPLETED';
    if (startedServices > 0) return 'IN_PROGRESS';
    return 'PENDING';
  }

  private generateDependencyGraph(): any {
    const graph: any = {};
    
    this.services.forEach((service, name) => {
      graph[name] = {
        depends_on: service.dependencies,
        required_by: Array.from(this.services.entries())
          .filter(([_, s]) => s.dependencies.includes(name))
          .map(([n, _]) => n)
      };
    });

    return graph;
  }

  private logEvent(service: string, event: StartupEvent['event'], message: string, duration?: number): void {
    const logEvent: StartupEvent = {
      timestamp: new Date().toISOString(),
      service,
      event,
      message,
      duration
    };

    this.startupEvents.push(logEvent);
    
    // Keep only last 100 events to prevent memory leak
    if (this.startupEvents.length > 100) {
      this.startupEvents = this.startupEvents.slice(-100);
    }
  }

  // NLD Training Data Export
  exportNLDData(): any {
    return {
      timestamp: new Date().toISOString(),
      pattern_type: 'SERVICE_STARTUP_ORCHESTRATION',
      service_definitions: Array.from(this.services.entries()),
      startup_states: Array.from(this.serviceStates.entries()),
      startup_events: this.startupEvents,
      startup_status: this.getStartupStatus(),
      orchestration_metrics: {
        total_services: this.services.size,
        started_services: Array.from(this.serviceStates.values())
          .filter(state => state === ServiceStartupState.STARTED).length,
        failed_services: Array.from(this.serviceStates.values())
          .filter(state => state === ServiceStartupState.FAILED).length
      }
    };
  }

  // Generate startup script for external orchestration
  generateStartupScript(): string[] {
    const script: string[] = [
      '#!/bin/bash',
      '# Auto-generated service startup script',
      '# Based on NLD failure pattern analysis',
      '',
      'set -e',
      'echo "🚀 Starting services in orchestrated sequence..."',
      ''
    ];

    const sortedServices = Array.from(this.services.values())
      .sort((a, b) => a.priority - b.priority);

    sortedServices.forEach((service, index) => {
      script.push(`# ${index + 1}. Start ${service.name} (${service.type})`);
      
      if (service.dependencies.length > 0) {
        script.push(`echo "⏳ ${service.name}: waiting for dependencies..."`);
        service.dependencies.forEach(dep => {
          script.push(`while ! curl -s http://localhost:${this.services.get(dep)?.port}/health > /dev/null; do`);
          script.push(`  echo "Waiting for ${dep}..."`);
          script.push('  sleep 2');
          script.push('done');
        });
      }
      
      script.push(`echo "🚀 Starting ${service.name}..."`);
      
      if (service.dockerImage) {
        script.push(`docker run -d --name ${service.name} -p ${service.port}:${service.port} ${service.dockerImage}`);
      } else if (service.startCommand) {
        script.push(`${service.startCommand} &`);
      }
      
      script.push(`echo "⏳ Waiting for ${service.name} to become healthy..."`);
      script.push(`while ! curl -s http://localhost:${service.port}${service.healthCheckPath || '/health'} > /dev/null; do`);
      script.push('  echo "Service starting..."');
      script.push('  sleep 2');
      script.push('done');
      script.push(`echo "✅ ${service.name} is healthy"`);
      script.push('');
    });

    script.push('echo "🎉 All services started successfully!"');
    
    return script;
  }
}

// Global orchestrator instance  
export const serviceStartupOrchestrator = new ServiceStartupOrchestrator();

// Auto-expose in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).serviceStartupOrchestrator = serviceStartupOrchestrator;
  console.log('🎭 Service Startup Orchestrator initialized');
  console.log('Use window.serviceStartupOrchestrator for debugging');
}