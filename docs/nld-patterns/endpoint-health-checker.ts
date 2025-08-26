/**
 * Endpoint Health Checker
 * Real-time monitoring of API endpoint availability
 */

interface EndpointHealth {
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number;
  lastChecked: Date;
  errorCount: number;
  errorMessage?: string;
}

class EndpointHealthChecker {
  private endpoints: string[] = [];
  private healthStatus: Map<string, EndpointHealth> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private callbacks: Array<(health: EndpointHealth[]) => void> = [];

  constructor(endpoints: string[], checkIntervalMs: number = 30000) {
    this.endpoints = endpoints;
    this.startHealthChecking(checkIntervalMs);
  }

  private startHealthChecking(intervalMs: number): void {
    this.checkInterval = setInterval(() => {
      this.checkAllEndpoints();
    }, intervalMs);

    // Initial check
    this.checkAllEndpoints();
  }

  private async checkAllEndpoints(): Promise<void> {
    const promises = this.endpoints.map(endpoint => this.checkEndpoint(endpoint));
    await Promise.all(promises);
    
    // Notify callbacks
    this.callbacks.forEach(callback => {
      callback(Array.from(this.healthStatus.values()));
    });
  }

  private async checkEndpoint(endpoint: string): Promise<void> {
    const startTime = Date.now();
    let status: 'healthy' | 'unhealthy' = 'unhealthy';
    let errorMessage: string | undefined;
    let errorCount = this.healthStatus.get(endpoint)?.errorCount || 0;

    try {
      const response = await fetch(endpoint, {
        method: 'HEAD', // Use HEAD to avoid large response bodies
        timeout: 5000
      });

      if (response.ok) {
        status = 'healthy';
        errorCount = 0; // Reset error count on success
      } else {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        errorCount++;
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorCount++;
    }

    const responseTime = Date.now() - startTime;

    this.healthStatus.set(endpoint, {
      endpoint,
      status,
      responseTime,
      lastChecked: new Date(),
      errorCount,
      errorMessage
    });
  }

  public getEndpointHealth(endpoint: string): EndpointHealth | null {
    return this.healthStatus.get(endpoint) || null;
  }

  public getAllHealth(): EndpointHealth[] {
    return Array.from(this.healthStatus.values());
  }

  public getUnhealthyEndpoints(): EndpointHealth[] {
    return this.getAllHealth().filter(h => h.status === 'unhealthy');
  }

  public onHealthChange(callback: (health: EndpointHealth[]) => void): void {
    this.callbacks.push(callback);
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  public generateReport(): string {
    const health = this.getAllHealth();
    const healthy = health.filter(h => h.status === 'healthy').length;
    const unhealthy = health.filter(h => h.status === 'unhealthy').length;
    const unknown = health.filter(h => h.status === 'unknown').length;

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: health.length,
        healthy,
        unhealthy,
        unknown,
        healthPercentage: health.length > 0 ? (healthy / health.length) * 100 : 0
      },
      endpoints: health,
      criticalIssues: health.filter(h => h.status === 'unhealthy' && h.errorCount > 5)
    }, null, 2);
  }
}

export { EndpointHealthChecker, EndpointHealth };