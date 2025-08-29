import { Page } from '@playwright/test';

export interface SystemResourceReport {
  memoryUsage: number;
  cpuUsage: number;
  networkUsage: number;
  diskUsage: number;
  
  // Detailed metrics
  memoryMetrics: SystemMemoryMetrics;
  cpuMetrics: SystemCPUMetrics;
  networkMetrics: SystemNetworkMetrics;
  diskMetrics: SystemDiskMetrics;
  
  // Resource pressure indicators
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
  cpuPressure: 'low' | 'medium' | 'high' | 'critical';
  systemStability: boolean;
  
  // Timeline data
  resourceTimeline: SystemResourceSnapshot[];
}

export interface SystemResourceSnapshot {
  timestamp: number;
  memory: number;
  cpu: number;
  network: number;
  disk: number;
  processCount: number;
  connectionCount: number;
}

export interface SystemMemoryMetrics {
  totalMemory: number;
  usedMemory: number;
  freeMemory: number;
  bufferMemory: number;
  cacheMemory: number;
  swapUsage: number;
  memoryLeaks: number;
  gcPressure: number;
}

export interface SystemCPUMetrics {
  totalCores: number;
  averageLoad: number;
  peakLoad: number;
  systemTime: number;
  userTime: number;
  idleTime: number;
  iowaitTime: number;
}

export interface SystemNetworkMetrics {
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  connectionCount: number;
  errorCount: number;
  bandwidth: number;
}

export interface SystemDiskMetrics {
  totalSpace: number;
  usedSpace: number;
  freeSpace: number;
  readOperations: number;
  writeOperations: number;
  readBytes: number;
  writtenBytes: number;
}

export class SystemResourceMonitor {
  private page: Page;
  private monitoring: boolean = false;
  private startTime: number = 0;
  private snapshots: SystemResourceSnapshot[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  async startMonitoring(): Promise<void> {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.startTime = Date.now();
    this.snapshots = [];

    // Inject system monitoring scripts
    await this.injectSystemMonitoringScript();
    
    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.collectSnapshot();
    }, 1000); // Every 1 second
  }

  async stopMonitoring(): Promise<void> {
    if (!this.monitoring) return;
    
    this.monitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    // Clean up monitoring scripts
    await this.cleanupSystemMonitoring();
  }

  async getReport(): Promise<SystemResourceReport> {
    const systemMetrics = await this.collectSystemMetrics();
    const analysis = this.analyzeResourceUsage();
    
    return {
      memoryUsage: analysis.memory.current,
      cpuUsage: analysis.cpu.current,
      networkUsage: analysis.network.current,
      diskUsage: analysis.disk.current,
      
      memoryMetrics: systemMetrics.memory,
      cpuMetrics: systemMetrics.cpu,
      networkMetrics: systemMetrics.network,
      diskMetrics: systemMetrics.disk,
      
      memoryPressure: analysis.memory.pressure,
      cpuPressure: analysis.cpu.pressure,
      systemStability: analysis.stability,
      
      resourceTimeline: this.snapshots
    };
  }

  async getMemoryMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      const monitor = (window as any).__systemResourceMonitor;
      if (!monitor) return {};
      
      const latest = monitor.memoryHistory[monitor.memoryHistory.length - 1];
      if (!latest) return {};
      
      return {
        peakUsage: Math.max(...monitor.memoryHistory.map((m: any) => m.used)),
        leaks: monitor.memoryLeaks || 0,
        gcPressure: monitor.gcPressure || 0,
        fragmentation: latest.fragmentation || 0
      };
    });
  }

  async getContentionReport(): Promise<any> {
    return await this.page.evaluate(() => {
      const monitor = (window as any).__systemResourceMonitor;
      if (!monitor) return {};
      
      return {
        portConflicts: monitor.portConflicts || 0,
        fileSystemConflicts: monitor.fileSystemConflicts || 0,
        processIdConflicts: monitor.processIdConflicts || 0,
        systemOverload: monitor.systemOverload || false,
        memoryExhaustion: monitor.memoryExhaustion || false,
        memoryFragmentation: monitor.memoryFragmentation || 0,
        swapUsage: monitor.swapUsage || 0
      };
    });
  }

  private async injectSystemMonitoringScript(): Promise<void> {
    await this.page.addInitScript(() => {
      (window as any).__systemResourceMonitor = {
        memoryHistory: [],
        cpuHistory: [],
        networkHistory: [],
        diskHistory: [],
        
        // Resource pressure indicators
        memoryLeaks: 0,
        gcPressure: 0,
        systemOverload: false,
        memoryExhaustion: false,
        
        // Contention tracking
        portConflicts: 0,
        fileSystemConflicts: 0,
        processIdConflicts: 0,
        memoryFragmentation: 0,
        swapUsage: 0,
        
        config: {
          maxHistoryLength: 1000,
          samplingInterval: 1000,
          memoryThreshold: 500 * 1024 * 1024, // 500MB
          cpuThreshold: 80 // 80%
        },
        
        // Memory monitoring
        trackMemory: function() {
          const monitor = (window as any).__systemResourceMonitor;
          
          if ((window as any).performance.memory) {
            const memInfo = (window as any).performance.memory;
            const timestamp = Date.now();
            
            const memorySnapshot = {
              timestamp,
              used: memInfo.usedJSHeapSize,
              total: memInfo.totalJSHeapSize,
              limit: memInfo.jsHeapSizeLimit,
              fragmentation: monitor.calculateFragmentation(memInfo)
            };
            
            monitor.memoryHistory.push(memorySnapshot);
            
            // Limit history size
            if (monitor.memoryHistory.length > monitor.config.maxHistoryLength) {
              monitor.memoryHistory = monitor.memoryHistory.slice(-monitor.config.maxHistoryLength / 2);
            }
            
            // Check for memory pressure
            if (memorySnapshot.used > monitor.config.memoryThreshold) {
              monitor.memoryExhaustion = true;
            }
            
            // Detect memory leaks
            monitor.detectMemoryLeaks();
            
            // Track GC pressure
            monitor.trackGCPressure(memorySnapshot);
          }
        },
        
        // CPU monitoring (approximation through timing)
        trackCPU: function() {
          const monitor = (window as any).__systemResourceMonitor;
          const start = performance.now();
          
          // Use requestIdleCallback to estimate CPU usage
          requestIdleCallback((deadline) => {
            const end = performance.now();
            const cpuTime = end - start;
            const idleTime = deadline.timeRemaining();
            
            // Rough CPU usage estimation
            const estimatedCPU = Math.min(100, Math.max(0, 100 - (idleTime / 16.67) * 100));
            
            const cpuSnapshot = {
              timestamp: Date.now(),
              usage: estimatedCPU,
              taskTime: cpuTime,
              idleTime: idleTime
            };
            
            monitor.cpuHistory.push(cpuSnapshot);
            
            if (monitor.cpuHistory.length > monitor.config.maxHistoryLength) {
              monitor.cpuHistory = monitor.cpuHistory.slice(-monitor.config.maxHistoryLength / 2);
            }
            
            // Check for CPU pressure
            if (estimatedCPU > monitor.config.cpuThreshold) {
              monitor.systemOverload = true;
            }
          });
        },
        
        // Network monitoring
        trackNetwork: function() {
          const monitor = (window as any).__systemResourceMonitor;
          
          // Track active connections (approximation)
          const connectionCount = monitor.getConnectionCount();
          
          const networkSnapshot = {
            timestamp: Date.now(),
            connections: connectionCount,
            requests: monitor.networkRequests || 0,
            errors: monitor.networkErrors || 0
          };
          
          monitor.networkHistory.push(networkSnapshot);
          
          if (monitor.networkHistory.length > monitor.config.maxHistoryLength) {
            monitor.networkHistory = monitor.networkHistory.slice(-monitor.config.maxHistoryLength / 2);
          }
        },
        
        // Utility functions
        calculateFragmentation: function(memInfo: any) {
          // Simple fragmentation estimation
          if (memInfo.totalJSHeapSize === 0) return 0;
          return 1 - (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize);
        },
        
        detectMemoryLeaks: function() {
          const monitor = (window as any).__systemResourceMonitor;
          if (monitor.memoryHistory.length < 10) return;
          
          // Check for sustained growth
          const recent = monitor.memoryHistory.slice(-10);
          const growth = recent[recent.length - 1].used - recent[0].used;
          
          if (growth > 10 * 1024 * 1024) { // >10MB growth
            monitor.memoryLeaks++;
          }
        },
        
        trackGCPressure: function(currentSnapshot: any) {
          const monitor = (window as any).__systemResourceMonitor;
          if (monitor.memoryHistory.length < 2) return;
          
          const previous = monitor.memoryHistory[monitor.memoryHistory.length - 2];
          
          // GC detected if memory drops significantly
          if (previous.used - currentSnapshot.used > 5 * 1024 * 1024) {
            monitor.gcPressure++;
          }
        },
        
        getConnectionCount: function() {
          // Estimate active connections
          let connections = 0;
          
          // Count WebSocket connections
          if ((window as any).__activeWebSockets) {
            connections += (window as any).__activeWebSockets.length;
          }
          
          // Count EventSource connections
          if ((window as any).__activeEventSources) {
            connections += (window as any).__activeEventSources.length;
          }
          
          // Count active fetch requests (approximation)
          if ((window as any).__activeFetchRequests) {
            connections += (window as any).__activeFetchRequests.length;
          }
          
          return connections;
        },
        
        // Reset counters
        reset: function() {
          const monitor = (window as any).__systemResourceMonitor;
          monitor.memoryLeaks = 0;
          monitor.gcPressure = 0;
          monitor.systemOverload = false;
          monitor.memoryExhaustion = false;
          monitor.portConflicts = 0;
          monitor.fileSystemConflicts = 0;
          monitor.processIdConflicts = 0;
        }
      };

      // Hook into network requests to track activity
      const monitor = (window as any).__systemResourceMonitor;
      monitor.networkRequests = 0;
      monitor.networkErrors = 0;

      // Track fetch requests
      const originalFetch = window.fetch;
      window.fetch = async function(...args: any[]) {
        monitor.networkRequests++;
        
        try {
          const response = await originalFetch.apply(window, args);
          if (!response.ok) {
            monitor.networkErrors++;
          }
          return response;
        } catch (error) {
          monitor.networkErrors++;
          throw error;
        }
      };

      // Track WebSocket connections
      (window as any).__activeWebSockets = [];
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends WebSocket {
        constructor(...args: any[]) {
          super(...args);
          (window as any).__activeWebSockets.push(this);
          
          this.addEventListener('close', () => {
            const index = (window as any).__activeWebSockets.indexOf(this);
            if (index > -1) {
              (window as any).__activeWebSockets.splice(index, 1);
            }
          });
        }
      };

      // Track EventSource connections
      (window as any).__activeEventSources = [];
      const originalEventSource = window.EventSource;
      window.EventSource = class extends EventSource {
        constructor(...args: any[]) {
          super(...args);
          (window as any).__activeEventSources.push(this);
          
          this.addEventListener('error', () => {
            const index = (window as any).__activeEventSources.indexOf(this);
            if (index > -1) {
              (window as any).__activeEventSources.splice(index, 1);
            }
          });
        }
      };

      // Start periodic monitoring
      setInterval(() => {
        const monitor = (window as any).__systemResourceMonitor;
        monitor.trackMemory();
        monitor.trackCPU();
        monitor.trackNetwork();
      }, monitor.config.samplingInterval);
    });
  }

  private async collectSnapshot(): Promise<void> {
    if (!this.monitoring) return;
    
    const snapshot = await this.page.evaluate(() => {
      const monitor = (window as any).__systemResourceMonitor;
      if (!monitor) return null;
      
      const timestamp = Date.now();
      
      // Get latest metrics
      const latestMemory = monitor.memoryHistory.length > 0 ? 
        monitor.memoryHistory[monitor.memoryHistory.length - 1] : { used: 0 };
      const latestCPU = monitor.cpuHistory.length > 0 ? 
        monitor.cpuHistory[monitor.cpuHistory.length - 1] : { usage: 0 };
      const latestNetwork = monitor.networkHistory.length > 0 ? 
        monitor.networkHistory[monitor.networkHistory.length - 1] : { connections: 0 };
      
      return {
        timestamp,
        memory: latestMemory.used,
        cpu: latestCPU.usage,
        network: latestNetwork.connections,
        disk: 0, // Browser cannot measure disk usage
        processCount: 1, // Approximation
        connectionCount: latestNetwork.connections
      };
    });
    
    if (snapshot) {
      this.snapshots.push(snapshot);
      
      // Limit snapshots
      if (this.snapshots.length > 1000) {
        this.snapshots = this.snapshots.slice(-500);
      }
    }
  }

  private async collectSystemMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      const monitor = (window as any).__systemResourceMonitor;
      if (!monitor) return {};
      
      // Memory metrics
      const memoryData = monitor.memoryHistory;
      const memoryMetrics = memoryData.length > 0 ? {
        totalMemory: memoryData[memoryData.length - 1].limit,
        usedMemory: memoryData[memoryData.length - 1].used,
        freeMemory: memoryData[memoryData.length - 1].limit - memoryData[memoryData.length - 1].used,
        bufferMemory: 0, // Not available in browser
        cacheMemory: 0, // Not available in browser
        swapUsage: monitor.swapUsage,
        memoryLeaks: monitor.memoryLeaks,
        gcPressure: monitor.gcPressure
      } : {};
      
      // CPU metrics
      const cpuData = monitor.cpuHistory;
      const cpuMetrics = cpuData.length > 0 ? {
        totalCores: navigator.hardwareConcurrency || 1,
        averageLoad: cpuData.reduce((sum: number, sample: any) => sum + sample.usage, 0) / cpuData.length,
        peakLoad: Math.max(...cpuData.map((sample: any) => sample.usage)),
        systemTime: 0, // Not available in browser
        userTime: 0, // Not available in browser
        idleTime: cpuData.reduce((sum: number, sample: any) => sum + sample.idleTime, 0) / cpuData.length,
        iowaitTime: 0 // Not available in browser
      } : {};
      
      // Network metrics
      const networkData = monitor.networkHistory;
      const networkMetrics = networkData.length > 0 ? {
        bytesReceived: 0, // Not easily measurable in browser
        bytesSent: 0, // Not easily measurable in browser
        packetsReceived: 0, // Not available in browser
        packetsSent: 0, // Not available in browser
        connectionCount: networkData[networkData.length - 1].connections,
        errorCount: monitor.networkErrors,
        bandwidth: 0 // Not easily measurable in browser
      } : {};
      
      // Disk metrics (not available in browser)
      const diskMetrics = {
        totalSpace: 0,
        usedSpace: 0,
        freeSpace: 0,
        readOperations: 0,
        writeOperations: 0,
        readBytes: 0,
        writtenBytes: 0
      };
      
      return {
        memory: memoryMetrics,
        cpu: cpuMetrics,
        network: networkMetrics,
        disk: diskMetrics
      };
    });
  }

  private analyzeResourceUsage(): any {
    if (this.snapshots.length === 0) {
      return {
        memory: { current: 0, pressure: 'low' },
        cpu: { current: 0, pressure: 'low' },
        network: { current: 0, pressure: 'low' },
        disk: { current: 0, pressure: 'low' },
        stability: true
      };
    }
    
    const latest = this.snapshots[this.snapshots.length - 1];
    const memoryValues = this.snapshots.map(s => s.memory);
    const cpuValues = this.snapshots.map(s => s.cpu);
    
    return {
      memory: {
        current: latest.memory,
        pressure: this.calculatePressure(latest.memory, 500 * 1024 * 1024) // 500MB threshold
      },
      cpu: {
        current: latest.cpu,
        pressure: this.calculatePressure(latest.cpu, 80) // 80% threshold
      },
      network: {
        current: latest.network,
        pressure: this.calculatePressure(latest.connectionCount, 10) // 10 connections threshold
      },
      disk: {
        current: latest.disk,
        pressure: 'low' as const // Cannot measure in browser
      },
      stability: this.assessSystemStability()
    };
  }

  private calculatePressure(current: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = current / threshold;
    
    if (ratio < 0.5) return 'low';
    if (ratio < 0.7) return 'medium';
    if (ratio < 0.9) return 'high';
    return 'critical';
  }

  private assessSystemStability(): boolean {
    if (this.snapshots.length < 10) return true;
    
    // Check for stability indicators
    const recentSnapshots = this.snapshots.slice(-10);
    
    // Memory stability - no rapid growth
    const memoryGrowth = recentSnapshots[9].memory - recentSnapshots[0].memory;
    const memoryUnstable = memoryGrowth > 50 * 1024 * 1024; // >50MB growth in 10 seconds
    
    // CPU stability - not consistently high
    const avgCPU = recentSnapshots.reduce((sum, s) => sum + s.cpu, 0) / recentSnapshots.length;
    const cpuUnstable = avgCPU > 90; // >90% average CPU
    
    // Connection stability - not too many connections
    const maxConnections = Math.max(...recentSnapshots.map(s => s.connectionCount));
    const connectionUnstable = maxConnections > 20; // >20 connections
    
    return !memoryUnstable && !cpuUnstable && !connectionUnstable;
  }

  private async cleanupSystemMonitoring(): Promise<void> {
    await this.page.evaluate(() => {
      // Clean up monitoring data
      delete (window as any).__systemResourceMonitor;
      delete (window as any).__activeWebSockets;
      delete (window as any).__activeEventSources;
      delete (window as any).__activeFetchRequests;
    });
  }
}

export default SystemResourceMonitor;