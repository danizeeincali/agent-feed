import { Page } from '@playwright/test';

export interface StormConfiguration {
  type: 'button-spam' | 'output-flood' | 'sse-connection-storm' | 'keyboard-storm' | 
        'process-crash-storm' | 'memory-pressure' | 'network-interruption' | 'resize-storm';
  intensity: 'low' | 'medium' | 'high' | 'extreme';
  duration: number; // milliseconds
  [key: string]: any; // Additional configuration parameters
}

export interface StormMetrics {
  stormType: string;
  startTime: number;
  endTime: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageOperationTime: number;
  peakIntensity: number;
  resourceUsage: {
    maxMemory: number;
    maxCpu: number;
    maxNetwork: number;
  };
}

export class StormSimulator {
  private page: Page;
  private activeStorms: Set<string> = new Set();
  private stormMetrics: Map<string, StormMetrics> = new Map();

  constructor(page: Page) {
    this.page = page;
  }

  async startStorm(config: StormConfiguration): Promise<void> {
    const stormId = `${config.type}_${Date.now()}`;
    
    if (this.activeStorms.has(config.type)) {
      throw new Error(`Storm of type ${config.type} is already running`);
    }

    this.activeStorms.add(config.type);

    // Initialize metrics
    this.stormMetrics.set(stormId, {
      stormType: config.type,
      startTime: Date.now(),
      endTime: 0,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageOperationTime: 0,
      peakIntensity: 0,
      resourceUsage: {
        maxMemory: 0,
        maxCpu: 0,
        maxNetwork: 0
      }
    });

    // Inject storm simulation scripts
    await this.injectStormSimulationScript();

    // Start the specific storm type
    switch (config.type) {
      case 'button-spam':
        await this.simulateButtonSpamStorm(config, stormId);
        break;
      case 'output-flood':
        await this.simulateOutputFloodStorm(config, stormId);
        break;
      case 'sse-connection-storm':
        await this.simulateSSEConnectionStorm(config, stormId);
        break;
      case 'keyboard-storm':
        await this.simulateKeyboardStorm(config, stormId);
        break;
      case 'process-crash-storm':
        await this.simulateCrashStorm(config, stormId);
        break;
      case 'memory-pressure':
        await this.simulateMemoryPressureStorm(config, stormId);
        break;
      case 'network-interruption':
        await this.simulateNetworkInterruptionStorm(config, stormId);
        break;
      case 'resize-storm':
        await this.simulateResizeStorm(config, stormId);
        break;
      default:
        throw new Error(`Unknown storm type: ${config.type}`);
    }

    // Mark storm as complete
    const metrics = this.stormMetrics.get(stormId)!;
    metrics.endTime = Date.now();
    this.activeStorms.delete(config.type);
  }

  async getStormMetrics(): Promise<StormMetrics[]> {
    return Array.from(this.stormMetrics.values());
  }

  private async injectStormSimulationScript(): Promise<void> {
    await this.page.addInitScript(() => {
      (window as any).__stormSimulator = {
        metrics: {
          operations: 0,
          successes: 0,
          failures: 0,
          startTime: Date.now(),
          resourceUsage: []
        },
        
        recordOperation: (success: boolean, duration: number) => {
          const simulator = (window as any).__stormSimulator;
          simulator.metrics.operations++;
          if (success) {
            simulator.metrics.successes++;
          } else {
            simulator.metrics.failures++;
          }
        },

        recordResourceUsage: () => {
          const simulator = (window as any).__stormSimulator;
          if ((window as any).performance.memory) {
            simulator.metrics.resourceUsage.push({
              timestamp: Date.now(),
              memory: (window as any).performance.memory.usedJSHeapSize,
              // CPU usage approximation through timing
              cpu: (window as any).performance.now()
            });
          }
        }
      };

      // Start resource monitoring
      setInterval(() => {
        (window as any).__stormSimulator.recordResourceUsage();
      }, 500);
    });
  }

  private async simulateButtonSpamStorm(config: StormConfiguration, stormId: string): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + config.duration;
    const clickInterval = config.clickInterval || 50; // Default 50ms between clicks

    while (Date.now() < endTime) {
      const operationStart = Date.now();
      
      try {
        // Click the spawn button
        await this.page.click('[data-testid="spawn-claude-button"]', { 
          force: true, 
          timeout: 100 
        });
        
        await this.recordOperation(stormId, true, Date.now() - operationStart);
      } catch (error) {
        await this.recordOperation(stormId, false, Date.now() - operationStart);
      }

      await this.page.waitForTimeout(clickInterval);
    }
  }

  private async simulateOutputFloodStorm(config: StormConfiguration, stormId: string): Promise<void> {
    // This method should be called after a terminal process is already running
    await this.page.evaluate(async (config) => {
      const simulator = (window as any).__stormSimulator;
      const terminal = document.querySelector('[data-testid="terminal"]');
      
      if (!terminal) {
        throw new Error('Terminal not found for output flood simulation');
      }

      const startTime = Date.now();
      const endTime = startTime + config.duration;
      const messagesPerSecond = config.messagesPerSecond || 10;
      const messageLength = config.messageLength || 100;
      
      let messageCount = 0;

      const floodInterval = setInterval(() => {
        if (Date.now() >= endTime) {
          clearInterval(floodInterval);
          return;
        }

        // Generate flood message
        const message = 'FLOOD_MESSAGE_' + messageCount + '_' + 'X'.repeat(messageLength);
        messageCount++;

        // Simulate terminal output by dispatching events
        const event = new CustomEvent('terminalOutput', {
          detail: { data: message + '\n' }
        });
        
        terminal.dispatchEvent(event);
        simulator.recordOperation(true, Date.now() - startTime);
      }, 1000 / messagesPerSecond);

      // Wait for duration
      await new Promise(resolve => setTimeout(resolve, config.duration));
    }, config);
  }

  async simulateOutputFlood(config: StormConfiguration): Promise<void> {
    return this.simulateOutputFloodStorm(config, `flood_${Date.now()}`);
  }

  private async simulateSSEConnectionStorm(config: StormConfiguration, stormId: string): Promise<void> {
    await this.page.evaluate(async (config) => {
      const simulator = (window as any).__stormSimulator;
      const connections: EventSource[] = [];
      
      const startTime = Date.now();
      const endTime = startTime + config.duration;
      const connectionsPerSecond = config.connectionsPerSecond || 10;
      
      const connectionInterval = setInterval(() => {
        if (Date.now() >= endTime) {
          clearInterval(connectionInterval);
          // Cleanup connections
          connections.forEach(conn => conn.close());
          return;
        }

        try {
          // Create SSE connection
          const eventSource = new EventSource('/api/terminal/stream');
          connections.push(eventSource);
          
          eventSource.onopen = () => {
            simulator.recordOperation(true, Date.now() - startTime);
          };
          
          eventSource.onerror = () => {
            simulator.recordOperation(false, Date.now() - startTime);
          };

          // Limit active connections to prevent browser limits
          if (connections.length > 10) {
            const oldConnection = connections.shift();
            if (oldConnection) {
              oldConnection.close();
            }
          }
        } catch (error) {
          simulator.recordOperation(false, Date.now() - startTime);
        }
      }, 1000 / connectionsPerSecond);

      await new Promise(resolve => setTimeout(resolve, config.duration));
    }, config);
  }

  async simulateSSEStorm(config: StormConfiguration): Promise<void> {
    return this.simulateSSEConnectionStorm(config, `sse_${Date.now()}`);
  }

  private async simulateKeyboardStorm(config: StormConfiguration, stormId: string): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + config.duration;
    const keysPerSecond = config.keysPerSecond || 50;
    const keyInterval = 1000 / keysPerSecond;

    const keys = ['a', 'b', 'c', '1', '2', '3', 'Space', 'Enter', 'Tab', 'Backspace'];
    if (config.includeSpecialKeys) {
      keys.push('Control+C', 'Control+V', 'Alt+Tab', 'Escape');
    }
    if (config.includeUnicode) {
      keys.push('ñ', 'é', '中', '🚀');
    }

    while (Date.now() < endTime) {
      const operationStart = Date.now();
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      
      try {
        await this.page.keyboard.press(randomKey, { delay: 10 });
        await this.recordOperation(stormId, true, Date.now() - operationStart);
      } catch (error) {
        await this.recordOperation(stormId, false, Date.now() - operationStart);
      }

      await this.page.waitForTimeout(keyInterval);
    }
  }

  async simulateInputStorm(config: StormConfiguration): Promise<void> {
    return this.simulateKeyboardStorm(config, `input_${Date.now()}`);
  }

  private async simulateCrashStorm(config: StormConfiguration, stormId: string): Promise<void> {
    const processCount = config.processCount || 5;
    const crashInterval = config.crashInterval || 1000;
    
    for (let i = 0; i < processCount; i++) {
      const operationStart = Date.now();
      
      try {
        // Start process
        await this.page.click('[data-testid="spawn-claude-button"]');
        await this.page.waitForTimeout(500); // Wait for process to start
        
        // Simulate crash
        await this.page.evaluate(() => {
          // Send crash signal to process
          if ((window as any).__currentProcess) {
            (window as any).__currentProcess.kill('SIGKILL');
          }
        });
        
        await this.recordOperation(stormId, true, Date.now() - operationStart);
      } catch (error) {
        await this.recordOperation(stormId, false, Date.now() - operationStart);
      }

      await this.page.waitForTimeout(crashInterval);
    }
  }

  async simulateCrashStorm(config: StormConfiguration): Promise<void> {
    return this.simulateCrashStorm(config, `crash_${Date.now()}`);
  }

  private async simulateMemoryPressureStorm(config: StormConfiguration, stormId: string): Promise<void> {
    await this.page.evaluate(async (config) => {
      const simulator = (window as any).__stormSimulator;
      const targetMemoryMB = config.targetMemoryMB || 500;
      const allocationRate = config.allocationRate || 10; // MB per second
      
      const allocations: any[] = [];
      const startTime = Date.now();
      const endTime = startTime + config.duration;
      
      const allocationInterval = setInterval(() => {
        if (Date.now() >= endTime) {
          clearInterval(allocationInterval);
          // Cleanup allocations
          allocations.length = 0;
          return;
        }

        try {
          // Allocate memory chunks
          const chunkSize = allocationRate * 1024 * 1024; // Convert MB to bytes
          const chunk = new ArrayBuffer(chunkSize);
          allocations.push(chunk);
          
          simulator.recordOperation(true, Date.now() - startTime);
          
          // Simulate fragmentation if requested
          if (config.includeFragmentation && allocations.length > 5) {
            // Remove random chunks to fragment memory
            const randomIndex = Math.floor(Math.random() * allocations.length);
            allocations.splice(randomIndex, 1);
          }
          
          // Check if we've reached target memory usage
          const currentUsage = (window as any).performance.memory?.usedJSHeapSize || 0;
          if (currentUsage > targetMemoryMB * 1024 * 1024) {
            clearInterval(allocationInterval);
          }
        } catch (error) {
          simulator.recordOperation(false, Date.now() - startTime);
        }
      }, 1000);

      await new Promise(resolve => setTimeout(resolve, config.duration));
    }, config);
  }

  async simulateMemoryStorm(config: StormConfiguration): Promise<void> {
    return this.simulateMemoryPressureStorm(config, `memory_${Date.now()}`);
  }

  private async simulateNetworkInterruptionStorm(config: StormConfiguration, stormId: string): Promise<void> {
    const interruptionsPerMinute = config.interruptionsPerMinute || 10;
    const interruptionInterval = 60000 / interruptionsPerMinute; // Convert to milliseconds
    const startTime = Date.now();
    const endTime = startTime + config.duration;

    while (Date.now() < endTime) {
      const operationStart = Date.now();
      
      try {
        // Simulate network interruption
        await this.page.setOfflineMode(true);
        await this.page.waitForTimeout(500); // Interruption duration
        
        if (config.includeTimeouts) {
          // Wait longer to simulate timeout
          await this.page.waitForTimeout(2000);
        }
        
        await this.page.setOfflineMode(false);
        await this.page.waitForTimeout(1000); // Recovery time
        
        await this.recordOperation(stormId, true, Date.now() - operationStart);
      } catch (error) {
        await this.recordOperation(stormId, false, Date.now() - operationStart);
      }

      await this.page.waitForTimeout(interruptionInterval);
    }
  }

  async simulateNetworkStorm(config: StormConfiguration): Promise<void> {
    return this.simulateNetworkInterruptionStorm(config, `network_${Date.now()}`);
  }

  private async simulateResizeStorm(config: StormConfiguration, stormId: string): Promise<void> {
    const resizesPerSecond = config.resizesPerSecond || 5;
    const resizeInterval = 1000 / resizesPerSecond;
    const startTime = Date.now();
    const endTime = startTime + config.duration;
    
    const minWidth = config.minWidth || 400;
    const maxWidth = config.maxWidth || 1600;
    const minHeight = config.minHeight || 300;
    const maxHeight = config.maxHeight || 1200;

    while (Date.now() < endTime) {
      const operationStart = Date.now();
      
      try {
        // Generate random size within bounds
        const width = Math.floor(Math.random() * (maxWidth - minWidth)) + minWidth;
        const height = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
        
        await this.page.setViewportSize({ width, height });
        await this.recordOperation(stormId, true, Date.now() - operationStart);
      } catch (error) {
        await this.recordOperation(stormId, false, Date.now() - operationStart);
      }

      await this.page.waitForTimeout(resizeInterval);
    }
  }

  async simulateResizeStorm(config: StormConfiguration): Promise<void> {
    return this.simulateResizeStorm(config, `resize_${Date.now()}`);
  }

  // Utility methods for getting specific storm metrics
  async getInputStormMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      const simulator = (window as any).__stormSimulator;
      return {
        attemptedInputs: simulator?.metrics.operations || 0,
        processedInputs: simulator?.metrics.successes || 0,
        droppedInputs: simulator?.metrics.failures || 0
      };
    });
  }

  async getSSEStormMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      // Count active SSE connections
      const connections = (window as any).__activeSSEConnections || [];
      return {
        activeConnections: connections.length,
        rejectedConnections: (window as any).__rejectedSSEConnections || 0,
        connectionLeaks: (window as any).__sseConnectionLeaks || 0
      };
    });
  }

  async getCrashStormMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      const crashMetrics = (window as any).__crashStormMetrics || {};
      return {
        processesStarted: crashMetrics.started || 0,
        processesCrashed: crashMetrics.crashed || 0,
        orphanedProcesses: crashMetrics.orphaned || 0
      };
    });
  }

  async getNetworkStormMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      const networkMetrics = (window as any).__networkStormMetrics || {};
      return {
        successfulReconnections: networkMetrics.reconnections || 0,
        permanentFailures: networkMetrics.failures || 0
      };
    });
  }

  async getResizeStormMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      const resizeMetrics = (window as any).__resizeStormMetrics || {};
      return {
        resizeEvents: resizeMetrics.events || 0,
        terminalReflows: resizeMetrics.reflows || 0
      };
    });
  }

  private async recordOperation(stormId: string, success: boolean, duration: number): Promise<void> {
    const metrics = this.stormMetrics.get(stormId);
    if (!metrics) return;

    metrics.totalOperations++;
    if (success) {
      metrics.successfulOperations++;
    } else {
      metrics.failedOperations++;
    }

    // Update average operation time
    metrics.averageOperationTime = (metrics.averageOperationTime * (metrics.totalOperations - 1) + duration) / metrics.totalOperations;

    // Record in page context as well
    await this.page.evaluate((data) => {
      const simulator = (window as any).__stormSimulator;
      if (simulator) {
        simulator.recordOperation(data.success, data.duration);
      }
    }, { success, duration });
  }
}

export default StormSimulator;