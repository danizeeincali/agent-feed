/**
 * API Endpoint Mismatch Analyzer - NLD System
 * 
 * Detects and analyzes API endpoint mismatches, version conflicts,
 * and frontend-backend API contract violations.
 */

export interface EndpointMismatch {
  id: string;
  timestamp: number;
  type: 'NOT_FOUND' | 'VERSION_MISMATCH' | 'METHOD_NOT_ALLOWED' | 'SCHEMA_MISMATCH' | 'PARAMETER_MISMATCH';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    requestedUrl: string;
    expectedUrl?: string;
    method: string;
    statusCode: number;
    requestPayload?: any;
    responsePayload?: any;
    headers: Record<string, string>;
  };
  apiContract: {
    expectedSchema?: any;
    actualSchema?: any;
    missingFields: string[];
    extraFields: string[];
    typeConflicts: Array<{ field: string; expected: string; actual: string }>;
  };
  versionInfo: {
    frontendVersion?: string;
    backendVersion?: string;
    apiVersion?: string;
    compatibility: 'compatible' | 'incompatible' | 'unknown';
  };
  tddPrevention: {
    contractTests: string[];
    mockStrategies: string[];
    migrationSteps: string[];
    validationRules: string[];
  };
}

export interface APIMapping {
  pattern: string;
  method: string;
  expectedResponse: any;
  versions: string[];
  deprecated: boolean;
  alternativeEndpoints: string[];
}

export class APIEndpointMismatchAnalyzer {
  private mismatches: Map<string, EndpointMismatch> = new Map();
  private apiMappings: Map<string, APIMapping> = new Map();
  private endpointHitCount: Map<string, number> = new Map();
  private schemaCache: Map<string, any> = new Map();
  private versionHeaders = ['api-version', 'x-api-version', 'version', 'x-version'];

  constructor() {
    this.initializeAPIMapping();
    this.initializeRequestInterception();
    this.initializeSchemaValidation();
    console.log('🔍 API Endpoint Mismatch Analyzer initialized');
  }

  private initializeAPIMapping(): void {
    // Define known API mappings
    this.apiMappings.set('/api/claude-instances', {
      pattern: '/api/claude-instances',
      method: 'GET',
      expectedResponse: { instances: 'array', status: 'string' },
      versions: ['v1', 'v2'],
      deprecated: false,
      alternativeEndpoints: ['/api/v1/instances', '/api/v2/instances']
    });

    this.apiMappings.set('/api/health', {
      pattern: '/api/health',
      method: 'GET',
      expectedResponse: { status: 'string', timestamp: 'number' },
      versions: ['v1'],
      deprecated: false,
      alternativeEndpoints: []
    });

    // SSE endpoints
    this.apiMappings.set('/api/events', {
      pattern: '/api/events',
      method: 'GET',
      expectedResponse: 'text/event-stream',
      versions: ['v1'],
      deprecated: false,
      alternativeEndpoints: ['/api/sse/events']
    });
  }

  private initializeRequestInterception(): void {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const options = args[1] || {};
      const method = options.method || 'GET';

      // Track endpoint usage
      this.trackEndpointUsage(url, method);

      try {
        const response = await originalFetch(...args);
        
        // Analyze response for mismatches
        await this.analyzeResponse(url, method, options, response.clone());
        
        return response;
      } catch (error: any) {
        this.analyzeNetworkError(url, method, options, error);
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      this._method = method;
      this._url = typeof url === 'string' ? url : url.href;
      return originalXHROpen.call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function(body?: any) {
      const analyzer = this;
      
      this.addEventListener('load', function() {
        analyzer.analyzeXHRResponse(this._url, this._method, this, body);
      }.bind(this));

      this.addEventListener('error', function() {
        analyzer.analyzeXHRError(this._url, this._method, this, body);
      }.bind(this));

      return originalXHRSend.call(this, body);
    };
  }

  private initializeSchemaValidation(): void {
    // Load expected schemas from API documentation or OpenAPI specs
    this.loadAPISchemas();
  }

  private trackEndpointUsage(url: string, method: string): void {
    const key = `${method}:${this.normalizeUrl(url)}`;
    this.endpointHitCount.set(key, (this.endpointHitCount.get(key) || 0) + 1);
  }

  private async analyzeResponse(url: string, method: string, options: RequestInit, response: Response): Promise<void> {
    const normalizedUrl = this.normalizeUrl(url);
    const key = `${method}:${normalizedUrl}`;

    // Check for status code mismatches
    if (response.status === 404) {
      this.captureEndpointMismatch(url, method, response, 'NOT_FOUND', {
        message: 'Endpoint not found',
        suggestedAlternatives: this.findAlternativeEndpoints(normalizedUrl)
      });
      return;
    }

    if (response.status === 405) {
      this.captureEndpointMismatch(url, method, response, 'METHOD_NOT_ALLOWED', {
        message: 'HTTP method not allowed',
        allowedMethods: this.extractAllowedMethods(response)
      });
      return;
    }

    // Check for version mismatches
    const versionMismatch = this.checkVersionMismatch(response, options);
    if (versionMismatch) {
      this.captureEndpointMismatch(url, method, response, 'VERSION_MISMATCH', versionMismatch);
    }

    // Validate response schema
    try {
      const responseData = await response.json().catch(() => null);
      if (responseData) {
        const schemaMismatch = this.validateResponseSchema(normalizedUrl, method, responseData);
        if (schemaMismatch) {
          this.captureEndpointMismatch(url, method, response, 'SCHEMA_MISMATCH', schemaMismatch);
        }
      }
    } catch (e) {
      // Non-JSON response, skip schema validation
    }
  }

  private analyzeNetworkError(url: string, method: string, options: RequestInit, error: Error): void {
    // Network errors might indicate endpoint mismatches
    if (error.message.includes('404') || error.message.includes('not found')) {
      this.captureEndpointMismatch(url, method, null, 'NOT_FOUND', {
        message: error.message,
        networkError: true
      });
    }
  }

  private analyzeXHRResponse(url: string, method: string, xhr: XMLHttpRequest, body: any): void {
    if (xhr.status === 404) {
      this.captureEndpointMismatch(url, method, null, 'NOT_FOUND', {
        message: 'XHR endpoint not found',
        statusText: xhr.statusText
      });
    }
  }

  private analyzeXHRError(url: string, method: string, xhr: XMLHttpRequest, body: any): void {
    this.captureEndpointMismatch(url, method, null, 'NOT_FOUND', {
      message: 'XHR network error',
      statusText: xhr.statusText,
      networkError: true
    });
  }

  private captureEndpointMismatch(
    url: string,
    method: string,
    response: Response | null,
    type: EndpointMismatch['type'],
    details: any
  ): void {
    const mismatch: EndpointMismatch = {
      id: `endpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      severity: this.calculateSeverity(type, url, method),
      details: {
        requestedUrl: url,
        expectedUrl: this.findExpectedUrl(url),
        method,
        statusCode: response?.status || 0,
        requestPayload: details.requestPayload,
        responsePayload: details.responsePayload,
        headers: this.extractResponseHeaders(response)
      },
      apiContract: {
        expectedSchema: this.getExpectedSchema(url, method),
        actualSchema: details.actualSchema,
        missingFields: details.missingFields || [],
        extraFields: details.extraFields || [],
        typeConflicts: details.typeConflicts || []
      },
      versionInfo: {
        frontendVersion: this.getFrontendVersion(),
        backendVersion: this.getBackendVersion(response),
        apiVersion: this.getAPIVersion(response),
        compatibility: this.assessVersionCompatibility(response)
      },
      tddPrevention: {
        contractTests: this.generateContractTests(url, method, type),
        mockStrategies: this.generateMockStrategies(url, method, type),
        migrationSteps: this.generateMigrationSteps(url, method, type),
        validationRules: this.generateValidationRules(url, method, type)
      }
    };

    this.mismatches.set(mismatch.id, mismatch);
    this.logMismatch(mismatch);
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, window.location.href);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  private findAlternativeEndpoints(url: string): string[] {
    const alternatives: string[] = [];
    
    for (const [pattern, mapping] of this.apiMappings) {
      if (this.isUrlSimilar(url, pattern)) {
        alternatives.push(...mapping.alternativeEndpoints);
      }
    }

    // Add common API versioning patterns
    if (url.includes('/api/')) {
      alternatives.push(
        url.replace('/api/', '/api/v1/'),
        url.replace('/api/', '/api/v2/'),
        url.replace('/v1/', '/v2/'),
        url.replace('/v2/', '/v1/')
      );
    }

    return [...new Set(alternatives)];
  }

  private isUrlSimilar(url1: string, url2: string): boolean {
    // Simple similarity check based on path segments
    const segments1 = url1.split('/').filter(s => s);
    const segments2 = url2.split('/').filter(s => s);
    
    const commonSegments = segments1.filter(seg => segments2.includes(seg));
    return commonSegments.length >= Math.min(segments1.length, segments2.length) * 0.6;
  }

  private extractAllowedMethods(response: Response): string[] {
    const allowHeader = response.headers.get('allow');
    return allowHeader ? allowHeader.split(',').map(m => m.trim()) : [];
  }

  private checkVersionMismatch(response: Response, options: RequestInit): any {
    const requestVersion = this.extractVersionFromRequest(options);
    const responseVersion = this.extractVersionFromResponse(response);

    if (requestVersion && responseVersion && requestVersion !== responseVersion) {
      return {
        requestedVersion: requestVersion,
        receivedVersion: responseVersion,
        message: 'API version mismatch detected'
      };
    }

    return null;
  }

  private validateResponseSchema(url: string, method: string, responseData: any): any {
    const expectedSchema = this.getExpectedSchema(url, method);
    if (!expectedSchema) return null;

    const validation = this.performSchemaValidation(responseData, expectedSchema);
    
    if (!validation.valid) {
      return {
        expectedSchema,
        actualSchema: this.generateSchemaFromData(responseData),
        missingFields: validation.missingFields,
        extraFields: validation.extraFields,
        typeConflicts: validation.typeConflicts
      };
    }

    return null;
  }

  private getExpectedSchema(url: string, method: string): any {
    const normalizedUrl = this.normalizeUrl(url);
    const mapping = this.apiMappings.get(normalizedUrl);
    return mapping?.expectedResponse;
  }

  private performSchemaValidation(data: any, schema: any): {
    valid: boolean;
    missingFields: string[];
    extraFields: string[];
    typeConflicts: Array<{ field: string; expected: string; actual: string }>;
  } {
    const result = {
      valid: true,
      missingFields: [] as string[],
      extraFields: [] as string[],
      typeConflicts: [] as Array<{ field: string; expected: string; actual: string }>
    };

    if (typeof schema === 'string') {
      // Content-type validation
      return { ...result, valid: true };
    }

    if (typeof schema !== 'object' || typeof data !== 'object') {
      return { ...result, valid: false };
    }

    // Check for missing fields
    for (const field in schema) {
      if (!(field in data)) {
        result.missingFields.push(field);
        result.valid = false;
      } else {
        // Check type conflicts
        const expectedType = schema[field];
        const actualType = this.getDataType(data[field]);
        
        if (expectedType !== actualType) {
          result.typeConflicts.push({
            field,
            expected: expectedType,
            actual: actualType
          });
          result.valid = false;
        }
      }
    }

    // Check for extra fields
    for (const field in data) {
      if (!(field in schema)) {
        result.extraFields.push(field);
      }
    }

    return result;
  }

  private getDataType(value: any): string {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'null';
    return typeof value;
  }

  private generateSchemaFromData(data: any): any {
    if (Array.isArray(data)) {
      return 'array';
    }
    
    if (typeof data === 'object' && data !== null) {
      const schema: any = {};
      for (const key in data) {
        schema[key] = this.getDataType(data[key]);
      }
      return schema;
    }
    
    return this.getDataType(data);
  }

  private extractVersionFromRequest(options: RequestInit): string | null {
    const headers = options.headers;
    if (!headers) return null;

    for (const versionHeader of this.versionHeaders) {
      if (headers instanceof Headers) {
        const version = headers.get(versionHeader);
        if (version) return version;
      } else if (typeof headers === 'object') {
        const version = (headers as any)[versionHeader];
        if (version) return version;
      }
    }

    return null;
  }

  private extractVersionFromResponse(response: Response): string | null {
    for (const versionHeader of this.versionHeaders) {
      const version = response.headers.get(versionHeader);
      if (version) return version;
    }
    return null;
  }

  private extractResponseHeaders(response: Response | null): Record<string, string> {
    if (!response) return {};

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  private findExpectedUrl(url: string): string | undefined {
    const normalizedUrl = this.normalizeUrl(url);
    
    // Find closest matching pattern
    let bestMatch = '';
    let bestScore = 0;
    
    for (const pattern of this.apiMappings.keys()) {
      const score = this.calculateUrlSimilarity(normalizedUrl, pattern);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = pattern;
      }
    }
    
    return bestScore > 0.5 ? bestMatch : undefined;
  }

  private calculateUrlSimilarity(url1: string, url2: string): number {
    const segments1 = url1.split('/').filter(s => s);
    const segments2 = url2.split('/').filter(s => s);
    
    const maxLength = Math.max(segments1.length, segments2.length);
    if (maxLength === 0) return 1;
    
    let matches = 0;
    for (let i = 0; i < Math.min(segments1.length, segments2.length); i++) {
      if (segments1[i] === segments2[i]) matches++;
    }
    
    return matches / maxLength;
  }

  private calculateSeverity(type: EndpointMismatch['type'], url: string, method: string): EndpointMismatch['severity'] {
    // Critical: core API endpoints that break functionality
    if (url.includes('/api/claude-instances') || url.includes('/api/health')) {
      return 'critical';
    }

    // High: version mismatches and schema problems
    if (type === 'VERSION_MISMATCH' || type === 'SCHEMA_MISMATCH') {
      return 'high';
    }

    // Medium: method not allowed, parameter mismatches
    if (type === 'METHOD_NOT_ALLOWED' || type === 'PARAMETER_MISMATCH') {
      return 'medium';
    }

    // Low: 404 errors for optional endpoints
    return 'low';
  }

  private getFrontendVersion(): string {
    // Try to get version from package.json or build info
    return (window as any).__APP_VERSION__ || '1.0.0';
  }

  private getBackendVersion(response: Response | null): string | undefined {
    if (!response) return undefined;
    return response.headers.get('x-app-version') || response.headers.get('server-version');
  }

  private getAPIVersion(response: Response | null): string | undefined {
    if (!response) return undefined;
    return this.extractVersionFromResponse(response);
  }

  private assessVersionCompatibility(response: Response | null): 'compatible' | 'incompatible' | 'unknown' {
    const frontendVersion = this.getFrontendVersion();
    const backendVersion = this.getBackendVersion(response);

    if (!frontendVersion || !backendVersion) return 'unknown';

    // Simple semantic version check
    const frontendMajor = parseInt(frontendVersion.split('.')[0]);
    const backendMajor = parseInt(backendVersion.split('.')[0]);

    return frontendMajor === backendMajor ? 'compatible' : 'incompatible';
  }

  private generateContractTests(url: string, method: string, type: EndpointMismatch['type']): string[] {
    const tests = [
      `Test ${method} ${url} endpoint existence`,
      `Test ${method} ${url} response schema validation`,
      `Test ${method} ${url} error handling`,
      `Test ${method} ${url} API version compatibility`
    ];

    switch (type) {
      case 'NOT_FOUND':
        tests.push(`Test alternative endpoints for ${url}`);
        tests.push('Test 404 error handling and fallbacks');
        break;
      
      case 'VERSION_MISMATCH':
        tests.push('Test API version negotiation');
        tests.push('Test backward compatibility');
        break;
      
      case 'SCHEMA_MISMATCH':
        tests.push('Test response schema validation');
        tests.push('Test missing field handling');
        tests.push('Test extra field tolerance');
        break;
      
      case 'METHOD_NOT_ALLOWED':
        tests.push('Test allowed HTTP methods');
        tests.push('Test method fallbacks');
        break;
    }

    return tests;
  }

  private generateMockStrategies(url: string, method: string, type: EndpointMismatch['type']): string[] {
    const strategies = [
      'Mock successful API responses with correct schema',
      'Mock error responses for robust error handling',
      'Mock different API versions for compatibility testing',
      'Mock network failures and timeouts'
    ];

    switch (type) {
      case 'NOT_FOUND':
        strategies.push('Mock 404 responses and alternative endpoints');
        break;
      
      case 'SCHEMA_MISMATCH':
        strategies.push('Mock responses with schema variations');
        strategies.push('Mock missing and extra fields');
        break;
    }

    return strategies;
  }

  private generateMigrationSteps(url: string, method: string, type: EndpointMismatch['type']): string[] {
    const steps = [
      'Update API client to use correct endpoint URLs',
      'Add proper error handling for endpoint failures',
      'Implement graceful degradation strategies'
    ];

    switch (type) {
      case 'VERSION_MISMATCH':
        steps.push('Update API version headers in requests');
        steps.push('Implement version-specific request/response handling');
        break;
      
      case 'SCHEMA_MISMATCH':
        steps.push('Update response type definitions');
        steps.push('Add runtime schema validation');
        break;
      
      case 'NOT_FOUND':
        steps.push('Update endpoint URLs to correct paths');
        steps.push('Add endpoint discovery mechanism');
        break;
    }

    return steps;
  }

  private generateValidationRules(url: string, method: string, type: EndpointMismatch['type']): string[] {
    return [
      'Validate endpoint URLs before making requests',
      'Validate response schemas against expected contracts',
      'Validate API version compatibility',
      'Validate request parameters and headers',
      'Validate HTTP methods against endpoint capabilities'
    ];
  }

  private loadAPISchemas(): void {
    // This would load from OpenAPI specs or API documentation
    // For now, we'll use the hardcoded mappings
  }

  private logMismatch(mismatch: EndpointMismatch): void {
    const icon = {
      'NOT_FOUND': '❌',
      'VERSION_MISMATCH': '🔄',
      'METHOD_NOT_ALLOWED': '🚫',
      'SCHEMA_MISMATCH': '📋',
      'PARAMETER_MISMATCH': '⚠️'
    }[mismatch.type];

    console.log(`${icon} [NLD API] ${mismatch.type}: ${mismatch.details.requestedUrl}`, {
      severity: mismatch.severity,
      statusCode: mismatch.details.statusCode,
      expectedUrl: mismatch.details.expectedUrl,
      compatibility: mismatch.versionInfo.compatibility
    });
  }

  // Public API
  public getMismatches(): EndpointMismatch[] {
    return Array.from(this.mismatches.values());
  }

  public getMismatchMetrics(): any {
    const mismatches = this.getMismatches();
    
    return {
      total: mismatches.length,
      byType: this.groupBy(mismatches, 'type'),
      bySeverity: this.groupBy(mismatches, 'severity'),
      mostProblematicEndpoints: this.getMostProblematicEndpoints(mismatches),
      versionCompatibility: this.getVersionCompatibilityStats(mismatches),
      endpointUsage: Object.fromEntries(this.endpointHitCount)
    };
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private getMostProblematicEndpoints(mismatches: EndpointMismatch[]): Array<{ url: string; count: number; types: string[] }> {
    const endpointIssues = mismatches.reduce((acc, mismatch) => {
      const url = mismatch.details.requestedUrl;
      if (!acc[url]) {
        acc[url] = { count: 0, types: new Set<string>() };
      }
      acc[url].count++;
      acc[url].types.add(mismatch.type);
      return acc;
    }, {} as Record<string, { count: number; types: Set<string> }>);

    return Object.entries(endpointIssues)
      .map(([url, data]) => ({
        url,
        count: data.count,
        types: Array.from(data.types)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getVersionCompatibilityStats(mismatches: EndpointMismatch[]): any {
    const compatibility = mismatches.reduce((acc, mismatch) => {
      const compat = mismatch.versionInfo.compatibility;
      acc[compat] = (acc[compat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return compatibility;
  }

  public exportForNeuralTraining(): any {
    return {
      mismatches: this.getMismatches(),
      metrics: this.getMismatchMetrics(),
      apiMappings: Object.fromEntries(this.apiMappings),
      endpointUsage: Object.fromEntries(this.endpointHitCount),
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }

  public getRecommendations(): Array<{
    type: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    action: string;
  }> {
    const recommendations: Array<{
      type: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      action: string;
    }> = [];

    const mismatches = this.getMismatches();
    const recentMismatches = mismatches.filter(m => m.timestamp > Date.now() - 3600000); // Last hour

    if (recentMismatches.length > 5) {
      recommendations.push({
        type: 'HIGH_ERROR_RATE',
        priority: 'high',
        description: `${recentMismatches.length} API mismatches in the last hour`,
        action: 'Investigate API stability and update endpoint configurations'
      });
    }

    const versionMismatches = mismatches.filter(m => m.type === 'VERSION_MISMATCH');
    if (versionMismatches.length > 0) {
      recommendations.push({
        type: 'VERSION_COMPATIBILITY',
        priority: 'critical',
        description: 'API version mismatches detected',
        action: 'Update API version headers and implement version negotiation'
      });
    }

    const schemaMismatches = mismatches.filter(m => m.type === 'SCHEMA_MISMATCH');
    if (schemaMismatches.length > 0) {
      recommendations.push({
        type: 'SCHEMA_VALIDATION',
        priority: 'medium',
        description: 'Response schema mismatches found',
        action: 'Update TypeScript interfaces and add runtime validation'
      });
    }

    return recommendations;
  }
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  (window as any).NLD_APIAnalyzer = new APIEndpointMismatchAnalyzer();
}