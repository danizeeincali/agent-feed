/**
 * WebSocket Service Architecture Gap Analyzer
 * 
 * NLD Pattern: Detects missing WebSocket service implementations
 * that are referenced but never implemented, causing runtime failures.
 */

export interface WebSocketServiceGap {
  serviceName: string;
  referencedIn: string[];
  expectedMethods: string[];
  missingImplementation: boolean;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
}

export interface TerminalStreamingGap {
  ptyCreated: boolean;
  webSocketBridge: boolean;
  eventChainComplete: boolean;
  namespaceRegistered: boolean;
  clientConnection: boolean;
}

/**
 * NLD Pattern Detector: WebSocket Service Architecture Gaps
 */
export class WebSocketServiceGapDetector {
  private gaps: WebSocketServiceGap[] = [];
  
  constructor(private codebase: Map<string, string>) {}
  
  /**
   * Detect missing WebSocket service implementations
   */
  detectGaps(): WebSocketServiceGap[] {
    this.gaps = [];
    
    // Analyze each file for WebSocket service references
    for (const [filePath, content] of this.codebase) {
      this.analyzeFile(filePath, content);
    }
    
    return this.gaps;
  }
  
  /**
   * Analyze specific terminal streaming gaps
   */
  analyzeTerminalStreamingGaps(): TerminalStreamingGap {
    const serverContent = this.codebase.get('src/api/server.ts') || '';
    const managerContent = this.codebase.get('src/services/claude-instance-manager.ts') || '';
    
    return {
      ptyCreated: this.checkPtyCreation(managerContent),
      webSocketBridge: this.checkWebSocketBridge(serverContent),
      eventChainComplete: this.checkEventChain(serverContent, managerContent),
      namespaceRegistered: this.checkNamespaceRegistration(serverContent),
      clientConnection: this.checkClientConnectionSupport(serverContent)
    };
  }
  
  private analyzeFile(filePath: string, content: string): void {
    // Check for ClaudeInstanceTerminalWebSocket references
    if (content.includes('ClaudeInstanceTerminalWebSocket')) {
      const hasImport = content.includes('import.*ClaudeInstanceTerminalWebSocket');
      const hasInstantiation = content.includes('new ClaudeInstanceTerminalWebSocket');
      
      if (hasImport || hasInstantiation) {
        // Check if the actual class exists
        const classExists = this.checkClassExists('ClaudeInstanceTerminalWebSocket');
        
        if (!classExists) {
          this.gaps.push({
            serviceName: 'ClaudeInstanceTerminalWebSocket',
            referencedIn: [filePath],
            expectedMethods: [
              'constructor(io: SocketIOServer)',
              'handleConnection(socket: Socket)',
              'bridgePtyToSocket(instanceId: string, socket: Socket)',
              'forwardTerminalData(instanceId: string, data: string)'
            ],
            missingImplementation: true,
            impactLevel: 'critical',
            rootCause: 'Service referenced in server.ts but class not implemented'
          });
        }
      }
    }
    
    // Check for TerminalStreamingService references
    if (content.includes('TerminalStreamingService')) {
      const hasImport = content.includes('import.*TerminalStreamingService');
      const hasInstantiation = content.includes('new TerminalStreamingService');
      
      if (hasImport || hasInstantiation) {
        const classExists = this.checkClassExists('TerminalStreamingService');
        
        if (!classExists) {
          this.gaps.push({
            serviceName: 'TerminalStreamingService',
            referencedIn: [filePath],
            expectedMethods: [
              'constructor(io: SocketIOServer, options: StreamingOptions)',
              'createSession(sessionId: string, options: SessionOptions)',
              'destroySession(sessionId: string)',
              'getSessionStats()',
              'broadcastToSessions(event: string, data: any)'
            ],
            missingImplementation: true,
            impactLevel: 'critical',
            rootCause: 'Advanced terminal service referenced but not implemented'
          });
        }
      }
    }
  }
  
  private checkClassExists(className: string): boolean {
    // Check if class exists in any file
    for (const [filePath, content] of this.codebase) {
      if (content.includes(`class ${className}`) || content.includes(`export class ${className}`)) {
        return true;
      }
    }
    return false;
  }
  
  private checkPtyCreation(managerContent: string): boolean {
    return managerContent.includes('pty.spawn') && 
           managerContent.includes('ptyProcess.onData');
  }
  
  private checkWebSocketBridge(serverContent: string): boolean {
    return serverContent.includes('ClaudeInstanceTerminalWebSocket') &&
           serverContent.includes('new ClaudeInstanceTerminalWebSocket');
  }
  
  private checkEventChain(serverContent: string, managerContent: string): boolean {
    const managerEmitsTerminalData = managerContent.includes("emit('terminalData'");
    const serverListensTerminalData = serverContent.includes("on('terminalData'") ||
                                     serverContent.includes("terminalData");
    
    return managerEmitsTerminalData && serverListensTerminalData;
  }
  
  private checkNamespaceRegistration(serverContent: string): boolean {
    return serverContent.includes('io.of(') && 
           (serverContent.includes('claude-instances') || serverContent.includes('terminal'));
  }
  
  private checkClientConnectionSupport(serverContent: string): boolean {
    return serverContent.includes("socket.on('terminal:") || 
           serverContent.includes("socket.emit('terminal:");
  }
  
  /**
   * Generate remediation plan for detected gaps
   */
  generateRemediationPlan(): string {
    const plan = [
      '# WebSocket Terminal Streaming Remediation Plan',
      '',
      '## Critical Missing Components:',
      ''
    ];
    
    for (const gap of this.gaps) {
      plan.push(`### ${gap.serviceName}`);
      plan.push(`- **Impact**: ${gap.impactLevel}`);
      plan.push(`- **Root Cause**: ${gap.rootCause}`);
      plan.push('- **Required Methods**:');
      
      for (const method of gap.expectedMethods) {
        plan.push(`  - ${method}`);
      }
      plan.push('');
    }
    
    const terminalGaps = this.analyzeTerminalStreamingGaps();
    
    plan.push('## Terminal Streaming Chain Analysis:');
    plan.push(`- PTY Created: ${terminalGaps.ptyCreated ? '✅' : '❌'}`);
    plan.push(`- WebSocket Bridge: ${terminalGaps.webSocketBridge ? '✅' : '❌'}`);  
    plan.push(`- Event Chain Complete: ${terminalGaps.eventChainComplete ? '✅' : '❌'}`);
    plan.push(`- Namespace Registered: ${terminalGaps.namespaceRegistered ? '✅' : '❌'}`);
    plan.push(`- Client Connection: ${terminalGaps.clientConnection ? '✅' : '❌'}`);
    
    return plan.join('\n');
  }
}

/**
 * NLD Training Data Exporter
 */
export class WebSocketGapTrainingExporter {
  static exportTrainingData(gaps: WebSocketServiceGap[], terminalGaps: TerminalStreamingGap) {
    return {
      pattern_type: 'websocket_service_architecture_gap',
      confidence: 0.95,
      training_features: {
        missing_service_count: gaps.length,
        critical_gaps: gaps.filter(g => g.impactLevel === 'critical').length,
        terminal_chain_completeness: Object.values(terminalGaps).filter(Boolean).length / Object.keys(terminalGaps).length,
        common_failure_indicators: [
          'referenced_but_not_implemented',
          'event_chain_broken',
          'websocket_namespace_missing',
          'pty_isolation'
        ]
      },
      prevention_patterns: [
        'implement_service_interface_first',
        'test_websocket_message_flow_end_to_end', 
        'verify_event_chain_completeness',
        'register_websocket_namespaces_explicitly'
      ],
      success_metrics: {
        websocket_connection_established: false,
        terminal_data_flowing: false,
        client_receives_output: false,
        pty_to_socket_bridge_working: false
      }
    };
  }
}