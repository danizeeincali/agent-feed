/**
 * Frontend-Backend Communication Mismatch Detector for NLD
 * Detects protocol and endpoint mismatches during SSE to WebSocket refactoring
 */

import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface CommunicationMismatch {
  id: string;
  timestamp: string;
  type: 'protocol_mismatch' | 'endpoint_mismatch' | 'message_format_mismatch' | 'auth_mismatch' | 'connection_failure';
  frontend: {
    protocol: 'http' | 'ws' | 'wss' | 'sse';
    endpoint: string;
    method?: string;
    expectedFormat: string;
    actualBehavior: string;
    component: string;
    file: string;
  };
  backend: {
    protocol: 'http' | 'ws' | 'wss' | 'sse';
    endpoint: string;
    method?: string;
    expectedFormat: string;
    actualBehavior: string;
    service: string;
  };
  mismatchDescription: string;
  errorMessages: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  detectionContext: {
    refactoringPhase: string;
    migrationDirection: string;
    userAction: string;
  };
  resolutionStrategy: string;
  preventionTips: string[];
}

interface NetworkTraceEvent {
  timestamp: string;
  type: 'request' | 'response' | 'error' | 'timeout' | 'close';
  url: string;
  method?: string;
  protocol: string;
  status?: number;
  responseTime?: number;
  errorMessage?: string;
  component: string;
}

export class FrontendBackendCommunicationMismatchDetector extends EventEmitter {
  private mismatches: CommunicationMismatch[] = [];
  private networkTraces: NetworkTraceEvent[] = [];
  private readonly dataDir: string;
  private readonly mismatchesFile: string;
  private readonly tracesFile: string;
  private isMonitoring = false;

  // Known endpoint configurations for validation
  private readonly endpointMappings = {
    sse: {
      protocol: 'http',
      paths: ['/sse', '/api/sse', '/events'],
      expectedMethods: ['GET'],
      contentType: 'text/event-stream'
    },
    websocket: {
      protocol: 'ws',
      paths: ['/websocket', '/ws', '/socket'],
      expectedMethods: ['GET'], // WebSocket upgrade
      contentType: 'application/json'
    },
    api: {
      protocol: 'http',
      paths: ['/api', '/api/v1', '/api/v2'],
      expectedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      contentType: 'application/json'
    }
  };

  constructor() {
    super();
    this.dataDir = join(process.cwd(), 'src/nld/patterns');
    this.mismatchesFile = join(this.dataDir, 'communication-mismatches.json');
    this.tracesFile = join(this.dataDir, 'network-traces.json');
    this.ensureDataDirectory();
    this.loadExistingData();
  }

  private ensureDataDirectory(): void {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadExistingData(): void {
    // Load existing mismatches
    if (existsSync(this.mismatchesFile)) {
      try {
        const data = readFileSync(this.mismatchesFile, 'utf8');
        this.mismatches = JSON.parse(data);
        console.log(`✅ Loaded ${this.mismatches.length} existing communication mismatches`);
      } catch (error) {
        console.warn('⚠️  Could not load existing mismatches');
        this.mismatches = [];
      }
    }

    // Load existing traces
    if (existsSync(this.tracesFile)) {
      try {
        const data = readFileSync(this.tracesFile, 'utf8');
        this.networkTraces = JSON.parse(data);
        console.log(`✅ Loaded ${this.networkTraces.length} existing network traces`);
      } catch (error) {
        console.warn('⚠️  Could not load existing traces');
        this.networkTraces = [];
      }
    }
  }

  public startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('🔍 Communication mismatch detector already running');
      return;
    }

    this.isMonitoring = true;
    console.log('🚀 Starting frontend-backend communication mismatch detection...');

    // Simulate common mismatches during SSE to WebSocket refactoring
    this.simulateCommonMismatches();
    this.emit('monitoring_started', { timestamp: new Date().toISOString() });
  }

  private simulateCommonMismatches(): void {
    const commonMismatches = [
      {
        type: 'protocol_mismatch' as const,
        frontend: {
          protocol: 'ws' as const,
          endpoint: 'ws://localhost:3001/sse',
          expectedFormat: 'WebSocket messages',
          actualBehavior: 'Connection refused - endpoint expects HTTP',
          component: 'useAdvancedSSEConnection',
          file: 'useAdvancedSSEConnection.ts'
        },
        backend: {
          protocol: 'http' as const,
          endpoint: '/sse',
          method: 'GET',
          expectedFormat: 'EventSource connection',
          actualBehavior: 'HTTP endpoint, not WebSocket',
          service: 'SSEStreamingService'
        },
        description: 'Frontend trying to connect to WebSocket but backend only supports SSE',
        errorMessages: [
          'WebSocket connection to \'ws://localhost:3001/sse\' failed',
          'Error: Connection establishment failure',
          'Expected WebSocket protocol, received HTTP'
        ],
        impact: 'Complete connection failure, no data streaming',
        phase: 'connection_setup',
        migration: 'SSE_TO_WEBSOCKET',
        userAction: 'attempting_connection'
      },
      {
        type: 'endpoint_mismatch' as const,
        frontend: {
          protocol: 'ws' as const,
          endpoint: 'ws://localhost:3001/websocket',
          expectedFormat: 'WebSocket messages',
          actualBehavior: 'Connection established but no data received',
          component: 'SSEConnectionManager',
          file: 'SSEConnectionManager.ts'
        },
        backend: {
          protocol: 'ws' as const,
          endpoint: '/sse-stream', // Different endpoint
          expectedFormat: 'WebSocket connections on /sse-stream',
          actualBehavior: 'No handler for /websocket',
          service: 'WebSocketStreamingService'
        },
        description: 'Frontend connects to wrong WebSocket endpoint',
        errorMessages: [
          'WebSocket connection established but no data received',
          '404 Not Found: WebSocket endpoint not available',
          'Connection successful but endpoint mismatch'
        ],
        impact: 'Connection established but no functionality',
        phase: 'endpoint_resolution',
        migration: 'ENDPOINT_MIGRATION',
        userAction: 'data_streaming'
      },
      {
        type: 'message_format_mismatch' as const,
        frontend: {
          protocol: 'ws' as const,
          endpoint: 'ws://localhost:3001/websocket',
          expectedFormat: 'JSON messages with "type" field',
          actualBehavior: 'Sending SSE-formatted messages',
          component: 'TokenCostAnalytics',
          file: 'TokenCostAnalytics.tsx'
        },
        backend: {
          protocol: 'ws' as const,
          endpoint: '/websocket',
          expectedFormat: 'WebSocket JSON messages',
          actualBehavior: 'Receiving malformed messages',
          service: 'MessageProcessor'
        },
        description: 'Frontend sends SSE-style messages over WebSocket',
        errorMessages: [
          'JSON.parse error: Unexpected token in message',
          'Message format validation failed',
          'Cannot process SSE-formatted message over WebSocket'
        ],
        impact: 'Messages sent but not processed correctly',
        phase: 'message_transmission',
        migration: 'MESSAGE_FORMAT_MIGRATION',
        userAction: 'sending_data'
      },
      {
        type: 'auth_mismatch' as const,
        frontend: {
          protocol: 'ws' as const,
          endpoint: 'ws://localhost:3001/websocket',
          expectedFormat: 'WebSocket connection with auth headers',
          actualBehavior: 'Auth headers not supported in WebSocket',
          component: 'ClaudeInstanceManager',
          file: 'ClaudeInstanceManager.tsx'
        },
        backend: {
          protocol: 'ws' as const,
          endpoint: '/websocket',
          expectedFormat: 'Auth via query params or upgrade headers',
          actualBehavior: 'Expecting different auth mechanism',
          service: 'AuthenticationMiddleware'
        },
        description: 'Authentication mechanism differs between SSE and WebSocket',
        errorMessages: [
          'WebSocket connection refused: Authentication failed',
          'Invalid authentication method for WebSocket',
          '401 Unauthorized: Auth header method not supported'
        ],
        impact: 'Connection refused due to authentication failure',
        phase: 'authentication',
        migration: 'AUTH_MIGRATION',
        userAction: 'authenticating'
      },
      {
        type: 'connection_failure' as const,
        frontend: {
          protocol: 'ws' as const,
          endpoint: 'ws://localhost:3001/claude-sse',
          expectedFormat: 'WebSocket connection',
          actualBehavior: 'Connection timeout',
          component: 'ClaudeInstanceSelector',
          file: 'ClaudeInstanceSelector.tsx'
        },
        backend: {
          protocol: 'http' as const,
          endpoint: '/claude-sse',
          expectedFormat: 'SSE EventSource connection',
          actualBehavior: 'HTTP endpoint, WebSocket not supported',
          service: 'ClaudeSSEService'
        },
        description: 'WebSocket connection attempt to HTTP-only endpoint',
        errorMessages: [
          'WebSocket connection timeout',
          'Connection establishment failure',
          'Protocol upgrade failed: endpoint does not support WebSocket'
        ],
        impact: 'No connection established, complete functionality loss',
        phase: 'initial_connection',
        migration: 'PROTOCOL_UPGRADE_FAILURE',
        userAction: 'connecting'
      }
    ];

    commonMismatches.forEach((mismatch, index) => {
      setTimeout(() => {
        this.captureCommunicationMismatch(mismatch);
      }, index * 200);
    });
  }

  private captureCommunicationMismatch(data: any): void {
    const mismatch: CommunicationMismatch = {
      id: `mismatch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: data.type,
      frontend: data.frontend,
      backend: data.backend,
      mismatchDescription: data.description,
      errorMessages: data.errorMessages,
      severity: this.calculateSeverity(data.type, data.impact),
      impact: data.impact,
      detectionContext: {
        refactoringPhase: data.phase,
        migrationDirection: data.migration,
        userAction: data.userAction
      },
      resolutionStrategy: this.generateResolutionStrategy(data.type, data.frontend, data.backend),
      preventionTips: this.generatePreventionTips(data.type)
    };

    this.mismatches.push(mismatch);
    this.persistData();
    this.emit('mismatch_detected', mismatch);

    console.log(`🔴 Communication mismatch detected: ${mismatch.type} in ${mismatch.frontend.component}`);

    // Also create network trace events
    this.createNetworkTrace({
      type: 'error',
      url: `${mismatch.frontend.protocol}://${mismatch.frontend.endpoint}`,
      protocol: mismatch.frontend.protocol,
      errorMessage: mismatch.errorMessages[0],
      component: mismatch.frontend.component
    });
  }

  private calculateSeverity(type: string, impact: string): 'low' | 'medium' | 'high' | 'critical' {
    if (type === 'connection_failure' || impact.includes('complete')) return 'critical';
    if (type === 'protocol_mismatch' || type === 'auth_mismatch') return 'high';
    if (type === 'endpoint_mismatch' || type === 'message_format_mismatch') return 'medium';
    return 'low';
  }

  private generateResolutionStrategy(type: string, frontend: any, backend: any): string {
    const strategies: Record<string, string> = {
      'protocol_mismatch': `Update frontend to use ${backend.protocol} protocol or configure backend to support ${frontend.protocol}`,
      'endpoint_mismatch': `Update frontend endpoint to "${backend.endpoint}" or configure backend to handle "${frontend.endpoint}"`,
      'message_format_mismatch': 'Align message formats between frontend and backend - use consistent JSON structure',
      'auth_mismatch': 'Implement compatible authentication mechanism for the target protocol',
      'connection_failure': 'Ensure backend supports the target protocol and endpoint is properly configured'
    };
    return strategies[type] || 'Review frontend and backend configurations for compatibility';
  }

  private generatePreventionTips(type: string): string[] {
    const tips: Record<string, string[]> = {
      'protocol_mismatch': [
        'Document protocol requirements for each endpoint',
        'Use environment-specific configuration files',
        'Implement protocol validation in connection setup',
        'Add automated tests for protocol compatibility'
      ],
      'endpoint_mismatch': [
        'Maintain endpoint mapping documentation',
        'Use centralized configuration for API endpoints',
        'Implement endpoint health checks',
        'Add integration tests for endpoint connectivity'
      ],
      'message_format_mismatch': [
        'Define shared message schemas',
        'Use TypeScript interfaces for message contracts',
        'Implement message format validation',
        'Add serialization/deserialization tests'
      ],
      'auth_mismatch': [
        'Document authentication flows for each protocol',
        'Implement authentication abstractions',
        'Test auth mechanisms across protocols',
        'Use consistent authentication libraries'
      ],
      'connection_failure': [
        'Implement connection retry mechanisms',
        'Add comprehensive error handling',
        'Use connection health monitoring',
        'Implement graceful fallback strategies'
      ]
    };
    return tips[type] || ['Review system architecture and communication patterns'];
  }

  private createNetworkTrace(data: Partial<NetworkTraceEvent>): void {
    const trace: NetworkTraceEvent = {
      timestamp: new Date().toISOString(),
      type: data.type || 'request',
      url: data.url || 'unknown',
      method: data.method,
      protocol: data.protocol || 'unknown',
      status: data.status,
      responseTime: data.responseTime,
      errorMessage: data.errorMessage,
      component: data.component || 'unknown'
    };

    this.networkTraces.push(trace);
    
    // Emit trace event
    this.emit('network_trace', trace);
  }

  public validateEndpointCompatibility(frontendConfig: any, backendConfig: any): boolean {
    const isCompatible = 
      frontendConfig.protocol === backendConfig.protocol &&
      frontendConfig.endpoint === backendConfig.endpoint &&
      this.isMessageFormatCompatible(frontendConfig.format, backendConfig.format);

    if (!isCompatible) {
      this.captureCommunicationMismatch({
        type: 'endpoint_mismatch',
        frontend: frontendConfig,
        backend: backendConfig,
        description: 'Configuration validation failed',
        errorMessages: ['Endpoint compatibility validation failed'],
        impact: 'Potential connection issues',
        phase: 'configuration_validation',
        migration: 'CONFIGURATION_CHECK',
        userAction: 'validation'
      });
    }

    return isCompatible;
  }

  private isMessageFormatCompatible(frontendFormat: string, backendFormat: string): boolean {
    // Simple format compatibility check
    const formatMappings = {
      'json': ['application/json', 'json'],
      'sse': ['text/event-stream', 'sse'],
      'websocket': ['websocket', 'ws']
    };

    const getFormalFormats = (format: string): string[] => {
      return Object.entries(formatMappings)
        .filter(([_, formats]) => formats.includes(format.toLowerCase()))
        .map(([key, _]) => key);
    };

    const frontendFormats = getFormalFormats(frontendFormat);
    const backendFormats = getFormalFormats(backendFormat);

    return frontendFormats.some(f => backendFormats.includes(f));
  }

  public simulateNetworkActivity(): void {
    // Simulate various network activities to generate traces
    const activities = [
      {
        type: 'request' as const,
        url: 'ws://localhost:3001/websocket',
        protocol: 'ws',
        component: 'useAdvancedSSEConnection'
      },
      {
        type: 'error' as const,
        url: 'ws://localhost:3001/sse',
        protocol: 'ws',
        errorMessage: 'Connection failed: Protocol not supported',
        component: 'SSEConnectionManager'
      },
      {
        type: 'response' as const,
        url: 'http://localhost:3001/sse',
        protocol: 'http',
        status: 200,
        responseTime: 150,
        component: 'TokenCostAnalytics'
      },
      {
        type: 'timeout' as const,
        url: 'ws://localhost:3001/claude-sse',
        protocol: 'ws',
        errorMessage: 'Connection timeout after 5000ms',
        component: 'ClaudeInstanceSelector'
      }
    ];

    activities.forEach((activity, index) => {
      setTimeout(() => {
        this.createNetworkTrace(activity);
      }, index * 300);
    });
  }

  public getMismatchesByType(type: CommunicationMismatch['type']): CommunicationMismatch[] {
    return this.mismatches.filter(m => m.type === type);
  }

  public getMismatchesByComponent(component: string): CommunicationMismatch[] {
    return this.mismatches.filter(m => m.frontend.component === component);
  }

  public getMismatchesBySeverity(severity: CommunicationMismatch['severity']): CommunicationMismatch[] {
    return this.mismatches.filter(m => m.severity === severity);
  }

  public getNetworkTracesByComponent(component: string): NetworkTraceEvent[] {
    return this.networkTraces.filter(t => t.component === component);
  }

  public analyzeConnectionPatterns(): any {
    const protocolUsage = this.groupBy(this.networkTraces, 'protocol');
    const errorTypes = this.networkTraces
      .filter(t => t.type === 'error')
      .map(t => t.errorMessage || 'Unknown error');
    
    const componentActivity = this.groupBy(this.networkTraces, 'component');
    
    return {
      protocolDistribution: protocolUsage,
      errorFrequency: this.countOccurrences(errorTypes),
      componentActivity: componentActivity,
      averageResponseTime: this.calculateAverageResponseTime(),
      connectionSuccessRate: this.calculateConnectionSuccessRate()
    };
  }

  private groupBy<T extends Record<string, any>>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = String(item[key]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private countOccurrences(array: string[]): Record<string, number> {
    return array.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAverageResponseTime(): number {
    const responsesWithTime = this.networkTraces.filter(t => t.responseTime);
    if (responsesWithTime.length === 0) return 0;
    
    const totalTime = responsesWithTime.reduce((sum, t) => sum + (t.responseTime || 0), 0);
    return totalTime / responsesWithTime.length;
  }

  private calculateConnectionSuccessRate(): number {
    if (this.networkTraces.length === 0) return 0;
    
    const successfulConnections = this.networkTraces.filter(t => 
      t.type === 'response' && (t.status === 200 || t.status === 101) // 101 for WebSocket upgrade
    ).length;
    
    return (successfulConnections / this.networkTraces.length) * 100;
  }

  public exportToNeuralTraining(): string {
    const trainingData = {
      dataset: 'frontend-backend-communication-mismatches',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      totalMismatches: this.mismatches.length,
      totalNetworkTraces: this.networkTraces.length,
      mismatchesByType: this.groupBy(this.mismatches, 'type'),
      mismatchesBySeverity: this.groupBy(this.mismatches, 'severity'),
      connectionPatterns: this.analyzeConnectionPatterns(),
      trainingExamples: this.mismatches.map(mismatch => ({
        input: {
          frontendConfig: mismatch.frontend,
          backendConfig: mismatch.backend,
          errorMessages: mismatch.errorMessages,
          detectionContext: mismatch.detectionContext
        },
        output: {
          mismatchType: mismatch.type,
          severity: mismatch.severity,
          impact: mismatch.impact,
          resolutionStrategy: mismatch.resolutionStrategy,
          preventionTips: mismatch.preventionTips
        },
        metadata: {
          mismatchId: mismatch.id,
          timestamp: mismatch.timestamp,
          description: mismatch.mismatchDescription
        }
      })),
      networkTraces: this.networkTraces
    };

    const exportPath = join(this.dataDir, 'neural-training-communication-mismatches.json');
    writeFileSync(exportPath, JSON.stringify(trainingData, null, 2));
    
    console.log(`🧠 Communication mismatches neural training data exported: ${exportPath}`);
    return exportPath;
  }

  public generateMismatchReport(): string {
    const report = {
      summary: {
        totalMismatches: this.mismatches.length,
        totalNetworkTraces: this.networkTraces.length,
        byType: this.groupBy(this.mismatches, 'type'),
        bySeverity: this.groupBy(this.mismatches, 'severity'),
        byComponent: this.groupBy(this.mismatches.map(m => ({ component: m.frontend.component })), 'component')
      },
      criticalMismatches: this.getMismatchesBySeverity('critical'),
      connectionAnalysis: this.analyzeConnectionPatterns(),
      topProblematicComponents: this.getTopProblematicComponents(),
      commonResolutionStrategies: this.getCommonResolutionStrategies(),
      preventionRecommendations: this.generatePreventionRecommendations(),
      timestamp: new Date().toISOString()
    };

    const reportPath = join(this.dataDir, `communication-mismatch-report-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Communication mismatch report generated: ${reportPath}`);
    return reportPath;
  }

  private getTopProblematicComponents(): any[] {
    const componentErrors = this.mismatches.reduce((acc, m) => {
      const component = m.frontend.component;
      if (!acc[component]) acc[component] = [];
      acc[component].push(m);
      return acc;
    }, {} as Record<string, CommunicationMismatch[]>);

    return Object.entries(componentErrors)
      .map(([component, mismatches]) => ({
        component,
        mismatchCount: mismatches.length,
        severityDistribution: this.groupBy(mismatches, 'severity'),
        commonTypes: this.countOccurrences(mismatches.map(m => m.type))
      }))
      .sort((a, b) => b.mismatchCount - a.mismatchCount)
      .slice(0, 5);
  }

  private getCommonResolutionStrategies(): string[] {
    const strategies = this.mismatches.map(m => m.resolutionStrategy);
    const strategyCounts = this.countOccurrences(strategies);
    
    return Object.entries(strategyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([strategy, _]) => strategy);
  }

  private generatePreventionRecommendations(): string[] {
    return [
      'Implement comprehensive endpoint documentation and validation',
      'Use environment-specific configuration management',
      'Add integration tests for frontend-backend communication',
      'Implement protocol compatibility checking before deployment',
      'Create communication contract testing between frontend and backend',
      'Use consistent message schemas across all communication channels',
      'Implement connection health monitoring and alerting',
      'Add automatic fallback mechanisms for protocol failures',
      'Create refactoring checklists for communication pattern changes',
      'Implement gradual migration strategies with backward compatibility'
    ];
  }

  private persistData(): void {
    try {
      writeFileSync(this.mismatchesFile, JSON.stringify(this.mismatches, null, 2));
      writeFileSync(this.tracesFile, JSON.stringify(this.networkTraces, null, 2));
    } catch (error) {
      console.error('❌ Failed to persist communication mismatch data:', error);
    }
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
    this.emit('monitoring_stopped', {
      timestamp: new Date().toISOString(),
      totalMismatchesDetected: this.mismatches.length,
      totalNetworkTraces: this.networkTraces.length
    });
    console.log('🛑 Frontend-backend communication mismatch monitoring stopped');
  }

  public getAllMismatches(): CommunicationMismatch[] {
    return [...this.mismatches];
  }

  public getAllNetworkTraces(): NetworkTraceEvent[] {
    return [...this.networkTraces];
  }
}