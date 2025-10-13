/**
 * MonitoringApiService - Phase 5 Monitoring API Wrapper
 *
 * Production-ready service for monitoring endpoints with:
 * - Full TypeScript type safety
 * - Retry logic (3 attempts, exponential backoff)
 * - Request caching (5-30 second TTL)
 * - Abort controller for cleanup
 * - Comprehensive error handling
 * - Loading state tracking
 */

// ==================== TYPE DEFINITIONS ====================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  version: string;
  components: {
    database: ComponentHealth;
    monitoring: ComponentHealth;
    alerting: ComponentHealth;
    workers: ComponentHealth;
  };
  metrics?: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastCheck?: number;
}

export interface SystemMetrics {
  timestamp: number;
  system: {
    cpu: CpuMetrics;
    memory: MemoryMetrics;
    disk: DiskMetrics;
    network?: NetworkMetrics;
  };
  process: {
    cpu: number;
    memory: number;
    uptime: number;
    pid: number;
  };
  application: {
    requests: RequestMetrics;
    errors: ErrorMetrics;
    cache: CacheMetrics;
    queue: QueueMetrics;
  };
}

export interface CpuMetrics {
  usage: number;
  loadAverage: number[];
  cores: number;
  model?: string;
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  usagePercent: number;
  heapUsed?: number;
  heapTotal?: number;
}

export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  usagePercent: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn?: number;
  packetsOut?: number;
}

export interface RequestMetrics {
  total: number;
  rate: number;
  averageResponseTime: number;
  activeRequests: number;
  statusCodes: Record<string, number>;
}

export interface ErrorMetrics {
  total: number;
  rate: number;
  byType: Record<string, number>;
  recent: RecentError[];
}

export interface RecentError {
  timestamp: number;
  type: string;
  message: string;
  count: number;
}

export interface CacheMetrics {
  size: number;
  hitRate: number;
  missRate: number;
  evictions: number;
}

export interface QueueMetrics {
  depth: number;
  processing: number;
  completed: number;
  failed: number;
  averageProcessingTime: number;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  triggeredAt: number;
  acknowledged: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolvedAt?: number;
  metadata: {
    metric: string;
    threshold: number;
    value: number;
    condition: string;
  };
  actions: string[];
}

export interface AlertsResponse {
  alerts: Alert[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    total: number;
    active: number;
    bySeverity: Record<string, number>;
  };
}

export interface AlertHistoryResponse {
  alerts: Alert[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HistoricalStats {
  dataPoints: number;
  timeRange: {
    start: number;
    end: number;
    duration: number;
  };
  cpuHistory: MetricDataPoint[];
  memoryHistory: MetricDataPoint[];
  diskHistory: MetricDataPoint[];
  requestHistory: MetricDataPoint[];
  errorHistory: MetricDataPoint[];
  trends: {
    cpu: TrendAnalysis;
    memory: TrendAnalysis;
    disk: TrendAnalysis;
    requests: TrendAnalysis;
    errors: TrendAnalysis;
  };
}

export interface MetricDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  average: number;
  min: number;
  max: number;
  stdDev?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  metric: string;
  condition: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  threshold: number;
  duration?: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  actions: string[];
  cooldown?: number;
  tags?: string[];
}

export interface AlertRulesResponse {
  rules: AlertRule[];
  total: number;
}

export interface AcknowledgeAlertRequest {
  acknowledgedBy: string;
}

export interface AcknowledgeAlertResponse {
  success: boolean;
  alert: Alert;
}

// ==================== API SERVICE CLASS ====================

class MonitoringApiService {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  // Configuration
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second
  private readonly maxDelay = 5000; // 5 seconds
  private readonly defaultTimeout = 8000; // 8 seconds

  constructor(baseUrl?: string) {
    // Use relative URL to leverage Vite proxy
    this.baseUrl = baseUrl || '/api/monitoring';
    console.log('🔍 MonitoringApiService initialized with base URL:', this.baseUrl);
  }

  // ==================== CACHE MANAGEMENT ====================

  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return `${endpoint}${paramString}`;
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  public clearCache(pattern?: string): void {
    if (pattern) {
      const keys = Array.from(this.cache.keys());
      for (const key of keys) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // ==================== REQUEST HANDLER ====================

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = false,
    cacheTtl: number = 5000
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const cacheKey = this.getCacheKey(endpoint, options.method === 'GET' ? options : undefined);

    // Check cache for GET requests
    if (useCache && (!options.method || options.method === 'GET')) {
      const cachedData = this.getCachedData<T>(cacheKey);
      if (cachedData) {
        console.log('📦 Cache hit for:', endpoint);
        return cachedData;
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const controllerId = `${endpoint}-${Date.now()}`;
      this.abortControllers.set(controllerId, controller);

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.defaultTimeout);

      const config: RequestInit = {
        ...options,
        signal: controller.signal,
      };

      // Set headers for requests with body
      if (options.body || (!options.method || ['POST', 'PUT', 'PATCH'].includes(options.method))) {
        config.headers = {
          'Content-Type': 'application/json',
          ...options.headers,
        };
      } else if (options.headers) {
        config.headers = options.headers;
      }

      try {
        const response = await fetch(url, config);

        // Clear timeout and controller
        clearTimeout(timeoutId);
        this.abortControllers.delete(controllerId);

        if (!response.ok) {
          const errorMessage = await this.getErrorMessage(response, endpoint);
          throw new Error(`HTTP ${response.status}: ${errorMessage}`);
        }

        const data = await response.json();

        // Cache successful GET requests
        if (useCache && (!options.method || options.method === 'GET')) {
          this.setCachedData(cacheKey, data, cacheTtl);
        }

        return data;
      } catch (error) {
        // Clear timeout and controller
        clearTimeout(timeoutId);
        this.abortControllers.delete(controllerId);

        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Handle different error types
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            lastError = new Error(`Request timeout after ${this.defaultTimeout}ms for ${endpoint}`);
          } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            lastError = new Error(`Network error for ${endpoint}: Connection failed`);
          }
        }

        // Don't retry on certain conditions
        if (this.shouldNotRetry(lastError, attempt)) {
          break;
        }

        // Wait before retry with exponential backoff
        if (attempt < this.maxRetries) {
          const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
          console.warn(`⚠️ Retry ${attempt + 1}/${this.maxRetries} for ${endpoint} in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    // All retries exhausted
    console.error(`❌ Request failed after ${this.maxRetries + 1} attempts: ${endpoint}`, lastError);
    throw lastError;
  }

  private async getErrorMessage(response: Response, endpoint: string): Promise<string> {
    try {
      const errorData = await response.text();
      try {
        const parsedError = JSON.parse(errorData);
        return parsedError.message || parsedError.error || `Request failed for ${endpoint}`;
      } catch {
        return errorData || `HTTP ${response.status} error for ${endpoint}`;
      }
    } catch {
      return `HTTP ${response.status} error for ${endpoint}`;
    }
  }

  private shouldNotRetry(error: Error, attempt: number): boolean {
    // Don't retry if we've exhausted all attempts
    if (attempt >= this.maxRetries) {
      return true;
    }

    // Don't retry on client errors (4xx) except for 408 (timeout) and 429 (rate limit)
    if (error.message.includes('HTTP 4') &&
        !error.message.includes('HTTP 408') &&
        !error.message.includes('HTTP 429')) {
      return true;
    }

    // Don't retry on specific error types
    if (error.message.includes('JSON') ||
        error.message.includes('syntax') ||
        error.message.includes('parse')) {
      return true;
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== PUBLIC API METHODS ====================

  /**
   * GET /api/monitoring/health
   * Get detailed system health status
   *
   * @param useCache - Whether to use cached data (default: true)
   * @returns Health status with component details
   */
  async getHealth(useCache: boolean = true): Promise<HealthStatus> {
    return this.request<HealthStatus>(
      '/health',
      { method: 'GET' },
      useCache,
      5000 // 5 second cache
    );
  }

  /**
   * GET /api/monitoring/metrics
   * Get current system metrics snapshot
   *
   * @param format - Response format: 'json' or 'prometheus'
   * @param type - Filter by metric type: 'system', 'process', 'application'
   * @param useCache - Whether to use cached data (default: true)
   * @returns System metrics data
   */
  async getMetrics(
    format: 'json' | 'prometheus' = 'json',
    type?: 'system' | 'process' | 'application',
    useCache: boolean = true
  ): Promise<SystemMetrics | string> {
    const params: Record<string, string> = {};
    if (format !== 'json') params.format = format;
    if (type) params.type = type;

    const query = Object.keys(params).length > 0
      ? `?${new URLSearchParams(params).toString()}`
      : '';

    return this.request<SystemMetrics | string>(
      `/metrics${query}`,
      { method: 'GET' },
      useCache,
      5000 // 5 second cache
    );
  }

  /**
   * GET /api/monitoring/alerts
   * Get active alerts with optional filtering
   *
   * @param options - Filter and pagination options
   * @returns Paginated alerts with statistics
   */
  async getAlerts(options: {
    severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
    acknowledged?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<AlertsResponse> {
    const params: Record<string, string> = {
      page: String(options.page || 1),
      limit: String(options.limit || 50)
    };

    if (options.severity) params.severity = options.severity;
    if (options.acknowledged !== undefined) params.acknowledged = String(options.acknowledged);

    const query = `?${new URLSearchParams(params).toString()}`;

    return this.request<AlertsResponse>(
      `/alerts${query}`,
      { method: 'GET' },
      false, // Don't cache alerts - real-time data
      0
    );
  }

  /**
   * GET /api/monitoring/alerts/history
   * Get alert history with filtering
   *
   * @param options - Filter and pagination options
   * @returns Historical alerts data
   */
  async getAlertHistory(options: {
    severity?: string;
    ruleId?: string;
    startTime?: number;
    endTime?: number;
    page?: number;
    limit?: number;
  } = {}): Promise<AlertHistoryResponse> {
    const params: Record<string, string> = {
      page: String(options.page || 1),
      limit: String(options.limit || 50)
    };

    if (options.severity) params.severity = options.severity;
    if (options.ruleId) params.ruleId = options.ruleId;
    if (options.startTime) params.startTime = String(options.startTime);
    if (options.endTime) params.endTime = String(options.endTime);

    const query = `?${new URLSearchParams(params).toString()}`;

    return this.request<AlertHistoryResponse>(
      `/alerts/history${query}`,
      { method: 'GET' },
      true,
      30000 // 30 second cache for history
    );
  }

  /**
   * POST /api/monitoring/alerts/:id/acknowledge
   * Acknowledge an alert
   *
   * @param alertId - Alert ID to acknowledge
   * @param acknowledgedBy - User or system acknowledging the alert
   * @returns Acknowledgment confirmation
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<AcknowledgeAlertResponse> {
    // Clear alerts cache
    this.clearCache('/alerts');

    return this.request<AcknowledgeAlertResponse>(
      `/alerts/${alertId}/acknowledge`,
      {
        method: 'POST',
        body: JSON.stringify({ acknowledgedBy })
      },
      false,
      0
    );
  }

  /**
   * GET /api/monitoring/stats
   * Get historical statistics with trends
   *
   * @param options - Time range and metric filters
   * @param useCache - Whether to use cached data (default: true)
   * @returns Historical statistics with trend analysis
   */
  async getStats(options: {
    startTime?: number;
    endTime?: number;
    metrics?: string[]; // e.g., ['cpu', 'memory', 'requests']
  } = {}, useCache: boolean = true): Promise<HistoricalStats> {
    const params: Record<string, string> = {};

    if (options.startTime) params.startTime = String(options.startTime);
    if (options.endTime) params.endTime = String(options.endTime);
    if (options.metrics && options.metrics.length > 0) {
      params.metrics = options.metrics.join(',');
    }

    const query = Object.keys(params).length > 0
      ? `?${new URLSearchParams(params).toString()}`
      : '';

    return this.request<HistoricalStats>(
      `/stats${query}`,
      { method: 'GET' },
      useCache,
      10000 // 10 second cache
    );
  }

  /**
   * GET /api/monitoring/rules
   * Get all alert rules
   *
   * @param useCache - Whether to use cached data (default: true)
   * @returns List of alert rules
   */
  async getRules(useCache: boolean = true): Promise<AlertRulesResponse> {
    return this.request<AlertRulesResponse>(
      '/rules',
      { method: 'GET' },
      useCache,
      30000 // 30 second cache
    );
  }

  /**
   * POST /api/monitoring/rules
   * Add a new alert rule
   *
   * @param rule - Alert rule configuration
   * @returns Created rule
   */
  async addRule(rule: AlertRule): Promise<{ success: boolean; rule: AlertRule }> {
    // Clear rules cache
    this.clearCache('/rules');

    return this.request<{ success: boolean; rule: AlertRule }>(
      '/rules',
      {
        method: 'POST',
        body: JSON.stringify(rule)
      },
      false,
      0
    );
  }

  /**
   * PUT /api/monitoring/rules/:id
   * Update an existing alert rule
   *
   * @param ruleId - Rule ID to update
   * @param updates - Rule updates
   * @returns Updated rule
   */
  async updateRule(
    ruleId: string,
    updates: Partial<AlertRule>
  ): Promise<{ success: boolean; rule: AlertRule }> {
    // Clear rules cache
    this.clearCache('/rules');

    return this.request<{ success: boolean; rule: AlertRule }>(
      `/rules/${ruleId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      },
      false,
      0
    );
  }

  /**
   * DELETE /api/monitoring/rules/:id
   * Delete an alert rule
   *
   * @param ruleId - Rule ID to delete
   * @returns Deletion confirmation
   */
  async deleteRule(ruleId: string): Promise<{ success: boolean; message: string }> {
    // Clear rules cache
    this.clearCache('/rules');

    return this.request<{ success: boolean; message: string }>(
      `/rules/${ruleId}`,
      { method: 'DELETE' },
      false,
      0
    );
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Abort all ongoing requests
   */
  public abortAll(): void {
    this.abortControllers.forEach((controller, id) => {
      controller.abort();
      console.log('🛑 Aborted request:', id);
    });
    this.abortControllers.clear();
  }

  /**
   * Cleanup method - call when component unmounts
   */
  public destroy(): void {
    this.abortAll();
    this.cache.clear();
    console.log('🧹 MonitoringApiService destroyed');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// ==================== SINGLETON EXPORT ====================

export const monitoringApiService = new MonitoringApiService();

// Also export the class for testing purposes
export { MonitoringApiService };
